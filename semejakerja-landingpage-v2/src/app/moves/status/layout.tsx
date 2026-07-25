import type { Metadata } from "next";

// Payment status/return page — keep out of search indexes.
export const metadata: Metadata = {
  title: "Status Pembayaran Semeja Moves",
  robots: { index: false, follow: false },
};

export default function MovesStatusLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
