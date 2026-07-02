-- ============================================================
-- 012: Re-apply grants that are missing on the live database
-- ============================================================
-- Diagnosis (Jul 2026): probing the live DB showed
--   * anon/authenticated get 42501 on speed_tests — the GRANT from
--     migration 005 is not in effect, so the map's speed-test feature
--     fails silently for everyone.
--   * service_role has NO grants on the community tables (user_profiles,
--     memberships, promo_codes, ...) — these tables were created without
--     Supabase's standard default privileges, and 011 only granted
--     anon/authenticated. Anything server-side using the service key
--     (admin tooling, scripts) gets "permission denied".
-- All statements are idempotent — safe to run more than once.

-- Speed tests (map app inserts/reads as anon or authenticated) — see 005.
GRANT SELECT, INSERT ON public.speed_tests TO anon, authenticated;

-- service_role is meant to bypass RLS for server-side code, but it still
-- needs table-level privileges. Mirror Supabase's standard setup.
GRANT ALL ON public.user_profiles TO service_role;
GRANT ALL ON public.memberships TO service_role;
GRANT ALL ON public.promo_codes TO service_role;
GRANT ALL ON public.promo_code_usages TO service_role;
GRANT ALL ON public.admin_roles TO service_role;
GRANT ALL ON public.addons TO service_role;
GRANT ALL ON public.addon_subscriptions TO service_role;
GRANT ALL ON public.addon_dropin TO service_role;
GRANT ALL ON public.speed_tests TO service_role;
