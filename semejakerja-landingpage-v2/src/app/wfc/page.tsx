"use client";

// Public index of community events ("Event Semeja" — WFC Bareng Strangers,
// lomba, kumpul komunitas). Lists every form that is open + show_on_landing
// (via the public_wfc_events view). Unlike the homepage section, this page
// always renders (with an empty state) so the URL is a stable, shareable hub
// for the events. The /wfc route name is kept for link stability.

import { Loader2, Users } from "lucide-react";
import { useWfcEvents, WfcEventCard, WfcEventFeatured } from "./shared";
import styles from "./wfc.module.css";

export default function WfcIndexPage() {
  const { events, loading } = useWfcEvents();

  return (
    <div className={styles.page}>
      <div className={styles.pageInner}>
        <div className={styles.header}>
          <span className={styles.badge}>
            <Users size={14} /> Event Semeja
          </span>
          <h1 className={styles.title}>Event Komunitas Semeja Kerja</h1>
          <p className={styles.subtitle}>
            Semua event yang lagi buka pendaftaran ada di sini: WFC bareng
            strangers, lomba, dan acara komunitas lainnya. Pilih yang cocok,
            daftar sebelum kuota penuh.
          </p>
        </div>

        {loading ? (
          <div className={styles.loadingWrap}>
            <Loader2 size={32} className={styles.spinner} />
          </div>
        ) : events.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyEmoji}>☕️</div>
            <p className={styles.emptyText}>
              Belum ada event yang dibuka. Pantau terus Instagram @semejakerja
              ya, event baru bakal muncul di sini!
            </p>
          </div>
        ) : events.length === 1 ? (
          <WfcEventFeatured event={events[0]} />
        ) : (
          <div className={styles.grid}>
            {events.map((event) => (
              <WfcEventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
