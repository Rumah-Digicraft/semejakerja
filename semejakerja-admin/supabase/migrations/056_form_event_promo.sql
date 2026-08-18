-- ============================================================
-- 056: Kode promo untuk form event berbayar (nempel di 055)
--
-- Reuse sistem promo membership (promo_codes, 001/024) untuk event:
--   • HANYA kode type='event' yang berlaku di form event.
--   • promo_codes.form_id (baru, nullable): kosong = berlaku di semua
--     event berbayar; diisi = dikunci ke satu form (mis. "MERDEKA50"
--     khusus lomba 17an).
--   • RPC preview_form_promo: validasi + hitung harga final buat UI
--     register (pola preview_promo_code 024, TANPA mencatat apa pun).
--   • PEMAKAIAN DICATAT SAAT PEMBAYARAN SUKSES (doku-webhook /
--     free-path di form-create-payment) — BUKAN saat invoice dibuat,
--     beda dari membership (008): invoice event yang ditinggal tidak
--     ngebakar kuota kode. Konsekuensi: max_usage bisa kelewat 1-2
--     kalau beberapa orang bayar barengan di sisa kuota terakhir —
--     trade-off yang diterima untuk event komunitas.
--   • Diskon 100% → harga final 0 → form-create-payment skip DOKU,
--     langsung 'registered' (tiket gratis panitia/undangan).
--
-- Requires: promo_codes + promo_code_usages (001), allowed emails (024),
-- forms + form_payment_transactions (055).
-- ============================================================

-- ── 1. Scope kode ke satu event (opsional) ──────────────────
-- ON DELETE SET NULL (bukan CASCADE): promo_code_usages menahan delete
-- kode yang pernah dipakai, jadi CASCADE bakal memblok hapus form.
-- Kalau event dihapus, kodenya jadi global type 'event' — nonaktifkan
-- manual kalau tidak dipakai lagi.
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS form_id uuid
  REFERENCES forms(id) ON DELETE SET NULL;

-- ── 2. Jejak promo di transaksi event ───────────────────────
ALTER TABLE form_payment_transactions ADD COLUMN IF NOT EXISTS promo_code_id uuid
  REFERENCES promo_codes(id);
ALTER TABLE form_payment_transactions ADD COLUMN IF NOT EXISTS base_amount integer;
ALTER TABLE form_payment_transactions ADD COLUMN IF NOT EXISTS discount_amount integer NOT NULL DEFAULT 0;

-- Baris lama (kalau ada): base = amount, tanpa diskon.
UPDATE form_payment_transactions SET base_amount = amount WHERE base_amount IS NULL;

-- ── 3. RPC preview_form_promo — validasi + harga final (tanpa efek) ──
CREATE OR REPLACE FUNCTION public.preview_form_promo(
  p_form_token text,
  p_code text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_form forms%ROWTYPE;
  v_promo promo_codes%ROWTYPE;
  v_code text := NULLIF(upper(trim(coalesce(p_code, ''))), '');
  v_discount integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Kamu harus login dulu');
  END IF;
  IF v_code IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Masukkan kode promo');
  END IF;

  SELECT * INTO v_form FROM forms
    WHERE token = p_form_token AND status = 'open';
  IF NOT FOUND OR v_form.price IS NULL OR v_form.price <= 0 THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Event ini tidak menerima kode promo');
  END IF;

  SELECT * INTO v_promo FROM promo_codes
    WHERE upper(code) = v_code AND is_active
    LIMIT 1;

  IF NOT FOUND OR v_promo.type <> 'event'
     OR (v_promo.form_id IS NOT NULL AND v_promo.form_id <> v_form.id) THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Kode promo tidak valid untuk event ini');
  END IF;
  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at <= now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Kode promo sudah kadaluarsa');
  END IF;
  IF v_promo.max_usage IS NOT NULL AND v_promo.used_count >= v_promo.max_usage THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Kuota kode promo sudah habis');
  END IF;
  IF v_promo.locked_to_user_id IS NOT NULL AND v_promo.locked_to_user_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Kode promo ini bukan untukmu');
  END IF;
  IF EXISTS (SELECT 1 FROM promo_code_usages
             WHERE code_id = v_promo.id AND user_id = v_uid) THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Kode promo sudah pernah kamu pakai');
  END IF;

  -- Allow-list email (024): kalau ada isinya, hanya email yang cocok.
  IF EXISTS (SELECT 1 FROM promo_code_allowed_emails WHERE code_id = v_promo.id) THEN
    SELECT lower(u.email) INTO v_email FROM auth.users u WHERE u.id = v_uid;
    IF v_email IS NULL OR NOT EXISTS (
      SELECT 1 FROM promo_code_allowed_emails
      WHERE code_id = v_promo.id AND lower(email) = v_email
    ) THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'Kode promo ini khusus untuk email tertentu');
    END IF;
  END IF;

  v_discount := floor(v_form.price * v_promo.discount_percent / 100.0);

  RETURN jsonb_build_object(
    'valid', true,
    'code', v_promo.code,
    'code_id', v_promo.id,
    'discount_percent', v_promo.discount_percent,
    'discount', v_discount,
    'final_price', v_form.price - v_discount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.preview_form_promo(text, text) TO authenticated;

-- ── 4. RPC record_form_promo_usage — catat pemakaian (atomic) ──
-- Dipanggil service-role saja: doku-webhook saat SUCCESS, dan
-- form-create-payment di jalur tiket gratis (diskon 100%, webhook tak
-- terpanggil). Increment used_count + insert usage dalam satu statement
-- supaya race-safe; supabase-js tidak bisa "used_count = used_count + 1".
CREATE OR REPLACE FUNCTION public.record_form_promo_usage(
  p_code_id uuid,
  p_user_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE promo_codes SET used_count = used_count + 1 WHERE id = p_code_id;
  INSERT INTO promo_code_usages (code_id, user_id) VALUES (p_code_id, p_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.record_form_promo_usage(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_form_promo_usage(uuid, uuid) TO service_role;

-- ============================================================
-- MANUAL STEP setelah menjalankan migrasi ini (bareng 055):
-- 1. Redeploy edge functions (form-create-payment + doku-webhook) —
--    keduanya baca kolom/RPC baru di atas.
-- 2. Bikin kode type='event' 50% dikunci ke satu form → preview di
--    register menampilkan harga coret; bayar QRIS → used_count naik
--    SETELAH webhook SUCCESS (cek belum naik saat invoice dibuat).
-- 3. Bikin kode 100% (max_usage=1) → submit + pakai kode → langsung
--    'registered' tanpa lewat DOKU, form_payment_transactions berisi
--    baris amount=0 status='success', used_count naik.
-- 4. Pakai kode yang sama dari akun sama di event lain → ditolak
--    'sudah pernah kamu pakai'; kode ber-form_id dipakai di event lain
--    → 'tidak valid untuk event ini'.
-- ============================================================
