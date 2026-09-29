/**
 * THE DEMO'S ADMINIUM — what the server decides on every write, in memory.
 *
 * The website's demo has no server, so a write in the demo goes through this
 * instead of the APIs, and comes out as Adminium would have left it:
 *
 *   1. every figure: each copy, formula and total, by the manifest's own
 *      rules (the sample loader's `RULES`), settled after every write;
 *   2. the limits: a ticket type sells no more than its size and a show no
 *      more than its room less its guest places, a checkout and an offer hold
 *      their places until their time runs out, a place the waitlist is owed
 *      counts for the public and not for the box office, a type sells only
 *      inside its window and no more than its most a order; a guest list keeps
 *      no more people than its places; a ticket's door money is taken once; a
 *      code is used no more times than it allows;
 *   3. the states: one listed move at a time, each with what it waits for
 *      (nothing owed, a switch in Settings, a time, a linked row), a new row's
 *      own conditions (a check-in's show, day, ticket and window), the moves
 *      the clock makes, and the waitlist entry that follows its offer;
 *   4. the stamps (when, who, a hold's end, a transfer's deadline), the
 *      running order number, a code looked up by what was typed, the codes the
 *      server draws, the unique column sets;
 *   5. the emails the producers queue (as rows in the outbox).
 *
 * Refusals carry the server's own status, code and params
 * (`STATE_MOVE_REFUSED`, `CAPACITY_FULL`, `PUBLIC_SOLD_OUT`,
 * `PUBLIC_WRITE_REFUSED`, `UNIQUE_VIOLATION` …), so a screen says the same
 * words it would against Adminium. A refused write leaves nothing behind.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import { COLUMNS, NOW, REQUIRED, RULES, settle } from "../data/sampleRows.ts";
import { ApiError, type Id, type PoolCount, type Row, type TypeLeft } from "../data/wire.ts";
import { plusDays, toMs, venueDay, wallTime } from "../lib/venueTime.ts";
import { normalizeCode, randomCode } from "./codes.ts";
import { MANIFEST_RULES } from "./rules.ts";
import { DEMO_NUMBER_START, type Table, type World } from "./world.ts";

/** Who is writing, and through which door — what the stamps, the moves and the limits read. */
export interface Writer {
  /** `public`: the audience site; `staff`: the box office or the door; `automation`: the clock. */
  origin: "public" | "staff" | "automation";
  name: string | null;
  roles: readonly string[];
  /** A scan made offline, replayed later: judged at the time it was made (staff only, up to six hours back). */
  occurredAt?: number;
}

export const CLOCK: Writer = { origin: "automation", name: "Timed move", roles: [] };

type Json = Record<string, unknown>;
type Condition = { column: string; eq?: unknown; in?: unknown[]; isNull?: boolean; lte?: number; gt?: number };
type Moment = { column: string; via?: string; time?: unknown; plus?: Json; minus?: Json; or?: Moment[] };
type Move = string | { to: string; requires?: Requires; roles?: string[] };
interface Requires {
  where?: Condition[];
  linked?: { via: string; where: Condition[] }[];
  setting?: { table: string; column: string; eq: unknown }[];
  time?: { after?: Moment; before?: Moment };
}
interface States {
  column: string;
  initial: string;
  strict?: boolean;
  moves: Record<string, Move[]>;
  timed?: { from: string; to: string; at: Moment; set?: Json }[];
  effects?: { on: { to: string }; via: string; set: Json }[];
  create?: { requires: Requires };
}

const RULE_SET = MANIFEST_RULES as unknown as {
  stamps: Record<string, Record<string, { set: unknown; on: unknown }>>;
  renewals: Record<string, Record<string, { column: string; changed: true }>>;
  uniques: Record<string, string[][]>;
  capacity: Record<string, Json>;
  states: Record<string, States>;
  roles: { key: string; grants: Record<string, string[]>; limits: Record<string, { writable?: string[]; writableValues?: Record<string, unknown[]> }> | null }[];
  producers: Json[];
};

/** An order's states whose tickets count for good: no hold ends them. */
const COUNTED = ["door", "awaiting_transfer", "overdue", "no_charge", "paid"];
const iso = (ms: number) => new Date(ms).toISOString();

export function holds(row: Readonly<Record<string, unknown>>, c: Condition): boolean {
  const value = row[c.column];
  if (c.isNull !== undefined) return c.isNull ? value === null || value === undefined : value !== null && value !== undefined;
  if (c.in !== undefined) return c.in.includes(value as never);
  if (c.lte !== undefined) return Number(value ?? 0) <= c.lte;
  if (c.gt !== undefined) return Number(value ?? 0) > c.gt;
  if (typeof c.eq === "boolean") return value === c.eq || value === (c.eq ? 1 : 0);
  return value === c.eq || (typeof c.eq === "number" && Number(value) === c.eq);
}

