"use client";

// Homepage section "Event Semeja" — surfaces open community events (WFC
// Bareng Strangers, lomba, kumpul komunitas; semua dari form builder admin).
// Auto show/hide: renders nothing when there are no featured open events
// (admin controls this via the show_on_landing toggle + status='open').
// Same pattern as LaunchBanner. Route & component names keep the "wfc"
// naming — /wfc is a stable shared URL, only the copy is generalized.

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
            <Users size={14} /> Event Semeja
          </span>
          <h2 className={styles.title}>Ikut event bareng teman semeja</h2>
          <p className={styles.subtitle}>
            WFC bareng strangers, lomba, sampai kumpul komunitas. Kuota tiap
            event terbatas, daftar sebelum penuh ya!
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
