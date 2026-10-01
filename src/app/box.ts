/**
 * The box office, as one controller beside the audience's: which screen and
 * show are open, what Adminium answered (asked once through the app's cache,
 * asked again after a write), and what each button does. Every figure, count
 * and status is Adminium's — the staff reads, the counts and the show's own
 * totals — and every write goes through the box office's port; a refusal
 * comes back in Adminium's words.
 *
 * Only the box office's build carries this module (the audience site's
 * leaves it out, `sides.ts`).
 */
import { createElement, type ReactNode } from "react";

import type { BoxOfficePort, EventChildren, StaffPerson } from "../data/ports.ts";
import { ApiError, isApiError, yes, type HistoryEntry, type Id, type ListQuery, type ListReply, type PoolCount, type Row, type Where } from "../data/wire.ts";
import { tr } from "../i18n/tr.ts";
import { boxWorldOf, type BoxShow, type BoxWorld } from "./boxWorld.ts";
import { cancelRun, type RunProgress } from "../data/boxSteps.ts";
import { fD, money, ms } from "./fmt.ts";
import { venueDay, wallTime } from "../lib/venueTime.ts";
import { PreviewPane } from "./preview.tsx";
import type { Draft } from "./vals/editor.ts";
import type { BoxScreen, WaveApp } from "./wave.ts";

export type BoxScreenId = BoxScreen;

/** The order states whose tickets count for good. */
export const LIVE = ["door", "awaiting_transfer", "overdue", "no_charge", "paid"];
/** A ticket still in someone's hands. */
export const LIVE_TICKET = ["valid", "offered", "refund_asked"];

export interface BoxState {
  /** The show the event header and its tabs are about. */
  bev: Id | null;
  evF: "all" | "on" | "soon" | "sold" | "post" | "past" | "draft";
  /** How many shows the Events list draws (a page at a time). */
  evN: number;
  /** The search box over every screen, and the result the arrow keys are on. */
  bq: string;
  qAt: number;
  /** The order open in the drawer. */
  drawer: Id | null;
  ord: { ev: Id | "all"; tab: boolean; st: string; q: string; n: number };
  gl: { ev: Id | null; name: string; plus: number; by: string; note: string; err: string | null };
  wl: { ev: Id | null };
  msg: { ev: Id | null; to: "everyone" | "type" | "not_in"; typeId: Id | null; tpl: string | null; subj: string | null; body: string | null; waiting: Id | null };
  pc: {
    ev: Id | null;
    mode: "post" | "cancel";
    date: string;
    doors: string;
    stage: string;
    until: string;
    msg: string | null;
    tried: boolean;
    rfTab: "to" | "done" | "none";
    rfPage: number;
    /** A cancel on its way: how far it has got. */
    run: RunProgress | null;
  };
  /** Settings being edited (null: as saved). */
  set: { settings: Record<string, unknown>; rooms: Row[]; devices: Row[]; gone: Id[] } | null;
  /** The editor's draft. */
  ed: unknown;
  edDirty: boolean;
  /** Save was pressed with something to fix: every error shows. */
  edTried: boolean;
  edFull: boolean;
  edPv: "desktop" | "phone";
  /** When each order was last reminded here. */
  reminded: Record<string, number>;
}

export function boxFresh(): BoxState {
  return {
    bev: null,
    evF: "all",
    evN: 50,
    bq: "",
    qAt: -1,
    drawer: null,
    ord: { ev: "all", tab: false, st: "all", q: "", n: 50 },
    gl: { ev: null, name: "", plus: 0, by: "", note: "", err: null },
    wl: { ev: null },
    msg: { ev: null, to: "everyone", typeId: null, tpl: null, subj: null, body: null, waiting: null },
    pc: { ev: null, mode: "post", date: "", doors: "21:00", stage: "22:00", until: "", msg: null, tried: false, rfTab: "to", rfPage: 0, run: null },
    set: null,
    ed: null,
    edDirty: false,
    edTried: false,
    edFull: false,
    edPv: "desktop",
    reminded: {},
  };
}

const boxes = new WeakMap<WaveApp, Box>();
/** The box office's controller of an app (made the first time the box office is drawn). */
export function boxOf(app: WaveApp): Box {
  let b = boxes.get(app);
  if (b === undefined) {
    b = new Box(app);
    boxes.set(app, b);
  }
  return b;
}

/** The small tables the box office reads whole. */
const WHOLE = ["settings", "rooms", "events", "event_days", "acts", "ticket_types", "questions"] as const;

/** A table the person may not read, as the venue's read of it: no rows, and the same array each time. */
const NO_ROWS: Row[] = [];

/** How many ids one `in` condition carries. */
const IN_PART = 150;

/** A pace compares against at most this many of the room's latest shows (of the few looked at). */
const PACE_PEERS = 5;
const PACE_LOOK = 8;

/** The most rows one read of "all of them" brings back; past it the read is refused rather than cut. */
export const ALL_ROWS = 20_000;

/** What a show's places and a dry-run price are worked out from, as a refresh names them. */
const POOLS = "pools";
const QUOTES = "quotes";
/**
 * What a write to a table can change: the table, Adminium's totals over it (an order's balance over its
 * payments, a show's money over its orders), and what its moves write (an order cancelled cancels its
 * tickets and queues its email; a waitlist offer moves the waitlist place).
 */
const TOUCHES: Record<string, readonly string[]> = {
  orders: ["orders", "tickets", "events", "payments", "messages", "waitlist", "customers", POOLS, QUOTES],
  tickets: ["tickets", "orders", "events", "messages", "waitlist", POOLS, QUOTES],
  payments: ["payments", "orders", "events"],
  refunds: ["refunds", "orders", "events", "messages"],
  door_collections: ["door_collections", "tickets", "orders", "events"],
  check_ins: ["check_ins"],
  guest_list: ["guest_list"],
  waitlist: ["waitlist", "messages"],
  customers: ["customers"],
  reminders: ["reminders", "events"],
  events: ["events", "event_days", "orders", "tickets", POOLS, QUOTES],
  event_days: ["event_days", "events", "tickets"],
  ticket_types: ["ticket_types", "events", POOLS, QUOTES],
  acts: ["acts"],
  questions: ["questions"],
  codes: ["codes", QUOTES],
  broadcasts: ["broadcasts", "messages"],
  messages: ["messages"],
  settings: ["settings", QUOTES],
  rooms: ["rooms", "events", POOLS, QUOTES],
  devices: ["devices"],
};

/** The tables a cached answer was read from ("*": any write may change it). */
export function readsOf(key: string): string[] {
  const m = /^box:(rows|list|count|history):([^:]+)/.exec(key);
  if (m !== null) return [m[2]!];
  if (key === "box:me") return [];
  if (key.startsWith("box:pools:")) return [POOLS];
  if (key.startsWith("box:quote:") || key.startsWith("box:dquote:")) return [QUOTES];
  return ["*"];
}

export class Box {
  readonly app: WaveApp;
  /** What goes from this phone at sign-out (the door's list of tonight). */
  readonly onSignOut: (() => void)[] = [];
  private memo: { key: unknown[]; w: BoxWorld } | null = null;
  /** Which read of the venue `world()` answers from: a new one each time Adminium's rows change. */
  gen = 0;

  constructor(app: WaveApp) {
    this.app = app;
    // The session ended (signed out elsewhere, timed out): every screen says so and offers the sign-in, rather
    // than calling each read and write refused.
    app.ports.door?.onSessionEnded?.(() => {
      if (app.state.sheet?.kind !== "stSignedOut") app.openSheet("stSignedOut", {});
    });
    app.escapeHook = () => {
      if (this.s.edFull) {
        this.set({ edFull: false });
        this.app.refocus();
        return true;
      }
      if (this.s.drawer !== null) {
        this.closeDrawer();
        return true;
      }
      return false;
    };
  }

  get port(): BoxOfficePort {
    return this.app.ports.boxOffice!;
  }

  // ── what is on screen ────────────────────────────────────────────────────

  get s(): BoxState {
    const cur = this.app.state.box as BoxState | null;
    return cur === null ? boxFresh() : { ...boxFresh(), ...cur };
  }

