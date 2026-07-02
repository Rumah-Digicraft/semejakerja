"use client";

// Public join/payment page for Semeja Moves sessions.
// Ported from semejamoves-web-apps PublicFunminton.tsx + PublicPadel.tsx.
// Static-export friendly: reads ?sport=f|p&token=... (no dynamic route).
// Writes go through SECURITY DEFINER RPCs (migration 007) — the token is
// the capability; there is no direct anon INSERT/UPDATE on participants.

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { analyzePaymentProof, type OcrResult } from "@/lib/gemini";
import type { Session, Participant } from "@/lib/movesTypes";
import { formatCurrency, formatDate } from "@/lib/format";
import { Activity, Trophy, Upload, Download, X, Loader2 } from "lucide-react";
import styles from "./join.module.css";

const QRIS_SRC = "/images/qris.jpeg";

// ── shared helpers ──────────────────────────────────────────────

const compressImage = (
  f: File,
  maxPx = 1024,
  quality = 0.82
): Promise<{ base64: string; mimeType: string }> =>
  new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
    };
    img.onerror = reject;
    img.src = url;
  });

async function uploadProof(file: File, sessionId: string) {
  const supabase = createClient();
  const fileExt = file.name.split(".").pop();
  const fileName = `${sessionId}/${Date.now()}.${fileExt}`;
  const { error: uploadError } = await supabase.storage
    .from("payment-proofs")
    .upload(fileName, file);
  if (uploadError) throw new Error("Gagal upload gambar.");
  const {
    data: { publicUrl },
  } = supabase.storage.from("payment-proofs").getPublicUrl(fileName);
  return publicUrl;
}

function SubmittingOverlay({ funminton }: { funminton: boolean }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.overlayCard}>
        <Loader2 size={48} className={styles.spinner} />
        <h3 className={styles.overlayTitle}>
          {funminton ? "Sabar bestie... 🤙" : "Memproses Pembayaran"}
        </h3>
        <p className={styles.overlayText}>
          {funminton
            ? "AI lagi ngecek bukti tf mu, bentar lagi kok. jangan kemana-mana dulu ya teman semeja ✨"
            : "Sedang memverifikasi bukti transfer Anda menggunakan AI. Mohon tunggu sebentar..."}
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
        <h3 className={styles.overlayTitle}>
          Aduh, verifikasinya gagal... Coba lagi yuk
        </h3>
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

function UploadField({
  file,
  setFile,
}: {
  file: File | null;
  setFile: (f: File | null) => void;
}) {
  return (
    <div>
      <label className={styles.label}>Upload Bukti Transfer (QRIS/Bank)</label>
      {file ? (
        <div className={styles.filePreview}>
          <div className={styles.filePreviewIcon}>
            <Upload size={20} />
          </div>
          <div className={styles.filePreviewInfo}>
            <p className={styles.filePreviewName}>{file.name}</p>
            <p className={styles.filePreviewSize}>
              {(file.size / 1024).toFixed(0)} KB — siap diupload
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFile(null)}
            className={styles.filePreviewRemove}
            aria-label="Hapus file"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <div className={styles.uploadArea}>
          <div>
            <Upload size={40} className={styles.uploadIcon} />
            <p className={styles.uploadText}>Upload foto</p>
            <p className={styles.uploadHint}>PNG, JPG up to 5MB</p>
          </div>
          <input
            type="file"
            className={styles.uploadInput}
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>
      )}
    </div>
  );
}

function QrisBox() {
  return (
    <div className={styles.qrisBox}>
      <p>Scan QRIS di bawah ini untuk membayar:</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={QRIS_SRC} alt="QRIS Semeja Kerja" className={styles.qrisImage} />
      <a href={QRIS_SRC} download="QRIS_SemejaMoves.jpeg" className={styles.qrisDownload}>
        <Download size={16} /> Download QRIS
      </a>
    </div>
  );
}

// ── Funminton: pay for pre-registered participants ──────────────

