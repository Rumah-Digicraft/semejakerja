import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dokumentasi",
  description:
    "Galeri dokumentasi kegiatan Semeja Kerja: sesi WFC bareng, Semeja Moves, Talks, dan English di berbagai cafe Purwokerto.",
  alternates: { canonical: "/dokumentasi" },
  openGraph: { url: "/dokumentasi" },
};

export default function DokumentasiLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
