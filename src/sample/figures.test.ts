/**
 * Every figure the screens quote, worked out from the sample's rows at a
 * fixed moment: Tuesday 28 July 2026 at 16:30 (the box office's afternoon),
 * at 19:58 (the door, just before doors), and at 16:30 on Wednesday (after
 * the clock has let the overdue transfers go and Neon's night has ended).
 * A change to the rows that moves a figure fails here, by name.
 */
import { describe, expect, it } from "vitest";

import { advance, audience, dollars, figures, LEDGER, show } from "./figures.ts";

const AT = "2026-07-28T16:30";
const WED = "2026-07-29T16:30";

type Row = [sold: number, capacity: number, received: string, owedDoor: string, awaiting: string];
const SHOWS: Record<string, Row> = {
  paper: [120, 120, "$1,920.00", "$0.00", "$0.00"],
  neon: [388, 414, "$10,287.00", "$336.00", "$0.00"],
  velvet: [118, 120, "$2,080.00", "$280.00", "$0.00"],
  dust: [0, 450, "$3,816.00", "$0.00", "$0.00"],
  low: [64, 120, "$795.00", "$165.00", "$0.00"],
  listen: [71, 120, "$0.00", "$0.00", "$0.00"],
  studio: [13, 20, "$391.50", "$180.00", "$0.00"],
  cinder: [245, 440, "$4,409.00", "$810.00", "$336.00"],
  hollow: [247, 450, "$7,023.00", "$510.00", "$60.00"],
  static: [0, 450, "$0.00", "$0.00", "$0.00"],
  fest: [391, 570, "$23,189.00", "$3,935.00", "$776.00"],
  quiet: [26, 450, "$499.00", "$175.00", "$0.00"],
  pale: [0, 120, "$0.00", "$0.00", "$0.00"],
  marrow: [9, 120, "$162.00", "$0.00", "$0.00"],
};

describe("Tuesday 28 July, 16:30", () => {
  it("has 799 orders, WV-8017 to WV-8815, and 1,945 tickets", () => {
    expect(LEDGER.orders.length).toBe(799);
    expect([LEDGER.orders[0]!.no, LEDGER.orders.at(-1)!.no]).toEqual([8017, 8815]);
    expect(LEDGER.orders.reduce((n, o) => n + o.tickets.length, 0)).toBe(1945);
  });

  it.each(Object.entries(SHOWS))("%s: sold, capacity, received, owed at the door, awaiting", (key, want) => {
    const f = figures(LEDGER, key, AT);
    expect([f.sold, f.capacity, dollars(f.received), dollars(f.owedDoor), dollars(f.awaiting)]).toEqual(want);
  });

  it("Neon Circuit: 388 of 414, 3 held, Standard 14 left and Balcony 9 left, 12 tickets owed, 156 orders from 145 people", () => {
    const f = figures(LEDGER, "neon", AT);
    const t = f.types;
    expect([t["std"]!.sold, t["std"]!.paid, t["std"]!.owed, t["std"]!.held, t["std"]!.left]).toEqual([243, 231, 12, 3, 14]);
    expect([t["early"]!.paid, t["early"]!.left, t["bal"]!.paid, t["bal"]!.left, t["comp"]!.sold]).toEqual([80, 0, 61, 9, 4]);
    expect([f.held, f.left, f.owedDoorTickets, f.orders, f.buyers]).toEqual([3, 23, 12, 156, 145]);
  });

  it("the other shows' tickets owed at the door and their transfers", () => {
    const at = (key: string) => figures(LEDGER, key, AT);
    expect(at("velvet").held).toBe(2);
    expect([at("velvet").owedDoorTickets, at("low").owedDoorTickets, at("studio").owedDoorTickets, at("hollow").owedDoorTickets, at("quiet").owedDoorTickets]).toEqual([14, 11, 4, 17, 7]);
    const cinder = at("cinder");
    expect([cinder.types["early"]!.owed, cinder.types["std"]!.owed, cinder.awaitingOrders, cinder.overdueOrders]).toEqual([13, 24, 6, 3]);
    expect([cinder.byStatus.paid, cinder.byStatus.door, (cinder.byStatus.awaiting_transfer ?? 0) + (cinder.byStatus.overdue ?? 0)]).toEqual([75, 13, 6]);
    const fest = at("fest");
    expect([fest.types["wk"]!.owed, fest.types["sat"]!.owed + fest.types["sun"]!.owed, fest.awaitingOrders]).toEqual([35, 20, 4]);
    expect([at("hollow").orders, at("hollow").buyers]).toEqual([90, 88]);
  });

  it("the Overview: 1,572 sold for 12 coming shows, $6,391.00 owed at the door on 8, $1,172.00 awaiting in 11 orders (3 overdue)", () => {
    const coming = LEDGER.shows.filter((s) => s.curfew >= AT && s.cancelled_at === undefined).map((s) => s.key);
    const f = coming.map((key) => figures(LEDGER, key, AT));
    const waiting = LEDGER.orders.filter((o) => o.status === "awaiting_transfer" || o.status === "overdue");
    expect(coming.length).toBe(12);
    expect(f.reduce((n, x) => n + x.sold, 0)).toBe(1572);
    expect(dollars(f.reduce((n, x) => n + x.owedDoor, 0))).toBe("$6,391.00");
    expect(f.filter((x) => x.owedDoor > 0).length).toBe(8);
    expect([waiting.length, waiting.filter((o) => o.status === "overdue").length]).toEqual([11, 3]);
  });

  it("three transfers overdue: WV-8793, WV-8795, WV-8797, $204.00", () => {
    const overdue = LEDGER.orders.filter((o) => o.status === "overdue");
    expect(overdue.map((o) => o.no)).toEqual([8793, 8795, 8797]);
    expect(dollars(overdue.reduce((n, o) => n + o.tickets.reduce((m, t) => m + Math.round((t.price - t.discount) * 100), 0), 0))).toBe("$204.00");
  });

  it("messages go to people and orders: Hollow Tide 88 · 90, Neon 145 · 156, Dust Parade 79 · 82, the Weekender 162 · 162, Cinder 79 · 79", () => {
    expect(audience(LEDGER, "hollow", AT)).toEqual({ people: 88, orders: 90 });
    expect(audience(LEDGER, "neon", "2026-07-28T12:05")).toEqual({ people: 145, orders: 156 });
    expect(audience(LEDGER, "dust", "2026-07-22T11:02")).toEqual({ people: 79, orders: 82 });
    expect(audience(LEDGER, "fest", "2026-07-19T16:02")).toEqual({ people: 162, orders: 162 });
    expect(audience(LEDGER, "cinder", "2026-07-22T10:40")).toEqual({ people: 79, orders: 79 });
  });
});

