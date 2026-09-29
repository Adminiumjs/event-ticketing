/**
 * THE VENUE'S CONTRACT WITH ADMINIUM, ON EVERY ENGINE.
 *
 * This repo's own `manifest.json` and sample, installed on a BUILT Adminium
 * (with Invoices & Receipts when an add-ons checkout is beside it), on SQLite,
 * Postgres and MySQL:
 *
 *   1. install — every rule kept, the four browser keys made, the outbox on;
 *   2. the sample added at 16:30 on Tuesday 28 July 2026: every show's money
 *      and every order's total as the rows work them out, the same as the
 *      demo's loader;
 *   3. the box office's counts: Neon Circuit's pools;
 *   4. a buyer orders two Neon Standard tickets through the public API:
 *      priced by the dry run, written once with its tickets, the venue's
 *      first number, a retry replayed without the link — and through the
 *      order's own link cannot mark it "no charge";
 *   5. the door: a check-in for an uncollected pay-at-the-door ticket is
 *      refused, a collected one is let in once;
 *   6. the sample removed.
 *
 * It runs when asked (`ADMINIUM_CONTRACT=1`) where an Adminium checkout with
 * its built server and dashboard is (`ADMINIUM_REPO`), and says why it
 * skipped when it is not; `ADMINIUM_REQUIRE_CONTRACT=1` makes that a failure
 * (the contract workflow sets it). Postgres and MySQL run with
 * `TEST_POSTGRES_URL` / `TEST_MYSQL_URL`.
 *
 * An Adminium that does not build some of the rules orders and tickets need
 * yet answers their writes `RULE_NOT_BUILT`; then everything after the
 * install is skipped, saying so — and with `ADMINIUM_REQUIRE_CONTRACT=1` it
 * fails instead.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { COLUMNS, resolveSample } from "../data/sampleRows.ts";
import { DEMO_BUNDLE, DEMO_CURRENCY, DEMO_START, DEMO_ZONE } from "../demo/world.ts";
import { AdminiumAudience } from "../data/adminiumAudience.ts";
import { AdminiumStaff } from "../data/adminiumStaff.ts";
import { createSessionTransport } from "../data/sessionSource.ts";
import type { StaffConfig } from "../staffConnection.ts";
import { addOnBundle, appBundle, boot, Caller, ENGINES, missing, ok, PORTS_PER_ENGINE, solve, until, withInvoices, type Engine, type Server } from "./harness.ts";

type Row = Record<string, unknown> & { id: number };

const why = missing();
const REQUIRED = process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1";
if (why !== null && REQUIRED) throw new Error(`the contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 8670);
const ADMIN = { email: process.env["E2E_ADMIN_EMAIL"] ?? "e2e@adminium.local", password: process.env["E2E_ADMIN_PASSWORD"] ?? "adminium-e2e-password" };

/** The sample as the demo's loader resolves it: what every engine must hold. */
const SAMPLE = resolveSample(DEMO_BUNDLE, { now: DEMO_START, zone: DEMO_ZONE, locale: "en-US", currency: DEMO_CURRENCY });

