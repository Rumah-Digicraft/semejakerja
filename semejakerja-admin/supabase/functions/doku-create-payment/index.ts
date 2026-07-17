// supabase/functions/doku-create-payment/index.ts
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  corsHeaders,
  buildSignature,
  digestBody,
  dokuTimestamp,
  dokuBaseUrl,
  makeInvoiceNumber,
} from "../_shared/doku.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { tier, period, promo_code, return_url } = await req.json();

    // --- Langkah 2: ambil harga ASLI dari database (atas nama member) ---
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Harus login dulu" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: checkout, error: rpcError } = await supabase.rpc(
      "create_membership_checkout",
      { p_tier: tier, p_period: period, p_promo_code: promo_code ?? null },
    );
    if (rpcError) {
      return new Response(JSON.stringify({ error: rpcError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const membershipId = checkout.membership_id as string;
    // total_amount = harga membership (final_price) + biaya layanan (service_fee).
    // Itu yang ditagih DOKU. price_paid di memberships tetap final_price (bersih).
    // Fallback ke final_price agar aman bila RPC lama belum ter-deploy.
    const serviceFee = (checkout.service_fee ?? 0) as number;
    const amount = (checkout.total_amount ?? checkout.final_price) as number;

    // --- Langkah 3: catat transaksi baru (pakai service role) ---
    // Nulis ke payment_transactions hanya boleh lewat service role (RLS memblok member).
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const dokuEnv = (Deno.env.get("DOKU_ENV") ?? "sandbox") as "sandbox" | "production";
    const invoiceNumber = makeInvoiceNumber();

    const { error: txError } = await admin.from("payment_transactions").insert({
      user_id: user.id,
      membership_id: membershipId,
      invoice_number: invoiceNumber,
      amount,
      service_fee: serviceFee,
      status: "pending",
      environment: dokuEnv,
    });
    if (txError) {
      return new Response(JSON.stringify({ error: txError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Langkah 4: minta tagihan ke DOKU (dengan tanda tangan) ---
    const clientId = Deno.env.get("DOKU_CLIENT_ID")!;
    const secretKey = Deno.env.get("DOKU_SECRET_KEY")!;
    const requestTarget = "/checkout/v1/payment";

    const dokuBody = {
      order: {
        amount,
        invoice_number: invoiceNumber,
        callback_url: `${return_url}?invoice=${invoiceNumber}`,
        auto_redirect: true,
      },
      payment: { payment_due_date: 60 }, // batas bayar: 60 menit
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
      // DOKU menolak → tandai gagal, simpan jejaknya, kabari user.
      await admin.from("payment_transactions")
        .update({ status: "failed", raw_response: dokuJson })
        .eq("invoice_number", invoiceNumber);
      return new Response(
        JSON.stringify({ error: "DOKU menolak transaksi", detail: dokuJson }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const paymentUrl = dokuJson.response.payment.url as string;
    const tokenId = dokuJson.response.payment.token_id as string;

    // --- Langkah 5: simpan url & token DOKU ke transaksi ---
    await admin.from("payment_transactions")
      .update({ doku_token_id: tokenId, payment_url: paymentUrl, raw_response: dokuJson })
      .eq("invoice_number", invoiceNumber);

    // --- Langkah 6: balikin payment_url ke landing page ---
    return new Response(
      JSON.stringify({ payment_url: paymentUrl, invoice_number: invoiceNumber }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
