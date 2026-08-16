import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { CafeEditSuggestedData } from '../types/cafe';

// ── Submit Cafe baru ─────────────────────────────────────────────────────────

export interface NewCafeData {
  cafeName: string;       // renamed from 'name' to avoid conflict with submitter name
  address: string;
  lat?: number;
  lng?: number;
  phone?: string;
  website?: string;
  open_hours?: string;
  notes?: string;
}

// Identitas (submitter_name/wa) TIDAK dikirim dari client — trigger
// cafe_submissions_set_identity (migration 046) yang mengisinya dari akun
// login, sama seperti cafe_edits.
async function submitNewCafe(data: NewCafeData) {
  const { error } = await supabase.from('cafe_submissions').insert({
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
}

// Identitas (submitter_name/wa) TIDAK dikirim dari client — trigger
// cafe_edits_set_identity (migration 041) yang mengisinya dari akun login.
async function submitEdit(data: EditData) {
  const { error } = await supabase.from('cafe_edits').insert({
    cafe_id: data.cafeId,
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
}

// Identitas (nama, WA, user_id) TIDAK dikirim dari client — server (trigger
// cafe_reviews_set_identity, migration 040) yang mengisinya dari akun yang
// login, jadi tidak bisa disamarkan lewat request langsung ke Supabase.
async function submitReview(data: ReviewData) {
  const { error } = await supabase.from('cafe_reviews').insert({
    cafe_id: data.cafeId,
    rating: data.rating,
    comment: data.comment || null,
    wifi_speed: data.wifiSpeed ?? null,
    vibes: data.vibes ?? null,
  });
  if (error) {
    if (error.code === '23505') throw new Error('Kamu sudah pernah menulis ulasan untuk kafe ini.');
    throw new Error(error.message);
  }
}

export function useSubmitReview() {
  return useMutation({ mutationFn: submitReview });
}

// ── Upload foto ──────────────────────────────────────────────────────────────
// `file` di sini SUDAH melalui crop (lihat PhotoCropModal) — selalu blob JPEG,
// bukan file mentah dari input. Path & contentType meniru persis flow admin
// (PhotoManager.tsx) supaya konsisten. Identitas (submitter_name) TIDAK
// dikirim dari client — trigger cafe_photos_set_identity (migration 041)
// yang mengisinya dari akun yang login.

export interface PhotoData {
  cafeId: string;
  file: Blob;
  caption?: string;
}

async function submitPhoto(data: PhotoData) {
  const path = `${data.cafeId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('cafe-photos')
    .upload(path, data.file, { upsert: false, contentType: 'image/jpeg' });
  if (uploadError) throw new Error(uploadError.message);

  const { error: dbError } = await supabase.from('cafe_photos').insert({
    cafe_id: data.cafeId,
    storage_path: path,
    caption: data.caption || null,
  });
  if (dbError) {
    await supabase.storage.from('cafe-photos').remove([path]);
    throw new Error(dbError.message);
  }
}

export function useSubmitPhoto() {
  return useMutation({ mutationFn: submitPhoto });
}
