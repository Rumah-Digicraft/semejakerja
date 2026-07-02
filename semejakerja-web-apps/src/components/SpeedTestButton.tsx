import React from 'react';
import { Gauge, Loader2, CheckCircle2, AlertTriangle, RotateCcw, Clock3 } from 'lucide-react';
import type { Cafe } from '../types/cafe';
import { useSpeedTest, type SpeedTestErrorReason } from '../hooks/useSpeedTest';

interface SpeedTestButtonProps {
  cafe: Cafe;
}

function formatCooldown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function errorMessage(reason: SpeedTestErrorReason): string {
  switch (reason.kind) {
    case 'permission-denied':
      return 'Izin lokasi ditolak. Aktifkan izin lokasi di browser untuk melakukan test.';
    case 'position-unavailable':
      return 'Tidak dapat mendeteksi lokasi kamu. Coba lagi di area dengan sinyal GPS lebih baik.';
    case 'timeout':
      return 'Deteksi lokasi terlalu lama. Coba lagi.';
    case 'out-of-range': {
      const { distanceM, accuracyM } = reason;
      const accuracyText = accuracyM != null ? `±${accuracyM.toFixed(0)}m` : 'tidak diketahui';
      const lead = accuracyM != null && accuracyM > 15
        ? `Akurasi GPS kurang presisi (${accuracyText}).`
        : `Kamu terlalu jauh dari kafe (${distanceM.toFixed(0)}m).`;
      return `${lead} Jarak: ${distanceM.toFixed(0)}m, akurasi GPS: ${accuracyText}. Test hanya bisa dilakukan saat kamu berada di dalam kafe.`;
    }
    case 'speedtest-failed':
      return 'Test kecepatan gagal. Cek koneksi internet kamu dan coba lagi.';
    case 'submit-failed':
      return 'Hasil test gagal disimpan. Coba lagi.';
    default:
      return 'Terjadi kesalahan. Coba lagi.';
  }
}

const loadingCopy: Record<string, string> = {
  locating: 'Mendeteksi lokasi kamu…',
  'checking-distance': 'Memverifikasi jarak ke kafe…',
  testing: 'Menguji kecepatan download & upload…',
  submitting: 'Menyimpan hasil…',
};

const SpeedTestButton: React.FC<SpeedTestButtonProps> = ({ cafe }) => {
  const { state, runTest, reset, cooldownMs } = useSpeedTest(cafe);

  if (state.status === 'idle' && cooldownMs > 0) {
    return (
      <button
        disabled
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
      >
        <Clock3 size={14} /> Kamu baru saja test di sini · coba lagi {formatCooldown(cooldownMs)}
      </button>
    );
  }

  if (state.status === 'idle') {
    return (
      <button
        onClick={runTest}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all hover:-translate-y-0.5 bg-purple-100/50 text-purple-700 border border-purple-200"
      >
        <Gauge size={14} /> Test Kecepatan Internet
      </button>
    );
  }

  if (
    state.status === 'locating' ||
    state.status === 'checking-distance' ||
    state.status === 'testing' ||
    state.status === 'submitting'
  ) {
    return (
      <button
        disabled
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-purple-100/50 text-purple-700 border border-purple-200 opacity-60 cursor-not-allowed"
      >
        <Loader2 size={14} className="animate-spin" /> {loadingCopy[state.status]}
      </button>
    );
  }

  if (state.status === 'success') {
    const { downloadMbps, uploadMbps } = state.result;
    return (
      <div className="flex flex-col gap-2.5 px-3 py-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
        <div className="flex items-center gap-1.5 text-emerald-600">
          <CheckCircle2 size={13} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Diverifikasi Lokasi GPS</span>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Download</p>
            <p className="text-base font-black text-emerald-700">{downloadMbps.toFixed(1)} Mbps</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Upload</p>
            <p className="text-base font-black text-emerald-700">{uploadMbps.toFixed(1)} Mbps</p>
          </div>
        </div>
        {cooldownMs > 0 ? (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600/70">
            <Clock3 size={11} /> Bisa test lagi dalam {formatCooldown(cooldownMs)}
          </span>
        ) : (
          <button
            onClick={reset}
            className="self-start flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
          >
            <RotateCcw size={11} /> Test Lagi
          </button>
        )}
      </div>
    );
  }

  // state.status === 'error'
  return (
    <div className="flex flex-col gap-2.5 px-3 py-3 rounded-xl bg-red-50/50 border border-red-100">
      <div className="flex items-start gap-1.5 text-red-600">
        <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
        <span className="text-xs font-medium leading-relaxed">{errorMessage(state.reason)}</span>
      </div>
      <button
        onClick={runTest}
        className="self-start flex items-center gap-1.5 text-[11px] font-semibold text-red-700 hover:text-red-800"
      >
        <RotateCcw size={11} /> Coba Lagi
      </button>
    </div>
  );
};

export default SpeedTestButton;
