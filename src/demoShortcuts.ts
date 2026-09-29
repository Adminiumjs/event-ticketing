/**
 * The demo card's shortcuts: each plays a moment of the venue through the
 * screens' own actions — a checkout started, filled and held; an order opened
 * by its own link; a code scanned at the door — on the demo's Adminium, which
 * judges everything as it always does. Someone else buying the last seats is
 * another buyer on the same Adminium. Only three are faults the card injects,
 * and they live in the demo's Adminium: the next sign-in email fails, the next
 * person check fails, a code ends a minute early. A shortcut that moves the
 * clock says so.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import type { Id, Row } from "./data/wire.ts";
import type { DemoAdminium } from "./demo/adminium.ts";
import { DOORS_AT } from "./demo/adminium.ts";
import { DemoAudience } from "./demo/sides.ts";
import { boxOf } from "./app/box.ts";
import { doorOf } from "./app/door.ts";
import { fD, fT, strip } from "./app/fmt.ts";
import type { Show } from "./app/world.ts";
import type { WaveApp } from "./app/wave.ts";
import { cardWord } from "./i18n/strings/card.ts";

const MIA = { name: "Mia Okada", email: "mia.okada@example.com" };

/** A card toast, in the page's language, marked as the card's. */
function say(app: WaveApp, key: string, params: Record<string, string> = {}, icon = "wand-sparkles"): void {
  const lang = app.state.lang;
  app.toast(cardWord(lang, "demo.toast.panel", { text: cardWord(lang, key, params) }), icon);
}

/** Waits (a little, and never forever) for the page to reach a state. */
async function until(app: WaveApp, ok: () => boolean, ms = 4000): Promise<boolean> {
  const end = Date.now() + ms;
  while (!ok()) {
    if (Date.now() > end) return false;
    await app.idle();
    await new Promise((r) => setTimeout(r, 30));
  }
  return true;
}

const show = (app: WaveApp, name: string): Show | undefined => app.world()?.shows.find((s) => s.name === name || s.name.startsWith(name));
const type = (s: Show, short: string) => s.types.find((t) => t.short === short || t.name === short);
const order = (demo: DemoAdminium, number: string): Row | undefined => demo.world.all("orders").find((o) => o["number"] === number);

/** The clock moved on (never back), the card told. */
function moveTo(app: WaveApp, demo: DemoAdminium, at: number): void {
  if (demo.now >= at) return;
  demo.advanceTo(at);
  say(app, "demo.toast.moved", { when: `${strip(fD(at))}, ${strip(fT(at))}` }, "fast-forward");
}

/** The audience side, its venue read. */
async function audience(app: WaveApp): Promise<boolean> {
  app.setPersona("audience");
  return until(app, () => app.world() !== null);
}

/**
 * A checkout started on a show with some of one type, the buyer's details
 * filled (a guest's: Mia's, or the names given) and — unless `hold` is false —
 * held, as the buyer's own "Continue" does.
 */
async function checkout(app: WaveApp, showName: string, typeShort: string, q: number, opts: { buyer?: { name: string; email: string }; names?: string[]; hold?: boolean } = {}): Promise<boolean> {
  if (!(await audience(app))) return false;
  const s = show(app, showName);
  const t = s === undefined ? undefined : type(s, typeShort);
  if (s === undefined || t === undefined) return false;
  const buyer = app.buyer;
  if (app.state.co !== null && (app.state.co.phase === "held" || app.state.co.phase === "mail")) await buyer.letGo();
  app.setState({ co: null, evId: s.id, sel: { ...app.state.sel, [`${String(s.id)}:${String(t.id)}`]: q } });
  buyer.startCheckout(s);
  if (buyer.signedIn() === null) {
    buyer.setBuyer(opts.buyer ?? MIA);
    if (!(await until(app, () => app.state.co?.check !== "run"))) return false;
  }
  (opts.names ?? []).forEach((name, i) => buyer.setTicket(i, { name }));
  if (opts.hold === false) return true;
  await buyer.hold();
  return until(app, () => app.state.co?.busy === false);
}

