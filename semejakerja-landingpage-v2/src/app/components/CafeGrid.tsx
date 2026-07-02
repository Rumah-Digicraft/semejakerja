"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, MessageSquare } from "lucide-react";
import ScrollReveal from "./ScrollReveal";
import styles from "./CafeGrid.module.css";

const cafes = [
  { name: "Duanja", logo: "/images/kafe/duanja.png" },
  { name: "The Soeds", logo: "/images/kafe/the-soeds.png" },
  { name: "Meatboss", logo: "/images/kafe/meatboss.png" },
  { name: "Ruang Temu", logo: "/images/kafe/ruang-temu.png" },
  { name: "At Nine", logo: "/images/kafe/atnine.png" },
];

export default function CafeGrid() {
  return (
    <section className={styles.section} id="kafe">
      <div className="container">
        <ScrollReveal>
          <div className={styles.header}>
            <p className={styles.label}>Tempat Terbaik untuk WFC</p>
            <h2 className={styles.title}>
              Basecamp resmi
              <span className={styles.highlight}> komunitas.</span>
            </h2>
            <p className={styles.subtitle}>
              Kafe-kafe ini sudah jadi markas Semeja Kerja. Wi-Fi kencang, suasana nyaman,
              dan barista yang udah hapal wajah member kita.
            </p>
          </div>
        </ScrollReveal>

        <div className={styles.grid}>
          {cafes.map((cafe, i) => (
            <ScrollReveal key={cafe.name} delay={i * 80}>
              <div className={styles.cafeCard}>
                <Image
                  src={cafe.logo}
                  alt={`Logo ${cafe.name}`}
                  width={150}
                  height={80}
                  className={styles.cafeLogo}
                />
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={300}>
          <div className={styles.actions}>
            <Link href="/maps" className="btn btn--primary">
              <MapPin size={18} />
              Lihat Semua Kafe di Maps
            </Link>
          </div>
        </ScrollReveal>

        {/* Partnership CTA */}
        <ScrollReveal delay={400}>
          <div className={styles.partnerCta}>
            <div className={styles.partnerContent}>
              <h3 className={styles.partnerTitle}>
                Punya kafe dan mau jadi basecamp berikutnya?
              </h3>
              <p className={styles.partnerDesc}>
                Gabung dengan kafe-kafe terpilih dan dapatkan eksposur ke ratusan member komunitas
                profesional Purwokerto.
              </p>
            </div>
            <a
              href="https://wa.me/6281325392452?text=Halo%2C%20saya%20tertarik%20untuk%20bermitra%20dengan%20Semeja%20Kerja"
              target="_blank"
              rel="noopener noreferrer"
              className={`btn btn--secondary ${styles.partnerBtn}`}
            >
              <MessageSquare size={18} />
              Hubungi Tim Kami
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
