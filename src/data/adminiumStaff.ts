/**
 * The box office's and the door's door into a real Adminium: the data API as
 * the person signed in to it, the way the dashboard reads it — the app served
 * by Adminium at `/apps/events/staff/`, riding that person's session, their
 * roles and limits holding every read and write.
 *
 * Everything the staff screens need to start is in the staff
 * `surface-config.json`: the connection, the tables' real names, the venue's
 * zone and money, who is signed in and the roles they hold. A door person may
 * not read the dashboard's own routes, so nothing here asks them.
 *
 * Every figure is Adminium's: an order's price from its dry run, its total and
 * balance from the row after the write, a show's pools from its counts. A write
 * that Adminium refuses reaches the screens with its code and what it said.
 */
import { broadcastKind } from "./messageKinds.ts";
import type { BoxOfficePort, DoorPort, EventChildren, StaffPerson } from "./ports.ts";
import { cancelShowOrders, offerPlan, recipientKey } from "./boxSteps.ts";
import { SessionPortError, type CallOptions, type SessionTransport } from "./sessionSource.ts";
import type { StaffConfig } from "../staffConnection.ts";
import { zoneOffsetMs } from "../lib/venueTime.ts";
import { ApiError, yes, type Config, type HistoryEntry, type Id, type ListQuery, type ListReply, type OrderBody, type OrderReply, type PoolCount, type QuoteReply, type Row, type Where } from "./wire.ts";

/** The app's key: its roles are named `events-<role>`, its tables `events_<table>` when the server does not say. */
const APP_KEY = "events";
const PAGE = 200;
/** The most rows one read brings back: past this it says so rather than cut the answer short. */
const MOST_ROWS = 20_000;
/**
 * How long the door waits on one request before it judges the scan from the
 * list on the phone: a hung request at a crowded door must not hold the
 * queue, and a write given up on is covered by the door's own-row rule.
 */
export const DOOR_DEADLINE_MS = 6_000;
const HURRY: CallOptions = { deadlineMs: DOOR_DEADLINE_MS };
/** The columns the data API answers as decimal strings, read as numbers here. */
const MONEY = new Set(["price", "subtotal", "discount", "adjusted", "total", "collected", "paid_in", "refunded", "balance", "due", "code_value", "value", "live_price", "live_discount", "amount", "received", "owed_door", "owed_transfer", "owed_overdue"]);

/**
 * The app's yes/no columns (every `bool` in the manifest): MySQL and SQLite answer them as 0/1, read
 * here as false/true so no screen meets a number where it asks a yes.
 */
export const BOOLS = new Set(["accounts_on", "active", "admits_day1", "admits_day2", "admits_day3", "codes_on", "door_on", "eve_email", "lapsed", "link_stopped", "opt_in", "pay_door", "pay_transfer", "questions_on", "required", "selling", "send_on", "sets_published", "timetable_on", "tonight_email_on", "transfer_on", "voided", "waitlist_on"]);

/** A time with no zone, as a database that keeps none answers it: `2026-07-29 01:59:17.183`. */
const WALL = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(\.\d+)?)?$/;

/**
 * A wall time on the server's own clock as the moment it names. A database
 * that keeps no zone (SQLite) keeps a time on the server's clock, and the
 * data API answers it as it is; the server's zone (the staff config's) says
 * which moment that was.
 */
export function wallToIso(text: string, zone: string): string {
  const m = WALL.exec(text);
  if (m === null) return text;
  const [, y, mo, d, h, mi, sec, frac] = m;
  const naive = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(sec ?? 0), Math.round(Number(frac ?? 0) * 1000));
  // The zone's offset at that moment (twice: near a clock change the first guess can be an hour out).
  let at = naive - zoneOffsetMs(zone, naive);
  at = naive - zoneOffsetMs(zone, at);
  return new Date(at).toISOString();
}

