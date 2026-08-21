-- ============================================================
-- 057: Fix submit_form_response — bug FOUND ketiban (REGRESI dari 055)
--
-- Migrasi 055 menulis ulang submit_form_response dari basis 034 —
-- yang artinya fix 035 IKUT KEHAPUS. Bug-nya persis sama:
--
--   SELECT * INTO v_existing ...        -- FOUND benar di sini
--   SELECT count(*) INTO v_count ...    -- count(*) SELALU 1 baris → FOUND = true
--   IF FOUND THEN UPDATE ... ELSE INSERT
--
-- Pendaftar baru masuk cabang UPDATE dengan v_existing.id = NULL →
-- 0 baris kena → RETURNING kosong → response_id NULL, TAPI fungsi
-- tetap balikin ok:true + status. Jadi:
--   • baris form_responses tidak pernah dibuat,
--   • landing page kira submit sukses lalu manggil form-create-payment,
--   • edge function tidak nemu barisnya → 400 "Isi form pendaftaran dulu ya".
--
-- Kena di form ber-kuota yang statusnya langsung 'registered' atau
-- 'pending_payment' (cabang kuota 055 yang menjalankan count(*) itu).
-- Efek nyata: form berbayar "SEMEJA MERDEKA" (price 17000, quota 30)
-- 0 pendaftar sejak dibuat — semua submit jadi sukses palsu.
--
-- Fix: sama seperti 035 — simpan hasilnya ke v_has_existing tepat
-- setelah SELECT-nya, plus guard eksplisit kalau v_resp_id NULL biar
-- kegagalan senyap seperti ini tidak pernah lolos lagi ke client.
--
-- Requires: submit_form_response (055).
-- ============================================================

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
  v_has_existing boolean;
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
  -- JANGAN baca FOUND lagi setelah baris ini — statement apa pun di
  -- bawah (termasuk count(*)) bakal menimpanya. Lihat 035.
  v_has_existing := FOUND;

  IF v_has_existing AND v_existing.status IN ('registered', 'pending') THEN
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

  IF v_has_existing THEN
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

  -- Jaring pengaman: sukses palsu (response_id NULL) bikin client lanjut
  -- ke pembayaran padahal barisnya tidak ada. Lebih baik gagal berisik.
  IF v_resp_id IS NULL THEN
    RAISE EXCEPTION 'Gagal menyimpan pendaftaran, coba lagi ya';
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

-- ============================================================
-- MANUAL STEP setelah menjalankan migrasi ini:
-- 1. Tidak ada data yang perlu dibersihkan — bug ini TIDAK membuat
--    baris apa pun (UPDATE ke id NULL kena 0 baris). User yang tadi
--    nyangkut di layar "Selesaikan pembayaran" tinggal refresh:
--    form-nya balik muncul dan bisa submit ulang.
-- 2. Smoke test di form berbayar ber-kuota (SEMEJA MERDEKA):
--    submit → form_responses dapat 1 baris 'pending_payment' +
--    redirect ke DOKU QRIS → bayar → webhook flip ke 'registered'.
-- 3. CATATAN buat migrasi berikutnya yang menyentuh fungsi ini:
--    JANGAN copy-paste badan fungsi dari 034/055 — pakai versi ini
--    (v_has_existing), karena bug FOUND ini sudah dua kali balik.
-- ============================================================
