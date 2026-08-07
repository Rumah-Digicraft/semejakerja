"use client";

// Public registration form for WFC Bareng Strangers events (cafe collab).
// Static-export friendly: reads ?token=... (no dynamic route), wrapped in
// <Suspense> for useSearchParams. The form definition is built in the admin
// panel (Community → Form Event); RLS exposes only status='open' forms to
// anon. Answers are written via the SECURITY DEFINER RPC submit_form_response
// (migration 030/034) — the token is the capability; there is no direct anon
// INSERT on form_responses.
//
// One response row per (form, user) — migration 034. A logged-in user who
// already has an active row (pending/registered) sees their status instead
// of the form, and can cancel via the cancel_form_response RPC. Cancelled/
// rejected rows can be resubmitted (same row gets reused server-side).

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import OAuthButtons from "../../auth/OAuthButtons";
import styles from "./register.module.css";

// Local mirror of the admin `Form` shape (types aren't shared across apps).
type FormQuestionType =
  | "short_text" | "paragraph" | "radio" | "checkbox"
  | "dropdown" | "email" | "phone" | "section";

// Field user_profiles yang bisa disinkron dua arah (autofill + write-back).
type ProfileField = "full_name" | "nickname" | "occupation" | "city" | "phone";
type ProfileData = Record<ProfileField, string | null>;

interface FormQuestion {
  id: string;
  type: FormQuestionType;
  label: string;
  help?: string;
  required?: boolean;
  options?: string[];
  profile_field?: ProfileField;
}

interface FormRow {
  id: string;
  title: string;
  description: string | null;
  cafe_name: string | null;
  questions: FormQuestion[];
  quota: number | null;
  whatsapp_group_url: string | null;
  whatsapp_group_label: string | null;
  success_message: string | null;
  status: string;
  token: string;
  requires_approval: boolean;
}

type AnswerValue = string | string[];
type Answers = Record<string, AnswerValue>;

// Mirrors form_responses.status (migration 034).
type FormResponseStatus = "pending" | "registered" | "cancelled" | "rejected";

interface MyResponse {
  id: string;
  status: FormResponseStatus;
}

interface SubmitResult {
  response_id: string;
  status: FormResponseStatus;
  whatsapp_group_url: string | null;
  whatsapp_group_label: string | null;
  success_message: string | null;
}

const isAnswerable = (t: FormQuestionType) => t !== "section";

// Satu kalimat ringkas, bukan 2 baris info terpisah — "ditolak" udah
// nyiratin event-nya approval-gated, jadi nggak perlu diulang lagi.
function noticeText(
  previousStatus: "cancelled" | "rejected" | null,
  requiresApproval: boolean
): string | null {
  if (previousStatus === "rejected") {
    return "Pendaftaran kamu sebelumnya ditolak admin — isi ulang di bawah buat coba lagi.";
  }
  if (previousStatus === "cancelled") {
    return requiresApproval
      ? "Kamu sebelumnya cancel — isi ulang di bawah kalau mau daftar lagi. Event ini butuh approval admin dulu ya."
      : "Kamu sebelumnya cancel — isi ulang di bawah kalau mau daftar lagi.";
  }
  if (requiresApproval) {
    return "Event ini butuh approval admin dulu sebelum kamu resmi jadi peserta.";
  }
  return null;
}

