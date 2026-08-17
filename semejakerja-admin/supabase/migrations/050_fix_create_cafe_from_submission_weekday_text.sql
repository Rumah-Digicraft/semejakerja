-- ============================================================
-- 050: fix create_cafe_from_submission() — cafes.weekday_text type mismatch
--
-- Migration 049 assumed cafes.weekday_text was text[] (matching the admin
-- TS type CafeDbPayload.weekday_text: string[] | null) and inserted
-- NEW.weekday_text (cafe_submissions.weekday_text, genuinely text[])
-- straight into it. Turns out the live column is actually jsonb — hit in
-- production the first time an admin approved a submission with per-day
-- hours filled in: "column weekday_text is of type jsonb but expression is
-- of type text[]". Fix: cast with to_jsonb() on the way in. to_jsonb(NULL)
-- stays NULL, so submissions without per-day hours are unaffected.
-- ============================================================

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
    '{"wifi":false,"ac":false,"powerOutlets":false,"mushola":false,"motorParking":false,"carParking":false,"meetingRoom":false,"outdoor":false,"heavyMeal":false}'::jsonb,
    '{"area":0,"motorParking":0,"carParking":0,"outlets":0}'::jsonb,
    COALESCE(NEW.vibes, 2),
    COALESCE(NEW.rating, 0), COALESCE(NEW.total_reviews, 0)
  );

  RETURN NEW;
END;
$$;

-- ============================================================
-- MANUAL STEP: jalankan di Supabase SQL editor.
-- Verifikasi setelah apply: approve ulang submission yang tadi gagal
-- (mis. "Nibbi Coffee and Bakery") di halaman moderasi — harus sukses kali
-- ini, dan baris baru muncul di cafes dengan weekday_text terisi:
--   SELECT name, weekday_text FROM cafes ORDER BY created_at DESC LIMIT 1;
-- ============================================================
