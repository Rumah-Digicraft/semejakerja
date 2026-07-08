import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { parseOpenStatus, parseRangeStatus } from '../lib/openHours';
import type { Cafe, CafeCategory, CafeFacility, CafeScale, CafeTier, CafeRow } from '../types/cafe';

// ---------- helpers ----------

const PRICE_RANGE: Record<number, string> = {
  0: 'Belum ada info harga',
  1: 'Rp 0 - 25.000',
  2: 'Rp 25.000 - 50.000',
  3: 'Rp 50.000 - 150.000',
  4: 'Rp 150.000 - 300.000',
};

const CATEGORY_COLOR: Record<CafeCategory, string> = {
  sponsored: '#F59E0B', // Amber/Gold
  verified: '#7c3aed',  // Purple-700
  regular: '#a855f7',   // Purple-500
};

const DEFAULT_FACILITIES: CafeFacility = {
  wifi: false,
  ac: false,
  powerOutlets: false,
  mushola: false,
  motorParking: false,
  carParking: false,
  meetingRoom: false,
  outdoor: false,
  heavyMeal: false,
};

// Peta chip editor admin lama (array string) → key objek client.
const LEGACY_FACILITY_MAP: Record<string, keyof CafeFacility> = {
  'WiFi': 'wifi',
  'AC': 'ac',
  'Stopkontak': 'powerOutlets',
  'Mushola': 'mushola',
  'Parkir Motor': 'motorParking',
  'Parkir Mobil': 'carParking',
  'Meeting Room': 'meetingRoom',
  'Outdoor': 'outdoor',
  'Makanan Berat': 'heavyMeal',
};

// cafes.facilities di DB bisa objek boolean (bentuk kanonik sejak
// migration 015/016), string JSON, atau array string legacy — normalkan semua.
function normalizeFacilities(raw: unknown): CafeFacility {
  let value = raw;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return DEFAULT_FACILITIES; }
  }
  if (Array.isArray(value)) {
    const result = { ...DEFAULT_FACILITIES };
    for (const item of value) {
      const key = LEGACY_FACILITY_MAP[String(item)];
      if (key) result[key] = true;
    }
    return result;
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
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
    };
  }
  return DEFAULT_FACILITIES;
}

const DEFAULT_SCALES: CafeScale = {
  area: 0,
  motorParking: 0,
  carParking: 0,
  outlets: 0,
};

const clampScale = (v: unknown): number => Math.min(3, Math.max(0, Math.round(Number(v)) || 0));

// cafes.scales di DB adalah jsonb { area, motorParking, carParking, outlets }
// 0-3; baris lama bisa null / bentuk tak dikenal — normalkan & clamp.
function normalizeScales(raw: unknown): CafeScale {
  let value = raw;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return DEFAULT_SCALES; }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    return {
      area: clampScale(obj.area),
      motorParking: clampScale(obj.motorParking),
      carParking: clampScale(obj.carParking),
      outlets: clampScale(obj.outlets),
    };
  }
  return DEFAULT_SCALES;
}

// ---------- mapper ----------

