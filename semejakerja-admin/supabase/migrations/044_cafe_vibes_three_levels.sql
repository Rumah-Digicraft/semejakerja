-- ============================================================
-- 044: cafes.vibes — 5 level jadi 3 level (Tenang / Sedang / Ramai)
--
-- Sebelumnya vibes 1-5 tanpa label jelas di tengah (cuma endpoint
-- "Tenang"/"Ramai"). Disederhanakan jadi 3 level bernama eksplisit:
-- 1 = Tenang, 2 = Sedang, 3 = Ramai. Data lama di-remap (bukan cuma
-- ganti constraint) supaya nilai existing tetap masuk akal:
--   1-2 (dulu "tenang banget"/"tenang") -> 1 Tenang
--   3   (dulu "santai")                 -> 2 Sedang
--   4-5 (dulu "ramai"/"ramai banget")    -> 3 Ramai
--
-- Catatan: cafe_reviews.vibes (input suasana per-ulasan komunitas,
-- ContributeModal) SENGAJA tidak disentuh migration ini — itu field
-- terpisah, tidak ada CHECK constraint di DB, dan tidak diagregasi
-- balik ke cafes.vibes (lihat catatan cafes.rating sebelumnya).
-- ============================================================

ALTER TABLE cafes DROP CONSTRAINT IF EXISTS cafes_vibes_range;

UPDATE cafes SET vibes = CASE
  WHEN vibes <= 2 THEN 1
  WHEN vibes = 3 THEN 2
  WHEN vibes >= 4 THEN 3
  ELSE 2
END
WHERE vibes IS NOT NULL;

ALTER TABLE cafes ALTER COLUMN vibes SET DEFAULT 2;

DO $$ BEGIN
  ALTER TABLE cafes ADD CONSTRAINT cafes_vibes_range CHECK (vibes BETWEEN 1 AND 3);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
