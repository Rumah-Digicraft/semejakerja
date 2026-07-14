"use client";

import { useEffect, useRef, useState } from "react";
import {
  Star, MapPin, Wifi, Clock, ChevronLeft, ChevronRight, ExternalLink, Coffee,
} from "lucide-react";
import { fetchOpenNowCafes, type OpenCafe } from "@/lib/cafes";
import { MAPS_URL } from "@/lib/seo";
import styles from "./OpenNowStrip.module.css";

// Branded covers stand in for the (unavailable) cafe photos — deep purple → gold.
const COVERS = [
  "linear-gradient(135deg, #3D155F 0%, #5A2D8A 100%)",
  "linear-gradient(135deg, #2A0E42 0%, #6D28D9 100%)",
  "linear-gradient(135deg, #4C1D95 0%, #B5A566 130%)",
  "linear-gradient(135deg, #5A2D8A 0%, #2A0E42 100%)",
  "linear-gradient(135deg, #3D155F 0%, #7c3aed 120%)",
  "linear-gradient(135deg, #2E1065 0%, #5A2D8A 100%)",
  "linear-gradient(135deg, #6D28D9 0%, #3D155F 100%)",
];

function CafeCard({ cafe, cover }: { cafe: OpenCafe; cover: string }) {
  return (
    <a
      className={styles.card}
      href={`${MAPS_URL}/cafe/${cafe.slug}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className={styles.cover} style={{ background: cover }}>
        <Coffee className={styles.coverMark} size={72} strokeWidth={1.25} />
        <span className={styles.coverInitial}>{cafe.name.charAt(0).toUpperCase()}</span>
        <span className={styles.openPill}>
          <span className={styles.dot} />
          {cafe.open.is24h ? "Buka 24 Jam" : "Buka Sekarang"}
        </span>
        {cafe.isPartner && <span className={styles.partnerBadge}>Basecamp</span>}
      </div>

      <div className={styles.body}>
        <div className={styles.topRow}>
          <h3 className={styles.name}>{cafe.name}</h3>
          {cafe.rating > 0 && (
            <span className={styles.rating}>
              <Star size={13} fill="currentColor" strokeWidth={0} />
              {cafe.rating.toFixed(1)}
            </span>
          )}
        </div>

        <p className={styles.area}>
          <MapPin size={13} /> {cafe.area}
          {cafe.reviewCount > 0 && (
            <span className={styles.reviews}> · {cafe.reviewCount} ulasan</span>
          )}
        </p>

        <div className={styles.chips}>
          <span className={`${styles.chip} ${styles.chipTime}`}>
            <Clock size={12} /> {cafe.open.closeLabel}
          </span>
          {cafe.hasWifi && cafe.wifiDownload > 0 ? (
            <span className={styles.chip}>
              <Wifi size={12} /> {Math.round(cafe.wifiDownload)} Mbps
            </span>
          ) : (
            <span className={styles.chip}>{cafe.priceLabel}</span>
          )}
        </div>

        <span className={styles.cta}>
          Lihat di peta <ExternalLink size={13} />
        </span>
      </div>
    </a>
  );
}

function SkeletonCard() {
  return (
    <div className={`${styles.card} ${styles.skeleton}`} aria-hidden>
      <div className={`${styles.cover} ${styles.shimmer}`} />
      <div className={styles.body}>
        <div className={`${styles.skLine} ${styles.shimmer}`} style={{ width: "70%" }} />
        <div className={`${styles.skLine} ${styles.shimmer}`} style={{ width: "45%" }} />
        <div className={`${styles.skLine} ${styles.shimmer}`} style={{ width: "60%" }} />
      </div>
    </div>
  );
}

export default function OpenNowStrip() {
  const [cafes, setCafes] = useState<OpenCafe[] | null>(null);
  const [error, setError] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetchOpenNowCafes(7)
      .then((data) => alive && setCafes(data))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

  const scroll = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.85, 520), behavior: "smooth" });
  };

  const loading = cafes === null && !error;
  const isEmpty = cafes !== null && cafes.length === 0;

  return (
    <section className={styles.section} id="buka-sekarang">
      <div className="container">
        <div className={styles.header}>
          <div>
            <p className={styles.label}>
              <Coffee size={15} /> Buka Sekarang
            </p>
            <h2 className={styles.title}>Cafe yang lagi buka buat kamu WFC</h2>
            <p className={styles.subtitle}>
              {loading
                ? "Ngecek cafe yang lagi buka…"
                : isEmpty
                  ? "Belum ada cafe yang tercatat buka jam segini — cek peta buat lihat semuanya."
                  : error
                    ? "Gagal memuat status buka — coba buka peta interaktifnya."
                    : `${cafes!.length} tempat siap kamu datangi sekarang juga. Diperbarui real-time dari komunitas.`}
            </p>
          </div>

          {!isEmpty && !error && (
            <div className={styles.arrows}>
              <button aria-label="Sebelumnya" className={styles.arrow} onClick={() => scroll(-1)}>
                <ChevronLeft size={20} />
              </button>
              <button aria-label="Berikutnya" className={styles.arrow} onClick={() => scroll(1)}>
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        {error ? (
          <div className={styles.fallback}>
            <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="btn btn--primary">
              Buka Peta Interaktif <ExternalLink size={18} />
            </a>
          </div>
        ) : (
          <div className={styles.track} ref={trackRef}>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              : cafes!.map((cafe, i) => (
                  <CafeCard key={cafe.id} cafe={cafe} cover={COVERS[i % COVERS.length]} />
                ))}
          </div>
        )}
      </div>
    </section>
  );
}
