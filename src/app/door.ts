/**
 * The door, as one controller beside the box office's: which show day this
 * phone is running, what a scan answered, this phone's last scans, the guest
 * list and the door's sales, and the list it keeps for when the signal goes.
 *
 * A check-in is a row Adminium makes or refuses: the door writes it and the
 * refusal says which verdict — wrong show, not paid, refund asked, not today,
 * too early, already in. The door reads the ticket and its order only to
 * word the verdict (the order's number, the amount owed, who let them in).
 * Offline, the list of tonight's tickets kept on the phone judges the scan,
 * and each scan is sent later with its own time, judged by Adminium then.
 *
 * Only a refusal is a verdict: a write Adminium turned away for what it is
 * (a 409 or 422 the door knows). Anything else — no answer in time, a
 * gateway's 502, the rate limit, a session that ended — is no signal: the
 * scan is judged from the list on the phone and kept to send later.
 *
 * Only the box office's build carries this module (`sides.ts`).
 */
import type { DoorPort } from "../data/ports.ts";
import { ApiError, isApiError, type Id, type OrderReply, type Row } from "../data/wire.ts";
import { tr } from "../i18n/tr.ts";
import { boxOf, LIVE, LIVE_TICKET, plural, refusalOf, type Box } from "./box.ts";
import type { BoxShow } from "./boxWorld.ts";
import { codeFace, fD, fT, money, ms, strip } from "./fmt.ts";
import type { WaveApp } from "./wave.ts";
import type { Day } from "./world.ts";

export type Tone = "pos" | "warn" | "info" | "danger";

/** A piece of a line: times, codes, amounts and counts in the mono face. */
export interface Seg {
  t: string;
  mono?: boolean;
}

export interface Verdict {
  k: Tone;
  word: string;
  /** "COLLECT $28.00": the amount, drawn in the mono face inside the word. */
  amount: string;
  name: string;
  type: string;
  /** The show's age check ("18+ — check ID"), on LET IN and COLLECT only. */
  id: string;
  line: Seg[];
  collect: { ticketId: Id; code: string; amount: number; name: string; type: string } | null;
  /** Where the scan came from: focus goes back there. */
  from: "pad" | "find";
  made: number;
}

/** A row of Last scans: this phone's own. */
export interface Scan {
  key: string;
  checkInId: Id | null;
  ticketId: Id;
  code: string;
  name: string;
  type: string;
  at: number;
  /** When this phone made it (a minute's Undo counts from here). */
  made: number;
  paid: { amount: number; method: "card" | "cash" } | null;
  undone: boolean;
  queued: boolean;
}

/** A scan or a collection made without the signal, sent later with its own time. */
export interface Queued {
  kind: "in" | "collect";
  key: string;
  code: string;
  ticketId: Id;
  dayId: Id;
  deviceId: Id | null;
  at: number;
  method?: "card" | "cash";
  /** A collection's amount (for the clash line when it cannot be recorded). */
  amount?: number;
  name: string;
}

export interface DoorState {
  dayId: Id | null;
  tab: "scan" | "guests" | "sell";
  q: string;
  verdict: Verdict | null;
  recent: Scan[];
  sellType: Id | null;
  sellQ: number;
  /** "Before you open": this phone's own ticks, kept nowhere. */
  chk: Record<string, boolean>;
  /** The signal taken away by hand (the demo's "Lose the signal"). */
  offline: boolean;
  /** A write found no signal: offline until the next one goes through. */
  lost: boolean;
  /** The session ended: the door judges from its list, and keeps everything until someone signs in again. */
  signedOut: boolean;
  queue: Queued[];
  clash: string[];
  camera: "off" | "on" | "blocked" | "none";
  busy: boolean;
  /**
   * The door sale being made: its retry key and what it sells (show day, type, how many), kept until it goes
   * through — a second press of the same sale is that sale; any other sale is a new one.
   */
  sellKey: { key: string; sig: string } | null;
}

export function doorFresh(): DoorState {
  return { dayId: null, tab: "scan", q: "", verdict: null, recent: [], sellType: null, sellQ: 1, chk: {}, offline: false, lost: false, signedOut: false, queue: readQueue(), clash: [], camera: "off", busy: false, sellKey: null };
}

const QUEUE_KEY = "wv-door-queue";
const DEVICE_KEY = "wv-door-device";

function readQueue(): Queued[] {
  try {
    const v = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as unknown;
    return Array.isArray(v) ? (v as Queued[]) : [];
  } catch {
    return [];
  }
}
function saveQueue(q: Queued[]): void {
  try {
    if (q.length === 0) localStorage.removeItem(QUEUE_KEY);
    else localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    // A phone that keeps nothing: the queue lives as long as the page.
  }
}

/** Text as the door reads it: full-width letters and digits as plain ones, any dash as "-", Arabic-Indic digits as 0–9, capitals. */
function folded(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .toUpperCase();
}
/** A typed code as the door compares it: capitals, no spaces, Arabic-Indic and full-width digits as 0–9. */
export function typedCode(text: string): string {
  return folded(text).replace(/\s/g, "");
}
/**
 * Whether what was typed is a ticket's code ("K7QX-M2PD", the dash optional, or one space between the halves)
 * rather than a name: "Lux Ilves" and "Jo Hansen" are names.
 */
