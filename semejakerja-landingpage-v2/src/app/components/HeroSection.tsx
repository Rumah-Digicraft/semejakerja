"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./HeroSection.module.css";

export default function HeroSection() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setLoaded(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section className={styles.hero} id="hero">
      {/* Background overlay */}
      <div className={styles.overlay} />

      {/* Decorative elements */}
      <div className={styles.decorCircle1} />
      <div className={styles.decorCircle2} />

      <div className={`${styles.content} ${loaded ? styles.loaded : ""}`}>
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          #WFCBarengStrangers di Purwokerto
        </div>

        <h1 className={styles.title}>
          <span className={styles.titleLine1}>Pernah WFC Sendirian,</span>
          <span className={styles.titleLine2}>Tapi Pengen Ngobrol?</span>
        </h1>

        <p className={styles.subtitle}>
          Kamu nggak sendirian. Ada ratusan orang yang merasakan hal yang sama.
          <br />
          <strong>Semeja Kerja</strong> menghubungkanmu dengan mereka.
        </p>

        <div className={styles.actions}>
          <a
            href="https://linktr.ee/semejakerja"
            target="_blank"
            rel="noopener noreferrer"
            className={`btn btn--primary btn--large ${styles.ctaMain}`}
          >
            Gabung Komunitas — 100% Gratis
          </a>
          <a href="#cerita" className={`btn btn--ghost ${styles.ctaSecondary}`}>
            Kenalan Dulu ↓
          </a>
        </div>

        {/* Social proof */}
        <div className={styles.socialProof}>
          <div className={styles.avatarStack}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={styles.avatar}
                style={{
                  background: `hsl(${260 + i * 20}, 60%, ${40 + i * 8}%)`,
                }}
              >
                {String.fromCharCode(64 + i)}
              </div>
            ))}
          </div>
          <p className={styles.proofText}>
            <strong>500+</strong> orang sudah bergabung
          </p>
        </div>
      </div>

      {/* Scroll indicator */}
      <a href="#cerita" className={styles.scrollIndicator} aria-label="Scroll ke bawah">
        <ChevronDown size={24} />
      </a>
    </section>
  );
}
