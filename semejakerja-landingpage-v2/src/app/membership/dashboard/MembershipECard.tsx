"use client";

import Image from "next/image";
import Link from "next/link";
import { Crown, Info } from "lucide-react";
import { tierLabels } from "../features";
import { formatDate, type Membership, type UserProfile } from "./types";
import styles from "./MembershipECard.module.css";

// Stable per user (derived from user_id, not membership id) so the number
// survives renewals and upgrades.
function memberNumber(userId: string): string {
  return `SK-${userId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export default function MembershipECard({
  profile,
  membership,
}: {
  profile: UserProfile | null;
  membership: Membership;
}) {
  const name = profile?.full_name || profile?.nickname || "Member";

  return (
    <section className={styles.section}>
      {/* E-Card */}
      <div
        className={`${styles.ecard} ${styles[`tier_${membership.tier}`]}`}
        aria-label="E-Card Member Semeja Kerja"
      >
        <div className={styles.cardTop}>
          <div className={styles.brand}>
            <Image
              src="/images/logos/semejakerja-only-logo.png"
              alt="Semeja Kerja"
              width={40}
              height={40}
              className={styles.brandLogo}
            />
            <div>
              <p className={styles.brandName}>Semeja Kerja</p>
              <p className={styles.brandSub}>Member Card</p>
            </div>
          </div>
          <span className={styles.crownWrap}>
            <Crown size={18} />
          </span>
        </div>

        <div className={styles.cardBody}>
          <p className={styles.fieldLabel}>Nama Member</p>
          <p className={styles.memberName}>{name}</p>
          <p className={styles.memberNumber}>{memberNumber(membership.user_id)}</p>
        </div>

        <div className={styles.cardBottom}>
          <div>
            <p className={styles.fieldLabel}>Berlaku hingga</p>
            <p className={styles.expiryDate}>
              {membership.expires_at
                ? formatDate(membership.expires_at)
                : "Selamanya"}
            </p>
          </div>
          <span className={styles.tierPill}>
            <Crown size={12} /> {tierLabels[membership.tier]}
          </span>
        </div>
      </div>

      {/* Panduan penggunaan */}
      <div className={`card ${styles.guideCard}`}>
        <h2 className={styles.guideTitle}>
          <Info size={18} /> Cara Pakai Membership
        </h2>
        <ol className={styles.guideList}>
          <li>
            <span className={styles.stepNum}>1</span>
            Datang ke kafe mitra Semeja Kerja, lalu buka halaman dashboard ini.
          </li>
          <li>
            <span className={styles.stepNum}>2</span>
            Tunjukkan E-Card ini ke kasir <b>sebelum membayar</b>.
          </li>
          <li>
            <span className={styles.stepNum}>3</span>
            Kasir mencocokkan nama, tier, dan masa berlaku kartu.
          </li>
          <li>
            <span className={styles.stepNum}>4</span>
            Diskon sesuai benefit tier kamu langsung dipotong dari tagihan.
          </li>
        </ol>
        <p className={styles.guideNote}>
          Kartu bersifat pribadi dan tidak dapat dipindahtangankan, serta hanya
          berlaku selama membership aktif. Daftar kafe mitra ada di halaman{" "}
          <Link href="/maps">Maps</Link>.
        </p>
      </div>
    </section>
  );
}
