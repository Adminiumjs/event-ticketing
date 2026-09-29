/**
 * The demo's Adminium plays the product's rules: what the box office, the
 * door and the audience site do in the demo is what Adminium would allow,
 * refuse and work out — every figure from the sample's rows, every refusal
 * with the server's code.
 */
import { describe, expect, it } from "vitest";

import { ApiError, type Id, type Row } from "../data/wire.ts";
import { DemoAdminium } from "./adminium.ts";

const at = (local: string) => Date.parse(`${local}:00-04:00`);
const T1630 = at("2026-07-28T16:30");

function refusal(run: () => unknown): { code: string; params: Record<string, unknown> } {
  try {
    run();
  } catch (error) {
    if (error instanceof ApiError) return { code: error.code, params: { ...error.params } };
    throw error;
  }
  throw new Error("the write went through");
}
async function refused(run: () => Promise<unknown>): Promise<{ code: string; params: Record<string, unknown> }> {
  try {
    await run();
  } catch (error) {
    if (error instanceof ApiError) return { code: error.code, params: { ...error.params } };
    throw error;
  }
  throw new Error("the write went through");
}

const byName = (demo: DemoAdminium, name: string) => demo.world.all("events").find((e) => e["name"] === name)!;
const typeOf = (demo: DemoAdminium, event: string, name: string) => demo.world.all("ticket_types").find((t) => t["event_id"] === byName(demo, event).id && t["name"] === name)!;
const order = (demo: DemoAdminium, number: string) => demo.world.all("orders").find((o) => o["number"] === number)!;
const ticketByCode = (demo: DemoAdminium, code: string) => demo.world.all("tickets").find((t) => t["code"] === code)!;
const dayOf = (demo: DemoAdminium, event: string, day = 1) => demo.world.all("event_days").find((d) => d["event_id"] === byName(demo, event).id && d["day"] === day)!;
const neonBody = (qty: number, extra: Record<string, unknown> = {}) => (demo: DemoAdminium) => ({
  values: { event_id: byName(demo, "Neon Circuit").id, buyer_name: "Lee Tan", email: "lee.tan@example.com", language: "en-US", ...extra },
  tickets: Array.from({ length: qty }, () => ({ ticket_type_id: typeOf(demo, "Neon Circuit", "Standard").id })),
});

describe("what is left, at 16:30", () => {
  it("says Neon Circuit's Standard 14 left and Balcony 9 left, and nothing for Quiet Engines", async () => {
    const demo = new DemoAdminium();
    const neon = await demo.audience.left(byName(demo, "Neon Circuit").id);
    const left = (name: string) => neon.find((t) => t.ticket_type_id === typeOf(demo, "Neon Circuit", name).id);
    expect(left("Standard")).toEqual({ ticket_type_id: typeOf(demo, "Neon Circuit", "Standard").id, state: "open", left: 14 });
    expect(left("Balcony — seated, unreserved")?.left).toBe(9);
    expect(left("Early entry")?.state).toBe("sold_out");
    const quiet = await demo.audience.left(byName(demo, "Quiet Engines").id);
    expect(quiet.every((t) => t.state === "open" && t.left === undefined)).toBe(true);
  });
});

describe("a checkout", () => {
  it("holds its places for ten minutes, for everyone, and lets them go on its own", async () => {
    const demo = new DemoAdminium();
    const reply = await demo.audience.buy(neonBody(2)(demo), "k1");
    expect([reply.data["number"], reply.data["status"], reply.data["total"]]).toEqual(["WV-8816", "held", 56]);
    expect(reply.link?.token).toMatch(/^[0-9A-Z]{16}$/);
    const standard = typeOf(demo, "Neon Circuit", "Standard").id;
    expect((await demo.audience.left(byName(demo, "Neon Circuit").id)).find((t) => t.ticket_type_id === standard)?.left).toBe(12);
    demo.advance(11);
    expect(order(demo, "WV-8816")["status"]).toBe("expired");
    // WV-8815's own three came back at 16:34 too.
    expect((await demo.audience.left(byName(demo, "Neon Circuit").id)).find((t) => t.ticket_type_id === standard)?.left).toBe(17);
  });

  it("lands a retry on the same order, and writes nothing when the price is not the one shown", async () => {
    const demo = new DemoAdminium();
    const first = await demo.audience.buy(neonBody(1)(demo), "same");
    const again = await demo.audience.buy(neonBody(1)(demo), "same");
    expect([again.data.id, again.replayed]).toEqual([first.data.id, true]);
    const moved = await refused(() => demo.audience.buy({ ...neonBody(1)(demo), expect: { total: 25 } }, "other"));
    expect(moved.code).toBe("PUBLIC_PRICE_CHANGED");
    expect(demo.world.all("orders").length).toBe(800);
  });

  it("goes to the door, and the tickets email is queued", async () => {
    const demo = new DemoAdminium();
    await demo.audience.buy(neonBody(2)(demo), "k2");
    const moved = await demo.audience.choose("door");
    expect(moved["status"]).toBe("door");
    expect(demo.world.all("messages").filter((m) => m["kind"] === "tickets" && m["order_id"] === moved.id).length).toBe(1);
  });

  it("chooses a transfer: ten fresh minutes to confirm by email, and only the emailed link moves it on", async () => {
    const demo = new DemoAdminium();
    demo.advance(21); // 16:51
    const cinder = byName(demo, "Cinder");
    const reply = await demo.audience.buy(
      { values: { event_id: cinder.id, buyer_name: "Ana Ruiz", email: "ana.ruiz@example.com" }, tickets: [0, 1].map(() => ({ ticket_type_id: typeOf(demo, "Cinder", "Standard").id })) },
      "k3",
    );
    demo.advance(9);
    const confirming = await demo.audience.choose("confirming");
    expect(confirming["status"]).toBe("confirming");
    expect(Date.parse(String(confirming["held_until"]))).toBe(demo.now + 10 * 60_000);
    expect(demo.world.all("messages").some((m) => m["kind"] === "transfer-confirm" && m["order_id"] === reply.data.id)).toBe(true);
    const waiting = await demo.audience.confirmTransfer(String(demo.world.get("orders", reply.data.id)!["confirm_token"]));
    expect(waiting["status"]).toBe("awaiting_transfer");
    expect(waiting["pay_by"]).toBe(new Date(at("2026-07-31T18:00")).toISOString());
  });
});

