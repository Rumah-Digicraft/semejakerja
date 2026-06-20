import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { CafeEditSuggestedData } from '../types/cafe';

// ── Submit café baru ─────────────────────────────────────────────────────────

export interface NewCafeData {
  cafeName: string;       // renamed from 'name' to avoid conflict with submitter name
  address: string;
  lat?: number;
  lng?: number;
  phone?: string;
  website?: string;
  open_hours?: string;
  notes?: string;
  submitterName?: string;
  submitterWa?: string;
}

async function submitNewCafe(data: NewCafeData) {
  const { error } = await supabase.from('cafe_submissions').insert({
    submitter_name: data.submitterName || null,
    submitter_wa: data.submitterWa || null,
    name: data.cafeName,
    address: data.address,
    lat: data.lat ?? null,
    lng: data.lng ?? null,
    phone: data.phone || null,
    website: data.website || null,
    open_hours: data.open_hours || null,
    notes: data.notes || null,
  });
  if (error) throw new Error(error.message);
}

export function useSubmitNewCafe() {
  return useMutation({ mutationFn: submitNewCafe });
}

// ── Submit saran edit ────────────────────────────────────────────────────────

export interface EditData {
  cafeId: string;
  suggestedData: CafeEditSuggestedData;
  notes?: string;
  submitterName?: string;
  submitterWa?: string;
}

async function submitEdit(data: EditData) {
  const { error } = await supabase.from('cafe_edits').insert({
    cafe_id: data.cafeId,
    submitter_name: data.submitterName || null,
    submitter_wa: data.submitterWa || null,
    suggested_data: data.suggestedData,
    notes: data.notes || null,
  });
  if (error) throw new Error(error.message);
}

export function useSubmitEdit() {
  return useMutation({ mutationFn: submitEdit });
}

// ── Submit review & rating ───────────────────────────────────────────────────

export interface ReviewData {
  cafeId: string;
  rating: number;
  comment?: string;
  wifiSpeed?: number;
  vibes?: number;
  submitterName?: string;
  submitterWa?: string;
}

async function submitReview(data: ReviewData) {
  const { error } = await supabase.from('cafe_reviews').insert({
    cafe_id: data.cafeId,
    reviewer_name: data.submitterName || null,
    reviewer_wa: data.submitterWa || null,
    rating: data.rating,
    comment: data.comment || null,
    wifi_speed: data.wifiSpeed ?? null,
    vibes: data.vibes ?? null,
  });
  if (error) throw new Error(error.message);
}

export function useSubmitReview() {
  return useMutation({ mutationFn: submitReview });
}

// ── Upload foto ──────────────────────────────────────────────────────────────

export interface PhotoData {
  cafeId: string;
  file: File;
  caption?: string;
  submitterName?: string;
  submitterWa?: string;
}

async function submitPhoto(data: PhotoData) {
  const ext = data.file.name.split('.').pop();
  const path = `${data.cafeId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('cafe-photos')
    .upload(path, data.file, { upsert: false });

  if (uploadError) throw new Error(uploadError.message);

  const { error: dbError } = await supabase.from('cafe_photos').insert({
    cafe_id: data.cafeId,
    submitter_name: data.submitterName || null,
    storage_path: path,
    caption: data.caption || null,
  });
  if (dbError) throw new Error(dbError.message);
}

export function useSubmitPhoto() {
  return useMutation({ mutationFn: submitPhoto });
}
