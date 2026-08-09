-- ============================================================
-- 034: Siklus hidup respons form WFC — 1x submit, self-cancel,
-- approval per-event
--
-- forms.requires_approval: admin pilih jenis event saat dibuat.
--   • false (default) → submit langsung status 'registered', kena
--     cek kuota saat itu juga (perilaku lama, tidak berubah).
--   • true  → submit masuk status 'pending' (TIDAK dihitung ke
--     kuota / registered_count) sampai admin approve lewat RPC
--     admin_review_form_response.
--
-- form_responses.user_id + UNIQUE(form_id, user_id): satu akun cuma
-- boleh punya 1 baris per form. Baris lama (sebelum migrasi ini)
-- tetap user_id NULL — unique constraint tidak masalah karena
-- Postgres tidak menganggap NULL = NULL, jadi tidak ada row lama
-- yang bentrok.
--
-- form_responses.status: pending | registered | cancelled | rejected.
-- Cancel & reject TIDAK menghapus baris (soft-delete) — kalau user
-- submit ulang setelah cancel/reject, baris yang sama di-UPDATE
-- (bukan INSERT baru), supaya unique constraint & histori tetap 1
-- baris per user per form.
--
-- Requires: forms + form_responses (030), public_wfc_events (031),
-- public.admin_role() (014).
-- ============================================================

-- ── 1. Kolom baru ────────────────────────────────────────────
ALTER TABLE forms ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT false;

ALTER TABLE form_responses ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE form_responses ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'registered'
  CHECK (status IN ('pending', 'registered', 'cancelled', 'rejected'));

ALTER TABLE form_responses DROP CONSTRAINT IF EXISTS form_responses_form_user_unique;
ALTER TABLE form_responses ADD CONSTRAINT form_responses_form_user_unique UNIQUE (form_id, user_id);

-- ── 2. RPC submit_form_response — REPLACE: 1x per user + approval ──
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

  v_new_status := CASE WHEN v_form.requires_approval THEN 'pending' ELSE 'registered' END;

  SELECT * INTO v_existing FROM form_responses
    WHERE form_id = v_form.id AND user_id = v_uid
    FOR UPDATE;

  IF FOUND AND v_existing.status IN ('registered', 'pending') THEN
    RAISE EXCEPTION 'Kamu sudah terdaftar di event ini';
  END IF;

  -- Kuota cuma ditegakkan buat submit yang langsung 'registered'.
  -- Event requires_approval: antrian 'pending' tidak dibatasi kuota,
  -- kuota baru ditegakkan saat admin approve (lihat RPC di bawah).
  IF v_new_status = 'registered' AND v_form.quota IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM form_responses
      WHERE form_id = v_form.id AND status = 'registered';
    IF v_count >= v_form.quota THEN
      RAISE EXCEPTION 'Kuota pendaftar sudah penuh';
    END IF;
  END IF;

  IF FOUND THEN
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

-- Wajib login sekarang (butuh auth.uid() buat 1x-submit) — anon dicabut.
REVOKE ALL ON FUNCTION public.submit_form_response(text, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_form_response(text, jsonb) TO authenticated;

-- ── 3. RPC baru: cancel_form_response — user batalkan pendaftaran sendiri ──
-- Tidak mensyaratkan form status='open' — user harus tetap bisa cancel
-- walau admin sudah menutup form.
CREATE OR REPLACE FUNCTION public.cancel_form_response(
  p_token text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_form_id uuid;
  v_updated integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Kamu harus login dulu';
  END IF;

  SELECT id INTO v_form_id FROM forms WHERE token = p_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Form tidak ditemukan';
  END IF;

  UPDATE form_responses SET status = 'cancelled'
    WHERE form_id = v_form_id AND user_id = v_uid AND status IN ('registered', 'pending');
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Kamu belum terdaftar di event ini';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_form_response(text) TO authenticated;

-- ── 4. RPC baru: admin_review_form_response — approve/reject antrian ──
-- Cek admin_role() manual di dalam (SECURITY DEFINER melewati RLS).
-- Approve mengunci & mengecek kuota lagi (race-safe kalau beberapa
-- baris di-approve bersamaan).
CREATE OR REPLACE FUNCTION public.admin_review_form_response(
  p_response_id uuid,
  p_status text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resp form_responses%ROWTYPE;
  v_form forms%ROWTYPE;
  v_count integer;
BEGIN
  IF public.admin_role() NOT IN ('super_admin', 'community_admin') THEN
    RAISE EXCEPTION 'Tidak diizinkan';
  END IF;
  IF p_status NOT IN ('registered', 'rejected') THEN
    RAISE EXCEPTION 'Status tidak valid';
  END IF;

  SELECT * INTO v_resp FROM form_responses WHERE id = p_response_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Respons tidak ditemukan';
  END IF;

  SELECT * INTO v_form FROM forms WHERE id = v_resp.form_id FOR UPDATE;

  IF p_status = 'registered' AND v_form.quota IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM form_responses
      WHERE form_id = v_form.id AND status = 'registered' AND id <> p_response_id;
    IF v_count >= v_form.quota THEN
      RAISE EXCEPTION 'Kuota sudah penuh';
    END IF;
  END IF;

  UPDATE form_responses SET status = p_status WHERE id = p_response_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_review_form_response(uuid, text) TO authenticated;

-- ── 5. RLS: user baca respons miliknya sendiri ──────────────
DROP POLICY IF EXISTS "Users read own form response" ON form_responses;
CREATE POLICY "Users read own form response" ON form_responses
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ── 6. View public_wfc_events — cuma hitung status='registered' ──
CREATE OR REPLACE VIEW public.public_wfc_events
WITH (security_invoker = false) AS
SELECT
  f.id,
  f.title,
  f.cafe_name,
  f.description,
  f.token,
  f.quota,
  f.event_date,
  f.location,
  (SELECT count(*) FROM form_responses r WHERE r.form_id = f.id AND r.status = 'registered') AS registered_count
FROM forms f
WHERE f.status = 'open' AND f.show_on_landing = true;

GRANT SELECT ON public.public_wfc_events TO anon, authenticated;

-- ============================================================
-- MANUAL STEP setelah menjalankan migrasi ini:
-- 1. Sebagai user login, panggil submit_form_response 2x dengan token
--    form yang sama → panggilan kedua RAISE 'Kamu sudah terdaftar...'.
-- 2. Panggil cancel_form_response(token) → row jadi status='cancelled'.
--    Panggil submit_form_response lagi dengan token yang sama →
--    sukses, dan SELECT count(*) FROM form_responses WHERE
--    form_id=... AND user_id=... tetap 1 (reuse baris, bukan INSERT
--    baru).
-- 3. Set forms.requires_approval=true pada satu form, kuota=1, submit
--    dari 2 akun berbeda → keduanya masuk status='pending' (tidak
--    ditolak kuota). Cek SELECT * FROM public_wfc_events →
--    registered_count=0 buat form itu.
-- 4. Sebagai community_admin, panggil admin_review_form_response
--    (id_respons_1, 'registered') → sukses, registered_count naik
--    jadi 1. Panggil untuk respons_2 dengan 'registered' → RAISE
--    'Kuota sudah penuh' (kuota=1 sudah terisi). Panggil dengan
--    'rejected' untuk respons_2 → sukses, status='rejected'.
-- ============================================================
