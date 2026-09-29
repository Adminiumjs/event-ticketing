/**
 * The demo's Adminium keeps the money rules the server keeps, with the
 * server's refusals: a show not on sale, how an order may be paid, a code
 * out of date or over 100 %, a type's least in one order and its own size,
 * and the emails a payment or a refund sends.
 */
import { describe, expect, it } from "vitest";

import { ApiError, type Id, type Row } from "../data/wire.ts";
import { DemoAdminium } from "./adminium.ts";

async function refused(run: () => Promise<unknown>): Promise<{ status: number; code: string; params: Record<string, unknown> }> {
  try {
    await run();
  } catch (error) {
    if (error instanceof ApiError) return { status: error.status, code: error.code, params: { ...error.params } };
    throw error;
  }
  throw new Error("the write went through");
}

const byName = (demo: DemoAdminium, name: string) => demo.world.all("events").find((e) => e["name"] === name)!;
const typeOf = (demo: DemoAdminium, event: string, name: string) => demo.world.all("ticket_types").find((t) => t["event_id"] === byName(demo, event).id && t["name"] === name)!;
const messages = (demo: DemoAdminium, kind: string, orderId: Id) => demo.world.all("messages").filter((m) => m["kind"] === kind && m["order_id"] === orderId);
let n = 0;
const key = () => `money-${String((n += 1))}`;

/** A box-office order of `qty` tickets of one type, held. */
async function boxOrder(demo: DemoAdminium, event: string, type: string, qty: number, values: Record<string, unknown> = {}): Promise<Row> {
  const body = { values: { event_id: byName(demo, event).id, buyer_name: "Lee Tan", email: "lee.tan@example.com", language: "en-US", ...values }, tickets: Array.from({ length: qty }, () => ({ ticket_type_id: typeOf(demo, event, type).id })) };
  return (await demo.boxOffice.newOrder(body, key())).data;
}
/** The audience's checkout of `qty` tickets of one type, held. */
async function buy(demo: DemoAdminium, event: string, type: string, qty: number): Promise<Row> {
  const body = { values: { event_id: byName(demo, event).id, buyer_name: "Ana Ruiz", email: "ana.ruiz@example.com", language: "en-US" }, tickets: Array.from({ length: qty }, () => ({ ticket_type_id: typeOf(demo, event, type).id })) };
  return (await demo.audience.buy(body, key())).data;
}

describe("a show that is not on sale", () => {
  it("takes no order once cancelled — from the box office either", async () => {
    const demo = new DemoAdminium();
    const r = await refused(() => boxOrder(demo, "Dust Parade", "Standard", 1));
    expect([r.code, r.params["requires"], r.params["via"], r.params["create"]]).toEqual(["STATE_MOVE_REFUSED", "linked", "event_id", true]);
    expect(demo.world.all("orders").length).toBe(799);
  });

  it("takes no order once its last night has ended", async () => {
    const demo = new DemoAdminium();
    const r = await refused(() => boxOrder(demo, "Paper Moons", "Standard", 1));
    expect([r.code, r.params["requires"], r.params["bound"]]).toEqual(["STATE_MOVE_REFUSED", "time", "before"]);
  });

  it("takes no ticket of a type whose show was taken back to a draft", async () => {
    const demo = new DemoAdminium();
    const marrow = byName(demo, "Marrow & Salt");
    await demo.boxOffice.update("events", marrow.id, { status: "draft" });
    expect(typeOf(demo, "Marrow & Salt", "Standard")["event_status"]).toBe("draft");
    const r = await refused(() => boxOrder(demo, "Marrow & Salt", "Standard", 1));
    expect(r.code).toBe("STATE_MOVE_REFUSED");
  });
});