function FunmintonJoin({ session }: { session: Session }) {
  const supabase = createClient();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [kritikSaran, setKritikSaran] = useState("");
  const [pollingAnswer, setPollingAnswer] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<"approved" | "pending" | false>(false);
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
    if (selectedIds.length === 0 || !file) {
      setErrorMsg("Pilih nama dan upload bukti pembayaran.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      // 1. Compress then run OCR with Gemini
      const { base64, mimeType } = await compressImage(file);
      const ocrResult: OcrResult | null = await analyzePaymentProof(base64, mimeType);

      // 2. Auto-approve when the transferred nominal matches the bill
      const isMatch =
        !!ocrResult &&
        typeof ocrResult.nominal === "number" &&
        ocrResult.nominal === expectedTotal;

      // 3. Upload proof regardless of OCR result
      const publicUrl = await uploadProof(file, session.id);

      // 4. Submit via token-gated RPC (migration 007)
      const { error } = await supabase.rpc("submit_moves_payment", {
        p_token: session.token,
        p_participant_ids: selectedIds,
        p_payment_status: isMatch ? "approved" : "pending",
        p_payment_amount: ocrResult?.nominal ?? null,
        p_payment_date:
          ocrResult?.tanggal || new Date().toISOString().split("T")[0],
        p_payment_proof_url: publicUrl,
        p_ocr_raw: ocrResult,
        p_ocr_match: isMatch,
        p_kritik_saran: kritikSaran || null,
        p_polling_hari: pollingAnswer,
      });
      if (error) throw new Error(error.message);

      setSuccess(isMatch ? "approved" : "pending");
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Terjadi kesalahan sistem."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className={styles.statusCard}>
        {success === "approved" ? (
          <>
            <div className={styles.statusEmoji}>🏸✅</div>
            <h2 className={styles.statusTitle}>Slay! Bayarnya valid bestie!</h2>
            <p className={styles.statusText}>
              Transfernya udah ke-detect, status udah auto approved. See you di
              lapangan minggu depan 🔥
            </p>
          </>
        ) : (
          <>
            <div className={styles.statusEmoji}>📨</div>
            <h2 className={styles.statusTitle}>Bukti sudah masuk!</h2>
            <p className={styles.statusText}>
              Bukti TF-mu udah ke-upload ya, tapi perlu konfirmasi manual sama
              admin dulu. Hubungi Afif, Ghafar, atau Ilham buat konfirmasi
              pembayarannya 🙏
            </p>
          </>
        )}
      </div>
    );
  }

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
        {submitting && <SubmittingOverlay funminton />}
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

        <div className={styles.totalBox}>
          <span className={styles.totalLabel}>Total Tagihan</span>
          <span className={styles.totalValue}>
            {formatCurrency(expectedTotal)}
          </span>
        </div>

        <QrisBox />

        <UploadField file={file} setFile={setFile} />

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
          disabled={submitting || selectedIds.length === 0 || !file}
          className={`btn btn--primary ${styles.submitBtn}`}
        >
          {submitting ? "Memproses..." : "Kirim Pembayaran"}
        </button>
      </form>
    </>
  );
}

// ── Padel: register + pay in one go ─────────────────────────────

function PadelJoin({ session }: { session: Session }) {
  const supabase = createClient();
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !file) {
      setErrorMsg("Isi nama dan upload bukti pembayaran.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      // 1. Compress then run OCR with Gemini
      const { base64, mimeType } = await compressImage(file);
      const ocrResult: OcrResult | null = await analyzePaymentProof(base64, mimeType);

      // 2. Padel requires nominal AND date to match before registering
      const expectedTotal = session.price_per_person;
      let isMatch = false;
      if (ocrResult && typeof ocrResult.nominal === "number") {
        const sessionDate = new Date(session.session_date);
        const ocrDate = ocrResult.tanggal ? new Date(ocrResult.tanggal) : null;
        let dateValid = false;
        if (ocrDate) {
          const diffTime = Math.abs(ocrDate.getTime() - sessionDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          dateValid = diffDays <= 1; // within 1 day
        }
        if (ocrResult.nominal === expectedTotal && dateValid) {
          isMatch = true;
        }
      }

      if (!isMatch) {
        throw new Error(
          "Bukti pembayaran tidak sesuai (Nominal/Tanggal). Silakan hubungi Pengurus (Afif, Ghafar, atau Ilham) untuk konfirmasi manual."
        );
      }

      // 3. Upload proof only when it matches
      const publicUrl = await uploadProof(file, session.id);

      // 4. Register via token-gated RPC (migration 007)
      const { error } = await supabase.rpc("join_moves_session", {
        p_token: session.token,
        p_name: formData.name,
        p_phone: formData.phone || null,
        p_payment_status: "approved",
        p_payment_amount: ocrResult?.nominal || expectedTotal,
        p_payment_date:
          ocrResult?.tanggal || new Date().toISOString().split("T")[0],
        p_payment_proof_url: publicUrl,
        p_ocr_raw: ocrResult,
        p_ocr_match: true,
      });
      if (error) throw new Error(error.message);

      setSuccess(true);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Terjadi kesalahan sistem."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className={styles.statusCard}>
        <div className={styles.statusEmoji}>🎾✅</div>
        <h2 className={styles.statusTitle}>Terima Kasih!</h2>
        <p className={styles.statusText}>
          Pendaftaran &amp; bukti pembayaran berhasil dikirim. Anda bisa
          menutup halaman ini.
        </p>
      </div>
    );
  }

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
        {submitting && <SubmittingOverlay funminton={false} />}
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

        <div className={styles.totalBox}>
          <span className={styles.totalLabel}>Biaya Pendaftaran</span>
          <span className={styles.totalValue}>
            {formatCurrency(session.price_per_person)}
          </span>
        </div>

        <QrisBox />

        <UploadField file={file} setFile={setFile} />

        <button
          type="submit"
          disabled={submitting || !file || !formData.name}
          className={`btn btn--primary ${styles.submitBtn}`}
        >
          {submitting ? "Memproses..." : "Daftar & Kirim Pembayaran"}
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
