import type { Metadata } from "next";

// The WFC pages (/wfc index + /wfc/register form) are client components, so
// metadata lives in this segment layout (client pages can't export metadata
// in a static export). Gives shared, shareable OG/SEO for the events hub.
export const metadata: Metadata = {
  title: "Event WFC Bareng Strangers",
  description:
    "Ikut event WFC (Work From Cafe) Bareng Strangers dari Semeja Kerja — kerja bareng orang baru di cafe partner di Purwokerto, dapat diskon, dan perluas networking.",
  alternates: { canonical: "/wfc" },
  openGraph: { url: "/wfc" },
};

export default function WfcLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
