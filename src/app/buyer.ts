/**
 * The buyer's side of the controller: checkout (details, the hold, names,
 * questions, how to pay, confirm), the order's own page, signing in by
 * email, My tickets and what a ticket's menu does, a ticket from a friend,
 * a waitlist offer, and the transfer's confirm link.
 *
 * Adminium holds the places, prices the order, mints its number and its
 * codes, judges every move and every window; this module asks and shows the
 * answer. The one thing it works out is when to ask: a hold's end is the
 * order's `held_until`, read against the venue's clock.
 */
import type { OrderWithTickets, Person } from "../data/ports.ts";
import { isApiError, type Id, type Row } from "../data/wire.ts";
import { tr } from "../i18n/tr.ts";
import { venueDay, wallTime } from "../lib/venueTime.ts";
import { ms } from "./fmt.ts";
import { pays } from "./vals/event.ts";
import type { WaveApp } from "./wave.ts";
import type { Show } from "./world.ts";
import { focusLater } from "./focus.ts";

export type PayWay = "door" | "transfer";

export interface Co {
  evId: Id;
  lines: { typeId: Id; q: number }[];
  tix: { typeId: Id; name: string; answers: Record<string, string> }[];
  buyer: { name: string; email: string };
  optIn: boolean;
  access: string;
  orderAnswers: Record<string, string>;
  pay: PayWay | null;
  errs: Record<string, string | null>;
  phase: "details" | "held" | "mail" | "gone";
  holdQ: null | { kind: "last"; typeId: Id; n: number | null } | { kind: "code"; code: string; total: number | null };
  /** The held order, once Adminium made it. */
  orderId: Id | null;
  order: Row | null;
  tickets: Row[];
  heldUntil: number | null;
  claim: boolean;
  clientKey: string;
  check: "run" | "ok" | "fail";
  sumOpen: boolean;
  busy: boolean;
  /** The hold's last-minutes announcements already made (2 minutes, 30 seconds). */
  said: number[];
  /** The code the buyer typed, dropped at the hold because it ran out. */
  codeDropped: boolean;
  /**
   * Signed in, and the account's name was refused for the order (it holds a number, a web or an email
   * address, or is empty): the name field shows, and the name typed there goes on the order.
   */
  nameAsk: boolean;
  /** "Send it again" on the confirm email: what the last press came to, and when it may be pressed again. */
  again: null | "sent" | "wait" | "limit" | "down";
  againAt: number;
}

export interface Si {
  step: "email" | "code";
  email: string;
  check: "idle" | "run" | "ok" | "fail";
  mailErr: "" | "down" | "limit";
  fieldErr: string | null;
  digits: string[];
  err: null | "wrong" | "expired" | "many" | "locked" | "short";
  tries: number | null;
  resendAt: number;
  notice: null | "out";
  busy: boolean;
  /** What to do once signed in (delete my details asks for a fresh sign-in first). */
  then: null | "forget";
}

export const blankSi = (): Si => ({ step: "email", email: "", check: "idle", mailErr: "", fieldErr: null, digits: ["", "", "", "", "", ""], err: null, tries: null, resendAt: 0, notice: null, busy: false, then: null });

/** A retry key a form mints once. */
const mintKey = () => crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
const okEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());
/** The answers that belong to whoever is signed in, or to a link this tab opened for them. */
const PERSONAL = ["aud:me:", "aud:order:", "aud:bank:", "aud:friend:", "aud:confirm:"];
export const masked = (email: string): string => (email === "" ? "" : `${email.charAt(0)}•••@${email.split("@")[1] ?? ""}`);

export class Buyer {
  private readonly app: WaveApp;
  private person: Person | null = null;
  private personAsked = false;

  constructor(app: WaveApp) {
    this.app = app;
  }

  private get port() {
    return this.app.ports.audience!;
  }
  private get s() {
    return this.app.state;
  }
  private setCo(p: Partial<Co>): void {
    const co = this.s.co;
    if (co === null) return;
    this.app.setState({ co: { ...co, ...p } });
  }

  // ── who is signed in ────────────────────────────────────────────────────

  /** The person this browser is signed in as (asked once, then kept as the answers change it). */
  signedIn(): Person | null {
    if (!this.personAsked) {
      this.personAsked = true;
      void this.port.me().then(
        (p) => {
          this.person = p;
          this.app.refresh("aud:me:");
        },
        () => undefined,
      );
    }
    return this.person;
  }
  /**
   * Who is signed in now. When that is someone else (or nobody), whatever the last person read goes at once —
   * their orders, codes, bank details, an order or a friend's ticket on screen — never shown while the next
   * person's answers are on their way, nor left standing when those fail.
   */
  private setPerson(p: Person | null): void {
    const changed = (this.person?.email ?? null) !== (p?.email ?? null);
    this.person = p;
    if (!changed) {
      this.app.refresh("aud:me:");
      return;
    }
    for (const prefix of PERSONAL) this.app.drop(prefix);
    this.app.setState({ going: null, dm: null, co: null });
  }

