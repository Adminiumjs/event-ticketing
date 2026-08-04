/**
 * Engine assertions for `lib/tickets.ts`.
 *
 * These run against the SHIPPED SEED rather than fixtures wherever the seed
 * makes the point, so a change to `data/demo.ts` that quietly breaks the box
 * office — a capacity raised, a sale window moved, the check-in line rewritten
 * — fails here instead of on the screen.
 *
 * Fixtures appear only where the seed cannot make a point cleanly: an
 * oversell, a hold refused for being one over what is left, a code typed in
 * lower case with a stray space.
 */

import { describe, expect, it } from "vitest";

import {
  FEATURED,
  HOLDS,
  NEXT_SEQ,
  NOW,
  ORDERS,
  SHOWS,
  TICKETS,
} from "../data/demo.ts";
import type { Hold, Show, Ticket, TicketType } from "../data/types.ts";
import {
  CHECK_IN_OPENS_BEFORE,
  HOLD_MINUTES,
  MAX_PER_TYPE,
  MIN_PER_DAY,
  activeHolds,
  atMinute,
  checkInOpensAt,
  checkInState,
  checkInVerdict,
  checkoutOrder,
  createHold,
  dayOf,
  daySerial,
  doorCount,
  doorSamples,
  doorsAt,
  endsAt,
  expireHolds,
  fromPrice,
  fromSerial,
  heldCount,
  holdQty,
  holdSecondsLeft,
  holdTotal,
  inventory,
  isCheckedIn,
  minuteOfDay,
  nextDoors,
  orderCode,
  qrGrid,
  recentCheckIns,
  salesPace,
  saleStartOf,
  searchAttendees,
  showById,
  showInventory,
  showStatus,
  soldCount,
  stageTimeAt,
  ticketCode,
  ticketsForEmail,
  typeById,
  typeSaleState,
  upcoming,
} from "./tickets.ts";

const show = (id: string): Show => showById(SHOWS, id) as Show;
const type = (showId: string, ttId: string): TicketType =>
  typeById(show(showId), ttId) as TicketType;

const NEON = show("neon");
const NEON_DOORS = doorsAt(NEON);

/** A hold the tests can place anywhere on the clock. */
const hold = (over: Partial<Hold> = {}): Hold => ({
  id: "H-TEST",
  evId: "neon",
  lines: [{ tt: "nb", qty: 2 }],
  startedAt: NOW,
  expiresAt: NOW + HOLD_MINUTES,
  mine: true,
  ...over,
});

describe("the clock", () => {
  it("pins to Tuesday 28 July 2026, 16:30", () => {
    expect(NOW).toBe(atMinute(2026, 7, 28, 16, 30));
    const civil = fromSerial(dayOf(NOW));
    expect(civil).toEqual({ y: 2026, m: 7, d: 28, dow: 2 });
    expect(minuteOfDay(NOW)).toBe(16 * 60 + 30);
  });

  it("puts the featured show's doors at 20:00 the same evening", () => {
    expect(dayOf(NEON_DOORS)).toBe(daySerial(2026, 7, 28));
    expect(minuteOfDay(NEON_DOORS)).toBe(20 * 60);
    expect(NEON_DOORS - NOW).toBe(210);
  });

  it("opens check-in exactly half an hour before doors", () => {
    expect(checkInOpensAt(NEON)).toBe(NEON_DOORS - CHECK_IN_OPENS_BEFORE);
    expect(minuteOfDay(checkInOpensAt(NEON))).toBe(19 * 60 + 30);
  });

  it("rolls a night that ends after midnight onto the next day", () => {
    const cinder = show("cinder");
    /* Doors 22:00, stage 22:30, ends 03:00 — the end belongs to the 1st. */
    expect(dayOf(endsAt(cinder))).toBe(daySerial(2026, 8, 1));
    expect(endsAt(cinder)).toBeGreaterThan(stageTimeAt(cinder));
  });

  it("keeps the festival's end on its second day", () => {
    const week = show("week");
    expect(week.date2).toBe(daySerial(2026, 8, 16));
    expect(dayOf(endsAt(week))).toBe(daySerial(2026, 8, 16));
  });

  it("names the featured show as the next doors to advance to", () => {
    expect(nextDoors(SHOWS, NOW)?.id).toBe(FEATURED);
    /* Once past them, the next jump is the acoustic evening two nights on. */
    expect(nextDoors(SHOWS, NEON_DOORS)?.id).toBe("velvet");
  });

  it("lists all six shows as upcoming, soonest first", () => {
    const list = upcoming(SHOWS, NOW);
    expect(list).toHaveLength(6);
    expect(list.map((s) => s.id)).toEqual([
      "neon",
      "velvet",
      "cinder",
      "static",
      "hollow",
      "week",
    ]);
  });
});