describe("Tuesday 28 July, 19:58 — the door, before doors", () => {
  const door = LEDGER.door_1958;

  it("has let 38 Early-entry tickets in, 14 at Door 1 and 24 at Door 2, from 19:31", () => {
    expect(door.length).toBe(38);
    expect(door.filter((c) => c.device === "Door 1").length).toBe(14);
    expect(door.filter((c) => c.device === "Door 2").length).toBe(24);
    expect([door[0]!.at, door.at(-1)!.at]).toEqual(["2026-07-28T19:31", "2026-07-28T19:58"]);
  });

  it("lets in only paid tickets", () => {
    for (const c of door) expect(LEDGER.orders.find((o) => o.no === c.order)!.status).toBe("paid");
  });

  it("counts 410 to come in (388 tickets and 22 guests), and sells Standard 17 once the held checkout ran out", () => {
    const neon = figures(LEDGER, "neon", "2026-07-28T19:58");
    const guests = LEDGER.guests["neon"]!.reduce((n, g) => n + 1 + g.plus, 0);
    expect(neon.sold + guests).toBe(410);
    expect([neon.types["std"]!.left, neon.types["bal"]!.left]).toEqual([17, 9]);
  });
});

describe("Wednesday 29 July, 16:30 — after the clock", () => {
  const orders = advance(LEDGER, WED);
  const at = (no: number) => orders.find((o) => o.no === no)!;

  it("released the three overdue Cinder transfers: Standard 135 left, Balcony 50, 237 sold, 3 still awaiting", () => {
    expect([8793, 8795, 8797].map((no) => at(no).status)).toEqual(["released", "released", "released"]);
    const cinder = figures(LEDGER, "cinder", WED, orders);
    expect([cinder.types["std"]!.left, cinder.types["bal"]!.left, cinder.sold, cinder.awaitingOrders]).toEqual([135, 50, 237, 3]);
    expect(dollars(cinder.awaiting)).toBe("$132.00");
  });

  it("let the held checkout and Mia's waitlist offer go, and marked Neon's uncollected door orders", () => {
    expect([at(8815).status, at(8814).status, at(8761).status]).toEqual(["expired", "expired", "not_collected"]);
    const neon = orders.filter((o) => o.show === "neon" && o.status === "not_collected");
    const owed = neon.reduce((n, o) => n + o.tickets.reduce((m, t) => m + Math.round((t.price - t.discount) * 100), 0), 0);
    expect([neon.length, dollars(owed)]).toEqual([6, "$336.00"]);
  });

  it("offers the two places back in joining order: Kai Renner 1, Ana Ruiz 1 of her 2", () => {
    const back = at(8814).tickets.length;
    let left = back;
    const offers: [string, number][] = [];
    for (const w of LEDGER.waitlist) {
      if (w.status !== "waiting" || left === 0) continue;
      const n = Math.min(w.qty, left);
      offers.push([w.name, n]);
      left -= n;
    }
    expect(offers).toEqual([
      ["Kai Renner", 1],
      ["Ana Ruiz", 1],
    ]);
  });

  it("the Overview: 1,176 sold for 11 coming shows, $6,055.00 owed at the door on 7, $968.00 awaiting in 8 orders", () => {
    const coming = LEDGER.shows.filter((s) => s.curfew >= WED && s.cancelled_at === undefined).map((s) => s.key);
    const f = coming.map((key) => figures(LEDGER, key, WED, orders));
    const waiting = orders.filter((o) => o.status === "awaiting_transfer" || o.status === "overdue");
    expect(coming.length).toBe(11);
    expect(f.reduce((n, x) => n + x.sold, 0)).toBe(1176);
    expect([dollars(f.reduce((n, x) => n + x.owedDoor, 0)), f.filter((x) => x.owedDoor > 0).length]).toEqual(["$6,055.00", 7]);
    expect([dollars(waiting.reduce((n, o) => n + o.tickets.reduce((m, t) => m + Math.round((t.price - t.discount) * 100), 0), 0)), waiting.length]).toEqual(["$968.00", 8]);
  });

  it("still has Velvet Hour's show a day and a half away", () => {
    expect(show(LEDGER, "velvet").doors).toBe("2026-07-31T19:30");
  });
});
