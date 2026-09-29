/**
 * The venue's screens, as one controller: what is on screen (`state`), what
 * Adminium answered (`get`), and what a button does (the actions below). The
 * values the screens draw are worked out from these by `vals/*.ts`.
 *
 * Everything the design's own logic decided — what is left, a price, a
 * total, whether a code works, whether a move is allowed — is Adminium's
 * here: the controller asks through the ports (`../data/ports.ts`) and shows
 * the answer, or the refusal's words.
 */
import type { AudiencePort, BoxOfficePort, DoorPort, Venue } from "../data/ports.ts";
import { isApiError, type Id, type OrderBody, type Row, type TypeLeft } from "../data/wire.ts";
import { setLocale, tr } from "../i18n/tr.ts";
import { money } from "./fmt.ts";
import { setCurrency, setZone } from "./fmt.ts";
import { Buyer, blankSi, type Co } from "./buyer.ts";
import { worldOf, type Show, type World } from "./world.ts";
import { focusLater } from "./focus.ts";
import type { BoxState } from "./box.ts";
import type { DoorState } from "./door.ts";

/** What a code takes off, as the chip says it: a share of every ticket, or an amount off each of one kind. */
function discountLabel(show: Show, code: string, data: Record<string, unknown>): string {
  const kind = data["code_kind"];
  const value = Number(data["code_value"] ?? 0);
  if (kind === "percent") return tr("{pct} % off with {code}", { pct: value, code });
  const type = show.types.find((t) => t.kind === data["code_type_kind"]);
  return type === undefined ? tr("{amount} off with {code}", { amount: money(value), code }) : tr("{amount} off each {type} with {code}", { amount: money(value), type: type.short, code });
}

/** The audience's screens. */
export type Screen = "home" | "event" | "checkout" | "going" | "signin" | "tickets" | "friend" | "offer" | "confirm" | "404";

/** The box office's screens. */
export type BoxScreen = "today" | "events" | "editor" | "sales" | "orders" | "refunds" | "guests" | "waits" | "codes" | "msgs" | "pc" | "settings" | "door";

export interface Toast {
  id: number;
  msg: string;
  icon: string;
}

/** A sheet over the page: which one, and what it was opened for. */
export interface Sheet {
  kind: string;
  [k: string]: unknown;
}

export function fresh() {
  return {
    scr: "home" as Screen,
    /** The box office's screen, and what is open on it (the box office's own module fills it). */
    bx: "today" as BoxScreen,
    box: null as BoxState | null,
    /** The door on this phone: its show day, its verdict, its last scans (the door's own module fills it). */
    door: null as DoorState | null,
    /** The show on screen (its id). */
    evId: null as Id | null,
    /** A show's address opened before the venue answered: its slug, found once the shows are read. */
    pendingSlug: null as string | null,
    loading: true,
    loadError: false,
    filter: "all",
    room: "all" as "all" | Id,
    view: "list" as "list" | "cal",
    /** The calendar's month, `YYYY-MM`. */
    calM: null as string | null,
    /** How many of each type the buyer chose, by `${eventId}:${typeId}`. */
    sel: {} as Record<string, number>,
    limitHit: null as string | null,
    codeOpen: false,
    codeIn: "",
    codeErr: null as null | "bad" | "used" | "busy",
    /** A code typed on a show, and what Adminium said it does there. */
    codes: {} as Record<string, { code: string; kind: "unlock" | "discount"; label: string }>,
    panelOpen: false,
    festDay: 1,
    stars: [] as string[],
    sheet: null as Sheet | null,
    acctOpen: false,
    toast: null as Toast | null,
    /** The checkout on screen. */
    co: null as Co | null,
    /** The order on the order page (or the offer page): by its own link, or one of the signed-in person's. */
    going: null as null | { orderId: Id; via: "link" | "me" },
    si: blankSi(),
    mtTab: "up" as "up" | "past",
    /** The ticket on the phone: which order, which ticket. */
    dm: null as null | { orderId: Id; i: number; via: "link" | "me" },
    /** A ticket from a friend, opened by its own link. */
    fr: { token: null as string | null, name: "", err: null as string | null, busy: false },
    offerQ: 1,
    /** A transfer's confirm link. */
    confirm: { token: null as string | null, busy: false, done: false },
  };
}

export type State = ReturnType<typeof fresh> & {
  theme: "light" | "dark";
  lang: string;
  width: number;
  frame: "auto" | "desktop" | "phone";
};