describe("a ticket's show", () => {
  it("is sent with every ticket, and the show's doors, waitlist and reminder are copied from it", async () => {
    const demo = new DemoAdminium();
    const order = await buy(demo, "Marrow & Salt", "Standard", 1);
    const show = byName(demo, "Marrow & Salt");
    const ticket = demo.world.all("tickets").find((t) => t["order_id"] === order.id)!;
    expect([ticket["show_id"], ticket["event_id"], ticket["right_show"]]).toEqual([show.id, show.id, 1]);
    expect([ticket["doors_at"], ticket["waitlist_on"], ticket["eve_email"]]).toEqual([show["doors_at"], show["waitlist_on"], show["eve_email"]]);
    // Every sample ticket carries its show too.
    expect(demo.world.all("tickets").filter((t) => t["show_id"] !== t["event_id"] || t["doors_at"] === null)).toEqual([]);
  });

  it("refuses a ticket of one show's type made on another show's order, or sent with another show", async () => {
    const demo = new DemoAdminium();
    const neon = byName(demo, "Neon Circuit");
    const cinder = byName(demo, "Cinder");
    const orders = demo.world.all("orders").length;
    // The box office's order for Neon Circuit, with Cinder's type.
    const mixed = { values: { event_id: neon.id, buyer_name: "Lee Tan", email: "lee.tan@example.com", language: "en-US" }, tickets: [{ ticket_type_id: typeOf(demo, "Cinder", "Standard").id }] };
    const r = await refused(() => demo.boxOffice.newOrder(mixed, key()));
    expect([r.code, r.params["requires"]]).toEqual(["STATE_MOVE_REFUSED", "right_show"]);
    // A write that sends Cinder as the show of a Neon Circuit ticket.
    const writer = { origin: "staff" as const, name: "Priya", roles: ["box-office"] };
    const sent = await refused(async () =>
      demo.engine.create("orders", { event_id: neon.id, room_id: neon["room_id"], channel: "box_office", buyer_name: "Lee Tan" }, writer, {
        table: "tickets",
        via: "order_id",
        rows: [{ ticket_type_id: typeOf(demo, "Neon Circuit", "Standard").id, show_id: cinder.id }],
      }),
    );
    expect([sent.code, sent.params["requires"]]).toEqual(["STATE_MOVE_REFUSED", "right_show"]);
    // Or none at all.
    const none = await refused(async () =>
      demo.engine.create("orders", { event_id: neon.id, room_id: neon["room_id"], channel: "box_office", buyer_name: "Lee Tan" }, writer, {
        table: "tickets",
        via: "order_id",
        rows: [{ ticket_type_id: typeOf(demo, "Neon Circuit", "Standard").id }],
      }),
    );
    expect(none.params["requires"]).toBe("right_show");
    expect(demo.world.all("orders").length).toBe(orders);
  });
});

describe("how an order is paid", () => {
  it("never goes by transfer when a ticket's type is door-only (Low Ceiling's Standard)", async () => {
    const demo = new DemoAdminium();
    await buy(demo, "Low Ceiling: new material night", "Standard", 1);
    const r = await refused(() => demo.audience.choose("confirming"));
    expect([r.code, r.params["requires"], r.params["column"]]).toEqual(["STATE_MOVE_REFUSED", "no_transfer", "no_transfer"]);
    expect((await demo.audience.choose("door"))["status"]).toBe("door");
  });

  it("never goes to the door when a ticket's type is transfer-only", async () => {
    const demo = new DemoAdminium();
    await demo.boxOffice.update("ticket_types", typeOf(demo, "Marrow & Salt", "Standard").id, { pay_door: false });
    await buy(demo, "Marrow & Salt", "Standard", 2);
    const r = await refused(() => demo.audience.choose("door"));
    expect([r.code, r.params["requires"]]).toEqual(["STATE_MOVE_REFUSED", "no_door"]);
    expect((await demo.audience.choose("confirming"))["status"]).toBe("confirming");
  });

  it("takes no transfer inside the last days before the doors, from the buyer or the box office", async () => {
    const demo = new DemoAdminium();
    // Neon Circuit's doors are tonight: three days before them has long gone.
    await buy(demo, "Neon Circuit", "Standard", 1);
    const r = await refused(() => demo.audience.choose("confirming"));
    expect([r.code, r.params["requires"], r.params["bound"]]).toEqual(["STATE_MOVE_REFUSED", "time", "before"]);
    const phone = await boxOrder(demo, "Neon Circuit", "Standard", 1);
    expect((await refused(() => demo.boxOffice.move(phone.id, "awaiting_transfer")))).toMatchObject({ code: "STATE_MOVE_REFUSED", params: { requires: "time" } });
    // The days are the venue's setting: at 16 days, Cinder (doors Friday 14 August, 21:00) takes transfers until
    // Wednesday 29 July at 21:00, and not after.
    await demo.boxOffice.update("settings", demo.world.all("settings")[0]!.id, { transfer_cutoff_days: 16 });
    const cinder = await boxOrder(demo, "Cinder", "Standard", 1);
    expect((await demo.boxOffice.move(cinder.id, "awaiting_transfer"))["status"]).toBe("awaiting_transfer");
    demo.advance(29 * 60);
    const late = await boxOrder(demo, "Cinder", "Standard", 1);
    expect((await refused(() => demo.boxOffice.move(late.id, "awaiting_transfer"))).params["requires"]).toBe("time");
  });
});

