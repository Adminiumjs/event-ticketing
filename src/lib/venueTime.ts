/**
 * The venue's clock: wall times and days in its own zone, whatever the
 * reader's device says. Browser-safe; it imports nothing.
 */

export interface Ymd {
  y: number;
  m: number;
  d: number;
}

/** How far `zone` is ahead of UTC at `instant`, in ms. */
export function zoneOffsetMs(zone: string, instant: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const local = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((local - instant) / 60_000) * 60_000;
}

/** The instant of a wall-clock time on a day in `zone`. */
export function wallTime(day: Ymd, time: string, zone: string): number {
  const [hh, mm] = time.split(":").map(Number) as [number, number];
  const guess = Date.UTC(day.y, day.m - 1, day.d, hh, mm);
  const offset = zoneOffsetMs(zone, guess);
  const again = zoneOffsetMs(zone, guess - offset);
  return again === offset ? guess - offset : guess - again;
}

/** The venue's calendar day of an instant, moved by `days`. */
export function venueDay(instant: number, zone: string, days = 0): Ymd {
  const local = new Date(instant + zoneOffsetMs(zone, instant));
  const moved = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + days));
  return { y: moved.getUTCFullYear(), m: moved.getUTCMonth() + 1, d: moved.getUTCDate() };
}

/** The same wall time `days` calendar days later (or earlier) on the venue's clock. */
export function plusDays(instant: number, days: number, zone: string): number {
  const local = new Date(instant + zoneOffsetMs(zone, instant));
  const time = `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}`;
  return wallTime(venueDay(instant, zone, days), time, zone);
}

/** The venue's wall time of an instant, "HH:MM". */
export function wallClock(instant: number, zone: string): string {
  const local = new Date(instant + zoneOffsetMs(zone, instant));
  return `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}`;
}

export const toMs = (value: unknown): number | null => {
  if (typeof value !== "string" || value === "") return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
};
