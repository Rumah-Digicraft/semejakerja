"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/format";

// DOKU redirects the payer here after a Semeja Moves payment (callback_url):
//   /moves/status?invoice=MOV-...
// We poll moves_payment_status() (anon RPC) until the webhook flips the
// transaction to 'success'. Funminton participants are then marked paid;
// padel registrations are created — all handled server-side by the webhook.
export default function MovesStatusPage() {
  return (
    <Suspense
      fallback={
        <Centered>
          <Loader2 className="animate-spin" size={40} style={{ color: "#16a34a" }} />
        </Centered>
      }
    >
      <StatusContent />
    </Suspense>
  );
}

type State = "checking" | "success" | "pending" | "failed";

function StatusContent() {
  const supabase = createClient();
  const invoice = useSearchParams().get("invoice");
  const [state, setState] = useState<State>("checking");
  const [amount, setAmount] = useState<number | null>(null);

  useEffect(() => {
    if (!invoice) {
      setState("pending");
      return;
    }

    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;

    const check = async () => {
      const { data } = await supabase.rpc("moves_payment_status", {
        p_invoice: invoice,
      });
      const row = Array.isArray(data) ? data[0] : data;

      if (row) {
        if (typeof row.amount === "number") setAmount(row.amount);
        if (row.status === "success") {
          setState("success");
          return;
        }
        if (row.status === "failed" || row.status === "expired") {
          setState("failed");
          return;
        }
      }

      // Still pending: the webhook may lag a little. Retry ~60 seconds.
      tries += 1;
      if (tries >= 24) {
        setState("pending");
        return;
      }
      timer = setTimeout(check, 2500);
    };

    check();
    return () => clearTimeout(timer);
  }, [invoice, supabase]);

  if (state === "checking") {
    return (
      <Centered>
        <Loader2 className="animate-spin" size={40} style={{ color: "#16a34a" }} />
        <h1 style={titleStyle}>Mengecek status pembayaran…</h1>
        <p style={subStyle}>
          Kalau kamu sudah menyelesaikan pembayaran di DOKU, sebentar lagi
          statusnya update otomatis. Jangan tutup dulu ya ✨
        </p>
      </Centered>
    );
  }

  if (state === "success") {
    return (
      <Centered>
        <CheckCircle size={48} style={{ color: "#16a34a" }} />
        <h1 style={titleStyle}>Pembayaran berhasil! 🎉</h1>
        <p style={subStyle}>
          {amount != null ? `Pembayaran ${formatCurrency(amount)} sudah diterima. ` : ""}
          Kamu sudah tercatat lunas, sampai jumpa di lapangan 🔥
        </p>
      </Centered>
    );
  }

  if (state === "failed") {
    return (
      <Centered>
        <AlertCircle size={48} style={{ color: "#dc2626" }} />
        <h1 style={titleStyle}>Pembayaran gagal / kadaluarsa</h1>
        <p style={subStyle}>
          Transaksi tidak selesai atau melewati batas waktu. Silakan kembali ke
          link sesi dari grup WhatsApp dan coba lagi.
        </p>
      </Centered>
    );
  }

  // pending (webhook belum masuk dalam batas waktu tunggu)
  return (
    <Centered>
      <Clock size={48} style={{ color: "#d97706" }} />
      <h1 style={titleStyle}>Menunggu pembayaran</h1>
      <p style={subStyle}>
        Kami belum menerima konfirmasi dari DOKU. Kalau kamu sudah bayar, tunggu
        beberapa saat lalu refresh halaman ini. Kalau belum, silakan ulangi
        pembayaran.
      </p>
      <button onClick={() => window.location.reload()} style={btnStyle}>
        Refresh status 🔄
      </button>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: "0.75rem",
        padding: "2rem",
      }}
    >
      {children}
    </div>
  );
}

const titleStyle: React.CSSProperties = { fontSize: "1.5rem", fontWeight: 700, margin: 0 };
const subStyle: React.CSSProperties = { color: "#6b7280", maxWidth: "28rem", margin: 0 };
const btnStyle: React.CSSProperties = {
  marginTop: "0.5rem",
  padding: "0.65rem 1.5rem",
  borderRadius: "0.5rem",
  border: "none",
  background: "#16a34a",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};
