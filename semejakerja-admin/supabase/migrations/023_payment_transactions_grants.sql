-- ============================================================
-- 023: Grant service_role access to payment_transactions
--
-- Symptom: the doku-create-payment edge function got 42501
-- "permission denied for table payment_transactions" when inserting.
-- Same root cause as migration 012: tables created in this project do
-- NOT inherit Supabase's standard default privileges, so service_role
-- (used server-side by the edge functions to write) needs an explicit
-- table-level GRANT. RLS still fully applies to anon/authenticated;
-- service_role bypasses RLS but still needs the base privilege.
--
-- Idempotent — safe to run more than once.
-- ============================================================

-- Edge functions (doku-create-payment / doku-webhook) write via service role.
GRANT ALL ON public.payment_transactions TO service_role;

-- Members read their own transactions (checkout status page). Already
-- granted in 022; re-assert idempotently.
GRANT SELECT ON public.payment_transactions TO authenticated;
