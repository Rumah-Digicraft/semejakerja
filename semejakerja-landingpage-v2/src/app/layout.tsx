import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import JsonLd from "./components/JsonLd";
import { organizationSchema, webSiteSchema } from "@/lib/schema";
import { OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Semeja Kerja — Komunitas WFC Bareng Strangers di Purwokerto",
    template: "%s | Semeja Kerja",
  },
  description:
    "Semeja Kerja adalah komunitas WFC (Work From Cafe) di Purwokerto. Gabung gratis, kerja di kafe bareng strangers, perluas networking, dan temukan kafe-kafe terbaik.",
  keywords: [
    "WFC",
    "Work From Cafe",
    "Purwokerto",
    "Semeja Kerja",
    "komunitas",
    "coworking",
    "kafe",
    "networking",
  ],
  icons: {
    icon: "/images/logos/semejakerja-only-logo.png",
  },
  openGraph: {
    title: "Semeja Kerja — Komunitas WFC Bareng Strangers",
    description:
      "500+ member sudah bergabung. Kerja di kafe nggak harus sendirian. Gabung komunitas WFC terbesar di Purwokerto.",
    type: "website",
    locale: "id_ID",
    url: "/",
    siteName: SITE_NAME,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Semeja Kerja — Komunitas WFC Purwokerto",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Semeja Kerja — Komunitas WFC Bareng Strangers",
    description:
      "500+ member sudah bergabung. Kerja di kafe nggak harus sendirian. Gabung komunitas WFC terbesar di Purwokerto.",
    images: [OG_IMAGE],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>
        <JsonLd data={organizationSchema()} />
        <JsonLd data={webSiteSchema()} />
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