/** Which of the refusals' conditions failed first, named as the server names it. */
const requiresName = (c: Condition) => c.column;

export class Engine {
  readonly world: World;

  constructor(world: World) {
    this.world = world;
  }

  get now(): number {
    return this.world.now;
  }

  settings(): Row {
    return this.world.all("settings")[0]!;
  }

  setting(column: string): unknown {
    return this.settings()[column];
  }

  // ── moments ─────────────────────────────────────────────────────────────────

  private amount(value: unknown): number {
    if (typeof value === "number") return value;
    if (typeof value === "object" && value !== null && "column" in value) return Number(this.setting((value as { column: string }).column) ?? 0);
    return 0;
  }

  /** A moment of a row (or the row its link names), shifted; the first that is found of it and its fallbacks. */
  moment(table: Table, row: Readonly<Record<string, unknown>>, m: Moment): number | null {
    const source = m.via === undefined ? row : this.linked(table, row, m.via);
    let at = source === undefined ? null : toMs(source[m.column]);
    if (at !== null && typeof m.time === "string") {
      const day = venueDay(at, this.world.zone);
      at = wallTime(day, m.time, this.world.zone);
    }
    if (at !== null) {
      const shift = m.plus ?? m.minus;
      if (shift !== undefined) {
        const sign = m.plus !== undefined ? 1 : -1;
        if (shift["minutes"] !== undefined) at += sign * this.amount(shift["minutes"]) * 60_000;
        else if (shift["hours"] !== undefined) at += sign * this.amount(shift["hours"]) * 3_600_000;
        else if (shift["days"] !== undefined) at = plusDays(at, sign * this.amount(shift["days"]), this.world.zone);
      }
      return at;
    }
    for (const fallback of m.or ?? []) {
      const found = this.moment(table, row, fallback);
      if (found !== null) return found;
    }
    return null;
  }

  /** The row a foreign key of `row` names. */
  linked(table: Table, row: Readonly<Record<string, unknown>>, via: string): Row | undefined {
    const target = this.references(table, via);
    const id = row[via];
    return target === undefined || id === null || id === undefined ? undefined : this.world.get(target, id as Id);
  }

  /** The table a column of `table` references. */
  references(table: Table, column: string): Table | undefined {
    const copy = RULES.copies.find((c) => c.table === table && c.via === column);
    if (copy !== undefined) return copy.parent as Table;
    const known: Record<string, Table> = {
      event_id: "events",
      order_id: "orders",
      ticket_id: "tickets",
      ticket_type_id: "ticket_types",
      event_day_id: "event_days",
      waitlist_id: "waitlist",
      room_id: "rooms",
      customer_id: "customers",
      holder_customer_id: "customers",
      code_id: "codes",
      device_id: "devices",
    };
    return known[column];
  }

  // ── writes ──────────────────────────────────────────────────────────────────

  /** Everything a write does, or nothing: a refusal puts every row back. */
  transaction<T>(work: () => T): T {
    const restore = this.world.snapshot();
    this.world.hold();
    try {
      const out = work();
      this.world.commit();
      return out;
    } catch (error) {
      restore();
      throw error;
    }
  }

  /** The instant a write is judged at: now, or the scan's own time when an offline scan is replayed. */
  private judgedAt(writer: Writer): number {
    if (writer.origin === "staff" && writer.occurredAt !== undefined) {
      if (writer.occurredAt < this.now - 6 * 3_600_000 || writer.occurredAt > this.now) throw new ApiError(422, "VALIDATION_FAILED", { fields: { occurredAt: "out of range" } });
      return writer.occurredAt;
    }
    return this.now;
  }

  /** A new row, with the rows it carries (an order's tickets). */
  create(table: Table, values: Record<string, unknown>, writer: Writer, children: { table: Table; via: string; rows: Record<string, unknown>[] } | null = null): { row: Row; children: Row[] } {
    return this.transaction(() => {
      const usage = this.usage(writer, table === "orders" || table === "tickets" ? [values["event_id"] as Id | undefined] : []);
      const row = this.insertOne(table, values, writer);
      const made = (children?.rows ?? []).map((child) => this.insertOne(children!.table, { ...child, [children!.via]: row.id }, writer));
      this.settleAll();
      for (const r of [row, ...made]) {
        const t = r === row ? table : children!.table;
        this.judgeCreate(t, this.world.get(t, r.id)!, writer);
      }
      this.judgeLimits([{ table, row }, ...made.map((r) => ({ table: children!.table, row: r }))], writer, true, usage);
      this.judgeUniques(table);
      if (children !== null) this.judgeUniques(children.table);
      this.produce(table, null, this.world.get(table, row.id)!);
      for (const r of made) this.produce(children!.table, null, this.world.get(children!.table, r.id)!);
      return { row: { ...this.world.get(table, row.id)! }, children: made.map((r) => ({ ...this.world.get(children!.table, r.id)! })) };
    });
  }

