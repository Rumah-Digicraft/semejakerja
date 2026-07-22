"use client";

// Shared bits for surfacing WFC events publicly (homepage section + /wfc page).
// Reads the `public_wfc_events` view (migration 031) — only forms that are
// status='open' AND show_on_landing=true, plus a live registered_count.

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";
import { CalendarDays, MapPin, Users, ArrowRight } from "lucide-react";
import styles from "./wfc.module.css";

export interface WfcEvent {
  id: string;
  title: string;
  cafe_name: string | null;
  description: string | null;
  token: string;
  quota: number | null;
  event_date: string | null;
  location: string | null;
  registered_count: number;
}

export function useWfcEvents() {
  const [events, setEvents] = useState<WfcEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("public_wfc_events")
        .select("*")
        .order("event_date", { ascending: true, nullsFirst: false });
      setEvents((data ?? []) as WfcEvent[]);
      setLoading(false);
    }
    load();
  }, []);

  return { events, loading };
}

// Highlight layout untuk kasus 1 event — biar tidak "ngambang" di grid.
export function WfcEventFeatured({ event }: { event: WfcEvent }) {
  const full = event.quota != null && event.registered_count >= event.quota;
  const pct =
    event.quota != null && event.quota > 0
      ? Math.min((event.registered_count / event.quota) * 100, 100)
      : 0;

  return (
    <div className={styles.featured}>
      <div className={styles.featuredMain}>
        {event.cafe_name && (
          <span className={styles.cardBadge}>x {event.cafe_name}</span>
        )}
        <h3 className={styles.featuredTitle}>{event.title}</h3>
        <div className={styles.meta}>
          {event.event_date && (
            <span className={styles.metaRow}>
              <CalendarDays size={16} className={styles.metaIcon} />
              {formatDate(event.event_date)}
            </span>
          )}
          {event.location && (
            <span className={styles.metaRow}>
              <MapPin size={16} className={styles.metaIcon} />
              {event.location}
            </span>
          )}
        </div>
      </div>

      <div className={styles.featuredAside}>
        <span className={styles.asideCount}>
          <Users size={16} className={styles.metaIcon} />
          {event.quota != null
            ? `${event.registered_count} / ${event.quota} peserta`
            : `${event.registered_count} peserta terdaftar`}
        </span>
        {event.quota != null && (
          <div className={styles.spots}>
            <span className={styles.spotsText}>
              {full ? "Kuota penuh" : `Sisa ${event.quota - event.registered_count} slot`}
            </span>
            <div className={styles.spotsBar}>
              <div className={styles.spotsFill} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
        {full ? (
          <span className={`btn btn--secondary ${styles.cardCta}`} aria-disabled="true">
            Kuota penuh
          </span>
        ) : (
          <Link
            href={`/wfc/register?token=${event.token}`}
            className={`btn btn--primary ${styles.cardCta}`}
          >
            Daftar sekarang <ArrowRight size={16} />
          </Link>
        )}
      </div>
    </div>
  );
}

export function WfcEventCard({ event }: { event: WfcEvent }) {
  const full = event.quota != null && event.registered_count >= event.quota;
  const pct =
    event.quota != null && event.quota > 0
      ? Math.min((event.registered_count / event.quota) * 100, 100)
      : 0;

  return (
    <div className={styles.card}>
      {event.cafe_name && (
        <span className={styles.cardBadge}>x {event.cafe_name}</span>
      )}
      <h3 className={styles.cardTitle}>{event.title}</h3>

      <div className={styles.meta}>
        {event.event_date && (
          <span className={styles.metaRow}>
            <CalendarDays size={15} className={styles.metaIcon} />
            {formatDate(event.event_date)}
          </span>
        )}
        {event.location && (
          <span className={styles.metaRow}>
            <MapPin size={15} className={styles.metaIcon} />
            {event.location}
          </span>
        )}
        <span className={styles.metaRow}>
          <Users size={15} className={styles.metaIcon} />
          {event.quota != null
            ? `${event.registered_count} / ${event.quota} peserta`
            : `${event.registered_count} peserta terdaftar`}
        </span>
      </div>

      {event.quota != null && (
        <div className={styles.spots}>
          <span className={styles.spotsText}>
            {full ? "Kuota penuh" : `Sisa ${event.quota - event.registered_count} slot`}
          </span>
          <div className={styles.spotsBar}>
            <div className={styles.spotsFill} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {full ? (
        <span className={`btn btn--secondary ${styles.cardCta}`} aria-disabled="true">
          Kuota penuh
        </span>
      ) : (
        <Link
          href={`/wfc/register?token=${event.token}`}
          className={`btn btn--primary ${styles.cardCta}`}
        >
          Daftar sekarang <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
