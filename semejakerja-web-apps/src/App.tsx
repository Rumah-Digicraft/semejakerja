import { useCallback, useEffect, useMemo, useState } from 'react';
import { Routes, Route, useMatch, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import CafeModal from './components/CafeModal';
import { LoginModal } from './components/LoginModal';
import { ContributeModal } from './components/contribute/ContributeModal';
import ContributionPromoModal from './components/ContributionPromoModal';
import BottomNav from './components/BottomNav';
import AuthCallback from './components/AuthCallback';
import { CafesLoadingOverlay, CafesErrorOverlay } from './components/CafesLoadingOverlay';
import Seo from './components/Seo';
import NotFound from './pages/NotFound';
import TebakKafe from './pages/TebakKafe';
import PapanKontributor from './pages/PapanKontributor';
import Kontribusiku from './pages/Kontribusiku';
import Tersimpan from './pages/Tersimpan';
import { useCafes } from './hooks/useCafes';
import { useAuth, mapsAccess } from './hooks/useAuth';
import { supabase } from './lib/supabaseClient';
import { cafeSlug } from './lib/slug';
import { cafeTitle, cafeDescription, cafeCanonicalPath, cafeJsonLd } from './lib/cafeSeo';
import { DEFAULT_TITLE, DEFAULT_DESCRIPTION } from './lib/site';
import type { Cafe, FilterState } from './types/cafe';
import './index.css';

const defaultFilters: FilterState = {
  facilities: [],
  vibesMin: 3,
  vibesMax: 3,
  areaMin: 0,
  motorParkingMin: 0,
  carParkingMin: 0,
  outletsMin: 0,
  openNow: false,
  openNight: false,
  mitraSemejaKerja: false,
};

interface MapAppProps {
  onRequestLogin: () => void;
  onAddCafeClick: () => void;
}

// Sekali per sesi tab (bukan sekali seumur hidup — sessionStorage, bukan
// localStorage) supaya promo ini kelihatan lagi di kunjungan berikutnya,
// tapi tidak muncul berkali-kali kalau user cuma pindah-pindah halaman
// dalam satu sesi buka browser yang sama.
const CONTRIBUTION_PROMO_KEY = 'sk_contribution_promo_shown';

function MapApp({ onRequestLogin, onAddCafeClick }: MapAppProps) {
  const { cafes, loading, error, refetch } = useCafes();
  const { user, profile, landingUrl } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  // The URL is the source of truth for which cafe is open (/cafe/:slug).
  // Fallback on the 8-char id suffix so renamed cafes keep resolving.
  const slug = useMatch('/cafe/:slug')?.params.slug ?? null;
  const selectedCafe = useMemo<Cafe | null>(() => {
    if (!slug) return null;
    return (
      cafes.find(cafe => cafeSlug(cafe) === slug) ??
      cafes.find(cafe => slug.endsWith(cafe.id.slice(0, 8))) ??
      null
    );
  }, [cafes, slug]);
  const cafeNotFound = !!slug && !loading && !error && cafes.length > 0 && !selectedCafe;
  // Default: open on desktop (laptop browser), closed on mobile.
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 768
  );

  // Feature gating per membership tier (see mapsAccess in useAuth).
  const access = mapsAccess(user, profile?.tier ?? null);

  // Promo ajakan kontribusi — muncul sekali per sesi, sedikit setelah peta
  // pertama kali kebuka (bukan langsung, biar gak numpuk sama loading
  // overlay/transisi awal). Dicek & ditandai di sini (bukan di App()) karena
  // "pertama kali buka peta" secara harfiah berarti MapApp, bukan tiap
  // halaman lain di app ini.
  const [showContributionPromo, setShowContributionPromo] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem(CONTRIBUTION_PROMO_KEY)) return;
    const timer = setTimeout(() => {
      setShowContributionPromo(true);
      sessionStorage.setItem(CONTRIBUTION_PROMO_KEY, '1');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const filteredCount = cafes.filter(cafe => {
    if (filters.facilities.length > 0) {
      const allMatch = filters.facilities.every(
        fac => cafe.facilities[fac as keyof typeof cafe.facilities]
      );
      if (!allMatch) return false;
    }
    if (cafe.vibes > filters.vibesMin) return false;
    if (cafe.scales.area < filters.areaMin) return false;
    if (cafe.scales.motorParking < filters.motorParkingMin) return false;
    if (cafe.scales.carParking < filters.carParkingMin) return false;
    if (cafe.scales.outlets < filters.outletsMin) return false;
    if (filters.openNow && !cafe.isOpenNow) return false;
    if (filters.openNight && !cafe.isOpenNight) return false;
    if (filters.mitraSemejaKerja && !cafe.isMitraSemejaKerja) return false;
    return true;
  }).length;

  // Stable identity (with MapView memoized) so sidebar/login/filter state
  // changes don't cascade into re-rendering every marker.
  const handleCafeClick = useCallback((cafe: Cafe) => {
    // If it's a new click (not just toggling off)
    if (selectedCafe?.id !== cafe.id) {
      // Optimistically increase click
      cafe.clicks = (cafe.clicks || 0) + 1;
      
      // Send to Supabase (fire and forget)
      supabase.rpc('increment_cafe_clicks', { cafe_id: cafe.id }).then(({ error }) => {
        // Fallback if RPC doesn't exist yet
        if (error) {
          supabase.from('cafes').update({ clicks: cafe.clicks }).eq('id', cafe.id).then();
        }
      });
    }

    navigate(selectedCafe?.id === cafe.id ? '/' : `/cafe/${cafeSlug(cafe)}`);
    // Close the filter when opening a cafe on any screen where the two
    // floating panels can't sit side by side (they'd overlap below ~820px,
    // e.g. iPad portrait at 768px). Wide desktops keep both open.
    if (window.innerWidth < 820) setSidebarOpen(false);
  }, [selectedCafe, navigate]);

  return (
    <div className="relative w-screen h-dvh overflow-hidden bg-[#e9ecef]">
      {cafeNotFound ? (
        <Seo
          title="Cafe Tidak Ditemukan | Peta Cafe Purwokerto"
          description="Cafe yang kamu cari tidak ada di Peta Cafe Purwokerto."
          path={`/cafe/${slug}`}
          noindex
        />
      ) : selectedCafe ? (
        <Seo
          title={cafeTitle(selectedCafe)}
          description={cafeDescription(selectedCafe)}
          path={cafeCanonicalPath(selectedCafe)}
          jsonLd={[cafeJsonLd(selectedCafe)]}
        />
      ) : (
        <Seo title={DEFAULT_TITLE} description={DEFAULT_DESCRIPTION} path="/" />
      )}

      <MapView
        cafes={cafes}
        filters={filters}
        selectedCafe={selectedCafe}
        onCafeClick={handleCafeClick}
        sidebarOpen={sidebarOpen}
      />

      {loading && <CafesLoadingOverlay />}
      {!loading && error && <CafesErrorOverlay message={error} onRetry={refetch} />}

      {cafeNotFound && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm px-6">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center flex flex-col items-center gap-3">
            <p className="text-3xl font-extrabold text-purple-600">404</p>
            <h2 className="text-lg font-bold text-gray-900">Cafe tidak ditemukan</h2>
            <p className="text-sm text-gray-500">
              Cafe yang kamu cari nggak ada atau sudah dihapus dari peta.
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition-colors shadow-md"
            >
              Lihat Semua Cafe
            </button>
          </div>
        </div>
      )}

      <Header
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(o => !o)}
      />
      <Sidebar
        filters={filters}
        onFiltersChange={setFilters}
        cafeCount={filteredCount}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        access={access}
        onRequestLogin={onRequestLogin}
        landingUrl={landingUrl}
      />
      {selectedCafe && (
        <CafeModal
          cafe={selectedCafe}
          onClose={() => navigate('/')}
          access={access}
          userId={user?.id}
          onRequestLogin={onRequestLogin}
          landingUrl={landingUrl}
        />
      )}
      {/* Guest juga lihat ini — klik "Kontribusi Sekarang" tetap lewat
          onAddCafeClick, yang sudah menangani guest->login sendiri (lihat
          handleAddCafeClick di App()). */}
      {showContributionPromo && (
        <ContributionPromoModal
          onClose={() => setShowContributionPromo(false)}
          onContributeClick={() => {
            setShowContributionPromo(false);
            onAddCafeClick();
          }}
        />
      )}
    </div>
  );
}

