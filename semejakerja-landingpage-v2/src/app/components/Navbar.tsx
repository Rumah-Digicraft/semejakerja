"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, User as UserIcon, LogOut, LayoutDashboard, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import styles from "./Navbar.module.css";

type NavChild = { href: string; label: string; emoji: string; desc: string };
type NavLink =
  | { href: string; label: string; children?: undefined }
  | { label: string; children: NavChild[]; href?: undefined };

const navLinks: NavLink[] = [
  { href: "/", label: "Beranda" },
  { href: "/maps", label: "Maps Kafe" },
  {
    label: "Semeja Activity",
    children: [
      { href: "/moves", label: "Semeja Moves", emoji: "🎾", desc: "Olahraga bareng — padel & badminton" },
      { href: "/talks", label: "Semeja Talks", emoji: "🎤", desc: "Seminar & workshop scale-up" },
      { href: "/english", label: "Semeja English", emoji: "💬", desc: "Klub belajar English mingguan" },
    ],
  },
  { href: "/membership", label: "Membership" },
  // { href: "/dokumentasi", label: "Dokumentasi WFC" }, // di-hide sementara — jangan dihapus
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowProfileMenu(false);
    router.refresh();
  };

  // Close mobile menu on route change
  useEffect(() => {
    const id = requestAnimationFrame(() => setIsOpen(false));
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo} aria-label="Semeja Kerja Home">
          <Image
            src="/images/logos/semejakerja-logo.png"
            alt="Semeja Kerja"
            width={160}
            height={44}
            className={styles.logoImg}
            priority
          />
        </Link>

        {/* Desktop Nav */}
        <nav className={styles.desktopNav}>
          {navLinks.map((link) =>
            link.children ? (
              <div key={link.label} className={styles.dropdown}>
                <button
                  type="button"
                  className={`${styles.navLink} ${styles.dropdownTrigger} ${
                    link.children.some((c) => c.href === pathname) ? styles.navLinkActive : ""
                  }`}
                  aria-haspopup="true"
                >
                  {link.label}
                  <ChevronDown size={14} className={styles.dropdownChevron} />
                </button>
                <div className={styles.dropdownMenu}>
                  {link.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={styles.dropdownItem}
                    >
                      <span className={styles.dropdownItemEmoji}>{child.emoji}</span>
                      <span className={styles.dropdownItemText}>
                        <span className={styles.dropdownItemLabel}>{child.label}</span>
                        <span className={styles.dropdownItemDesc}>{child.desc}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navLink} ${
                  pathname === link.href ? styles.navLinkActive : ""
                }`}
              >
                {link.label}
              </Link>
            )
          )}
          
          {user ? (
            <div style={{ position: "relative" }}>
              <button
                className={`btn btn--ghost btn--small ${styles.profileBtn}`}
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                style={{ display: "flex", gap: "8px", alignItems: "center", backgroundColor: "rgba(255,255,255,0.08)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.4)" }}
              >
                <UserIcon size={16} />
                <span style={{ maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.user_metadata?.full_name || "Member"}
                </span>
              </button>
              
              {showProfileMenu && (
                <div className={styles.profileMenu}>
                  <Link
                    href="/membership/dashboard"
                    onClick={() => setShowProfileMenu(false)}
                    className={styles.profileMenuItem}
                  >
                    <LayoutDashboard size={16} /> Dashboard Saya
                  </Link>
                  <div className={styles.profileMenuDivider} />
                  <button
                    onClick={handleLogout}
                    className={styles.profileMenuItem}
                  >
                    <LogOut size={16} /> Keluar
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth/register"
              className={`btn btn--primary btn--small ${styles.ctaBtn}`}
            >
              Gabung Gratis
            </Link>
          )}
        </nav>

        {/* Mobile Toggle */}
        <button
          className={styles.menuToggle}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={`${styles.mobileOverlay} ${isOpen ? styles.overlayOpen : ""}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Mobile Menu */}
      <nav className={`${styles.mobileNav} ${isOpen ? styles.mobileNavOpen : ""}`}>
        <div className={styles.mobileNavInner}>
          {navLinks.map((link, i) =>
            link.children ? (
              <div
                key={link.label}
                className={styles.mobileGroup}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className={styles.mobileGroupLabel}>{link.label}</span>
                {link.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={`${styles.mobileSubLink} ${
                      pathname === child.href ? styles.mobileLinkActive : ""
                    }`}
                  >
                    <span aria-hidden>{child.emoji}</span> {child.label}
                  </Link>
                ))}
              </div>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.mobileLink} ${
                  pathname === link.href ? styles.mobileLinkActive : ""
                }`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {link.label}
              </Link>
            )
          )}
          
          {user ? (
            <>
              <Link
                href="/membership/dashboard"
                className={`${styles.mobileLink}`}
                style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}
              >
                <LayoutDashboard size={18} /> Dashboard Saya
              </Link>
              <button
                onClick={handleLogout}
                className={`btn btn--ghost ${styles.mobileCta}`}
                style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "white", marginTop: "16px" }}
              >
                <LogOut size={18} /> Keluar dari {user.user_metadata?.full_name || "Member"}
              </button>
            </>
          ) : (
            <Link
              href="/auth/register"
              className={`btn btn--primary ${styles.mobileCta}`}
            >
              Gabung Komunitas — Gratis!
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
