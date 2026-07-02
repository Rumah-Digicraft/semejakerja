"use client";

import { ArrowUpRight } from "lucide-react";
import ScrollReveal from "./ScrollReveal";
import styles from "./CTASection.module.css";

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

export default function CTASection() {
  return (
    <section className={styles.section}>
      <div className={styles.bg} />
      <div className="container" style={{ position: "relative", zIndex: 2 }}>
        <ScrollReveal>
          <div className={styles.content}>
            <p className={styles.label}>Siap bergabung?</p>
            <h2 className={styles.title}>
              500+ orang sudah merasakan.
              <br />
              <span className={styles.highlight}>Giliran kamu.</span>
            </h2>
            <p className={styles.desc}>
              Gratis. Tanpa syarat. Cukup datang, buka laptop, dan kenalan dengan stranger di sebelahmu.
            </p>
            <div className={styles.actions}>
              <a
                href="https://linktr.ee/semejakerja"
                target="_blank"
                rel="noopener noreferrer"
                className={`btn btn--primary btn--large ${styles.cta}`}
              >
                Gabung Komunitas Sekarang
                <ArrowUpRight size={20} />
              </a>
            </div>

            <div className={styles.socialLinks}>
              <a
                href="https://instagram.com/semejakerja"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialLink}
              >
                <InstagramIcon /> @semejakerja
              </a>
              <span className={styles.socialDivider}>·</span>
              <a
                href="https://www.tiktok.com/@semejakerja"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialLink}
              >
                <TikTokIcon /> @semejakerja
              </a>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
