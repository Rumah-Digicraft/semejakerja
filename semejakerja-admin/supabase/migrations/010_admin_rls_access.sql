-- ============================================================
-- 010: Admin access policies for community + addon tables
--
-- Tables from 001/002 have RLS enabled but only "read/insert own"
-- policies — so the admin panel (which reads via the browser/session
-- client, NOT the service role) sees nothing and can't write. This
-- adds is_admin()-gated access so the Community, Promo Codes, Add-on,
-- and Lapkeu pages work. Nothing here loosens access for non-admins.
--
-- Requires public.is_admin() from migration 006.
-- ============================================================

-- ── user_profiles: admins read & edit every member ──
DROP POLICY IF EXISTS "Admins read all profiles" ON user_profiles;
CREATE POLICY "Admins read all profiles" ON user_profiles
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins update all profiles" ON user_profiles;
CREATE POLICY "Admins update all profiles" ON user_profiles
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── memberships: admins read & manage (verify payments, change tier) ──
DROP POLICY IF EXISTS "Admins manage memberships" ON memberships;
CREATE POLICY "Admins manage memberships" ON memberships
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── promo_codes: admins create/toggle/delete (public still reads active only) ──
DROP POLICY IF EXISTS "Admins manage promo codes" ON promo_codes;
CREATE POLICY "Admins manage promo codes" ON promo_codes
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── promo_code_usages: admins read usage stats (writes happen via RPC) ──
DROP POLICY IF EXISTS "Admins read promo usages" ON promo_code_usages;
CREATE POLICY "Admins read promo usages" ON promo_code_usages
  FOR SELECT TO authenticated USING (public.is_admin());

-- ── addons: admins edit pricing (public still reads) ──
DROP POLICY IF EXISTS "Admins manage addons" ON addons;
CREATE POLICY "Admins manage addons" ON addons
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── addon_subscriptions: admins read & manage ──
DROP POLICY IF EXISTS "Admins manage addon subscriptions" ON addon_subscriptions;
CREATE POLICY "Admins manage addon subscriptions" ON addon_subscriptions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── addon_dropin: admins read & confirm payments ──
DROP POLICY IF EXISTS "Admins manage addon dropin" ON addon_dropin;
CREATE POLICY "Admins manage addon dropin" ON addon_dropin
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- NOT covered here (legacy tables not defined in these migrations —
-- verify their RLS separately if the admin page is empty):
--   • cashflow_entries  (lapkeu financials)
--   • cafe_submissions / cafe_edits / cafe_reviews / cafe_photos (moderasi)
-- If any is RLS-enabled without an admin policy, add the same
-- is_admin() FOR ALL policy for it.
-- ============================================================
