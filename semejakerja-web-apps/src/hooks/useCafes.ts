import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { parseOpenStatus } from '../lib/openHours';
import type { Cafe, CafeCategory, CafeTier, CafeRow } from '../types/cafe';

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

const DEFAULT_FACILITIES = {
  wifi: false,
  ac: false,
  powerOutlets: false,
  mushola: false,
  motorParking: false,
  carParking: false,
};

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
    
    if (todayText.toLowerCase().includes('tutup')) {
      isOpenNow = false;
    } else {
      const match = todayText.match(/(\d{2})[:.](\d{2})\s*-\s*(\d{2})[:.](\d{2})/);
      if (match) {
        const startMins = parseInt(match[1]) * 60 + parseInt(match[2]);
        const endMins = parseInt(match[3]) * 60 + parseInt(match[4]);
        // Handle overnight open
        if (endMins < startMins) {
           isOpenNow = currentMins >= startMins || currentMins <= endMins;
        } else {
           isOpenNow = currentMins >= startMins && currentMins <= endMins;
        }
      } else {
        // Fallback to old logic if regex fails
        isOpenNow = parseOpenStatus(row.open_hours).isOpenNow;
      }
    }
  } else {
    isOpenNow = parseOpenStatus(row.open_hours).isOpenNow;
  }

  return {
    id: row.id,
    name: row.name,
    category,
    lat: row.lat,
    lng: row.lng,
    rating: parseFloat(String(row.rating)) || 0,
    reviewCount: row.total_reviews ?? 0,
    wifiSpeed: 0,      // not yet in DB — will be enriched later
    vibes: 3,          // default mid — will be enriched later
    facilities: DEFAULT_FACILITIES,
    openHours: todayStatus,
    schedule,
    isOpenNow: isOpenNow,
    isOpenNight: parseOpenStatus(row.open_hours).isOpenNight,
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

async function fetchCafes(): Promise<Cafe[]> {
  const { data, error } = await supabase
    .from('cafes')
    .select('*')
    .order('total_reviews', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as CafeRow[]).map(mapRowToCafe);
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
