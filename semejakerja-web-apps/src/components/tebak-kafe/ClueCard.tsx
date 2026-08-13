import React, { useMemo } from 'react';
import { Wifi, Wind, Zap, BookOpen, Bike, Car, Presentation, Trees, UtensilsCrossed, Star, Crown, VolumeX, Volume2 } from 'lucide-react';
import type { Cafe, CafeFacility } from '../../types/cafe';
import { useCafePhotos } from '../../hooks/useCafePhotos';
import CafeArtPlaceholder from './CafeArtPlaceholder';

interface ClueCardProps {
  cafe: Cafe;
  /** Varies per game (set once in TebakKafe's startGame, an event handler —
   * not render), so which photo shows isn't always the map's cover photo.
   * Deterministic hash, not Math.random(): React's purity rules disallow
   * calling impure functions during render/useMemo. */
  photoSeed?: number;
}

// Small deterministic string hash (djb2) — pure, safe to call during render.
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h >>> 0;
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
  1: 'Tenang',
  2: 'Sedang',
  3: 'Ramai',
};

const ClueCard: React.FC<ClueCardProps> = ({ cafe, photoSeed }) => {
  const activeFacilities = FACILITY_CLUES.filter(f => cafe.facilities[f.id]);
  // Real photos are 3:4 crops (see PhotoCropModal); only swap in once loaded
  // and non-empty, otherwise keep the placeholder — avoids a layout flash
  // from a stray loading state on the fast per-round fetch.
  const { data: photos } = useCafePhotos(cafe.id);
  const coverPhoto = useMemo(() => {
    if (!photos || photos.length === 0) return undefined;
    const idx = hashString(`${cafe.id}:${photoSeed ?? 0}`) % photos.length;
    return photos[idx];
  }, [photos, cafe.id, photoSeed]);

  // Semua petunjuk (rating/harga/vibes + fasilitas) duduk di atas gambar
  // lewat gradient scrim di bawahnya — bukan baris/list terpisah di bawah
  // gambar. Fasilitas dirender sebagai chip yang wrap (bukan grid 2 kolom)
  // biar tetap ringkas walau aktif sampai 9 item sekaligus.
  const clueOverlay = (
    <div className="absolute inset-x-0 bottom-0 px-3 pt-10 pb-3 bg-gradient-to-t from-black/85 via-black/45 to-transparent">
      <div className="flex items-center gap-2 flex-wrap text-sm mb-2">
        <span className="flex items-center gap-1 font-bold text-white">
          <Star size={14} className="text-yellow-400 fill-yellow-400" />
          {cafe.rating > 0 ? cafe.rating.toFixed(1) : '—'}
          {cafe.reviewCount > 0 && <span className="font-medium text-white/70">({cafe.reviewCount})</span>}
        </span>
        <span className="text-white/40">·</span>
        <span className="font-medium text-white/90">{cafe.priceRange}</span>
        <span className="text-white/40">·</span>
        <span className="flex items-center gap-1 font-medium text-white/90">
          {cafe.vibes >= 3 ? <Volume2 size={13} /> : <VolumeX size={13} />}
          {VIBE_LABEL[cafe.vibes] ?? 'Sedang'}
        </span>
      </div>
      {activeFacilities.length > 0 ? (
        <div className="flex flex-wrap gap-x-2.5 gap-y-1">
          {activeFacilities.map(f => (
            <span key={f.id} className="flex items-center gap-1 text-xs font-medium text-white/90">
              <f.icon size={12} />
              {f.label}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-white/60 italic">Belum ada data fasilitas buat kafe ini.</p>
      )}
    </div>
  );

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

      {coverPhoto ? (
        <div className="relative rounded-xl overflow-hidden border border-amber-100">
          <img
            src={coverPhoto.url}
            alt={coverPhoto.caption || cafe.name}
            // Fixed height, not aspect-driven — a full 3:4 crop at mobile
            // width would run ~560px tall and bury the map underneath this
            // bottom sheet. This slot is a quick visual clue, not a photo
            // viewer, so a shorter crop is the right tradeoff here.
            className="w-full h-48 object-cover block"
          />
          {clueOverlay}
        </div>
      ) : (
        <CafeArtPlaceholder>{clueOverlay}</CafeArtPlaceholder>
      )}
    </div>
  );
};

export default ClueCard;
