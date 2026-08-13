-- ============================================================
-- 040: Perketat cafe_reviews — identitas dari akun, 1 review/kafe,
-- dan tutup celah abuse lewat anon key.
--
-- Sebelum ini: siapa pun dengan anon key publik bisa INSERT ke
-- cafe_reviews langsung (bukan cuma lewat UI), reviewer_name/reviewer_wa
-- diisi bebas dari input form (tidak divalidasi), tidak ada batas rating
-- 1-5 di DB, dan tidak ada pembatas jumlah review per user per kafe.
-- Padahal tombol "Tulis Ulasan" di web-apps sendiri sudah digembok ke
-- member tier Nongkrong+ yang login — proteksi itu cuma di client,
-- RLS-nya tidak pernah menegakkannya.
--
-- Perubahan:
--   1. Kolom user_id (auth.users) + constraint rating 1-5.
--   2. Index unik (cafe_id, user_id) → 1 user cuma bisa review 1x per kafe.
--   3. Trigger BEFORE INSERT yang MEMAKSA user_id, reviewer_name,
--      reviewer_wa dari akun yang login (public.user_profiles) — nilai
--      apa pun yang dikirim client untuk kolom ini diabaikan/ditimpa.
--   4. Helper public.has_full_maps_access() (mirror logic mapsAccess()
--      di semejakerja-web-apps/src/hooks/useAuth.ts: tier nongkrong/
--      mode_serius, status active, belum expired).
--   5. RLS INSERT: hanya authenticated + status pending + tier
--      full-access — anon key publik tidak lagi bisa INSERT sama sekali.
--   6. RLS SELECT tambahan: user boleh baca review miliknya sendiri
--      (semua status), dipakai UI utk cek "sudah pernah review?".
-- ============================================================

-- ── 1. Kolom user_id + validasi rating ──
ALTER TABLE cafe_reviews ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

ALTER TABLE cafe_reviews DROP CONSTRAINT IF EXISTS cafe_reviews_rating_range;
ALTER TABLE cafe_reviews ADD CONSTRAINT cafe_reviews_rating_range CHECK (rating BETWEEN 1 AND 5);

-- ── 2. 1 review per user per kafe (baris lama tanpa user_id tidak kena) ──
DROP INDEX IF EXISTS cafe_reviews_one_per_user_per_cafe;
CREATE UNIQUE INDEX cafe_reviews_one_per_user_per_cafe
  ON cafe_reviews (cafe_id, user_id) WHERE user_id IS NOT NULL;

-- ── 3. Identitas review dipaksa dari akun, tidak bisa dispoof client ──
CREATE OR REPLACE FUNCTION public.cafe_reviews_set_identity()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_id := auth.uid();
  SELECT full_name, phone INTO NEW.reviewer_name, NEW.reviewer_wa
  FROM public.user_profiles WHERE id = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cafe_reviews_set_identity ON cafe_reviews;
CREATE TRIGGER cafe_reviews_set_identity
  BEFORE INSERT ON cafe_reviews
  FOR EACH ROW EXECUTE FUNCTION public.cafe_reviews_set_identity();

-- ── 4. Helper: user login sekarang punya akses "full" (Nongkrong+)? ──
-- Mirror persis mapsAccess() di useAuth.ts — SECURITY DEFINER supaya bisa
-- baca memberships dari dalam policy tabel lain tanpa terganjal RLS-nya.
CREATE OR REPLACE FUNCTION public.has_full_maps_access()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
      AND tier IN ('nongkrong', 'mode_serius')
  )
$$;

REVOKE ALL ON FUNCTION public.has_full_maps_access() FROM public;
GRANT EXECUTE ON FUNCTION public.has_full_maps_access() TO authenticated;

-- ── 5. RLS: hanya member full-access yang login yang boleh submit ──
DROP POLICY IF EXISTS "Public submit cafe reviews" ON cafe_reviews;
CREATE POLICY "Full-access members submit cafe reviews" ON cafe_reviews
  FOR INSERT TO authenticated
  WITH CHECK (status = 'pending' AND public.has_full_maps_access());

-- ── 6. User boleh baca review miliknya sendiri (semua status) ──
DROP POLICY IF EXISTS "Users read own cafe reviews" ON cafe_reviews;
CREATE POLICY "Users read own cafe reviews" ON cafe_reviews
  FOR SELECT USING (user_id = auth.uid());

-- Cabut INSERT dari anon — dulu anon key publik bisa insert langsung
-- tanpa login sama sekali. SELECT (baca review approved) tetap dibiarkan
-- untuk anon, dipakai tampilan publik yang belum login.
REVOKE INSERT ON cafe_reviews FROM anon;
