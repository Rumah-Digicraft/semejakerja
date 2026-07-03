"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import styles from "./membership.module.css";
import { features } from "./features";

export default function MembershipPage() {
  const [isAnnual, setIsAnnual] = useState(false);

  // Pricing based on Triwulan vs Bulanan (Triwulan is 3 months)
  const priceNongkrong = isAnnual ? "47.000" : "19.000";
  const priceSerius = isAnnual ? "77.000" : "31.000";
  const periodLabel = isAnnual ? "/triwulan" : "/bln";
  const linkParams = isAnnual ? "?period=triwulan" : "?period=bulanan";

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={`container ${styles.heroContent}`}>
          <h1 className={styles.title}>
            Membership
            <span className={styles.highlight}> Semeja Kerja</span>
          </h1>
          <p className={styles.subtitle}>
            Dapatkan benefit maksimal untuk produktivitas kerjamu. Bergabung dengan komunitas WFC terbesar di Purwokerto.
          </p>
          
          <div className={styles.billingToggle}>
            <span className={!isAnnual ? styles.toggleLabelActive : styles.toggleLabel} onClick={() => setIsAnnual(false)}>Bulanan</span>
            <label className={styles.switch}>
              <input type="checkbox" checked={isAnnual} onChange={() => setIsAnnual(!isAnnual)} />
              <span className={styles.slider}></span>
            </label>
            <span className={isAnnual ? styles.toggleLabelActive : styles.toggleLabel} onClick={() => setIsAnnual(true)}>Triwulan (Hemat!)</span>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className={styles.pricingSection}>
        <div className="container">
          <div className={styles.pricingGrid}>
            
            {/* Nyantai */}
            <div className={styles.pricingCard}>
              <h2 className={styles.tierName}>Nyantai</h2>
              <p className={styles.tierDesc}>Gratis selamanya, cocok untuk yang baru mau coba WFC bareng.</p>
              <div className={styles.priceContainer}>
                <span className={`${styles.price} ${styles.priceFree}`}>Gratis</span>
              </div>
              <ul className={styles.featuresList}>
                <li className={styles.featureItem}><Check size={18} className={styles.featureIcon} /> Daftar & join Regularan</li>
                <li className={styles.featureItem}><Check size={18} className={styles.featureIcon} /> Maps basic (nama, alamat)</li>
                <li className={styles.featureItem}><Check size={18} className={styles.featureIcon} /> Update reguler WFC</li>
              </ul>
              <Link href="/auth/register" className={`btn btn--secondary ${styles.actionBtn}`}>
                Gabung Gratis
              </Link>
            </div>

            {/* Nongkrong */}
            <div className={`${styles.pricingCard} ${styles.pricingCardPopular}`}>
              <div className={styles.popularBadge}>Paling Diminati</div>
              <h2 className={styles.tierName}>Nongkrong</h2>
              <p className={styles.tierDesc}>Akses Maps lengkap dan nikmati diskon eksklusif di WFC mitra.</p>
              <div className={styles.priceContainer}>
                <span style={{ fontSize: "1.2rem", fontWeight: 700, marginRight: "4px" }}>Rp</span>
                <span className={styles.price}>{priceNongkrong}</span>
                <span className={styles.pricePeriod}>{periodLabel}</span>
              </div>
              <ul className={styles.featuresList}>
                <li className={styles.featureItem}><Check size={18} className={styles.featureIcon} /> <strong>Semua fitur Nyantai</strong></li>
                <li className={styles.featureItem}><Check size={18} className={styles.featureIcon} /> Maps lengkap (filter, ketersediaan)</li>
                <li className={styles.featureItem}><Check size={18} className={styles.featureIcon} /> <strong>Diskon 10% di Cafe Mitra</strong></li>
                <li className={styles.featureItem}><Check size={18} className={styles.featureIcon} /> Early access gallery update</li>
                <li className={styles.featureItem}><Check size={18} className={styles.featureIcon} /> Badge profil (Nongkrong)</li>
              </ul>
              <Link href={`/membership/checkout${linkParams}&tier=nongkrong`} className={`btn btn--primary ${styles.actionBtn}`}>
                Pilih Nongkrong
              </Link>
            </div>

            {/* Mode Serius */}
            <div className={styles.pricingCard}>
              <h2 className={styles.tierName}>Mode Serius</h2>
              <p className={styles.tierDesc}>Fitur lengkap plus benefit komunitas dan olahraga Semeja Moves.</p>
              <div className={styles.priceContainer}>
                <span style={{ fontSize: "1.2rem", fontWeight: 700, marginRight: "4px" }}>Rp</span>
                <span className={styles.price}>{priceSerius}</span>
                <span className={styles.pricePeriod}>{periodLabel}</span>
              </div>
              <ul className={styles.featuresList}>
                <li className={styles.featureItem}><Check size={18} className={styles.featureIcon} /> <strong>Semua fitur Nongkrong</strong></li>
                <li className={styles.featureItem}><Check size={18} className={styles.featureIcon} /> <strong>1 sesi Badminton gratis/bln</strong></li>
                <li className={styles.featureItem}><Check size={18} className={styles.featureIcon} /> Priority booking Semeja Moves</li>
                <li className={styles.featureItem}><Check size={18} className={styles.featureIcon} /> Akses event eksklusif member</li>
                <li className={styles.featureItem}><Check size={18} className={styles.featureIcon} /> Badge profil (Mode Serius)</li>
              </ul>
              <Link href={`/membership/checkout${linkParams}&tier=mode_serius`} className={`btn btn--secondary ${styles.actionBtn}`}>
                Pilih Mode Serius
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className={styles.comparisonSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Bandingkan Fitur</h2>
          <p className={styles.sectionSubtitle}>Detail lengkap apa saja yang kamu dapatkan di tiap tier membership.</p>
          
          <div className={styles.comparisonTableWrapper}>
            <table className={styles.comparisonTable}>
              <thead>
                <tr>
                  <th>Fitur</th>
                  <th className={styles.tierHeader}>Nyantai</th>
                  <th className={styles.tierHeader}>Nongkrong</th>
                  <th className={styles.tierHeader}>Mode Serius</th>
                </tr>
              </thead>
              <tbody>
                {features.map((feat, idx) => (
                  <tr key={idx}>
                    <td className={styles.featureName}>{feat.name}</td>
                    <td className={styles.status}>
                      {feat.nyantai ? <Check size={20} className={styles.featureIcon} style={{margin: "0 auto"}}/> : <X size={20} className={styles.featureIconMissing} style={{margin: "0 auto"}}/>}
                    </td>
                    <td className={styles.status}>
                      {feat.nongkrong ? <Check size={20} className={styles.featureIcon} style={{margin: "0 auto"}}/> : <X size={20} className={styles.featureIconMissing} style={{margin: "0 auto"}}/>}
                    </td>
                    <td className={styles.status}>
                      {feat.serius ? <Check size={20} className={styles.featureIcon} style={{margin: "0 auto"}}/> : <X size={20} className={styles.featureIconMissing} style={{margin: "0 auto"}}/>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
