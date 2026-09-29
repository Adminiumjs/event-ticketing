/**
 * The demo's three doors — the audience site's, the box office's and the
 * door's — played against the demo's Adminium, with the same calls, answers
 * and refusals as the real APIs (`src/data/ports.ts`). Each keeps to what its
 * key or role may do: the audience never moves a checkout on to waiting for
 * a transfer (only the emailed confirm link does), the door records no
 * payment of another kind.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import { broadcastKind } from "../data/messageKinds.ts";
import type { AudiencePort, BankDoor, BoxOfficePort, DoorPort, EventChildren, OrderWithTickets, Person, StaffPerson, Venue } from "../data/ports.ts";
import { cancelShowOrders, offerPlan, recipientKey } from "../data/boxSteps.ts";
import { ApiError, type ClaimReply, type Config, type HistoryEntry, type Id, type ListQuery, type ListReply, type OrderBody, type OrderReply, type PoolCount, type QuoteReply, type Row, type TypeLeft, type Where } from "../data/wire.ts";
import { toMs } from "../lib/venueTime.ts";
import { normalizeCode, randomCode } from "./codes.ts";
import { holds, type Engine, type Writer } from "./engine.ts";
import type { Table } from "./world.ts";
import { MANIFEST_RULES } from "./rules.ts";

type Withhold = { columns: string[]; unlessHolder?: string; when: { where: Parameters<typeof holds>[1][] } };
type Entry = {
  table: string;
  key?: string;
  kind?: string;
  level?: string;
  methods: string[];
  select?: string[];
  filters?: { column: string }[];
  claim?: unknown;
  claimedBy?: unknown;
  visibleWith?: unknown;
  unlockBy?: unknown;
  withhold?: Withhold;
  writable?: string[];
  writableValues?: Record<string, unknown[]>;
  writableWhen?: Record<string, unknown>;
  defaults?: Record<string, unknown>;
  children?: Record<string, { select?: string[] }>;
};
const ENTRIES = MANIFEST_RULES.publicAccess as unknown as Entry[];
/** The manifest's own public entry, found as a test finds it: the demo reads and writes through it, as the server does. */
function entry(what: string, find: (e: Entry) => boolean): Entry {
  const found = ENTRIES.find(find);
  if (found === undefined) throw new Error(`the manifest has no public entry for ${what}`);
  return found;
}
const moves = (e: Entry, to: string) => (e.writableValues?.["status"] ?? []).includes(to);
const plain = (e: Entry) => e.key === undefined && e.level === undefined && e.claim === undefined && e.claimedBy === undefined && e.visibleWith === undefined && e.kind === undefined && e.unlockBy === undefined;
const mineOf = (e: Entry) => e.key === undefined && e.table === "tickets" && e.visibleWith !== undefined;
/** What each read shows: its entry's own select, nothing more. */
const READ = {
  settings: entry("the venue", (e) => e.table === "settings" && plain(e)),
  bank: entry("the bank details", (e) => e.table === "settings" && e.key === undefined && e.level === "verified"),
  rooms: entry("the rooms", (e) => e.table === "rooms" && plain(e)),
  events: entry("the shows", (e) => e.table === "events" && plain(e)),
  days: entry("the days", (e) => e.table === "event_days" && plain(e)),
  acts: entry("the acts", (e) => e.table === "acts" && !(e.filters ?? []).some((f) => f.column === "sets_published")),
  actTimes: entry("the set times", (e) => e.table === "acts" && (e.filters ?? []).some((f) => f.column === "sets_published")),
  types: entry("the ticket types", (e) => e.table === "ticket_types" && plain(e)),
  codeTypes: entry("a code's ticket types", (e) => e.table === "ticket_types" && e.unlockBy !== undefined),
  questions: entry("the questions", (e) => e.table === "questions" && plain(e)),
  buy: entry("buying", (e) => e.table === "orders" && e.methods.includes("POST")),
  join: entry("joining a waitlist", (e) => e.table === "waitlist" && e.methods.includes("POST")),
  remind: entry("a reminder", (e) => e.table === "reminders" && e.methods.includes("POST")),
  myOrders: entry("a person's orders", (e) => e.table === "orders" && e.key === undefined && e.claimedBy !== undefined && e.methods.includes("GET")),
  linkOrder: entry("an order's own link", (e) => e.table === "orders" && e.key === "link"),
  confirmOrder: entry("the confirm link", (e) => e.table === "orders" && e.key === "confirm"),
  tickets: entry("an order's tickets", (e) => mineOf(e) && e.methods.includes("GET")),
  held: entry("a friend's tickets they hold", (e) => e.table === "tickets" && e.key === undefined && e.claimedBy !== undefined),
  waitlist: entry("a person's waitlist places", (e) => e.table === "waitlist" && e.key === undefined && e.methods.includes("GET")),
  ticket: entry("a ticket's own link", (e) => e.table === "tickets" && e.key === "ticket"),
};
/** Each change a buyer makes to a ticket: the entry whose rules judge it. */
const CHANGE = {
  send: entry("sending a ticket", (e) => mineOf(e) && moves(e, "offered")),
  refund: entry("a refund asked", (e) => mineOf(e) && moves(e, "refund_asked")),
  // A place handed to the waitlist: part of an offer not wanted, or a buyer's cancel on a show that keeps one.
  names: entry("the names", (e) => mineOf(e) && (e.writable ?? []).includes("holder_name")),
  cancel: entry("a cancel", (e) => mineOf(e) && moves(e, "cancelled")),
  toWaitlist: entry("a cancel on a waitlist show", (e) => mineOf(e) && moves(e, "returned") && (e.writableWhen?.["waitlist_on"] as unknown[] | undefined)?.includes(true) === true),
};
/** A row as an entry shows it: its own columns only. */
const shown = (row: Row, e: Entry): Row => {
  const out: Row = { id: row.id };
  for (const column of e.select ?? []) out[column] = row[column] ?? null;
  return out;
};
/** The rows a linked time is read from (a ticket's show, for its doors). */
const LINKED: Record<string, Table> = { event_id: "events", order_id: "orders" };
/** A value an entry's rule names, as the database compares it: a number with a number, "no value" with null. */
const same = (value: unknown, v: unknown): boolean => {
  if (v === null) return value === null || value === undefined;
  if (typeof v === "boolean") return value === v || value === (v ? 1 : 0);
  if (typeof v === "number") return value !== null && value !== undefined && value !== "" && Number(value) === v;
  return value === v;
};