/** Names on the held tickets, pay chosen, confirmed: as the buyer's own button does. */
async function confirmAs(app: WaveApp, pay: "door" | "transfer" | null, names: string[]): Promise<boolean> {
  const buyer = app.buyer;
  if (!(await until(app, () => app.state.co?.phase === "held"))) return false;
  names.forEach((name, i) => buyer.setTicket(i, { name }));
  if (pay !== null) buyer.setCoField({ pay });
  await buyer.confirm();
  return until(app, () => app.state.co === null || app.state.co.phase !== "held" || app.state.co.busy === false);
}

/** An order of the sample opened by its own link, as its email's button does. */
async function openOrder(app: WaveApp, demo: DemoAdminium, number: string): Promise<void> {
  const o = order(demo, number);
  if (o === undefined || !(await audience(app))) return;
  await app.buyer.openByLink(String(o["link_token"]));
}

/** Mia signed in, as her emailed link does (the card says so). */
async function signInMia(app: WaveApp, demo: DemoAdminium): Promise<void> {
  if (app.buyer.signedIn() !== null) return;
  await demo.audience.signIn(MIA.email);
  const sent = demo.audience.mail.get(MIA.email);
  if (sent === undefined) return;
  await app.buyer.openSignInLink(sent.token);
  say(app, "demo.toast.signed-in", {}, "log-in");
}

/** The sign-in page with Mia's address in it. */
async function signInPage(app: WaveApp): Promise<void> {
  await audience(app);
  app.go("signin", { si: { ...app.state.si, email: MIA.email, step: "email", err: null, fieldErr: null, mailErr: "", check: "idle", notice: null } });
}

/** The door on tonight's show, at the doors (the early scans made on the way), a code scanned. */
async function door(app: WaveApp, demo: DemoAdminium, pick: (dayId: Id) => string | null): Promise<void> {
  if (demo.now < DOORS_AT && demo.now > DOORS_AT - 12 * 3_600_000) {
    demo.toDoors();
    say(app, "demo.toast.doors", {}, "door-open");
  }
  app.setPersona("box");
  app.setState({ bx: "door", sheet: null });
  const d = doorOf(app);
  if (!(await until(app, () => d.chosen() !== null))) return;
  const t = d.chosen()!;
  d.set({ tab: "scan" });
  if (d.s.verdict !== null) d.dismiss();
  const code = pick(t.day.id);
  if (code !== null) await d.scan(code, "pad");
}

