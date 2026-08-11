import React from 'react';
import { Wifi, Wind, Zap, BookOpen, Bike, Car, Presentation, Trees, UtensilsCrossed, Star, Crown, VolumeX, Volume2 } from 'lucide-react';
import type { Cafe, CafeFacility } from '../../types/cafe';
import CafeArtPlaceholder from './CafeArtPlaceholder';

interface ClueCardProps {
  cafe: Cafe;
}

const FACILITY_CLUES: { id: keyof CafeFacility; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'wifi', label: 'WiFi kencang', icon: Wifi },
  { id: 'ac', label: 'Ber-AC', icon: Wind },
  { id: 'powerOutlets', label: 'Banyak colokan', icon: Zap },
  { id: 'mushola', label: 'Ada mushola', icon: BookOpen },
  { id: 'motorParking', label: 'Parkir motor luas', icon: Bike },
  { id: 'carParking', label: 'Parkir mobil', icon: Car },
  { id: 'meetingRoom', label: 'Ruang meeting', icon: Presentation },
  { id: 'outdoor', label: 'Area outdoor', icon: Trees },
  { id: 'heavyMeal', label: 'Makanan berat', icon: UtensilsCrossed },
];

const VIBE_LABEL: Record<number, string> = {
  1: 'Tenang banget',
  2: 'Tenang',
  3: 'Santai',
  4: 'Ramai',
  5: 'Ramai banget',
};

const ClueCard: React.FC<ClueCardProps> = ({ cafe }) => {
  const activeFacilities = FACILITY_CLUES.filter(f => cafe.facilities[f.id]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-purple-600">Petunjuk kafe</span>
        {cafe.isMitraSemejaKerja && (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
            <Crown size={11} /> Mitra SK
          </span>
        )}
      </div>

      <CafeArtPlaceholder cafe={cafe} />

      <div className="flex items-center gap-3 flex-wrap text-sm">
        <span className="flex items-center gap-1 font-bold text-gray-900">
          <Star size={14} className="text-yellow-500 fill-yellow-500" />
          {cafe.rating > 0 ? cafe.rating.toFixed(1) : '—'}
          {cafe.reviewCount > 0 && <span className="font-medium text-gray-400">({cafe.reviewCount})</span>}
        </span>
        <span className="text-gray-300">·</span>
        <span className="font-medium text-gray-600">{cafe.priceRange}</span>
        <span className="text-gray-300">·</span>
        <span className="flex items-center gap-1 font-medium text-gray-600">
          {cafe.vibes >= 4 ? <Volume2 size={13} /> : <VolumeX size={13} />}
          {VIBE_LABEL[cafe.vibes] ?? 'Santai'}
        </span>
      </div>

      {activeFacilities.length > 0 ? (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {activeFacilities.map(f => (
            <li key={f.id} className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
              <f.icon size={13} />
              {f.label}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-400 italic">Belum ada data fasilitas buat kafe ini.</p>
      )}
    </div>
  );
};

export default ClueCard;