const copy = (row: Row): Row => ({ ...row });
const LIVE_ORDER = ["door", "awaiting_transfer", "overdue", "no_charge", "paid"];
/** The orders a signed-in person sees: every one that was ever confirmed, and an offer made to them. */
const LIVE_OR_PAST = [...LIVE_ORDER, "offered", "released", "cancelled", "not_collected"];
/** A small stable hash (the demo's emailed codes). */
const hashOf = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** Whether a row meets one condition of a staff read. */
export function meets(row: Row, w: Where): boolean {
  const value = row[w.column];
  const num = (x: unknown) => (typeof x === "number" ? x : typeof x === "string" && x !== "" && !Number.isNaN(Number(x)) ? Number(x) : x);
  const cmp = (bound: number | string) => {
    const a = num(value);
    const b = num(bound);
    return typeof a === "number" && typeof b === "number" ? a - b : String(value ?? "").localeCompare(String(bound));
  };
  if (w.isNull !== undefined && (value === null || value === undefined) !== w.isNull) return false;
  if (w.eq !== undefined && !(value === w.eq || (typeof w.eq === "boolean" && value === (w.eq ? 1 : 0)))) return false;
  if (w.in !== undefined && !w.in.includes(value as never)) return false;
  if (w.gte !== undefined && (value === null || value === undefined || cmp(w.gte) < 0)) return false;
  if (w.lte !== undefined && (value === null || value === undefined || cmp(w.lte) > 0)) return false;
  if (w.gt !== undefined && (value === null || value === undefined || cmp(w.gt) <= 0)) return false;
  if (w.lt !== undefined && (value === null || value === undefined || cmp(w.lt) >= 0)) return false;
  if (w.like !== undefined && !String(value ?? "").toLowerCase().includes(w.like.toLowerCase())) return false;
  return true;
}

/** The staff's hand in a change the server makes itself (a forget's renewed links). */
const SERVER: Writer = { origin: "staff", name: null, roles: [] };

/** A buyer found by the address typed, or made (and never told which). */
function identity(engine: Engine, email: string, name: string | null): Id {
  const found = engine.world.all("customers").find((c) => c["email"] === email.trim().toLowerCase());
  if (found !== undefined) return found.id;
  return engine.world.insert("customers", { email: email.trim().toLowerCase(), name, opt_in: false, forgotten_at: null, created_at: new Date(engine.now).toISOString() }).id;
}

/** A public write's unique refusal, as the public door answers it: a bare refusal (nobody learns an address is on a list). */
function masked<T>(run: () => T): T {
  try {
    return run();
  } catch (error) {
    if (error instanceof ApiError && error.code === "UNIQUE_VIOLATION") throw new ApiError(400, "PUBLIC_WRITE_REFUSED");
    throw error;
  }
}

export class DemoAudience implements AudiencePort {
  private readonly engine: Engine;
  private readonly writer: Writer = { origin: "public", name: null, roles: [] };
  /** The order this browser's link opened. */
  private openedOrder: Id | null = null;
  /** The order this browser's confirm link opened. */
  private openedConfirm: Id | null = null;
  private clientKeys = new Map<string, Id>();
  /** Who this browser is signed in as, and since when. */
  private signed: { customer: Id; at: number } | null = null;
  /** The sign-in links and codes the demo "emailed", by address. */
  readonly mail = new Map<string, { code: string; token: string; until: number; tries: number }>();
  /** The demo card's one-shot faults: the next sign-in email fails, or the next person check does. */
  failNext: "mail-down" | "too-many" | "check" | null = null;

  constructor(engine: Engine) {
    this.engine = engine;
  }

  async config(): Promise<Config> {
    return { timezone: this.engine.world.zone, currency: this.engine.world.currency, now: new Date(this.engine.now).toISOString() };
  }

  async venue(): Promise<Venue> {
    const w = this.engine.world;
    const published = w.where("events", (e) => e["status"] === "published" || e["status"] === "cancelled");
    const ids = new Set(published.map((e) => e.id));
    // Each read as its own entry shows it (the bank details are not the venue's public face).
    return {
      settings: shown(w.all("settings")[0]!, READ.settings),
      rooms: w.all("rooms").map((r) => shown(r, READ.rooms)),
      events: published.map((e) => shown(e, READ.events)),
      days: w.where("event_days", (d) => ids.has(d["event_id"] as Id)).map((d) => shown(d, READ.days)),
      // Set times only once the show's are up.
      acts: w
        .where("acts", (a) => ids.has(a["event_id"] as Id))
        .map((a) => {
          const timed = w.get("events", a["event_id"] as Id)?.["sets_published"] === true;
          return { ...shown(a, timed ? READ.actTimes : READ.acts), starts_at: timed ? (a["starts_at"] ?? null) : null, ends_at: timed ? (a["ends_at"] ?? null) : null, sets_published: timed };
        }),
      types: w.where("ticket_types", (t) => ids.has(t["event_id"] as Id) && t["visibility"] === "public").map((t) => shown(t, READ.types)),
      questions: w.where("questions", (q) => ids.has(q["event_id"] as Id)).map((q) => shown(q, READ.questions)),
    };
  }

  async left(eventId: Id): Promise<TypeLeft[]> {
    return this.engine.typeLeft(eventId);
  }

  async unlock(eventId: Id, code: string): Promise<Row[]> {
    const wanted = normalizeCode(code);
    const w = this.engine.world;
    const codes = w.where("codes", (c) => normalizeCode(String(c["code"])) === wanted && c["active"] === true && c["unlocks_type_id"] !== null);
    return codes.map((c) => w.get("ticket_types", c["unlocks_type_id"] as Id)!).filter((t) => t["event_id"] === eventId).map((t) => shown(t, READ.codeTypes));
  }

