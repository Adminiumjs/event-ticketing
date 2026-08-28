// SPDX-License-Identifier: AGPL-3.0-only
/**
 * A `DataSource` backed by a real Adminium instance (28-public-surface.md §5.2,
 * 28-T28 wave 2).
 *
 * ── READS DO NOT BECOME ASYNC ──────────────────────────────────────────────
 * `loadSnapshot` fetches the whole read-set once, before React mounts, and
 * hands back the same SYNCHRONOUS shapes `demoSource` returns — so the store,
 * the ticket engine and every screen are untouched. Making `DataSource` return
 * promises would touch all of them, and that is the cost the seam's own header
 * hides.
 *
 * ── THIS ONE PAGES, AND THE EARLIER THREE DO NOT ───────────────────────────
 * clinic-desk, hotel-reservations and factory-ops each read their whole set in
 * one request with a generous `limit`. That works only while the set is small.
 * This venue seeds 684 orders and 1,011 tickets, and a scope's per-ref `limit`
 * is the OPERATOR's number, not the app's — so a single-shot read here silently
 * returns the first page and the door scanner rejects everybody whose ticket
 * fell off the end. `listAll` pages at whatever size the scope permits. The
 * other three repos want the same treatment before their tenants grow.
 *
 * ── THE ID SPACE, AND WHERE IT HOLDS ───────────────────────────────────────
 * `events.slug` and `orders.number` and `tickets.code` are TEXT keys carrying
 * the app's own identifiers, so shows, orders and tickets pass straight
 * through. `ticket_types` is a `serial` with no slug, so a type is addressed by
 * its row id stringified — the people-ops pattern. That is INTERNALLY
 * consistent (every reference to a type is a foreign key to the same table) and
 * it is why no migration is needed to make this app work; what it costs is
 * that a type's identity is not portable between deployments.
 *
 * ── OPERATOR TEXT SURVIVES BECAUSE `label()` FALLS BACK TO ITS ARGUMENT ────
 * The seed stores i18n KEYS in translatable fields and `lib/format.ts`'s
 * `label()` resolves them with `tOr(key, key)`. A value that is not a key
 * therefore renders literally — which is exactly what a tenant's own room name
 * or show description should do. So every mapping below passes the row's own
 * text where the seed passed a key, and the operator's words win.
 *
 * ── TIME IS THE VENUE'S, NEVER THE READER'S ────────────────────────────────
 * The app's clock is an absolute minute anchored to UTC and every formatter
 * forces `timeZone: "UTC"` — deliberately, so that a reader in Auckland sees
 * the venue's 20:00 doors as 20:00. Connected mode preserves that by converting
 * each instant into the TENANT's wall clock first (`toTenantDay` /
 * `toTenantMinutes`) and then anchoring it. `new Date(x).getHours()` here would
 * put a London night on a Sydney visitor's tomorrow.
 *
 * ── WHAT THE SCHEMA CANNOT SAY (WS-I gaps, marked not hidden) ──────────────
 * G-1 `events` has no "kind of night" column, so the kicker under every show
 *     name is empty. The seed calls it `data.sub.club` / `.acoustic` /
 *     `.release`; the database has nowhere to put that, and guessing one would
 *     print "club night" over an acoustic evening.
 * G-2 `events` has no `ends_at`. Every night is therefore assumed to run
 *     `NIGHT_MINUTES` past its stage time, which decides when the show stops
 *     selling, when the chip flips to "wrapped" and when the door closes. A
 *     night that runs longer closes early, visibly, on the door screen.
 * G-3 There is no second date, so the festival's two-day span collapses to one.
 * G-4 There is no icon, art or chip column. `events.image` is read as the
 *     Lucide icon name because it is the only column of that shape; the art
 *     tints are derived from the slug so a card is stably coloured, and the
 *     chip is built from the room's initials and the date. All three are
 *     PRESENTATION defaults, not data — an operator cannot change them.
 * G-5 There is no `holds` table, and the seed says so ("cart holds are absent
 *     on purpose"). Connected mode therefore has no held inventory: remaining
 *     counts are capacity minus issued, which is correct until this deployment
 *     grows a real cart.
 * G-6 `promo_codes` exists and nothing reads it, here or in the box office.
 */

