-- ============================================================
-- 031: WFC forms tampil di landing page (show/hide) + field event
--
-- Menambah kemampuan menampilkan form/event WFC di landing page
-- (homepage + halaman /wfc) sebagai brand awareness + funnel user.
-- Admin punya toggle `show_on_landing` per form — TERPISAH dari
-- `status`:
--   • status = open  → form menerima pendaftaran (via link/token)
--   • show_on_landing = true → form ikut tampil di landing page
-- Jadi bisa ada event yang open tapi hanya lewat link (tidak
-- dipajang), atau dipajang di landing sekaligus.
--
-- Plus field event terstruktur (event_date, location) supaya kartu
-- event di landing rapi, dan sebuah VIEW publik `public_wfc_events`
-- (pola sama active_launch_campaign di 018) yang mengekspos field
-- aman + jumlah pendaftar (social proof) ke anon.
--
-- Requires: tabel forms + form_responses (030).
-- ============================================================

-- ── 1. Kolom baru di forms ──────────────────────────────────
ALTER TABLE forms ADD COLUMN IF NOT EXISTS show_on_landing boolean NOT NULL DEFAULT false;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS event_date date;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS location text;

CREATE INDEX IF NOT EXISTS idx_forms_landing ON forms(show_on_landing) WHERE show_on_landing;

-- ── 2. View publik: event WFC yang tayang di landing ────────
-- security_invoker=false (definer): anon boleh baca lewat view ini
-- meski tabel forms tertutup untuk baris non-open. Hanya form yang
-- open DAN show_on_landing yang muncul. Ekspos field publik + jumlah
-- pendaftar (BUKAN respons detail).
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
  (SELECT count(*) FROM form_responses r WHERE r.form_id = f.id) AS registered_count
FROM forms f
WHERE f.status = 'open' AND f.show_on_landing = true;

GRANT SELECT ON public.public_wfc_events TO anon, authenticated;

-- ============================================================
-- MANUAL STEP setelah menjalankan migrasi ini (butuh 030 dulu):
-- 1. Sebagai community_admin, set satu form: status='open',
--    show_on_landing=true, isi event_date + location →
--    cek SELECT * FROM public_wfc_events sebagai anon mengembalikan
--    baris itu beserta registered_count.
-- 2. Set show_on_landing=false → baris hilang dari view (tapi form
--    tetap bisa diisi lewat link/token).
-- ============================================================