  // ── checkout ────────────────────────────────────────────────────────────

  startCheckout(show: Show): void {
    const s = this.s;
    if (s.co !== null && s.co.evId === show.id && (s.co.phase === "held" || s.co.phase === "mail")) return this.app.go("checkout");
    const lines = show.types.map((t) => ({ typeId: t.id, q: s.sel[`${String(show.id)}:${String(t.id)}`] ?? 0 })).filter((l) => l.q > 0);
    if (lines.length === 0) return;
    const me = this.signedIn();
    const co: Co = {
      evId: show.id,
      lines,
      tix: lines.flatMap((l) => Array.from({ length: l.q }, () => ({ typeId: l.typeId, name: "", answers: {} }))),
      buyer: { name: "", email: "" },
      optIn: false,
      access: "",
      orderAnswers: {},
      pay: null,
      errs: {},
      phase: "details",
      holdQ: null,
      orderId: null,
      order: null,
      tickets: [],
      heldUntil: null,
      claim: false,
      clientKey: mintKey(),
      check: me !== null ? "ok" : "run",
      sumOpen: false,
      busy: false,
      said: [],
      codeDropped: false,
      nameAsk: false,
      again: null,
      againAt: 0,
    };
    this.app.go("checkout", { co, evId: show.id });
    if (me !== null) void this.hold();
    else
      void this.port.prove().then(
        (ok) => this.setCo({ check: ok ? "ok" : "fail" }),
        () => this.setCo({ check: "fail" }),
      );
  }

  /** The order made and its places held: Adminium's create with the price the buyer saw. */
  async hold(force?: "last" | "code"): Promise<void> {
    const co = this.s.co;
    const w = this.app.world();
    if (co === null || co.phase !== "details" || w === null || co.busy) return;
    const show = w.byId.get(co.evId);
    if (show === undefined) return;
    const me = this.signedIn();
    const errs: Record<string, string> = {};
    if ((me === null || co.nameAsk) && co.buyer.name.trim() === "") errs["name"] = tr("Add your name");
    if (me === null && !okEmail(co.buyer.email)) errs["email"] = tr("Check the email address — it needs an @ and a domain, like name@example.com");
    if (Object.keys(errs).length > 0) {
      this.setCo({ errs });
      focusLater(errs["name"] !== undefined ? "f-name" : "f-email", 40);
      return;
    }
    if (me === null && co.check !== "ok") return;
    let lines = co.lines;
    let tix = co.tix;
    let codeDropped = co.codeDropped;
    if (force === "last" && co.holdQ?.kind === "last" && co.holdQ.n !== null) {
      const q = co.holdQ;
      lines = lines.map((l) => (l.typeId === q.typeId ? { ...l, q: q.n! } : l)).filter((l) => l.q > 0);
      let keep = q.n!;
      tix = tix.filter((x) => x.typeId !== q.typeId || keep-- > 0);
    }
    if (force === "code") codeDropped = true;
    const code = this.s.codes[String(show.id)];
    const values: Record<string, unknown> = {
      event_id: show.id,
      room_id: show.room?.id ?? null,
      // Signed in, the account's name — unless Adminium refused it for an order and the buyer typed one.
      buyer_name: me !== null && !co.nameAsk ? (me.name ?? "") : co.buyer.name.trim(),
      email: me?.email ?? co.buyer.email.trim().toLowerCase(),
      language: this.s.lang,
    };
    if (code !== undefined && !codeDropped) values["code_text"] = code.code;
    const body = { values, tickets: tix.map((x) => ({ ticket_type_id: x.typeId })) };
    this.setCo({ busy: true, errs: {} });
    try {
      // The price the buyer saw, asked again for exactly this order: the create refuses another one.
      const quote = await this.port.quote(body);
      const made = await this.port.buy({ ...body, expect: { total: Number(quote.data["total"] ?? 0) } }, co.clientKey);
      if (made.link !== undefined) await this.port.openOrder(made.link.token);
      const order = made.data;
      const opts = this.payOptions(show, lines);
      this.app.setState({
        sel: { ...this.s.sel, ...Object.fromEntries(lines.map((l) => [`${String(show.id)}:${String(l.typeId)}`, l.q])) },
        co: {
          ...this.s.co!,
          lines,
          tix,
          codeDropped,
          holdQ: null,
          busy: false,
          phase: "held",
          orderId: order.id,
          order,
          tickets: made.tickets,
          heldUntil: ms(order["held_until"]),
          pay: opts[0] ?? null,
          said: [],
        },
      });
      this.app.refresh("aud:left:");
      focusLater("f-t0", 80);
    } catch (error) {
      await this.holdRefused(show, error, body.tickets, lines);
    }
  }

