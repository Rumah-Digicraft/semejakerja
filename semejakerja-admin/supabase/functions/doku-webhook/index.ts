// supabase/functions/doku-webhook/index.ts
//
// Receives DOKU's server-to-server HTTP Notification after a payment,
// verifies it really came from DOKU (HMAC signature), and — only on
// SUCCESS — marks the transaction paid and flips the membership to
// 'active'. This replaces the manual admin "Konfirmasi" step.
//
// Deploy with --no-verify-jwt (DOKU cannot send a Supabase JWT; the
// signature check below is what authenticates the request instead).

import { createClient } from "jsr:@supabase/supabase-js@2";
import { verifyWebhookSignature } from "../_shared/doku.ts";

// MUST exactly match the PATH of the Notification URL registered in the
// DOKU dashboard: https://<ref>.supabase.co/functions/v1/doku-webhook
const WEBHOOK_PATH = "/functions/v1/doku-webhook";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // 1. Read the raw body EXACTLY as received (needed for the signature digest).
  const rawBody = await req.text();

  // 2. Verify the notification really came from DOKU.
  const valid = verifyWebhookSignature({
    clientId: req.headers.get("Client-Id") ?? "",
    requestId: req.headers.get("Request-Id") ?? "",
    requestTimestamp: req.headers.get("Request-Timestamp") ?? "",
    requestTarget: WEBHOOK_PATH,
    rawBody,
    secretKey: Deno.env.get("DOKU_SECRET_KEY")!,
    signatureHeader: req.headers.get("Signature") ?? "",
  });
  if (!valid) {
    return new Response("Invalid signature", { status: 401 });
  }

  // 3. Parse the notification.
  let payload: Record<string, any>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const invoiceNumber: string | undefined = payload?.order?.invoice_number;
  const status: string | undefined = payload?.transaction?.status;
  const method = payload?.channel?.id ?? payload?.service?.id ?? null;

  if (!invoiceNumber) {
    return new Response("Missing invoice_number", { status: 400 });
  }

  // DOKU Checkout best-practice: only act on SUCCESS. The customer can
  // retry with another method, so FAILED is not final — just ack it.
  if (status !== "SUCCESS") {
    return new Response("Ignored (status not SUCCESS)", { status: 200 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 4. Find the transaction this notification is about. DOKU sends every
  //    notification (membership + moves) to the SAME dashboard-configured
  //    URL, so we dispatch by which table the invoice lives in.
  const { data: tx, error: txErr } = await admin
    .from("payment_transactions")
    .select("id, membership_id, status")
    .eq("invoice_number", invoiceNumber)
    .maybeSingle();

  if (txErr) return new Response("DB error", { status: 500 });

  // ── 4a. Membership payment (unchanged behaviour) ──
  if (tx) {
    // Idempotency: DOKU may send the same notification more than once.
    if (tx.status === "success") {
      return new Response("Already processed", { status: 200 });
    }

    // Mark the transaction paid.
    await admin.from("payment_transactions").update({
      status: "success",
      payment_method: method,
      paid_at: new Date().toISOString(),
      raw_response: payload,
    }).eq("id", tx.id);

    // Activate the membership.
    if (tx.membership_id) {
      await admin.from("memberships").update({
        status: "active",
        started_at: new Date().toISOString(),
      }).eq("id", tx.membership_id);
    }

    return new Response("OK", { status: 200 });
  }

  // ── 4b. Semeja Moves payment (funminton/padel) ──
  const { data: mtx, error: mErr } = await admin
    .from("moves_payment_transactions")
    .select(
      "id, session_id, participant_ids, pending_participants, participant_count, base_amount, kritik_saran, polling_hari, status",
    )
    .eq("invoice_number", invoiceNumber)
    .maybeSingle();

  if (mErr) return new Response("DB error", { status: 500 });
  if (!mtx) return new Response("Transaction not found", { status: 404 });

  // Idempotency.
  if (mtx.status === "success") {
    return new Response("Already processed", { status: 200 });
  }

  const paidAt = new Date().toISOString();
  const today = paidAt.slice(0, 10); // YYYY-MM-DD
  // Per-person nominal, for display on participant rows. Finance still
  // derives income from approvedCount × price_per_person, so the kode unik
  // (which lives only on the transaction) is never double-counted here.
  const perPerson = mtx.participant_count > 0
    ? Math.round(mtx.base_amount / mtx.participant_count)
    : mtx.base_amount;

  await admin.from("moves_payment_transactions").update({
    status: "success",
    payment_method: method,
    paid_at: paidAt,
    raw_response: payload,
  }).eq("id", mtx.id);

  // funminton: flip the selected existing participants to approved.
  if (Array.isArray(mtx.participant_ids) && mtx.participant_ids.length > 0) {
    await admin.from("participants").update({
      payment_status: "approved",
      attended: true,
      payment_amount: perPerson,
      payment_date: today,
      submitted_at: paidAt,
      ocr_match: true, // paid via gateway — not an OCR guess, don't flag
      kritik_saran: mtx.kritik_saran ?? null,
      polling_hari: mtx.polling_hari ?? null,
    })
      .in("id", mtx.participant_ids)
      .eq("session_id", mtx.session_id);
  }

  // padel: create the registrations now that the payment cleared.
  if (Array.isArray(mtx.pending_participants) && mtx.pending_participants.length > 0) {
    const rows = (mtx.pending_participants as { name: string; phone: string | null }[]).map(
      (p) => ({
        session_id: mtx.session_id,
        name: p.name,
        phone: p.phone ?? null,
        payment_status: "approved",
        attended: true,
        payment_amount: perPerson,
        payment_date: today,
        submitted_at: paidAt,
        ocr_match: true,
      }),
    );
    await admin.from("participants").insert(rows);
  }

  return new Response("OK", { status: 200 });
});
