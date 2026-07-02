"use client";

import { useState } from "react";
import { Camera, X, ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./dokumentasi.module.css";

// Placeholder gallery data — replace with real photos later
const galleryItems = [
  { id: 1, edisi: "Edisi 14", caption: "WFC with Strangers pertama!", color: "hsl(270, 50%, 35%)" },
  { id: 2, edisi: "Edisi 15", caption: "Makin ramai, makin seru", color: "hsl(280, 45%, 40%)" },
  { id: 3, edisi: "Edisi 16", caption: "Basecamp baru di The Soeds", color: "hsl(40, 70%, 45%)" },
  { id: 4, edisi: "Edisi 17", caption: "Weekend vibes", color: "hsl(260, 55%, 30%)" },
  { id: 5, edisi: "Edisi 18", caption: "Networking session", color: "hsl(275, 40%, 45%)" },
  { id: 6, edisi: "Edisi 19", caption: "Full house!", color: "hsl(35, 65%, 50%)" },
  { id: 7, edisi: "Edisi 20", caption: "Milestone edisi 20", color: "hsl(265, 50%, 38%)" },
  { id: 8, edisi: "Edisi 21", caption: "Community growth", color: "hsl(45, 75%, 42%)" },
  { id: 9, edisi: "Edisi 22", caption: "Kolaborasi bareng kafe", color: "hsl(270, 45%, 42%)" },
];

export default function DokumentasiPage() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => setSelectedIndex(index);
  const closeLightbox = () => setSelectedIndex(null);
  const goNext = () => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex + 1) % galleryItems.length);
    }
  };
  const goPrev = () => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex - 1 + galleryItems.length) % galleryItems.length);
    }
  };

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={`container ${styles.heroContent}`}>
          <div className={styles.badge}>
            <Camera size={14} />
            Galeri Komunitas
          </div>
          <h1 className={styles.title}>
            Dokumentasi
            <span className={styles.highlight}> WFC with Strangers</span>
          </h1>
          <p className={styles.subtitle}>
            Setiap sesi punya cerita. Setiap foto punya kenangan.
            Ini dokumentasi perjalanan komunitas Semeja Kerja.
          </p>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className={styles.gallerySection}>
        <div className="container">
          <div className={styles.galleryGrid}>
            {galleryItems.map((item, index) => (
              <button
                key={item.id}
                className={styles.galleryItem}
                onClick={() => openLightbox(index)}
                aria-label={`Lihat foto ${item.edisi}`}
              >
                <div
                  className={styles.galleryPlaceholder}
                  style={{ background: `linear-gradient(135deg, ${item.color}, ${item.color}dd)` }}
                >
                  <Camera size={32} className={styles.galleryPlaceholderIcon} />
                  <span className={styles.galleryPlaceholderText}>Foto segera hadir</span>
                </div>
                <div className={styles.galleryInfo}>
                  <span className={styles.galleryEdisi}>{item.edisi}</span>
                  <p className={styles.galleryCaption}>{item.caption}</p>
                </div>
              </button>
            ))}
          </div>

          <div className={styles.note}>
            <p>📸 Foto-foto dokumentasi sedang dikurasi. Stay tuned untuk update galeri!</p>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {selectedIndex !== null && (
        <div className={styles.lightbox} onClick={closeLightbox}>
          <button
            className={styles.lightboxClose}
            onClick={closeLightbox}
            aria-label="Tutup"
          >
            <X size={24} />
          </button>

          <button
            className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            aria-label="Foto sebelumnya"
          >
            <ChevronLeft size={28} />
          </button>

          <div
            className={styles.lightboxContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={styles.lightboxPlaceholder}
              style={{
                background: `linear-gradient(135deg, ${galleryItems[selectedIndex].color}, ${galleryItems[selectedIndex].color}dd)`,
              }}
            >
              <Camera size={64} className={styles.galleryPlaceholderIcon} />
              <span className={styles.lightboxPlaceholderText}>Foto segera hadir</span>
            </div>
            <div className={styles.lightboxInfo}>
              <span className={styles.lightboxEdisi}>
                {galleryItems[selectedIndex].edisi}
              </span>
              <p className={styles.lightboxCaption}>
                {galleryItems[selectedIndex].caption}
              </p>
            </div>
          </div>

          <button
            className={`${styles.lightboxNav} ${styles.lightboxNext}`}
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            aria-label="Foto berikutnya"
          >
            <ChevronRight size={28} />
          </button>
        </div>
      )}
    </div>
  );
}
