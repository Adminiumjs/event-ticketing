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
            { ...body, planChecksum: plan.checksum, ...(invoices ? {} : { addOns: { invoices: false } }) },
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
        await until(async () => (ok(await staff.get<{ loaded: boolean }>("/api/v1/apps/events/sample-data")).loaded ? true : undefined), "the sample to be added");
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
      }, 300_000);

      it("counts Neon Circuit's pools for the box office: Standard 14 left, 3 held", async (ctx) => {
        needsWrites(() => ctx.skip());
        const events = await rows("events");
        const neon = events.find((e) => e["name"] === "Neon Circuit")!;
        const answer = ok(await staff.get<{ data: { rows: { pool: string; size: number; taken: number; held?: number }[] } }>(`${data("tickets")}/capacity-counts?rule=0&under=${String(neon.id)}`)).data.rows;
        const types = await rows("ticket_types");
        const standard = String(types.find((t) => t["event_id"] === neon.id && t["name"] === "Standard")!.id);
        const pool = answer.find((c) => c.pool === standard)!;
        expect([pool.size, pool.taken, pool.held ?? 0]).toEqual([260, 243, 3]);
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
        expect([free.status, free.code, free.details["requires"]]).toEqual([409, "STATE_MOVE_REFUSED", "total"]);
        const tickets = (await rows("tickets")).filter((t) => t["order_id"] === made.data.id);
        expect(tickets.map((t) => Number(t["settled"]))).toEqual([0, 0]);
      }, 120_000);

      it("refuses a check-in for an uncollected pay-at-the-door ticket, and lets it in once its money is taken", async (ctx) => {
        needsWrites(() => ctx.skip());
        const tickets = await rows("tickets");
        const days = await rows("event_days");
        const mia = tickets.find((t) => t["code"] === "H3TW-9CXR")!;
        const day = days.find((d) => d["event_id"] === mia["event_id"])!;
        const early = Date.parse("2026-07-28T23:40:00Z"); // 19:40 at the venue: inside the window
        const refused = await staff.post(data("check_ins"), { values: { ticket_id: mia.id, event_day_id: day.id }, occurredAt: new Date(early).toISOString() });
        expect([refused.status, refused.code, refused.details["requires"]]).toEqual([409, "STATE_MOVE_REFUSED", "linked"]);
        ok(await staff.post(data("door_collections"), { values: { ticket_id: mia.id, method: "card" } }), 201);
        ok(await staff.post(data("check_ins"), { values: { ticket_id: mia.id, event_day_id: day.id }, occurredAt: new Date(early).toISOString() }), 201);
        const again = await staff.post(data("check_ins"), { values: { ticket_id: mia.id, event_day_id: day.id }, occurredAt: new Date(early).toISOString() });
        expect([again.status, again.code]).toEqual([409, "UNIQUE_VIOLATION"]);
      }, 60_000);

      it("removes the sample", async (ctx) => {
        needsWrites(() => ctx.skip());
        const plan = ok(await staff.post<{ total: number }>("/api/v1/apps/events/sample-data/remove-plan"));
        expect(plan.total).toBeGreaterThan(0);
        ok(await staff.post("/api/v1/apps/events/sample-data/remove", { keepChanged: false }));
        expect(ok(await staff.get<{ loaded: boolean }>("/api/v1/apps/events/sample-data")).loaded).toBe(false);
        expect((await rows("orders")).filter((o) => String(o["number"]).startsWith("WV-S"))).toEqual([]);
      }, 120_000);
    });
  });
});
