import React, { useState } from 'react';
import {
  X, Star, Wifi, Zap, Wind, BookOpen, Bike, Car,
  CheckCircle2, Gauge, Tag,
  Coffee, MapPin, Share2, Check, ExternalLink,
  Pencil, MessageSquare, Camera, Users,
  ChevronDown, ChevronUp, Lock, Crown, LogIn,
  Presentation, Trees, UtensilsCrossed, Maximize,
} from 'lucide-react';
import type { Cafe, CafeReview } from '../types/cafe';
import type { MapsAccess } from '../hooks/useAuth';
import { ContributeModal, type ContributeType } from './contribute/ContributeModal';
import { useCafeReviews } from '../hooks/useCafeReviews';
import { cafeSlug } from '../lib/slug';
import SpeedTestButton from './SpeedTestButton';

interface CafeModalProps {
  cafe: Cafe;
  onClose: () => void;
  access: MapsAccess;
  onRequestLogin: () => void;
  landingUrl: string;
}

const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={14}
          fill={i <= Math.round(rating) ? '#fbbf24' : 'none'}
          color={i <= Math.round(rating) ? '#fbbf24' : '#d1d5db'}
        />
      ))}
    </div>
  );
};

// Parkir & colokan tak lagi jadi chip — ditampilkan sebagai skala (scaleConfig).
const facilityConfig: Record<string, { label: string; icon: React.FC<{ size?: number; style?: React.CSSProperties }>; color: string }> = {
  wifi: { label: 'WiFi Cepat', icon: Wifi, color: '#2563eb' },
  ac: { label: 'AC Sejuk', icon: Wind, color: '#0891b2' },
  mushola: { label: 'Mushola', icon: BookOpen, color: '#059669' },
  meetingRoom: { label: 'Ruang Meeting', icon: Presentation, color: '#7c3aed' },
  outdoor: { label: 'Area Outdoor', icon: Trees, color: '#16a34a' },
  heavyMeal: { label: 'Makanan Berat', icon: UtensilsCrossed, color: '#d97706' },
};

// Skala 0-3 → label per level (index 0 tak ditampilkan). Selaras SCALE_CONFIG admin.
const scaleConfig: { key: 'area' | 'motorParking' | 'carParking' | 'outlets'; label: string; icon: React.FC<{ size?: number; style?: React.CSSProperties }>; levels: [string, string, string] }[] = [
  { key: 'area', label: 'Luas Area', icon: Maximize, levels: ['Kecil', 'Sedang', 'Luas'] },
  { key: 'motorParking', label: 'Parkir Motor', icon: Bike, levels: ['Sempit', 'Sedang', 'Luas'] },
  { key: 'carParking', label: 'Parkir Mobil', icon: Car, levels: ['Sempit', 'Sedang', 'Luas'] },
  { key: 'outlets', label: 'Colokan', icon: Zap, levels: ['Sedikit', 'Sedang', 'Banyak'] },
];

