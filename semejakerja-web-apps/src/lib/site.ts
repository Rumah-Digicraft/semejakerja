// Site-wide SEO constants, shared by <Seo/> and scripts/prerender.ts
// (imported by Node type stripping — keep dependency-free).

export const SITE_URL = 'https://kafe.semejakerja.com';
export const LANDING_URL = 'https://semejakerja.com';

export const SITE_NAME = 'Peta Cafe Purwokerto — Semeja Kerja';

export const DEFAULT_TITLE = 'Peta Cafe Purwokerto - By Semeja Kerja';
export const DEFAULT_DESCRIPTION =
  'Temukan cafe terbaik untuk WFC di Purwokerto: 350+ cafe dengan rating, jam buka, kisaran harga, dan fasilitas seperti Wi-Fi, colokan, dan mushola. Oleh komunitas Semeja Kerja.';

export const OG_IMAGE = `${SITE_URL}/og-maps.png`;

// Same @id as the landing page's Organization JSON-LD — links both domains
// to one entity for search/AI engines.
export const ORG_ID = `${LANDING_URL}/#organization`;
