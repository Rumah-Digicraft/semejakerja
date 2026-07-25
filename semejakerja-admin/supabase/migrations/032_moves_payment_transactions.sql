-- ============================================================
-- 032: Semeja Moves payment transactions (DOKU Checkout)
--
-- Automatic payment for the Semeja Moves public pages
-- (funminton /f/:token, padel /p/:token), replacing the manual
-- QRIS-image + upload + Gemini-OCR flow with a real gateway.
--
-- Mirrors payment_transactions (022) but for the MOVES domain:
-- anonymous (token-based, no auth.users), linked to sessions /
-- participants instead of memberships. Kept in a SEPARATE table so
-- the membership finance/audit trail stays clean and the two never mix.
--
-- Writes are service-role only (edge functions moves-create-payment +
-- doku-webhook). Anonymous payers poll their own status via the
-- SECURITY DEFINER RPC moves_payment_status(). Moves admins read the
-- table via public.is_admin() — the same gate used for participants
-- in migration 007.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.moves_payment_transactions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id           uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  sport_type           text NOT NULL,
  invoice_number       text NOT NULL UNIQUE,        -- DOKU order.invoice_number (prefix MOV-)

  -- What this payment settles (exactly one is populated):
  --   funminton → existing participant rows to flip to 'approved'
  participant_ids      uuid[],
  --   padel     → registrations to CREATE on success ([{name, phone}])
  pending_participants jsonb,
  participant_count    integer NOT NULL,

  -- Money (IDR, no decimals)
  base_amount          integer NOT NULL,            -- count × price_per_person
  unique_code          integer NOT NULL DEFAULT 0,  -- "kode unik" 300–700, added on top
  amount               integer NOT NULL,            -- base_amount + unique_code (charged to DOKU)

  -- Payer info + extras carried onto participants when payment succeeds
  payer_name           text,
  payer_phone          text,
  kritik_saran         text,
  polling_hari         text,

  -- Gateway bookkeeping (mirrors payment_transactions)
  status               text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','success','failed','expired')),
  provider             text NOT NULL DEFAULT 'doku',
  environment          text NOT NULL DEFAULT 'sandbox'
                         CHECK (environment IN ('sandbox','production')),
  payment_method       text,                        -- from DOKU (QRIS/VA/EWALLET/...)
  doku_token_id        text,                        -- DOKU response.payment.token_id
  payment_url          text,                        -- DOKU response.payment.url
  raw_response         jsonb,                        -- last DOKU payload (debug)
  expires_at           timestamptz,
  paid_at              timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moves_pay_session ON public.moves_payment_transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_moves_pay_status  ON public.moves_payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_moves_pay_env     ON public.moves_payment_transactions(environment);

-- keep updated_at fresh on every UPDATE
CREATE OR REPLACE FUNCTION public.trg_moves_pay_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_moves_pay_updated_at ON public.moves_payment_transactions;
CREATE TRIGGER trg_moves_pay_updated_at
  BEFORE UPDATE ON public.moves_payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.trg_moves_pay_touch_updated_at();

-- ── Grants ──
-- Tables in this project do NOT inherit default privileges (see 023),
-- so without this the edge functions' service-role writes fail with
-- "42501 permission denied".
GRANT ALL    ON public.moves_payment_transactions TO service_role;
GRANT SELECT ON public.moves_payment_transactions TO authenticated;

-- ── RLS: writes are service-role only; moves admins may read ──
ALTER TABLE public.moves_payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read moves payments" ON public.moves_payment_transactions;
CREATE POLICY "Admins read moves payments" ON public.moves_payment_transactions
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- ── RPC: anonymous payer polls their payment status by invoice ──
-- SECURITY DEFINER so the /f/:token & /p/:token pages (anon) can read
-- just the status of a single invoice, without opening a table-level
-- anon SELECT policy over the whole table.
CREATE OR REPLACE FUNCTION public.moves_payment_status(p_invoice text)
RETURNS TABLE (status text, amount integer, participant_count integer, paid_at timestamptz)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status, amount, participant_count, paid_at
  FROM public.moves_payment_transactions
  WHERE invoice_number = p_invoice;
$$;

GRANT EXECUTE ON FUNCTION public.moves_payment_status(text) TO anon, authenticated;
