// Open-now / open-night logic for the /maps landing strip.
// Ported from semejakerja-web-apps/src/lib/openHours.ts so the landing page
// shows the same "Buka Sekarang" status as the interactive map. Computes in
// Asia/Jakarta (WIB) regardless of the viewer's timezone — the cafes are in
// Purwokerto.

export interface OpenInfo {
  isOpenNow: boolean;
  isOpenNight: boolean;
  is24h: boolean;
  todayHours: string; // "09:00 - 22:00" | "24 Jam" | "Tutup" | "Jam tidak tersedia"
  closeLabel: string; // "Buka 24 jam" | "Tutup 22.00" | "Buka sekarang"
}

const NIGHT_THRESHOLD = 21 * 60; // 21:00 in minutes

const DAY_MAP: Record<string, number> = {
  Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3,
  Friday: 4, Saturday: 5, Sunday: 6,
};

interface RangeStatus {
  isOpenNow: boolean;
  isOpenNight: boolean;
  is24h: boolean;
  closeMins: number | null; // null when unknown / 24h
}

/**
 * Parses a single hours string relative to `nowMins` (minutes since midnight).
 * Returns null when the string can't be recognized — callers fall back to the
 * summary open_hours. A recognized "Tutup" returns all-false.
 */
function parseRangeStatus(
  hours: string | null | undefined,
  nowMins: number,
): RangeStatus | null {
  if (!hours) return null;

  const normalized = hours.trim().toLowerCase();
  if (!normalized) return null;

  if (
    normalized === "24 jam" ||
    normalized === "24jam" ||
    normalized === "24 hours" ||
    normalized === "00:00 - 00:00" ||
    normalized === "00.00 - 00.00"
  ) {
    return { isOpenNow: true, isOpenNight: true, is24h: true, closeMins: null };
  }

  const match = normalized.match(/(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})/);
  if (match) {
    const open = Number(match[1]) * 60 + Number(match[2]);
    const close = Number(match[3]) * 60 + Number(match[4]);

    if (open === close) {
      return { isOpenNow: true, isOpenNight: true, is24h: true, closeMins: null };
    }

    const isOvernight = close < open; // e.g. 20:00 - 02:00
    const isOpenNow = isOvernight
      ? nowMins >= open || nowMins < close
      : nowMins >= open && nowMins < close;
    const isOpenNight = isOvernight || close > NIGHT_THRESHOLD;

    return { isOpenNow, isOpenNight, is24h: false, closeMins: close };
  }

  if (normalized.includes("tutup") || normalized.includes("closed")) {
    return { isOpenNow: false, isOpenNight: false, is24h: false, closeMins: null };
  }

  return null;
}

/** Current time in Asia/Jakarta as { day: 0-6 (Mon=0), mins }. */
function nowInJakarta(): { day: number; mins: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Monday";
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  // Intl can emit "24" for midnight — normalize to 0.
  const hh = hour === 24 ? 0 : hour;
  return { day: DAY_MAP[weekday] ?? 0, mins: hh * 60 + minute };
}

function formatClose(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}.${String(m).padStart(2, "0")}`;
}

/**
 * Derives open-now status for a cafe row, preferring today's weekday_text line
 * and falling back to the summary open_hours (mirrors the web-app mapper).
 */
export function computeOpenInfo(
  openHours: string | null | undefined,
  weekdayText: unknown,
): OpenInfo {
  const { day, mins } = nowInJakarta();

  let schedule: string[] = [];
  if (Array.isArray(weekdayText)) {
    schedule = weekdayText as string[];
  } else if (typeof weekdayText === "string" && weekdayText) {
    try {
      const parsed = JSON.parse(weekdayText);
      if (Array.isArray(parsed)) schedule = parsed;
    } catch {
      /* malformed — leave empty */
    }
  }

  let todayHours = openHours?.trim() || "Jam tidak tersedia";
  let status: RangeStatus | null = null;

  if (schedule.length === 7) {
    const line = schedule[day] || "";
    const derived = line.split(": ").slice(1).join(": ") || line;
    if (derived) todayHours = derived;
    status = parseRangeStatus(derived, mins);
  }

  // Fall back to the summary string when today's line is missing/unparseable.
  if (!status) status = parseRangeStatus(openHours, mins);

  if (!status) {
    return {
      isOpenNow: false,
      isOpenNight: false,
      is24h: false,
      todayHours,
      closeLabel: "Jam tidak tersedia",
    };
  }

  const displayHours = status.is24h ? "24 Jam" : todayHours;

  let closeLabel: string;
  if (status.is24h) closeLabel = "Buka 24 jam";
  else if (status.isOpenNow && status.closeMins != null)
    closeLabel = `Tutup ${formatClose(status.closeMins)}`;
  else if (status.isOpenNow) closeLabel = "Buka sekarang";
  else closeLabel = "Tutup sekarang";

  return {
    isOpenNow: status.isOpenNow,
    isOpenNight: status.isOpenNight,
    is24h: status.is24h,
    todayHours: displayHours,
    closeLabel,
  };
}
