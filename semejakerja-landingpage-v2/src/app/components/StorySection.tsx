"use client";

import { Coffee, MessageCircle, Users, Lightbulb, Rocket } from "lucide-react";
import ScrollReveal from "./ScrollReveal";
import styles from "./StorySection.module.css";

export default function StorySection() {
  return (
    <section className={styles.story} id="cerita">
      {/* Chapter 1: Keresahan */}
      <div className={styles.chapter}>
        <div className="container">
          <ScrollReveal>
            <div className={styles.chapterLabel}>
              <Coffee size={16} />
              <span>Awal Mula</span>
            </div>
          </ScrollReveal>

          <div className={styles.splitLayout}>
            <ScrollReveal className={styles.textSide}>
              <h2 className={styles.chapterTitle}>
                Semuanya dimulai dari
                <span className={styles.highlight}> satu keresahan kecil.</span>
              </h2>
              <div className={styles.storyText}>
                <p>
                  Syifa sering WFC sendirian. Pengen kenalan sama orang di sebelah meja, tapi
                  canggung. Mau ke mushola atau kamar mandi, <strong>takut ninggalin laptop.</strong>
                </p>
                <p>
                  Rasanya WFC kok malah bikin resah? Harusnya ada cara yang lebih asyik untuk kerja
                  di kafe.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200} className={styles.illustrationSide}>
              <div className={styles.illustrationCard}>
                <div className={styles.illustrationIcon}>
                  <MessageCircle size={48} strokeWidth={1.5} />
                </div>
                <p className={styles.illustrationQuote}>
                  &ldquo;Pengen kenalan sama orang di sebelah, tapi... canggung.&rdquo;
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>

      {/* Chapter 2: Pertemuan */}
      <div className={`${styles.chapter} ${styles.chapterAlt}`}>
        <div className="container">
          <ScrollReveal>
            <div className={styles.chapterLabel}>
              <Users size={16} />
              <span>Titik Balik</span>
            </div>
          </ScrollReveal>

          <div className={styles.splitLayout}>
            <ScrollReveal delay={200} className={styles.illustrationSide}>
              <div className={`${styles.illustrationCard} ${styles.illustrationCardPrimary}`}>
                <div className={styles.illustrationIcon}>
                  <Lightbulb size={48} strokeWidth={1.5} />
                </div>
                <p className={styles.illustrationQuote}>
                  &ldquo;Gimana kalau kita bikin komunitas WFC di Purwokerto?&rdquo;
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal className={styles.textSide}>
              <h2 className={styles.chapterTitle}>
                Sampai suatu hari,
                <span className={styles.highlight}> ketemu teman lama di kafe yang sama.</span>
              </h2>
              <div className={styles.storyText}>
                <p>
                  Syifa ketemu <strong>Rohman</strong> di kafe. Mereka WFC bareng, ngobrol, dan berbagi
                  cerita. Ternyata banyak orang yang merasakan hal yang sama, <em>pengen kerja di kafe
                  tapi nggak mau sendirian.</em>
                </p>
                <p>
                  Dari obrolan ringan itu, lahirlah satu ide gila:{" "}
                  <strong>&ldquo;Gimana kalau kita bikin komunitas WFC di Purwokerto?&rdquo;</strong>
                </p>
                <p>
                  Mereka ajak <strong>Aqiel</strong> untuk meramaikan. Dan dimulailah perjalanan{" "}
                  <strong>Semeja Kerja.</strong>
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>

      {/* Chapter 3: Timeline */}
      <div className={styles.chapter}>
        <div className="container">
          <ScrollReveal>
            <div className={styles.chapterLabel}>
              <Rocket size={16} />
              <span>Perjalanan</span>
            </div>
            <h2 className={`${styles.chapterTitle} ${styles.chapterTitleCenter}`}>
              Dari 5 orang,
              <span className={styles.highlight}> jadi gerakan.</span>
            </h2>
          </ScrollReveal>

          <div className={styles.timeline}>
            <div className={styles.timelineLine} />

            <ScrollReveal delay={0}>
              <div className={styles.timelineItem}>
                <div className={styles.timelineDot} />
                <div className={styles.timelineContent}>
                  <span className={styles.timelineEdisi}>Meet-up #1</span>
                  <h3 className={styles.timelineTitle}>5 Orang — Termasuk 3 Founder</h3>
                  <p className={styles.timelineDesc}>
                    Sesi pertama. Masih teman-teman dekat. Tapi di meja yang sama, lahir semangat yang
                    sama.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={150}>
              <div className={styles.timelineItem}>
                <div className={styles.timelineDot} />
                <div className={styles.timelineContent}>
                  <span className={styles.timelineEdisi}>Meet-up #3-11</span>
                  <h3 className={styles.timelineTitle}>4-10 Orang — Temen Ngajak Temen</h3>
                  <p className={styles.timelineDesc}>
                    Mulai ramai. Temen ngajak temennya, temennya ngajak temennya lagi.
                    Snowball effect yang natural.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <div className={styles.timelineItem}>
                <div className={styles.timelineDot} />
                <div className={styles.timelineContent}>
                  <span className={styles.timelineEdisi}>Bulan ke-6</span>
                  <h3 className={styles.timelineTitle}>Konsisten Konten + Sosmed</h3>
                  <p className={styles.timelineDesc}>
                    Iseng bikin akun sosmed, konsisten upload, dan tiba-tiba...{" "}
                    <strong>satu video viral di TikTok & Instagram.</strong>
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={450}>
              <div className={`${styles.timelineItem} ${styles.timelineItemHighlight}`}>
                <div className={`${styles.timelineDot} ${styles.timelineDotAccent}`} />
                <div className={styles.timelineContent}>
                  <span className={styles.timelineEdisi}>Edisi #14</span>
                  <h3 className={styles.timelineTitle}>WFC with Strangers Pertama 🎉</h3>
                  <p className={styles.timelineDesc}>
                    Bukan cuma teman — tapi benar-benar <strong>strangers</strong>. Orang yang belum
                    pernah kenal, duduk semeja, kerja bareng, dan pulang jadi teman baru.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
