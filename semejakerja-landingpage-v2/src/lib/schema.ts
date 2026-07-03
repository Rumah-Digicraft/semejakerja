// JSON-LD (schema.org) builders. Rendered via <JsonLd /> so the markup
// lands in the statically exported HTML.

import {
  LOGO_PATH,
  MAPS_URL,
  ORG_ID,
  SITE_NAME,
  SITE_URL,
  SOCIALS,
  WEBSITE_ID,
  WHATSAPP,
} from "./seo";

export type Schema = Record<string, unknown>;

export function organizationSchema(): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}${LOGO_PATH}`,
    description:
      "Komunitas WFC (Work From Cafe) di Purwokerto. Tempat mencari Teman Semeja — teman produktif untuk kerja, nugas, dan belajar bareng di cafe.",
    sameAs: [...SOCIALS, MAPS_URL],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      url: WHATSAPP,
      availableLanguage: "id",
    },
    location: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Purwokerto",
        addressRegion: "Jawa Tengah",
        addressCountry: "ID",
      },
    },
    subOrganization: [
      subCommunity("Semeja Moves", "Olahraga bareng komunitas: padel, badminton, dan funminton."),
      subCommunity("Semeja Talks", "Seminar dan workshop komunitas untuk berbagi ilmu dan pengalaman."),
      subCommunity("Semeja English", "Klub belajar Bahasa Inggris bareng komunitas."),
    ],
  };
}

function subCommunity(name: string, description: string): Schema {
  return {
    "@type": "Organization",
    name,
    description,
    parentOrganization: { "@id": ORG_ID },
  };
}

export function webSiteSchema(): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "id",
    publisher: { "@id": ORG_ID },
  };
}

export interface Faq {
  q: string;
  a: string;
}

export function faqPageSchema(faqs: Faq[]): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };
}

export function webPageSchema({
  name,
  description,
  path,
}: {
  name: string;
  description: string;
  path: string;
}): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url: `${SITE_URL}${path}`,
    inLanguage: "id",
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORG_ID },
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}
