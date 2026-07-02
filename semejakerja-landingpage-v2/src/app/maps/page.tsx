import type { Metadata } from "next";
import Image from "next/image";
import { MapPin, ExternalLink, Coffee, Wifi, Clock } from "lucide-react";
import styles from "./maps.module.css";

export const metadata: Metadata = {
  title: "Maps Kafe",
  description:
    "Temukan kafe-kafe terbaik untuk WFC di Purwokerto. Peta interaktif dengan filter fasilitas, rating, dan jam buka.",
};

const cafes = [
  { name: "Duanja", logo: "/images/kafe/duanja.png" },
  { name: "The Soeds", logo: "/images/kafe/the-soeds.png" },
  { name: "Meatboss", logo: "/images/kafe/meatboss.png" },
  { name: "Ruang Temu", logo: "/images/kafe/ruang-temu.png" },
  { name: "At Nine", logo: "/images/kafe/atnine.png" },
];

export default function MapsPage() {
  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={`container ${styles.heroContent}`}>
          <div className={styles.badge}>
            <MapPin size={14} />
            Peta Kafe Purwokerto
          </div>
          <h1 className={styles.title}>
            Temukan kafe WFC
            <span className={styles.highlight}> terbaik</span> di Purwokerto
          </h1>
          <p className={styles.subtitle}>
            Peta interaktif dengan 350+ kafe, lengkap dengan info fasilitas, Wi-Fi, jam buka,
            dan rating dari komunitas.
          </p>
          <a
            href="https://semejakerja-web-apps.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--primary btn--large"
          >
            Buka Peta Interaktif
            <ExternalLink size={18} />
          </a>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className="container">
          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Coffee size={28} />
              </div>
              <h3 className={styles.featureName}>350+ Kafe</h3>
              <p className={styles.featureDesc}>
                Database kafe terlengkap di Purwokerto, di-review langsung oleh member komunitas.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Wifi size={28} />
              </div>
              <h3 className={styles.featureName}>Info Fasilitas</h3>
              <p className={styles.featureDesc}>
                Filter berdasarkan Wi-Fi, colokan, smoking area, mushola, dan lainnya.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Clock size={28} />
              </div>
              <h3 className={styles.featureName}>Jam Buka</h3>
              <p className={styles.featureDesc}>
                Cek kafe yang buka malam atau 24 jam. Nggak perlu kecewa datang pas tutup.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Partner cafes */}
      <section className={styles.partners}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Kafe Pilihan Komunitas</h2>
          <p className={styles.sectionSubtitle}>
            Kafe-kafe ini sudah jadi basecamp resmi Semeja Kerja, tempat kita ngumpul dan WFC bareng.
          </p>
          <div className={styles.cafeGrid}>
            {cafes.map((cafe) => (
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
    </div>
  );
}
