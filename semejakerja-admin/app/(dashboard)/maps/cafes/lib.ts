import type { Cafe, CafeFacilities, CafeScales } from '@/types'

// ── Jam operasional ─────────────────────────────────────────────────────
// Data live weekday_text campur aduk: format Google Places Inggris+AM/PM
// ("Monday: 11:00 AM – 10:00 PM", "2:00 – 10:00 PM" dengan meridiem hanya
// di jam tutup, "Open 24 hours", "Closed"), format editor lama Indonesia
// ("Senin: 09:00 - 22:00", "Senin: Tutup"), plus nilai korup "09" dari bug
// split(':') editor lama. Parser di sini menerima semuanya; serializer
// SELALU menulis bentuk kanonik yang dipahami client:
// "Senin: HH:MM - HH:MM" / "Senin: Tutup", urutan Senin..Minggu.

export interface DayHours {
  open: boolean
  from: string // "HH:MM" 24 jam
  to: string
}

export type WeekHours = DayHours[] // selalu 7 elemen, 0=Senin .. 6=Minggu

export const DAY_LABELS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

const DEFAULT_DAY: DayHours = { open: true, from: '09:00', to: '22:00' }

const DAY_NAME_INDEX: Record<string, number> = {
  senin: 0, selasa: 1, rabu: 2, kamis: 3, jumat: 4, sabtu: 5, minggu: 6,
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6,
}

