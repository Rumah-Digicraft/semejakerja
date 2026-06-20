import React, { useState } from 'react';
import {
  Wifi, Zap, Wind, BookOpen, Bike, Car,
  Volume2, VolumeX, Clock, CheckCircle2, Star,
  SlidersHorizontal, X, PlusCircle,
} from 'lucide-react';
import type { FilterState } from '../types/cafe';
import { ContributeModal } from './contribute/ContributeModal';

interface SidebarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  cafeCount: number;
  isOpen: boolean;
  onClose: () => void;
}

const facilityOptions = [
  { id: 'wifi', label: 'WiFi Cepat', icon: Wifi },
  { id: 'powerOutlets', label: 'Colokan Banyak', icon: Zap },
  { id: 'ac', label: 'AC', icon: Wind },
  { id: 'mushola', label: 'Mushola', icon: BookOpen },
  { id: 'motorParking', label: 'Parkir Motor', icon: Bike },
  { id: 'carParking', label: 'Parkir Mobil', icon: Car },
];

const Sidebar: React.FC<SidebarProps> = ({ filters, onFiltersChange, cafeCount, isOpen, onClose }) => {
  const [showNewCafeModal, setShowNewCafeModal] = useState(false);

  const toggleFacility = (id: string) => {
    const current = filters.facilities;
    const updated = current.includes(id)
      ? current.filter(f => f !== id)
      : [...current, id];
    onFiltersChange({ ...filters, facilities: updated });
  };

  const isActive = (id: string) => filters.facilities.includes(id);

  return (
    <>
      {/* Desktop: always visible floating panel */}
      {/* Mobile: slide up from bottom as drawer */}
      <aside
        className={[
          // Base styles
          'glass-panel flex flex-col shadow-xl z-40',
          // Desktop: absolute floating left panel
          'md:absolute md:left-6 md:top-[120px] md:bottom-6 md:w-[360px] md:rounded-3xl md:translate-y-0',
          // Mobile: fixed bottom sheet
          'fixed bottom-0 left-0 right-0 rounded-t-3xl transition-transform duration-300 ease-in-out',
          // Mobile open/close state
          isOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0',
          // Mobile max height
          'max-h-[85vh] md:max-h-none',
        ].join(' ')}
      >
        {/* Sidebar Header */}
        <div className="px-6 pt-5 pb-5 sm:px-8 sm:py-7 flex-shrink-0 border-b border-gray-100/50">
          {/* Mobile drag handle */}
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4 md:hidden" />
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

        {/* Filters Body */}
        <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-6 sm:py-8 space-y-9 sm:space-y-11">

          {/* Fasilitas */}
          <div>
            <label className="block font-extrabold text-xs uppercase tracking-widest text-gray-400 mt-6 mb-3">
              Fasilitas
            </label>
            {/* Mobile: 2-col grid. Desktop: 1-col */}
            <div className="grid grid-cols-2 md:grid-cols-1 gap-3 sm:gap-4">
              {facilityOptions.map(({ id, label, icon: Icon }) => {
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
              })}
            </div>
          </div>

          {/* Suasana Slider */}
          <div>
            <label className="block font-extrabold text-xs uppercase tracking-widest text-gray-400 mt-6 mb-3">
              Suasana
            </label>
            <div className="space-y-4 sm:space-y-5">
              <input
                type="range"
                min={1}
                max={5}
                value={filters.vibesMin}
                onChange={e => onFiltersChange({ ...filters, vibesMin: Number(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs font-bold text-gray-500">
                <span className="flex items-center gap-1.5"><VolumeX size={13} /> Tenang</span>
                <span className="flex items-center gap-1.5">Ramai <Volume2 size={13} /></span>
              </div>
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl bg-purple-50/50 border border-purple-100 shadow-sm">
                <span className="text-sm font-bold text-purple-700">Level suasana max</span>
                <span className="text-sm font-extrabold text-purple-700 bg-white px-3 py-1 rounded-lg shadow-sm border border-purple-100">{filters.vibesMin}/5</span>
              </div>
            </div>
          </div>

          {/* Waktu Buka */}
          <div>
            <label className="block font-extrabold text-xs uppercase tracking-widest text-gray-400 mt-6 mb-3">
              Waktu Buka
            </label>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-3 sm:gap-4">
              <button
                onClick={() => onFiltersChange({ ...filters, openNow: !filters.openNow, openNight: false })}
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
                <span className="text-xs sm:text-sm font-extrabold">Buka Sekarang</span>
                {filters.openNow && <div className="ml-auto w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse hidden sm:block" />}
              </button>
              <button
                onClick={() => onFiltersChange({ ...filters, openNight: !filters.openNight, openNow: false })}
                className="flex items-center gap-3 sm:gap-5 px-3 sm:px-5 py-3 sm:py-3.5 rounded-2xl w-full transition-all shadow-sm"
                style={{
                  background: filters.openNight ? '#f3e8ff' : 'rgba(255,255,255,0.8)',
                  border: filters.openNight ? '1px solid #d8b4fe' : '1px solid rgba(255,255,255,0.9)',
                  color: filters.openNight ? '#6d28d9' : '#4b5563',
                }}
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: filters.openNight ? '#e9d5ff' : 'rgba(243, 244, 246, 0.8)' }}>
                  <Star size={15} style={{ color: filters.openNight ? '#7c3aed' : '#9ca3af' }} />
                </div>
                <span className="text-xs sm:text-sm font-extrabold">Buka Malam</span>
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

        {/* Reset Button */}
        <div className="px-6 py-5 sm:px-8 sm:py-6 flex-shrink-0 border-t border-gray-100/50 bg-white/40 rounded-b-3xl space-y-3">
          <button
            onClick={() => setShowNewCafeModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-extrabold transition-all shadow-sm bg-purple-600 text-white hover:bg-purple-700"
          >
            <PlusCircle size={16} /> Tambahkan Tempat Baru
          </button>
          <button
            onClick={() => onFiltersChange({
              facilities: [],
              vibesMin: 5,
              vibesMax: 5,
              openNow: false,
              openNight: false,
              mitraSemejaKerja: false,
            })}
            className="w-full py-3 sm:py-3.5 rounded-2xl text-sm font-extrabold transition-all shadow-sm bg-purple-100/50 text-purple-700 border border-purple-200 hover:bg-purple-200/50 hover:border-purple-300"
          >
            Reset Semua Filter
          </button>
        </div>
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
