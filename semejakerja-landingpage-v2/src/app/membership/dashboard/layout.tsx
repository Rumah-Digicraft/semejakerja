import type { Metadata } from "next";

// Auth-gated member dashboard — keep out of search indexes.
export const metadata: Metadata = {
  title: "Dashboard Member",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
