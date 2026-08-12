-- ============================================================
-- 039: Tebak Kafe leaderboard
--
-- Best-score-per-person leaderboard for the "Tebak Kafe" mini-game.
-- Requires login (auth.uid()) — no guest play on the leaderboard.
--
-- Anti-cheat: the client never sends a score directly. It sends the raw
-- guess coordinates per round; submit_tebak_kafe_score() looks up each
-- cafe's REAL lat/lng from the cafes table and recomputes distance/score
-- server-side using the same haversine + exponential-decay formula as
-- src/lib/tebakKafe.ts. A tampered client can only lie about where it
-- guessed, not about how close that guess was.
--
-- Name/avatar are denormalized onto the leaderboard row (refreshed on
-- every submit) rather than joined from user_profiles at read time,
-- because user_profiles RLS only lets a user read their own row — a
-- public leaderboard can't join across everyone's profiles.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tebak_kafe_scores (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  score integer NOT NULL,
  rounds_played integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tebak_kafe_scores ENABLE ROW LEVEL SECURITY;

-- Public leaderboard: anyone (including anon visitors browsing the map)
-- can read it. No INSERT/UPDATE/DELETE policies for anon/authenticated —
-- all writes go through the SECURITY DEFINER RPC below.
CREATE POLICY "tebak_kafe_scores_select_all"
  ON public.tebak_kafe_scores FOR SELECT
  USING (true);

GRANT SELECT ON public.tebak_kafe_scores TO anon, authenticated;
GRANT SELECT ON public.tebak_kafe_scores TO service_role;

CREATE OR REPLACE FUNCTION public.submit_tebak_kafe_score(rounds jsonb)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_total integer := 0;
  v_round jsonb;
  v_cafe_id uuid;
  v_guess_lat double precision;
  v_guess_lng double precision;
  v_real_lat double precision;
  v_real_lng double precision;
  v_distance double precision;
  v_points integer;
  v_full_name text;
  v_avatar_url text;
  DECAY_METERS CONSTANT double precision := 900;
  MAX_POINTS CONSTANT integer := 1000;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Harus login dulu buat submit skor';
  END IF;

  IF jsonb_typeof(rounds) != 'array' OR jsonb_array_length(rounds) = 0 OR jsonb_array_length(rounds) > 5 THEN
    RAISE EXCEPTION 'Jumlah ronde tidak valid';
  END IF;

  FOR v_round IN SELECT * FROM jsonb_array_elements(rounds)
  LOOP
    v_cafe_id := (v_round->>'cafe_id')::uuid;
    v_guess_lat := (v_round->>'guess_lat')::double precision;
    v_guess_lng := (v_round->>'guess_lng')::double precision;

    SELECT lat, lng INTO v_real_lat, v_real_lng FROM public.cafes WHERE id = v_cafe_id;
    IF v_real_lat IS NULL THEN
      RAISE EXCEPTION 'Cafe tidak ditemukan: %', v_cafe_id;
    END IF;

    -- Haversine distance in meters — mirrors src/lib/geo.ts.
    v_distance := 2 * 6371000 * asin(sqrt(
      power(sin(radians(v_real_lat - v_guess_lat) / 2), 2) +
      cos(radians(v_guess_lat)) * cos(radians(v_real_lat)) *
      power(sin(radians(v_real_lng - v_guess_lng) / 2), 2)
    ));

    -- Exponential decay — mirrors scoreForDistance() in src/lib/tebakKafe.ts.
    v_points := round(MAX_POINTS * exp(-v_distance / DECAY_METERS));
    v_total := v_total + v_points;
  END LOOP;

  SELECT full_name, avatar_url INTO v_full_name, v_avatar_url
    FROM public.user_profiles WHERE id = v_user_id;

  IF v_full_name IS NULL OR v_avatar_url IS NULL THEN
    SELECT
      COALESCE(v_full_name, raw_user_meta_data->>'full_name'),
      COALESCE(v_avatar_url, raw_user_meta_data->>'avatar_url')
    INTO v_full_name, v_avatar_url
    FROM auth.users WHERE id = v_user_id;
  END IF;

  INSERT INTO public.tebak_kafe_scores (user_id, full_name, avatar_url, score, rounds_played, updated_at)
  VALUES (v_user_id, v_full_name, v_avatar_url, v_total, jsonb_array_length(rounds), now())
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    score = GREATEST(public.tebak_kafe_scores.score, excluded.score),
    rounds_played = excluded.rounds_played,
    updated_at = CASE
      WHEN excluded.score > public.tebak_kafe_scores.score THEN now()
      ELSE public.tebak_kafe_scores.updated_at
    END;

  RETURN (SELECT score FROM public.tebak_kafe_scores WHERE user_id = v_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_tebak_kafe_score(jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_tebak_kafe_score(jsonb) FROM anon, public;
