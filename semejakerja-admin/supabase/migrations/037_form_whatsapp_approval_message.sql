-- ============================================================
-- 037: WhatsApp approval-message template per form
--
-- Admins can now open a pre-filled WhatsApp compose window (a wa.me
-- link, built client-side in the Forms admin UI) to notify an approved
-- participant manually from their own personal WhatsApp number — no
-- gateway/API integration, since each admin sends from their own phone.
-- This column holds the per-event message template (with {{placeholders}},
-- filled in client-side in community/forms/lib.ts).
-- ============================================================

ALTER TABLE forms ADD COLUMN IF NOT EXISTS whatsapp_approval_message text;
