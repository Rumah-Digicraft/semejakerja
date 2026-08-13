import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
  );
}

// Cookie (bukan localStorage) + domain dibagi ke semejakerja.com + semua
// subdomainnya, supaya sesi login nyambung dua arah dengan landing page
// (semejakerja.com) tanpa perlu login ulang di sini (kafe.semejakerja.com).
// Sama persis di semejakerja-landingpage-v2/src/lib/supabase/client.ts —
// JANGAN diterapkan ke semejakerja-admin (auth admin harus tetap terisolasi).
// Cuma aktif di domain produksi; localhost/preview tetap cookie host-only.
function cookieOptions() {
  const host = window.location.hostname;
  return host === 'semejakerja.com' || host.endsWith('.semejakerja.com')
    ? { domain: '.semejakerja.com' }
    : undefined;
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookieOptions: cookieOptions(),
});
