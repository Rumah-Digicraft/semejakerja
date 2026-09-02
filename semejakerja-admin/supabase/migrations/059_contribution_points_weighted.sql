-- ============================================================
-- 059: Bobot poin kontribusi berjenjang + tie-break gaya Olimpiade
--
-- Sebelumnya: cafe=20, edit=15, foto=10 — gampang seri (1 cafe = 2 foto
-- persis, lihat kasus Rokhman Assidik vs Fernanda Oriza Sativa bulan ini,
-- sama-sama 20 poin dari 1 cafe vs 2 foto).
--
-- Bagian 1 — bobot baru: cafe=50, edit=10, foto=2. Tiap tingkat 5x
-- tingkat di bawahnya (butuh 6 edit buat nyamain 1 cafe, butuh 6 foto
-- buat nyamain 1 edit) — cukup jauh buat aktivitas bulanan yang wajar,
-- tanpa angka poin yang kelewat besar/ekstrem.
--
-- Bagian 2 — kalau TETAP ada yang poinnya sama persis (mis. 1 cafe vs
-- 5 foto, sama-sama 50), tie-break-nya sekarang niru cara IOC nentuin
-- ranking medali: bandingkan jumlah cafe (setara emas) dulu, baru
-- jumlah edit (setara perak), baru jumlah foto (setara perunggu). Dua
-- orang cuma tetap seri kalau komposisi ketiganya identik persis —
-- sama seperti medal table asli, itu pun boleh dianggap seri beneran.
-- Diterapkan di view leaderboard bulan berjalan (dari 047), RPC
-- my_contribution_rank (047), DAN view riwayat pemenang bulan lampau
-- (057) — biar konsisten kalau ada yang buka riwayat lama juga.
-- ============================================================

-- ── 1. Bobot poin per jenis kontribusi ──
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
  VALUES (NEW.user_id, 'cafe_submissions', NEW.id, 50, NULL)
  ON CONFLICT (source_table, source_id) DO NOTHING;
  RETURN NEW;
END;
$$;

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
  VALUES (NEW.user_id, 'cafe_edits', NEW.id, 10, NEW.cafe_id)
  ON CONFLICT (source_table, source_id) DO NOTHING;
  RETURN NEW;
END;
$$;

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
  VALUES (NEW.user_id, 'cafe_photos', NEW.id, 2, NEW.cafe_id)
  ON CONFLICT (source_table, source_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Backfill bulan berjalan aja — biar papan kontributor yang lagi tampil
-- langsung kebawa bobot baru. Bulan-bulan lampau sengaja TIDAK disentuh
-- nilai poinnya: pemenang yang sudah diumumkan/ditraktir kopi berdasarkan
-- bobot lama tidak boleh berubah retroaktif.
UPDATE public.contribution_points
SET points = CASE source_table
  WHEN 'cafe_submissions' THEN 50
  WHEN 'cafe_edits' THEN 10
  WHEN 'cafe_photos' THEN 2
END
WHERE date_trunc('month', awarded_at) = date_trunc('month', now());

-- ── 2. Leaderboard bulan berjalan — tie-break gaya Olimpiade ──
CREATE OR REPLACE VIEW public.contribution_leaderboard_current_month
WITH (security_invoker = false) AS
SELECT
  cp.user_id,
  up.full_name,
  up.avatar_url,
  SUM(cp.points)::integer AS total_points,
  RANK() OVER (
    ORDER BY
      SUM(cp.points) DESC,
      COUNT(*) FILTER (WHERE cp.source_table = 'cafe_submissions') DESC,
      COUNT(*) FILTER (WHERE cp.source_table = 'cafe_edits') DESC,
      COUNT(*) FILTER (WHERE cp.source_table = 'cafe_photos') DESC
  )::integer AS rank
FROM public.contribution_points cp
JOIN public.user_profiles up ON up.id = cp.user_id
WHERE date_trunc('month', cp.awarded_at) = date_trunc('month', now())
GROUP BY cp.user_id, up.full_name, up.avatar_url;

-- ── 3. "Peringkatku" (RPC) — tie-break yang sama, biar konsisten sama
--       nomor rank yang ditampilin di leaderboard publik ──
CREATE OR REPLACE FUNCTION public.my_contribution_rank()
RETURNS TABLE(user_id uuid, total_points integer, rank integer)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT cp.user_id, SUM(cp.points)::integer AS total_points,
           RANK() OVER (
             ORDER BY
               SUM(cp.points) DESC,
               COUNT(*) FILTER (WHERE cp.source_table = 'cafe_submissions') DESC,
               COUNT(*) FILTER (WHERE cp.source_table = 'cafe_edits') DESC,
               COUNT(*) FILTER (WHERE cp.source_table = 'cafe_photos') DESC
           )::integer AS rank
    FROM public.contribution_points cp
    WHERE date_trunc('month', cp.awarded_at) = date_trunc('month', now())
    GROUP BY cp.user_id
  )
  SELECT * FROM ranked WHERE user_id = auth.uid();
$$;

-- ── 4. Riwayat pemenang bulan lampau (057) — tie-break yang sama ──
CREATE OR REPLACE VIEW public.contribution_monthly_winners
WITH (security_invoker = false) AS
SELECT month, user_id, full_name, avatar_url, total_points
FROM (
  SELECT
    date_trunc('month', cp.awarded_at)::date AS month,
    cp.user_id,
    up.full_name,
    up.avatar_url,
    SUM(cp.points)::integer AS total_points,
    RANK() OVER (
      PARTITION BY date_trunc('month', cp.awarded_at)
      ORDER BY
        SUM(cp.points) DESC,
        COUNT(*) FILTER (WHERE cp.source_table = 'cafe_submissions') DESC,
        COUNT(*) FILTER (WHERE cp.source_table = 'cafe_edits') DESC,
        COUNT(*) FILTER (WHERE cp.source_table = 'cafe_photos') DESC
    ) AS rnk
  FROM public.contribution_points cp
  JOIN public.user_profiles up ON up.id = cp.user_id
  GROUP BY date_trunc('month', cp.awarded_at), cp.user_id, up.full_name, up.avatar_url
) ranked
WHERE rnk = 1
  AND month < date_trunc('month', now())
ORDER BY month DESC;

-- ============================================================
-- MANUAL STEP: jalankan di Supabase SQL editor (tidak ada supabase CLI /
-- koneksi DB langsung yang tersedia buat menerapkan migration ini otomatis).
-- Verifikasi setelah apply:
--   SELECT * FROM contribution_leaderboard_current_month ORDER BY rank;
-- ============================================================
