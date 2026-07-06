-- ============================================================
-- 015: Pengayaan data cafes — vibes, wifi_speed_mbps, facilities
--
-- Peta publik (semejakerja-web-apps) menampilkan & memfilter kafe
-- berdasarkan fasilitas (6 boolean), tingkat suasana (vibes 1-5),
-- dan kecepatan WiFi — tapi selama ini nilainya di-hardcode di
-- client karena kolomnya belum ada / bentuknya tidak disepakati.
-- Migrasi ini:
--   1. Menambah kolom vibes (1=tenang .. 5=ramai) & wifi_speed_mbps.
--   2. Menstandarkan cafes.facilities ke objek 6 boolean yang
--      dipakai client: {wifi, ac, powerOutlets, mushola,
--      motorParking, carParking}. Per Jul 2026 tinggal 2 baris
--      yang masih format lama (array string dari editor admin lama).
--   3. Melepas NOT NULL kolom PostGIS `location` (tidak dipakai
--      kedua app) supaya admin bisa INSERT kafe baru tanpa geometry.
-- ============================================================

-- ── 1. Kolom baru ──
ALTER TABLE cafes ADD COLUMN IF NOT EXISTS vibes integer DEFAULT 3;

DO $$ BEGIN
  ALTER TABLE cafes ADD CONSTRAINT cafes_vibes_range CHECK (vibes BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE cafes ADD COLUMN IF NOT EXISTS wifi_speed_mbps numeric;

-- ── 2. Standarkan facilities ke objek 6 boolean ──
-- Konversi baris format lama (array string chip editor lama).
-- Operator `?` = "array jsonb mengandung elemen string ini";
-- hanya menyentuh baris bertipe array → idempoten.
UPDATE cafes SET facilities = jsonb_build_object(
  'wifi',         facilities ? 'WiFi',
  'ac',           facilities ? 'AC',
  'powerOutlets', facilities ? 'Stopkontak',
  'mushola',      facilities ? 'Mushola',
  'motorParking', facilities ? 'Parkir Motor',
  'carParking',   facilities ? 'Parkir Mobil'
)
WHERE jsonb_typeof(facilities) = 'array';
-- Chip lama lain (Area Smoking, Toilet, Meeting Room, dll) sengaja
-- dibuang — client hanya mengenal 6 fasilitas di atas.

-- Baris NULL / bentuk tak dikenal → objek all-false.
UPDATE cafes SET facilities =
  '{"wifi":false,"ac":false,"powerOutlets":false,"mushola":false,"motorParking":false,"carParking":false}'::jsonb
WHERE facilities IS NULL OR jsonb_typeof(facilities) <> 'object';

ALTER TABLE cafes ALTER COLUMN facilities SET DEFAULT
  '{"wifi":false,"ac":false,"powerOutlets":false,"mushola":false,"motorParking":false,"carParking":false}'::jsonb;

-- ── 3. Lepas NOT NULL kolom PostGIS legacy ──
-- `location` diisi seed awal (WKB) tapi tidak pernah dibaca admin
-- maupun client (keduanya pakai lat/lng). No-op jika sudah nullable.
ALTER TABLE cafes ALTER COLUMN location DROP NOT NULL;

-- ============================================================
-- MANUAL STEP (setelah menjalankan migrasi ini di SQL editor):
-- 1. Verifikasi semua facilities sudah objek:
--      SELECT jsonb_typeof(facilities), count(*) FROM cafes GROUP BY 1;
--    → harus hanya 'object'.
-- 2. Deploy semejakerja-admin BERSAMAAN dengan migrasi ini —
--    editor kafe lama masih menulis facilities format array dan
--    akan merusak baris yang sudah dikonversi.
-- 3. Redeploy semejakerja-web-apps setelahnya supaya peta publik
--    mulai membaca facilities/vibes/wifi_speed_mbps dari DB.
-- ============================================================
