// ── CAFE & MAPS ──────────────────────────────────────────────────────────
// Bentuk yang sama dengan CafeFacility di semejakerja-web-apps —
// 9 boolean camelCase, disimpan apa adanya di kolom jsonb cafes.facilities.
// powerOutlets/motorParking/carParking kini turunan dari `scales` (di-set
// scale > 0 saat simpan) dan tidak lagi diedit sebagai chip.
export interface CafeFacilities {
  wifi: boolean
  ac: boolean
  powerOutlets: boolean
  mushola: boolean
  motorParking: boolean
  carParking: boolean
  meetingRoom: boolean
  outdoor: boolean
  heavyMeal: boolean
}

// Skala ordinal 0-3 (0 = tidak ada / belum ada info) di kolom jsonb
// cafes.scales. Sama dengan CafeScale di semejakerja-web-apps.
export interface CafeScales {
  area: number
  motorParking: number
  carParking: number
  outlets: number
}

export interface Cafe {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  location: string | null
  rating: number
  total_reviews: number
  price_level: number
  phone: string | null
  website: string | null
  is_partner: boolean
  tier: 'basic' | 'verified' | 'partner' | 'sponsor'
  discount_value: number | null
  open_hours: string | null
  weekday_text: string[] | null
  // Baris lama bisa masih berbentuk array string / string JSON —
  // selalu baca lewat normalizeFacilities() dari maps/cafes/lib.ts.
  facilities: CafeFacilities | null
  vibes: number
  // Kecepatan internet (migration 017) — wifi_speed_mbps = DOWNLOAD.
  // Diisi manual admin atau live speedtest publik (di-replace tiap update).
  // wifi_tested_at = waktu pengukuran terakhir (dasar cooldown 10 mnt global).
  wifi_speed_mbps: number | null
  wifi_upload_mbps: number | null
  wifi_latency_ms: number | null
  wifi_tested_at: string | null
  // Baris lama bisa null / bentuk tak dikenal — selalu baca lewat
  // normalizeScales() dari maps/cafes/lib.ts.
  scales: CafeScales | null
  clicks: number
  top_review: string | null
  menu_pdf_path: string | null
  created_at: string
}

export type ContributionStatus = 'pending' | 'approved' | 'rejected'

export interface CafeSubmission {
  id: string
  status: ContributionStatus
  user_id: string | null
  submitter_name: string
  submitter_wa: string
  name: string
  address: string
  // Nullable di DB — submission lama (sebelum migration 049) atau kalau
  // kontributor gagal set lokasi tidak punya lat/lng. Trigger
  // create_cafe_from_submission menolak approve kalau ini kosong.
  lat: number | null
  lng: number | null
  maps_url: string | null
  phone: string | null
  website: string | null
  open_hours: string | null
  weekday_text: string[] | null
  price_level: number
  vibes: number
  rating: number
  total_reviews: number
  facilities: CafeFacilities | null
  scales: CafeScales | null
  notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
}

export interface CafeEdit {
  id: string
  cafe_id: string
  status: ContributionStatus
  user_id: string | null
  submitter_name: string
  submitter_wa: string
  suggested_data: Record<string, unknown>
  notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
  cafe?: Cafe
}

export interface CafeReview {
  id: string
  cafe_id: string
  status: ContributionStatus
  user_id: string | null
  reviewer_name: string
  reviewer_wa: string
  rating: number
  wifi_speed: string | null
  vibes: string | null
  comment: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
  cafe?: Cafe
}

export interface CafePhoto {
  id: string
  cafe_id: string
  status: ContributionStatus
  user_id: string | null
  submitter_name: string
  storage_path: string
  caption: string | null
  sort_order: number
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
  cafe?: Cafe
}

// ── USER & MEMBERSHIP ────────────────────────────────────────────────────
export interface UserProfile {
  id: string
  full_name: string | null
  nickname: string | null
  occupation: string | null
  city: string | null
  phone: string | null
  avatar_url: string | null
  is_student: boolean
  student_verified_at: string | null
  ktm_path: string | null
  created_at: string
  email?: string
}

export type MembershipTier = 'nyantai' | 'nongkrong' | 'mode_serius'
export type MembershipStatus = 'active' | 'expired' | 'cancelled' | 'pending_payment'

export interface Membership {
  id: string
  user_id: string
  tier: MembershipTier
  status: MembershipStatus
  started_at: string
  expires_at: string | null
  promo_code_used: string | null
  price_paid: number
  created_at: string
  user_profile?: UserProfile
}

export type PromoCodeType = 'student' | 'event' | 'community' | 'partner' | 'launch'