describe.skipIf(why !== null)(`the contract with a built Adminium${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    describe.skipIf(!available)(`on ${engine}`, () => {
      let server: Server;
      let staff: Caller;
      let connectionId = "";
      let real: Record<string, string> = {};
      let tableIds: Record<string, string> = {};
      /** Why the writes after the install cannot run on this Adminium, or null. */
      let notBuilt: string | null = null;

      beforeAll(async () => {
        server = await boot(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, DEMO_START);
        staff = new Caller(server.base, { origin: server.base });
        await staff.signIn(ADMIN.email, ADMIN.password);
        const connections = ok(await staff.get<{ connections: { id: string; name: string }[] }>("/api/v1/connections"));
        connectionId = connections.connections.find((c) => c.name === "northwind")!.id;
      }, 240_000);

      afterAll(async () => {
        await server?.stop();
      });

      const data = (ref: string) => `/api/v1/data/${connectionId}/${encodeURIComponent(tableIds[ref]!)}`;
      const rows = async (ref: string): Promise<Row[]> => {
        const out: Row[] = [];
        for (let offset = 0; ; offset += 200) {
          const page = ok(await staff.get<{ data: Row[] }>(`${data(ref)}?limit=200&offset=${String(offset)}`)).data;
          out.push(...page);
          if (page.length < 200) return out;
        }
      };
      const money = (value: unknown) => Number(value ?? 0).toFixed(2);
      /** Skip, saying why, when this Adminium does not build the orders' rules yet (a failure when the contract is required). */
      const needsWrites = (skip: () => void) => {
        if (notBuilt === null) return;
        if (REQUIRED) throw new Error(notBuilt);
        skip();
      };

      it("installs the app, keeping every rule, the four browser keys and the outbox", async () => {
        const invoices = withInvoices();
        if (invoices) {
          const addOn = addOnBundle();
          ok(await staff.post(`/api/v1/add-ons/upload?expectedSha512=${encodeURIComponent(addOn.integrity)}`, addOn.buffer));
        }
        const app = appBundle();
        const staged = await staff.post(`/api/v1/apps/upload?expectedSha512=${encodeURIComponent(app.integrity)}`, app.buffer);
        expect([200, 201], JSON.stringify(staged.body).slice(0, 800)).toContain(staged.status);
        const body = { key: app.key, version: app.version, connectionId };
        const plan = ok(await staff.post<{ plan: { installable: boolean; checksum: string; addOns: { key: string; need: string; checked: boolean }[] } }>("/api/v1/apps/plan", body)).plan;
        expect(plan.installable).toBe(true);
        // Invoices & Receipts is offered, ticked, for receipts; nothing waits on it.
        expect(plan.addOns.map((a) => [a.key, a.checked])).toEqual([["invoices", true]]);
        const installed = ok(
          await staff.post<{ rules: { skipped: unknown[] }; schema: { created: string[] }; publicAccess: { keys: Record<string, string> }; outbox: { defined: boolean } }>(
            "/api/v1/apps/install",
            { ...body, planChecksum: plan.checksum, ...(invoices ? { addOns: [{ key: "invoices", version: addOnBundle().version }] } : {}) },
          ),
        );
        const created = installed.schema.created;
        const prefix = created.find((name) => name.endsWith("door_collections"))!.slice(0, -"door_collections".length);
        real = Object.fromEntries(created.map((name) => [name.slice(prefix.length), name]));
        expect(Object.keys(real).sort()).toEqual(Object.keys(COLUMNS).sort());
        const schema = ok(await staff.get<{ model: { tables: { id: string; name: string }[] } }>(`/api/v1/connections/${connectionId}/schema`));
        tableIds = Object.fromEntries(Object.entries(real).map(([ref, name]) => [ref, schema.model.tables.find((t) => t.name === name)!.id]));
        ok(await staff.patch(`/api/v1/connections/${connectionId}`, { timezone: DEMO_ZONE, currency: DEMO_CURRENCY }));
        expect(JSON.stringify(installed.rules.skipped)).toBe("[]");
        expect(Object.keys(installed.publicAccess.keys).sort()).toEqual(["confirm", "customer", "link", "ticket"]);
        expect(installed.outbox.defined).toBe(true);
      }, 180_000);

      it("adds the sample at 16:30 on 28 July: every show's money and every order's total as the rows work them out", async (ctx) => {
        const added = await staff.post("/api/v1/apps/events/sample-data");
        if (added.status === 501 && added.code === "RULE_NOT_BUILT") notBuilt = `this Adminium does not build ${JSON.stringify(added.details)} yet`;
        needsWrites(() => ctx.skip());
        ok(added, added.status === 202 ? 202 : 200);
        // Postgres and MySQL take several minutes over the 4,500 rows and their rules.
        await until(async () => (ok(await staff.get<{ loaded: boolean }>("/api/v1/apps/events/sample-data")).loaded ? true : undefined), "the sample to be added", 900_000);
        const events = await rows("events");
        for (const expected of SAMPLE["events"]!) {
          const event = events.find((e) => e["name"] === expected["name"])!;
          for (const column of ["received", "refunded", "owed_door", "owed_transfer", "owed_overdue"]) {
            expect(money(event[column]), `${String(expected["name"])} ${column}`).toBe(money(expected[column]));
          }
        }
        const orders = await rows("orders");
        for (const expected of SAMPLE["orders"]!) {
          const order = orders.find((o) => o["number"] === expected["number"])!;
          expect(order["status"], String(expected["number"])).toBe(expected["status"]);
          for (const column of ["subtotal", "discount", "total", "paid_in", "collected", "refunded", "balance"]) {
            expect(money(order[column]), `${String(expected["number"])} ${column}`).toBe(money(expected[column]));
          }
        }
      }, 1_000_000);

      it("counts Neon Circuit's pools for the box office: Standard 14 left, 3 held", async (ctx) => {
        needsWrites(() => ctx.skip());
        const events = await rows("events");
        const neon = events.find((e) => e["name"] === "Neon Circuit")!;
        const answer = ok(await staff.get<{ data: { rows: { id: string; size: number; taken: number; held?: number }[] } }>(`${data("tickets")}/capacity-counts?rule=0&under=event_id&value=${String(neon.id)}`)).data.rows;
        const types = await rows("ticket_types");
        const standard = String(types.find((t) => t["event_id"] === neon.id && t["name"] === "Standard")!.id);
        const pool = answer.find((c) => c.id === standard)!;
        // For the box office, taken includes what checkouts hold. WV-S8815's hold is 10 minutes from 16:30:
        // an engine that took longer to add the sample has let it go already.
        const hold = (await rows("orders")).find((o) => o["number"] === "WV-S8815")!;
        const held = hold["status"] === "held" ? 3 : 0;
        expect([pool.size, pool.taken - (pool.held ?? 0), pool.held ?? 0]).toEqual([260, 243, held]);
      }, 60_000);

      it("lets a buyer order two Neon Standard tickets, priced by the dry run, written once", async (ctx) => {
        needsWrites(() => ctx.skip());
        ok(await staff.put("/api/v1/public-api", { enabled: true }));
        const config = ok(await new Caller(server.base).get<{ publishableKey: string }>("/apps/events/customer/surface-config.json"));
        const buyer = new Caller(server.base, { authorization: `Bearer ${config.publishableKey}`, origin: server.base });
        const refs = ok(await buyer.get<{ data: { refs: Record<string, { actions: string[]; writable: string[] }> } }>("/api/v1/public/config")).data.refs;
        const door = Object.entries(refs).find(([ref, r]) => ref.startsWith(real["orders"]!) && r.actions.includes("create"))![0];
        const events = await rows("events");
        const neon = events.find((e) => e["name"] === "Neon Circuit")!;
        const types = await rows("ticket_types");
        const standard = types.find((t) => t["event_id"] === neon.id && t["name"] === "Standard")!.id;
        const body = {
          values: { event_id: neon.id, room_id: neon["room_id"], buyer_name: "Lee Tan", email: "lee.tan@waveform.test", language: "en-US", client_key: "c".repeat(43) },
          children: { tickets: [{ values: { ticket_type_id: standard } }, { values: { ticket_type_id: standard } }] },
        };
        const quote = ok(await buyer.post<{ data: Record<string, unknown> }>(`/api/v1/public/records/${door}/dry-run`, body)).data;
        expect(money(quote["total"])).toBe("56.00");
        const proof = async () => {
          const challenge = ok(await buyer.get<{ data: { id: string; salt: string; difficulty: number } }>("/api/v1/public/challenge?purpose=write")).data;
          return { "x-adminium-proof": `${challenge.id}.${solve(challenge.salt, challenge.difficulty)}` };
        };
        const made = ok(await buyer.post<{ data: Row; link?: { token: string } }>(`/api/v1/public/records/${door}`, { ...body, expect: { total: "56.00" } }, await proof()), 201);
        expect([made.data["number"], made.data["status"]]).toEqual(["WV-1001", "held"]);
        expect(made.link?.token).toBeDefined();
        const again = ok(await buyer.post<{ data: Row; replayed?: boolean; link?: unknown }>(`/api/v1/public/records/${door}`, { ...body, expect: { total: "56.00" } }, await proof()));
        expect([again.data.id, again.replayed, again.link]).toEqual([made.data.id, true, undefined]);

        // Through the order's own link, the buyer cannot mark a priced order "no charge": its tickets stay unpaid.
        const linkKey = (config as { publicKeys?: Record<string, string> }).publicKeys?.["link"];
        expect(linkKey).toBeDefined();
        const owner = new Caller(server.base, { authorization: `Bearer ${linkKey!}`, origin: server.base });
        const session = ok(await owner.post<{ data: { session: string } }>("/api/v1/public/claim/token", { token: made.link!.token })).data.session;
        const free = await owner.patch(`/api/v1/public/records/${real["orders"]!}_claimed/${String(made.data.id)}`, { values: { status: "no_charge" } }, { "x-adminium-public-session": session });
        // The public door never names the rule that refused it (staff get 409 STATE_MOVE_REFUSED {requires: total}).
        expect([free.status, free.code, free.details]).toEqual([400, "PUBLIC_WRITE_REFUSED", {}]);
        const order = (await rows("orders")).find((o) => o.id === made.data.id)!;
        expect(order["status"]).toBe("held");
        const tickets = (await rows("tickets")).filter((t) => t["order_id"] === made.data.id);
        expect(tickets.map((t) => Number(t["settled"]))).toEqual([0, 0]);
      }, 120_000);

      // ── the evening, through the app's own doors (the ports the screens use) ──────────────

      const venueAt = (local: string) => Date.parse(`${local}:00-04:00`);
      /** The audience's own door, as a page on the server's origin opens it. */
      const audience = async () => {
        const served = ok(await new Caller(server.base).get<{ publishableKey: string; publicKeys: Record<string, string>; tables: Record<string, string> }>("/apps/events/customer/surface-config.json"));
        const originFetch = ((input: RequestInfo | URL, init?: RequestInit) => {
          const headers = new Headers(input instanceof Request ? input.headers : undefined);
          new Headers(init?.headers).forEach((v, k) => headers.set(k, v));
          headers.set("origin", server.base);
          return fetch(input, { ...init, headers });
        }) as typeof fetch;
        return new AdminiumAudience({ baseUrl: server.base, publishableKey: served.publishableKey, publicKeys: served.publicKeys, tables: served.tables }, { storage: null, fetch: originFetch });
      };
      /** The box office's and the door's own door, as a person signed in to Adminium. */
      const staffPort = async (who: { email: string; password: string }) => {
        const caller = new Caller(server.base, { origin: server.base });
        ok(await caller.post("/api/v1/auth/login", who));
        const read = async () => ok(await caller.get<StaffConfig>("/apps/events/staff/surface-config.json"));
        const cfg = await read();
        const transport = createSessionTransport({
          tableOfRef: cfg.tables,
          connectionId: cfg.connectionId ?? undefined,
          staff: { csrfToken: cfg.csrfToken, timezone: cfg.timezone, timezoneSource: cfg.timezoneSource, serverTimezone: cfg.serverTimezone, currency: cfg.currency },
          refreshToken: async () => (await read()).csrfToken,
          fetchImpl: caller.fetchAs(),
        });
        return new AdminiumStaff(transport, cfg);
      };
      /** A refusal's status, code and what it said — or null when the write went through. */
      const refusal = async (run: () => Promise<unknown>) => {
        try {
          await run();
          return null;
        } catch (error) {
          const x = error as { status?: number; code?: string; params?: Record<string, unknown> };
          return { status: x.status, code: x.code, params: x.params ?? {} };
        }
      };
      const key = (what: string) => `${what}-${engine}-${String(Date.now())}-${Math.random().toString(36).slice(2, 14)}`;
      /** The sample's orders the evening wrote rows under (check-ins, money, a claim): they outlive the sample. */
      const touched = new Set<number>();
      const DOOR_PERSON = { email: "sam.door@waveform.test", password: `door-${Math.random().toString(36).slice(2)}-${String(Date.now())}` };

      it("sells through the audience's own doors: a hold, names, pay at the door; a transfer confirmed by its emailed link", async (ctx) => {
        needsWrites(() => ctx.skip());
        const aud = await audience();
        const venue = await aud.venue();
        const neon = venue.events.find((e) => e["name"] === "Neon Circuit")!;
        const cinder = venue.events.find((e) => e["name"] === "Cinder")!;
        const typeOf = (show: Row, name: string) => venue.types.find((t) => t["event_id"] === show.id && t["name"] === name)!;
        const left = await aud.left(neon.id);
        expect(left.find((l) => l.ticket_type_id === typeOf(neon, "Balcony — seated, unreserved").id)).toEqual({ ticket_type_id: typeOf(neon, "Balcony — seated, unreserved").id, state: "open", left: 9 });
        const body = { values: { event_id: neon.id, room_id: neon["room_id"], buyer_name: "Ana Ruiz", email: "ana.contract@example.com", language: "en-US" }, tickets: [{ ticket_type_id: typeOf(neon, "Standard").id }, { ticket_type_id: typeOf(neon, "Standard").id }] };
        expect((await aud.quote(body)).data["total"]).toBe(56);
        const made = await aud.buy({ ...body, expect: { total: 56 } }, key("buy"));
        expect([made.data["status"], made.link?.key]).toEqual(["held", "link"]);
        const held = await aud.order();
        for (const [i, t] of held.tickets.entries()) await aud.nameTicket(t.id, ["Ana Ruiz", "Jo Petrak"][i]!);
        expect((await aud.choose("door"))["status"]).toBe("door");
        const confirmed = await aud.order();
        expect([confirmed.order["balance"], confirmed.tickets.map((t) => t["holder_name"]), confirmed.tickets.every((t) => typeof t["code"] === "string")]).toEqual([56, ["Ana Ruiz", "Jo Petrak"], true]);

        // By transfer: the checkout waits for its emailed confirm link, which moves it on to waiting for the money.
        const xfer = await audience();
        const xbody = { values: { event_id: cinder.id, room_id: cinder["room_id"], buyer_name: "Jo Petrak", email: "jo.contract@example.com", language: "en-US" }, tickets: [{ ticket_type_id: typeOf(cinder, "Standard").id }] };
        const total = Number((await xfer.quote(xbody)).data["total"]);
        await xfer.buy({ ...xbody, expect: { total } }, key("xfer"));
        expect((await xfer.choose("confirming"))["status"]).toBe("confirming");
        const box = await staffPort(ADMIN);
        const order = (await box.list("orders", { where: [{ column: "email", eq: "jo.contract@example.com" }] })).rows[0]!;
        expect((await (await audience()).confirmTransfer(String(order["confirm_token"])))["status"]).toBe("awaiting_transfer");
      }, 180_000);

      it("runs the box office's writes: a sale paid now and its retry, comps refused when all are issued, a transfer paid, a part cancel and its refund", async (ctx) => {
        needsWrites(() => ctx.skip());
        const box = await staffPort(ADMIN);
        const events = await box.rows("events");
        const types = await box.rows("ticket_types");
        const neon = events.find((e) => e["name"] === "Neon Circuit")!;
        const typeOf = (name: string) => types.find((t) => t["event_id"] === neon.id && t["name"] === name)!;
        const body = { values: { event_id: neon.id, buyer_name: "Walk-in", channel: "box_office" }, tickets: [{ ticket_type_id: typeOf("Standard").id }, { ticket_type_id: typeOf("Standard").id }], expect: { total: 56 } };
        const k = key("sale");
        const sale = await box.newOrder(body, k);
        expect([sale.data["status"], sale.tickets.length, Number(sale.data["total"])]).toEqual(["held", 2, 56]);
        expect((await box.newOrder(body, k)).replayed).toBe(true);
        await box.recordPayment(sale.data.id, 56, "card");
        expect((await box.move(sale.data.id, "paid"))["status"]).toBe("paid");
        expect(await refusal(() => box.move(sale.data.id, "paid"))).toMatchObject({ status: 409, code: "STATE_UNCHANGED" });
        // Comps: all 4 are issued.
        expect(await refusal(() => box.newOrder({ values: { event_id: neon.id, channel: "box_office" }, tickets: [{ ticket_type_id: typeOf("Comps").id }] }, key("comps")))).toMatchObject({ status: 409, code: "CAPACITY_FULL" });
        // The transfer the buyer confirmed, paid in full, is paid.
        const waiting = (await box.list("orders", { where: [{ column: "email", eq: "jo.contract@example.com" }] })).rows[0]!;
        await box.recordPayment(waiting.id, Number(waiting["balance"]), "bank_transfer");
        expect((await box.move(waiting.id, "paid"))["status"]).toBe("paid");
        // One ticket of the paid sale cancelled: the money for it is due back, then recorded as given back.
        await box.cancelTickets([sale.tickets[0]!.id], "box_office");
        const after = (await box.list("orders", { where: [{ column: "id", eq: sale.data.id }] })).rows[0]!;
        expect([after["status"], Number(after["balance"])]).toEqual(["paid", -28]);
        await box.recordRefund(sale.data.id, 28, "card", "cancelled_tickets");
        expect(Number((await box.list("orders", { where: [{ column: "id", eq: sale.data.id }] })).rows[0]!["balance"])).toBe(0);
      }, 180_000);

      it("takes a refund request through the order's own link: one approved, one declined", async (ctx) => {
        needsWrites(() => ctx.skip());
        const aud = await audience();
        const venue = await aud.venue();
        const cinder = venue.events.find((e) => e["name"] === "Cinder")!;
        const std = venue.types.find((t) => t["event_id"] === cinder.id && t["name"] === "Standard")!;
        const body = { values: { event_id: cinder.id, room_id: cinder["room_id"], buyer_name: "Kai Renner", email: "kai.contract@example.com", language: "en-US" }, tickets: [{ ticket_type_id: std.id }, { ticket_type_id: std.id }] };
        await aud.buy({ ...body, expect: { total: Number((await aud.quote(body)).data["total"]) } }, key("ask"));
        await aud.choose("door");
        const [a, b] = (await aud.order()).tickets;
        expect([(await aud.askRefund(a!.id))["status"], (await aud.askRefund(b!.id))["status"]]).toEqual(["refund_asked", "refund_asked"]);
        const box = await staffPort(ADMIN);
        await box.cancelTickets([a!.id], "request");
        expect((await box.declineRefund(b!.id))["status"]).toBe("valid");
        const now = (await box.list("tickets", { where: [{ column: "id", in: [a!.id, b!.id] }], sort: [{ column: "id" }] })).rows;
        expect(now.map((t) => [t["status"], t["cancel_cause"]])).toEqual([
          ["cancelled", "request"],
          ["valid", null],
        ]);
      }, 180_000);

      it("claims part of a waitlist offer through its own link: one kept, one back for the next in line", async (ctx) => {
        needsWrites(() => ctx.skip());
        const box = await staffPort(ADMIN);
        const offer = (await box.list("orders", { where: [{ column: "number", eq: "WV-S8814" }] })).rows[0]!;
        touched.add(offer.id);
        const aud = await audience();
        await aud.openOrder(String(offer["link_token"]));
        expect((await aud.order()).tickets.length).toBe(2);
        expect((await aud.choose("door", 1))["status"]).toBe("door");
        const tickets = (await box.list("tickets", { where: [{ column: "order_id", eq: offer.id }], sort: [{ column: "id" }] })).rows;
        expect(tickets.map((t) => t["status"])).toEqual(["valid", "returned"]);
      }, 120_000);

      it("releases an overdue transfer at Tuesday 18:00", async (ctx) => {
        needsWrites(() => ctx.skip());
        const box = await staffPort(ADMIN);
        await server.moveClock(venueAt("2026-07-28T18:01"));
        await until(async () => ((await box.list("orders", { where: [{ column: "number", eq: "WV-S8793" }] })).rows[0]?.["status"] === "released" ? true : undefined), "WV-S8793 released", 180_000);
      }, 240_000);

      it("runs the door at 19:58 as a door person: let in, again, money first, wrong show, a late replay, undo, a sale — and nothing past the door's role", async (ctx) => {
        needsWrites(() => ctx.skip());
        const roles = ok(await staff.get<{ data?: { id: string; slug: string }[]; roles?: { id: string; slug: string }[] }>("/api/v1/roles"));
        const doorRole = (roles.data ?? roles.roles ?? []).find((r) => r.slug === "events-door")!;
        const invited = await staff.post("/api/v1/users", { email: DOOR_PERSON.email, name: "Sam", roleIds: [doorRole.id] });
        const token = JSON.stringify(invited.body).match(/\/reset\/([A-Za-z0-9_-]+)/)![1]!;
        ok(await new Caller(server.base, { origin: server.base }).post("/api/v1/auth/password/reset", { token, newPassword: DOOR_PERSON.password }));
        await server.moveClock(venueAt("2026-07-28T19:58"));
        const door = await staffPort(DOOR_PERSON);
        expect((await door.me()).roles).toEqual(["door"]);
        const neon = (await door.rows("events")).find((e) => e["name"] === "Neon Circuit")!;
        const day = (await door.rows("event_days")).find((d) => d["event_id"] === neon.id)!;
        const find = async (code: string) => {
          const hit = (await door.find(code, day.id))!;
          touched.add(hit.order.id);
          return hit;
        };
        const first = await door.checkIn((await find("NG7T-6G8C")).ticket.id, day.id, 1);
        expect(first["scanned_by"]).toBe("Sam");
        expect(await refusal(async () => door.checkIn((await find("ng7t6g8c")).ticket.id, day.id, 1))).toMatchObject({ status: 409, code: "UNIQUE_VIOLATION" });
        expect(await refusal(async () => door.checkIn((await find("H3TW-9CXR")).ticket.id, day.id, 1))).toMatchObject({ status: 409, code: "STATE_MOVE_REFUSED", params: { requires: "linked", column: "settled" } });
        await door.collect((await find("H3TW-9CXR")).ticket.id, "card", 1);
        await door.collect((await find("P4MA-7VKE")).ticket.id, "cash", 1);
        expect((await find("P4MA-7VKE")).order["status"]).toBe("paid");
        expect((await door.checkIn((await find("H3TW-9CXR")).ticket.id, day.id, 1))["status"]).toBe("in");
        expect(await refusal(async () => door.checkIn((await find("YDG2-C508")).ticket.id, day.id, 1))).toMatchObject({ status: 409, code: "STATE_MOVE_REFUSED", params: { requires: "right_show" } });
        const now = Date.parse((await door.config()).now!);
        const replay = await door.checkIn((await find("328V-F2CK")).ticket.id, day.id, 1, now - 10 * 60_000);
        expect(Math.abs(Date.parse(String(replay["scanned_at"])) - (now - 10 * 60_000))).toBeLessThan(2_000);
        expect(await refusal(async () => door.checkIn((await find("W9S9-QH7R")).ticket.id, day.id, 1, now - 7 * 3_600_000))).toMatchObject({ status: 422, code: "VALIDATION_FAILED" });
        await door.undo(first.id);
        expect((await find("NG7T-6G8C")).checkIn).toBeNull();
        const std = (await door.rows("ticket_types")).find((t) => t["event_id"] === neon.id && t["name"] === "Standard")!;
        const sale = await door.newOrder({ values: { event_id: neon.id, buyer_name: "Door sale", channel: "door", email: null }, tickets: [{ ticket_type_id: std.id }, { ticket_type_id: std.id }] }, key("door-sale"));
        await door.move(sale.data.id, "door");
        for (const t of sale.tickets) await door.collect(t.id, "card", 1);
        for (const t of sale.tickets) await door.checkIn(t.id, day.id, 1);
        expect((await door.list("orders", { where: [{ column: "id", eq: sale.data.id }] })).rows[0]!["status"]).toBe("paid");
        expect(await refusal(() => door.list("waitlist", { limit: 1 }))).toMatchObject({ status: 403, code: "TABLE_FORBIDDEN" });
        expect(await refusal(() => door.move(sale.data.id, "cancelled"))).toMatchObject({ status: 403, code: "COLUMN_FORBIDDEN" });
        expect(await refusal(() => door.recordPayment(sale.data.id, 1, "cash"))).toMatchObject({ status: 403, code: "TABLE_FORBIDDEN" });
      }, 240_000);

      it("sells the last Balcony seat once, lets one code in once from two phones, and takes a ticket's money once from two", async (ctx) => {
        needsWrites(() => ctx.skip());
        const box = await staffPort(ADMIN);
        const door = await staffPort(DOOR_PERSON);
        const neon = (await box.rows("events")).find((e) => e["name"] === "Neon Circuit")!;
        const types = await box.rows("ticket_types");
        const balcony = types.find((t) => t["event_id"] === neon.id && String(t["name"]).startsWith("Balcony"))!;
        // The box office takes all but one Balcony seat, then two buyers ask for the last at once.
        for (let guard = 0; guard < 10; guard += 1) {
          const left = (await box.counts(neon.id)).find((p) => p.ticket_type_id === balcony.id)!.left;
          if (left <= 1) break;
          const n = Math.min(left - 1, Number(balcony["max_per_order"] ?? 4));
          const taken = await box.newOrder({ values: { event_id: neon.id, channel: "box_office" }, tickets: Array.from({ length: n }, () => ({ ticket_type_id: balcony.id })) }, key("balcony"));
          await box.move(taken.data.id, "door");
        }
        const [a, b] = [await audience(), await audience()];
        const line = (who: string) => ({ values: { event_id: neon.id, room_id: neon["room_id"], buyer_name: who, email: `${who.toLowerCase().replace(" ", ".")}@example.com`, language: "en-US" }, tickets: [{ ticket_type_id: balcony.id }] });
        const race = await Promise.allSettled([a.buy({ ...line("Lee Tan"), expect: { total: 34 } }, key("last-a")), b.buy({ ...line("Sam Idris"), expect: { total: 34 } }, key("last-b"))]);
        expect(race.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"]);
        expect((race.find((r) => r.status === "rejected") as PromiseRejectedResult).reason).toMatchObject({ code: "PUBLIC_SOLD_OUT" });

        // One code, two phones at the same moment: in once.
        const day = (await box.rows("event_days")).find((d) => d["event_id"] === neon.id)!;
        const paid = (await box.list("tickets", { where: [{ column: "event_id", eq: neon.id }, { column: "order_status", eq: "paid" }, { column: "times_in", eq: 0 }, { column: "status", eq: "valid" }], limit: 1 })).rows[0]!;
        touched.add(paid["order_id"] as number);
        const twice = await Promise.allSettled([door.checkIn(paid.id, day.id, 1), box.checkIn(paid.id, day.id, 2)]);
        expect(twice.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"]);
        expect((twice.find((r) => r.status === "rejected") as PromiseRejectedResult).reason).toMatchObject({ code: "UNIQUE_VIOLATION" });

        // One ticket's door money, two phones at once: taken once.
        const owed = (await box.list("tickets", { where: [{ column: "event_id", eq: neon.id }, { column: "order_status", eq: "door" }, { column: "collected", eq: 0 }, { column: "status", eq: "valid" }], limit: 1 })).rows[0]!;
        touched.add(owed["order_id"] as number);
        const money2 = await Promise.allSettled([door.collect(owed.id, "card", 1), box.collect(owed.id, "cash", 2)]);
        expect(money2.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"]);
        expect((money2.find((r) => r.status === "rejected") as PromiseRejectedResult).reason).toMatchObject({ code: "CAPACITY_FULL" });
        const after = (await box.list("tickets", { where: [{ column: "id", eq: owed.id }] })).rows[0]!;
        expect(Number(after["collected"])).toBe(Number(after["due"]));
      }, 240_000);

      it("a day on: the door money nobody paid is marked, and the waitlist is offered in joining order", async (ctx) => {
        needsWrites(() => ctx.skip());
        const box = await staffPort(ADMIN);
        await server.moveClock(venueAt("2026-07-29T16:30"));
        await until(async () => ((await box.count("orders", [{ column: "status", eq: "not_collected" }])) > 0 ? true : undefined), "Neon's uncollected orders marked", 180_000);
        const velvet = (await box.rows("events")).find((e) => e["name"] === "Velvet Hour")!;
        const offers = await box.offerWaitlist(velvet.id);
        expect(offers.length).toBeGreaterThan(0);
        expect(offers.every((o) => o["status"] === "offered")).toBe(true);
        expect(offers[0]!["email"]).toBe("kai.renner@example.com");
      }, 240_000);

      it("postpones a show and cancels another, one write an order; a message to a show's buyers queues their emails", async (ctx) => {
        needsWrites(() => ctx.skip());
        const box = await staffPort(ADMIN);
        const events = await box.rows("events");
        const quiet = events.find((e) => e["name"] === "Quiet Engines")!;
        const low = events.find((e) => e["name"] === "Low Ceiling: new material night")!;
        const qday = (await box.rows("event_days")).find((d) => d["event_id"] === quiet.id)!;
        const moved = await box.update("events", quiet.id, { doors_at: "2026-10-03T23:30:00.000Z", starts_at: "2026-10-04T00:30:00.000Z", was_starts_at: quiet["starts_at"] });
        await box.update("event_days", qday.id, { doors_at: "2026-10-03T23:30:00.000Z" });
        expect(moved["was_starts_at"]).not.toBeNull();
        await box.cancelShow(low.id);
        const lows = (await box.list("orders", { where: [{ column: "event_id", eq: low.id }], limit: 500 })).rows;
        expect(lows.filter((o) => ["door", "paid", "awaiting_transfer", "overdue", "no_charge"].includes(String(o["status"])))).toEqual([]);
        expect(lows.some((o) => o["cancel_cause"] === "show")).toBe(true);
        const buyers = (await box.list("orders", { where: [{ column: "event_id", eq: quiet.id }, { column: "status", in: ["door", "paid", "awaiting_transfer", "overdue", "no_charge"] }], limit: 2 })).rows;
        const sent = await box.broadcast({ event_id: quiet.id, audience: "everyone", template: "other", subject: "A note", body: "See you there.", people: buyers.length, order_count: buyers.length }, buyers.map((o) => ({ order_id: o.id, to_address: o["email"] })), true);
        expect((await box.list("messages", { where: [{ column: "broadcast_id", eq: sent.id }] })).total).toBe(buyers.length);
      }, 240_000);

      it("removes the sample", async (ctx) => {
        needsWrites(() => ctx.skip());
        const plan = ok(await staff.post<{ tables: { count: number }[]; kept: { ref: string; label: string }[] }>("/api/v1/apps/events/sample-data/remove-plan"));
        expect(plan.tables.reduce((a, t) => a + t.count, 0)).toBeGreaterThan(0);
        // The sample's orders a later row uses (a check-in, money, a claim) stay: the plan names them.
        const used = new Set(plan.kept.filter((k) => k.ref === "orders").map((k) => `WV-S${k.label.replace(/^order:/, "")}`));
        ok(await staff.post("/api/v1/apps/events/sample-data/remove", { keepChanged: false }));
        expect(ok(await staff.get<{ loaded: boolean }>("/api/v1/apps/events/sample-data")).loaded).toBe(false);
        // Only the sample's orders the evening wrote rows under stay (their rows are not the sample's to take).
        const left = (await rows("orders")).filter((o) => String(o["number"]).startsWith("WV-S"));
        expect(left.filter((o) => !used.has(String(o["number"]))).map((o) => o["number"])).toEqual([]);
        // The evening's own writes are among them.
        expect(left.filter((o) => touched.has(o.id)).length).toBeGreaterThan(0);
      }, 120_000);
    });
  });
});
