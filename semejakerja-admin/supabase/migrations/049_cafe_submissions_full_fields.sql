-- ============================================================
-- 049: cafe_submissions — field lengkap + auto-create ke cafes saat approve
--
-- Form publik "Usulkan Cafe Baru" tadinya cuma kirim 6 field dasar (nama,
-- alamat, telepon, jam buka teks bebas, website, catatan) dan approve admin
-- cuma flip status — TIDAK ADA yang menyalin data ke tabel cafes, admin
-- harus input ulang manual dari nol lewat CafeForm.tsx. Migration ini:
--   1. Menambah kolom baru di cafe_submissions yang mirror cafes (harga,
--      vibes, rating Google, jam per-hari, link Maps mentah).
--   2. Menambah trigger AFTER UPDATE (pola sama persis dengan
--      award_points_cafe_submissions di 047) yang, begitu status berubah
--      pending -> approved, langsung INSERT baris baru ke cafes. Kalau
--      lokasi (lat/lng) kosong, trigger RAISE EXCEPTION supaya UPDATE gagal
--      dengan pesan jelas — bukan bikin cafe rusak tanpa koordinat.
--
-- facilities/scales SENGAJA diisi default kosong (bukan bagian form
-- publik) — admin lengkapi belakangan lewat edit manual di CafeForm.tsx,
-- sama seperti field wifi_speed_mbps/wifi_upload_mbps/discount_value yang
-- juga tidak diminta dari kontributor.
-- ============================================================

-- ── 1. Kolom baru — semua nullable/berdefault supaya baris pending lama
--       (sebelum migration ini) tetap valid & bisa di-approve tanpa error ──
ALTER TABLE cafe_submissions ADD COLUMN IF NOT EXISTS price_level integer DEFAULT 0;
ALTER TABLE cafe_submissions ADD COLUMN IF NOT EXISTS vibes integer DEFAULT 2;
ALTER TABLE cafe_submissions ADD COLUMN IF NOT EXISTS rating numeric DEFAULT 0;
ALTER TABLE cafe_submissions ADD COLUMN IF NOT EXISTS total_reviews integer DEFAULT 0;
ALTER TABLE cafe_submissions ADD COLUMN IF NOT EXISTS weekday_text text[];
-- Link Google Maps mentah yang di-paste kontributor — disimpan buat
-- referensi admin saat review (tombol "Buka di Google Maps") dan sebagai
-- jejak kalau resolve lat/lng otomatis gagal.
ALTER TABLE cafe_submissions ADD COLUMN IF NOT EXISTS maps_url text;

DO $$ BEGIN
  ALTER TABLE cafe_submissions ADD CONSTRAINT cafe_submissions_price_level_range CHECK (price_level BETWEEN 0 AND 4);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE cafe_submissions ADD CONSTRAINT cafe_submissions_vibes_range CHECK (vibes BETWEEN 1 AND 3);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. Trigger: pending -> approved otomatis bikin baris cafes baru ──
-- SECURITY DEFINER, sama pola dengan award_points_cafe_submissions (047) —
-- berjalan lepas dari RLS caller (admin cuma perlu privilege UPDATE ke
-- cafe_submissions, tidak perlu privilege INSERT langsung ke cafes).
CREATE OR REPLACE FUNCTION public.create_cafe_from_submission()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.lat IS NULL OR NEW.lng IS NULL THEN
    RAISE EXCEPTION 'Lokasi belum diisi — kontributor tidak menyertakan lokasi valid, tidak bisa auto-approve. Reject dan minta kontributor kirim ulang, atau tambahkan kafe ini manual lewat halaman Kafe.';
  END IF;

  INSERT INTO public.cafes (
    name, address, lat, lng, phone, website,
    tier, is_partner, discount_value, price_level,
    weekday_text, open_hours, facilities, scales, vibes,
    rating, total_reviews
  ) VALUES (
    NEW.name, NEW.address, NEW.lat, NEW.lng, NEW.phone, NEW.website,
    'basic', false, NULL, COALESCE(NEW.price_level, 0),
    NEW.weekday_text, NEW.open_hours,
    '{"wifi":false,"ac":false,"powerOutlets":false,"mushola":false,"motorParking":false,"carParking":false,"meetingRoom":false,"outdoor":false,"heavyMeal":false}'::jsonb,
    '{"area":0,"motorParking":0,"carParking":0,"outlets":0}'::jsonb,
    COALESCE(NEW.vibes, 2),
    COALESCE(NEW.rating, 0), COALESCE(NEW.total_reviews, 0)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cafe_submissions_create_cafe ON cafe_submissions;
CREATE TRIGGER cafe_submissions_create_cafe
  AFTER UPDATE ON cafe_submissions
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status = 'approved')
  EXECUTE FUNCTION public.create_cafe_from_submission();

-- ============================================================
-- MANUAL STEP: jalankan di Supabase SQL editor (tidak ada supabase CLI /
-- koneksi DB langsung yang tersedia buat menerapkan migration ini otomatis).
-- Verifikasi setelah apply:
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'cafe_submissions' AND column_name IN
--     ('price_level','vibes','rating','total_reviews','weekday_text','maps_url');
--   SELECT proname FROM pg_proc WHERE proname = 'create_cafe_from_submission';
--   -- Tes end-to-end: approve satu submission pending yang lat/lng-nya
--   -- terisi lewat halaman moderasi, cek baris baru muncul di cafes dengan
--   -- SELECT id, name, price_level, vibes, weekday_text FROM cafes
--   --   ORDER BY created_at DESC LIMIT 1;
--   -- Tes gagal: approve submission lama yang lat/lng NULL, harus dapat
--   -- error "Lokasi belum diisi..." dan status TIDAK berubah jadi approved.
-- ============================================================