import {
  createPublicClient,
  toTenantDay,
  toTenantMinutes,
  type PublicClient,
} from "@adminiumjs/public-client";

import { MIN_PER_DAY, daySerial, fnv1a } from "../lib/tickets.ts";
import type { Buyer, Hold, Order, Show, Ticket, TicketType } from "./types.ts";
import type { SnapshotPort } from "./snapshotPort.ts";
import type { DataSource } from "./source.ts";

/* --------------------------------------------------------------- the wire */

interface WireVenue {
  id: number;
  name: string;
}

interface WireEvent {
  id: number;
  slug: string;
  venue_id: number;
  name: string;
  description: string;
  starts_at: string;
  doors_at: string;
  image: string;
  status: string;
}

interface WireTicketType {
  id: number;
  event_id: number;
  name: string;
  /** `numeric` serializes as a STRING, not a number. */
  price: string;
  capacity: number;
  sales_start: string | null;
  position: number;
}

interface WireOrder {
  id: number;
  number: string;
  buyer_name: string;
  email: string;
  total: string;
  status: string;
  placed_at: string;
}

interface WireTicket {
  id: number;
  code: string;
  order_id: number;
  ticket_type_id: number;
  attendee_name: string | null;
  status: string;
  checked_in_at: string | null;
}

/**
 * WS-I G-2 — how long a night runs, which `db/schema.sql` has nowhere to put.
 * Three hours past the stage time is the seed's median, not a fact about any
 * particular venue, and it is the single rule applied to every row so the
 * behaviour is predictable rather than per-show surprising.
 */
const NIGHT_MINUTES = 180;

/** The six art gradients `styles/tokens.css` defines. WS-I G-4. */
const ART: readonly (readonly [string, string])[] = [
  ["--art-a1", "--art-a2"],
  ["--art-b1", "--art-b2"],
  ["--art-c1", "--art-c2"],
  ["--art-d1", "--art-d2"],
  ["--art-e1", "--art-e2"],
  ["--art-f1", "--art-f2"],
];

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/**
 * The columns the scope must expose, checked at boot.
 *
 * Fail with a legible message naming the missing column rather than at render
 * with a 403 on a screen nobody was looking at — an operator can narrow a scope
 * at any time, and this turns that into a startup error.
 *
 * `order_items` and `promo_codes` are deliberately absent: the app derives what
 * an order was for from the tickets it issued, so asking for the line items
 * would widen the scope for nothing.
 */
export const REQUIRED = {
  venues: ["id", "name"],
  events: ["id", "slug", "venue_id", "name", "description", "starts_at", "doors_at", "image", "status"],
  ticketTypes: ["id", "event_id", "name", "price", "capacity", "sales_start", "position"],
  orders: ["id", "number", "buyer_name", "email", "total", "status", "placed_at"],
  tickets: ["id", "code", "order_id", "ticket_type_id", "attendee_name", "status", "checked_in_at"],
};

let lastSnapshotError: Error | null = null;

/** Why the last {@link loadSnapshot} returned null, or null if it did not. */
export function snapshotFailure(): Error | null {
  return lastSnapshotError;
}

export interface Snapshot {
  /** The tenant\'s ISO-4217 code, or null (28-T34). Drives every formatter. */
  currency: string | null;
  /** The zone the serials below were computed in. */
  timezone: string;
  /**
   * Who chose {@link timezone}. Carried so the UI can SAY which zone these
   * dates are in when nobody confirmed it — the field exists precisely because
   * both an unconfirmed zone and a UTC substitute are silent otherwise (a
   * console line is not an operator surface).
   */
  timezoneSource: 'operator' | 'host' | 'fallback' | null;
  shows: Show[];
  tickets: Ticket[];
  orders: Order[];
  nextSeq: number;
  now: number;
  featured: string | null;
}

/**
 * The client, or null when either build-time variable is absent.
 *
 * The emptiness check is `createPublicClient`'s, not repeated here: it already
 * treats a missing or empty value as "this build has no server", and a second
 * copy of that rule is a second place for it to drift.
 */
