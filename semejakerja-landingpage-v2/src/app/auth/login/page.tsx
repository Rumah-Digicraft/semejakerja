"use client";

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import OAuthButtons from "../OAuthButtons";
import styles from "../auth.module.css";

function LoginForm() {
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

        <h1 className={styles.title}>Selamat Datang Kembali</h1>
        <p className={styles.subtitle}>
          Masuk ke akun Semeja Kerja kamu untuk lanjut WFC bareng.
        </p>

        <OAuthButtons next={next} />

        <div className={styles.footer}>
          Dengan masuk, kamu setuju dengan ketentuan komunitas Semeja Kerja.
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
