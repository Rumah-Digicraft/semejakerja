import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { parseOpenStatus } from '../lib/openHours';
import type { Cafe, CafeCategory, CafeTier, CafeRow } from '../types/cafe';

// ---------- helpers ----------

const PRICE_RANGE: Record<number, string> = {
  0: 'Tidak diketahui',
  1: '< Rp 30.000',
  2: 'Rp 30.000 – 60.000',
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
    openHours: row.open_hours ?? row.weekday_text ?? 'Jam buka tidak tersedia',
    ...parseOpenStatus(row.open_hours),
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