export function clientFromEnv(): PublicClient | null {
  return createPublicClient({
    baseUrl: import.meta.env.VITE_ADMINIUM_API_BASE_URL,
    publishableKey: import.meta.env.VITE_ADMINIUM_PUBLISHABLE_KEY,
  });
}

/**
 * Read a whole ref, a page at a time.
 *
 * The page size is the SCOPE's — `refs[ref].limit` is the operator's ceiling
 * and asking for more than it allows is refused. `max` is this app's own guard
 * against a runaway read; hitting it is reported rather than silently dropping
 * the tail, because a truncated ticket list is a door that turns people away.
 */
async function listAll<T>(
  client: SnapshotPort,
  ref: string,
  size: number,
  max: number,
): Promise<T[]> {
  const out: T[] = [];
  const page = Math.max(1, Math.min(size, 500));
  for (let offset = 0; offset < max; offset += page) {
    const res = await client.list<T>(ref, { limit: page, offset });
    out.push(...res.data);
    if (res.data.length < page) return out;
  }
  console.warn(`[adminium] ${ref}: stopped at ${String(max)} rows — the rest were not read.`);
  return out;
}

/** An API instant as the app's absolute minute, in the VENUE's timezone. */
function absMinute(iso: string, timezone: string): number {
  return dayOf(iso, timezone) * MIN_PER_DAY + toTenantMinutes(iso, timezone);
}

/** An API instant as the app's day serial, in the VENUE's timezone. */
function dayOf(iso: string, timezone: string): number {
  const parts = toTenantDay(iso, timezone).split("-");
  return daySerial(Number(parts[0]), Number(parts[1]), Number(parts[2]));
}

/**
 * Fetch the read-set and map it into the app's shapes.
 *
 * Returns `null` on ANY failure so the caller falls back to demo mode
 * structurally rather than in a catch — the marketplace demos are static clones
 * with no server and must keep working byte-identically.
 */
