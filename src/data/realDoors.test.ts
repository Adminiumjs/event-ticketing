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
import manifest from "../../manifest.json" with { type: "json" };
import { AdminiumStaff, BOOLS, filterOf, normalizeCode, RATE_PATIENCE_MS, rowOf, wallToIso, writeRateWait } from "./adminiumStaff.ts";
import { offerPlan } from "./boxSteps.ts";
import { SessionPortError, type SessionTransport } from "./sessionSource.ts";
import { yes, type Row } from "./wire.ts";
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

describe("the box office's writes and reads against a real Adminium's answers", () => {
  // A transport that keeps the rows written in memory and answers the data API's shapes.
  function fakeServer(opts: { refuse?: (method: string, path: string, n: number) => number | null; total?: number; refuseGet?: (path: string, n: number) => SessionPortError | null } = {}) {
    const tables = new Map<string, Record<string, unknown>[]>();
    const writes: { method: string; path: string; body: unknown }[] = [];
    let id = 100;
    let n = 0;
    let reads = 0;
    const tableOf = (path: string) => decodeURIComponent(path.split("/")[5] ?? "").replace(/^events_/, "");
    const t = {
      connection: async () => "c1",
      refresh: async () => undefined,
      relation: async (child: string) => child,
      tableId: async (name: string) => name,
      get: async (path: string) => {
        const no = opts.refuseGet?.(path, (reads += 1)) ?? null;
        if (no !== null) throw no;
        const rows = tables.get(tableOf(path.split("?")[0]!)) ?? [];
        const one = /^\/api\/v1\/data\/[^/]+\/[^/?]+\/(\d+)$/.exec(path);
        if (one !== null) return { data: rows.find((r) => r["id"] === Number(one[1])) };
        const where = /where=([^&]+)/.exec(path)?.[1];
        const cond = where === undefined ? null : (JSON.parse(decodeURIComponent(where)) as { column?: string; value?: unknown; and?: { column: string; value: unknown }[] });
        const all = cond === null ? [] : (cond.and ?? [cond]);
        const hit = rows.filter((r) => all.every((c) => c.column === undefined || String(r[c.column]) === String(c.value)));
        const limit = Number(/limit=(\d+)/.exec(path)?.[1] ?? 50);
        const offset = Number(/offset=(\d+)/.exec(path)?.[1] ?? 0);
        return { data: hit.slice(offset, offset + limit), page: path.includes("count=exact") ? { total: opts.total ?? hit.length } : {} };
      },
      mutate: async (path: string, method: string, body?: unknown) => {
        n += 1;
        const refused = opts.refuse?.(method, path, n) ?? null;
        if (refused !== null) throw new SessionPortError("no", refused, refused === 429 ? "RATE_LIMITED" : refused === 409 ? "UNIQUE_VIOLATION" : "INTERNAL", refused === 429 ? { resetAt: new Date(Date.now() + 2_000).toISOString() } : {});
        writes.push({ method, path, body });
        const table = tableOf(path);
        const rows = tables.get(table) ?? [];
        tables.set(table, rows);
        const values = (body as { values?: Record<string, unknown> } | undefined)?.values ?? {};
        if (method === "POST") {
          const row = { id: (id += 1), ...values };
          rows.push(row);
          return { data: row };
        }
        const rowId = Number(path.split("/")[6]);
        const row = rows.find((r) => r["id"] === rowId) ?? { id: rowId };
        Object.assign(row, values);
        return { data: row };
      },
    } as unknown as SessionTransport;
    return { t, tables, writes };
  }
  const config = { connectionId: "c1", tables: {}, serverTimezone: "UTC", access: null } as unknown as StaffConfig;

  it("reads a yes/no that MySQL or SQLite answers as 0/1 as a yes/no, for every yes/no column the app has", () => {
    expect(rowOf({ id: "3", active: 0, required: "1", voided: 1, waitlist_on: "0", eve_email: true })).toEqual({ id: 3, active: false, required: true, voided: true, waitlist_on: false, eve_email: true });
    const bools = new Set<string>();
    const walk = (o: unknown): void => {
      if (Array.isArray(o)) return o.forEach(walk);
      if (o !== null && typeof o === "object") {
        if ((o as { type?: unknown }).type === "bool") bools.add(String((o as { ref?: unknown }).ref));
        Object.values(o).forEach(walk);
      }
    };
    walk(manifest);
    expect([...BOOLS].sort()).toEqual([...bools].sort());
    expect([yes(1), yes("1"), yes(true), yes(0), yes("0"), yes(false), yes(null)]).toEqual([true, true, true, false, false, false, false]);
  });

  it("sends a write refused for rate again, the same request, once the bucket has room — and never holds up the door", async () => {
    const waits: number[] = [];
    const server = fakeServer({ refuse: (_method, path, n) => (path.includes("payments") && n <= 2 ? 429 : path.includes("check_ins") ? 429 : null) });
    const port = new AdminiumStaff(server.t, config, { sleep: async (ms) => void waits.push(ms) });
    const paid = await port.recordPayment(7, 12, "cash");
    expect(paid["order_id"]).toBe(7);
    expect(server.writes.filter((w) => w.path.includes("payments")).length).toBe(1);
    expect(waits.length).toBe(2);
    expect(waits.every((ms) => ms >= 1_000 && ms <= 60_000)).toBe(true);
    await expect(port.checkIn(1, 2, null)).rejects.toMatchObject({ status: 429 });
    expect(waits.length).toBe(2);
    expect(writeRateWait({ resetAt: new Date(10_000).toISOString() }, 0)).toBe(10_250);
    expect(writeRateWait({}, 0)).toBe(5_000);
  });

  it("waits a 429 out for as long as Retry-After asks, whatever the server's clock says — reads too — telling who listens, within its patience", async () => {
    // A server whose clock is weeks from this device's (a test clock, a phone set wrong): its reset time says
    // nothing here, its Retry-After does.
    const limited = (ms: number) => new SessionPortError("Too many requests. Try again in 48 seconds.", 429, "RATE_LIMITED", { bucket: "api", limit: 300, resetAt: "2026-07-29T20:32:01.014Z" }, ms);
    const waits: number[] = [];
    const server = fakeServer({
      refuse: (method, path, n) => (method === "PATCH" && path.includes("messages") && n <= 2 ? 429 : null),
      refuseGet: (path, n) => (path.includes("orders") && n <= 1 ? limited(48_000) : null),
    });
    const t = server.t as unknown as { mutate: (...a: unknown[]) => Promise<unknown> };
    const mutate = t.mutate;
    t.mutate = async (...a: unknown[]) => {
      try {
        return await mutate(...a);
      } catch (error) {
        throw error instanceof SessionPortError && error.status === 429 ? limited(48_000) : error;
      }
    };
    server.tables.set("messages", [{ id: 5, status: "held" }]);
    server.tables.set("orders", [{ id: 7, status: "door" }]);
    const port = new AdminiumStaff(server.t, config, { sleep: async (ms) => void waits.push(ms) });
    const heard: (number | null)[] = [];
    const stop = port.onRateWait((until) => heard.push(until));
    expect((await port.update("messages", 5, { status: "queued" }))["status"]).toBe("queued");
    expect((await port.list("orders")).rows.map((r) => r.id)).toEqual([7]);
    expect(waits).toEqual([48_250, 48_250, 48_250]);
    expect(heard.length).toBe(6);
    expect(heard.filter((x) => x === null).length).toBe(3);
    stop();
    // Asked to wait longer than its patience in all: the refusal stands.
    const forever = fakeServer({ refuseGet: () => limited(RATE_PATIENCE_MS / 2) });
    const patient = new AdminiumStaff(forever.t, config, { sleep: async (ms) => void waits.push(ms) });
    await expect(patient.list("orders")).rejects.toMatchObject({ status: 429, code: "RATE_LIMITED" });
    expect(waits.slice(3)).toEqual([RATE_PATIENCE_MS / 2 + 250]);
    expect(writeRateWait({ resetAt: "2026-07-29T20:32:01.014Z" }, Date.parse("2026-09-29T00:00:00Z"), 41_000)).toBe(41_250);
  });

  it("says so when asked for every row and there are more than one read brings back", async () => {
    const server = fakeServer({ total: 25_000 });
    server.tables.set("tickets", [{ id: 1 }, { id: 2 }]);
    const port = new AdminiumStaff(server.t, config);
    await expect(port.rows("tickets")).rejects.toMatchObject({ code: "TOO_MANY_ROWS" });
    await expect(port.list("tickets", { limit: 20_000 })).rejects.toMatchObject({ code: "TOO_MANY_ROWS" });
    expect((await port.list("tickets", { limit: 2 })).total).toBe(25_000);
  });

  it("records a payment once per press: the same press sent again finds the payment it made", async () => {
    let first = true;
    const server = fakeServer({ refuse: (method, path) => (path.includes("payments") && method === "POST" && !first ? 409 : null) });
    const port = new AdminiumStaff(server.t, config);
    const made = await port.recordPayment(7, 96, "bank_transfer", null, "pay-1753720200000-abc123-00ff00ff");
    first = false;
    const again = await port.recordPayment(7, 96, "bank_transfer", null, "pay-1753720200000-abc123-00ff00ff");
    expect(again.id).toBe(made.id);
    expect(server.tables.get("payments")!.length).toBe(1);
    expect(made["client_key"]).toBe("pay-1753720200000-abc123-00ff00ff");
  });

  it("claims a message before sending, finishes one that stopped part-way, and never emails anyone twice", async () => {
    let stopAt = 4;
    const server = fakeServer({ refuse: (method, path, n) => (path.includes("messages") && method === "POST" && n === stopAt ? 500 : null) });
    const port = new AdminiumStaff(server.t, config);
    const to = [1, 2, 3, 4, 5, 6].map((o) => ({ order_id: o, to_address: `b${String(o)}@example.com` }));
    await expect(port.broadcast({ event_id: 9, template: "other", subject: "s", body: "b" }, to, true)).rejects.toBeTruthy();
    const b = server.tables.get("broadcasts")![0]!;
    expect(b["status"]).toBe("sending");
    stopAt = -1;
    await port.sendBroadcast(b["id"] as number, { subject: "changed" }, to);
    const mails = server.tables.get("messages")!;
    expect(mails.map((m) => m["order_id"]).sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(b["status"]).toBe("sent");
    // The words some already have are kept.
    expect(b["subject"]).toBe("s");
    // A waiting message is claimed from waiting: a second sender is refused by the state it names.
    const claims = server.writes.filter((w) => w.path.includes("broadcasts") && w.method === "PATCH").map((w) => (w.body as { from?: string }).from);
    expect(claims).toEqual(["waiting", "sending"]);
  });

  it("offers the places back type by type, never more than a pool has free", () => {
    const back = [{ id: 1, ticket_type_id: 10 }, { id: 2, ticket_type_id: 11 }, { id: 3, ticket_type_id: 11 }] as Row[];
    const plan = offerPlan(back, [{ id: 9, ticket_type_id: 11 }] as Row[], [
      { event_id: 1, ticket_type_id: 10, size: 5, taken: 5, held: 0, reserved: 0, left: 1 },
      { event_id: 1, ticket_type_id: 11, size: 5, taken: 5, held: 0, reserved: 0, left: 3 },
      { event_id: 1, ticket_type_id: null, size: 10, taken: 8, held: 0, reserved: 0, left: 5 },
    ]);
    expect(plan.take(3).sort()).toEqual([10, 11]);
    expect(plan.take(2)).toEqual([]);
    const tight = offerPlan(back, [], [{ event_id: 1, ticket_type_id: null, size: 10, taken: 9, held: 0, reserved: 0, left: 1 }]);
    expect(tight.take(4)).toHaveLength(1);
  });

  it("refuses a poster for a show not saved yet in the box office's words", async () => {
    const port = new AdminiumStaff(fakeServer().t, config);
    await expect(port.uploadPoster(new File(["x"], "p.jpg", { type: "image/jpeg" }), null)).rejects.toMatchObject({ code: "SAVE_FIRST" });
  });

  it("says what the person may do with each table, as Adminium told it", async () => {
    const port = new AdminiumStaff(fakeServer().t, { ...config, access: { roles: [{ slug: "events-door", name: "Door" }], tables: { check_ins: ["read", "create"] } }, user: { id: "1", name: "Sam", email: "sam@example.com" } } as unknown as StaffConfig);
    expect(await port.me()).toMatchObject({ roles: ["door"], tables: { check_ins: ["read", "create"] } });
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
