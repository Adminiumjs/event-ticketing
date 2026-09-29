/**
 * Spans and dates keep their reading order in Arabic. A span such as
 * "3 س 30 د" (3 hours 30 minutes) starts with a digit: wrapped in a
 * left-to-right isolate the digit takes the isolate's direction and the
 * Arabic run is laid out after it, so a right-to-left reader meets the
 * minutes first. The formatter isolates such a span by its own first letter
 * instead; this test lays the formatter's output out with the bidi rules
 * that matter here (UAX #9: W7, N1/N2, I1/I2, L2) and reads it back.
 */
import { afterEach, describe, expect, it } from "vitest";

import { setLocale } from "../i18n/tr.ts";
import { loadWave } from "../i18n/strings/wave.ts";
import { dur, fD, fDM, fT, money, setZone } from "./fmt.ts";

type Cls = "L" | "R" | "EN" | "N";
const LRI = "⁦";
const FSI = "⁨";
const PDI = "⁩";
const cls = (ch: string): Cls => (/[0-9]/.test(ch) ? "EN" : /[؀-ۿ]/.test(ch) ? "R" : /\p{L}/u.test(ch) ? "L" : "N");

/** The level of each character of an isolate's content, laid out at `base` (0 left-to-right, 1 right-to-left). */
function levels(text: string, base: 0 | 1): number[] {
  const c = [...text].map(cls);
  const sos: Cls = base === 0 ? "L" : "R";
  // W7: a number after a left-to-right letter (or at a left-to-right start) is left-to-right.
  let strong: Cls = sos;
  const w = c.map((x) => {
    if (x === "L" || x === "R") strong = x;
    return x === "EN" && strong === "L" ? "L" : x;
  });
  // N1/N2: a neutral takes its neighbours' direction when they agree (numbers count as right-to-left), else the base.
  const dirOf = (x: Cls) => (x === "L" ? "L" : x === "R" || x === "EN" ? "R" : null);
  const r = w.map((x, i) => {
    if (x !== "N") return x;
    let a: string | null = null;
    for (let j = i - 1; j >= 0 && a === null; j -= 1) a = dirOf(w[j]!);
    let b: string | null = null;
    for (let j = i + 1; j < w.length && b === null; j += 1) b = dirOf(w[j]!);
    a ??= sos;
    b ??= sos;
    return a === b ? (a as Cls) : base === 0 ? "L" : "R";
  });
  // I1/I2.
  return r.map((x) => (base === 0 ? (x === "R" ? 1 : x === "EN" ? 2 : 0) : x === "L" || x === "EN" ? 2 : 1));
}

/** The isolate laid out left to right on the screen (L2), inside a right-to-left paragraph. */
function onScreen(s: string): string {
  const open = s[0]!;
  const inner = s.slice(1, -1);
  expect(s.endsWith(PDI)).toBe(true);
  const first = [...inner].map(cls).find((x) => x === "L" || x === "R");
  const base = open === LRI ? 0 : open === FSI ? (first === "R" ? 1 : 0) : 1;
  const chars = [...inner];
  const lv = levels(inner, base);
  const idx = chars.map((_, i) => i);
  for (let level = Math.max(...lv); level >= 1; level -= 1) {
    let i = 0;
    while (i < idx.length) {
      if (lv[idx[i]!]! < level) {
        i += 1;
        continue;
      }
      let j = i;
      while (j < idx.length && lv[idx[j]!]! >= level) j += 1;
      idx.splice(i, j - i, ...idx.slice(i, j).reverse());
      i = j;
    }
  }
  return idx.map((i) => chars[i]).join("");
}
/** How a right-to-left reader meets the words: the screen read from its right edge, a number read left to right. */
const readRtl = (screen: string): string[] =>
  screen
    .split(" ")
    .reverse()
    .map((w) => (/^[0-9:.,]+$/.test(w) ? w : [...w].reverse().join("")));

afterEach(() => setLocale("en-US"));
setZone("UTC");

describe("spans and dates in Arabic", () => {
  it("a span reads hours before minutes, and days before hours", async () => {
    await loadWave("ar-EG");
    setLocale("ar-EG");
    const span = dur(3.5 * 3_600_000);
    expect(span).toBe(`${FSI}3 س 30 د${PDI}`);
    expect(readRtl(onScreen(span))).toEqual(["3", "س", "30", "د"]);
    expect(readRtl(onScreen(dur(41 * 3_600_000)))).toEqual(["1", "ي", "17", "س"]);
    expect(readRtl(onScreen(dur(12 * 60_000)))).toEqual(["12", "د"]);
    // The left-to-right isolate the span used to carry puts the minutes first.
    expect(readRtl(onScreen(`${LRI}3 س 30 د${PDI}`))).toEqual(["س", "30", "د", "3"]);
  });

  it("a day and month reads day before month", async () => {
    await loadWave("ar-EG");
    setLocale("ar-EG");
    const d = fDM(Date.parse("2026-07-28T20:00:00Z"));
    expect(d.startsWith(FSI)).toBe(true);
    expect(readRtl(onScreen(d))).toEqual(["28", "يوليو"]);
    expect(readRtl(onScreen(fD(Date.parse("2026-07-28T20:00:00Z")))).join(" ")).toBe("الثلاثاء، 28 يوليو");
  });

  it("a figure stays one left-to-right run", async () => {
    await loadWave("ar-EG");
    setLocale("ar-EG");
    expect(money(24).startsWith(LRI)).toBe(true);
    expect(fT(Date.parse("2026-07-28T20:00:00Z"))).toBe(`${LRI}20:00${PDI}`);
  });

  it("English reads as before", () => {
    setLocale("en-US");
    expect(dur(3.5 * 3_600_000).slice(1, -1)).toBe("3 h 30 m");
    expect(fD(Date.parse("2026-07-28T20:00:00Z")).slice(1, -1)).toBe("Tue 28 Jul");
    expect(fDM(Date.parse("2026-07-28T20:00:00Z")).slice(1, -1)).toBe("28 Jul");
  });
});