export async function loadSnapshot(client: SnapshotPort): Promise<Snapshot | null> {
  try {
    await client.assertRefs(REQUIRED);
    const config = await client.config();
    const tz = config.timezone;
    const cap = (ref: string): number => config.refs[ref]?.limit ?? 100;

    const [venues, events, types, orders, tickets] = await Promise.all([
      listAll<WireVenue>(client, "venues", cap("venues"), 500),
      listAll<WireEvent>(client, "events", cap("events"), 2_000),
      listAll<WireTicketType>(client, "ticketTypes", cap("ticketTypes"), 5_000),
      listAll<WireOrder>(client, "orders", cap("orders"), 20_000),
      listAll<WireTicket>(client, "tickets", cap("tickets"), 50_000),
    ]);

    const roomOf = new Map(venues.map((v) => [v.id, v.name]));

    /* Types first: a show's card, its inventory and every ticket all address
     * one, so a type whose event is missing is dropped rather than orphaned. */
    const typesByEvent = new Map<number, WireTicketType[]>();
    for (const row of types) {
      const list = typesByEvent.get(row.event_id) ?? [];
      list.push(row);
      typesByEvent.set(row.event_id, list);
    }

    const slugOfEvent = new Map<number, string>();
    const shows: Show[] = [];
    for (const row of events) {
      const own = (typesByEvent.get(row.id) ?? []).sort((a, b) => a.position - b.position);
      const start = absMinute(row.starts_at, tz);
      const doors = absMinute(row.doors_at, tz);
      const date = dayOf(row.starts_at, tz);
      const room = roomOf.get(row.venue_id) ?? "";

      const mapped: TicketType[] = own.map((t) => {
        const type: TicketType = {
          id: String(t.id),
          // The row's own words. `label()` falls back to its argument, so
          // operator text renders literally where the seed rendered a key.
          name: t.name,
          // WS-I: `ticket_types` has no note column. An empty note renders
          // nothing rather than a stale sentence about somebody else's show.
          note: "",
          price: Math.round(Number(t.price) * 100),
          cap: t.capacity,
        };
        if (t.sales_start !== null) type.saleStart = absMinute(t.sales_start, tz);
        return type;
      });

      slugOfEvent.set(row.id, row.slug);
      shows.push({
        id: row.slug,
        name: row.name,
        // WS-I G-1: no column for the kind of night.
        sub: "",
        room,
        date,
        doors: doors - date * MIN_PER_DAY,
        start: start - date * MIN_PER_DAY,
        // WS-I G-2: no `ends_at`; one rule for every row, stated in the header.
        end: (start - date * MIN_PER_DAY + NIGHT_MINUTES) % MIN_PER_DAY,
        /* A show-level on-sale has no column either, so it is DERIVED from the
         * earliest window its own types declare — which is what the schema
         * already means by a NULL start ("on sale as soon as the night is").
         * `saleStartOf` reads this only when a type has none of its own. */
        saleStart: earliestSale(mapped),
        // WS-I G-4: `image` is the only column of this shape.
        icon: row.image.length > 0 ? row.image : "music",
        art: artFor(row.slug),
        chip: chipFor(room, date),
        // The operator's own description, rendered literally by `label()`.
        desc: row.description,
        /* WS-I: there is no lineup table. The seed carries act names as proper
         * nouns; a connected venue has nowhere to put them, so the lineup list
         * is empty rather than a repeat of the show's own name. */
        lineup: [],
        types: mapped,
      });
    }

    const eventOfType = new Map<number, number>(types.map((t) => [t.id, t.event_id]));
    const orderById = new Map<number, WireOrder>(orders.map((o) => [o.id, o]));

    /* A `void` ticket is refunded or revoked: it is not an admission and the
     * app has no state for one, so it is DROPPED rather than shown as valid. */
    const live = tickets.filter((t) => t.status !== "void");

    const mappedTickets: Ticket[] = [];
    const codesByOrder = new Map<number, string[]>();
    const eventByOrder = new Map<number, string>();
    for (const row of live) {
      const order = orderById.get(row.order_id);
      const eventId = eventOfType.get(row.ticket_type_id);
      const slug = eventId === undefined ? undefined : slugOfEvent.get(eventId);
      // A ticket whose order or show did not come back cannot be rendered on
      // any screen this app has. Dropped, not guessed at.
      if (order === undefined || slug === undefined) continue;

      const buyer: Buyer = { name: order.buyer_name, email: order.email };
      mappedTickets.push({
        code: row.code,
        evId: slug,
        tt: String(row.ticket_type_id),
        holder: row.attendee_name ?? order.buyer_name,
        buyer,
        orderCode: order.number,
        soldAt: absMinute(order.placed_at, tz),
        checkedInAt: row.checked_in_at === null ? null : absMinute(row.checked_in_at, tz),
      });

      const codes = codesByOrder.get(order.id) ?? [];
      codes.push(row.code);
      codesByOrder.set(order.id, codes);
      eventByOrder.set(order.id, slug);
    }

    const mappedOrders: Order[] = [];
    for (const row of orders) {
      const slug = eventByOrder.get(row.id);
      /* `pending` is an unpaid cart and `cancelled` is a refund: neither is a
       * purchase the wallet should show. An order with no live tickets has no
       * show to belong to, so it is dropped for the same reason. */
      if (row.status !== "paid" || slug === undefined) continue;
      mappedOrders.push({
        code: row.number,
        evId: slug,
        buyer: { name: row.buyer_name, email: row.email },
        placedAt: absMinute(row.placed_at, tz),
        total: Math.round(Number(row.total) * 100),
        tickets: codesByOrder.get(row.id) ?? [],
      });
    }

    const nowIso = new Date().toISOString();
    const now = absMinute(nowIso, tz);

    return {
      currency: config.currency,
      timezone: tz,
      // Absent on the public path (the API always carries a real zone on its
      // scope), and absent means no claim — never a guess.
      timezoneSource: config.timezoneSource ?? null,
      shows,
      tickets: mappedTickets,
      orders: mappedOrders,
      nextSeq: nextSeqFrom(orders),
      now,
      featured: featuredOf(shows, now),
    };
  } catch (error) {
    /* The reason is REPORTED, not swallowed: a non-demo build hard-stops now,
       so "using demo data" stopped being true and the caller was left showing a
       generic failure while the real cause sat in the console. */
    lastSnapshotError = error instanceof Error ? error : new Error(String(error));
    console.warn("[adminium] could not load a snapshot:", error);
    return null;
  }
}