  /**
   * Many rows of one table at once (the demo's early door scans), each by its
   * own writer and judged as its own create would be — the venue settled once,
   * not once a row. All of them or none.
   */
  createMany(table: Table, items: { values: Record<string, unknown>; writer: Writer }[]): Row[] {
    return this.transaction(() => {
      const made = items.map((it) => ({ it, usage: this.usage(it.writer, []), row: this.insertOne(table, it.values, it.writer) }));
      this.settleAll();
      for (const m of made) {
        this.judgeCreate(table, this.world.get(table, m.row.id)!, m.it.writer);
        this.judgeLimits([{ table, row: m.row }], m.it.writer, true, m.usage);
      }
      this.judgeUniques(table);
      for (const m of made) this.produce(table, null, this.world.get(table, m.row.id)!);
      return made.map((m) => ({ ...this.world.get(table, m.row.id)! }));
    });
  }

  private insertOne(table: Table, values: Record<string, unknown>, writer: Writer): Row {
    const shape = COLUMNS[table] ?? {};
    const record: Record<string, unknown> = {};
    for (const [column, fill] of Object.entries(shape)) {
      if (values[column] !== undefined) record[column] = values[column];
      else if (fill === REQUIRED) throw new ApiError(422, "VALIDATION_FAILED", { column, reason: "required" });
      else record[column] = fill === NOW ? iso(this.now) : fill;
    }
    // Copies through the row's links.
    for (const copy of RULES.copies) {
      if (copy.table !== table) continue;
      const source = this.linked(table, record, copy.via);
      if (source !== undefined) record[copy.column] = source[copy.from];
    }
    // A code found by what was typed.
    if (table === "orders") this.lookUpCode(record, writer);
    // The running number and the codes the server draws.
    for (const sequence of RULES.sequences) {
      if (sequence.table !== table) continue;
      const taken = this.world.all(table).map((r) => Number(r[sequence.column] ?? 0));
      record[sequence.column] = Math.max(DEMO_NUMBER_START - 1, ...taken) + 1;
    }
    for (const format of RULES.formats) {
      if (format.table === table && typeof record[format.from] === "number") record[format.column] = `${format.prefix ?? ""}${String(record[format.from])}`;
    }
    for (const code of RULES.codes) {
      if (code.table !== table || record[code.column] !== null) continue;
      record[code.column] = code.column === "code" ? randomCode(8, true) : randomCode(16);
    }
    // The stamps a create writes.
    this.stamp(table, null, record, writer);
    const states = RULE_SET.states[table];
    if (states !== undefined && (record[states.column] === null || record[states.column] === undefined)) record[states.column] = states.initial;
    const row = this.world.insert(table, record);
    this.world.note({ at: iso(this.judgedAt(writer)), by: writer.name, table, id: row.id, op: "insert", changes: { ...values } });
    return row;
  }

  /** `orders.code_id` from `code_text`: an active code, in date, for this show or its room (or every show). */
  private lookUpCode(record: Record<string, unknown>, writer: Writer): void {
    const typed = record["code_text"];
    if (typeof typed !== "string" || typed.trim() === "") return;
    const wanted = normalizeCode(typed);
    const found = this.world.all("codes").find((code) => {
      if (normalizeCode(String(code["code"])) !== wanted || code["active"] !== true) return false;
      const until = toMs(code["valid_until"]);
      if (until !== null && until < this.now) return false;
      if (code["event_id"] !== null && code["event_id"] !== record["event_id"]) return false;
      if (code["room_id"] !== null && code["room_id"] !== record["room_id"]) return false;
      return true;
    });
    if (found === undefined) throw new ApiError(400, writer.origin === "public" ? "PUBLIC_WRITE_REFUSED" : "VALIDATION_FAILED", { column: "code_text", reason: "unknown" });
    record["code_id"] = found.id;
  }

  /** A change to a row. */
  update(table: Table, id: Id, values: Record<string, unknown>, writer: Writer): Row {
    return this.transaction(() => this.updateOne(table, id, values, writer));
  }

