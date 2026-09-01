import React from 'react';
import type { MonthlyWinner } from '../../hooks/useContributionPoints';

const MONTH_LABELS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function formatMonth(month: string): string {
  const [year, monthNum] = month.split('-');
  return `${MONTH_LABELS[Number(monthNum) - 1]} ${year}`;
}

function WinnerRow({ winner }: { winner: MonthlyWinner }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
      <span className="w-7 text-center text-base flex-none">🏆</span>
      {winner.avatarUrl ? (
        <img
          src={winner.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="w-9 h-9 rounded-full object-cover flex-none"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold flex-none">
          {(winner.fullName ?? '?').trim().charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{winner.fullName ?? 'Anggota SK'}</p>
        <p className="text-xs text-gray-400">{formatMonth(winner.month)}</p>
      </div>
      <span className="font-bold text-purple-600 tabular-nums text-sm flex-none">{winner.totalPoints} poin</span>
    </div>
  );
}

interface MonthlyWinnersListProps {
  winners: MonthlyWinner[];
}

const MonthlyWinnersList: React.FC<MonthlyWinnersListProps> = ({ winners }) => {
  if (winners.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        Belum ada bulan yang selesai — riwayat pemenang muncul di sini setiap awal bulan.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {winners.map(winner => (
        <WinnerRow key={`${winner.month}-${winner.userId}`} winner={winner} />
      ))}
    </div>
  );
};

export default MonthlyWinnersList;