  private async holdRefused(show: Show, error: unknown, lines: { ticket_type_id: Id }[], chosen: Co["lines"]): Promise<void> {
    if (!isApiError(error)) {
      this.setCo({ busy: false, errs: { hold: tr("We couldn't reach the box office just now. Try again.") } });
      return;
    }
    const p = error.params;
    if (error.code === "PUBLIC_SOLD_OUT" || error.code === "CAPACITY_FULL") {
      // Which type ran short: the refusal names the line; what is left of it is the public count, when little is.
      const index = typeof p["index"] === "number" ? p["index"] : null;
      const typeId = index !== null ? lines[index]?.ticket_type_id : chosen[0]?.typeId;
      this.app.refresh("aud:left:");
      const left = await this.port.left(show.id).catch(() => []);
      const l = left.find((x) => x.ticket_type_id === typeId);
      const n = l === undefined ? null : l.state === "sold_out" ? 0 : (l.left ?? null);
      this.setCo({ busy: false, holdQ: { kind: "last", typeId: typeId ?? chosen[0]!.typeId, n } });
      return;
    }
    if (p["column"] === "code_text" || error.code === "PUBLIC_PRICE_CHANGED") {
      const code = this.s.codes[String(show.id)]?.code ?? "";
      const plain = await this.port.quote({ values: { event_id: show.id, room_id: show.room?.id ?? null }, tickets: lines }).catch(() => null);
      this.setCo({ busy: false, holdQ: { kind: "code", code, total: plain === null ? null : Number(plain.data["total"] ?? 0) } });
      return;
    }
    if (error.code === "PUBLIC_LIMIT_REACHED") {
      this.setCo({ busy: false, errs: { hold: tr("That's as many checkouts as one email can start today — use the order you already have, or write to {email}.", { email: this.app.world()?.settings.contactEmail ?? "" }) } });
      return;
    }
    if (error.code === "PUBLIC_WRITE_REFUSED" && (p["column"] === "buyer_name" || p["column"] === "name")) {
      // The name refused (signed in, the account's own): said on the name field, which shows to put it right.
      const co = this.s.co!;
      const me = this.signedIn();
      this.setCo({ busy: false, nameAsk: me !== null, ...(me !== null && !co.nameAsk ? { buyer: { ...co.buyer, name: me.name ?? "" } } : {}), errs: { name: nameRefused(p) } });
      focusLater("f-name", 40);
      return;
    }
    if (error.code === "PUBLIC_WRITE_REFUSED" && p["column"] === "ticket_type_id") {
      const t = show.types.find((x) => x.id === lines[Number(p["index"] ?? 0)]?.ticket_type_id);
      this.app.refresh("aud:");
      this.setCo({ busy: false, errs: { hold: tr("{type} is no longer on sale — choose another ticket.", { type: t?.short ?? "" }) } });
      return;
    }
    this.setCo({ busy: false, errs: { hold: tr("We couldn't hold those tickets. Try again.") } });
  }

  /** The ways every chosen type can be paid for this show (none when nothing is to pay). */
  payOptions(show: Show, lines: Co["lines"]): PayWay[] {
    const w = this.app.world();
    if (w === null) return [];
    const types = lines.map((l) => show.types.find((t) => t.id === l.typeId)).filter((t) => t !== undefined);
    if (types.every((t) => t.price === 0)) return [];
    let o: PayWay[] = ["door", "transfer"];
    for (const t of types) {
      if (t.price === 0) continue;
      const p = pays(this.app, w, show, t);
      o = o.filter((x) => p.includes(x));
    }
    return o;
  }

  setTicket(i: number, p: Partial<Co["tix"][number]>): void {
    const co = this.s.co;
    if (co === null) return;
    this.setCo({ tix: co.tix.map((x, j) => (j === i ? { ...x, ...p, answers: { ...x.answers, ...(p.answers ?? {}) } } : x)), errs: { ...co.errs, [`t${String(i)}`]: null, [`q${String(i)}`]: null } });
  }
  setBuyer(p: Partial<Co["buyer"]>): void {
    const co = this.s.co;
    if (co === null) return;
    this.setCo({ buyer: { ...co.buyer, ...p }, errs: { ...co.errs, ...(p.name !== undefined ? { name: null } : {}), ...(p.email !== undefined ? { email: null } : {}) } });
  }
  setCoField(p: Partial<Co>): void {
    this.setCo(p);
  }

