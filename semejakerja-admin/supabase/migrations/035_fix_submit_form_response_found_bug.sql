-- ============================================================
-- 035: Fix submit_form_response — bug variabel FOUND ketiban
--
-- Bug di 034: setelah `SELECT * INTO v_existing ... FOR UPDATE`
-- (yang men-set FOUND dengan benar), ada `SELECT count(*) INTO
-- v_count ...` buat cek kuota. count(*) SELALU balikin 1 baris,
-- jadi FOUND ketiban jadi true — bikin `IF FOUND THEN UPDATE ELSE
-- INSERT` salah masuk ke cabang UPDATE walau user belum pernah
-- submit (v_existing kosong/NULL). UPDATE ke id=NULL kena 0 baris,
-- RETURNING kosong → response_id NULL, tanpa error (ok:true palsu).
--
-- Fix: simpan hasil "ada baris existing atau tidak" ke variabel
-- eksplisit v_has_existing tepat setelah SELECT-nya, jangan
-- bergantung ke FOUND lagi setelah itu (statement lain yang datang
-- setelahnya bisa menimpanya).
--
-- Requires: submit_form_response (034).
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

  v_new_status := CASE WHEN v_form.requires_approval THEN 'pending' ELSE 'registered' END;

  SELECT * INTO v_existing FROM form_responses
    WHERE form_id = v_form.id AND user_id = v_uid
    FOR UPDATE;
  v_has_existing := FOUND;

  IF v_has_existing AND v_existing.status IN ('registered', 'pending') THEN
    RAISE EXCEPTION 'Kamu sudah terdaftar di event ini';
  END IF;

  -- Kuota cuma ditegakkan buat submit yang langsung 'registered'.
  -- Event requires_approval: antrian 'pending' tidak dibatasi kuota,
  -- kuota baru ditegakkan saat admin approve.
  IF v_new_status = 'registered' AND v_form.quota IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM form_responses
      WHERE form_id = v_form.id AND status = 'registered';
    IF v_count >= v_form.quota THEN
      RAISE EXCEPTION 'Kuota pendaftar sudah penuh';
    END IF;
  END IF;

  IF v_has_existing THEN
    -- Submit ulang setelah cancelled/rejected: reuse baris yang sama.
    UPDATE form_responses SET
      answers = p_answers,
      status = v_new_status,
      attended = false,
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
    'whatsapp_group_url', v_form.whatsapp_group_url,
    'whatsapp_group_label', coalesce(v_form.whatsapp_group_label, 'Klik Sini'),
    'success_message', v_form.success_message
  );
END;
$$;

-- ============================================================
-- MANUAL STEP setelah menjalankan migrasi ini:
-- 1. Sebagai user yang tadi gagal daftar (response_id null), panggil
--    submit_form_response lagi dengan token yang sama → sekarang
--    harus balikin response_id yang valid (bukan null), dan SELECT
--    * FROM form_responses WHERE form_id=... AND user_id=... muncul
--    1 baris status='registered' (atau 'pending' kalau requires_approval).
-- 2. Ulangi smoke-test kuota dari 034 (submit di form yang quota-nya
--    sudah terisi) — sekarang response_id-nya harus terisi juga.
-- ============================================================
