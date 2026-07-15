"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CheckCircle, Clock, AlertCircle } from "lucide-react";

// DOKU redirects the member here after payment (callback_url):
//   /membership/checkout/status?invoice=SMJ-...
// We poll the transaction until the webhook flips it to 'success',
// then forward to the member dashboard.
export default function CheckoutStatusPage() {
  return (
    <Suspense fallback={<Centered><Loader2 className="animate-spin" size={40} /></Centered>}>
      <StatusContent />
    </Suspense>
  );
}

type State = "checking" | "success" | "pending" | "failed";

function StatusContent() {
  const router = useRouter();
  const supabase = createClient();
  const invoice = useSearchParams().get("invoice");
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    if (!invoice) {
      setState("pending");
      return;
    }

    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;

    const check = async () => {
      const { data } = await supabase
        .from("payment_transactions")
        .select("status")
        .eq("invoice_number", invoice)
        .maybeSingle();

      if (data?.status === "success") {
        setState("success");
        // Beri sedikit jeda supaya user lihat konfirmasi, lalu ke dashboard.
        timer = setTimeout(() => router.push("/membership/dashboard"), 1500);
        return;
      }
      if (data?.status === "failed") {
        setState("failed");
        return;
      }

      // Masih pending: webhook mungkin telat sedikit. Coba lagi ~20 detik.
      tries += 1;
      if (tries >= 10) {
        setState("pending");
        return;
      }
      timer = setTimeout(check, 2000);
    };

    check();
    return () => clearTimeout(timer);
  }, [invoice, router, supabase]);

  if (state === "checking") {
    return (
      <Centered>
        <Loader2 className="animate-spin" size={40} style={{ color: "#7c3aed" }} />
        <h1 style={titleStyle}>Memverifikasi pembayaran…</h1>
        <p style={subStyle}>Tunggu sebentar, jangan tutup halaman ini.</p>
      </Centered>
    );
  }

  if (state === "success") {
    return (
      <Centered>
        <CheckCircle size={48} style={{ color: "#16a34a" }} />
        <h1 style={titleStyle}>Pembayaran berhasil! 🎉</h1>
        <p style={subStyle}>Membership kamu sudah aktif. Mengarahkan ke dashboard…</p>
      </Centered>
    );
  }

  if (state === "failed") {
    return (
      <Centered>
        <AlertCircle size={48} style={{ color: "#dc2626" }} />
        <h1 style={titleStyle}>Pembayaran gagal</h1>
        <p style={subStyle}>Transaksi tidak berhasil. Silakan coba lagi.</p>
        <button onClick={() => router.push("/membership")} style={btnStyle}>
          Kembali ke Membership
        </button>
      </Centered>
    );
  }

  // pending (webhook belum masuk dalam batas waktu tunggu)
  return (
    <Centered>
      <Clock size={48} style={{ color: "#d97706" }} />
      <h1 style={titleStyle}>Menunggu konfirmasi pembayaran</h1>
      <p style={subStyle}>
        Kalau kamu sudah bayar, membership akan aktif otomatis begitu pembayaran
        terkonfirmasi (biasanya beberapa saat). Kamu bisa cek di dashboard.
      </p>
      <button onClick={() => router.push("/membership/dashboard")} style={btnStyle}>
        Ke Dashboard
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
  background: "#7c3aed",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};
