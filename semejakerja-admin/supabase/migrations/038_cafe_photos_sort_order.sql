-- ============================================================
-- 038: Manual ordering for cafe photos
--
-- Admins can now reorder a cafe's photos (Data Kafe → Foto Kafe).
-- sort_order is a dense 0..N-1 index per cafe_id, rewritten in full
-- on every reorder (see PhotoManager.tsx) rather than relying on
-- gapped/fractional values — with only a handful of photos per cafe
-- this is simpler than maintaining gaps and never needs rebalancing.
--
-- Backfill gives existing rows a stable initial order (oldest first)
-- instead of leaving them all at the column default.
-- ============================================================

ALTER TABLE cafe_photos ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY cafe_id ORDER BY created_at ASC) - 1 AS rn
  FROM cafe_photos
)
UPDATE cafe_photos
SET sort_order = ordered.rn
FROM ordered
WHERE cafe_photos.id = ordered.id;