interface Cached {
  value?: unknown;
  error?: unknown;
  loading: boolean;
}

export interface Ports {
  audience?: AudiencePort;
  boxOffice?: BoxOfficePort;
  door?: DoorPort;
}

const STARS_KEY = "wv-weekend";
const readStars = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(STARS_KEY) ?? "[]") as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
};

export class WaveApp {
  readonly ports: Ports;
  persona: "audience" | "box";
  state: State;
  zone = "UTC";
  now = Date.now();
  private skew = 0;
  private version = 0;
  private listeners = new Set<() => void>();
  private cache = new Map<string, Cached>();
  private stale = new Map<string, unknown>();
  private pending = 0;
  private worldMemo: { venue: Venue; unlocked: unknown; w: World } | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private opener: HTMLElement | null = null;
  /** Set by the demo build: a clock the demo card moves. */
  demo: {
    onClock?: (fn: (now: number) => void) => () => void;
    /** The door the demo's phone is (its "Door 1"). */
    doorDevice?: string;
    /** The demo's scan pad: the next ticket in the queue at the door, as a code. */
    nextScan?: (eventDayId: Id) => string | null;
  } | null = null;
  /** The buyer's side: checkout, their orders, signing in. */
  readonly buyer: Buyer = new Buyer(this);

  constructor(ports: Ports, persona: "audience" | "box", opts: { lang?: string; theme?: "light" | "dark"; frame?: State["frame"] } = {}) {
    this.ports = ports;
    this.persona = persona;
    this.state = {
      ...fresh(),
      stars: readStars(),
      theme: opts.theme ?? "dark",
      lang: opts.lang ?? "en-US",
      width: typeof window !== "undefined" ? window.innerWidth : 1280,
      frame: opts.frame ?? "auto",
    };
    setLocale(this.state.lang);
  }

  // ── the React side ──────────────────────────────────────────────────────

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  snapshot = (): number => this.version;
  private bump(): void {
    this.version += 1;
    for (const fn of this.listeners) fn();
  }
  setState(patch: Partial<State> | ((s: State) => Partial<State>)): void {
    const p = typeof patch === "function" ? patch(this.state) : patch;
    this.state = { ...this.state, ...p };
    if (p.lang !== undefined) setLocale(p.lang);
    this.bump();
  }
  narrow(): boolean {
    return this.state.frame === "phone" || (this.state.frame !== "desktop" && this.state.width < 760);
  }
  light(): boolean {
    return this.state.theme === "light";
  }

  // ── Adminium's answers, asked once and kept until something is written ──

  private ask<T>(key: string, fn: () => Promise<T>): { value: T | undefined; error: unknown; loading: boolean } {
    let c = this.cache.get(key);
    if (c === undefined) {
      c = { loading: true };
      this.cache.set(key, c);
      const entry = c;
      this.pending += 1;
      fn()
        .finally(() => {
          this.pending -= 1;
        })
        .then(
        (value) => {
          if (this.cache.get(key) !== entry) return;
          entry.value = value;
          entry.loading = false;
          this.stale.delete(key);
          this.bump();
        },
        (error: unknown) => {
          if (this.cache.get(key) !== entry) return;
          entry.error = error;
          entry.loading = false;
          this.bump();
        },
      );
    }
    return { value: c.value as T | undefined, error: c.error, loading: c.loading };
  }
  /** An answer, or the last one while the next is on its way. */
  get<T>(key: string, fn: () => Promise<T>): T | undefined {
    const a = this.ask(key, fn);
    return a.value !== undefined ? a.value : (this.stale.get(key) as T | undefined);
  }
  /** Resolves once every question asked of Adminium has its answer (tests; a screen reads again after). */
  async idle(): Promise<void> {
    for (let i = 0; i < 200; i += 1) {
      await new Promise((r) => setTimeout(r, 0));
      if (this.pending === 0) return;
    }
  }
  /** Whether an answer failed (and nothing older is on screen). */
  failed(key: string): boolean {
    const c = this.cache.get(key);
    return c?.error !== undefined && !this.stale.has(key);
  }
  /** After a write, or the clock moving: ask everything again, keeping what is on screen until the answers come. */
  refresh(prefix = ""): void {
    for (const [key, c] of [...this.cache]) {
      if (!key.startsWith(prefix)) continue;
      if (!c.loading && c.value !== undefined) this.stale.set(key, c.value);
      this.cache.delete(key);
    }
    this.bump();
  }

