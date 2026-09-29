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
 * Only the box office's build carries this module (`sides.ts`).
 */
import type { DoorPort } from "../data/ports.ts";
import { ApiError, isApiError, type Id, type Row } from "../data/wire.ts";
import { tr } from "../i18n/tr.ts";
import { boxOf, LIVE, LIVE_TICKET, plural, refusalOf, type Box } from "./box.ts";
import type { BoxShow } from "./boxWorld.ts";
import { fD, fT, money, ms, strip } from "./fmt.ts";
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
  queue: Queued[];
  clash: string[];
  camera: "off" | "on" | "blocked" | "none";
  busy: boolean;
}

export function doorFresh(): DoorState {
  return { dayId: null, tab: "scan", q: "", verdict: null, recent: [], sellType: null, sellQ: 1, chk: {}, offline: false, lost: false, queue: readQueue(), clash: [], camera: "off", busy: false };
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

/** A typed code as the door compares it: capitals, no spaces, Arabic-Indic digits as 0–9. */
export function typedCode(text: string): string {
  return text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .toUpperCase()
    .replace(/\s/g, "");
}
/** Whether what was typed is a ticket's code ("K7QX-M2PD", the dash optional) rather than a name. */
export const looksLikeCode = (text: string): boolean => /^[A-Z0-9]{4}-?[A-Z0-9]{4}$/.test(typedCode(text));
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

export class Door {
  readonly app: WaveApp;
  readonly box: Box;
  /** Tonight's list as it last came from Adminium: what judges a scan without the signal. */
  private kept: { dayId: Id; tickets: Row[]; orders: Row[]; checkIns: Row[] } | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  private held = false;
  private retry: ReturnType<typeof setInterval> | null = null;
  private syncing = false;
  /** Whether this phone was asked once which door it is. */
  askedDevice = false;

  constructor(app: WaveApp) {
    this.app = app;
    this.box = boxOf(app);
    const before = app.escapeHook;
    app.escapeHook = () => this.escape() || (before?.() ?? false);
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.set({ lost: false });
        void this.sync();
      });
      window.addEventListener("offline", () => this.wentOffline());
    }
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
    let chosen: string | null = null;
    try {
      chosen = localStorage.getItem(DEVICE_KEY);
    } catch {
      chosen = null;
    }
    const byChoice = all.find((d) => String(d.id) === chosen);
    if (byChoice !== undefined) return byChoice;
    const preset = this.app.demo?.doorDevice;
    const byName = preset === undefined ? undefined : all.find((d) => d["name"] === preset);
    if (byName !== undefined) return byName;
    return all.length === 1 ? all[0]! : null;
  }
  chooseDevice(id: Id): void {
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
    return !s.offline && !s.lost && !nav;
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
    const end = this.box.venueDayStart(this.app.now) + 86_400_000;
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

  /** Tonight's tickets, their orders and today's check-ins, as the door last read them. */
  list(t: Tonight): { tickets: Row[]; orders: Row[]; checkIns: Row[] } | undefined {
    if (!this.online() && this.kept?.dayId === t.day.id) return this.kept;
    const where = [{ column: "event_id", eq: t.show.id }];
    const tickets = this.box.list("tickets", { where, limit: 20_000 });
    const orders = this.box.list("orders", { where, limit: 10_000 });
    const checkIns = this.box.list("check_ins", { where: [{ column: "event_day_id", eq: t.day.id }], limit: 20_000 });
    if (tickets === undefined || orders === undefined || checkIns === undefined) return this.kept?.dayId === t.day.id ? this.kept : undefined;
    this.kept = { dayId: t.day.id, tickets: tickets.rows, orders: orders.rows, checkIns: checkIns.rows };
    return this.kept;
  }

  // ── scanning ───────────────────────────────────────────────────────────

  /** A code from the camera, the Find box or a result tapped. */
  async scan(code: string, from: "pad" | "find" = "pad"): Promise<void> {
    const t = this.chosen();
    if (t === null || this.s.busy) return;
    if (this.s.verdict?.collect != null) return;
    this.set({ q: "", busy: true });
    try {
      if (!this.online()) return this.judgeHere(t, code, from);
      let hit: Awaited<ReturnType<DoorPort["find"]>>;
      try {
        hit = await this.port.find(code, t.day.id);
      } catch (error) {
        if (isApiError(error)) return this.show(this.danger(tr("Not found"), "", segs("No ticket with that code. If they were sent a ticket, ask for the new one.", {}), from));
        this.lose();
        return this.judgeHere(t, code, from);
      }
      if (hit === null) return this.show(this.danger(tr("Not found"), "", segs("No ticket with that code. If they were sent a ticket, ask for the new one.", {}), from));
      await this.admit(t, hit.ticket, hit.order, from, null);
    } finally {
      this.set({ busy: false });
    }
  }

  /** The check-in written; Adminium's refusal, when it refuses, says which verdict. */
  private async admit(t: Tonight, ticket: Row, order: Row, from: "pad" | "find", paid: { amount: number; method: "card" | "cash" } | null): Promise<void> {
    const name = holder(ticket);
    const type = this.typeName(t.show, ticket);
    const dev = this.device();
    try {
      const row = await this.port.checkIn(ticket.id, t.day.id, dev?.id ?? null);
      this.box.refresh();
      this.remember({ key: `${String(ticket.id)}:${String(t.day.id)}`, checkInId: row.id, ticketId: ticket.id, code: String(ticket["code"] ?? ""), name, type, at: ms(row["scanned_at"]) ?? this.app.now, made: Date.now(), paid, undone: false, queued: false });
      const typeLine = paid === null ? type : paid.method === "card" ? tr("{type} · paid by card", { type }) : tr("{type} · paid in cash", { type });
      this.show({ k: "pos", word: tr("Let in"), amount: "", name, type: typeLine, id: idChip(t.show.age), line: [], collect: null, from, made: Date.now() });
    } catch (error) {
      if (!isApiError(error)) {
        this.lose();
        this.enqueue(t, ticket, "in", undefined, from, paid);
        return;
      }
      if (paid !== null) this.remember({ key: `${String(ticket.id)}:${String(t.day.id)}`, checkInId: null, ticketId: ticket.id, code: String(ticket["code"] ?? ""), name, type, at: this.app.now, made: Date.now(), paid, undone: true, queued: false });
      this.box.refresh();
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
      if (!this.online()) {
        const hit = this.fromList(t, c.code);
        if (hit !== null) return this.enqueueCollect(t, hit.ticket, method, v.from, c.amount);
        return;
      }
      try {
        await this.port.collect(c.ticketId, method, dev?.id ?? null);
      } catch (error) {
        if (!isApiError(error)) {
          this.lose();
          const hit = this.fromList(t, c.code);
          if (hit !== null) this.enqueueCollect(t, hit.ticket, method, v.from, c.amount);
          return;
        }
        // Another phone took it a moment ago: the check-in goes ahead. Anything else is Adminium's word.
        if (error.code !== "CAPACITY_FULL") {
          this.set({ verdict: null });
          this.app.toast(refusalOf(error), "circle-alert");
          return;
        }
      }
      const hit = await this.port.find(c.code, t.day.id);
      if (hit === null) return;
      await this.admit(t, hit.ticket, hit.order, v.from, { amount: c.amount, method });
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
    this.set({ verdict: null });
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
      try {
        await this.port.undo(r.checkInId);
      } catch (error) {
        this.app.toast(isApiError(error) ? refusalOf(error) : tr("That didn't go through — check the connection and try again."), "circle-alert");
        return;
      }
      this.box.refresh();
      this.set((s) => ({ recent: gone(s.recent, r) }));
    }
    this.app.toast(r.paid !== null ? tr("Undone — {name} is not checked in. The payment stays.", { name: r.name }) : tr("Undone — {name} is not checked in", { name: r.name }), "undo-2");
  }

  // ── the guest list ─────────────────────────────────────────────────────

  /** One more of a party in; a tap on a party all in steps one back. */
  async tickGuest(g: Row): Promise<void> {
    const tot = Number(g["people"] ?? 1 + Number(g["plus"] ?? 0));
    const k = Number(g["arrived"] ?? 0);
    const name = String(g["name"] ?? "");
    const next = k >= tot ? k - 1 : k + 1;
    const status = next === 0 ? "not_in" : "in";
    try {
      await this.box.port.update("guest_list", g.id, { arrived: next, ...(status !== g["status"] ? { status } : {}) });
    } catch (error) {
      this.app.toast(isApiError(error) ? refusalOf(error) : tr("That didn't go through — check the connection and try again."), "circle-alert");
      return;
    }
    this.box.refresh();
    if (next === 0) this.app.toast(tr("Undone — {name} is not in", { name }), "undo-2");
    else this.app.toast(tot > 1 ? tr("{name} — {n} of {total} in", { name, n: next, total: tot }) : tr("{name} — in", { name }), "check");
  }

  // ── selling at the door ────────────────────────────────────────────────

  /**
   * A door sale: the order and its tickets made held (Adminium judges the
   * places), moved to the door, each ticket's money taken on this door (the
   * order is paid once nothing is owed), then each checked in. Nothing to pay:
   * issued at no charge and checked in.
   */
  async sell(t: Tonight, typeId: Id, qty: number, method: "card" | "cash" | "none"): Promise<void> {
    if (this.s.busy || !this.online()) return;
    const type = t.show.types.find((x) => x.id === typeId);
    if (type === undefined || qty < 1) return;
    this.set({ busy: true });
    const key = `door-${String(Date.now())}-${Math.random().toString(36).slice(2, 8)}`;
    const dev = this.device();
    try {
      const reply = await this.box.port.newOrder(
        { values: { event_id: t.show.id, buyer_name: tr("Door sale"), channel: "door", email: null }, tickets: Array.from({ length: qty }, () => ({ ticket_type_id: typeId, holder_name: null })) },
        key,
      );
      const order = reply.data;
      const total = Number(order["total"] ?? 0);
      try {
        if (method === "none" || total <= 0) await this.box.port.move(order.id, "no_charge");
        else {
          await this.box.port.move(order.id, "door");
          for (const tk of reply.tickets) await this.port.collect(tk.id, method, dev?.id ?? null);
        }
      } catch (error) {
        await this.box.port.move(order.id, "let_go").catch(() => undefined);
        throw error;
      }
      const made = Date.now();
      for (const tk of reply.tickets) {
        const row = await this.port.checkIn(tk.id, t.day.id, dev?.id ?? null);
        this.remember({ key: `${String(tk.id)}:${String(t.day.id)}`, checkInId: row.id, ticketId: tk.id, code: String(tk["code"] ?? ""), name: tr("Door sale"), type: type.short, at: ms(row["scanned_at"]) ?? this.app.now, made, paid: null, undone: false, queued: false });
      }
      this.box.refresh();
      this.set({ sellQ: 1 });
      this.app.toast(tr("{n} × {type} sold and checked in · {total}", { n: qty, type: type.short, total: money(total) }), "check");
    } catch (error) {
      this.box.refresh();
      this.app.toast(isApiError(error) ? (this.box.placesWords(error, t.show.id) ?? refusalOf(error)) : tr("That didn't go through — check the connection and try again."), "circle-alert");
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
    if (this.s.lost) return;
    this.set({ lost: true });
    this.wentOffline();
    if (this.retry === null && typeof setInterval !== "undefined") {
      this.retry = setInterval(() => {
        if (!this.s.lost) return this.stopRetry();
        void this.sync(true);
      }, 15_000);
    }
  }
  private stopRetry(): void {
    if (this.retry !== null) clearInterval(this.retry);
    this.retry = null;
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

  /** A ticket of tonight's list by its code. */
  private fromList(t: Tonight, code: string): { ticket: Row; order: Row } | null {
    const l = this.kept?.dayId === t.day.id ? this.kept : null;
    const ticket = l?.tickets.find((x) => sameCode(String(x["code"] ?? ""), code));
    const order = ticket === undefined ? undefined : l!.orders.find((o) => o.id === ticket["order_id"]);
    return ticket === undefined || order === undefined ? null : { ticket, order };
  }

  /** A scan judged by the list on the phone, the check-in kept to send later. */
  private judgeHere(t: Tonight, code: string, from: "pad" | "find"): void {
    const hit = this.fromList(t, code);
    if (hit === null) return this.show(this.danger(tr("Not found"), "", segs("No ticket with that code. If they were sent a ticket, ask for the new one.", {}), from));
    const { ticket, order } = hit;
    const name = holder(ticket);
    const byStatus = this.byTicketAndOrder(t, ticket, order, from);
    if (byStatus !== null && byStatus.collect === null) return this.show(byStatus);
    if (t.show.days.length > 1 && ticket[`admits_day${String(t.day.day)}`] !== true) return this.show(this.notToday(name, segs("This ticket is for {days}", {}, { days: this.daysOf(t.show, ticket) }), from));
    if (this.app.now < t.opens) return this.show(this.tooEarly(t, name, from));
    if (this.app.now > t.closes) return this.show(this.notToday(name, segs("This show has finished", {}), from));
    const key = `${String(ticket.id)}:${String(t.day.id)}`;
    const inRow = this.kept?.checkIns.find((c) => c["ticket_id"] === ticket.id) ?? null;
    const queued = this.s.queue.find((q) => q.key === key && q.kind === "in");
    if (inRow !== null) return this.show(this.alreadyIn(name, this.typeName(t.show, ticket), inRow, from));
    if (queued !== undefined) return this.show(this.alreadyIn(name, this.typeName(t.show, ticket), { id: 0, scanned_at: new Date(queued.at).toISOString(), device_id: queued.deviceId, scanned_by: this.box.me()?.name ?? "" }, from));
    if (byStatus !== null) return this.show(byStatus);
    this.enqueue(t, ticket, "in", undefined, from, null);
  }

  private enqueue(t: Tonight, ticket: Row, kind: "in", method: undefined, from: "pad" | "find", paid: Scan["paid"]): void {
    const dev = this.device();
    const key = `${String(ticket.id)}:${String(t.day.id)}`;
    const q: Queued = { kind, key, code: String(ticket["code"] ?? ""), ticketId: ticket.id, dayId: t.day.id, deviceId: dev?.id ?? null, at: this.app.now, name: holder(ticket), ...(method === undefined ? {} : { method }) };
    this.set((s) => ({ queue: [...s.queue, q] }));
    const type = this.typeName(t.show, ticket);
    this.remember({ key, checkInId: null, ticketId: ticket.id, code: q.code, name: q.name, type, at: q.at, made: Date.now(), paid, undone: false, queued: true });
    const typeLine = paid === null ? type : paid.method === "card" ? tr("{type} · paid by card", { type }) : tr("{type} · paid in cash", { type });
    this.show({ k: "pos", word: tr("Let in"), amount: "", name: q.name, type: typeLine, id: idChip(t.show.age), line: [], collect: null, from, made: Date.now() });
  }
  private enqueueCollect(t: Tonight, ticket: Row, method: "card" | "cash", from: "pad" | "find", amount: number): void {
    const dev = this.device();
    const key = `${String(ticket.id)}:${String(t.day.id)}`;
    this.set((s) => ({ queue: [...s.queue, { kind: "collect", key, code: String(ticket["code"] ?? ""), ticketId: ticket.id, dayId: t.day.id, deviceId: dev?.id ?? null, at: this.app.now, method, name: holder(ticket) }] }));
    this.enqueue(t, ticket, "in", undefined, from, { amount, method });
  }

  /**
   * Back online: each kept scan and collection sent with its own time, in the
   * order they were made. This phone's own scan already there counts as sent;
   * someone else's is a clash, named with its time and door.
   */
  async sync(quiet = false): Promise<void> {
    if (this.syncing || !this.online() && !quiet) return;
    const queue = [...this.s.queue];
    if (queue.length === 0) {
      if (this.s.lost) this.set({ lost: false });
      this.stopRetry();
      return;
    }
    this.syncing = true;
    const clashes: string[] = [];
    let synced = 0;
    let left = queue;
    let noSignal = false;
    try {
      for (const q of queue) {
        try {
          if (q.kind === "collect") await this.port.collect(q.ticketId, q.method ?? "card", q.deviceId, q.at);
          else {
            const row = await this.port.checkIn(q.ticketId, q.dayId, q.deviceId, q.at);
            this.set((s) => ({ recent: s.recent.map((r) => (r.key === q.key && r.queued ? { ...r, queued: false, checkInId: row.id } : r)) }));
            synced += 1;
          }
        } catch (error) {
          if (!isApiError(error)) {
            noSignal = true;
            break;
          }
          if (q.kind === "in") {
            const line = await this.clashOf(q, error.code, error.params);
            if (line === null) synced += 1;
            else clashes.push(line);
            this.set((s) => ({ recent: s.recent.map((r) => (r.key === q.key && r.queued ? { ...r, queued: false } : r)) }));
          }
        }
        left = left.slice(1);
      }
    } finally {
      this.syncing = false;
    }
    this.set((s) => ({ queue: left, lost: noSignal || (left.length > 0 && s.lost), clash: [...s.clash, ...clashes] }));
    if (noSignal) this.lose();
    if (left.length === 0) this.stopRetry();
    this.box.refresh();
    if (synced + clashes.length === 0) return;
    const done = tr("Back online — {n} check-in synced|Back online — {n} check-ins synced", { n: synced });
    this.app.toast(clashes.length === 0 ? done : `${done} · ${tr("{n} clash|{n} clashes", { n: clashes.length })}`, "wifi");
  }

  /** A replay refused: null when it was this phone's own check-in already there, else the clash's words. */
  private async clashOf(q: Queued, code: string, params: Readonly<Record<string, unknown>>): Promise<string | null> {
    if (code === "OCCURRED_AT_OUT_OF_RANGE") return tr("{code} couldn't sync — scanned more than 6 hours ago", { code: q.code });
    if (code === "UNIQUE_VIOLATION") {
      const hit = await this.port.find(q.code, q.dayId).catch(() => null);
      const row = hit?.checkIn ?? null;
      const me = this.box.me()?.name ?? "";
      if (row !== null && row["device_id"] === q.deviceId && row["scanned_by"] === me) return null;
      const dev = row === null ? undefined : this.box.rows("devices")?.find((d) => d.id === row["device_id"]);
      return row === null
        ? tr("{code} was already in — check the person in front of you.", { code: q.code })
        : tr("{code} was already in at {time} on {door} — check the person in front of you.", { code: q.code, time: strip(fT(row["scanned_at"])), door: String(dev?.["name"] ?? "") });
    }
    const t = this.tonight().find((x) => x.day.id === q.dayId);
    const hit = await this.port.find(q.code, q.dayId).catch(() => null);
    if (t === undefined || hit === null) return tr("{code} couldn't sync — {reason}", { code: q.code, reason: refusalOf(new ApiError(409, code, { ...params })) });
    const v = await this.refused(t, hit.ticket, hit.order, code, params, "pad");
    return tr("{code} couldn't sync — {reason}", { code: q.code, reason: plainLine(v.line) || v.word });
  }

  /** Sign out: the list and anything not sent go from this phone. */
  forget(): void {
    this.kept = null;
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
const gone = (recent: Scan[], r: Scan): Scan[] => (r.paid !== null ? recent.map((x) => (x === r ? { ...x, undone: true } : x)) : recent.filter((x) => x !== r));

export { LIVE, LIVE_TICKET, plural };
