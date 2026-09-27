/**
 * The sample's figures, worked out from its rows at a moment on the venue's
 * clock — what Adminium itself would count and sum over the same rows. The
 * figure tests pin them at 16:30 and 19:58 on Tuesday 28 July and at 16:30 on
 * Wednesday; the demo reads the same functions.
 *
 * Money is kept in cents, so every sum is exact.
 */
import { LEDGER, type Ledger, type LedgerOrder, type LedgerShow, type OrderStatus, type Stamp } from "./ledger.ts";

/** An order that counts its tickets as sold. */
export const SOLD_STATES: ReadonlySet<OrderStatus> = new Set(["door", "awaiting_transfer", "overdue", "no_charge", "paid"]);
/** An order that holds its tickets until its time runs out. */
export const HOLDING_STATES: ReadonlySet<OrderStatus> = new Set(["held", "offered"]);
/** A ticket someone may still use. */
export const LIVE_TICKET: ReadonlySet<string> = new Set(["valid", "offered", "refund_asked"]);

export const cents = (amount: number): number => Math.round(amount * 100);
export const dollars = (c: number): string => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** A wall-clock stamp moved by minutes (the venue's clock has no gaps in the sample's summer). */
export function plusMinutes(at: Stamp, minutes: number): Stamp {
  const [d, t] = at.split("T") as [string, string];
  const [y, m, day] = d.split("-").map(Number) as [number, number, number];
  const [h, mi] = t.split(":").map(Number) as [number, number];
  const moved = new Date(Date.UTC(y, m - 1, day, h, mi) + minutes * 60_000);
  return moved.toISOString().slice(0, 16);
}

export function show(ledger: Ledger, key: string): LedgerShow {
  const found = ledger.shows.find((s) => s.key === key);
  if (found === undefined) throw new Error(`no show "${key}"`);
  return found;
}

const roomCapacity = (ledger: Ledger, s: LedgerShow) => ledger.rooms.find((r) => r.key === s.room)!.capacity;
/** What a show may sell: its types' sizes, no more than the room less its guest places. */
export const sellLimit = (ledger: Ledger, s: LedgerShow) => roomCapacity(ledger, s) - s.guest_places;
export const capacity = (ledger: Ledger, s: LedgerShow) => Math.min(s.types.reduce((n, t) => n + t.cap, 0), sellLimit(ledger, s));

const liveTickets = (o: LedgerOrder) => o.tickets.filter((t) => LIVE_TICKET.has(t.status));
const due = (t: { price: number; discount: number }) => cents(t.price) - cents(t.discount);
const collected = (o: LedgerOrder, code: string) => o.collections.filter((c) => c.ticket === code).reduce((n, c) => n + cents(c.amount), 0);

export interface TypeFigures {
  name: string;
  cap: number;
  sold: number;
  held: number;
  left: number;
  paid: number;
  owed: number;
  nocharge: number;
}

export interface ShowFigures {
  types: Record<string, TypeFigures>;
  sold: number;
  held: number;
  capacity: number;
  left: number;
  received: number;
  refunded: number;
  owedDoor: number;
  owedDoorTickets: number;
  awaiting: number;
  awaitingOrders: number;
  overdueOrders: number;
  orders: number;
  buyers: number;
  byStatus: Partial<Record<OrderStatus, number>>;
}