  private updateOne(table: Table, id: Id, values: Record<string, unknown>, writer: Writer): Row {
    const stored = this.world.get(table, id);
    if (stored === undefined) throw new ApiError(404, writer.origin === "public" ? "PUBLIC_REF_NOT_FOUND" : "NOT_FOUND", { table, id });
    this.judgeRole(table, values, writer);
    const before = { ...stored };
    const states = RULE_SET.states[table];
    const moving = states !== undefined && values[states.column] !== undefined && values[states.column] !== before[states.column];
    if (states !== undefined && values[states.column] !== undefined && !moving && states.strict === true && writer.origin === "public") {
      throw new ApiError(400, "PUBLIC_WRITE_REFUSED", { column: states.column, reason: "unchanged" });
    }
    let move: Exclude<Move, string> | null = null;
    if (moving) {
      const from = String(before[states!.column]);
      const to = String(values[states!.column]);
      const listed = (states!.moves[from] ?? []).find((m) => (typeof m === "string" ? m : m.to) === to);
      if (listed === undefined) throw new ApiError(409, "STATE_MOVE_REFUSED", { from, to, column: states!.column });
      move = typeof listed === "string" ? { to } : listed;
      if (move.roles !== undefined && writer.origin === "staff" && !move.roles.some((r) => writer.roles.includes(r))) {
        throw new ApiError(409, "STATE_MOVE_REFUSED", { from, to, requires: "role" });
      }
    }
    const usage = this.usage(writer, [stored["event_id"] as Id | undefined]);
    // An order out of its hold into a state that counts for good (an offer claimed, a checkout confirmed).
    const leaving = table === "orders" && moving && this.holding(before) && COUNTED.includes(String(values["status"]));
    Object.assign(stored, values);
    const changed = Object.fromEntries(Object.entries(values).filter(([k, v]) => before[k] !== v));
    if (Object.keys(changed).length > 0) this.world.note({ at: iso(this.judgedAt(writer)), by: writer.name, table, id, op: "update", changes: changed });
    // A code drawn again when what it belongs to changes (a new holder, a new friend it is sent to).
    for (const [column, on] of Object.entries(RULE_SET.renewals[table] ?? {})) {
      if (before[on.column] !== stored[on.column] && values[column] === undefined) stored[column] = column === "code" ? randomCode(8, true) : randomCode(16);
    }
    this.stamp(table, before, stored, writer);
    this.world.touched(table, id);
    this.settleAll();
    const after = this.world.get(table, id)!;
    if (move !== null && move.requires !== undefined) this.judgeRequires(table, after, move.requires, writer, { from: String(before[states!.column]), to: move.to });
    this.judgeLimits([{ table, row: after }], writer, false, usage, leaving);
    this.judgeUniques(table);
    if (moving) this.effects(table, before, after);
    this.produce(table, before, after);
    return { ...after };
  }

  /** A row deleted (a check-in undone, a guest taken off the list). */
  remove(table: Table, id: Id, writer: Writer | null = null): void {
    this.transaction(() => {
      const row = this.world.get(table, id);
      if (row === undefined) throw new ApiError(404, "NOT_FOUND", { table, id });
      this.world.note({ at: iso(this.now), by: writer?.name ?? null, table, id, op: "delete", changes: { ...row } });
      this.world.remove(table, id);
      this.settleAll();
    });
  }

  settleAll(): void {
    settle(this.world.tables as Record<string, Row[]>, { currency: this.world.currency });
  }

  // ── what a write is judged by ───────────────────────────────────────────────

  /** A staff role's limits: the columns and values it may write on a change. */
  private judgeRole(table: Table, values: Record<string, unknown>, writer: Writer): void {
    if (writer.origin !== "staff" || writer.roles.length === 0) return;
    const roles = RULE_SET.roles.filter((r) => writer.roles.includes(r.key));
    if (roles.length === 0) return;
    if (!roles.some((r) => (r.grants[table] ?? []).includes("update"))) throw new ApiError(403, "TABLE_FORBIDDEN", { table, action: "update" });
    const limit = roles.map((r) => r.limits?.[table]).find((l) => l !== undefined);
    if (limit === undefined) return;
    for (const [column, value] of Object.entries(values)) {
      if (limit.writable !== undefined && !limit.writable.includes(column)) throw new ApiError(403, "COLUMN_FORBIDDEN", { column, reason: "update-limit" });
      const allowed = limit.writableValues?.[column];
      if (allowed !== undefined && !allowed.includes(value as never)) throw new ApiError(403, "COLUMN_FORBIDDEN", { column, reason: "update-limit" });
    }
  }

