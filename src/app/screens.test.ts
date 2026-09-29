/**
 * The audience's screens read what the demo's Adminium answers, at the
 * pinned clock (Tue 28 Jul 2026, 16:30 at the venue): the figures the design
 * draws come out of the rows and rules, and a buyer's steps land where the
 * design says. Values only — the browser pass draws them.
 */
import { describe, expect, it, vi } from "vitest";

import { DemoAdminium } from "../demo/adminium.ts";
import { ApiError, type Id } from "../data/wire.ts";
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

describe("the bank details a transfer asks for", () => {
  it("fill the order page of a transfer still awaited, read through the order's own link", async () => {
    const { app, demo, v } = await open();
    const waiting = demo.world.all("orders").find((o) => o["status"] === "awaiting_transfer" && o["link_token"] !== null)!;
    await app.arrive("o", `#${String(waiting["link_token"])}`);
    const bank = ((await v())["gw"] as V)["bank"] as { k: string; v: string }[];
    const settings = demo.world.all("settings")[0]!;
    expect(bank.slice(0, 4).map((r) => r.v)).toEqual(["bank_account_name", "bank_name", "bank_account_number", "bank_routing"].map((c) => String(settings[c] ?? "")));
    expect(bank.find((r) => r.k === "Account number")!.v).not.toBe("");
  });

  it("fill the confirm page once the emailed link confirms the order", async () => {
    const { app, demo, v } = await open();
    const cinder = show(app, "Cinder");
    const reply = await demo.audience.buy({ values: { event_id: cinder.id, buyer_name: "Ana Ruiz", email: "ana.ruiz@example.com" }, tickets: [{ ticket_type_id: cinder.types[0]!.id }] }, "bank-confirm");
    await demo.audience.choose("confirming");
    await app.arrive("confirm", `#${String(demo.world.get("orders", reply.data.id)!["confirm_token"])}`);
    await v();
    await app.buyer.confirmByEmail();
    const cf = (await v())["cf"] as V;
    expect(cf["doneOn"]).toBe(true);
    expect((cf["bank"] as { k: string; v: string }[]).find((r) => r.k === "Account number")!.v).toBe(String(demo.world.all("settings")[0]!["bank_account_number"]));
  });
});

describe("a ticket its buyer sent on, once the friend accepted it", () => {
  it("reads 'Sent to Kai Renner' on the order page, and its menu offers no cancel", async () => {
    const { app, demo, v } = await open();
    const mia = demo.world.all("orders").find((o) => o["number"] === "WV-S8761")!;
    await app.arrive("o", `#${String(mia["link_token"])}`);
    const ana = demo.world.all("tickets").find((t) => t["code"] === "P4MA-7VKE")!;
    await demo.audience.sendTicket(ana.id, "kai.renner@example.com", "Kai Renner");
    await demo.audience.acceptTicket(String(demo.world.get("tickets", ana.id)!["link_token"]), "Kai Renner");
    app.refresh("aud:");
    await v();
    const read = app.buyer.going()!.tickets.find((t) => t.id === ana.id)!;
    expect("holder_customer_id" in read).toBe(false);
    const tile = (((await v())["gw"] as V)["tickets"] as V[]).find((t) => t["holder"] === "Kai Renner")!;
    expect([tile["codeOn"], bidi(tile["waitTxt"])]).toEqual([false, "Sent to Kai Renner"]);
    app.openSheet("tMenu", { ticket: ana.id });
    const labels = ((((await v())["sh"] as V)["list"] as V[]) ?? []).map((i) => i["label"]);
    expect(labels).not.toContain("Cancel this ticket");
  });
});

describe("a pay-at-the-door ticket's menu", () => {
  it("offers a cancel before the door takes its money, and none after", async () => {
    const { app, demo, v } = await open();
    const mia = demo.world.all("orders").find((o) => o["number"] === "WV-S8761")!;
    await app.arrive("o", `#${String(mia["link_token"])}`);
    await v();
    const ticket = demo.world.all("tickets").find((t) => t["code"] === "H3TW-9CXR")!;
    const menu = async () => {
      app.openSheet("tMenu", { ticket: ticket.id });
      return ((((await v())["sh"] as V)["list"] as V[]) ?? []).map((i) => i["label"]);
    };
    expect(await menu()).toContain("Cancel this ticket");
    demo.advanceTo(Date.parse("2026-07-28T19:35:00-04:00"));
    await demo.door.collect(ticket.id, "card", null);
    app.refresh("aud:");
    expect(await menu()).not.toContain("Cancel this ticket");
  });
});