  set(p: Partial<BoxState> | ((s: BoxState) => Partial<BoxState>)): void {
    const cur = this.s;
    const patch = typeof p === "function" ? p(cur) : p;
    this.app.setState({ box: { ...cur, ...patch } });
  }

  // ── Adminium's answers ───────────────────────────────────────────────────

  me(): StaffPerson | undefined {
    return this.app.get("box:me", () => this.port.me());
  }
  /** Someone who works the door and not the box office: the door is all they see. */
  doorOnly(): boolean {
    const me = this.me();
    return me !== undefined && me.roles.includes("door") && !me.roles.includes("box-office");
  }
  /**
   * Whether the person may do this to a table, as Adminium says (a button whose write would be refused is
   * left out). Yes while Adminium has not said, or says nothing: then the server refuses what it refuses.
   */
  can(table: string, action: "read" | "create" | "update" | "delete"): boolean {
    const tables = this.me()?.tables;
    if (tables === undefined || tables === null) return true;
    return (tables[table] ?? []).includes(action);
  }
  rows(table: string): Row[] | undefined {
    return this.app.get(`box:rows:${table}`, () => this.port.rows(table));
  }
  list(table: string, query: ListQuery = {}): ListReply | undefined {
    return this.app.get(`box:list:${table}:${JSON.stringify(query)}`, () => this.port.list(table, query));
  }
  count(table: string, where: Where[] = []): number | undefined {
    return this.app.get(`box:count:${table}:${JSON.stringify(where)}`, () => this.port.count(table, where));
  }
  pools(eventId: Id): PoolCount[] | undefined {
    return this.app.get(`box:pools:${String(eventId)}`, () => this.port.counts(eventId));
  }
  history(table: string, id: Id): HistoryEntry[] | undefined {
    return this.app.get(`box:history:${table}:${String(id)}`, () => this.port.history(table, id));
  }

  /** The venue: every show, type, day, act and room (null until Adminium has answered). */
  world(): BoxWorld | null {
    // Who is asking comes first: a table their role may not read (the door's has no acts and no questions)
    // is empty to them and never asked for — its refusal would otherwise keep the venue from ever arriving.
    if (this.me() === undefined && !this.app.failed("box:me")) return this.memo?.w ?? null;
    const got = WHOLE.map((t) => (this.can(t, "read") ? this.rows(t) : NO_ROWS));
    if (got.some((r) => r === undefined)) return this.memo?.w ?? null;
    if (this.memo !== null && this.memo.key.every((k, i) => k === got[i])) return this.memo.w;
    const [settings, rooms, events, event_days, acts, ticket_types, questions] = got as Row[][];
    const w = boxWorldOf({ settings: settings!, rooms: rooms!, events: events!, event_days: event_days!, acts: acts!, ticket_types: ticket_types!, questions: questions! });
    this.memo = { key: got, w };
    this.gen += 1;
    return w;
  }

  /** A show's own pool (its size, what is taken, held and left) and its types'. */
  sold(show: BoxShow): { size: number; taken: number; held: number; left: number; reserved: number; byType: Map<Id, PoolCount> } | null {
    const pools = this.pools(show.id);
    if (pools === undefined) return null;
    const own = pools.find((p) => p.ticket_type_id === null);
    const byType = new Map(pools.filter((p) => p.ticket_type_id !== null).map((p) => [p.ticket_type_id!, p]));
    const sum = (k: "size" | "taken" | "held" | "left" | "reserved") => [...byType.values()].reduce((a, p) => a + p[k], 0);
    // A show holds the smaller of its types' sizes and its room's sale limit.
    const types = byType.size > 0;
    return {
      size: own === undefined ? sum("size") : types ? Math.min(own.size, sum("size")) : own.size,
      taken: own?.taken ?? sum("taken"),
      held: own?.held ?? sum("held"),
      left: own === undefined ? sum("left") : types ? Math.min(own.left, sum("left")) : own.left,
      reserved: own?.reserved ?? sum("reserved"),
      byType,
    };
  }

  /**
   * Every row of a table that a figure is worked out from: all of them, or a refusal when there are more
   * than one read brings back (a total from a cut list would be wrong without saying so).
   */
  all(table: string, where: Where[] = [], sort?: ListQuery["sort"]): Row[] | undefined {
    const query: ListQuery = { where, ...(sort === undefined ? {} : { sort }), limit: ALL_ROWS };
    return this.app.get(`box:list:${table}:all:${JSON.stringify(query)}`, async () => {
      const got = await this.port.list(table, query);
      if (got.total > got.rows.length) throw new ApiError(413, "TOO_MANY_ROWS", { table, total: got.total, read: got.rows.length });
      return got.rows;
    });
  }

  /** Every row whose `column` is one of `ids` (asked in parts, so no address grows past what a server takes). */
  allIn(table: string, column: string, ids: Id[], where: Where[] = []): Row[] | undefined {
    const sorted = [...new Set(ids)].sort((a, b) => a - b);
    const out: Row[] = [];
    let missing = false;
    for (let i = 0; i < sorted.length; i += IN_PART) {
      const got = this.all(table, [{ column, in: sorted.slice(i, i + IN_PART) }, ...where]);
      if (got === undefined) missing = true;
      else out.push(...got);
    }
    return missing ? undefined : out;
  }

  /**
   * After a write: the answers the written tables can have changed are asked again (what is on screen
   * stays until they come) — never every answer, which would spend the person's 300 requests a minute on
   * what did not move. With no tables, everything (the clock's re-ask).
   */
  refresh(tables?: readonly string[]): void {
    if (tables === undefined) return this.app.refresh("box:");
    if (tables.length === 0) return;
    const hit = new Set(tables.flatMap((t) => TOUCHES[t] ?? ["*"]));
    if (hit.has("*")) return this.app.refresh("box:");
    this.app.refreshWhere((key) => key.startsWith("box:") && readsOf(key).some((t) => t === "*" || hit.has(t)));
  }

  // ── the venue's day and a show's state ───────────────────────────────────

  /**
   * The start of the venue day an instant falls in: `day_starts_at` (06:00) on the venue's clock, on the
   * date itself — on a clock-change day too, when the day is 23 or 25 hours long.
   */
  venueDayStart(t: number): number {
    const zone = this.app.zone;
    const time = this.dayStartsAt();
    const today = wallTime(venueDay(t, zone), time, zone);
    return t >= today ? today : wallTime(venueDay(t, zone, -1), time, zone);
  }
  /** The end of the venue day an instant falls in: the next day's start. */
  venueDayEnd(t: number): number {
    const zone = this.app.zone;
    return wallTime(venueDay(this.venueDayStart(t), zone, 1), this.dayStartsAt(), zone);
  }
  private dayStartsAt(): string {
    const said = String(this.world()?.settingsRow["day_starts_at"] ?? "06:00");
    return /^\d{1,2}:\d{2}/.test(said) ? said : "06:00";
  }
  isPast(show: BoxShow): boolean {
    return this.app.now > show.ends;
  }
  /** The show's word on the box office's lists. */
  status(show: BoxShow): { txt: string; k: "danger" | "muted" | "warn" | "info" | "pos"; id: "cancelled" | "past" | "post" | "draft" | "sold" | "soon" | "on" } {
    if (show.status === "cancelled") return { txt: tr("Called off"), k: "danger", id: "cancelled" };
    if (this.isPast(show)) return { txt: tr("Ended"), k: "muted", id: "past" };
    if (show.postponed) return { txt: tr("Postponed"), k: "warn", id: "post" };
    if (show.status === "draft") return { txt: tr("Draft"), k: "muted", id: "draft" };
    const pub = show.types.filter((t) => t.visibility === "public");
    const sold = this.sold(show);
    if (sold !== null && pub.length > 0 && pub.every((t) => (sold.byType.get(t.id)?.left ?? 1) <= 0)) return { txt: tr("Sold out"), k: "danger", id: "sold" };
    const opens = pub.map((t) => t.salesStart ?? show.onSaleAt);
    if (pub.length > 0 && opens.every((o) => o !== null && o > this.app.now)) return { txt: tr("On sale soon"), k: "info", id: "soon" };
    return { txt: tr("On sale"), k: "pos", id: "on" };
  }

