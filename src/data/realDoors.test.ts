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
