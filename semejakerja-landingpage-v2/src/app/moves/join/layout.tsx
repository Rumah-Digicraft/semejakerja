import type { Metadata } from "next";

// Session sign-up flow — keep out of search indexes.
export const metadata: Metadata = {
  title: "Join Semeja Moves",
  robots: { index: false, follow: false },
};

export default function MovesJoinLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
