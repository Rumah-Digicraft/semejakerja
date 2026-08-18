-- ============================================================
-- 055: Form event berbayar (DOKU Checkout, QRIS)
--
-- Admin bisa set "Biaya pendaftaran" per form (forms.price):
--   • NULL / 0  → event gratis, flow lama tidak berubah sama sekali.
--   • > 0       → submit masuk status 'pending_payment', client manggil
--                 edge function form-create-payment → redirect ke DOKU
--                 (QRIS only) → webhook menerima status SUCCESS (PAID)
--                 → respons flip ke 'registered'. Event berbayar
--                 MELEWATI mode approval — bayar = terdaftar.
--
-- Kuota event berbayar: baris 'pending_payment' yang invoice-nya masih
-- hidup (payment_expires_at > now()) ikut menghitung kuota (reservasi
-- slot), supaya tidak ada kasus "uang masuk tapi kuota keburu penuh"
-- yang berujung refund manual. Invoice DOKU due 60 menit — slot bebas
-- lagi otomatis setelah lewat.
--
-- Transaksi dicatat di tabel TERPISAH form_payment_transactions
-- (invoice prefix EVT-), meniru moves_payment_transactions (032) —
-- audit membership / moves / form event tidak pernah campur.
--
-- Pendaftaran yang SUDAH dibayar tidak bisa dibatalkan sendiri
-- (refund manual via admin) — cancel_form_response menolak.
--
-- Requires: forms + form_responses (030/034), admin_role() (014).
-- ============================================================

-- ── 1. Kolom baru ────────────────────────────────────────────
ALTER TABLE forms ADD COLUMN IF NOT EXISTS price integer
  CHECK (price IS NULL OR price >= 0);

ALTER TABLE form_responses ADD COLUMN IF NOT EXISTS payment_expires_at timestamptz;

-- Status baru 'pending_payment' → ganti CHECK constraint lama (034).
ALTER TABLE form_responses DROP CONSTRAINT IF EXISTS form_responses_status_check;
ALTER TABLE form_responses ADD CONSTRAINT form_responses_status_check
  CHECK (status IN ('pending', 'pending_payment', 'registered', 'cancelled', 'rejected'));

-- ── 2. Tabel form_payment_transactions ──────────────────────
CREATE TABLE IF NOT EXISTS public.form_payment_transactions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id        uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  response_id    uuid NOT NULL REFERENCES public.form_responses(id) ON DELETE CASCADE,
  user_id        uuid REFERENCES auth.users(id),
  invoice_number text NOT NULL UNIQUE,        -- DOKU order.invoice_number (prefix EVT-)

  amount         integer NOT NULL,            -- = forms.price saat invoice dibuat

  -- Gateway bookkeeping (mirrors moves_payment_transactions 032)
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','success','failed','expired')),
  provider       text NOT NULL DEFAULT 'doku',
  environment    text NOT NULL DEFAULT 'sandbox'
                   CHECK (environment IN ('sandbox','production')),
  payment_method text,                        -- dari DOKU (QRIS)
  doku_token_id  text,
  payment_url    text,
  raw_response   jsonb,
  expires_at     timestamptz,
  paid_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_pay_form     ON public.form_payment_transactions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_pay_response ON public.form_payment_transactions(response_id);
CREATE INDEX IF NOT EXISTS idx_form_pay_status   ON public.form_payment_transactions(status);

CREATE OR REPLACE FUNCTION public.trg_form_pay_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_form_pay_updated_at ON public.form_payment_transactions;
CREATE TRIGGER trg_form_pay_updated_at
  BEFORE UPDATE ON public.form_payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.trg_form_pay_touch_updated_at();

-- Grants: tabel di project ini TIDAK mewarisi default privileges (lihat
-- 023) — tanpa ini edge function (service role) kena "permission denied".
GRANT ALL    ON public.form_payment_transactions TO service_role;
GRANT SELECT ON public.form_payment_transactions TO authenticated;

ALTER TABLE public.form_payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Community admins read form payments" ON public.form_payment_transactions;
CREATE POLICY "Community admins read form payments" ON public.form_payment_transactions
  FOR SELECT TO authenticated
  USING (public.admin_role() IN ('super_admin', 'community_admin'));

