-- ============================================================
-- 025: Fix create_membership_checkout pricing regression
--
-- Migration 024 re-created create_membership_checkout by copying the
-- body from migration 008, which still had the OLD price table
-- (31000/85000/69000/185000). Migration 009 had already repriced to
-- 19000/47000/31000/77000, so 024 silently reverted the prices — and
-- since this RPC's final_price is what doku-create-payment charges via
-- DOKU, live checkout would bill the wrong (higher) amount.
--
-- This migration re-defines the function with the CORRECT prices (009)
-- AND keeps the promo email allow-list enforcement added in 024.
-- Prices mirror landing membership/page.tsx + checkout/page.tsx.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_membership_checkout(
  p_tier text,
  p_period text,
  p_promo_code text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_base integer;
  v_discount integer := 0;
  v_final integer;
  v_promo promo_codes%ROWTYPE;
  v_code text := NULLIF(upper(trim(coalesce(p_promo_code, ''))), '');
  v_membership_id uuid;
  v_expires timestamptz;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Kamu harus login dulu';
  END IF;
  IF p_tier NOT IN ('nongkrong', 'mode_serius') THEN
    RAISE EXCEPTION 'Tier tidak valid';
  END IF;
  IF p_period NOT IN ('bulanan', 'triwulan') THEN
    RAISE EXCEPTION 'Periode tidak valid';
  END IF;

  -- CORRECT price table (migration 009 — the authoritative one).
  v_base := CASE
    WHEN p_tier = 'nongkrong'   AND p_period = 'bulanan'  THEN 19000
    WHEN p_tier = 'nongkrong'   AND p_period = 'triwulan' THEN 47000
    WHEN p_tier = 'mode_serius' AND p_period = 'bulanan'  THEN 31000
    WHEN p_tier = 'mode_serius' AND p_period = 'triwulan' THEN 77000
  END;
  v_expires := now() + CASE WHEN p_period = 'triwulan'
                            THEN interval '3 months'
                            ELSE interval '1 month' END;

  -- Dedupe: no pending checkout, no already-active same tier
  IF EXISTS (SELECT 1 FROM memberships
             WHERE user_id = v_uid AND status = 'pending_payment') THEN
    RAISE EXCEPTION 'Kamu masih punya pembayaran yang menunggu verifikasi admin';
  END IF;
  IF EXISTS (SELECT 1 FROM memberships
             WHERE user_id = v_uid AND status = 'active' AND tier = p_tier
               AND (expires_at IS NULL OR expires_at > now())) THEN
    RAISE EXCEPTION 'Membership tier ini masih aktif';
  END IF;

  -- Promo validation (authoritative; UI preview is best-effort only)
  IF v_code IS NOT NULL THEN
    SELECT * INTO v_promo FROM promo_codes
      WHERE upper(code) = v_code
        AND is_active
        AND (expires_at IS NULL OR expires_at > now())
        AND (max_usage IS NULL OR used_count < max_usage)
        AND (locked_to_user_id IS NULL OR locked_to_user_id = v_uid)
      FOR UPDATE;  -- race-safe used_count increment
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Kode promo tidak valid atau sudah kadaluarsa';
    END IF;

    -- Allow-list email (migration 024): if the code is restricted, only the
    -- logged-in account's email may redeem it.
    IF EXISTS (SELECT 1 FROM promo_code_allowed_emails WHERE code_id = v_promo.id) THEN
      SELECT lower(u.email) INTO v_email FROM auth.users u WHERE u.id = v_uid;
      IF v_email IS NULL OR NOT EXISTS (
        SELECT 1 FROM promo_code_allowed_emails
        WHERE code_id = v_promo.id AND lower(email) = v_email
      ) THEN
        RAISE EXCEPTION 'Kode promo ini khusus untuk email tertentu';
      END IF;
    END IF;

    IF v_promo.type = 'student'
       AND NOT EXISTS (SELECT 1 FROM user_profiles
                       WHERE id = v_uid AND is_student) THEN
      RAISE EXCEPTION 'Kode ini khusus mahasiswa';
    END IF;
    IF EXISTS (SELECT 1 FROM promo_code_usages
               WHERE code_id = v_promo.id AND user_id = v_uid) THEN
      RAISE EXCEPTION 'Kode promo sudah pernah kamu pakai';
    END IF;
    v_discount := floor(v_base * v_promo.discount_percent / 100.0);
  END IF;

  v_final := v_base - v_discount;

  INSERT INTO memberships (user_id, tier, status, expires_at, promo_code_used, price_paid)
  VALUES (v_uid, p_tier, 'pending_payment', v_expires, v_code, v_final)
  RETURNING id INTO v_membership_id;

  IF v_promo.id IS NOT NULL THEN
    UPDATE promo_codes SET used_count = used_count + 1 WHERE id = v_promo.id;
    INSERT INTO promo_code_usages (code_id, user_id, membership_id)
    VALUES (v_promo.id, v_uid, v_membership_id);
  END IF;

  RETURN jsonb_build_object(
    'membership_id', v_membership_id,
    'base_price', v_base,
    'discount', v_discount,
    'final_price', v_final
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_membership_checkout(text, text, text) TO authenticated;
