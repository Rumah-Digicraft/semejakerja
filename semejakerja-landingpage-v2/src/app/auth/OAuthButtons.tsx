"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import GoogleIcon from "../components/GoogleIcon";
import styles from "./auth.module.css";

export default function OAuthButtons({ next }: { next: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // If the user backs out of Google's account screen, the browser restores
  // this page from the bfcache with loading still true — re-enable the button.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setLoading(false);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") setLoading(false);
    };
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError("");

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      next
    )}`;

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    // On success the browser redirects to Google, so we won't return here.
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  };

  return (
    <div className={styles.oauthGroup}>
      {error && <div className={styles.error}>{error}</div>}

      <button
        type="button"
        className={styles.oauthBtn}
        onClick={signInWithGoogle}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Menghubungkan…
          </>
        ) : (
          <>
            <GoogleIcon /> Lanjut dengan Google
          </>
        )}
      </button>
    </div>
  );
}
