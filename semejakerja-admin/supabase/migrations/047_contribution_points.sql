-- ============================================================
-- 047: Poin kontribusi member — ledger + leaderboard bulanan
--
-- Reward system: member yang usulan cafe barunya / koreksi info-nya /
-- fotonya DISETUJUI ADMIN dapat poin (20 / 15 / 10 per approved photo).
-- Poin cuma dihitung di sisi server saat status berubah pending→approved
-- (trigger AFTER UPDATE) — client tidak pernah mengirim angka poin sendiri,
-- sama seperti pola anti-cheat submit_tebak_kafe_score() di migration 039.
--
-- Ketiga tabel sumber (cafe_submissions, cafe_edits, cafe_photos) belum
-- pernah punya kolom user_id — cuma submitter_name/submitter_wa teks
-- (lihat trigger *_set_identity di 041/046). Tanpa user_id, poin tidak
-- bisa ditempelkan ke akun mana pun secara aman (submitter_name bisa
-- kebetulan sama/dispoof). Bagian 1 mengisi gap itu, mirror persis pola
-- cafe_reviews.user_id dari migration 040.
--
-- Model data: ledger append-only (1 baris per approval), BUKAN 1 kolom
-- skor yang di-reset tiap bulan — supaya leaderboard bulan berjalan
-- (SUM ... WHERE bulan ini) otomatis "reset" tiap tanggal 1 tanpa proses
-- cron, dan riwayat semua bulan tetap ada buat diaudit (ada hadiah fisik
-- di baliknya, jadi harus bisa ditelusuri kalau ada yang komplain).
-- ============================================================

-- ── 1. Backfill user_id di 3 tabel sumber (nullable — baris lama tidak
--       punya identitas ini) + trigger identitas ikut nyetempel user_id ──
ALTER TABLE cafe_submissions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE cafe_edits       ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE cafe_photos      ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

CREATE OR REPLACE FUNCTION public.cafe_submissions_set_identity()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_id := auth.uid();
  SELECT COALESCE(full_name, 'Anggota SK'), phone INTO NEW.submitter_name, NEW.submitter_wa
  FROM public.user_profiles WHERE id = auth.uid();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cafe_edits_set_identity()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_id := auth.uid();
  SELECT COALESCE(full_name, 'Anggota SK'), phone INTO NEW.submitter_name, NEW.submitter_wa
  FROM public.user_profiles WHERE id = auth.uid();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cafe_photos_set_identity()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_id := auth.uid();
  SELECT COALESCE(full_name, 'Anggota SK') INTO NEW.submitter_name
  FROM public.user_profiles WHERE id = auth.uid();
  RETURN NEW;
END;
$$;

-- (Trigger objects ini sudah ada dari 041/046 — CREATE OR REPLACE FUNCTION
-- di atas cukup, DROP/CREATE TRIGGER di bawah cuma jaga-jaga konsisten
-- dengan gaya migration lain.)
DROP TRIGGER IF EXISTS cafe_submissions_set_identity ON cafe_submissions;
CREATE TRIGGER cafe_submissions_set_identity
  BEFORE INSERT ON cafe_submissions
  FOR EACH ROW EXECUTE FUNCTION public.cafe_submissions_set_identity();

DROP TRIGGER IF EXISTS cafe_edits_set_identity ON cafe_edits;
CREATE TRIGGER cafe_edits_set_identity
  BEFORE INSERT ON cafe_edits
  FOR EACH ROW EXECUTE FUNCTION public.cafe_edits_set_identity();

DROP TRIGGER IF EXISTS cafe_photos_set_identity ON cafe_photos;
CREATE TRIGGER cafe_photos_set_identity
  BEFORE INSERT ON cafe_photos
  FOR EACH ROW EXECUTE FUNCTION public.cafe_photos_set_identity();

-- ── 2. Ledger poin — append-only, tidak ada UPDATE/DELETE buat siapa pun ──
CREATE TABLE IF NOT EXISTS public.contribution_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_table text NOT NULL CHECK (source_table IN ('cafe_submissions', 'cafe_edits', 'cafe_photos')),
  source_id uuid NOT NULL,
  points integer NOT NULL CHECK (points > 0),
  cafe_id uuid REFERENCES cafes(id) ON DELETE SET NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  -- Idempotensi: 1 baris ledger per baris sumber yang di-approve, selamanya.
  CONSTRAINT contribution_points_source_unique UNIQUE (source_table, source_id)
);

CREATE INDEX IF NOT EXISTS contribution_points_user_awarded_idx
  ON public.contribution_points (user_id, awarded_at DESC);

ALTER TABLE public.contribution_points ENABLE ROW LEVEL SECURITY;

-- Member cuma boleh baca baris poin miliknya sendiri (dipakai halaman
-- "Kontribusiku" — riwayat lengkap, bukan cuma bulan ini).
DROP POLICY IF EXISTS "contribution_points_select_own" ON public.contribution_points;
CREATE POLICY "contribution_points_select_own" ON public.contribution_points
  FOR SELECT USING (user_id = auth.uid());

-- Tidak ada policy INSERT/UPDATE/DELETE untuk anon/authenticated — satu-
-- satunya jalan masuk adalah trigger SECURITY DEFINER di bawah.
GRANT SELECT ON public.contribution_points TO authenticated;
REVOKE ALL ON public.contribution_points FROM anon;

