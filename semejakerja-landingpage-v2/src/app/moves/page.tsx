import type { Metadata } from "next";
import { Dumbbell, ArrowRight, Calendar, Users, Heart, Zap } from "lucide-react";
import styles from "./moves.module.css";

export const metadata: Metadata = {
  title: "Semeja Moves",
  description:
    "Semeja Moves — olahraga bareng komunitas Semeja Kerja. Badminton & Padel tiap weekend di Purwokerto. Lepas penat, sehat bareng!",
};

export default function MovesPage() {
  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={`container ${styles.heroContent}`}>
          <div className={styles.badge}>
            <Dumbbell size={14} />
            Part of Semeja Kerja
          </div>
          <h1 className={styles.title}>
            Kerja keras,
            <br />
            <span className={styles.highlight}>main lebih keras.</span>
          </h1>
          <p className={styles.subtitle}>
            Semeja Moves hadir untuk teman-teman komunitas yang butuh stress release.
            Olahraga bareng, bukan cuma sehat — tapi juga seru dan bikin makin akrab.
          </p>
        </div>
      </section>

      {/* Why Section */}
      <section className={styles.whySection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Kenapa Semeja Moves?</h2>
          <div className={styles.whyGrid}>
            <div className={styles.whyCard}>
              <div className={styles.whyIcon}>
                <Heart size={24} />
              </div>
              <h3 className={styles.whyName}>Stress Release</h3>
              <p className={styles.whyDesc}>
                Lepas penat setelah WFC marathon sepanjang minggu. Tubuh sehat, pikiran fresh.
              </p>
            </div>
            <div className={styles.whyCard}>
              <div className={styles.whyIcon}>
                <Users size={24} />
              </div>
              <h3 className={styles.whyName}>Bonding Komunitas</h3>
              <p className={styles.whyDesc}>
                Kenal lebih dekat dengan member Semeja Kerja di luar konteks kerja. Beda vibes, beda seru.
              </p>
            </div>
            <div className={styles.whyCard}>
              <div className={styles.whyIcon}>
                <Zap size={24} />
              </div>
              <h3 className={styles.whyName}>Energi Baru</h3>
              <p className={styles.whyDesc}>
                Mulai minggu baru dengan semangat baru. Olahraga weekend = produktivitas weekday naik.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sports */}
      <section className={styles.sportsSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Cabang Olahraga</h2>
          <p className={styles.sectionSubtitle}>Pilih yang paling kamu suka — atau ikut dua-duanya!</p>

          <div className={styles.sportsGrid}>
            {/* Badminton */}
            <div className={styles.sportCard}>
              <div className={styles.sportHeader}>
                <span className={styles.sportEmoji}>🏸</span>
                <div>
                  <h3 className={styles.sportName}>Badminton</h3>
                  <p className={styles.sportAka}>a.k.a Funminton</p>
                </div>
              </div>
              <p className={styles.sportDesc}>
                Badminton santai tanpa tekanan. Main, ketawa, keringetan bareng.
                Nggak perlu jago — yang penting happy.
              </p>
              <div className={styles.sportMeta}>
                <div className={styles.sportMetaItem}>
                  <Calendar size={16} />
                  <span>Tiap Weekend</span>
                </div>
                <div className={styles.sportMetaItem}>
                  <Users size={16} />
                  <span>Terbuka untuk semua level</span>
                </div>
              </div>
            </div>

            {/* Padel */}
            <div className={styles.sportCard}>
              <div className={styles.sportHeader}>
                <span className={styles.sportEmoji}>🎾</span>
                <div>
                  <h3 className={styles.sportName}>Padel</h3>
                  <p className={styles.sportAka}>Olahraga tren baru!</p>
                </div>
              </div>
              <p className={styles.sportDesc}>
                Padel lagi naik daun — mirip tenis tapi lebih gampang dipelajari.
                Cocok buat yang mau coba hal baru!
              </p>
              <div className={styles.sportMeta}>
                <div className={styles.sportMetaItem}>
                  <Calendar size={16} />
                  <span>Tiap Weekend</span>
                </div>
                <div className={styles.sportMetaItem}>
                  <Users size={16} />
                  <span>Pemula-friendly</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaBg} />
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <h2 className={styles.ctaTitle}>
            Yuk, gerak bareng!
          </h2>
          <p className={styles.ctaDesc}>
            Info jadwal & pendaftaran tiap sesi bisa langsung lewat sosial media kami.
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
