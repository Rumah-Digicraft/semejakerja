import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ScrollReveal from "./ScrollReveal";
import styles from "./ActivitiesGrid.module.css";

const activities = [
  {
    href: "/moves",
    emoji: "🎾",
    name: "Semeja Moves",
    desc: "Olahraga bareng pelepas penat setelah seminggu WFC — padel & badminton tiap weekend.",
  },
  {
    href: "/talks",
    emoji: "🎤",
    name: "Semeja Talks",
    desc: "Seminar & workshop untuk scale up bareng — diisi teman komunitas maupun narasumber dari luar.",
  },
  {
    href: "/english",
    emoji: "💬",
    name: "Semeja English",
    desc: "Wadah latihan English mingguan yang santai, buat kamu yang mau improve tanpa takut dibilang 'sok Inggris'.",
  },
];

export default function ActivitiesGrid() {
  return (
    <section className={styles.section}>
      <div className="container">
        <ScrollReveal>
          <div className={styles.header}>
            <p className={styles.label}>Part of Semeja Kerja</p>
            <h2 className={styles.title}>
              Bukan cuma kerja, <span className={styles.highlight}>tapi tumbuh bareng.</span>
            </h2>
            <p className={styles.subtitle}>
              Selain WFC bareng orang baru, komunitas Semeja Kerja punya tiga agenda rutin
              untuk gerak, belajar, dan naik kelas bareng-bareng.
            </p>
          </div>
        </ScrollReveal>

        <div className={styles.grid}>
          {activities.map((item, i) => (
            <ScrollReveal key={item.href} delay={i * 100}>
              <Link href={item.href} className={styles.card}>
                <span className={styles.cardEmoji}>{item.emoji}</span>
                <h3 className={styles.cardName}>{item.name}</h3>
                <p className={styles.cardDesc}>{item.desc}</p>
                <span className={styles.cardLink}>
                  Selengkapnya <ArrowRight size={16} />
                </span>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