  /** The show the header is about: the one chosen, else tonight's, else the next. */
  headShow(): BoxShow | null {
    const w = this.world();
    if (w === null) return null;
    const s = this.s;
    const id = this.app.state.bx === "orders" && s.ord.ev !== "all" ? s.ord.ev : this.app.state.bx === "pc" && s.pc.ev !== null ? s.pc.ev : s.bev;
    return (id === null ? undefined : w.byId.get(id)) ?? this.nextShow() ?? w.shows[0] ?? null;
  }
  nextShow(): BoxShow | null {
    const w = this.world();
    return w?.shows.find((e) => e.status !== "cancelled" && e.ends > this.app.now) ?? null;
  }

  /** A show's places back for its waitlist and not yet offered to anyone (undefined until Adminium answers). */
  back(eventId: Id): number | undefined {
    return this.backAll()?.get(eventId) ?? (this.backAll() === undefined ? undefined : 0);
  }
  /**
   * Every show's places back for its waitlist and not yet offered, from two reads for the whole venue
   * (the tickets back, and the tickets in live offers) — never two reads a show on every screen.
   */
  backAll(): Map<Id, number> | undefined {
    const returned = this.all("tickets", [{ column: "status", eq: "returned" }]);
    const offered = this.all("tickets", [
      { column: "order_status", eq: "offered" },
      { column: "status", in: LIVE_TICKET },
    ]);
    if (returned === undefined || offered === undefined) return undefined;
    const out = new Map<Id, number>();
    for (const t of returned) out.set(t["event_id"] as Id, (out.get(t["event_id"] as Id) ?? 0) + 1);
    for (const t of offered) if (out.has(t["event_id"] as Id)) out.set(t["event_id"] as Id, out.get(t["event_id"] as Id)! - 1);
    for (const [k, n] of out) out.set(k, Math.max(0, n));
    return out;
  }

  // ── the usual pace ───────────────────────────────────────────────────────

  /**
   * Every order and ticket of some shows (placing and cancel times, states): what a pace is worked out
   * from. Read a show at a time, so two shows comparing against the same room's shows share the reads.
   */
  paceRows(ids: Id[]): { orders: Row[]; tickets: Row[] } | undefined {
    const orders: Row[] = [];
    const tickets: Row[] = [];
    let missing = false;
    for (const id of [...new Set(ids)].sort((a, b) => a - b)) {
      const o = this.all("orders", [{ column: "event_id", eq: id }]);
      const t = this.all("tickets", [{ column: "event_id", eq: id }]);
      if (o === undefined || t === undefined) missing = true;
      else {
        orders.push(...o);
        tickets.push(...t);
      }
    }
    return missing ? undefined : { orders, tickets };
  }

  /** How much of a show was sold at an instant: its live tickets then, over its size now. */
  shareAt(show: BoxShow, t: number, rows: { orders: Row[]; tickets: Row[] }, size: number): number {
    const orders = new Map(rows.orders.filter((o) => o["event_id"] === show.id).map((o) => [o.id, o]));
    const liveThen = (o: Row) => {
      const placed = ms(o["created_at"]) ?? Infinity;
      if (placed > t) return false;
      if (LIVE.includes(String(o["status"]))) return true;
      const gone = ms(o["cancelled_at"]);
      return o["status"] === "cancelled" && gone !== null && gone > t;
    };
    let n = 0;
    for (const tk of rows.tickets) {
      const o = orders.get(tk["order_id"] as Id);
      if (o === undefined || !liveThen(o)) continue;
      const gone = ms(tk["cancelled_at"]);
      if (LIVE_TICKET.includes(String(tk["status"])) || (gone !== null && gone > t)) n += 1;
    }
    return size > 0 ? n / size : 0;
  }

  /**
   * A show's pace against this season's shows in the same room: the shows (not cancelled, with sales) that
   * have already been as close to their doors as this one is now. With three or more, this show's share sold
   * now against theirs at the same lead: 5 points either way is ahead or behind, else on pace.
   */
  pace(show: BoxShow): { label: "ahead" | "behind" | "on" | null; peers: BoxShow[]; me: number; avg: number | null; rows: { orders: Row[]; tickets: Row[] } | undefined } | null {
    const w = this.world();
    const mine = this.sold(show);
    if (w === null || mine === null) return null;
    const lead = show.doors - this.app.now;
    // The room's latest shows that have been this close to their doors: a few, however long the room's history.
    const peers = w.shows
      .filter((p) => p.id !== show.id && p.room?.id === show.room?.id && p.status !== "cancelled" && p.doors - lead <= this.app.now)
      .sort((a, b) => b.doors - a.doors)
      .slice(0, PACE_LOOK)
      .filter((p) => {
        const sold = this.sold(p);
        return sold !== null && sold.taken > 0;
      })
      .slice(0, PACE_PEERS);
    const me = mine.size > 0 ? mine.taken / mine.size : 0;
    const rows = peers.length >= 3 ? this.paceRows([show.id, ...peers.map((p) => p.id)]) : undefined;
    if (peers.length < 3 || rows === undefined) return { label: null, peers, me, avg: null, rows };
    const avg = peers.reduce((a, p) => a + this.shareAt(p, p.doors - lead, rows, this.sold(p)!.size), 0) / peers.length;
    const label = me >= avg + 0.05 ? "ahead" : me <= avg - 0.05 ? "behind" : "on";
    return { label, peers, me, avg, rows };
  }

  // ── going places ─────────────────────────────────────────────────────────

  go(bx: BoxScreenId, patch: Partial<BoxState> = {}, force = false): void {
    const s = this.s;
    if (this.doorOnly() && bx !== "door") bx = "door";
    if (!force && this.app.state.bx === "editor" && s.edDirty && bx !== "editor") {
      this.app.openSheet("bxLeave", { to: bx, patch });
      return;
    }
    const next: Partial<BoxState> = { drawer: null, bq: "", ...patch };
    if (force && this.app.state.bx === "editor") next.edDirty = false;
    // Leaving the editor with nothing changed: the draft goes (the next open takes the show as it is then).
    if (this.app.state.bx === "editor" && bx !== "editor" && !s.edDirty && patch.ed === undefined) next.ed = null;
    if (bx === "orders" && patch.ord === undefined) next.ord = { ...s.ord, ev: "all", tab: false, st: "all", q: "", n: 50 };
    this.app.setState({ bx, box: { ...s, ...next }, sheet: null });
    if (typeof document !== "undefined") {
      document.querySelector("[data-bo-scroll]")?.scrollTo?.({ top: 0 });
      setTimeout(() => {
        const h = document.querySelector<HTMLElement>("[data-bo-scroll] h1");
        if (h !== null) {
          if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
          h.focus({ preventScroll: true });
        }
      }, 30);
    }
  }

  /** A show's own screen: its Sales, its editor, its orders, its guest list, postpone or cancel. */
  goShow(id: Id, tab: "sales" | "editor" | "orders" | "guests" | "pc"): void {
    const s = this.s;
    if (tab === "orders") return this.go("orders", { bev: id, ord: { ...s.ord, ev: id, tab: true, st: "all", q: "", n: 50 } });
    if (tab === "pc") return this.go("pc", { bev: id, pc: { ...s.pc, ev: id, tried: false, msg: null, rfPage: 0 } });
    if (tab === "guests") return this.go("guests", { bev: id, gl: { ...s.gl, ev: id, err: null } });
    const draft = s.ed as { id?: Id | null } | null;
    if (tab === "editor" && draft !== null && draft.id !== id) return this.go("editor", { bev: id, ed: null, edDirty: false, edTried: false });
    this.go(tab, { bev: id });
  }

  openDrawer(orderId: Id): void {
    this.app.remember();
    this.set({ drawer: orderId, bq: "" });
  }
  closeDrawer(): void {
    this.set({ drawer: null });
    this.app.refocus();
  }

