-- ============================================================
-- 042: cafe-photos bucket — izinkan member full-access upload
--
-- Ditemukan lewat Supabase Dashboard (Storage → cafe-photos → Policies):
-- storage.objects bucket cafe-photos CUMA punya 1 policy — "Maps admins
-- manage cafe photo files" (037), khusus admin_role() IN ('super_admin',
-- 'maps_admin'). Tidak ada policy apa pun yang mengizinkan member biasa
-- upload ke bucket ini. Komentar di 037 yang bilang "public anon upload
-- sudah jalan dari web-apps contribute flow, dibuat di luar migration"
-- ternyata TIDAK AKURAT — policy itu tidak pernah ada (atau sudah hilang).
--
-- Ini akar masalah upload foto gagal dari web publik: insert ke tabel
-- cafe_photos bisa lolos (RLS tabel, migration 041), tapi upload file
-- fisiknya ke storage ditolak duluan karena tidak ada policy INSERT utk
-- role authenticated non-admin.
-- ============================================================

DROP POLICY IF EXISTS "Full-access members upload cafe photos" ON storage.objects;
CREATE POLICY "Full-access members upload cafe photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cafe-photos' AND public.has_full_maps_access());