/** A show's figures from its orders as they stand at `at`. */
export function figures(ledger: Ledger, key: string, at: Stamp, orders: readonly LedgerOrder[] = ledger.orders): ShowFigures {
  const s = show(ledger, key);
  const mine = orders.filter((o) => o.show === key);
  const types: Record<string, TypeFigures> = {};
  for (const t of s.types) {
    let sold = 0;
    let held = 0;
    let paid = 0;
    let owed = 0;
    let nocharge = 0;
    for (const o of mine) {
      if (o.placed > at) continue;
      const until = o.held_until ?? o.offer_until;
      for (const x of liveTickets(o)) {
        if (x.type !== t.key) continue;
        if (SOLD_STATES.has(o.status)) sold += 1;
        if (HOLDING_STATES.has(o.status) && until !== undefined && at < until) held += 1;
        const got = collected(o, x.code);
        if (o.status === "paid" || (SOLD_STATES.has(o.status) && got >= due(x) && due(x) > 0)) paid += 1;
        else if (o.status === "door") owed += 1;
        else if (o.status === "no_charge") nocharge += 1;
      }
    }
    types[t.key] = { name: t.name, cap: t.cap, sold, held, left: t.cap - sold - held, paid, owed, nocharge };
  }
  const sold = Object.values(types).reduce((n, t) => n + t.sold, 0);
  const held = Object.values(types).reduce((n, t) => n + t.held, 0);
  const cap = capacity(ledger, s);
  const doorOrders = mine.filter((o) => o.status === "door");
  const waiting = mine.filter((o) => o.status === "awaiting_transfer" || o.status === "overdue");
  const live = mine.filter((o) => SOLD_STATES.has(o.status));
  const byStatus: Partial<Record<OrderStatus, number>> = {};
  for (const o of mine) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
  return {
    types,
    sold,
    held,
    capacity: cap,
    left: cap - sold - held,
    received: mine.reduce((n, o) => n + o.payments.reduce((m, p) => m + cents(p.amount), 0) + o.collections.reduce((m, c) => m + cents(c.amount), 0), 0),
    refunded: mine.reduce((n, o) => n + o.refunds.reduce((m, r) => m + cents(r.amount), 0), 0),
    owedDoor: doorOrders.reduce((n, o) => n + liveTickets(o).reduce((m, x) => m + due(x) - collected(o, x.code), 0), 0),
    owedDoorTickets: doorOrders.reduce((n, o) => n + liveTickets(o).filter((x) => due(x) > collected(o, x.code)).length, 0),
    awaiting: waiting.reduce((n, o) => n + liveTickets(o).reduce((m, x) => m + due(x), 0), 0),
    awaitingOrders: waiting.length,
    overdueOrders: waiting.filter((o) => o.status === "overdue").length,
    orders: live.length,
    buyers: new Set(live.map((o) => o.email).filter((e) => e !== undefined)).size,
    byStatus,
  };
}

/** A show's people and orders a message to its buyers would go to (one email per order). */
export function audience(ledger: Ledger, key: string, at: Stamp): { people: number; orders: number } {
  const s = show(ledger, key);
  const mine = ledger.orders.filter((o) => o.show === key && o.placed <= at && o.email !== undefined);
  const counted =
    s.cancelled_at !== undefined && at >= s.cancelled_at
      ? mine.filter((o) => o.status === "cancelled")
      : mine.filter((o) => SOLD_STATES.has(o.status) || (o.status === "cancelled" && (o.cancelled_at ?? "9999") > at));
  return { people: new Set(counted.map((o) => o.email)).size, orders: counted.length };
}

/** The last moment of a show: its curfew. */
const lastCurfew = (s: LedgerShow) => s.curfew;

/**
 * The orders as the clock leaves them at `to`: every move the clock makes on
 * its own, in time order — a checkout or an offer runs out, an unpaid
 * transfer is overdue at its deadline and released after the grace hours, a
 * pay-at-the-door order nobody collected is marked when the show ends.
 */
export function advance(ledger: Ledger, to: Stamp): LedgerOrder[] {
  const grace = ledger.venue.release_after_hours * 60;
  return ledger.orders.map((o) => {
    const s = show(ledger, o.show);
    let status = o.status;
    if (status === "held" && o.held_until !== undefined && o.held_until <= to) status = "expired";
    if (status === "offered" && o.offer_until !== undefined && o.offer_until <= to) status = "expired";
    if (status === "awaiting_transfer" && o.pay_by !== undefined && o.pay_by <= to) status = "overdue";
    if (status === "overdue" && o.pay_by !== undefined && plusMinutes(o.pay_by, grace) <= to) status = "released";
    if (status === "door" && lastCurfew(s) <= to && liveTickets(o).some((x) => due(x) > collected(o, x.code))) status = "not_collected";
    return status === o.status ? o : { ...o, status };
  });
}

export { LEDGER };