  private orderValues(body: OrderBody): Record<string, unknown> {
    const event = this.engine.world.get("events", body.values["event_id"] as Id);
    if (event === undefined || event["status"] !== "published") throw new ApiError(400, "PUBLIC_WRITE_REFUSED", { column: "event_id", reason: "unknown" });
    // The room the page sends is the show's own.
    if (body.values["room_id"] !== undefined && body.values["room_id"] !== event["room_id"]) throw new ApiError(400, "PUBLIC_WRITE_REFUSED", { column: "room_id", reason: "disagrees" });
    return { ...body.values, room_id: event["room_id"], channel: "online" };
  }

  async prove(): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 900));
    if (this.failNext === "check") {
      this.failNext = null;
      return false;
    }
    return true;
  }

  async quote(body: OrderBody): Promise<QuoteReply> {
    const engine = this.engine;
    let reply: QuoteReply | null = null;
    try {
      engine.transaction(() => {
        const made = engine.create("orders", this.orderValues(body), this.writer, { table: "tickets", via: "order_id", rows: body.tickets.map((t) => ({ ...t })) });
        reply = { data: shown(made.row, READ.buy), tickets: made.children.map((t) => this.child(t)) };
        throw new DryRun();
      });
    } catch (error) {
      if (!(error instanceof DryRun)) throw error;
    }
    return reply!;
  }

  async buy(body: OrderBody, clientKey: string): Promise<OrderReply> {
    const engine = this.engine;
    const again = this.clientKeys.get(clientKey);
    if (again !== undefined) {
      const order = engine.world.get("orders", again)!;
      return { data: shown(order, READ.buy), tickets: engine.world.where("tickets", (t) => t["order_id"] === again).map((t) => this.child(t)), replayed: true };
    }
    const email = String(body.values["email"] ?? "");
    const name = (body.values["buyer_name"] as string | undefined) ?? null;
    const made = engine.transaction(() => {
      const customer = identity(engine, email, name);
      const out = engine.create("orders", { ...this.orderValues(body), customer_id: customer, client_key: clientKey }, this.writer, {
        table: "tickets",
        via: "order_id",
        rows: body.tickets.map((t) => ({ ...t })),
      });
      if (body.expect !== undefined && Number(out.row["total"]) !== body.expect.total) {
        throw new ApiError(409, "PUBLIC_PRICE_CHANGED", { total: out.row["total"], lines: out.children.map((t) => ({ id: t.id, due: t["due"] })) });
      }
      return out;
    });
    this.clientKeys.set(clientKey, made.row.id);
    this.openedOrder = made.row.id;
    return { data: shown(made.row, READ.buy), tickets: made.children.map((t) => this.child(t)), link: { key: "link", token: String(made.row["link_token"]) } };
  }

  /** A ticket of an order just made, as the create answers it. */
  private child(t: Row): Row {
    const out: Row = { id: t.id };
    for (const column of READ.buy.children?.["tickets"]?.select ?? []) out[column] = t[column] ?? null;
    return out;
  }

  async openOrder(token: string): Promise<ClaimReply> {
    const order = this.engine.world.all("orders").find((o) => o["link_token"] === token && o["link_stopped"] !== true);
    if (order === undefined) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    this.openedOrder = order.id;
    return { session: `link:${String(order.id)}`, expiresAt: this.engine.now + 30 * 60_000, name: (order["buyer_name"] as string) ?? null };
  }

  private opened(): Row {
    const order = this.openedOrder === null ? undefined : this.engine.world.get("orders", this.openedOrder);
    if (order === undefined) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    return order;
  }

  /**
   * A ticket of an order, read as its buyer — signed in (`reader`) or by the order's own link (nobody) — as the
   * manifest's entry says: its own columns only; a friend's code stays with the friend who holds it, and no
   * code shows before the order is paid or confirmed to pay at the door.
   */
  private asBuyer(ticket: Row, reader: Id | null = this.signed?.customer ?? null): Row {
    const out = shown(ticket, READ.tickets);
    const w = READ.tickets.withhold!;
    const holder = w.unlessHolder === undefined ? null : ticket[w.unlessHolder];
    const byHolder = holder !== null && holder !== undefined && holder !== reader;
    if (byHolder || w.when.where.every((c) => holds(ticket, c))) for (const column of w.columns) out[column] = null;
    return out;
  }
  /** The reader a ticket of this order is read as: its buyer when signed in, nobody through the link. */
  private readerOf(orderId: Id): Id | null {
    return this.openedOrder === orderId && (this.signed === null || this.engine.world.get("orders", orderId)?.["customer_id"] !== this.signed.customer) ? null : (this.signed?.customer ?? null);
  }

  async order(): Promise<OrderWithTickets> {
    const order = this.opened();
    return { order: shown(order, READ.linkOrder), tickets: this.engine.world.where("tickets", (t) => t["order_id"] === order.id).map((t) => this.asBuyer(t, null)) };
  }

  async bank(door: BankDoor): Promise<Row> {
    // Each door's bank read is for a proved session only: the link's, the confirm link's, the signed-in person's.
    const open = door === "link" ? this.openedOrder !== null : door === "confirm" ? this.openedConfirm !== null : this.signed !== null;
    if (!open) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    return shown(this.engine.world.all("settings")[0]!, READ.bank);
  }

  /** The order a write names: one of the signed-in person's, or the one this browser's link opened. */
  private target(orderId?: Id): Row {
    if (orderId === undefined) return this.opened();
    const order = this.engine.world.get("orders", orderId);
    if (order === undefined || this.signed === null || order["customer_id"] !== this.signed.customer) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    return order;
  }

  async choose(status: "door" | "confirming" | "no_charge" | "let_go", keep?: number, orderId?: Id): Promise<Row> {
    const order = this.target(orderId);
    if (!["held", "confirming", "offered"].includes(String(order["status"]))) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    const engine = this.engine;
    return engine.transaction(() => {
      // Claiming part of an offer: the tickets not kept go back to the waitlist's places.
      if (order["waitlist_id"] !== null && keep !== undefined) {
        const tickets = engine.world.where("tickets", (t) => t["order_id"] === order.id);
        if (keep < 1 || keep > tickets.length) throw new ApiError(400, "PUBLIC_WRITE_REFUSED", { column: "keep", reason: "out-of-range" });
        for (const t of tickets.slice(keep)) engine.update("tickets", t.id, { status: "returned", cancel_cause: "claim" }, { origin: "staff", name: null, roles: [] });
      }
      const moved = shown(engine.update("orders", order.id, { status }, this.writer), orderId === undefined ? READ.linkOrder : READ.myOrders);
      // A claimed offer takes its places from the waitlist's: the places it was owed go back on sale as it is sold.
      if (order["waitlist_id"] !== null && status !== "let_go") {
        const kept = engine.world.where("tickets", (t) => t["order_id"] === order.id && t["status"] === "valid").length;
        releaseReturned(engine, order["event_id"] as Id, kept, order.id);
      }
      return moved;
    });
  }

  async confirmTransfer(token: string): Promise<Row> {
    const order = this.engine.world.all("orders").find((o) => o["confirm_token"] === token);
    if (order === undefined || order["status"] !== "confirming") throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    this.openedConfirm = order.id;
    return shown(this.engine.update("orders", order.id, { status: "awaiting_transfer" }, this.writer), READ.confirmOrder);
  }

  /** A ticket of the order this browser's link opened, or of one of the signed-in person's orders. */
  private mine(ticketId: Id): Row {
    const ticket = this.engine.world.get("tickets", ticketId);
    if (ticket === undefined) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    const order = this.engine.world.get("orders", ticket["order_id"] as Id);
    const byLink = this.openedOrder !== null && ticket["order_id"] === this.openedOrder;
    const bySignIn = this.signed !== null && order?.["customer_id"] === this.signed.customer;
    if (!byLink && !bySignIn) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    return ticket;
  }

  /**
   * Whether an entry's rules let a change reach this row now: each value it names (a ticket nobody else holds,
   * an order confirmed to pay at the door, no door money taken), and a window on a linked row's time (before
   * the show's doors). As the server's own WHERE: a row outside them is not there.
   */
  private allows(e: Entry, row: Row): boolean {
    for (const [column, when] of Object.entries(e.writableWhen ?? {})) {
      if (Array.isArray(when)) {
        if (!when.some((v) => same(row[column], v))) return false;
        continue;
      }
      const before = (when as { before?: { column?: string } }).before?.column;
      const table = LINKED[column];
      if (before === undefined || table === undefined) throw new Error(`the demo does not judge "${column}" on a buyer's change`);
      const linked = this.engine.world.get(table, row[column] as Id);
      if (linked === undefined || this.engine.now >= (toMs(linked[before]) ?? 0)) return false;
    }
    return true;
  }

  /** A buyer's change to a ticket of theirs, through the entry whose rules judge it, answered as the entry shows it. */
  private change(ticketId: Id, e: Entry, values: Record<string, unknown>): Row {
    const ticket = this.mine(ticketId);
    if (!this.allows(e, ticket)) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    for (const [column, allowed] of Object.entries(e.writableValues ?? {})) {
      if (values[column] !== undefined && !allowed.includes(values[column])) throw new ApiError(400, "PUBLIC_WRITE_REFUSED", { column, reason: "value" });
    }
    const written = this.engine.update("tickets", ticketId, { ...(e.defaults ?? {}), ...values }, this.writer);
    return this.asBuyer(written, this.readerOf(ticket["order_id"] as Id));
  }

  async sendTicket(ticketId: Id, email: string, name: string): Promise<Row> {
    return this.change(ticketId, CHANGE.send, { status: "offered", pending_email: email.trim().toLowerCase(), pending_name: name });
  }

  async takeBack(ticketId: Id): Promise<Row> {
    return this.change(ticketId, CHANGE.send, { status: "valid", pending_email: null, pending_name: null });
  }

  async askRefund(ticketId: Id): Promise<Row> {
    return this.change(ticketId, CHANGE.refund, { status: "refund_asked" });
  }

  async withdrawRefund(ticketId: Id): Promise<Row> {
    return this.change(ticketId, CHANGE.refund, { status: "valid" });
  }

  async cancelTicket(ticketId: Id, toWaitlist = false): Promise<Row> {
    return toWaitlist ? this.change(ticketId, CHANGE.toWaitlist, { status: "returned", cancel_cause: "buyer" }) : this.change(ticketId, CHANGE.cancel, { status: "cancelled" });
  }

  async openTicket(token: string): Promise<Row> {
    const ticket = this.engine.world.all("tickets").find((t) => t["link_token"] === token);
    if (ticket === undefined) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    return this.byTicketLink(ticket);
  }

  /** What the ticket's own link reads; the code only once the friend has accepted it. */
  private byTicketLink(ticket: Row): Row {
    const out = shown(ticket, READ.ticket);
    const w = READ.ticket.withhold!;
    if (w.when.where.every((c) => holds(ticket, c))) for (const column of w.columns) out[column] = null;
    return out;
  }

  async acceptTicket(token: string, name: string): Promise<Row> {
    const ticket = this.engine.world.all("tickets").find((t) => t["link_token"] === token);
    if (ticket === undefined || ticket["status"] !== "offered") throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    const engine = this.engine;
    return engine.transaction(() => {
      const friend = identity(engine, String(ticket["pending_email"]), name);
      return this.byTicketLink(engine.update("tickets", ticket.id, { status: "valid", holder_name: name, holder_customer_id: friend }, this.writer));
    });
  }

  async joinWaitlist(eventId: Id, email: string, qty: number): Promise<Row> {
    const engine = this.engine;
    return masked(() => engine.transaction(() => {
      const customer = identity(engine, email, null);
      return shown(engine.create("waitlist", { event_id: eventId, email: email.trim().toLowerCase(), qty, customer_id: customer }, this.writer).row, READ.join);
    }));
  }

  /** The names on an order's tickets: its buyer's only (a friend holding a ticket reads it, and changes nothing). */
  async nameTicket(ticketId: Id, name: string, answers?: Record<string, string> | null): Promise<Row> {
    if (name.trim() === "") throw new ApiError(400, "PUBLIC_WRITE_REFUSED", { column: "holder_name", reason: "required" });
    const values: Record<string, unknown> = { holder_name: name.trim() };
    if (answers !== undefined) values["answers"] = answers;
    return this.change(ticketId, CHANGE.names, values);
  }

  async updateOrder(values: { answers?: Record<string, string> | null; access_note?: string | null; opt_in?: boolean }, orderId?: Id): Promise<Row> {
    const order = this.target(orderId);
    return shown(this.engine.update("orders", order.id, { ...values }, this.writer), orderId === undefined ? READ.linkOrder : READ.myOrders);
  }

  async keep(orderId: Id): Promise<Row> {
    const order = this.engine.world.get("orders", orderId);
    const own = order !== undefined && (order.id === this.openedOrder || (this.signed !== null && order["customer_id"] === this.signed.customer));
    if (!own) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    return shown(this.engine.update("orders", orderId, { kept_at: new Date(this.engine.now).toISOString() }, this.writer), READ.myOrders);
  }

  async openConfirm(token: string): Promise<Row> {
    const order = this.engine.world.all("orders").find((o) => o["confirm_token"] === token);
    if (order === undefined) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    this.openedConfirm = order.id;
    return shown(order, READ.confirmOrder);
  }

  // ── signing in by email ──────────────────────────────────────────────────

  async signIn(email: string): Promise<void> {
    const fault = this.failNext;
    if (fault === "mail-down" || fault === "too-many") {
      this.failNext = null;
      throw fault === "mail-down" ? new ApiError(503, "PUBLIC_CODE_UNAVAILABLE") : new ApiError(429, "PUBLIC_RATE_LIMITED", { reason: "per-value" });
    }
    const address = email.trim().toLowerCase();
    // A new link and code each time (the demo's own: 6 digits from the address and the clock).
    const code = String(100000 + ((hashOf(`${address}:${String(this.engine.now)}`) % 900000))).slice(0, 6);
    this.mail.set(address, { code, token: `si-${code}-${String(this.engine.now)}`, until: this.engine.now + 20 * 60_000, tries: 5 });
  }

  private signInAs(address: string): Person {
    const customer = identity(this.engine, address, null);
    this.signed = { customer, at: this.engine.now };
    const row = this.engine.world.get("customers", customer)!;
    return { email: String(row["email"]), name: (row["name"] as string | null) ?? null };
  }

  async verify(email: string, code: string): Promise<Person> {
    const address = email.trim().toLowerCase();
    const sent = this.mail.get(address);
    if (sent === undefined || this.engine.now >= sent.until) throw new ApiError(410, "PUBLIC_CODE_EXPIRED");
    if (sent.tries <= 0) throw new ApiError(403, "PUBLIC_CLAIM_LOCKED", { tries: 0 });
    if (code !== sent.code) {
      sent.tries -= 1;
      throw new ApiError(403, "PUBLIC_CODE_WRONG", { tries: sent.tries });
    }
    this.mail.delete(address);
    return this.signInAs(address);
  }

  async openSignIn(token: string): Promise<Person> {
    const found = [...this.mail].find(([, m]) => m.token === token);
    if (found === undefined || this.engine.now >= found[1].until) throw new ApiError(410, "PUBLIC_CODE_EXPIRED");
    this.mail.delete(found[0]);
    return this.signInAs(found[0]);
  }

  async me(): Promise<Person | null> {
    if (this.signed === null) return null;
    const row = this.engine.world.get("customers", this.signed.customer);
    if (row === undefined || row["email"] === null) return null;
    return { email: String(row["email"]), name: (row["name"] as string | null) ?? null };
  }

  async signOut(): Promise<void> {
    this.signed = null;
  }

  async signOutEverywhere(): Promise<void> {
    this.signed = null;
  }

  /** The demo card's "Signed out on another device": this browser's session ends as if signed out elsewhere. */
  endSession(): void {
    this.signed = null;
  }

  /**
   * "Delete my details": the account emptied, and the person's links stopped as the server stops them — each
   * of their orders' own link and confirm link, and the link of each ticket they hold, renewed — so an old email
   * opens nothing; a link this browser opened for them is closed too.
   */
  async forget(): Promise<void> {
    if (this.signed === null) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    // Deleting details asks for a fresh sign-in: within the last ten minutes.
    if (this.engine.now - this.signed.at > 10 * 60_000) throw new ApiError(403, "PUBLIC_CODE_STEP_UP");
    const id = this.signed.customer;
    const engine = this.engine;
    engine.transaction(() => {
      engine.update("customers", id, { email: null, name: null, opt_in: false, forgotten_at: new Date(engine.now).toISOString() }, SERVER);
      for (const o of engine.world.where("orders", (x) => x["customer_id"] === id)) {
        engine.update("orders", o.id, { link_token: randomCode(16), confirm_token: randomCode(16) }, SERVER);
        if (this.openedOrder === o.id) this.openedOrder = null;
        if (this.openedConfirm === o.id) this.openedConfirm = null;
      }
      for (const t of engine.world.where("tickets", (x) => x["holder_customer_id"] === id)) engine.update("tickets", t.id, { link_token: randomCode(16) }, SERVER);
    });
    this.signed = null;
  }

  private signedIn(): Id {
    if (this.signed === null) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    return this.signed.customer;
  }

  async myOrders(): Promise<{ orders: OrderWithTickets[]; held: Row[] }> {
    const me = this.signedIn();
    const w = this.engine.world;
    const orders = w.where("orders", (o) => o["customer_id"] === me && LIVE_OR_PAST.includes(String(o["status"])));
    return {
      orders: orders.map((o) => ({ order: shown(o, READ.myOrders), tickets: w.where("tickets", (t) => t["order_id"] === o.id).map((t) => this.asBuyer(t, me)) })),
      held: w.where("tickets", (t) => t["holder_customer_id"] === me && w.get("orders", t["order_id"] as Id)?.["customer_id"] !== me).map((t) => shown(t, READ.held)),
    };
  }

  /** The demo's Adminium has no add-on that draws receipts: the order page offers none. */
  async receipt(): Promise<Blob> {
    throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
  }

  async myOrder(orderId: Id): Promise<OrderWithTickets> {
    const me = this.signedIn();
    const order = this.engine.world.get("orders", orderId);
    if (order === undefined || order["customer_id"] !== me) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    return { order: shown(order, READ.myOrders), tickets: this.engine.world.where("tickets", (t) => t["order_id"] === order.id).map((t) => this.asBuyer(t, me)) };
  }

  async myWaitlist(): Promise<Row[]> {
    const me = this.signedIn();
    return this.engine.world.where("waitlist", (x) => x["customer_id"] === me).map((x) => shown(x, READ.waitlist));
  }

  async leaveWaitlist(waitlistId: Id): Promise<Row> {
    const me = this.signedIn();
    const row = this.engine.world.get("waitlist", waitlistId);
    if (row === undefined || row["customer_id"] !== me) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    return shown(this.engine.update("waitlist", waitlistId, { status: "left" }, this.writer), READ.waitlist);
  }

  async remindMe(eventId: Id, email: string, ticketTypeId: Id | null): Promise<Row> {
    const engine = this.engine;
    return masked(() => engine.transaction(() => {
      const customer = identity(engine, email, null);
      const made = engine.create(
        "reminders",
        { event_id: eventId, email: email.trim().toLowerCase(), ticket_type_id: ticketTypeId, target: ticketTypeId === null ? "sale" : String(ticketTypeId), customer_id: customer },
        this.writer,
      ).row;
      return shown(made, READ.remind);
    }));
  }
}

