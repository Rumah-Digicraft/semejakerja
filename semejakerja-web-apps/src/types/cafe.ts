export type CafeCategory = 'sponsored' | 'verified' | 'regular';
export type CafeTier = 'basic' | 'verified' | 'partner' | 'sponsor';

/**
 * Exact shape of a row from the `cafes` table in Supabase.
 * Columns not yet in the DB are omitted — the mapper provides safe defaults.
 */
export interface CafeRow {
  id: string;              // uuid
  name: string;
  address: string;
  lat: number;
  lng: number;
  location: string;        // PostGIS WKB hex — not used directly
  rating: string | number; // Supabase returns numeric as string to preserve precision
  total_reviews: number;
  price_level: number;     // 0 = unknown, 1 = affordable, 2 = mid-range
  phone: string | null;
  website: string | null;
  is_partner: boolean;
  tier?: CafeTier | null;
  discount_value: number;
  open_hours: string | null;
  weekday_text: string | null;
  top_review: string | null;
  clicks: number;
  created_at: string;
  // Kolom enrichment (migration 015) — facilities bisa objek 6-boolean,
  // string JSON, atau array string legacy; selalu lewat normalizeFacilities.
  facilities?: unknown;
  vibes?: number | null;
  // Kecepatan internet (migration 017) — wifi_speed_mbps = DOWNLOAD.
  wifi_speed_mbps?: number | string | null;
  wifi_upload_mbps?: number | string | null;
  wifi_latency_ms?: number | string | null;
  wifi_tested_at?: string | null;
  // Kolom skala (migration 016) — jsonb { area, motorParking, carParking,
  // outlets } 0-3; baris lama bisa null; selalu lewat normalizeScales.
  scales?: unknown;
}

export interface CafeFacility {
  wifi: boolean;
  ac: boolean;
  powerOutlets: boolean;
  mushola: boolean;
  motorParking: boolean;
  carParking: boolean;
  meetingRoom: boolean;
  outdoor: boolean;
  heavyMeal: boolean;
}

// Skala ordinal 0-3 (0 = tidak ada / belum ada info) dari kolom cafes.scales.
export interface CafeScale {
  area: number;
  motorParking: number;
  carParking: number;
  outlets: number;
}

export interface MenuItem {
  name: string;
  price: string;
}

export interface Cafe {
  id: string;
  name: string;
  category: CafeCategory;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  // Kecepatan internet — 1 sumber (baris cafe), di-replace tiap update.
  wifiDownload: number;
  wifiUpload: number;
  wifiLatency: number | null;
  wifiTestedAt: string | null; // waktu pengukuran terakhir (cooldown global 10 mnt)
  vibes: number;           // 1 (tenang) to 5 (ramai) — default 3 until enriched
  facilities: CafeFacility;
  scales: CafeScale;       // area/parkir/colokan 0-3 — default 0 until enriched
  openHours: string;
  schedule: string[];
  isOpenNow: boolean;
  isOpenNight: boolean;
  isMitraSemejaKerja: boolean;
  address: string;
  description: string;
  quickSummary: string;
  menuItems: MenuItem[];
  images: string[];
  logoColor: string;
  markerColor: string;
  priceRange: string;
  // Extra fields from actual DB (optional so mock data doesn't need them)
  phone?: string | null;
  website?: string | null;
  topReview?: string | null;
  discountValue?: number;
  clicks: number;
}

export interface FilterState {
  facilities: string[];
  vibesMin: number;
  vibesMax: number;
  // Filter skala minimum (0 = tanpa filter). Kafe lolos kalau scale >= min.
  areaMin: number;
  motorParkingMin: number;
  carParkingMin: number;
  outletsMin: number;
  openNow: boolean;
  openNight: boolean;
  mitraSemejaKerja: boolean;
}

// ─── Contribution & Moderation Types ─────────────────────────────────────────

export type ContributionStatus = 'pending' | 'approved' | 'rejected';
export type ContributionType = 'submission' | 'edit' | 'review' | 'photo';

export interface CafeSubmission {
  id: string;
  status: ContributionStatus;
  submitter_name: string | null;
  submitter_wa: string | null;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  open_hours: string | null;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}

export interface CafeEditSuggestedData {
  name?: string;
  address?: string;
  phone?: string;
  website?: string;
  open_hours?: string;
  _notes?: string; // internal: alasan perubahan, distrip sebelum kirim ke DB
  [key: string]: string | undefined;
}

export interface CafeEdit {
  id: string;
  cafe_id: string;
  cafe_name?: string; // joined for display
  status: ContributionStatus;
  submitter_name: string | null;
  submitter_wa: string | null;
  suggested_data: CafeEditSuggestedData;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}

export interface CafeReview {
  id: string;
  cafe_id: string;
  cafe_name?: string; // joined for display
  status: ContributionStatus;
  reviewer_name: string | null;
  reviewer_wa: string | null;
  rating: number | null;
  wifi_speed: number | null;
  vibes: number | null;
  comment: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}

export interface CafePhoto {
  id: string;
  cafe_id: string;
  cafe_name?: string; // joined for display
  status: ContributionStatus;
  submitter_name: string | null;
  storage_path: string;
  caption: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}
