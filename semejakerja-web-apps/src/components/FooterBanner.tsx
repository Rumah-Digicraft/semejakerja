import React from 'react';
import { Users, ArrowRight, Coffee, MapPin } from 'lucide-react';

const FooterBanner: React.FC = () => {
  return (
    <div className="bottom-banner animate-fade-in" style={{ bottom: '24px', right: '24px' }}>
      <div
        className="rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #2e1065 0%, #4c1d95 60%, #3730a3 100%)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          width: '340px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(139, 92, 246, 0.2)',
        }}
      >
        {/* Decorative top gradient */}
        <div
          className="h-1.5"
          style={{ background: 'linear-gradient(to right, #7c3aed, #a855f7, #6d28d9)' }}
        />

        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <Users size={20} color="#c4b5fd" />
            </div>

            {/* Text content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-white font-bold text-base">Semeja Kerja Community</h3>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)' }}
                >
                  Free
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#c4b5fd' }}>
                Bergabung dengan ribuan member, akses diskon eksklusif di cafe mitra kami.
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-5 mb-5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-sm font-medium" style={{ color: '#a78bfa' }}>
                <span className="font-bold text-white">2.4K+</span> Member Aktif
              </span>
            </div>
            <div className="w-px h-5" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <div className="flex items-center gap-2">
              <MapPin size={14} style={{ color: '#a78bfa' }} />
              <span className="text-sm font-medium" style={{ color: '#a78bfa' }}>
                <span className="font-bold text-white">30+</span> Cafe Mitra
              </span>
            </div>
          </div>

          {/* CTA Button */}
          <button
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-base font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 4px 15px rgba(124, 58, 237, 0.4)',
            }}
          >
            <Coffee size={18} />
            Gabung Semeja Kerja
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FooterBanner;
