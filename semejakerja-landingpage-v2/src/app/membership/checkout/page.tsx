"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { STUDENT_MEMBERSHIP_ENABLED } from "@/lib/flags";
import type { User } from "@supabase/supabase-js";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import styles from "./checkout.module.css";

// Using Suspense boundary for useSearchParams
export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-20"><Loader2 className="animate-spin text-purple-600" size={32} /></div>}>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const tierParam = searchParams.get("tier") || "nongkrong";
  const periodParam = searchParams.get("period") || "bulanan";
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  const [promoCode, setPromoCode] = useState("");
  const [promoMsg, setPromoMsg] = useState("");
  const [promoStatus, setPromoStatus] = useState<"idle" | "success" | "error">("idle");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      } else {
        setUser(session.user);
        setLoading(false);
      }
    };
    checkAuth();
  }, [router, supabase]);

  // Pricing Logic
  const getBasePrice = () => {
    if (tierParam === "nongkrong") return periodParam === "triwulan" ? 47000 : 19000;
    if (tierParam === "mode_serius") return periodParam === "triwulan" ? 77000 : 31000;
    return 0;
  };

  const getTierName = () => {
    if (tierParam === "nongkrong") return "Nongkrong";
    if (tierParam === "mode_serius") return "Mode Serius";
    return "Nyantai";
  };

  const basePrice = getBasePrice();
  const discountAmount = Math.floor(basePrice * (discountPercent / 100));
  const finalPrice = basePrice - discountAmount;

  const handleApplyPromo = async () => {
    if (!promoCode) return;

    // Preview lewat RPC preview_promo_code (SECURITY DEFINER). RPC ini juga
    // memeriksa batasan email tanpa membocorkan daftarnya ke client. Checkout
    // RPC tetap memvalidasi ulang secara otoritatif saat bayar.
    const { data, error } = await supabase.rpc("preview_promo_code", {
      p_code: promoCode.trim(),
    });

    if (error || !data?.valid) {
      setDiscountPercent(0);
      setPromoStatus("error");
      setPromoMsg(data?.reason || "Kode promo tidak valid atau kadaluarsa");
      return;
    }

    setDiscountPercent(data.discount_percent);
    setPromoStatus("success");
    setPromoMsg(
      data.type === "student" && STUDENT_MEMBERSHIP_ENABLED
        ? `Promo pelajar berhasil! Diskon ${data.discount_percent}% (khusus mahasiswa terverifikasi)`
        : `Promo berhasil digunakan! Diskon ${data.discount_percent}%`
    );
  };

  const handleCheckout = async () => {
    if (!user) return;
    setSubmitting(true);
    setErrorMsg("");

    try {
      // Server-side: price via create_membership_checkout RPC, create the
      // DOKU payment, and return a payment_url we redirect the member to.
      const { data, error } = await supabase.functions.invoke("doku-create-payment", {
        body: {
          tier: tierParam,
          period: periodParam,
          promo_code: promoStatus === "success" ? promoCode.trim() : null,
          return_url: `${window.location.origin}/membership/checkout/status`,
        },
      });

      if (error) {
        // invoke() flags any non-2xx as error; the real message is in the body.
        let msg = "Gagal memproses pembayaran. Coba lagi.";
        try {
          const body = await error.context.json();
          if (body?.error) msg = body.error;
        } catch { /* ignore parse error */ }
        setErrorMsg(msg);
        return;
      }

      if (data?.payment_url) {
        window.location.href = data.payment_url; // ke halaman bayar DOKU
        return;
      }
      setErrorMsg("Tidak dapat memulai pembayaran. Coba lagi.");
    } catch (err) {
      console.error("Checkout exception:", err);
      setErrorMsg("Terjadi kesalahan tak terduga. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className="container">
        <h1 className={styles.title}>Checkout Membership</h1>
        
        <div className={styles.checkoutGrid}>
          
          {/* Left Column - Payment Instruction */}
          <div>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Informasi Pembayaran</h2>
              
              <div className={styles.paymentWarning}>
                <AlertCircle size={20} className="flex-shrink-0" />
                <div>
                  Kamu akan diarahkan ke halaman pembayaran <strong>DOKU</strong> untuk membayar <strong>Rp {finalPrice.toLocaleString("id-ID")}</strong> (VA, e-wallet, QRIS, dll). Membership aktif otomatis setelah pembayaran berhasil.
                </div>
              </div>

              {errorMsg && (
                <div className={styles.checkoutError}>
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={submitting}
                className={`btn btn--primary ${styles.submitBtn}`}
              >
                {submitting ? (
                  <><Loader2 size={18} className="animate-spin" /> Memproses...</>
                ) : (
                  <><CheckCircle size={18} /> Bayar dengan DOKU</>
                )}
              </button>
            </div>
          </div>

          {/* Right Column - Summary */}
          <div>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Ringkasan Pesanan</h2>
              
              <div className={styles.summaryRow}>
                <span>Paket Membership</span>
                <strong>{getTierName()}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Durasi</span>
                <strong>{periodParam === "triwulan" ? "3 Bulan" : "1 Bulan"}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Harga</span>
                <strong>Rp {basePrice.toLocaleString("id-ID")}</strong>
              </div>

              {discountPercent > 0 && (
                <div className={styles.summaryRow} style={{ color: "var(--color-emerald-600)" }}>
                  <span>Diskon ({discountPercent}%)</span>
                  <strong>- Rp {discountAmount.toLocaleString("id-ID")}</strong>
                </div>
              )}

              <div className={styles.summaryTotal}>
                <span>Total Bayar</span>
                <span>Rp {finalPrice.toLocaleString("id-ID")}</span>
              </div>

              <div className={styles.promoSection}>
                <label className={styles.promoLabel}>
                  {STUDENT_MEMBERSHIP_ENABLED ? "Kode Promo / Student Code" : "Kode Promo"}
                </label>
                <div className={styles.promoInputGroup}>
                  <input 
                    type="text" 
                    className={styles.promoInput}
                    placeholder="SEMEJA10" 
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                  />
                  <button onClick={handleApplyPromo} className="btn btn--secondary btn--small">
                    Terapkan
                  </button>
                </div>
                {promoStatus !== "idle" && (
                  <div className={`${styles.promoMsg} ${promoStatus === "success" ? styles.promoSuccess : styles.promoError}`}>
                    {promoMsg}
                  </div>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
