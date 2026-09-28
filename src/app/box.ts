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
import { isApiError, type HistoryEntry, type Id, type ListQuery, type ListReply, type PoolCount, type Row, type Where } from "../data/wire.ts";
import { tr } from "../i18n/tr.ts";
import { boxWorldOf, type BoxShow, type BoxWorld } from "./boxWorld.ts";
import { day0, money, ms } from "./fmt.ts";
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
    bq: "",
    qAt: -1,
    drawer: null,
    ord: { ev: "all", tab: false, st: "all", q: "", n: 50 },
    gl: { ev: null, name: "", plus: 0, by: "", note: "", err: null },
    wl: { ev: null },
    msg: { ev: null, to: "everyone", typeId: null, tpl: null, subj: null, body: null, waiting: null },
    pc: { ev: null, mode: "post", date: "", doors: "21:00", stage: "22:00", until: "", msg: null, tried: false, rfTab: "to", rfPage: 0 },
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

export class Box {
  readonly app: WaveApp;
  private memo: { key: unknown[]; w: BoxWorld } | null = null;

  constructor(app: WaveApp) {
    this.app = app;
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
    const got = WHOLE.map((t) => this.rows(t));
    if (got.some((r) => r === undefined)) return this.memo?.w ?? null;
    if (this.memo !== null && this.memo.key.every((k, i) => k === got[i])) return this.memo.w;
    const [settings, rooms, events, event_days, acts, ticket_types, questions] = got as Row[][];
    const w = boxWorldOf({ settings: settings!, rooms: rooms!, events: events!, event_days: event_days!, acts: acts!, ticket_types: ticket_types!, questions: questions! });
    this.memo = { key: got, w };
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

  /** After a write, or the clock moving: every answer asked again (what is on screen stays until they come). */
  refresh(): void {
    this.app.refresh("box:");
  }

  // ── the venue's day and a show's state ───────────────────────────────────

  /** The start of the venue day an instant falls in (the day starts at `day_starts_at`, 06:00). */
  venueDayStart(t: number): number {
    const w = this.world();
    const [h, m] = String(w?.settingsRow["day_starts_at"] ?? "06:00").split(":").map(Number) as [number, number];
    const shift = (h * 60 + (m || 0)) * 60_000;
    return day0(t - shift) + shift;
  }
  isPast(show: BoxShow): boolean {
    return this.app.now > show.ends;
  }
  /** The show's word on the box office's lists. */
  status(show: BoxShow): { txt: string; k: "danger" | "muted" | "warn" | "info" | "pos"; id: "cancelled" | "past" | "post" | "draft" | "sold" | "soon" | "on" } {
    if (show.status === "cancelled") return { txt: tr("Cancelled"), k: "danger", id: "cancelled" };
    if (this.isPast(show)) return { txt: tr("Past"), k: "muted", id: "past" };
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
    const returned = this.count("tickets", [
      { column: "event_id", eq: eventId },
      { column: "status", eq: "returned" },
    ]);
    const offered = this.count("tickets", [
      { column: "event_id", eq: eventId },
      { column: "order_status", eq: "offered" },
      { column: "status", in: LIVE_TICKET },
    ]);
    return returned === undefined || offered === undefined ? undefined : Math.max(0, returned - offered);
  }

  // ── the usual pace ───────────────────────────────────────────────────────

  /** Every order and ticket of some shows (placing and cancel times, states): what a pace is worked out from. */
  paceRows(ids: Id[]): { orders: Row[]; tickets: Row[] } | undefined {
    const where = [{ column: "event_id", in: [...ids].sort((a, b) => a - b) }];
    const orders = this.list("orders", { where, limit: 10_000 });
    const tickets = this.list("tickets", { where, limit: 20_000 });
    return orders === undefined || tickets === undefined ? undefined : { orders: orders.rows, tickets: tickets.rows };
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
    const peers = w.shows.filter((p) => {
      if (p.id === show.id || p.room?.id !== show.room?.id || p.status === "cancelled" || p.doors - lead > this.app.now) return false;
      const sold = this.sold(p);
      return sold !== null && sold.taken > 0;
    });
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
    if (!force && this.app.state.bx === "editor" && s.edDirty && bx !== "editor") {
      this.app.openSheet("bxLeave", { to: bx, patch });
      return;
    }
    const next: Partial<BoxState> = { drawer: null, bq: "", ...patch };
    if (force && this.app.state.bx === "editor") next.edDirty = false;
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

  /** The door's takings of this venue day's shows that have finished, by door; what was never collected. */
  endOfNight(w: BoxWorld): string {
    const now = this.app.now;
    const start = this.venueDayStart(now);
    const ended = w.shows.filter((e) => e.status === "published" && e.days.some((d) => d.doors >= start && d.doors < start + 86_400_000) && now >= e.ends);
    if (ended.length === 0) return tr("The door's takings show here after the show.");
    const devices = this.rows("devices") ?? [];
    return ended
      .map((e) => {
        const orders = this.list("orders", { where: [{ column: "event_id", eq: e.id }], limit: 5000 })?.rows ?? [];
        const ids = orders.map((o) => o.id);
        const cols = ids.length === 0 ? [] : (this.list("door_collections", { where: [{ column: "order_id", in: ids }, { column: "state", eq: "taken" }], limit: 5000 })?.rows ?? []);
        const byDoor = devices
          .map((d) => {
            const mine = cols.filter((c) => c["device_id"] === d.id);
            const sum = (m: string) => mine.filter((c) => c["method"] === m).reduce((a, c) => a + Number(c["amount"] ?? 0), 0);
            return mine.length === 0 ? null : tr("{door}: card {card}, cash {cash}", { door: String(d["name"] ?? ""), card: money(sum("card")), cash: money(sum("cash")) });
          })
          .filter((x): x is string => x !== null);
        const missed = orders.filter((o) => o["status"] === "not_collected" || (o["status"] === "door" && Number(o["balance"] ?? 0) > 0));
        const owed = missed.reduce((a, o) => a + Number(o["balance"] ?? 0), 0);
        const parts = [...(byDoor.length > 0 ? byDoor : [tr("nothing taken at the door")]), ...(owed > 0 ? [tr("not collected {amount}", { amount: money(owed) })] : [])];
        return `${e.name}: ${parts.join(" · ")}`;
      })
      .join("\n");
  }

  // ── writes ───────────────────────────────────────────────────────────────

  /** A transfer reminder to the buyer, the deadline unchanged. */
  async remind(order: Row): Promise<void> {
    const ok = await this.write(
      () => this.port.mail("transfer-reminder", [{ order_id: order.id, event_id: order["event_id"], to_address: order["email"] }]),
      tr("Reminder sent to {email}", { email: String(order["email"] ?? "") }),
      "mail",
    );
    if (ok) this.set((s) => ({ reminded: { ...s.reminded, [String(order.id)]: this.app.now } }));
  }

  /** An overdue (or awaiting) transfer's tickets back on sale now; the buyer is told. */
  async release(orderId: Id, number: string): Promise<void> {
    await this.write(() => this.port.move(orderId, "released"), tr("{number} released", { number }), "undo-2");
  }

  /** Money recorded on an order; paid in full, it moves to paid (a released order too, when its seats still fit). */
  async pay(order: Row, amount: number, method: "bank_transfer" | "card" | "cash", note: string): Promise<void> {
    await this.write(async () => {
      await this.port.recordPayment(order.id, amount, method, note === "" ? null : note);
      const after = (await this.port.list("orders", { where: [{ column: "id", eq: order.id }] })).rows[0];
      const st = String(after?.["status"] ?? "");
      if (after !== undefined && Number(after["balance"] ?? 0) <= 0 && ["door", "awaiting_transfer", "overdue", "released", "not_collected"].includes(st)) {
        await this.port.move(order.id, "paid");
      }
    }, tr("{amount} recorded on {number}", { amount: money(amount), number: String(order["number"]) }), "badge-check");
  }

  async refund(order: Row, amount: number, method: "bank_transfer" | "card" | "cash", kind: "cancelled_tickets" | "goodwill"): Promise<void> {
    await this.write(() => this.port.recordRefund(order.id, amount, method, kind), tr("Refund of {amount} recorded", { amount: money(amount) }), "undo-2");
  }

  /** A ticket's name changed; it keeps its code. */
  async rename(ticketId: Id, name: string): Promise<void> {
    await this.write(() => this.port.update("tickets", ticketId, { holder_name: name }), tr("Name changed"), "user-pen");
  }

  /** Tickets cancelled by the box office; all of an order's live ones, and the order goes too (on a waitlist show they go to it). */
  async cancelTickets(order: Row, ids: Id[], all: boolean, waitlist: boolean): Promise<void> {
    await this.write(async () => {
      await this.port.cancelTickets(ids, "box_office");
      if (all && !waitlist) await this.port.move(order.id, "cancelled", { cancel_cause: "box_office" });
    }, plural(ids.length, "{n} ticket cancelled", "{n} tickets cancelled"), "ticket-x");
  }

  /** A refund request approved: the asked tickets are cancelled and what is due back shows on the order. */
  async approve(ids: Id[]): Promise<void> {
    await this.write(() => this.port.cancelTickets(ids, "request"), tr("Approved — record the refund once it is paid back"), "check");
  }

  /** A refund request declined: the tickets work again; the reason goes on the order's notes. */
  async decline(order: Row, ids: Id[], reason: string): Promise<void> {
    await this.write(async () => {
      for (const id of ids) await this.port.declineRefund(id);
      if (reason.trim() !== "") await this.port.update("orders", order.id, { note: joinNote(order["note"], tr("Refund request declined: {reason}", { reason: reason.trim() })) });
    }, tr("Declined"), "x");
  }

  async note(order: Row, text: string): Promise<void> {
    await this.write(() => this.port.update("orders", order.id, { note: joinNote(order["note"], text.trim()) }), tr("Note added"), "sticky-note");
  }

  /** The order's email sent again: its tickets, or the transfer details while it waits for the money. */
  async resend(order: Row): Promise<void> {
    const waiting = ["awaiting_transfer", "overdue"].includes(String(order["status"]));
    await this.write(
      () => this.port.mail(waiting ? "transfer-waiting" : "tickets", [{ order_id: order.id, event_id: order["event_id"], to_address: order["email"], repeat_key: `resend-${String(this.app.now)}` }]),
      tr("Resent to {email}", { email: String(order["email"] ?? "") }),
      "mail",
    );
  }

  /** A transfer checkout's confirm link sent again, while it waits for the buyer. */
  async resendConfirm(order: Row): Promise<void> {
    await this.write(
      () => this.port.mail("transfer-confirm", [{ order_id: order.id, event_id: order["event_id"], to_address: order["email"], repeat_key: `again-${String(this.app.now)}` }]),
      tr("Resent to {email}", { email: String(order["email"] ?? "") }),
      "mail",
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
    );
  }
  async removeGuest(id: Id, name: string): Promise<void> {
    await this.write(() => this.port.remove("guest_list", id), tr("{name} removed", { name }), "user-minus");
  }
  async setListCloses(eventId: Id, at: string | null): Promise<void> {
    await this.write(() => this.port.update("events", eventId, { guest_list_closes_at: at }), "");
  }
  /** The places back offered to the next people, in joining order (the next is offered what's back). */
  async offer(eventId: Id): Promise<void> {
    await this.write(async () => {
      const made = await this.port.offerWaitlist(eventId);
      const n = made.length;
      if (n === 0) throw new Error("nothing offered");
    }, tr("Offered — they have {hours} hours to claim", { hours: this.world()?.settings.offerHours ?? 12 }), "send");
  }
  /** Someone put on a show's waitlist by the box office (their account found by the address, or made). */
  async addWaiting(eventId: Id, name: string, email: string, qty: number): Promise<boolean> {
    const address = email.trim().toLowerCase();
    return this.write(async () => {
      const found = (await this.port.list("customers", { where: [{ column: "email", eq: address }], limit: 1 })).rows[0];
      const customer = found ?? (await this.port.create("customers", { email: address, name }));
      await this.port.create("waitlist", { event_id: eventId, customer_id: customer.id, email: address, qty });
    }, tr("{name} added to the waitlist", { name }), "user-plus");
  }
  /** Off the waitlist; someone holding an offer has it ended, so its places are back. */
  async removeWaiting(row: Row, name: string): Promise<void> {
    await this.write(async () => {
      if (row["status"] === "offered" && row["order_id"] !== null && row["order_id"] !== undefined) await this.port.move(row["order_id"] as Id, "expired");
      else await this.port.update("waitlist", row.id, { status: "removed" });
    }, tr("{name} removed from the waitlist", { name }), "user-minus");
  }
  /** Places back with nobody left waiting: on sale again. */
  async putBack(eventId: Id, n: number): Promise<void> {
    await this.write(async () => {
      const back = await this.port.list("tickets", { where: [{ column: "event_id", eq: eventId }, { column: "status", eq: "returned" }], limit: n });
      for (const t of back.rows) await this.port.update("tickets", t.id, { status: "released" });
    }, plural(n, "{n} ticket back on sale", "{n} tickets back on sale"), "undo-2");
  }
  async toggleCode(code: Row): Promise<void> {
    const on = code["active"] === true;
    await this.write(() => this.port.update("codes", code.id, { active: !on }), on ? tr("{code} turned off", { code: String(code["code"]) }) : tr("{code} turned on", { code: String(code["code"]) }), "ticket-percent");
  }
  async saveCode(id: Id | null, values: Record<string, unknown>): Promise<boolean> {
    return this.write(() => (id === null ? this.port.create("codes", values) : this.port.update("codes", id, values)), tr("{code} saved", { code: String(values["code"]) }), "ticket-percent");
  }

  // ── messages, postponing and cancelling ─────────────────────────────────

  /**
   * Who a message to a show's buyers reaches: one email an order (to its buyer's address), and one to each
   * friend holding a ticket of it. Everyone with a live order; one ticket type's; or those not in yet.
   */
  audience(show: BoxShow, to: "everyone" | "type" | "not_in", typeId: Id | null): { rows: Record<string, unknown>[]; people: number; orders: number; holders: number } | undefined {
    const cancelled = show.status === "cancelled";
    const orders = this.list("orders", { where: [{ column: "event_id", eq: show.id }, cancelled ? { column: "cancel_cause", eq: "show" } : { column: "status", in: LIVE }], limit: 5000 });
    const tickets = this.list("tickets", { where: [{ column: "event_id", eq: show.id }], limit: 10_000 });
    const ins = to === "not_in" ? this.list("check_ins", { where: [{ column: "door_event_id", eq: show.id }], limit: 10_000 }) : { rows: [] as Row[], total: 0 };
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
      ...holders.map((t) => ({ order_id: t["order_id"], ticket_id: t.id, to_address: t["holder_email"] })),
    ];
    return { rows, people: new Set(keep.map((o) => String(o["email"]).toLowerCase())).size, orders: keep.length, holders: holders.length };
  }

  /** A message sent to a show's buyers now (or a waiting one, as it stands now). */
  async sendMessage(show: BoxShow, values: Record<string, unknown>, waiting: Id | null): Promise<void> {
    const to = values["audience"] as "everyone" | "type" | "not_in";
    const who = this.audience(show, to, (values["ticket_type_id"] as Id | null) ?? null);
    if (who === undefined) return;
    const counts = { people: who.people, order_count: who.orders };
    await this.write(
      async () => {
        if (waiting !== null) await this.port.sendBroadcast(waiting, { ...values, ...counts }, who.rows);
        else await this.port.broadcast({ ...values, ...counts, event_id: show.id }, who.rows, true);
      },
      plural(who.people, "Sent to {n} person", "Sent to {n} people"),
      "send",
    );
    this.set((s) => ({ msg: { ...s.msg, subj: null, body: null, waiting: null } }));
  }

  /** A test of the message, to the signed-in person's own address. */
  async testMessage(show: BoxShow, subject: string, body: string): Promise<void> {
    const me = this.me();
    if (me?.email === undefined || me.email === null) return;
    await this.write(
      () => this.port.mail("broadcast", [{ event_id: show.id, to_address: me.email, subject_override: subject, body_override: body }]),
      tr("Test sent to {email}", { email: me.email ?? "" }),
      "mail",
    );
  }

  /**
   * A show moved: its times and its days, the date it was, the refund window; its message sent now, or kept
   * waiting in Messages.
   */
  async postpone(show: BoxShow, at: { doors: string; start: string; curfew: string; refundUntil: string }, message: { subject: string; body: string }, send: boolean, newWords: string): Promise<void> {
    const who = this.audience(show, "everyone", null);
    if (who === undefined) return;
    const ok = await this.write(
      async () => {
        await this.port.update("events", show.id, {
          doors_at: at.doors,
          starts_at: at.start,
          curfew_at: at.curfew,
          ends_at: at.curfew,
          refund_until: at.refundUntil,
          ...(show.was === null ? { was_starts_at: new Date(show.start).toISOString() } : {}),
        });
        const day = show.days[0];
        if (show.days.length === 1 && day !== undefined) await this.port.update("event_days", day.id, { doors_at: at.doors, curfew_at: at.curfew });
        await this.port.broadcast(
          { event_id: show.id, audience: "everyone", template: "moved", subject: message.subject, body: message.body, people: who.people, order_count: who.orders },
          who.rows,
          send,
        );
      },
      tr("{name} moved to {when}", { name: show.name, when: newWords }),
      "calendar-clock",
    );
    if (ok) this.set((s) => ({ pc: { ...s.pc, tried: false, msg: null, date: "", until: "" } }));
  }

  /** A show cancelled: the show, then each live order (one write each); its held emails go with the words typed. */
  async cancelShow(show: BoxShow, message: { subject: string; body: string }): Promise<void> {
    await this.write(
      async () => {
        await this.port.cancelShow(show.id);
        const orders = await this.port.list("orders", { where: [{ column: "event_id", eq: show.id }, { column: "cancel_cause", eq: "show" }], limit: 5000 });
        const ids = orders.rows.map((o) => o.id);
        const held = ids.length === 0 ? { rows: [] as Row[] } : await this.port.list("messages", { where: [{ column: "order_id", in: ids }, { column: "status", eq: "held" }], limit: 10_000 });
        for (const m of held.rows) await this.port.update("messages", m.id, { status: "queued", subject_override: message.subject, body_override: message.body, approved_by: this.me()?.name ?? null });
        const people = new Set(orders.rows.map((o) => String(o["email"] ?? "").toLowerCase()).filter((e) => e !== "")).size;
        await this.port.broadcast({ event_id: show.id, audience: "everyone", template: "cancelled", subject: message.subject, body: message.body, people, order_count: orders.rows.length }, [], true);
      },
      tr("{name} cancelled", { name: show.name }),
      "calendar-x",
    );
    this.set((s) => ({ pc: { ...s.pc, tried: false, msg: null, rfTab: "to", rfPage: 0 } }));
  }

  /** Settings saved: the venue's, its rooms and its doors. */
  async saveSettings(): Promise<void> {
    const d = this.s.set;
    const w = this.world();
    if (d === null || w === null) return;
    const ok = await this.write(async () => {
      await this.port.update("settings", w.settingsRow.id, d.settings);
      for (const r of d.rooms) {
        const values = { name: r["name"], capacity: Number(r["capacity"]), note: r["note"] ?? null };
        if (r.id > 0) await this.port.update("rooms", r.id, values);
        else await this.port.create("rooms", { ...values, kind: "room" });
      }
      for (const dev of d.devices) {
        if (dev.id > 0) await this.port.update("devices", dev.id, { name: dev["name"] });
        else await this.port.create("devices", { name: dev["name"] });
      }
      for (const id of d.gone) await this.port.remove("devices", id);
    }, tr("Settings saved"), "check");
    if (ok) this.set({ set: null });
  }

  /** A message written earlier and waiting: into Messages, as it was written, to review and send. */
  reviewWaiting(b: Row): void {
    const to = b["audience"] === "type" || b["audience"] === "not_in" ? b["audience"] : "everyone";
    this.go("msgs", {
      msg: { ev: b["event_id"] as Id, to, typeId: (b["ticket_type_id"] as Id | null) ?? null, tpl: String(b["template"] ?? "other"), subj: String(b["subject"] ?? ""), body: String(b["body"] ?? ""), waiting: b.id },
    });
  }

  /** New order: for a walk-in, comps or a phone booking, on the show chosen (or the next one). */
  newOrder(eventId: Id | null): void {
    const ev = eventId ?? this.nextShow()?.id ?? null;
    this.app.openSheet("bxNew", { ev, q: {}, names: {}, email: "", how: "", err: {}, key: `bo-${String(Date.now())}-${Math.random().toString(36).slice(2, 8)}` });
  }

  /**
   * A box-office order: made held with its tickets (Adminium judges the places), then moved on at once —
   * paid now (its payment first), to pay at the door, waiting for a transfer (the buyer's email required),
   * or at no charge. A refused move lets the new order go, so nothing stays held.
   */
  async createOrder(o: {
    eventId: Id;
    tickets: { ticket_type_id: Id; holder_name: string | null }[];
    email: string;
    buyer: string;
    how: "paidnow" | "door" | "transfer" | "none";
    method: "card" | "cash";
    key: string;
  }): Promise<void> {
    let made: Row | null = null;
    const ok = await this.write(
      async () => {
        const reply = await this.port.newOrder(
          { values: { event_id: o.eventId, email: o.email === "" ? null : o.email, buyer_name: o.buyer === "" ? null : o.buyer, channel: "box_office" }, tickets: o.tickets },
          o.key,
        );
        made = reply.data;
        const id = reply.data.id;
        if (reply.replayed === true && reply.data["status"] !== "held") return;
        try {
          if (o.how === "paidnow") {
            const total = Number(reply.data["total"] ?? 0);
            if (total > 0) await this.port.recordPayment(id, total, o.method, null);
            await this.port.move(id, "paid");
          } else await this.port.move(id, o.how === "door" ? "door" : o.how === "transfer" ? "awaiting_transfer" : "no_charge");
        } catch (error) {
          await this.port.move(id, "let_go").catch(() => undefined);
          throw error;
        }
      },
      "",
      "check",
      { words: (error) => this.placesWords(error, o.eventId) },
    );
    if (ok && made !== null) {
      const number = String((made as Row)["number"] ?? "");
      this.openDrawer((made as Row).id);
      this.app.toast(tr("{number} created", { number }), "check");
    }
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
      return left <= 0 ? tr("{type}: all {n} are issued.", { type: type.short, n: type.capacity ?? 0 }) : plural(left, `${type.short}: only {n} left.`, `${type.short}: only {n} left.`);
    }
    return tr("{name} has no places left for that many.", { name: show?.name ?? "" });
  }

