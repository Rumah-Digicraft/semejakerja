"use client";

import { useEffect, useRef, useState } from "react";
import ScrollReveal from "./ScrollReveal";
import styles from "./GrowthStats.module.css";

interface StatItem {
  value: number;
  suffix: string;
  label: string;
}

const stats: StatItem[] = [
  { value: 500, suffix: "+", label: "Member Komunitas" },
  { value: 30, suffix: "+", label: "Edisi WFC" },
  { value: 5, suffix: "", label: "Kafe Pilihan" },
  { value: 3, suffix: "", label: "Founder" },
];

function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 2000;
          const start = performance.now();

          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {count}{suffix}
    </span>
  );
}

export default function GrowthStats() {
  return (
    <section className={styles.section}>
      <div className={styles.bg} />
      <div className="container" style={{ position: "relative", zIndex: 2 }}>
        <ScrollReveal>
          <div className={styles.header}>
            <p className={styles.label}>Sekarang</p>
            <h2 className={styles.title}>
              Dan ini baru permulaan.
            </h2>
          </div>
        </ScrollReveal>

        <div className={styles.grid}>
          {stats.map((stat, i) => (
            <ScrollReveal key={stat.label} delay={i * 100}>
              <div className={styles.stat}>
                <div className={styles.statNumber}>
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <div className={styles.statLabel}>{stat.label}</div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
