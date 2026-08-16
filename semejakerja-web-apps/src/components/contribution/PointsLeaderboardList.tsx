import React from 'react';
import type { LeaderboardEntry } from '../../hooks/useContributionPoints';

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function LeaderboardRow({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  return (
    <div
      className={[
        'flex items-center gap-3 px-3 py-2.5 rounded-xl',
        isMe ? 'bg-purple-50 border border-purple-200' : '',
      ].join(' ')}
    >
      <span className="w-7 text-center text-sm font-bold text-gray-400 flex-none">
        {RANK_MEDAL[entry.rank] ?? entry.rank}
      </span>
      {entry.avatarUrl ? (
        <img
          src={entry.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="w-9 h-9 rounded-full object-cover flex-none"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold flex-none">
          {(entry.fullName ?? '?').trim().charAt(0).toUpperCase()}
        </div>
      )}
      <span className={['flex-1 text-sm truncate', isMe ? 'font-bold text-purple-700' : 'font-semibold text-gray-800'].join(' ')}>
        {entry.fullName ?? 'Anggota SK'}{isMe && ' (Kamu)'}
      </span>
      <span className="font-bold text-purple-600 tabular-nums text-sm flex-none">{entry.totalPoints} poin</span>
    </div>
  );
}

interface PointsLeaderboardListProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  /** Kalau user login tapi gak masuk top 10, tampilkan baris terpisah. */
  myRankIfOutside?: { rank: number; totalPoints: number } | null;
}

const PointsLeaderboardList: React.FC<PointsLeaderboardListProps> = ({ entries, currentUserId, myRankIfOutside }) => {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        Belum ada kontribusi yang disetujui bulan ini. Jadilah yang pertama!
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {entries.map(entry => (
        <LeaderboardRow key={entry.userId} entry={entry} isMe={entry.userId === currentUserId} />
      ))}

      {myRankIfOutside && (
        <>
          <div className="h-px bg-gray-100 my-1" />
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
            <span>Kamu di peringkat</span>
            <span className="font-bold text-purple-700">#{myRankIfOutside.rank}</span>
            <span>— {myRankIfOutside.totalPoints} poin bulan ini</span>
          </div>
        </>
      )}
    </div>
  );
};

export default PointsLeaderboardList;
