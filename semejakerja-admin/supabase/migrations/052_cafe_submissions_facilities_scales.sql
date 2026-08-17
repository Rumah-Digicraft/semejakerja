-- ============================================================
-- 052: cafe_submissions — tambah facilities & scales (Fasilitas & Suasana)
--
-- Form publik "Usulkan Cafe Baru" sekarang juga mengumpulkan Fasilitas WFC
-- (6 chip: wifi/ac/mushola/meetingRoom/outdoor/heavyMeal) dan skala ordinal
-- 0-3 (area/motorParking/carParking/outlets) — persis field yang sama
-- dengan "Fasilitas & Suasana" di CafeForm.tsx admin. Kolom baru di sini
-- menyimpan bentuk FINAL 9-key facilities (motorParking/carParking/
-- powerOutlets sudah diturunkan dari scales di sisi client, sama seperti
-- toDbPayload() admin — lihat ContributeModal.tsx) supaya trigger tinggal
-- pass-through tanpa perlu duplikasi logic derivasi itu di SQL.
-- ============================================================

ALTER TABLE cafe_submissions ADD COLUMN IF NOT EXISTS facilities jsonb;
ALTER TABLE cafe_submissions ADD COLUMN IF NOT EXISTS scales jsonb;

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
    to_jsonb(NEW.weekday_text), NEW.open_hours,
    COALESCE(NEW.facilities, '{"wifi":false,"ac":false,"powerOutlets":false,"mushola":false,"motorParking":false,"carParking":false,"meetingRoom":false,"outdoor":false,"heavyMeal":false}'::jsonb),
    COALESCE(NEW.scales, '{"area":0,"motorParking":0,"carParking":0,"outlets":0}'::jsonb),
    COALESCE(NEW.vibes, 2),
    COALESCE(NEW.rating, 0), COALESCE(NEW.total_reviews, 0)
  );

  RETURN NEW;
END;
$$;

-- ============================================================
-- MANUAL STEP: jalankan di Supabase SQL editor.
-- Verifikasi setelah apply: submit usulan baru dengan fasilitas/skala
-- diisi, approve, lalu cek:
--   SELECT name, facilities, scales FROM cafes ORDER BY created_at DESC LIMIT 1;
-- ============================================================