  /** A show's public page, in a new tab (a draft has none: its preview opens instead). */
  openPublic(show: BoxShow): void {
    if (show.status === "draft") {
      this.goShow(show.id, "editor");
      return;
    }
    if (typeof window === "undefined") return;
    const base = `${window.location.origin}${(import.meta.env.BASE_URL ?? "/").replace(/\/staff\/?$/, "/customer/")}`;
    window.open(`${base.replace(/\/$/, "")}/events/${show.slug}`, "_blank", "noopener");
  }

  /** The door's takings of this venue day's shows that have finished (one line a show). */
  endOfNight(w: BoxWorld): string {
    const now = this.app.now;
    const start = this.venueDayStart(now);
    const end = this.venueDayEnd(now);
    const ended = w.shows.filter((e) => e.status === "published" && e.days.some((d) => d.doors >= start && d.doors < end) && now >= e.ends);
    if (ended.length === 0) return tr("The door's takings show here after the show.");
    return ended.map((e) => this.takings(e)).join("\n");
  }

  /**
   * End of night for a show: each door's card and cash (its door sales among
   * them), the door sales, the pay-at-the-door money collected, and what was
   * never collected.
   */
  takings(show: BoxShow): string {
    const orders = this.all("orders", [{ column: "event_id", eq: show.id }]) ?? [];
    const cols = orders.length === 0 ? [] : (this.allIn("door_collections", "order_id", orders.map((o) => o.id), [{ column: "state", eq: "taken" }]) ?? []);
    const sale = new Set(orders.filter((o) => o["channel"] === "door").map((o) => o.id));
    const sum = (rows: Row[]) => rows.reduce((a, c) => a + Number(c["amount"] ?? 0), 0);
    const byDoor = (this.rows("devices") ?? [])
      .map((d) => {
        const mine = cols.filter((c) => c["device_id"] === d.id);
        if (mine.length === 0) return null;
        return tr("{door}: card {card}, cash {cash} (door sales included)", { door: String(d["name"] ?? ""), card: money(sum(mine.filter((c) => c["method"] === "card"))), cash: money(sum(mine.filter((c) => c["method"] === "cash"))) });
      })
      .filter((x): x is string => x !== null);
    const sales = sum(cols.filter((c) => sale.has(c["order_id"] as Id)));
    const collected = sum(cols.filter((c) => !sale.has(c["order_id"] as Id)));
    const missed = orders.filter((o) => o["status"] === "not_collected" || (o["status"] === "door" && Number(o["balance"] ?? 0) > 0));
    const owed = missed.reduce((a, o) => a + Number(o["balance"] ?? 0), 0);
    const missedIds = missed.map((o) => o.id).sort((a, b) => a - b);
    const owing = missedIds.length === 0 ? [] : (this.all("tickets", [{ column: "event_id", eq: show.id }, { column: "status", in: LIVE_TICKET }]) ?? []).filter((t) => missedIds.includes(t["order_id"] as Id));
    const missedTickets = owing.filter((t) => Number(t["due"] ?? 0) - Number(t["collected"] ?? 0) > 0.004).length;
    const parts = [
      ...(byDoor.length > 0 ? byDoor : [tr("nothing taken at the door")]),
      tr("door sales {amount}", { amount: money(sales) }),
      tr("collected {amount}", { amount: money(collected) }),
      ...(owed > 0 ? [tr("not collected {amount} ({tickets})", { amount: money(owed), tickets: plural(missedTickets, "{n} ticket", "{n} tickets") })] : []),
    ];
    return `${show.name} · ${parts.join(" · ")}`;
  }

  // ── writes ───────────────────────────────────────────────────────────────

  /** A transfer reminder to the buyer, the deadline unchanged. */
  async remind(order: Row): Promise<void> {
    const ok = await this.write(
      () => this.port.mail("transfer-reminder", [{ order_id: order.id, event_id: order["event_id"], to_address: order["email"] }]),
      tr("Reminder sent to {email}", { email: String(order["email"] ?? "") }),
      "mail",
      { tables: ["messages"], once: `remind:${String(order.id)}` },
    );
    if (ok) this.set((s) => ({ reminded: { ...s.reminded, [String(order.id)]: this.app.now } }));
  }

  /** An overdue (or awaiting) transfer's tickets back on sale now; the buyer is told. */
  async release(orderId: Id, number: string): Promise<void> {
    await this.write(() => this.port.move(orderId, "released"), tr("{number} released", { number }), "undo-2", { tables: ["orders"] });
  }

  /**
   * Money recorded on an order; paid in full, it moves to paid (a released order too, when its seats still
   * fit). `key` is the sheet's: pressed again after a lost answer, the same payment is found, not a second.
   */
  async pay(order: Row, amount: number, method: "bank_transfer" | "card" | "cash", note: string, key?: string): Promise<void> {
    await this.write(async () => {
      const payment = await this.port.recordPayment(order.id, amount, method, note === "" ? null : note, key);
      const after = (await this.port.list("orders", { where: [{ column: "id", eq: order.id }] })).rows[0];
      const st = String(after?.["status"] ?? "");
      if (after !== undefined && Number(after["balance"] ?? 0) <= 0 && ["door", "awaiting_transfer", "overdue", "released", "not_collected"].includes(st)) {
        try {
          // How it was paid goes with the move: the receipt says it, and a transfer's payment email is sent on it.
          await this.port.move(order.id, "paid", { paid_method: method }, st);
        } catch (error) {
          // The move refused (a released order's seats have gone): the money is not left recorded against it.
          await this.port.update("payments", payment.id, { voided: true }).catch(() => undefined);
          throw error;
        }
      }
    }, tr("{amount} recorded on {number}", { amount: money(amount), number: String(order["number"]) }), "badge-check", { tables: ["payments", "orders"] });
  }

  async refund(order: Row, amount: number, method: "bank_transfer" | "card" | "cash", kind: "cancelled_tickets" | "goodwill", key?: string): Promise<void> {
    await this.write(() => this.port.recordRefund(order.id, amount, method, kind, key), tr("Refund of {amount} recorded", { amount: money(amount) }), "undo-2", { tables: ["refunds"] });
  }

  /** A ticket's name changed; it keeps its code. */
  async rename(ticketId: Id, name: string): Promise<void> {
    await this.write(() => this.port.update("tickets", ticketId, { holder_name: name }), tr("Name changed"), "user-pen", { tables: ["tickets"] });
  }

  /** Tickets cancelled by the box office; all of an order's live ones, and the order goes too (on a waitlist show they go to it). */
  async cancelTickets(order: Row, ids: Id[], all: boolean, waitlist: boolean): Promise<void> {
    await this.write(async () => {
      await this.port.cancelTickets(ids, "box_office");
      if (all && !waitlist) await this.port.move(order.id, "cancelled", { cancel_cause: "box_office" }, String(order["status"]));
    }, plural(ids.length, "{n} ticket cancelled", "{n} tickets cancelled"), "ticket-x", { tables: ["tickets", "orders"] });
  }

  /** A refund request approved: the asked tickets are cancelled and what is due back shows on the order. */
  async approve(ids: Id[]): Promise<void> {
    await this.write(() => this.port.cancelTickets(ids, "request"), tr("Approved — record the refund once it is paid back"), "check", { tables: ["tickets"] });
  }

  /** A refund request declined: the tickets work again; the reason goes on the order's notes. */
  async decline(order: Row, ids: Id[], reason: string): Promise<void> {
    await this.write(async () => {
      for (const id of ids) await this.port.declineRefund(id);
      if (reason.trim() !== "") await this.addNote(order.id, tr("Refund request declined: {reason}", { reason: reason.trim() }));
    }, tr("Declined"), "x", { tables: ["tickets", "orders"] });
  }

  async note(order: Row, text: string): Promise<void> {
    await this.write(() => this.addNote(order.id, text.trim()), tr("Note added"), "sticky-note", { tables: ["orders"] });
  }

