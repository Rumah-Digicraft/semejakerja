// Build-time prerender: writes dist/cafe/<slug>.html (one per cafe, with
// unique head tags + CafeOrCoffeeShop JSON-LD + a crawlable content block),
// enhances dist/index.html, and generates dist/sitemap.xml.
//
// Runs after `vite build` via `node --experimental-strip-types` (Node >= 22).
// Needs VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY at build time; fails loudly
// without them so a deploy can't silently ship zero cafe pages.
//
// ⚠️ Cloudflare Pages: never add a `/* /index.html 200` _redirects rule —
// redirects beat static assets there and would shadow every page this emits.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { cafeSlug } from '../src/lib/slug.ts';
import { SITE_URL, LANDING_URL, SITE_NAME, DEFAULT_TITLE, DEFAULT_DESCRIPTION, OG_IMAGE, ORG_ID } from '../src/lib/site.ts';

// Raw `cafes` row fields used here (subset of src/types/cafe.ts CafeRow,
// plus the jsonb `facilities` column the app's mapper ignores).
interface Row {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: string | number;
  total_reviews: number;
  price_level: number;
  phone: string | null;
  website: string | null;
  open_hours: string | null;
  weekday_text: string | string[] | null;
  facilities: string | string[] | null;
}

// Mirrors PRICE_RANGE in src/hooks/useCafes.ts (that file imports the Vite
// supabase client, so it can't be imported under Node).
const PRICE_RANGE: Record<number, string> = {
  1: 'Rp 0 - 25.000',
  2: 'Rp 25.000 - 50.000',
  3: 'Rp 50.000 - 150.000',
  4: 'Rp 150.000 - 300.000',
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const distDir = fileURLToPath(new URL('../dist', import.meta.url));

function fail(msg: string): never {
  console.error(`[prerender] FATAL: ${msg}`);
  process.exit(1);
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const jsonLdScript = (data: Record<string, unknown>) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

// ---------- cafe field helpers (defensive, like the app's mapper) ----------

function parseJsonArray(raw: string | string[] | null): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // malformed — treat as absent
    }
  }
  return [];
}

function ratingOf(row: Row): number {
  return parseFloat(String(row.rating)) || 0;
}

