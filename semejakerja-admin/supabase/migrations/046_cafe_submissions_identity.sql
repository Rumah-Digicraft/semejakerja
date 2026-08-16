-- ============================================================
-- 046: cafe_submissions ("Usulkan Cafe Baru") — samakan flow identitas &
-- RLS dengan cafe_edits/cafe_reviews/cafe_photos (migration 041 + 045).
--
-- Sebelum ini: tombol "Tambahkan Tempat Baru" di web-apps masih pakai step
-- identitas manual (nama + WA diisi bebas di form) dan RLS masih
-- mengizinkan INSERT dari anon key publik langsung (migration 014) — beda
-- sendiri dari 3 jenis kontribusi lain, yang identitasnya sudah dipaksa
-- dari akun login sejak 041 dan dibuka untuk semua tier member yang login
-- (bukan cuma Nongkrong+) sejak 045.
--
-- Requires public.user_profiles (dipakai trigger *_set_identity lain).
-- ============================================================

CREATE OR REPLACE FUNCTION public.cafe_submissions_set_identity()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT COALESCE(full_name, 'Anggota SK'), phone INTO NEW.submitter_name, NEW.submitter_wa
  FROM public.user_profiles WHERE id = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cafe_submissions_set_identity ON cafe_submissions;
CREATE TRIGGER cafe_submissions_set_identity
  BEFORE INSERT ON cafe_submissions
  FOR EACH ROW EXECUTE FUNCTION public.cafe_submissions_set_identity();

DROP POLICY IF EXISTS "Public submit cafe submissions" ON cafe_submissions;
DROP POLICY IF EXISTS "Logged-in members submit cafe submissions" ON cafe_submissions;
CREATE POLICY "Logged-in members submit cafe submissions" ON cafe_submissions
  FOR INSERT TO authenticated
  WITH CHECK (status = 'pending');

-- Anon key publik tidak lagi bisa INSERT langsung tanpa login.
REVOKE INSERT ON cafe_submissions FROM anon;
