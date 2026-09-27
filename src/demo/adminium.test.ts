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
