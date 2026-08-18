-- ============================================================
-- 053: cafe_edits — auto-apply suggested_data ke cafes saat approve
--
-- Sampai sekarang approve "Saran Perbaikan Info" di halaman moderasi cuma
-- flip status cafe_edits jadi 'approved' — TIDAK ADA yang menyalin
-- suggested_data ke tabel cafes, admin harus baca perbandingan
-- "sekarang -> disarankan" lalu update manual sendiri lewat CafeForm.tsx.
-- Itu masih masuk akal waktu suggested_data cuma 5 field teks, tapi
-- semejakerja-web-apps ContributeModal.tsx EditForm sekarang juga
-- mengumpulkan lokasi/harga/vibe/fasilitas/scales/jam per-hari (opt-in per
-- section) — nyalin ulang manual jadi merepotkan & rawan salah ketik.
--
-- Trigger ini (pola sama dengan create_cafe_from_submission di 049/050/052)
-- UPDATE cafes cuma dengan key yang memang ADA di suggested_data (jsonb
-- COALESCE ->>/-> jatuh ke nilai lama kalau key-nya tidak dikirim) — persis
-- semantik "section tidak dicentang = tidak dikirim" dari EditForm. Kolom
-- maps_url sengaja tidak disentuh (cafes tidak punya kolom itu, beda dari
-- cafe_submissions — cuma dipakai referensi "Buka di Google Maps" di modal
-- moderasi).
-- ============================================================

CREATE OR REPLACE FUNCTION public.apply_cafe_edit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d jsonb := NEW.suggested_data;
BEGIN
  UPDATE public.cafes SET
    name = COALESCE(d->>'name', name),
    address = COALESCE(d->>'address', address),
    phone = COALESCE(d->>'phone', phone),
    website = COALESCE(d->>'website', website),
    open_hours = COALESCE(d->>'open_hours', open_hours),
    weekday_text = COALESCE(d->'weekday_text', weekday_text),
    lat = COALESCE((d->>'lat')::double precision, lat),
    lng = COALESCE((d->>'lng')::double precision, lng),
    price_level = COALESCE((d->>'price_level')::integer, price_level),
    vibes = COALESCE((d->>'vibes')::integer, vibes),
    facilities = COALESCE(d->'facilities', facilities),
    scales = COALESCE(d->'scales', scales)
  WHERE id = NEW.cafe_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cafe_edits_apply_to_cafe ON cafe_edits;
CREATE TRIGGER cafe_edits_apply_to_cafe
  AFTER UPDATE ON cafe_edits
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status = 'approved')
  EXECUTE FUNCTION public.apply_cafe_edit();

-- ============================================================
-- MANUAL STEP: jalankan di Supabase SQL editor.
-- Verifikasi setelah apply:
--   SELECT proname FROM pg_proc WHERE proname = 'apply_cafe_edit';
--   -- Tes end-to-end: kirim "Saran Perbaikan Info" (mis. koreksi Telepon
--   -- + centang koreksi Rentang Harga) dari web-apps, approve di halaman
--   -- moderasi admin, lalu cek cafe-nya benar-benar berubah:
--   SELECT name, phone, price_level FROM cafes WHERE id = '<cafe_id>';
--   -- Field yang TIDAK dicentang/diisi kontributor harus tetap nilai lama
--   -- (tidak ke-NULL-kan) — cek kolom lain di baris yang sama tidak berubah.
-- ============================================================
