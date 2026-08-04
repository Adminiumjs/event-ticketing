/**
 * Presentation helpers.
 *
 * Everything here reads the ambient locale (`i18n/ambient.ts`) rather than a
 * hook, so the store and the pure engine can format without being inside the
 * React tree. Callers that ARE in the tree get the same output, because the
 * provider pushes its own `t` / `money` / `number` into the ambient module on
 * every render.
 *
 * Nothing in this file reads the real clock — an absolute minute is always
 * passed in. Absolute minutes are anchored to UTC (see `data/types.ts`), so
 * every `Intl` call below forces `timeZone: "UTC"`; without it, a reader in
 * Auckland would see the venue's 20:00 doors as tomorrow lunchtime.
 */

import {
  locale,
  money as ambientMoney,
  number as ambientNumber,
  t,
  tOr,
} from "../i18n/ambient.ts";
import type { MessageKey } from "../i18n/messages/index.ts";
import { MIN_PER_DAY, minuteOfDay } from "./tickets.ts";

/** Resolve a seed field that stores an i18n key. */
export function label(key: string): string {
  return tOr(key, key);
}

/**
 * Cents in, currency out. Every price in this venue is a whole number of
 * dollars, so the formatter's zero fraction digits lose nothing — and a
 * ticket priced "$28.00" reads like a bank statement rather than a poster.
 */
export function money(cents: number): string {
  return ambientMoney(Math.round(cents / 100));
}

export function number(value: number, opts?: Intl.NumberFormatOptions): string {
  return ambientNumber(value, opts);
}

export function percent(fraction: number, digits = 0): string {
  return ambientNumber(fraction, {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/* --------------------------------------------------------------------- time */

function fromAbsolute(abs: number): Date {
  return new Date(Math.floor(abs) * 60_000);
}

function fromDay(serial: number): Date {
  return new Date(serial * 86_400_000);
}

function fmt(d: Date, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale(), { ...opts, timeZone: "UTC" }).format(d);
}

/** 24-hour, zero-padded, so times line up in a mono column. */
export function clock(abs: number): string {
  return fmt(fromAbsolute(abs), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** "Sat 10:00" — what an on-sale chip says. */
export function dowClock(abs: number): string {
  return t("chrome.fmt.dowTime", {
    dow: fmt(fromAbsolute(abs), { weekday: "short" }),
    time: clock(abs),
  });
}

/** "Tue 28 Jul" — the compact date under a show name. */
export function dateShort(serial: number): string {
  return fmt(fromDay(serial), {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** "Tuesday, 28 July 2026" — the event page's fact rail. */
export function dateLong(serial: number): string {
  return fmt(fromDay(serial), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "28 Jul" — axis ticks and wallet cards, where the weekday is noise. */
export function dayMonth(serial: number): string {
  return fmt(fromDay(serial), { day: "numeric", month: "short" });
}

/** The big numeral on a date tile. */
export function tileDay(serial: number): string {
  return fmt(fromDay(serial), { day: "numeric" });
}

/** The three-letter month under it, upper-cased the way a poster prints it. */
export function tileMonth(serial: number): string {
  return fmt(fromDay(serial), { month: "short" }).toUpperCase();
}

/** The dock's clock readout: "Tue 28 Jul · 16:30". */
export function clockReadout(abs: number): string {
  return t("chrome.fmt.dateTime", {
    date: dateShort(Math.floor(abs / MIN_PER_DAY)),
    time: clock(abs),
  });
}

/**
 * A hold countdown: "9:42". Minutes are NOT padded — a countdown that reads
 * "09:42" looks like a time of day, and this one is a number going down.
 */
export function countdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${ss < 10 ? "0" : ""}${ss}`;
}

/** Minutes into the day, as a clock — used where only a time of day exists. */
export function timeOfDay(minutes: number): string {
  return clock(minuteOfDay(minutes));
}

/** Two-letter initials for an avatar tile, from a display name. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* -------------------------------------------------------------------- tints */

function toRgb(hex: string): [number, number, number] {
  let h = (hex || "#a21caf").replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = Number.parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = toRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Event art, in place of photography: two of the show's own tints swept
 * diagonally, a corner glow, and a highlight across the top. The tints arrive
 * as CSS custom-property NAMES rather than hexes, so they re-resolve when the
 * theme flips instead of being baked into an inline style at render time.
 */
export function artBackground(art: [string, string], angle = "145deg"): string {
  const [a, b] = art;
  return [
    "radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,.16), transparent 58%)",
    `radial-gradient(70% 60% at 82% 92%, color-mix(in srgb, var(${b}) 62%, transparent), transparent 74%)`,
    `linear-gradient(${angle}, color-mix(in srgb, var(${a}) 88%, transparent), color-mix(in srgb, var(${b}) 62%, transparent))`,
  ].join(", ");
}

/** The same treatment at avatar scale, from one flat hex. */
export function tileBackground(hex: string, dark: boolean, angle = "150deg"): string {
  const highlight = dark
    ? "radial-gradient(120% 84% at 50% 0%, rgba(255,255,255,.07), transparent 56%)"
    : "radial-gradient(120% 84% at 50% 0%, rgba(255,255,255,.6), transparent 58%)";
  const glow = `radial-gradient(58% 46% at 72% 88%, ${rgba(hex, dark ? 0.3 : 0.2)}, transparent 72%)`;
  const base = `linear-gradient(${angle}, ${rgba(hex, dark ? 0.34 : 0.22)}, ${rgba(hex, dark ? 0.12 : 0.07)})`;
  return `${highlight}, ${glow}, ${base}`;
}

/** Re-export so screens can pull one translation helper from one place. */
export { t };
export type { MessageKey };