describe("no charge", () => {
  it("is refused on a priced order, and its tickets stay unpaid", async () => {
    const demo = new DemoAdminium();
    const reply = await demo.audience.buy(neonBody(4)(demo), "free-ride");
    expect(await refused(() => demo.audience.choose("no_charge"))).toMatchObject({ code: "STATE_MOVE_REFUSED", params: { requires: "total" } });
    expect(demo.world.get("orders", reply.data.id)!["status"]).toBe("held");
    expect(demo.world.where("tickets", (t) => t["order_id"] === reply.data.id).map((t) => t["settled"])).toEqual([0, 0, 0, 0]);
  });

  it("confirms a free show's places", async () => {
    const demo = new DemoAdminium();
    const listen = byName(demo, "First Listen: Hollow Tide's new record");
    await demo.audience.buy({ values: { event_id: listen.id, buyer_name: "Lee Tan", email: "lee.tan@example.com" }, tickets: [{ ticket_type_id: typeOf(demo, listen["name"] as string, "Register").id }] }, "free-show");
    expect((await demo.audience.choose("no_charge"))["status"]).toBe("no_charge");
  });
});

describe("codes", () => {
  it("gives CREW5's $5 off each Standard on a Main Hall show, nothing off a Balcony, and is unknown on The Annex", async () => {
    const demo = new DemoAdminium();
    const cinder = byName(demo, "Cinder");
    const std = typeOf(demo, "Cinder", "Standard").id;
    const bal = typeOf(demo, "Cinder", "Balcony — seated, unreserved").id;
    const quote = await demo.audience.quote({ values: { event_id: cinder.id, buyer_name: "A", email: "a@example.com", code_text: "crew5" }, tickets: [{ ticket_type_id: std }, { ticket_type_id: std }, { ticket_type_id: bal }] });
    expect([quote.data["subtotal"], quote.data["discount"], quote.data["total"]]).toEqual([78, 10, 68]);
    const low = byName(demo, "Low Ceiling: new material night");
    const miss = await refused(() => demo.audience.quote({ values: { event_id: low.id, buyer_name: "A", email: "a@example.com", code_text: "CREW5" }, tickets: [{ ticket_type_id: typeOf(demo, "Low Ceiling: new material night", "Standard").id }] }));
    expect(miss).toEqual({ code: "PUBLIC_WRITE_REFUSED", params: { column: "code_text", reason: "unknown" } });
  });
});

describe("the door, tonight", () => {
  it("lets in the 38 Early-entry scans of 19:31–19:58, each judged at its own time", async () => {
    const { LEDGER } = await import("../sample/ledger.ts");
    const demo = new DemoAdminium();
    demo.advanceTo(at("2026-07-28T19:58"));
    const day = dayOf(demo, "Neon Circuit").id;
    for (const scan of LEDGER.door_1958) {
      await demo.door.checkIn(ticketByCode(demo, scan.ticket).id, day, null, at(scan.at));
    }
    expect(demo.world.where("check_ins", (c) => c["event_day_id"] === day).length).toBe(38);
  });

  it("answers too early, wrong show, not paid yet and already in — and collects, then lets in", async () => {
    const demo = new DemoAdminium();
    const day = dayOf(demo, "Neon Circuit").id;
    const [mia, ana] = ["H3TW-9CXR", "P4MA-7VKE"].map((code) => ticketByCode(demo, code));
    demo.advanceTo(at("2026-07-28T19:29"));
    expect(await refused(() => demo.door.checkIn(mia!.id, day, null))).toMatchObject({ code: "STATE_MOVE_REFUSED", params: { create: true, requires: "linked" } });
    const paid = demo.world.all("tickets").find((t) => t["event_id"] === byName(demo, "Neon Circuit").id && t["order_status"] === "paid")!;
    expect(await refused(() => demo.door.checkIn(paid.id, day, null))).toMatchObject({ code: "STATE_MOVE_REFUSED", params: { requires: "time", bound: "after" } });
    demo.advanceTo(at("2026-07-28T20:05"));
    const cinderTicket = demo.world.all("tickets").find((t) => t["event_id"] === byName(demo, "Cinder").id && t["order_status"] === "paid")!;
    expect(await refused(() => demo.door.checkIn(cinderTicket.id, day, null))).toMatchObject({ code: "STATE_MOVE_REFUSED", params: { requires: "right_show" } });
    await demo.door.collect(mia!.id, "card", null);
    expect(order(demo, "WV-S8761")["status"]).toBe("door");
    await demo.door.checkIn(mia!.id, day, null);
    await demo.door.collect(ana!.id, "cash", null);
    expect([order(demo, "WV-S8761")["status"], order(demo, "WV-S8761")["balance"]]).toEqual(["paid", 0]);
    await demo.door.checkIn(ana!.id, day, null);
    expect(await refused(() => demo.door.checkIn(ana!.id, day, null))).toMatchObject({ code: "UNIQUE_VIOLATION" });
    expect(await refused(() => demo.door.collect(ana!.id, "card", null))).toMatchObject({ code: "CAPACITY_FULL" });
  });

  it("records no payment and marks nothing paid while money is owed", () => {
    const demo = new DemoAdminium();
    const writer = { origin: "staff" as const, name: "Sam", roles: ["door"] };
    expect(refusal(() => demo.engine.update("orders", order(demo, "WV-S8809").id, { status: "cancelled", cancel_cause: "show" }, writer))).toMatchObject({ code: "COLUMN_FORBIDDEN" });
    expect(refusal(() => demo.engine.update("orders", order(demo, "WV-S8809").id, { status: "paid" }, writer))).toMatchObject({ code: "STATE_MOVE_REFUSED", params: { requires: "balance" } });
  });
});

