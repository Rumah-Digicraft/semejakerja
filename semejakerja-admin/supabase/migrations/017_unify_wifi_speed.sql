-- ============================================================
-- 017: Satukan data kecepatan internet cafe (download + upload)
--   • Pakai ulang cafes.wifi_speed_mbps sbg DOWNLOAD, +upload/latency/tested_at.
--   • RPC submit_cafe_speedtest: cooldown GLOBAL 10 menit per cafe (server) +
--     cek jarak ≤50m, lalu replace nilai. anon tak punya UPDATE cafes → RPC.
--   • Backfill nilai terakhir per cafe dari speed_tests, lalu DROP tabelnya
--     (riwayat tak dipakai lagi — cukup nilai terbaru).
-- ⚠️ DESTRUKTIF: DROP TABLE speed_tests menghapus seluruh riwayat tes.
-- ============================================================

-- ── 1. Kolom baru di cafes ──
ALTER TABLE cafes ADD COLUMN IF NOT EXISTS wifi_upload_mbps numeric;
ALTER TABLE cafes ADD COLUMN IF NOT EXISTS wifi_latency_ms  numeric;
ALTER TABLE cafes ADD COLUMN IF NOT EXISTS wifi_tested_at   timestamptz;

-- ── 2. Backfill nilai terakhir per cafe dari speed_tests (kalau tabelnya masih ada) ──
DO $$ BEGIN
  IF to_regclass('public.speed_tests') IS NOT NULL THEN
    WITH latest AS (
      SELECT DISTINCT ON (cafe_id) cafe_id, download_mbps, upload_mbps, latency_ms, created_at
      FROM speed_tests ORDER BY cafe_id, created_at DESC
    )
    UPDATE cafes c SET
      wifi_speed_mbps  = COALESCE(c.wifi_speed_mbps, latest.download_mbps),
      wifi_upload_mbps = COALESCE(c.wifi_upload_mbps, latest.upload_mbps),
      wifi_latency_ms  = COALESCE(c.wifi_latency_ms, latest.latency_ms),
      wifi_tested_at   = COALESCE(c.wifi_tested_at, latest.created_at)
    FROM latest WHERE latest.cafe_id = c.id;
  END IF;
END $$;

-- ── 3. RPC: submit hasil speedtest (cooldown global + replace nilai) ──
CREATE OR REPLACE FUNCTION submit_cafe_speedtest(
  p_cafe_id  uuid,
  p_download numeric,
  p_upload   numeric,
  p_latency  numeric,
  p_distance_m numeric
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_last timestamptz;
BEGIN
  SELECT wifi_tested_at INTO v_last FROM cafes WHERE id = p_cafe_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  -- Cooldown GLOBAL 10 menit (berlaku ke semua user).
  IF v_last IS NOT NULL AND v_last > now() - interval '10 minutes' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'cooldown',
      'cooldown_seconds', ceil(extract(epoch FROM (v_last + interval '10 minutes' - now()))));
  END IF;
  -- Defense-in-depth: klien sudah cek GPS, server tolak kalau jarak > 50 m.
  IF p_distance_m IS NULL OR p_distance_m > 50 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'out_of_range');
  END IF;
  UPDATE cafes SET
    wifi_speed_mbps  = p_download,
    wifi_upload_mbps = p_upload,
    wifi_latency_ms  = p_latency,
    wifi_tested_at   = now()
  WHERE id = p_cafe_id;
  RETURN jsonb_build_object('ok', true, 'tested_at', now());
END;
$$;

REVOKE ALL ON FUNCTION submit_cafe_speedtest(uuid, numeric, numeric, numeric, numeric) FROM public;
GRANT EXECUTE ON FUNCTION submit_cafe_speedtest(uuid, numeric, numeric, numeric, numeric) TO anon, authenticated;

-- ── 4. Buang tabel riwayat (tak dipakai lagi) ──
DROP TABLE IF EXISTS speed_tests;

-- ============================================================
-- MANUAL STEP: jalankan di Supabase SQL editor. ⚠️ Kalau mau simpan riwayat lama,
-- export/backup tabel speed_tests DULU sebelum jalanin (step 4 menghapusnya).
-- Verifikasi:
--   SELECT id, wifi_speed_mbps, wifi_upload_mbps, wifi_latency_ms, wifi_tested_at FROM cafes LIMIT 5;
--   SELECT proname FROM pg_proc WHERE proname = 'submit_cafe_speedtest';
-- Urutan deploy: migrasi → deploy admin → redeploy web-apps (CAFE_COLUMNS minta kolom baru).
-- ============================================================
