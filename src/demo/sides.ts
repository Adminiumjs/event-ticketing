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
import type { AudiencePort, BoxOfficePort, DoorPort, OrderWithTickets, StaffPerson, Venue } from "../data/ports.ts";
import { ApiError, type ClaimReply, type Config, type Id, type OrderBody, type OrderReply, type PoolCount, type QuoteReply, type Row, type TypeLeft } from "../data/wire.ts";
import { venueDay, wallTime, toMs } from "../lib/venueTime.ts";
import { normalizeCode } from "./codes.ts";
import type { Engine, Writer } from "./engine.ts";

const copy = (row: Row): Row => ({ ...row });
const LIVE_ORDER = ["door", "awaiting_transfer", "overdue", "no_charge", "paid"];

/** A buyer found by the address typed, or made (and never told which). */
function identity(engine: Engine, email: string, name: string | null): Id {
  const found = engine.world.all("customers").find((c) => c["email"] === email.trim().toLowerCase());
  if (found !== undefined) return found.id;
  return engine.world.insert("customers", { email: email.trim().toLowerCase(), name, opt_in: false, forgotten_at: null, created_at: new Date(engine.now).toISOString() }).id;
}

export class DemoAudience implements AudiencePort {
  private readonly engine: Engine;
  private readonly writer: Writer = { origin: "public", name: null, roles: [] };
  /** The order this browser's link opened. */
  private openedOrder: Id | null = null;
  private clientKeys = new Map<string, Id>();

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
      acts: w.where("acts", (a) => ids.has(a["event_id"] as Id)).map((a) => (a["sets_published"] === true ? copy(a) : { ...copy(a), starts_at: null, ends_at: null })),
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
    if (order === undefined) throw new ApiError(401, "PUBLIC_CLAIM_REQUIRED");
    return order;
  }

  /** A ticket of the opened order, read as its buyer: a friend's code and address stay with the friend. */
  private asBuyer(ticket: Row): Row {
    const order = this.engine.world.get("orders", ticket["order_id"] as Id)!;
    const out = copy(ticket);
    if (ticket["holder_customer_id"] !== null && ticket["holder_customer_id"] !== order["customer_id"]) {
      out["code"] = null;
      out["holder_email"] = null;
    }
    return out;
  }

  async order(): Promise<OrderWithTickets> {
    const order = this.opened();
    return { order: copy(order), tickets: this.engine.world.where("tickets", (t) => t["order_id"] === order.id).map((t) => this.asBuyer(t)) };
  }

  async choose(status: "door" | "confirming" | "no_charge" | "let_go"): Promise<Row> {
    const order = this.opened();
    if (!["held", "confirming", "offered"].includes(String(order["status"]))) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    const engine = this.engine;
    return engine.transaction(() => {
      const moved = engine.update("orders", order.id, { status }, this.writer);
      // A claimed offer takes its places from the waitlist's: the places it was owed go back on sale as it is sold.
      if (order["waitlist_id"] !== null && status !== "let_go") releaseReturned(engine, order["event_id"] as Id, engine.world.where("tickets", (t) => t["order_id"] === order.id).length);
      return moved;
    });
  }

  async confirmTransfer(token: string): Promise<Row> {
    const order = this.engine.world.all("orders").find((o) => o["confirm_token"] === token);
    if (order === undefined || order["status"] !== "confirming") throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
    return this.engine.update("orders", order.id, { status: "awaiting_transfer" }, this.writer);
  }

  private mine(ticketId: Id): Row {
    const order = this.opened();
    const ticket = this.engine.world.get("tickets", ticketId);
    if (ticket === undefined || ticket["order_id"] !== order.id) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
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
    // No code here until the ticket is theirs.
    const out = copy(ticket);
    for (const column of ["code", "holder_email", "pending_email", "link_token"]) out[column] = null;
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
    return engine.transaction(() => {
      const customer = identity(engine, email, null);
      return engine.create("waitlist", { event_id: eventId, email: email.trim().toLowerCase(), qty, customer_id: customer }, this.writer).row;
    });
  }

  async remindMe(eventId: Id, email: string, ticketTypeId: Id | null): Promise<Row> {
    const engine = this.engine;
    return engine.transaction(() => {
      const customer = identity(engine, email, null);
      return engine.create(
        "reminders",
        { event_id: eventId, email: email.trim().toLowerCase(), ticket_type_id: ticketTypeId, target: ticketTypeId === null ? "sale" : String(ticketTypeId), customer_id: customer },
        this.writer,
      ).row;
    });
  }
}

