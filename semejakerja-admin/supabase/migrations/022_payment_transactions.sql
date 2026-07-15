-- ============================================================
-- 022: Payment transactions — DOKU payment gateway
--
-- Records every DOKU payment attempt as its own row, linked to the
-- membership it pays for. This is the audit trail + the record the
-- webhook flips to 'success' (which then activates the membership),
-- replacing the manual BCA-transfer + admin "Konfirmasi" flow.
--
-- One membership can have many transactions over time (retries today,
-- renewals later) — so payments live in their own table rather than
-- as columns on `memberships`.
--
-- Writes happen ONLY from the Supabase Edge Functions using the
-- service role (which bypasses RLS): `doku-create-payment` inserts a
-- 'pending' row, `doku-webhook` updates it to 'success'/'failed'.
-- Members may only READ their own rows (checkout status page polls it).
--
-- `environment` marks whether the row is a DOKU sandbox (test) or
-- production (real) transaction — set automatically by the edge
-- function from its DOKU_ENV secret. Real reports filter
-- `environment = 'production'`; test rows can be wiped anytime with
-- `DELETE FROM payment_transactions WHERE environment = 'sandbox'`.
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  membership_id   uuid REFERENCES memberships(id) ON DELETE SET NULL,

  -- Unique per payment; this is what we send to DOKU as order.invoice_number
  -- and what the webhook uses to find this row again.
  invoice_number  text NOT NULL UNIQUE,

  amount          integer NOT NULL,        -- IDR, no decimals (matches DOKU)
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'success', 'failed', 'expired')),

  provider        text NOT NULL DEFAULT 'doku',
  environment     text NOT NULL DEFAULT 'sandbox'   -- 'sandbox' (test) or 'production' (real)
                    CHECK (environment IN ('sandbox', 'production')),
  payment_method  text,                    -- filled from DOKU (VA / EWALLET / QRIS / ...)
  doku_token_id   text,                    -- DOKU response.payment.token_id
  payment_url     text,                    -- DOKU response.payment.url (the pay page)
  raw_response    jsonb,                   -- last DOKU payload, for debugging

  expires_at      timestamptz,             -- payment window closes (DOKU expired_date)
  paid_at         timestamptz,             -- when webhook confirmed success
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_tx_user       ON payment_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_membership ON payment_transactions (membership_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_status     ON payment_transactions (status);
CREATE INDEX IF NOT EXISTS idx_payment_tx_env        ON payment_transactions (environment);

-- Keep updated_at fresh on every write (webhook relies on it for ordering)
CREATE OR REPLACE FUNCTION public.touch_payment_transactions_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_tx_updated_at ON payment_transactions;
CREATE TRIGGER trg_payment_tx_updated_at
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.touch_payment_transactions_updated_at();

-- RLS: a member can read only their own transactions (for the status page).
-- All inserts/updates come from the edge functions via the service role,
-- which bypasses RLS — so no write policy is granted to normal users.
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read own transactions" ON payment_transactions;
CREATE POLICY "Members read own transactions"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON payment_transactions TO authenticated;