const DAY_PREFIX_RE = /^\s*(senin|selasa|rabu|kamis|jumat|sabtu|minggu|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*:?\s*/i

const pad = (n: number) => String(n).padStart(2, '0')

// Satu sisi rentang waktu: "11:00 AM", "22.30", "9", "12:00 PM".
function parseTimeToken(token: string, inheritMeridiem: string | null): string | null {
  const m = token.match(/(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?/i)
  if (!m) return null
  let hour = Number(m[1])
  const minute = m[2] ? Number(m[2]) : 0
  const meridiem = (m[3] ?? inheritMeridiem)?.toLowerCase() ?? null
  if (hour > 23 || minute > 59) return null
  if (meridiem === 'am' && hour === 12) hour = 0
  if (meridiem === 'pm' && hour !== 12) hour += 12
  if (hour > 23) return null
  return `${pad(hour)}:${pad(minute)}`
}

// "11:00 AM – 10:00 PM" / "09:00 - 22:00" / "2:00 – 10:00 PM" (meridiem
// sisi awal diwarisi dari sisi akhir, sesuai kebiasaan Google Places).
function parseTimeRange(text: string): { from: string; to: string } | null {
  const parts = text.split(/[-–—]/)
  if (parts.length !== 2) return null
  const endMeridiem = parts[1].match(/(am|pm)/i)?.[1] ?? null
  const from = parseTimeToken(parts[0], parts[0].match(/(am|pm)/i) ? null : endMeridiem)
  const to = parseTimeToken(parts[1], null)
  if (!from || !to) return null
  return { from, to }
}

function parseDayLine(text: string): DayHours {
  const lower = text.toLowerCase()
  if (lower.includes('tutup') || lower.includes('closed')) {
    return { open: false, from: '09:00', to: '22:00' } // default disimpan utk re-enable
  }
  if (lower.includes('24 jam') || lower.includes('24jam') || lower.includes('24 hours')) {
    return { open: true, from: '00:00', to: '23:59' }
  }
  const range = parseTimeRange(text)
  if (range) return { open: true, ...range }
  return { ...DEFAULT_DAY } // termasuk nilai korup "09" dari bug editor lama
}

export function parseWeekdayText(raw: string[] | string | null | undefined): WeekHours | null {
  let lines: unknown = raw
  if (typeof lines === 'string') {
    try { lines = JSON.parse(lines) } catch { return null }
  }
  if (!Array.isArray(lines) || lines.length === 0) return null

  const week: WeekHours = DAY_LABELS.map(() => ({ ...DEFAULT_DAY }))
  lines.forEach((line, i) => {
    if (typeof line !== 'string') return
    const dayMatch = line.match(DAY_PREFIX_RE)
    // Array 7 elemen dibaca berdasarkan posisi (cara client membacanya);
    // selain itu berdasarkan nama hari yang dikenali.
    const index = lines.length === 7
      ? i
      : dayMatch ? DAY_NAME_INDEX[dayMatch[1].toLowerCase()] : undefined
    if (index === undefined || index < 0 || index > 6) return
    week[index] = parseDayLine(line.replace(DAY_PREFIX_RE, ''))
  })
  return week
}

export function serializeWeekdayText(week: WeekHours): string[] {
  return week.map((d, i) => `${DAY_LABELS[i]}: ${d.open ? `${d.from} - ${d.to}` : 'Tutup'}`)
}

// Saran isi open_hours (string ringkas yang dipakai client untuk filter
// "Buka Malam" & fallback status buka): rentang tersering di hari buka.
export function suggestOpenHours(week: WeekHours | null): string {
  if (!week) return ''
  const counts = new Map<string, number>()
  for (const d of week) {
    if (!d.open) continue
    const range = `${d.from} - ${d.to}`
    counts.set(range, (counts.get(range) ?? 0) + 1)
  }
  if (counts.size === 0) return 'Tutup'
  const [best] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return best === '00:00 - 23:59' ? '24 Jam' : best
}

// ── Facilities ──────────────────────────────────────────────────────────
export const DEFAULT_FACILITIES: CafeFacilities = {
  wifi: false, ac: false, powerOutlets: false, mushola: false, motorParking: false, carParking: false,
  meetingRoom: false, outdoor: false, heavyMeal: false,
}

// Peta chip editor lama (array string) → key objek client.
const LEGACY_FACILITY_MAP: Record<string, keyof CafeFacilities> = {
  'WiFi': 'wifi', 'AC': 'ac', 'Stopkontak': 'powerOutlets', 'Mushola': 'mushola',
  'Parkir Motor': 'motorParking', 'Parkir Mobil': 'carParking',
  'Meeting Room': 'meetingRoom', 'Outdoor': 'outdoor', 'Makanan Berat': 'heavyMeal',
}

export function normalizeFacilities(raw: unknown): CafeFacilities {
  let value = raw
  if (typeof value === 'string') {
    try { value = JSON.parse(value) } catch { return { ...DEFAULT_FACILITIES } }
  }
  if (Array.isArray(value)) {
    const result = { ...DEFAULT_FACILITIES }
    for (const item of value) {
      const key = LEGACY_FACILITY_MAP[String(item)]
      if (key) result[key] = true
    }
    return result
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return {
      wifi: Boolean(obj.wifi),
      ac: Boolean(obj.ac),
      powerOutlets: Boolean(obj.powerOutlets),
      mushola: Boolean(obj.mushola),
      motorParking: Boolean(obj.motorParking),
      carParking: Boolean(obj.carParking),
      meetingRoom: Boolean(obj.meetingRoom),
      outdoor: Boolean(obj.outdoor),
      heavyMeal: Boolean(obj.heavyMeal),
    }
  }
  return { ...DEFAULT_FACILITIES }
}

// ── Scales (skala ordinal 0-3) ──────────────────────────────────────────
export const DEFAULT_SCALES: CafeScales = {
  area: 0, motorParking: 0, carParking: 0, outlets: 0,
}

const clampScale = (v: unknown): number => Math.min(3, Math.max(0, Math.round(Number(v)) || 0))

export function normalizeScales(raw: unknown): CafeScales {
  let value = raw
  if (typeof value === 'string') {
    try { value = JSON.parse(value) } catch { return { ...DEFAULT_SCALES } }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>
    return {
      area: clampScale(obj.area),
      motorParking: clampScale(obj.motorParking),
      carParking: clampScale(obj.carParking),
      outlets: clampScale(obj.outlets),
    }
  }
  return { ...DEFAULT_SCALES }
}

// ── Form values ↔ DB payload ────────────────────────────────────────────
export interface CafeFormValues {
  name: string
  phone: string
  website: string
  address: string
  lat: number | null
  lng: number | null
  tier: Cafe['tier']
  is_partner: boolean
  discount_value: number | null
  price_level: number
  week: WeekHours | null // null = jadwal per-hari tidak diatur (weekday_text null)
  open_hours: string
  facilities: CafeFacilities
  scales: CafeScales
  vibes: number
  wifi_speed_mbps: number | null // = download
  wifi_upload_mbps: number | null
  wifi_latency_ms: number | null
  wifi_tested_at: string | null // read-only, ditampilkan tapi tak ditulis balik
}

// Kolom yang ditulis form ke tabel cafes. `location` (PostGIS legacy)
// sengaja tidak pernah disertakan. `wifi_tested_at` juga TIDAK ditulis di
// sini — hanya diisi RPC live speedtest, biar edit admin tak nge-block
// cooldown publik.
export interface CafeDbPayload {
  name: string
  address: string
  lat: number
  lng: number
  phone: string | null
  website: string | null
  tier: Cafe['tier']
  is_partner: boolean
  discount_value: number | null
  price_level: number
  weekday_text: string[] | null
  open_hours: string | null
  facilities: CafeFacilities
  scales: CafeScales
  vibes: number
  wifi_speed_mbps: number | null // = download
  wifi_upload_mbps: number | null
  wifi_latency_ms: number | null
}

export const PURWOKERTO_CENTER: [number, number] = [-7.424, 109.23]

export function emptyFormValues(): CafeFormValues {
  return {
    name: '', phone: '', website: '', address: '',
    lat: null, lng: null,
    tier: 'basic', is_partner: false,
    discount_value: null, price_level: 0,
    week: null, open_hours: '',
    facilities: { ...DEFAULT_FACILITIES }, scales: { ...DEFAULT_SCALES }, vibes: 3,
    wifi_speed_mbps: null, wifi_upload_mbps: null, wifi_latency_ms: null, wifi_tested_at: null,
  }
}

export function cafeToFormValues(cafe: Cafe): CafeFormValues {
  return {
    name: cafe.name ?? '',
    phone: cafe.phone ?? '',
    website: cafe.website ?? '',
    address: cafe.address ?? '',
    lat: cafe.lat ?? null,
    lng: cafe.lng ?? null,
    tier: cafe.tier ?? 'basic',
    is_partner: Boolean(cafe.is_partner),
    discount_value: cafe.discount_value ?? null,
    price_level: cafe.price_level ?? 0,
    week: parseWeekdayText(cafe.weekday_text),
    open_hours: cafe.open_hours ?? '',
    facilities: normalizeFacilities(cafe.facilities),
    scales: normalizeScales(cafe.scales),
    vibes: Math.min(5, Math.max(1, Math.round(Number(cafe.vibes)) || 3)),
    wifi_speed_mbps: cafe.wifi_speed_mbps != null ? Number(cafe.wifi_speed_mbps) : null,
    wifi_upload_mbps: cafe.wifi_upload_mbps != null ? Number(cafe.wifi_upload_mbps) : null,
    wifi_latency_ms: cafe.wifi_latency_ms != null ? Number(cafe.wifi_latency_ms) : null,
    wifi_tested_at: cafe.wifi_tested_at ?? null,
  }
}

export function toDbPayload(v: CafeFormValues): CafeDbPayload {
  return {
    name: v.name.trim(),
    address: v.address.trim(),
    lat: v.lat as number,
    lng: v.lng as number,
    phone: v.phone.trim() || null,
    website: v.website.trim() || null,
    tier: v.tier,
    is_partner: v.is_partner,
    discount_value: v.discount_value,
    price_level: v.price_level,
    weekday_text: v.week ? serializeWeekdayText(v.week) : null,
    open_hours: v.open_hours.trim() || null,
    // Option A: skala parkir/colokan sumber kebenaran; boolean lama
    // diturunkan (scale > 0) supaya pembaca lama tetap konsisten.
    facilities: {
      ...v.facilities,
      motorParking: v.scales.motorParking > 0,
      carParking: v.scales.carParking > 0,
      powerOutlets: v.scales.outlets > 0,
    },
    scales: v.scales,
    vibes: v.vibes,
    wifi_speed_mbps: v.wifi_speed_mbps,
    wifi_upload_mbps: v.wifi_upload_mbps,
    wifi_latency_ms: v.wifi_latency_ms,
  }
}

// Validasi minimal; return peta error per-field (kosong = valid).
export function validateForm(v: CafeFormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!v.name.trim()) errors.name = 'Nama kafe wajib diisi'
  if (!v.address.trim()) errors.address = 'Alamat wajib diisi'
  if (v.lat == null || v.lng == null) {
    errors.latlng = 'Tentukan lokasi di peta atau isi lat/lng'
  } else if (v.lat < -90 || v.lat > 90 || v.lng < -180 || v.lng > 180) {
    errors.latlng = 'Koordinat di luar rentang valid'
  }
  if (v.discount_value != null && (v.discount_value < 0 || v.discount_value > 100)) {
    errors.discount_value = 'Diskon harus 0-100'
  }
  if (v.wifi_speed_mbps != null && v.wifi_speed_mbps <= 0) {
    errors.wifi_speed_mbps = 'Download harus lebih dari 0'
  }
  if (v.wifi_upload_mbps != null && v.wifi_upload_mbps <= 0) {
    errors.wifi_upload_mbps = 'Upload harus lebih dari 0'
  }
  // Defensif — kontrol skala hanya bisa emit 0-3, tapi jaga sejajar CHECK DB.
  if (Object.values(v.scales).some(n => n < 0 || n > 3)) {
    errors.scales = 'Skala harus 0-3'
  }
  return errors
}
