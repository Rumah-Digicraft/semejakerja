-- ============================================================
-- 036: public_wfc_events sembunyikan event yang tanggalnya lewat
--
-- Event yang event_date-nya sudah lewat hari ini otomatis hilang dari
-- landing page (homepage section, /wfc, dan floating CTA yang semuanya
-- baca view ini) — tanpa perlu admin manual nutup/matiin show_on_landing.
-- Event tanpa event_date (NULL, opsional) tetap tampil terus seperti
-- semula, karena tidak ada tanggal buat dibandingkan.
--
-- Ini murni soal tampilan publik — form tetap bisa diisi lewat link
-- langsung selama status='open' (tidak diubah di sini).
--
-- Requires: public_wfc_events (031).
-- ============================================================

CREATE OR REPLACE VIEW public.public_wfc_events
WITH (security_invoker = false) AS
SELECT
  f.id,
  f.title,
  f.cafe_name,
  f.description,
  f.token,
  f.quota,
  f.event_date,
  f.location,
  (SELECT count(*) FROM form_responses r WHERE r.form_id = f.id AND r.status = 'registered') AS registered_count
FROM forms f
WHERE f.status = 'open'
  AND f.show_on_landing = true
  AND (f.event_date IS NULL OR f.event_date >= CURRENT_DATE);

GRANT SELECT ON public.public_wfc_events TO anon, authenticated;

-- ============================================================
-- MANUAL STEP setelah menjalankan migrasi ini:
-- 1. Cari/bikin form dengan show_on_landing=true, status='open',
--    event_date = kemarin → SELECT * FROM public_wfc_events tidak lagi
--    memuat baris itu (padahal sebelumnya muncul).
-- 2. Ubah event_date form itu ke hari ini atau besok → baris muncul lagi.
-- 3. Form dengan event_date NULL tetap muncul seperti biasa.
-- ============================================================
