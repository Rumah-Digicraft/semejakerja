import type { Metadata } from "next";

// Login/register forms — keep out of search indexes.
export const metadata: Metadata = {
  title: "Masuk",
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
