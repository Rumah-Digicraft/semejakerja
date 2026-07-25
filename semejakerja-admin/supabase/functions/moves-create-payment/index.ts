// supabase/functions/moves-create-payment/index.ts
//
// Creates a DOKU Checkout payment for a Semeja Moves public page
// (funminton /f/:token or padel /p/:token). Anonymous & token-based —
// deploy with --no-verify-jwt. The price is ALWAYS taken from the DB
// (session.price_per_person); the client is never trusted for amounts.
//
// A random "kode unik" (Rp 300–700) is added on top so every transaction
// total is unique (and it softly covers DOKU's fee). Mirrors the
// membership doku-create-payment, but writes moves_payment_transactions
// and links to sessions/participants instead of memberships.
//
//   funminton → body has participant_ids[] (existing roster rows). On
//               payment success the webhook flips them to 'approved'.
//   padel     → body has new_participants[] ({name, phone}). We DON'T
//               create the rows yet — the webhook inserts them on success,
//               so abandoned payments never leave "ghost" participants.

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  corsHeaders,
  buildSignature,
  digestBody,
  dokuTimestamp,
  dokuBaseUrl,
  makeInvoiceNumber,
} from "../_shared/doku.ts";

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonRes({ error: "Method not allowed" }, 405);

  try {
    const {
      token,
      participant_ids, // funminton: existing participant ids to pay for
      new_participants, // padel: [{ name, phone }] to create on success
      payer_name,
      payer_phone,
      kritik_saran,
      polling_hari,
      return_url,
    } = await req.json();

    if (!token || !return_url) {
      return jsonRes({ error: "Token dan return_url wajib diisi" }, 400);
    }

    // Service role: bypasses RLS so we can read any session (public RLS
    // only exposes open sessions) and write the transaction row.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // --- 1. Load session by token; the server owns the price. ---
    const { data: session, error: sErr } = await admin
      .from("sessions")
      .select("id, sport_type, price_per_person, status")
      .eq("token", token)
      .maybeSingle();

    if (sErr) return jsonRes({ error: sErr.message }, 500);
    if (!session) return jsonRes({ error: "Sesi tidak ditemukan atau link tidak valid" }, 404);
    if (session.status !== "open") return jsonRes({ error: "Sesi sudah ditutup" }, 400);

    const price = session.price_per_person as number;

    // --- 2. Resolve who is paying + validate. ---
    let count = 0;
    let cleanParticipantIds: string[] | null = null;
    let cleanPending: { name: string; phone: string | null }[] | null = null;

    const ids: string[] = Array.isArray(participant_ids) ? participant_ids : [];
    const news: unknown[] = Array.isArray(new_participants) ? new_participants : [];

    if (ids.length > 0) {
      // funminton: the ids must belong to THIS session and not be paid yet.
      const { data: rows, error: pErr } = await admin
        .from("participants")
        .select("id, payment_status")
        .eq("session_id", session.id)
        .in("id", ids);
      if (pErr) return jsonRes({ error: pErr.message }, 500);
      const payable = (rows ?? []).filter((r) => r.payment_status !== "approved");
      if (payable.length === 0) {
        return jsonRes({ error: "Peserta tidak valid atau sudah lunas" }, 400);
      }
      cleanParticipantIds = payable.map((r) => r.id as string);
      count = cleanParticipantIds.length;
    } else if (news.length > 0) {
      // padel: registrations to create once the payment clears.
      cleanPending = (news as Record<string, unknown>[])
        .map((p) => ({
          name: String(p?.name ?? "").trim(),
          phone: p?.phone ? String(p.phone).trim() : null,
        }))
        .filter((p) => p.name.length > 0);
      if (cleanPending.length === 0) {
        return jsonRes({ error: "Nama peserta wajib diisi" }, 400);
      }
      count = cleanPending.length;
    } else {
      return jsonRes({ error: "Tidak ada peserta yang dibayar" }, 400);
    }

    // --- 3. Amount = count × price + kode unik (Rp 300–700). ---
    const baseAmount = count * price;
    const uniqueCode = 300 + Math.floor(Math.random() * 401); // 300..700 inclusive
    const amount = baseAmount + uniqueCode;

    const dokuEnv = (Deno.env.get("DOKU_ENV") ?? "sandbox") as "sandbox" | "production";
    const invoiceNumber = makeInvoiceNumber("MOV");

    // --- 4. Record a pending transaction (service role; RLS blocks anon writes). ---
    const { error: txErr } = await admin.from("moves_payment_transactions").insert({
      session_id: session.id,
      sport_type: session.sport_type,
      invoice_number: invoiceNumber,
      participant_ids: cleanParticipantIds,
      pending_participants: cleanPending,
      participant_count: count,
      base_amount: baseAmount,
      unique_code: uniqueCode,
      amount,
      payer_name: payer_name ?? null,
      payer_phone: payer_phone ?? null,
      kritik_saran: kritik_saran ?? null,
      polling_hari: polling_hari ?? null,
      status: "pending",
      environment: dokuEnv,
    });
    if (txErr) return jsonRes({ error: txErr.message }, 500);

    // --- 5. Ask DOKU for a hosted-checkout URL (signed request). ---
    const clientId = Deno.env.get("DOKU_CLIENT_ID")!;
    const secretKey = Deno.env.get("DOKU_SECRET_KEY")!;
    const requestTarget = "/checkout/v1/payment";

    const customerName = String(
      payer_name ?? cleanPending?.[0]?.name ?? "Peserta Semeja Moves",
    ).slice(0, 60);

    // NOTE: customer.email is intentionally omitted (anonymous payers).
    // If DOKU sandbox rejects the request for a missing email, add a
    // fallback here — the 502 branch below returns DOKU's error detail.
    const dokuBody: Record<string, unknown> = {
      order: {
        amount,
        invoice_number: invoiceNumber,
        callback_url: `${return_url}?invoice=${invoiceNumber}`,
        auto_redirect: true,
      },
      payment: { payment_due_date: 60 }, // batas bayar: 60 menit
      customer: {
        id: invoiceNumber,
        name: customerName,
        ...(payer_phone ? { phone: String(payer_phone) } : {}),
      },
    };
    const rawBody = JSON.stringify(dokuBody);

    const requestId = crypto.randomUUID();
    const timestamp = dokuTimestamp();
    const signature = buildSignature({
      clientId,
      requestId,
      requestTimestamp: timestamp,
      requestTarget,
      digest: digestBody(rawBody),
      secretKey,
    });

    const dokuRes = await fetch(dokuBaseUrl(dokuEnv) + requestTarget, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Id": clientId,
        "Request-Id": requestId,
        "Request-Timestamp": timestamp,
        "Signature": signature,
      },
      body: rawBody,
    });
    const dokuJson = await dokuRes.json();

    if (!dokuRes.ok) {
      await admin.from("moves_payment_transactions")
        .update({ status: "failed", raw_response: dokuJson })
        .eq("invoice_number", invoiceNumber);
      return jsonRes({ error: "DOKU menolak transaksi", detail: dokuJson }, 502);
    }

    const paymentUrl = dokuJson.response.payment.url as string;
    const tokenId = dokuJson.response.payment.token_id as string;

    await admin.from("moves_payment_transactions")
      .update({ doku_token_id: tokenId, payment_url: paymentUrl, raw_response: dokuJson })
      .eq("invoice_number", invoiceNumber);

    return jsonRes({ payment_url: paymentUrl, invoice_number: invoiceNumber, amount });
  } catch (err) {
    return jsonRes({ error: String(err) }, 500);
  }
});