describe("the clock, a day on (Wednesday 16:30)", () => {
  it("releases the overdue transfers, lets the offer and the checkout go, and marks Neon's uncollected door orders", async () => {
    const demo = new DemoAdminium();
    demo.advanceTo(at("2026-07-29T16:30"));
    expect(["WV-S8793", "WV-S8795", "WV-S8797"].map((n) => order(demo, n)["status"])).toEqual(["released", "released", "released"]);
    expect([order(demo, "WV-S8814")["status"], order(demo, "WV-S8815")["status"], order(demo, "WV-S8761")["status"]]).toEqual(["expired", "expired", "not_collected"]);
    expect(demo.world.all("waitlist").find((w) => w["email"] === "mia.okada@example.com")!["status"]).toBe("missed");
    const cinder = await demo.boxOffice.counts(byName(demo, "Cinder").id);
    const left = (name: string) => cinder.find((p) => p.ticket_type_id === typeOf(demo, "Cinder", name).id)!.left;
    expect([left("Standard"), left("Balcony — seated, unreserved")]).toEqual([135, 50]);
  });

  it("offers the two places back strictly in joining order: Kai Renner 1, Ana Ruiz 1", async () => {
    const demo = new DemoAdminium();
    demo.advanceTo(at("2026-07-29T16:30"));
    const offers = await demo.boxOffice.offerWaitlist(byName(demo, "Velvet Hour").id);
    const sizes = offers.map((o: Row) => [o["email"], demo.world.where("tickets", (t) => t["order_id"] === o.id).length]);
    expect(sizes).toEqual([
      ["kai.renner@example.com", 1],
      ["ana.ruiz@example.com", 1],
    ]);
    expect(offers.every((o) => o["status"] === "offered")).toBe(true);
  });
});

describe("claiming part of a waitlist offer", () => {
  it("confirms Mia's WV-S8814 with one ticket at the door and gives the other place back to the waitlist", async () => {
    const demo = new DemoAdminium();
    const mia = order(demo, "WV-S8814");
    await demo.audience.openOrder(String(mia["link_token"]));
    const claimed = await demo.audience.choose("door", 1);
    expect([claimed["status"], claimed["total"]]).toEqual(["door", 20]);
    expect(demo.world.all("waitlist").find((w) => w["email"] === "mia.okada@example.com")!["status"]).toBe("claimed");
    const velvet = byName(demo, "Velvet Hour").id;
    const returned = demo.world.where("tickets", (t) => t["event_id"] === velvet && t["status"] === "returned").length;
    // Two places were owed to the waitlist; the claim sold one of them and handed its second ticket back.
    expect(returned).toBe(2);
    expect(demo.world.where("messages", (m) => m["kind"] === "tickets-cancelled" && m["order_id"] === mia.id).length).toBe(0);
  });
});

describe("the box office", () => {
  it("cannot give a fifth comp on Neon Circuit", async () => {
    const demo = new DemoAdminium();
    const comps = typeOf(demo, "Neon Circuit", "Comps").id;
    const body = { values: { event_id: byName(demo, "Neon Circuit").id, buyer_name: "The band" }, tickets: [{ ticket_type_id: comps }, { ticket_type_id: comps }] };
    expect(await refused(() => demo.boxOffice.newOrder(body, "s1"))).toMatchObject({ code: "CAPACITY_FULL" });
  });

  it("hands a cancelled Velvet ticket to the waitlist: still sold out for the public, back for the box office", async () => {
    const demo = new DemoAdminium();
    const velvet = byName(demo, "Velvet Hour").id;
    const ticket = demo.world.all("tickets").find((t) => t["event_id"] === velvet && t["order_status"] === "paid" && t["status"] === "valid")!;
    await demo.boxOffice.cancelTickets([ticket.id], "box_office");
    expect(demo.world.get("tickets", ticket.id)!["status"]).toBe("returned");
    expect((await demo.audience.left(velvet))[0]?.state).toBe("sold_out");
    const show = (await demo.boxOffice.counts(velvet)).find((p) => p.ticket_type_id === null)!;
    expect(show.reserved).toBe(3);
  });

  it("cancels a show one order at a time, each with the show's cause, its emails held", async () => {
    const demo = new DemoAdminium();
    const low = byName(demo, "Low Ceiling: new material night").id;
    await demo.boxOffice.cancelShow(low);
    const orders = demo.world.where("orders", (o) => o["event_id"] === low && o["status"] !== "let_go" && o["status"] !== "expired");
    expect(orders.every((o) => o["status"] === "cancelled" && o["cancel_cause"] === "show")).toBe(true);
    const held = demo.world.where("messages", (m) => String(m["kind"]).startsWith("cancelled-") && m["status"] === "held");
    expect(held.length).toBe(orders.length);
  });
});

