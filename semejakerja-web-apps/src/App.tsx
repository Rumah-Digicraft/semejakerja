import { useCallback, useMemo, useState } from 'react';
import { Routes, Route, useMatch, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import CafeModal from './components/CafeModal';
import { LoginModal } from './components/LoginModal';
import { CafesLoadingOverlay, CafesErrorOverlay } from './components/CafesLoadingOverlay';
import Seo from './components/Seo';
import NotFound from './pages/NotFound';
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
  vibesMin: 5,
  vibesMax: 5,
  openNow: false,
  openNight: false,
  mitraSemejaKerja: false,
};

function MapApp() {
  const { cafes, loading, error, refetch } = useCafes();
  const { user, profile, signIn, landingUrl } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [showLogin, setShowLogin] = useState(false);

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

  const filteredCount = cafes.filter(cafe => {
    if (filters.facilities.length > 0) {
      const allMatch = filters.facilities.every(
        fac => cafe.facilities[fac as keyof typeof cafe.facilities]
      );
      if (!allMatch) return false;
    }
    if (cafe.vibes > filters.vibesMin) return false;
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
    // On mobile the sidebar covers the screen, so close it when a cafe is
    // picked. On desktop it's a side panel that can stay open.
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, [selectedCafe, navigate]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#e9ecef]">
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
        onRequestLogin={() => setShowLogin(true)}
        landingUrl={landingUrl}
      />
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {selectedCafe && (
        <CafeModal
          cafe={selectedCafe}
          onClose={() => navigate('/')}
          access={access}
          onRequestLogin={() => setShowLogin(true)}
          landingUrl={landingUrl}
        />
      )}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSignIn={signIn}
          landingUrl={landingUrl}
        />
      )}
    </div>
  );
}

function App() {
  // Admin panel lives in the separate semejakerja-admin app now.
  // "/" and "/cafe/:slug" share one MapApp mount (layout route) so the
  // Leaflet map survives modal open/close; MapApp reads the slug itself.
  return (
    <Routes>
      <Route path="/" element={<MapApp />}>
        <Route index element={null} />
        <Route path="cafe/:slug" element={null} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
