-- ============================================================
-- 029: Service fee tracking on payment_transactions
--
-- Companion to 028. The membership price (memberships.price_paid) stays
-- clean; the flat Rp 1.000 service fee is recorded per DOKU transaction
-- here so the admin dashboard can accumulate it separately from
-- membership revenue.
--
-- Flow: create_membership_checkout (028) returns service_fee +
-- total_amount → doku-create-payment charges total_amount via DOKU and
-- inserts this row with amount = total_amount, service_fee = the fee.
-- The fee is only "collected" once the webhook flips status → 'success'.
-- ============================================================

-- ── 1. Kolom fee per transaksi ──────────────────────────────
-- Default 0 → baris lama (sebelum fee) tidak ikut terhitung.
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS service_fee integer NOT NULL DEFAULT 0;

-- ── 2. Akumulasi fee untuk dashboard admin ──────────────────
-- SECURITY DEFINER: payment_transactions RLS hanya mengizinkan member
-- membaca barisnya sendiri (022). Fungsi ini menembusnya untuk MENJUMLAH
-- saja, di-gate ke community/super admin. Non-admin dapat 0 (bukan error)
-- supaya aman dipanggil dari halaman mana pun.
--
-- Hanya menghitung transaksi 'success' (fee benar-benar tertagih) dan
-- environment 'production' (samakan dgn laporan lain — sandbox diabaikan).
CREATE OR REPLACE FUNCTION public.admin_service_fee_total()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(service_fee), 0)::integer
  FROM payment_transactions
  WHERE status = 'success'
    AND environment = 'production'
    AND public.admin_role() IN ('super_admin', 'community_admin');
$$;

REVOKE ALL ON FUNCTION public.admin_service_fee_total() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_service_fee_total() TO authenticated;