  private judgeRequires(table: Table, row: Row, requires: Requires, writer: Writer, move: { from: string | null; to: string } & { create?: true }): void {
    const refuse = (params: Json): never => {
      throw new ApiError(409, "STATE_MOVE_REFUSED", { ...move, ...params });
    };
    for (const c of requires.where ?? []) if (!holds(row, c)) refuse({ requires: requiresName(c), column: c.column });
    for (const link of requires.linked ?? []) {
      const target = this.linked(table, row, link.via);
      for (const c of link.where) if (target === undefined || !holds(target, c)) refuse({ requires: "linked", via: link.via, column: c.column });
    }
    for (const s of requires.setting ?? []) if (this.setting(s.column) !== s.eq) refuse({ requires: "setting", column: s.column });
    if (requires.time !== undefined) {
      const at = this.judgedAt(writer);
      if (requires.time.after !== undefined) {
        const after = this.moment(table, row, requires.time.after);
        if (after === null || at < after) refuse({ requires: "time", bound: "after", at: after === null ? null : iso(after) });
      }
      if (requires.time.before !== undefined) {
        const before = this.moment(table, row, requires.time.before);
        if (before === null || at >= before) refuse({ requires: "time", bound: "before", at: before === null ? null : iso(before) });
      }
    }
  }

  /** A new row's own conditions (a check-in's show, day, ticket and window; a type still selling). */
  private judgeCreate(table: Table, row: Row, writer: Writer): void {
    const create = RULE_SET.states[table]?.create;
    if (create !== undefined) this.judgeRequires(table, row, create.requires, writer, { from: null, to: String(row[RULE_SET.states[table]!.column]), create: true });
  }

  private judgeUniques(table: Table): void {
    for (const set of RULE_SET.uniques[table] ?? []) {
      const seen = new Set<string>();
      for (const row of this.world.all(table)) {
        const parts = set.map((c) => row[c]);
        if (parts.some((p) => p === null || p === undefined)) continue;
        const key = JSON.stringify(parts);
        if (seen.has(key)) throw new ApiError(409, "UNIQUE_VIOLATION", { columns: set });
        seen.add(key);
      }
    }
  }

  // ── the limits ──────────────────────────────────────────────────────────────

  /** Whether an order holds its tickets' places now: a checkout, a claim being confirmed, an offer, until its time runs out. */
  private holding(order: Row): boolean {
    if (!["held", "confirming", "offered"].includes(String(order["status"]))) return false;
    const waitlist = order["waitlist_id"] === null ? undefined : this.world.get("waitlist", order["waitlist_id"] as Id);
    const end = toMs(waitlist?.["offer_until"]) ?? toMs(order["held_until"]);
    return end !== null && this.now < end;
  }

  /** Whether a ticket takes a place: counted by its own state and its order's, or held by its order. */
  private takes(ticket: Row, forPublic: boolean): boolean {
    const status = String(ticket["status"]);
    if (!["valid", "offered", "refund_asked", "returned"].includes(status)) return false;
    if (status === "returned" && !forPublic) return false;
    const order = this.world.get("orders", ticket["order_id"] as Id);
    if (order === undefined) return false;
    if (COUNTED.includes(String(order["status"]))) return true;
    return this.holding(order);
  }

  /** A show's pools as the box office's counts read them: each type's, and the show's own. */
  counts(eventId: Id, forPublic = false): PoolCount[] {
    const event = this.world.get("events", eventId);
    if (event === undefined) return [];
    const tickets = this.world.where("tickets", (t) => t["event_id"] === eventId);
    const count = (list: Row[]) => {
      let taken = 0;
      let held = 0;
      let reserved = 0;
      for (const t of list) {
        if (!this.takes(t, true)) continue;
        const order = this.world.get("orders", t["order_id"] as Id)!;
        if (t["status"] === "returned") reserved += 1;
        else if (this.holding(order) && !COUNTED.includes(String(order["status"]))) held += 1;
        else taken += 1;
      }
      return { taken, held, reserved };
    };
    const out: PoolCount[] = [];
    for (const type of this.world.where("ticket_types", (t) => t["event_id"] === eventId)) {
      const c = count(tickets.filter((t) => t["ticket_type_id"] === type.id));
      const size = Number(type["capacity"] ?? 0);
      out.push({ event_id: eventId, ticket_type_id: type.id, size, ...c, left: size - c.taken - c.held - (forPublic ? c.reserved : 0) });
    }
    const all = count(tickets);
    const size = Number(event["sell_limit"] ?? 0);
    out.push({ event_id: eventId, ticket_type_id: null, size, ...all, left: size - all.taken - all.held - (forPublic ? all.reserved : 0) });
    return out;
  }