/** A row as the screens read one: ids and money as numbers, times as moments. */
export function rowOf(row: Record<string, unknown>, zone: string | null = null): Row {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if ((k === "id" || k.endsWith("_id")) && typeof v === "string" && /^\d+$/.test(v)) out[k] = Number(v);
    else if (BOOLS.has(k) && v !== null && v !== undefined) out[k] = yes(v);
    // Money by its name, when it is a number: a message's `due` is a moment, a ticket's is money.
    else if (MONEY.has(k) && typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v)) out[k] = Number(v);
    else if (zone !== null && typeof v === "string" && WALL.test(v)) out[k] = wallToIso(v, zone);
    else out[k] = v;
  }
  return out as Row;
}

/** The transport's refusal as the screens read one: its status, its code, what it said beside. */
export function asApiError(error: unknown): unknown {
  if (error instanceof SessionPortError) {
    const details = error.details !== null && typeof error.details === "object" && !Array.isArray(error.details) ? (error.details as Record<string, unknown>) : {};
    return new ApiError(error.status, error.code, { ...details }, error.message);
  }
  return error;
}

async function answer<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw asApiError(error);
  }
}

const refusedAs = (error: unknown, code: string) => error instanceof SessionPortError && error.code === code;

/** A code as Adminium compares one: capitals, no spaces or dashes, O as 0, I and L as 1. */
export const normalizeCode = (text: string): string => text.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");

/** The `Where` conditions the screens ask, in the data API's filter grammar. */
export function filterOf(where: Where[] = [], any: Where[] = []): string | null {
  const one = (w: Where): Record<string, unknown>[] => {
    const out: Record<string, unknown>[] = [];
    if (w.eq !== undefined) out.push({ column: w.column, op: "eq", value: w.eq });
    if (w.in !== undefined) out.push({ column: w.column, op: "in", value: w.in });
    if (w.isNull === true) out.push({ column: w.column, op: "is_null" });
    if (w.isNull === false) out.push({ column: w.column, op: "not_null" });
    for (const op of ["gte", "lte", "gt", "lt"] as const) if (w[op] !== undefined) out.push({ column: w.column, op, value: w[op] });
    if (w.like !== undefined) out.push({ column: w.column, op: "ilike", value: `%${w.like}%` });
    return out;
  };
  const all = where.flatMap(one);
  const or = any.flatMap(one);
  if (or.length > 0) all.push(or.length === 1 ? or[0]! : { or });
  if (all.length === 0) return null;
  return encodeURIComponent(JSON.stringify(all.length === 1 ? all[0] : { and: all }));
}

interface Page {
  data: Record<string, unknown>[];
  page?: { total?: number | null };
}

export interface StaffOptions {
  /** Where signing out lands. */
  leave?: (url: string) => void;
  /** Test seam: how a write waits out the person's rate limit. */
  sleep?: (ms: number) => Promise<void>;
}

/**
 * A box-office write refused for rate (429) is sent again, the same request, once the person's bucket has
 * room: Adminium answers 429 before it runs anything, so nothing was written and a resend cannot write
 * twice. A long run (a show cancelled, a message to hundreds) goes at the pace the bucket allows instead
 * of stopping part-way. The door's own writes are never held back here: a scan must answer at once.
 */
const WRITE_RATE_TRIES = 8;
const WRITE_RATE_WAIT_MS = 5_000;
const WRITE_RATE_WAIT_CAP_MS = 60_000;

/** How long a 429 on a write asks to wait: until the bucket's reset it names, else a default. */
export function writeRateWait(details: unknown, now = Date.now()): number {
  const reset = details !== null && typeof details === "object" ? Date.parse(String((details as { resetAt?: unknown }).resetAt ?? "")) : Number.NaN;
  if (Number.isNaN(reset)) return WRITE_RATE_WAIT_MS;
  return Math.min(WRITE_RATE_WAIT_CAP_MS, Math.max(1_000, reset - now + 250));
}

export class AdminiumStaff implements BoxOfficePort, DoorPort {
  private readonly t: SessionTransport;
  private readonly cfg: StaffConfig;
  private readonly opts: StaffOptions;

