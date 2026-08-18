import type { Metadata } from "next";

// The WFC pages (/wfc index + /wfc/register form) are client components, so
// metadata lives in this segment layout (client pages can't export metadata
// in a static export). Gives shared, shareable OG/SEO for the events hub.
export const metadata: Metadata = {
  title: "Event Semeja",
  description:
    "Event komunitas Semeja Kerja di Purwokerto: WFC (Work From Cafe) Bareng Strangers di cafe partner, lomba, dan kumpul komunitas. Daftar gratis, kuota tiap event terbatas.",
  alternates: { canonical: "/wfc" },
  openGraph: { url: "/wfc" },
};

export default function WfcLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
