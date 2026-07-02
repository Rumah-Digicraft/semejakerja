-- ============================================================
-- 006: Harden admin_roles
--
-- The old policy "Service role manages admin_roles" was
-- `FOR ALL USING (true)` with no TO clause → it applied to anon
-- and authenticated as well, letting ANYONE with the anon key
-- read/insert/update admin_roles (including granting themselves
-- super_admin). The service role bypasses RLS entirely, so that
-- policy protected nothing — drop it and replace with a narrow
-- self-read policy needed by the admin middleware + sidebar.
-- ============================================================

-- 1. Drop the catastrophic catch-all policy
DROP POLICY IF EXISTS "Service role manages admin_roles" ON admin_roles;

-- 2. Users may read ONLY their own admin role
--    (used by semejakerja-admin proxy.ts middleware and the dashboard sidebar)
CREATE POLICY "Users read own admin role"
  ON admin_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Defense in depth: lock base grants down to what's needed.
--    Writes to admin_roles happen only via service role / SQL editor.
REVOKE ALL ON admin_roles FROM anon, authenticated;
GRANT SELECT ON admin_roles TO authenticated;

-- 4. Reusable helper: is the CALLER an admin?
--    SECURITY DEFINER so it can read admin_roles regardless of the
--    caller's own RLS visibility. Used by policies in 007.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid())
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- ============================================================
-- MANUAL STEP (run once, BEFORE deploying the hardened proxy.ts,
-- or you will lock yourself out of the admin panel):
--
--   INSERT INTO admin_roles (user_id, role)
--   SELECT id, 'super_admin' FROM auth.users WHERE email = '<admin-email>'
--   ON CONFLICT (user_id) DO NOTHING;
--
-- Also audit for bogus rows inserted while the hole was open:
--   SELECT ar.*, u.email FROM admin_roles ar JOIN auth.users u ON u.id = ar.user_id;
-- ============================================================