function App() {
  // Login/add-cafe modal state lives here, not inside MapApp, because the
  // mobile BottomNav's "+" button (and eventually its Saved tab's own gating)
  // needs to trigger them from any route, not just the map screen.
  const { user, profile, signInWithGoogle } = useAuth();
  const access = mapsAccess(user, profile?.tier ?? null);
  const [showLogin, setShowLogin] = useState(false);
  const [showNewCafeModal, setShowNewCafeModal] = useState(false);
  // Lifted from TebakKafe.tsx (via its onPlayingChange prop) so BottomNav
  // can hide only during actual gameplay, not on the page's intro screen —
  // see the comment in BottomNav.tsx for why gameplay specifically hides it.
  const [tebakKafePlaying, setTebakKafePlaying] = useState(false);

  // Contribution (usulkan cafe baru) is open to any logged-in member, guest
  // just gets routed to login first — same rule as Sidebar's "Tambahkan
  // Tempat Baru" button, just reachable from the map FAB / bottom-nav "+" too.
  const handleAddCafeClick = useCallback(() => {
    if (access === 'guest') setShowLogin(true);
    else setShowNewCafeModal(true);
  }, [access]);
  const handleRequestLogin = useCallback(() => setShowLogin(true), []);

  // Admin panel lives in the separate semejakerja-admin app now.
  // "/" and "/cafe/:slug" share one MapApp mount (layout route) so the
  // Leaflet map survives modal open/close; MapApp reads the slug itself.
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={<MapApp onRequestLogin={handleRequestLogin} onAddCafeClick={handleAddCafeClick} />}
        >
          <Route index element={null} />
          <Route path="cafe/:slug" element={null} />
        </Route>
        <Route path="/tebak-kafe" element={<TebakKafe onPlayingChange={setTebakKafePlaying} />} />
        <Route path="/papan-kontributor" element={<PapanKontributor />} />
        <Route path="/kontribusiku" element={<Kontribusiku />} />
        <Route path="/tersimpan" element={<Tersimpan />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <BottomNav onAddCafeClick={handleAddCafeClick} tebakKafePlaying={tebakKafePlaying} />

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSignInWithGoogle={signInWithGoogle}
        />
      )}
      {showNewCafeModal && (
        <ContributeModal
          type="new-cafe"
          onClose={() => setShowNewCafeModal(false)}
        />
      )}
    </>
  );
}

export default App;
