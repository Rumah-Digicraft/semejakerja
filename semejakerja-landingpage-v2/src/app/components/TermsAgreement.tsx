"use client";

// Persetujuan Syarat & Ketentuan komunitas.
// - <TermsCheckbox>   : centang wajib di atas tombol bayar (membership, form
//                       event berbayar, Semeja Moves). Link-nya buka modal S&K.
// - <JoinGroupButton> : tombol masuk grup — buka modal S&K dulu, link grup
//                       baru bisa diklik setelah dicentang.
// Persetujuan cuma di client (nggak disimpan ke DB).

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { TERMS_SECTIONS, TERMS_UPDATED_AT, type TermsBlock } from "@/lib/terms";
import styles from "./TermsAgreement.module.css";

function Block({ block }: { block: TermsBlock }) {
  if (block.kind === "p") return <p>{block.text}</p>;
  if (block.kind === "list") {
    return (
      <ul className={styles.list}>
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  return (
    <ol className={styles.numbered}>
      {block.items.map((item) => (
        <li key={item.no}>
          <span className={styles.itemNo}>{item.no}</span>
          <span>{item.text}</span>
        </li>
      ))}
    </ol>
  );
}

// Isi S&K lengkap — dipakai di modal dan halaman /syarat-ketentuan.
export function TermsContent() {
  return (
    <div className={styles.content}>
      {TERMS_SECTIONS.map((section) => (
        <section key={section.no} className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.sectionNo}>{section.no}.</span> {section.title}
          </h3>
          <div className={styles.sectionBody}>
            {section.blocks.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function TermsModal({
  onClose,
  footer,
}: {
  onClose: () => void;
  footer: ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeading}>
            <span className={styles.headerDot} />
            <h2 id={titleId} className={styles.modalTitle}>
              Syarat &amp; Ketentuan Komunitas
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeBtn}
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.notice}>
            Demi kenyamanan bersama, mohon baca dan pahami ketentuan berikut
            sebelum melanjutkan. Terakhir diperbarui: {TERMS_UPDATED_AT}.
          </p>
          <TermsContent />
        </div>

        <div className={styles.modalFooter}>{footer}</div>
      </div>
    </div>,
    document.body
  );
}

function AgreeLabel({
  checked,
  onChange,
  children,
  dark,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <label className={`${styles.agree} ${dark ? styles.agreeDark : ""}`}>
      <input
        type="checkbox"
        className={styles.checkbox}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}

// Centang S&K wajib sebelum bayar. Tombol bayar di pemanggil harus
// disabled selama `checked` masih false.
export function TermsCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AgreeLabel checked={checked} onChange={onChange}>
        Saya telah membaca, memahami, dan menyetujui{" "}
        <button
          type="button"
          className={styles.inlineLink}
          onClick={(e) => {
            e.preventDefault(); // jangan ikut toggle checkbox
            setOpen(true);
          }}
        >
          Syarat &amp; Ketentuan Semeja Kerja
        </button>
        .
      </AgreeLabel>

      {open && (
        <TermsModal
          onClose={() => setOpen(false)}
          footer={
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setOpen(false)}
              >
                Tutup
              </button>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={() => {
                  onChange(true);
                  setOpen(false);
                }}
              >
                Saya Setuju
              </button>
            </div>
          }
        />
      )}
    </>
  );
}

// Tombol masuk grup: buka modal S&K, link grup aktif setelah dicentang.
// Link-nya tetap <a> (bukan window.open) supaya nggak kena popup blocker.
export function JoinGroupButton({
  href,
  className,
  children,
  confirmLabel = "Masuk Grup Sekarang",
}: {
  href: string;
  className?: string;
  children: ReactNode;
  confirmLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const close = () => {
    setOpen(false);
    setAgreed(false);
  };

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>

      {open && (
        <TermsModal
          onClose={close}
          footer={
            <>
              <AgreeLabel checked={agreed} onChange={setAgreed} dark>
                Saya telah membaca, memahami, dan menyetujui seluruh{" "}
                <strong className={styles.accentText}>
                  Syarat &amp; Ketentuan Semeja Kerja
                </strong>
                .
              </AgreeLabel>
              <div className={styles.actions}>
                <button type="button" className={styles.cancelBtn} onClick={close}>
                  Batal
                </button>
                <a
                  href={agreed ? href : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!agreed}
                  className={`${styles.confirmBtn} ${agreed ? "" : styles.confirmDisabled}`}
                  onClick={(e) => {
                    if (!agreed) {
                      e.preventDefault();
                      return;
                    }
                    // Tutup setelah navigasi tab baru jalan — kalau <a>-nya
                    // di-unmount di tengah klik, sebagian browser batalin.
                    setTimeout(close, 0);
                  }}
                >
                  {confirmLabel}
                </a>
              </div>
            </>
          }
        />
      )}
    </>
  );
}

