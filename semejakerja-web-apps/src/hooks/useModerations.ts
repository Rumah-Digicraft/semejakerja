import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { CafeSubmission, CafeEdit, CafeReview, CafePhoto } from '../types/cafe';

// ── Pending counts (untuk badge nav) ────────────────────────────────────────

async function fetchPendingCounts() {
  const [submissions, edits, reviews, photos] = await Promise.all([
    supabase.from('cafe_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('cafe_edits').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('cafe_reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('cafe_photos').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);
  return {
    submissions: submissions.count ?? 0,
    edits: edits.count ?? 0,
    reviews: reviews.count ?? 0,
    photos: photos.count ?? 0,
    total: (submissions.count ?? 0) + (edits.count ?? 0) + (reviews.count ?? 0) + (photos.count ?? 0),
  };
}

export function usePendingCounts() {
  return useQuery({
    queryKey: ['moderation', 'counts'],
    queryFn: fetchPendingCounts,
    staleTime: 60_000,
  });
}

// ── List pending per tipe ────────────────────────────────────────────────────

export function usePendingSubmissions() {
  return useQuery({
    queryKey: ['moderation', 'submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cafe_submissions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as CafeSubmission[];
    },
    staleTime: 60_000,
  });
}

export function usePendingEdits() {
  return useQuery({
    queryKey: ['moderation', 'edits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cafe_edits')
        .select('*, cafes(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []).map((row: CafeEdit & { cafes?: { name: string } | null }) => ({
        ...row,
        cafe_name: row.cafes?.name ?? '—',
      })) as CafeEdit[];
    },
    staleTime: 60_000,
  });
}

export function usePendingReviews() {
  return useQuery({
    queryKey: ['moderation', 'reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cafe_reviews')
        .select('*, cafes(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []).map((row: CafeReview & { cafes?: { name: string } | null }) => ({
        ...row,
        cafe_name: row.cafes?.name ?? '—',
      })) as CafeReview[];
    },
    staleTime: 60_000,
  });
}

export function usePendingPhotos() {
  return useQuery({
    queryKey: ['moderation', 'photos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cafe_photos')
        .select('*, cafes(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []).map((row: CafePhoto & { cafes?: { name: string } | null }) => ({
        ...row,
        cafe_name: row.cafes?.name ?? '—',
      })) as CafePhoto[];
    },
    staleTime: 60_000,
  });
}

// ── Approve / Reject actions ─────────────────────────────────────────────────

type ModerationTable = 'cafe_submissions' | 'cafe_edits' | 'cafe_reviews' | 'cafe_photos';

interface ReviewAction {
  table: ModerationTable;
  id: string;
  status: 'approved' | 'rejected';
  reviewedBy: string;
  reviewNote?: string;
  // Extra payload for approve actions that need to write to cafes table
  applyPayload?: Record<string, unknown>;
}

async function reviewContribution({ table, id, status, reviewedBy, reviewNote, applyPayload }: ReviewAction) {
  const { error } = await supabase
    .from(table)
    .update({
      status,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote ?? null,
    })
    .eq('id', id);
  if (error) throw new Error(error.message);

  // Apply approved café submission → insert into cafes
  if (status === 'approved' && table === 'cafe_submissions' && applyPayload) {
    const { error: insertErr } = await supabase.from('cafes').insert(applyPayload);
    if (insertErr) throw new Error(insertErr.message);
  }

  // Apply approved edit → patch cafes
  if (status === 'approved' && table === 'cafe_edits' && applyPayload) {
    const { cafeId, ...fields } = applyPayload as { cafeId: string; [k: string]: unknown };
    const { error: patchErr } = await supabase.from('cafes').update(fields).eq('id', cafeId);
    if (patchErr) throw new Error(patchErr.message);
  }
}

export function useReviewContribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reviewContribution,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation'] });
      queryClient.invalidateQueries({ queryKey: ['cafes'] });
    },
  });
}