describe("a code", () => {
  it("out of date is found by nobody — the box office included", async () => {
    const demo = new DemoAdminium();
    demo.advance(24 * 60);
    const r = await refused(() => boxOrder(demo, "Home Studio Basics", "Place", 1, { code_text: "student10" }));
    expect([r.code, r.params["column"], r.params["reason"]]).toEqual(["VALIDATION_FAILED", "code_text", "unknown"]);
  });

  it("over 100 percent takes off the price and no more: nothing is owed back", async () => {
    const demo = new DemoAdminium();
    await demo.boxOffice.create("codes", { code: "OVER150", kind: "percent", value: 150, active: true });
    const order = await boxOrder(demo, "Marrow & Salt", "Standard", 2, { code_text: "OVER150" });
    const tickets = demo.world.where("tickets", (t) => t["order_id"] === order.id);
    expect(tickets.map((t) => [t["discount"], t["due"]])).toEqual([
      [18, 0],
      [18, 0],
    ]);
    const stored = demo.world.get("orders", order.id)!;
    expect([stored["total"], stored["balance"], stored["refund_due"]]).toEqual([0, 0, 0]);
  });
});

describe("a ticket type's own limits", () => {
  it("with no size of its own is held by the show's alone: it reads open and sells", async () => {
    const demo = new DemoAdminium();
    const std = typeOf(demo, "Marrow & Salt", "Standard");
    await demo.boxOffice.update("ticket_types", std.id, { capacity: null });
    const left = (await demo.audience.left(byName(demo, "Marrow & Salt").id)).find((t) => t.ticket_type_id === std.id);
    expect(left?.state).toBe("open");
    expect((await buy(demo, "Marrow & Salt", "Standard", 2))["status"]).toBe("held");
  });

  it("sells no fewer than its least in one order, online or at the box office", async () => {
    const demo = new DemoAdminium();
    const std = typeOf(demo, "Marrow & Salt", "Standard");
    await demo.boxOffice.update("ticket_types", std.id, { min_per_order: 2 });
    expect(await refused(() => buy(demo, "Marrow & Salt", "Standard", 1))).toEqual({ status: 400, code: "PUBLIC_WRITE_REFUSED", params: { reason: "too-few", group: std.id } });
    expect(await refused(() => boxOrder(demo, "Marrow & Salt", "Standard", 1))).toEqual({ status: 422, code: "VALIDATION_FAILED", params: { reason: "too-few", group: std.id } });
    expect((await buy(demo, "Marrow & Salt", "Standard", 2))["status"]).toBe("held");
  });
});

describe("the emails a payment sends: the tickets once, by what the buyer has not had", () => {
  it("a phone order by transfer, paid by transfer: the payment's email alone", async () => {
    const demo = new DemoAdminium();
    const order = await boxOrder(demo, "Cinder", "Standard", 1);
    await demo.boxOffice.move(order.id, "awaiting_transfer");
    await demo.boxOffice.recordPayment(order.id, 24, "bank_transfer");
    await demo.boxOffice.move(order.id, "paid", { paid_method: "bank_transfer" });
    expect([messages(demo, "payment-received", order.id).length, messages(demo, "tickets-paid", order.id).length]).toEqual([1, 0]);
  });

  it("an online transfer settled by card at the box office: the tickets (their codes were held back until now)", async () => {
    const demo = new DemoAdminium();
    const order = await buy(demo, "Cinder", "Standard", 1);
    await demo.audience.choose("confirming");
    await demo.audience.confirmTransfer(String(demo.world.get("orders", order.id)!["confirm_token"]));
    await demo.boxOffice.recordPayment(order.id, 24, "card");
    await demo.boxOffice.move(order.id, "paid", { paid_method: "card" });
    expect([messages(demo, "tickets-paid", order.id).length, messages(demo, "payment-received", order.id).length]).toEqual([1, 0]);
  });

  it("a phone order to pay at the door, paid at the door: nothing more — its tickets went out when it chose the door", async () => {
    const demo = new DemoAdminium();
    const order = await boxOrder(demo, "Cinder", "Standard", 1);
    await demo.boxOffice.move(order.id, "door");
    expect(messages(demo, "tickets", order.id).length).toBe(1);
    await demo.boxOffice.recordPayment(order.id, 24, "cash");
    await demo.boxOffice.move(order.id, "paid", { paid_method: "cash" });
    expect([messages(demo, "tickets-paid", order.id).length, messages(demo, "payment-received", order.id).length]).toEqual([0, 0]);
  });

  it("a sale paid on the spot at the box office: the tickets", async () => {
    const demo = new DemoAdminium();
    const order = await boxOrder(demo, "Cinder", "Standard", 1);
    await demo.boxOffice.recordPayment(order.id, 24, "card");
    await demo.boxOffice.move(order.id, "paid", { paid_method: "card" });
    expect(messages(demo, "tickets-paid", order.id).length).toBe(1);
  });
});

