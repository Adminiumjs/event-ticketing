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
import type { AudiencePort, BoxOfficePort, DoorPort, EventChildren, OrderWithTickets, Person, StaffPerson, Venue } from "../data/ports.ts";
import { ApiError, type ClaimReply, type Config, type HistoryEntry, type Id, type ListQuery, type ListReply, type OrderBody, type OrderReply, type PoolCount, type QuoteReply, type Row, type TypeLeft, type Where } from "../data/wire.ts";
import { toMs } from "../lib/venueTime.ts";
import { normalizeCode } from "./codes.ts";
import { holds, type Engine, type Writer } from "./engine.ts";
import type { Table } from "./world.ts";
import { MANIFEST_RULES } from "./rules.ts";

type Withhold = { columns: string[]; when: { where: Parameters<typeof holds>[1][] } };
type Entry = { table: string; key?: string; select?: string[]; visibleWith?: unknown; withhold?: Withhold };
const ENTRIES = MANIFEST_RULES.publicAccess as unknown as Entry[];
/** The buyer's read of an order's tickets, and a ticket's own link: what each shows and holds back. */
const BUYER_WITHHOLD = ENTRIES.find((e) => e.table === "tickets" && e.visibleWith !== undefined && e.withhold !== undefined)!.withhold!;
const TICKET_LINK = ENTRIES.find((e) => e.table === "tickets" && e.key === "ticket") as Required<Pick<Entry, "select" | "withhold">>;

