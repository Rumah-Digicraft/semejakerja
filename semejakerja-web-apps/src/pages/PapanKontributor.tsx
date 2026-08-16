import { Link } from 'react-router-dom';
import { ArrowLeft, Coffee, Loader2, Trophy } from 'lucide-react';
import Seo from '../components/Seo';
import PointsLeaderboardList from '../components/contribution/PointsLeaderboardList';
import { useAuth } from '../hooks/useAuth';
import { useContributionLeaderboard, useMyContributionRank } from '../hooks/useContributionPoints';

export default function PapanKontributor() {
  const { user } = useAuth();
  const { data: entries, isLoading, error } = useContributionLeaderboard();
  const { data: myRank } = useMyContributionRank(user?.id);

  const isInTop10 = !!entries?.some(e => e.userId === user?.id);
  const myRankIfOutside = user && myRank && !isInTop10 ? myRank : null;

  return (
    <div className="relative w-screen min-h-dvh overflow-y-auto bg-[#e9ecef]">
      <Seo
        title="Papan Kontributor | Semeja Kerja"
        description="Peringkat member paling aktif berkontribusi ke Peta Cafe Purwokerto bulan ini — usulan kafe baru, koreksi info, dan upload foto."
        path="/papan-kontributor"
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
            <span className="font-extrabold text-gray-900 text-sm sm:text-base">Papan Kontributor</span>
            <span className="text-[11px] text-gray-500 hidden sm:block">Member paling aktif bulan ini</span>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="glass-panel rounded-3xl shadow-xl p-6 sm:p-8 flex flex-col gap-5">
          <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-wide">
            <Trophy size={14} /> Reset tiap awal bulan
          </div>
          <p className="text-sm text-gray-500 leading-relaxed -mt-2">
            Poin didapat dari kontribusi yang disetujui tim: usulan kafe baru, koreksi info, dan upload foto.
            Kontributor teratas bulan ini dapat hadiah dari Semeja Kerja.
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : error ? (
            <p className="text-sm text-red-500 text-center py-4">Gagal memuat papan kontributor.</p>
          ) : (
            <PointsLeaderboardList
              entries={entries ?? []}
              currentUserId={user?.id}
              myRankIfOutside={myRankIfOutside}
            />
          )}
        </div>
      </div>
    </div>
  );
}
