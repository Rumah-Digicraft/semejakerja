import React, { useRef, useState, type TouchEvent } from 'react';
import {
  Wifi, Zap, Wind, BookOpen, Bike, Car,
  Volume2, VolumeX, Volume1, Clock, CheckCircle2, Moon,
  SlidersHorizontal, X, PlusCircle, LogIn, Crown, Lock,
  Presentation, Trees, UtensilsCrossed, Maximize,
} from 'lucide-react';
import type { FilterState } from '../types/cafe';
import type { MapsAccess } from '../hooks/useAuth';
import { ContributeModal } from './contribute/ContributeModal';

interface SidebarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  cafeCount: number;
  isOpen: boolean;
  onClose: () => void;
  access: MapsAccess;
  onRequestLogin: () => void;
  landingUrl: string;
}

interface FacilityOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
}

// Filter fasilitas untuk tier Free (Nyantai). Parkir/colokan pindah ke
// slider skala (ScaleFilter) — di sini tinggal amenity boolean.
const freeFacilityOptions: FacilityOption[] = [
  { id: 'mushola', label: 'Mushola', icon: BookOpen },
  { id: 'outdoor', label: 'Area Outdoor', icon: Trees },
  { id: 'heavyMeal', label: 'Makanan Berat', icon: UtensilsCrossed },
];

// Bagian "Maps lengkap" — khusus Nongkrong+.
const premiumFacilityOptions: FacilityOption[] = [
  { id: 'wifi', label: 'WiFi Cepat', icon: Wifi },
  { id: 'ac', label: 'AC', icon: Wind },
  { id: 'meetingRoom', label: 'Ruang Meeting', icon: Presentation },
];

// Suasana: 3 level bernama, filter "maks. seramai apa" (pilih Ramai = tanpa
// filter, karena itu level teratas) — beda dari ScaleFilter di bawah yang
// semantiknya "minimal".
const VIBE_LEVELS = [
  { value: 1, label: 'Tenang', icon: VolumeX },
  { value: 2, label: 'Sedang', icon: Volume1 },
  { value: 3, label: 'Ramai', icon: Volume2 },
];

