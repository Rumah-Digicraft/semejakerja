import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { CafeReview } from '../types/cafe';

export function useCafeReviews(cafeId: string) {
  return useQuery({
    queryKey: ['cafe-reviews', cafeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cafe_reviews')
        .select('*')
        .eq('cafe_id', cafeId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as CafeReview[];
    },
    staleTime: 2 * 60 * 1000,
  });
}