describe("one person after another on the same tab", () => {
  it("never shows the last person's tickets to the next, even when the next one's read fails", async () => {
    const { app, demo, v } = await open();
    const signIn = async (email: string) => {
      app.setState({ si: { ...app.state.si, email } });
      await demo.audience.signIn(email);
      app.setState({ si: { ...app.state.si, digits: demo.audience.mail.get(email)!.code.split("") } });
      await app.buyer.verify();
      await v();
    };
    await signIn("mia.okada@example.com");
    const mias = app.buyer.mine()!.orders.map((o) => o.order.id);
    expect(mias.length).toBeGreaterThan(0);
    await app.buyer.signOut();
    // The next person's orders never come: nothing of Mia's is on screen meanwhile, nor after.
    demo.audience.myOrders = () => Promise.reject(new Error("offline"));
    await signIn("kai.renner@example.com");
    const shown = app.buyer.mine()?.orders.map((o) => o.order.id) ?? [];
    expect(shown.filter((id) => mias.includes(id))).toEqual([]);
    expect([app.state.going, app.state.dm, app.state.co]).toEqual([null, null, null]);
  });
});

describe("signing out on every device", () => {
  it("signs this device out and says so when Adminium did not take it", async () => {
    const { app, demo, v } = await open();
    app.setState({ si: { ...app.state.si, email: "mia.okada@example.com" } });
    await demo.audience.signIn("mia.okada@example.com");
    app.setState({ si: { ...app.state.si, digits: demo.audience.mail.get("mia.okada@example.com")!.code.split("") } });
    await app.buyer.verify();
    await v();
    demo.audience.signOutEverywhere = () => Promise.reject(new Error("offline"));
    await app.buyer.signOutEverywhere();
    expect([app.buyer.signedIn(), app.state.scr, app.state.toast?.msg]).toEqual([null, "signin", "Signed out here. We couldn't sign you out on your other devices — sign in and try again."]);
  });
});

describe("the confirm email's Send it again", () => {
  /** A Cinder checkout by transfer, on the "One more step" screen. */
  async function waiting() {
    const o = await open();
    const { app, v } = o;
    const cinder = show(app, "Cinder");
    app.setState({ sel: { [`${String(cinder.id)}:${String(cinder.types[0]!.id)}`]: 1 } });
    app.startCheckout(cinder);
    app.buyer.setCoField({ check: "ok" });
    app.buyer.setBuyer({ name: "Ana Ruiz", email: "ana.ruiz@example.com" });
    await app.buyer.hold();
    app.buyer.setTicket(0, { name: "Ana Ruiz" });
    app.buyer.setCoField({ pay: "transfer" });
    await app.buyer.confirm();
    const co = async () => (await v())["co"] as V;
    return { ...o, co, id: app.state.co!.orderId! };
  }
  const contact = (demo: DemoAdminium) => String(demo.world.all("settings")[0]!["contact_email"]);

  it("sends it again, says the old link no longer works, then waits out the minute", async () => {
    const { app, demo, co, id } = await waiting();
    let c = await co();
    expect([app.state.co?.phase, c["mailOn"], c["againOn"], c["againOff"], c["againTxt"], c["againSayOn"]]).toEqual(["mail", true, true, false, "Send it again", false]);
    const before = demo.world.get("orders", id)!["confirm_token"];
    await app.buyer.sendAgain();
    c = await co();
    expect(demo.world.get("orders", id)!["confirm_token"]).not.toBe(before);
    expect([c["againSay"], c["againWarn"], c["againOff"], c["againTxt"], app.state.toast?.msg]).toEqual([
      "Sent again to a•••@example.com. The link in the earlier email no longer works — use the new one.",
      false,
      true,
      "Send it again in 1:00",
      "Sent again to a•••@example.com",
    ]);
    // Within the minute the button waits: nothing is asked.
    const mails = () => demo.world.all("messages").filter((m) => m["kind"] === "transfer-confirm" && m["order_id"] === id).length;
    await app.buyer.sendAgain();
    expect(mails()).toBe(2);
    demo.advance(1);
    c = await co();
    expect([c["againOff"], c["againTxt"]]).toEqual([false, "Send it again"]);
  });

  it("says when today's are spent, and hides the button", async () => {
    const { app, demo, co } = await waiting();
    for (let i = 0; i < 5; i += 1) {
      await app.buyer.sendAgain();
      demo.advance(1);
    }
    await app.buyer.sendAgain();
    const c = await co();
    expect([c["againOn"], c["againWarn"], c["againSay"]]).toEqual([false, true, `That's as many times as we can send it today. Use the newest email, or write to ${contact(demo)}.`]);
    expect(app.state.co?.phase).toBe("mail");
  });

  it("says it can't send one now, and keeps the button", async () => {
    const { app, demo, co } = await waiting();
    demo.audience.failNext = "mail-down";
    await app.buyer.sendAgain();
    const c = await co();
    expect([c["againOn"], c["againOff"], c["againWarn"], c["againSay"]]).toEqual([true, false, true, `We can't send it again right now. Try again in a few minutes, or write to ${contact(demo)}.`]);
  });

  it("says to wait a minute when Adminium asks for one", async () => {
    const { app, demo, co } = await waiting();
    demo.audience.confirmAgain = () => Promise.reject(new ApiError(429, "PUBLIC_RATE_LIMITED"));
    await app.buyer.sendAgain();
    const c = await co();
    expect([c["againSay"], c["againOff"], c["againTxt"]]).toEqual(["Wait a minute, then send it again.", true, "Send it again in 1:00"]);
  });

  it("moves on to the order when it was confirmed from the email meanwhile", async () => {
    const { app, demo, id } = await waiting();
    await demo.audience.confirmTransfer(String(demo.world.get("orders", id)!["confirm_token"]));
    await app.buyer.sendAgain();
    expect([app.state.scr, app.state.co]).toEqual(["going", null]);
  });
});