  // ── the clock ───────────────────────────────────────────────────────────

  async start(opts: { timers?: boolean } = {}): Promise<void> {
    try {
      const port = this.persona === "box" ? (this.ports.boxOffice ?? this.ports.door)! : this.ports.audience!;
      const config = await port.config();
      this.zone = config.timezone || "UTC";
      setZone(this.zone);
      setCurrency(config.currency);
      if (config.now) this.skew = Date.parse(config.now) - Date.now();
      this.now = Date.now() + this.skew;
      this.setState({ loading: false, loadError: false });
    } catch {
      this.setState({ loading: false, loadError: true });
    }
    if (this.demo?.onClock) this.demo.onClock((now) => this.setClock(now));
    if (opts.timers === false) return;
    // A transfer checkout waiting on its email: the tab asks after the order every few seconds.
    setInterval(() => void this.buyer.pollMail(), 3000);
    if (this.demo?.onClock === undefined) {
      setInterval(() => this.setClock(Date.now() + this.skew), 30_000);
      // A running hold counts down each second on the server's clock.
      setInterval(() => {
        // (and the door's clock, with its seconds)
        if (this.state.co === null && this.state.si.resendAt <= this.now && !(this.persona === "box" && this.state.bx === "door")) return;
        this.now = Date.now() + this.skew;
        this.buyer.tick();
        this.bump();
      }, 1000);
    }
  }
  setClock(now: number): void {
    this.now = now;
    this.refresh();
    this.buyer.tick();
  }

  /** Switches between the audience site (on What's on) and the box office (on Today). */
  setPersona(persona: "audience" | "box"): void {
    if (persona === this.persona) return;
    this.persona = persona;
    if (persona === "audience") return this.go("home");
    this.setState({ bx: "today", sheet: null, dm: null, panelOpen: false, acctOpen: false });
  }

  // ── the venue, as the audience reads it ─────────────────────────────────

  private venue(): Venue | undefined {
    return this.get("aud:venue", () => this.ports.audience!.venue());
  }
  /** The types each typed code unlocked, by show. */
  private unlockedTypes(): Map<Id, { code: string; types: Row[] }> {
    const out = new Map<Id, { code: string; types: Row[] }>();
    for (const [key, c] of Object.entries(this.state.codes)) {
      if (c.kind !== "unlock") continue;
      const id = Number(key) as Id;
      const types = this.get(`aud:unlock:${key}:${c.code}`, () => this.ports.audience!.unlock(id, c.code));
      if (types !== undefined) out.set(id, { code: c.code, types });
    }
    return out;
  }
  world(): World | null {
    const venue = this.venue();
    if (venue === undefined) return null;
    const unlocked = this.unlockedTypes();
    const sig = JSON.stringify([...unlocked].map(([k, v]) => [k, v.code, v.types.length]));
    if (this.worldMemo !== null && this.worldMemo.venue === venue && this.worldMemo.unlocked === sig) return this.worldMemo.w;
    const w = worldOf(venue, unlocked);
    this.worldMemo = { venue, unlocked: sig, w };
    return w;
  }
  /** What is left of each type of a show (undefined while Adminium has not answered). */
  left(show: Show): Map<Id, TypeLeft> | undefined {
    const answer = this.get(`aud:left:${String(show.id)}`, () => this.ports.audience!.left(show.id));
    if (answer === undefined) return undefined;
    return new Map(answer.map((l) => [l.ticket_type_id, l]));
  }
  venueFailed(): boolean {
    return this.failed("aud:venue");
  }
  retryVenue(): void {
    this.refresh("aud:");
  }

  // ── arriving from a link ────────────────────────────────────────────────