describe("inventory", () => {
  it("derives remaining as capacity minus sold minus held", () => {
    const ne = inventory(NEON, type("neon", "ne"), TICKETS, HOLDS, NOW);
    expect(ne.capacity).toBe(80);
    expect(ne.sold).toBe(14);
    expect(ne.held).toBe(1);
    expect(ne.remaining).toBe(80 - 14 - 1);
  });

  it("issues forty tickets for the featured show", () => {
    expect(soldCount(TICKETS, "neon")).toBe(40);
    expect(
      soldCount(TICKETS, "neon", "ne") +
        soldCount(TICKETS, "neon", "ns") +
        soldCount(TICKETS, "neon", "nb"),
    ).toBe(40);
  });

  it("sums the three ticket types into the show's own figures", () => {
    const total = showInventory(NEON, TICKETS, HOLDS, NOW);
    expect(total.capacity).toBe(410);
    expect(total.sold).toBe(40);
    expect(total.held).toBe(3);
    expect(total.remaining).toBe(367);
  });

  it("never reports a negative remaining, even oversold", () => {
    const oversold: Ticket[] = Array.from({ length: 200 }, (_, i) => ({
      code: `X-${i}`,
      evId: "neon",
      tt: "nb",
      holder: "Test Person",
      buyer: { name: "Test Person", email: "t@example.com" },
      orderCode: "X",
      soldAt: NOW - 100,
      checkedInAt: null,
    }));
    const inv = inventory(NEON, type("neon", "nb"), oversold, [], NOW);
    expect(inv.sold).toBe(200);
    expect(inv.remaining).toBe(0);
  });

  it("prices the featured show from its cheapest ticket type", () => {
    expect(fromPrice(NEON)).toBe(2200);
    expect(fromPrice(show("cinder"))).toBe(1900);
  });
});

