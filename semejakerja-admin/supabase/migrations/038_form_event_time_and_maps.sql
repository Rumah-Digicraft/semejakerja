-- ============================================================
-- 038: Jam & link maps per event (forms)
--
-- Free-text time fields (not a `time` column) because admins write
-- open-ended values like "selesai" for the end time, not just clock
-- times. Feeds the {{jam}}/{{jam_mulai}}/{{jam_selesai}}/{{link_maps}}
-- placeholders in the WhatsApp approval template (see 037 + lib.ts).
-- ============================================================

ALTER TABLE forms ADD COLUMN IF NOT EXISTS event_time_start text;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS event_time_end text;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS event_maps_url text;
