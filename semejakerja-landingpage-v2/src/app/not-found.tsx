import type { Metadata } from "next";
import Link from "next/link";
import { MAPS_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Halaman Tidak Ditemukan",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div
      className="container"
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: "1rem",
        padding: "6rem 1.5rem",
      }}
    >
      <p style={{ fontSize: "3rem", fontWeight: 800 }}>404</p>
      <h1 style={{ fontSize: "1.5rem" }}>Halaman tidak ditemukan</h1>
      <p style={{ maxWidth: "28rem", opacity: 0.8 }}>
        Halaman yang kamu cari nggak ada atau sudah dipindah. Balik ke beranda
        atau cari cafe buat WFC di peta.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/" className="btn btn--primary">
          Ke Beranda
        </Link>
        <a
          href={MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn"
        >
          Buka Peta Cafe
        </a>
      </div>
    </div>
  );
}