class DryRun extends Error {}

/** `n` of a show's places owed to its waitlist put back on sale (as an offer of them is claimed). */
function releaseReturned(engine: Engine, eventId: Id, n: number, claimedBy: Id): void {
  const returned = engine.world.where("tickets", (t) => t["event_id"] === eventId && t["status"] === "returned" && t["order_id"] !== claimedBy).slice(0, n);
  for (const t of returned) engine.update("tickets", t.id, { status: "released" }, { origin: "staff", name: "Box office", roles: [] });
}

export class DemoBoxOffice implements BoxOfficePort {
  private readonly engine: Engine;
  private readonly person: StaffPerson;
  private retries = new Map<string, Id>();

  constructor(engine: Engine, person: StaffPerson = { name: "Priya", roles: ["box-office"], email: "priya@waveform.example" }) {
    this.engine = engine;
    this.person = person;
  }

  private get writer(): Writer {
    return { origin: "staff", name: this.person.name, roles: this.person.roles };
  }

  async me(): Promise<StaffPerson> {
    return { ...this.person };
  }

  async config(): Promise<Config> {
    return { timezone: this.engine.world.zone, currency: this.engine.world.currency, now: new Date(this.engine.now).toISOString() };
  }

  async rows(table: string): Promise<Row[]> {
    return (this.engine.world.tables[table] ?? []).map(copy);
  }

