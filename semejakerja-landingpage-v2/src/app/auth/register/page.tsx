"use client";

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import OAuthButtons from "../OAuthButtons";
import styles from "../auth.module.css";

function RegisterForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/membership";

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.logoContainer}>
          <Link href="/">
            <Image
              src="/images/logos/semejakerja-logo-bg.png"
              alt="Semeja Kerja"
              width={160}
              height={44}
              priority
            />
          </Link>
        </div>

        <h1 className={styles.title}>Daftar Komunitas</h1>
        <p className={styles.subtitle}>
          Gabung pakai Google gratis selamanya. Profil bisa kamu lengkapi nanti
          di dashboard member.
        </p>

        <OAuthButtons next={next} />

        <div className={styles.footer}>
          Sudah punya akun?{" "}
          <Link
            href={`/auth/login?next=${encodeURIComponent(next)}`}
            className={styles.footerLink}
          >
            Masuk di sini
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