describe("refunds", () => {
  it("tells each one, linked to its own refund", async () => {
    const demo = new DemoAdminium();
    const order = await boxOrder(demo, "Cinder", "Standard", 2);
    await demo.boxOffice.recordPayment(order.id, 48, "card");
    await demo.boxOffice.move(order.id, "paid", { paid_method: "card" });
    const first = await demo.boxOffice.recordRefund(order.id, 10, "card", "goodwill");
    const second = await demo.boxOffice.recordRefund(order.id, 5, "card", "goodwill");
    expect(messages(demo, "refund-recorded", order.id).map((m) => m["refund_id"])).toEqual([first.id, second.id]);
  });
});

describe("a waitlist claim by transfer", () => {
  it("is asked to confirm by the offer's end (its own email), a checkout by its hold", async () => {
    const demo = new DemoAdminium();
    // Mia's Velvet Hour offer, claimed by transfer at 16:30 Tuesday (transfers for Friday's show close at 19:30 tonight).
    const mia = demo.world.all("orders").find((o) => o["number"] === "WV-S8814")!;
    await demo.audience.openOrder(String(mia["link_token"]));
    expect((await demo.audience.choose("confirming"))["status"]).toBe("confirming");
    expect([messages(demo, "transfer-confirm-offer", mia.id).length, messages(demo, "transfer-confirm", mia.id).length]).toEqual([1, 0]);
    const order = await buy(demo, "Cinder", "Standard", 1);
    await demo.audience.choose("confirming");
    expect([messages(demo, "transfer-confirm", order.id).length, messages(demo, "transfer-confirm-offer", order.id).length]).toEqual([1, 0]);
  });
});

describe("a friend holding a ticket", () => {
  it("is sent their own copy of a moved show, to their own address, linked to their ticket and to them", async () => {
    const demo = new DemoAdminium();
    // A Cinder ticket a friend took: the friend is a customer of their own.
    const ticket = demo.world.all("tickets").find((t) => t["event_id"] === byName(demo, "Cinder").id && t["status"] === "valid" && t["order_status"] === "paid")!;
    const friendRow = demo.world.all("customers").find((c) => c["email"] === "kai.renner@example.com")!;
    await demo.boxOffice.update("tickets", ticket.id, { holder_customer_id: friendRow.id, holder_name: "Kai Renner", holder_email: "kai.renner@example.com" });
    const held = demo.world.get("tickets", ticket.id)!;
    const show = demo.world.get("events", held["event_id"] as Id)!;
    const b = await demo.boxOffice.broadcast(
      { event_id: show.id, audience: "everyone", template: "moved", subject: "Moved", body: "New date", people: 1, order_count: 1 },
      [{ ticket_id: held.id, customer_id: held["holder_customer_id"] }],
      true,
    );
    const sent = demo.world.all("messages").filter((m) => m["broadcast_id"] === b.id);
    const friend = demo.world.get("customers", held["holder_customer_id"] as Id)!;
    expect(sent.map((m) => [m["kind"], m["ticket_id"], m["customer_id"], m["to_address"]])).toEqual([["moved-holder", held.id, friend.id, friend["email"]]]);
  });
});
