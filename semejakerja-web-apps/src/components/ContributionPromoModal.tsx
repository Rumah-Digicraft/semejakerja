import React from 'react';
import { createPortal } from 'react-dom';
import { X, PlusCircle } from 'lucide-react';

interface ContributionPromoModalProps {
  onClose: () => void;
  onContributeClick: () => void;
}

// Muncul sekali per sesi browser (lihat sessionStorage check di App.tsx) saat
// user pertama kali buka peta — ajakan kontribusi, bukan modal fungsional
// seperti LoginModal/ContributeModal, makanya style-nya sama tapi lebih
// promosional (icon + headline + poin), dan selalu punya jalan keluar yang
// jelas ("Nanti aja") tanpa maksa user login/isi form.
const ContributionPromoModal: React.FC<ContributionPromoModalProps> = ({ onClose, onContributeClick }) => {
  // Portal ke <body>: sama alasannya dengan LoginModal — ancestor ber-
  // backdrop-filter (header glass-panel) bakal jadi containing block buat
  // position:fixed kalau tidak di-portal.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-7 sm:p-8 animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Tutup"
        >
          <X size={18} />
        </button>

        {/* Logo mark Semeja Kerja (public/semejakerja-only-logo.png) — sudah
            punya background bulat sendiri, jadi ditampilkan polos tanpa
            dibungkus kotak warna lagi (beda dari Coffee-icon-di-kotak-ungu
            yang dipakai Header/LoginModal). */}
        <img
          src="/semejakerja-only-logo.png"
          alt="Semeja Kerja"
          className="w-14 h-14 mx-auto mb-4"
        />

        <h2 className="text-lg font-extrabold text-gray-900 leading-snug mb-2">
          Bantu lengkapi peta, kumpulkan poin!
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-3">
          Tambahkan cafe baru <span className="font-semibold text-gray-700">+50</span>, koreksi info yang keliru{' '}
          <span className="font-semibold text-gray-700">+10</span>, atau upload foto{' '}
          <span className="font-semibold text-gray-700">+2</span> poin.
        </p>
        <p className="text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 mb-5">
          🏆 Jadi #1 bulan ini, kami traktir kopi saat WFC 😋.
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onContributeClick}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition-colors shadow-md"
          >
            <PlusCircle size={16} /> Kontribusi Sekarang
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
          >
            Nanti saja
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ContributionPromoModal;
