/**
 * Paying online from the audience's checkout, against the demo's Adminium at
 * the pinned clock (Tue 28 Jul 2026, 16:30): "Pay now" first among the ways
 * to pay when the venue takes payments online, and the screens as they always
 * were when it does not; the order paying online keeps its hold, is paid when
 * the money lands (its tickets email goes out), and lets its places go at the
 * hold's end when it does not; back from the pay page with nothing paid, the
 * hold runs on and the buyer may try again or choose another way.
 */
import { afterEach, describe, expect, it } from "vitest";

import { DemoAdminium } from "../demo/adminium.ts";
import type { AudiencePort } from "../data/ports.ts";
import type { Id, Row } from "../data/wire.ts";
import { renderVals } from "./vals/base.ts";
import { WaveApp } from "./wave.ts";

afterEach(() => new Promise<void>((done) => setTimeout(done, 0)));

type V = Record<string, unknown>;
const bidi = (s: unknown) => String(s).replace(/[⁦-⁩]/g, "");

/** The demo's pay page, kept aside from a door that no longer plays it in place: the money landing while the buyer is away. */
const landing = new WeakMap<AudiencePort, () => Promise<Row>>();

/** The demo's audience door, as a real one would be: it sends the buyer to a pay link instead of paying in place. */
function linkOnly(port: AudiencePort, online = true): AudiencePort {
  const pay = port.payInPlace!.bind(port);
  landing.set(port, () => pay());
  Object.defineProperty(port, "payInPlace", { value: undefined, configurable: true });
  port.payments = async () => ({ online, test: false });
  port.payLink = async () => "https://pay.example/p/one";
  return port;
}

async function open(audience?: (demo: DemoAdminium) => AudiencePort) {
  const demo = new DemoAdminium();
  const app = new WaveApp({ audience: audience?.(demo) ?? demo.audience, boxOffice: demo.boxOffice, door: demo.door }, "audience", { lang: "en-US", theme: "dark" });
  app.demo = { onClock: (fn) => demo.onClock(fn) };
  await app.start({ timers: false });
  const v = async () => {
    for (let i = 0; i < 5; i += 1) {
      renderVals(app);
      await app.idle();
    }
    return renderVals(app);
  };
  await v();
  return { app, demo, v };
}

/** Two Standard for Cinder held as Lee Tan, the names written: the checkout at "How you'll pay". */
async function heldCinder(o: Awaited<ReturnType<typeof open>>) {
  const { app, v } = o;
  const cinder = app.world()!.shows.find((s) => s.name === "Cinder")!;
  const std = cinder.types.find((t) => t.name === "Standard")!;
  app.setState({ sel: { [`${String(cinder.id)}:${String(std.id)}`]: 2 } });
  app.startCheckout(cinder);
  await v();
  app.buyer.setCoField({ check: "ok" });
  app.buyer.setBuyer({ name: "Lee Tan", email: "lee.tan@example.com" });
  await app.buyer.hold();
  app.buyer.setTicket(0, { name: "Lee Tan" });
  app.buyer.setTicket(1, { name: "Sam Idris" });
  await v();
  return { cinder, orderId: app.state.co!.orderId! };
}

describe("the checkout's ways to pay", () => {
  it("puts Pay now first when the venue takes payments online, chosen, and its button says the amount", async () => {
    const o = await open();
    await heldCinder(o);
    const co = (await o.v())["co"] as V;
    expect((co["pays"] as V[]).map((p) => p["title"])).toEqual(["Pay now", "Pay at the door", "Pay by bank transfer"]);
    expect((co["pays"] as V[])[0]!["desc"]).toBe("You'll pay on the Stripe or PayPal page.");
    expect([o.app.state.co!.pay, bidi(co["cta"]), co["ctaNow"]]).toEqual(["now", "Pay now · $48.00", true]);
  }, 30_000);

  it("reads as it always has while the venue takes no payments online", async () => {
    const o = await open((demo) => linkOnly(demo.audience, false));
    await heldCinder(o);
    const co = (await o.v())["co"] as V;
    expect((co["pays"] as V[]).map((p) => p["title"])).toEqual(["Pay at the door", "Pay by bank transfer"]);
    expect([bidi(co["cta"]), co["ctaNow"], co["testOn"]]).toEqual(["Confirm — 2 tickets, pay at the door", false, false]);
  }, 30_000);
});

