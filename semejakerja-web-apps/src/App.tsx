import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import CafeModal from './components/CafeModal';
import { LoginModal } from './components/LoginModal';
import { CafesLoadingOverlay, CafesErrorOverlay } from './components/CafesLoadingOverlay';
import { useCafes } from './hooks/useCafes';
import { useAuth, mapsAccess } from './hooks/useAuth';
import { supabase } from './lib/supabaseClient';
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
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [showLogin, setShowLogin] = useState(false);
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

  const handleCafeClick = (cafe: Cafe) => {
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

    setSelectedCafe(prev => prev?.id === cafe.id ? null : cafe);
    // On mobile the sidebar covers the screen, so close it when a cafe is
    // picked. On desktop it's a side panel that can stay open.
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#e9ecef]">
      <MapView
        cafes={cafes}
        filters={filters}
        selectedCafe={selectedCafe}
        onCafeClick={handleCafeClick}
      />

      {loading && <CafesLoadingOverlay />}
      {!loading && error && <CafesErrorOverlay message={error} onRetry={refetch} />}

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
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {selectedCafe && (
        <CafeModal
          cafe={selectedCafe}
          onClose={() => setSelectedCafe(null)}
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
  return (
    <Routes>
      <Route path="*" element={<MapApp />} />
    </Routes>
  );
}

export default App;
