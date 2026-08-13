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

// Review milik user yang login untuk kafe ini (status apa pun) — dipakai
// untuk menyembunyikan/menonaktifkan tombol "Tulis Ulasan" kalau sudah
// pernah kirim (1 review per user per kafe, ditegakkan di DB migration 040).
export function useMyCafeReview(cafeId: string, userId: string | undefined) {
  return useQuery({
    queryKey: ['my-cafe-review', cafeId, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cafe_reviews')
        .select('id, status')
        .eq('cafe_id', cafeId)
        .eq('user_id', userId as string)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as { id: string; status: string } | null;
    },
    staleTime: 30 * 1000,
  });
}
