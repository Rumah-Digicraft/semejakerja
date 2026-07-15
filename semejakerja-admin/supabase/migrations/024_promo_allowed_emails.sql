-- ============================================================
-- 024: Batasi promo code ke email tertentu (allow-list)
--
-- Tujuan: admin bisa bikin promo (mis. "HORE") yang hanya boleh
-- dipakai oleh email tertentu — satu atau banyak email.
--
-- Kenapa tabel terpisah, bukan kolom di promo_codes?
--   promo_codes punya policy "Public read active promo codes"
--   (migrasi 020) — anon key landing page BISA baca semua kolomnya.
--   Kalau email ditaruh di promo_codes, daftar email member bocor
--   ke publik. Tabel terpisah dengan RLS admin-only mencegah itu.
--   Enforcement tetap lewat RPC SECURITY DEFINER (bypass RLS).
-- ============================================================

-- 1. Tabel allow-list: email mana saja yang boleh menebus sebuah kode.
--    Tidak ada baris untuk sebuah code_id = kode terbuka untuk semua.
CREATE TABLE IF NOT EXISTS promo_code_allowed_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Satu email hanya sekali per kode (case-insensitive). Expression UNIQUE
-- harus lewat index, bukan table constraint. Index ini juga melayani
-- lookup by code_id (kolom pertama) untuk enforcement.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_promo_allowed_email_per_code
  ON promo_code_allowed_emails(code_id, lower(email));
CREATE INDEX IF NOT EXISTS idx_promo_allowed_emails_email
  ON promo_code_allowed_emails(lower(email));

ALTER TABLE promo_code_allowed_emails ENABLE ROW LEVEL SECURITY;

-- Hanya admin (role yang sama dengan yang mengelola promo) yang boleh
-- baca/tulis daftar email. Member biasa & anon TIDAK bisa baca sama sekali.
DROP POLICY IF EXISTS "Admins manage promo allowed emails" ON promo_code_allowed_emails;
CREATE POLICY "Admins manage promo allowed emails" ON promo_code_allowed_emails
  FOR ALL TO authenticated
  USING (public.admin_role() IN ('super_admin', 'community_admin'))
  WITH CHECK (public.admin_role() IN ('super_admin', 'community_admin'));

-- Grant tabel (RLS tetap memfilter ke admin). anon sengaja tidak diberi apa pun.
GRANT ALL ON public.promo_code_allowed_emails TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_code_allowed_emails TO authenticated;

-- 2. Preview promo untuk halaman checkout — SECURITY DEFINER supaya bisa
--    memeriksa allow-list TANPA membocorkan daftar email ke client.
--    Menggantikan pembacaan tabel langsung yang lama (best-effort preview).
CREATE OR REPLACE FUNCTION public.preview_promo_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_promo promo_codes%ROWTYPE;
  v_code text := NULLIF(upper(trim(coalesce(p_code, ''))), '');
BEGIN
  IF v_code IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Masukkan kode promo');
  END IF;

  SELECT * INTO v_promo FROM promo_codes
    WHERE upper(code) = v_code AND is_active
    LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Kode promo tidak valid');
  END IF;
  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at <= now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Kode promo sudah kadaluarsa');
  END IF;
  IF v_promo.max_usage IS NOT NULL AND v_promo.used_count >= v_promo.max_usage THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Kuota kode promo sudah habis');
  END IF;
  IF v_promo.locked_to_user_id IS NOT NULL AND v_promo.locked_to_user_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Kode promo ini bukan untukmu');
  END IF;

  -- Allow-list email: kalau ada isinya, hanya email akun login yang cocok.
  IF EXISTS (SELECT 1 FROM promo_code_allowed_emails WHERE code_id = v_promo.id) THEN
    SELECT lower(u.email) INTO v_email FROM auth.users u WHERE u.id = v_uid;
    IF v_email IS NULL OR NOT EXISTS (
      SELECT 1 FROM promo_code_allowed_emails
      WHERE code_id = v_promo.id AND lower(email) = v_email
    ) THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'Kode promo ini khusus untuk email tertentu');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'discount_percent', v_promo.discount_percent,
    'type', v_promo.type
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.preview_promo_code(text) TO anon, authenticated;

-- 3. Tegakkan allow-list di RPC checkout otoritatif (mengulang 008 utuh +
--    blok pengecekan email). Ini satu-satunya tempat diskon benar-benar
--    diterapkan, jadi enforcement di sini menutup jalur DOKU maupun langsung.
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

    -- Allow-list email: kalau kode dibatasi, hanya email akun login yang boleh
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
