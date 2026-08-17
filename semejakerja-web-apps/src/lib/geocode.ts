export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

// Kotak sekitar Purwokerto & sekitarnya (minLon,minLat,maxLon,maxLat) — bias
// hasil pencarian ke area ini tanpa membuang hasil di luar (bounded=0), jadi
// alamat di pinggiran kabupaten tetap ketemu.
const VIEWBOX = '109.05,-7.55,109.45,-7.30';

async function nominatimSearch(q: string): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    q,
    limit: '5',
    countrycodes: 'id',
    viewbox: VIEWBOX,
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('Gagal mencari lokasi, coba lagi');
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  return data.map((d) => ({ lat: Number(d.lat), lng: Number(d.lon), label: d.display_name }));
}

// Nomor rumah ("No.98") bikin Nominatim nggak nemu apa-apa kalau jalan itu
// nggak ditag lengkap sampai level nomor di OSM (dites langsung — bukan
// asumsi) — dibuang di query fallback yang lebih umum.
function stripHouseNumber(text: string): string {
  return text
    .replace(/\bno\.?\s*\d+[a-z]?\b/gi, '')
    .replace(/\bnomor\s*\d+[a-z]?\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*,/g, ',')
    .trim();
}

// Nominatim (OpenStreetMap) — geocoding gratis, tanpa API key/billing.
// Alternatif "tempel link Google Maps" (resolve-maps-link), yang gagal untuk
// link share dari app HP. Bedanya dari pencarian Google: Nominatim cocokin
// query hampir persis ke teks yang sudah ditag di OSM — gabungan "nama cafe +
// alamat lengkap" dalam satu string nyaris selalu nggak ketemu apa-apa kalau
// ada nomor rumah/nama gedung yang nggak ada di data OSM, walau alamatnya
// sendiri sebenarnya valid. Makanya dicoba bertahap dari paling spesifik ke
// paling umum, bukan sekali coba dari string gabungan.
export async function searchAddress(name: string, address: string): Promise<GeocodeResult[]> {
  const trimmedName = name.trim();
  const trimmedAddress = address.trim();

  const firstSegment = stripHouseNumber(trimmedAddress).split(',')[0]?.trim();

  const attempts = [
    trimmedName && `${trimmedName}, Purwokerto`, // nama tempat/landmark yang sudah ditag di OSM
    trimmedAddress, // alamat lengkap apa adanya
    firstSegment && `${firstSegment}, Purwokerto`, // fallback: nama jalan doang, level jalan bukan nomor
  ].filter((q): q is string => Boolean(q));

  for (const q of [...new Set(attempts)]) {
    const results = await nominatimSearch(q);
    if (results.length > 0) return results;
  }
  return [];
}
