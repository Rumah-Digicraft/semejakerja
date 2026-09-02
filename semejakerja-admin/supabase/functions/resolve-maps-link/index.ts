// supabase/functions/resolve-maps-link/index.ts
//
// Kontributor di semejakerja-web-apps paste link share Google Maps (biasanya
// short link "maps.app.goo.gl/xxx"). Short link itu redirect (302) ke URL
// panjang yang mengandung koordinat, tapi browser tidak bisa follow-lalu-baca
// redirect cross-origin itu sendiri (CORS) — makanya perlu di-resolve di
// server. Untuk kasus ini regex koordinat dari URL hasil redirect sudah
// cukup, GRATIS, tidak perlu API berbayar sama sekali — sudah divalidasi
// manual: maps.app.goo.gl/xxx -> ".../place/Marii+Kitchen/@-7.43...,
// 109.24...,16.73z/data=...!3d-7.4358979!4d109.2438387...".
//
// Link share dari APLIKASI Google Maps (HP) beda: redirect-nya berhenti di
// URL yang cuma punya place reference/CID (format "!1s0x...:0x...", contoh
// "!1s0x2e655f100d99f56f:0x2f824a292e2a0db2"), TANPA "@lat,lng" ataupun
// "!3d..!4d.." sama sekali — dites langsung lewat curl terhadap link share
// asli, bukan asumsi. Google merender koordinatnya di client lewat JS (bukan
// di HTML/redirect header), jadi tidak bisa diambil cuma dengan fetch+regex
// seperti kasus web. Untuk kasus INI SAJA — bukan kasus web di atas, yang
// tetap gratis — dipakai Google Places API (Text Search) sebagai fallback:
// nama+alamat tempat yang masih ada di path URL ("/maps/place/Nama+Cafe,+
// Alamat.../data=...") dicari lewat Places API buat dapat lat/lng. Sempat
// dicoba Nominatim (OpenStreetMap, gratis) lebih dulu, tapi gagal konsisten
// untuk bisnis kecil lokal (dites langsung terhadap cafe di task ini,
// nggak ketemu sama sekali) — makanya sengaja pindah ke Places API, TAPI
// dibatasi cuma di jalur fallback ini (butuh 1 API call per link mobile yang
// tidak punya koordinat di URL-nya) supaya biaya tetap minimal; jalur web di
// atas tidak pernah menyentuh API berbayar ini sama sekali.
//
// Butuh secret GOOGLE_PLACES_API_KEY (Google Cloud project dengan "Places
// API (New)" enabled) — set lewat:
//   supabase secrets set GOOGLE_PLACES_API_KEY=xxx
// Kalau secret belum di-set, fallback ini otomatis skip (bukan error) dan
// balik ke pesan "koordinat tidak ditemukan" seperti sebelum ada fallback
// sama sekali — supaya tidak ada perilaku yang rusak sebelum secret di-set.

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

export function isAllowedHost(url: URL): boolean {
  return ALLOWED_HOSTS.test(url.hostname);
}

// Prioritas !3d/!4d (posisi pin persis) di atas @lat,lng (titik tengah
// viewport peta — bisa geser kalau user pernah scroll sebelum share).
export function extractCoords(url: string): { lat: number; lng: number } | null {
  const pin = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (pin) return { lat: Number(pin[1]), lng: Number(pin[2]) };
  const center = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (center) return { lat: Number(center[1]), lng: Number(center[2]) };
  const query = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (query) return { lat: Number(query[1]), lng: Number(query[2]) };
  return null;
}

export function extractName(url: string): string | null {
  const m = url.match(/\/maps\/place\/([^/@]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]).replace(/\+/g, " ").trim() || null;
  } catch {
    return null;
  }
}

// Place reference (feature ID / CID) Google, format "0x<hex>:0x<hex>" — satu-
// satunya identitas tempat yang tersisa di URL hasil resolve link share dari
// app HP (lihat komen atas file). Dikembalikan ke client untuk kemungkinan
// disimpan sebagai identitas kanonik tempat (terpisah dari short link, yang
// bisa berubah/kedaluwarsa dan sengaja TIDAK dipakai sebagai identitas).
export function extractPlaceRef(url: string): string | null {
  const m = url.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i);
  return m ? m[1] : null;
}

