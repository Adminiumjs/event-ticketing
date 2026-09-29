/**
 * The audience's screens read what the demo's Adminium answers, at the
 * pinned clock (Tue 28 Jul 2026, 16:30 at the venue): the figures the design
 * draws come out of the rows and rules, and a buyer's steps land where the
 * design says. Values only — the browser pass draws them.
 */
import { describe, expect, it } from "vitest";

import { DemoAdminium } from "../demo/adminium.ts";
import type { Id } from "../data/wire.ts";
import { renderVals } from "./vals/base.ts";
import { WaveApp } from "./wave.ts";

type V = Record<string, unknown>;
const bidi = (s: unknown) => String(s).replace(/[⁦-⁩]/g, "");

async function open(): Promise<{ app: WaveApp; demo: DemoAdminium; v: () => Promise<V> }> {
  const demo = new DemoAdminium();
  const app = new WaveApp({ audience: demo.audience, boxOffice: demo.boxOffice, door: demo.door }, "audience", { lang: "en-US", theme: "dark" });
  app.demo = { onClock: (fn) => demo.onClock(fn) };
  await app.start({ timers: false });
  const v = async () => {
    // Each render may ask more (a show's counts, a quote): answer until nothing is pending.
    for (let i = 0; i < 5; i += 1) {
      renderVals(app);
      await app.idle();
    }
    return renderVals(app);
  };
  await v();
  return { app, demo, v };
}
const show = (app: WaveApp, name: string) => app.world()!.shows.find((s) => s.name === name)!;

describe("What's on at 16:30", () => {
  it("opens on tonight's Neon Circuit with Adminium's counts", async () => {
    const { v } = await open();
    const hero = (await v())["hero"] as V;
    expect([hero["name"], hero["eyebrow"], bidi(hero["doorsIn"]), bidi(hero["when"])]).toEqual(["Neon Circuit", "Tonight", "Doors in 3 h 30 m", "Tue 28 Jul · Doors 20:00 · on stage 20:30"]);
    expect((hero["avail"] as V[]).map((a) => `${String(a["name"])}: ${String(a["txt"])}`)).toEqual(["Standard: 14 left", "Balcony: 9 left", "Early entry: sold out"]);
  });

  it("lists this week and coming up with the design's chips", async () => {
    const { v } = await open();
    const out = await v();
    const row = (list: string) => (out[list] as V[]).map((c) => `${String(c["name"])} | ${bidi(c["status"])} | ${bidi(c["price"])}`);
    expect(row("week")).toEqual(["Velvet Hour | Sold out — join the waitlist | from $20.00", "Dust Parade | Cancelled | "]);
    expect(row("coming")).toContain("Hollow Tide | Postponed from Sat 15 Aug | from $30.00");
    expect(row("coming")).toContain("First Listen: Hollow Tide's new record | Just register | No charge");
    expect((out["soon"] as V[]).map((c) => `${String(c["name"])} ${bidi(c["countdown"])} ${bidi(c["status"])}`)).toEqual([
      "Static Bloom in 3 d 17 h On sale Sat 1 Aug 10:00",
      "Pale Harbour: stories after dark in 9 d 17 h On sale Fri 7 Aug 10:00",
    ]);
    expect(bidi(out["weekRange"])).toBe("Tue 28 Jul – Mon 3 Aug");
  });
});

describe("arriving at an address", () => {
  it("reads the path under the site: the site's own base names no show", async () => {
    const { app, v } = await open();
    // Hosted, the base is `/apps/events/customer/`: the app's key says `events` too.
    await app.arrive("", "");
    expect(app.state.scr).toBe("home");
    await app.arrive("events/neon-circuit", "");
    expect(((await v())["scr"] as V)["event"]).toBe(true);
    await app.arrive("events/nobody-plays-here", "");
    expect(((await v())["scr"] as V)["404"]).toBe(true);
  });
});

