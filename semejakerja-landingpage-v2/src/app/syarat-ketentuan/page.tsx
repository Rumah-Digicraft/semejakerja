import type { Metadata } from "next";
import { FileText } from "lucide-react";
import styles from "./syarat.module.css";
import JsonLd from "../components/JsonLd";
import { TermsContent } from "../components/TermsAgreement";
import { TERMS_UPDATED_AT } from "@/lib/terms";
import { breadcrumbSchema, webPageSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  description:
    "Syarat dan Ketentuan Komunitas Semeja Kerja — etika, ketentuan kegiatan & pendaftaran, privasi, dan sanksi bagi anggota komunitas WFC Purwokerto.",
  alternates: { canonical: "/syarat-ketentuan" },
  openGraph: { url: "/syarat-ketentuan" },
};

export default function SyaratKetentuanPage() {
  return (
    <div className={styles.page}>
      <JsonLd
        data={webPageSchema({
          name: "Syarat & Ketentuan Komunitas Semeja Kerja",
          description:
            "Syarat dan Ketentuan Komunitas Semeja Kerja untuk anggota, peserta kegiatan, dan pengguna situs semejakerja.com.",
          path: "/syarat-ketentuan",
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Semeja Kerja", path: "/" },
          { name: "Syarat & Ketentuan", path: "/syarat-ketentuan" },
        ])}
      />

      <section className={styles.hero}>
        <div className={`container ${styles.heroContent}`}>
          <div className={styles.badge}>
            <FileText size={14} />
            Dokumen Komunitas
          </div>
          <h1 className={styles.title}>Syarat &amp; Ketentuan Komunitas</h1>
          <p className={styles.subtitle}>
            Terakhir diperbarui: {TERMS_UPDATED_AT}
          </p>
        </div>
      </section>

      <section className={styles.body}>
        <div className={`container ${styles.card}`}>
          <TermsContent />
          <p className={styles.signoff}>
            <strong>Semeja Kerja</strong>
            <br />
            Dokumen ini dikelola oleh Admin Semeja Kerja.
          </p>
        </div>
      </section>
    </div>
  );
}
