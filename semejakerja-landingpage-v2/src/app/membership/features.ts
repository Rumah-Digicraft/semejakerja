// Shared membership feature matrix — used by the pricing page (/membership)
// and the member dashboard (/membership/dashboard) so both stay in sync.

export interface Feature {
  name: string;
  nyantai: boolean;
  nongkrong: boolean;
  serius: boolean;
}

// `serius` here maps to the DB tier `mode_serius`.
export const features: Feature[] = [
  { name: "Daftar & join Regularan", nyantai: true, nongkrong: true, serius: true },
  { name: "Maps basic (nama, alamat, jam buka)", nyantai: true, nongkrong: true, serius: true },
  { name: "Maps lengkap (filter, fasilitas, foto)", nyantai: false, nongkrong: true, serius: true },
  { name: "Real-time slot ketersediaan WFC", nyantai: false, nongkrong: true, serius: true },
  { name: "Crowdsource Maps (submit/edit data)", nyantai: false, nongkrong: true, serius: true },
  { name: "Diskon 10% di Cafe Mitra", nyantai: false, nongkrong: true, serius: true },
  { name: "Early access gallery update WFC", nyantai: false, nongkrong: true, serius: true },
  { name: "Priority booking Semeja Moves", nyantai: false, nongkrong: false, serius: true },
  { name: "1 sesi Badminton gratis/bln", nyantai: false, nongkrong: false, serius: true },
  { name: "Akses event eksklusif member", nyantai: false, nongkrong: false, serius: true },
];

export type MembershipTier = "nyantai" | "nongkrong" | "mode_serius";

export const tierLabels: Record<MembershipTier, string> = {
  nyantai: "Nyantai",
  nongkrong: "Nongkrong",
  mode_serius: "Mode Serius",
};

export const tierTaglines: Record<MembershipTier, string> = {
  nyantai: "Gratis selamanya",
  nongkrong: "Akses Maps lengkap & diskon mitra",
  mode_serius: "Fitur lengkap + benefit Semeja Moves",
};

// Benefits included in a given tier, derived from the shared matrix.
export function benefitsForTier(tier: MembershipTier): string[] {
  const key = tier === "mode_serius" ? "serius" : tier;
  return features.filter((f) => f[key]).map((f) => f.name);
}
