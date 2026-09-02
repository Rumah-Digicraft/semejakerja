import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

export interface SavedCafeEntry {
  id: string;
  cafeId: string;
  createdAt: string;
}

// Full list of a user's saved cafes, newest first — cafe details are cross-
// referenced client-side against useCafes()'s already-loaded list (same
// idiom as Kontribusiku's cafeNameById), so this only needs the join table.
export function useSavedCafes(userId: string | undefined) {
  return useQuery({
    queryKey: ['saved-cafes', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_cafes')
        .select('id, cafe_id, created_at')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map(row => ({
        id: row.id as string,
        cafeId: row.cafe_id as string,
        createdAt: row.created_at as string,
      })) as SavedCafeEntry[];
    },
    staleTime: 30 * 1000,
  });
}

// Whether the given cafe is already saved by this user — drives the
// bookmark toggle icon in CafeModal.
export function useIsCafeSaved(cafeId: string, userId: string | undefined) {
  return useQuery({
    queryKey: ['is-cafe-saved', cafeId, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_cafes')
        .select('id')
        .eq('cafe_id', cafeId)
        .eq('user_id', userId as string)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as { id: string } | null;
    },
    staleTime: 30 * 1000,
  });
}

// user_id is never sent from the client — the column defaults to auth.uid()
// (migration 058), so a request can only ever save/unsave on its own behalf.
export function useToggleSavedCafe(cafeId: string, userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (nextSaved: boolean) => {
      if (!userId) throw new Error('Masuk dulu untuk menyimpan cafe.');
      if (nextSaved) {
        const { error } = await supabase.from('saved_cafes').insert({ cafe_id: cafeId });
        // 23505 = unique violation — already saved (e.g. a duplicate tap), harmless.
        if (error && error.code !== '23505') throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('saved_cafes')
          .delete()
          .eq('cafe_id', cafeId)
          .eq('user_id', userId);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-cafe-saved', cafeId, userId] });
      queryClient.invalidateQueries({ queryKey: ['saved-cafes', userId] });
    },
  });
}