describe("Pay now on the demo", () => {
  it("hands off, then the order is paid online: its payment row, its tickets email and its own page", async () => {
    const o = await open();
    const { orderId } = await heldCinder(o);
    await o.app.buyer.confirm();
    const order = o.demo.world.get("orders", orderId)!;
    expect([order["status"], order["paid_method"], order["online_in"], order["balance"]]).toEqual(["paid", "online", 48, 0]);
    const pay = o.demo.world.where("payments", (p) => p["order_id"] === orderId);
    expect(pay.map((p) => [p["method"], p["amount"]])).toEqual([["online", 48]]);
    expect(o.demo.world.where("messages", (m) => m["order_id"] === orderId && String(m["kind"]).startsWith("tickets")).map((m) => m["kind"])).toEqual(["tickets-online"]);
    const gw = (await o.v())["gw"] as V;
    expect([o.app.state.scr, gw["heading"], gw["sub"], gw["paidHow"]]).toEqual(["going", "You're going!", "Your tickets are in your email.", "Paid online"]);
  }, 30_000);

  it("keeps the checkout's own hold while paying, and lets the places go at its end", async () => {
    const o = await open((demo) => linkOnly(demo.audience));
    const { orderId } = await heldCinder(o);
    const held = o.demo.world.get("orders", orderId)!["held_until"];
    await o.demo.audience.choose("paying");
    expect([o.demo.world.get("orders", orderId)!["status"], o.demo.world.get("orders", orderId)!["held_until"]]).toEqual(["paying", held]);
    o.demo.advance(11);
    expect(o.demo.world.get("orders", orderId)!["status"]).toBe("expired");
  }, 30_000);
});

describe("back from the pay page", () => {
  it("says the payment did not finish while the order is still paying, and keeps the hold", async () => {
    const o = await open((demo) => linkOnly(demo.audience));
    const { orderId } = await heldCinder(o);
    const assigned: string[] = [];
    (globalThis as { window?: unknown }).window = { location: { assign: (u: string) => assigned.push(u) } };
    const kept = new Map<string, string>();
    (globalThis as { sessionStorage?: unknown }).sessionStorage = { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, x: string) => void kept.set(k, x), removeItem: (k: string) => void kept.delete(k) };
    try {
      await o.app.buyer.confirm();
      expect([assigned, o.app.state.co!.payStep, o.demo.world.get("orders", orderId)!["status"]]).toEqual([["https://pay.example/p/one"], "taking", "paying"]);
      // The pay page sends the buyer back to `/o`: the same order, still paying, and nothing taken.
      o.app.setState({ co: null, scr: "home" });
      const back = o.app.buyer.returnFromPay();
      o.demo.advance(1);
      await back;
      const co = (await o.v())["co"] as V;
      expect([o.app.state.scr, o.app.state.co!.payStep, co["unfinishedTxt"], co["unfinishedSub"]]).toEqual([
        "checkout",
        "unfinished",
        "The payment didn't finish. Nothing was taken.",
        "Your tickets are still held. Try again, or choose another way to pay.",
      ]);
      // Another way to pay, from the order still paying: at the door.
      o.app.buyer.setCoField({ pay: "door" });
      await o.app.buyer.confirm();
      expect(o.demo.world.get("orders", orderId)!["status"]).toBe("door");
    } finally {
      delete (globalThis as { window?: unknown }).window;
      delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
    }
  }, 30_000);

  it("opens the paid order when the money came while the buyer was away", async () => {
    const o = await open((demo) => linkOnly(demo.audience));
    const { orderId } = await heldCinder(o);
    const kept = new Map<string, string>();
    (globalThis as { window?: unknown }).window = { location: { assign: () => undefined } };
    (globalThis as { sessionStorage?: unknown }).sessionStorage = { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, x: string) => void kept.set(k, x), removeItem: (k: string) => void kept.delete(k) };
    try {
      await o.app.buyer.confirm();
      await landing.get(o.demo.audience)!();
      await o.app.buyer.returnFromPay();
      const gw = (await o.v())["gw"] as V;
      expect([o.app.state.scr, gw["paidHow"], kept.size]).toEqual(["going", "Paid online", 0]);
      expect(o.demo.world.get("orders", orderId)!["status"]).toBe("paid");
    } finally {
      delete (globalThis as { window?: unknown }).window;
      delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
    }
  }, 30_000);
});

