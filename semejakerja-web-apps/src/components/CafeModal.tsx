import React, { useState } from 'react';
import {
  X, Star, Wifi, Zap, Wind, BookOpen, Bike, Car,
  CheckCircle2, Clock, Gauge, Tag,
  Coffee, MapPin, Phone, ExternalLink,
  Pencil, MessageSquare, Camera, Users,
} from 'lucide-react';
import type { Cafe, CafeReview } from '../types/cafe';
import { ContributeModal, type ContributeType } from './contribute/ContributeModal';
import { useCafeReviews } from '../hooks/useCafeReviews';

interface CafeModalProps {
  cafe: Cafe;
  onClose: () => void;
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

const facilityConfig: Record<string, { label: string; icon: React.FC<any>; color: string }> = {
  wifi: { label: 'WiFi Cepat', icon: Wifi, color: '#2563eb' },
  powerOutlets: { label: 'Banyak Colokan', icon: Zap, color: '#d97706' },
  ac: { label: 'AC Sejuk', icon: Wind, color: '#0891b2' },
  mushola: { label: 'Mushola', icon: BookOpen, color: '#059669' },
  motorParking: { label: 'Parkir Motor', icon: Bike, color: '#7c3aed' },
  carParking: { label: 'Parkir Mobil', icon: Car, color: '#4f46e5' },
};

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

function CommunityReviews({ cafeId, onWriteReview }: { cafeId: string; onWriteReview: () => void }) {
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
          <button
            onClick={onWriteReview}
            className="text-xs font-semibold text-purple-600 hover:text-purple-700 underline underline-offset-2"
          >
            Jadilah yang pertama menulis ulasan
          </button>
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
          {reviews.length >= 3 && (
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

const CafeModal: React.FC<CafeModalProps> = ({ cafe, onClose }) => {
  const [discountClaimed, setDiscountClaimed] = useState(false);
  const [contributeType, setContributeType] = useState<ContributeType | null>(null);

  const activeFacilities = Object.entries(cafe.facilities)
    .filter(([, val]) => val)
    .map(([key]) => key);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 md:hidden bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-40 hidden md:block" onClick={onClose} />

      {/* Panel:
          - Mobile: fixed bottom sheet (slides up from bottom)
          - Desktop: absolute right floating panel
      */}
      <div
        className={[
          'glass-panel flex flex-col animate-slide-in-right overflow-hidden',
          // Mobile: bottom sheet
          'fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl max-h-[90vh]',
          // Desktop: right floating panel
          'md:absolute md:top-[120px] md:bottom-6 md:right-6 md:left-auto md:w-[380px] md:rounded-3xl md:max-h-none',
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: cafe.isOpenNow ? '#10b981' : '#ef4444', boxShadow: `0 0 8px ${cafe.isOpenNow ? '#10b981' : '#ef4444'}` }} />
              <span className="text-xs font-bold" style={{ color: cafe.isOpenNow ? '#059669' : '#dc2626' }}>
                {cafe.isOpenNow ? 'Buka Sekarang' : 'Tutup'}
              </span>
            </div>
            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
              <Clock size={12} />{cafe.openHours}
            </span>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Fasilitas */}
          <div className="space-y-3.5">
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
          </div>

          {/* Internet Speed */}
          <div className="pt-5 border-t border-gray-100">
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-blue-50/50 border border-blue-100">
              <div className="w-8 h-8 rounded-xl bg-blue-100/80 flex items-center justify-center flex-shrink-0">
                <Gauge size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Kecepatan Internet</p>
                <p className="text-base font-black text-blue-700">{cafe.wifiSpeed} Mbps</p>
              </div>
              <div className="ml-auto">
                <div
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm"
                  style={{
                    background: cafe.wifiSpeed >= 50 ? '#dcfce7' : cafe.wifiSpeed >= 25 ? '#fef9c3' : '#fee2e2',
                    color: cafe.wifiSpeed >= 50 ? '#059669' : cafe.wifiSpeed >= 25 ? '#d97706' : '#dc2626',
                    border: `1px solid ${cafe.wifiSpeed >= 50 ? '#bbf7d0' : cafe.wifiSpeed >= 25 ? '#fef08a' : '#fecaca'}`,
                  }}
                >
                  {cafe.wifiSpeed >= 50 ? 'Super Cepat' : cafe.wifiSpeed >= 25 ? 'Stabil' : 'Standar'}
                </div>
              </div>
            </div>
          </div>

          {/* Community Reviews */}
          <CommunityReviews
            cafeId={cafe.id}
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

          {/* CTA: Klaim Diskon */}
          {cafe.isMitraSemejaKerja && (
            <>
              <div className="h-px bg-gray-100" />
              <button
                onClick={() => setDiscountClaimed(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all shadow-md text-white"
                style={{
                  background: discountClaimed
                    ? 'linear-gradient(135deg, #059669, #047857)'
                    : 'linear-gradient(135deg, #10b981, #059669)',
                }}
              >
                <CheckCircle2 size={16} />
                {discountClaimed ? 'Diskon Berhasil Diklaim! 🎉' : 'Klaim Diskon Semeja Kerja'}
              </button>
            </>
          )}
        </div>

        {/* Footer sticky buttons */}
        <div className="border-t border-gray-100 bg-gray-50/50 backdrop-blur-lg">
          {/* Primary actions */}
          <div className="flex gap-2 p-4 pb-2">
            <button
              onClick={() => cafe.phone && window.open(`tel:${cafe.phone}`)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all hover:-translate-y-0.5 bg-purple-100/50 text-purple-700 border border-purple-200"
            >
              <Phone size={14} /> Hubungi
            </button>
            <button
              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${cafe.lat},${cafe.lng}`)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all hover:-translate-y-0.5 bg-purple-100/50 text-purple-700 border border-purple-200"
            >
              <ExternalLink size={14} /> Lihat di Maps
            </button>
          </div>
          {/* Contribute actions */}
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