const copy = (row: Row): Row => ({ ...row });
const LIVE_ORDER = ["door", "awaiting_transfer", "overdue", "no_charge", "paid"];
/** An order's states in which its tickets can be named. */
const NAMED = ["held", "confirming", "offered", "door", "no_charge", "paid", "awaiting_transfer", "overdue"];
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
    return {
      settings: copy(w.all("settings")[0]!),
      rooms: w.all("rooms").map(copy),
      events: published.map(copy),
      days: w.where("event_days", (d) => ids.has(d["event_id"] as Id)).map(copy),
      // Set times only once the show's are up.
      acts: w
        .where("acts", (a) => ids.has(a["event_id"] as Id))
        .map((a) => (w.get("events", a["event_id"] as Id)?.["sets_published"] === true ? copy(a) : { ...copy(a), starts_at: null, ends_at: null })),
      types: w.where("ticket_types", (t) => ids.has(t["event_id"] as Id) && t["visibility"] === "public").map(copy),
      questions: w.where("questions", (q) => ids.has(q["event_id"] as Id)).map(copy),
    };
  }

  async left(eventId: Id): Promise<TypeLeft[]> {
    return this.engine.typeLeft(eventId);
  }

  async unlock(eventId: Id, code: string): Promise<Row[]> {
    const wanted = normalizeCode(code);
    const w = this.engine.world;
    const codes = w.where("codes", (c) => normalizeCode(String(c["code"])) === wanted && c["active"] === true && c["unlocks_type_id"] !== null);
    return codes.map((c) => w.get("ticket_types", c["unlocks_type_id"] as Id)!).filter((t) => t["event_id"] === eventId).map(copy);
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
        reply = { data: made.row, tickets: made.children };
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
      return { data: copy(order), tickets: engine.world.where("tickets", (t) => t["order_id"] === again).map(copy), replayed: true };
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
    return { data: made.row, tickets: made.children, link: { key: "link", token: String(made.row["link_token"]) } };
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
   * A ticket of the opened order, read as its buyer, as the manifest's withhold says: a friend's code and
   * address stay with the friend, and no code shows before the order is paid or confirmed to pay at the door.
   */
  private asBuyer(ticket: Row): Row {
    const order = this.engine.world.get("orders", ticket["order_id"] as Id)!;
    const out = copy(ticket);
    const byHolder = ticket["holder_customer_id"] !== null && ticket["holder_customer_id"] !== order["customer_id"];
    if (byHolder || BUYER_WITHHOLD.when.where.every((c) => holds(ticket, c))) for (const column of BUYER_WITHHOLD.columns) out[column] = null;
    return out;
  }

  async order(): Promise<OrderWithTickets> {
    const order = this.opened();
    return { order: copy(order), tickets: this.engine.world.where("tickets", (t) => t["order_id"] === order.id).map((t) => this.asBuyer(t)) };
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
      const moved = engine.update("orders", order.id, { status }, this.writer);
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
    return this.engine.update("orders", order.id, { status: "awaiting_transfer" }, this.writer);
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

  async sendTicket(ticketId: Id, email: string, name: string): Promise<Row> {
    const ticket = this.mine(ticketId);
    if (!["door", "no_charge", "paid"].includes(String(ticket["order_status"])) || ticket["holder_customer_id"] !== null) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    return this.asBuyer(this.engine.update("tickets", ticketId, { status: "offered", pending_email: email.trim().toLowerCase(), pending_name: name }, this.writer));
  }

  async takeBack(ticketId: Id): Promise<Row> {
    this.mine(ticketId);
    return this.asBuyer(this.engine.update("tickets", ticketId, { status: "valid", pending_email: null, pending_name: null }, this.writer));
  }

  async askRefund(ticketId: Id): Promise<Row> {
    const ticket = this.mine(ticketId);
    if (ticket["order_status"] !== "paid") throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    return this.asBuyer(this.engine.update("tickets", ticketId, { status: "refund_asked" }, this.writer));
  }

  async withdrawRefund(ticketId: Id): Promise<Row> {
    this.mine(ticketId);
    return this.asBuyer(this.engine.update("tickets", ticketId, { status: "valid" }, this.writer));
  }

  async cancelTicket(ticketId: Id): Promise<Row> {
    const ticket = this.mine(ticketId);
    const event = this.engine.world.get("events", ticket["event_id"] as Id)!;
    if (ticket["order_status"] !== "door" || this.engine.now >= (toMs(event["doors_at"]) ?? 0)) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    return this.asBuyer(this.engine.update("tickets", ticketId, { status: "cancelled", cancel_cause: "buyer" }, this.writer));
  }

  async openTicket(token: string): Promise<Row> {
    const ticket = this.engine.world.all("tickets").find((t) => t["link_token"] === token);
    if (ticket === undefined) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    // What the ticket's own link reads; the code only once the friend has accepted it.
    const out: Row = { id: ticket.id };
    for (const column of TICKET_LINK.select) out[column] = ticket[column] ?? null;
    if (TICKET_LINK.withhold.when.where.every((c) => holds(ticket, c))) for (const column of TICKET_LINK.withhold.columns) out[column] = null;
    return out;
  }

  async acceptTicket(token: string, name: string): Promise<Row> {
    const ticket = this.engine.world.all("tickets").find((t) => t["link_token"] === token);
    if (ticket === undefined || ticket["status"] !== "offered") throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    const engine = this.engine;
    return engine.transaction(() => {
      const friend = identity(engine, String(ticket["pending_email"]), name);
      return engine.update("tickets", ticket.id, { status: "valid", holder_name: name, holder_customer_id: friend }, this.writer);
    });
  }

  async joinWaitlist(eventId: Id, email: string, qty: number): Promise<Row> {
    const engine = this.engine;
    return masked(() => engine.transaction(() => {
      const customer = identity(engine, email, null);
      return engine.create("waitlist", { event_id: eventId, email: email.trim().toLowerCase(), qty, customer_id: customer }, this.writer).row;
    }));
  }

  async nameTicket(ticketId: Id, name: string, answers?: Record<string, string> | null): Promise<Row> {
    const ticket = this.engine.world.get("tickets", ticketId);
    const holds = ticket !== undefined && this.signed !== null && ticket["holder_customer_id"] === this.signed.customer;
    if (!holds) this.mine(ticketId);
    if (!NAMED.includes(String(ticket!["order_status"]))) throw new ApiError(400, "PUBLIC_WRITE_REFUSED");
    if (name.trim() === "") throw new ApiError(400, "PUBLIC_WRITE_REFUSED", { column: "holder_name", reason: "required" });
    const values: Record<string, unknown> = { holder_name: name.trim() };
    if (answers !== undefined) values["answers"] = answers;
    return this.asBuyer(this.engine.update("tickets", ticketId, values, this.writer));
  }

  async updateOrder(values: { answers?: Record<string, string> | null; access_note?: string | null; opt_in?: boolean }, orderId?: Id): Promise<Row> {
    const order = this.target(orderId);
    return copy(this.engine.update("orders", order.id, { ...values }, this.writer));
  }

  async keep(orderId: Id): Promise<Row> {
    const order = this.engine.world.get("orders", orderId);
    const own = order !== undefined && (order.id === this.openedOrder || (this.signed !== null && order["customer_id"] === this.signed.customer));
    if (!own) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    return copy(this.engine.update("orders", orderId, { kept_at: new Date(this.engine.now).toISOString() }, this.writer));
  }

  async openConfirm(token: string): Promise<Row> {
    const order = this.engine.world.all("orders").find((o) => o["confirm_token"] === token);
    if (order === undefined) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    const out: Row = { id: order.id };
    for (const c of ["number", "status", "event_id", "total", "ticket_count", "held_until", "offer_until", "pay_by"]) out[c] = order[c] ?? null;
    return out;
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

  async forget(): Promise<void> {
    if (this.signed === null) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    // Deleting details asks for a fresh sign-in: within the last ten minutes.
    if (this.engine.now - this.signed.at > 10 * 60_000) throw new ApiError(403, "PUBLIC_CODE_STEP_UP");
    const id = this.signed.customer;
    this.engine.world.get("customers", id);
    this.engine.update("customers", id, { email: null, name: null, opt_in: false, forgotten_at: new Date(this.engine.now).toISOString() }, { origin: "staff", name: null, roles: [] });
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
      orders: orders.map((o) => ({ order: copy(o), tickets: w.where("tickets", (t) => t["order_id"] === o.id).map((t) => this.asBuyer(t)) })),
      held: w.where("tickets", (t) => t["holder_customer_id"] === me && w.get("orders", t["order_id"] as Id)?.["customer_id"] !== me).map(copy),
    };
  }

  async myOrder(orderId: Id): Promise<OrderWithTickets> {
    const me = this.signedIn();
    const order = this.engine.world.get("orders", orderId);
    if (order === undefined || order["customer_id"] !== me) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    return { order: copy(order), tickets: this.engine.world.where("tickets", (t) => t["order_id"] === order.id).map((t) => this.asBuyer(t)) };
  }

  async myWaitlist(): Promise<Row[]> {
    const me = this.signedIn();
    return this.engine.world.where("waitlist", (x) => x["customer_id"] === me).map(copy);
  }

  async leaveWaitlist(waitlistId: Id): Promise<Row> {
    const me = this.signedIn();
    const row = this.engine.world.get("waitlist", waitlistId);
    if (row === undefined || row["customer_id"] !== me) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    return copy(this.engine.update("waitlist", waitlistId, { status: "left" }, this.writer));
  }

  async remindMe(eventId: Id, email: string, ticketTypeId: Id | null): Promise<Row> {
    const engine = this.engine;
    return masked(() => engine.transaction(() => {
      const customer = identity(engine, email, null);
      return engine.create(
        "reminders",
        { event_id: eventId, email: email.trim().toLowerCase(), ticket_type_id: ticketTypeId, target: ticketTypeId === null ? "sale" : String(ticketTypeId), customer_id: customer },
        this.writer,
      ).row;
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

  async update(table: string, id: Id, values: Record<string, unknown>): Promise<Row> {
    return this.engine.update(table as Table, id, values, this.writer);
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

  async saveEvent(id: Id | null, values: Record<string, unknown>, children: EventChildren): Promise<Row> {
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
      const made = engine.create("broadcasts", { ...values, status: send ? "sent" : "waiting" }, this.writer).row;
      if (send) this.queueBroadcast(made, to);
      return copy(engine.world.get("broadcasts", made.id)!);
    });
  }

  async sendBroadcast(id: Id, values: Record<string, unknown>, to: Record<string, unknown>[]): Promise<Row> {
    const engine = this.engine;
    return engine.transaction(() => {
      const sent = engine.update("broadcasts", id, { ...values, status: "sent" }, this.writer);
      this.queueBroadcast(sent, to);
      return copy(engine.world.get("broadcasts", id)!);
    });
  }

  /** One email an order: a moved show's own kind, or a message to its buyers. */
  private queueBroadcast(b: Row, to: Record<string, unknown>[]): void {
    const kind = b["template"] === "moved" ? "moved" : "broadcast";
    for (const row of to) {
      this.engine.create(
        "messages",
        { kind, status: "queued", event_id: b["event_id"], broadcast_id: b.id, approved_by: this.person.name, ...row },
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
    const made = engine.create("orders", { channel: "box_office", ...body.values, room_id: event?.["room_id"] ?? null, client_key: clientKey }, this.writer, {
      table: "tickets",
      via: "order_id",
      rows: body.tickets.map((t) => ({ ...t })),
    });
    this.retries.set(clientKey, made.row.id);
    return { data: made.row, tickets: made.children };
  }

  async move(orderId: Id, status: string, values: Record<string, unknown> = {}): Promise<Row> {
    return this.engine.update("orders", orderId, { ...values, status }, this.writer);
  }

  async recordPayment(orderId: Id, amount: number, method: "bank_transfer" | "card" | "cash", note: string | null = null): Promise<Row> {
    return this.engine.create("payments", { order_id: orderId, amount, method, note }, this.writer).row;
  }

  async recordRefund(orderId: Id, amount: number, method: "bank_transfer" | "card" | "cash", kind: "cancelled_tickets" | "goodwill"): Promise<Row> {
    return this.engine.create("refunds", { order_id: orderId, amount, method, kind }, this.writer).row;
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
      const offeredAlready = engine.world.where("orders", (o) => o["event_id"] === eventId && o["status"] === "offered").reduce((n, o) => n + engine.world.where("tickets", (t) => t["order_id"] === o.id).length, 0);
      let left = returned.length - offeredAlready;
      const type = returned[0]?.["ticket_type_id"] as Id | undefined;
      const offers: Row[] = [];
      const queue = engine.world.where("waitlist", (w) => w["event_id"] === eventId && w["status"] === "waiting").sort((a, b) => String(a["joined_at"]).localeCompare(String(b["joined_at"])));
      for (const entry of queue) {
        if (left <= 0 || type === undefined) break;
        const n = Math.min(Number(entry["qty"]), left);
        const customer = engine.world.get("customers", entry["customer_id"] as Id);
        const made = engine.create(
          "orders",
          { event_id: eventId, room_id: engine.world.get("events", eventId)!["room_id"], channel: "box_office", email: entry["email"], buyer_name: customer?.["name"] ?? null, customer_id: entry["customer_id"], waitlist_id: entry.id },
          this.writer,
          { table: "tickets", via: "order_id", rows: Array.from({ length: n }, () => ({ ticket_type_id: type })) },
        );
        offers.push(engine.update("orders", made.row.id, { status: "offered" }, this.writer));
        engine.update("waitlist", entry.id, { status: "offered" }, this.writer);
        left -= n;
      }
      return offers;
    });
  }

  async cancelShow(eventId: Id): Promise<void> {
    const engine = this.engine;
    engine.update("events", eventId, { status: "cancelled" }, this.writer);
    // Each live order its own write: an order already cancelled is left as it is.
    for (const order of engine.world.where("orders", (o) => o["event_id"] === eventId && [...LIVE_ORDER, "held", "confirming", "offered"].includes(String(o["status"])))) {
      engine.update("orders", order.id, { status: "cancelled", cancel_cause: "show" }, this.writer);
    }
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
      if (order["status"] === "door" && Number(order["balance"] ?? 0) <= 0) engine.update("orders", order.id, { status: "paid" }, this.writer());
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