function mapRowToCafe(row: CafeRow): Cafe {
  // Use explicit tier column; fall back to is_partner for rows not yet updated
  const tier: CafeTier = row.tier ?? (row.is_partner ? 'partner' : 'basic');

  const category: CafeCategory =
    tier === 'sponsor'  ? 'sponsored' :
    tier === 'verified' ? 'verified'  :
    'regular';

  const color = CATEGORY_COLOR[category];

  let schedule: string[] = [];
  if (row.weekday_text) {
    if (Array.isArray(row.weekday_text)) schedule = row.weekday_text;
    else if (typeof row.weekday_text === 'string') {
      try {
        const parsed = JSON.parse(row.weekday_text);
        if (Array.isArray(parsed)) schedule = parsed;
      } catch {
        // malformed weekday_text — leave schedule empty
      }
    }
  }

  let isOpenNow: boolean;
  let isOpenNight: boolean;
  let todayStatus = row.open_hours ?? 'Jam buka tidak tersedia';

  if (schedule.length === 7) {
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', weekday: 'long', hour: 'numeric', minute: 'numeric', hour12: false });
    const dateParts = formatter.formatToParts(new Date());
    const dayStr = dateParts.find(p => p.type === 'weekday')?.value; // "Monday"
    const hourStr = dateParts.find(p => p.type === 'hour')?.value;
    const minStr = dateParts.find(p => p.type === 'minute')?.value;
    const currentMins = parseInt(hourStr || '0') * 60 + parseInt(minStr || '0');

    const dayMap: Record<string, number> = { 'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4, 'Saturday': 5, 'Sunday': 6 };
    const dayIndex = dayMap[dayStr || 'Monday'];

    const todayText = schedule[dayIndex] || '';
    todayStatus = todayText.split(': ').slice(1).join(': ') || todayText; // e.g. "09:00 - 22:00"

    // Derive BOTH open-now and open-night from today's schedule line, so the
    // "Buka Malam" filter stays consistent with the hours actually shown.
    // Only fall back to the summary open_hours when today's line is unparseable.
    const status = parseRangeStatus(todayStatus, currentMins) ?? parseOpenStatus(row.open_hours);
    isOpenNow = status.isOpenNow;
    isOpenNight = status.isOpenNight;
  } else {
    const status = parseOpenStatus(row.open_hours);
    isOpenNow = status.isOpenNow;
    isOpenNight = status.isOpenNight;
  }

  return {
    id: row.id,
    name: row.name,
    category,
    lat: row.lat,
    lng: row.lng,
    rating: parseFloat(String(row.rating)) || 0,
    reviewCount: row.total_reviews ?? 0,
    wifiDownload: parseFloat(String(row.wifi_speed_mbps ?? '')) || 0,
    wifiUpload: parseFloat(String(row.wifi_upload_mbps ?? '')) || 0,
    wifiLatency: row.wifi_latency_ms != null ? Number(row.wifi_latency_ms) : null,
    wifiTestedAt: (row.wifi_tested_at as string | null) ?? null,
    vibes: Math.min(5, Math.max(1, Math.round(Number(row.vibes)) || 3)),
    facilities: normalizeFacilities(row.facilities),
    scales: normalizeScales(row.scales),
    openHours: todayStatus,
    schedule,
    isOpenNow: isOpenNow,
    isOpenNight: isOpenNight,
    isMitraSemejaKerja: tier === 'partner',
    address: row.address,
    description: '',
    quickSummary: PRICE_RANGE[row.price_level] ?? PRICE_RANGE[0],
    menuItems: [],
    images: [],
    logoColor: color,
    markerColor: color,
    priceRange: PRICE_RANGE[row.price_level] ?? PRICE_RANGE[0],
    phone: row.phone,
    website: row.website,
    topReview: null,
    discountValue: row.discount_value ?? 0,
    clicks: row.clicks ?? 0,
  };
}

// ---------- fetcher ----------

// Only the columns mapRowToCafe reads — select('*') doubles the payload
// (~396 KB vs ~191 KB for 390 cafes), which mobile users pay on every load.
const CAFE_COLUMNS =
  'id,name,lat,lng,rating,total_reviews,tier,is_partner,open_hours,weekday_text,' +
  'address,price_level,phone,website,discount_value,clicks,facilities,vibes,' +
  'wifi_speed_mbps,wifi_upload_mbps,wifi_latency_ms,wifi_tested_at,scales';

async function fetchCafes(): Promise<Cafe[]> {
  const { data, error } = await supabase
    .from('cafes')
    .select(CAFE_COLUMNS)
    .order('total_reviews', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as unknown as CafeRow[]).map(mapRowToCafe);
}

// ---------- hook ----------

export interface UseCafesResult {
  cafes: Cafe[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCafes(): UseCafesResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['cafes'],
    queryFn: fetchCafes,
  });

  return {
    cafes: data ?? [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch: () => { refetch(); },
  };
}