describe("a show's page and its ticket panel", () => {
  it("prices two Standard on Neon Circuit by Adminium's dry run", async () => {
    const { app, v } = await open();
    const neon = show(app, "Neon Circuit");
    app.openShow(neon.id);
    const std = neon.types.find((t) => t.name === "Standard")!;
    app.setState({ sel: { [`${String(neon.id)}:${String(std.id)}`]: 2 } });
    const pn = (await v())["pn"] as V;
    expect([bidi(pn["leftTxt"]), bidi(pn["total"]), bidi(pn["contLabel"])]).toEqual(["23 left", "$56.00", "Continue — 2 tickets · $56.00"]);
  });

  it("unlocks the presale on Static Bloom, not on sale for another 1 d 17 h", async () => {
    const { app, v } = await open();
    const bloom = show(app, "Static Bloom");
    app.openShow(bloom.id);
    app.setState({ codeIn: "bloomearly" });
    await app.applyCode(bloom);
    const rows = ((await v())["pn"] as V)["rows"] as V[];
    expect(bidi(rows[0]!["note"])).toBe("Unlocked with BLOOMEARLY · On sale Thu 30 Jul 10:00 · in 1 d 17 h");
    expect(rows[0]!["remindOn"]).toBe(true);
  });

  it("takes 10 % off two Home Studio places with STUDENT10: $81.00", async () => {
    const { app, v } = await open();
    const studio = show(app, "Home Studio Basics");
    app.openShow(studio.id);
    app.setState({ sel: { [`${String(studio.id)}:${String(studio.types[0]!.id)}`]: 2 }, codeIn: "STUDENT10" });
    await app.applyCode(studio);
    const pn = (await v())["pn"] as V;
    expect([pn["discTxt"], bidi(pn["total"])]).toEqual(["10 % off with STUDENT10", "$81.00"]);
  });

  it("says a sold-out Velvet Hour sends seats back to the waitlist, and offers to join it", async () => {
    const { app, v } = await open();
    app.openShow(show(app, "Velvet Hour").id);
    const pn = (await v())["pn"] as V;
    expect([pn["banner"], pn["waitOn"], pn["leftTxt"]]).toEqual(["Sold out. Seats that come back go to the waitlist first.", true, "none left"]);
  });
});

describe("checkout", () => {
  it("holds two Neon Standard as WV-8816 for ten minutes, then confirms them at the door", async () => {
    const { app, demo, v } = await open();
    const neon = show(app, "Neon Circuit");
    const std = neon.types.find((t) => t.name === "Standard")!;
    app.openShow(neon.id);
    app.setState({ sel: { [`${String(neon.id)}:${String(std.id)}`]: 2 } });
    app.startCheckout(neon);
    app.buyer.setCoField({ check: "ok" });
    app.buyer.setBuyer({ name: "Lee Tan", email: "lee.tan@example.com" });
    await app.buyer.hold();
    const co = app.state.co!;
    expect([co.phase, co.order?.["number"], new Date(co.heldUntil!).toISOString()]).toEqual(["held", "WV-8816", "2026-07-28T20:40:00.000Z"]);
    app.buyer.setTicket(0, { name: "Lee Tan" });
    app.buyer.setTicket(1, { name: "Sam Idris" });
    await app.buyer.confirm();
    const gw = (await v())["gw"] as V;
    expect([app.state.scr, gw["heading"], bidi(gw["doorTxt"])]).toEqual(["going", "You're going!", "Pay $56.00 at the door"]);
    expect(demo.world.all("orders").find((o) => o["number"] === "WV-8816")!["status"]).toBe("door");
  });

  it("lets the hold go when the demo's clock passes its end", async () => {
    const { app, demo } = await open();
    const neon = show(app, "Neon Circuit");
    const std = neon.types.find((t) => t.name === "Standard")!;
    app.setState({ sel: { [`${String(neon.id)}:${String(std.id)}`]: 1 } });
    app.startCheckout(neon);
    app.buyer.setCoField({ check: "ok" });
    app.buyer.setBuyer({ name: "Lee Tan", email: "lee.tan@example.com" });
    await app.buyer.hold();
    demo.advance(11);
    expect([app.state.co?.phase, app.state.sheet?.kind]).toEqual(["gone", "holdGone"]);
  });
});

describe("signed in as Mia", () => {
  async function asMia() {
    const o = await open();
    o.app.setState({ si: { ...o.app.state.si, email: "mia.okada@example.com" } });
    await o.demo.audience.signIn("mia.okada@example.com");
    const code = o.demo.audience.mail.get("mia.okada@example.com")!.code;
    o.app.setState({ si: { ...o.app.state.si, digits: code.split("") } });
    await o.app.buyer.verify();
    return o;
  }

  it("lists her tickets with the waitlist offer and the moved show", async () => {
    const { v } = await asMia();
    const mt = (await v())["mt"] as V;
    expect(((mt["notices"] as V[])[0]!["head"] as string).replace(/[⁦-⁩]/g, "")).toBe("Hollow Tide has moved to Fri 11 Sep.");
    const offer = (mt["groups"] as V[]).find((g) => g["isOffer"] === true)!;
    expect([offer["offerTxt"], bidi(offer["offerLeft"])]).toEqual(["2 tickets for Velvet Hour are yours if you want them", "Claim within 11 h 42 m"]);
  });

  it("claims one of her two Velvet places: WV-S8814 at the door for $20.00", async () => {
    const { app, demo, v } = await asMia();
    const order = demo.world.all("orders").find((o) => o["number"] === "WV-S8814")!;
    app.openOffer(order.id as Id);
    await v();
    app.buyer.claim(app.buyer.going()!, 1);
    app.buyer.setTicket(0, { name: "Mia Okada" });
    await app.buyer.confirm();
    const row = demo.world.get("orders", order.id as Id)!;
    expect([row["status"], row["total"]]).toEqual(["door", 20]);
  });
});