-- User baca transaksi miliknya sendiri (halaman register poll status).
DROP POLICY IF EXISTS "Users read own form payments" ON public.form_payment_transactions;
CREATE POLICY "Users read own form payments" ON public.form_payment_transactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ── 3. RPC submit_form_response — REPLACE: cabang event berbayar ──
CREATE OR REPLACE FUNCTION public.submit_form_response(
  p_token text,
  p_answers jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_form forms%ROWTYPE;
  v_existing form_responses%ROWTYPE;
  v_new_status text;
  v_count integer;
  v_resp_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Kamu harus login dulu untuk mendaftar';
  END IF;

  SELECT * INTO v_form FROM forms
    WHERE token = p_token AND status = 'open'
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Form tidak aktif atau sudah ditutup';
  END IF;

  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'object' THEN
    RAISE EXCEPTION 'Jawaban tidak valid';
  END IF;

  -- Event berbayar MELEWATI approval: bayar = terdaftar (webhook yang
  -- flip pending_payment → registered saat DOKU kirim SUCCESS).
  v_new_status := CASE
    WHEN v_form.price IS NOT NULL AND v_form.price > 0 THEN 'pending_payment'
    WHEN v_form.requires_approval THEN 'pending'
    ELSE 'registered'
  END;

  SELECT * INTO v_existing FROM form_responses
    WHERE form_id = v_form.id AND user_id = v_uid
    FOR UPDATE;

  IF FOUND AND v_existing.status IN ('registered', 'pending') THEN
    RAISE EXCEPTION 'Kamu sudah terdaftar di event ini';
  END IF;

  -- Kuota:
  --   registered       → hitung baris registered (perilaku lama).
  --   pending_payment  → hitung registered + reservasi pending_payment
  --                      yang invoice-nya masih hidup, exclude baris
  --                      sendiri (submit ulang bukan slot baru).
  IF v_form.quota IS NOT NULL AND v_new_status IN ('registered', 'pending_payment') THEN
    SELECT count(*) INTO v_count FROM form_responses
      WHERE form_id = v_form.id
        AND id IS DISTINCT FROM v_existing.id
        AND (
          status = 'registered'
          OR (v_new_status = 'pending_payment'
              AND status = 'pending_payment'
              AND payment_expires_at > now())
        );
    IF v_count >= v_form.quota THEN
      RAISE EXCEPTION 'Kuota pendaftar sudah penuh';
    END IF;
  END IF;

  IF FOUND THEN
    -- Submit ulang setelah cancelled/rejected/pending_payment: reuse baris.
    UPDATE form_responses SET
      answers = p_answers,
      status = v_new_status,
      attended = false,
      payment_expires_at = NULL,
      created_at = now()
    WHERE id = v_existing.id
    RETURNING id INTO v_resp_id;
  ELSE
    INSERT INTO form_responses (form_id, user_id, answers, status)
    VALUES (v_form.id, v_uid, p_answers, v_new_status)
    RETURNING id INTO v_resp_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'response_id', v_resp_id,
    'status', v_new_status,
    'price', v_form.price,
    'whatsapp_group_url', v_form.whatsapp_group_url,
    'whatsapp_group_label', coalesce(v_form.whatsapp_group_label, 'Klik Sini'),
    'success_message', v_form.success_message
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_form_response(text, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_form_response(text, jsonb) TO authenticated;

-- ── 4. RPC cancel_form_response — REPLACE: yang sudah bayar tak bisa cancel ──
CREATE OR REPLACE FUNCTION public.cancel_form_response(
  p_token text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_form forms%ROWTYPE;
  v_updated integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Kamu harus login dulu';
  END IF;

  SELECT * INTO v_form FROM forms WHERE token = p_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Form tidak ditemukan';
  END IF;

  -- Event berbayar: registered = sudah bayar → refund manual, bukan
  -- self-cancel. Baris pending_payment juga TIDAK di-cancel lewat sini:
  -- kalau di-cancel saat invoice masih hidup lalu user tetap bayar,
  -- webhook bakal flip baris cancelled → registered (uang sudah masuk).
  -- Biarkan expired sendiri (60 menit) — slot bebas otomatis.
  IF v_form.price IS NOT NULL AND v_form.price > 0 THEN
    RAISE EXCEPTION 'Pendaftaran event berbayar tidak bisa dibatalkan sendiri. Hubungi admin ya.';
  END IF;

  UPDATE form_responses SET status = 'cancelled'
    WHERE form_id = v_form.id AND user_id = v_uid AND status IN ('registered', 'pending');
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Kamu belum terdaftar di event ini';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_form_response(text) TO authenticated;

-- ============================================================
-- MANUAL STEP setelah menjalankan migrasi ini:
-- 1. Deploy edge function baru + redeploy webhook:
--      supabase functions deploy form-create-payment
--      supabase functions deploy doku-webhook --no-verify-jwt
-- 2. Pastikan channel QRIS aktif di dashboard DOKU (checkout event
--    cuma menawarkan QRIS via payment_method_types).
-- 3. Smoke test sandbox (DOKU_ENV=sandbox): set price=10000 pada satu
--    form open → submit dari landing → baris form_responses jadi
--    'pending_payment' + redirect DOKU → bayar QRIS simulator →
--    webhook flip ke 'registered', form_payment_transactions status
--    'success', get_form_participants memunculkan namanya.
-- 4. Cek kuota reservasi: form price>0 quota=1, submit dari 2 akun →
--    akun kedua ditolak selama invoice akun pertama masih hidup;
--    setelah 60 menit (payment_expires_at lewat) akun kedua bisa masuk.
-- 5. Cek cancel: baris registered pada form berbayar → tombol batal
--    ditolak RPC ('...tidak bisa dibatalkan sendiri').
-- ============================================================
