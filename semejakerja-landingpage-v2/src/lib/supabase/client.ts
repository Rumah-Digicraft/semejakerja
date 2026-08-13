import { createBrowserClient } from "@supabase/ssr";

// Cookie domain dibagi ke semejakerja.com + semua subdomainnya (termasuk
// kafe.semejakerja.com, map app) supaya sesi login nyambung dua arah tanpa
// perlu login ulang. Sama persis di semejakerja-web-apps/src/lib/supabaseClient.ts
// — JANGAN diterapkan di semejakerja-admin (auth admin harus tetap terisolasi).
// Cuma aktif di domain produksi; localhost/preview tetap cookie host-only.
function cookieOptions() {
  if (typeof window === "undefined") return undefined;
  const host = window.location.hostname;
  return host === "semejakerja.com" || host.endsWith(".semejakerja.com")
    ? { domain: ".semejakerja.com" }
    : undefined;
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: cookieOptions() }
  );
}
