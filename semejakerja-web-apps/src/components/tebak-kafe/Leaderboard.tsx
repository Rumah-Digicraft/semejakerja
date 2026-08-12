import React from 'react';
import { Loader2 } from 'lucide-react';
import { useTebakKafeLeaderboard } from '../../hooks/useTebakKafeLeaderboard';

const RANK_MEDAL: Record<number, string> = { 0: '🥇', 1: '🥈', 2: '🥉' };

interface LeaderboardProps {
  /** Highlights the current user's row, if they're on the board. */
  currentUserId?: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ currentUserId }) => {
  const { data: entries, isLoading, error } = useTebakKafeLeaderboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-500 text-center py-4">Gagal memuat leaderboard.</p>;
  }

  if (!entries || entries.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        Belum ada skor. Jadilah yang pertama masuk leaderboard!
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
      {entries.map((entry, i) => {
        const isMe = entry.userId === currentUserId;
        return (
          <div
            key={entry.userId}
            className={[
              'flex items-center gap-3 px-2.5 py-2 rounded-xl',
              isMe ? 'bg-purple-50 border border-purple-200' : '',
            ].join(' ')}
          >
            <span className="w-6 text-center text-sm font-bold text-gray-400 flex-none">
              {RANK_MEDAL[i] ?? i + 1}
            </span>
            {entry.avatarUrl ? (
              <img
                src={entry.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover flex-none"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold flex-none">
                {(entry.fullName ?? '?').trim().charAt(0).toUpperCase()}
              </div>
            )}
            <span className={['flex-1 text-sm truncate', isMe ? 'font-bold text-purple-700' : 'font-semibold text-gray-800'].join(' ')}>
              {entry.fullName ?? 'Anonim'}{isMe && ' (Kamu)'}
            </span>
            <span className="font-bold text-purple-600 tabular-nums text-sm flex-none">{entry.score}</span>
          </div>
        );
      })}
    </div>
  );
};

export default Leaderboard;