  /** What is left of each type of a show for the public: the smaller of the type's and the show's, said only when little is. */
  typeLeft(eventId: Id): TypeLeft[] {
    const pools = this.counts(eventId, true);
    const show = pools.find((p) => p.ticket_type_id === null)!;
    return this.world
      .where("ticket_types", (t) => t["event_id"] === eventId && t["visibility"] === "public")
      .map((type) => {
        const own = pools.find((p) => p.ticket_type_id === type.id)!;
        const opens = toMs(type["sales_start"]);
        const closes = toMs(type["sales_end"]);
        if ((opens !== null && this.now < opens) || (closes !== null && this.now >= closes) || type["selling"] !== true) {
          return { ticket_type_id: type.id, state: "not_on_sale" as const };
        }
        const left = Math.min(own.left, show.left);
        if (left <= 0) return { ticket_type_id: type.id, state: "sold_out" as const };
        // Said only below 15 % of the type's size.
        return own.size > 0 && left * 100 < own.size * 15 ? { ticket_type_id: type.id, state: "open" as const, left } : { ticket_type_id: type.id, state: "open" as const };
      });
  }

  /** The limits a write touched: over is refused only when this write made it so. */
  /** What each pool of the shows a write may touch uses before it: a limit is judged only where a write adds to it. */
  private usage(writer: Writer, events: (Id | undefined)[]): Map<string, number> {
    const out = new Map<string, number>();
    for (const eventId of events) {
      if (eventId === undefined || eventId === null) continue;
      for (const pool of this.counts(eventId, writer.origin === "public")) out.set(`${String(eventId)}:${String(pool.ticket_type_id)}`, pool.size - pool.left);
    }
    return out;
  }

  /**
   * `leaving`: the write only takes an order out of its hold. It takes no new place, so its pools are counted as
   * the box office counts them — the places kept back for a waitlist are the ones it was offered — and judged:
   * more offered than fits is refused.
   */
  private judgeLimits(written: { table: Table; row: Row }[], writer: Writer, creating: boolean, before: Map<string, number>, leaving = false): void {
    const forPublic = writer.origin === "public" && !leaving;
    const tickets = written.filter((w) => w.table === "tickets").map((w) => this.world.get("tickets", w.row.id)!);
    const orders = written.filter((w) => w.table === "orders").map((w) => this.world.get("orders", w.row.id)!);
    // A ticket's pools, for a new ticket or a ticket (or order) that now takes a place.
    const touchedEvents = new Set<Id>();
    for (const t of tickets) touchedEvents.add(t["event_id"] as Id);
    for (const o of orders) touchedEvents.add(o["event_id"] as Id);
    tickets.forEach((t, index) => {
      if (!creating) return;
      const type = this.world.get("ticket_types", t["ticket_type_id"] as Id)!;
      if (forPublic) {
        const opens = toMs(type["sales_start"]);
        const closes = toMs(type["sales_end"]);
        if ((opens !== null && this.now < opens) || (closes !== null && this.now >= closes)) {
          throw new ApiError(400, "PUBLIC_WRITE_REFUSED", { child: "tickets", index, column: "ticket_type_id", reason: "not-on-sale" });
        }
      }
      const same = this.world.where("tickets", (x) => x["order_id"] === t["order_id"] && x["ticket_type_id"] === t["ticket_type_id"]).length;
      if (same > Number(type["max_per_order"] ?? 99)) {
        throw new ApiError(400, forPublic ? "PUBLIC_WRITE_REFUSED" : "VALIDATION_FAILED", { child: "tickets", index, column: "ticket_type_id", reason: "too-many" });
      }
    });
    for (const eventId of touchedEvents) {
      for (const pool of this.counts(eventId, forPublic)) {
        if (pool.left >= 0) continue;
        // Over already, and this write adds nothing to it: an offer claimed, an order moved on.
        const was = before.get(`${String(eventId)}:${String(pool.ticket_type_id)}`);
        if (!leaving && was !== undefined && pool.size - pool.left <= was) continue;
        const mine = tickets.find((t) => pool.ticket_type_id === null || t["ticket_type_id"] === pool.ticket_type_id);
        const byOrder = orders.length > 0;
        if (mine === undefined && !byOrder) continue;
        throw new ApiError(409, writer.origin === "public" ? "PUBLIC_SOLD_OUT" : "CAPACITY_FULL", {
          child: mine === undefined ? null : "tickets",
          index: mine === undefined ? null : tickets.indexOf(mine),
          column: "ticket_type_id",
          pool: pool.ticket_type_id ?? "event",
        });
      }
    }
    // A code is used no more times than it allows.
    for (const o of orders) {
      if (o["code_id"] === null) continue;
      const code = this.world.get("codes", o["code_id"] as Id)!;
      const max = code["max_uses"];
      if (max === null || max === undefined) continue;
      const used = this.world.where("orders", (x) => x["code_id"] === code.id && (COUNTED.includes(String(x["status"])) || this.holding(x))).length;
      if (used > Number(max)) throw new ApiError(400, forPublic ? "PUBLIC_WRITE_REFUSED" : "VALIDATION_FAILED", { column: "code_text", reason: "used-up" });
    }
    for (const w of written) {
      // A ticket's door money is taken once.
      if (w.table === "door_collections") {
        const taken = this.world.where("door_collections", (c) => c["ticket_id"] === w.row["ticket_id"] && c["state"] === "taken").length;
        if (taken > 1) throw new ApiError(409, "CAPACITY_FULL", { column: "ticket_id" });
      }
      // A show's guest list keeps no more people than its places.
      if (w.table === "guest_list") {
        const event = this.world.get("events", w.row["event_id"] as Id)!;
        const people = this.world.where("guest_list", (g) => g["event_id"] === event.id).reduce((n, g) => n + Number(g["people"] ?? 1), 0);
        if (people > Number(event["guest_places"] ?? 0)) throw new ApiError(409, "CAPACITY_FULL", { column: "event_id" });
      }
    }
  }

