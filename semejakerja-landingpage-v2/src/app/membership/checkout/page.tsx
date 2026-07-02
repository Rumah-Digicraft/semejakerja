"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
    if (tierParam === "nongkrong") return periodParam === "triwulan" ? 85000 : 31000;
    if (tierParam === "mode_serius") return periodParam === "triwulan" ? 185000 : 69000;
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

    // Best-effort preview from the real promo_codes table (RLS: public may
    // read active codes). The checkout RPC re-validates authoritatively.
    const { data: promo } = await supabase
      .from("promo_codes")
      .select("code, type, discount_percent, expires_at, max_usage, used_count")
      .ilike("code", promoCode.trim())
      .eq("is_active", true)
      .maybeSingle();

    const expired = promo?.expires_at && new Date(promo.expires_at) <= new Date();
    const usedUp = promo?.max_usage != null && promo.used_count >= promo.max_usage;

    if (!promo || expired || usedUp) {
      setDiscountPercent(0);
      setPromoStatus("error");
      setPromoMsg("Kode promo tidak valid atau kadaluarsa");
      return;
    }

    setDiscountPercent(promo.discount_percent);
    setPromoStatus("success");
    setPromoMsg(
      promo.type === "student"
        ? `Promo pelajar berhasil! Diskon ${promo.discount_percent}% (khusus mahasiswa terverifikasi)`
        : `Promo berhasil digunakan! Diskon ${promo.discount_percent}%`
    );
  };

  const handleCheckout = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      // Atomic server-side checkout: prices, promo validation, duplicate
      // guard, and used_count increment all happen inside the RPC
      // (migration 008: create_membership_checkout).
      const { error } = await supabase.rpc("create_membership_checkout", {
        p_tier: tierParam,
        p_period: periodParam,
        p_promo_code: promoStatus === "success" ? promoCode.trim() : null,
      });

      if (error) {
        console.error("Checkout error:", error);
        // RAISE EXCEPTION messages from the RPC are user-facing Indonesian
        alert(error.message || "Gagal memproses. Coba lagi.");
      } else {
        alert("Pembayaran berhasil disubmit! Admin akan memverifikasi dalam 1x24 jam.");
        router.push("/");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan.");
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
                  Silakan transfer tepat sesuai nominal <strong>Rp {finalPrice.toLocaleString("id-ID")}</strong> ke rekening di bawah ini. Akun akan diaktifkan maksimal 1x24 jam setelah konfirmasi.
                </div>
              </div>

              <div className={styles.paymentBox}>
                <div className={styles.bankName}>Bank BCA</div>
                <div className={styles.bankAccount}>123-456-7890</div>
                <div className={styles.bankHolder}>a.n Semeja Kerja Purwokerto</div>
              </div>

              <button 
                onClick={handleCheckout} 
                disabled={submitting}
                className={`btn btn--primary ${styles.submitBtn}`}
              >
                {submitting ? (
                  <><Loader2 size={18} className="animate-spin" /> Memproses...</>
                ) : (
                  <><CheckCircle size={18} /> Saya Sudah Transfer</>
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
                <label className={styles.promoLabel}>Kode Promo / Student Code</label>
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