  /** Confirm: names and answers written on the held order, then its move (to the door, no charge, or the email). */
  async confirm(e?: { preventDefault: () => void }): Promise<void> {
    e?.preventDefault();
    const co = this.s.co;
    const w = this.app.world();
    if (co === null || co.phase !== "held" || w === null || co.busy) return;
    const show = w.byId.get(co.evId)!;
    if (!co.claim && co.heldUntil !== null && co.heldUntil <= this.app.now) return this.expire();
    const errs: Record<string, string> = {};
    const qs = w.settings.questionsOn ? w.questions.filter((q) => q["event_id"] === show.id) : [];
    co.tix.forEach((x, i) => {
      if (x.name.trim() === "") errs[`t${String(i)}`] = tr("Add a name for this ticket");
      for (const q of qs.filter((q) => q["per"] !== "order" && q["required"] === true)) if ((x.answers[String(q.id)] ?? "") === "") errs[`q${String(i)}`] = tr("Pick an answer");
    });
    for (const q of qs.filter((q) => q["per"] === "order" && q["required"] === true)) if ((co.orderAnswers[String(q.id)] ?? "") === "") errs["qo"] = tr("Pick an answer");
    if (Object.keys(errs).length > 0) {
      this.setCo({ errs });
      const first = Object.keys(errs).find((k) => k.startsWith("t"));
      focusLater(first === undefined ? "co-err" : `f-t${first.slice(1)}`, 40);
      return;
    }
    this.setCo({ busy: true, errs: {} });
    try {
      const tickets = co.tickets.length > 0 ? co.tickets : (await this.port.order()).tickets;
      for (let i = 0; i < co.tix.length; i += 1) {
        const t = tickets[i];
        if (t === undefined) continue;
        const answers = Object.keys(co.tix[i]!.answers).length > 0 ? co.tix[i]!.answers : undefined;
        try {
          await this.port.nameTicket(t.id, co.tix[i]!.name.trim(), answers);
        } catch (error) {
          // A name refused: said on that ticket's name field.
          if (isApiError(error) && error.code === "PUBLIC_WRITE_REFUSED" && error.params["column"] === "holder_name") {
            this.setCo({ busy: false, errs: { [`t${String(i)}`]: nameRefused(error.params) } });
            focusLater(`f-t${String(i)}`, 40);
            return;
          }
          throw error;
        }
      }
      // A checkout made here works through the order's own link; a claim from My tickets through the sign-in.
      const via = co.claim && this.s.going?.via === "me" ? co.orderId ?? undefined : undefined;
      await this.port.updateOrder({
        opt_in: co.optIn,
        ...(co.access.trim() === "" ? {} : { access_note: co.access.trim() }),
        ...(Object.keys(co.orderAnswers).length > 0 ? { answers: co.orderAnswers } : {}),
      }, via);
      const free = Number(co.order?.["total"] ?? 0) <= 0;
      if (co.claim) {
        const moved = await this.port.choose(free ? "no_charge" : co.pay === "transfer" ? "confirming" : "door", co.tix.length, via);
        return this.after(moved, co);
      }
      const moved = await this.port.choose(free ? "no_charge" : co.pay === "transfer" ? "confirming" : "door");
      this.after(moved, co);
    } catch (error) {
      const c = isApiError(error) ? error.code : null;
      if (c === "STATE_MOVE_REFUSED" || c === "PUBLIC_REF_NOT_FOUND") {
        // The hold ended before the confirm reached it.
        return this.expire();
      }
      this.setCo({ busy: false, errs: { confirm: tr("We couldn't confirm that just now. Try again.") } });
    }
  }

  private after(moved: Row, co: Co): void {
    this.app.refresh("aud:");
    if (moved["status"] === "confirming") {
      this.app.setState({ co: { ...co, busy: false, phase: "mail", order: moved, heldUntil: ms(moved["held_until"]) ?? co.heldUntil } });
      focusLater("co-mail", 60);
      return;
    }
    const sel = { ...this.s.sel };
    for (const l of co.lines) delete sel[`${String(co.evId)}:${String(l.typeId)}`];
    const via = co.claim && this.s.going?.via === "me" ? "me" : "link";
    this.app.go("going", { co: null, sel, going: { orderId: moved.id, via } });
  }

