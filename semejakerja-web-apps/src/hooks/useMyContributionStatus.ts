import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { ContributionSourceTable } from './useContributionPoints';

// Poin per tipe kontribusi — sama persis dengan angka yang di-hardcode di
// trigger award_points_* (migration 047). Dipakai cuma buat tampilan
// "+20" pada entri yang sudah disetujui, bukan sumber kebenaran poin
// (itu tetap contribution_points/RPC my_contribution_rank).
export const POINTS_BY_SOURCE: Record<ContributionSourceTable, number> = {
  cafe_submissions: 20,
  cafe_edits: 15,
  cafe_photos: 10,
};

export interface MyContributionStatusEntry {
  id: string;
  sourceTable: ContributionSourceTable;
  status: 'pending' | 'approved' | 'rejected';
  cafeId: string | null;
  proposedName: string | null; // cuma ada di cafe_submissions (kafe belum ada cafe_id-nya)
  reviewNote: string | null;
  createdAt: string;
}

// Riwayat LENGKAP kontribusi milik user — semua status (pending/approved/
// rejected), bukan cuma yang disetujui seperti contribution_points. Perlu
// policy "select own" (migration 051) di ketiga tabel ini supaya user
// biasa bisa baca baris miliknya sendiri.
export function useMyContributionStatus(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-contribution-status', userId],
    enabled: !!userId,
    queryFn: async (): Promise<MyContributionStatusEntry[]> => {
      const [submissions, edits, photos] = await Promise.all([
        supabase.from('cafe_submissions')
          .select('id, status, name, review_note, created_at')
          .eq('user_id', userId as string).order('created_at', { ascending: false }),
        supabase.from('cafe_edits')
          .select('id, status, cafe_id, review_note, created_at')
          .eq('user_id', userId as string).order('created_at', { ascending: false }),
        supabase.from('cafe_photos')
          .select('id, status, cafe_id, review_note, created_at')
          .eq('user_id', userId as string).order('created_at', { ascending: false }),
      ]);
      if (submissions.error) throw new Error(submissions.error.message);
      if (edits.error) throw new Error(edits.error.message);
      if (photos.error) throw new Error(photos.error.message);

      const entries: MyContributionStatusEntry[] = [
        ...(submissions.data ?? []).map(row => ({
          id: row.id, sourceTable: 'cafe_submissions' as const, status: row.status,
          cafeId: null, proposedName: row.name, reviewNote: row.review_note, createdAt: row.created_at,
        })),
        ...(edits.data ?? []).map(row => ({
          id: row.id, sourceTable: 'cafe_edits' as const, status: row.status,
          cafeId: row.cafe_id, proposedName: null, reviewNote: row.review_note, createdAt: row.created_at,
        })),
        ...(photos.data ?? []).map(row => ({
          id: row.id, sourceTable: 'cafe_photos' as const, status: row.status,
          cafeId: row.cafe_id, proposedName: null, reviewNote: row.review_note, createdAt: row.created_at,
        })),
      ];
      return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    staleTime: 30 * 1000,
  });
}
