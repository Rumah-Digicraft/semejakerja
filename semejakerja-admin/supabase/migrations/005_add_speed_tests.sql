-- Add speed_tests table: automated Cloudflare speed-test results,
-- submitted only when the user's GPS proves they are physically at the cafe.

CREATE TABLE IF NOT EXISTS speed_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id uuid NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  download_mbps numeric NOT NULL,
  upload_mbps numeric NOT NULL,
  latency_ms numeric,
  user_lat double precision NOT NULL,
  user_lng double precision NOT NULL,
  distance_m numeric NOT NULL,
  gps_accuracy_m numeric,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_speed_tests_cafe_id ON speed_tests(cafe_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE speed_tests ENABLE ROW LEVEL SECURITY;

-- Public (anon) can submit a speed test result — app has no login for visitors.
CREATE POLICY "Public insert speed_tests"
ON speed_tests FOR INSERT
WITH CHECK (true);

-- Public can read results (used later to compute/display an aggregate average
-- speed per cafe).
CREATE POLICY "Public read speed_tests"
ON speed_tests FOR SELECT
USING (true);

-- RLS policies only restrict access on top of base table privileges — Postgres
-- still requires an explicit GRANT for the anon/authenticated roles used by
-- the Supabase client, otherwise every request fails with "permission denied
-- for table speed_tests" regardless of the policies above.
GRANT SELECT, INSERT ON speed_tests TO anon, authenticated;
