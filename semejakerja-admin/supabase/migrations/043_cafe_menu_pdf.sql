-- ============================================================
-- 043: Menu PDF per kafe
--
-- Admin upload 1 file PDF menu per kafe dari Data Kafe → edit kafe
-- (MenuManager.tsx, sama pola dengan PhotoManager.tsx). User publik lihat
-- lewat tombol "Lihat Menu (PDF)" di detail kafe pada peta.
--
-- Bucket dibuat lewat migration (bukan dashboard manual) supaya tercatat
-- di git — beda dengan cafe-photos yang historisnya dibuat manual (lihat
-- catatan di 037). Pola SQL mengikuti payment-proofs (007).
-- ============================================================

ALTER TABLE cafes ADD COLUMN IF NOT EXISTS menu_pdf_path text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('cafe-menus', 'cafe-menus', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read cafe menus" ON storage.objects;
CREATE POLICY "Public read cafe menus" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'cafe-menus');

DROP POLICY IF EXISTS "Maps admins manage cafe menus" ON storage.objects;
CREATE POLICY "Maps admins manage cafe menus" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'cafe-menus' AND public.admin_role() IN ('super_admin', 'maps_admin'))
  WITH CHECK (bucket_id = 'cafe-menus' AND public.admin_role() IN ('super_admin', 'maps_admin'));
