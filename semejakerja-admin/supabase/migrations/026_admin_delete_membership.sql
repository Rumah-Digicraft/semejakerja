-- ============================================================
-- 026: RPC admin_delete_membership — hapus transaksi membership
--
-- Halaman "Transaksi Membership" butuh tombol Hapus. Menghapus baris
-- memberships langsung dari client bisa gagal karena
-- promo_code_usages.membership_id mereferensikan memberships TANPA
-- ON DELETE (default RESTRICT), dan admin cuma punya SELECT di
-- promo_code_usages — jadi tidak bisa membersihkannya sendiri.
--
-- RPC SECURITY DEFINER ini: verifikasi admin → kembalikan kuota promo
-- (used_count) untuk usage yang terkait → hapus usage → hapus membership.
-- payment_transactions.membership_id sudah ON DELETE SET NULL (022),
-- jadi transaksi pembayaran tidak menghalangi & link-nya ter-null-kan.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_delete_membership(p_membership_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usage RECORD;
BEGIN
  IF public.admin_role() NOT IN ('super_admin', 'community_admin') THEN
    RAISE EXCEPTION 'Tidak punya izin menghapus transaksi';
  END IF;

  -- Kembalikan kuota promo untuk tiap usage yang terikat ke membership ini,
  -- lalu hapus usage-nya (admin tidak bisa hapus promo_code_usages langsung).
  FOR v_usage IN
    SELECT code_id FROM promo_code_usages WHERE membership_id = p_membership_id
  LOOP
    UPDATE promo_codes SET used_count = GREATEST(used_count - 1, 0)
      WHERE id = v_usage.code_id;
  END LOOP;
  DELETE FROM promo_code_usages WHERE membership_id = p_membership_id;

  DELETE FROM memberships WHERE id = p_membership_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_membership(uuid) TO authenticated;
