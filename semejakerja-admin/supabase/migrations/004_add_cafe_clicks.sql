-- Add clicks column to cafes table for tracking popularity
ALTER TABLE cafes ADD COLUMN IF NOT EXISTS clicks integer DEFAULT 0;

-- Create an RPC function to safely increment clicks
CREATE OR REPLACE FUNCTION increment_cafe_clicks(cafe_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE cafes
  SET clicks = clicks + 1
  WHERE id = cafe_id;
END;
$$ LANGUAGE plpgsql;
