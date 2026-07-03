import type { Cafe } from '../types/cafe';
import { cafeSlug } from './slug';
import { SITE_URL } from './site';

// SEO strings/JSON-LD for a cafe, built from the mapped UI model. Used by
// <Seo/> during SPA navigation; scripts/prerender.ts builds the richer
// build-time variant from raw rows — keep titles/descriptions in sync.

export function cafeTitle(cafe: Cafe): string {
  return `${cafe.name} — Cafe WFC di Purwokerto | Semeja Kerja`;
}

export function cafeDescription(cafe: Cafe): string {
  const parts = [`${cafe.name}, cafe di ${cafe.address}.`];
  if (cafe.rating > 0 && cafe.reviewCount > 0) {
    parts.push(`Rating ${cafe.rating}/5 dari ${cafe.reviewCount} ulasan.`);
  }
  if (cafe.priceRange && !cafe.priceRange.startsWith('Belum')) {
    parts.push(`Kisaran harga ${cafe.priceRange}.`);
  }
  parts.push('Cek fasilitas WFC di Peta Cafe Purwokerto oleh Semeja Kerja.');
  return parts.join(' ');
}

export function cafeCanonicalPath(cafe: Cafe): string {
  return `/cafe/${cafeSlug(cafe)}`;
}

export function cafeJsonLd(cafe: Cafe): Record<string, unknown> {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CafeOrCoffeeShop',
    name: cafe.name,
    url: `${SITE_URL}${cafeCanonicalPath(cafe)}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: cafe.address,
      addressLocality: 'Purwokerto',
      addressRegion: 'Jawa Tengah',
      addressCountry: 'ID',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: cafe.lat,
      longitude: cafe.lng,
    },
  };
  if (cafe.rating > 0 && cafe.reviewCount > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: cafe.rating,
      reviewCount: cafe.reviewCount,
      bestRating: 5,
    };
  }
  if (cafe.priceRange && !cafe.priceRange.startsWith('Belum')) {
    data.priceRange = cafe.priceRange;
  }
  if (cafe.phone) data.telephone = cafe.phone;
  if (cafe.website) data.sameAs = [cafe.website];
  return data;
}
