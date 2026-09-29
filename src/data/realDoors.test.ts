/**
 * The real doors' own reading and writing, without a server: the staff
 * screens' conditions in the data API's filter grammar, a zone-less time as
 * the moment it names on the server's clock, ids and money as numbers, a
 * typed code as Adminium compares one, and the audience's refusals as the
 * screens read them. The doors against a real Adminium are the contract's
 * (`src/contract/contract.test.ts`, three engines).
 */
import { PublicApiError } from "@adminiumjs/public-client";
import { describe, expect, it } from "vitest";

import { asApiError as audienceError, rowOf as audienceRow } from "./adminiumAudience.ts";
import { AdminiumStaff, filterOf, normalizeCode, rowOf, wallToIso } from "./adminiumStaff.ts";
import type { SessionTransport } from "./sessionSource.ts";
import type { StaffConfig } from "../staffConnection.ts";

const decode = (f: string | null) => (f === null ? null : (JSON.parse(decodeURIComponent(f)) as unknown));

describe("the staff screens' conditions, as the data API reads them", () => {
  it("writes each op a condition carries as its own, all of them joined", () => {
    expect(decode(filterOf([{ column: "event_id", eq: 2 }, { column: "status", in: ["door", "paid"] }, { column: "note", isNull: true }]))).toEqual({
      and: [
        { column: "event_id", op: "eq", value: 2 },
        { column: "status", op: "in", value: ["door", "paid"] },
        { column: "note", op: "is_null" },
      ],
    });
  });

  it("reads a search as contains-any-case, and one of `any` as an or", () => {
    expect(decode(filterOf([{ column: "event_id", eq: 2 }], [{ column: "holder_name", like: "mia" }, { column: "code", eq: "H3TW9CXR" }]))).toEqual({
      and: [
        { column: "event_id", op: "eq", value: 2 },
        { or: [{ column: "holder_name", op: "ilike", value: "%mia%" }, { column: "code", op: "eq", value: "H3TW9CXR" }] },
      ],
    });
  });

  it("sends a lone condition bare, and none at all as none", () => {
    expect(decode(filterOf([{ column: "doors_at", gte: "2026-07-28T10:00:00.000Z", lt: "2026-07-29T10:00:00.000Z" }]))).toEqual({
      and: [
        { column: "doors_at", op: "gte", value: "2026-07-28T10:00:00.000Z" },
        { column: "doors_at", op: "lt", value: "2026-07-29T10:00:00.000Z" },
      ],
    });
    expect(decode(filterOf([{ column: "id", eq: 7 }]))).toEqual({ column: "id", op: "eq", value: 7 });
    expect(filterOf([], [])).toBeNull();
  });
});

describe("a time the server keeps without a zone", () => {
  it("is the moment it names on the server's clock", () => {
    expect(wallToIso("2026-07-29 01:59:17.183", "Europe/Berlin")).toBe("2026-07-28T23:59:17.183Z");
    expect(wallToIso("2026-07-28 19:58:00", "America/New_York")).toBe("2026-07-28T23:58:00.000Z");
    expect(wallToIso("2026-01-15 12:00", "UTC")).toBe("2026-01-15T12:00:00.000Z");
  });

  it("across a clock change keeps the offset of the moment itself", () => {
    // The last Sunday of October 2026, Berlin: 03:00 summer time becomes 02:00 winter time.
    expect(wallToIso("2026-10-25 12:00:00", "Europe/Berlin")).toBe("2026-10-25T11:00:00.000Z");
    expect(wallToIso("2026-10-24 12:00:00", "Europe/Berlin")).toBe("2026-10-24T10:00:00.000Z");
  });

  it("leaves a time that says its zone, and anything else, as it is", () => {
    expect(wallToIso("2026-07-29T00:00:00.000Z", "Europe/Berlin")).toBe("2026-07-29T00:00:00.000Z");
    expect(wallToIso("Main Hall", "Europe/Berlin")).toBe("Main Hall");
  });
});

describe("a row as the screens read one", () => {
  it("has its ids and money as numbers, and its times as moments", () => {
    expect(rowOf({ id: "12", order_id: "7", total: "56.00", balance: "-28.50", number: "WV-1001", scanned_at: "2026-07-29 01:59:17.183", code: "0123" }, "Europe/Berlin")).toEqual({
      id: 12,
      order_id: 7,
      total: 56,
      balance: -28.5,
      number: "WV-1001",
      scanned_at: "2026-07-28T23:59:17.183Z",
      code: "0123",
    });
  });

  it("keeps a moment a moment when a money column shares its name (a message's due)", () => {
    expect(rowOf({ id: "4", kind: "tonight", due: "2026-08-14 12:00:00" }, "America/New_York")).toEqual({ id: 4, kind: "tonight", due: "2026-08-14T16:00:00.000Z" });
    expect(rowOf({ id: "5", due: "2026-08-14T16:00:00.000Z" }, "UTC")["due"]).toBe("2026-08-14T16:00:00.000Z");
  });

  it("the audience's too (its times are already moments)", () => {
    expect(audienceRow({ id: "3", ticket_type_id: "9", price: "28.00", held_until: "2026-07-28T20:41:43.868Z" })).toEqual({ id: 3, ticket_type_id: 9, price: 28, held_until: "2026-07-28T20:41:43.868Z" });
  });
});