  /** "Use a different way to pay": back from the confirm email to the door, while the order is still held. */
  async payOtherWay(): Promise<void> {
    const co = this.s.co;
    if (co === null || co.phase !== "mail") return;
    try {
      const moved = await this.port.choose("door");
      this.after(moved, { ...co, pay: "door" });
    } catch {
      this.expire();
    }
  }

  /**
   * "Send it again": the confirm email made again, with a new link (the one in the earlier email stops
   * working). Adminium keeps the count: a second press within the minute sends nothing new, so the button
   * waits out that minute here too.
   */
  async sendAgain(): Promise<void> {
    const co = this.s.co;
    if (co === null || co.phase !== "mail" || co.claim || co.busy || co.again === "limit" || co.againAt > this.app.now) return;
    this.setCo({ busy: true });
    try {
      await this.port.confirmAgain();
      this.setCo({ busy: false, again: "sent", againAt: this.app.now + 60_000 });
      this.app.toast(tr("Sent again to {email}", { email: masked(String(co.order?.["email"] ?? "") || (this.signedIn()?.email ?? co.buyer.email.trim())) }), "mail");
    } catch (error) {
      const c = isApiError(error) ? error.code : null;
      if (c === "PUBLIC_LIMIT_REACHED") return this.setCo({ busy: false, again: "limit" });
      if (c === "PUBLIC_RATE_LIMITED" || c === "RATE_LIMITED" || c === "CAPACITY_BUSY") return this.setCo({ busy: false, again: "wait", againAt: this.app.now + 60_000 });
      if (c === "PUBLIC_WRITE_REFUSED") {
        // The order no longer waits for its confirm: confirmed from the email meanwhile, or the hold ran out.
        this.setCo({ busy: false });
        return this.pollMail();
      }
      this.setCo({ busy: false, again: "down" });
    }
  }

  /** While the confirm email waits: once its link has confirmed the order, this tab moves on to the order. */
  async pollMail(): Promise<void> {
    const co = this.s.co;
    if (co === null || co.phase !== "mail") return;
    try {
      const o = await this.port.order();
      if (this.s.co?.phase !== "mail") return;
      const st = String(o.order["status"]);
      if (st === "awaiting_transfer" || st === "overdue" || st === "paid") {
        const sel = { ...this.s.sel };
        for (const l of co.lines) delete sel[`${String(co.evId)}:${String(l.typeId)}`];
        this.app.refresh("aud:");
        this.app.go("going", { co: null, sel, going: { orderId: o.order.id, via: "link" } });
        this.app.toast(tr("Order confirmed"), "badge-check");
      } else if (st === "expired" || st === "let_go") this.expire();
    } catch {
      // Asked again on the next beat.
    }
  }

  /** The hold ran out: the page learns it from its clock or from a refused confirm. */
  expire(): void {
    const co = this.s.co;
    if (co === null) return;
    this.app.setState({ co: { ...co, busy: false, phase: "gone", heldUntil: null } });
    this.app.openSheet("holdGone");
    this.app.refresh("aud:left:");
  }

  checkAgain(): void {
    const co = this.s.co;
    this.app.go("event", { evId: co?.evId ?? this.s.evId, co: null });
    this.app.toast(tr("Here's what's left"), "refresh-cw");
  }

  /** Let the held places go (or, before the hold, just the choice). */
  async letGo(): Promise<void> {
    const co = this.s.co;
    if (co === null) return;
    const sel = { ...this.s.sel };
    for (const l of co.lines) delete sel[`${String(co.evId)}:${String(l.typeId)}`];
    if (co.phase === "held" || co.phase === "mail") {
      try {
        await this.port.choose("let_go");
      } catch {
        // Already gone: nothing to let go.
      }
      this.app.refresh("aud:left:");
    }
    this.app.go("event", { evId: co.evId, co: null, sel });
    if (co.phase !== "details") this.app.toast(tr("We've let those tickets go"), "undo-2");
  }

  /** The clock moved (the demo card, or time passing): a hold that ran out, and its last minutes said aloud. */
  tick(): void {
    const co = this.s.co;
    if (co === null || (co.phase !== "held" && co.phase !== "mail") || co.heldUntil === null) return;
    const left = co.heldUntil - this.app.now;
    // A claim runs to its offer's end: then the offer's own page says it ran out.
    if (co.claim) {
      if (left <= 0) {
        this.app.refresh("aud:");
        this.app.go("offer", { co: null });
      }
      return;
    }
    if (left <= 0) return this.expire();
    for (const [at, words] of [
      [120_000, tr("2 minutes left — confirm to keep your tickets.")],
      [30_000, tr("30 seconds left.")],
    ] as const) {
      if (left <= at && !co.said.includes(at)) {
        this.setCo({ said: [...co.said, at] });
        const said = typeof document === "undefined" ? null : document.getElementById("wv-said");
        if (said !== null) said.textContent = words;
      }
    }
  }

