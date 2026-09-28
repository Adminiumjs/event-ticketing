/**
 * Dates, times, durations and money as the reader's language writes them
 * (`Intl`), on the venue's clock — never the reader's device's zone. An
 * instant is an ISO string or epoch ms; money is in the connection's
 * currency. Times are 24-hour, as the venue's tickets and door read them.
 *
 * A figure or a date is one left-to-right run wherever it sits (`iso`): in
 * Arabic, the currency mark and the number are never reordered. Arabic keeps
 * the Latin digits the design draws.
 */
import { locale, tr } from "../i18n/tr.ts";
import { venueDay, wallTime, type Ymd } from "../lib/venueTime.ts";

let currency = "USD";
let zone = "UTC";
export function setCurrency(code: string | null | undefined): void {
  if (typeof code === "string" && /^[A-Z]{3}$/.test(code)) currency = code;
}
export function setZone(z: string | null | undefined): void {
  if (typeof z === "string" && z !== "") zone = z;
}
export const venueZone = (): string => zone;
export const venueCurrency = (): string => currency;

const tagOf = () => (locale() === "ar-EG" ? "ar-EG-u-nu-latn" : locale());
const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();
function nf(key: string, make: () => Intl.NumberFormat): Intl.NumberFormat {
  const k = `${tagOf()}|${currency}|${key}`;
  let f = cache.get(k) as Intl.NumberFormat | undefined;
  if (f === undefined) {
    f = make();
    cache.set(k, f);
  }
  return f;
}
function df(key: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const k = `${tagOf()}|${zone}|d|${key}`;
  let f = cache.get(k) as Intl.DateTimeFormat | undefined;
  if (f === undefined) {
    f = new Intl.DateTimeFormat(tagOf(), { timeZone: zone, ...opts });
    cache.set(k, f);
  }
  return f;
}

/** One left-to-right run: a figure, a date, a code. */
export const iso = (s: string): string => `⁦${s}⁩`;
/** One run in the direction of its own words: a counted phrase in the reader's language ("2 tickets"). */
export const fsi = (s: string): string => `⁨${s}⁩`;
export const strip = (s: unknown): string => String(s).replace(/[⁦⁨⁩]/g, "");

/** An instant as epoch ms (null for none). */
export function ms(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string" || v === "") return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
}

export function money(v: unknown): string {
  const n = Number(v ?? 0);
  return iso(nf("money", () => new Intl.NumberFormat(tagOf(), { style: "currency", currency })).format(Math.abs(n) < 0.005 ? 0 : n));
}
export function num(v: number): string {
  return nf("num", () => new Intl.NumberFormat(tagOf())).format(v);
}

/** "Tue 28 Jul": the design's short date (the reader's own order outside English). */
export function fD(v: unknown): string {
  const t = ms(v);
  if (t === null) return "";
  const f = df("wdm", { weekday: "short", day: "numeric", month: "short" });
  if (locale() !== "en-US") return iso(f.format(t));
  const parts = f.formatToParts(t);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return iso(`${get("weekday")} ${get("day")} ${get("month")}`);
}
/** "28 Jul" */
export function fDM(v: unknown): string {
  const t = ms(v);
  if (t === null) return "";
  const f = df("dm", { day: "numeric", month: "short" });
  if (locale() !== "en-US") return iso(f.format(t));
  const parts = f.formatToParts(t);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return iso(`${get("day")} ${get("month")}`);
}
/** "July 2026" */
export const fMonth = (v: unknown): string => {
  const t = ms(v);
  return t === null ? "" : df("my", { month: "long", year: "numeric" }).format(t);
};
/** "Tue", "Wed" … */
export const fWd = (v: unknown): string => {
  const t = ms(v);
  return t === null ? "" : df("wd", { weekday: "short" }).format(t);
};
/** "Saturday" */
export const fWdLong = (v: unknown): string => {
  const t = ms(v);
  return t === null ? "" : df("wdl", { weekday: "long" }).format(t);
};
/** "Jul" */
export const fMon = (v: unknown): string => {
  const t = ms(v);
  return t === null ? "" : df("m", { month: "short" }).format(t);
};
/** "20:00": the venue's wall time. */
export function fT(v: unknown): string {
  const t = ms(v);
  if (t === null) return "";
  return iso(df("t", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(t));
}
/** The venue's day of an instant. */
export const dayOf = (v: unknown, days = 0): Ymd | null => {
  const t = ms(v);
  return t === null ? null : venueDay(t, zone, days);
};
export const dayKey = (d: Ymd): string => `${String(d.y)}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
/** Midnight of the venue's day of an instant (moved by `days`). */
export const day0 = (t: number, days = 0): number => wallTime(venueDay(t, zone, days), "00:00", zone);
export const sameDay = (a: unknown, b: unknown): boolean => {
  const x = dayOf(a);
  const y = dayOf(b);
  return x !== null && y !== null && dayKey(x) === dayKey(y);
};

/** A span of time as the design counts it: "3 h 30 m", "1 d 17 h", "12 m". */
export function dur(span: number): string {
  if (span <= 0) return iso(tr("{m} m", { m: 0 }));
  const d = Math.floor(span / 86_400_000);
  const h = Math.floor((span % 86_400_000) / 3_600_000);
  const m = Math.floor((span % 3_600_000) / 60_000);
  if (d > 0) return iso(tr("{d} d {h} h", { d, h }));
  if (h > 0) return iso(tr("{h} h {m} m", { h, m }));
  return iso(tr("{m} m", { m }));
}

/** Counted words, whole phrases in the reader's language. */
export const tickets = (n: number): string => fsi(tr("{n} ticket|{n} tickets", { n }));
export const places = (n: number): string => fsi(tr("{n} place|{n} places", { n }));
