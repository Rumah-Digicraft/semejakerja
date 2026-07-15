-- ============================================================
-- 021: Model launch — momentum (bayar) & kode ikut deadline+grace
--
-- Perubahan konsep:
--  (1) Kuota BUKAN lagi cap pendaftaran (yang bisa hollow: slot habis
--      diambil orang yang tak pernah bayar). Pendaftaran kini tak
--      dibatasi; `quota` jadi TARGET lunak untuk progress bar publik.
--  (2) "Momentum" publik dihitung dari lead 'redeemed' (kode benar-benar
--      dipakai di checkout) — bukan sekadar jumlah pendaftar.
--  (3) Kode berlaku sampai `ends_at + grace_days` (default +3 hari),
--      bukan 14 hari sejak daftar. Fallback ke code_valid_days kalau
--      campaign tak punya ends_at.
--
-- Requires: 018 (campaigns, register_launch, active_launch_campaign).
-- ============================================================

-- ── 1. grace_days ───────────────────────────────────────────
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS grace_days integer NOT NULL DEFAULT 3;

-- ── 2. register_launch: buang cap kuota + expiry ikut deadline ──
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
  v_code text;
  v_code_id uuid;
  v_lead_id uuid;
  v_expires timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Kamu harus login dulu';
  END IF;

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

  -- (Tidak ada cap kuota lagi — pendaftaran terbuka.)

  -- Generate kode unik.
  LOOP
    v_code := 'LAUNCH-' || upper(substr(md5(gen_random_uuid()::text), 1, 5));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM promo_codes WHERE code = v_code);
  END LOOP;

  -- Berlaku sampai deadline campaign + grace; fallback code_valid_days.
  v_expires := CASE
    WHEN v_camp.ends_at IS NOT NULL
      THEN v_camp.ends_at + make_interval(days => v_camp.grace_days)
    ELSE now() + make_interval(days => v_camp.code_valid_days)
  END;

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

-- ── 3. view: tambah joined_count (lead 'redeemed' = pakai kode bayar) ──
-- CREATE OR REPLACE VIEW hanya boleh MENAMBAH kolom di akhir.
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
  (SELECT count(*) FROM campaign_leads l WHERE l.campaign_id = c.id) AS registered_count,
  (SELECT count(*) FROM campaign_leads l WHERE l.campaign_id = c.id AND l.status = 'redeemed') AS joined_count
FROM campaigns c
WHERE c.is_launch AND c.is_published AND c.status = 'active'
  AND (c.starts_at IS NULL OR c.starts_at <= now())
  AND (c.ends_at IS NULL OR c.ends_at > now());

GRANT SELECT ON public.active_launch_campaign TO anon, authenticated;
