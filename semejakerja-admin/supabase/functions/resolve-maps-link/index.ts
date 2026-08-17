// supabase/functions/resolve-maps-link/index.ts
//
// Kontributor di semejakerja-web-apps paste link share Google Maps (biasanya
// short link "maps.app.goo.gl/xxx"). Short link itu redirect (302) ke URL
// panjang yang mengandung koordinat, tapi browser tidak bisa follow-lalu-baca
// redirect cross-origin itu sendiri (CORS) — makanya perlu di-resolve di
// server. Sengaja TIDAK pakai Google Geocoding/Places API (berbayar, perlu
// API key) — cukup ikuti redirect HTTP & regex koordinat dari URL hasilnya,
// gratis dan sudah divalidasi manual: maps.app.goo.gl/xxx -> ".../place/
// Marii+Kitchen/@-7.43...,109.24...,16.73z/data=...!3d-7.4358979!4d109.2438387...".

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Cuma domain Google Maps yang boleh di-fetch dari sini — bukan proxy fetch
// serbaguna (jaga-jaga dari user iseng nyuruh server ini fetch URL internal).
const ALLOWED_HOSTS = /(^|\.)google\.[a-z.]+$|(^|\.)goo\.gl$/i;

function isAllowedHost(url: URL): boolean {
  return ALLOWED_HOSTS.test(url.hostname);
}

// Prioritas !3d/!4d (posisi pin persis) di atas @lat,lng (titik tengah
// viewport peta — bisa geser kalau user pernah scroll sebelum share).
function extractCoords(url: string): { lat: number; lng: number } | null {
  const pin = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (pin) return { lat: Number(pin[1]), lng: Number(pin[2]) };
  const center = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (center) return { lat: Number(center[1]), lng: Number(center[2]) };
  const query = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (query) return { lat: Number(query[1]), lng: Number(query[2]) };
  return null;
}

function extractName(url: string): string | null {
  const m = url.match(/\/maps\/place\/([^/@]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]).replace(/\+/g, " ").trim() || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { url: rawUrl } = await req.json();
    if (!rawUrl || typeof rawUrl !== "string") {
      return jsonResponse({ error: "Link Google Maps wajib diisi" }, 400);
    }

    let current: URL;
    try {
      current = new URL(rawUrl);
    } catch {
      return jsonResponse({ error: "Link tidak valid" }, 400);
    }
    if (!isAllowedHost(current)) {
      return jsonResponse({ error: "Cuma link Google Maps (google.com / goo.gl) yang bisa diproses" }, 400);
    }

    // Fast path: link sudah "expanded" dan koordinatnya sudah ada di URL
    // apa adanya — tidak perlu fetch sama sekali.
    const directCoords = extractCoords(current.toString());
    if (directCoords) {
      return jsonResponse({ ...directCoords, name: extractName(current.toString()), resolvedUrl: current.toString() });
    }

    // Ikuti redirect manual (short link -> URL panjang) sampai maks 5 hop,
    // berhenti kalau keluar dari domain Google Maps di tengah jalan.
    let resolvedUrl = current.toString();
    for (let hop = 0; hop < 5; hop++) {
      let res: Response;
      try {
        res = await fetch(current.toString(), { redirect: "manual", signal: AbortSignal.timeout(8000) });
      } catch {
        break;
      }
      if (res.status < 300 || res.status >= 400) {
        resolvedUrl = current.toString();
        break;
      }
      const location = res.headers.get("location");
      if (!location) break;
      try {
        current = new URL(location, current);
      } catch {
        break;
      }
      if (!isAllowedHost(current)) break;
      resolvedUrl = current.toString();
    }

    const coords = extractCoords(resolvedUrl);
    if (!coords) {
      return jsonResponse(
        { error: "Koordinat tidak ditemukan dari link ini — coba salin ulang link share dari Google Maps, atau geser pin manual" },
        422,
      );
    }

    return jsonResponse({ ...coords, name: extractName(resolvedUrl), resolvedUrl });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
