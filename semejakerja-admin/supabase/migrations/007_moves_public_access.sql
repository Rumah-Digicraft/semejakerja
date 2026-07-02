-- ============================================================
-- 007: Public access for Semeja Moves join pages (landing page)
--
-- Design: the session `token` is the capability. Public reads go
-- through narrow RLS policies; the two public writes go through
-- SECURITY DEFINER RPCs that REQUIRE the token, so plain anon
-- INSERT/UPDATE on participants is never opened up (an open anon
-- UPDATE policy would let anyone approve/vandalize any participant).
--
-- Requires public.is_admin() from 006.
--
-- ⚠️ Enabling RLS here immediately breaks the OLD moves app's
-- public pages (/f/:token did direct anon UPDATEs). Deploy the
-- landing /moves/join page in the same window.
-- ============================================================

-- ── RLS on legacy moves tables ──
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Admin app (client-side authenticated queries) keeps full access
DROP POLICY IF EXISTS "Admins manage sessions" ON sessions;
CREATE POLICY "Admins manage sessions" ON sessions
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage participants" ON participants;
CREATE POLICY "Admins manage participants" ON participants
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Public read: open sessions only (join page looks up by token)
DROP POLICY IF EXISTS "Public read open sessions" ON sessions;
CREATE POLICY "Public read open sessions" ON sessions
  FOR SELECT TO anon, authenticated
  USING (status = 'open');

-- Public read: participants of open sessions (funminton page lists unpaid names)
DROP POLICY IF EXISTS "Public read participants of open sessions" ON participants;
CREATE POLICY "Public read participants of open sessions" ON participants
  FOR SELECT TO anon, authenticated
  USING (session_id IN (SELECT id FROM sessions WHERE status = 'open'));

GRANT SELECT ON sessions TO anon, authenticated;
GRANT SELECT ON participants TO anon, authenticated;

-- ── RPC 1: padel-style join (INSERT new participant) ──
CREATE OR REPLACE FUNCTION public.join_moves_session(
  p_token text,
  p_name text,
  p_phone text,
  p_payment_status text,
  p_payment_amount integer,
  p_payment_date date,
  p_payment_proof_url text,
  p_ocr_raw jsonb,
  p_ocr_match boolean
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session sessions%ROWTYPE;
  v_id uuid;
BEGIN
  SELECT * INTO v_session FROM sessions WHERE token = p_token AND status = 'open';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesi tidak ditemukan atau sudah ditutup';
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Nama wajib diisi';
  END IF;
  IF p_payment_status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Status pembayaran tidak valid';
  END IF;

  INSERT INTO participants (
    session_id, name, phone, payment_status, attended,
    payment_amount, payment_date, payment_proof_url,
    ocr_raw, ocr_match, submitted_at
  ) VALUES (
    v_session.id, trim(p_name), NULLIF(trim(coalesce(p_phone, '')), ''),
    p_payment_status, p_payment_status = 'approved',
    p_payment_amount, p_payment_date, p_payment_proof_url,
    p_ocr_raw, p_ocr_match, now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ── RPC 2: funminton-style payment submit (UPDATE payment columns only) ──
CREATE OR REPLACE FUNCTION public.submit_moves_payment(
  p_token text,
  p_participant_ids uuid[],
  p_payment_status text,
  p_payment_amount integer,
  p_payment_date date,
  p_payment_proof_url text,
  p_ocr_raw jsonb,
  p_ocr_match boolean,
  p_kritik_saran text,
  p_polling_hari text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  SELECT id INTO v_session_id FROM sessions WHERE token = p_token AND status = 'open';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesi tidak ditemukan atau sudah ditutup';
  END IF;
  IF p_participant_ids IS NULL OR array_length(p_participant_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Pilih minimal satu peserta';
  END IF;
  IF p_payment_status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Status pembayaran tidak valid';
  END IF;

  UPDATE participants SET
    payment_status    = p_payment_status,
    attended          = CASE WHEN p_payment_status = 'approved' THEN true ELSE attended END,
    payment_amount    = p_payment_amount,
    payment_date      = p_payment_date,
    payment_proof_url = p_payment_proof_url,
    ocr_raw           = p_ocr_raw,
    ocr_match         = p_ocr_match,
    submitted_at      = now(),
    kritik_saran      = p_kritik_saran,
    polling_hari      = p_polling_hari
  WHERE id = ANY(p_participant_ids)
    AND session_id = v_session_id          -- cannot touch other sessions' rows
    AND payment_status <> 'approved';      -- cannot overwrite approved payments
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_moves_session(text, text, text, text, integer, date, text, jsonb, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_moves_payment(text, uuid[], text, integer, date, text, jsonb, boolean, text, text) TO anon, authenticated;

-- ── Storage: payment proofs bucket (public read, anon upload) ──
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public upload payment proofs" ON storage.objects;
CREATE POLICY "Public upload payment proofs" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "Public read payment proofs" ON storage.objects;
CREATE POLICY "Public read payment proofs" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'payment-proofs');