describe("on-sale states", () => {
  it("puts the whole of Hollow Tide behind its sale window", () => {
    const hollow = show("hollow");
    for (const tt of hollow.types) {
      expect(typeSaleState(hollow, tt, TICKETS, HOLDS, NOW)).toBe("notYetOnSale");
    }
    const status = showStatus(hollow, TICKETS, HOLDS, NOW);
    expect(status.kind).toBe("notYetOnSale");
    if (status.kind === "notYetOnSale") {
      expect(status.saleStart).toBe(atMinute(2026, 8, 1, 10, 0));
      /* Saturday 10:00 — what the chip prints. */
      expect(fromSerial(dayOf(status.saleStart)).dow).toBe(6);
      expect(minuteOfDay(status.saleStart)).toBe(600);
    }
  });

  it("falls back to the show's sale start when a type has none of its own", () => {
    expect(saleStartOf(NEON, type("neon", "ne"))).toBe(NEON.saleStart);
  });

  it("flips Hollow Tide on sale the minute its window opens", () => {
    const hollow = show("hollow");
    const opens = hollow.saleStart;
    expect(typeSaleState(hollow, hollow.types[0], TICKETS, HOLDS, opens - 1)).toBe(
      "notYetOnSale",
    );
    expect(typeSaleState(hollow, hollow.types[0], TICKETS, HOLDS, opens)).toBe("onSale");
    expect(showStatus(hollow, TICKETS, HOLDS, opens).kind).toBe("onSale");
  });

  it("calls Velvet Hour selling fast — under 15% left across the room", () => {
    const velvet = show("velvet");
    const inv = showInventory(velvet, TICKETS, HOLDS, NOW);
    expect(inv.remaining).toBe(15);
    expect(inv.remaining / inv.capacity).toBeLessThan(0.15);
    expect(showStatus(velvet, TICKETS, HOLDS, NOW).kind).toBe("sellingFast");
  });

  it("sells out the Supporter tickets but not the whole of Velvet Hour", () => {
    const velvet = show("velvet");
    expect(typeSaleState(velvet, type("velvet", "vp"), TICKETS, HOLDS, NOW)).toBe(
      "soldOut",
    );
    expect(typeSaleState(velvet, type("velvet", "ve"), TICKETS, HOLDS, NOW)).toBe(
      "onSale",
    );
  });

  it("sells Static Bloom out completely", () => {
    const bloom = show("static");
    const inv = showInventory(bloom, TICKETS, HOLDS, NOW);
    expect(inv.sold).toBe(inv.capacity);
    expect(inv.remaining).toBe(0);
    expect(showStatus(bloom, TICKETS, HOLDS, NOW).kind).toBe("soldOut");
  });

  it("switches the featured show to doors-open, then wrapped", () => {
    expect(showStatus(NEON, TICKETS, HOLDS, NOW).kind).toBe("onSale");
    expect(showStatus(NEON, TICKETS, HOLDS, NEON_DOORS).kind).toBe("doorsOpen");
    expect(showStatus(NEON, TICKETS, HOLDS, endsAt(NEON)).kind).toBe("wrapped");
    expect(typeSaleState(NEON, type("neon", "ne"), TICKETS, HOLDS, endsAt(NEON))).toBe(
      "closed",
    );
  });
});

