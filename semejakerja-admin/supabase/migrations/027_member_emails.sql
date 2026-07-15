-- ============================================================
-- 027: RPC admin_list_member_emails — email (Google) tiap member
--
-- Halaman "Manajemen Member" menampilkan user_profiles, tapi email
-- tidak tersimpan di sana — hanya ada di auth.users (diisi Google OAuth).
-- Client (anon key) tidak bisa membaca auth.users, jadi butuh RPC
-- SECURITY DEFINER yang memverifikasi role admin lalu mengembalikan
-- pasangan (user_id, email). Pola sama seperti admin_list_admins (014),
-- tapi di-grant ke authenticated + cek admin_role() di dalam fungsi
-- (seperti admin_delete_membership, 026) sehingga bisa dipanggil
-- langsung dari client tanpa route service-role.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_list_member_emails()
RETURNS TABLE(user_id uuid, email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.admin_role() NOT IN ('super_admin', 'community_admin') THEN
    RAISE EXCEPTION 'Tidak punya izin melihat email member';
  END IF;

  RETURN QUERY
    SELECT u.id, u.email::text FROM auth.users u;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_member_emails() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_member_emails() TO authenticated;