function openingHours(row: Row): Record<string, unknown>[] {
  const schedule = parseJsonArray(row.weekday_text);
  if (schedule.length !== 7) return [];
  const specs: Record<string, unknown>[] = [];
  schedule.forEach((text, i) => {
    if (/tutup/i.test(text)) return;
    const m = text.match(/(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})/);
    if (!m) return;
    specs.push({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${DAYS[i]}`,
      opens: `${m[1].padStart(2, '0')}:${m[2]}`,
      closes: `${m[3].padStart(2, '0')}:${m[4]}`,
    });
  });
  return specs;
}

function cafeTitle(row: Row): string {
  return `${row.name} — Cafe WFC di Purwokerto | Semeja Kerja`;
}

function cafeDescription(row: Row): string {
  const parts = [`${row.name}, cafe di ${row.address}.`];
  const rating = ratingOf(row);
  if (rating > 0 && row.total_reviews > 0) {
    parts.push(`Rating ${rating}/5 dari ${row.total_reviews} ulasan.`);
  }
  const price = PRICE_RANGE[row.price_level];
  if (price) parts.push(`Kisaran harga ${price}.`);
  parts.push('Cek fasilitas WFC di Peta Cafe Purwokerto oleh Semeja Kerja.');
  return parts.join(' ');
}

function cafeJsonLd(row: Row, url: string): Record<string, unknown> {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CafeOrCoffeeShop',
    name: row.name,
    url,
    address: {
      '@type': 'PostalAddress',
      streetAddress: row.address,
      addressLocality: 'Purwokerto',
      addressRegion: 'Jawa Tengah',
      addressCountry: 'ID',
    },
    geo: { '@type': 'GeoCoordinates', latitude: row.lat, longitude: row.lng },
  };
  const rating = ratingOf(row);
  if (rating > 0 && row.total_reviews > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating,
      reviewCount: row.total_reviews,
      bestRating: 5,
    };
  }
  const price = PRICE_RANGE[row.price_level];
  if (price) data.priceRange = price;
  if (row.phone) data.telephone = row.phone;
  if (row.website) data.sameAs = [row.website];
  const hours = openingHours(row);
  if (hours.length > 0) data.openingHoursSpecification = hours;
  // facilities jsonb holds Indonesian labels ('WiFi', 'Stopkontak', …) — pass through.
  const facilities = parseJsonArray(row.facilities);
  if (facilities.length > 0) {
    data.amenityFeature = facilities.map(name => ({
      '@type': 'LocationFeatureSpecification',
      name,
      value: true,
    }));
  }
  return data;
}

// ---------- head + body block builders ----------

function headBlock(title: string, description: string, url: string): string {
  return [
    `<title data-seo>${esc(title)}</title>`,
    `<meta data-seo name="description" content="${esc(description)}" />`,
    `<link data-seo rel="canonical" href="${url}" />`,
    `<meta data-seo property="og:type" content="website" />`,
    `<meta data-seo property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta data-seo property="og:locale" content="id_ID" />`,
    `<meta data-seo property="og:title" content="${esc(title)}" />`,
    `<meta data-seo property="og:description" content="${esc(description)}" />`,
    `<meta data-seo property="og:url" content="${url}" />`,
    `<meta data-seo property="og:image" content="${OG_IMAGE}" />`,
    `<meta data-seo name="twitter:card" content="summary_large_image" />`,
    `<meta data-seo name="twitter:title" content="${esc(title)}" />`,
    `<meta data-seo name="twitter:description" content="${esc(description)}" />`,
    `<meta data-seo name="twitter:image" content="${OG_IMAGE}" />`,
  ].join('\n    ');
}

// Crawlable content for no-JS crawlers (most AI bots). Lives OUTSIDE #root —
// createRoot wipes #root on mount — and is removed by main.tsx in browsers.
function cafeSeoContent(row: Row, url: string): string {
  const rating = ratingOf(row);
  const price = PRICE_RANGE[row.price_level];
  const facilities = parseJsonArray(row.facilities);
  const schedule = parseJsonArray(row.weekday_text);
  const items = [
    `Alamat: ${esc(row.address)}`,
    rating > 0 && row.total_reviews > 0 ? `Rating: ${rating}/5 (${row.total_reviews} ulasan)` : null,
    price ? `Kisaran harga: ${esc(price)}` : null,
    row.open_hours ? `Jam buka: ${esc(row.open_hours)}` : null,
    facilities.length > 0 ? `Fasilitas: ${esc(facilities.join(', '))}` : null,
    row.phone ? `Telepon: ${esc(row.phone)}` : null,
  ].filter(Boolean);
  return `<div id="seo-content"><main>
<h1>${esc(row.name)}</h1>
<p>${esc(cafeDescription(row))}</p>
<ul>${items.map(li => `<li>${li}</li>`).join('')}</ul>
${schedule.length === 7 ? `<p>Jadwal: ${esc(schedule.join(' · '))}</p>` : ''}
<p><a href="${url}">${esc(row.name)} di Peta Cafe Purwokerto</a> · <a href="/">Lihat semua cafe WFC di Purwokerto</a> · <a href="${LANDING_URL}">Komunitas Semeja Kerja</a></p>
</main></div>`;
}

function rootSeoContent(top: Row[]): string {
  const links = top
    .map(row => `<li><a href="/cafe/${cafeSlug(row)}">${esc(row.name)}</a></li>`)
    .join('');
  return `<div id="seo-content"><main>
<h1>Peta Cafe Purwokerto — Direktori Cafe WFC oleh Semeja Kerja</h1>
<p>${esc(DEFAULT_DESCRIPTION)}</p>
<h2>Cafe populer di Purwokerto</h2>
<ul>${links}</ul>
<p><a href="${LANDING_URL}">Tentang komunitas Semeja Kerja</a></p>
</main></div>`;
}

// ---------- template plumbing ----------

const START = '<!-- seo:start';
const END = '<!-- seo:end -->';

function renderPage(template: string, head: string, seoContent: string, jsonLd: string[]): string {
  const startIdx = template.indexOf(START);
  const endIdx = template.indexOf(END);
  if (startIdx === -1 || endIdx === -1) fail('seo markers not found in dist/index.html');
  const withHead =
    template.slice(0, startIdx) + head + '\n    ' + jsonLd.join('\n    ') + template.slice(endIdx + END.length);
  return withHead.replace('<div id="root">', `${seoContent}\n    <div id="root">`);
}

// ---------- main ----------

if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  try {
    process.loadEnvFile(fileURLToPath(new URL('../.env.local', import.meta.url)));
  } catch {
    // no .env.local — env must come from the CI environment
  }
}
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  fail('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing — set them in the build environment (use `npm run build:spa` to skip prerendering locally).');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Same query as src/hooks/useCafes.ts, paged past Supabase's 1000-row cap.
const rows: Row[] = [];
const PAGE = 1000;
for (let from = 0; ; from += PAGE) {
  const { data, error } = await supabase
    .from('cafes')
    .select('*')
    .order('total_reviews', { ascending: false })
    .range(from, from + PAGE - 1);
  if (error) fail(`Supabase query failed: ${error.message}`);
  rows.push(...((data ?? []) as Row[]));
  if (!data || data.length < PAGE) break;
}
if (rows.length === 0) fail('cafes query returned 0 rows — refusing to ship an empty directory.');

let template: string;
try {
  template = readFileSync(`${distDir}/index.html`, 'utf8');
} catch {
  fail('dist/index.html not found — run `vite build` first.');
}

// Per-cafe pages → dist/cafe/<slug>.html (flat file: Cloudflare Pages serves
// it at /cafe/<slug> with no trailing-slash redirect).
mkdirSync(`${distDir}/cafe`, { recursive: true });
for (const row of rows) {
  const slug = cafeSlug(row);
  const url = `${SITE_URL}/cafe/${slug}`;
  const html = renderPage(
    template,
    headBlock(cafeTitle(row), cafeDescription(row), url),
    cafeSeoContent(row, url),
    [
      jsonLdScript(cafeJsonLd(row, url)),
      jsonLdScript({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Peta Cafe Purwokerto', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: row.name, item: url },
        ],
      }),
    ],
  );
  writeFileSync(`${distDir}/cafe/${slug}.html`, html);
}

// Root page: same template, enhanced with site-level JSON-LD + a crawlable
// list of top cafes (the crawler's discovery path into /cafe/*).
const topCafes = rows.slice(0, 20);
const rootHtml = renderPage(
  template,
  headBlock(DEFAULT_TITLE, DEFAULT_DESCRIPTION, `${SITE_URL}/`),
  rootSeoContent(topCafes),
  [
    jsonLdScript({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: 'id',
      publisher: { '@id': ORG_ID },
    }),
    jsonLdScript({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': ORG_ID,
      name: 'Semeja Kerja',
      url: LANDING_URL,
      sameAs: [
        'https://instagram.com/semejakerja',
        'https://www.tiktok.com/@semejakerja',
        'https://linktr.ee/semejakerja',
      ],
    }),
    jsonLdScript({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Cafe WFC populer di Purwokerto',
      itemListElement: topCafes.map((row, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: row.name,
        url: `${SITE_URL}/cafe/${cafeSlug(row)}`,
      })),
    }),
  ],
);
writeFileSync(`${distDir}/index.html`, rootHtml);

// sitemap.xml — robots.txt is static in public/ (it never varies per build).
const today = new Date().toISOString().slice(0, 10);
const urlEntry = (loc: string, priority: string) =>
  `  <url><loc>${loc}</loc><lastmod>${today}</lastmod><priority>${priority}</priority></url>`;
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  urlEntry(`${SITE_URL}/`, '1.0'),
  ...rows.map(row => urlEntry(`${SITE_URL}/cafe/${cafeSlug(row)}`, '0.7')),
  '</urlset>',
].join('\n');
writeFileSync(`${distDir}/sitemap.xml`, sitemap);

console.log(`[prerender] OK: ${rows.length} cafe pages + index.html + sitemap.xml → dist/`);