describe("holds", () => {
  it("drops the remaining count the moment a hold exists, and restores it after", () => {
    const before = inventory(NEON, type("neon", "nb"), TICKETS, [], NOW);
    expect(before.remaining).toBe(65);

    const result = createHold(NEON, { nb: 4 }, TICKETS, [], NOW, "H1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const during = inventory(NEON, type("neon", "nb"), TICKETS, [result.hold], NOW);
    expect(during.held).toBe(4);
    expect(during.remaining).toBe(61);

    /* One minute past expiry the same hold list reads as if it never existed. */
    const after = inventory(
      NEON,
      type("neon", "nb"),
      TICKETS,
      [result.hold],
      NOW + HOLD_MINUTES + 1,
    );
    expect(after.held).toBe(0);
    expect(after.remaining).toBe(65);
  });

  it("expires exactly ten minutes after it starts, not a minute before", () => {
    const h = hold();
    expect(h.expiresAt - h.startedAt).toBe(10);
    expect(activeHolds([h], NOW + 9.99)).toHaveLength(1);
    expect(activeHolds([h], NOW + 10)).toHaveLength(0);
  });

  it("counts down in whole seconds and floors at zero", () => {
    const h = hold();
    expect(holdSecondsLeft(h, NOW)).toBe(600);
    expect(holdSecondsLeft(h, NOW + 9.7)).toBe(18);
    expect(holdSecondsLeft(h, NOW + 60)).toBe(0);
  });

  it("splits a hold list into kept and expired", () => {
    const live = hold({ id: "live", expiresAt: NOW + 5 });
    const dead = hold({ id: "dead", expiresAt: NOW - 1 });
    const { kept, expired } = expireHolds([live, dead], NOW);
    expect(kept.map((h) => h.id)).toEqual(["live"]);
    expect(expired.map((h) => h.id)).toEqual(["dead"]);
  });

  it("carries two seeded carts on the featured show and nowhere else", () => {
    expect(HOLDS).toHaveLength(2);
    expect(heldCount(HOLDS, "neon", undefined, NOW)).toBe(3);
    expect(heldCount(HOLDS, "velvet", undefined, NOW)).toBe(0);
    expect(heldCount(HOLDS, "neon", "ns", NOW)).toBe(2);
    expect(heldCount(HOLDS, "neon", "ne", NOW)).toBe(1);
  });

  it("releases both seeded carts by the time doors open", () => {
    expect(heldCount(HOLDS, "neon", undefined, NEON_DOORS)).toBe(0);
    expect(showInventory(NEON, TICKETS, HOLDS, NEON_DOORS).held).toBe(0);
  });

  it("refuses more than six of one ticket type", () => {
    const ok = createHold(NEON, { ns: MAX_PER_TYPE }, TICKETS, [], NOW, "H1");
    expect(ok.ok).toBe(true);
    const over = createHold(NEON, { ns: MAX_PER_TYPE + 1 }, TICKETS, [], NOW, "H2");
    expect(over.ok).toBe(false);
    if (!over.ok) {
      expect(over.reason).toBe("overCap");
      if (over.reason === "overCap") expect(over.max).toBe(6);
    }
  });

  it("refuses a ticket type that is not on sale yet", () => {
    const hollow = show("hollow");
    const result = createHold(hollow, { hs: 2 }, TICKETS, [], NOW, "H1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("notOnSale");
      if (result.reason === "notOnSale") expect(result.ttId).toBe("hs");
    }
  });

  it("refuses one more than is left, and reports how many that was", () => {
    const velvet = show("velvet");
    const left = inventory(velvet, type("velvet", "ve"), TICKETS, [], NOW).remaining;
    expect(left).toBe(4);
    const result = createHold(velvet, { ve: left + 1 }, TICKETS, [], NOW, "H1");
    expect(result.ok).toBe(false);
    if (!result.ok && result.reason === "notEnough") {
      expect(result.available).toBe(4);
      expect(result.ttId).toBe("ve");
    }
  });

  it("refuses an empty cart", () => {
    const result = createHold(NEON, {}, TICKETS, [], NOW, "H1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("empty");
  });

  it("counts a live hold against the next one, so two carts cannot share a ticket", () => {
    const velvet = show("velvet");
    const first = createHold(velvet, { ve: 4 }, TICKETS, [], NOW, "H1");
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = createHold(velvet, { ve: 1 }, TICKETS, [first.hold], NOW, "H2");
    expect(second.ok).toBe(false);
    if (!second.ok && second.reason === "notEnough") expect(second.available).toBe(0);
  });

  it("totals a multi-type hold in cents and counts its tickets", () => {
    const result = createHold(NEON, { ne: 2, nb: 1 }, TICKETS, [], NOW, "H1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(holdQty(result.hold)).toBe(3);
    expect(holdTotal(result.hold, NEON)).toBe(2200 * 2 + 3400);
  });
});

describe("order and ticket codes", () => {
  it("ends the seed at WV-8814 and mints WV-8815 next", () => {
    expect(ORDERS[ORDERS.length - 1].code).toBe("WV-8814");
    expect(NEXT_SEQ).toBe(8815);
    expect(orderCode(NEXT_SEQ)).toBe("WV-8815");
  });

  it("zero-pads per-ticket codes to two digits", () => {
    expect(ticketCode("WV-8815", 0)).toBe("WV-8815-01");
    expect(ticketCode("WV-8815", 1)).toBe("WV-8815-02");
    expect(ticketCode("WV-8815", 9)).toBe("WV-8815-10");
  });

  it("issues one ticket per held admission, in line order", () => {
    const result = createHold(NEON, { ne: 2, nb: 1 }, TICKETS, [], NOW, "H1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const out = checkoutOrder(
      result.hold,
      NEON,
      { name: "Nell Quint", email: "nell.quint@example.com" },
      [],
      NEXT_SEQ,
      NOW,
    );

    expect(out.order.code).toBe("WV-8815");
    expect(out.nextSeq).toBe(8816);
    expect(out.tickets.map((t) => t.code)).toEqual([
      "WV-8815-01",
      "WV-8815-02",
      "WV-8815-03",
    ]);
    expect(out.tickets.map((t) => t.tt)).toEqual(["ne", "ne", "nb"]);
    expect(out.order.total).toBe(2200 * 2 + 3400);
    expect(out.tickets.every((t) => t.checkedInAt === null)).toBe(true);
  });

  it("falls back to the buyer's name for any ticket left blank", () => {
    const result = createHold(NEON, { ne: 3 }, TICKETS, [], NOW, "H1");
    if (!result.ok) throw new Error("hold refused");
    const out = checkoutOrder(
      result.hold,
      NEON,
      { name: "Nell Quint", email: "nell.quint@example.com" },
      ["Bo Kade", "   "],
      NEXT_SEQ,
      NOW,
    );
    expect(out.tickets.map((t) => t.holder)).toEqual([
      "Bo Kade",
      "Nell Quint",
      "Nell Quint",
    ]);
  });

  it("closes the loop: a checked-out hold turns held into sold and leaves remaining alone", () => {
    const before = inventory(NEON, type("neon", "nb"), TICKETS, [], NOW);
    const result = createHold(NEON, { nb: 2 }, TICKETS, [], NOW, "H1");
    if (!result.ok) throw new Error("hold refused");

    const out = checkoutOrder(
      result.hold,
      NEON,
      { name: "Iris Blom", email: "iris.blom@example.com" },
      [],
      NEXT_SEQ,
      NOW,
    );
    const after = inventory(NEON, type("neon", "nb"), [...TICKETS, ...out.tickets], [], NOW);

    expect(after.sold).toBe(before.sold + 2);
    expect(after.held).toBe(0);
    expect(after.remaining).toBe(before.remaining - 2);
  });
});

describe("the wallet lookup", () => {
  it("finds the demo buyer's two tickets, one of each ticket type", () => {
    const mine = ticketsForEmail(TICKETS, "mia.okada@example.com");
    expect(mine).toHaveLength(2);
    expect(mine.map((t) => t.tt).sort()).toEqual(["ne", "ns"]);
    expect(mine.map((t) => t.holder).sort()).toEqual(["Mia Okada", "Rafael Okada"]);
    expect(new Set(mine.map((t) => t.orderCode)).size).toBe(1);
  });

  it("ignores case and surrounding space, and returns nothing for a blank", () => {
    expect(ticketsForEmail(TICKETS, "  MIA.OKADA@EXAMPLE.COM ")).toHaveLength(2);
    expect(ticketsForEmail(TICKETS, "")).toHaveLength(0);
    expect(ticketsForEmail(TICKETS, "nobody@example.com")).toHaveLength(0);
  });
});

describe("the door", () => {
  it("keeps check-in shut at the pinned clock and opens it at 19:30", () => {
    expect(checkInState(NEON, NOW)).toBe("before");
    expect(checkInState(NEON, checkInOpensAt(NEON) - 1)).toBe("before");
    expect(checkInState(NEON, checkInOpensAt(NEON))).toBe("open");
    expect(checkInState(NEON, NEON_DOORS)).toBe("open");
    expect(checkInState(NEON, endsAt(NEON))).toBe("after");
  });

  it("reads zero at 16:30 and ten the moment doors open", () => {
    /* The early-entry line is seeded in the FUTURE relative to the pinned
     * clock. That is the whole trick: the counter has history to show the
     * instant the dock advances, and none before. */
    expect(doorCount(TICKETS, "neon", NOW)).toBe(0);
    expect(doorCount(TICKETS, "neon", NEON_DOORS)).toBe(10);
  });

  it("lets the early line in between 19:31 and 19:58", () => {
    const scanned = TICKETS.filter((t) => t.checkedInAt !== null);
    expect(scanned).toHaveLength(10);
    for (const ticket of scanned) {
      const at = ticket.checkedInAt as number;
      expect(ticket.evId).toBe("neon");
      /* Early entry only — general doors are still half an hour away. */
      expect(ticket.tt).toBe("ne");
      expect(minuteOfDay(at)).toBeGreaterThanOrEqual(19 * 60 + 31);
      expect(minuteOfDay(at)).toBeLessThanOrEqual(19 * 60 + 58);
    }
  });

  it("scans the demo buyer in at 19:42", () => {
    const mia = TICKETS.find(
      (t) => t.holder === "Mia Okada" && t.evId === "neon",
    ) as Ticket;
    expect(mia.checkedInAt).toBe(daySerial(2026, 7, 28) * MIN_PER_DAY + 19 * 60 + 42);
    expect(isCheckedIn(mia, NOW)).toBe(false);
    expect(isCheckedIn(mia, NEON_DOORS)).toBe(true);
  });

  it("orders the recent list newest first", () => {
    const recent = recentCheckIns(TICKETS, "neon", NEON_DOORS);
    expect(recent).toHaveLength(10);
    for (let i = 1; i < recent.length; i += 1) {
      expect(recent[i - 1].checkedInAt as number).toBeGreaterThanOrEqual(
        recent[i].checkedInAt as number,
      );
    }
  });

  it("returns a checked-in verdict carrying the ticket type and the holder", () => {
    const target = TICKETS.find(
      (t) => t.evId === "neon" && t.checkedInAt === null,
    ) as Ticket;
    const verdict = checkInVerdict(target.code, "neon", TICKETS, NEON_DOORS);
    expect(verdict.kind).toBe("checkedIn");
    if (verdict.kind === "checkedIn") {
      expect(verdict.holder).toBe(target.holder);
      expect(verdict.ttId).toBe(target.tt);
      expect(verdict.code).toBe(target.code);
    }
  });

  it("returns the ORIGINAL time when the same code is scanned twice", () => {
    const first = TICKETS.find((t) => t.checkedInAt !== null) as Ticket;
    const verdict = checkInVerdict(first.code, "neon", TICKETS, NEON_DOORS + 30);
    expect(verdict.kind).toBe("alreadyCheckedIn");
    if (verdict.kind === "alreadyCheckedIn") {
      /* Not "now" — the minute they actually came through. */
      expect(verdict.at).toBe(first.checkedInAt);
      expect(verdict.at).toBeLessThan(NEON_DOORS + 30);
      expect(verdict.holder).toBe(first.holder);
    }
  });

  it("rejects a code that belongs to a different night", () => {
    const other = TICKETS.find((t) => t.evId === "velvet") as Ticket;
    const verdict = checkInVerdict(other.code, "neon", TICKETS, NEON_DOORS);
    expect(verdict.kind).toBe("wrongShow");
    if (verdict.kind === "wrongShow") {
      expect(verdict.evId).toBe("velvet");
      expect(verdict.holder).toBe(other.holder);
    }
  });

  it("rejects a code nobody ever issued", () => {
    const verdict = checkInVerdict("WV-9999-01", "neon", TICKETS, NEON_DOORS);
    expect(verdict.kind).toBe("unknownCode");
    if (verdict.kind === "unknownCode") expect(verdict.code).toBe("WV-9999-01");
  });

  it("normalises how a tired person types at 20:04", () => {
    const target = TICKETS.find(
      (t) => t.evId === "neon" && t.checkedInAt === null,
    ) as Ticket;
    const messy = `  ${target.code.toLowerCase()} `;
    expect(checkInVerdict(messy, "neon", TICKETS, NEON_DOORS).kind).toBe("checkedIn");
    expect(checkInVerdict("   ", "neon", TICKETS, NEON_DOORS).kind).toBe("empty");
  });

  it("derives the door count from the list, so applying a verdict moves it by one", () => {
    const at = NEON_DOORS;
    expect(doorCount(TICKETS, "neon", at)).toBe(10);

    const target = TICKETS.find(
      (t) => t.evId === "neon" && t.checkedInAt === null,
    ) as Ticket;
    const applied = TICKETS.map((t) =>
      t.code === target.code ? { ...t, checkedInAt: at } : t,
    );

    expect(doorCount(applied, "neon", at)).toBe(11);
    /* "11 of 40 issued" — the counter's two numbers, both derived. */
    expect(soldCount(applied, "neon")).toBe(40);
  });

  it("offers one sample code per verdict, all four distinct", () => {
    const samples = doorSamples(TICKETS, "neon", NEON_DOORS);
    expect(samples.valid).not.toBeNull();
    expect(samples.duplicate).not.toBeNull();
    expect(samples.wrongShow).not.toBeNull();
    expect(new Set([samples.valid, samples.duplicate, samples.wrongShow, samples.unknown]).size).toBe(4);

    expect(checkInVerdict(samples.valid as string, "neon", TICKETS, NEON_DOORS).kind).toBe("checkedIn");
    expect(checkInVerdict(samples.duplicate as string, "neon", TICKETS, NEON_DOORS).kind).toBe("alreadyCheckedIn");
    expect(checkInVerdict(samples.wrongShow as string, "neon", TICKETS, NEON_DOORS).kind).toBe("wrongShow");
    expect(checkInVerdict(samples.unknown, "neon", TICKETS, NEON_DOORS).kind).toBe("unknownCode");
  });
});

describe("the attendee list", () => {
  it("lists everyone holding a ticket for the featured show, by name", () => {
    const rows = searchAttendees(TICKETS, "neon", "");
    expect(rows).toHaveLength(40);
    const names = rows.map((t) => t.holder);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
  });

  it("matches on a name fragment, a code and an e-mail", () => {
    expect(searchAttendees(TICKETS, "neon", "Mia Okada")).toHaveLength(1);

    /* A surname fragment catches the buyer's e-mail as well as the holders'
     * names, which is why "okada" pulls in Rafael's ticket too — and why the
     * generated audience also throws up an unrelated Okada. Assert the rule,
     * not the tally. */
    const okada = searchAttendees(TICKETS, "neon", "okada");
    expect(okada.length).toBeGreaterThanOrEqual(2);
    expect(
      okada.every(
        (t) =>
          t.holder.toLowerCase().includes("okada") ||
          t.buyer.email.toLowerCase().includes("okada"),
      ),
    ).toBe(true);
    expect(okada.filter((t) => t.buyer.email === "mia.okada@example.com")).toHaveLength(2);

    const someone = TICKETS.find((t) => t.evId === "neon") as Ticket;
    expect(searchAttendees(TICKETS, "neon", someone.code)).toHaveLength(1);
  });

  it("never leaks another night's attendees into the list", () => {
    const rows = searchAttendees(TICKETS, "velvet", "");
    expect(rows).toHaveLength(175);
    expect(rows.every((t) => t.evId === "velvet")).toBe(true);
  });
});

describe("sales pace", () => {
  it("folds everything sold before the window into the starting value", () => {
    const today = dayOf(NOW);
    const pace = salesPace(TICKETS, "neon", today - 13, today);
    expect(pace.points).toHaveLength(14);
    expect(pace.base).toBeGreaterThan(0);
    expect(pace.base + pace.points.reduce((n, p) => n + p.sold, 0)).toBe(40);
    expect(pace.max).toBe(40);
  });

  it("only ever climbs", () => {
    const today = dayOf(NOW);
    const pace = salesPace(TICKETS, "week", today - 13, today);
    for (let i = 1; i < pace.points.length; i += 1) {
      expect(pace.points[i].cumulative).toBeGreaterThanOrEqual(
        pace.points[i - 1].cumulative,
      );
    }
    expect(pace.max).toBe(soldCount(TICKETS, "week"));
  });
});

describe("the fictional QR", () => {
  it("is the same grid for the same code, every time", () => {
    expect(qrGrid("WV-8815-01")).toEqual(qrGrid("WV-8815-01"));
    expect(qrGrid("WV-8815-01")).not.toEqual(qrGrid("WV-8815-02"));
  });

  it("is square, and draws finder squares in exactly three corners", () => {
    const grid = qrGrid("WV-8815-01");
    expect(grid).toHaveLength(17);
    expect(grid.every((row) => row.length === 17)).toBe(true);

    /* Each finder's outer ring is on and its inner ring is off. */
    const corners: [number, number][] = [
      [0, 0],
      [10, 0],
      [0, 10],
    ];
    for (const [ox, oy] of corners) {
      expect(grid[oy][ox]).toBe(true);
      expect(grid[oy][ox + 6]).toBe(true);
      expect(grid[oy + 1][ox + 1]).toBe(false);
      expect(grid[oy + 3][ox + 3]).toBe(true);
    }
    /* The fourth corner is left to the hash, like a real QR. */
    expect(grid[16][16]).toBe(qrGrid("WV-8815-01")[16][16]);
  });
});
