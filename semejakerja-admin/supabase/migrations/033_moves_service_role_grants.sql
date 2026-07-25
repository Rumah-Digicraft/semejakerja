-- ============================================================
-- 033: Grant service_role access to the legacy moves tables
--
-- `sessions` and `participants` are LEGACY tables (they predate the
-- migrations). Migration 007 only granted them to anon/authenticated —
-- never to service_role. This project does NOT inherit default privileges
-- (see 023), so the Moves edge functions, which run as service_role, fail
-- with "42501 permission denied for table sessions" when they:
--   - moves-create-payment → SELECT sessions (by token) + SELECT participants (validate ids)
--   - doku-webhook         → UPDATE participants (funminton) / INSERT participants (padel)
--
-- NOTE: service_role BYPASSES RLS but still needs table-level GRANTs — the
-- two are independent. This only affects the service-role path; the public
-- anon/authenticated grants from 007 are untouched.
-- ============================================================

GRANT ALL ON public.sessions     TO service_role;
GRANT ALL ON public.participants TO service_role;
