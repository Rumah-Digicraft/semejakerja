-- ============================================================
-- 018: Campaigns + Launch mode (lead capture + kode single-use)
--
-- Menambah "payung" campaign di atas promo_codes, plus sebuah
-- MODE LAUNCH publik: satu campaign yang bisa dinyalakan admin
-- (is_published) untuk mengubah halaman Pricing landing jadi
-- "harga + form daftar". Pendaftar (wajib login) dapat kode promo
-- SEKALI PAKAI yang terkunci ke akunnya (locked_to_user_id + max_usage=1),
-- lalu ditukar di checkout membership yang SUDAH ADA.
--
-- Prinsip: jalur bayar (008_membership_checkout) TIDAK disentuh.
-- Kode launch otomatis kompatibel karena RPC checkout sudah
-- memvalidasi locked_to_user_id, max_usage, dan expires_at.
--
-- Requires: promo_codes/promo_code_usages/memberships (001),
--           public.admin_role() (014).
-- Aman dijalankan sebelum setup Apps Script — pengiriman email
-- ditambahkan terpisah di migration 019.
-- ============================================================

-- ── 1. Tabel campaigns ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  objective text NOT NULL DEFAULT 'other'
    CHECK (objective IN ('launch','membership_growth','event','partner','moves_fill','seasonal','other')),
  description text,

  -- Target / ROI (opsional)
  target_metric text CHECK (target_metric IN ('signups','revenue')),
  target_value integer,
  budget integer,                         -- budget diskon (Rp) utk hitung ROI

  -- Jendela waktu + status siklus hidup
  starts_at timestamptz,
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','ended')),

  -- ── MODE LAUNCH (muka publik di halaman Pricing) ──
  is_launch boolean NOT NULL DEFAULT false,     -- campaign ini punya mode launch?
  is_published boolean NOT NULL DEFAULT false,  -- toggle ON/OFF dari admin
  discount_percent integer CHECK (discount_percent BETWEEN 1 AND 100), -- diskon kode terbitan
  quota integer,                          -- batas pendaftar (NULL = tak terbatas)
  code_valid_days integer NOT NULL DEFAULT 14, -- masa berlaku kode sejak terbit

  -- Konten (toggle + field kunci; layout hardcode di landing)
  headline text,
  subheadline text,
  cta_label text DEFAULT 'Daftar sekarang',

  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── 2. Kaitkan promo_codes ke campaign + tipe 'launch' ──────
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS campaign_id uuid
  REFERENCES campaigns(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_promo_codes_campaign ON promo_codes(campaign_id);

ALTER TABLE promo_codes DROP CONSTRAINT IF EXISTS promo_codes_type_check;
ALTER TABLE promo_codes ADD CONSTRAINT promo_codes_type_check
  CHECK (type IN ('student','event','community','partner','launch'));

-- ── 3. Tabel campaign_leads (pendaftar launch) ──────────────
CREATE TABLE IF NOT EXISTS campaign_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_interest text,                     -- tier yang diminati (opsional, info lead)
  promo_code_id uuid REFERENCES promo_codes(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','redeemed')),
  email_sent_at timestamptz,              -- diisi migration 019 saat email terkirim
  created_at timestamptz DEFAULT now(),
  UNIQUE (campaign_id, user_id)           -- anti daftar dobel
);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign ON campaign_leads(campaign_id);

-- ── 4. auto-update updated_at pada campaigns ────────────────
CREATE OR REPLACE FUNCTION public.set_campaign_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_campaigns_updated_at ON campaigns;
CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_campaign_updated_at();

-- ── 5. RPC register_launch — daftar campaign launch ─────────
-- SECURITY DEFINER: menulis promo_codes + campaign_leads tanpa
-- perlu grant menulis ke authenticated. Idempoten: daftar dua kali
-- mengembalikan kode yang sama, bukan bikin baru.
CREATE OR REPLACE FUNCTION public.register_launch(
  p_campaign_id uuid,
  p_tier_interest text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_camp campaigns%ROWTYPE;
  v_count integer;
  v_code text;
  v_code_id uuid;
  v_lead_id uuid;
  v_expires timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Kamu harus login dulu';
  END IF;

  -- Campaign harus mode launch yang aktif & masih dalam jendela waktu.
  -- FOR UPDATE me-lock baris supaya cek kuota race-safe.
  SELECT * INTO v_camp FROM campaigns
    WHERE id = p_campaign_id
      AND is_launch AND is_published AND status = 'active'
      AND (starts_at IS NULL OR starts_at <= now())
      AND (ends_at IS NULL OR ends_at > now())
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign launch tidak aktif atau sudah berakhir';
  END IF;

  -- Sudah pernah daftar? Kembalikan kode lama (idempoten).
  SELECT pc.code INTO v_code
    FROM campaign_leads l
    JOIN promo_codes pc ON pc.id = l.promo_code_id
    WHERE l.campaign_id = p_campaign_id AND l.user_id = v_uid;
  IF FOUND THEN
    RETURN jsonb_build_object('code', v_code, 'already', true);
  END IF;

  -- Kuota pendaftar.
  IF v_camp.quota IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM campaign_leads WHERE campaign_id = p_campaign_id;
    IF v_count >= v_camp.quota THEN
      RAISE EXCEPTION 'Kuota pendaftar sudah penuh';
    END IF;
  END IF;

  -- Generate kode unik LAUNCH-XXXXX.
  LOOP
    v_code := 'LAUNCH-' || upper(substr(md5(gen_random_uuid()::text), 1, 5));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM promo_codes WHERE code = v_code);
  END LOOP;

  v_expires := now() + make_interval(days => v_camp.code_valid_days);

  INSERT INTO promo_codes (
    code, type, discount_percent, max_usage, locked_to_user_id,
    expires_at, is_active, campaign_id, created_by
  ) VALUES (
    v_code, 'launch', coalesce(v_camp.discount_percent, 10), 1, v_uid,
    v_expires, true, p_campaign_id, v_uid
  ) RETURNING id INTO v_code_id;

  INSERT INTO campaign_leads (campaign_id, user_id, tier_interest, promo_code_id)
  VALUES (p_campaign_id, v_uid, p_tier_interest, v_code_id)
  RETURNING id INTO v_lead_id;

  RETURN jsonb_build_object(
    'code', v_code,
    'discount_percent', coalesce(v_camp.discount_percent, 10),
    'expires_at', v_expires,
    'lead_id', v_lead_id,
    'already', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_launch(uuid, text) TO authenticated;

-- ── 6. Tandai lead 'redeemed' saat kodenya dipakai ──────────
-- Dipicu oleh INSERT ke promo_code_usages (dilakukan checkout RPC).
-- SECURITY DEFINER supaya bisa update campaign_leads tanpa menyentuh
-- logika checkout itu sendiri.
CREATE OR REPLACE FUNCTION public.mark_launch_lead_redeemed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE campaign_leads
    SET status = 'redeemed'
    WHERE promo_code_id = NEW.code_id AND status <> 'redeemed';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_launch_lead_redeemed ON promo_code_usages;
CREATE TRIGGER trg_launch_lead_redeemed
  AFTER INSERT ON promo_code_usages
  FOR EACH ROW EXECUTE FUNCTION public.mark_launch_lead_redeemed();

-- ── 7. View publik: campaign launch yang sedang tayang ──────
-- security_invoker=false (definer): anon boleh baca via view ini
-- meski tabel campaigns tertutup untuk publik. View hanya meng-
-- ekspose field publik + jumlah pendaftar (BUKAN budget/target).
CREATE OR REPLACE VIEW public.active_launch_campaign
WITH (security_invoker = false) AS
SELECT
  c.id,
  c.name,
  c.headline,
  c.subheadline,
  c.cta_label,
  c.discount_percent,
  c.quota,
  c.starts_at,
  c.ends_at,
  (SELECT count(*) FROM campaign_leads l WHERE l.campaign_id = c.id) AS registered_count
FROM campaigns c
WHERE c.is_launch AND c.is_published AND c.status = 'active'
  AND (c.starts_at IS NULL OR c.starts_at <= now())
  AND (c.ends_at IS NULL OR c.ends_at > now());

GRANT SELECT ON public.active_launch_campaign TO anon, authenticated;

-- ── 8. RLS + grants ─────────────────────────────────────────
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;

-- campaigns: dikelola super_admin + community_admin. Publik TIDAK
-- baca tabel dasar (pakai view active_launch_campaign di atas).
DROP POLICY IF EXISTS "Admins manage campaigns" ON campaigns;
CREATE POLICY "Admins manage campaigns" ON campaigns
  FOR ALL TO authenticated
  USING (public.admin_role() IN ('super_admin', 'community_admin'))
  WITH CHECK (public.admin_role() IN ('super_admin', 'community_admin'));

-- campaign_leads: admin baca semua; user baca lead miliknya sendiri
-- (biar bisa lihat kodenya lagi). Tulis hanya lewat RPC (definer).
DROP POLICY IF EXISTS "Admins read campaign leads" ON campaign_leads;
CREATE POLICY "Admins read campaign leads" ON campaign_leads
  FOR SELECT TO authenticated
  USING (public.admin_role() IN ('super_admin', 'community_admin'));

DROP POLICY IF EXISTS "Admins update campaign leads" ON campaign_leads;
CREATE POLICY "Admins update campaign leads" ON campaign_leads
  FOR UPDATE TO authenticated
  USING (public.admin_role() IN ('super_admin', 'community_admin'))
  WITH CHECK (public.admin_role() IN ('super_admin', 'community_admin'));

DROP POLICY IF EXISTS "Users read own leads" ON campaign_leads;
CREATE POLICY "Users read own leads" ON campaign_leads
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Grants tabel (RLS tetap memfilter baris).
GRANT SELECT, INSERT, UPDATE, DELETE ON campaigns TO authenticated;
GRANT SELECT, UPDATE ON campaign_leads TO authenticated;
GRANT ALL ON campaigns TO service_role;
GRANT ALL ON campaign_leads TO service_role;

-- ============================================================
-- MANUAL STEP setelah menjalankan migrasi ini:
-- 1. Smoke test: sebagai community_admin, INSERT satu campaign
--    is_launch=true, is_published=true, status='active',
--    discount_percent=30, quota=50 → cek SELECT * FROM
--    active_launch_campaign mengembalikan baris itu.
-- 2. Sebagai user login biasa, panggil
--    SELECT register_launch('<campaign_id>'); → dapat kode LAUNCH-XXXXX,
--    dan kode itu bisa dipakai di create_membership_checkout.
-- 3. Email pendaftar BELUM aktif — dikerjakan di migration 019
--    setelah Apps Script web app dideploy.
-- ============================================================