  /**
   * A line added under an order's notes, read afresh just before the write (never from a copy on screen,
   * which a colleague's note may have overtaken) and written only while the order is in the state read.
   */
  private async addNote(orderId: Id, line: string): Promise<void> {
    const now = (await this.port.list("orders", { where: [{ column: "id", eq: orderId }], limit: 1 })).rows[0];
    if (now === undefined) throw new ApiError(404, "NOT_FOUND");
    await this.port.update("orders", orderId, { note: joinNote(now["note"], line) }, String(now["status"]));
  }

  /** The order's email sent again: its tickets, or the transfer details while it waits for the money. */
  async resend(order: Row): Promise<void> {
    const waiting = ["awaiting_transfer", "overdue"].includes(String(order["status"]));
    await this.write(
      () => this.port.mail(waiting ? "transfer-waiting" : "tickets", [{ order_id: order.id, event_id: order["event_id"], to_address: order["email"], repeat_key: `resend-${String(this.app.now)}` }]),
      tr("Resent to {email}", { email: String(order["email"] ?? "") }),
      "mail",
      { tables: ["messages"], once: `resend:${String(order.id)}` },
    );
  }

  /** A transfer checkout's confirm link sent again, while it waits for the buyer. */
  async resendConfirm(order: Row): Promise<void> {
    await this.write(
      () => this.port.mail("transfer-confirm", [{ order_id: order.id, event_id: order["event_id"], to_address: order["email"], repeat_key: `again-${String(this.app.now)}` }]),
      tr("Resent to {email}", { email: String(order["email"] ?? "") }),
      "mail",
      { tables: ["messages"], once: `resend:${String(order.id)}` },
    );
  }

  // ── guest lists, waitlists, codes ────────────────────────────────────────

  async addGuests(eventId: Id, guests: { name: string; plus: number; on_behalf: string; note: string }[]): Promise<boolean> {
    return this.write(
      async () => {
        for (const g of guests) await this.port.create("guest_list", { event_id: eventId, name: g.name, plus: g.plus, on_behalf: g.on_behalf === "" ? null : g.on_behalf, note: g.note === "" ? null : g.note });
      },
      guests.length === 1 ? tr("{name} added to the guest list", { name: guests[0]!.name }) : plural(guests.length, "{n} name added", "{n} names added"),
      "user-plus",
      { tables: ["guest_list"] },
    );
  }
  async removeGuest(id: Id, name: string): Promise<void> {
    await this.write(() => this.port.remove("guest_list", id), tr("{name} removed", { name }), "user-minus", { tables: ["guest_list"] });
  }
  async setListCloses(eventId: Id, at: string | null): Promise<void> {
    await this.write(() => this.port.update("events", eventId, { guest_list_closes_at: at }), "", "check", { tables: ["events"] });
  }
  /** The places back offered to the next people, in joining order (the next is offered what's back). */
  async offer(eventId: Id): Promise<void> {
    await this.write(
      async () => {
        const made = await this.port.offerWaitlist(eventId);
        if (made.length === 0) throw new BoxRefusal(tr("Nothing to offer right now: the places back are already held or taken."));
      },
      tr("Offered — they have {hours} hours to claim", { hours: this.world()?.settings.offerHours ?? 12 }),
      "send",
      { tables: ["orders", "tickets", "waitlist"], once: `offer:${String(eventId)}` },
    );
  }
  /**
   * Someone put on a show's waitlist by the box office (their account found by the address, or made);
   * someone who left, was taken off or missed an offer is put back, at the end of the list.
   */
  async addWaiting(eventId: Id, name: string, email: string, qty: number): Promise<boolean> {
    const address = email.trim().toLowerCase();
    return this.write(
      async () => {
        const was = (await this.port.list("waitlist", { where: [{ column: "event_id", eq: eventId }, { column: "email", eq: address }], limit: 1 })).rows[0];
        if (was !== undefined && ["missed", "left", "removed"].includes(String(was["status"]))) {
          await this.port.update("waitlist", was.id, { status: "waiting", qty, order_id: null }, String(was["status"]));
          return;
        }
        const found = (await this.port.list("customers", { where: [{ column: "email", eq: address }], limit: 1 })).rows[0];
        const customer = found ?? (await this.port.create("customers", { email: address, name }));
        await this.port.create("waitlist", { event_id: eventId, customer_id: customer.id, email: address, qty });
      },
      tr("{name} added to the waitlist", { name }),
      "user-plus",
      { tables: ["customers", "waitlist"] },
    );
  }
  /** Off the waitlist; someone holding an offer has it ended (its order let run out), so its places are back. */
  async removeWaiting(row: Row, name: string): Promise<void> {
    await this.write(
      async () => {
        if (row["status"] !== "offered") {
          await this.port.update("waitlist", row.id, { status: "removed" }, "waiting");
          return;
        }
        // The offer's order: named on the place, or found by the place it was made for.
        const offer =
          row["order_id"] !== null && row["order_id"] !== undefined
            ? (row["order_id"] as Id)
            : (await this.port.list("orders", { where: [{ column: "waitlist_id", eq: row.id }, { column: "status", eq: "offered" }], limit: 1 })).rows[0]?.id;
        if (offer === undefined) throw new BoxRefusal(tr("That offer has already ended."));
        await this.port.move(offer, "expired", {}, "offered");
      },
      tr("{name} removed from the waitlist", { name }),
      "user-minus",
      { tables: ["waitlist", "orders"] },
    );
  }
  /** Places back with nobody left waiting: on sale again. */
  async putBack(eventId: Id, n: number): Promise<void> {
    await this.write(async () => {
      const back = await this.port.list("tickets", { where: [{ column: "event_id", eq: eventId }, { column: "status", eq: "returned" }], limit: n });
      for (const t of back.rows) await this.port.update("tickets", t.id, { status: "released" }, "returned");
    }, plural(n, "{n} ticket back on sale", "{n} tickets back on sale"), "undo-2", { tables: ["tickets"] });
  }
  async toggleCode(code: Row): Promise<void> {
    const on = yes(code["active"]);
    await this.write(
      () => this.port.update("codes", code.id, { active: !on }),
      on ? tr("{code} turned off", { code: String(code["code"]) }) : tr("{code} turned on", { code: String(code["code"]) }),
      "ticket-percent",
      { tables: ["codes"], once: `code:${String(code.id)}` },
    );
  }
  async saveCode(id: Id | null, values: Record<string, unknown>): Promise<boolean> {
    return this.write(() => (id === null ? this.port.create("codes", values) : this.port.update("codes", id, values)), tr("{code} saved", { code: String(values["code"]) }), "ticket-percent", { tables: ["codes"] });
  }

  // ── messages, postponing and cancelling ─────────────────────────────────

  /**
   * Who a message to a show's buyers reaches: one email an order (to its buyer's address), and one to each
   * friend holding a ticket of it. Everyone with a live order; one ticket type's; or those not in yet.
   *
   * A friend's copy is about their ticket and is theirs: it names the ticket and the friend as its customer, so
   * Adminium sends it to the friend's own address on file with their ticket's link — never the buyer's order.
   */
  audience(show: BoxShow, to: "everyone" | "type" | "not_in", typeId: Id | null): { rows: Record<string, unknown>[]; people: number; orders: number; holders: number } | undefined {
    const cancelled = show.status === "cancelled";
    const orders = rowsOf(this.all("orders", [{ column: "event_id", eq: show.id }, cancelled ? { column: "cancel_cause", eq: "show" } : { column: "status", in: LIVE }]));
    const tickets = rowsOf(this.all("tickets", [{ column: "event_id", eq: show.id }]));
    const ins = to === "not_in" ? rowsOf(this.all("check_ins", [{ column: "door_event_id", eq: show.id }])) : { rows: [] as Row[] };
    if (orders === undefined || tickets === undefined || ins === undefined) return undefined;
    const seen = new Set(ins.rows.map((c) => c["ticket_id"]));
    const live = (t: Row) => cancelled || LIVE_TICKET.includes(String(t["status"]));
    const keep = orders.rows.filter((o) => {
      const mine = tickets.rows.filter((t) => t["order_id"] === o.id && live(t));
      if (to === "type") return mine.some((t) => t["ticket_type_id"] === typeId);
      if (to === "not_in") return mine.some((t) => !seen.has(t.id));
      return true;
    }).filter((o) => typeof o["email"] === "string" && o["email"] !== "");
    const holders = tickets.rows.filter((t) => keep.some((o) => o.id === t["order_id"]) && live(t) && t["holder_customer_id"] !== null && t["holder_customer_id"] !== undefined && typeof t["holder_email"] === "string" && t["holder_email"] !== keep.find((o) => o.id === t["order_id"])?.["email"]);
    const rows = [
      ...keep.map((o) => ({ order_id: o.id, to_address: o["email"] })),
      ...holders.map((t) => ({ ticket_id: t.id, customer_id: t["holder_customer_id"] })),
    ];
    return { rows, people: new Set(keep.map((o) => String(o["email"]).toLowerCase())).size, orders: keep.length, holders: holders.length };
  }