// Slider skala "minimal" 0-3 (0 = Semua). Reuse pola slider Suasana.
function ScaleFilter({ label, icon: Icon, value, levels, onChange }: {
  label: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  value: number;
  levels: [string, string, string];
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-gray-600">
          <Icon size={15} style={{ color: '#7c3aed' }} /> {label}
        </span>
        <span className="text-xs font-extrabold text-purple-700 bg-white px-2.5 py-0.5 rounded-lg shadow-sm border border-purple-100">
          {value === 0 ? 'Semua' : levels[value - 1]}
        </span>
      </div>
      <input
        type="range" min={0} max={3} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

const Sidebar: React.FC<SidebarProps> = ({
  filters, onFiltersChange, cafeCount, isOpen, onClose,
  access, onRequestLogin, landingUrl,
}) => {
  const [showNewCafeModal, setShowNewCafeModal] = useState(false);

  // Mobile sheet has two snap points: peek (default) and expanded — there
  // are too many filter sections to fit the peek scroll area, so
  // dragging/tapping the handle reveals more, same pattern as CafeModal.
  const [expanded, setExpanded] = useState(false);
  // Reset to peek each time the sheet is (re)opened — adjusting state
  // during render per React's guidance, rather than in an effect, avoids
  // an extra cascading render.
  const [expandedForOpenState, setExpandedForOpenState] = useState(isOpen);
  if (isOpen !== expandedForOpenState) {
    setExpandedForOpenState(isOpen);
    if (isOpen) setExpanded(false);
  }

  // Drag handle gesture — same threshold-delta technique as TebakKafe's clue
  // panel / CafeModal's photo swipe, extended to two snap points: swipe up
  // expands the sheet, swipe down collapses it back to peek (only closing
  // once already at peek height), and a plain tap toggles between the two.
  const handleTouchStartY = useRef<number | null>(null);
  const handleHandleTouchStart = (e: TouchEvent) => { handleTouchStartY.current = e.touches[0].clientY; };
  const handleHandleTouchEnd = (e: TouchEvent) => {
    if (handleTouchStartY.current == null) return;
    const delta = e.changedTouches[0].clientY - handleTouchStartY.current;
    if (delta > 40) {
      if (expanded) setExpanded(false);
      else onClose();
    } else if (delta < -40) {
      setExpanded(true);
    } else if (Math.abs(delta) < 10) {
      setExpanded(v => !v);
    }
    handleTouchStartY.current = null;
  };

  const isGuest = access === 'guest';
  // Tier Free (Nyantai): filter premium ("Maps lengkap" — WiFi/colokan/AC,
  // suasana, waktu buka, mitra) diblur dengan CTA upgrade ke Nongkrong+.
  // Kontribusi (usulkan cafe baru dkk.) tidak kena batas ini — lihat tombol
  // "Tambahkan Tempat Baru" di bawah.
  const isFreeTier = access === 'basic';

  const toggleFacility = (id: string) => {
    const current = filters.facilities;
    const updated = current.includes(id)
      ? current.filter(f => f !== id)
      : [...current, id];
    onFiltersChange({ ...filters, facilities: updated });
  };

  const isActive = (id: string) => filters.facilities.includes(id);

  const renderFacilityButton = ({ id, label, icon: Icon }: FacilityOption) => {
    const active = isActive(id);
    return (
      <button
        key={id}
        onClick={() => toggleFacility(id)}
        className="flex items-center gap-3 sm:gap-5 px-3 sm:px-5 py-4 sm:py-4 mb-1 rounded-2xl text-left w-full transition-all shadow-sm"
        style={{
          background: active ? '#f3e8ff' : 'rgba(255,255,255,0.8)',
          border: active ? '1px solid #d8b4fe' : '1px solid rgba(255,255,255,0.9)',
          color: active ? '#6d28d9' : '#4b5563',
        }}
      >
        <div
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-sm"
          style={{ background: active ? '#e9d5ff' : 'rgba(243, 244, 246, 0.8)' }}
        >
          <Icon size={15} style={{ color: active ? '#7c3aed' : '#9ca3af' }} />
        </div>
        <span className="text-xs sm:text-sm font-extrabold leading-tight">{label}</span>
        {active && <CheckCircle2 size={15} className="text-purple-600 ml-auto hidden sm:block" />}
      </button>
    );
  };

  return (
    <>
      {/* Desktop: always visible floating panel */}
      {/* Mobile: slide up from bottom as drawer */}
      <aside
        className={[
          // Base styles
          'glass-panel flex flex-col shadow-xl z-40',
          // Desktop: absolute floating left panel
          'md:absolute md:left-6 md:top-[120px] md:bottom-6 md:w-[360px] md:rounded-3xl',
          // Mobile: fixed bottom sheet
          'fixed bottom-0 left-0 right-0 rounded-t-3xl transition-[transform,height] duration-300 ease-in-out',
          // Open/close state — mobile slides down, desktop slides off to the left
          isOpen
            ? 'translate-y-0 md:translate-x-0'
            : 'translate-y-full md:translate-y-0 md:-translate-x-[calc(100%+2rem)]',
          // Mobile: two snap points — peek by default so the map (and cafe
          // pins) stay visible/pannable above it, expands toward
          // full-height when there's more filters than peek can hold.
          // Desktop: height driven by top/bottom.
          expanded ? 'h-[88vh]' : 'h-[50vh]',
          'md:h-auto',
        ].join(' ')}
      >
        {/* Sidebar Header */}
        <div className="px-6 pt-5 pb-5 sm:px-8 sm:py-7 flex-shrink-0 border-b border-gray-100/50">
          {/* Mobile drag handle — swipe up/down or tap to expand/collapse, swipe down from peek closes */}
          <div
            onTouchStart={handleHandleTouchStart}
            onTouchEnd={handleHandleTouchEnd}
            className="md:hidden flex flex-col items-center justify-center gap-1 py-2 -mt-2 mb-2 touch-none"
          >
            <span className="w-10 h-1 bg-gray-300 rounded-full" />
            {!expanded && (
              <span className="text-[9px] font-medium text-gray-400">Tarik ke atas untuk semua filter</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <SlidersHorizontal size={20} className="text-purple-600" />
              <h2 className="text-gray-900 font-extrabold text-base sm:text-lg">Cari Cafe Idealmu</h2>
            </div>
            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="md:hidden w-8 h-8 rounded-xl flex items-center justify-center bg-gray-100"
            >
              <X size={16} className="text-gray-600" />
            </button>
          </div>
          <p className="text-gray-500 text-sm font-semibold mt-2 pl-8 sm:pl-[38px]">
            <span className="font-extrabold text-purple-600">{cafeCount}</span> cafe ditemukan
          </p>
        </div>

        {/* Filters Body — blurred for guests (Rule: wajib login untuk pakai filter).
            min-h-0 needed for the same reason as CafeModal's scrollable
            content div — without it this flex item won't shrink below its
            content height and pushes the Reset/Tambahkan Tempat Baru
            footer below the sheet's visible bounds in peek mode. */}
        <div
          aria-hidden={isGuest}
          className={[
            'flex-1 min-h-0 overflow-y-auto px-6 py-8 sm:px-6 sm:py-8 space-y-9 sm:space-y-11',
            isGuest ? 'blur-[6px] pointer-events-none select-none' : '',
          ].join(' ')}
        >

          {/* Fasilitas — parkir motor/mobil & mushola untuk semua member;
              WiFi/colokan/AC bagian "Maps lengkap", khusus Nongkrong+ */}
          <div>
            <label className="block font-extrabold text-xs uppercase tracking-widest text-gray-400 mt-6 mb-3">
              Fasilitas
            </label>
            {/* Mobile: 2-col grid. Desktop: 1-col */}
            <div className="grid grid-cols-2 md:grid-cols-1 gap-3 sm:gap-4">
              {freeFacilityOptions.map(renderFacilityButton)}
            </div>
            <div className="relative mt-3 sm:mt-4">
              {isFreeTier && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 px-4 text-center rounded-2xl">
                  <a
                    href={`${landingUrl}/membership`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 text-xs font-extrabold shadow-md shadow-amber-400/30 hover:shadow-amber-400/50 hover:-translate-y-0.5 transition-all"
                  >
                    <Crown size={14} /> Upgrade untuk Filter WiFi, Colokan & AC
                  </a>
                </div>
              )}
              <div
                aria-hidden={isFreeTier}
                className={[
                  'grid grid-cols-2 md:grid-cols-1 gap-3 sm:gap-4',
                  isFreeTier ? 'blur-[5px] pointer-events-none select-none' : '',
                ].join(' ')}
              >
                {premiumFacilityOptions.map(renderFacilityButton)}
              </div>
            </div>
          </div>

          {/* Ukuran & Kapasitas — skala minimal (area/parkir untuk semua member) */}
          <div>
            <label className="block font-extrabold text-xs uppercase tracking-widest text-gray-400 mt-6 mb-3">
              Ukuran & Kapasitas
            </label>
            <div className="space-y-5">
              <ScaleFilter
                label="Luas Area" icon={Maximize} value={filters.areaMin} levels={['Kecil', 'Sedang', 'Luas']}
                onChange={v => onFiltersChange({ ...filters, areaMin: v })}
              />
              <ScaleFilter
                label="Parkir Motor" icon={Bike} value={filters.motorParkingMin} levels={['Sempit', 'Sedang', 'Luas']}
                onChange={v => onFiltersChange({ ...filters, motorParkingMin: v })}
              />
              <ScaleFilter
                label="Parkir Mobil" icon={Car} value={filters.carParkingMin} levels={['Sempit', 'Sedang', 'Luas']}
                onChange={v => onFiltersChange({ ...filters, carParkingMin: v })}
              />
            </div>
          </div>

          {/* Suasana, waktu buka & mitra — bagian "Maps lengkap", khusus Nongkrong+ */}
          <div className="relative">
            {isFreeTier && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 px-4 text-center rounded-2xl">
                <a
                  href={`${landingUrl}/membership`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 text-xs font-extrabold shadow-md shadow-amber-400/30 hover:shadow-amber-400/50 hover:-translate-y-0.5 transition-all"
                >
                  <Crown size={14} /> Upgrade untuk Semua Filter
                </a>
              </div>
            )}
            <div
              aria-hidden={isFreeTier}
              className={[
                'space-y-9 sm:space-y-11',
                isFreeTier ? 'blur-[5px] pointer-events-none select-none' : '',
              ].join(' ')}
            >

          {/* Suasana — 3 level (Tenang · Sedang · Ramai) */}
          <div>
            <label className="block font-extrabold text-xs uppercase tracking-widest text-gray-400 mt-6 mb-3">
              Suasana
            </label>
            <div className="flex rounded-2xl overflow-hidden border border-purple-100 shadow-sm">
              {VIBE_LEVELS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onFiltersChange({ ...filters, vibesMin: value, vibesMax: value })}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-bold transition ${
                    filters.vibesMin === value
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-500 hover:bg-purple-50'
                  }`}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Colokan — skala minimal (bagian "Maps lengkap") */}
          <div>
            <label className="block font-extrabold text-xs uppercase tracking-widest text-gray-400 mt-6 mb-3">
              Colokan
            </label>
            <ScaleFilter
              label="Colokan" icon={Zap} value={filters.outletsMin} levels={['Sedikit', 'Sedang', 'Banyak']}
              onChange={v => onFiltersChange({ ...filters, outletsMin: v })}
            />
          </div>

          {/* Waktu Buka */}
          <div>
            <label className="block font-extrabold text-xs uppercase tracking-widest text-gray-400 mt-6 mb-3">
              Waktu Buka
            </label>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-3 sm:gap-4">
              <button
                onClick={() => onFiltersChange({ ...filters, openNow: !filters.openNow, openNight: false })}
                title="Cafe yang sedang buka pada jam ini"
                className="flex items-center gap-3 sm:gap-5 px-3 sm:px-5 py-3 sm:py-3.5 rounded-2xl w-full transition-all shadow-sm"
                style={{
                  background: filters.openNow ? '#f3e8ff' : 'rgba(255,255,255,0.8)',
                  border: filters.openNow ? '1px solid #d8b4fe' : '1px solid rgba(255,255,255,0.9)',
                  color: filters.openNow ? '#6d28d9' : '#4b5563',
                }}
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: filters.openNow ? '#e9d5ff' : 'rgba(243, 244, 246, 0.8)' }}>
                  <Clock size={15} style={{ color: filters.openNow ? '#7c3aed' : '#9ca3af' }} />
                </div>
                <span className="flex flex-col items-start leading-tight min-w-0">
                  <span className="text-xs sm:text-sm font-extrabold">Buka Sekarang</span>
                  <span className="text-[10px] sm:text-xs font-medium opacity-70">Lagi buka jam ini</span>
                </span>
                {filters.openNow && <div className="ml-auto w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse hidden sm:block" />}
              </button>
              <button
                onClick={() => onFiltersChange({ ...filters, openNight: !filters.openNight, openNow: false })}
                title="Cafe yang buka sampai lewat jam 21.00 (termasuk 24 jam) — cocok buat kerja/nongkrong malam"
                className="flex items-center gap-3 sm:gap-5 px-3 sm:px-5 py-3 sm:py-3.5 rounded-2xl w-full transition-all shadow-sm"
                style={{
                  background: filters.openNight ? '#f3e8ff' : 'rgba(255,255,255,0.8)',
                  border: filters.openNight ? '1px solid #d8b4fe' : '1px solid rgba(255,255,255,0.9)',
                  color: filters.openNight ? '#6d28d9' : '#4b5563',
                }}
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: filters.openNight ? '#e9d5ff' : 'rgba(243, 244, 246, 0.8)' }}>
                  <Moon size={15} style={{ color: filters.openNight ? '#7c3aed' : '#9ca3af' }} />
                </div>
                <span className="flex flex-col items-start leading-tight min-w-0">
                  <span className="text-xs sm:text-sm font-extrabold">Buka Malam</span>
                  <span className="text-[10px] sm:text-xs font-medium opacity-70">Buka sampai &gt;21.00</span>
                </span>
                {filters.openNight && <div className="ml-auto w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse hidden sm:block" />}
              </button>
            </div>
          </div>

          {/* Mitra Semeja Kerja */}
          <div>
            <button
              onClick={() => onFiltersChange({ ...filters, mitraSemejaKerja: !filters.mitraSemejaKerja })}
              className="flex items-center gap-4 sm:gap-5 px-4 sm:px-5 py-3.5 sm:py-4 rounded-2xl w-full transition-all shadow-sm"
              style={{
                background: filters.mitraSemejaKerja ? '#ecfdf5' : 'rgba(255,255,255,0.8)',
                border: filters.mitraSemejaKerja ? '1px solid #6ee7b7' : '1px solid rgba(255,255,255,0.9)',
              }}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: filters.mitraSemejaKerja ? '#d1fae5' : 'rgba(243, 244, 246, 0.8)' }}>
                <CheckCircle2 size={20} style={{ color: filters.mitraSemejaKerja ? '#059669' : '#9ca3af' }} />
              </div>
              <div className="flex-1 text-left flex flex-col gap-1.5">
                <p className="text-sm font-extrabold leading-none" style={{ color: filters.mitraSemejaKerja ? '#059669' : '#4b5563' }}>
                  Mitra Semeja Kerja
                </p>
                <p className="text-xs font-semibold leading-none" style={{ color: '#6b7280' }}>Dapat Diskon Khusus</p>
              </div>
              {filters.mitraSemejaKerja && (
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-500 text-white shadow-sm">
                  Active
                </span>
              )}
            </button>
          </div>

            </div>
          </div>
        </div>

        {/* Reset Button */}
        <div
          aria-hidden={isGuest}
          className={[
            'px-6 py-5 sm:px-8 sm:py-6 flex-shrink-0 border-t border-gray-100/50 bg-white/40 rounded-b-3xl space-y-3',
            isGuest ? 'blur-[6px] pointer-events-none select-none' : '',
          ].join(' ')}
        >
          {/* Crowdsource Maps (usulkan cafe baru) — sama seperti koreksi info/
              ulasan/foto, terbuka untuk semua tier member yang login (bukan
              cuma Nongkrong+, lihat migration 045/046). Guest sudah digembok
              oleh aria-hidden+blur di wrapper section ini. */}
          <button
            onClick={() => setShowNewCafeModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-extrabold transition-all shadow-sm bg-purple-600 text-white hover:bg-purple-700"
          >
            <PlusCircle size={16} /> Tambahkan Tempat Baru
          </button>
          <button
            onClick={() => onFiltersChange({
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
            })}
            className="w-full py-3 sm:py-3.5 rounded-2xl text-sm font-extrabold transition-all shadow-sm bg-purple-100/50 text-purple-700 border border-purple-200 hover:bg-purple-200/50 hover:border-purple-300"
          >
            Reset Semua Filter
          </button>
        </div>

        {/* Guest overlay: filter wajib login (map & nama cafe tetap terlihat).
            pointer-events-none di container agar tombol close di header tetap bisa diklik. */}
        {isGuest && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-8 text-center pointer-events-none">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center shadow-sm">
              <Lock size={22} className="text-purple-600" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-extrabold text-gray-900">Masuk untuk Pakai Filter</p>
              <p className="text-xs font-medium text-gray-500 leading-relaxed">
                Filter cafe & fitur member lainnya khusus untuk member Semeja Kerja. Gratis kok!
              </p>
            </div>
            <button
              onClick={onRequestLogin}
              className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 text-white text-sm font-bold shadow-md shadow-purple-500/30 hover:shadow-purple-500/50 hover:-translate-y-0.5 transition-all"
            >
              <LogIn size={15} /> Masuk
            </button>
            <a
              href={`${landingUrl}/auth/register`}
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto text-xs font-semibold text-purple-600 hover:underline"
            >
              Belum punya akun? Daftar gratis
            </a>
          </div>
        )}
      </aside>

      {showNewCafeModal && (
        <ContributeModal
          type="new-cafe"
          onClose={() => setShowNewCafeModal(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
