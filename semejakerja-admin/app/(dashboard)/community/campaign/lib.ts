import type {
  Campaign, CampaignObjective, CampaignStatus, CampaignStats, PromoCode,
} from '@/types'

// ── Label & warna badge (Tailwind) ──────────────────────────
export const OBJECTIVE_LABELS: Record<CampaignObjective, string> = {
  launch: 'Launch',
  membership_growth: 'Tarik Member',
  event: 'Event',
  partner: 'Partner',
  moves_fill: 'Isi Slot Moves',
  seasonal: 'Musiman',
  other: 'Lainnya',
}

export const OBJECTIVE_COLORS: Record<CampaignObjective, string> = {
  launch: 'bg-fuchsia-100 text-fuchsia-700',
  membership_growth: 'bg-purple-100 text-purple-700',
  event: 'bg-amber-100 text-amber-700',
  partner: 'bg-emerald-100 text-emerald-700',
  moves_fill: 'bg-sky-100 text-sky-700',
  seasonal: 'bg-rose-100 text-rose-700',
  other: 'bg-slate-100 text-slate-600',
}

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Draft',
  active: 'Aktif',
  ended: 'Selesai',
}

export const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  active: 'bg-green-100 text-green-700',
  ended: 'bg-slate-200 text-slate-500',
}

export const OBJECTIVE_OPTIONS: { value: CampaignObjective; label: string }[] =
  (Object.keys(OBJECTIVE_LABELS) as CampaignObjective[]).map(v => ({ value: v, label: OBJECTIVE_LABELS[v] }))

// ── Statistik / ROI ─────────────────────────────────────────
// Baris usage minimal yang kita butuhkan dari join
// promo_code_usages -> promo_codes(discount_percent) + memberships(price_paid).
export interface UsageRow {
  code_id: string
  discount_percent: number
  price_paid: number | null
}

// Diskon yang diberikan untuk satu penukaran: base = final / (1 - d/100),
// discount = base - final = final * d / (100 - d). Akurat untuk d < 100.
// Untuk d = 100 (gratis) base tak bisa diturunkan dari price_paid=0 → 0.
export function deriveDiscount(pricePaid: number, discountPercent: number): number {
  if (discountPercent <= 0 || discountPercent >= 100) return 0
  return Math.round((pricePaid * discountPercent) / (100 - discountPercent))
}

export function computeStats(
  codes: Pick<PromoCode, 'id' | 'used_count'>[],
  usages: UsageRow[],
  leadCount: number,
): CampaignStats {
  const redemptions = codes.reduce((s, c) => s + (c.used_count ?? 0), 0)
  let total_revenue = 0
  let total_discount = 0
  for (const u of usages) {
    const paid = u.price_paid ?? 0
    total_revenue += paid
    total_discount += deriveDiscount(paid, u.discount_percent)
  }
  return {
    code_count: codes.length,
    redemptions,
    lead_count: leadCount,
    total_discount,
    total_revenue,
  }
}

// ROI = pemasukan / biaya diskon. Kembalikan null kalau belum ada diskon.
export function computeRoi(stats: CampaignStats): number | null {
  if (stats.total_discount <= 0) return null
  return stats.total_revenue / stats.total_discount
}

// Progres target (0..1) — signups pakai lead_count, revenue pakai total_revenue.
export function targetProgress(campaign: Campaign, stats: CampaignStats): number | null {
  if (!campaign.target_value || campaign.target_value <= 0) return null
  const current = campaign.target_metric === 'revenue' ? stats.total_revenue : stats.lead_count
  return Math.min(current / campaign.target_value, 1)
}

export function emptyCampaignForm() {
  return {
    name: '',
    objective: 'launch' as CampaignObjective,
    description: '',
    is_launch: true,
    discount_percent: 30,
    quota: '' as string | number,
    code_valid_days: 14,
    headline: '',
    subheadline: '',
    cta_label: 'Daftar sekarang',
    starts_at: '',
    ends_at: '',
    target_metric: 'signups' as Campaign['target_metric'],
    target_value: '' as string | number,
    budget: '' as string | number,
  }
}