  /** Who a message reaches, once Adminium has answered (asked now when the screen has not asked yet). */
  private async audienceNow(show: BoxShow, to: "everyone" | "type" | "not_in", typeId: Id | null): Promise<ReturnType<Box["audience"]>> {
    for (let i = 0; i < 5; i += 1) {
      const who = this.audience(show, to, typeId);
      if (who !== undefined) return who;
      await this.app.idle();
    }
    return this.audience(show, to, typeId);
  }

  /**
   * A message sent to a show's buyers now (or a waiting one, as it stands now; or one that stopped part-way,
   * finished). The words typed are cleared only once it has gone.
   */
  async sendMessage(show: BoxShow, values: Record<string, unknown>, waiting: Id | null): Promise<void> {
    const to = values["audience"] as "everyone" | "type" | "not_in";
    const who = await this.audienceNow(show, to, (values["ticket_type_id"] as Id | null) ?? null);
    if (who === undefined) return;
    const counts = { people: who.people, order_count: who.orders };
    const ok = await this.write(
      async () => {
        if (waiting !== null) await this.port.sendBroadcast(waiting, { ...values, ...counts }, who.rows);
        else await this.port.broadcast({ ...values, ...counts, event_id: show.id }, who.rows, true);
      },
      plural(who.people, "Sent to {n} person", "Sent to {n} people"),
      "send",
      { tables: ["broadcasts", "messages"], words: (error) => (sentByAnother(error) ? tr("Someone else is sending this message already — it goes out once.") : null) },
    );
    if (ok) this.set((s) => ({ msg: { ...s.msg, subj: null, body: null, waiting: null } }));
  }

  /**
   * A test of the message, to the signed-in person's own address. The message's words live on the message
   * itself (its email reads them from there), so a test keeps it as a message waiting to be sent: Send then
   * sends that one.
   */
  async testMessage(show: BoxShow, values: Record<string, unknown>): Promise<void> {
    const me = this.me();
    if (me?.email === undefined || me.email === null) return;
    const waiting = this.s.msg.waiting;
    let id = waiting;
    const ok = await this.write(
      async () => {
        const saved = waiting === null ? await this.port.broadcast({ ...values, event_id: show.id, people: 0, order_count: 0 }, [], false) : await this.port.update("broadcasts", waiting, values, "waiting");
        id = saved.id;
        await this.port.mail("broadcast", [{ event_id: show.id, broadcast_id: saved.id, to_address: me.email }]);
      },
      tr("Test sent to {email}", { email: me.email ?? "" }),
      "mail",
      { tables: ["broadcasts", "messages"], once: "test" },
    );
    if (ok && id !== null) this.set((s) => ({ msg: { ...s.msg, waiting: id } }));
  }

  /**
   * A show moved: its times and every one of its days in one write (a failure leaves nothing half-moved),
   * the date it was, the refund window; then its message sent now, or kept waiting in Messages. A message
   * that did not go is offered again on the show's Postpone or cancel.
   */
  async postpone(show: BoxShow, at: { doors: string; start: string; curfew: string; refundUntil: string }, message: { subject: string; body: string }, send: boolean, newWords: string): Promise<void> {
    const who = await this.audienceNow(show, "everyone", null);
    if (who === undefined) return;
    // Every day moves by as much as the first.
    const by = Date.parse(at.doors) - show.doors;
    const moved = (t: number | null) => (t === null ? null : new Date(t + by).toISOString());
    const one = show.days.length === 1;
    const days = show.days.map((d) => (one ? { id: d.id, doors_at: at.doors, curfew_at: at.curfew } : { id: d.id, doors_at: moved(d.doors), last_entry_at: moved(d.lastEntry), curfew_at: moved(d.curfew) }));
    const last = show.days[show.days.length - 1];
    const curfew = one || last === undefined ? at.curfew : moved(last.curfew);
    const ok = await this.write(
      async () => {
        await this.port.saveEvent(
          show.id,
          {
            doors_at: at.doors,
            starts_at: at.start,
            curfew_at: curfew,
            ends_at: curfew,
            refund_until: at.refundUntil,
            ...(show.was === null ? { was_starts_at: new Date(show.start).toISOString() } : {}),
          },
          { event_days: days },
        );
        await this.port.broadcast(
          { event_id: show.id, audience: "everyone", template: "moved", subject: message.subject, body: message.body, people: who.people, order_count: who.orders },
          who.rows,
          send,
        );
      },
      tr("{name} moved to {when}", { name: show.name, when: newWords }),
      "calendar-clock",
      { tables: ["events", "event_days", "broadcasts", "messages"] },
    );
    if (ok) this.set((s) => ({ pc: { ...s.pc, tried: false, msg: null, date: "", until: "" } }));
  }

  /**
   * A show cancelled, or a cancel that stopped part-way finished: the show, then each live order, then its
   * held emails with the words typed (kept on the show's message first, so a later run sends the same),
   * at the pace the person's rate limit allows; how far it got shows as it goes.
   */
  async cancelShow(show: BoxShow, message: { subject: string; body: string }): Promise<void> {
    const progress = (p: RunProgress) => this.set((s) => ({ pc: { ...s.pc, run: p } }));
    await this.write(
      () => cancelRun(this.port, show.id, message, { progress }),
      tr("{name} cancelled", { name: show.name }),
      "calendar-x",
      { tables: ["events", "orders", "broadcasts", "messages"] },
    );
    this.set((s) => ({ pc: { ...s.pc, tried: false, msg: null, rfTab: "to", rfPage: 0, run: null } }));
  }

  /** Settings saved: the venue's, its rooms and its doors. */
  async saveSettings(): Promise<void> {
    const d = this.s.set;
    const w = this.world();
    if (d === null || w === null) return;
    const rooms = d.rooms.map((r) => ({ ...r }));
    const devices = d.devices.map((x) => ({ ...x }));
    let gone = [...d.gone];
    const ok = await this.write(async () => {
      // Removals first: a door that is still in use is refused before anything else is written.
      for (const id of [...gone]) {
        await this.port.remove("devices", id);
        gone = gone.filter((x) => x !== id);
      }
      // A venue with no settings row yet (the sample removed, nothing saved since): the first save makes it.
      if (w.settingsRow.id === 0) await this.port.create("settings", d.settings);
      else await this.port.update("settings", w.settingsRow.id, d.settings);
      for (const r of rooms) {
        const values = { name: r["name"], capacity: Number(r["capacity"]), note: r["note"] ?? null };
        if (r.id > 0) await this.port.update("rooms", r.id, values);
        else r.id = (await this.port.create("rooms", { ...values, kind: "room" })).id;
      }
      for (const dev of devices) {
        if (dev.id > 0) await this.port.update("devices", dev.id, { name: dev["name"] });
        else dev.id = (await this.port.create("devices", { name: dev["name"] })).id;
      }
    }, tr("Settings saved"), "check", { tables: ["settings", "rooms", "devices"] });
    // Saved, or not all of it: what was made keeps its id, so trying again makes nothing twice.
    this.set({ set: ok ? null : { ...d, rooms, devices, gone } });
  }

