import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import CafeModal from './components/CafeModal';
import { CafesLoadingOverlay, CafesErrorOverlay } from './components/CafesLoadingOverlay';
import { useCafes } from './hooks/useCafes';
import { AdminPanel } from './pages/admin/AdminPanel';
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
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    setSelectedCafe(prev => prev?.id === cafe.id ? null : cafe);
    setSidebarOpen(false);
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
        cafeCount={filteredCount}
      />
      <Sidebar
        filters={filters}
        onFiltersChange={setFilters}
        cafeCount={filteredCount}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {selectedCafe && (
        <CafeModal cafe={selectedCafe} onClose={() => setSelectedCafe(null)} />
      )}
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/cafe-bos-semeja/*" element={<AdminPanel />} />
      <Route path="*" element={<MapApp />} />
    </Routes>
  );
}

export default App;
