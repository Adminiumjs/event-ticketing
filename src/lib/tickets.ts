/**
 * The ticket engine.
 *
 * Every number the site shows about inventory, on-sale state, holds, order
 * codes and the door is derived here from the ticket list, the hold list and
 * the clock. Nothing is stored pre-computed: a "remaining" written onto a
 * ticket type is a number that goes wrong the moment somebody's cart expires,
 * and expiry is not an event this app can observe — it is a comparison.
 *
 * The module is pure and React-free, so the vitest suite exercises the real
 * thing rather than a copy of it. Anything that needs a "now" takes it as an
 * argument in ABSOLUTE MINUTES; the app passes the pinned clock from
 * `data/demo.ts`, the tests pass whatever minute the case needs.
 */

import type {
  Buyer,
  Hold,
  HoldLine,
  Order,
  Show,
  Ticket,
  TicketType,
} from "../data/types.ts";

export const MIN_PER_DAY = 1440;

/** How long a cart holds its tickets. Ten minutes, stated on the event page. */
export const HOLD_MINUTES = 10;

/** Per-order cap, per ticket type. Enforced here, not only in the stepper. */
export const MAX_PER_TYPE = 6;

/** Check-in opens half an hour before doors — the early-entry line forms then. */
export const CHECK_IN_OPENS_BEFORE = 30;

/** Under this fraction of the allocation left, a show reads "Selling fast". */
export const SELLING_FAST_BELOW = 0.15;

/* ------------------------------------------------------------------- clock */