  /** A message written earlier and waiting: into Messages, as it was written, to review and send. */
  reviewWaiting(b: Row): void {
    const to = b["audience"] === "type" || b["audience"] === "not_in" ? b["audience"] : "everyone";
    const show = this.world()?.byId.get(b["event_id"] as Id);
    const [subj, body] = [String(b["subject"] ?? ""), String(b["body"] ?? "")];
    // A postponement written before the show moved again names a day the show no longer has: its words
    // are made again from the show's dates (the composer's own, when it is handed none).
    const stale = b["template"] === "moved" && show !== undefined && staleMoved(subj, body, fD(show.start));
    this.go("msgs", {
      msg: { ev: b["event_id"] as Id, to, typeId: (b["ticket_type_id"] as Id | null) ?? null, tpl: String(b["template"] ?? "other"), subj: stale ? null : subj, body: stale ? null : body, waiting: b.id },
    });
  }

  /** New order: for a walk-in, comps or a phone booking, on the show chosen (or the next one). */
  newOrder(eventId: Id | null): void {
    const ev = eventId ?? this.nextShow()?.id ?? null;
    this.app.openSheet("bxNew", { ev, q: {}, names: {}, email: "", how: "", err: {}, key: mintKey("bo") });
  }

  /**
   * A box-office order: made held with its tickets (Adminium judges the places, and the total against the
   * one on screen), then moved on at once — paid now (its payment first), to pay at the door, waiting for a
   * transfer (the buyer's email required), or at no charge. A refused move lets the new order go, so
   * nothing stays held. The retry key is the sheet's and what it asks for: pressed again after a lost
   * answer, the same order is found; asked for something else, it is a new order; an order let go after a
   * failure is never reported made, and the sheet takes a fresh key.
   */
  async createOrder(o: {
    eventId: Id;
    tickets: { ticket_type_id: Id; holder_name: string | null }[];
    email: string;
    buyer: string;
    how: "paidnow" | "door" | "transfer" | "none";
    method: "card" | "cash";
    key: string;
    /** The total the sheet showed, as Adminium priced it (absent while it has not answered). */
    expect?: number;
  }): Promise<void> {
    let made: Row | null = null;
    let letGo = false;
    const key = `${o.key}-${hashKey(JSON.stringify([o.eventId, o.tickets, o.email, o.buyer, o.how, o.method, o.expect ?? null]))}`;
    const ok = await this.write(
      async () => {
        const reply = await this.port.newOrder(
          {
            values: { event_id: o.eventId, email: o.email === "" ? null : o.email, buyer_name: o.buyer === "" ? null : o.buyer, channel: "box_office" },
            tickets: o.tickets,
            ...(o.expect === undefined ? {} : { expect: { total: o.expect } }),
          },
          key,
        );
        const id = reply.data.id;
        const status = String(reply.data["status"] ?? "");
        if (reply.replayed === true && status !== "held") {
          // The same press made it all the way before: it is made. Let go (or run out) since: it is not.
          if (LIVE.includes(status)) {
            made = reply.data;
            return;
          }
          letGo = true;
          throw new BoxRefusal(tr("That order was let go when it failed, so nothing was made. Press Create again to make it afresh."));
        }
        let payment: Row | null = null;
        try {
          if (o.how === "paidnow") {
            const total = Number(reply.data["total"] ?? 0);
            // Money already recorded by the same press is found by its key, never recorded twice.
            if (total > 0) payment = await this.port.recordPayment(id, total, o.method, null, `${key}-pay`);
            await this.port.move(id, "paid", { paid_method: o.method }, "held");
          } else await this.port.move(id, o.how === "door" ? "door" : o.how === "transfer" ? "awaiting_transfer" : "no_charge", {}, "held");
        } catch (error) {
          if (payment !== null) await this.port.update("payments", payment.id, { voided: true }).catch(() => undefined);
          letGo = await this.port.move(id, "let_go", {}, "held").then(() => true, () => false);
          throw error;
        }
        made = reply.data;
      },
      "",
      "check",
      { words: (error) => this.placesWords(error, o.eventId) ?? this.priceWords(error), tables: ["orders", "payments"] },
    );
    // A let-go order's key is spent: the next press makes a new order.
    if (!ok && letGo) this.app.patchSheet({ key: mintKey("bo") });
    if (ok && made !== null) {
      const number = String((made as Row)["number"] ?? "");
      this.openDrawer((made as Row).id);
      this.app.toast(tr("{number} created", { number }), "check");
    }
  }

  /** A price changed since the sheet showed it: the new total named. */
  priceWords(error: unknown): string | null {
    if (!isApiError(error) || error.code !== "PRICE_CHANGED") return null;
    const total = Number(error.params["total"]);
    return Number.isFinite(total) ? tr("The price changed to {total}. Check it with them, then press Create again.", { total: money(total) }) : null;
  }

  /** A full pool named: "Comps: all 4 are issued." — or the show's own places. */
  placesWords(error: unknown, eventId: Id): string | null {
    if (!isApiError(error) || error.code !== "CAPACITY_FULL") return null;
    const w = this.world();
    const show = w?.byId.get(eventId);
    const pool = error.params["pool"];
    const type = show?.types.find((t) => t.id === pool);
    if (type !== undefined) {
      const left = this.sold(show!)?.byType.get(type.id)?.left ?? 0;
      return left <= 0 ? tr("{type}: all {n} are issued.", { type: type.short, n: type.capacity ?? 0 }) : plural(left, "{type}: only {n} left.", "{type}: only {n} left.", { type: type.short });
    }
    return tr("{name} has no places left for that many.", { name: show?.name ?? "" });
  }

  /** Signed out: Adminium's sign-in next (the demo goes back to the audience's side). Unsaved changes are asked about first. */
  signOut(anyway = false): void {
    if (this.app.state.bx === "editor" && this.s.edDirty && this.app.state.sheet?.kind !== "bxLeave") {
      this.app.openSheet("bxLeave", { signOut: true });
      return;
    }
    // Check-ins the door has not sent yet are asked about first; signing out takes tonight's list off the phone.
    if (!anyway && unsentScans() > 0) {
      this.app.openSheet("drSignOut", {});
      return;
    }
    this.app.closeSheet();
    for (const forget of this.onSignOut) forget();
    this.app.setState({ door: null });
    try {
      localStorage.removeItem("wv-door-queue");
    } catch {
      // Nothing kept.
    }
    if (this.port.signOut !== undefined) {
      void this.port.signOut();
      return;
    }
    this.app.setPersona("audience");
    this.app.toast(tr("Signed out"), "log-out");
  }

  /** "Leave without saving": on to where the box office was going (or signed out). */
  leaveEditor(sh: Record<string, unknown>): void {
    this.set({ edDirty: false, ed: null });
    this.app.closeSheet();
    if (sh["signOut"] === true) return this.signOut();
    this.go((sh["to"] ?? "events") as BoxScreenId, (sh["patch"] ?? {}) as Partial<BoxState>, true);
  }