  /** The zone the server keeps zone-less times in. */
  private readonly serverZone: string;

  constructor(transport: SessionTransport, config: StaffConfig, options: StaffOptions = {}) {
    this.t = transport;
    this.cfg = config;
    this.opts = options;
    this.serverZone = config.serverTimezone ?? "UTC";
  }
  private row(r: Record<string, unknown>): Row {
    return rowOf(r, this.serverZone);
  }

  // ── the wire ──────────────────────────────────────────────────────────────

  private real(table: string): string {
    return this.cfg.tables[table] ?? `${APP_KEY}_${table}`;
  }
  private async path(table: string, rest = ""): Promise<string> {
    const conn = this.cfg.connectionId ?? (await this.t.connection());
    return `/api/v1/data/${encodeURIComponent(conn)}/${encodeURIComponent(this.real(table))}${rest}`;
  }
  /**
   * A write. The CSRF token is the session's: after a sign-in in another tab
   * the one this page holds is refused, and the write never happened — so it
   * is sent once more with a fresh token.
   */
  private async mutate<T>(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown, options?: CallOptions): Promise<T> {
    // The session's CSRF token is captured when the transport first finds its connection: a door phone's
    // first act can be a write (a scan), so it is found before one.
    this.found ??= this.t.connection();
    await this.found;
    // A write with a deadline (the door's) is never paced: at the door a refusal to wait is no signal, and is kept.
    const paced = options?.deadlineMs === undefined;
    const send = async (): Promise<T> => {
      try {
        return await this.t.mutate<T>(path, method, body, options);
      } catch (error) {
        if (!refusedAs(error, "CSRF_FAILED")) throw error;
        await this.t.refresh();
        return this.t.mutate<T>(path, method, body, options);
      }
    };
    for (let tries = 1; ; tries += 1) {
      try {
        return await send();
      } catch (error) {
        if (!paced || tries >= WRITE_RATE_TRIES || !(error instanceof SessionPortError) || error.status !== 429) throw error;
        await (this.opts.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))))(writeRateWait(error.details));
      }
    }
  }
  private async page(table: string, filter: string | null, limit: number, offset: number, order: string | null, counted = false, options?: CallOptions): Promise<Page> {
    const q = [`limit=${String(limit)}`, `offset=${String(offset)}`, ...(counted ? ["count=exact"] : []), ...(filter === null ? [] : [`where=${filter}`]), ...(order === null ? [] : [`order=${encodeURIComponent(order)}`])];
    return this.t.get<Page>(await this.path(table, `?${q.join("&")}`), options);
  }
  private async one(table: string, id: Id, options?: CallOptions): Promise<Row> {
    return this.row((await this.t.get<{ data: Record<string, unknown> }>(await this.path(table, `/${encodeURIComponent(String(id))}`), options)).data);
  }
  private async insert(table: string, values: Record<string, unknown>, extra: Record<string, unknown> = {}, options?: CallOptions): Promise<Row> {
    return this.row((await this.mutate<{ data: Record<string, unknown> }>(await this.path(table), "POST", { values, ...extra }, options)).data);
  }
  private async change(table: string, id: Id, values: Record<string, unknown>, extra: Record<string, unknown> = {}, options?: CallOptions): Promise<Row> {
    return this.row((await this.mutate<{ data: Record<string, unknown> }>(await this.path(table, `/${encodeURIComponent(String(id))}`), "PATCH", { values, ...extra }, options)).data);
  }
  /** Adminium's clock, from the config's `now` (never the phone's). */
  private now(): number {
    const said = typeof this.cfg.now === "string" ? Date.parse(this.cfg.now) : Number.NaN;
    return Number.isNaN(said) ? Date.now() : said + (Date.now() - this.loadedAt);
  }
  private readonly loadedAt = Date.now();
  private found: Promise<string> | null = null;

  // ── who, and the venue ────────────────────────────────────────────────────

  async me(): Promise<StaffPerson> {
    const prefix = `${APP_KEY}-`;
    const roles = (this.cfg.access?.roles ?? []).map((r) => (r.slug.startsWith(prefix) ? r.slug.slice(prefix.length) : r.slug));
    return { name: this.cfg.user?.name ?? "", roles, email: this.cfg.user?.email ?? null, tables: this.cfg.access === null || this.cfg.access === undefined ? null : { ...this.cfg.access.tables } };
  }

  async config(): Promise<Config> {
    return {
      timezone: this.cfg.timezone ?? this.cfg.serverTimezone ?? "UTC",
      currency: this.cfg.currency ?? "",
      now: new Date(this.now()).toISOString(),
    };
  }

  rows(table: string): Promise<Row[]> {
    return answer(async () => (await this.list(table, { limit: MOST_ROWS })).rows);
  }

  list(table: string, query: ListQuery = {}): Promise<ListReply> {
    return answer(async () => {
      const filter = filterOf(query.where, query.any);
      const order = query.sort === undefined || query.sort.length === 0 ? null : query.sort.slice(0, 3).map((s) => `${s.column}.${s.desc === true ? "desc" : "asc"}`).join(",");
      const want = Math.min(query.limit ?? 50, MOST_ROWS);
      const rows: Row[] = [];
      let total = 0;
      // Only a count asked for (a chip's number): Adminium counts; the one row that comes with it goes unused.
      if (want === 0) return { rows, total: (await this.page(table, filter, 1, 0, null, true)).page?.total ?? 0 };
      const start = query.offset ?? 0;
      for (let offset = start; rows.length < want; offset += PAGE) {
        const size = Math.min(PAGE, want - rows.length);
        // The first page is counted: "Showing 50 of 812" needs the whole, not what came back.
        const got = await this.page(table, filter, size, offset, order, offset === start);
        total = got.page?.total ?? total;
        rows.push(...got.data.map((r) => this.row(r)));
        if (got.data.length < size) break;
      }
      // Asked for every row and there are more than one read brings back: said, never cut short quietly.
      if (want === MOST_ROWS && total > rows.length) throw new ApiError(413, "TOO_MANY_ROWS", { table, total, read: rows.length });
      return { rows, total: Math.max(total, rows.length) };
    });
  }

  count(table: string, where: Where[] = []): Promise<number> {
    return answer(async () => {
      const filter = filterOf(where);
      const got = await this.t.get<Page>(await this.path(table, `?limit=1&count=exact${filter === null ? "" : `&where=${filter}`}`));
      return got.page?.total ?? got.data.length;
    });
  }

  /**
   * A record's history is Adminium's audit, which an app's roles cannot read:
   * the box office tells an order's story from the rows' own stamps.
   */
  async history(): Promise<HistoryEntry[]> {
    return [];
  }

  counts(eventId: Id): Promise<PoolCount[]> {
    return answer(async () => {
      const got = await this.t.get<{ data: { rows: { id: string; size: number | null; taken: number; held?: number; kept?: number; left?: number; also?: { key: string; size: number | null; taken: number; held?: number }[] }[] } }>(
        await this.path("tickets", `/capacity-counts?rule=0&under=event_id&value=${encodeURIComponent(String(eventId))}`),
      );
      const rows = got.data.rows;
      const out: PoolCount[] = rows.map((r) => {
        const held = r.held ?? 0;
        const size = r.size ?? 0;
        return { event_id: eventId, ticket_type_id: Number(r.id), size, taken: r.taken - held, held, reserved: r.kept ?? 0, left: r.left ?? size - r.taken };
      });
      // The show's own pool, when it has a sale limit.
      const show = rows[0]?.also?.[0];
      if (show !== undefined && show.size !== null) {
        const held = show.held ?? 0;
        out.push({ event_id: eventId, ticket_type_id: null, size: show.size, taken: show.taken - held, held, reserved: rows.reduce((a, r) => a + (r.kept ?? 0), 0), left: show.size - show.taken });
      }
      return out;
    });
  }

  // ── writes ────────────────────────────────────────────────────────────────

  create(table: string, values: Record<string, unknown>): Promise<Row> {
    return answer(() => this.insert(table, values));
  }
  update(table: string, id: Id, values: Record<string, unknown>, from?: string): Promise<Row> {
    return answer(() => this.change(table, id, values, from === undefined ? {} : { from }));
  }
  remove(table: string, id: Id): Promise<void> {
    return answer(async () => {
      await this.mutate(await this.path(table, `/${encodeURIComponent(String(id))}`), "DELETE");
    });
  }

  /**
   * A show saved with its days, types, acts and questions in one write. Each
   * list is the whole list: a row left out goes (a sold type is refused).
   */
  saveEvent(id: Id | null, values: Record<string, unknown>, children: Partial<EventChildren>): Promise<Row> {
    return answer(async () => {
      const kids: Record<string, { key?: { id: Id }; values: Record<string, unknown> }[]> = {};
      for (const [table, rows] of Object.entries(children) as [keyof EventChildren, Record<string, unknown>[]][]) {
        const rel = await this.t.relation(this.real(table), "event_id");
        kids[rel] = rows.map((row) => {
          const { id: rowId, ...rest } = row as { id?: Id } & Record<string, unknown>;
          return rowId === undefined || rowId === null ? { values: rest } : { key: { id: rowId }, values: rest };
        });
      }
      const body = { values, children: kids };
      const saved = id === null ? await this.mutate<{ data: Record<string, unknown> }>(await this.path("events"), "POST", body) : await this.mutate<{ data: Record<string, unknown> }>(await this.path("events", `/${encodeURIComponent(String(id))}`), "PATCH", body);
      return this.row(saved.data);
    });
  }

  mail(kind: string, rows: Record<string, unknown>[]): Promise<void> {
    return answer(async () => {
      for (const row of rows) await this.insert("messages", { kind, ...row });
    });
  }

  /**
   * The emails of a message to a show's buyers, one an order and one to each friend holding a ticket (a row that
   * names its ticket: the friend's own kind): only those it does not have yet (a send
   * that stopped part-way is finished, nobody twice), a few at a time.
   */
  private async queueBroadcast(b: Row, to: Record<string, unknown>[]): Promise<void> {
    const had = await this.list("messages", { where: [{ column: "broadcast_id", eq: b.id }], limit: MOST_ROWS });
    const done = new Set(had.rows.map(recipientKey));
    const missing = to.filter((row) => !done.has(recipientKey(row)));
    for (let i = 0; i < missing.length; i += 4) {
      await Promise.all(missing.slice(i, i + 4).map((row) => this.insert("messages", { kind: broadcastKind(b, row), event_id: b["event_id"], broadcast_id: b.id, ...row })));
    }
  }

  broadcast(values: Record<string, unknown>, to: Record<string, unknown>[], send: boolean): Promise<Row> {
    return answer(async () => {
      const made = await this.insert("broadcasts", { ...values, status: "waiting" });
      return send ? this.sendNow(made, {}, to) : made;
    });
  }

  sendBroadcast(id: Id, values: Record<string, unknown>, to: Record<string, unknown>[]): Promise<Row> {
    return answer(async () => this.sendNow(await this.one("broadcasts", id), values, to));
  }

  /** Claimed (waiting → sending: a second sender is refused), its emails written, then sent. */
  private async sendNow(b: Row, values: Record<string, unknown>, to: Record<string, unknown>[]): Promise<Row> {
    // One that stopped part-way keeps the words some people already have.
    const claimed = b["status"] === "sending" ? b : await this.change("broadcasts", b.id, { ...values, status: "sending" }, { from: "waiting" });
    await this.queueBroadcast(claimed, to);
    return this.change("broadcasts", b.id, { status: "sent" }, { from: "sending" });
  }

  exportFormats(): string[] {
    return ["csv", "json"];
  }

  /** A show's poster, uploaded onto the show itself (a file not linked to its row is swept). */
  uploadPoster(file: File, eventId: Id | null): Promise<string> {
    return answer(async () => {
      if (eventId === null) throw new ApiError(409, "SAVE_FIRST", {}, "Save the show first, then add its poster.");
      const conn = this.cfg.connectionId ?? (await this.t.connection());
      const tableId = await this.t.tableId(this.real("events"));
      const q = new URLSearchParams({ filename: file.name, connectionId: conn, table: tableId, column: "image", recordId: String(eventId) });
      // The file's own bytes (the transport speaks JSON): the session's cookie, and its CSRF token.
      const res = await fetch(`/api/v1/files?${q.toString()}`, { method: "POST", body: file, headers: { "content-type": file.type || "application/octet-stream", "x-adminium-csrf": this.t.csrf?.() ?? this.cfg.csrfToken ?? "" } });
      const body = (await res.json().catch(() => ({}))) as { ref?: string; error?: { code?: string; message?: string; details?: Record<string, unknown> } };
      if (!res.ok || typeof body.ref !== "string") throw new ApiError(res.status, body.error?.code ?? "UPLOAD_FAILED", body.error?.details ?? {}, body.error?.message ?? "The poster did not upload.");
      const got = { ref: body.ref };
      await this.change("events", eventId, { image: got.ref });
      return got.ref;
    });
  }

  signOut(): Promise<void> {
    return answer(async () => {
      try {
        await this.t.mutate("/api/v1/auth/logout", "POST");
      } finally {
        const next = typeof window === "undefined" ? "/" : window.location.pathname;
        (this.opts.leave ?? ((url: string) => window.location.assign(url)))(`/login?next=${encodeURIComponent(next)}`);
      }
    });
  }

  // ── orders ────────────────────────────────────────────────────────────────

  /** An order's write: its show's room with it (Adminium checks the order agrees with its show), its tickets below it. */
  private async orderWrite(body: OrderBody): Promise<{ values: Record<string, unknown>; children: Record<string, { values: Record<string, unknown> }[]> }> {
    const event = await this.one("events", body.values["event_id"] as Id);
    const rel = await this.t.relation(this.real("tickets"), "order_id");
    return {
      values: { channel: "box_office", ...body.values, room_id: event["room_id"] ?? null },
      children: { [rel]: body.tickets.map((t) => ({ values: { ...t } })) },
    };
  }

  quote(body: OrderBody): Promise<QuoteReply> {
    return answer(async () => {
      const write = await this.orderWrite(body);
      const got = await this.mutate<{ data: Record<string, unknown>; children?: Record<string, { data: Record<string, unknown> }[]> }>(await this.path("orders", "/dry-run"), "POST", write);
      const lines = Object.values(got.children ?? {})[0] ?? [];
      return { data: this.row(got.data), tickets: lines.map((c) => this.row(c.data)) };
    });
  }

  newOrder(body: OrderBody, clientKey: string): Promise<OrderReply> {
    return answer(async () => {
      const write = await this.orderWrite(body);
      const reply = await this.mutate<{ data: Record<string, unknown>; replayed?: boolean }>(await this.path("orders"), "POST", {
        ...write,
        clientKey,
        ...(body.expect === undefined ? {} : { expect: { total: body.expect.total.toFixed(2) } }),
      });
      const data = this.row(reply.data);
      // The create answers the order alone: its tickets are read after it.
      const tickets = (await this.list("tickets", { where: [{ column: "order_id", eq: data.id }], sort: [{ column: "id" }], limit: 200 })).rows;
      return { data, tickets, ...(reply.replayed === true ? { replayed: true as const } : {}) };
    });
  }

  move(orderId: Id, status: string, values: Record<string, unknown> = {}, from?: string): Promise<Row> {
    return answer(() => this.change("orders", orderId, { ...values, status }, from === undefined ? {} : { from }));
  }

  recordPayment(orderId: Id, amount: number, method: "bank_transfer" | "card" | "cash", note: string | null = null, key?: string): Promise<Row> {
    return answer(() => this.keyed("payments", { order_id: orderId, amount: amount.toFixed(2), method, note }, key));
  }

  recordRefund(orderId: Id, amount: number, method: "bank_transfer" | "card" | "cash", kind: "cancelled_tickets" | "goodwill", key?: string): Promise<Row> {
    return answer(() => this.keyed("refunds", { order_id: orderId, amount: amount.toFixed(2), method, kind }, key));
  }

  /**
   * Money written once per press: the row carries the press's key, which is unique, so a press sent again
   * (its first answer lost) is refused as already there and answered with the row it made.
   */
  private async keyed(table: string, values: Record<string, unknown>, key: string | undefined): Promise<Row> {
    if (key === undefined) return this.insert(table, values);
    try {
      return await this.insert(table, { ...values, client_key: key });
    } catch (error) {
      if (!refusedAs(error, "UNIQUE_VIOLATION")) throw error;
      const made = (await this.list(table, { where: [{ column: "client_key", eq: key }], limit: 1 })).rows[0];
      if (made === undefined) throw error;
      return made;
    }
  }

  /** Tickets cancelled, each its own write: on a show with a waitlist their places go to it. */
  cancelTickets(ticketIds: Id[], cause: "box_office" | "request"): Promise<void> {
    return answer(async () => {
      const shows = new Map<Id, boolean>();
      for (const id of ticketIds) {
        const ticket = await this.one("tickets", id);
        const eventId = ticket["event_id"] as Id;
        if (!shows.has(eventId)) shows.set(eventId, yes((await this.one("events", eventId))["waitlist_on"]));
        await this.change("tickets", id, { status: shows.get(eventId) === true ? "returned" : "cancelled", cancel_cause: cause }, { from: ticket["status"] });
      }
    });
  }

  declineRefund(ticketId: Id): Promise<Row> {
    return answer(() => this.change("tickets", ticketId, { status: "valid", refund_declined_at: new Date(this.now()).toISOString() }, { from: "refund_asked" }));
  }

  /**
   * The places back offered to the next people, in joining order (the next is offered what is back): for
   * each, an order made of the types that came back, moved to offered (which starts its time), and the
   * waitlist place moved to offered with its offer's order.
   */
  offerWaitlist(eventId: Id): Promise<Row[]> {
    return answer(async () => {
      const returned = (await this.list("tickets", { where: [{ column: "event_id", eq: eventId }, { column: "status", eq: "returned" }], limit: MOST_ROWS })).rows;
      const offeredOrders = (await this.list("orders", { where: [{ column: "event_id", eq: eventId }, { column: "status", eq: "offered" }], limit: MOST_ROWS })).rows;
      const offeredTickets = offeredOrders.length === 0 ? [] : (await this.list("tickets", { where: [{ column: "order_id", in: offeredOrders.map((o) => o.id) }], limit: MOST_ROWS })).rows;
      const plan = offerPlan(returned, offeredTickets, await this.counts(eventId));
      const queue = (await this.list("waitlist", { where: [{ column: "event_id", eq: eventId }, { column: "status", eq: "waiting" }], sort: [{ column: "joined_at" }], limit: 500 })).rows;
      const offers: Row[] = [];
      for (const entry of queue) {
        const tickets = plan.take(Number(entry["qty"]));
        if (tickets.length === 0) break;
        const made = await this.newOrder(
          { values: { event_id: eventId, channel: "box_office", email: entry["email"], customer_id: entry["customer_id"], waitlist_id: entry.id }, tickets: tickets.map((ticket_type_id) => ({ ticket_type_id })) },
          `offer-${String(entry.id)}-${String(this.now())}-${Math.random().toString(36).slice(2, 10)}`,
        );
        offers.push(await this.change("orders", made.data.id, { status: "offered" }, { from: "held" }));
        await this.change("waitlist", entry.id, { status: "offered", order_id: made.data.id }, { from: "waiting" });
      }
      return offers;
    });
  }

  /** A show and its live orders cancelled, each order its own write; their emails held until sent. */
  cancelShow(eventId: Id): Promise<void> {
    return cancelShowOrders(this, eventId);
  }

  // ── the door ──────────────────────────────────────────────────────────────
  //
  // Every request the door makes while someone waits is given a short deadline: past it the scan is judged from
  // the list on the phone and sent later (a hung request is no signal, not a refusal).

  find(code: string, eventDayId: Id): Promise<{ ticket: Row; order: Row; checkIn: Row | null } | null> {
    return answer(async () => {
      const n = normalizeCode(code);
      if (!/^[0-9A-Z]{8}$/.test(n)) return null;
      // Codes are kept as drawn: the sample's with a dash, Adminium's own without.
      const got = await this.page("tickets", filterOf([], [{ column: "code", eq: n }, { column: "code", eq: `${n.slice(0, 4)}-${n.slice(4)}` }]), 1, 0, null, false, HURRY);
      const first = got.data[0];
      if (first === undefined) return null;
      const ticket = this.row(first);
      const [order, ins] = await Promise.all([
        this.one("orders", ticket["order_id"] as Id, HURRY),
        this.page("check_ins", filterOf([{ column: "ticket_id", eq: ticket.id }, { column: "event_day_id", eq: eventDayId }]), 1, 0, null, false, HURRY),
      ]);
      const checkIn = ins.data[0];
      return { ticket, order, checkIn: checkIn === undefined ? null : this.row(checkIn) };
    });
  }

  /** A ticket's door money taken; the order paid by the door itself once nothing is owed. */
  collect(ticketId: Id, method: "card" | "cash", deviceId: Id | null, occurredAt?: number): Promise<Row> {
    return answer(async () => {
      const made = await this.insert("door_collections", { ticket_id: ticketId, method, device_id: deviceId }, occurredAt === undefined ? {} : { occurredAt: new Date(occurredAt).toISOString() }, HURRY);
      await this.settleOrder(made["order_id"] as Id, method);
      return made;
    });
  }

  settle(orderId: Id, method: "card" | "cash"): Promise<Row> {
    return answer(() => this.settleOrder(orderId, method));
  }

  /**
   * The step after any money the door took: the order read, and moved to paid
   * when nothing is owed any more — from held (a door sale, which never needs
   * the pay-at-the-door state) or from the door. Its own step, so a
   * collection whose answer was lost, replayed later, still pays its order.
   */
  private async settleOrder(orderId: Id, method: "card" | "cash"): Promise<Row> {
    const order = await this.one("orders", orderId, HURRY);
    const from = String(order["status"] ?? "");
    if ((from !== "door" && from !== "held") || Number(order["balance"] ?? 0) > 0) return order;
    try {
      return await this.change("orders", order.id, { status: "paid", paid_method: method }, { from }, HURRY);
    } catch (error) {
      // Another phone paid it off a moment ago: it is paid either way.
      if (!refusedAs(error, "STATE_MOVE_REFUSED") && !refusedAs(error, "STATE_UNCHANGED")) throw error;
      return this.one("orders", orderId, HURRY);
    }
  }

  checkIn(ticketId: Id, eventDayId: Id, deviceId: Id | null, occurredAt?: number): Promise<Row> {
    return answer(() => this.insert("check_ins", { ticket_id: ticketId, event_day_id: eventDayId, device_id: deviceId }, occurredAt === undefined ? {} : { occurredAt: new Date(occurredAt).toISOString() }, HURRY));
  }

  undo(checkInId: Id): Promise<void> {
    return answer(async () => {
      await this.mutate(await this.path("check_ins", `/${encodeURIComponent(String(checkInId))}`), "DELETE", undefined, HURRY);
    });
  }

  ping(): Promise<void> {
    return answer(async () => {
      await this.page("devices", null, 1, 0, null, false, HURRY);
    });
  }

  onSessionEnded(listener: () => void): void {
    this.t.onSessionEnded?.(() => listener());
  }

  signInAgain(): void {
    const next = typeof window === "undefined" ? "/" : window.location.pathname;
    (this.opts.leave ?? ((url: string) => window.location.assign(url)))(`/login?next=${encodeURIComponent(next)}`);
  }
}

