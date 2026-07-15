"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Rocket, Loader2, Copy, Check, ArrowRight, Flame, Clock } from "lucide-react";
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
  starts_at: string | null;
  ends_at: string | null;
  registered_count: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

// Custom hook: hitung mundur ke deadline (ms epoch), tick tiap detik.
function useCountdown(deadlineMs: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (deadlineMs === null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [deadlineMs]);
  if (deadlineMs === null) return null;
  const ms = Math.max(deadlineMs - now, 0);
  return {
    ended: ms <= 0,
    d: Math.floor(ms / 86400000),
    h: Math.floor((ms % 86400000) / 3600000),
    m: Math.floor((ms % 3600000) / 60000),
    s: Math.floor((ms % 60000) / 1000),
  };
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
  const [registered, setRegistered] = useState(0);

  // Muat awal: campaign aktif + sesi login.
  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data } = await supabase
        .from("active_launch_campaign")
        .select("*")
        .maybeSingle();
      const camp = (data as LaunchCampaign | null) ?? null;
      setCampaign(camp);
      if (camp) setRegistered(camp.registered_count);
      const { data: { session } } = await supabase.auth.getSession();
      setLoggedIn(!!session);
      setLoading(false);
    }
    load();
  }, []);

  // "War": poll jumlah pendaftar tiap 7 detik supaya slot kelihatan
  // kebakar real-time. Kalau campaign sudah tidak aktif → sembunyikan.
  useEffect(() => {
    if (!campaign) return;
    const supabase = createClient();
    const id = campaign.id;
    const t = setInterval(async () => {
      const { data } = await supabase
        .from("active_launch_campaign")
        .select("registered_count")
        .eq("id", id)
        .maybeSingle();
      if (data) setRegistered((data as { registered_count: number }).registered_count);
      else setCampaign(null);
    }, 7000);
    return () => clearInterval(t);
  }, [campaign?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const deadlineMs = campaign?.ends_at ? new Date(campaign.ends_at).getTime() : null;
  const cd = useCountdown(deadlineMs);

  // Tidak ada campaign launch aktif → section ini hilang total (mode normal).
  if (loading || !campaign) return null;

  const discount = campaign.discount_percent ?? 0;
  const loginHref = `/auth/login?next=${encodeURIComponent("/membership")}`;

  // Sisa slot + level urgensi (war).
  const remaining = campaign.quota != null ? Math.max(campaign.quota - registered, 0) : null;
  const ratio = campaign.quota ? (remaining as number) / campaign.quota : 1;
  const full = remaining !== null && remaining <= 0;
  const critical = remaining !== null && !full && ratio <= 0.1;
  const low = remaining !== null && !full && !critical && ratio <= 0.3;
  const pct = campaign.quota ? Math.min((registered / campaign.quota) * 100, 100) : 0;
  const warClass = full ? styles.warFull : critical ? styles.warCritical : low ? styles.warLow : "";

  const ended = !!cd?.ended;
  const closed = ended || full;

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
    setRegistered((r) => r + 1); // optimistis; poll akan sinkron
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

              {/* Countdown ke deadline */}
              {cd && !cd.ended && (
                <div className={styles.countdown}>
                  <span className={styles.cdLead}><Clock size={14} /> Berakhir dalam</span>
                  <div className={styles.cdBoxes}>
                    <CdBox n={cd.d} label="hari" />
                    <span className={styles.cdSep}>:</span>
                    <CdBox n={cd.h} label="jam" />
                    <span className={styles.cdSep}>:</span>
                    <CdBox n={cd.m} label="menit" />
                    <span className={styles.cdSep}>:</span>
                    <CdBox n={cd.s} label="detik" />
                  </div>
                </div>
              )}
              {ended && <p className={styles.endedNote}>Pendaftaran sudah ditutup.</p>}

              {/* War: sisa slot + progress */}
              {campaign.quota != null && (
                <div className={`${styles.war} ${warClass}`}>
                  <div className={styles.warRow}>
                    <span className={styles.warText}>
                      {(critical || low) && <Flame size={15} className={styles.warFlame} />}
                      {full ? "Kuota penuh" : `Sisa ${remaining} slot`}
                    </span>
                    <span className={styles.warCount}>{registered} / {campaign.quota}</span>
                  </div>
                  <div className={styles.quotaBar}>
                    <div className={styles.quotaFill} style={{ width: `${pct}%` }} />
                  </div>
                  {critical && !full && <span className={styles.warHype}>🔥 Buruan, hampir habis!</span>}
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
              ) : closed ? (
                <p className={styles.full}>{ended ? "Waktu pendaftaran habis ⏰" : "Kuota pendaftar sudah penuh 🙏"}</p>
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

function CdBox({ n, label }: { n: number; label: string }) {
  return (
    <span className={styles.cdBox}>
      <span className={styles.cdNum}>{pad(n)}</span>
      <span className={styles.cdLabel}>{label}</span>
    </span>
  );
}
