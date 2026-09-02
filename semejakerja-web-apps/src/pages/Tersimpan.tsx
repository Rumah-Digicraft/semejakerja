import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, LogIn, Loader2, MapPin, Star } from 'lucide-react';
import Seo from '../components/Seo';
import { LoginModal } from '../components/LoginModal';
import { useAuth } from '../hooks/useAuth';
import { useCafes } from '../hooks/useCafes';
import { useSavedCafes } from '../hooks/useSavedCafes';
import { cafeSlug } from '../lib/slug';
import type { Cafe } from '../types/cafe';

function SavedCafesList({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { cafes } = useCafes();
  const { data: entries, isLoading, error } = useSavedCafes(userId);

  const cafeById = useMemo(() => {
    const map = new Map<string, Cafe>();
    for (const cafe of cafes) map.set(cafe.id, cafe);
    return map;
  }, [cafes]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }
  if (error) {
    return <p className="text-sm text-red-500 text-center py-4">Gagal memuat cafe tersimpan.</p>;
  }
  if (!entries || entries.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        Belum ada cafe tersimpan. Tap ikon bookmark di halaman detail cafe buat nyimpen ke sini.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map(entry => {
        const cafe = cafeById.get(entry.cafeId);
        if (!cafe) return null;
        return (
          <button
            key={entry.id}
            onClick={() => navigate(`/cafe/${cafeSlug(cafe)}`)}
            className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-gray-50/80 border border-gray-100 text-left hover:bg-purple-50/60 transition-colors"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: cafe.logoColor + '20', color: cafe.logoColor }}
            >
              <MapPin size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-gray-900 truncate">{cafe.name}</h4>
              <p className="text-xs text-gray-500 truncate mt-0.5">{cafe.address}</p>
            </div>
            <div className="flex items-center gap-1 text-yellow-500 text-[10px] font-bold flex-shrink-0">
              <Star size={10} fill="currentColor" /> {cafe.rating}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function Tersimpan() {
  const { user, signInWithGoogle } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="relative w-screen min-h-dvh overflow-y-auto bg-[#e9ecef]">
      <Seo
        title="Cafe Tersimpan | Semeja Kerja"
        description="Daftar cafe yang kamu simpan di Peta Cafe Purwokerto."
        path="/tersimpan"
        noindex
      />

      <header className="sticky top-0 z-50 glass-panel rounded-none flex items-center gap-3 px-4 py-3 sm:px-8 sm:py-5 shadow-lg">
        <Link
          to="/"
          title="Kembali ke peta"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-white/80 border border-white/90 shadow-sm hover:bg-white transition-colors flex-shrink-0"
        >
          <ArrowLeft size={17} className="text-purple-600" />
        </Link>
        <div className="flex items-center gap-2">
          <Bookmark size={20} className="text-purple-600" />
          <div className="flex flex-col leading-tight">
            <span className="font-extrabold text-gray-900 text-sm sm:text-base">Tersimpan</span>
            <span className="text-[11px] text-gray-500 hidden sm:block">Cafe yang kamu simpan</span>
          </div>
        </div>
      </header>

      {/* pb-24: clears the mobile bottom nav (BottomNav.tsx) which floats
          fixed at the very bottom of the viewport on this page too. */}
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 md:pb-8">
        <div className="glass-panel rounded-3xl shadow-xl p-6 sm:p-8">
          {user ? (
            <SavedCafesList userId={user.id} />
          ) : (
            <div className="flex flex-col items-center text-center gap-4 py-6">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center shadow-sm">
                <Bookmark size={22} className="text-purple-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-gray-900">Masuk untuk Lihat Cafe Tersimpan</p>
                <p className="text-xs font-medium text-gray-500 leading-relaxed max-w-xs">
                  Simpan cafe favoritmu dan buka lagi di sini kapan saja.
                </p>
              </div>
              <button
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 text-white text-sm font-bold shadow-md shadow-purple-500/30 hover:shadow-purple-500/50 hover:-translate-y-0.5 transition-all"
              >
                <LogIn size={15} /> Masuk
              </button>
            </div>
          )}
        </div>
      </div>

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSignInWithGoogle={signInWithGoogle}
        />
      )}
    </div>
  );
}