  // ── the order's own page ────────────────────────────────────────────────

  /** An order opened by its own link (the code in the address's fragment). */
  async openByLink(token: string): Promise<void> {
    try {
      const claim = await this.port.openOrder(token);
      void claim;
      const o = await this.port.order();
      if (o.order["status"] === "offered") {
        this.app.go("offer", { going: { orderId: o.order.id, via: "link" }, offerQ: Number(o.tickets.length) });
        return;
      }
      this.app.go("going", { going: { orderId: o.order.id, via: "link" } });
    } catch {
      this.app.go("404");
    }
  }
  openMine(orderId: Id): void {
    this.app.go("going", { going: { orderId, via: "me" } });
  }
  /** The order on the order page (or the offer page), as Adminium reads it. */
  going(): OrderWithTickets | undefined {
    const g = this.s.going;
    if (g === null) return undefined;
    return g.via === "link" ? this.app.get(`aud:order:link:${String(g.orderId)}`, () => this.port.order()) : this.app.get(`aud:me:order:${String(g.orderId)}`, () => this.port.myOrder(g.orderId));
  }

  // ── signing in ──────────────────────────────────────────────────────────

  private setSi(p: Partial<Si>): void {
    this.app.setState({ si: { ...this.s.si, ...p } });
  }
  async sendCode(e?: { preventDefault: () => void }): Promise<void> {
    e?.preventDefault();
    const si = this.s.si;
    const email = si.email.trim();
    if (!okEmail(email)) {
      this.setSi({ fieldErr: tr("Enter an email address like name@example.com") });
      focusLater("si-email", 30);
      return;
    }
    this.setSi({ fieldErr: null, check: "run", err: null, mailErr: "" });
    const proved = await this.port.prove().catch(() => false);
    if (!proved) return this.setSi({ check: "fail" });
    try {
      await this.port.signIn(email);
      this.setSi({ check: "idle", step: "code", digits: ["", "", "", "", "", ""], tries: null, err: null, resendAt: this.app.now + 30_000, notice: null });
      focusLater("si-d0", 60);
    } catch (error) {
      const c = isApiError(error) ? error.code : null;
      this.setSi({ check: "ok", mailErr: c === "PUBLIC_RATE_LIMITED" || c === "RATE_LIMITED" ? "limit" : "down" });
    }
  }
  async resend(): Promise<void> {
    const si = this.s.si;
    try {
      await this.port.signIn(si.email.trim());
      this.setSi({ resendAt: this.app.now + 30_000, err: si.err === "locked" ? "locked" : null, tries: null, digits: ["", "", "", "", "", ""], mailErr: "" });
      this.app.toast(tr("New link and code sent to {email}", { email: masked(si.email.trim()) }), "mail");
    } catch (error) {
      const c = isApiError(error) ? error.code : null;
      this.setSi({ mailErr: c === "PUBLIC_RATE_LIMITED" || c === "RATE_LIMITED" ? "limit" : "down" });
    }
  }
  setDigits(d: string[], focusAt: number | null): void {
    const si = this.s.si;
    this.setSi({ digits: d, err: si.err === "locked" || si.err === "expired" || si.err === "many" ? si.err : null });
    if (focusAt !== null) focusLater(`si-d${String(Math.min(5, focusAt))}`, 0);
  }
  async verify(e?: { preventDefault: () => void }): Promise<void> {
    e?.preventDefault();
    const si = this.s.si;
    const code = si.digits.join("");
    if (code.length < 6) return this.setSi({ err: "short" });
    this.setSi({ busy: true });
    try {
      const p = await this.port.verify(si.email.trim(), code);
      this.signedInAs(p);
    } catch (error) {
      const c = isApiError(error) ? error.code : null;
      const tries = isApiError(error) && typeof error.params["tries"] === "number" ? error.params["tries"] : null;
      const err: Si["err"] = c === "PUBLIC_CODE_EXPIRED" ? "expired" : c === "PUBLIC_CLAIM_LOCKED" ? "many" : c === "PUBLIC_CODE_LOCKED" ? (tries === 0 ? "many" : "locked") : tries === 0 ? "many" : "wrong";
      this.setSi({ busy: false, err, tries });
      focusLater("si-d0", 30);
    }
  }
  async openSignInLink(token: string): Promise<void> {
    try {
      const p = await this.port.openSignIn(token);
      this.signedInAs(p);
    } catch {
      this.app.go("signin", { si: { ...blankSi(), step: "code", err: "expired" } });
    }
  }
  private signedInAs(p: Person): void {
    const then = this.s.si.then;
    this.setPerson(p);
    this.app.go("tickets", { si: blankSi() });
    this.app.toast(tr("Signed in as {email}", { email: p.email }), "log-in");
    if (then === "forget") setTimeout(() => this.app.openSheet("delAcct"), 120);
  }
  async signOut(): Promise<void> {
    await this.port.signOut().catch(() => undefined);
    this.setPerson(null);
    this.app.go("home");
    this.app.toast(tr("Signed out"), "log-out");
  }
  /** "Not you?" in checkout: signs out here; a running hold made for this person is let go. */
  async notYou(): Promise<void> {
    const co = this.s.co;
    if (co !== null && (co.phase === "held" || co.phase === "mail")) await this.port.choose("let_go").catch(() => undefined);
    await this.port.signOut().catch(() => undefined);
    this.setPerson(null);
    if (co !== null) this.app.setState({ co: { ...co, phase: "details", orderId: null, order: null, tickets: [], heldUntil: null, check: "run", clientKey: mintKey(), buyer: { name: "", email: "" } } });
    void this.port.prove().then((ok) => this.setCo({ check: ok ? "ok" : "fail" }));
    this.app.toast(tr("Signed out — carry on as a guest"), "log-out");
  }
  /** Signed out on every device; when Adminium did not take it, this device is signed out and the page says the others are not. */
  async signOutEverywhere(): Promise<void> {
    let refused = false;
    await this.port.signOutEverywhere().catch(() => {
      refused = true;
    });
    this.setPerson(null);
    this.app.go("signin", { si: blankSi() });
    if (refused) this.app.toast(tr("Signed out here. We couldn't sign you out on your other devices — sign in and try again."), "triangle-alert");
    else this.app.toast(tr("Signed out everywhere"), "log-out");
  }
  /** Delete my details: the server asks for a fresh sign-in first when it wants one (the same sheet says so). */
  async forget(): Promise<void> {
    try {
      await this.port.forget();
      this.setPerson(null);
      this.app.go("home");
      this.app.toast(tr("Your details are deleted"), "user-x");
    } catch (error) {
      if (isApiError(error) && error.code === "PUBLIC_CODE_STEP_UP") this.app.patchSheet({ kind: "delAuth" });
      else this.app.patchSheet({ err: { any: tr("We couldn't do that just now. Try again.") } });
    }
  }
  /** Step-up: sign in again, then the delete sheet opens once more. */
  async stepUp(): Promise<void> {
    const email = this.person?.email ?? "";
    this.app.go("signin", { si: { ...blankSi(), email, then: "forget" } });
    await this.sendCode();
  }

