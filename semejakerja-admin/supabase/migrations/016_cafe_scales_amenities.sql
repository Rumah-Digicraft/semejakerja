-- ============================================================
-- 016: Amenity baru + skala ordinal untuk cafes
--
-- Menambah info yang biasa ditanya sebelum ke sebuah kafe:
--   facilities +3 boolean: meetingRoom (ruang meeting), outdoor
--     (area outdoor), heavyMeal (makanan berat — sebagian kafe
--     hanya jual dessert).
--   scales (kolom jsonb baru): { area, motorParking, carParking,
--     outlets } bernilai 0-3.
--       0 = tidak ada / belum ada info, 1-3 = makin besar/banyak.
--       (mis. outlets 3 = "tiap meja 1 colokan", area 3 = sangat luas).
--
-- Skala parkir/colokan MENGGANTIKAN boolean lama di UI (Option A):
-- boolean lama di-backfill jadi level 2 kalau dulunya true, dan
-- tetap disimpan sebagai turunan (di-sync app saat simpan) demi
-- kompatibilitas data lama & pembaca lain.
--
-- Mengikuti pola 015: ADD COLUMN IF NOT EXISTS, backfill lalu SET
-- DEFAULT, CHECK via blok DO $$ … duplicate_object. Hanya ALTER
-- (tak ada CREATE TABLE cafes). RLS TIDAK disentuh — kebijakan
-- cafes di 014 sudah table-wide, kolom baru otomatis tercakup.
-- ============================================================

-- ── 1. Perluas facilities dengan 3 boolean baru ──
-- `defaults || facilities` → nilai lama menang, key baru terisi false.
-- Hanya menyentuh baris bertipe object (bentuk kanonik sejak 015).
UPDATE cafes SET facilities =
  '{"meetingRoom":false,"outdoor":false,"heavyMeal":false}'::jsonb || facilities
WHERE jsonb_typeof(facilities) = 'object';

ALTER TABLE cafes ALTER COLUMN facilities SET DEFAULT
  '{"wifi":false,"ac":false,"powerOutlets":false,"mushola":false,"motorParking":false,"carParking":false,"meetingRoom":false,"outdoor":false,"heavyMeal":false}'::jsonb;

-- ── 2. Kolom skala ordinal (backfill dari boolean parkir/colokan lama) ──
ALTER TABLE cafes ADD COLUMN IF NOT EXISTS scales jsonb;

-- true → 2 (Sedang) sebagai tebakan aman; false / tak ada → 0.
UPDATE cafes SET scales = jsonb_build_object(
  'area',         0,
  'motorParking', CASE WHEN COALESCE((facilities->>'motorParking')::boolean, false) THEN 2 ELSE 0 END,
  'carParking',   CASE WHEN COALESCE((facilities->>'carParking')::boolean, false)   THEN 2 ELSE 0 END,
  'outlets',      CASE WHEN COALESCE((facilities->>'powerOutlets')::boolean, false)  THEN 2 ELSE 0 END
)
WHERE scales IS NULL OR jsonb_typeof(scales) <> 'object';

ALTER TABLE cafes ALTER COLUMN scales SET DEFAULT
  '{"area":0,"motorParking":0,"carParking":0,"outlets":0}'::jsonb;

-- Tiap skala harus 0-3 (COALESCE agar key hilang / NULL tetap lolos).
DO $$ BEGIN
  ALTER TABLE cafes ADD CONSTRAINT cafes_scales_range CHECK (
        COALESCE((scales->>'area')::int, 0)         BETWEEN 0 AND 3
    AND COALESCE((scales->>'motorParking')::int, 0) BETWEEN 0 AND 3
    AND COALESCE((scales->>'carParking')::int, 0)   BETWEEN 0 AND 3
    AND COALESCE((scales->>'outlets')::int, 0)      BETWEEN 0 AND 3
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- MANUAL STEP (jalankan di Supabase SQL editor, lalu verifikasi):
--   SELECT jsonb_typeof(scales), count(*) FROM cafes GROUP BY 1;       -- hanya 'object'
--   SELECT count(*) FROM cafes WHERE NOT (facilities ? 'meetingRoom'); -- 0
-- Urutan deploy: jalankan migrasi ini DULU, deploy semejakerja-admin,
-- baru redeploy semejakerja-web-apps — build publik meminta kolom
-- `scales` di CAFE_COLUMNS; kalau belum ada, PostgREST balas 400.
-- ============================================================