describe("a ticket sent to a friend", () => {
  it("is offered, accepted with a new code in the friend's name, and its code is kept from the buyer", async () => {
    const demo = new DemoAdminium();
    const mia = order(demo, "WV-S8761");
    await demo.audience.openOrder(String(mia["link_token"]));
    const ana = ticketByCode(demo, "P4MA-7VKE");
    const sent = await demo.audience.sendTicket(ana.id, "kai.renner@example.com", "Kai Renner");
    expect([sent["status"], sent["pending_name"]]).toEqual(["offered", "Kai Renner"]);
    const token = String(demo.world.get("tickets", ana.id)!["link_token"]);
    expect((await demo.audience.openTicket(token))["code"]).toBeNull();
    const accepted = await demo.audience.acceptTicket(token, "Kai Renner");
    expect(accepted["code"]).not.toBe("P4MA-7VKE");
    const seen = (await demo.audience.order()).tickets.find((t) => t.id === ana.id)!;
    expect([seen["holder_name"], seen["code"]]).toEqual(["Kai Renner", null]);
  });

  it("asks no refund once the show's refund window has closed", async () => {
    const demo = new DemoAdminium();
    const paid = demo.world.all("orders").find((o) => o["event_id"] === byName(demo, "Neon Circuit").id && o["status"] === "paid" && o["link_token"] !== null)!;
    await demo.audience.openOrder(String(paid["link_token"]));
    const ticket = demo.world.where("tickets", (t) => t["order_id"] === paid.id)[0]!;
    expect(await refused(() => demo.audience.askRefund(ticket.id as Id))).toMatchObject({ code: "STATE_MOVE_REFUSED", params: { requires: "time", bound: "before" } });
  });
});

it("starts at Tuesday 28 July 2026, 16:30 at the venue", () => {
  expect(new DemoAdminium().now).toBe(T1630);
});

describe("offers and sends end at doors", () => {
  it("gives a ticket sent to a friend at 16:30 until Neon Circuit's doors at 20:00, not two days", async () => {
    const demo = new DemoAdminium();
    await demo.audience.openOrder(String(order(demo, "WV-S8761")["link_token"]));
    const ana = ticketByCode(demo, "P4MA-7VKE");
    await demo.audience.sendTicket(ana.id, "kai.renner@example.com", "Kai Renner");
    expect(Date.parse(String(demo.world.get("tickets", ana.id)!["offer_until"]))).toBe(at("2026-07-28T20:00"));
  });

  it("puts the places still back for the waitlist on sale at Velvet Hour's doors", async () => {
    const demo = new DemoAdminium();
    const velvet = byName(demo, "Velvet Hour").id;
    const back = (status: string) => demo.world.where("tickets", (t) => t["event_id"] === velvet && t["status"] === status).length;
    demo.advanceTo(at("2026-07-31T19:29"));
    const released = back("released");
    expect(back("returned")).toBe(2);
    demo.advanceTo(at("2026-07-31T19:30"));
    expect([back("returned"), back("released") - released]).toEqual([0, 2]);
  });
});

describe("a ticket sent again", () => {
  it("emails the second friend too, and drops the first friend's email still waiting", async () => {
    const demo = new DemoAdminium();
    await demo.audience.openOrder(String(order(demo, "WV-S8761")["link_token"]));
    const ana = ticketByCode(demo, "P4MA-7VKE");
    await demo.audience.sendTicket(ana.id, "kai.renner@example.com", "Kai Renner");
    await demo.audience.takeBack(ana.id);
    await demo.audience.sendTicket(ana.id, "jo.park@example.com", "Jo Park");
    const offers = demo.world.where("messages", (m) => m["kind"] === "friend-offer" && m["ticket_id"] === ana.id);
    expect(offers.map((m) => [m["to_address"], m["status"]])).toEqual([
      ["kai.renner@example.com", "skipped"],
      ["jo.park@example.com", "queued"],
    ]);
  });
});

describe("a claim leaving its hold", () => {
  it("is counted as the box office counts: more offered than the show holds is refused", async () => {
    const demo = new DemoAdminium();
    // The offer's two places are held; with the Standard pool cut by one, the claim no longer fits.
    typeOf(demo, "Velvet Hour", "Standard")["capacity"] = 119;
    await demo.audience.openOrder(String(order(demo, "WV-S8814")["link_token"]));
    expect(await refused(() => demo.audience.choose("door", 2))).toMatchObject({ code: "PUBLIC_SOLD_OUT" });
    expect(order(demo, "WV-S8814")["status"]).toBe("offered");
  });
});