  // ── My tickets ──────────────────────────────────────────────────────────

  mine(): { orders: OrderWithTickets[]; held: Row[] } | undefined {
    if (this.signedIn() === null) return undefined;
    const got = this.app.get("aud:me:orders", () => this.port.myOrders());
    // Signed out elsewhere ("sign out everywhere" from another phone): back to sign in, saying why.
    const err = this.app.errorOf("aud:me:orders");
    if (isApiError(err) && err.code === "PUBLIC_REF_NOT_FOUND" && this.person !== null) setTimeout(() => this.sessionEnded(), 0);
    return got;
  }

  /** This browser's session ended somewhere else: signed out here, told so on the sign-in page. */
  sessionEnded(): void {
    if (this.person === null) return;
    this.setPerson(null);
    this.app.go("signin", { si: { ...blankSi(), notice: "out" } });
  }
  myWaitlist(): Row[] | undefined {
    if (this.signedIn() === null) return undefined;
    return this.app.get("aud:me:waitlist", () => this.port.myWaitlist());
  }
  /** A write on a ticket or an order from a page or a sheet: its toast on success, the sheet's error line otherwise. */
  async act(run: () => Promise<unknown>, done: string, icon: string): Promise<boolean> {
    try {
      await run();
      this.app.refresh("aud:");
      this.app.toast(done, icon);
      return true;
    } catch (error) {
      if (this.s.sheet !== null) this.app.patchSheet({ busy: false, err: { any: refusalWords(error) } });
      else this.app.toast(refusalWords(error), "triangle-alert");
      this.app.refresh("aud:");
      return false;
    }
  }

  // ── a ticket from a friend ──────────────────────────────────────────────