describe("back from the pay page, by where Adminium says the payment stands", () => {
  /** The checkout paying online, the buyer away at the pay page, the tab's mark kept: then back, with `state` said. */
  async function away(state: "open" | "confirming" | "failed" | "expired", advance = 0) {
    const o = await open((demo) => linkOnly(demo.audience));
    const { orderId } = await heldCinder(o);
    const kept = new Map<string, string>();
    (globalThis as { window?: unknown }).window = { location: { assign: () => undefined } };
    (globalThis as { sessionStorage?: unknown }).sessionStorage = { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, x: string) => void kept.set(k, x), removeItem: (k: string) => void kept.delete(k) };
    const asked: string[] = [];
    o.demo.audience.payState = async () => {
      asked.push(state);
      return { state, test: false };
    };
    await o.app.buyer.confirm();
    if (advance > 0) o.demo.advance(advance);
    o.app.setState({ co: null, scr: "home" });
    return { ...o, orderId, asked, done: () => {
      delete (globalThis as { window?: unknown }).window;
      delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
    } };
  }

  it("says a bank is confirming it, and offers no second payment", async () => {
    const o = await away("confirming");
    try {
      await o.app.buyer.returnFromPay();
      const co = (await o.v())["co"] as V;
      expect([o.app.state.co!.payStep, co["confirmingTxt"], co["unfinishedOn"]]).toEqual(["confirming", "Your bank is confirming the payment", false]);
      expect(o.demo.world.get("orders", o.orderId)!["status"]).toBe("paying");
    } finally {
      o.done();
    }
  }, 30_000);

  it("says it did not finish when the service says so, at once, and the hold runs on", async () => {
    const o = await away("failed");
    try {
      await o.app.buyer.returnFromPay();
      expect([o.app.state.co!.payStep, o.asked.length, o.app.state.co!.phase]).toEqual(["unfinished", 1, "held"]);
    } finally {
      o.done();
    }
  }, 30_000);

  it("says the tickets went back on sale when the clock let the order go while the buyer was away", async () => {
    const o = await away("expired", 11);
    try {
      await o.app.buyer.returnFromPay();
      const co = (await o.v())["co"] as V;
      expect([o.demo.world.get("orders", o.orderId)!["status"], o.app.state.co!.phase, co["gonePay"], co["gonePayTxt"]]).toEqual([
        "expired",
        "gone",
        true,
        "Your tickets went back on sale because the payment didn't finish in time. Nothing was taken.",
      ]);
      expect(o.asked).toEqual([]);
    } finally {
      o.done();
    }
  }, 30_000);
});

describe("a waitlist offer paid online", () => {
  it("claims Mia's two Velvet places with Pay now: paid, and the waitlist place claimed", async () => {
    const o = await open();
    await o.demo.audience.signIn("mia.okada@example.com");
    o.app.setState({ si: { ...o.app.state.si, email: "mia.okada@example.com", digits: o.demo.audience.mail.get("mia.okada@example.com")!.code.split("") } });
    await o.app.buyer.verify();
    const order = o.demo.world.all("orders").find((r) => r["number"] === "WV-S8814")!;
    o.app.openOffer(order.id as Id);
    await o.v();
    o.app.buyer.claim(o.app.buyer.going()!, 2);
    await o.v();
    expect(o.app.state.co!.pay).toBe("now");
    o.app.buyer.setTicket(0, { name: "Mia Okada" });
    o.app.buyer.setTicket(1, { name: "Ana Ruiz" });
    await o.app.buyer.confirm();
    const row = o.demo.world.get("orders", order.id as Id)! as Row;
    expect([row["status"], row["online_in"]]).toEqual(["paid", 40]);
    expect(o.demo.world.get("waitlist", row["waitlist_id"] as Id)!["status"]).toBe("claimed");
  }, 30_000);
});

describe("a show cancelled after its buyer paid online", () => {
  it("gives the money back by itself when a manager cancels, and the order page says where it goes", async () => {
    const o = await open();
    const { orderId, cinder } = await heldCinder(o);
    await o.app.buyer.confirm();
    await o.demo.boxOffice.update("orders", orderId, { status: "cancelled", cancel_cause: "show" });
    const refunds = o.demo.world.where("refunds", (r) => r["order_id"] === orderId);
    expect(refunds.map((r) => [r["method"], r["amount"], r["refund_state"]])).toEqual([["online", 48, "done"]]);
    // "Refund sent" once, when it is done; never "Refund recorded" for money sent back online. The order's own
    // cancellation email is the one for an order paid online.
    expect(o.demo.world.where("messages", (m) => m["refund_id"] === refunds[0]!.id).map((m) => m["kind"])).toEqual(["refund-sent"]);
    expect(o.demo.world.where("messages", (m) => m["order_id"] === orderId && String(m["kind"]).startsWith("cancelled-")).map((m) => m["kind"])).toEqual(["cancelled-online"]);
    o.app.refresh("aud:");
    await o.app.arrive("o", `#${String(o.demo.world.get("orders", orderId)!["link_token"])}`);
    const gw = (await o.v())["gw"] as V;
    expect([gw["heading"], bidi(gw["sub"])]).toEqual([`${cinder.name} is cancelled`, "This show is cancelled. $48.00 goes back to the card or PayPal account you paid with."]);
  }, 30_000);
});
