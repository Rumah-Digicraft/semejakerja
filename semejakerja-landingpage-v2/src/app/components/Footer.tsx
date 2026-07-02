import Link from "next/link";
import Image from "next/image";
import styles from "./Footer.module.css";

function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

const quickLinks = [
  { href: "/", label: "Beranda" },
  { href: "/maps", label: "Maps Kafe" },
  { href: "/moves", label: "Semeja Moves" },
  { href: "/membership", label: "Membership" },
  { href: "/dokumentasi", label: "Dokumentasi WFC" },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        {/* Top row */}
        <div className={styles.top}>
          {/* Brand */}
          <div className={styles.brand}>
            <Image
              src="/images/logos/semejakerja-logo.png"
              alt="Semeja Kerja"
              width={160}
              height={44}
              className={styles.logo}
            />
            <p className={styles.brandDesc}>
              Komunitas WFC (Work From Cafe) Bareng Strangers di Purwokerto.
              Bekerja bersama, tumbuh bersama.
            </p>
          </div>

          {/* Quick Links */}
          <div className={styles.linksGroup}>
            <h4 className={styles.linksTitle}>Menu</h4>
            <ul className={styles.linksList}>
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={styles.link}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social & Contact */}
          <div className={styles.linksGroup}>
            <h4 className={styles.linksTitle}>Terhubung</h4>
            <div className={styles.socialRow}>
              <a
                href="https://instagram.com/semejakerja"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialLink}
                aria-label="Instagram Semeja Kerja"
              >
                <InstagramIcon size={20} />
                <span>Instagram</span>
              </a>
              <a
                href="https://www.tiktok.com/@semejakerja"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialLink}
                aria-label="TikTok Semeja Kerja"
              >
                <Image
                  src="/images/icons/ic-tiktok.png"
                  alt=""
                  width={20}
                  height={20}
                  className={styles.tiktokIcon}
                />
                <span>TikTok</span>
              </a>
            </div>
            <a
              href="https://linktr.ee/semejakerja"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
              style={{ marginTop: "var(--space-3)" }}
            >
              🌿 Linktree
            </a>
          </div>
        </div>

        {/* Divider */}
        <div className={styles.divider} />

        {/* Bottom */}
        <div className={styles.bottom}>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} Semeja Kerja. Komunitas WFC Purwokerto.
          </p>
          <p className={styles.credit}>
            Crafted with ☕ by Rumah Digicraft
          </p>
        </div>
      </div>
    </footer>
  );
}
