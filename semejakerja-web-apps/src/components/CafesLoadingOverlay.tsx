import React from 'react';
import { AlertCircle, RefreshCw, Wifi } from 'lucide-react';

// ---------- Skeleton ----------

function SkeletonPulse({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded bg-white/20 ${className}`} />
  );
}

function MarkerSkeleton({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute flex flex-col items-center animate-pulse"
      style={style}
    >
      <div className="w-9 h-9 rounded-full bg-purple-400/50" />
      <div className="w-0.5 h-3 bg-purple-400/50" />
    </div>
  );
}

// Randomised but deterministic positions so skeletons look like map markers.
const SKELETON_POSITIONS: React.CSSProperties[] = [
  { top: '30%', left: '40%' },
  { top: '45%', left: '60%' },
  { top: '55%', left: '35%' },
  { top: '25%', left: '70%' },
  { top: '65%', left: '55%' },
  { top: '40%', left: '25%' },
];

export function CafesLoadingOverlay() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
      {/* Fake marker skeletons scattered across the map */}
      {SKELETON_POSITIONS.map((pos, i) => (
        <MarkerSkeleton key={i} style={pos} />
      ))}

      {/* Central loading card */}
      <div className="glass-panel relative flex flex-col items-center gap-3 rounded-2xl px-8 py-6 pointer-events-auto shadow-2xl">
        <div className="flex items-center gap-2 text-purple-300">
          <Wifi size={20} className="animate-bounce" />
          <span className="text-sm font-medium text-white">Memuat data cafe…</span>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
        <SkeletonPulse className="w-40 h-3 mt-1" />
        <SkeletonPulse className="w-28 h-3" />
      </div>
    </div>
  );
}

// ---------- Error ----------

interface CafesErrorOverlayProps {
  message: string;
  onRetry: () => void;
}

export function CafesErrorOverlay({ message, onRetry }: CafesErrorOverlayProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-panel flex flex-col items-center gap-4 rounded-2xl px-8 py-6 max-w-sm text-center shadow-2xl">
        <AlertCircle size={36} className="text-red-400" />
        <div>
          <p className="font-semibold text-white">Gagal memuat data cafe</p>
          <p className="mt-1 text-xs text-white/60 break-all">{message}</p>
        </div>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 transition-all px-5 py-2 text-sm font-medium text-white"
        >
          <RefreshCw size={14} />
          Coba lagi
        </button>
      </div>
    </div>
  );
}
