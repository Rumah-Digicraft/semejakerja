import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Award, CheckCircle2, Clock, Coffee, LogIn, Loader2, MapPin, Trophy, XCircle,
} from 'lucide-react';
import Seo from '../components/Seo';
import { LoginModal } from '../components/LoginModal';
import { useAuth } from '../hooks/useAuth';
import { useCafes } from '../hooks/useCafes';
import { CONTRIBUTION_LABELS, useMyContributionRank } from '../hooks/useContributionPoints';
import { POINTS_BY_SOURCE, useMyContributionStatus } from '../hooks/useMyContributionStatus';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

const STATUS_STYLE: Record<'pending' | 'approved' | 'rejected', { icon: ReactNode; label: string; badgeCls: string; iconCls: string }> = {
  pending: { icon: <Clock size={16} />, label: 'Menunggu review', badgeCls: 'bg-amber-50 text-amber-600 border-amber-100', iconCls: 'bg-amber-100 text-amber-600' },
  approved: { icon: <CheckCircle2 size={16} />, label: 'Disetujui', badgeCls: 'bg-emerald-50 text-emerald-600 border-emerald-100', iconCls: 'bg-purple-100 text-purple-600' },
  rejected: { icon: <XCircle size={16} />, label: 'Ditolak', badgeCls: 'bg-red-50 text-red-600 border-red-100', iconCls: 'bg-red-100 text-red-600' },
};

function ContributionsList({ userId }: { userId: string }) {
  const { cafes } = useCafes();
  const { data: myRank } = useMyContributionRank(userId);
  const { data: entries, isLoading, error } = useMyContributionStatus(userId);

  const cafeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const cafe of cafes) map.set(cafe.id, cafe.name);
    return map;
  }, [cafes]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-purple-50 border border-purple-100 px-4 py-3.5 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">Poin Bulan Ini</span>
          <span className="text-2xl font-extrabold text-purple-700 tabular-nums">{myRank?.totalPoints ?? 0}</span>
        </div>
        <div className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3.5 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Peringkat Bulan Ini</span>
          <span className="text-2xl font-extrabold text-gray-800 tabular-nums">{myRank ? `#${myRank.rank}` : '—'}</span>
        </div>
      </div>

      <Link to="/papan-kontributor" className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:underline -mt-2">
        <Trophy size={12} /> Lihat papan kontributor
      </Link>

      <div>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Riwayat Kontribusi</h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-500 text-center py-4">Gagal memuat riwayat kontribusi.</p>
        ) : !entries || entries.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            Belum ada kontribusi. Usulkan cafe baru, koreksi info, atau upload foto lewat peta!
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map(entry => {
              const style = STATUS_STYLE[entry.status];
              const cafeName = entry.proposedName ?? (entry.cafeId ? cafeNameById.get(entry.cafeId) : undefined);
              return (
                <div
                  key={entry.id}
                  className="flex flex-col gap-2 px-3.5 py-3 rounded-xl bg-gray-50/80 border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-none ${style.iconCls}`}>
                      {entry.status === 'approved' ? <Award size={16} /> : style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {CONTRIBUTION_LABELS[entry.sourceTable]}
                        {cafeName && <span className="text-gray-400 font-normal"> — {cafeName}</span>}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(entry.createdAt)}</p>
                    </div>
                    {entry.status === 'approved' ? (
                      <span className="font-bold text-purple-600 tabular-nums text-sm flex-none">+{POINTS_BY_SOURCE[entry.sourceTable]}</span>
                    ) : (
                      <span className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${style.badgeCls}`}>
                        {style.icon} {style.label}
                      </span>
                    )}
                  </div>
                  {entry.status === 'rejected' && (
                    <p className="text-xs text-gray-500 bg-white border border-gray-100 rounded-lg px-3 py-2 ml-12">
                      <span className="font-semibold text-gray-600">Alasan: </span>
                      {entry.reviewNote?.trim() || 'Tidak ada catatan dari admin.'}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Kontribusiku() {
  const { user, signInWithGoogle } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="relative w-screen min-h-dvh overflow-y-auto bg-[#e9ecef]">
      <Seo
        title="Kontribusiku | Semeja Kerja"
        description="Riwayat kontribusi dan poin kamu di Peta Cafe Purwokerto."
        path="/kontribusiku"
        noindex
      />

      <header className="sticky top-0 z-50 glass-panel rounded-none flex items-center gap-3 px-4 py-3 sm:px-8 sm:py-5 shadow-lg">
        <Link
          to="/"
          title="Kembali ke peta"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-white/80 border border-white/90 shadow-sm hover:bg-white transition-colors flex-shrink-0"
        >
          <ArrowLeft size={17} className="text-purple-600" />
        </Link>
        <div className="flex items-center gap-2">
          <Coffee size={20} className="text-purple-600" />
          <div className="flex flex-col leading-tight">
            <span className="font-extrabold text-gray-900 text-sm sm:text-base">Kontribusiku</span>
            <span className="text-[11px] text-gray-500 hidden sm:block">Poin & riwayat kontribusimu</span>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="glass-panel rounded-3xl shadow-xl p-6 sm:p-8">
          {user ? (
            <ContributionsList userId={user.id} />
          ) : (
            <div className="flex flex-col items-center text-center gap-4 py-6">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center shadow-sm">
                <MapPin size={22} className="text-purple-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-gray-900">Masuk untuk Lihat Kontribusimu</p>
                <p className="text-xs font-medium text-gray-500 leading-relaxed max-w-xs">
                  Lihat poin bulan ini, peringkatmu, dan riwayat lengkap kontribusi yang sudah disetujui.
                </p>
              </div>
              <button
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 text-white text-sm font-bold shadow-md shadow-purple-500/30 hover:shadow-purple-500/50 hover:-translate-y-0.5 transition-all"
              >
                <LogIn size={15} /> Masuk
              </button>
              <Link to="/papan-kontributor" className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:underline">
                <Trophy size={12} /> Lihat papan kontributor
              </Link>
            </div>
          )}
        </div>
      </div>

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSignInWithGoogle={signInWithGoogle}
        />
      )}
    </div>
  );
}
