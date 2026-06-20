/**
 * Parses an open_hours string and determines whether a place is currently open
 * and whether it qualifies as "open at night" (closes after 21:00 or is 24h).
 *
 * Supported formats:
 *   "07:00 - 23:00"   → normal hours
 *   "20:00 - 02:00"   → overnight (closes past midnight)
 *   "00:00 - 00:00"   → 24 hours
 *   "24 Jam"          → 24 hours
 *   null / ""         → unknown → both false
 */

interface OpenStatus {
  isOpenNow: boolean;
  isOpenNight: boolean;
}

const NIGHT_THRESHOLD = 21 * 60; // 21:00 in minutes

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m ?? 0);
}

function nowInMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function parseOpenStatus(openHours: string | null | undefined): OpenStatus {
  if (!openHours) return { isOpenNow: false, isOpenNight: false };

  const normalized = openHours.trim().toLowerCase();

  // 24-hour formats
  if (
    normalized === '24 jam' ||
    normalized === '24jam' ||
    normalized === '00:00 - 00:00' ||
    normalized === '24 hours'
  ) {
    return { isOpenNow: true, isOpenNight: true };
  }

  // "HH:MM - HH:MM" format
  const match = normalized.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
  if (!match) return { isOpenNow: false, isOpenNight: false };

  const open = toMinutes(match[1]);
  const close = toMinutes(match[2]);
  const now = nowInMinutes();

  // Edge case: 00:00 - 00:00 already caught above, but handle equal open/close
  if (open === close) return { isOpenNow: true, isOpenNight: true };

  const isOvernight = close < open; // e.g. 20:00 - 02:00

  const isOpenNow = isOvernight
    ? now >= open || now < close
    : now >= open && now < close;

  const isOpenNight = isOvernight || close > NIGHT_THRESHOLD;

  return { isOpenNow, isOpenNight };
}
