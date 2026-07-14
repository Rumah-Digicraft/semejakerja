// Single source of truth for site-wide SEO constants.
// Used by layout metadata, robots.ts, sitemap.ts, and JSON-LD builders.

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://semejakerja.com";

export const MAPS_URL = "https://kafe.semejakerja.com";

export const SITE_NAME = "Semeja Kerja";

// Stable schema.org entity id — the maps app references this same @id so
// search/AI engines link both domains to one organization.
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export const SOCIALS = [
  "https://instagram.com/semejakerja",
  "https://www.tiktok.com/@semejakerja",
  "https://linktr.ee/semejakerja",
];

export const WHATSAPP = "https://wa.me/6281325392452";

export const LOGO_PATH = "/images/logos/semejakerja-only-logo.png";

// TODO: replace with a dedicated 1200x630 social card (public/images/og/og-default.png)
// once the asset is ready; the logo is an interim fallback.
export const OG_IMAGE = "/images/logos/semejakerja-logo-bg.png";
