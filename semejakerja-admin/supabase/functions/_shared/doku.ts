// ============================================================
// Shared DOKU (non-SNAP) helpers for the Checkout integration.
//
// Used by BOTH edge functions:
//   - doku-create-payment  → sign our outgoing request to DOKU
//   - doku-webhook         → verify DOKU's incoming notification
//
// The signature scheme is identical in both directions (HMAC-SHA256
// over a fixed set of header components); only Request-Target and the
// Digest differ. Docs:
//   https://developers.doku.com/get-started-with-doku-api/signature-component/non-snap/signature-component-from-request-header
// ============================================================

import { createHash, createHmac } from "node:crypto";

export type DokuEnv = "sandbox" | "production";

export function dokuBaseUrl(env: DokuEnv): string {
  return env === "production"
    ? "https://api.doku.com"
    : "https://api-sandbox.doku.com";
}

/** DOKU wants ISO-8601 UTC WITHOUT milliseconds, e.g. 2020-08-11T08:45:42Z */
export function dokuTimestamp(date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** Digest = base64( SHA-256( raw request body ) ). Omit the line for empty bodies. */
export function digestBody(rawBody: string): string {
  return createHash("sha256").update(rawBody, "utf8").digest("base64");
}

/**
 * Build the non-SNAP `Signature` header value: "HMACSHA256=<base64>".
 * `requestTarget` is the PATH only (e.g. /checkout/v1/payment for outgoing,
 * or /functions/v1/doku-webhook for the notification we receive).
 */
export function buildSignature(params: {
  clientId: string;
  requestId: string;
  requestTimestamp: string;
  requestTarget: string;
  digest?: string; // base64(sha256(body)); omit when there is no body (GET)
  secretKey: string;
}): string {
  const lines = [
    `Client-Id:${params.clientId}`,
    `Request-Id:${params.requestId}`,
    `Request-Timestamp:${params.requestTimestamp}`,
    `Request-Target:${params.requestTarget}`,
  ];
  if (params.digest) lines.push(`Digest:${params.digest}`);
  const stringToSign = lines.join("\n"); // no trailing newline
  const hmac = createHmac("sha256", params.secretKey)
    .update(stringToSign, "utf8")
    .digest("base64");
  return `HMACSHA256=${hmac}`;
}

/**
 * Verify a DOKU webhook signature. `requestTarget` must be the PATH of the
 * Notification URL exactly as registered in the DOKU dashboard.
 * Returns true only when the recomputed signature matches the header.
 */
export function verifyWebhookSignature(params: {
  clientId: string;
  requestId: string;
  requestTimestamp: string;
  requestTarget: string;
  rawBody: string;
  secretKey: string;
  signatureHeader: string;
}): boolean {
  const expected = buildSignature({
    clientId: params.clientId,
    requestId: params.requestId,
    requestTimestamp: params.requestTimestamp,
    requestTarget: params.requestTarget,
    digest: digestBody(params.rawBody),
    secretKey: params.secretKey,
  });
  return timingSafeEqualStr(expected, params.signatureHeader ?? "");
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Generate a unique invoice number, e.g. SMJ-20260715-8F3A1C. */
export function makeInvoiceNumber(prefix = "SMJ"): string {
  const now = new Date();
  const ymd =
    `${now.getUTCFullYear()}` +
    `${String(now.getUTCMonth() + 1).padStart(2, "0")}` +
    `${String(now.getUTCDate()).padStart(2, "0")}`;
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `${prefix}-${ymd}-${rand}`;
}

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
