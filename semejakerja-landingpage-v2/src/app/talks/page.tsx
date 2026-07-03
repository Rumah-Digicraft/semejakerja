import type { Metadata } from "next";
import { Mic, ArrowRight, Lightbulb, Users, TrendingUp, Presentation } from "lucide-react";
import styles from "./talks.module.css";
import JsonLd from "../components/JsonLd";
import { breadcrumbSchema, webPageSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Semeja Talks",
  description:
    "Semeja Talks — seminar & workshop komunitas Semeja Kerja untuk scale up bareng. Belajar dari praktisi internal maupun narasumber dari luar komunitas.",
  alternates: { canonical: "/talks" },
  openGraph: { url: "/talks" },
};

const benefits = [
  {
    icon: <Lightbulb size={24} />,
    name: "Insight Baru",
    desc: "Topik relevan seputar karier, bisnis, produktivitas, dan skill yang lagi dibutuhkan — langsung dari yang sudah mempraktikkannya.",
  },
  {
    icon: <Users size={24} />,
    name: "Belajar & Networking",
    desc: "Bukan cuma nyimak. Sesi diskusi & tanya-jawab bikin kamu kenal orang baru dan buka peluang kolaborasi.",
  },
  {
    icon: <TrendingUp size={24} />,
    name: "Scale Up Bareng",
    desc: "Naik kelas bareng komunitas. Ilmu yang dibagikan bisa langsung kamu terapkan minggu itu juga.",
  },
];

const topics = [
  { emoji: "💼", name: "Karier & Personal Branding", desc: "Bangun personal branding dan portofolio yang dilirik." },
  { emoji: "🚀", name: "Bisnis & Freelance", desc: "Mulai dan skalakan side project jadi sumber income nyata." },
  { emoji: "🧠", name: "Produktivitas & Mindset", desc: "Atur waktu, fokus, dan energi biar WFC makin efektif." },
  { emoji: "🎨", name: "Skill & Tools", desc: "Workshop praktis: design, AI tools, coding, marketing, dll." },
];

export default function TalksPage() {
  return (
    <div className={styles.page}>
      <JsonLd
        data={webPageSchema({
          name: "Semeja Talks — Seminar & Workshop Komunitas",
          description:
            "Semeja Talks — seminar & workshop komunitas Semeja Kerja untuk scale up bareng, dari praktisi internal maupun narasumber luar.",
          path: "/talks",
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Semeja Kerja", path: "/" },
          { name: "Semeja Talks", path: "/talks" },
        ])}
      />
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={`container ${styles.heroContent}`}>
          <div className={styles.badge}>
            <Mic size={14} />
            Part of Semeja Kerja
          </div>
          <h1 className={styles.title}>
            Belajar bareng,
            <br />
            <span className={styles.highlight}>naik kelas bareng.</span>
          </h1>
          <p className={styles.subtitle}>
            Semeja Talks adalah seminar & workshop rutin komunitas Semeja Kerja.
            Ruang untuk berbagi ilmu, memberdayakan sesama, dan scale up bareng —
            diisi teman-teman komunitas maupun narasumber dari luar.
          </p>
        </div>
      </section>

      {/* Why Section */}
      <section className={styles.whySection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Kenapa Ikut Semeja Talks?</h2>
          <div className={styles.whyGrid}>
            {benefits.map((b) => (
              <div key={b.name} className={styles.whyCard}>
                <div className={styles.whyIcon}>{b.icon}</div>
                <h3 className={styles.whyName}>{b.name}</h3>
                <p className={styles.whyDesc}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Format Section */}
      <section className={styles.formatSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Bagaimana Formatnya?</h2>
          <p className={styles.sectionSubtitle}>
            Santai tapi berisi — dirancang biar semua orang bisa ikut dan langsung dapat manfaat.
          </p>
          <div className={styles.formatGrid}>
            <div className={styles.formatCard}>
              <span className={styles.formatStep}>01</span>
              <h3 className={styles.formatName}>Sharing Session</h3>
              <p className={styles.formatDesc}>
                Narasumber membagikan pengalaman & materi inti secara ringkas dan aplikatif.
              </p>
            </div>
            <div className={styles.formatCard}>
              <span className={styles.formatStep}>02</span>
              <h3 className={styles.formatName}>Diskusi & Tanya-Jawab</h3>
              <p className={styles.formatDesc}>
                Ruang terbuka untuk bertanya, berdiskusi, dan menggali lebih dalam bareng peserta lain.
              </p>
            </div>
            <div className={styles.formatCard}>
              <span className={styles.formatStep}>03</span>
              <h3 className={styles.formatName}>Actionable Takeaway</h3>
              <p className={styles.formatDesc}>
                Setiap sesi ditutup dengan poin-poin yang bisa langsung kamu praktikkan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Topics Section */}
      <section className={styles.topicsSection}>
        <div className="container">
          <div className={styles.topicsHeader}>
            <Presentation size={20} />
            <h2 className={styles.sectionTitle}>Contoh Tema</h2>
          </div>
          <p className={styles.sectionSubtitle}>
            Tema berganti tiap sesi mengikuti kebutuhan teman-teman komunitas.
          </p>
          <div className={styles.topicsGrid}>
            {topics.map((t) => (
              <div key={t.name} className={styles.topicCard}>
                <span className={styles.topicEmoji}>{t.emoji}</span>
                <div>
                  <h3 className={styles.topicName}>{t.name}</h3>
                  <p className={styles.topicDesc}>{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaBg} />
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <h2 className={styles.ctaTitle}>Punya ilmu yang mau dibagi?</h2>
          <p className={styles.ctaDesc}>
            Jadi narasumber atau ikut sesi berikutnya — info jadwal & pendaftaran tiap sesi
            kami umumkan lewat sosial media.
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
