"use client";

import Link from "next/link";
import { Dumbbell, ArrowRight } from "lucide-react";
import ScrollReveal from "./ScrollReveal";
import styles from "./MovesTeaser.module.css";

export default function MovesTeaser() {
  return (
    <section className={styles.section}>
      <div className={styles.bg} />
      <div className="container" style={{ position: "relative", zIndex: 2 }}>
        <div className={styles.layout}>
          <ScrollReveal className={styles.content}>
            <div className={styles.badge}>
              <Dumbbell size={14} />
              Part of Semeja Kerja
            </div>
            <h2 className={styles.title}>
              Kerja keras,
              <br />
              <span className={styles.highlight}>main lebih keras.</span>
            </h2>
            <p className={styles.desc}>
              Semeja Moves hadir untuk teman-teman yang butuh <strong>stress release</strong> setelah
              WFC marathon. Olahraga bareng komunitas, bukan cuma sehat — tapi juga seru.
            </p>

            <div className={styles.sports}>
              <div className={styles.sportCard}>
                <span className={styles.sportEmoji}>🏸</span>
                <div>
                  <h4 className={styles.sportName}>Badminton</h4>
                  <p className={styles.sportSchedule}>Tiap Weekend</p>
                </div>
              </div>
              <div className={styles.sportCard}>
                <span className={styles.sportEmoji}>🎾</span>
                <div>
                  <h4 className={styles.sportName}>Padel</h4>
                  <p className={styles.sportSchedule}>Tiap Weekend</p>
                </div>
              </div>
            </div>

            <Link href="/moves" className={`btn btn--primary ${styles.cta}`}>
              Eksplor Semeja Moves
              <ArrowRight size={18} />
            </Link>
          </ScrollReveal>

          <ScrollReveal delay={200} className={styles.visual}>
            <div className={styles.visualCard}>
              <div className={styles.visualInner}>
                <div className={styles.visualEmoji}>🏃‍♂️</div>
                <p className={styles.visualText}>
                  Lepas penat, olahraga bareng, dan pulang dengan semangat baru.
                </p>
                <div className={styles.visualStats}>
                  <div className={styles.visualStat}>
                    <span className={styles.visualStatNum}>2</span>
                    <span className={styles.visualStatLabel}>Cabang Olahraga</span>
                  </div>
                  <div className={styles.visualStat}>
                    <span className={styles.visualStatNum}>Weekend</span>
                    <span className={styles.visualStatLabel}>Jadwal Rutin</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
