import type { Cafe } from '../types/cafe';
import { haversineDistanceMeters } from './geo';

export const ROUND_COUNT = 5;

// Score decays exponentially with distance — full marks near the pin, close
// to zero once you're several km off. 900m tuned so a "wrong side of the
// same street" guess still nets a solid score, but a different kecamatan doesn't.
const DECAY_METERS = 900;
const MAX_POINTS = 1000;

export interface VerdictTier {
  label: string;
  tier: 'good' | 'mid' | 'critical';
}

export function verdictForDistance(distanceMeters: number): VerdictTier {
  if (distanceMeters < 120) return { label: 'Tepat di Kursinya!', tier: 'good' };
  if (distanceMeters < 500) return { label: 'Kelihatan dari Teras', tier: 'good' };
  if (distanceMeters < 1500) return { label: 'Masih Sekecamatan', tier: 'mid' };
  if (distanceMeters < 4000) return { label: 'Nyasar ke Gang Sebelah', tier: 'mid' };
  return { label: 'Nyasar Jauh Banget', tier: 'critical' };
}

export function scoreForDistance(distanceMeters: number): number {
  return Math.round(MAX_POINTS * Math.exp(-distanceMeters / DECAY_METERS));
}

export function distanceBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return haversineDistanceMeters(a.lat, a.lng, b.lat, b.lng);
}

export function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

const RANK_TIERS: { min: number; label: string }[] = [
  { min: 0.85, label: 'Warga Purwokerto Sejati' },
  { min: 0.65, label: 'Anak Nongkrong Berpengalaman' },
  { min: 0.40, label: 'Turis yang Lumayan Jeli' },
  { min: 0.20, label: 'Nyasar Tapi Ceria' },
  { min: 0, label: 'Butuh GPS Tambahan' },
];

export function rankForScore(totalScore: number, rounds = ROUND_COUNT): string {
  const pct = totalScore / (rounds * MAX_POINTS);
  return (RANK_TIERS.find(t => pct >= t.min) ?? RANK_TIERS[RANK_TIERS.length - 1]).label;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Picks cafes with usable coordinates, preferring ones with at least a
// little facility/rating data so the clue card isn't blank.
export function pickRoundCafes(cafes: Cafe[], count = ROUND_COUNT): Cafe[] {
  const valid = cafes.filter(c => Number.isFinite(c.lat) && Number.isFinite(c.lng) && c.lat !== 0 && c.lng !== 0);
  const withSignal = valid.filter(c => c.rating > 0 || Object.values(c.facilities).some(Boolean));
  const pool = withSignal.length >= count ? withSignal : valid;
  return shuffle(pool).slice(0, count);
}

export interface RoundResult {
  cafeId: string;
  cafeName: string;
  distanceMeters: number;
  points: number;
  verdict: VerdictTier;
}
