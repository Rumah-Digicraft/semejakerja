"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  Star, MapPin, Wifi, Clock, ChevronLeft, ChevronRight, ExternalLink,
  Coffee, Moon, ArrowRight,
} from "lucide-react";
import { fetchCafeStrips, type OpenCafe, type CafeStrips } from "@/lib/cafes";
import { MAPS_URL } from "@/lib/seo";
import styles from "./CafeSections.module.css";

// Branded covers stand in for the (unavailable) cafe photos.
const DAY_COVERS = [
  "linear-gradient(135deg, #3D155F 0%, #5A2D8A 100%)",
  "linear-gradient(135deg, #2A0E42 0%, #6D28D9 100%)",
  "linear-gradient(135deg, #4C1D95 0%, #B5A566 130%)",
  "linear-gradient(135deg, #5A2D8A 0%, #2A0E42 100%)",
  "linear-gradient(135deg, #3D155F 0%, #7c3aed 120%)",
  "linear-gradient(135deg, #2E1065 0%, #5A2D8A 100%)",
  "linear-gradient(135deg, #6D28D9 0%, #3D155F 100%)",
];
const NIGHT_COVERS = [
  "linear-gradient(135deg, #0f0b21 0%, #3D155F 100%)",
  "linear-gradient(135deg, #1e1b4b 0%, #4C1D95 100%)",
  "linear-gradient(135deg, #14103a 0%, #5A2D8A 120%)",
  "linear-gradient(135deg, #1a1035 0%, #B5A566 150%)",
  "linear-gradient(135deg, #0f0b21 0%, #4C1D95 100%)",
  "linear-gradient(135deg, #241a52 0%, #2A0E42 100%)",
  "linear-gradient(135deg, #12102e 0%, #6D28D9 120%)",
];

function CafeCard({ cafe, cover, night }: { cafe: OpenCafe; cover: string; night?: boolean }) {
  const Mark = night ? Moon : Coffee;
  return (
    <a
      className={styles.card}
      href={`${MAPS_URL}/cafe/${cafe.slug}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className={styles.cover} style={{ background: cover }}>
        <Mark className={styles.coverMark} size={72} strokeWidth={1.25} />
        <span className={styles.coverInitial}>{cafe.name.charAt(0).toUpperCase()}</span>
        <span className={styles.openPill}>
          {night ? <Moon size={12} strokeWidth={2.5} /> : <span className={styles.dot} />}
          {night ? "Buka 24 Jam" : "Buka Sekarang"}
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

function SeeAllCard({ label }: { label: string }) {
  return (
    <a
      className={`${styles.card} ${styles.seeAll}`}
      href={MAPS_URL}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className={styles.seeAllIcon}>
        <ArrowRight size={24} />
      </span>
      <span className={styles.seeAllText}>{label}</span>
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

interface StripProps {
  id: string;
  icon: ComponentType<{ size?: number }>;
  label: string;
  title: string;
  subtitle: string;
  cafes: OpenCafe[];
  loading: boolean;
  error: boolean;
  emptyText: string;
  seeAllLabel: string;
  night?: boolean;
}

function CafeStrip({
  id, icon: Icon, label, title, subtitle, cafes, loading, error, emptyText, seeAllLabel, night,
}: StripProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const covers = night ? NIGHT_COVERS : DAY_COVERS;

  const scroll = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.85, 520), behavior: "smooth" });
  };

  const isEmpty = !loading && !error && cafes.length === 0;

  return (
    <section className={`${styles.section} ${night ? styles.sectionDark : ""}`} id={id}>
      <div className="container">
        <div className={styles.header}>
          <div>
            <p className={styles.label}>
              <Icon size={15} /> {label}
            </p>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.subtitle}>{subtitle}</p>
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
        ) : isEmpty ? (
          <div className={styles.empty}>{emptyText}</div>
        ) : (
          <div className={styles.track} ref={trackRef}>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              : cafes.map((cafe, i) => (
                  <CafeCard key={cafe.id} cafe={cafe} cover={covers[i % covers.length]} night={night} />
                ))}
            {!loading && <SeeAllCard label={seeAllLabel} />}
          </div>
        )}
      </div>
    </section>
  );
}

export default function CafeSections() {
  const [data, setData] = useState<CafeStrips | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchCafeStrips(7, 7)
      .then((d) => alive && setData(d))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

  const loading = data === null && !error;
  const openNow = data?.openNow ?? [];
  const open24h = data?.open24h ?? [];

  return (
    <>
      <CafeStrip
        id="buka-sekarang"
        icon={Coffee}
        label="Buka Sekarang"
        title="Cafe yang lagi buka buat kamu WFC"
        subtitle={
          loading
            ? "Ngecek cafe yang lagi buka…"
            : `${openNow.length} tempat berjam-terbatas yang lagi buka. Diperbarui real-time — datang sebelum tutup.`
        }
        cafes={openNow}
        loading={loading}
        error={error}
        emptyText="Jam segini yang buka tinggal cafe 24 jam — cek pilihannya di section bawah 👇"
        seeAllLabel="Lihat semua cafe di peta"
      />

      <CafeStrip
        id="cafe-24-jam"
        icon={Moon}
        label="Cafe 24 Jam"
        title="Ngopi & kerja kapan pun, nonstop"
        subtitle={
          loading
            ? "Ngumpulin cafe yang buka nonstop…"
            : `${open24h.length} cafe buka 24 jam — buat lembur, begadang, atau yang butuh tempat jam berapa pun.`
        }
        cafes={open24h}
        loading={loading}
        error={error}
        emptyText="Belum ada cafe 24 jam yang tercatat — cek peta buat lihat semua pilihan."
        seeAllLabel="Lihat cafe 24 jam lainnya"
        night
      />
    </>
  );
}
