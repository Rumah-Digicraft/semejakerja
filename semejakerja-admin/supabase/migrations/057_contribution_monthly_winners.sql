-- ============================================================
-- 057: Riwayat pemenang papan kontributor per bulan
--
-- Gap: contribution_leaderboard_current_month (migration 047) di-filter
-- date_trunc('month', awarded_at) = date_trunc('month', now()) — begitu
-- tanggal 1 lewat, pemenang bulan sebelumnya hilang dari tampilan meski
-- baris ledgernya tetap ada (ledger append-only, lihat 047). View ini
-- expose 1 baris per bulan lampau = pemenang bulan itu (rank 1, RANK()
-- jadi seri/dasi tampil semua), supaya "Papan Kontributor" bisa nampilin
-- riwayat pemenang tanpa perlu proses cron "tutup bulan" terpisah.
--
-- Bulan berjalan sengaja dikecualikan (month < bulan ini) — belum final,
-- itu tetap tugas contribution_leaderboard_current_month.
-- ============================================================

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
      ORDER BY SUM(cp.points) DESC
    ) AS rnk
  FROM public.contribution_points cp
  JOIN public.user_profiles up ON up.id = cp.user_id
  GROUP BY date_trunc('month', cp.awarded_at), cp.user_id, up.full_name, up.avatar_url
) ranked
WHERE rnk = 1
  AND month < date_trunc('month', now())
ORDER BY month DESC;

GRANT SELECT ON public.contribution_monthly_winners TO anon, authenticated;

-- ============================================================
-- MANUAL STEP: jalankan di Supabase SQL editor.
-- Verifikasi setelah apply:
--   SELECT * FROM contribution_monthly_winners;
-- ============================================================
