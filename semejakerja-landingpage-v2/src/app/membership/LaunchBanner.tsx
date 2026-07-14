"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Rocket, Loader2, Copy, Check, ArrowRight } from "lucide-react";
import styles from "./launch.module.css";

// Bentuk baris dari view publik `active_launch_campaign` (migration 018).
interface LaunchCampaign {
  id: string;
  name: string;
  headline: string | null;
  subheadline: string | null;
  cta_label: string | null;
  discount_percent: number | null;
  quota: number | null;
  ends_at: string | null;
  registered_count: number;
}

export default function LaunchBanner() {
  const [campaign, setCampaign] = useState<LaunchCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tier, setTier] = useState("nongkrong");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      // Read-once dari view publik (pola static-export: fetch di client saat mount)
      const { data } = await supabase
        .from("active_launch_campaign")
        .select("*")
        .maybeSingle();
      setCampaign((data as LaunchCampaign | null) ?? null);
      const { data: { session } } = await supabase.auth.getSession();
      setLoggedIn(!!session);
      setLoading(false);
    }
    load();
  }, []);

  // Tidak ada campaign launch aktif → section ini hilang total (mode normal).
  if (loading || !campaign) return null;

  const discount = campaign.discount_percent ?? 0;
  const full = campaign.quota != null && campaign.registered_count >= campaign.quota;
  const loginHref = `/auth/login?next=${encodeURIComponent("/membership")}`;

  const handleRegister = async () => {
    setSubmitting(true);
    setError("");
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("register_launch", {
      p_campaign_id: campaign.id,
      p_tier_interest: tier,
    });
    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setCode((data as { code: string }).code);
  };

  const copyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.banner}>
          <span className={styles.badge}>
            <Rocket size={14} /> {campaign.name}
          </span>

          <div className={styles.grid}>
            <div className={styles.left}>
              <h2 className={styles.headline}>
                {campaign.headline || "Jadi Founding Member Semeja Kerja"}
              </h2>
              <p className={styles.sub}>
                {campaign.subheadline ||
                  `Daftar sekarang, dapat kode diskon ${discount}% buat membership-mu.`}
              </p>
              {campaign.quota != null && (
                <div className={styles.quota}>
                  <div className={styles.quotaBar}>
                    <div
                      className={styles.quotaFill}
                      style={{ width: `${Math.min((campaign.registered_count / campaign.quota) * 100, 100)}%` }}
                    />
                  </div>
                  <span className={styles.quotaText}>
                    {campaign.registered_count} / {campaign.quota} pendaftar
                  </span>
                </div>
              )}
            </div>

            <div className={styles.right}>
              <div className={styles.discountBig}>
                <span className={styles.discountNum}>{discount}%</span>
                <span className={styles.discountLabel}>OFF</span>
              </div>

              {/* Sudah dapat kode */}
              {code ? (
                <div className={styles.codeResult}>
                  <p className={styles.codeHint}>Kode diskonmu (dikirim ke emailmu juga):</p>
                  <button className={styles.codeBox} onClick={copyCode} type="button">
                    <span className={styles.codeText}>{code}</span>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                  <p className={styles.codeNote}>
                    Pilih paket di bawah, lalu masukkan kode ini saat checkout.
                  </p>
                </div>
              ) : full ? (
                <p className={styles.full}>Kuota pendaftar sudah penuh 🙏</p>
              ) : !loggedIn ? (
                <a href={loginHref} className={styles.cta}>
                  Login untuk daftar <ArrowRight size={16} />
                </a>
              ) : (
                <div className={styles.form}>
                  <label className={styles.tierLabel}>Paket yang diminati</label>
                  <select
                    className={styles.select}
                    value={tier}
                    onChange={(e) => setTier(e.target.value)}
                  >
                    <option value="nongkrong">Nongkrong</option>
                    <option value="mode_serius">Mode Serius</option>
                  </select>
                  <button
                    className={styles.cta}
                    onClick={handleRegister}
                    disabled={submitting}
                    type="button"
                  >
                    {submitting ? <Loader2 size={16} className={styles.spin} /> : <Rocket size={16} />}
                    {campaign.cta_label || "Daftar sekarang"}
                  </button>
                  {error && <p className={styles.error}>{error}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
