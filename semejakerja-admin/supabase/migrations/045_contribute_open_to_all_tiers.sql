-- ============================================================
-- 045: Buka kontribusi (koreksi info, ulasan, upload foto) ke semua
-- tier member yang login — sebelumnya (migration 040/041/042) dikunci
-- ke tier Nongkrong+ lewat public.has_full_maps_access().
--
-- Keputusan produk: kontribusi bukan fitur premium map (yang tetap
-- Nongkrong+, lihat mapsAccess() di useAuth.ts) — member Nyantai/basic
-- yang sudah login pun boleh koreksi info, tulis ulasan & upload foto.
-- Guest yang belum login tetap harus login dulu (kebutuhan identitas
-- submitter dari akun, lihat trigger *_set_identity di 040/041).
--
-- has_full_maps_access() dibiarkan ada (masih mendokumentasikan tier
-- Nongkrong+ untuk kegunaan lain di masa depan), tapi tidak lagi dipakai
-- di policy INSERT tabel-tabel kontribusi ini.
-- ============================================================

DROP POLICY IF EXISTS "Full-access members submit cafe reviews" ON cafe_reviews;
DROP POLICY IF EXISTS "Logged-in members submit cafe reviews" ON cafe_reviews;
CREATE POLICY "Logged-in members submit cafe reviews" ON cafe_reviews
  FOR INSERT TO authenticated
  WITH CHECK (status = 'pending');

DROP POLICY IF EXISTS "Full-access members submit cafe edits" ON cafe_edits;
DROP POLICY IF EXISTS "Logged-in members submit cafe edits" ON cafe_edits;
CREATE POLICY "Logged-in members submit cafe edits" ON cafe_edits
  FOR INSERT TO authenticated
  WITH CHECK (status = 'pending');

DROP POLICY IF EXISTS "Full-access members submit cafe photos" ON cafe_photos;
DROP POLICY IF EXISTS "Logged-in members submit cafe photos" ON cafe_photos;
CREATE POLICY "Logged-in members submit cafe photos" ON cafe_photos
  FOR INSERT TO authenticated
  WITH CHECK (status = 'pending');

DROP POLICY IF EXISTS "Full-access members upload cafe photos" ON storage.objects;
DROP POLICY IF EXISTS "Logged-in members upload cafe photos" ON storage.objects;
CREATE POLICY "Logged-in members upload cafe photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cafe-photos');
