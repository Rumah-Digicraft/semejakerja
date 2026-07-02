-- ============================================================
-- 009: Extend user_profiles with community onboarding fields
--
-- Collected on the landing-page register form (email/password).
-- Existing RLS from 001/002 already lets a user INSERT/UPDATE their
-- own row across all columns — no policy change needed.
-- ============================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS nickname   text,  -- nama panggilan
  ADD COLUMN IF NOT EXISTS occupation text,  -- kesibukan (free text)
  ADD COLUMN IF NOT EXISTS city       text;  -- asal kota
