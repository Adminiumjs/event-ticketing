/**
 * The ticket PDF in every language: the standard fonts draw Latin text only,
 * so a line a language writes in another script is drawn as the same line in
 * English — never a shorter line, never an empty one. Every page carries the
 * show's day, its doors and stage times, the room's age rule and the
 * ticket's status, whatever the reader's language, and a status that carries
 * an amount or a date is drawn too.
 */
import { afterEach, describe, expect, it } from "vitest";

import { LOCALE_TAGS } from "../i18n/locales.ts";
import { setLocale, tr } from "../i18n/tr.ts";
import { loadWave } from "../i18n/strings/wave.ts";
import { fD, fT, money, setZone } from "./fmt.ts";
import { latin, ticketPdf } from "./pdf.ts";
import { ageWords } from "./vals/audience.ts";
import { ticketLines } from "./vals/account.ts";
import type { Row } from "../data/wire.ts";
import type { Show } from "./world.ts";

const at = (s: string) => Date.parse(s);
const show = {
  name: "Neon Circuit",
  room: { name: "Main room" },
  doors: at("2026-07-28T20:00:00Z"),
  start: at("2026-07-28T20:30:00Z"),
  age: "18",
} as unknown as Show;
const ticket = { id: 1, holder_name: "Mia Hart", name: "Standard", code: "K7QXM2PD" } as unknown as Row;

const STATUSES: [string, () => string, RegExp][] = [
  ["pay at the door", () => tr("Pay {amount} at the door", { amount: money(24) }), /24[.,]00/],
  ["moved", () => tr("Moved to {date}", { date: fD(at("2026-09-11T20:00:00Z")) }), /11/],
  ["waiting for a transfer", () => tr("Waiting for payment · pay by {date}, {time}", { date: fD(at("2026-07-30T18:00:00Z")), time: fT(at("2026-07-30T18:00:00Z")) }), /18[:.]00/],
  ["valid", () => tr("Valid"), /\S/],
];

afterEach(() => setLocale("en-US"));
setZone("UTC");

describe("the ticket PDF", () => {
  for (const tag of LOCALE_TAGS) {
    for (const [what, status, figure] of STATUSES) {
      it(`in ${tag}, a ${what} ticket carries its day, times, age rule and status`, async () => {
        await loadWave(tag);
        setLocale(tag);
        const ages = [ageWords("18", true)];
        setLocale("en-US");
        ages.push(ageWords("18", true));
        setLocale(tag);
        const { lines, foot } = ticketLines(show, "WV-1001", ticket, status);
        const [name, when, room, holder, type, st] = lines.map((l) => l[0]);
        expect(lines).toHaveLength(6);
        // Every line, the foot too, is drawable, and none is empty.
        expect([...lines.map((l) => l[0]), foot].filter((t) => t.trim() === "" || !latin(t))).toEqual([]);
        expect(name).toBe("Neon Circuit");
        expect(when).toMatch(/28/);
        expect(when).toMatch(/20[:.]00/);
        expect(when).toMatch(/20[:.]30/);
        expect(ages.some((a) => room!.includes(a))).toBe(true);
        expect(room).toContain("Main room");
        expect(holder).toContain("Mia Hart");
        expect(type).toContain("WV-1001");
        expect(st).toMatch(figure);
        // The page draws the lines as written: no character falls to "?".
        const pdf = ticketPdf({ venue: "Waveform", address: "12 Harbour St" }, lines, "K7QX-M2PD", foot);
        expect(pdf).not.toContain("?");
        expect(pdf).toMatch(/20[:.]30/);
      });
    }
  }

  it("in English, the status line with an amount is the reader's own words", () => {
    setLocale("en-US");
    const { lines } = ticketLines(show, "", ticket, STATUSES[0]![1]);
    expect(lines[5]![0]).toBe("Pay $24.00 at the door");
    expect(lines[1]![0]).toBe("Tue 28 Jul  |  Doors 20:00  |  On stage 20:30");
  });

  it("in Chinese and Arabic, a line the fonts cannot draw is the whole English line", async () => {
    for (const tag of ["zh-CN", "zh-TW", "ar-EG"]) {
      await loadWave(tag);
      setLocale(tag);
      const { lines } = ticketLines(show, "", ticket, STATUSES[0]![1]);
      expect(lines.slice(1, 3).map((l) => l[0])).toEqual(["Tue 28 Jul  |  Doors 20:00  |  On stage 20:30", "Main room  |  18+ — bring photo ID"]);
      expect(lines[5]![0]).toBe("Pay $24.00 at the door");
    }
  });
});