  /** Signed out: Adminium's sign-in next (the demo goes back to the audience's side). Unsaved changes are asked about first. */
  signOut(): void {
    if (this.app.state.bx === "editor" && this.s.edDirty && this.app.state.sheet?.kind !== "bxLeave") {
      this.app.openSheet("bxLeave", { signOut: true });
      return;
    }
    this.app.closeSheet();
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
    }, plural(n, "{n} order exported", "{n} orders exported"), "download");
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
      const url = this.port.uploadPoster !== undefined ? await this.port.uploadPoster(file) : URL.createObjectURL(file);
      put({ image: url, posterError: null });
    } catch (error) {
      put({ posterError: refusalOf(error) });
    }
  }

  /** The show saved with its days, types, acts and questions; the editor then reads it back as saved. */
  async saveEvent(draft: Draft, rows: { values: Record<string, unknown>; children: EventChildren }): Promise<void> {
    let saved: Row | null = null;
    const ok = await this.write(
      async () => {
        saved = await this.port.saveEvent(draft.id, rows.values, rows.children);
      },
      draft.pub === "draft" ? tr("Draft saved — only the box office can see it") : tr("Saved — the public page is up to date"),
      "check",
    );
    if (ok && saved !== null) this.set({ ed: null, edDirty: false, edTried: false, bev: (saved as Row).id });
  }

  /** A new show in the editor (the editor's own module fills the draft). */
  newEvent(): void {
    this.go("editor", { ed: null, edDirty: true, bev: null });
  }

  /** A write from a sheet: busy while Adminium answers, the sheet closed and a toast after; a refusal in the sheet. */
  async write(run: () => Promise<unknown>, done: string, icon = "check", opts: { keepSheet?: boolean; words?: (error: unknown) => string | null } = {}): Promise<boolean> {
    if (this.app.state.sheet !== null) this.app.patchSheet({ busy: true, refusal: null });
    try {
      await run();
      this.refresh();
      if (opts.keepSheet !== true && this.app.state.sheet !== null) this.app.closeSheet();
      if (done !== "") this.app.toast(done, icon);
      return true;
    } catch (error) {
      const words = opts.words?.(error) ?? refusalOf(error);
      if (this.app.state.sheet !== null) this.app.patchSheet({ busy: false, refusal: words });
      else this.app.toast(words, "circle-alert");
      this.refresh();
      return false;
    }
  }
}