/**
 * The earliest window any of a night's types declares, or zero.
 *
 * Zero rather than the stage time: the schema says a NULL `sales_start` means
 * "on sale as soon as the night is", and a night that exists is a night that
 * sells. Anchoring it to the show instead would make every type with no window
 * of its own read as "not yet on sale" right up to the doors.
 */
function earliestSale(types: readonly TicketType[]): number {
  let earliest = Number.POSITIVE_INFINITY;
  for (const type of types) {
    if (type.saleStart !== undefined) earliest = Math.min(earliest, type.saleStart);
  }
  return earliest === Number.POSITIVE_INFINITY ? 0 : earliest;
}

/** Stable per slug, so adding a show never recolours the ones beside it. */
function artFor(slug: string): [string, string] {
  const pair = ART[fnv1a(slug) % ART.length] ?? ART[0];
  return [(pair as readonly [string, string])[0], (pair as readonly [string, string])[1]];
}

/** "Main Hall" + 28 Jul → "MH·JUL28". WS-I G-4: presentation, not data. */
function chipFor(room: string, date: number): string {
  const initials = room
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => (w[0] ?? "").toUpperCase())
    .join("")
    .slice(0, 3);
  const dt = new Date(date * 86_400_000);
  const month = MONTHS[dt.getUTCMonth()] ?? "";
  return `${initials}·${month}${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/**
 * The next box-office number, read off the highest one already issued.
 *
 * The app mints `WV-8815` by incrementing a sequence; a connected deployment
 * has to continue the tenant's own, whatever prefix they use. Anything that
 * does not end in digits is ignored rather than parsed into `NaN`.
 */
function nextSeqFrom(orders: readonly WireOrder[]): number {
  let highest = 0;
  for (const row of orders) {
    const match = /(\d+)$/.exec(row.number);
    if (match !== null) highest = Math.max(highest, Number(match[1]));
  }
  return highest + 1;
}

/**
 * The show the site opens on: the next one whose doors have not opened, else
 * the most recent.
 *
 * The seed pins this to `"neon"`. A connected build that kept that would open
 * on a show no tenant has, and the router would land on the not-found screen
 * for every visitor — which is the kind of failure that looks like a routing
 * bug for a day.
 */
function featuredOf(shows: readonly Show[], now: number): string | null {
  let next: Show | null = null;
  let last: Show | null = null;
  for (const show of shows) {
    const doors = show.date * MIN_PER_DAY + show.doors;
    if (doors > now) {
      if (next === null || doors < next.date * MIN_PER_DAY + next.doors) next = show;
    } else if (last === null || doors > last.date * MIN_PER_DAY + last.doors) {
      last = show;
    }
  }
  return (next ?? last)?.id ?? null;
}

/** A synchronous `DataSource` over an already-fetched snapshot. */
export function snapshotSource(snap: Snapshot): DataSource {
  return {
    shows: () =>
      snap.shows.map((s) => ({
        ...s,
        art: [s.art[0], s.art[1]],
        lineup: [...s.lineup],
        types: s.types.map((t) => ({ ...t })),
      })),
    tickets: () => snap.tickets.map((t) => ({ ...t, buyer: { ...t.buyer } })),
    orders: () =>
      snap.orders.map((o) => ({ ...o, buyer: { ...o.buyer }, tickets: [...o.tickets] })),
    // WS-I G-5: no holds table. Nothing is held, so nothing is subtracted.
    holds: (): Hold[] => [],
    nextOrderSeq: () => snap.nextSeq,
    now: () => snap.now,
    featured: () => snap.featured,
    // Never on a connected build: see the seam's own note.
    exampleBuyer: () => null,
  };
}
