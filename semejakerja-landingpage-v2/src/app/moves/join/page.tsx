"use client";

// Public join/payment page for Semeja Moves sessions.
// Static-export friendly: reads ?sport=f|p&token=... (no dynamic route).
// Payment runs on DOKU Checkout (QRIS) via the `moves-create-payment` edge
// function — anonymous/token-based, mirroring membership/checkout. The old
// manual QRIS-image + Gemini-OCR + upload flow has been replaced.

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Session, Participant } from "@/lib/movesTypes";
import { formatCurrency, formatDate } from "@/lib/format";
import { Activity, Trophy, Loader2 } from "lucide-react";
import styles from "./join.module.css";

// ── shared helpers ──────────────────────────────────────────────

function SubmittingOverlay() {
  return (
    <div className={styles.overlay}>
      <div className={styles.overlayCard}>
        <Loader2 size={48} className={styles.spinner} />
        <h3 className={styles.overlayTitle}>Menyiapkan pembayaran… 🤙</h3>
        <p className={styles.overlayText}>
          Bentar ya, kamu akan diarahkan ke halaman pembayaran DOKU (QRIS) ✨
        </p>
      </div>
    </div>
  );
}

function ErrorOverlay({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className={styles.overlay}>
      <div className={styles.overlayCard}>
        <div className={styles.overlayEmoji}>😭💀</div>
        <h3 className={styles.overlayTitle}>Waduh, gagal nih… Coba lagi yuk</h3>
        <p className={styles.overlayText}>{message}</p>
        <button
          type="button"
          onClick={onClose}
          className={`btn btn--primary ${styles.overlayBtn}`}
        >
          Coba lagi deh 🔄
        </button>
      </div>
    </div>
  );
}

const UNIQUE_CODE_NOTE =
  "+ kode unik (Rp300–700) ditambahkan otomatis di halaman pembayaran.";
const noteStyle: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  color: "var(--color-gray-400)",
  marginTop: "var(--space-2)",
};

// Starts a DOKU payment and redirects to the hosted checkout page.
async function startPayment(body: Record<string, unknown>) {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke(
    "moves-create-payment",
    { body }
  );

  // invoke() flags any non-2xx as `error`; the real message is in the body.
  if (error) {
    let msg = "Gagal memulai pembayaran. Coba lagi ya.";
    try {
      const parsed = await error.context.json();
      if (parsed?.error) msg = parsed.error;
    } catch {
      /* keep default */
    }
    throw new Error(msg);
  }

  if (data?.payment_url) {
    window.location.href = data.payment_url; // redirect to DOKU checkout
    return;
  }
  throw new Error("Link pembayaran tidak diterima. Coba lagi ya.");
}

// ── Funminton: pay for pre-registered participants ──────────────