describe("a code while nothing is paid", () => {
  it("never reaches the buyer's page of a transfer still awaited", async () => {
    const demo = new DemoAdminium();
    const waiting = demo.world.all("orders").find((o) => o["status"] === "awaiting_transfer" && o["link_token"] !== null)!;
    await demo.audience.openOrder(String(waiting["link_token"]));
    const { tickets } = await demo.audience.order();
    expect(tickets.length).toBeGreaterThan(0);
    expect(tickets.every((t) => t["code"] === null)).toBe(true);
  });

  it("reaches the friend's page only once they accept it", async () => {
    const demo = new DemoAdminium();
    await demo.audience.openOrder(String(order(demo, "WV-S8761")["link_token"]));
    const ana = ticketByCode(demo, "P4MA-7VKE");
    await demo.audience.sendTicket(ana.id, "kai.renner@example.com", "Kai Renner");
    const token = String(demo.world.get("tickets", ana.id)!["link_token"]);
    expect((await demo.audience.openTicket(token))["code"]).toBeNull();
    await demo.audience.acceptTicket(token, "Kai Renner");
    const theirs = await demo.audience.openTicket(token);
    expect([theirs["holder_name"], theirs["code"]]).toEqual(["Kai Renner", demo.world.get("tickets", ana.id)!["code"]]);
  });
});

// ── what a buyer reaches, and nothing more ──────────────────────────────────

/** Signs the demo's audience in as a person, with the code "emailed" to them. */
async function signInAs(demo: DemoAdminium, email: string): Promise<void> {
  await demo.audience.signIn(email);
  await demo.audience.verify(email, demo.audience.mail.get(email)!.code);
}
const buyerOf = (demo: DemoAdminium, number: string) => String(demo.world.get("customers", order(demo, number)["customer_id"] as Id)!["email"]);

describe("another buyer's rows", () => {
  it("are not there for a signed-in person: an order, its tickets and a waitlist place, by id, through every door", async () => {
    const demo = new DemoAdminium();
    const mine = order(demo, "WV-S8761");
    const me = mine["customer_id"];
    await signInAs(demo, buyerOf(demo, "WV-S8761"));
    const theirs = demo.world.all("orders").find((o) => o["customer_id"] !== me && o["status"] === "door" && o["event_id"] === byName(demo, "Neon Circuit").id)!;
    const ticket = demo.world.where("tickets", (t) => t["order_id"] === theirs.id)[0]!;
    const place = demo.world.all("waitlist").find((x) => x["customer_id"] !== me && x["status"] === "waiting")!;
    const before = { order: { ...theirs }, ticket: { ...ticket }, place: { ...place } };
    for (const run of [
      () => demo.audience.myOrder(theirs.id),
      () => demo.audience.updateOrder({ access_note: "mine now" }, theirs.id),
      () => demo.audience.keep(theirs.id),
      () => demo.audience.choose("let_go", undefined, theirs.id),
      () => demo.audience.sendTicket(ticket.id, "taker@example.com", "A Taker"),
      () => demo.audience.takeBack(ticket.id),
      () => demo.audience.askRefund(ticket.id),
      () => demo.audience.withdrawRefund(ticket.id),
      () => demo.audience.cancelTicket(ticket.id),
      () => demo.audience.cancelTicket(ticket.id, true),
      () => demo.audience.nameTicket(ticket.id, "Someone Else"),
      () => demo.audience.leaveWaitlist(place.id),
    ]) {
      expect((await refused(run)).code).toBe("PUBLIC_REF_NOT_FOUND");
    }
    const { orders, held } = await demo.audience.myOrders();
    expect(orders.every((o) => o.order.id !== theirs.id) && held.every((t) => t.id !== ticket.id)).toBe(true);
    expect((await demo.audience.myWaitlist()).every((x) => x.id !== place.id)).toBe(true);
    expect([demo.world.get("orders", theirs.id), demo.world.get("tickets", ticket.id), demo.world.get("waitlist", place.id)]).toEqual([before.order, before.ticket, before.place]);
  });

  it("are not there through another order's own link either", async () => {
    const demo = new DemoAdminium();
    const mine = order(demo, "WV-S8761");
    await demo.audience.openOrder(String(mine["link_token"]));
    const theirs = demo.world.all("orders").find((o) => o.id !== mine.id && o["status"] === "door")!;
    const ticket = demo.world.where("tickets", (t) => t["order_id"] === theirs.id)[0]!;
    for (const run of [() => demo.audience.nameTicket(ticket.id, "X"), () => demo.audience.cancelTicket(ticket.id), () => demo.audience.sendTicket(ticket.id, "x@example.com", "X"), () => demo.audience.updateOrder({ access_note: "x" }, theirs.id)]) {
      expect((await refused(run)).code).toBe("PUBLIC_REF_NOT_FOUND");
    }
  });
});

