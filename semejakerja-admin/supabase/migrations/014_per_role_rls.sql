-- ============================================================
-- 014: RLS per-role + amankan tabel legacy + RPC manajemen admin
--
-- Sampai 013, semua policy admin memakai public.is_admin() yang cuma
-- mengecek keberadaan baris di admin_roles — maps_admin, community_admin,
-- moves_admin, dan super_admin punya kuasa database yang identik.
-- Migrasi ini membagi kuasa itu per domain lewat helper baru
-- public.admin_role(), dan sekaligus meng-enable RLS di tabel legacy
-- yang selama ini terbuka lebar (siapa pun dengan anon key bisa
-- UPDATE cafes — fallback lama di web-apps membuktikannya):
--   cafes, cafe_submissions, cafe_edits, cafe_reviews, cafe_photos,
--   cashflow_entries.
--
-- Pembagian domain (mengikuti sidebar admin):
--   maps_admin      → cafes + tabel moderasi
--   community_admin → user_profiles (tulis), memberships, promo_codes(+usages)
--   moves_admin     → sessions, participants, addons(+subscriptions/dropin),
--                     cashflow_entries (halaman sesi mencatat cashflow)
--   super_admin     → semua di atas + app_settings + lapkeu
--
-- Requires: admin_roles + public.is_admin() dari migration 006.
-- is_admin() TIDAK dihapus (masih dipakai policy lama yang belum
-- ter-cover di sini dan sebagai kompat mundur).
-- ============================================================

-- ── 1. Helper: role admin pemanggil (NULL kalau bukan admin) ──
-- SECURITY DEFINER supaya bisa membaca admin_roles dari dalam policy
-- tabel lain tanpa terganjal RLS admin_roles itu sendiri.
CREATE OR REPLACE FUNCTION public.admin_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM admin_roles WHERE user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.admin_role() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_role() TO anon, authenticated;

-- ── 2. Community: super_admin + community_admin ──
-- Baca profil dibuka untuk SEMUA role admin (dipakai dashboard dan
-- join nama member lintas halaman); tulis hanya community/super.
DROP POLICY IF EXISTS "Admins read all profiles" ON user_profiles;
CREATE POLICY "Admins read all profiles" ON user_profiles
  FOR SELECT TO authenticated USING (public.admin_role() IS NOT NULL);

DROP POLICY IF EXISTS "Admins update all profiles" ON user_profiles;
CREATE POLICY "Admins update all profiles" ON user_profiles
  FOR UPDATE TO authenticated
  USING (public.admin_role() IN ('super_admin', 'community_admin'))
  WITH CHECK (public.admin_role() IN ('super_admin', 'community_admin'));

DROP POLICY IF EXISTS "Admins manage memberships" ON memberships;
CREATE POLICY "Admins manage memberships" ON memberships
  FOR ALL TO authenticated
  USING (public.admin_role() IN ('super_admin', 'community_admin'))
  WITH CHECK (public.admin_role() IN ('super_admin', 'community_admin'));

DROP POLICY IF EXISTS "Admins manage promo codes" ON promo_codes;
CREATE POLICY "Admins manage promo codes" ON promo_codes
  FOR ALL TO authenticated
  USING (public.admin_role() IN ('super_admin', 'community_admin'))
  WITH CHECK (public.admin_role() IN ('super_admin', 'community_admin'));

DROP POLICY IF EXISTS "Admins read promo usages" ON promo_code_usages;
CREATE POLICY "Admins read promo usages" ON promo_code_usages
  FOR SELECT TO authenticated
  USING (public.admin_role() IN ('super_admin', 'community_admin'));

-- ── 3. Add-on: super_admin + moves_admin (menu Add-on ada di Moves) ──
DROP POLICY IF EXISTS "Admins manage addons" ON addons;
CREATE POLICY "Admins manage addons" ON addons
  FOR ALL TO authenticated
  USING (public.admin_role() IN ('super_admin', 'moves_admin'))
  WITH CHECK (public.admin_role() IN ('super_admin', 'moves_admin'));

DROP POLICY IF EXISTS "Admins manage addon subscriptions" ON addon_subscriptions;
CREATE POLICY "Admins manage addon subscriptions" ON addon_subscriptions
  FOR ALL TO authenticated
  USING (public.admin_role() IN ('super_admin', 'moves_admin'))
  WITH CHECK (public.admin_role() IN ('super_admin', 'moves_admin'));

DROP POLICY IF EXISTS "Admins manage addon dropin" ON addon_dropin;
CREATE POLICY "Admins manage addon dropin" ON addon_dropin
  FOR ALL TO authenticated
  USING (public.admin_role() IN ('super_admin', 'moves_admin'))
  WITH CHECK (public.admin_role() IN ('super_admin', 'moves_admin'));