  async list(table: string, query: ListQuery = {}): Promise<ListReply> {
    const rows = (this.engine.world.tables[table] ?? []).filter(
      (row) => (query.where ?? []).every((w) => meets(row, w)) && (query.any === undefined || query.any.some((w) => meets(row, w))),
    );
    const sorted = [...rows];
    for (const key of [...(query.sort ?? [])].reverse()) {
      sorted.sort((a, b) => {
        const x = a[key.column];
        const y = b[key.column];
        const c = typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""));
        return key.desc === true ? -c : c;
      });
    }
    const offset = query.offset ?? 0;
    return { rows: sorted.slice(offset, query.limit === undefined ? undefined : offset + query.limit).map(copy), total: rows.length };
  }

  async count(table: string, where: Where[] = []): Promise<number> {
    return (this.engine.world.tables[table] ?? []).filter((row) => where.every((w) => meets(row, w))).length;
  }

  async history(table: string, id: Id): Promise<HistoryEntry[]> {
    const world = this.engine.world;
    if (table !== "orders") return world.history((e) => e.table === table && e.id === id);
    const tickets = new Set(world.where("tickets", (t) => t["order_id"] === id).map((t) => t.id));
    const own = (t: string, rowId: Id): boolean => {
      if (t === "tickets") return tickets.has(rowId);
      const row = world.get(t as Table, rowId);
      return row !== undefined && (row["order_id"] === id || tickets.has(row["ticket_id"] as Id));
    };
    return world.history((e) => (e.table === "orders" && e.id === id) || (e.table !== "orders" && (e.changes["order_id"] === id || own(e.table, e.id))));
  }

  async counts(eventId: Id): Promise<PoolCount[]> {
    return this.engine.counts(eventId);
  }

  async create(table: string, values: Record<string, unknown>): Promise<Row> {
    return this.engine.create(table as Table, values, this.writer).row;
  }

  async update(table: string, id: Id, values: Record<string, unknown>, from?: string): Promise<Row> {
    this.seen(table, id, from);
    return this.engine.update(table as Table, id, values, this.writer);
  }

  /** A change that names the state it saw: refused, as Adminium refuses it, when the row has moved on. */
  private seen(table: string, id: Id, from: string | undefined): void {
    if (from === undefined) return;
    const now = this.engine.world.get(table as Table, id)?.["status"];
    if (now !== from) throw new ApiError(409, "STATE_MOVE_REFUSED", { column: "status", from: now ?? null, named: from });
  }

  async remove(table: string, id: Id): Promise<void> {
    this.removeNow(table, id);
  }

  private removeNow(table: string, id: Id): void {
    const engine = this.engine;
    // Rows that others point at stay: a sold ticket type, a show with orders.
    const pointed: Partial<Record<string, [Table, string][]>> = {
      ticket_types: [["tickets", "ticket_type_id"]],
      events: [["orders", "event_id"]],
      rooms: [["events", "room_id"]],
      devices: [["check_ins", "device_id"]],
    };
    for (const [t, column] of pointed[table] ?? []) {
      if (engine.world.all(t).some((r) => r[column] === id)) throw new ApiError(409, "FK_VIOLATION", { table, referencedBy: t });
    }
    engine.remove(table as Table, id, this.writer);
  }

  async saveEvent(id: Id | null, values: Record<string, unknown>, children: Partial<EventChildren>): Promise<Row> {
    const engine = this.engine;
    return engine.transaction(() => {
      const event = id === null ? engine.create("events", values, this.writer).row : engine.update("events", id, values, this.writer);
      for (const [table, rows] of Object.entries(children) as [Table, Record<string, unknown>[]][]) {
        const kept = new Set<Id>();
        for (const row of rows) {
          const { id: rowId, ...rest } = row as { id?: Id } & Record<string, unknown>;
          if (rowId === undefined || rowId === null) kept.add(engine.create(table, { ...rest, event_id: event.id }, this.writer).row.id);
          else {
            engine.update(table, rowId, rest, this.writer);
            kept.add(rowId);
          }
        }
        for (const gone of engine.world.where(table, (r) => r["event_id"] === event.id && !kept.has(r.id))) this.removeNow(table, gone.id);
      }
      engine.settleAll();
      return copy(engine.world.get("events", event.id)!);
    });
  }

  async mail(kind: string, rows: Record<string, unknown>[]): Promise<void> {
    const engine = this.engine;
    engine.transaction(() => {
      for (const row of rows) engine.create("messages", { kind, status: "queued", approved_by: this.person.name, ...row }, this.writer);
    });
  }

  async broadcast(values: Record<string, unknown>, to: Record<string, unknown>[], send: boolean): Promise<Row> {
    const engine = this.engine;
    return engine.transaction(() => {
      const made = engine.create("broadcasts", { ...values, status: "waiting" }, this.writer).row;
      if (send) this.sendNow(made, {}, to);
      return copy(engine.world.get("broadcasts", made.id)!);
    });
  }

  async sendBroadcast(id: Id, values: Record<string, unknown>, to: Record<string, unknown>[]): Promise<Row> {
    const engine = this.engine;
    return engine.transaction(() => {
      this.sendNow(engine.world.get("broadcasts", id)!, values, to);
      return copy(engine.world.get("broadcasts", id)!);
    });
  }

  /** Claimed (a second sender is refused), its emails written (only those it does not have yet), then sent. */
  private sendNow(b: Row, values: Record<string, unknown>, to: Record<string, unknown>[]): void {
    const engine = this.engine;
    if (b["status"] !== "sending") {
      this.seen("broadcasts", b.id, "waiting");
      engine.update("broadcasts", b.id, { ...values, status: "sending" }, this.writer);
    }
    this.queueBroadcast(engine.world.get("broadcasts", b.id)!, to);
    engine.update("broadcasts", b.id, { status: "sent" }, this.writer);
  }

  /** One email an order (a moved show's own kind, or a message to its buyers), and a friend's own to each holder: only those it does not have yet. */
  private queueBroadcast(b: Row, to: Record<string, unknown>[]): void {
    const had = new Set(this.engine.world.where("messages", (m) => m["broadcast_id"] === b.id).map(recipientKey));
    for (const row of to.filter((r) => !had.has(recipientKey(r)))) {
      // A friend's copy goes to the friend's own address, which the server reads from their customer row.
      const friend = row["customer_id"] === undefined || row["customer_id"] === null ? undefined : this.engine.world.get("customers", row["customer_id"] as Id);
      this.engine.create(
        "messages",
        { kind: broadcastKind(b, row), status: "queued", event_id: b["event_id"], broadcast_id: b.id, approved_by: this.person.name, ...(friend === undefined ? {} : { to_address: friend["email"] }), ...row },
        this.writer,
      );
    }
  }

  async quote(body: OrderBody): Promise<QuoteReply> {
    const engine = this.engine;
    const event = engine.world.get("events", body.values["event_id"] as Id);
    let reply: QuoteReply | null = null;
    try {
      engine.transaction(() => {
        const made = engine.create("orders", { channel: "box_office", ...body.values, room_id: event?.["room_id"] ?? null }, this.writer, { table: "tickets", via: "order_id", rows: body.tickets.map((t) => ({ ...t })) });
        reply = { data: made.row, tickets: made.children };
        throw new DryRun();
      });
    } catch (error) {
      if (!(error instanceof DryRun)) throw error;
    }
    return reply!;
  }

  async newOrder(body: OrderBody, clientKey: string): Promise<OrderReply> {
    const again = this.retries.get(clientKey);
    const engine = this.engine;
    if (again !== undefined) return { data: copy(engine.world.get("orders", again)!), tickets: engine.world.where("tickets", (t) => t["order_id"] === again).map(copy), replayed: true };
    const event = engine.world.get("events", body.values["event_id"] as Id);
    const made = engine.transaction(() => {
      const out = engine.create("orders", { channel: "box_office", ...body.values, room_id: event?.["room_id"] ?? null, client_key: clientKey }, this.writer, {
        table: "tickets",
        via: "order_id",
        rows: body.tickets.map((t) => ({ ...t })),
      });
      // The total the box office was shown: another one writes nothing, as Adminium's price check refuses it.
      if (body.expect !== undefined && Math.abs(Number(out.row["total"] ?? 0) - body.expect.total) > 0.004) throw new ApiError(409, "PRICE_CHANGED", { column: "total", total: Number(out.row["total"] ?? 0).toFixed(2) });
      return out;
    });
    this.retries.set(clientKey, made.row.id);
    return { data: made.row, tickets: made.children };
  }

  async move(orderId: Id, status: string, values: Record<string, unknown> = {}, from?: string): Promise<Row> {
    this.seen("orders", orderId, from);
    return this.engine.update("orders", orderId, { ...values, status }, this.writer);
  }

  async recordPayment(orderId: Id, amount: number, method: "bank_transfer" | "card" | "cash", note: string | null = null, key?: string): Promise<Row> {
    return this.keyed("payments", { order_id: orderId, amount, method, note }, key);
  }

  async recordRefund(orderId: Id, amount: number, method: "bank_transfer" | "card" | "cash", kind: "cancelled_tickets" | "goodwill", key?: string): Promise<Row> {
    return this.keyed("refunds", { order_id: orderId, amount, method, kind }, key);
  }

  /** Money written once per press: a press sent again answers the row it made. */
  private keyed(table: "payments" | "refunds", values: Record<string, unknown>, key: string | undefined): Row {
    const made = key === undefined ? undefined : this.engine.world.all(table).find((r) => r["client_key"] === key);
    if (made !== undefined) return copy(made);
    return this.engine.create(table, { ...values, ...(key === undefined ? {} : { client_key: key }) }, this.writer).row;
  }

  async cancelTickets(ticketIds: Id[], cause: "box_office" | "request"): Promise<void> {
    const engine = this.engine;
    engine.transaction(() => {
      for (const id of ticketIds) {
        const ticket = engine.world.get("tickets", id)!;
        const event = engine.world.get("events", ticket["event_id"] as Id)!;
        // On a show with a waitlist the place goes to it; elsewhere the ticket is cancelled.
        if (event["waitlist_on"] === true) engine.update("tickets", id, { status: "returned", cancel_cause: cause }, this.writer);
        else engine.update("tickets", id, { status: "cancelled", cancel_cause: cause }, this.writer);
      }
    });
  }

  async declineRefund(ticketId: Id): Promise<Row> {
    return this.engine.update("tickets", ticketId, { status: "valid", refund_declined_at: new Date(this.engine.now).toISOString() }, this.writer);
  }

  async offerWaitlist(eventId: Id): Promise<Row[]> {
    const engine = this.engine;
    return engine.transaction(() => {
      const returned = engine.world.where("tickets", (t) => t["event_id"] === eventId && t["status"] === "returned");
      const offeredOrders = new Set(engine.world.where("orders", (o) => o["event_id"] === eventId && o["status"] === "offered").map((o) => o.id));
      const offered = engine.world.where("tickets", (t) => offeredOrders.has(t["order_id"] as Id));
      const plan = offerPlan(returned, offered, engine.counts(eventId));
      const offers: Row[] = [];
      const queue = engine.world.where("waitlist", (w) => w["event_id"] === eventId && w["status"] === "waiting").sort((a, b) => String(a["joined_at"]).localeCompare(String(b["joined_at"])));
      for (const entry of queue) {
        const types = plan.take(Number(entry["qty"]));
        if (types.length === 0) break;
        const customer = engine.world.get("customers", entry["customer_id"] as Id);
        const made = engine.create(
          "orders",
          { event_id: eventId, room_id: engine.world.get("events", eventId)!["room_id"], channel: "box_office", email: entry["email"], buyer_name: customer?.["name"] ?? null, customer_id: entry["customer_id"], waitlist_id: entry.id },
          this.writer,
          { table: "tickets", via: "order_id", rows: types.map((ticket_type_id) => ({ ticket_type_id })) },
        );
        offers.push(engine.update("orders", made.row.id, { status: "offered" }, this.writer));
        engine.update("waitlist", entry.id, { status: "offered", order_id: made.row.id }, this.writer);
      }
      return offers;
    });
  }

  /** A show and its live orders cancelled, each order its own write; their emails held until sent. */
  async cancelShow(eventId: Id): Promise<void> {
    return cancelShowOrders(this, eventId);
  }
}

