-- ============================================================
-- 041: cafe_edits & cafe_photos — identitas dari akun + tutup anon insert
--
-- Sama seperti migration 040 (cafe_reviews): tombol "Koreksi Info" dan
-- "Upload Foto" di web-apps sudah digembok ke member full-access
-- (Nongkrong+) yang login di CafeModal, tapi RLS-nya belum pernah
-- menegakkan itu — anon key publik masih bisa INSERT langsung, dan
-- submitter_name/submitter_wa masih bebas diisi dari form (tidak akurat,
-- bisa dispoof). Beda dengan cafe_reviews: TIDAK ada batas 1x per kafe —
-- koreksi info & foto tetap boleh dikirim berkali-kali oleh user yang sama.
--
-- Requires public.has_full_maps_access() dari migration 040.
-- ============================================================

-- ── cafe_edits ──
CREATE OR REPLACE FUNCTION public.cafe_edits_set_identity()
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

DROP TRIGGER IF EXISTS cafe_edits_set_identity ON cafe_edits;
CREATE TRIGGER cafe_edits_set_identity
  BEFORE INSERT ON cafe_edits
  FOR EACH ROW EXECUTE FUNCTION public.cafe_edits_set_identity();

DROP POLICY IF EXISTS "Public submit cafe edits" ON cafe_edits;
CREATE POLICY "Full-access members submit cafe edits" ON cafe_edits
  FOR INSERT TO authenticated
  WITH CHECK (status = 'pending' AND public.has_full_maps_access());

REVOKE INSERT ON cafe_edits FROM anon;

-- ── cafe_photos ── (tidak ada kolom submitter_wa di tabel ini)
CREATE OR REPLACE FUNCTION public.cafe_photos_set_identity()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT COALESCE(full_name, 'Anggota SK') INTO NEW.submitter_name
  FROM public.user_profiles WHERE id = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cafe_photos_set_identity ON cafe_photos;
CREATE TRIGGER cafe_photos_set_identity
  BEFORE INSERT ON cafe_photos
  FOR EACH ROW EXECUTE FUNCTION public.cafe_photos_set_identity();

DROP POLICY IF EXISTS "Public submit cafe photos" ON cafe_photos;
CREATE POLICY "Full-access members submit cafe photos" ON cafe_photos
  FOR INSERT TO authenticated
  WITH CHECK (status = 'pending' AND public.has_full_maps_access());

REVOKE INSERT ON cafe_photos FROM anon;
