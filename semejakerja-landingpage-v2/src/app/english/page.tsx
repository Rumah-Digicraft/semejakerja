import type { Metadata } from "next";
import {
  MessageCircle,
  ArrowRight,
  Calendar,
  Clock,
  Users,
  Globe,
  Mic,
  Brain,
  Gamepad2,
  Sparkles,
} from "lucide-react";
import styles from "./english.module.css";
import JsonLd from "../components/JsonLd";
import { breadcrumbSchema, webPageSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Semeja English",
  description:
    "Semeja English — klub belajar Bahasa Inggris mingguan komunitas Semeja Kerja. Diskusi, debat, dan games tiap Sabtu. Santai, suportif, dan bebas takut salah.",
  alternates: { canonical: "/english" },
  openGraph: { url: "/english" },
};

const quickInfo = [
  { icon: <Calendar size={20} />, label: "Setiap Sabtu", sub: "Rutin tiap minggu" },
  { icon: <Clock size={20} />, label: "120 menit", sub: "Per sesi" },
  { icon: <Users size={20} />, label: "6–15 orang", sub: "Maksimal 10 per aktivitas" },
  { icon: <Globe size={20} />, label: "Mixed level", sub: "Campur ID + English" },
];

const goals = [
  { icon: <Mic size={22} />, name: "Speaking Confidence", desc: "Berani ngomong dalam suasana suportif dan bebas dari rasa takut salah." },
  { icon: <Sparkles size={22} />, name: "Vocabulary & Idiom", desc: "Perkaya kosakata dan idiom — bukan cuma dikenali, tapi benar-benar dipakai." },
  { icon: <Brain size={22} />, name: "Critical Thinking", desc: "Latih menyusun argumen dan berpikir kritis lewat sesi debat." },
  { icon: <Gamepad2 size={22} />, name: "Fun Learning", desc: "Belajar English jadi menyenangkan lewat games yang edukatif." },
];

const models = [
  {
    emoji: "💬",
    name: "Diskusi Bebas",
    tag: "Free Discussion",
    desc: "Satu topik utama dengan pertanyaan pemandu, dibahas dalam kelompok kecil dipimpin table leader.",
    example: "Contoh topik: \"Social Media in Our Daily Life\"",
  },
  {
    emoji: "⚖️",
    name: "Debat",
    tag: "Simplified Parliamentary",
    desc: "Dua tim Pro vs Kontra beradu argumen dengan alur opening, rebuttal, cross-fire, dan closing.",
    example: "Contoh motion: \"Remote work is better than office work\"",
  },
  {
    emoji: "🎲",
    name: "Games",
    tag: "Language Games",
    desc: "2–3 permainan seru per sesi untuk melatih spontanitas berbahasa.",
    example: "Word Association • Taboo • Just A Minute • Storytelling Chain",
  },
];

const rules = [
  "English Only — kecuali pakai \"life line\" (maks 2x per orang per sesi)",
  "No judging — salah grammar itu wajar, fokusnya keberanian bicara",
  "Semua wajib bicara minimal sekali per sesi",
  "Respect turn-taking — kecuali di sesi cross-fire/challenge",
  "HP disimpan selama sesi, kecuali untuk kebutuhan game",
];

export default function EnglishPage() {
  return (
    <div className={styles.page}>
      <JsonLd
        data={webPageSchema({
          name: "Semeja English — Klub Belajar Bahasa Inggris",
          description:
            "Semeja English — klub belajar Bahasa Inggris mingguan komunitas Semeja Kerja. Diskusi, debat, dan games tiap Sabtu.",
          path: "/english",
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Semeja Kerja", path: "/" },
          { name: "Semeja English", path: "/english" },
        ])}
      />
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={`container ${styles.heroContent}`}>
          <div className={styles.badge}>
            <MessageCircle size={14} />
            Part of Semeja Kerja
          </div>
          <h1 className={styles.title}>
            Improve English,
            <br />
            <span className={styles.highlight}>tanpa takut salah.</span>
          </h1>
          <p className={styles.subtitle}>
            Semeja English adalah wadah latihan Bahasa Inggris mingguan yang santai tapi
            terstruktur — buat kamu yang pengin improve tapi malu atau takut dibilang
            &apos;sok Inggris&apos;. Di sini, semua orang belajar bareng.
          </p>
        </div>
      </section>

      {/* Quick info */}
      <section className={styles.infoSection}>
        <div className="container">
          <div className={styles.infoGrid}>
            {quickInfo.map((info) => (
              <div key={info.label} className={styles.infoCard}>
                <div className={styles.infoIcon}>{info.icon}</div>
                <div>
                  <p className={styles.infoLabel}>{info.label}</p>
                  <p className={styles.infoSub}>{info.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Goals */}
      <section className={styles.goalsSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Apa yang Kamu Dapat?</h2>
          <p className={styles.sectionSubtitle}>
            Empat hal utama yang jadi tujuan tiap sesi Semeja English.
          </p>
          <div className={styles.goalsGrid}>
            {goals.map((g) => (
              <div key={g.name} className={styles.goalCard}>
                <div className={styles.goalIcon}>{g.icon}</div>
                <h3 className={styles.goalName}>{g.name}</h3>
                <p className={styles.goalDesc}>{g.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Models */}
      <section className={styles.modelsSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>3 Model Aktivitas</h2>
          <p className={styles.sectionSubtitle}>
            Dirotasi tiap minggu biar nggak bosan dan tiap skill kebagian porsi.
          </p>
          <div className={styles.modelsGrid}>
            {models.map((m) => (
              <div key={m.name} className={styles.modelCard}>
                <span className={styles.modelEmoji}>{m.emoji}</span>
                <div className={styles.modelHead}>
                  <h3 className={styles.modelName}>{m.name}</h3>
                  <span className={styles.modelTag}>{m.tag}</span>
                </div>
                <p className={styles.modelDesc}>{m.desc}</p>
                <p className={styles.modelExample}>{m.example}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ground rules */}
      <section className={styles.rulesSection}>
        <div className="container">
          <div className={styles.rulesCard}>
            <h2 className={styles.rulesTitle}>Ground Rules</h2>
            <ul className={styles.rulesList}>
              {rules.map((r, i) => (
                <li key={i} className={styles.ruleItem}>
                  <span className={styles.ruleNum}>{i + 1}</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaBg} />
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <h2 className={styles.ctaTitle}>Ready to speak up?</h2>
          <p className={styles.ctaDesc}>
            Slot terbatas tiap sesi. Info jadwal & pendaftaran kami umumkan lewat sosial media —
            bring your energy and your English brain!
          </p>
          <div className={styles.ctaActions}>
            <a
              href="https://instagram.com/semejakerja"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--primary btn--large"
            >
              Follow untuk Update
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