-- ── 4. Moves: super_admin + moves_admin ──
-- Policy publik dari 007 ("Public read open sessions", "Public read
-- participants of open sessions") dan RPC token join_moves_session /
-- submit_moves_payment TIDAK disentuh.
DROP POLICY IF EXISTS "Admins manage sessions" ON sessions;
CREATE POLICY "Admins manage sessions" ON sessions
  FOR ALL TO authenticated
  USING (public.admin_role() IN ('super_admin', 'moves_admin'))
  WITH CHECK (public.admin_role() IN ('super_admin', 'moves_admin'));

DROP POLICY IF EXISTS "Admins manage participants" ON participants;
CREATE POLICY "Admins manage participants" ON participants
  FOR ALL TO authenticated
  USING (public.admin_role() IN ('super_admin', 'moves_admin'))
  WITH CHECK (public.admin_role() IN ('super_admin', 'moves_admin'));

-- ── 5. Settings: hanya super_admin ("Public read app settings" tetap) ──
DROP POLICY IF EXISTS "Admins manage app settings" ON app_settings;
CREATE POLICY "Admins manage app settings" ON app_settings
  FOR ALL TO authenticated
  USING (public.admin_role() = 'super_admin')
  WITH CHECK (public.admin_role() = 'super_admin');

-- ── 6. Tabel legacy: enable RLS + policy + grant eksplisit ──
-- RLS hanya memfilter baris; role tetap butuh GRANT di level tabel
-- (tanpa grant → error 42501). REVOKE dulu supaya sisa default
-- privilege yang terlalu lebar ikut bersih.

-- 6a. cafes — peta publik membaca, hanya maps/super yang menulis.
ALTER TABLE cafes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read cafes" ON cafes;
CREATE POLICY "Public read cafes" ON cafes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Maps admins manage cafes" ON cafes;
CREATE POLICY "Maps admins manage cafes" ON cafes
  FOR ALL TO authenticated
  USING (public.admin_role() IN ('super_admin', 'maps_admin'))
  WITH CHECK (public.admin_role() IN ('super_admin', 'maps_admin'));

REVOKE ALL ON cafes FROM anon, authenticated;
GRANT SELECT ON cafes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON cafes TO authenticated;
GRANT ALL ON cafes TO service_role;

-- 6b. Tabel kontribusi (moderasi). Publik boleh MENGIRIM (insert
-- status 'pending'); tidak boleh membaca submissions/edits (ada nomor
-- WA pengirim). Review & foto yang sudah approved boleh dibaca publik
-- (web-apps menampilkannya). Web-apps insert tanpa menyebut status —
-- pastikan default 'pending'.
ALTER TABLE cafe_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafe_submissions ALTER COLUMN status SET DEFAULT 'pending';

DROP POLICY IF EXISTS "Public submit cafe submissions" ON cafe_submissions;
CREATE POLICY "Public submit cafe submissions" ON cafe_submissions
  FOR INSERT WITH CHECK (status = 'pending');

DROP POLICY IF EXISTS "Maps admins manage cafe submissions" ON cafe_submissions;
CREATE POLICY "Maps admins manage cafe submissions" ON cafe_submissions
  FOR ALL TO authenticated
  USING (public.admin_role() IN ('super_admin', 'maps_admin'))
  WITH CHECK (public.admin_role() IN ('super_admin', 'maps_admin'));

REVOKE ALL ON cafe_submissions FROM anon, authenticated;
GRANT INSERT ON cafe_submissions TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON cafe_submissions TO authenticated;
GRANT ALL ON cafe_submissions TO service_role;

ALTER TABLE cafe_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafe_edits ALTER COLUMN status SET DEFAULT 'pending';

DROP POLICY IF EXISTS "Public submit cafe edits" ON cafe_edits;
CREATE POLICY "Public submit cafe edits" ON cafe_edits
  FOR INSERT WITH CHECK (status = 'pending');

DROP POLICY IF EXISTS "Maps admins manage cafe edits" ON cafe_edits;
CREATE POLICY "Maps admins manage cafe edits" ON cafe_edits
  FOR ALL TO authenticated
  USING (public.admin_role() IN ('super_admin', 'maps_admin'))
  WITH CHECK (public.admin_role() IN ('super_admin', 'maps_admin'));

REVOKE ALL ON cafe_edits FROM anon, authenticated;
GRANT INSERT ON cafe_edits TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON cafe_edits TO authenticated;
GRANT ALL ON cafe_edits TO service_role;

ALTER TABLE cafe_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafe_reviews ALTER COLUMN status SET DEFAULT 'pending';

DROP POLICY IF EXISTS "Public submit cafe reviews" ON cafe_reviews;
CREATE POLICY "Public submit cafe reviews" ON cafe_reviews
  FOR INSERT WITH CHECK (status = 'pending');

DROP POLICY IF EXISTS "Public read approved cafe reviews" ON cafe_reviews;
CREATE POLICY "Public read approved cafe reviews" ON cafe_reviews
  FOR SELECT USING (status = 'approved');

DROP POLICY IF EXISTS "Maps admins manage cafe reviews" ON cafe_reviews;
CREATE POLICY "Maps admins manage cafe reviews" ON cafe_reviews
  FOR ALL TO authenticated
  USING (public.admin_role() IN ('super_admin', 'maps_admin'))
  WITH CHECK (public.admin_role() IN ('super_admin', 'maps_admin'));

REVOKE ALL ON cafe_reviews FROM anon, authenticated;
GRANT SELECT, INSERT ON cafe_reviews TO anon, authenticated;
GRANT UPDATE, DELETE ON cafe_reviews TO authenticated;
GRANT ALL ON cafe_reviews TO service_role;

ALTER TABLE cafe_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafe_photos ALTER COLUMN status SET DEFAULT 'pending';

DROP POLICY IF EXISTS "Public submit cafe photos" ON cafe_photos;
CREATE POLICY "Public submit cafe photos" ON cafe_photos
  FOR INSERT WITH CHECK (status = 'pending');

DROP POLICY IF EXISTS "Public read approved cafe photos" ON cafe_photos;
CREATE POLICY "Public read approved cafe photos" ON cafe_photos
  FOR SELECT USING (status = 'approved');

DROP POLICY IF EXISTS "Maps admins manage cafe photos" ON cafe_photos;
CREATE POLICY "Maps admins manage cafe photos" ON cafe_photos
  FOR ALL TO authenticated
  USING (public.admin_role() IN ('super_admin', 'maps_admin'))
  WITH CHECK (public.admin_role() IN ('super_admin', 'maps_admin'));

REVOKE ALL ON cafe_photos FROM anon, authenticated;
GRANT SELECT, INSERT ON cafe_photos TO anon, authenticated;
GRANT UPDATE, DELETE ON cafe_photos TO authenticated;
GRANT ALL ON cafe_photos TO service_role;

-- 6c. cashflow_entries — super_admin (lapkeu) + moves_admin (halaman
-- sesi moves mencatat/menghapus cashflow). Tanpa akses publik.
ALTER TABLE cashflow_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Finance admins manage cashflow" ON cashflow_entries;
CREATE POLICY "Finance admins manage cashflow" ON cashflow_entries
  FOR ALL TO authenticated
  USING (public.admin_role() IN ('super_admin', 'moves_admin'))
  WITH CHECK (public.admin_role() IN ('super_admin', 'moves_admin'));

REVOKE ALL ON cashflow_entries FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cashflow_entries TO authenticated;
GRANT ALL ON cashflow_entries TO service_role;

-- ── 7. increment_cafe_clicks jadi SECURITY DEFINER ──
-- Versi 004 adalah fungsi biasa: begitu cafes ber-RLS, klik dari peta
-- publik (anon) berhenti tercatat. SECURITY DEFINER membolehkan update
-- kolom clicks saja lewat fungsi ini, tanpa membuka UPDATE langsung.
CREATE OR REPLACE FUNCTION public.increment_cafe_clicks(cafe_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE cafes
  SET clicks = clicks + 1
  WHERE id = cafe_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_cafe_clicks(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_cafe_clicks(UUID) TO anon, authenticated;

-- ── 8. RPC manajemen admin — HANYA service_role ──
-- Dipakai route handler /api/admins di panel admin (createAdminClient).
-- admin_roles sendiri tidak berubah: self-read saja, tulis tetap lewat
-- service role.
CREATE OR REPLACE FUNCTION public.admin_list_admins()
RETURNS TABLE(user_id uuid, email text, role text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ar.user_id, u.email::text, ar.role, ar.created_at
  FROM admin_roles ar
  JOIN auth.users u ON u.id = ar.user_id
  ORDER BY ar.created_at
$$;

REVOKE ALL ON FUNCTION public.admin_list_admins() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_admins() TO service_role;

CREATE OR REPLACE FUNCTION public.admin_lookup_user_by_email(p_email text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(trim(p_email)) LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.admin_lookup_user_by_email(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_lookup_user_by_email(text) TO service_role;

-- ============================================================
-- MANUAL STEP (setelah menjalankan migrasi ini di SQL editor):
-- 1. Audit isi admin_roles — pastikan tiap akun memegang role yang
--    benar:  SELECT ar.role, u.email FROM admin_roles ar
--            JOIN auth.users u ON u.id = ar.user_id;
-- 2. PENTING: akun yang dipakai login semejamoves-web-apps menulis
--    sessions/participants/cashflow_entries langsung — akun itu WAJIB
--    punya role moves_admin atau super_admin, kalau tidak app-nya
--    berhenti bisa menyimpan.
-- 3. sports_config (dipakai semejamoves) tidak diatur di sini —
--    verifikasi masih terbaca setelah migrasi.
-- 4. Smoke-test peta publik (semejakerja-web-apps): daftar kafe tampil,
--    klik kafe menaikkan clicks, kirim review/kontribusi anonim sukses,
--    review approved tetap tampil.
-- 5. Fallback lama di web-apps (UPDATE cafes langsung dengan anon key,
--    src/App.tsx) memang akan gagal mulai sekarang — itu celah yang
--    sengaja ditutup; jalur RPC increment_cafe_clicks tetap hidup.
-- ============================================================
