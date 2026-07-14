// Live cafe data for the /maps landing page. Runs client-side (static export
// has no server runtime) using the browser Supabase client + anon key.
import { createClient } from "./supabase/client";
import { computeOpenInfo, type OpenInfo } from "./openHours";

export interface OpenCafe {
  id: string;
  name: string;
  slug: string;
  rating: number;
  reviewCount: number;
  area: string;
  priceLabel: string;
  wifiDownload: number;
  hasWifi: boolean;
  hasOutlets: boolean;
  isPartner: boolean;
  open: OpenInfo;
}

// Deep-link into the interactive map's cafe modal. Mirrors cafeSlug() in
// semejakerja-web-apps/src/lib/slug.ts (name + 8-char id prefix).
function cafeSlug(name: string, id: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base}-${id.slice(0, 8)}`;
}

const PRICE_LABEL: Record<number, string> = {
  0: "Harga variatif",
  1: "Rp0–25rb",
  2: "Rp25–50rb",
  3: "Rp50–150rb",
  4: "Rp150rb+",
};

// Strip province / regency / postal noise and keep the most specific locality.
function localityFromAddress(address: string | null | undefined): string {
  if (!address) return "Purwokerto";
  const drop = /jawa tengah|central java|indonesia|kabupaten|kota\b|regency|daerah/i;
  const parts = address
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((p) => !drop.test(p) && !/^\d{4,6}$/.test(p) && !/^\d+$/.test(p));

  const known = parts.find((p) =>
    /purwokerto|sokaraja|baturaden|kembaran|karanglewas|purwanegara|kalibagor|patikraja|sumbang|cilongok|banyumas|purbalingga/i.test(
      p,
    ),
  );
  const pick = known ?? parts[parts.length - 1] ?? "Purwokerto";
  return pick.length > 26 ? pick.slice(0, 25).trimEnd() + "…" : pick;
}

function hasFacility(raw: unknown, key: string, legacyLabel: string): boolean {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return false;
    }
  }
  if (Array.isArray(value)) return value.map(String).includes(legacyLabel);
  if (value && typeof value === "object") {
    return Boolean((value as Record<string, unknown>)[key]);
  }
  return false;
}

interface CafeRow {
  id: string;
  name: string;
  rating: string | number | null;
  total_reviews: number | null;
  open_hours: string | null;
  weekday_text: unknown;
  address: string | null;
  price_level: number | null;
  facilities: unknown;
  wifi_speed_mbps: number | string | null;
  tier: string | null;
  is_partner: boolean | null;
}

const COLUMNS =
  "id,name,rating,total_reviews,open_hours,weekday_text,address," +
  "price_level,facilities,wifi_speed_mbps,tier,is_partner";

/**
 * Fetches cafes, keeps only the ones open right now (Asia/Jakarta), and returns
 * the `limit` most-reviewed of them — the "Buka Sekarang" strip.
 */
export async function fetchOpenNowCafes(limit = 7): Promise<OpenCafe[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cafes")
    .select(COLUMNS)
    .order("total_reviews", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as CafeRow[];

  return rows
    .map((row): OpenCafe => {
      const open = computeOpenInfo(row.open_hours, row.weekday_text);
      const wifi = parseFloat(String(row.wifi_speed_mbps ?? "")) || 0;
      return {
        id: row.id,
        name: row.name,
        slug: cafeSlug(row.name, row.id),
        rating: parseFloat(String(row.rating ?? "")) || 0,
        reviewCount: row.total_reviews ?? 0,
        area: localityFromAddress(row.address),
        priceLabel: PRICE_LABEL[row.price_level ?? 0] ?? PRICE_LABEL[0],
        wifiDownload: wifi,
        hasWifi: hasFacility(row.facilities, "wifi", "WiFi"),
        hasOutlets: hasFacility(row.facilities, "powerOutlets", "Stopkontak"),
        isPartner: row.tier === "partner" || row.tier === "sponsor" || !!row.is_partner,
        open,
      };
    })
    .filter((cafe) => cafe.open.isOpenNow)
    .slice(0, limit);
}
