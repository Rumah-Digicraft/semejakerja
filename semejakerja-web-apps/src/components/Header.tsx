import React, { useState } from 'react';
import { Coffee, MapPin, Users, ArrowRight, SlidersHorizontal, X, LogIn, LogOut, Crown } from 'lucide-react';
import { useAuth, type MembershipTier } from '../hooks/useAuth';
import { LoginModal } from './LoginModal';

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const TIER_LABEL: Record<MembershipTier, string> = {
  nyantai: 'Nyantai',
  nongkrong: 'Nongkrong',
  mode_serius: 'Mode Serius',
};

const TIER_BADGE: Record<MembershipTier, string> = {
  nyantai: 'bg-gray-100 text-gray-600 border-gray-200',
  nongkrong: 'bg-purple-100 text-purple-600 border-purple-200',
  mode_serius: 'bg-amber-100 text-amber-600 border-amber-200',
};

const Header: React.FC<HeaderProps> = ({ sidebarOpen, onToggleSidebar }) => {
  const [showCommunity, setShowCommunity] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const { user, profile, signInWithGoogle, signOut, landingUrl } = useAuth();

  const initial =
    (profile?.fullName || user?.email || 'S').trim().charAt(0).toUpperCase();

  return (
    <header className="absolute top-3 left-3 right-3 sm:top-6 sm:left-6 sm:right-6 z-50 glass-panel rounded-2xl sm:rounded-3xl flex items-center justify-between px-4 py-3 sm:px-8 sm:py-5 shadow-lg">
      {/* Left: Sidebar toggle (mobile) + Logo */}
      <div className="flex items-center gap-3 sm:gap-5">
        {/* Filter toggle button (all screen sizes) */}
        <button
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Sembunyikan filter' : 'Tampilkan filter'}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm relative"
          style={{
            background: sidebarOpen ? '#f3e8ff' : 'rgba(255,255,255,0.8)',
            border: sidebarOpen ? '1px solid #d8b4fe' : '1px solid rgba(255,255,255,0.9)',
          }}
        >
          {sidebarOpen
            ? <X size={18} className="text-purple-600" />
            : <SlidersHorizontal size={18} className="text-purple-600" />
          }
        </button>

        {/* Logo */}
        <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-purple-600 flex items-center justify-center shadow-md shadow-purple-500/20 flex-shrink-0">
          <Coffee size={18} color="white" className="sm:hidden" />
          <Coffee size={24} color="white" className="hidden sm:block" />
        </div>
        <div className="flex flex-col gap-0.5 sm:gap-1.5">
          <h1 className="text-gray-900 font-extrabold text-base sm:text-xl leading-tight tracking-tight">
            <span className="hidden sm:inline">Peta Cafe Purwokerto</span>
            <span className="sm:hidden">Cafe Purwokerto</span>
          </h1>
          <p className="text-purple-600 text-xs font-bold">By Semeja Kerja</p>
        </div>
      </div>

      {/* Center badge — hidden on small screens */}
      <div className="hidden lg:flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/60 border border-white/80 shadow-sm text-gray-700 text-base font-bold">
        <MapPin size={18} className="text-purple-600" />
        Purwokerto, Jawa Tengah
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3 sm:gap-5">
        {/* Komunitas Hover Container — hidden on small, visible md+ */}
        <div
          className="relative hidden md:block"
          onMouseEnter={() => setShowCommunity(true)}
          onMouseLeave={() => setShowCommunity(false)}
        >
          <div className="flex items-center gap-2.5 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-white/60 hover:bg-white border border-white/80 cursor-pointer transition-all shadow-sm group">
            <Users size={18} className="text-purple-600 group-hover:scale-110 transition-transform" />
            <span className="text-sm sm:text-base font-bold text-gray-800">Komunitas</span>
          </div>

          {showCommunity && (
            <div className="absolute top-full right-0 pt-5 z-50 cursor-default">
              <div className="w-[340px] sm:w-[400px] rounded-3xl glass-panel p-7 sm:p-8 animate-fade-in shadow-2xl border border-purple-100/50">
                <div className="flex items-start gap-4 sm:gap-5 mb-5 sm:mb-6">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Users size={20} className="text-purple-600" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-gray-900 font-extrabold text-sm sm:text-base flex items-center gap-2">
                      Semeja Kerja Community
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200">Free</span>
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed font-medium">
                      Bergabung dengan ratusan member, akses diskon eksklusif di cafe mitra kami.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-5 sm:gap-6 mb-7 sm:mb-8">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm font-semibold text-gray-500"><strong className="text-gray-900 font-extrabold">500+</strong> Member</span>
                  </div>
                  <div className="w-px h-6 bg-gray-200" />
                  <div className="flex items-center gap-2.5">
                    <MapPin size={14} className="text-purple-500" />
                    <span className="text-sm font-semibold text-gray-500"><strong className="text-gray-900 font-extrabold">5</strong> Mitra</span>
                  </div>
                </div>
                <button className="w-full flex items-center justify-center gap-3 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-800 text-white text-sm sm:text-base font-bold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:-translate-y-0.5 transition-all">
                  Gabung Sekarang <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Account: Google login (users) — admin has its own app */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowAccount(v => !v)}
              className="flex items-center gap-2.5 pl-1.5 pr-3 sm:pr-4 py-1.5 rounded-xl sm:rounded-2xl bg-white/60 hover:bg-white border border-white/80 transition-all shadow-sm"
              title={profile?.fullName ?? 'Akun'}
            >
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0">
                  {initial}
                </div>
              )}
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-bold text-gray-800 leading-tight max-w-[120px] truncate">
                  {profile?.fullName ?? 'Member'}
                </span>
                {profile?.tier && (
                  <span className={`text-[10px] font-bold px-1.5 py-px rounded-full border ${TIER_BADGE[profile.tier]}`}>
                    {TIER_LABEL[profile.tier]}
                  </span>
                )}
              </div>
            </button>

            {showAccount && (
              <div className="absolute top-full right-0 mt-3 w-56 rounded-2xl glass-panel shadow-2xl border border-purple-100/50 p-2 z-50 animate-fade-in">
                <div className="px-3 py-2 border-b border-gray-100 sm:hidden">
                  <p className="text-sm font-bold text-gray-800 truncate">{profile?.fullName ?? 'Member'}</p>
                  {profile?.tier && (
                    <span className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-px rounded-full border ${TIER_BADGE[profile.tier]}`}>
                      {TIER_LABEL[profile.tier]}
                    </span>
                  )}
                </div>
                <a
                  href={`${landingUrl}/membership`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-purple-50 transition-colors"
                >
                  <Crown size={16} className="text-purple-600" /> Kelola Membership
                </a>
                <button
                  onClick={() => { setShowAccount(false); signOut(); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} /> Keluar
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowLogin(true)}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-600 to-purple-800 text-white text-sm sm:text-base font-bold shadow-md shadow-purple-500/30 hover:shadow-purple-500/50 hover:-translate-y-0.5 transition-all flex-shrink-0"
            title="Masuk"
          >
            <LogIn size={16} />
            <span className="hidden sm:inline">Masuk</span>
          </button>
        )}
      </div>

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSignInWithGoogle={signInWithGoogle}
        />
      )}
    </header>
  );
};

export default Header;