export async function runShortcut(id: string, app: WaveApp, demo: DemoAdminium): Promise<void> {
  const w = demo.world;
  switch (id) {
    // ── an event ──
    case "sold-out": {
      if (!(await audience(app))) return;
      const s = show(app, "Velvet Hour");
      if (s !== undefined) app.openShow(s.id);
      return;
    }
    case "presale": {
      if (!(await audience(app))) return;
      const s = show(app, "Static Bloom");
      if (s === undefined) return;
      app.openShow(s.id);
      app.setState({ codeOpen: true, codeIn: "BLOOMEARLY" });
      await app.applyCode(s);
      return;
    }
    case "postponed": {
      if (!(await audience(app))) return;
      const s = show(app, "Hollow Tide");
      if (s !== undefined) app.openShow(s.id);
      return;
    }

    // ── checkout ──
    case "fill": {
      if (app.state.co === null && !(await checkout(app, "Neon Circuit", "Standard", 2, { hold: false }))) return;
      const co = app.state.co;
      if (co === null) return;
      if (app.buyer.signedIn() === null && co.phase === "details") app.buyer.setBuyer(MIA);
      ["Mia Okada", "Kai Renner", "Ana Ruiz", "Sam Idris", "Jo Petrak", "Lee Tan"].slice(0, co.tix.length).forEach((name, i) => app.buyer.setTicket(i, { name }));
      app.go("checkout");
      say(app, "demo.toast.filled");
      return;
    }
    case "last-balcony": {
      // Another buyer takes all but one of Neon's Balcony seats, pays at the door; then this checkout asks for two.
      const neon = w.all("events").find((e) => e["name"] === "Neon Circuit");
      const bal = w.all("ticket_types").find((t) => t["event_id"] === neon?.id && String(t["name"]).startsWith("Balcony"));
      if (neon === undefined || bal === undefined) return;
      const other = new DemoAudience(demo.engine);
      const left = () => demo.engine.typeLeft(neon.id).find((l) => l.ticket_type_id === bal.id)?.left ?? 0;
      const max = Math.max(1, Number(bal["max_per_order"] ?? 8));
      for (let guard = 0; left() > 1 && guard < 20; guard += 1) {
        const n = Math.min(max, left() - 1);
        await other.buy({ values: { event_id: neon.id, buyer_name: "Lee Tan", email: `lee.tan+${String(guard)}@example.com` }, tickets: Array.from({ length: n }, () => ({ ticket_type_id: bal.id })) }, `demo-last-${String(guard)}-${String(demo.now)}`);
        await other.choose("door");
      }
      app.refresh("aud:left:");
      await checkout(app, "Neon Circuit", "Balcony", 2);
      return;
    }
    case "transfer": {
      if (!(await checkout(app, "Cinder", "Standard", 2, { buyer: { name: "Ana Ruiz", email: "ana.ruiz@example.com" } }))) return;
      await confirmAs(app, "transfer", ["Ana Ruiz", "Jo Petrak"]);
      return;
    }
    case "hold-out": {
      const co = app.state.co;
      if (co === null || (co.phase !== "held" && co.phase !== "mail")) {
        if (!(await checkout(app, "Neon Circuit", "Standard", 2))) return;
      }
      app.go("checkout");
      const until_ = app.state.co?.heldUntil;
      if (until_ != null) moveTo(app, demo, until_ + 60_000);
      return;
    }
    case "code-out": {
      // STUDENT10 typed on Home Studio while it works; the card then ends it a minute early (the demo's fault), and the hold meets it.
      if (!(await audience(app))) return;
      const s = show(app, "Home Studio");
      if (s === undefined) return;
      app.openShow(s.id);
      app.setState({ codeOpen: true, codeIn: "STUDENT10" });
      await app.applyCode(s);
      if (!(await checkout(app, "Home Studio", s.types[0]?.short ?? "", 2, { hold: false }))) return;
      const code = w.all("codes").find((c) => c["code"] === "STUDENT10");
      if (code !== undefined) await demo.boxOffice.update("codes", code.id, { valid_until: new Date(demo.now - 60_000).toISOString() });
      say(app, "demo.toast.code-ended", {}, "ticket-x");
      await app.buyer.hold();
      return;
    }

    // ── your order ──
    case "going-door": {
      if (!(await checkout(app, "Neon Circuit", "Standard", 2))) return;
      await confirmAs(app, "door", ["Lee Tan", "Sam Idris"]);
      return;
    }
    case "going-free": {
      if (!(await checkout(app, "First Listen", "Register", 1))) return;
      await confirmAs(app, null, ["Mia Okada"]);
      return;
    }
    case "going-transfer": {
      if (!(await checkout(app, "Cinder", "Standard", 2, { buyer: { name: "Ana Ruiz", email: "ana.ruiz@example.com" } }))) return;
      if (!(await confirmAs(app, "transfer", ["Ana Ruiz", "Jo Petrak"]))) return;
      // The emailed confirm link pressed, then the order opened by its own link.
      const id = app.state.co?.orderId ?? null;
      const made = id === null ? undefined : w.get("orders", id);
      if (made === undefined) return;
      await app.arrive("/confirm", `#${String(made["confirm_token"])}`);
      await app.buyer.confirmByEmail();
      await app.buyer.openByLink(String(w.get("orders", made.id)!["link_token"]));
      return;
    }
    case "going-paid":
      return openOrder(app, demo, "WV-S8790");
    case "going-released":
      // Released at Tuesday 18:00, a day after its transfer deadline.
      moveTo(app, demo, Date.parse("2026-07-28T22:01:00Z"));
      return openOrder(app, demo, "WV-S8793");
    case "going-cancelled":
      return openOrder(app, demo, "WV-S8744");
    case "going-past":
      return openOrder(app, demo, "WV-S8633");

    // ── signing in ──
    case "mia":
      return signInPage(app);
    case "open-link": {
      await signInPage(app);
      await app.buyer.sendCode();
      const sent = demo.audience.mail.get(MIA.email);
      if (sent === undefined) return;
      say(app, "demo.toast.link", {}, "mail-open");
      await app.buyer.openSignInLink(sent.token);
      return;
    }
    case "link-expires": {
      await signInPage(app);
      await app.buyer.sendCode();
      const sent = demo.audience.mail.get(MIA.email);
      if (sent === undefined) return;
      // Twenty minutes on, the link no longer opens.
      moveTo(app, demo, sent.until + 60_000);
      await app.buyer.openSignInLink(sent.token);
      return;
    }
    case "mail-down":
    case "too-many": {
      await signInPage(app);
      demo.audience.failNext = id;
      say(app, id === "mail-down" ? "demo.toast.mail-down" : "demo.toast.too-many", {}, id === "mail-down" ? "cloud-off" : "octagon-alert");
      await app.buyer.sendCode();
      return;
    }
    case "check-fails": {
      await signInPage(app);
      demo.audience.failNext = "check";
      say(app, "demo.toast.check-fails", {}, "shield-alert");
      await app.buyer.sendCode();
      return;
    }
    case "signed-out": {
      if (!(await audience(app))) return;
      await signInMia(app, demo);
      demo.audience.endSession();
      say(app, "demo.toast.signed-out", {}, "monitor-off");
      app.goTickets();
      app.refresh("aud:me:");
      await until(app, () => app.state.scr === "signin");
      return;
    }

    // ── the box office ──
    case "waits-back": {
      // Two tickets of a Velvet order paying at the door cancelled by the box office: on a waitlist show they come back for it.
      app.setPersona("box");
      const box = boxOf(app);
      const velvet = w.all("events").find((e) => e["name"] === "Velvet Hour");
      if (velvet === undefined) return;
      const doorOrder = w.all("orders").find((o) => o["event_id"] === velvet.id && o["status"] === "door" && w.where("tickets", (t) => t["order_id"] === o.id && t["status"] === "valid").length >= 2);
      if (doorOrder !== undefined) {
        const ids = w.where("tickets", (t) => t["order_id"] === doorOrder.id && t["status"] === "valid").map((t) => t.id).slice(0, 2);
        const all = w.where("tickets", (t) => t["order_id"] === doorOrder.id && t["status"] === "valid").length === ids.length;
        await box.cancelTickets(doorOrder, ids, all, true);
      }
      box.go("waits", { wl: { ev: velvet.id } });
      return;
    }
    case "door-ok":
      return door(app, demo, (dayId) => demo.nextInQueue(dayId));
    case "door-in":
      return door(app, demo, (dayId) => w.where("check_ins", (c) => c["event_day_id"] === dayId).map((c) => String(w.get("tickets", c["ticket_id"] as Id)?.["code"] ?? ""))[0] ?? null);
    case "door-collect":
      return door(app, demo, (dayId) => {
        const day = w.get("event_days", dayId);
        const ins = new Set(w.where("check_ins", (c) => c["event_day_id"] === dayId).map((c) => c["ticket_id"]));
        const t = w.all("tickets").find((x) => x["event_id"] === day?.["event_id"] && x["order_status"] === "door" && x["status"] === "valid" && Number(x["due"]) - Number(x["collected"]) > 0 && !ins.has(x.id));
        return t === undefined ? null : String(t["code"]);
      });
    case "door-wrong":
      return door(app, demo, (dayId) => {
        const day = w.get("event_days", dayId);
        const t = w.all("tickets").find((x) => x["event_id"] !== day?.["event_id"] && x["order_status"] === "paid" && x["status"] === "valid" && w.get("events", x["event_id"] as Id)?.["name"] === "Velvet Hour");
        return t === undefined ? null : String(t["code"]);
      });
    case "door-day": {
      // The Weekender's Sunday: the one clock moves on to it, and a Saturday ticket is scanned.
      moveTo(app, demo, Date.parse("2026-08-30T19:10:00Z"));
      return door(app, demo, (dayId) => {
        const day = w.get("event_days", dayId);
        const t = w.all("tickets").find((x) => x["event_id"] === day?.["event_id"] && x["order_status"] === "paid" && x["status"] === "valid" && x["admits_day1"] === true && x["admits_day2"] !== true);
        return t === undefined ? null : String(t["code"]);
      });
    }
    default:
      return;
  }
}
