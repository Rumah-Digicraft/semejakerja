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

  // 4. Find the transaction this notification is about.
  const { data: tx, error: txErr } = await admin
    .from("payment_transactions")
    .select("id, membership_id, status")
    .eq("invoice_number", invoiceNumber)
    .maybeSingle();

  if (txErr) return new Response("DB error", { status: 500 });
  if (!tx) return new Response("Transaction not found", { status: 404 });

  // 5. Idempotency: DOKU may send the same notification more than once.
  if (tx.status === "success") {
    return new Response("Already processed", { status: 200 });
  }

  // 6. Mark the transaction paid.
  await admin.from("payment_transactions").update({
    status: "success",
    payment_method: method,
    paid_at: new Date().toISOString(),
    raw_response: payload,
  }).eq("id", tx.id);

  // 7. Activate the membership.
  if (tx.membership_id) {
    await admin.from("memberships").update({
      status: "active",
      started_at: new Date().toISOString(),
    }).eq("id", tx.membership_id);
  }

  return new Response("OK", { status: 200 });
});
