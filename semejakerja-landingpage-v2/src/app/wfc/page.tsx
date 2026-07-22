"use client";

// Public index of WFC "Bareng Strangers" events. Lists every form that is
// open + show_on_landing (via the public_wfc_events view). Unlike the homepage
// section, this page always renders (with an empty state) so the URL is a
// stable, shareable hub for the events.

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
            <Users size={14} /> WFC Bareng Strangers
          </span>
          <h1 className={styles.title}>Event WFC Semeja Kerja</h1>
          <p className={styles.subtitle}>
            Kerja bareng orang baru di cafe partner, dapat diskon, dan perluas
            networking. Pilih event yang cocok dan daftar sebelum kuota penuh.
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
              Belum ada event WFC yang dibuka. Pantau terus Instagram
              @semejakerja ya — event baru bakal muncul di sini!
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
