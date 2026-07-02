import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

export const metadata: Metadata = {
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
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