export interface PromoCode {
  id: string
  code: string
  type: PromoCodeType
  discount_percent: number
  max_usage: number | null
  used_count: number
  locked_to_user_id: string | null
  expires_at: string | null
  is_active: boolean
  campaign_id: string | null
  // Scope ke satu form event (migration 056) — hanya relevan buat type
  // 'event': NULL = berlaku di semua event berbayar, diisi = cuma di
  // form itu. Type lain selalu NULL.
  form_id: string | null
  created_by: string | null
  created_at: string
}

export interface PromoCodeUsage {
  id: string
  code_id: string
  user_id: string
  membership_id: string | null
  used_at: string
  user_profile?: UserProfile
}

// Email allow-list untuk sebuah promo. Tanpa baris = kode terbuka untuk semua.
export interface PromoCodeAllowedEmail {
  id: string
  code_id: string
  email: string
  created_at: string
}

// ── CAMPAIGNS ────────────────────────────────────────────────────────────
export type CampaignObjective =
  | 'launch' | 'membership_growth' | 'event' | 'partner' | 'moves_fill' | 'seasonal' | 'other'
export type CampaignStatus = 'draft' | 'active' | 'ended'
export type CampaignTargetMetric = 'signups' | 'revenue'

export interface Campaign {
  id: string
  name: string
  objective: CampaignObjective
  description: string | null
  target_metric: CampaignTargetMetric | null
  target_value: number | null
  budget: number | null
  starts_at: string | null
  ends_at: string | null
  status: CampaignStatus
  // Launch mode (muka publik di halaman Pricing)
  is_launch: boolean
  is_published: boolean
  discount_percent: number | null
  quota: number | null
  code_valid_days: number
  grace_days: number
  headline: string | null
  subheadline: string | null
  cta_label: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CampaignLeadStatus = 'registered' | 'redeemed'

export interface CampaignLead {
  id: string
  campaign_id: string
  user_id: string
  tier_interest: string | null
  promo_code_id: string | null
  status: CampaignLeadStatus
  email_sent_at: string | null
  created_at: string
  user_profile?: UserProfile
  promo_code?: PromoCode
}

// Ringkasan statistik/ROI per campaign (dihitung di client dari
// promo_codes -> promo_code_usages -> memberships).
export interface CampaignStats {
  code_count: number
  redemptions: number      // sum(used_count) kode di campaign ini
  lead_count: number
  total_discount: number   // rupiah diskon yang diberikan
  total_revenue: number    // rupiah price_paid membership ter-atribusi
}

// ── FORMS (Form builder WFC Bareng Strangers) ────────────────────────────
export type FormStatus = 'draft' | 'open' | 'closed'

// Tipe pertanyaan form builder. 'section' = blok info statis (tanpa jawaban),
// sisanya menampung jawaban. 'radio'/'checkbox'/'dropdown' pakai `options`.
// 'image' = peserta upload 1 gambar (mis. bukti follow IG) ke bucket
// form-uploads; jawabannya public URL string (migration 053).
export type FormQuestionType =
  | 'short_text' | 'paragraph' | 'radio' | 'checkbox'
  | 'dropdown' | 'email' | 'phone' | 'image' | 'section'

// Field user_profiles yang bisa disinkron dua arah dari sebuah pertanyaan
// (autofill dari profil + write-back saat submit). Cocok dengan kolom di
// user_profiles (migration 001/009).
export type ProfileSyncField = 'full_name' | 'nickname' | 'occupation' | 'city' | 'phone'

export interface FormQuestion {
  id: string          // dibuat client (crypto.randomUUID) — jawaban di-key oleh id ini
  type: FormQuestionType
  label: string
  help?: string       // teks bantuan / deskripsi di bawah label
  required?: boolean
  options?: string[]  // untuk radio / checkbox / dropdown
  // Jika di-set, jawaban di-autofill dari user_profiles & di-write-back saat submit.
  profile_field?: ProfileSyncField
}

export interface Form {
  id: string
  title: string
  description: string | null
  cafe_name: string | null
  questions: FormQuestion[]
  quota: number | null
  // Tampilkan kuota/max peserta di halaman publik (kartu landing + list
  // peserta register). false → public_wfc_events nge-NULL-kan quota
  // (migration 054); kuota tetap ditegakkan server-side saat submit.
  show_quota: boolean
  // Biaya pendaftaran dalam rupiah (migration 055). NULL/0 = gratis.
  // > 0 = submit masuk 'pending_payment' → DOKU Checkout (QRIS) →
  // webhook flip ke 'registered'; mode approval TIDAK berlaku.
  price: number | null
  whatsapp_group_url: string | null
  whatsapp_group_label: string | null
  success_message: string | null
  // Template pesan approval (wa.me, {{placeholders}} diisi client-side —
  // lihat buildApprovalWaLink di community/forms/lib.ts).
  whatsapp_approval_message: string | null
  status: FormStatus
  token: string
  // Tampilkan di landing page (homepage + /wfc). Terpisah dari `status`:
  // status=open mengatur penerimaan pendaftaran, show_on_landing mengatur
  // apakah event dipajang publik. Field event opsional untuk kartu landing.
  show_on_landing: boolean
  event_date: string | null
  location: string | null
  // Jam bebas teks (bukan kolom `time`) — admin sering isi "selesai" di jam
  // akhir, bukan jam pasti. Dipakai di template WA approval (037).
  event_time_start: string | null
  event_time_end: string | null
  event_maps_url: string | null
  // false (default): submit langsung dihitung peserta ('registered').
  // true: submit masuk antrian ('pending') sampai admin approve lewat
  // admin_review_form_response (migration 034).
  requires_approval: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

// Jawaban keyed by FormQuestion.id → string (text/radio/dropdown) atau
// string[] (checkbox). Pertanyaan yang sudah dihapus bisa tertinggal
// sebagai key yatim di sini (tidak dibersihkan).
export type FormAnswerValue = string | string[]

// pending: menunggu approval admin (form requires_approval).
// pending_payment: event berbayar, nunggu bayar DOKU (migration 055) —
//   ikut menghitung kuota selama payment_expires_at belum lewat.
// registered: peserta terkonfirmasi, dihitung ke kuota.
// cancelled: dibatalkan user sendiri. rejected: ditolak admin.
// Kedua state terakhir tidak dihitung ke kuota, dan user boleh submit
// ulang (baris di-reuse, lihat submit_form_response migration 034).
export type FormResponseStatus = 'pending' | 'pending_payment' | 'registered' | 'cancelled' | 'rejected'

export interface FormResponse {
  id: string
  form_id: string
  user_id: string | null
  status: FormResponseStatus
  answers: Record<string, FormAnswerValue>
  attended: boolean
  payment_expires_at: string | null
  created_at: string
}

// ── SEMEJA MOVES (Data uses semejamoves-web-apps) ────────────────────────
export type PaymentStatus = 'pending' | 'paid' | 'cancelled'

// ── ADD-ON OLAHRAGA ──────────────────────────────────────────────────────
export interface Addon {
  id: string
  name: string
  description: string | null
  price_per_session: number
  price_monthly: number
  includes_equipment: boolean
  is_active: boolean
  created_at: string
}

export interface AddonSubscription {
  id: string
  user_id: string
  addon_id: string
  status: 'active' | 'expired' | 'cancelled'
  started_at: string
  expires_at: string | null
  price_paid: number | null
  created_at: string
  addon?: Addon
  user_profile?: UserProfile
}

export interface AddonDropin {
  id: string
  addon_id: string
  user_id: string | null
  participant_name: string | null
  participant_wa: string | null
  session_date: string
  payment_status: PaymentStatus
  price_paid: number | null
  confirmed_by: string | null
  confirmed_at: string | null
  created_at: string
  addon?: Addon
}

// ── ADMIN ROLES ──────────────────────────────────────────────────────────
export type AdminRole = 'super_admin' | 'maps_admin' | 'community_admin' | 'moves_admin'

export interface AdminRoleRecord {
  id: string
  user_id: string
  role: AdminRole
  created_at: string
}

// Baris hasil RPC admin_list_admins (admin_roles ⋈ auth.users),
// dikonsumsi halaman /admins lewat /api/admins.
export interface AdminUser {
  user_id: string
  email: string
  role: AdminRole
  created_at: string
}

// ── CASHFLOW (from semejamoves-web-apps) ─────────────────────────────────
export interface CashflowEntry {
  id: string
  session_id: string | null
  sport_type: string
  entry_date: string
  category: 'income' | 'outcome'
  description: string
  amount: number
  source: 'auto' | 'manual'
  notes: string | null
  created_at: string
}

// ── LAPORAN KEUANGAN ─────────────────────────────────────────────────────
export interface BusinessLineFinancial {
  line: 'maps' | 'community' | 'moves' | 'addon'
  label: string
  icon: React.ReactNode
  income: number
  expense: number
  grossProfit: number
  margin: number
  transactions: number
}

export interface MonthlyFinancial {
  month: string
  income: number
  expense: number
  profit: number
}