  // ── stamps, effects, emails ─────────────────────────────────────────────────

  private stamp(table: Table, before: Row | null, row: Record<string, unknown>, writer: Writer): void {
    for (const [column, rule] of Object.entries(RULE_SET.stamps[table] ?? {})) {
      const on = rule.on as string | { column?: string; values?: unknown[]; filled?: true; columns?: string[] };
      const fires =
        on === "create"
          ? before === null
          : typeof on === "object" && on.columns !== undefined
            ? before === null || on.columns.some((c) => before[c] !== row[c])
            : typeof on === "object" && on.filled === true
              ? (before === null || before[on.column!] === null || before[on.column!] === undefined) && row[on.column!] !== null && row[on.column!] !== undefined
              : typeof on === "object" && on.values !== undefined
                ? (before === null || before[on.column!] !== row[on.column!]) && on.values.includes(row[on.column!])
                : false;
      if (!fires) continue;
      const set = rule.set as string | Json;
      const at = this.judgedAt(writer);
      if (set === "now") row[column] = iso(at);
      else if (set === "today") row[column] = iso(at).slice(0, 10);
      else if (set === "user-name") row[column] = writer.name;
      else if (typeof set === "object" && "copy" in set) row[column] = row[set["copy"] as string];
      else if (typeof set === "object" && "addMinutes" in set) {
        const a = set["addMinutes"] as Json;
        const ms = a["minutes"] !== undefined ? this.amount(a["minutes"]) * 60_000 : this.amount(a["hours"]) * 3_600_000;
        const cap = a["notAfter"] === undefined ? null : this.moment(table, row, a["notAfter"] as Moment);
        row[column] = iso(cap !== null && cap < at + ms ? cap : at + ms);
      } else if (typeof set === "object" && "deadline" in set) {
        const d = set["deadline"] as { days: unknown; time: unknown; notAfter?: Moment };
        const time = typeof d.time === "string" ? d.time : String(this.setting((d.time as { column: string }).column));
        let due = wallTime(venueDay(at, this.world.zone, this.amount(d.days)), time, this.world.zone);
        const cap = d.notAfter === undefined ? null : this.moment(table, row, d.notAfter);
        if (cap !== null && cap < due) due = cap;
        row[column] = iso(due);
      } else if (typeof set === "object" && "moment" in set) {
        const found = this.moment(table, row, set["moment"] as Moment);
        row[column] = found === null ? null : iso(found);
      }
    }
  }

  /** A moving row sets its link's row on (a waitlist entry follows its offer). */
  private effects(table: Table, before: Row, after: Row): void {
    const states = RULE_SET.states[table]!;
    for (const effect of states.effects ?? []) {
      if (after[states.column] !== effect.on.to || before[states.column] === effect.on.to) continue;
      const target = this.references(table, effect.via);
      const id = after[effect.via];
      if (target === undefined || id === null || id === undefined) continue;
      const row = this.world.get(target, id as Id);
      if (row === undefined) continue;
      const targetStates = RULE_SET.states[target];
      const to = effect.set[targetStates?.column ?? "status"];
      if (targetStates !== undefined && row[targetStates.column] !== to) {
        const listed = (targetStates.moves[String(row[targetStates.column])] ?? []).some((m) => (typeof m === "string" ? m : m.to) === to);
        if (!listed) throw new ApiError(409, "STATE_MOVE_REFUSED", { from: row[targetStates.column], to, via: effect.via });
      }
      Object.assign(row, effect.set);
      this.world.touched(target, row.id);
    }
  }

