"use client";

// Homepage section that surfaces open WFC "Bareng Strangers" events.
// Auto show/hide: renders nothing when there are no featured open events
// (admin controls this via the show_on_landing toggle + status='open').
// Same pattern as LaunchBanner.

import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";
import ScrollReveal from "./ScrollReveal";
import { useWfcEvents, WfcEventCard, WfcEventFeatured } from "../wfc/shared";
import styles from "../wfc/wfc.module.css";

const HOME_LIMIT = 3;

export default function WfcEvents() {
  const { events, loading } = useWfcEvents();

  // Tidak ada event yang dipajang → section hilang total.
  if (loading || events.length === 0) return null;

  const shown = events.slice(0, HOME_LIMIT);

  return (
    <section className={styles.section}>
      <div className="container">
        <ScrollReveal className={styles.header}>
          <span className={styles.badge}>
            <Users size={14} /> WFC Bareng Strangers
          </span>
          <h2 className={styles.title}>Ikut event WFC bareng cafe partner</h2>
          <p className={styles.subtitle}>
            Kerja bareng orang baru di cafe pilihan, dapat diskon, dan perluas
            networking. Slot terbatas daftar sebelum penuh!
          </p>
        </ScrollReveal>

        {shown.length === 1 ? (
          <WfcEventFeatured event={shown[0]} />
        ) : (
          <div className={styles.grid}>
            {shown.map((event) => (
              <WfcEventCard key={event.id} event={event} />
            ))}
          </div>
        )}

        {events.length > HOME_LIMIT && (
          <div className={styles.viewAll}>
            <Link href="/wfc" className={styles.viewAllLink}>
              Lihat semua event ({events.length}) <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