describe("what the audience's reads show", () => {
  it("is each entry's own columns: no link or confirm codes, retry keys, notes, accounts or the bank on the venue", async () => {
    const demo = new DemoAdminium();
    await signInAs(demo, buyerOf(demo, "WV-S8761"));
    const { orders } = await demo.audience.myOrders();
    const o = orders.find((x) => x.order.id === order(demo, "WV-S8761").id)!;
    for (const column of ["link_token", "confirm_token", "client_key", "note", "customer_id", "answers", "access_note"]) expect(o.order, column).not.toHaveProperty(column);
    for (const column of ["holder_customer_id", "link_token", "pending_email", "holder_email", "answers"]) expect(o.tickets[0], column).not.toHaveProperty(column);
    const venue = await demo.audience.venue();
    expect(Object.keys(venue.settings).filter((k) => k.startsWith("bank_"))).toEqual([]);
  });

  it("gives the bank details to a proved session only, through the door the page came by", async () => {
    const demo = new DemoAdminium();
    for (const door of ["link", "me", "confirm"] as const) expect((await refused(() => demo.audience.bank(door))).code).toBe("PUBLIC_REF_NOT_FOUND");
    const settings = demo.world.all("settings")[0]!;
    expect(String(settings["bank_account_number"] ?? "")).not.toBe("");
    // A transfer checkout: its own link, then the emailed confirm link, each reads them.
    const cinder = byName(demo, "Cinder");
    const reply = await demo.audience.buy({ values: { event_id: cinder.id, buyer_name: "Ana Ruiz", email: "ana.ruiz@example.com" }, tickets: [{ ticket_type_id: typeOf(demo, "Cinder", "Standard").id }] }, "bank");
    const bank = await demo.audience.bank("link");
    expect([bank["bank_account_name"], bank["bank_account_number"]]).toEqual([settings["bank_account_name"], settings["bank_account_number"]]);
    expect(Object.keys(bank).filter((k) => k !== "id" && !k.startsWith("bank_"))).toEqual([]);
    await demo.audience.choose("confirming");
    await demo.audience.openConfirm(String(demo.world.get("orders", reply.data.id)!["confirm_token"]));
    expect((await demo.audience.bank("confirm"))["bank_account_number"]).toBe(settings["bank_account_number"]);
  });
});

describe("a ticket a friend accepted", () => {
  it("reads as accepted to its buyer, with no code and no account, and nothing its buyer does reaches it", async () => {
    const demo = new DemoAdminium();
    await demo.audience.openOrder(String(order(demo, "WV-S8761")["link_token"]));
    const ana = ticketByCode(demo, "P4MA-7VKE");
    await demo.audience.sendTicket(ana.id, "kai.renner@example.com", "Kai Renner");
    await demo.audience.acceptTicket(String(demo.world.get("tickets", ana.id)!["link_token"]), "Kai Renner");
    const seen = (await demo.audience.order()).tickets.find((t) => t.id === ana.id)!;
    expect([seen["accepted_at"] !== null, seen["code"], "holder_customer_id" in seen]).toEqual([true, null, false]);
    for (const run of [
      () => demo.audience.cancelTicket(ana.id),
      () => demo.audience.askRefund(ana.id),
      () => demo.audience.takeBack(ana.id),
      () => demo.audience.sendTicket(ana.id, "x@example.com", "X"),
      () => demo.audience.nameTicket(ana.id, "Someone"),
    ]) {
      expect((await refused(run)).code).toBe("PUBLIC_REF_NOT_FOUND");
    }
    expect([demo.world.get("tickets", ana.id)!["status"], demo.world.get("tickets", ana.id)!["holder_name"]]).toEqual(["valid", "Kai Renner"]);
  });

  it("is its holder's to read, and not theirs to rename", async () => {
    const demo = new DemoAdminium();
    await demo.audience.openOrder(String(order(demo, "WV-S8761")["link_token"]));
    const ana = ticketByCode(demo, "P4MA-7VKE");
    await demo.audience.sendTicket(ana.id, "kai.renner@example.com", "Kai Renner");
    await demo.audience.acceptTicket(String(demo.world.get("tickets", ana.id)!["link_token"]), "Kai Renner");
    await demo.audience.signOut();
    await signInAs(demo, "kai.renner@example.com");
    const { held } = await demo.audience.myOrders();
    expect(held.find((t) => t.id === ana.id)?.["code"]).toBe(demo.world.get("tickets", ana.id)!["code"]);
    expect((await refused(() => demo.audience.nameTicket(ana.id, "Someone Else"))).code).toBe("PUBLIC_REF_NOT_FOUND");
    expect(demo.world.get("tickets", ana.id)!["holder_name"]).toBe("Kai Renner");
  });
});

describe("a buyer's own cancel", () => {
  it("hands the place to the waitlist on a show that keeps one, through its own door only", async () => {
    const demo = new DemoAdminium();
    const velvet = byName(demo, "Velvet Hour").id;
    const ticket = demo.world.all("tickets").find((t) => t["event_id"] === velvet && t["order_status"] === "door" && t["status"] === "valid" && t["holder_customer_id"] === null)!;
    await demo.audience.openOrder(String(demo.world.get("orders", ticket["order_id"] as Id)!["link_token"]));
    expect((await refused(() => demo.audience.cancelTicket(ticket.id))).code).toBe("PUBLIC_REF_NOT_FOUND");
    const back = await demo.audience.cancelTicket(ticket.id, true);
    expect(back["status"]).toBe("returned");
    expect([demo.world.get("tickets", ticket.id)!["status"], demo.world.get("tickets", ticket.id)!["cancel_cause"]]).toEqual(["returned", "buyer"]);
    // Still sold out for the public: the place waits for the next in line.
    expect((await demo.audience.left(velvet))[0]?.state).toBe("sold_out");
  });

  it("puts the place back on sale on a show without a waitlist, and not once the door has taken its money", async () => {
    const demo = new DemoAdminium();
    await demo.audience.openOrder(String(order(demo, "WV-S8761")["link_token"]));
    const [mia, ana] = ["H3TW-9CXR", "P4MA-7VKE"].map((code) => ticketByCode(demo, code));
    expect((await refused(() => demo.audience.cancelTicket(mia!.id, true))).code).toBe("PUBLIC_REF_NOT_FOUND");
    demo.advanceTo(at("2026-07-28T19:35"));
    await demo.door.collect(mia!.id, "card", null);
    expect((await refused(() => demo.audience.cancelTicket(mia!.id))).code).toBe("PUBLIC_REF_NOT_FOUND");
    expect((await demo.audience.cancelTicket(ana!.id))["status"]).toBe("cancelled");
    demo.advanceTo(at("2026-07-28T20:01"));
    expect(demo.world.get("tickets", mia!.id)!["status"]).toBe("valid");
  });

  it("is refused once the ticket is in", async () => {
    const demo = new DemoAdminium();
    await demo.audience.openOrder(String(order(demo, "WV-S8761")["link_token"]));
    const mia = ticketByCode(demo, "H3TW-9CXR");
    demo.advanceTo(at("2026-07-28T19:40"));
    // The door let it in without its money (a person's call at the door): the buyer cannot cancel it now.
    demo.world.get("tickets", mia.id)!["times_in"] = 1;
    expect((await refused(() => demo.audience.cancelTicket(mia.id))).code).toBe("PUBLIC_REF_NOT_FOUND");
  });
});

