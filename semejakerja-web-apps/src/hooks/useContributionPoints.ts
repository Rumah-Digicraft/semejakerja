import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

// Jenis sumber poin — persis nama tabel asalnya (lihat migration 047).
export type ContributionSourceTable = 'cafe_submissions' | 'cafe_edits' | 'cafe_photos';

export const CONTRIBUTION_LABELS: Record<ContributionSourceTable, string> = {
  cafe_submissions: 'Usulan kafe baru',
  cafe_edits: 'Koreksi info',
  cafe_photos: 'Upload foto',
};

export interface LeaderboardEntry {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  totalPoints: number;
  rank: number;
}

const LEADERBOARD_LIMIT = 10;

// Top 10 bulan berjalan — publik, terbaca tanpa login (lihat view
// contribution_leaderboard_current_month di migration 047).
export function useContributionLeaderboard() {
  return useQuery({
    queryKey: ['contribution-leaderboard'],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const { data, error } = await supabase
        .from('contribution_leaderboard_current_month')
        .select('user_id, full_name, avatar_url, total_points, rank')
        .order('rank', { ascending: true })
        .limit(LEADERBOARD_LIMIT);
      if (error) throw new Error(error.message);
      return (data ?? []).map(row => ({
        userId: row.user_id,
        fullName: row.full_name,
        avatarUrl: row.avatar_url,
        totalPoints: row.total_points,
        rank: row.rank,
      }));
    },
    staleTime: 60 * 1000,
  });
}

export interface MyRank {
  totalPoints: number;
  rank: number;
}

// Peringkat sendiri bulan ini — termasuk kalau di luar top 10 (RPC baca
// auth.uid() di server, tidak pernah percaya id dari client).
export function useMyContributionRank(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-contribution-rank', userId],
    enabled: !!userId,
    queryFn: async (): Promise<MyRank | null> => {
      const { data, error } = await supabase.rpc('my_contribution_rank');
      if (error) throw new Error(error.message);
      const row = data?.[0] as { total_points: number; rank: number } | undefined;
      return row ? { totalPoints: row.total_points, rank: row.rank } : null;
    },
    staleTime: 60 * 1000,
  });
}
