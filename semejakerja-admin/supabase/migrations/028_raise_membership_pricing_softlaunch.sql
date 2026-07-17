-- ============================================================
-- 028: Raise membership base pricing (soft-launch repricing)
--      + flat Rp 1.000 service fee per transaction
--
-- Repricing the sticker (base) price so the 50%-off soft-launch code
-- lands the entry tier at ~Rp 20.000/bln. The 50% discount itself is
-- NOT here — it lives in campaigns.discount_percent (managed from admin)
-- and is applied on top of v_base by this RPC at checkout time.
--
--   Nongkrong   — bulanan 19000 → 40000, triwulan 47000  → 100000
--   Mode Serius — bulanan 31000 → 60000, triwulan 77000  → 150000
--
-- After a 50% launch code:
--   Nongkrong   — 20000 / 50000 ；Mode Serius — 30000 / 75000
--
-- NOTE: this raises the price for buyers WITHOUT a launch code too —
-- they pay the full new base. That is intentional (raise the sticker,
-- launch buyers get 50% off).
--
-- SERVICE FEE: a flat Rp 1.000 is charged on top of every checkout.
-- It is kept SEPARATE from the membership price:
--   • memberships.price_paid stays = v_final (membership only, no fee)
--     → keeps "Pendapatan Membership" / lapkeu revenue clean.
--   • the RPC additionally returns service_fee + total_amount; the
--     doku-create-payment edge function charges total_amount via DOKU
--     and records the fee in payment_transactions.service_fee (029),
--     which the admin dashboard accumulates.
-- Keep this constant in sync with SERVICE_FEE in checkout/page.tsx.
--
-- Only the v_base price table + the service-fee lines changed vs 025 —
-- the rest of the function (promo validation, email allow-list from 024,
-- dedupe, insert) is identical. Kept as a full CREATE OR REPLACE so the
-- live definition stays in sync. Landing mirrors: membership/page.tsx +
-- checkout/page.tsx.
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
  v_service_fee integer := 1000;  -- flat fee per transaksi (sinkron dgn checkout/page.tsx)
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

  -- Base price table (soft-launch repricing — migration 028).
  v_base := CASE
    WHEN p_tier = 'nongkrong'   AND p_period = 'bulanan'  THEN 40000
    WHEN p_tier = 'nongkrong'   AND p_period = 'triwulan' THEN 100000
    WHEN p_tier = 'mode_serius' AND p_period = 'bulanan'  THEN 60000
    WHEN p_tier = 'mode_serius' AND p_period = 'triwulan' THEN 150000
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
    'final_price', v_final,               -- harga membership (masuk price_paid)
    'service_fee', v_service_fee,         -- biaya layanan flat per transaksi
    'total_amount', v_final + v_service_fee  -- yang benar-benar ditagih DOKU
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_membership_checkout(text, text, text) TO authenticated;