describe("a typed code", () => {
  it("is compared as Adminium draws them: capitals, no dash or space, O as 0, I and L as 1", () => {
    expect(normalizeCode("h3tw-9cxr")).toBe("H3TW9CXR");
    expect(normalizeCode(" K7QX M2PD ")).toBe("K7QXM2PD");
    expect(normalizeCode("OIL1-abcd")).toBe("0111ABCD");
  });
});

describe("the audience's refusals", () => {
  it("reach the screens as Adminium said them: status, code and what it said beside", () => {
    const e = audienceError(new PublicApiError("PUBLIC_SOLD_OUT", 409, "That is sold out.", undefined, { child: "tickets", index: 0 })) as { status: number; code: string; params: Record<string, unknown> };
    expect([e.status, e.code, e.params]).toEqual([409, "PUBLIC_SOLD_OUT", { child: "tickets", index: 0 }]);
  });
});

describe("a list the box office reads", () => {
  // A transport that answers every read with 3 of 784 rows, and keeps what it was asked.
  const asked: string[] = [];
  const t = { connection: async () => "c1", get: async (path: string) => (asked.push(path), { data: [{ id: 1 }, { id: 2 }, { id: 3 }], page: path.includes("count=exact") ? { total: 784 } : {} }) } as unknown as SessionTransport;
  const port = new AdminiumStaff(t, { connectionId: "c1", tables: {}, serverTimezone: "UTC" } as unknown as StaffConfig);

  it("counts when only its number is wanted (a chip's), and counts the first page of rows", async () => {
    asked.length = 0;
    expect(await port.list("orders", { limit: 0 })).toEqual({ rows: [], total: 784 });
    expect((await port.list("orders", { limit: 3 })).total).toBe(784);
    expect(asked.map((p) => p.includes("count=exact"))).toEqual([true, true]);
  });
});

describe("the door's own requests", () => {
  /** A transport that answers the door's reads and writes from a few rows, and keeps each request and its deadline. */
  function door(order: Record<string, unknown>) {
    const asked: { how: string; path: string; body?: unknown; deadline?: number }[] = [];
    const ended: (() => void)[] = [];
    const t = {
      connection: async () => "c1",
      get: async (path: string, o?: { deadlineMs?: number }) => {
        asked.push({ how: "GET", path, ...(o?.deadlineMs === undefined ? {} : { deadline: o.deadlineMs }) });
        return path.includes("/events_orders/") ? { data: order } : { data: [] };
      },
      mutate: async (path: string, how: string, body?: unknown, o?: { deadlineMs?: number }) => {
        asked.push({ how, path, body, ...(o?.deadlineMs === undefined ? {} : { deadline: o.deadlineMs }) });
        if (path.endsWith("/events_door_collections")) return { data: { id: 5, ticket_id: 3, order_id: 9 } };
        return { data: { ...order, ...((body as { values: Record<string, unknown> }).values ?? {}) } };
      },
      refresh: async () => undefined,
      onSessionEnded: (fn: () => void) => void ended.push(fn),
    } as unknown as SessionTransport;
    return { port: new AdminiumStaff(t, { connectionId: "c1", tables: {}, serverTimezone: "UTC" } as unknown as StaffConfig), asked, ended };
  }

  it("pays a held door sale once its money is taken, never through pay-at-the-door", async () => {
    const { port, asked } = door({ id: 9, status: "held", balance: "0.00" });
    await port.collect(3, "cash", 1);
    expect(asked.map((a) => `${a.how} ${a.path.replace("/api/v1/data/c1/", "")}`)).toEqual(["POST events_door_collections", "GET events_orders/9", "PATCH events_orders/9"]);
    expect(asked[2]!.body).toEqual({ values: { status: "paid", paid_method: "cash" }, from: "held" });
  });

  it("leaves an order that still owes money as it is", async () => {
    const { port, asked } = door({ id: 9, status: "door", balance: "28.00" });
    expect((await port.settle(9, "card"))["status"]).toBe("door");
    expect(asked.map((a) => a.how)).toEqual(["GET"]);
  });

  it("gives every scan's read and write a short deadline", async () => {
    const { port, asked } = door({ id: 9, status: "paid", balance: "0.00" });
    await port.find("K7QX-M2PD", 2);
    await port.checkIn(3, 2, 1);
    await port.ping();
    expect(asked.every((a) => a.deadline === 6_000)).toBe(true);
    expect(asked.length).toBeGreaterThan(2);
  });

  it("tells the screens when the session has ended", async () => {
    const { port, ended } = door({ id: 9, status: "paid" });
    let heard = 0;
    port.onSessionEnded(() => (heard += 1));
    for (const fn of ended) fn();
    expect(heard).toBe(1);
  });
});