function FunmintonJoin({ session }: { session: Session }) {
  const supabase = createClient();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [kritikSaran, setKritikSaran] = useState("");
  const [pollingAnswer, setPollingAnswer] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    supabase
      .from("participants")
      .select("*")
      .eq("session_id", session.id)
      .neq("payment_status", "approved")
      .then(({ data }) => {
        if (data) setParticipants(data as Participant[]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const expectedTotal = selectedIds.length * session.price_per_person;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      setErrorMsg("Pilih dulu nama yang mau dibayar.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      await startPayment({
        token: session.token,
        participant_ids: selectedIds,
        kritik_saran: kritikSaran || null,
        polling_hari: pollingAnswer,
        return_url: `${window.location.origin}/moves/status`,
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Terjadi kesalahan sistem."
      );
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className={styles.header}>
        <div className={`${styles.iconBadge} ${styles.iconFunminton}`}>
          <Activity size={24} />
        </div>
        <h1 className={styles.title}>Pembayaran Funminton</h1>
        <p className={styles.subtitle}>
          {formatDate(session.session_date)} • {session.venue}
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.card}>
        {submitting && <SubmittingOverlay />}
        {errorMsg && (
          <ErrorOverlay message={errorMsg} onClose={() => setErrorMsg("")} />
        )}

        <div>
          <label className={styles.label}>Pilih Nama Anda (Bisa &gt;1)</label>
          <div className={styles.participantList}>
            {participants.length === 0 ? (
              <p className={styles.participantEmpty}>
                Semua peserta sudah membayar.
              </p>
            ) : (
              participants.map((p) => (
                <label
                  key={p.id}
                  className={`${styles.participantItem} ${
                    selectedIds.includes(p.id) ? styles.participantSelected : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(p.id)}
                    onChange={() => toggleSelect(p.id)}
                  />
                  <span>{p.name}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <div>
          <div className={styles.totalBox}>
            <span className={styles.totalLabel}>Total Tagihan</span>
            <span className={styles.totalValue}>
              {formatCurrency(expectedTotal)}
            </span>
          </div>
          <p style={noteStyle}>{UNIQUE_CODE_NOTE}</p>
        </div>

        {session.announcement_config?.enabled &&
          (session.announcement_config.type === "libur" ? (
            <div className={`${styles.announcementBox} ${styles.announcementLibur}`}>
              <p className={`${styles.announcementLabel} ${styles.announcementLabelLibur}`}>
                🔊 Pengumuman
              </p>
              <p className={styles.announcementTitle}>
                {session.announcement_config.title}
              </p>
              {session.announcement_config.caption && (
                <p className={`${styles.announcementCaption} ${styles.announcementCaptionLibur}`}>
                  {session.announcement_config.caption}
                </p>
              )}
            </div>
          ) : (
            <div className={`${styles.announcementBox} ${styles.announcementNext}`}>
              <p className={`${styles.announcementLabel} ${styles.announcementLabelNext}`}>
                📢 Next Session
              </p>
              <p className={styles.announcementTitle}>
                {session.announcement_config.title}
              </p>
              {session.announcement_config.date && (
                <p className={styles.announcementDate}>
                  {session.announcement_config.date}
                </p>
              )}
              {session.announcement_config.caption && (
                <p className={`${styles.announcementCaption} ${styles.announcementCaptionNext}`}>
                  {session.announcement_config.caption}
                </p>
              )}
            </div>
          ))}

        {session.polling_config?.enabled && (
          <div className={styles.pollingBox}>
            <p className={styles.pollingQuestion}>
              {session.polling_config.question}
            </p>
            {session.polling_config.options.map((opt) => (
              <label
                key={opt}
                className={`${styles.pollingOption} ${
                  pollingAnswer === opt ? styles.pollingSelected : ""
                }`}
              >
                <input
                  type="radio"
                  name="polling"
                  value={opt}
                  checked={pollingAnswer === opt}
                  onChange={() => setPollingAnswer(opt)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        )}

        <div>
          <label className={styles.label}>
            Kritik dan Saran{" "}
            <span className={styles.labelOptional}>(opsional)</span>
          </label>
          <textarea
            placeholder="Kasih saran biar next minton tambah fun"
            className={styles.textarea}
            rows={3}
            value={kritikSaran}
            onChange={(e) => setKritikSaran(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={submitting || selectedIds.length === 0}
          className={`btn btn--primary ${styles.submitBtn}`}
        >
          {submitting ? "Memproses…" : "Bayar Sekarang (QRIS)"}
        </button>
      </form>
    </>
  );
}

// ── Padel: register + pay in one go ─────────────────────────────

function PadelJoin({ session }: { session: Session }) {
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setErrorMsg("Isi nama dulu ya.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      await startPayment({
        token: session.token,
        new_participants: [{ name: formData.name, phone: formData.phone || null }],
        payer_name: formData.name,
        payer_phone: formData.phone || null,
        return_url: `${window.location.origin}/moves/status`,
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Terjadi kesalahan sistem."
      );
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className={styles.header}>
        <div className={`${styles.iconBadge} ${styles.iconPadel}`}>
          <Trophy size={24} />
        </div>
        <h1 className={styles.title}>Registrasi Padel</h1>
        <p className={styles.subtitle}>
          {formatDate(session.session_date)} • {session.venue}
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.card}>
        {submitting && <SubmittingOverlay />}
        {errorMsg && (
          <ErrorOverlay message={errorMsg} onClose={() => setErrorMsg("")} />
        )}

        <div>
          <label className={styles.label} htmlFor="padel-name">
            Nama Lengkap
          </label>
          <input
            id="padel-name"
            type="text"
            required
            className={styles.input}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div>
          <label className={styles.label} htmlFor="padel-phone">
            No. WhatsApp
          </label>
          <input
            id="padel-phone"
            type="text"
            required
            className={styles.input}
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
          />
        </div>

        <div>
          <div className={styles.totalBox}>
            <span className={styles.totalLabel}>Biaya Pendaftaran</span>
            <span className={styles.totalValue}>
              {formatCurrency(session.price_per_person)}
            </span>
          </div>
          <p style={noteStyle}>{UNIQUE_CODE_NOTE}</p>
        </div>

        <p style={{ ...noteStyle, marginTop: 0, textAlign: "center" }}>
          Pendaftaran kamu otomatis tercatat setelah pembayaran berhasil.
        </p>

        <button
          type="submit"
          disabled={submitting || !formData.name}
          className={`btn btn--primary ${styles.submitBtn}`}
        >
          {submitting ? "Memproses…" : "Daftar & Bayar (QRIS)"}
        </button>
      </form>
    </>
  );
}

// ── Page shell: load session by token + sport ───────────────────

function JoinContent() {
  const searchParams = useSearchParams();
  const sport = searchParams.get("sport"); // 'f' | 'p'
  const token = searchParams.get("token");
  const sportType = sport === "p" ? "padel" : "funminton";

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!token || !sport) {
        setLoading(false);
        return;
      }
      const supabase = createClient();
      // RLS only exposes open sessions to the public (migration 007)
      const { data } = await supabase
        .from("sessions")
        .select("*")
        .eq("token", token)
        .eq("sport_type", sportType)
        .maybeSingle();

      if (data) setSession(data as Session);
      setLoading(false);
    }
    loadData();
  }, [token, sport, sportType]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingWrap}>
          <Loader2 size={32} className={styles.spinner} />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={styles.container}>
        <div className={styles.inner}>
          <div className={styles.statusCard}>
            <div className={styles.statusEmoji}>🔍</div>
            <h2 className={styles.statusTitle}>Sesi tidak ditemukan</h2>
            <p className={styles.statusText}>
              Link tidak valid atau sesi sudah ditutup. Cek lagi link dari grup
              WhatsApp ya!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        {sportType === "padel" ? (
          <PadelJoin session={session} />
        ) : (
          <FunmintonJoin session={session} />
        )}
      </div>
    </div>
  );
}

export default function MovesJoinPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.container}>
          <div className={styles.loadingWrap}>
            <Loader2 size={32} className={styles.spinner} />
          </div>
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}