// "Nama Cafe, Jl. Alamat, Kelurahan, Kota ..." (hasil extractName utk kasus
// CID selalu begini, karena tidak ada "@lat,lng" yang memotong segmen lebih
// awal) -> pisah nama tempat dari sisa alamatnya, buat input geocodeByName.
export function splitNameAddress(raw: string): { name: string; address: string } {
  const [first, ...rest] = raw.split(",");
  return { name: (first ?? raw).trim(), address: rest.join(",").trim() };
}

// Pusat kota Purwokerto — locationBias di Places Text Search, supaya
// pencarian nama+alamat tidak ke-tarik ke tempat lain di Indonesia yang
// kebetulan namanya mirip (mis. cabang cafe yang sama di kota lain).
const PURWOKERTO_BIAS = { latitude: -7.4229, longitude: 109.234 };
const PURWOKERTO_BIAS_RADIUS_M = 20000;

// Places API (New) Text Search — dipakai KHUSUS untuk kasus link share app
// HP (place-reference-only, lihat komen atas file), tidak pernah dipanggil
// untuk kasus web-link yang sudah dapat @lat,lng gratis dari redirect.
// Field mask sengaja dibatasi ke "places.location" saja (tidak minta nama,
// rating, dll) — field mask lebih luas = tier SKU billing lebih mahal, dan
// kita cuma butuh koordinatnya (nama tempat sudah ada dari extractName).
async function googlePlacesTextSearch(query: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (!apiKey) return null; // secret belum di-set — skip, bukan error fatal

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.location",
      },
      body: JSON.stringify({
        textQuery: query,
        locationBias: { circle: { center: PURWOKERTO_BIAS, radius: PURWOKERTO_BIAS_RADIUS_M } },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { places?: Array<{ location?: { latitude: number; longitude: number } }> };
    const loc = data.places?.[0]?.location;
    if (!loc) return null;
    return { lat: loc.latitude, lng: loc.longitude };
  } catch {
    return null;
  }
}

// Fallback geocoding buat kasus place-reference-only (link share app HP).
// Nama+alamat digabung apa adanya jadi satu query — ini teks yang Google
// sendiri taruh di URL untuk tempat ini, jadi pencarian di database Google
// sendiri (beda dari OSM/Nominatim) hampir selalu ketemu di percobaan
// pertama; sengaja tidak dibikin bertahap-banyak-percobaan seperti versi
// Nominatim sebelumnya, karena tiap percobaan = 1 API call berbayar.
export async function geocodeByNameAddress(name: string, address: string): Promise<{ lat: number; lng: number } | null> {
  const query = [name.trim(), address.trim()].filter(Boolean).join(", ");
  if (!query) return null;
  return googlePlacesTextSearch(query);
}

// Diekspor terpisah dari Deno.serve() di bawah supaya bisa di-exercise
// langsung dari test (index.test.ts) tanpa perlu server HTTP beneran.
export async function handleRequest(req: Request): Promise<Response> {
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
      return jsonResponse({
        ...directCoords,
        name: extractName(current.toString()),
        resolvedUrl: current.toString(),
        placeRef: extractPlaceRef(current.toString()),
      });
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

    const placeRef = extractPlaceRef(resolvedUrl);
    const coords = extractCoords(resolvedUrl);
    if (coords) {
      return jsonResponse({ ...coords, name: extractName(resolvedUrl), resolvedUrl, placeRef });
    }

    // Link share app HP: tidak ada "@lat,lng"/"!3d!4d", cuma place reference
    // (lihat komen atas file). Nama+alamat tempat masih ada di path URL —
    // coba geocode itu lewat Places API sebelum menyerah. `address` dikirim
    // balik ke client (beda dari kasus web di atas, yang URL-nya memang
    // tidak membawa teks alamat sama sekali) supaya form kontributor bisa
    // auto-isi alamat, bukan cuma nama+pin.
    const rawSegment = extractName(resolvedUrl);
    if (rawSegment) {
      const { name, address } = splitNameAddress(rawSegment);
      const geocoded = await geocodeByNameAddress(name, address);
      if (geocoded) {
        return jsonResponse({ ...geocoded, name, address, resolvedUrl, placeRef });
      }
    }

    return jsonResponse(
      { error: "Koordinat tidak ditemukan dari link ini — coba salin ulang link share dari Google Maps, atau geser pin manual" },
      422,
    );
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
}

// import.meta.main: cuma true kalau file ini dijalankan langsung (dyn Supabase
// edge runtime memang begitu) — false kalau di-import sebagai modul (dari
// index.test.ts), jadi test tidak ikut buka server HTTP beneran.
if (import.meta.main) {
  Deno.serve(handleRequest);
}
