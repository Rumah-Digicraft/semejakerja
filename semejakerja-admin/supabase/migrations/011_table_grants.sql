-- ============================================================
-- 011: Table-level GRANTs for anon / authenticated
--
-- Symptom: register failed with 42501 "permission denied for table
-- user_profiles". RLS only FILTERS rows — the role still needs the
-- base table privilege (GRANT). These tables were missing the
-- standard Supabase grants, so every insert/select was rejected
-- before RLS even ran.
--
-- Safe: RLS is enabled on all of these, so a regular authenticated
-- user can still only touch rows its policies allow (insert/read own,
-- admins manage all). admin_roles is deliberately EXCLUDED — it stays
-- locked down per migration 006.
-- ============================================================

-- Members: self-service (insert/read/update own) + admin manage
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memberships TO authenticated;

-- Promo codes: public reads active (RLS), admins manage
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_codes TO authenticated;
GRANT SELECT ON public.promo_codes TO anon;
GRANT SELECT ON public.promo_code_usages TO authenticated;  -- RPC writes as definer

-- Add-ons: public reads, admins manage
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addons TO authenticated;
GRANT SELECT ON public.addons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addon_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addon_dropin TO authenticated;

-- Moves: admin writes directly; public join writes go via SECURITY
-- DEFINER RPCs (007), so anon needs only the SELECT granted in 007.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participants TO authenticated;

-- ============================================================
-- Belt-and-braces: ensure the self-signup RLS policies from
-- migration 002 exist (idempotent) — GRANT gets you past 42501,
-- then RLS still needs these policies to allow the row.
-- ============================================================
DROP POLICY IF EXISTS "Users insert own profile" ON user_profiles;
CREATE POLICY "Users insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users read own membership" ON memberships;
CREATE POLICY "Users read own membership" ON memberships
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own membership" ON memberships;
CREATE POLICY "Users insert own membership" ON memberships
  FOR INSERT WITH CHECK (auth.uid() = user_id);
