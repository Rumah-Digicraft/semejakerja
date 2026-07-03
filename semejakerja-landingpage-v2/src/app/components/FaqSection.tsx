import ScrollReveal from "./ScrollReveal";
import { faqIntro, homeFaqs } from "@/lib/faq";
import styles from "./FaqSection.module.css";

// Server component — the Q&A text ships in the static HTML (crawlable by
// search/AI engines). Accordion behavior comes from native <details>, no JS.
export default function FaqSection() {
  return (
    <section className={styles.section} id="faq">
      <div className="container">
        <ScrollReveal>
          <div className={styles.header}>
            <p className={styles.label}>FAQ</p>
            <h2 className={styles.title}>
              Sering
              <span className={styles.highlight}> ditanyakan.</span>
            </h2>
            <p className={styles.subtitle}>{faqIntro}</p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className={styles.list}>
            {homeFaqs.map((faq, i) => (
              <details key={faq.q} className={styles.item} open={i === 0}>
                <summary className={styles.question}>
                  <h3 className={styles.questionText}>{faq.q}</h3>
                  <span className={styles.chevron} aria-hidden>
                    +
                  </span>
                </summary>
                <p className={styles.answer}>{faq.a}</p>
              </details>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
