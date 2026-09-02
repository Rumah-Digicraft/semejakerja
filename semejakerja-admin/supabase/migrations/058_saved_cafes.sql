-- ============================================================================
-- Saved cafes (bookmarks) — lets a logged-in member save a cafe from the
-- public map to a personal list, surfaced via the map app's new "Saved"
-- bottom-nav tab. One row per (user, cafe); RLS restricts every operation to
-- the owning user, same shape as cafe_submissions/cafe_reviews (046/051).
--
-- user_id defaults to auth.uid() rather than being sent by the client, so a
-- request can never claim to save a cafe on someone else's behalf — mirrors
-- the "identity never trusted from client" rule used for cafe_submissions'
-- identity trigger in 046, just simpler here since there's no denormalized
-- name/phone to fill in.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.saved_cafes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  cafe_id uuid NOT NULL REFERENCES public.cafes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, cafe_id)
);

CREATE INDEX IF NOT EXISTS saved_cafes_user_id_idx ON public.saved_cafes (user_id);
CREATE INDEX IF NOT EXISTS saved_cafes_cafe_id_idx ON public.saved_cafes (cafe_id);

ALTER TABLE public.saved_cafes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_cafes_select_own" ON public.saved_cafes;
CREATE POLICY "saved_cafes_select_own"
  ON public.saved_cafes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "saved_cafes_insert_own" ON public.saved_cafes;
CREATE POLICY "saved_cafes_insert_own"
  ON public.saved_cafes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "saved_cafes_delete_own" ON public.saved_cafes;
CREATE POLICY "saved_cafes_delete_own"
  ON public.saved_cafes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.saved_cafes TO authenticated;
GRANT SELECT ON public.saved_cafes TO service_role;