// ── The form itself ─────────────────────────────────────────────
function FormRunner({
  form,
  userId,
  userEmail,
  profile,
  previousStatus,
  onSubmitted,
}: {
  form: FormRow;
  userId: string | null;
  userEmail: string | null;
  profile: ProfileData | null;
  // Set kalau user pernah punya baris respons yang cancelled/rejected —
  // dipakai buat banner "isi ulang untuk daftar lagi".
  previousStatus: "cancelled" | "rejected" | null;
  onSubmitted: (result: SubmitResult) => void;
}) {
  const supabase = createClient();
  // Autofill: email dari Google + field yang ditandai profile_field dari
  // user_profiles (kalau datanya sudah ada). Kalau kosong, user isi manual.
  const [answers, setAnswers] = useState<Answers>(() => {
    const init: Answers = {};
    for (const q of form.questions) {
      if (q.type === "email" && userEmail) init[q.id] = userEmail;
      if (q.profile_field && profile) {
        const v = profile[q.profile_field];
        if (v) init[q.id] = v;
      }
    }
    return init;
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const setAnswer = (qid: string, val: AnswerValue) =>
    setAnswers((a) => ({ ...a, [qid]: val }));

  const toggleCheckbox = (qid: string, opt: string) =>
    setAnswers((a) => {
      const cur = Array.isArray(a[qid]) ? (a[qid] as string[]) : [];
      return {
        ...a,
        [qid]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt],
      };
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // Client-side required validation (server only guards status + quota).
    for (const q of form.questions.filter((x) => isAnswerable(x.type))) {
      if (!q.required) continue;
      const v = answers[q.id];
      const empty =
        v == null || (Array.isArray(v) ? v.length === 0 : String(v).trim() === "");
      if (empty) {
        setErrorMsg(`"${q.label || "Pertanyaan"}" wajib diisi ya.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("submit_form_response", {
        p_token: form.token,
        p_answers: answers,
      });
      if (error) throw new Error(error.message);

      // Write-back ke profil: simpan jawaban ber-profile_field ke user_profiles
      // biar user nggak perlu isi ulang di Dashboard kalau ikut WFC lagi.
      // Best-effort — kegagalan di sini tidak membatalkan pendaftaran.
      if (userId) {
        const patch: Partial<Record<ProfileField, string>> = {};
        for (const q of form.questions) {
          if (!q.profile_field) continue;
          const v = answers[q.id];
          if (typeof v === "string" && v.trim()) patch[q.profile_field] = v.trim();
        }
        if (Object.keys(patch).length > 0) {
          await supabase
            .from("user_profiles")
            .upsert({ id: userId, ...patch }, { onConflict: "id" });
        }
      }

      onSubmitted(data as SubmitResult);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Terjadi kesalahan sistem."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>{form.title}</h1>
        {form.cafe_name && (
          <p className={styles.subtitle}>Kolaborasi dengan {form.cafe_name}</p>
        )}
      </div>

      {noticeText(previousStatus, form.requires_approval) && (
        <div className={styles.notice}>
          <p>{noticeText(previousStatus, form.requires_approval)}</p>
        </div>
      )}

      {form.description && (
        <div className={styles.description}>{form.description}</div>
      )}

      <form onSubmit={handleSubmit} className={styles.card}>
        {form.questions.map((q) => {
          if (q.type === "section") {
            return (
              <div key={q.id} className={styles.sectionBox}>
                {q.label && <p className={styles.sectionTitle}>{q.label}</p>}
                {q.help && <p className={styles.sectionBody}>{q.help}</p>}
              </div>
            );
          }

          const value = answers[q.id];
          return (
            <div key={q.id} className={styles.field}>
              <label className={styles.label}>
                {q.label}
                {q.required && <span className={styles.required}> *</span>}
              </label>
              {q.help && <p className={styles.help}>{q.help}</p>}

              {(q.type === "short_text" ||
                q.type === "email" ||
                q.type === "phone") && (
                <input
                  className={styles.input}
                  type={q.type === "email" ? "email" : q.type === "phone" ? "tel" : "text"}
                  inputMode={q.type === "phone" ? "tel" : undefined}
                  value={typeof value === "string" ? value : ""}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                />
              )}

              {q.type === "paragraph" && (
                <textarea
                  className={styles.textarea}
                  rows={3}
                  value={typeof value === "string" ? value : ""}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                />
              )}

              {q.type === "dropdown" && (
                <select
                  className={styles.input}
                  value={typeof value === "string" ? value : ""}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                >
                  <option value="">— Pilih —</option>
                  {(q.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              {q.type === "radio" && (
                <div className={styles.optionList}>
                  {(q.options ?? []).map((opt) => (
                    <label
                      key={opt}
                      className={`${styles.optionItem} ${
                        value === opt ? styles.optionSelected : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={value === opt}
                        onChange={() => setAnswer(q.id, opt)}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === "checkbox" && (
                <div className={styles.optionList}>
                  {(q.options ?? []).map((opt) => {
                    const arr = Array.isArray(value) ? value : [];
                    return (
                      <label
                        key={opt}
                        className={`${styles.optionItem} ${
                          arr.includes(opt) ? styles.optionSelected : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={arr.includes(opt)}
                          onChange={() => toggleCheckbox(q.id, opt)}
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {errorMsg && <div className={styles.errorBox}>{errorMsg}</div>}

        <button
          type="submit"
          disabled={submitting}
          className={`btn btn--primary ${styles.submitBtn}`}
        >
          {submitting ? "Mengirim..." : "Kirim Pendaftaran"}
        </button>
      </form>
    </>
  );
}

// ── Gate login: form wajib login Google dulu ────────────────────
function LoginGate({ form, token }: { form: FormRow; token: string }) {
  const next = `/wfc/register?token=${token}`;
  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>{form.title}</h1>
        {form.cafe_name && (
          <p className={styles.subtitle}>Kolaborasi dengan {form.cafe_name}</p>
        )}
      </div>
      <div className={styles.gateCard}>
        <div className={styles.gateEmoji}>🔒</div>
        <h2 className={styles.gateTitle}>Login dulu buat daftar</h2>
        <p className={styles.gateText}>
          Pendaftaran event ini pakai akun Semeja Kerja (gratis). Login pakai
          Google dulu ya, nanti langsung lanjut isi formnya.
        </p>
        <div className={styles.gateAuth}>
          <OAuthButtons next={next} />
        </div>
      </div>
    </>
  );
}

// ── Status pendaftaran: user sudah punya baris pending/registered ──
function RegistrationStatus({
  form,
  status,
  onCancel,
  cancelling,
  cancelError,
}: {
  form: FormRow;
  status: "pending" | "registered";
  onCancel: () => void;
  cancelling: boolean;
  cancelError: string;
}) {
  const isPending = status === "pending";
  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>{form.title}</h1>
        {form.cafe_name && (
          <p className={styles.subtitle}>Kolaborasi dengan {form.cafe_name}</p>
        )}
      </div>
      <div className={styles.statusCard}>
        <div className={styles.statusEmoji}>{isPending ? "⏳" : "🎉"}</div>
        <h2 className={styles.statusTitle}>
          {isPending ? "Menunggu approval admin" : "Kamu terdaftar!"}
        </h2>
        <p className={styles.statusText}>
          {isPending
            ? "Pendaftaran kamu masuk antrian. Admin akan meninjau dan mengabari via WhatsApp begitu di-approve."
            : form.success_message ??
              "Makasih udah daftar! Undangan akan dikirim via WhatsApp ke peserta terpilih."}
        </p>
        {form.whatsapp_group_url && (
          <a
            href={form.whatsapp_group_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`btn btn--primary ${styles.waButton}`}
          >
            {form.whatsapp_group_label ?? "Klik Sini"}
          </a>
        )}

        <div className={styles.accountBox}>
          <p className={styles.accountHint}>
            Sekalian aktifin membership Semeja Kerja buat benefit diskon di cafe
            partner &amp; akses Semeja Moves 👀
          </p>
          <Link href="/membership" className={`btn btn--secondary ${styles.accountButton}`}>
            Lihat membership
          </Link>
        </div>

        <div className={styles.cancelSection}>
          {cancelError && (
            <div className={styles.errorBox} style={{ marginBottom: "var(--space-3)", width: "100%" }}>
              {cancelError}
            </div>
          )}
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelling}
            className={styles.cancelButton}
          >
            {cancelling ? "Membatalkan..." : "Batalkan pendaftaran"}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Loader: cek sesi + ambil form by token ──────────────────────
function RegisterContent() {
  const token = useSearchParams().get("token");
  const [form, setForm] = useState<FormRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [authState, setAuthState] = useState<"loading" | "in" | "out">("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [myResponse, setMyResponse] = useState<MyResponse | null>(null);
  const [myResponseReady, setMyResponseReady] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    // Resolve sesi + (kalau login) ambil profil buat autofill.
    async function resolveAuth(
      session: { user: { id: string; email?: string } } | null
    ) {
      if (!session) {
        if (active) {
          setAuthState("out");
          setUserId(null);
          setUserEmail(null);
          setProfileReady(true);
          setMyResponseReady(true);
        }
        return;
      }
      if (active) {
        setAuthState("in");
        setUserId(session.user.id);
        setUserEmail(session.user.email ?? null);
      }
      const { data: prof } = await supabase
        .from("user_profiles")
        .select("full_name, nickname, occupation, city, phone")
        .eq("id", session.user.id)
        .maybeSingle();
      if (active) {
        setProfile((prof as ProfileData | null) ?? null);
        setProfileReady(true);
      }
    }

    supabase.auth.getSession().then(({ data }) => resolveAuth(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => resolveAuth(session));

    // Form: RLS hanya expose form status='open' ke publik (migration 030).
    async function loadForm() {
      if (!token) {
        if (active) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("forms")
        .select("*")
        .eq("token", token)
        .eq("status", "open")
        .maybeSingle();
      if (active) {
        if (data) setForm(data as FormRow);
        setLoading(false);
      }
    }
    loadForm();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [token]);

  // Baris respons milik user sendiri (migration 034) — baru bisa dicek
  // begitu form & sesi user sudah resolve. RLS "Users read own form
  // response" membatasi query ini ke baris user_id = auth.uid() sendiri.
  useEffect(() => {
    if (!form?.id || !userId) return;
    let active = true;
    // Defer a frame so setMyResponseReady(false) isn't a sync setState in
    // the effect body (react-hooks/set-state-in-effect) — same pattern as
    // admin's forms/[id]/page.tsx load().
    const raf = requestAnimationFrame(() => {
      setMyResponseReady(false);
      createClient()
        .from("form_responses")
        .select("id, status")
        .eq("form_id", form.id)
        .eq("user_id", userId)
        .maybeSingle()
        .then(({ data }) => {
          if (active) {
            setMyResponse((data as MyResponse | null) ?? null);
            setMyResponseReady(true);
          }
        });
    });
    return () => {
      active = false;
      cancelAnimationFrame(raf);
    };
  }, [form?.id, userId]);

  const handleCancel = async () => {
    if (!token) return;
    if (!confirm("Batalkan pendaftaran kamu di event ini?")) return;
    setCancelling(true);
    setCancelError("");
    const { error } = await createClient().rpc("cancel_form_response", {
      p_token: token,
    });
    setCancelling(false);
    if (error) {
      setCancelError(error.message);
      return;
    }
    setMyResponse((r) => (r ? { ...r, status: "cancelled" } : r));
  };

  if (loading || !profileReady || (authState === "in" && form && !myResponseReady)) {
    return (
      <div className={styles.loadingWrap}>
        <Loader2 size={32} className={styles.spinner} />
      </div>
    );
  }

  if (!form) {
    return (
      <div className={styles.statusCard}>
        <div className={styles.statusEmoji}>🔍</div>
        <h2 className={styles.statusTitle}>Form tidak ditemukan</h2>
        <p className={styles.statusText}>
          Link tidak valid atau pendaftaran sudah ditutup. Cek lagi link yang
          dibagikan panitia ya!
        </p>
      </div>
    );
  }

  // Wajib login Google dulu sebelum bisa buka/isi form.
  if (authState === "out") {
    return <LoginGate form={form} token={token ?? ""} />;
  }

  // Sudah punya baris aktif (pending/registered) → tampilkan status +
  // opsi batalkan, bukan form kosong lagi (satu user cuma 1x submit).
  if (myResponse && (myResponse.status === "registered" || myResponse.status === "pending")) {
    return (
      <RegistrationStatus
        form={form}
        status={myResponse.status}
        onCancel={handleCancel}
        cancelling={cancelling}
        cancelError={cancelError}
      />
    );
  }

  return (
    <FormRunner
      form={form}
      userId={userId}
      userEmail={userEmail}
      profile={profile}
      previousStatus={
        myResponse?.status === "cancelled" || myResponse?.status === "rejected"
          ? myResponse.status
          : null
      }
      onSubmitted={(result) =>
        setMyResponse({ id: result.response_id, status: result.status })
      }
    />
  );
}

export default function WfcRegisterPage() {
  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <Suspense
          fallback={
            <div className={styles.loadingWrap}>
              <Loader2 size={32} className={styles.spinner} />
            </div>
          }
        >
          <RegisterContent />
        </Suspense>
      </div>
    </div>
  );
}
