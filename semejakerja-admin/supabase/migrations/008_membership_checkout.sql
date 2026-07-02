-- ============================================================
-- 008: Membership checkout — atomic RPC with real promo validation
--
-- Replaces the landing page's direct `memberships` insert with a
-- SECURITY DEFINER RPC that: prices server-side, validates promo
-- codes against promo_codes (race-safe), blocks duplicate pending/
-- active memberships, increments used_count, and records usage.
-- ============================================================

-- 1. Defensive: guarantee 'pending_payment' is allowed on the live DB
--    (001 defines it, but the live DB may predate that file)
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_status_check;
ALTER TABLE memberships ADD CONSTRAINT memberships_status_check
  CHECK (status IN ('active', 'expired', 'cancelled', 'pending_payment'));

-- 2. One pending checkout at a time per user
CREATE UNIQUE INDEX IF NOT EXISTS uniq_membership_pending_per_user
  ON memberships (user_id) WHERE status = 'pending_payment';

-- 3. Atomic checkout RPC
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

  -- Server-side price table (mirrors landing membership/page.tsx)
  v_base := CASE
    WHEN p_tier = 'nongkrong'   AND p_period = 'bulanan'  THEN 31000
    WHEN p_tier = 'nongkrong'   AND p_period = 'triwulan' THEN 85000
    WHEN p_tier = 'mode_serius' AND p_period = 'bulanan'  THEN 69000
    WHEN p_tier = 'mode_serius' AND p_period = 'triwulan' THEN 185000
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
