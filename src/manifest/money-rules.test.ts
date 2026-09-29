/**
 * The rules the server keeps about money, moves and emails, read from the
 * manifest as written: a rule the manifest does not carry is a rule a page
 * (or a caller of the API) can skip.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { broadcastKind } from "../data/messageKinds.ts";
import { EMAIL_EN, emailWords } from "./emails.ts";
import { KINDS } from "./outbox.ts";

type Json = Record<string, unknown>;
const manifest = JSON.parse(readFileSync(fileURLToPath(new URL("../../manifest.json", import.meta.url)), "utf8")) as Json;
const tables = (manifest["requiredSchema"] as { tables: Json[] }).tables;
const table = (ref: string) => tables.find((t) => t["ref"] === ref)!;
const column = (t: string, ref: string) => (table(t)["columns"] as Json[]).find((c) => c["ref"] === ref)!;
const states = (t: string) => table(t)["states"] as { moves: Record<string, (string | Json)[]>; create?: { requires: Json }; timed?: Json[] };
const move = (t: string, from: string, to: string) => states(t).moves[from]!.find((m) => (typeof m === "string" ? m : m["to"]) === to) as Json;
const outbox = manifest["outbox"] as { producers: Json[] };
const producers = (kind: string) => outbox.producers.filter((p) => p["kind"] === kind);
const templates = manifest["emailTemplates"] as { key: string; locales: Record<string, unknown> }[];
const template = (kind: string) => JSON.stringify(templates.find((t) => t.key === `events-${kind}`)!.locales);

describe("a show that is not on sale sells nothing", () => {
  it("makes an order only for an announced show whose last night has not ended", () => {
    expect(states("orders").create?.requires).toEqual({
      linked: [{ via: "event_id", where: [{ column: "status", eq: "published" }] }],
      time: { before: { column: "ends_at", via: "event_id", or: [{ column: "curfew_at", via: "event_id" }] } },
    });
  });

  it("makes a ticket only of a type still selling, of a show on sale", () => {
    expect(states("tickets").create?.requires).toEqual({
      linked: [{ via: "ticket_type_id", where: [{ column: "selling", eq: true }, { column: "event_status", eq: "published" }] }],
    });
  });
});

describe("how an order is paid is the ticket types' and the Settings', not the page's", () => {
  const TRANSFER_TIME = { before: { column: "doors_at", minus: { days: { table: "settings", column: "transfer_cutoff_days" } } } };

  it("keeps a door-only order from a transfer and a transfer-only one from the door, from every state that offers them", () => {
    for (const from of ["held", "confirming", "offered"]) {
      expect((move("orders", from, "door")["requires"] as Json)["where"]).toEqual([{ column: "no_door", lte: 0 }]);
    }
    for (const from of ["held", "offered"]) {
      const requires = move("orders", from, "confirming")["requires"] as Json;
      expect([requires["where"], requires["time"]]).toEqual([[{ column: "no_transfer", lte: 0 }], TRANSFER_TIME]);
    }
  });

  it("takes no transfer, from the buyer or the box office, in the last days before the doors", () => {
    const staff = move("orders", "held", "awaiting_transfer")["requires"] as Json;
    expect(staff["time"]).toEqual(TRANSFER_TIME);
    expect(staff["where"]).toEqual([{ column: "email", isNull: false }, { column: "no_transfer", lte: 0 }]);
  });
});

describe("a code", () => {
  it("is found only while switched on and in date, by the box office as by the page", () => {
    const lookup = ((column("orders", "code_id")["rules"] as Json)["lookup"] as Json)["where"];
    expect(lookup).toEqual([
      { column: "active", eq: true },
      { column: "valid_until", notBefore: "now", orEmpty: true },
    ]);
  });

  it("never takes off more than the ticket's price, whatever percent it says", () => {
    const formula = ((column("tickets", "discount")["rules"] as Json)["formula"] as { if: unknown[] }).if;
    expect(formula[1]).toEqual({ min: ["price", { round: { div: [{ mul: ["price", { coalesce: ["code_value", 0] }] }, 100] } }] });
  });
});

describe("an order's tickets of each type", () => {
  it("are at least the type's least and at most its most, judged by Adminium on the order's tickets", () => {
    const entry = (manifest["publicAccess"] as Json[]).find((e) => e["table"] === "orders" && (e["methods"] as string[]).includes("POST"))!;
    const tickets = (entry["children"] as Record<string, Json>)["tickets"]!;
    expect(tickets["counts"]).toEqual([{ by: ["ticket_type_id"], min: "min_per_order", max: "max_per_order" }]);
  });
});

describe("the emails a payment sends", () => {
  it("sends the tickets once, by what the buyer has not had: by card or cash one email, by transfer another, after the door none", () => {
    expect(producers("tickets-paid").map((p) => (p["onChange"] as Json)["where"])).toEqual([{ column: "paid_email", eq: 1 }]);
    expect(producers("payment-received").map((p) => (p["onChange"] as Json)["where"])).toEqual([{ column: "paid_email", eq: 2 }]);
    const formula = JSON.stringify((column("orders", "paid_email")["rules"] as Json)["formula"]);
    for (const read of ["door_at", "channel", "paid_method"]) expect(formula).toContain(`"${read}"`);
    expect((column("orders", "door_at")["rules"] as Json)["stamp"]).toEqual({ set: "now", on: { column: "status", values: ["door"] } });
  });

  it("tells each refund, with its own amount", () => {
    expect(producers("refund-recorded")).toEqual([{ kind: "refund-recorded", link: "refund_id", onCreate: { table: "refunds", where: { column: "voided", eq: false } } }]);
    for (const [tag, w] of Object.entries(emailWords())) {
      const words = JSON.stringify(w["refund-recorded"]);
      expect([tag, words.includes("{{refund.amount}}"), words.includes("{{order.refunded}}")]).toEqual([tag, true, false]);
    }
  });

  it("asks for what is still owed, and says what came in", () => {
    for (const [tag, w] of Object.entries(emailWords())) {
      for (const kind of ["transfer-waiting", "transfer-reminder"] as const) expect([tag, kind, JSON.stringify(w[kind]).includes("{{order.total}}")]).toEqual([tag, kind, false]);
      expect([tag, JSON.stringify(w["cancelled-paid"]).includes("{{order.received}}")]).toEqual([tag, true]);
    }
  });
});

describe("the reminders before a show", () => {
  it("drop a buyer's once the order is gone or has no ticket left", () => {
    for (const kind of ["tonight", "tomorrow"]) {
      expect(producers(kind)[0]!["dropWhen"]).toEqual([
        { column: "status", in: ["cancelled", "released", "let_go", "expired", "not_collected"], reason: "no-longer-needed" },
        { column: "ticket_count", lte: 0, reason: "no-longer-needed" },
      ]);
    }
  });

  it("drop a friend's once their ticket or the order it is of is gone (a cancelled show moves the orders only)", () => {
    for (const kind of ["tonight-holder", "tomorrow-holder"]) {
      expect(producers(kind)[0]!["dropWhen"]).toContainEqual({ column: "order_status", in: ["cancelled", "released", "let_go", "expired", "not_collected"], reason: "no-longer-needed" });
    }
  });
});

describe("a friend holding a ticket", () => {
  it("is sent their own copy of a moved show and of a message, which opens their ticket and never the buyer's order", () => {
    expect(broadcastKind({ template: "moved" }, { order_id: 1, to_address: "a@x.test" })).toBe("moved");
    expect(broadcastKind({ template: "moved" }, { ticket_id: 7, customer_id: 9 })).toBe("moved-holder");
    expect(broadcastKind({ template: "other" }, { order_id: 1 })).toBe("broadcast");
    expect(broadcastKind({ template: "doors" }, { ticket_id: 7, customer_id: 9 })).toBe("broadcast-holder");
    for (const kind of ["moved-holder", "broadcast-holder"]) {
      expect(KINDS).toContain(kind);
      expect([kind, template(kind).includes("{{ticket.link_token}}"), template(kind).includes("order.link_token")]).toEqual([kind, true, false]);
    }
    expect(template("broadcast-holder")).toContain("{{broadcast.body}}");
  });
});

describe("a presale reminder and a waitlist claim by transfer", () => {
  it("names the presale's own time", () => {
    const presale = producers("on-sale-presale");
    expect(presale.map((p) => (p["before"] as Json)["at"])).toEqual(["type_sales_start"]);
    expect(producers("on-sale").map((p) => (p["before"] as Json)["at"])).toEqual(["on_sale_at"]);
    expect([template("on-sale-presale").includes("reminder.type_sales_start"), template("on-sale-presale").includes("reminder.on_sale_at")]).toEqual([true, false]);
  });

  it("asks a claim to be confirmed by the offer's end, which is when it runs out", () => {
    expect(states("orders").timed).toContainEqual({ from: "confirming", to: "expired", at: { column: "offer_until", or: [{ column: "held_until" }] } });
    expect(producers("transfer-confirm-offer").map((p) => (p["onChange"] as Json)["where"])).toEqual([{ column: "waitlist_id", isNull: false }]);
    expect(producers("transfer-confirm").map((p) => (p["onChange"] as Json)["where"])).toEqual([{ column: "waitlist_id", isNull: true }]);
    expect(EMAIL_EN["transfer-confirm-offer"].paras[0]).toContain("{{order.offer_until.time}}");
  });
});

describe("the dashboard", () => {
  it("shows a show's status and never sets it: postponing and cancelling move the orders too", () => {
    const shows = (manifest["pages"] as Json[]).find((p) => p["ref"] === "events-shows")!;
    const fields = JSON.stringify(shows);
    expect(fields).toContain('{"column":"status","control":"readonly"}');
  });

  it("counts a festival's later days as tonight, and the tickets sold as its link opens them", () => {
    const layout = JSON.stringify((manifest["pages"] as Json[]).find((p) => p["ref"] === "events-overview"));
    expect(layout).toContain('{"and":[{"column":"kind","op":"eq","value":"festival"},{"column":"doors_at","op":"lt","day":"today"},{"column":"ends_at","op":"gte","day":"today"}]}');
    expect(layout).toContain('{"column":"doors_at","op":"gte","day":"today"}');
  });
});
