"use client";

// Public registration form for WFC Bareng Strangers events (cafe collab).
// Static-export friendly: reads ?token=... (no dynamic route), wrapped in
// <Suspense> for useSearchParams. The form definition is built in the admin
// panel (Community → Form Event); RLS exposes only status='open' forms to
// anon. Answers are written via the SECURITY DEFINER RPC submit_form_response
// (migration 030) — the token is the capability; there is no direct anon
// INSERT on form_responses.

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import styles from "./register.module.css";

// Local mirror of the admin `Form` shape (types aren't shared across apps).
type FormQuestionType =
  | "short_text" | "paragraph" | "radio" | "checkbox"
  | "dropdown" | "email" | "phone" | "section";

interface FormQuestion {
  id: string;
  type: FormQuestionType;
  label: string;
  help?: string;
  required?: boolean;
  options?: string[];
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
}

type AnswerValue = string | string[];
type Answers = Record<string, AnswerValue>;

interface SubmitResult {
  whatsapp_group_url: string | null;
  whatsapp_group_label: string | null;
  success_message: string | null;
}

const isAnswerable = (t: FormQuestionType) => t !== "section";

// ── The form itself ─────────────────────────────────────────────
function FormRunner({ form }: { form: FormRow }) {
  const supabase = createClient();
  const [answers, setAnswers] = useState<Answers>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);

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
      setResult((data ?? {}) as SubmitResult);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Terjadi kesalahan sistem."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ──────────────────────────────────────────
  if (result) {
    const waUrl = result.whatsapp_group_url ?? form.whatsapp_group_url;
    const waLabel =
      result.whatsapp_group_label ?? form.whatsapp_group_label ?? "Klik Sini";
    const msg =
      result.success_message ??
      form.success_message ??
      "Makasih udah daftar! Undangan akan dikirim via WhatsApp ke peserta terpilih.";
    return (
      <div className={styles.statusCard}>
        <div className={styles.statusEmoji}>🎉</div>
        <h2 className={styles.statusTitle}>Pendaftaran terkirim!</h2>
        <p className={styles.statusText}>{msg}</p>
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`btn btn--primary ${styles.waButton}`}
          >
            {waLabel}
          </a>
        )}

        <div className={styles.accountBox}>
          <p className={styles.accountHint}>
            Biar makin update info event &amp; dapat promo member, bikin akun
            Semeja Kerja dulu yuk — gratis ✨
          </p>
          <Link href="/auth/register" className={`btn btn--secondary ${styles.accountButton}`}>
            Buat akun gratis
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>{form.title}</h1>
        {form.cafe_name && (
          <p className={styles.subtitle}>Kolaborasi dengan {form.cafe_name}</p>
        )}
      </div>

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

// ── Loader: fetch form by token ─────────────────────────────────
function RegisterContent() {
  const token = useSearchParams().get("token");
  const [form, setForm] = useState<FormRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!token) {
        setLoading(false);
        return;
      }
      const supabase = createClient();
      // RLS only exposes status='open' forms to anon (migration 030).
      const { data } = await supabase
        .from("forms")
        .select("*")
        .eq("token", token)
        .eq("status", "open")
        .maybeSingle();
      if (data) setForm(data as FormRow);
      setLoading(false);
    }
    load();
  }, [token]);

  if (loading) {
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

  return <FormRunner form={form} />;
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
