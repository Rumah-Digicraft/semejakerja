// supabase/functions/form-create-payment/index.ts
//
// Creates a DOKU Checkout payment (QRIS only) for a PAID form event
// (migration 055). Called from the landing /wfc/register page right after
// submit_form_response returns status 'pending_payment', or from the
// "Bayar sekarang" button when the user comes back to an unpaid row.
//
// The user must be logged in (forms require Google login since 034) —
// deploy WITHOUT --no-verify-jwt. The price is ALWAYS read from the DB
// (forms.price); the client is never trusted for amounts. On success the
// doku-webhook flips the response row to 'registered'.
//
// Invoice prefix EVT- + separate table form_payment_transactions keep
// these transactions apart from membership (SMJ-) and moves (MOV-).

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  corsHeaders,
  buildSignature,
  digestBody,
  dokuTimestamp,
  dokuBaseUrl,
  makeInvoiceNumber,
} from "../_shared/doku.ts";

// Must match payment.payment_due_date below AND the slot-reservation
// window (form_responses.payment_expires_at) checked by migration 055.
const PAYMENT_DUE_MINUTES = 60;

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
    const { token, return_url, promo_code } = await req.json();
    if (!token || !return_url) {
      return jsonRes({ error: "Token dan return_url wajib diisi" }, 400);
    }

    // --- 1. Resolve the logged-in user (their JWT rides the request). ---
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return jsonRes({ error: "Harus login dulu" }, 401);

    // Service role: read any form/response + write the transaction row.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // --- 2. Load the form; the server owns the price. ---
    const { data: form, error: fErr } = await admin
      .from("forms")
      .select("id, title, price, quota, status")
      .eq("token", token)
      .maybeSingle();
    if (fErr) return jsonRes({ error: fErr.message }, 500);
    if (!form) return jsonRes({ error: "Form tidak ditemukan" }, 404);
    if (form.status !== "open") return jsonRes({ error: "Form sudah ditutup" }, 400);

    const price = form.price as number | null;
    if (!price || price <= 0) {
      return jsonRes({ error: "Event ini gratis — tidak ada pembayaran" }, 400);
    }

    // --- 3. The user's own response row must be awaiting payment. ---
    const { data: resp, error: rErr } = await admin
      .from("form_responses")
      .select("id, status")
      .eq("form_id", form.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (rErr) return jsonRes({ error: rErr.message }, 500);
    if (!resp) return jsonRes({ error: "Isi form pendaftaran dulu ya" }, 400);
    if (resp.status === "registered") {
      return jsonRes({ error: "Kamu sudah terdaftar di event ini" }, 400);
    }
    if (resp.status !== "pending_payment") {
      return jsonRes({ error: "Pendaftaran kamu tidak menunggu pembayaran" }, 400);
    }

    // --- 4. Re-check quota (registered + live pending_payment reservations,
    //         excluding this user's own row) before issuing a new invoice. ---
    if (form.quota != null) {
      const nowIso = new Date().toISOString();
      const { count, error: qErr } = await admin
        .from("form_responses")
        .select("id", { count: "exact", head: true })
        .eq("form_id", form.id)
        .neq("id", resp.id)
        .or(`status.eq.registered,and(status.eq.pending_payment,payment_expires_at.gt.${nowIso})`);
      if (qErr) return jsonRes({ error: qErr.message }, 500);
      if ((count ?? 0) >= form.quota) {
        return jsonRes({ error: "Kuota pendaftar sudah penuh" }, 400);
      }
    }

    // --- 4b. Kode promo (opsional, migration 056) — validasi server-side
    //         via RPC dengan konteks user (locked_to / allow-list / 1x pakai).
    let promoCodeId: string | null = null;
    let discount = 0;
    if (promo_code) {
      const { data: promo, error: pErr } = await userClient.rpc("preview_form_promo", {
        p_form_token: token,
        p_code: promo_code,
      });
      if (pErr) return jsonRes({ error: pErr.message }, 500);
      if (!promo?.valid) {
        return jsonRes({ error: promo?.reason ?? "Kode promo tidak valid" }, 400);
      }
      promoCodeId = promo.code_id as string;
      discount = promo.discount as number;
    }
    const amount = Math.max(0, price - discount);

    const dokuEnv = (Deno.env.get("DOKU_ENV") ?? "sandbox") as "sandbox" | "production";
    const invoiceNumber = makeInvoiceNumber("EVT");
    const expiresAt = new Date(Date.now() + PAYMENT_DUE_MINUTES * 60_000).toISOString();

    // --- 5a. Diskon 100% → tiket gratis: skip DOKU, langsung terdaftar.
    //         Pemakaian kode dicatat DI SINI — webhook tak akan terpanggil.
    if (amount === 0 && promoCodeId) {
      const { error: freeTxErr } = await admin.from("form_payment_transactions").insert({
        form_id: form.id,
        response_id: resp.id,
        user_id: user.id,
        invoice_number: invoiceNumber,
        amount: 0,
        base_amount: price,
        discount_amount: discount,
        promo_code_id: promoCodeId,
        status: "success",
        environment: dokuEnv,
        paid_at: new Date().toISOString(),
      });
      if (freeTxErr) return jsonRes({ error: freeTxErr.message }, 500);

      await admin.from("form_responses")
        .update({ status: "registered", payment_expires_at: null })
        .eq("id", resp.id);
      await admin.rpc("record_form_promo_usage", {
        p_code_id: promoCodeId,
        p_user_id: user.id,
      });

      return jsonRes({ free: true, invoice_number: invoiceNumber, amount: 0 });
    }

    // --- 5b. Record a pending transaction (service role; RLS blocks writes). ---
    const { error: txErr } = await admin.from("form_payment_transactions").insert({
      form_id: form.id,
      response_id: resp.id,
      user_id: user.id,
      invoice_number: invoiceNumber,
      amount,
      base_amount: price,
      discount_amount: discount,
      promo_code_id: promoCodeId,
      status: "pending",
      environment: dokuEnv,
      expires_at: expiresAt,
    });
    if (txErr) return jsonRes({ error: txErr.message }, 500);

    // --- 6. Ask DOKU for a hosted-checkout URL (signed request, QRIS only). ---
    const clientId = Deno.env.get("DOKU_CLIENT_ID")!;
    const secretKey = Deno.env.get("DOKU_SECRET_KEY")!;
    const requestTarget = "/checkout/v1/payment";

    // return_url already carries ?token=..., so append with the right joiner.
    const joiner = String(return_url).includes("?") ? "&" : "?";
    const dokuBody = {
      order: {
        amount,
        invoice_number: invoiceNumber,
        callback_url: `${return_url}${joiner}invoice=${invoiceNumber}`,
        auto_redirect: true,
      },
      payment: {
        payment_due_date: PAYMENT_DUE_MINUTES,
        // QRIS only: fee persentase kecil — VA fee flat kemahalan buat
        // tiket event puluhan ribu.
        payment_method_types: ["QRIS"],
      },
      customer: { id: user.id, email: user.email },
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
      await admin.from("form_payment_transactions")
        .update({ status: "failed", raw_response: dokuJson })
        .eq("invoice_number", invoiceNumber);
      return jsonRes({ error: "DOKU menolak transaksi", detail: dokuJson }, 502);
    }

    const paymentUrl = dokuJson.response.payment.url as string;
    const tokenId = dokuJson.response.payment.token_id as string;

    await admin.from("form_payment_transactions")
      .update({ doku_token_id: tokenId, payment_url: paymentUrl, raw_response: dokuJson })
      .eq("invoice_number", invoiceNumber);

    // --- 7. Reserve the quota slot for the invoice lifetime (see 055). ---
    await admin.from("form_responses")
      .update({ payment_expires_at: expiresAt })
      .eq("id", resp.id);

    return jsonRes({ payment_url: paymentUrl, invoice_number: invoiceNumber, amount });
  } catch (err) {
    return jsonRes({ error: String(err) }, 500);
  }
});