describe("a refund request", () => {
  it("is a paid order's only: nothing paid at the door yet, nothing to ask back", async () => {
    const demo = new DemoAdminium();
    await demo.audience.openOrder(String(order(demo, "WV-S8761")["link_token"]));
    const ana = ticketByCode(demo, "P4MA-7VKE");
    expect(await refused(() => demo.audience.askRefund(ana.id))).toMatchObject({ code: "STATE_MOVE_REFUSED", params: { requires: "order_status" } });
    expect(demo.world.get("tickets", ana.id)!["status"]).toBe("valid");
  });
});

describe("deleting a buyer's details", () => {
  it("stops their orders' own links and confirm links: an old email opens nothing", async () => {
    const demo = new DemoAdminium();
    const mine = order(demo, "WV-S8761");
    const [oldLink, oldConfirm] = [String(mine["link_token"]), String(mine["confirm_token"])];
    await demo.audience.openOrder(oldLink);
    await signInAs(demo, buyerOf(demo, "WV-S8761"));
    await demo.audience.forget();
    expect((await refused(() => demo.audience.order())).code).toBe("PUBLIC_REF_NOT_FOUND");
    expect((await refused(() => demo.audience.openOrder(oldLink))).code).toBe("PUBLIC_REF_NOT_FOUND");
    expect((await refused(() => demo.audience.openConfirm(oldConfirm))).code).toBe("PUBLIC_REF_NOT_FOUND");
  });

  it("stops the link of a ticket they hold from a friend", async () => {
    const demo = new DemoAdminium();
    await demo.audience.openOrder(String(order(demo, "WV-S8761")["link_token"]));
    const ana = ticketByCode(demo, "P4MA-7VKE");
    await demo.audience.sendTicket(ana.id, "kai.renner@example.com", "Kai Renner");
    const link = String(demo.world.get("tickets", ana.id)!["link_token"]);
    await demo.audience.acceptTicket(link, "Kai Renner");
    await demo.audience.signOut();
    await signInAs(demo, "kai.renner@example.com");
    await demo.audience.forget();
    expect((await refused(() => demo.audience.openTicket(link))).code).toBe("PUBLIC_REF_NOT_FOUND");
    // The ticket itself still works at the door: it keeps its holder's code.
    expect(demo.world.get("tickets", ana.id)!["status"]).toBe("valid");
  });
});