describe("a name Adminium refuses at checkout", () => {
  it("is said on the name field for a guest", async () => {
    const { app, v } = await open();
    const neon = show(app, "Neon Circuit");
    app.setState({ sel: { [`${String(neon.id)}:${String(neon.types.find((t) => t.name === "Standard")!.id)}`]: 1 } });
    app.startCheckout(neon);
    app.buyer.setCoField({ check: "ok" });
    app.buyer.setBuyer({ name: "Lee at leetan.com", email: "lee.tan@example.com" });
    await app.buyer.hold();
    const c = (await v())["co"] as V;
    expect([app.state.co?.phase, c["eNameOn"], c["eName"], c["failOn"]]).toEqual(["details", true, "Write the name in letters only — no numbers, web or email address.", false]);
    app.buyer.setBuyer({ name: "Lee Tan" });
    await app.buyer.hold();
    expect(app.state.co?.phase).toBe("held");
  });

  it("shows the name field, signed in, when the account's name is refused, and takes the name typed there", async () => {
    const { app, demo, v } = await open();
    demo.world.all("customers").find((c) => c["email"] === "mia.okada@example.com")!["name"] = "Mia okada.com";
    app.setState({ si: { ...app.state.si, email: "mia.okada@example.com" } });
    await demo.audience.signIn("mia.okada@example.com");
    app.setState({ si: { ...app.state.si, digits: demo.audience.mail.get("mia.okada@example.com")!.code.split("") } });
    await app.buyer.verify();
    await v();
    const cinder = show(app, "Cinder");
    app.setState({ sel: { [`${String(cinder.id)}:${String(cinder.types[0]!.id)}`]: 1 } });
    app.startCheckout(cinder);
    await vi.waitFor(() => expect(app.state.co?.errs["name"]).toBeTruthy());
    let c = (await v())["co"] as V;
    expect([c["locked"], c["nameAskOn"], c["bName"], c["eName"]]).toEqual([true, true, "Mia okada.com", "Write the name in letters only — no numbers, web or email address."]);
    app.buyer.setBuyer({ name: "" });
    await app.buyer.hold();
    expect(app.state.co?.errs["name"]).toBe("Add your name");
    app.buyer.setBuyer({ name: "Mia Okada" });
    await app.buyer.hold();
    c = (await v())["co"] as V;
    expect([app.state.co?.phase, c["nameAskOn"]]).toEqual(["held", true]);
    expect(demo.world.get("orders", app.state.co!.orderId!)!["buyer_name"]).toBe("Mia Okada");
  });

  it("is said on the ticket's own name field at confirm", async () => {
    const { app, v } = await open();
    const neon = show(app, "Neon Circuit");
    app.setState({ sel: { [`${String(neon.id)}:${String(neon.types.find((t) => t.name === "Standard")!.id)}`]: 1 } });
    app.startCheckout(neon);
    app.buyer.setCoField({ check: "ok" });
    app.buyer.setBuyer({ name: "Lee Tan", email: "lee.tan@example.com" });
    await app.buyer.hold();
    app.buyer.setTicket(0, { name: "Tickets at resale.shop" });
    await app.buyer.confirm();
    const t = (((await v())["co"] as V)["tix"] as V[])[0]!;
    expect([app.state.co?.phase, t["errOn"], t["err"]]).toEqual(["held", true, "Write the name in letters only — no numbers, web or email address."]);
  });
});