/** "{n} ticket|{n} tickets", in the reader's language. */
export const plural = (n: number, one: string, many: string): string => tr(`${one}|${many}`, { n });

/** A note added under the order's earlier ones. */
const joinNote = (was: unknown, line: string): string => (typeof was === "string" && was.trim() !== "" ? `${was}\n${line}` : line).slice(-1000);

/** A refusal in the box office's words: what Adminium refused, and why when it says. */
export function refusalOf(error: unknown): string {
  if (!isApiError(error)) return tr("That didn't go through — check the connection and try again.");
  const p = error.params;
  switch (error.code) {
    case "CAPACITY_FULL":
      return tr("There aren't enough places left for that.");
    case "UNIQUE_VIOLATION":
      return tr("That's already there.");
    case "FOREIGN_KEY_VIOLATION":
      return tr("Other records still use this, so it stays.");
    case "STATE_MOVE_REFUSED":
      return p["requires"] === "time" ? tr("It's too late for that now.") : tr("Adminium didn't allow that move just now.");
    case "FORBIDDEN":
    case "COLUMN_FORBIDDEN":
      return tr("Your role can't do that.");
    case "VALIDATION":
      return tr("Adminium didn't take that — check the values.");
    default:
      return tr("Adminium didn't take that.");
  }
}

/** An instant from a stored value, or null. */
export const at = (v: unknown): number | null => ms(v);
