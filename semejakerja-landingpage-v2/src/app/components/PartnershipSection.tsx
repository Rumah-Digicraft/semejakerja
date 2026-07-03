"use client";

import { Fragment } from "react";
import Image from "next/image";
import ScrollReveal from "./ScrollReveal";
import styles from "./PartnershipSection.module.css";

const partners = [
  {
    name: "Rumah Digicraft",
    logo: "/images/partnership/rumah-digicraft.png",
    url: "https://rumahdigicraft.com",
  },
  {
    name: "Berburu Cafe",
    logo: "/images/partnership/berburu-cafe-logo.jpg",
    url: "https://www.instagram.com/berburucafe",
  },
];

export default function PartnershipSection() {
  return (
    <section className={styles.section} id="kolaborasi">
      <div className="container">
        <ScrollReveal>
          <div className={styles.header}>
            <p className={styles.label}>Kolaborasi</p>
            <h2 className={styles.title}>
              Tumbuh bareng
              <span className={styles.highlight}> teman perjalanan.</span>
            </h2>
            <p className={styles.subtitle}>
              Di balik setiap sesi WFC, ada pihak-pihak baik yang ikut mendukung
              perjalanan Semeja Kerja. Terima kasih sudah percaya dan tumbuh bareng kami.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className={styles.panel}>
            {partners.map((partner, i) => (
              <Fragment key={partner.name}>
                {i > 0 && <span className={styles.divider} aria-hidden />}
                <a
                  href={partner.url}
                  target="_blank"
                  rel="noopener"
                  className={styles.partner}
                  aria-label={partner.name}
                >
                  <Image
                    src={partner.logo}
                    alt={`Logo ${partner.name}`}
                    width={180}
                    height={90}
                    className={styles.partnerLogo}
                  />
                  <span className={styles.partnerName}>{partner.name}</span>
                </a>
              </Fragment>
            ))}
          </div>
        </ScrollReveal>

        {/* <ScrollReveal delay={250}>
          <p className={styles.invite}>
            Ingin ikut mendukung gerakan ini?{" "}
            <a
              href="https://wa.me/6281325392452?text=Halo%2C%20saya%20tertarik%20untuk%20berkolaborasi%20dengan%20Semeja%20Kerja"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.inviteLink}
            >
              Ngobrol santai dengan tim kami
            </a>
          </p>
        </ScrollReveal> */}
      </div>
    </section>
  );
}