describe("send it again", () => {
  /** A Cinder checkout by transfer, waiting for its confirm email, opened by its own link on this browser. */
  async function confirming(demo: DemoAdminium, email: string, key: string): Promise<Id> {
    const reply = await demo.audience.buy({ values: { event_id: byName(demo, "Cinder").id, buyer_name: "Ana Ruiz", email }, tickets: [{ ticket_type_id: typeOf(demo, "Cinder", "Standard").id }] }, key);
    await demo.audience.choose("confirming");
    return reply.data.id;
  }
  const tokenOf = (demo: DemoAdminium, id: Id) => String(demo.world.get("orders", id)!["confirm_token"]);
  const mails = (demo: DemoAdminium, id: Id) => demo.world.all("messages").filter((m) => m["kind"] === "transfer-confirm" && m["order_id"] === id);

  it("makes a new confirm link and emails it; the old one opens nothing; once a minute, five a day", async () => {
    const demo = new DemoAdminium();
    const id = await confirming(demo, "ana.ruiz@example.com", "again-1");
    const first = tokenOf(demo, id);
    expect(mails(demo, id).length).toBe(1);
    await demo.audience.confirmAgain();
    const second = tokenOf(demo, id);
    expect(second).not.toBe(first);
    expect(mails(demo, id).map((m) => [m["status"], m["to_address"], m["repeat_key"]])).toEqual([
      ["queued", "ana.ruiz@example.com", null],
      ["queued", "ana.ruiz@example.com", second],
    ]);
    expect((await refused(() => demo.audience.openConfirm(first))).code).toBe("PUBLIC_REF_NOT_FOUND");
    expect((await demo.audience.openConfirm(second)).id).toBe(id);
    // A second press within the minute: answered the same, nothing new.
    await demo.audience.confirmAgain();
    expect([tokenOf(demo, id), mails(demo, id).length]).toEqual([second, 2]);
    for (let i = 0; i < 4; i += 1) {
      demo.advance(1);
      await demo.audience.confirmAgain();
    }
    expect(mails(demo, id).length).toBe(6);
    demo.advance(1);
    expect((await refused(() => demo.audience.confirmAgain())).code).toBe("PUBLIC_LIMIT_REACHED");
    expect(mails(demo, id).length).toBe(6);
    // The newest link still confirms the order.
    expect((await demo.audience.confirmTransfer(tokenOf(demo, id)))["status"]).toBe("awaiting_transfer");
  });

  it("counts five a day to one address too, across its orders", async () => {
    const demo = new DemoAdminium();
    await confirming(demo, "Jo.Petrak@example.com", "again-a");
    for (let i = 0; i < 3; i += 1) {
      await demo.audience.confirmAgain();
      demo.advance(1);
    }
    await confirming(demo, "jo.petrak+2@example.com", "again-b");
    await demo.audience.confirmAgain();
    demo.advance(1);
    await demo.audience.confirmAgain();
    demo.advance(1);
    expect((await refused(() => demo.audience.confirmAgain())).code).toBe("PUBLIC_LIMIT_REACHED");
  });

  it("is refused once the order no longer waits for its confirm, for a waitlist offer's, and while email cannot go", async () => {
    const demo = new DemoAdminium();
    const id = await confirming(demo, "ana.ruiz@example.com", "again-2");
    demo.audience.failNext = "mail-down";
    expect((await refused(() => demo.audience.confirmAgain())).code).toBe("PUBLIC_CODE_UNAVAILABLE");
    expect(mails(demo, id).length).toBe(1);
    await demo.audience.confirmTransfer(tokenOf(demo, id));
    expect((await refused(() => demo.audience.confirmAgain())).code).toBe("PUBLIC_WRITE_REFUSED");
    // A waitlist offer claimed by transfer: its own email, by the offer's end — not sent again from its link.
    const offer = order(demo, "WV-S8814");
    await demo.audience.openOrder(String(offer["link_token"]));
    await demo.audience.choose("confirming");
    expect((await refused(() => demo.audience.confirmAgain())).code).toBe("PUBLIC_WRITE_REFUSED");
  });
});

describe("a name that is only a name", () => {
  const cinderBody = (demo: DemoAdminium, buyer_name: string, email = "ana.ruiz@example.com") => ({ values: { event_id: byName(demo, "Cinder").id, buyer_name, email }, tickets: [{ ticket_type_id: typeOf(demo, "Cinder", "Standard").id }] });

  it("refuses a buyer's name holding a number, a web or an email address, as Adminium does; initials pass", async () => {
    const demo = new DemoAdminium();
    for (const name of ["Rui at rui.com", "refund-desk.com Smith", "Ｒｕｉ．ｃｏｍ", "rui.com-", "Lee 2", "@lee", "ana@example.com", "Wong.Ng", "late.In", "X.Com", "www.lee"]) {
      expect(await refused(() => demo.audience.quote(cinderBody(demo, name))), name).toEqual({ code: "PUBLIC_WRITE_REFUSED", params: { column: "buyer_name" } });
    }
    for (const name of ["W.Hu", "M.De Vries", "K.Y.Ng", "Mary.Ann", "J.R.R. Tolkien", "St. John", "Zoë O'Neil-Brandt", "李小龙", "Ана Руис"]) {
      expect((await demo.audience.quote(cinderBody(demo, name))).data["total"], name).toBeGreaterThan(0);
    }
    expect(await refused(() => demo.audience.buy(cinderBody(demo, "Rui at rui.com"), "plain-1"))).toEqual({ code: "PUBLIC_WRITE_REFUSED", params: { column: "buyer_name" } });
    expect(await refused(() => demo.audience.buy(cinderBody(demo, " "), "plain-0"))).toEqual({ code: "PUBLIC_WRITE_REFUSED", params: { column: "buyer_name", reason: "required" } });
    // A dry run prices the choice before the details are asked for.
    expect((await demo.audience.quote({ values: { event_id: byName(demo, "Cinder").id }, tickets: cinderBody(demo, "").tickets })).data["total"]).toBeGreaterThan(0);
  });

  it("judges a signed-in buyer's account name the order fills in, and takes a name typed instead", async () => {
    const demo = new DemoAdminium();
    const mia = demo.world.all("customers").find((c) => c["email"] === "mia.okada@example.com")!;
    mia["name"] = "Mia okada.com";
    await signInAs(demo, "mia.okada@example.com");
    expect(await refused(() => demo.audience.quote(cinderBody(demo, "", "mia.okada@example.com")))).toEqual({ code: "PUBLIC_WRITE_REFUSED", params: { column: "buyer_name" } });
    const made = await demo.audience.buy(cinderBody(demo, "Mia Okada", "mia.okada@example.com"), "plain-2");
    expect(demo.world.get("orders", made.data.id)!["buyer_name"]).toBe("Mia Okada");
  });

  it("refuses a ticket's name that is a web address, on the ticket's own name", async () => {
    const demo = new DemoAdminium();
    const made = await demo.audience.buy(cinderBody(demo, "Ana Ruiz"), "plain-3");
    expect(await refused(() => demo.audience.nameTicket(made.tickets[0]!.id, "Get yours at tix.shop"))).toEqual({ code: "PUBLIC_WRITE_REFUSED", params: { column: "holder_name" } });
    expect((await demo.audience.nameTicket(made.tickets[0]!.id, "Ana Ruiz"))["holder_name"]).toBe("Ana Ruiz");
  });
});
