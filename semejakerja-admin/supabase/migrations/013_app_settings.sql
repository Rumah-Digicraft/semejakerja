-- ============================================================
-- 013: app_settings — konfigurasi runtime (domain aktif, dll)
-- ============================================================
-- Domain publik (landing, moves) sering berubah selama transisi
-- *.pages.dev → semejakerja.com. Env var (NEXT_PUBLIC_*) bersifat
-- build-time, jadi setiap ganti domain harus redeploy. Tabel ini
-- jadi sumber kebenaran runtime: ubah 1 baris → semua app langsung
-- pakai domain baru tanpa deploy ulang.

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Nilai-nilai ini publik (cuma URL domain) — semua boleh baca.
DROP POLICY IF EXISTS "Public read app settings" ON public.app_settings;
CREATE POLICY "Public read app settings" ON public.app_settings
  FOR SELECT USING (true);

-- Hanya admin yang boleh mengubah (is_admin() dari migration 006/010).
DROP POLICY IF EXISTS "Admins manage app settings" ON public.app_settings;
CREATE POLICY "Admins manage app settings" ON public.app_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

-- Seed: domain yang aktif saat ini (pages.dev; semejakerja.com belum aktif).
INSERT INTO public.app_settings (key, value) VALUES
  ('landing_url', 'https://semejakerja.pages.dev'),
  ('moves_url', 'https://moves.semejakerja.com')
ON CONFLICT (key) DO NOTHING;
