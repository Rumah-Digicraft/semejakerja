// Jadwal jam operasional per-hari untuk form "Usulkan Cafe Baru" — subset
// yang dipakai dari semejakerja-admin/app/(dashboard)/maps/cafes/lib.ts
// (disalin, bukan di-import: tidak ada package bersama antar app di
// monorepo ini). Serialize ke format kanonik yang sama dengan cafes.weekday_text
// ("Senin: HH:MM - HH:MM" / "Senin: Tutup", urutan Senin..Minggu) supaya
// langsung kompatibel begitu trigger DB menyalinnya ke tabel cafes.

export interface DayHours {
  open: boolean;
  from: string; // "HH:MM" 24 jam
  to: string;
}

export type WeekHours = DayHours[]; // selalu 7 elemen, 0=Senin .. 6=Minggu

export const DAY_LABELS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export const defaultWeekHours = (): WeekHours =>
  DAY_LABELS.map(() => ({ open: true, from: '09:00', to: '22:00' }));

export function serializeWeekdayText(week: WeekHours): string[] {
  return week.map((d, i) => `${DAY_LABELS[i]}: ${d.open ? `${d.from} - ${d.to}` : 'Tutup'}`);
}

// Saran isi open_hours (string ringkas dipakai peta publik buat filter
// "Buka Malam" & fallback status buka): rentang tersering di hari buka.
export function suggestOpenHours(week: WeekHours): string {
  const counts = new Map<string, number>();
  for (const d of week) {
    if (!d.open) continue;
    const range = `${d.from} - ${d.to}`;
    counts.set(range, (counts.get(range) ?? 0) + 1);
  }
  if (counts.size === 0) return 'Tutup';
  const [best] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return best === '00:00 - 23:59' ? '24 Jam' : best;
}