  friend(): Row | undefined {
    const token = this.s.fr.token;
    if (token === null) return undefined;
    return this.app.get(`aud:friend:${token}`, () => this.port.openTicket(token));
  }
  async accept(e?: { preventDefault: () => void }): Promise<void> {
    e?.preventDefault();
    const fr = this.s.fr;
    if (fr.token === null) return;
    if (fr.name.trim() === "") {
      this.app.setState({ fr: { ...fr, err: tr("Add the name for the ticket") } });
      focusLater("fr-name", 30);
      return;
    }
    this.app.setState({ fr: { ...fr, busy: true, err: null } });
    try {
      await this.port.acceptTicket(fr.token, fr.name.trim());
      this.app.setState({ fr: { ...this.s.fr, busy: false } });
      // The reply hides what the accept renewed: the page reads the ticket again.
      this.app.refresh(`aud:friend:`);
    } catch (error) {
      this.app.setState({ fr: { ...this.s.fr, busy: false, err: refusalWords(error) } });
      this.app.refresh(`aud:friend:`);
    }
  }

  // ── a waitlist offer ────────────────────────────────────────────────────

  /** Claim an offer: its order is the hold; the checkout confirms it (part of it, when fewer are wanted). */
  claim(o: OrderWithTickets, q: number): void {
    const w = this.app.world();
    const show = w?.byId.get(o.order["event_id"] as Id);
    if (show === undefined) return;
    const tickets = o.tickets.slice(0, q);
    const lines: Co["lines"] = [];
    for (const t of tickets) {
      const l = lines.find((x) => x.typeId === t["ticket_type_id"]);
      if (l !== undefined) l.q += 1;
      else lines.push({ typeId: t["ticket_type_id"] as Id, q: 1 });
    }
    const opts = this.payOptions(show, lines);
    this.app.go("checkout", {
      evId: show.id,
      co: {
        evId: show.id,
        lines,
        tix: tickets.map((t) => ({ typeId: t["ticket_type_id"] as Id, name: String(t["holder_name"] ?? ""), answers: {} })),
        buyer: { name: String(o.order["buyer_name"] ?? ""), email: String(o.order["email"] ?? "") },
        optIn: false,
        access: "",
        orderAnswers: {},
        pay: opts[0] ?? null,
        errs: {},
        phase: "held",
        holdQ: null,
        orderId: o.order.id,
        order: o.order,
        tickets,
        heldUntil: ms(o.order["offer_until"]),
        claim: true,
        clientKey: mintKey(),
        check: "ok",
        sumOpen: false,
        busy: false,
        said: [],
        codeDropped: false,
        nameAsk: false,
        again: null,
        againAt: 0,
      },
    });
  }

  // ── the transfer's confirm link ─────────────────────────────────────────

  confirmRead(): Row | undefined {
    const token = this.s.confirm.token;
    if (token === null) return undefined;
    return this.app.get(`aud:confirm:${token}`, () => this.port.openConfirm(token));
  }
  async confirmByEmail(): Promise<void> {
    const c = this.s.confirm;
    if (c.token === null || c.busy) return;
    this.app.setState({ confirm: { ...c, busy: true } });
    try {
      await this.port.confirmTransfer(c.token);
      this.app.setState({ confirm: { ...this.s.confirm, busy: false, done: true } });
      this.app.refresh("aud:");
    } catch {
      this.app.setState({ confirm: { ...this.s.confirm, busy: false } });
      this.app.refresh("aud:confirm:");
    }
  }
}

/** A refusal in the buyer's words: what happened, never the rule's name. */
export function refusalWords(error: unknown): string {
  if (!isApiError(error)) return tr("We couldn't reach the box office just now. Try again.");
  switch (error.code) {
    case "PUBLIC_RATE_LIMITED":
    case "RATE_LIMITED":
      return tr("That's a lot of requests from one place — try again in a little while.");
    case "PUBLIC_REF_NOT_FOUND":
      return tr("That can't be changed any more.");
    default:
      return tr("That can't be done here. Ask the box office.");
  }
}

/** A name Adminium refused: none given, or one that is not only a name (a number, a web or an email address). */
export function nameRefused(params: Record<string, unknown>): string {
  return params["reason"] === "required" ? tr("Add your name") : tr("Write the name in letters only — no numbers, web or email address.");
}

/** The deadline a transfer would have, as the rule reads it (shown before the order moves; the server stamps it). */
export function transferDeadline(app: WaveApp, show: Show): number {
  const w = app.world()!;
  const due = wallTime(venueDay(app.now, app.zone, w.settings.transferDays), w.settings.transferTime, app.zone);
  return Math.min(due, show.doors - w.settings.transferCutoffDays * 86_400_000);
}
