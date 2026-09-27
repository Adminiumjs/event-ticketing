/**
 * The sample bundle resolved in the browser the way Adminium adds it — every
 * copy, formula and total worked out by the manifest's own rules — comes to
 * the figures the ledger pins: the manifest's money is the ledger's money.
 */
import { describe, expect, it } from "vitest";

import bundle from "../../seeds/events.sample.json";
import { dollars, figures, LEDGER } from "../sample/figures.ts";
import { resolveSample, type SampleBundleRows } from "./sampleRows.ts";

/** Tuesday 28 July 2026, 16:30 at the venue (New York time). */
const NOW = Date.parse("2026-07-28T20:30:00Z");
const rows = resolveSample(bundle as unknown as SampleBundleRows, { now: NOW, zone: "America/New_York", locale: "en-US", currency: "USD" });
const cents = (value: unknown) => Math.round(Number(value ?? 0) * 100);
const event = (name: string) => rows["events"]!.find((e) => e["name"] === name)!;
const order = (no: number) => rows["orders"]!.find((o) => o["number"] === `WV-S${String(no)}`)!;

describe("the sample, as Adminium adds it at 16:30", () => {
  it("resolves every row", () => {
    expect([rows["orders"]!.length, rows["tickets"]!.length, rows["customers"]!.length]).toEqual([799, 1945, 834]);
  });

  it.each(LEDGER.shows.map((s) => [s.key, s.name] as const))("%s: received, refunded and owed at the door are the ledger's", (key, name) => {
    const f = figures(LEDGER, key, LEDGER.now);
    const e = event(name);
    expect([dollars(cents(e["received"])), dollars(cents(e["refunded"])), dollars(cents(e["owed_door"]))]).toEqual([dollars(f.received), dollars(f.refunded), dollars(f.owedDoor)]);
    expect(dollars(cents(e["owed_transfer"]) + cents(e["owed_overdue"]))).toBe(dollars(f.awaiting));
  });

  it("works out Mia's orders as the design draws them", () => {
    expect([order(8761)["total"], order(8761)["balance"], order(8761)["status"]]).toEqual([56, 56, "door"]);
    expect([order(8809)["total"], order(8809)["balance"], order(8809)["status"]]).toEqual([48, 48, "awaiting_transfer"]);
    expect([order(8790)["total"], order(8790)["balance"], order(8790)["paid_in"]]).toEqual([85, 0, 85]);
  });

  it("gives CREW5's $5 off each Standard ticket on a Main Hall show, and STUDENT10's 10 % on a Home Studio place", () => {
    const crew = rows["orders"]!.filter((o) => o["code_text"] === "CREW5" && o["status"] !== "cancelled");
    expect(crew.length).toBeGreaterThan(0);
    for (const o of crew) {
      for (const t of rows["tickets"]!.filter((x) => x["order_id"] === o["id"])) expect(t["discount"]).toBe(t["kind"] === "standard" ? 5 : 0);
    }
    const student = rows["orders"]!.filter((o) => o["code_text"] === "STUDENT10");
    for (const o of student) for (const t of rows["tickets"]!.filter((x) => x["order_id"] === o["id"])) expect(t["discount"]).toBe(4.5);
  });

  it("owes the Dust Parade refunds that are still to make", () => {
    const dust = event("Dust Parade");
    expect(dollars(cents(dust["paid_in"]) - cents(dust["refunded"]))).toBe("$2,376.00");
  });
});
