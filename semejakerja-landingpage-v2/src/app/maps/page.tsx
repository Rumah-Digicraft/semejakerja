import type { Metadata } from "next";
import Image from "next/image";
import {
  MapPin, ExternalLink, Coffee, Wifi, Clock, Target, Users, Moon, Zap, ArrowDown,
} from "lucide-react";
import styles from "./maps.module.css";
import OpenNowStrip from "./OpenNowStrip";
import ScrollReveal from "../components/ScrollReveal";
import JsonLd from "../components/JsonLd";
import { breadcrumbSchema, webPageSchema } from "@/lib/schema";
import { MAPS_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Maps Kafe",
  description:
    "Temukan cafe WFC terbaik di Purwokerto. Lihat cafe yang buka sekarang, filter fasilitas, Wi-Fi, jam buka, dan rating — langsung dari peta interaktif komunitas Semeja Kerja.",
  alternates: { canonical: "/maps" },
  openGraph: { url: "/maps" },
};

const basecamps = [
  { name: "Duanja", logo: "/images/kafe/duanja.png" },
  { name: "The Soeds", logo: "/images/kafe/the-soeds.png" },
  { name: "Meatboss", logo: "/images/kafe/meatboss.png" },
  { name: "Ruang Temu", logo: "/images/kafe/ruang-temu.png" },
  { name: "At Nine", logo: "/images/kafe/atnine.png" },
];

const moods = [
  { icon: Target, name: "Fokus", desc: "Sunyi, colokan di mana-mana" },
  { icon: Coffee, name: "Santai", desc: "Kopi enak, suasana adem" },
  { icon: Users, name: "Rame-rame", desc: "Meeting tim, ngumpul bareng" },
  { icon: Moon, name: "Buka Malam", desc: "Lembur sampai larut" },
  { icon: Zap, name: "Wi-Fi Kencang", desc: "Upload & download lancar" },
  { icon: Clock, name: "24 Jam", desc: "Kapan pun kamu butuh" },
];

const features = [
  {
    icon: Coffee,
    name: "350+ Ruang Kopi",
    desc: "Database cafe terlengkap di Purwokerto, di-review langsung oleh member komunitas.",
  },
  {
    icon: Wifi,
    name: "Info Fasilitas",
    desc: "Filter berdasarkan Wi-Fi, colokan, mushola, parkir, dan suasana ramai/tenang.",
  },
  {
    icon: Clock,
    name: "Status Buka Real-time",
    desc: "Lihat cafe yang buka sekarang atau buka malam. Nggak perlu kecewa datang pas tutup.",
  },
];

export default function MapsPage() {
  return (
    <div className={styles.page}>
      <JsonLd
        data={webPageSchema({
          name: "Peta Cafe WFC Purwokerto",
          description:
            "Peta interaktif 350+ cafe untuk WFC di Purwokerto: cafe yang buka sekarang, fasilitas, Wi-Fi, jam buka, dan rating dari komunitas Semeja Kerja.",
          path: "/maps",
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Semeja Kerja", path: "/" },
          { name: "Maps Kafe", path: "/maps" },
        ])}
      />

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={`container ${styles.heroContent}`}>
          <div className={styles.badge}>
            <MapPin size={14} />
            350+ ruang kopi WFC · Purwokerto
          </div>
          <h1 className={styles.title}>
            Cafe WFC Purwokerto
            <span className={styles.highlight}> Temukan Ruang Kerjamu</span>
          </h1>
          <p className={styles.subtitle}>
            Dari kedai sudut gang sampai roastery pinggir sawah — jelajahi ratusan
            ruang kopi yang siap jadi kantor keduamu hari ini.
          </p>

          <div className={styles.ctaRow}>
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--primary btn--large"
            >
              Buka Peta Interaktif
              <ExternalLink size={18} />
            </a>
            <a href="#buka-sekarang" className={styles.ctaSecondary}>
              atau lihat yang buka sekarang
              <ArrowDown size={16} />
            </a>
          </div>

          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <span className={styles.statNum}>350+</span>
              <span className={styles.statLabel}>ruang kopi</span>
            </div>
            <span className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>Real-time</span>
              <span className={styles.statLabel}>status buka</span>
            </div>
            <span className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>Update</span>
              <span className={styles.statLabel}>tiap hari</span>
            </div>
          </div>
        </div>
      </section>

      {/* Buka Sekarang — live from Supabase */}
      <OpenNowStrip />

      {/* Mood */}
      <section className={styles.moodSection}>
        <div className="container">
          <div className={styles.moodHead}>
            <h2 className={styles.sectionTitle}>Lagi pengen kerja kayak gimana?</h2>
            <p className={styles.sectionSubtitle}>
              Pilih mood kamu, langsung cari tempat yang pas di peta interaktif.
            </p>
          </div>
          <div className={styles.moodGrid}>
            {moods.map((mood, i) => (
              <ScrollReveal key={mood.name} delay={i * 60}>
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.moodCard}
                >
                  <span className={styles.moodIcon}>
                    <mood.icon size={22} />
                  </span>
                  <span className={styles.moodName}>{mood.name}</span>
                  <span className={styles.moodDesc}>{mood.desc}</span>
                </a>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className="container">
          <div className={styles.featureGrid}>
            {features.map((f) => (
              <div key={f.name} className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <f.icon size={28} />
                </div>
                <h3 className={styles.featureName}>{f.name}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Basecamp cafes */}
      <section className={styles.partners}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Basecamp resmi komunitas</h2>
          <p className={styles.sectionSubtitle}>
            Cafe-cafe ini sudah jadi markas Semeja Kerja — tempat kita ngumpul dan WFC bareng.
          </p>
          <div className={styles.cafeGrid}>
            {basecamps.map((cafe) => (
              <div key={cafe.name} className={styles.cafeCard}>
                <Image
                  src={cafe.logo}
                  alt={`Logo ${cafe.name}`}
                  width={150}
                  height={80}
                  className={styles.cafeLogo}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.finalCta}>
        <div className={styles.finalOverlay} />
        <div className={`container ${styles.finalContent}`}>
          <span className={styles.finalMark}>
            <Coffee size={26} />
          </span>
          <h2 className={styles.finalTitle}>Jelajahi Purwokerto lewat kopi.</h2>
          <p className={styles.finalSubtitle}>
            Ratusan ruang kopi buat kerja, ngobrol, atau sekadar cari suasana baru —
            semua ada di satu peta.
          </p>
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--primary btn--large"
          >
            Buka Peta Interaktif
            <ExternalLink size={18} />
          </a>
        </div>
      </section>
    </div>
  );
}