  /**
   * The page a link opens: an order's own link (`…/o#code`), a ticket sent to a friend (`…/t#code`), a
   * transfer's confirm link (`…/confirm#code`), a sign-in link (`…/c#code`), a show (`…/events/{slug}`);
   * anything else under the site is What's on, an unknown show the page nobody found.
   */
  async arrive(path: string, hash: string): Promise<void> {
    const code = hash.replace(/^#/, "");
    const tail = path.replace(/\/+$/, "").split("/").pop() ?? "";
    const show = /\/events\/([^/]+)\/?$/.exec(path)?.[1];
    if (tail === "o" && code !== "") return this.buyer.openByLink(code);
    if (tail === "t" && code !== "") return this.go("friend", { fr: { token: code, name: "", err: null, busy: false } });
    if (tail === "confirm" && code !== "") return this.go("confirm", { confirm: { token: code, busy: false, done: false } });
    if (tail === "c" && code !== "") return this.buyer.openSignInLink(code);
    if (show !== undefined) {
      this.go("event", { evId: null, pendingSlug: decodeURIComponent(show) });
      return;
    }
  }

  // ── going places ────────────────────────────────────────────────────────

  go(scr: Screen, extra: Partial<State> = {}): void {
    this.setState({ scr, sheet: null, panelOpen: false, acctOpen: false, limitHit: null, ...extra });
    if (typeof document !== "undefined") {
      document.querySelector("[data-wv-scroll]")?.scrollTo?.({ top: 0 });
      setTimeout(() => {
        const h = document.querySelector<HTMLElement>("main h1");
        if (h !== null) {
          if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
          h.focus({ preventScroll: true });
        }
      }, 30);
    }
  }
  openShow(id: Id): void {
    this.go("event", { evId: id, codeOpen: false, codeErr: null, codeIn: "" });
  }

  // ── sheets, menus, toasts ───────────────────────────────────────────────

  remember(): void {
    this.opener = typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;
  }
  refocus(): void {
    const o = this.opener;
    this.opener = null;
    if (o !== null && o.isConnected) setTimeout(() => o.focus(), 30);
  }
  openSheet(kind: string, ctx: Record<string, unknown> = {}): void {
    this.remember();
    this.setState({ sheet: { kind, ...ctx }, acctOpen: false, panelOpen: false });
  }
  patchSheet(p: Record<string, unknown>): void {
    if (this.state.sheet === null) return;
    this.setState({ sheet: { ...this.state.sheet, ...p } });
  }
  closeSheet(): void {
    this.setState({ sheet: null });
    this.refocus();
  }
  /** The box office's own layers (its drawer, the full preview), closed by Escape under a sheet. */
  escapeHook: (() => boolean) | null = null;

  /** Escape closes the top layer. */
  escape(): void {
    const s = this.state;
    if (s.sheet !== null) return this.closeSheet();
    if (this.escapeHook?.() === true) return;
    if (s.dm !== null) {
      this.setState({ dm: null });
      return this.refocus();
    }
    if (s.panelOpen) {
      this.setState({ panelOpen: false });
      return this.refocus();
    }
    if (s.acctOpen) {
      this.setState({ acctOpen: false });
      return this.refocus();
    }
  }
  toast(msg: string, icon = "check"): void {
    if (this.toastTimer !== null) clearTimeout(this.toastTimer);
    this.setState({ toast: { id: Date.now(), msg, icon } });
    this.toastTimer = setTimeout(() => this.setState({ toast: null }), 2800);
  }

  // ── the ticket panel ────────────────────────────────────────────────────

  inc(show: Show, typeId: Id, max: number, left: number | undefined): void {
    const k = `${String(show.id)}:${String(typeId)}`;
    const q = this.state.sel[k] ?? 0;
    if (q >= max) return this.setState({ limitHit: k });
    if (left !== undefined && q >= left) return;
    this.setState({ sel: { ...this.state.sel, [k]: q + 1 }, limitHit: null });
  }
  dec(show: Show, typeId: Id): void {
    const k = `${String(show.id)}:${String(typeId)}`;
    const q = this.state.sel[k] ?? 0;
    if (q <= 0) return;
    this.setState({ sel: { ...this.state.sel, [k]: q - 1 }, limitHit: null });
  }

  toggleStar(id: string): void {
    const stars = this.state.stars.includes(id) ? this.state.stars.filter((x) => x !== id) : [...this.state.stars, id];
    try {
      localStorage.setItem(STARS_KEY, JSON.stringify(stars));
    } catch {
      // A browser that keeps nothing still stars for this visit.
    }
    this.setState({ stars });
  }

  // ── the order as chosen, priced by Adminium ─────────────────────────────

  /** The chosen tickets of a show, as a create would send them. */
  chosen(show: Show): OrderBody["tickets"] {
    const out: OrderBody["tickets"] = [];
    for (const t of show.types) {
      const q = this.state.sel[`${String(show.id)}:${String(t.id)}`] ?? 0;
      for (let i = 0; i < q; i += 1) out.push({ ticket_type_id: t.id });
    }
    return out;
  }
  /** The body of the order as chosen (with the code the buyer typed, when it takes money off). */
  orderBody(show: Show, lines = this.chosen(show)): OrderBody {
    const code = this.state.codes[String(show.id)];
    const values: Record<string, unknown> = { event_id: show.id, room_id: show.room?.id ?? null };
    if (code !== undefined) values["code_text"] = code.code;
    return { values, tickets: lines };
  }
  /** Adminium's dry run of the order as chosen: its total and discount (pending while it answers). */
  quoteFor(show: Show): { total: number | null; discount: number; pending: boolean; data: Record<string, unknown> | null } {
    const body = this.orderBody(show);
    if (body.tickets.length === 0) return { total: null, discount: 0, pending: false, data: null };
    const key = `aud:quote:${JSON.stringify(body)}`;
    const q = this.get(key, () => this.ports.audience!.quote(body));
    if (q === undefined) return { total: null, discount: 0, pending: !this.failed(key), data: null };
    return { total: Number(q.data["total"] ?? 0), discount: Number(q.data["discount"] ?? 0), pending: false, data: q.data };
  }

  /** A code typed on a show: Adminium says what it does here — unlocks a type, takes money off, or nothing. */
  async applyCode(show: Show): Promise<void> {
    const code = this.state.codeIn.trim().toUpperCase();
    if (code === "") return;
    const audience = this.ports.audience!;
    try {
      if (show.codeTypes > 0) {
        const types = await audience.unlock(show.id, code);
        if (types.length > 0) {
          this.setState({ codes: { ...this.state.codes, [String(show.id)]: { code, kind: "unlock", label: tr("Unlocked with {code}", { code }) } }, codeErr: null, codeOpen: false });
          this.toast(tr("Unlocked with {code}", { code }), "key-round");
          return;
        }
      }
      // Asked once with the basket (or one ticket of the first type on sale): Adminium finds the code or refuses it.
      const lines = this.chosen(show);
      const first = show.types.find((t) => t.selling && t.unlocked === null);
      const probe = lines.length > 0 ? lines : first === undefined ? [] : [{ ticket_type_id: first.id }];
      if (probe.length === 0) return this.setState({ codeErr: "bad" });
      const q = await audience.quote({ values: { event_id: show.id, room_id: show.room?.id ?? null, code_text: code }, tickets: probe });
      const label = discountLabel(show, code, q.data);
      this.setState({ codes: { ...this.state.codes, [String(show.id)]: { code, kind: "discount", label } }, codeErr: null, codeOpen: false });
      this.toast(label, "badge-percent");
    } catch (error) {
      const c = WaveApp.code(error);
      if (c === null) throw error;
      const reason = isApiError(error) ? String(error.params["reason"] ?? "") : "";
      this.setState({ codeErr: c === "PUBLIC_RATE_LIMITED" || c === "RATE_LIMITED" ? "busy" : reason === "used-up" ? "used" : "bad" });
      focusLater("code-in", 30);
    }
  }

  // ── sharing a show ──────────────────────────────────────────────────────

  showUrl(show: Show): string {
    const base = typeof window === "undefined" ? "" : `${window.location.origin}${import.meta.env.BASE_URL ?? "/"}`;
    return `${base.replace(/\/$/, "")}/events/${show.slug}`;
  }
  async share(show: Show): Promise<void> {
    const url = this.showUrl(show);
    const nav = typeof navigator === "undefined" ? undefined : navigator;
    if (nav?.share !== undefined && this.narrow()) {
      try {
        await nav.share({ title: show.name, url });
        return;
      } catch {
        // Dismissed: nothing to say.
        return;
      }
    }
    try {
      await nav?.clipboard?.writeText(url);
    } catch {
      // A browser that refuses the clipboard still shows the toast's words; the address bar has the link.
    }
    this.toast(tr("Link copied"), "link");
  }
  /** A calendar file: one event per day of the show, on the venue's clock. */
  ics(show: Show): void {
    const w = this.world();
    const venue = w?.settings.venueName ?? "";
    const where = [venue, w?.settings.address ?? ""].filter((x) => x !== "").join(", ");
    const stamp = (t: number) => {
      const p = new Intl.DateTimeFormat("en-GB", { timeZone: this.zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(t);
      const g = (k: string) => p.find((x) => x.type === k)?.value ?? "00";
      return `${g("year")}${g("month")}${g("day")}T${g("hour")}${g("minute")}00`;
    };
    const esc = (x: string) => x.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
    const days = show.days.length > 0 ? show.days : [{ id: show.id, day: 1, doors: show.doors, lastEntry: null, curfew: show.curfew }];
    const events = days.flatMap((d, i) => [
      "BEGIN:VEVENT",
      `UID:${show.slug}-${String(i + 1)}@${venue.toLowerCase().replace(/[^a-z0-9]+/g, "") || "venue"}`,
      `DTSTAMP:${new Date(this.now).toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
      `DTSTART;TZID=${this.zone}:${stamp(d.doors)}`,
      `DTEND;TZID=${this.zone}:${stamp(d.curfew ?? show.curfew)}`,
      `SUMMARY:${esc(venue === "" ? show.name : tr("{name} at {venue}", { name: show.name, venue }))}`,
      `LOCATION:${esc(where)}`,
      "END:VEVENT",
    ]);
    const text = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Waveform//Tickets//EN", ...events, "END:VCALENDAR"].join("\r\n");
    try {
      const url = URL.createObjectURL(new Blob([text], { type: "text/calendar" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${show.slug}.ics`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // No file saving here: nothing else to offer.
    }
    this.toast(tr("Calendar file downloaded"), "calendar-plus");
  }

  // ── a reminder and a place on the waitlist ─────────────────────────────

  /** A write from a sheet: busy while Adminium answers; the same done line when it already had it (no oracle). */
  private async sheetWrite(run: () => Promise<unknown>): Promise<void> {
    this.patchSheet({ busy: true, err: {} });
    try {
      await run();
      this.patchSheet({ busy: false, done: true });
    } catch (error) {
      const c = WaveApp.code(error);
      if (c === "UNIQUE_VIOLATION" || c === "PUBLIC_DUPLICATE") return this.patchSheet({ busy: false, done: true });
      if (c === null) {
        this.patchSheet({ busy: false, err: { email: tr("We couldn't send that just now. Try again.") } });
        return;
      }
      this.patchSheet({ busy: false, err: { email: c === "PUBLIC_RATE_LIMITED" ? tr("That's a lot of requests from one place — try again in a little while.") : tr("We couldn't take that. Check the address and try again.") } });
    }
  }
  remind(eventId: Id, email: string, typeId: Id | null): Promise<void> {
    return this.sheetWrite(() => this.ports.audience!.remindMe(eventId, email.trim().toLowerCase(), typeId));
  }
  joinWaitlist(eventId: Id, email: string, qty: number): Promise<void> {
    return this.sheetWrite(async () => {
      await this.ports.audience!.joinWaitlist(eventId, email.trim().toLowerCase(), qty);
      this.refresh("aud:left:");
    });
  }

  // ── the buyer's own pages (sign in, My tickets, orders, offers) ─────────

  /** The person signed in on this browser, or null. */
  signedIn(): { email: string; name: string | null } | null {
    return this.persona === "audience" ? this.buyer.signedIn() : null;
  }
  goSignIn(): void {
    this.go("signin", { si: { ...this.state.si, step: "email", err: null, check: "idle" } });
  }
  goTickets(): void {
    this.go("tickets");
  }
  /** The signed-in person's own place on a show's waitlist (still waiting), or null. */
  myWaitlist(eventId: Id): { qty: number; id: Id } | null {
    const rows = this.buyer.myWaitlist() ?? [];
    const row = rows.find((w) => w["event_id"] === eventId && w["status"] === "waiting");
    return row === undefined ? null : { qty: Number(row["qty"] ?? 1), id: row.id };
  }
  /** A live waitlist offer to the signed-in person on a show, or null. */
  liveOffer(eventId: Id): { qty: number; until: number; orderId: Id } | null {
    const rows = this.buyer.myWaitlist() ?? [];
    const row = rows.find((w) => w["event_id"] === eventId && w["status"] === "offered" && w["order_id"] !== null);
    const until = row === undefined ? null : Date.parse(String(row["offer_until"] ?? ""));
    if (row === undefined || until === null || Number.isNaN(until) || until <= this.now) return null;
    return { qty: Number(row["qty"] ?? 1), until, orderId: row["order_id"] as Id };
  }
  openOffer(orderId: Id): void {
    this.go("offer", { going: { orderId, via: "me" } });
  }
  startCheckout(show: Show): void {
    this.buyer.startCheckout(show);
  }

  /** A refusal's code, or null for anything else (a network failure is thrown on). */
  static code(error: unknown): string | null {
    return isApiError(error) ? error.code : null;
  }
}
