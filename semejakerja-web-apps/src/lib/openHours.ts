/**
 * Parses an open-hours string and determines whether a place is currently open
 * and whether it qualifies as "open at night" (closes after 21:00 or is 24h).
 *
 * Separator ":" or "." is accepted (real data mixes "23:59" and "23.59").
 * Supported formats:
 *   "07:00 - 23:00"   → normal hours
 *   "20.00 - 02.00"   → overnight (closes past midnight)
 *   "00:00 - 00:00"   → 24 hours
 *   "24 Jam"          → 24 hours
 *   "Tutup" / "Closed"→ closed today
 *   null / "" / other → unknown
 */

interface OpenStatus {
  isOpenNow: boolean;
  isOpenNight: boolean;
}

const NIGHT_THRESHOLD = 21 * 60; // 21:00 in minutes

function nowInMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Parses a single hours string relative to `nowMins` (minutes since midnight).
 * Returns null when the string can't be recognized at all — callers can then
 * fall back to another source. A recognized "Tutup" returns both-false.
 */
export function parseRangeStatus(
  hours: string | null | undefined,
  nowMins: number,
): OpenStatus | null {
  if (!hours) return null;

  const normalized = hours.trim().toLowerCase();
  if (!normalized) return null;

  // 24-hour formats
  if (
    normalized === '24 jam' ||
    normalized === '24jam' ||
    normalized === '24 hours' ||
    normalized === '00:00 - 00:00' ||
    normalized === '00.00 - 00.00'
  ) {
    return { isOpenNow: true, isOpenNight: true };
  }

  // "HH:MM - HH:MM" (or "HH.MM - HH.MM") — the range wins over any text.
  const match = normalized.match(/(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})/);
  if (match) {
    const open = Number(match[1]) * 60 + Number(match[2]);
    const close = Number(match[3]) * 60 + Number(match[4]);

    // Equal open/close (e.g. 00:00 - 00:00) → treat as 24h
    if (open === close) return { isOpenNow: true, isOpenNight: true };

    const isOvernight = close < open; // e.g. 20:00 - 02:00

    const isOpenNow = isOvernight
      ? nowMins >= open || nowMins < close
      : nowMins >= open && nowMins < close;

    // Night = stays open past 21:00, or wraps past midnight.
    const isOpenNight = isOvernight || close > NIGHT_THRESHOLD;

    return { isOpenNow, isOpenNight };
  }

  // Explicitly closed today
  if (normalized.includes('tutup') || normalized.includes('closed')) {
    return { isOpenNow: false, isOpenNight: false };
  }

  // Unrecognized format
  return null;
}

export function parseOpenStatus(openHours: string | null | undefined): OpenStatus {
  return parseRangeStatus(openHours, nowInMinutes()) ?? { isOpenNow: false, isOpenNight: false };
}