  /** The orders on screen, every page of them, as a file. */
  async exportOrders(query: ListQuery, format: string, n: number): Promise<void> {
    await this.write(async () => {
      const all = await this.port.list("orders", { ...query, limit: 100_000 });
      const w = this.world();
      const head = [tr("Order"), tr("Buyer"), tr("Email"), tr("Show"), tr("Date"), tr("Tickets"), tr("Total"), tr("Status"), tr("Placed")];
      const cell = (v: unknown) => `"${String(v ?? "").replace(/[\u2066-\u2069]/g, "").replace(/"/g, '""')}"`;
      const rows = all.rows.map((o) => {
        const show = w?.byId.get(o["event_id"] as Id);
        return [o["number"], o["buyer_name"], o["email"], show?.name, show === undefined ? "" : new Date(show.start).toISOString().slice(0, 10), o["ticket_count"], Number(o["total"] ?? 0).toFixed(2), o["status"], o["created_at"]];
      });
      const csv = [head, ...rows].map((r) => r.map(cell).join(",")).join("\n");
      if (typeof document === "undefined") return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = `orders.${format === "csv" ? "csv" : format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }, plural(n, "{n} order exported", "{n} orders exported"), "download", { tables: [], once: "export" });
  }

  // ── the event editor ─────────────────────────────────────────────────────

  /** The live preview of the draft's public page. */
  previewNode(draft: Draft, phone: boolean, full: boolean): ReactNode {
    return createElement(PreviewPane, { box: this, draft, phone, full, key: full ? "full" : "aside" });
  }

  /** A poster picked: a picture of 1200 px or wider, up to 10 MB (a JPG, PNG or WebP), kept as the show's. */
  async pickPoster(file: File): Promise<void> {
    const put = (p: Partial<Draft>) => this.set({ ed: { ...(this.s.ed as Draft), ...p }, edDirty: true });
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return put({ posterError: tr("That file isn't a picture we can use (JPG, PNG or WebP).") });
    if (file.size > 10 * 1024 * 1024) return put({ posterError: tr("That picture is over 10 MB.") });
    const width = await new Promise<number>((resolve) => {
      if (typeof Image === "undefined") return resolve(0);
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        resolve(img.naturalWidth);
        URL.revokeObjectURL(url);
      };
      img.onerror = () => resolve(0);
      img.src = url;
    });
    if (width < 1200) return put({ posterError: tr("That picture is {n} px wide — posters need at least 1200 px.", { n: width }) });
    try {
      const url = this.port.uploadPoster !== undefined ? await this.port.uploadPoster(file, (this.s.ed as Draft | null)?.id ?? null) : URL.createObjectURL(file);
      put({ image: url, posterError: null });
    } catch (error) {
      put({ posterError: refusalOf(error) });
    }
  }

  /** The show saved with its days, types, acts and questions; the editor then reads it back as saved. */
  async saveEvent(draft: Draft, rows: () => Promise<{ values: Record<string, unknown>; children: EventChildren }>): Promise<void> {
    let saved: Row | null = null;
    const ok = await this.write(
      async () => {
        const send = await rows();
        saved = await this.port.saveEvent(draft.id, send.values, send.children);
      },
      draft.pub === "draft" ? tr("Draft saved — only the box office can see it") : tr("Saved — the public page is up to date"),
      "check",
      { tables: ["events", "event_days", "ticket_types", "acts", "questions"] },
    );
    if (!ok || saved === null) return;
    this.set({ edDirty: false, edTried: false, bev: (saved as Row).id });
    // Asked again and answered before the draft is rebuilt from what was saved (never from the answers before).
    this.world();
    await this.app.idle();
    this.world();
    await this.app.idle();
    this.set({ ed: null, edDirty: false });
  }

  /** A new show in the editor (the editor's own module fills the draft). */
  newEvent(): void {
    this.go("editor", { ed: null, edDirty: true, bev: null });
  }

  /** A write from a sheet: busy while Adminium answers, the sheet closed and a toast after; a refusal in the sheet. */
  /**
   * `tables` are what the write touches: only the answers they can have changed are asked again. A press
   * while the sheet is still busy, or a second press of the same button (`once`) while the first is on its
   * way, does nothing: the same thing is never written twice by a double click.
   */
  async write(
    run: () => Promise<unknown>,
    done: string,
    icon = "check",
    opts: { keepSheet?: boolean; words?: (error: unknown) => string | null; tables?: readonly string[]; once?: string } = {},
  ): Promise<boolean> {
    if (this.app.state.sheet?.["busy"] === true) return false;
    if (opts.once !== undefined) {
      if (this.flying.has(opts.once)) return false;
      this.flying.add(opts.once);
    }
    if (this.app.state.sheet !== null) this.app.patchSheet({ busy: true, refusal: null });
    try {
      await run();
      this.refresh(opts.tables);
      if (opts.keepSheet !== true && this.app.state.sheet !== null) this.app.closeSheet();
      else if (this.app.state.sheet !== null) this.app.patchSheet({ busy: false });
      if (done !== "") this.app.toast(done, icon);
      return true;
    } catch (error) {
      const words = opts.words?.(error) ?? refusalOf(error);
      if (this.app.state.sheet !== null) this.app.patchSheet({ busy: false, refusal: words });
      else this.app.toast(words, "circle-alert");
      this.refresh(opts.tables);
      return false;
    } finally {
      if (opts.once !== undefined) this.flying.delete(opts.once);
    }
  }
  /** The buttons whose write is on its way (a second press waits for none). */
  private readonly flying = new Set<string>();
}

/** "{n} ticket|{n} tickets", in the reader's language. */
export const plural = (n: number, one: string, many: string, words: Record<string, string | number> = {}): string => tr(`${one}|${many}`, { ...words, n });

/** A note added under the order's earlier ones. */
const joinNote = (was: unknown, line: string): string => (typeof was === "string" && was.trim() !== "" ? `${was}\n${line}` : line).slice(-1000);

/** A refusal the box office itself words (nothing to offer, an order already let go). */
export class BoxRefusal extends Error {
  readonly words: string;
  constructor(words: string) {
    super(words);
    this.name = "BoxRefusal";
    this.words = words;
  }
}

/** A retry key: the sheet's own, 22 characters or more (Adminium keeps 22 to 64). */
export const mintKey = (prefix: string): string => `${prefix}-${String(Date.now())}-${Math.random().toString(36).slice(2, 8).padEnd(6, "0")}`;
/** What a press asks for, as a short part of its key: another ask is another key. */
export function hashKey(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Rows as a list reads them (undefined while Adminium has not answered). */
const rowsOf = (rows: Row[] | undefined): { rows: Row[] } | undefined => (rows === undefined ? undefined : { rows });

/**
 * A message someone else claimed first: Adminium answers the second claim that the message is going out
 * already (`STATE_UNCHANGED`), or, once it has gone, that it is no longer waiting.
 */
export function sentByAnother(error: unknown): boolean {
  if (!isApiError(error)) return false;
  if (error.code === "STATE_UNCHANGED") return error.params["column"] === "status";
  return error.code === "STATE_MOVE_REFUSED" && error.params["column"] === "status" && error.params["named"] === "waiting";
}

/** A refusal in the box office's words: what Adminium refused, and why when it says. */
export function refusalOf(error: unknown): string {
  if (error instanceof BoxRefusal) return error.words;
  if (!isApiError(error)) return tr("That didn't go through — check the connection and try again.");
  const p = error.params;
  switch (error.code) {
    case "CAPACITY_FULL":
      return tr("There aren't enough places left for that.");
    case "UNIQUE_VIOLATION":
      return tr("That's already there.");
    case "FK_VIOLATION":
    case "CONFLICT":
      return tr("Other records still use this, so it stays.");
    case "STATE_MOVE_REFUSED":
      return p["requires"] === "time" ? tr("It's too late for that now.") : tr("Adminium didn't allow that move just now.");
    case "UNAUTHENTICATED":
    case "SESSION_EXPIRED":
      return tr("You're signed out — sign in again.");
    case "TABLE_FORBIDDEN":
    case "FORBIDDEN":
    case "COLUMN_FORBIDDEN":
      return tr("Your role can't do that.");
    case "VALIDATION_FAILED":
      return tr("Adminium didn't take that — check the values.");
    case "RATE_LIMITED":
      return tr("Too many requests from this sign-in just now. Wait a minute, then try again — nothing was written.");
    case "TOO_MANY_ROWS":
      return tr("There are too many rows to read at once here.");
    case "SAVE_FIRST":
      return tr("Save the show first, then add its poster.");
    default:
      return tr("Adminium didn't take that.");
  }
}

/** The door's check-ins and payments this phone has not sent yet (kept in the browser, so counted even before the door is opened). */
export function unsentScans(): number {
  try {
    const v = JSON.parse(localStorage.getItem("wv-door-queue") ?? "[]") as unknown;
    return Array.isArray(v) ? v.length : 0;
  } catch {
    return 0;
  }
}

/** An instant from a stored value, or null. */
export const at = (v: unknown): number | null => ms(v);

/** Whether a waiting postponement's words name the show's new day nowhere: written for a date it has left. */
export function staleMoved(subject: string, body: string, day: string): boolean {
  return day !== "" && !subject.includes(day) && !body.includes(day);
}