  /**
   * The emails a write queues, as the producers say: one of a kind a row, or one for each value of a column
   * (`repeatBy`, the one waiting for an older value skipped), or one for each change (`repeat`).
   */
  private produce(table: Table, before: Row | null, after: Row): void {
    for (const producer of RULE_SET.producers) {
      const onCreate = producer["onCreate"] as { table: string; via?: string; where?: Condition } | undefined;
      const onChange = producer["onChange"] as
        | { table: string; via?: string; column?: string; to?: unknown; columns?: string[]; changed?: true; where?: Condition }
        | undefined;
      let fires = false;
      if (onCreate !== undefined && before === null && onCreate.table === table) fires = onCreate.where === undefined || holds(after, onCreate.where);
      if (onChange !== undefined && onChange.table === table) {
        const where = onChange.where === undefined || holds(after, onChange.where);
        if (onChange.columns !== undefined) {
          // Any change of these columns, against the row as it was stored: a new row is no change.
          fires = before !== null && onChange.columns.some((c) => before[c] !== after[c]) && where;
        } else {
          const column = onChange.column!;
          const to = Array.isArray(onChange.to) ? onChange.to : [onChange.to];
          const changed = (before === null ? null : before[column]) !== after[column];
          fires = changed && to.includes(after[column]) && where;
        }
      }
      if (!fires) continue;
      const via = (onCreate ?? onChange)!.via;
      const link = String(producer["link"]);
      const linkId = via === undefined ? (link === `${table.replace(/s$/, "")}_id` ? after.id : after[link]) : after[via];
      const kind = String(producer["kind"]);
      const linkColumn = link;
      const repeatBy = producer["repeatBy"] as string | undefined;
      const repeatKey = repeatBy === undefined ? null : String(after[repeatBy] ?? "");
      const earlier = this.world.where("messages", (m) => m["kind"] === kind && m[linkColumn] === linkId);
      if (producer["repeat"] !== true) {
        if (earlier.some((m) => repeatBy === undefined || m["repeat_key"] === repeatKey)) continue;
        // Overtaken: a message still waiting for an older value is not sent.
        for (const old of earlier) {
          if (old["status"] !== "queued" && old["status"] !== "held") continue;
          Object.assign(old, { status: "skipped", skip_reason: "overtaken" });
          this.world.touched("messages", old.id);
        }
      }
      const recipient = producer["recipient"] as { column: string } | undefined;
      const due = producer["due"] as { date: string; at?: string } | undefined;
      const dueAt = due === undefined ? null : toMs(after[due.date]);
      this.world.insert("messages", {
        kind,
        status: producer["hold"] === true ? "held" : "queued",
        to_address: recipient === undefined ? this.addressOf(table, after) : (after[recipient.column] ?? null),
        language: "en-US",
        order_id: table === "orders" ? after.id : (after["order_id"] ?? null),
        ticket_id: table === "tickets" ? after.id : null,
        customer_id: null,
        event_id: after["event_id"] ?? null,
        waitlist_id: null,
        reminder_id: null,
        refund_id: table === "refunds" ? after.id : null,
        broadcast_id: null,
        due: dueAt === null ? null : iso(wallTime(venueDay(dueAt, this.world.zone), due!.at ?? "09:00", this.world.zone)),
        created_at: iso(this.now),
        sent_at: null,
        error: null,
        skip_reason: null,
        subject_override: null,
        body_override: null,
        approved_by: null,
        repeat_key: repeatKey,
        [linkColumn]: linkId,
      });
    }
  }

  private addressOf(table: Table, row: Row): unknown {
    if (table === "orders") return row["email"];
    const order = row["order_id"] === undefined ? undefined : this.world.get("orders", row["order_id"] as Id);
    return order?.["email"] ?? null;
  }

  // ── the clock ───────────────────────────────────────────────────────────────

  /** Every move the clock makes on its own, up to now, oldest first; a refused one waits for the next tick. */
  runTimed(): void {
    for (let pass = 0; pass < 8; pass += 1) {
      let moved = false;
      for (const [table, states] of Object.entries(RULE_SET.states) as [Table, States][]) {
        for (const timed of states.timed ?? []) {
          for (const row of this.world.where(table, (r) => r[states.column] === timed.from)) {
            const at = this.moment(table, row, timed.at);
            if (at === null || at > this.now) continue;
            try {
              this.update(table, row.id, { [states.column]: timed.to, ...(timed.set ?? {}) }, CLOCK);
              moved = true;
            } catch (error) {
              if (!(error instanceof ApiError)) throw error;
            }
          }
        }
      }
      if (!moved) return;
    }
  }
}
