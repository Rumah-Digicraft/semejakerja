-- ============================================================
-- 034: Lower membership base pricing (end of soft-launch sticker)
--
-- Turun kembali ke harga dasar era 009, dengan triwulan yang sedikit
-- lebih murah dari 009 (dulu 47000/77000):
--
--   Nongkrong   — bulanan 36000 → 19000, triwulan 90000  → 41000
--   Mode Serius — bulanan 54000 → 31000, triwulan 135000 → 74000
--
-- Struktur 028 (Mode Serius = 1.5×, triwulan = 2.5× bulanan) tidak
-- dipertahankan: triwulan sekarang ≈2.16× (Nongkrong) dan ≈2.39×
-- (Mode Serius) dari bulanan.
--
-- PERHATIAN — promo soft-launch: sticker 028 sengaja 2× supaya kode
-- 50% mendarat di ~harga 009. Setelah migrasi ini, kode 50% yang masih
-- aktif akan MEMOTONG SETENGAH harga baru (Nongkrong bulanan jadi
-- Rp 9.500). Nonaktifkan campaign/kode launch dari admin saat deploy.
--
-- Service fee flat Rp 1.000 per transaksi TIDAK berubah (028/029).
--
-- Hanya tabel v_base + komentar yang berubah vs 028 — sisanya (promo,
-- allow-list email 024, dedupe, insert, service fee) identik. Kept as a
-- full CREATE OR REPLACE so the live definition stays in sync. Landing
-- mirrors: membership/page.tsx + checkout/page.tsx.
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

  -- Base price table (post-soft-launch lowering — migration 034).
  v_base := CASE
    WHEN p_tier = 'nongkrong'   AND p_period = 'bulanan'  THEN 19000
    WHEN p_tier = 'nongkrong'   AND p_period = 'triwulan' THEN 41000
    WHEN p_tier = 'mode_serius' AND p_period = 'bulanan'  THEN 31000
    WHEN p_tier = 'mode_serius' AND p_period = 'triwulan' THEN 74000
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
