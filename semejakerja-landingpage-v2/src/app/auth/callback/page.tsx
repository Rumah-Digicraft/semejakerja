"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import styles from "../auth.module.css";

function Callback() {
  const router = useRouter();
  const params = useSearchParams();

  const next = params.get("next") || "/membership";
  // Google/Supabase can bounce back with an error instead of a session.
  const providerError = params.get("error_description") || params.get("error");
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (providerError) return; // nothing to wait for — error shown at render

    const supabase = createClient();
    let redirected = false;
    const go = () => {
      if (!redirected) {
        redirected = true;
        router.replace(next);
      }
    };

    // The browser client (PKCE + detectSessionInUrl) exchanges the ?code= in the
    // URL automatically and fires onAuthStateChange when the session is ready.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) go();
    });

    // Fast-path: already signed in (e.g. landed here while authenticated).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) go();
    });

    const timeout = setTimeout(() => {
      if (!redirected) setTimedOut(true);
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const errorMsg = providerError
    ? providerError
    : timedOut
    ? "Login gagal atau tautan kedaluwarsa. Silakan coba lagi."
    : "";

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        {errorMsg ? (
          <>
            <h1 className={styles.title}>Login Gagal</h1>
            <div className={styles.error}>{errorMsg}</div>
            <div className={styles.footer}>
              <Link href="/auth/login" className={styles.footerLink}>
                Kembali ke halaman Masuk
              </Link>
            </div>
          </>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--space-4)",
              padding: "var(--space-6) 0",
            }}
          >
            <Loader2 size={36} className="animate-spin" />
            <p className={styles.subtitle} style={{ margin: 0 }}>
              Menyelesaikan login…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <Callback />
    </Suspense>
  );
}
