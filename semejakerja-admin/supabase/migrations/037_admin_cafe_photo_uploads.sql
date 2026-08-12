-- ============================================================
-- 037: Admin-side cafe photo uploads
--
-- Lets maps admins upload/replace/remove photos for a cafe directly
-- from the Data Kafe edit page, instead of only reviewing public
-- contributions. The `cafe-photos` bucket already exists (public
-- read, created outside migrations) and public anon upload already
-- works from the web-apps contribute flow — this only adds the
-- authenticated-admin side of storage.objects access, mirroring the
-- payment-proofs pattern from 007. cafe_photos table RLS already
-- covers admin INSERT/UPDATE/DELETE via "Maps admins manage cafe
-- photos" (014); this migration just closes the gap at the storage
-- layer so the upload itself doesn't get blocked by RLS.
-- ============================================================

DROP POLICY IF EXISTS "Maps admins manage cafe photo files" ON storage.objects;
CREATE POLICY "Maps admins manage cafe photo files" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'cafe-photos' AND public.admin_role() IN ('super_admin', 'maps_admin'))
  WITH CHECK (bucket_id = 'cafe-photos' AND public.admin_role() IN ('super_admin', 'maps_admin'));