class DryRun extends Error {}

/** `n` of a show's places owed to its waitlist put back on sale (as an offer of them is claimed). */
function releaseReturned(engine: Engine, eventId: Id, n: number): void {
  const returned = engine.world.where("tickets", (t) => t["event_id"] === eventId && t["status"] === "returned").slice(0, n);
  for (const t of returned) engine.update("tickets", t.id, { status: "released" }, { origin: "staff", name: "Box office", roles: [] });
}

export class DemoBoxOffice implements BoxOfficePort {
  private readonly engine: Engine;
  private readonly person: StaffPerson;
  private staffKeys = new Map<string, Id>();

  constructor(engine: Engine, person: StaffPerson = { name: "Priya", roles: ["box-office"] }) {
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

  async counts(eventId: Id): Promise<PoolCount[]> {
    return this.engine.counts(eventId);
  }

  async newOrder(body: OrderBody, staffKey: string): Promise<OrderReply> {
    const again = this.staffKeys.get(staffKey);
    const engine = this.engine;
    if (again !== undefined) return { data: copy(engine.world.get("orders", again)!), tickets: engine.world.where("tickets", (t) => t["order_id"] === again).map(copy), replayed: true };
    const event = engine.world.get("events", body.values["event_id"] as Id);
    const made = engine.create("orders", { channel: "box_office", ...body.values, room_id: event?.["room_id"] ?? null, staff_key: staffKey }, this.writer, {
      table: "tickets",
      via: "order_id",
      rows: body.tickets.map((t) => ({ ...t })),
    });
    this.staffKeys.set(staffKey, made.row.id);
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

  /** The venue's day: from its "day starts at" time to the same time the next morning. */
  private venueDayStart(): number {
    const w = this.engine.world;
    const starts = String(this.engine.setting("day_starts_at") ?? "06:00");
    const today = wallTime(venueDay(this.engine.now, w.zone), starts, w.zone);
    return this.engine.now >= today ? today : wallTime(venueDay(this.engine.now, w.zone, -1), starts, w.zone);
  }

  async tonight(): Promise<{ events: Row[]; days: Row[] }> {
    const from = this.venueDayStart();
    const to = from + 24 * 3_600_000;
    const days = this.engine.world.where("event_days", (d) => {
      const doors = toMs(d["doors_at"]) ?? 0;
      return doors >= from && doors < to;
    });
    const ids = new Set(days.map((d) => d["event_id"] as Id));
    return { events: this.engine.world.where("events", (e) => ids.has(e.id) && e["status"] === "published").map(copy), days: days.map(copy) };
  }

  async find(code: string, eventDayId: Id): Promise<{ ticket: Row; order: Row; checkIn: Row | null } | null> {
    const wanted = normalizeCode(code);
    const w = this.engine.world;
    const ticket = w.all("tickets").find((t) => normalizeCode(String(t["code"] ?? "")) === wanted);
    if (ticket === undefined) return null;
    const checkIn = w.all("check_ins").find((c) => c["ticket_id"] === ticket.id && c["event_day_id"] === eventDayId) ?? null;
    return { ticket: copy(ticket), order: copy(w.get("orders", ticket["order_id"] as Id)!), checkIn: checkIn === null ? null : copy(checkIn) };
  }

  async collect(ticketId: Id, method: "card" | "cash", deviceId: Id | null): Promise<Row> {
    const engine = this.engine;
    return engine.transaction(() => {
      const made = engine.create("door_collections", { ticket_id: ticketId, method, device_id: deviceId }, this.writer()).row;
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