/** Days since the Unix epoch for a calendar date, UTC so it never drifts. */
export function daySerial(y: number, m: number, d: number): number {
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** An absolute minute from a calendar date and a wall-clock time. */
export function atMinute(
  y: number,
  m: number,
  d: number,
  hh: number,
  mm: number,
): number {
  return daySerial(y, m, d) * MIN_PER_DAY + hh * 60 + mm;
}

export interface CivilDate {
  y: number;
  m: number;
  d: number;
  /** 0 = Sunday, matching `Date.prototype.getUTCDay`. */
  dow: number;
}

export function fromSerial(serial: number): CivilDate {
  const dt = new Date(serial * 86_400_000);
  return {
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
    dow: dt.getUTCDay(),
  };
}

export function dayOf(abs: number): number {
  return Math.floor(abs / MIN_PER_DAY);
}

/** Minutes into the day, normalised so a negative absolute still reads 00:00+. */
export function minuteOfDay(abs: number): number {
  return ((Math.floor(abs) % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY;
}

/* -------------------------------------------------------------- show times */

export function doorsAt(show: Show): number {
  return show.date * MIN_PER_DAY + show.doors;
}

export function stageTimeAt(show: Show): number {
  return show.date * MIN_PER_DAY + show.start;
}

/**
 * When the night is over and the show stops selling. A club night that ends at
 * 03:00 ends on the FOLLOWING day, which is why an end time at or before the
 * stage time rolls over rather than landing in the past.
 */
export function endsAt(show: Show): number {
  const day = show.date2 ?? show.date;
  return (
    day * MIN_PER_DAY + show.end + (show.end <= show.start ? MIN_PER_DAY : 0)
  );
}

export function checkInOpensAt(show: Show): number {
  return doorsAt(show) - CHECK_IN_OPENS_BEFORE;
}

export type CheckInState = "before" | "open" | "after";

export function checkInState(show: Show, now: number): CheckInState {
  if (now < checkInOpensAt(show)) return "before";
  if (now >= endsAt(show)) return "after";
  return "open";
}

/** The next show whose doors are still ahead of `now` — what the dock jumps to. */
export function nextDoors(shows: Show[], now: number): Show | null {
  let best: Show | null = null;
  for (const show of shows) {
    const doors = doorsAt(show);
    if (doors <= now) continue;
    if (best === null || doors < doorsAt(best)) best = show;
  }
  return best;
}

/** Shows that have not finished yet, soonest first. */
export function upcoming(shows: Show[], now: number): Show[] {
  return shows
    .filter((s) => now < endsAt(s))
    .sort((a, b) => doorsAt(a) - doorsAt(b));
}

export function showById(shows: Show[], id: string): Show | null {
  return shows.find((s) => s.id === id) ?? null;
}

export function typeById(show: Show, ttId: string): TicketType | null {
  return show.types.find((t) => t.id === ttId) ?? null;
}

/* --------------------------------------------------------------- inventory */

/** Issued tickets for a show, or for one ticket type within it. */
export function soldCount(
  tickets: Ticket[],
  evId: string,
  ttId?: string,
): number {
  return tickets.filter(
    (t) => t.evId === evId && (ttId === undefined || t.tt === ttId),
  ).length;
}

/** Holds that have not run out yet. An expired hold is simply not counted. */
export function activeHolds(holds: Hold[], now: number): Hold[] {
  return holds.filter((h) => h.expiresAt > now);
}

export function heldCount(
  holds: Hold[],
  evId: string,
  ttId: string | undefined,
  now: number,
): number {
  let n = 0;
  for (const hold of activeHolds(holds, now)) {
    if (hold.evId !== evId) continue;
    for (const line of hold.lines) {
      if (ttId === undefined || line.tt === ttId) n += line.qty;
    }
  }
  return n;
}

export interface Inventory {
  capacity: number;
  sold: number;
  /** In somebody's cart right now — not sold, not available. */
  held: number;
  /** capacity − sold − held. Never negative; an oversell is a bug, not a view. */
  remaining: number;
}

export function inventory(
  show: Show,
  type: TicketType,
  tickets: Ticket[],
  holds: Hold[],
  now: number,
): Inventory {
  const sold = soldCount(tickets, show.id, type.id);
  const held = heldCount(holds, show.id, type.id, now);
  return {
    capacity: type.cap,
    sold,
    held,
    remaining: Math.max(0, type.cap - sold - held),
  };
}

/** The same four figures summed across every ticket type on the show. */
export function showInventory(
  show: Show,
  tickets: Ticket[],
  holds: Hold[],
  now: number,
): Inventory {
  return show.types.reduce<Inventory>(
    (acc, type) => {
      const inv = inventory(show, type, tickets, holds, now);
      return {
        capacity: acc.capacity + inv.capacity,
        sold: acc.sold + inv.sold,
        held: acc.held + inv.held,
        remaining: acc.remaining + inv.remaining,
      };
    },
    { capacity: 0, sold: 0, held: 0, remaining: 0 },
  );
}

export function saleStartOf(show: Show, type: TicketType): number {
  return type.saleStart ?? show.saleStart;
}

export type TypeSaleState = "notYetOnSale" | "onSale" | "soldOut" | "closed";

export function typeSaleState(
  show: Show,
  type: TicketType,
  tickets: Ticket[],
  holds: Hold[],
  now: number,
): TypeSaleState {
  if (now >= endsAt(show)) return "closed";
  if (now < saleStartOf(show, type)) return "notYetOnSale";
  if (inventory(show, type, tickets, holds, now).remaining <= 0) return "soldOut";
  return "onSale";
}

/**
 * The chip on a home-grid card. `notYetOnSale` carries the minute the sale
 * opens because the chip prints it — a status that says only "not yet" tells
 * a reader nothing they can act on.
 */
export type ShowStatus =
  | { kind: "notYetOnSale"; saleStart: number }
  | { kind: "onSale" }
  | { kind: "sellingFast"; remaining: number }
  | { kind: "soldOut" }
  | { kind: "doorsOpen" }
  | { kind: "wrapped" };

export function showStatus(
  show: Show,
  tickets: Ticket[],
  holds: Hold[],
  now: number,
): ShowStatus {
  if (now >= endsAt(show)) return { kind: "wrapped" };
  if (now >= doorsAt(show)) return { kind: "doorsOpen" };

  let allNotYet = true;
  let earliest = Number.POSITIVE_INFINITY;
  for (const type of show.types) {
    if (typeSaleState(show, type, tickets, holds, now) !== "notYetOnSale") {
      allNotYet = false;
    }
    earliest = Math.min(earliest, saleStartOf(show, type));
  }
  if (allNotYet) return { kind: "notYetOnSale", saleStart: earliest };

  const inv = showInventory(show, tickets, holds, now);
  if (inv.remaining <= 0) return { kind: "soldOut" };
  if (inv.remaining / inv.capacity < SELLING_FAST_BELOW) {
    return { kind: "sellingFast", remaining: inv.remaining };
  }
  return { kind: "onSale" };
}

/** The cheapest ticket type, in cents — the card's "from $22". */
export function fromPrice(show: Show): number {
  return show.types.reduce((min, t) => Math.min(min, t.price), Infinity);
}

/* ------------------------------------------------------------------- holds */

/**
 * Why a hold could not be created. A discriminated reason rather than a
 * sentence: the copy lives in the string bundles, so the engine stays
 * translatable without importing one.
 */
export type HoldRefusal =
  | { reason: "empty" }
  | { reason: "overCap"; ttId: string; max: number }
  | { reason: "notOnSale"; ttId: string }
  | { reason: "notEnough"; ttId: string; available: number };

export type HoldResult = { ok: true; hold: Hold } | ({ ok: false } & HoldRefusal);

/**
 * Start a cart hold against LIVE remaining counts, so two people reaching for
 * the last four Balcony tickets cannot both get them. The quantities are
 * checked in ticket-type order, and the first refusal wins — a partial hold
 * would silently give somebody fewer tickets than they asked for.
 */
export function createHold(
  show: Show,
  quantities: Record<string, number>,
  tickets: Ticket[],
  holds: Hold[],
  now: number,
  id: string,
): HoldResult {
  const lines: HoldLine[] = [];

  for (const type of show.types) {
    const qty = Math.trunc(quantities[type.id] ?? 0);
    if (qty <= 0) continue;
    if (qty > MAX_PER_TYPE) {
      return { ok: false, reason: "overCap", ttId: type.id, max: MAX_PER_TYPE };
    }
    if (typeSaleState(show, type, tickets, holds, now) !== "onSale") {
      return { ok: false, reason: "notOnSale", ttId: type.id };
    }
    const { remaining } = inventory(show, type, tickets, holds, now);
    if (qty > remaining) {
      return { ok: false, reason: "notEnough", ttId: type.id, available: remaining };
    }
    lines.push({ tt: type.id, qty });
  }

  if (lines.length === 0) return { ok: false, reason: "empty" };

  return {
    ok: true,
    hold: {
      id,
      evId: show.id,
      lines,
      startedAt: now,
      expiresAt: now + HOLD_MINUTES,
      mine: true,
    },
  };
}

/** Split a hold list at `now`. The caller decides what to say about the losses. */
export function expireHolds(
  holds: Hold[],
  now: number,
): { kept: Hold[]; expired: Hold[] } {
  const kept: Hold[] = [];
  const expired: Hold[] = [];
  for (const hold of holds) (hold.expiresAt > now ? kept : expired).push(hold);
  return { kept, expired };
}

export function holdQty(hold: Hold): number {
  return hold.lines.reduce((n, l) => n + l.qty, 0);
}

/** Integer cents. No service fee is added anywhere — that is the box office's line. */
export function holdTotal(hold: Hold, show: Show): number {
  return hold.lines.reduce((cents, line) => {
    const type = typeById(show, line.tt);
    return cents + (type === null ? 0 : type.price * line.qty);
  }, 0);
}

/** Whole seconds left on a hold, floored at zero so a countdown never goes negative. */
export function holdSecondsLeft(hold: Hold, now: number): number {
  return Math.max(0, Math.round((hold.expiresAt - now) * 60));
}

/* ------------------------------------------------------------------ orders */

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Order numbers are a running sequence: the seed ends WV-8814, so next is 8815. */
export function orderCode(seq: number): string {
  return `WV-${seq}`;
}

/** Per-ticket codes hang off the order code: WV-8815-01, -02, … */
export function ticketCode(order: string, index: number): string {
  return `${order}-${pad2(index + 1)}`;
}

export interface CheckoutResult {
  order: Order;
  tickets: Ticket[];
  nextSeq: number;
}

/**
 * Turn a hold into issued tickets. Attendee names are optional and positional:
 * a blank falls back to the buyer, which is why a lone buyer never has to type
 * their own name twice to get through checkout.
 */
export function checkoutOrder(
  hold: Hold,
  show: Show,
  buyer: Buyer,
  names: string[],
  seq: number,
  now: number,
): CheckoutResult {
  const code = orderCode(seq);
  const issued: Ticket[] = [];
  let index = 0;

  for (const line of hold.lines) {
    for (let q = 0; q < line.qty; q += 1) {
      const given = names[index]?.trim() ?? "";
      issued.push({
        code: ticketCode(code, index),
        evId: show.id,
        tt: line.tt,
        holder: given.length > 0 ? given : buyer.name,
        buyer: { ...buyer },
        orderCode: code,
        soldAt: Math.floor(now),
        checkedInAt: null,
      });
      index += 1;
    }
  }

  return {
    order: {
      code,
      evId: show.id,
      buyer: { ...buyer },
      placedAt: Math.floor(now),
      total: holdTotal(hold, show),
      tickets: issued.map((t) => t.code),
    },
    tickets: issued,
    nextSeq: seq + 1,
  };
}

/** Every ticket bought by one e-mail address, newest order first. */
export function ticketsForEmail(tickets: Ticket[], email: string): Ticket[] {
  const needle = email.trim().toLowerCase();
  if (needle.length === 0) return [];
  return tickets
    .filter((t) => t.buyer.email.toLowerCase() === needle)
    .sort((a, b) => b.soldAt - a.soldAt || a.code.localeCompare(b.code));
}

/* --------------------------------------------------------------- the door */

/**
 * A ticket counts as checked in only once the scan is in the PAST. The
 * distinction matters because the seed carries an early-entry line scanned at
 * 19:31–19:58: at the pinned 16:30 clock none of it has happened yet, and the
 * door counter must read zero until the dock advances past it.
 */
export function isCheckedIn(ticket: Ticket, now: number): boolean {
  return ticket.checkedInAt !== null && ticket.checkedInAt <= now;
}

/** Derived, never stored — the counter and the list can never disagree. */
export function doorCount(tickets: Ticket[], evId: string, now: number): number {
  return tickets.filter((t) => t.evId === evId && isCheckedIn(t, now)).length;
}

/** Who has come through, most recent first. */
export function recentCheckIns(
  tickets: Ticket[],
  evId: string,
  now: number,
  limit = 12,
): Ticket[] {
  return tickets
    .filter((t) => t.evId === evId && isCheckedIn(t, now))
    .sort((a, b) => (b.checkedInAt ?? 0) - (a.checkedInAt ?? 0))
    .slice(0, limit);
}

/**
 * What the scanner says. Four verdicts, four shapes: the door staff need
 * different facts in each case, and a single `{ok, message}` would force the
 * screen to re-derive them from a string.
 */
export type CheckInVerdict =
  | { kind: "empty" }
  | { kind: "checkedIn"; code: string; ttId: string; holder: string }
  | { kind: "alreadyCheckedIn"; code: string; holder: string; at: number }
  | { kind: "unknownCode"; code: string }
  | { kind: "wrongShow"; code: string; holder: string; evId: string };

/**
 * Pure: it returns a verdict and the caller applies it. Codes are normalised
 * the way a tired person types them at 20:04 — any case, stray spaces.
 */
export function checkInVerdict(
  raw: string,
  evId: string,
  tickets: Ticket[],
  now: number,
): CheckInVerdict {
  const code = String(raw ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (code.length === 0) return { kind: "empty" };

  const ticket = tickets.find((t) => t.code === code);
  if (ticket === undefined) return { kind: "unknownCode", code };
  if (ticket.evId !== evId) {
    return { kind: "wrongShow", code, holder: ticket.holder, evId: ticket.evId };
  }
  if (isCheckedIn(ticket, now)) {
    return {
      kind: "alreadyCheckedIn",
      code,
      holder: ticket.holder,
      /* The ORIGINAL scan, not this one — "already checked in at 19:39". */
      at: ticket.checkedInAt as number,
    };
  }
  return { kind: "checkedIn", code, ttId: ticket.tt, holder: ticket.holder };
}

/**
 * Four codes for the scanner's sample row, each chosen to demonstrate one
 * verdict. Picked from live state rather than hard-coded, so they keep
 * demonstrating the right thing after the demo has been played with.
 */
export interface DoorSamples {
  valid: string | null;
  duplicate: string | null;
  wrongShow: string | null;
  unknown: string;
}

export function doorSamples(
  tickets: Ticket[],
  evId: string,
  now: number,
): DoorSamples {
  let valid: string | null = null;
  let duplicate: string | null = null;
  let wrongShow: string | null = null;

  for (const ticket of tickets) {
    if (ticket.evId === evId) {
      if (valid === null && !isCheckedIn(ticket, now)) valid = ticket.code;
      if (duplicate === null && isCheckedIn(ticket, now)) duplicate = ticket.code;
    } else if (wrongShow === null) {
      wrongShow = ticket.code;
    }
  }

  /* Deliberately outside the minted range so it can never become real. */
  return { valid, duplicate, wrongShow, unknown: "WV-9999-01" };
}

/* ---------------------------------------------------------------- searches */

/** The attendee list, filtered by a plain substring over name, code and e-mail. */
export function searchAttendees(
  tickets: Ticket[],
  evId: string,
  query: string,
): Ticket[] {
  const q = query.trim().toLowerCase();
  const rows = tickets.filter((t) => t.evId === evId);
  const matched =
    q.length === 0
      ? rows
      : rows.filter(
          (t) =>
            t.holder.toLowerCase().includes(q) ||
            t.code.toLowerCase().includes(q) ||
            t.buyer.email.toLowerCase().includes(q),
        );
  return matched.sort((a, b) => a.holder.localeCompare(b.holder) || a.code.localeCompare(b.code));
}

/* ------------------------------------------------------------- sales pace */

export interface PacePoint {
  /** Day serial. */
  day: number;
  /** Tickets sold on that day. */
  sold: number;
  /** Running total from the first sale, so the line only ever climbs. */
  cumulative: number;
}

export interface Pace {
  points: PacePoint[];
  /** Tickets already sold before the window opened. */
  base: number;
  max: number;
}

/**
 * Cumulative sales across `[fromDay, toDay]`. Everything sold before the
 * window is folded into the starting value rather than dropped, so the chart
 * describes the show's whole run and not just the fortnight in view.
 */
export function salesPace(
  tickets: Ticket[],
  evId: string,
  fromDay: number,
  toDay: number,
): Pace {
  let base = 0;
  const perDay = new Map<number, number>();

  for (const ticket of tickets) {
    if (ticket.evId !== evId) continue;
    const day = dayOf(ticket.soldAt);
    if (day < fromDay) base += 1;
    else if (day <= toDay) perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }

  const points: PacePoint[] = [];
  let cumulative = base;
  for (let day = fromDay; day <= toDay; day += 1) {
    const sold = perDay.get(day) ?? 0;
    cumulative += sold;
    points.push({ day, sold, cumulative });
  }

  return { points, base, max: cumulative };
}

/* --------------------------------------------------- deterministic fiction */

/** FNV-1a. Small, fast, and stable across engines — which is the whole point. */
export function fnv1a(input: string): number {
  let h = 2_166_136_261 >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16_777_619) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32 — a seeded PRNG, so the seed builds identically on every machine. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export const QR_SIZE = 17;

/**
 * A fictional QR code: a 17×17 grid derived from the ticket code alone, with
 * finder squares in three corners so it reads as a QR at a glance. It encodes
 * nothing and no scanner will accept it — drawing a real one would mean
 * shipping a QR library to render a demo ticket that opens nothing.
 *
 * Deterministic by construction: the same code always produces the same
 * pattern, which is what makes a ticket recognisable when you come back to it.
 */
export function qrGrid(code: string): boolean[][] {
  const n = QR_SIZE;
  const rnd = mulberry32(fnv1a(String(code)));

  const inFinder = (x: number, y: number): boolean =>
    (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);

  const finderOn = (x: number, y: number): boolean => {
    const cx = x < 7 ? x : x - (n - 7);
    const cy = y < 7 ? y : y - (n - 7);
    const ring = cx === 0 || cx === 6 || cy === 0 || cy === 6;
    const core = cx >= 2 && cx <= 4 && cy >= 2 && cy <= 4;
    return ring || core;
  };

  const rows: boolean[][] = [];
  for (let y = 0; y < n; y += 1) {
    const row: boolean[] = [];
    for (let x = 0; x < n; x += 1) {
      /* The RNG is consumed for every cell, finder or not, so the pattern
       * outside the finders does not shift when the corners change size. */
      const bit = rnd() < 0.46;
      row.push(inFinder(x, y) ? finderOn(x, y) : bit);
    }
    rows.push(row);
  }
  return rows;
}