export const looksLikeCode = (text: string): boolean => /^[A-Z0-9]{4}[\s-]?[A-Z0-9]{4}$/.test(folded(text).trim());
/** A code compared the way Adminium reads one (O as 0, I and L as 1). */
const sameCode = (a: string, b: string): boolean => {
  const n = (s: string) => typedCode(s).replace(/-/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  return n(a) === n(b);
};

/** The show's age check, as the verdict's chip says it. */
export function idChip(age: string): string {
  switch (age) {
    case "18":
      return tr("18+ — check ID");
    case "16":
      return tr("16+ — check ID");
    case "14_adult":
      return tr("14+ — with an adult");
    default:
      return "";
  }
}

/** A sentence whose named parts are drawn in the mono face. */
export function segs(en: string, mono: Record<string, string>, words: Record<string, string | number> = {}): Seg[] {
  const text = tr(en, words);
  return text
    .split(/(\{\w+\})/)
    .filter((p) => p !== "")
    .map((p) => {
      const name = /^\{(\w+)\}$/.exec(p)?.[1];
      return name !== undefined && name in mono ? { t: mono[name]!, mono: true } : { t: p };
    });
}
export const plainLine = (segments: Seg[]): string => segments.map((s) => s.t).join("");

const doors = new WeakMap<WaveApp, Door>();
/** The door's controller of an app (made the first time the door is drawn). */
export function doorOf(app: WaveApp): Door {
  let d = doors.get(app);
  if (d === undefined) {
    d = new Door(app);
    doors.set(app, d);
  }
  return d;
}

export interface Tonight {
  show: BoxShow;
  day: Day;
  opens: number;
  /** Last entry, or the curfew. */
  closes: number;
  ends: number;
}

const MINUTE = 60_000;
/** How long this phone's own writes stand in for Adminium's answer in the list it keeps (its reads catch up well before). */
const OWN_MS = 5 * MINUTE;
/** How many kept scans one replay sends; the rest go with the next try, 15 s on (a returning phone must not spend the person's reads). */
const REPLAY_BATCH = 40;

/** The refusals Adminium gives a door write for what it is: the verdict, and the end of a kept entry. */
const VERDICTS = new Set(["UNIQUE_VIOLATION", "CAPACITY_FULL", "STATE_MOVE_REFUSED", "STATE_UNCHANGED", "STATE_TOO_LATE", "VALIDATION_FAILED", "FK_VIOLATION"]);
/** Whether Adminium refused a write for what it is (a 409 or 422 the door knows) — never a timeout, a 5xx, the rate limit or a session gone. */
export function isVerdict(error: unknown): error is ApiError {
  return isApiError(error) && (error.status === 409 || error.status === 422) && VERDICTS.has(error.code);
}
/** The session over (or its access taken away): nothing this phone sends is taken until someone signs in again. */
export const isSignedOut = (error: unknown): boolean => isApiError(error) && (error.status === 401 || error.status === 403);
/** A read or write Adminium refused as asked (not a verdict of the door's, and not "no signal"): said as it is. */
const plainRefusal = (error: unknown): boolean => isApiError(error) && error.status >= 400 && error.status < 500 && !isSignedOut(error) && error.status !== 408 && error.status !== 429;

/** Tonight's list as it last came from Adminium: every show day of the venue day, what judges a scan without the signal. */
interface Kept {
  dayIds: Id[];
  tickets: Row[];
  orders: Row[];
  checkIns: Row[];
}
/** The list for one show day: tonight's tickets and orders, and that day's check-ins. */
export interface DoorList {
  tickets: Row[];
  orders: Row[];
  checkIns: Row[];
}
/** What a kept check-in names: enough to send it later and to show it in Last scans. */
interface TicketRef {
  ticketId: Id;
  code: string;
  name: string;
  type: string;
}
type OwnTable = "tickets" | "orders" | "check_ins";

const saleKey = (): string => `door-${String(Date.now())}-${Math.random().toString(36).slice(2, 8)}`;
/** Whether a replayed sale's order is still this sale: its show, its tickets, and a state it can still be sold from. */
const sameSale = (reply: OrderReply, t: Tonight, typeId: Id, qty: number): boolean =>
  reply.data["event_id"] === t.show.id &&
  ["held", "door", "paid", "no_charge"].includes(String(reply.data["status"] ?? "")) &&
  reply.tickets.length === qty &&
  reply.tickets.every((x) => x["ticket_type_id"] === typeId);

export class Door {
  readonly app: WaveApp;
  readonly box: Box;
  private kept: Kept | null = null;
  /** This phone's own writes, standing in for Adminium's answer in the list until its reads catch up (a scan never re-reads the list). */
  private own: { made: number; table: OwnTable; row: Row }[] = [];
  /** Check-ins this phone took back, until the list's reads catch up. */
  private undone = new Map<Id, number>();
  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  private held = false;
  private retry: ReturnType<typeof setInterval> | null = null;
  private syncing = false;
  /** Whether this phone was asked once which door it is. */
  askedDevice = false;
  private arrived = new Map<Id, number>();
  private guestBusy = new Set<Id>();

  constructor(app: WaveApp) {
    this.app = app;
    this.box = boxOf(app);
    const before = app.escapeHook;
    app.escapeHook = () => this.escape() || (before?.() ?? false);
    this.box.onSignOut.push(() => this.forget());
    this.port.onSessionEnded?.(() => this.sessionEnded());
    if (typeof window !== "undefined") {
      // Back: whatever is kept goes, and the door says it is online only once Adminium has answered.
      window.addEventListener("online", () => void this.sync(true));
      window.addEventListener("offline", () => this.wentOffline());
    }
    // Scans kept from before the page was reloaded go now.
    if (readQueue().length > 0) setTimeout(() => void this.sync(), 0);
  }

  get port(): DoorPort {
    return this.app.ports.door!;
  }

  get s(): DoorState {
    const cur = this.app.state.door as DoorState | null;
    return cur === null ? doorFresh() : cur;
  }

  set(p: Partial<DoorState> | ((s: DoorState) => Partial<DoorState>)): void {
    const cur = this.s;
    const patch = typeof p === "function" ? p(cur) : p;
    if (patch.queue !== undefined) saveQueue(patch.queue);
    this.app.setState({ door: { ...cur, ...patch } });
  }

  // ── this phone ─────────────────────────────────────────────────────────

  /** The doors this venue has, in use. */
  devices(): Row[] {
    return (this.box.rows("devices") ?? []).filter((d) => d["active"] !== false);
  }
  /** Which door this phone is: chosen on it once, or the only door there is. */
  device(): Row | null {
    const all = this.devices();
    let chosen = this.chosenHere;
    try {
      chosen ??= localStorage.getItem(DEVICE_KEY);
    } catch {
      // This page's own choice, if it made one.
    }
    const byChoice = all.find((d) => String(d.id) === chosen);
    if (byChoice !== undefined) return byChoice;
    const preset = this.app.demo?.doorDevice;
    const byName = preset === undefined ? undefined : all.find((d) => d["name"] === preset);
    if (byName !== undefined) return byName;
    return all.length === 1 ? all[0]! : null;
  }
  /** The door chosen on this page: what a phone that keeps nothing still remembers until it reloads. */
  private chosenHere: string | null = null;
  chooseDevice(id: Id): void {
    this.chosenHere = String(id);
    try {
      localStorage.setItem(DEVICE_KEY, String(id));
    } catch {
      // Kept for this page only.
    }
    this.app.closeSheet();
    this.app.setState({});
  }
  /** Whether this phone still has to say which door it is. */
  needsDevice(): boolean {
    return this.device() === null && this.devices().length > 1;
  }

  online(): boolean {
    const s = this.s;
    const nav = typeof navigator !== "undefined" && navigator.onLine === false;
    return !s.offline && !s.lost && !s.signedOut && !nav;
  }

  // ── tonight ────────────────────────────────────────────────────────────

  /** The show days on this venue day: the one whose check-in is open first, then by their doors. */
  tonight(): Tonight[] {
    const w = this.box.world();
    if (w === null) return [];
    const now = this.app.now;
    const start = this.box.venueDayStart(now);
    const check = Number(w.settingsRow["check_in_minutes"] ?? 30);
    const out: Tonight[] = [];
    for (const show of w.shows) {
      if (show.status !== "published") continue;
      for (const day of show.days) {
        if (day.doors < start || day.doors >= start + 86_400_000) continue;
        const ends = day.curfew ?? show.curfew;
        out.push({ show, day, opens: day.doors - check * MINUTE, closes: day.lastEntry ?? ends, ends });
      }
    }
    const rank = (t: Tonight) => (now >= t.opens && now <= t.closes ? 0 : now < t.opens ? 1 : 2);
    return out.sort((a, b) => rank(a) - rank(b) || a.day.doors - b.day.doors);
  }

  /** The show day this phone is running (the one chosen, else the first of tonight). */
  chosen(): Tonight | null {
    const all = this.tonight();
    return all.find((t) => t.day.id === this.s.dayId) ?? all[0] ?? null;
  }

  /** The next show after tonight, greyed in the picker with its date. */
  next(): { show: BoxShow; day: Day } | null {
    const w = this.box.world();
    if (w === null) return null;
    const end = this.box.venueDayEnd(this.app.now);
    let best: { show: BoxShow; day: Day } | null = null;
    for (const show of w.shows) {
      if (show.status !== "published") continue;
      for (const day of show.days) if (day.doors >= end && (best === null || day.doors < best.day.doors)) best = { show, day };
    }
    return best;
  }

  phase(t: Tonight): "before" | "open" | "after" {
    const now = this.app.now;
    return now < t.opens ? "before" : now > t.closes ? "after" : "open";
  }

  pick(dayId: Id): void {
    this.set({ dayId, verdict: null, q: "", tab: "scan", sellType: null, sellQ: 1 });
  }

  /**
   * Tonight's tickets, their orders and the check-ins of every show day on tonight, as the door last read them
   * (read again with the rest every few minutes, never after each scan), with this phone's own writes since.
   * Undefined while it has not come yet.
   */
  list(t: Tonight): DoorList | undefined {
    if (this.online()) {
      // Every show on tonight: a ticket for the room next door is still named without the signal.
      const all = this.tonight();
      const ids = [...new Set(all.map((x) => x.show.id))].sort((a, b) => a - b);
      const dayIds = [...new Set(all.map((x) => x.day.id))].sort((a, b) => a - b);
      const where = [{ column: "event_id", in: ids.length > 0 ? ids : [t.show.id] }];
      const tickets = this.box.list("tickets", { where, limit: 20_000 });
      const orders = this.box.list("orders", { where, limit: 10_000 });
      const checkIns = this.box.list("check_ins", { where: [{ column: "event_day_id", in: dayIds.length > 0 ? dayIds : [t.day.id] }], limit: 20_000 });
      if (tickets !== undefined && orders !== undefined && checkIns !== undefined) this.kept = { dayIds: dayIds.length > 0 ? dayIds : [t.day.id], tickets: tickets.rows, orders: orders.rows, checkIns: checkIns.rows };
    }
    return this.view(t);
  }

  /** The list for a show day as this phone holds it, reading nothing; undefined when it holds none for that day. */
  private view(t: Tonight): DoorList | undefined {
    const k = this.kept;
    if (k === null || !k.dayIds.includes(t.day.id)) return undefined;
    const now = Date.now();
    this.own = this.own.filter((o) => now - o.made < OWN_MS);
    for (const [id, at] of this.undone) if (now - at >= OWN_MS) this.undone.delete(id);
    return {
      tickets: this.withOwn(k.tickets, "tickets"),
      orders: this.withOwn(k.orders, "orders"),
      checkIns: this.withOwn(k.checkIns, "check_ins").filter((c) => c["event_day_id"] === t.day.id && !this.undone.has(c.id)),
    };
  }
  private withOwn(rows: Row[], table: OwnTable): Row[] {
    const mine = this.own.filter((o) => o.table === table);
    if (mine.length === 0) return rows;
    const byId = new Map(mine.map((o) => [o.row.id, o.row]));
    const out = rows.map((r) => byId.get(r.id) ?? r);
    const there = new Set(rows.map((r) => r.id));
    for (const o of mine) if (!there.has(o.row.id)) out.push(o.row);
    return out;
  }
  /** Rows this phone just wrote or read fresh, kept in its list at once (a scan re-reads nothing else). */
  private keepOwn(table: OwnTable, rows: Row[]): void {
    const made = Date.now();
    const ids = new Set(rows.map((r) => r.id));
    this.own = [...this.own.filter((o) => o.table !== table || !ids.has(o.row.id)), ...rows.map((row) => ({ made, table, row }))];
  }

  /**
   * After a scan: only what it changed is asked again — tonight's count of check-ins, and this door's Last
   * scans and Find's "in" chips when they are drawn. The rest waits for the clock's re-ask.
   */
  private reaskScans(dayId: Id): void {
    this.app.refresh(`box:count:check_ins:${JSON.stringify([{ column: "event_day_id", eq: dayId }])}`);
    this.app.refresh(`box:list:check_ins:{"where":[{"column":"event_day_id","eq":${JSON.stringify(dayId)}},`);
  }
  /** After a sale: the places left, the tickets counted, the check-ins. */
  private reaskSale(t: Tonight): void {
    this.reaskScans(t.day.id);
    this.app.refresh(`box:pools:${String(t.show.id)}`);
    this.app.refresh("box:count:tickets:");
    this.app.refresh(`box:list:tickets:{"where":[{"column":"event_id","eq":${JSON.stringify(t.show.id)}}],"any"`);
  }

  // ── scanning ───────────────────────────────────────────────────────────

  /** A code from the camera, the Find box or a result tapped. */
  async scan(code: string, from: "pad" | "find" = "pad"): Promise<boolean> {
    const t = this.chosen();
    // One person at a time: a code read while a verdict is up (or a scan is on its way) waits for the next read.
    if (t === null || this.s.busy || this.s.verdict !== null) return false;
    this.set({ q: "", busy: true });
    try {
      if (!this.online()) {
        this.judgeHere(t, code, from);
        return true;
      }
      // Let in on this phone and not sent yet (the replay still running): already in, as without the signal.
      const queued = this.s.queue.find((q) => q.kind === "in" && q.dayId === t.day.id && sameCode(q.code, code));
      if (queued !== undefined) {
        const ticket = this.view(t)?.tickets.find((x) => x.id === queued.ticketId);
        this.show(this.alreadyIn(queued.name, ticket === undefined ? "" : this.typeName(t.show, ticket), this.queuedRow(queued), from));
        return true;
      }
      let hit: Awaited<ReturnType<DoorPort["find"]>>;
      try {
        hit = await this.port.find(code, t.day.id);
      } catch (error) {
        if (isApiError(error) && error.status === 404) {
          this.show(this.danger(tr("Not found"), "", segs("No ticket with that code. If they were sent a ticket, ask for the new one.", {}), from));
          return true;
        }
        if (plainRefusal(error)) {
          this.app.toast(refusalOf(error), "circle-alert");
          return true;
        }
        // No answer, a 5xx, the rate limit, the session gone: judged here from the list, as without the signal.
        this.unheard(error);
        this.judgeHere(t, code, from);
        return true;
      }
      if (hit === null) this.show(this.danger(tr("Not found"), "", segs("No ticket with that code. If they were sent a ticket, ask for the new one.", {}), from));
      else await this.admit(t, hit.ticket, hit.order, from, null);
      return true;
    } finally {
      this.set({ busy: false });
    }
  }

  /** A write that got no verdict: the session ended, or no signal. Either way the door judges here and keeps it. */
  private unheard(error: unknown): void {
    if (isSignedOut(error)) this.sessionEnded();
    else this.lose();
  }

  /** The check-in written; Adminium's refusal, when it refuses, says which verdict. */
  private async admit(t: Tonight, ticket: Row, order: Row, from: "pad" | "find", paid: { amount: number; method: "card" | "cash" } | null): Promise<void> {
    const name = holder(ticket);
    const type = this.typeName(t.show, ticket);
    const dev = this.device();
    try {
      const row = await this.port.checkIn(ticket.id, t.day.id, dev?.id ?? null);
      // The list on this phone has it at once; Adminium is asked again only for what the scan changed.
      this.keepOwn("check_ins", [row]);
      this.keepOwn("tickets", [ticket]);
      this.keepOwn("orders", [order]);
      this.reaskScans(t.day.id);
      this.remember({ key: `${String(ticket.id)}:${String(t.day.id)}`, checkInId: row.id, ticketId: ticket.id, code: String(ticket["code"] ?? ""), name, type, at: ms(row["scanned_at"]) ?? this.app.now, made: Date.now(), paid, undone: false, queued: false });
      const typeLine = paid === null ? type : paid.method === "card" ? tr("{type} · paid by card", { type }) : tr("{type} · paid in cash", { type });
      this.show({ k: "pos", word: tr("Let in"), amount: "", name, type: typeLine, id: idChip(t.show.age), line: [], collect: null, from, made: Date.now() });
    } catch (error) {
      if (!isVerdict(error)) {
        // No verdict (the write may even have landed: its replay then meets this phone's own row).
        this.unheard(error);
        // Collected already: only the check-in is owed. Otherwise the ticket and order just read judge it, as offline.
        if (paid !== null) this.enqueue(t, ticket, from, paid);
        else this.judgeLocal(t, ticket, order, from);
        return;
      }
      if (paid !== null) this.remember({ key: `${String(ticket.id)}:${String(t.day.id)}`, checkInId: null, ticketId: ticket.id, code: String(ticket["code"] ?? ""), name, type, at: this.app.now, made: Date.now(), paid, undone: true, queued: false });
      this.reaskScans(t.day.id);
      const v = await this.refused(t, ticket, order, error.code, error.params, from);
      this.show(v);
    }
  }

  /** A refused check-in, in the door's words: read from the ticket and its order. */
  private async refused(t: Tonight, ticket: Row, order: Row, code: string, params: Readonly<Record<string, unknown>>, from: "pad" | "find"): Promise<Verdict> {
    const name = holder(ticket);
    const type = this.typeName(t.show, ticket);
    if (code === "UNIQUE_VIOLATION") {
      const again = await this.port.find(String(ticket["code"] ?? ""), t.day.id).catch(() => null);
      return this.alreadyIn(name, type, again?.checkIn ?? null, from);
    }
    if (code === "STATE_MOVE_REFUSED") {
      const req = String(params["requires"] ?? "");
      const col = String(params["column"] ?? "");
      if (req === "right_show" || col === "right_show") return this.wrongShow(ticket, name, from);
      if (req === "admitted" || col === "admitted") return this.notToday(name, segs("This ticket is for {days}", {}, { days: this.daysOf(t.show, ticket) }), from);
      if (req === "time") return params["bound"] === "after" ? this.tooEarly(t, name, from) : this.notToday(name, segs("This show has finished", {}), from);
      // A linked condition: the ticket, then its order.
      const judged = this.byTicketAndOrder(t, ticket, order, from);
      if (judged !== null) return judged;
    }
    return this.danger(tr("Not valid"), name, [{ t: refusalOf(new ApiError(409, code, { ...params })) }], from);
  }

  /** What a ticket and its order say, in the door's order: not valid, refund asked, not paid yet, collect. */
  private byTicketAndOrder(t: Tonight, ticket: Row, order: Row, from: "pad" | "find"): Verdict | null {
    const name = holder(ticket);
    const type = this.typeName(t.show, ticket);
    const ts = String(ticket["status"] ?? "");
    const os = String(order["status"] ?? "");
    if (ts === "refund_asked") return this.danger(tr("Refund asked"), name, segs("Asked for a refund on {date} — this ticket doesn't work now", { date: strip(fD(ticket["refund_asked_at"])) }), from);
    if (!["valid", "offered"].includes(ts) || os === "cancelled") return this.danger(tr("Not valid"), name, segs("This ticket was cancelled.", {}), from);
    if (os === "released") return this.danger(tr("Not valid"), name, segs("This order was released on {date} — the transfer never came.", { date: strip(fD(order["released_at"])) }), from);
    if (["held", "confirming", "offered", "let_go", "expired"].includes(os)) return this.danger(tr("Not valid"), name, segs("This checkout was never finished.", {}), from);
    if (os === "awaiting_transfer" || os === "overdue") {
      const due = order["pay_by"];
      return this.danger(
        tr("Not paid yet"),
        name,
        segs("Waiting for a bank transfer · order {number} · due {date}, {time}", { number: String(order["number"] ?? ""), date: strip(fD(due)), time: strip(fT(due)) }),
        from,
      );
    }
    if (os === "not_collected") return this.notToday(name, segs("This show has finished", {}), from);
    const owed = Math.round((Number(ticket["due"] ?? 0) - Number(ticket["collected"] ?? 0)) * 100) / 100;
    if (os === "door" && owed > 0) {
      // Money is never taken before check-in opens, nor after it closes.
      if (this.app.now < t.opens) return this.tooEarly(t, name, from);
      if (this.app.now > t.closes) return this.notToday(name, segs("This show has finished", {}), from);
      return {
        k: "info",
        word: tr("Collect"),
        amount: money(owed),
        name,
        type: "",
        id: idChip(t.show.age),
        line: segs("Pay at the door — {type}", {}, { type }),
        collect: { ticketId: ticket.id, code: String(ticket["code"] ?? ""), amount: owed, name, type },
        from,
        made: Date.now(),
      };
    }
    return null;
  }

  private wrongShow(ticket: Row, name: string, from: "pad" | "find"): Verdict {
    const other = this.box.world()?.byId.get(ticket["event_id"] as Id);
    return this.danger(tr("Wrong show"), name, segs("This ticket is for {show}, {date}", { date: strip(fD(other?.start ?? null)) }, { show: other?.name ?? "" }), from);
  }
  private tooEarly(t: Tonight, name: string, from: "pad" | "find"): Verdict {
    return { k: "warn", word: tr("Too early"), amount: "", name, type: "", id: "", line: segs("Check-in opens {time}", { time: strip(fT(t.opens)) }), collect: null, from, made: Date.now() };
  }
  private notToday(name: string, line: Seg[], from: "pad" | "find"): Verdict {
    return this.danger(tr("Not today"), name, line, from);
  }
  private alreadyIn(name: string, type: string, row: Row | null, from: "pad" | "find"): Verdict {
    const dev = row === null ? undefined : this.box.rows("devices")?.find((d) => d.id === row["device_id"]);
    const at = row === null ? null : strip(fT(row["scanned_at"]));
    const line =
      row === null
        ? []
        : dev === undefined
          ? segs("In at {time} by {person}", { time: at! }, { person: String(row["scanned_by"] ?? "") })
          : segs("In at {time} on {door} by {person}", { time: at! }, { door: String(dev["name"] ?? ""), person: String(row["scanned_by"] ?? "") });
    return { k: "warn", word: tr("Already in"), amount: "", name, type, id: "", line, collect: null, from, made: Date.now() };
  }
  private danger(word: string, name: string, line: Seg[], from: "pad" | "find"): Verdict {
    return { k: "danger", word, amount: "", name, type: "", id: "", line, collect: null, from, made: Date.now() };
  }
  /** Without the signal and without a list for this show day: nothing on this phone can judge the ticket. */
  private noList(from: "pad" | "find"): Verdict {
    return { k: "warn", word: tr("No list"), amount: "", name: "", type: "", id: "", line: segs("This phone has no list for this show yet — wait for the signal.", {}), collect: null, from, made: Date.now() };
  }
  /** A check-in kept on this phone, as a row: who let them in, where and when. */
  private queuedRow(q: Queued): Row {
    return { id: 0, scanned_at: new Date(q.at).toISOString(), device_id: q.deviceId, scanned_by: this.box.me()?.name ?? "" };
  }

  /** The days a ticket's type lets in, by weekday ("Saturday", "Saturday and Sunday"). */
  private daysOf(show: BoxShow, ticket: Row): string {
    const names = show.days.filter((d) => ticket[`admits_day${String(d.day)}`] === true).map((d) => new Intl.DateTimeFormat(this.app.state.lang, { weekday: "long", timeZone: this.app.zone }).format(d.doors));
    return names.length <= 1 ? (names[0] ?? "") : tr("{first} and {last}", { first: names.slice(0, -1).join(", "), last: names[names.length - 1]! });
  }
  typeName(show: BoxShow, ticket: Row): string {
    return show.types.find((x) => x.id === ticket["ticket_type_id"])?.short ?? String(ticket["name"] ?? "");
  }

  /** Paid by card or in cash at the verdict, then the check-in. */
  async collect(method: "card" | "cash"): Promise<void> {
    const t = this.chosen();
    const v = this.s.verdict;
    if (t === null || v?.collect == null || this.s.busy) return;
    const c = v.collect;
    this.set({ busy: true });
    try {
      const dev = this.device();
      let paid: Scan["paid"] = { amount: c.amount, method };
      // Without the signal: the money and the check-in kept on this phone, by the ticket the verdict names.
      if (!this.online()) return this.enqueueCollect(t, c, method, v.from);
      try {
        await this.port.collect(c.ticketId, method, dev?.id ?? null);
      } catch (error) {
        if (!isVerdict(error)) {
          this.unheard(error);
          return this.enqueueCollect(t, c, method, v.from);
        }
        // Another phone took it a moment ago (or this one, its answer lost): the check-in goes ahead. Anything else is Adminium's word.
        if (error.code !== "CAPACITY_FULL") {
          this.set({ verdict: null });
          this.app.toast(refusalOf(error), "circle-alert");
          return;
        }
        paid = null;
      }
      let hit: Awaited<ReturnType<DoorPort["find"]>> = null;
      try {
        hit = await this.port.find(c.code, t.day.id);
        // Taken already: its order is paid if nothing is owed (the step a lost answer can miss).
        if (hit !== null && paid === null && ["held", "door"].includes(String(hit.order["status"])) && Number(hit.order["balance"] ?? 0) <= 0) hit = { ...hit, order: await this.port.settle(hit.order.id, method) };
      } catch (error) {
        // The money is Adminium's already: only the check-in is owed, kept by the ticket the verdict names.
        this.unheard(error);
        this.set({ verdict: null });
        this.letInHere(t, { ticketId: c.ticketId, code: c.code, name: c.name, type: c.type }, v.from, paid);
        return;
      }
      this.set({ verdict: null });
      if (hit === null) return;
      await this.admit(t, hit.ticket, hit.order, v.from, paid);
    } finally {
      this.set({ busy: false });
    }
  }

  // ── the verdict on screen ──────────────────────────────────────────────

  private show(v: Verdict): void {
    this.set({ verdict: v });
    this.armClose(v);
  }
  /** Every verdict but COLLECT closes itself after 3 seconds (not while a finger holds it). */
  private armClose(v: Verdict): void {
    if (this.closeTimer !== null) clearTimeout(this.closeTimer);
    this.closeTimer = null;
    if (v.collect !== null) return;
    this.closeTimer = setTimeout(() => {
      this.closeTimer = null;
      if (this.held) return;
      if (this.s.verdict === v) this.dismiss();
    }, 3000);
  }
  /** A finger on the verdict holds it open; lifted, it closes a moment later. */
  hold(on: boolean): void {
    this.held = on;
    const v = this.s.verdict;
    if (!on && v !== null) this.armClose(v);
  }
  dismiss(): void {
    if (this.closeTimer !== null) clearTimeout(this.closeTimer);
    this.closeTimer = null;
    this.held = false;
    const from = this.s.verdict?.from;
    this.set({ verdict: null });
    // Back to where the scan came from: the scan pad, or Find (a result tapped there is gone now).
    if (from !== undefined && typeof document !== "undefined") setTimeout(() => document.getElementById(from === "find" ? "door-q" : "door-pad")?.focus(), 0);
  }
  private escape(): boolean {
    const v = this.s.verdict;
    if (v === null || this.app.state.bx !== "door") return false;
    if (v.collect !== null) return false;
    this.dismiss();
    return true;
  }

  // ── last scans ─────────────────────────────────────────────────────────

  private remember(scan: Scan): void {
    this.set((s) => ({ recent: [scan, ...s.recent.filter((r) => r.key !== scan.key || r.undone)].slice(0, 8) }));
  }

  /** A check-in taken back within its minute (this phone's own); a payment taken stays. */
  async undo(key: string): Promise<void> {
    const r = this.s.recent.find((x) => x.key === key && !x.undone);
    if (r === undefined) return;
    if (r.queued) {
      this.set((s) => ({ queue: s.queue.filter((q) => !(q.key === key && q.kind === "in")), recent: gone(s.recent, r) }));
    } else if (r.checkInId !== null) {
      const id = r.checkInId;
      try {
        await this.port.undo(id);
      } catch (error) {
        if (isSignedOut(error)) this.sessionEnded();
        this.app.toast(isApiError(error) ? refusalOf(error) : tr("That didn't go through — check the connection and try again."), "circle-alert");
        return;
      }
      this.undone.set(id, Date.now());
      this.own = this.own.filter((o) => !(o.table === "check_ins" && o.row.id === id));
      const dayId = Number(key.split(":")[1]);
      if (Number.isFinite(dayId)) this.reaskScans(dayId);
      this.set((s) => ({ recent: gone(s.recent, r) }));
    } else return;
    this.app.toast(r.paid !== null ? tr("Undone — {name} is not checked in. The payment stays.", { name: r.name }) : tr("Undone — {name} is not checked in", { name: r.name }), "undo-2");
  }

  // ── the guest list ─────────────────────────────────────────────────────

  /** A party's arrivals as this phone last wrote them (until Adminium's answer says the same). */
  arrivedOf(g: Row): number {
    const mine = this.arrived.get(g.id);
    const theirs = Number(g["arrived"] ?? 0);
    if (mine === undefined || this.guestBusy.has(g.id)) return mine ?? theirs;
    if (mine === theirs) this.arrived.delete(g.id);
    return theirs;
  }

  /**
   * One more of a party in; a tap on a party all in steps one back. The party is read again just before the
   * write, so a colleague's tick on another phone a moment ago is counted, not written over.
   */
  async tickGuest(g: Row): Promise<void> {
    if (this.guestBusy.has(g.id)) return;
    const tot = Number(g["people"] ?? 1 + Number(g["plus"] ?? 0));
    const shown = this.arrivedOf(g);
    const name = String(g["name"] ?? "");
    const back = shown >= tot;
    this.guestBusy.add(g.id);
    this.arrived.set(g.id, back ? shown - 1 : shown + 1);
    this.app.setState({});
    let next: number;
    try {
      const now = (await this.box.port.list("guest_list", { where: [{ column: "id", eq: g.id }], limit: 1 })).rows[0] ?? g;
      const k = Number(now["arrived"] ?? 0);
      next = back ? Math.max(0, k - 1) : Math.min(tot, k + 1);
      this.arrived.set(g.id, next);
      if (next !== k) {
        const status = next === 0 ? "not_in" : "in";
        await this.box.port.update("guest_list", g.id, { arrived: next, ...(status !== String(now["status"] ?? "not_in") ? { status } : {}) });
      }
    } catch (error) {
      this.arrived.delete(g.id);
      if (isSignedOut(error)) this.sessionEnded();
      this.app.toast(isApiError(error) ? refusalOf(error) : tr("That didn't go through — check the connection and try again."), "circle-alert");
      return;
    } finally {
      this.guestBusy.delete(g.id);
    }
    this.app.refresh("box:list:guest_list:");
    if (next === 0) this.app.toast(tr("Undone — {name} is not in", { name }), "undo-2");
    else this.app.toast(tot > 1 ? tr("{name} — {n} of {total} in", { name, n: next, total: tot }) : tr("{name} — in", { name }), "check");
  }

  // ── selling at the door ────────────────────────────────────────────────

  /**
   * A door sale: the order and its tickets made held (Adminium judges the
   * places), each ticket's money taken on this door, and the order paid once
   * nothing is owed — it never passes through "pay at the door", which is the
   * buyers' own choice and may be switched off. Nothing to pay: issued at no
   * charge (the box office) or paid at nothing (the door). Then each checked in.
   */
  async sell(t: Tonight, typeId: Id, qty: number, method: "card" | "cash" | "none"): Promise<void> {
    if (this.s.busy || !this.online()) return;
    const type = t.show.types.find((x) => x.id === typeId);
    if (type === undefined || qty < 1) return;
    // One key a sale, tied to what it sells: pressed again after a failure it is the same sale (Adminium answers
    // the order already made); another show day, type or number is another sale.
    const sig = `${String(t.day.id)}:${String(typeId)}:${String(qty)}`;
    const was = this.s.sellKey;
    let key = was !== null && was.sig === sig ? was.key : saleKey();
    this.set({ busy: true, sellKey: { key, sig } });
    const dev = this.device();
    const boxOffice = this.box.me()?.roles.includes("box-office") === true;
    const pay = method === "none" ? "card" : method;
    const body = { values: { event_id: t.show.id, buyer_name: tr("Door sale"), channel: "door", email: null }, tickets: Array.from({ length: qty }, () => ({ ticket_type_id: typeId, holder_name: null })) };
    let made = false;
    try {
      let reply = await this.box.port.newOrder(body, key);
      // A retry key answers the order it first made, whatever this press asks: one that is no longer this sale
      // (run out, let go, other tickets) is left as it is, and the sale starts afresh.
      if (reply.replayed === true && !sameSale(reply, t, typeId, qty)) {
        key = saleKey();
        this.set({ sellKey: { key, sig } });
        reply = await this.box.port.newOrder(body, key);
      }
      made = true;
      let order = reply.data;
      const total = Number(order["total"] ?? 0);
      const status = String(order["status"] ?? "held");
      let taken = 0;
      try {
        if (total <= 0) {
          // Nothing to pay: the box office issues it at no charge; the door's own move is to paid.
          if (status === "held") order = await this.box.port.move(order.id, boxOffice ? "no_charge" : "paid");
          else if (status === "door") order = await this.port.settle(order.id, pay);
        } else if (status === "held" || status === "door") {
          for (const tk of reply.tickets) {
            try {
              await this.port.collect(tk.id, pay, dev?.id ?? null);
              taken += 1;
            } catch (error) {
              // Taken already (a retry of this sale): go on.
              if (!isVerdict(error) || error.code !== "CAPACITY_FULL") throw error;
            }
          }
          // Paid once nothing is owed — also when a retry finds every ticket's money taken already.
          order = await this.port.settle(order.id, pay);
        }
      } catch (error) {
        // Refused before any money was taken: the order goes. (The door's role cannot let an order go; its hold runs out instead.)
        if (boxOffice && taken === 0 && isVerdict(error) && status === "held") await this.box.port.move(order.id, "let_go").catch(() => undefined);
        throw error;
      }
      if (!["paid", "no_charge"].includes(String(order["status"] ?? ""))) throw new ApiError(409, "STATE_MOVE_REFUSED", {});
      // Sold: each ticket checked in; one that cannot be sent now is kept on this phone and sent later.
      this.set({ sellKey: null, sellQ: 1 });
      const sold: Row[] = reply.tickets.map((tk) => ({ ...tk, order_status: order["status"] }));
      this.keepOwn("orders", [order]);
      this.keepOwn("tickets", sold);
      const madeAt = Date.now();
      const notIn: string[] = [];
      for (const tk of sold) {
        const ticketKey = `${String(tk.id)}:${String(t.day.id)}`;
        try {
          const row = await this.port.checkIn(tk.id, t.day.id, dev?.id ?? null);
          this.keepOwn("check_ins", [row]);
          this.remember({ key: ticketKey, checkInId: row.id, ticketId: tk.id, code: String(tk["code"] ?? ""), name: tr("Door sale"), type: type.short, at: ms(row["scanned_at"]) ?? this.app.now, made: madeAt, paid: null, undone: false, queued: false });
        } catch (error) {
          if (isVerdict(error)) {
            // In already (a retried sale's own check-in): that is what the sale was for.
            if (error.code !== "UNIQUE_VIOLATION") {
              const v = await this.refused(t, tk, order, error.code, error.params, "pad");
              notIn.push(plainLine(v.line) || v.word);
            }
            continue;
          }
          this.unheard(error);
          this.keep(t, tk, tr("Door sale"), null);
        }
      }
      this.reaskSale(t);
      const said = { n: qty, type: type.short, total: money(total) };
      if (notIn.length === 0) this.app.toast(tr("{n} × {type} sold and checked in · {total}", said), "check");
      else this.app.toast(tr("{n} × {type} sold · {total} — {m} not checked in: {reason}", { ...said, m: notIn.length, reason: notIn[0]! }), "circle-alert");
    } catch (error) {
      this.reaskSale(t);
      // Refused as asked before anything was made: that key made nothing, and the next press is a new sale.
      if (!made && plainRefusal(error)) this.set({ sellKey: null });
      if (isSignedOut(error)) this.sessionEnded();
      else if (!plainRefusal(error)) this.lose();
      this.app.toast(plainRefusal(error) || isSignedOut(error) ? (this.box.placesWords(error, t.show.id) ?? refusalOf(error)) : tr("That didn't go through — check the connection and try again."), "circle-alert");
    } finally {
      this.set({ busy: false });
    }
  }

  // ── without the signal ─────────────────────────────────────────────────

  /** The signal went: tonight's list stays on this phone and judges each scan until it is back. */
  private wentOffline(): void {
    this.app.toast(tr("Signal lost — tonight's list is on this phone"), "wifi-off");
    this.app.setState({});
  }
  /** A write found no signal. */
  private lose(): void {
    if (!this.s.lost) {
      this.set({ lost: true });
      this.wentOffline();
    }
    this.armRetry();
  }
  /** Every 15 s while the signal is gone or anything is kept: the next try (never while signed out). */
  private armRetry(): void {
    if (this.retry !== null || typeof setInterval === "undefined" || this.s.signedOut) return;
    this.retry = setInterval(() => {
      if (this.s.signedOut || (!this.s.lost && this.s.queue.length === 0)) return this.stopRetry();
      void this.sync(true);
    }, 15_000);
  }
  private stopRetry(): void {
    if (this.retry !== null) clearInterval(this.retry);
    this.retry = null;
  }

  /**
   * The session ended (signed out here or elsewhere, timed out, or its access
   * taken away): the door goes on judging from the list on this phone, keeps
   * every check-in and payment, and sends nothing until someone signs in again.
   */
  sessionEnded(): void {
    if (this.s.signedOut) return;
    this.stopRetry();
    this.set({ signedOut: true });
    if (this.app.state.sheet === null) this.app.openSheet("stSignedOut", {});
  }
  /** To Adminium's sign-in; what this phone keeps stays, and goes once the door is open again. */
  signIn(): void {
    this.port.signInAgain?.();
  }

  /** The demo's "Lose the signal" / "Get the signal back". */
  setOffline(off: boolean): void {
    if (off === this.s.offline) return;
    if (off) {
      const t = this.chosen();
      if (t !== null) this.list(t);
      this.set({ offline: true, clash: [] });
      this.wentOffline();
    } else {
      this.set({ offline: false });
      void this.sync();
    }
  }

  /** A ticket of tonight's list by its code: undefined when this phone holds no list for the show day. */
  private fromList(t: Tonight, code: string): { ticket: Row; order: Row } | null | undefined {
    const l = this.view(t);
    if (l === undefined) return undefined;
    const ticket = l.tickets.find((x) => sameCode(String(x["code"] ?? ""), code));
    const order = ticket === undefined ? undefined : l.orders.find((o) => o.id === ticket["order_id"]);
    return ticket === undefined || order === undefined ? null : { ticket, order };
  }

  /** A scan judged by the list on the phone, the check-in kept to send later. */
  private judgeHere(t: Tonight, code: string, from: "pad" | "find"): void {
    const hit = this.fromList(t, code);
    if (hit === undefined) return this.show(this.noList(from));
    if (hit === null) return this.show(this.danger(tr("Not found"), "", segs("No ticket with that code. If they were sent a ticket, ask for the new one.", {}), from));
    this.judgeLocal(t, hit.ticket, hit.order, from);
  }

  /** A ticket judged on this phone, in the door's order; let in, its check-in is kept to send later. */
  private judgeLocal(t: Tonight, ticket: Row, order: Row, from: "pad" | "find"): void {
    const name = holder(ticket);
    if (ticket["event_id"] !== t.show.id) return this.show(this.wrongShow(ticket, name, from));
    const byStatus = this.byTicketAndOrder(t, ticket, order, from);
    if (byStatus !== null && byStatus.collect === null) return this.show(byStatus);
    if (t.show.days.length > 1 && ticket[`admits_day${String(t.day.day)}`] !== true) return this.show(this.notToday(name, segs("This ticket is for {days}", {}, { days: this.daysOf(t.show, ticket) }), from));
    if (this.app.now < t.opens) return this.show(this.tooEarly(t, name, from));
    if (this.app.now > t.closes) return this.show(this.notToday(name, segs("This show has finished", {}), from));
    const key = `${String(ticket.id)}:${String(t.day.id)}`;
    const inRow = this.view(t)?.checkIns.find((c) => c["ticket_id"] === ticket.id) ?? null;
    const queued = this.s.queue.find((q) => q.key === key && q.kind === "in");
    if (inRow !== null) return this.show(this.alreadyIn(name, this.typeName(t.show, ticket), inRow, from));
    if (queued !== undefined) return this.show(this.alreadyIn(name, this.typeName(t.show, ticket), this.queuedRow(queued), from));
    if (byStatus !== null) return this.show(byStatus);
    this.enqueue(t, ticket, from, null);
  }

  /** A check-in kept on this phone to send later (never twice for a ticket and day). */
  private keep(t: Tonight, ticket: Row, name: string, paid: Scan["paid"]): void {
    this.keepRef(t, { ticketId: ticket.id, code: String(ticket["code"] ?? ""), name, type: this.typeName(t.show, ticket) }, paid);
  }
  private keepRef(t: Tonight, ref: TicketRef, paid: Scan["paid"]): void {
    const key = `${String(ref.ticketId)}:${String(t.day.id)}`;
    if (this.s.queue.some((q) => q.key === key && q.kind === "in")) return;
    const dev = this.device();
    const q: Queued = { kind: "in", key, code: ref.code, ticketId: ref.ticketId, dayId: t.day.id, deviceId: dev?.id ?? null, at: this.app.now, name: ref.name };
    this.set((s) => ({ queue: [...s.queue, q] }));
    this.remember({ key, checkInId: null, ticketId: ref.ticketId, code: q.code, name: ref.name, type: ref.type, at: q.at, made: Date.now(), paid, undone: false, queued: true });
  }

  /** Let in without the signal: the check-in kept, the verdict shown. */
  private enqueue(t: Tonight, ticket: Row, from: "pad" | "find", paid: Scan["paid"]): void {
    this.letInHere(t, { ticketId: ticket.id, code: String(ticket["code"] ?? ""), name: holder(ticket), type: this.typeName(t.show, ticket) }, from, paid);
  }
  private letInHere(t: Tonight, ref: TicketRef, from: "pad" | "find", paid: Scan["paid"]): void {
    this.keepRef(t, ref, paid);
    const typeLine = paid === null ? ref.type : paid.method === "card" ? tr("{type} · paid by card", { type: ref.type }) : tr("{type} · paid in cash", { type: ref.type });
    this.show({ k: "pos", word: tr("Let in"), amount: "", name: ref.name, type: typeLine, id: idChip(t.show.age), line: [], collect: null, from, made: Date.now() });
  }
  /** The door money taken without the signal (or its answer lost): kept with the check-in, by the ticket the verdict named. */
  private enqueueCollect(t: Tonight, c: NonNullable<Verdict["collect"]>, method: "card" | "cash", from: "pad" | "find"): void {
    const dev = this.device();
    const key = `${String(c.ticketId)}:${String(t.day.id)}`;
    this.set((s) => ({ queue: [...s.queue, { kind: "collect", key, code: c.code, ticketId: c.ticketId, dayId: t.day.id, deviceId: dev?.id ?? null, at: this.app.now, method, amount: c.amount, name: c.name }] }));
    this.set({ verdict: null });
    this.letInHere(t, { ticketId: c.ticketId, code: c.code, name: c.name, type: c.type }, from, { amount: c.amount, method });
  }

  /** Whether Adminium answers at all (a cheap read), before the door says it is back. */
  private async answers(): Promise<boolean> {
    try {
      await this.port.ping?.();
      return true;
    } catch (error) {
      if (isSignedOut(error)) this.sessionEnded();
      return false;
    }
  }

  /**
   * Back online: each kept scan and collection sent with its own time, in the
   * order they were made, a batch at a time. This phone's own scan already
   * there counts as sent; someone else's is a clash, named with its time and
   * door. Only a refusal ends a kept entry: no answer, a 5xx, the rate limit or
   * a session gone stops the replay with everything still kept, for the next try.
   */
  async sync(quiet = false): Promise<void> {
    if (this.syncing || this.s.signedOut || (!this.online() && !quiet)) return;
    const queue = this.s.queue.slice(0, REPLAY_BATCH);
    if (queue.length === 0) {
      this.syncing = true;
      try {
        if (this.s.lost && !(await this.answers())) return this.armRetry();
      } finally {
        this.syncing = false;
      }
      if (this.s.lost) this.set({ lost: false });
      this.stopRetry();
      return;
    }
    this.syncing = true;
    const clashes: string[] = [];
    const done: Queued[] = [];
    const days = new Set<Id>();
    let synced = 0;
    let unheard: unknown = null;
    const settleRow = (q: Queued, patch: Partial<Scan>) => this.set((s) => ({ recent: s.recent.map((r) => (r.key === q.key && r.queued ? { ...r, queued: false, ...patch } : r)) }));
    try {
      for (const q of queue) {
        // Taken back (Undo) while this ran: not sent.
        if (!this.s.queue.some((x) => sameQueued(x, q))) continue;
        let clash: { line: string | null; id: Id | null };
        try {
          clash = await this.replay(q);
        } catch (error) {
          unheard = error;
          break;
        }
        days.add(q.dayId);
        if (clash.line === null) {
          if (q.kind === "in") synced += 1;
        } else clashes.push(clash.line);
        // This phone's own row: Undo reaches it. Anyone else's: nothing of this phone's to take back.
        if (q.kind === "in") settleRow(q, clash.line === null ? { checkInId: clash.id } : { made: 0 });
        done.push(q);
      }
    } finally {
      this.syncing = false;
    }
    this.set((s) => ({ queue: s.queue.filter((x) => !done.some((d) => sameQueued(d, x))), clash: [...s.clash, ...clashes] }));
    if (unheard !== null) this.unheard(unheard);
    else if (this.s.queue.length === 0) {
      this.set({ lost: false });
      this.stopRetry();
    } else this.armRetry();
    for (const d of days) this.reaskScans(d);
    if (synced + clashes.length === 0) return;
    const said = tr("Back online — {n} check-in synced|Back online — {n} check-ins synced", { n: synced });
    this.app.toast(clashes.length === 0 ? said : `${said} · ${tr("{n} clash|{n} clashes", { n: clashes.length })}`, "wifi");
  }

  /** One kept entry sent: nothing to say when it went (or was this phone's own already), else the clash's words. Throws when there was no verdict. */
  private async replay(q: Queued): Promise<{ line: string | null; id: Id | null }> {
    try {
      if (q.kind === "collect") {
        await this.port.collect(q.ticketId, q.method ?? "card", q.deviceId, q.at);
        return { line: null, id: null };
      }
      const row = await this.port.checkIn(q.ticketId, q.dayId, q.deviceId, q.at);
      this.keepOwn("check_ins", [row]);
      return { line: null, id: row.id };
    } catch (error) {
      if (!isVerdict(error)) throw error;
      return q.kind === "collect" ? this.collectClash(q, error.code, error.params) : this.clashOf(q, error.code, error.params);
    }
  }

  /** Whether a row already there is this phone's own entry: its door, its person, and made within a minute of it. */
  private ownRow(q: Queued, device: unknown, by: unknown, at: unknown): boolean {
    const when = ms(at);
    return device === q.deviceId && by === (this.box.me()?.name ?? "") && when !== null && Math.abs(when - q.at) <= MINUTE;
  }

  /** A replayed check-in refused: no line when it was this phone's own check-in already there, else the clash's words. */
  private async clashOf(q: Queued, code: string, params: Readonly<Record<string, unknown>>): Promise<{ line: string | null; id: Id | null }> {
    if (tooOld(code, params)) return { line: tr("{code} couldn't sync — scanned more than 6 hours ago", { code: codeFace(q.code) }), id: null };
    if (code === "UNIQUE_VIOLATION") {
      // A lookup that finds no signal keeps the entry for the next try (it throws).
      const hit = await this.port.find(q.code, q.dayId);
      const row = hit?.checkIn ?? null;
      if (row !== null && this.ownRow(q, row["device_id"], row["scanned_by"], row["scanned_at"])) {
        this.keepOwn("check_ins", [row]);
        return { line: null, id: row.id };
      }
      const dev = row === null ? undefined : this.box.rows("devices")?.find((d) => d.id === row["device_id"]);
      return {
        line:
          row === null
            ? tr("{code} was already in — check the person in front of you.", { code: codeFace(q.code) })
            : tr("{code} was already in at {time} on {door} — check the person in front of you.", { code: codeFace(q.code), time: strip(fT(row["scanned_at"])), door: String(dev?.["name"] ?? "") }),
        id: null,
      };
    }
    const t = this.tonight().find((x) => x.day.id === q.dayId);
    const hit = await this.port.find(q.code, q.dayId);
    if (t === undefined || hit === null) return { line: tr("{code} couldn't sync — {reason}", { code: codeFace(q.code), reason: refusalOf(new ApiError(409, code, { ...params })) }), id: null };
    const v = await this.refused(t, hit.ticket, hit.order, code, params, "pad");
    return { line: tr("{code} couldn't sync — {reason}", { code: codeFace(q.code), reason: plainLine(v.line) || v.word }), id: null };
  }

  /** A replayed collection refused: nothing to say when this phone's own is there (its order paid if nothing is owed); else the money is named. */
  private async collectClash(q: Queued, code: string, params: Readonly<Record<string, unknown>>): Promise<{ line: string | null; id: Id | null }> {
    const amount = money(q.amount ?? 0);
    if (code === "CAPACITY_FULL") {
      const taken = (await this.box.port.list("door_collections", { where: [{ column: "ticket_id", eq: q.ticketId }, { column: "state", eq: "taken" }], limit: 1 })).rows[0];
      if (taken !== undefined && this.ownRow(q, taken["device_id"], taken["taken_by"], taken["taken_at"])) {
        // The first answer was lost: the step after it may not have run, so the order is paid now if nothing is owed.
        await this.port.settle(taken["order_id"] as Id, q.method ?? "card");
        return { line: null, id: taken.id };
      }
      const dev = taken === undefined ? undefined : this.box.rows("devices")?.find((d) => d.id === taken["device_id"]);
      return {
        line: taken === undefined ? tr("{code}: the {amount} taken here wasn't recorded — it was already paid.", { code: codeFace(q.code), amount }) : tr("{code}: the {amount} taken here wasn't recorded — it was already paid on {door} at {time}.", { code: codeFace(q.code), amount, door: String(dev?.["name"] ?? ""), time: strip(fT(taken["taken_at"])) }),
        id: null,
      };
    }
    if (tooOld(code, params)) return { line: tr("{code}: the {amount} taken here couldn't sync — taken more than 6 hours ago", { code: codeFace(q.code), amount }), id: null };
    return { line: tr("{code}: the {amount} taken here couldn't sync — {reason}", { code: codeFace(q.code), amount, reason: refusalOf(new ApiError(409, code, { ...params })) }), id: null };
  }

  /** Sign out: the list and anything not sent go from this phone. */
  forget(): void {
    this.kept = null;
    this.own = [];
    this.undone.clear();
    this.stopRetry();
    saveQueue([]);
    this.app.setState({ door: null });
  }

  // ── the camera ─────────────────────────────────────────────────────────

  cameraState(state: DoorState["camera"]): void {
    if (this.s.camera !== state) this.set({ camera: state });
  }
}

/** The name on a ticket, or its order's buyer when nobody named it yet. */
const holder = (ticket: Row): string => String(ticket["holder_name"] ?? "") || String(ticket["sender_name"] ?? "") || tr("No name");
/** Adminium's refusal of a replay's time: more than 6 hours ago. */
const tooOld = (code: string, params: Readonly<Record<string, unknown>>): boolean =>
  code === "VALIDATION_FAILED" && typeof params["fields"] === "object" && params["fields"] !== null && "occurredAt" in (params["fields"] as object);
const sameQueued = (a: Queued, b: Queued): boolean => a.key === b.key && a.kind === b.kind && a.at === b.at;
const gone = (recent: Scan[], r: Scan): Scan[] => (r.paid !== null ? recent.map((x) => (x === r ? { ...x, undone: true } : x)) : recent.filter((x) => x !== r));

export { LIVE, LIVE_TICKET, plural };
