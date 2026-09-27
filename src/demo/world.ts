/**
 * The demo's venue: the app's REAL sample — the very bundle an operator adds
 * from Adminium (`seeds/events.sample.json`) — resolved at the demo's moment
 * by the same loader the tests hold to the ledger's figures, held in memory.
 *
 * The sample's order numbers carry an `S` (`WV-S8761`) and no running
 * number; the demo's own new orders take the venue's series from the ledger's
 * next number (`WV-8816`), as the design draws them.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import bundleJson from "../../seeds/events.sample.json";
import { resolveSample, type SampleBundleRows } from "../data/sampleRows.ts";
import type { Id, LiveFrame, Row } from "../data/wire.ts";
import { randomCode } from "./codes.ts";

export const DEMO_BUNDLE = bundleJson as unknown as SampleBundleRows;

/** Tuesday 28 July 2026, 16:30 at the venue. */
export const DEMO_START = Date.parse("2026-07-28T20:30:00Z");
export const DEMO_ZONE = "America/New_York";
export const DEMO_CURRENCY = "USD";
/** The number the demo's first new order takes: the one after the ledger's last. */
export const DEMO_NUMBER_START = 8816;

/** Every table the app declares, in the order a sample loads them. */
export const TABLES = [
  "settings",
  "rooms",
  "events",
  "event_days",
  "acts",
  "ticket_types",
  "codes",
  "customers",
  "questions",
  "waitlist",
  "orders",
  "tickets",
  "devices",
  "check_ins",
  "door_collections",
  "payments",
  "refunds",
  "guest_list",
  "reminders",
  "broadcasts",
  "messages",
] as const;
export type Table = (typeof TABLES)[number];

export class World {
  now: number;
  readonly zone = DEMO_ZONE;
  readonly currency = DEMO_CURRENCY;
  private rows: Record<Table, Row[]>;
  private nextIds: Record<Table, number>;
  private listeners = new Set<(frame: LiveFrame) => void>();
  private held: LiveFrame[] | null = null;

  constructor(now = DEMO_START) {
    this.now = now;
    const resolved = resolveSample(DEMO_BUNDLE, { now, zone: DEMO_ZONE, locale: "en-US", currency: DEMO_CURRENCY });
    this.rows = Object.fromEntries(TABLES.map((t) => [t, ((resolved[t] ?? []) as Row[]).map((row) => ({ ...row }))])) as Record<Table, Row[]>;
    // An order's own link is minted as the row goes in, the sample's orders as much as any.
    for (const order of this.rows.orders) if (order["link_token"] === null || order["link_token"] === undefined) order["link_token"] = randomCode(16);
    this.nextIds = Object.fromEntries(TABLES.map((t) => [t, Math.max(0, ...this.rows[t].map((r) => r.id)) + 1])) as Record<Table, number>;
  }

  /** Every table's rows, as the loader's rules read them. */
  get tables(): Readonly<Record<string, Row[]>> {
    return this.rows;
  }

  all(table: Table): Row[] {
    return this.rows[table];
  }

  get(table: Table, id: Id): Row | undefined {
    return this.rows[table].find((row) => row.id === id);
  }

  where(table: Table, test: (row: Row) => boolean): Row[] {
    return this.rows[table].filter(test);
  }

  insert(table: Table, values: Record<string, unknown>): Row {
    const row: Row = { ...values, id: this.nextIds[table]++ };
    this.rows[table].push(row);
    this.announce({ table, id: row.id, op: "insert" });
    return row;
  }

  remove(table: Table, id: Id): void {
    this.rows[table] = this.rows[table].filter((row) => row.id !== id);
    this.announce({ table, id, op: "delete" });
  }

  touched(table: Table, id: Id): void {
    this.announce({ table, id, op: "update" });
  }

  /** A write's frames go out together when it commits, and never when it is refused. */
  hold(): void {
    this.held = [];
  }

  commit(): void {
    const frames = this.held ?? [];
    this.held = null;
    for (const frame of frames) for (const listener of this.listeners) listener(frame);
  }

  /** A refused write leaves nothing behind: the rows as they were, no frame. */
  snapshot(): () => void {
    const copy = Object.fromEntries(TABLES.map((t) => [t, this.rows[t].map((row) => ({ ...row }))])) as Record<Table, Row[]>;
    const ids = { ...this.nextIds };
    return () => {
      this.rows = copy;
      this.nextIds = ids;
      this.held = null;
    };
  }

  subscribe(listener: (frame: LiveFrame) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private announce(frame: LiveFrame): void {
    if (this.held !== null) this.held.push(frame);
    else for (const listener of this.listeners) listener(frame);
  }
}