export class DemoDoor implements DoorPort {
  private readonly engine: Engine;
  private readonly person: StaffPerson;

  constructor(engine: Engine, person: StaffPerson = { name: "Sam", roles: ["door"] }) {
    this.engine = engine;
    this.person = person;
  }

  private writer(occurredAt?: number): Writer {
    return { origin: "staff", name: this.person.name, roles: this.person.roles, ...(occurredAt === undefined ? {} : { occurredAt }) };
  }

  async me(): Promise<StaffPerson> {
    return { ...this.person };
  }

  async config(): Promise<Config> {
    return { timezone: this.engine.world.zone, currency: this.engine.world.currency, now: new Date(this.engine.now).toISOString() };
  }

  async find(code: string, eventDayId: Id): Promise<{ ticket: Row; order: Row; checkIn: Row | null } | null> {
    const wanted = normalizeCode(code);
    const w = this.engine.world;
    const ticket = w.all("tickets").find((t) => normalizeCode(String(t["code"] ?? "")) === wanted);
    if (ticket === undefined) return null;
    const checkIn = w.all("check_ins").find((c) => c["ticket_id"] === ticket.id && c["event_day_id"] === eventDayId) ?? null;
    return { ticket: copy(ticket), order: copy(w.get("orders", ticket["order_id"] as Id)!), checkIn: checkIn === null ? null : copy(checkIn) };
  }

  async collect(ticketId: Id, method: "card" | "cash", deviceId: Id | null, occurredAt?: number): Promise<Row> {
    const engine = this.engine;
    return engine.transaction(() => {
      const made = engine.create("door_collections", { ticket_id: ticketId, method, device_id: deviceId }, this.writer(occurredAt)).row;
      const order = engine.world.get("orders", engine.world.get("tickets", ticketId)!["order_id"] as Id)!;
      // Nothing owed any more: the door moves the order to paid itself.
      if (order["status"] === "door" && Number(order["balance"] ?? 0) <= 0) engine.update("orders", order.id, { status: "paid", paid_method: method }, this.writer());
      return made;
    });
  }

  async checkIn(ticketId: Id, eventDayId: Id, deviceId: Id | null, occurredAt?: number): Promise<Row> {
    return this.engine.create("check_ins", { ticket_id: ticketId, event_day_id: eventDayId, device_id: deviceId }, this.writer(occurredAt)).row;
  }

  async undo(checkInId: Id): Promise<void> {
    this.engine.remove("check_ins", checkInId);
  }
}