// Warna badge per level (1 abu, 2 amber, 3 hijau) — pola sama dg badge WiFi.
const scaleBadge = (level: number) =>
  level >= 3
    ? { background: '#dcfce7', color: '#059669', border: '1px solid #bbf7d0' }
    : level === 2
      ? { background: '#fef9c3', color: '#d97706', border: '1px solid #fef08a' }
      : { background: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb' };

// "Diukur X lalu" untuk waktu tes terakhir.
function formatTestedAt(iso: string): string {
  const diffMs = Date.now() - Date.parse(iso);
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'baru saja';
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'baru saja';
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} hari lalu`;
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Community Reviews Section ──────────────────────────────────────────────

function StarRow({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          fill={s <= Math.round(rating) ? '#fbbf24' : 'none'}
          color={s <= Math.round(rating) ? '#fbbf24' : '#d1d5db'}
        />
      ))}
    </div>
  );
}

function CommunityReviews({ cafeId, canWrite, onWriteReview }: { cafeId: string; canWrite: boolean; onWriteReview: () => void }) {
  const { data: reviews = [], isLoading } = useCafeReviews(cafeId);

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviews.length
    : null;

  return (
    <div className="pt-5 border-t border-gray-100 space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ulasan Member</h3>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center gap-1">
            <Users size={9} /> Semeja Kerja
          </span>
        </div>
        {avgRating !== null && (
          <div className="flex items-center gap-1.5">
            <StarRow rating={avgRating} size={12} />
            <span className="text-sm font-bold text-yellow-500">{avgRating.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({reviews.length})</span>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse h-14 bg-gray-100 rounded-xl" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center py-5 text-center gap-2">
          <p className="text-xs text-gray-400">Belum ada ulasan dari member.</p>
          {canWrite && (
            <button
              onClick={onWriteReview}
              className="text-xs font-semibold text-purple-600 hover:text-purple-700 underline underline-offset-2"
            >
              Jadilah yang pertama menulis ulasan
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review: CafeReview) => (
            <div key={review.id} className="bg-gray-50/80 border border-gray-100 rounded-xl px-3.5 py-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-purple-600">
                      {(review.reviewer_name ?? 'A')[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-gray-700">
                    {review.reviewer_name ?? 'Anggota SK'}
                  </span>
                </div>
                {review.rating && <StarRow rating={review.rating} size={11} />}
              </div>
              {review.comment && (
                <p className="text-xs text-gray-600 leading-relaxed pl-8">"{review.comment}"</p>
              )}
              {(review.wifi_speed != null || review.vibes != null) && (
                <div className="flex items-center gap-3 pl-8">
                  {review.wifi_speed != null && (
                    <span className="flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                      <Wifi size={9} /> {review.wifi_speed} Mbps
                    </span>
                  )}
                  {review.vibes != null && (
                    <span className="text-[10px] text-gray-400 font-medium">
                      Suasana {review.vibes}/5
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
          {canWrite && reviews.length >= 3 && (
            <button
              onClick={onWriteReview}
              className="w-full py-2 text-xs font-semibold text-purple-600 hover:text-purple-700 border border-purple-100 hover:border-purple-200 rounded-xl hover:bg-purple-50 transition-all"
            >
              + Tulis Ulasan Kamu
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────

const CafeModal: React.FC<CafeModalProps> = ({ cafe, onClose, access, onRequestLogin, landingUrl }) => {
  const [contributeType, setContributeType] = useState<ContributeType | null>(null);
  const [showHours, setShowHours] = useState(false);
  const [shared, setShared] = useState(false);

  // Salin link detail cafe ke clipboard (URL /cafe/:slug adalah sumber kebenaran).
  const handleShare = async () => {
    const url = `${window.location.origin}/cafe/${cafeSlug(cafe)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback bila Clipboard API tak tersedia (mis. konteks non-HTTPS).
      const el = document.createElement('textarea');
      el.value = url;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  const isGuest = access === 'guest';
  const hasFullMaps = access === 'full';
  // Tier Free (Nyantai): fasilitas diblur + CTA upgrade. Jam buka, harga,
  // speed test & ulasan terbuka. Guest melihat semua detail diblur di balik
  // overlay login.
  const facilitiesLocked = access === 'basic';

  const activeFacilities = Object.entries(cafe.facilities)
    .filter(([, val]) => val)
    .map(([key]) => key);

  // Skala yang sudah terisi (level > 0); 0 = belum ada info → sembunyikan.
  const activeScales = scaleConfig.filter(s => cafe.scales[s.key] > 0);

  // Kecepatan internet: 1 sumber (baris cafe). Label & warna dari download.
  const wd = cafe.wifiDownload;
  const hasWifiData = cafe.wifiTestedAt != null || wd > 0;
  const speedTone = wd >= 50
    ? { bg: '#dcfce7', fg: '#059669', bd: '#bbf7d0', label: 'Super Cepat' }
    : wd >= 25
      ? { bg: '#fef9c3', fg: '#d97706', bd: '#fef08a', label: 'Stabil' }
      : { bg: '#fee2e2', fg: '#dc2626', bd: '#fecaca', label: 'Standar' };

  return (
    <>
      {/* No backdrop on any breakpoint. Mobile is a half-height bottom sheet and
          desktop a floating side panel — both leave the map uncovered so it stays
          pannable/zoomable and the cafe pins visible while the detail is open.
          Close with the X button. */}

      {/* Panel:
          - Mobile: fixed bottom sheet (slides up from bottom)
          - Desktop: absolute right floating panel
      */}
      <div
        className={[
          'glass-panel flex flex-col animate-slide-in-right overflow-hidden',
          // Mobile: half-height bottom sheet — leaves the map visible/pannable above it
          'fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl h-[50vh]',
          // Desktop: right floating panel (height driven by top/bottom)
          'md:absolute md:top-[120px] md:bottom-6 md:right-6 md:left-auto md:w-[380px] md:rounded-3xl md:h-auto',
        ].join(' ')}
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-1 md:hidden" />

        {/* Header image area */}
        <div
          className="relative h-28 sm:h-36 flex items-center justify-center flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${cafe.logoColor}15, ${cafe.logoColor}30)`,
            borderBottom: `1px solid ${cafe.logoColor}22`,
          }}
        >
          <div className="absolute w-40 h-40 sm:w-48 sm:h-48 rounded-full opacity-20" style={{ background: cafe.logoColor, top: '-30px', right: '-30px' }} />
          <div className="absolute w-24 h-24 sm:w-32 sm:h-32 rounded-full opacity-10" style={{ background: cafe.logoColor, bottom: '-20px', left: '20px' }} />

          <div
            className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-xl"
            style={{
              background: cafe.logoColor,
              border: '3px solid white',
              boxShadow: `0 8px 24px ${cafe.logoColor}44`,
            }}
          >
            {cafe.name.slice(0, 2).toUpperCase()}
          </div>

          {cafe.category !== 'regular' && (
            <div
              className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold shadow-md"
              style={{
                background: cafe.category === 'sponsored' ? 'rgba(251, 191, 36, 0.95)' : 'rgba(124, 58, 237, 0.95)',
                color: cafe.category === 'sponsored' ? '#78350f' : '#fff',
                backdropFilter: 'blur(4px)',
              }}
            >
              <CheckCircle2 size={12} />
              {cafe.category === 'sponsored' ? 'Sponsored' : 'Verified Partner'}
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/80 hover:scale-105 shadow-sm bg-white/50 backdrop-blur-md"
            style={{ border: '1px solid rgba(255,255,255,0.8)' }}
          >
            <X size={16} className="text-gray-700" />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 sm:space-y-6">

          {/* Name + Rating */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-bold text-gray-900 text-lg leading-tight">{cafe.name}</h2>
              {cafe.isMitraSemejaKerja && (
                <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200">
                  Mitra SK
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <StarRating rating={cafe.rating} />
              <span className="text-sm font-bold text-yellow-500">{cafe.rating}</span>
              <span className="text-xs font-medium text-gray-400">({cafe.reviewCount} ulasan)</span>
            </div>
            <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
              <MapPin size={12} />{cafe.address}
            </p>
          </div>

          {/* Detail di bawah nama cafe: blur + wajib login untuk guest */}
          <div className="relative">
          <div
            aria-hidden={isGuest}
            className={[
              'space-y-5 sm:space-y-6',
              isGuest ? 'blur-[8px] pointer-events-none select-none max-h-[320px] overflow-hidden' : '',
            ].join(' ')}
          >

          {/* Quick Summary */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl flex-wrap bg-purple-50/80 border border-purple-100/80">
            {cafe.quickSummary.split(' | ').map((item, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-purple-300">•</span>}
                <span className="text-xs font-semibold text-purple-700">{item}</span>
              </React.Fragment>
            ))}
          </div>

          {/* Open status + hours */}
          <div className="flex flex-col gap-2 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
            <div 
              className="flex items-center justify-between cursor-pointer group"
              onClick={() => setShowHours(!showHours)}
            >
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: cafe.isOpenNow ? '#10b981' : '#ef4444', boxShadow: `0 0 8px ${cafe.isOpenNow ? '#10b981' : '#ef4444'}` }} />
                <span className="text-xs font-bold" style={{ color: cafe.isOpenNow ? '#059669' : '#dc2626' }}>
                  {cafe.isOpenNow ? 'Buka Sekarang' : 'Tutup'}
                </span>
                <span className="text-xs text-gray-400 mx-1">•</span>
                <span className="text-xs font-semibold text-gray-500">
                  {cafe.openHours.toLowerCase().includes('tutup') 
                    ? 'Tutup hari ini' 
                    : cafe.isOpenNow 
                      ? `Tutup pukul ${cafe.openHours.split(' - ')[1] || ''}`
                      : `Buka pukul ${cafe.openHours.split(' - ')[0] || ''}`
                  }
                </span>
              </div>
              <div className="p-1 rounded-lg bg-gray-100 text-gray-400 group-hover:bg-gray-200 transition-colors">
                {showHours ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </div>
            
            {showHours && cafe.schedule && cafe.schedule.length > 0 && (
              <div className="pt-2 mt-2 border-t border-gray-200/60 space-y-1">
                {cafe.schedule.map((dayLine, i) => {
                  const formatter = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long' });
                  const todayName = formatter.format(new Date());
                  const isToday = dayLine.toLowerCase().startsWith(todayName.toLowerCase());
                  
                  const parts = dayLine.split(': ');
                  const day = parts[0];
                  const time = parts.slice(1).join(': ');
                  
                  return (
                    <div key={i} className={`flex justify-between text-xs py-0.5 ${isToday ? 'font-bold text-gray-900' : 'text-gray-500 font-medium'}`}>
                      <span className="w-16">{day}</span>
                      <span>{time}</span>
                    </div>
                  )
                })}
              </div>
            )}
            
            {showHours && (!cafe.schedule || cafe.schedule.length === 0) && (
              <div className="pt-2 mt-2 border-t border-gray-200/60 text-xs text-gray-400">
                Jadwal lengkap belum tersedia.
              </div>
            )}
          </div>

          <div className="h-px bg-gray-100" />

          {/* Fasilitas — "Maps lengkap" = Nongkrong+; tier Free melihatnya blur */}
          <div className="relative">
            <div
              aria-hidden={facilitiesLocked}
              className={[
                'space-y-3.5',
                facilitiesLocked ? 'blur-[6px] pointer-events-none select-none' : '',
              ].join(' ')}
            >
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fasilitas</h3>
              <div className="grid grid-cols-2 gap-2">
                {activeFacilities.map(key => {
                  const config = facilityConfig[key];
                  if (!config) return null;
                  const Icon = config.icon;
                  return (
                    <div key={key} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-gray-50/80 border border-gray-100 transition-all hover:bg-white hover:shadow-sm">
                      <Icon size={14} style={{ color: config.color }} />
                      <span className="text-xs font-semibold text-gray-700">{config.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Ukuran & Kapasitas — skala 0-3 (area, parkir, colokan) */}
              {activeScales.length > 0 && (
                <>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-1">Ukuran &amp; Kapasitas</h3>
                  <div className="space-y-2">
                    {activeScales.map(s => {
                      const level = cafe.scales[s.key];
                      const Icon = s.icon;
                      return (
                        <div key={s.key} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-gray-50/80 border border-gray-100">
                          <Icon size={14} style={{ color: '#7c3aed' }} />
                          <span className="text-xs font-semibold text-gray-700">{s.label}</span>
                          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={scaleBadge(level)}>
                            {s.levels[level - 1]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            {facilitiesLocked && (
              <div className="absolute inset-0 z-10 flex items-center justify-center px-4">
                <a
                  href={`${landingUrl}/membership`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 text-xs font-extrabold shadow-md shadow-amber-400/30 hover:shadow-amber-400/50 hover:-translate-y-0.5 transition-all"
                >
                  <Crown size={13} /> Upgrade untuk Fasilitas Lengkap
                </a>
              </div>
            )}
          </div>

          {/* Kecepatan Internet — 1 kartu: nilai tersimpan (Download/Upload) + live test */}
          <div className="pt-5 border-t border-gray-100 space-y-3">
            <div className="px-3 py-3 rounded-xl bg-blue-50/50 border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100/80 flex items-center justify-center flex-shrink-0">
                  <Gauge size={16} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Kecepatan Internet</p>
                  {hasWifiData ? (
                    <div className="flex items-center gap-5 mt-1">
                      <div>
                        <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Download</span>
                        <p className="text-base font-black text-blue-700 leading-none">
                          {cafe.wifiDownload.toFixed(1)} <span className="text-xs font-bold">Mbps</span>
                        </p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Upload</span>
                        <p className="text-base font-black text-blue-700 leading-none">
                          {cafe.wifiUpload.toFixed(1)} <span className="text-xs font-bold">Mbps</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-blue-700/70 mt-0.5">Belum ada data — jalankan test di lokasi</p>
                  )}
                </div>
                {hasWifiData && (
                  <div
                    className="self-start text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm"
                    style={{ background: speedTone.bg, color: speedTone.fg, border: `1px solid ${speedTone.bd}` }}
                  >
                    {speedTone.label}
                  </div>
                )}
              </div>
              {hasWifiData && (cafe.wifiLatency != null || cafe.wifiTestedAt) && (
                <div className="flex items-center gap-3 mt-2 pl-11 text-[11px] font-medium text-blue-600/70">
                  {cafe.wifiLatency != null && <span>Latency {Math.round(cafe.wifiLatency)} ms</span>}
                  {cafe.wifiTestedAt && <span>Diukur {formatTestedAt(cafe.wifiTestedAt)}</span>}
                </div>
              )}
            </div>
            <SpeedTestButton cafe={cafe} />
          </div>

          {/* Community Reviews — semua member; tulis ulasan tetap Nongkrong+ */}
          <CommunityReviews
            cafeId={cafe.id}
            canWrite={hasFullMaps}
            onWriteReview={() => setContributeType('review')}
          />

          {/* Menu Utama */}
          <div className="pt-5 border-t border-gray-100 space-y-3.5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Menu Utama</h3>
            <div className="space-y-1">
              {cafe.menuItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-2 hover:bg-purple-50/50 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <Coffee size={12} className="text-purple-400" />
                    <span className="text-xs font-medium text-gray-800">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold text-purple-700">{item.price}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 px-2">
              <Tag size={12} className="text-gray-400" />
              <span className="text-[11px] font-medium text-gray-500">Rentang Harga: {cafe.priceRange}</span>
            </div>
          </div>

          </div>

          {/* Guest overlay: detail cafe wajib login */}
          {isGuest && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3.5 px-6 text-center">
              <div className="w-11 h-11 rounded-2xl bg-purple-100 flex items-center justify-center shadow-sm">
                <Lock size={20} className="text-purple-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-gray-900">Masuk untuk Lihat Detail Cafe</p>
                <p className="text-xs font-medium text-gray-500 leading-relaxed">
                  Fasilitas, jam buka, ulasan member & info lengkap lainnya khusus member. Gratis!
                </p>
              </div>
              <button
                onClick={onRequestLogin}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 text-white text-sm font-bold shadow-md shadow-purple-500/30 hover:shadow-purple-500/50 hover:-translate-y-0.5 transition-all"
              >
                <LogIn size={15} /> Masuk
              </button>
              <a
                href={`${landingUrl}/auth/register`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-purple-600 hover:underline"
              >
                Belum punya akun? Daftar gratis
              </a>
            </div>
          )}
          </div>
        </div>

        {/* Footer sticky buttons */}
        <div className="border-t border-gray-100 bg-gray-50/50 backdrop-blur-lg">
          {/* Primary actions */}
          <div className="flex gap-2 p-4 pb-2">
            <button
              onClick={handleShare}
              className={[
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all hover:-translate-y-0.5 border',
                shared
                  ? 'bg-emerald-100/70 text-emerald-700 border-emerald-200'
                  : 'bg-purple-100/50 text-purple-700 border-purple-200',
              ].join(' ')}
            >
              {shared ? <Check size={14} /> : <Share2 size={14} />}
              {shared ? 'Link Tersalin' : 'Share Cafe'}
            </button>
            <button
              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${cafe.lat},${cafe.lng}`)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all hover:-translate-y-0.5 bg-purple-100/50 text-purple-700 border border-purple-200"
            >
              <ExternalLink size={14} /> Lihat di Maps
            </button>
          </div>
          {/* Contribute actions — Crowdsource Maps = Nongkrong+ */}
          {hasFullMaps ? (
            <div className="flex gap-1.5 px-4 pb-4">
              <button
                onClick={() => setContributeType('edit')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold text-gray-500 hover:text-purple-700 hover:bg-purple-50 border border-gray-100 hover:border-purple-200 transition-all"
              >
                <Pencil size={12} /> Koreksi Info
              </button>
              <button
                onClick={() => setContributeType('review')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold text-gray-500 hover:text-purple-700 hover:bg-purple-50 border border-gray-100 hover:border-purple-200 transition-all"
              >
                <MessageSquare size={12} /> Tulis Ulasan
              </button>
              <button
                onClick={() => setContributeType('photo')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold text-gray-500 hover:text-purple-700 hover:bg-purple-50 border border-gray-100 hover:border-purple-200 transition-all"
              >
                <Camera size={12} /> Upload Foto
              </button>
            </div>
          ) : isGuest ? (
            <div className="px-4 pb-4">
              <button
                onClick={onRequestLogin}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold text-purple-600 bg-purple-50 border border-purple-100 hover:bg-purple-100 transition-all"
              >
                <LogIn size={12} /> Masuk untuk koreksi info, tulis ulasan & upload foto
              </button>
            </div>
          ) : (
            <div className="px-4 pb-4">
              <a
                href={`${landingUrl}/membership`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-all"
              >
                <Lock size={12} /> Kontribusi (koreksi, ulasan, foto) khusus Nongkrong+
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Contribute modal */}
      {contributeType && (
        <ContributeModal
          type={contributeType}
          cafeId={cafe.id}
          cafeName={cafe.name}
          currentValues={{ phone: cafe.phone ?? '', website: cafe.website ?? '', open_hours: cafe.openHours, name: cafe.name, address: cafe.address }}
          onClose={() => setContributeType(null)}
        />
      )}
    </>
  );
};

export default CafeModal;
