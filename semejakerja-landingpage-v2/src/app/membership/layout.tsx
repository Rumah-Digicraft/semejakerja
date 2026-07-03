import type { Metadata } from "next";

// The membership pages are client components, so metadata lives in this
// segment layout (client pages can't export metadata in a static export).
export const metadata: Metadata = {
  title: "Membership",
  description:
    "Pilih membership Semeja Kerja: Nyantai (gratis selamanya), Nongkrong (akses Maps lengkap & diskon 10% di cafe mitra), atau Mode Serius (fitur lengkap + benefit Semeja Moves).",
  alternates: { canonical: "/membership" },
  openGraph: { url: "/membership" },
};

export default function MembershipLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