-- ── 3. Trigger pemberi poin — AFTER UPDATE, cuma transisi pending→approved ──
-- Poin dari cafe baru = 20, koreksi info = 15, foto = 10/foto (FOR EACH ROW
-- jadi N foto approved otomatis = N x 10 tanpa logic tambahan). Kalau
-- user_id NULL (baris lama sebelum kolom ini ada), skip diam-diam — approve
-- admin tidak boleh gagal cuma karena poin tidak bisa ditempelkan ke siapa
-- pun. ON CONFLICT DO NOTHING sebagai pengaman kedua di atas UNIQUE
-- constraint kalau trigger somehow ke-fire dua kali (mis. double-click admin).

CREATE OR REPLACE FUNCTION public.award_points_cafe_submissions()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.contribution_points (user_id, source_table, source_id, points, cafe_id)
  VALUES (NEW.user_id, 'cafe_submissions', NEW.id, 20, NULL)
  ON CONFLICT (source_table, source_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cafe_submissions_award_points ON cafe_submissions;
CREATE TRIGGER cafe_submissions_award_points
  AFTER UPDATE ON cafe_submissions
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status = 'approved')
  EXECUTE FUNCTION public.award_points_cafe_submissions();

CREATE OR REPLACE FUNCTION public.award_points_cafe_edits()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.contribution_points (user_id, source_table, source_id, points, cafe_id)
  VALUES (NEW.user_id, 'cafe_edits', NEW.id, 15, NEW.cafe_id)
  ON CONFLICT (source_table, source_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cafe_edits_award_points ON cafe_edits;
CREATE TRIGGER cafe_edits_award_points
  AFTER UPDATE ON cafe_edits
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status = 'approved')
  EXECUTE FUNCTION public.award_points_cafe_edits();

CREATE OR REPLACE FUNCTION public.award_points_cafe_photos()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.contribution_points (user_id, source_table, source_id, points, cafe_id)
  VALUES (NEW.user_id, 'cafe_photos', NEW.id, 10, NEW.cafe_id)
  ON CONFLICT (source_table, source_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cafe_photos_award_points ON cafe_photos;
CREATE TRIGGER cafe_photos_award_points
  AFTER UPDATE ON cafe_photos
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status = 'approved')
  EXECUTE FUNCTION public.award_points_cafe_photos();

-- ── 4. Leaderboard publik bulan berjalan ──
-- security_invoker=false (definer): anon boleh baca lewat view ini meski
-- user_profiles sendiri RLS-nya cuma izinkan baca baris sendiri — pola sama
-- persis seperti active_launch_campaign (migration 018) & sejenisnya.
-- View cuma expose nama/avatar/total/rank, bukan baris ledger mentah.
CREATE OR REPLACE VIEW public.contribution_leaderboard_current_month
WITH (security_invoker = false) AS
SELECT
  cp.user_id,
  up.full_name,
  up.avatar_url,
  SUM(cp.points)::integer AS total_points,
  RANK() OVER (ORDER BY SUM(cp.points) DESC)::integer AS rank
FROM public.contribution_points cp
JOIN public.user_profiles up ON up.id = cp.user_id
WHERE date_trunc('month', cp.awarded_at) = date_trunc('month', now())
GROUP BY cp.user_id, up.full_name, up.avatar_url;

GRANT SELECT ON public.contribution_leaderboard_current_month TO anon, authenticated;

-- ── 5. "Peringkatku" — RPC, bukan tinggal filter view, karena filter per-
--       user butuh hitung ulang window function baru bisa di-WHERE. Baca
--       auth.uid() dari dalam function, tidak pernah percaya id dari client
--       — jadi aman dipanggil siapa pun yang login, tidak bisa dipakai
--       ngintip peringkat orang lain. ──
CREATE OR REPLACE FUNCTION public.my_contribution_rank()
RETURNS TABLE(user_id uuid, total_points integer, rank integer)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT cp.user_id, SUM(cp.points)::integer AS total_points,
           RANK() OVER (ORDER BY SUM(cp.points) DESC)::integer AS rank
    FROM public.contribution_points cp
    WHERE date_trunc('month', cp.awarded_at) = date_trunc('month', now())
    GROUP BY cp.user_id
  )
  SELECT * FROM ranked WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.my_contribution_rank() FROM public;
GRANT EXECUTE ON FUNCTION public.my_contribution_rank() TO authenticated;

-- ============================================================
-- MANUAL STEP: jalankan di Supabase SQL editor (tidak ada supabase CLI /
-- koneksi DB langsung yang tersedia buat menerapkan migration ini otomatis).
-- Verifikasi setelah apply:
--   SELECT proname FROM pg_proc WHERE proname LIKE 'award_points_%' OR proname = 'my_contribution_rank';
--   SELECT * FROM contribution_leaderboard_current_month; -- kosong dulu, wajar
--   -- Cari baris approved lama yang kelewat (user_id NULL saat trigger fire):
--   SELECT s.id FROM cafe_submissions s
--     LEFT JOIN contribution_points cp ON cp.source_table='cafe_submissions' AND cp.source_id=s.id
--     WHERE s.status='approved' AND cp.id IS NULL;
-- ============================================================
