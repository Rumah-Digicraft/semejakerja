-- ============================================================
-- 054: WFC form — toggle tampilkan kuota (max peserta) di halaman publik
--
-- Admin bisa pilih per form apakah kuota/max peserta dipajang ke user
-- (kartu event di homepage & /wfc: "X / Y peserta", "Sisa N slot",
-- "Kuota penuh"; plus angka max di list peserta /wfc/register) atau
-- disembunyikan (cuma "X peserta terdaftar", tanpa bar slot).
--
-- Caranya di level view: public_wfc_events nge-NULL-kan kolom quota
-- kalau show_quota=false — client landing yang udah ada memperlakukan
-- quota NULL sebagai "tak terbatas" (tanpa slot bar / "Kuota penuh"),
-- jadi tidak perlu perubahan kode kartu. Kuota ASLINYA tetap ditegakkan
-- server-side di submit_form_response / admin_review_form_response
-- (034) — yang disembunyikan cuma tampilannya.
--
-- Catatan: baris `forms` sendiri tetap ke-SELECT publik apa adanya via
-- RLS "Public read open forms" (030) — kolom quota memang dari awal
-- info publik di situ; halaman register cuma diminta tidak MENAMPILKAN.
--
-- Requires: forms (030), public_wfc_events versi 036.
-- ============================================================

ALTER TABLE forms ADD COLUMN IF NOT EXISTS show_quota boolean NOT NULL DEFAULT true;

CREATE OR REPLACE VIEW public.public_wfc_events
WITH (security_invoker = false) AS
SELECT
  f.id,
  f.title,
  f.cafe_name,
  f.description,
  f.token,
  CASE WHEN f.show_quota THEN f.quota END AS quota,
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
-- 1. Form open + show_on_landing dengan quota terisi: set
--    show_quota=false → SELECT * FROM public_wfc_events → kolom quota
--    NULL buat form itu; kartu di landing berubah jadi "X peserta
--    terdaftar" tanpa bar slot. Set balik true → "X / Y peserta" lagi.
-- 2. Pastikan submit tetap ditolak saat kuota asli penuh walau
--    show_quota=false (kuota tetap ditegakkan di RPC).
-- ============================================================
