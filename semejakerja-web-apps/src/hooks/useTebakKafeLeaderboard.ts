import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { RoundResult } from '../lib/tebakKafe';

export interface LeaderboardEntry {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  score: number;
  updatedAt: string;
}

const LEADERBOARD_LIMIT = 20;

export function useTebakKafeLeaderboard() {
  return useQuery({
    queryKey: ['tebak-kafe-leaderboard'],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const { data, error } = await supabase
        .from('tebak_kafe_scores')
        .select('user_id, full_name, avatar_url, score, updated_at')
        .order('score', { ascending: false })
        .limit(LEADERBOARD_LIMIT);
      if (error) throw new Error(error.message);
      return (data ?? []).map(row => ({
        userId: row.user_id,
        fullName: row.full_name,
        avatarUrl: row.avatar_url,
        score: row.score,
        updatedAt: row.updated_at,
      }));
    },
    staleTime: 30 * 1000,
  });
}

// Submits raw guess coordinates (not the client-computed score) to
// submit_tebak_kafe_score(), which recomputes distance/score server-side
// against the real cafe locations — see migration 039 for why. Returns the
// user's validated best-score total (may be their pre-existing best if this
// run didn't beat it).
export function useSubmitTebakKafeScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (results: RoundResult[]): Promise<number> => {
      const rounds = results.map(r => ({
        cafe_id: r.cafeId,
        guess_lat: r.guessLat,
        guess_lng: r.guessLng,
      }));
      const { data, error } = await supabase.rpc('submit_tebak_kafe_score', { rounds });
      if (error) throw new Error(error.message);
      return data as number;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tebak-kafe-leaderboard'] });
    },
  });
}
