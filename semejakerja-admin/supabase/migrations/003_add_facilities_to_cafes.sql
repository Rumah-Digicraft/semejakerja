-- Add facilities array to cafes table
ALTER TABLE cafes ADD COLUMN facilities jsonb DEFAULT '[]'::jsonb;
