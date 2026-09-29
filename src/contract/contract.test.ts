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
import { cancelLeft, cancelRun } from "../data/boxSteps.ts";
import { createSessionTransport } from "../data/sessionSource.ts";
import type { StaffConfig } from "../staffConnection.ts";
import { publicRefs } from "../data/publicRefs.ts";
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
        // Where emailed links point: without it Adminium sends no sign-in link and no link-bearing email.
        ok(await staff.put("/api/v1/settings/email", { publicOrigin: server.base }));
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
        // A hold counts until its end, whether or not its timed move has run yet: judged on the server's clock.
        const serverNow = Date.parse(ok(await staff.get<{ now: string }>("/apps/events/staff/surface-config.json")).now);
        const held = hold["status"] === "held" && Date.parse(String(hold["held_until"])) > serverNow ? 3 : 0;
        expect([pool.size, pool.taken - (pool.held ?? 0), pool.held ?? 0]).toEqual([260, 243, held]);
      }, 60_000);

      it("draws the Overview at 16:30 as the dashboard asks for it: every card's figures from the sample", async (ctx) => {
        needsWrites(() => ctx.skip());
        type Json = Record<string, unknown>;
        const pages = ok(await staff.get<{ data: { id: string; slug: string }[] }>("/api/v1/pages")).data;
        const page = pages.find((p) => p.slug === "events-overview")!;
        const find = (value: unknown): { widget: string; i: string; config: { binding?: Json } }[] | null => {
          if (value === null || typeof value !== "object") return null;
          const v = value as Json;
          if (Array.isArray(v["items"]) && (v["items"] as Json[]).every((x) => typeof x["widget"] === "string")) return v["items"] as never;
          for (const child of Object.values(v)) {
            const found = find(child);
            if (found !== null) return found;
          }
          return null;
        };
        const items = find(ok(await staff.get(`/api/v1/pages/${page.id}`)))!;
        const requests = items.filter((x) => x.config.binding !== undefined).map((x) => ({ instanceId: x.i, descriptor: x.config.binding }));
        const reply = ok(await staff.post<{ results: Record<string, { ok: boolean; result?: Json; error?: Json }> }>("/api/v1/widget-data/batch", { requests }));
        const refused = Object.entries(reply.results).filter(([, a]) => !a.ok).map(([id, a]) => `${id}: ${JSON.stringify(a.error)}`);
        expect(refused).toEqual([]);
        const card = (id: string) => reply.results[id]!.result!;
        const value = (id: string) => Number(card(id)["value"] ?? 0);
        const listOf = (id: string) => (card(id)["rows"] ?? card(id)["items"]) as Json[];
        const counts = (row: Json) => row["sold"] as { taken: number; held: number; size: number };
        // The season's four figures.
        expect([value("sold"), money(value("owed-door")), money(value("awaiting")), money(value("refunds"))]).toEqual([1572, "6391.00", "1172.00", "2376.00"]);
        // Tonight: Neon Circuit, 388 of 414 (and WV-S8815's 3 held while its hold runs), $336.00 at the door, 22 on the guest list.
        const hold = (await rows("orders")).find((o) => o["number"] === "WV-S8815")!;
        const serverNow = Date.parse(ok(await staff.get<{ now: string }>("/apps/events/staff/surface-config.json")).now);
        const held = hold["status"] === "held" && Date.parse(String(hold["held_until"])) > serverNow ? 3 : 0;
        const tonight = listOf("tonight");
        expect(tonight.map((r) => [r["name"], counts(r).taken - counts(r).held, counts(r).held, counts(r).size])).toEqual([["Neon Circuit", 388, held, 414]]);
        expect([money(value("tonight-door")), value("tonight-guests")]).toEqual(["336.00", 22]);
        // What needs a person.
        expect(listOf("overdue").map((r) => [r["number"], money(r["balance"])])).toEqual([["WV-S8793", "72.00"], ["WV-S8795", "72.00"], ["WV-S8797", "60.00"]]);
        expect(listOf("refund-requests").map((r) => [r["order"], r["show"]])).toEqual([["WV-S8741", "Cinder"]]);
        expect(listOf("waiting").map((r) => [r["show"], Number(r["people"])])).toContainEqual(["Hollow Tide", 88]);
        expect(listOf("on-sale").map((r) => [r["name"], Number(r["reminder_count"])])).toEqual([["Static Bloom", 41]]);
        // Coming shows, in date order, sold of what each can sell.
        expect(listOf("coming").map((r) => [r["name"], counts(r).taken - counts(r).held, counts(r).size])).toEqual([
          ["Neon Circuit", 388, 414],
          ["Velvet Hour", 118, 120],
          ["Low Ceiling: new material night", 64, 120],
          ["First Listen: Hollow Tide's new record", 71, 120],
          ["Home Studio Basics", 13, 20],
          ["Cinder", 245, 440],
          ["Static Bloom", 0, 450],
          ["Waveform Weekender", 391, 570],
          ["Hollow Tide", 247, 450],
          ["Quiet Engines", 26, 450],
          ["Pale Harbour: stories after dark", 0, 120],
          ["Marrow & Salt", 9, 120],
        ]);
        // Money by show: received and still owed, paired, in the shows' date order.
        const paired = card("money");
        const labels = ((paired["values"] ?? paired["items"]) as Json[]).map((x) => x["label"]);
        expect(labels).toEqual(["Neon Circuit", "Velvet Hour", "Low Ceiling: new material night", "Home Studio Basics", "Cinder", "Waveform Weekender", "Hollow Tide", "Quiet Engines", "Marrow & Salt"]);
        const pairs = ((paired["values"] ?? paired["items"]) as Json[]).map((x) => {
          const v = (x["values"] ?? x["aggregates"] ?? [x["value"]]) as unknown;
          return Array.isArray(v) ? v.map(money) : Object.values(v as Json).map(money);
        });
        expect(pairs).toEqual([
          ["10287.00", "336.00"],
          ["2080.00", "280.00"],
          ["795.00", "165.00"],
          ["391.50", "180.00"],
          ["4409.00", "1146.00"],
          ["23189.00", "4711.00"],
          ["7023.00", "570.00"],
          ["499.00", "175.00"],
          ["162.00", "0.00"],
        ]);
      }, 240_000);

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
      const audience = async (sent?: Map<string, string>) => {
        const served = ok(await new Caller(server.base).get<{ publishableKey: string; publicKeys: Record<string, string>; tables: Record<string, string>; addOns?: Record<string, unknown> }>("/apps/events/customer/surface-config.json"));
        const originFetch = ((input: RequestInfo | URL, init?: RequestInit) => {
          const headers = new Headers(input instanceof Request ? input.headers : undefined);
          new Headers(init?.headers).forEach((v, k) => headers.set(k, v));
          headers.set("origin", server.base);
          // The session each key carried, for a test to send again by hand.
          const session = headers.get("x-adminium-public-session");
          if (sent !== undefined && session !== null) sent.set(headers.get("authorization") ?? "", session);
          return fetch(input, { ...init, headers });
        }) as typeof fetch;
        return new AdminiumAudience({ baseUrl: server.base, publishableKey: served.publishableKey, publicKeys: served.publicKeys, tables: served.tables, receipts: served.addOns?.["invoices"] !== undefined }, { storage: null, fetch: originFetch });
      };
      /** The box office's and the door's own door, as a person signed in to Adminium. */
      /** The server's clock moved on: sessions signed in before start again. */
      const moveClock = async (at: number) => {
        ports.clear();
        await server.moveClock(at);
      };
      /** One signed-in door a person: Adminium lets a person sign in only a few times a minute. */
      const ports = new Map<string, Promise<AdminiumStaff>>();
      const staffPort = (who: { email: string; password: string }): Promise<AdminiumStaff> => {
        const known = ports.get(who.email);
        if (known !== undefined) return known;
        const made = signedStaff(who);
        ports.set(who.email, made);
        made.catch(() => ports.delete(who.email));
        return made;
      };
      const signedStaff = async (who: { email: string; password: string }) => {
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

      // ── who reads what: signing in, an order's own link, a friend's ticket, forgetting, codes ──

      /** How many emails the server's sink holds. */
      const sinkCount = async () => ((await (await fetch(`${server.sink}/messages`)).json()) as unknown[]).length;
      /** The first email to `to` since the `after`-th the sink held whose subject matches: a mail queued earlier may land late. */
      const mailTo = async (to: string, after: number, subject: RegExp) =>
        until(async () => {
          const all = (await (await fetch(`${server.sink}/messages`)).json()) as { to: string[]; subject: string; text: string }[];
          return all.slice(after).find((m) => m.to.includes(to) && subject.test(m.subject));
        }, `an email to ${to} (${subject.source})`, 150_000);
      const codeIn = (text: string) => /\b(\d{6})\b/.exec(text)?.[1] ?? "";
      /** An email's own row, once the outbox has done with it: "sent", or why not. */
      const outboxRow = async (orderId: number, kind: string) => {
        const box = await staffPort(ADMIN);
        const row = await until(async () => (await box.list("messages", { where: [{ column: "order_id", eq: orderId }, { column: "kind", eq: kind }] })).rows.find((m) => m["status"] !== "queued" && m["status"] !== "held"), `the ${kind} email of order ${String(orderId)}`, 150_000);
        return `${String(row["status"])}${row["error"] ? `: ${String(row["error"])}` : ""}`;
      };
      /** The public API as a page on the server's origin calls it by hand: one key, one session. */
      const publicCall = async (keyName: string, session: string | null, path: string, init: { method?: string; body?: unknown } = {}) => {
        const served = ok(await new Caller(server.base).get<{ publishableKey: string; publicKeys: Record<string, string> }>("/apps/events/customer/surface-config.json"));
        // The customer key is the page's own browser key; the others are named.
        const bearer = keyName === "customer" ? served.publishableKey : served.publicKeys[keyName]!;
        const res = await fetch(`${server.base}${path}`, {
          method: init.method ?? "GET",
          headers: { authorization: `Bearer ${bearer}`, origin: server.base, "content-type": "application/json", ...(session === null ? {} : { "x-adminium-public-session": session }) },
          ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
        });
        return { status: res.status, body: (await res.json().catch(() => ({}))) as { data?: Row[] | Row } };
      };
      /** Two buyers on an address the outbox sends to (a reserved one is skipped), each with an order and its own link. */
      const pair = { a: { email: `rui.${engine}@waveform.dev`, id: 0, token: "", sent: new Map<string, string>() }, b: { email: `lena.${engine}@waveform.dev`, id: 0, token: "", sent: new Map<string, string>() } };
      let signedA: AdminiumAudience | null = null;
      /** The session A's sign-in gave, as it was sent. */
      let heldSession = "";
      /** A's Cinder order, paid by transfer. */
      let xferA = 0;
      const signIn = async (who: "a" | "b") => {
        const buyer = await audience(pair[who].sent);
        const before = await sinkCount();
        await buyer.signIn(pair[who].email);
        const mail = await until(async () => {
          const all = (await (await fetch(`${server.sink}/messages`)).json()) as { to: string[]; subject: string; text: string }[];
          return all.slice(before).find((m) => m.to.includes(pair[who].email) && codeIn(m.text) !== "");
        }, `a sign-in code for ${pair[who].email}`, 150_000);
        await buyer.verify(pair[who].email, codeIn(mail.text));
        return buyer;
      };

      it("keeps each buyer to their own orders, signed in or by an order's own link", async (ctx) => {
        needsWrites(() => ctx.skip());
        const venue = await (await audience()).venue();
        const show = (name: string) => venue.events.find((e) => e["name"] === name)!;
        const standard = (e: Row) => venue.types.find((t) => t["event_id"] === e.id && t["name"] === "Standard")!.id;
        for (const [who, name, on] of [["a", "Rui Costa", "Neon Circuit"], ["b", "Lena Sato", "Cinder"]] as const) {
          const buyer = await audience();
          const e = show(on);
          const body = { values: { event_id: e.id, room_id: e["room_id"], buyer_name: name, email: pair[who].email, language: "en-US" }, tickets: [{ ticket_type_id: standard(e) }, { ticket_type_id: standard(e) }] };
          const total = Number((await buyer.quote(body)).data["total"]);
          const made = await buyer.buy({ ...body, expect: { total } }, key(`pair-${who}`));
          const held = await buyer.order();
          for (const [i, t] of held.tickets.entries()) await buyer.nameTicket(t.id, [name, "Jo Petrak"][i]!);
          await buyer.choose("door");
          pair[who].id = made.data.id;
          pair[who].token = made.link!.token;
        }
        // A signs in with the code their email carries, and reads their own order only.
        const a = await signIn("a");
        signedA = a;
        expect((await a.me())?.email).toBe(pair.a.email);
        expect((await a.myOrders()).orders.map((o) => o.order.id)).toEqual([pair.a.id]);
        // B's order, as A, by every door of A's: as if it were not there.
        const bTickets = (await rows("tickets")).filter((t) => t["order_id"] === pair.b.id);
        expect((await refusal(() => a.myOrder(pair.b.id)))?.code).toBe("PUBLIC_REF_NOT_FOUND");
        expect((await refusal(() => a.updateOrder({ access_note: "mine now" }, pair.b.id)))?.code).toBe("PUBLIC_REF_NOT_FOUND");
        expect(await refusal(() => a.nameTicket(bTickets[0]!.id, "Someone Else"))).not.toBeNull();
        expect(await refusal(() => a.sendTicket(bTickets[1]!.id, "taker@waveform.dev", "A Taker"))).not.toBeNull();
        expect((await rows("tickets")).filter((t) => t["order_id"] === pair.b.id).map((t) => [t["holder_name"], t["status"]])).toEqual(bTickets.map((t) => [t["holder_name"], t["status"]]));
        // What A's session reads through each door of theirs, row by row: nothing of anyone else's.
        const refs = publicRefs(real);
        const served = ok(await new Caller(server.base).get<{ publishableKey: string; publicKeys: Record<string, string> }>("/apps/events/customer/surface-config.json"));
        const aSession = pair.a.sent.get(`Bearer ${served.publishableKey}`)!;
        expect(aSession).toBeTruthy();
        heldSession = aSession;
        const aCustomer = (await rows("customers")).find((c) => c["email"] === pair.a.email)!;
        const others = new Set((await rows("orders")).filter((o) => o.id !== pair.a.id).map((o) => o.id));
        expect(others.size).toBeGreaterThan(700);
        const theirs = (ref: string, row: Row) =>
          ref === refs.myOrders ? others.has(row.id) : ref === refs.account ? row.id !== aCustomer.id : row["order_id"] !== undefined ? others.has(row["order_id"] as number) : row["customer_id"] !== undefined && row["customer_id"] !== aCustomer.id;
        for (const ref of [refs.account, refs.myOrders, refs.myTickets, refs.myNames, refs.myReturns, refs.myCancels, refs.heldTickets, refs.myWaitlist, refs.myReminders]) {
          const got = await publicCall("customer", aSession, `/api/v1/public/records/${ref}?limit=200`);
          // A change-only door answers a read 404; this Adminium answers a person's own account row 503 while it masks
          // a column (fixed in its next release). Whatever it answers, nothing of anyone else's comes back.
          expect([200, 404, 503], ref).toContain(got.status);
          expect(((got.body.data ?? []) as Row[]).filter((row) => theirs(ref, row)), ref).toEqual([]);
        }
        // B's own link opens B's order, and never A's: read, changed and listed through the link's door itself.
        const b = await audience(pair.b.sent);
        await b.openOrder(pair.b.token);
        expect((await b.order()).order.id).toBe(pair.b.id);
        const bLink = pair.b.sent.get(`Bearer ${served.publicKeys["link"]!}`)!;
        expect(bLink).toBeTruthy();
        expect((await publicCall("link", bLink, `/api/v1/public/records/${refs.linkOrder}/${String(pair.a.id)}`)).status).toBe(404);
        expect((await publicCall("link", bLink, `/api/v1/public/records/${refs.linkOrder}/${String(pair.a.id)}`, { method: "PATCH", body: { values: { access_note: "mine now" } } })).status).toBe(404);
        for (const ref of [refs.linkOrder, refs.linkTickets, refs.linkNames, refs.linkReturns, refs.linkCancels]) {
          const got = await publicCall("link", bLink, `/api/v1/public/records/${ref}?limit=200`);
          expect([200, 404], ref).toContain(got.status);
          expect(((got.body.data ?? []) as Row[]).filter((row) => (ref === refs.linkOrder ? row.id : row["order_id"]) !== pair.b.id), ref).toEqual([]);
        }
        // No session at all: nobody's orders, tickets or account.
        for (const ref of [refs.myOrders, refs.myTickets, refs.account]) expect((await publicCall("customer", null, `/api/v1/public/records/${ref}`)).status, ref).not.toBe(200);
        expect((await publicCall("ticket", null, `/api/v1/public/records/${refs.ticket}`)).status).not.toBe(200);
        expect((await rows("orders")).find((o) => o.id === pair.a.id)!["access_note"]).toBeNull();
      }, 420_000);

      it("hides an unpaid transfer's codes from the buyer, signed in or by the order's link", async (ctx) => {
        needsWrites(() => ctx.skip());
        const a = signedA!;
        const venue = await a.venue();
        const cinder = venue.events.find((e) => e["name"] === "Cinder")!;
        const standard = venue.types.find((t) => t["event_id"] === cinder.id && t["name"] === "Standard")!.id;
        const body = { values: { event_id: cinder.id, room_id: cinder["room_id"], buyer_name: "Rui Costa", email: pair.a.email, language: "en-US" }, tickets: [{ ticket_type_id: standard }] };
        const total = Number((await a.quote(body)).data["total"]);
        const made = await a.buy({ ...body, expect: { total } }, key("xfer-a"));
        await a.choose("confirming", undefined, made.data.id);
        const box = await staffPort(ADMIN);
        const confirmToken = String((await box.list("orders", { where: [{ column: "id", eq: made.data.id }] })).rows[0]!["confirm_token"]);
        expect((await (await audience()).confirmTransfer(confirmToken))["status"]).toBe("awaiting_transfer");
        const mine = (await a.myOrders()).orders.find((o) => o.order.id === made.data.id)!;
        expect([mine.order["status"], mine.tickets.map((t) => t["code"] ?? null)]).toEqual(["awaiting_transfer", [null]]);
        const byLink = await audience();
        await byLink.openOrder(made.link!.token);
        expect((await byLink.order()).tickets.map((t) => t["code"] ?? null)).toEqual([null]);
        // The sample's own: WV-S8809 waits for its transfer, and neither of its tickets shows a code.
        const s8809 = (await box.list("orders", { where: [{ column: "number", eq: "WV-S8809" }] })).rows[0]!;
        const sample = await audience();
        await sample.openOrder(String(s8809["link_token"]));
        const read = await sample.order();
        expect([read.order["status"], read.tickets.length, read.tickets.map((t) => t["code"] ?? null)]).toEqual(["awaiting_transfer", 2, [null, null]]);
        // Once paid, the codes come, and the payment's email with them — carrying the receipt when an add-on draws one.
        const before = await sinkCount();
        // As the box office marks a transfer paid: the payment, then the order's move.
        await box.recordPayment(made.data.id, total, "bank_transfer");
        await box.move(made.data.id, "paid", { paid_method: "bank_transfer" });
        expect((await a.myOrders()).orders.find((o) => o.order.id === made.data.id)!.tickets.every((t) => typeof t["code"] === "string")).toBe(true);
        expect(await outboxRow(made.data.id, "payment-received")).toBe("sent");
        const paidMail = (await mailTo(pair.a.email, before, /^Payment received · Cinder · WV-/)) as unknown as { text: string; attachments?: { contentType: string }[] };
        expect([paidMail.text.includes("Your receipt is attached."), (paidMail.attachments ?? []).some((f) => f.contentType === "application/pdf")]).toEqual(withInvoices() ? [true, true] : [false, false]);
        // The receipt the order page offers once paid: drawn by Invoices & Receipts, saved as a file.
        expect((await a.config()).receipts).toBe(withInvoices());
        if (withInvoices()) {
          const file = await a.receipt(made.data.id);
          expect([file.type, file.size > 500]).toEqual(["application/pdf", true]);
        }
        xferA = made.data.id;
      }, 240_000);

      it("sends a ticket to a friend: sent again after a take-back, accepted with a new code the buyer no longer sees", async (ctx) => {
        needsWrites(() => ctx.skip());
        const a = signedA!;
        const box = await staffPort(ADMIN);
        const kai = `kai.${engine}@waveform.dev`;
        const ticketOf = async (id: number) => (await box.list("tickets", { where: [{ column: "id", eq: id }] })).rows[0]!;
        const second = (await a.myOrders()).orders.find((o) => o.order.id === pair.a.id)!.tickets.find((t) => t["holder_name"] === "Jo Petrak")!;
        const oldCode = String((await ticketOf(second.id))["code"]);
        const offers = async () => (await box.list("messages", { where: [{ column: "kind", eq: "friend-offer" }, { column: "to_address", eq: kai }] })).rows.length;
        await a.sendTicket(second.id, kai, "Kai Renner");
        await a.takeBack(second.id);
        await a.sendTicket(second.id, kai, "Kai Renner");
        // Each send is its own email: the second after a take-back goes too.
        expect(await offers()).toBe(2);
        // Until Kai accepts, the ticket is still the buyer's, with the code it had (the page shows "Sent to Kai Renner" instead).
        const pending = (await a.myOrders()).orders.find((o) => o.order.id === pair.a.id)!.tickets.find((t) => t.id === second.id)!;
        expect([pending["status"], pending["pending_name"], pending["code"] ?? null]).toEqual(["offered", "Kai Renner", oldCode]);
        // Kai opens the ticket by its link: no code until it is theirs; accepted, a new one.
        const friend = await audience();
        const opened = await friend.openTicket(String((await ticketOf(second.id))["link_token"]));
        expect([opened["status"], opened["code"] ?? null]).toEqual(["offered", null]);
        const accepted = await friend.acceptTicket(String((await ticketOf(second.id))["link_token"]), "Kai Renner");
        expect([accepted["status"], accepted["holder_name"], typeof accepted["code"]]).toEqual(["valid", "Kai Renner", "string"]);
        expect(accepted["code"]).not.toBe(oldCode);
        const after = (await a.myOrders()).orders.find((o) => o.order.id === pair.a.id)!.tickets.find((t) => t.id === second.id)!;
        expect([after["holder_name"], after["code"] ?? null]).toEqual(["Kai Renner", null]);
        // The old code opens nothing at the door any more.
        expect(await box.find(oldCode, (await box.list("event_days", { where: [{ column: "event_id", eq: second["event_id"] }] })).rows[0]!.id)).toBeNull();
      }, 240_000);

      it("signs a buyer out everywhere: the session they held, sent again as it was, opens nothing", async (ctx) => {
        needsWrites(() => ctx.skip());
        const a = signedA!;
        await a.signOutEverywhere();
        expect(await a.me()).toBeNull();
        const refs = publicRefs(real);
        const replayed = await publicCall("customer", heldSession, `/api/v1/public/records/${refs.myOrders}`);
        expect([replayed.status === 200, (replayed.body.data ?? []) as Row[]]).toEqual([false, []]);
      }, 120_000);

      it("prices a code where it applies and nowhere else, and unlocks a presale only with its own", async (ctx) => {
        needsWrites(() => ctx.skip());
        const buyer = await audience();
        const venue = await buyer.venue();
        const show = (name: string) => venue.events.find((e) => e["name"] === name)!;
        const typeOf = (e: Row, name: string) => venue.types.find((t) => t["event_id"] === e.id && t["name"] === name)!;
        const cinder = show("Cinder");
        const two = { event_id: cinder.id, room_id: cinder["room_id"] };
        const lines = [{ ticket_type_id: typeOf(cinder, "Standard").id }, { ticket_type_id: typeOf(cinder, "Standard").id }];
        const plain = Number((await buyer.quote({ values: two, tickets: lines })).data["total"]);
        const crew = (await buyer.quote({ values: { ...two, code_text: "crew5" }, tickets: lines })).data;
        expect([Number(crew["discount"]), Number(crew["total"])]).toEqual([10, plain - 10]);
        const velvet = show("Velvet Hour");
        const onVelvet = await refusal(() => buyer.quote({ values: { event_id: velvet.id, room_id: velvet["room_id"], code_text: "CREW5" }, tickets: [{ ticket_type_id: velvet ? venue.types.find((t) => t["event_id"] === velvet.id)!.id : 0 }] }));
        expect(onVelvet?.status).toBeGreaterThanOrEqual(400);
        const bloom = show("Static Bloom");
        expect((await buyer.unlock(bloom.id, "CREW5")).length).toBe(0);
        expect((await buyer.unlock(bloom.id, "BLOOMEARLY")).map((t) => t["name"])).toEqual(["Presale"]);
      }, 180_000);

      it("forgets a buyer at their asking: the account emptied, the orders kept, their links stopped", async (ctx) => {
        needsWrites(() => ctx.skip());
        const b = await signIn("b");
        await b.forget();
        expect(await b.me()).toBeNull();
        const bOrder = (await rows("orders")).find((o) => o.id === pair.b.id)!;
        const account = (await rows("customers")).find((c) => c.id === bOrder["customer_id"])!;
        expect([account["email"] ?? null, account["name"] ?? null, account["forgotten_at"] === null]).toEqual([null, null, false]);
        expect((await rows("orders")).find((o) => o.id === pair.b.id)!["status"]).toBe("door");
        expect(await refusal(async () => (await audience()).openOrder(pair.b.token))).not.toBeNull();
      }, 240_000);

      it("resends an order's tickets: each code grouped, a friend's ticket by their name and never their code", async (ctx) => {
        needsWrites(() => ctx.skip());
        const box = await staffPort(ADMIN);
        const tickets = (await box.list("tickets", { where: [{ column: "order_id", eq: pair.a.id }] })).rows;
        const own = tickets.find((t) => t["holder_name"] === "Rui Costa")!;
        const kais = tickets.find((t) => t["holder_name"] === "Kai Renner")!;
        const grouped = (code: unknown) => `${String(code).slice(0, 4)}-${String(code).slice(4)}`;
        const before = await sinkCount();
        await box.mail("tickets", [{ order_id: pair.a.id, to_address: pair.a.email }]);
        expect((await box.list("messages", { where: [{ column: "order_id", eq: pair.a.id }, { column: "kind", eq: "tickets" }] })).rows.map((m) => `${String(m["status"])}${m["error"] ? `: ${String(m["error"])}` : ""}`)).not.toContainEqual(expect.stringMatching(/^failed/));
        const mail = await mailTo(pair.a.email, before, /^Your tickets for Neon Circuit · WV-/);
        expect(mail.text).toContain(grouped(own["code"]));
        expect(mail.text).toContain("Kai Renner");
        for (const shown of [String(kais["code"]), grouped(kais["code"])]) expect(mail.text).not.toContain(shown);
      }, 240_000);

      it("times the night's email: at noon on the day for an evening show, at 18:00 the evening before for a daytime one", async (ctx) => {
        needsWrites(() => ctx.skip());
        const box = await staffPort(ADMIN);
        const read = async (orderId: number, kind: string) => (await box.list("messages", { where: [{ column: "order_id", eq: orderId }, { column: "kind", eq: kind }] })).rows;
        // The outbox's own pass sets when a timed email is due, a moment after the move that made it.
        const dueOf = async (orderId: number, kind: string) => {
          const rows = await read(orderId, kind);
          if (rows.length > 0) await until(async () => ((await read(orderId, kind)).every((m) => m["due"] !== null && m["due"] !== undefined) ? true : undefined), `the ${kind} email's due moment`, 150_000).catch(() => undefined);
          // A moment reads back as its text, or (SQLite) as its milliseconds.
          const at = (v: unknown) => (typeof v === "number" ? v : Date.parse(String(v)));
          return (await read(orderId, kind)).map((m) => (m["due"] === null || m["due"] === undefined ? "none" : Number.isNaN(at(m["due"])) ? `unread: ${JSON.stringify(m["due"])}` : new Date(at(m["due"])).toISOString()));
        };
        expect(await dueOf(xferA, "tonight")).toEqual([new Date(venueAt("2026-08-14T12:00")).toISOString()]);
        expect(await dueOf(xferA, "tomorrow")).toEqual([]);
        const buyer = await audience();
        const venue = await buyer.venue();
        const studio = venue.events.find((e) => e["name"] === "Home Studio Basics")!;
        const place = venue.types.find((t) => t["event_id"] === studio.id)!;
        const body = { values: { event_id: studio.id, room_id: studio["room_id"], buyer_name: "Dana Ilić", email: `dana.${engine}@waveform.dev`, language: "en-US" }, tickets: [{ ticket_type_id: place.id }] };
        const made = await buyer.buy({ ...body, expect: { total: Number((await buyer.quote(body)).data["total"]) } }, key("studio"));
        await buyer.nameTicket((await buyer.order()).tickets[0]!.id, "Dana Ilić");
        await buyer.choose("door");
        expect(await dueOf(made.data.id, "tomorrow")).toEqual([new Date(venueAt("2026-08-07T18:00")).toISOString()]);
        expect(await dueOf(made.data.id, "tonight")).toEqual([]);
      }, 240_000);

      it("writes a message to a show's buyers one email an order: Hollow Tide's 90 orders are 88 people", async (ctx) => {
        needsWrites(() => ctx.skip());
        const box = await staffPort(ADMIN);
        const hollow = (await box.rows("events")).find((e) => e["name"] === "Hollow Tide")!;
        const buyers = (await box.list("orders", { where: [{ column: "event_id", eq: hollow.id }, { column: "status", in: ["door", "paid", "awaiting_transfer", "overdue", "no_charge"] }], limit: 200 })).rows;
        const people = new Set(buyers.map((o) => String(o["email"]).toLowerCase()));
        expect([people.size, buyers.length]).toEqual([88, 90]);
        const sent = await box.broadcast({ event_id: hollow.id, audience: "everyone", template: "other", subject: "Doors open early", body: "Doors open at 19:00 on the night.", people: people.size, order_count: buyers.length }, buyers.map((o) => ({ order_id: o.id, to_address: o["email"] })), true);
        const rowsOf = (await box.list("messages", { where: [{ column: "broadcast_id", eq: sent.id }], limit: 200 })).rows;
        expect(rowsOf.length).toBe(90);
        const twice = [...people].filter((p) => buyers.filter((o) => String(o["email"]).toLowerCase() === p).length === 2);
        expect(twice.length).toBe(2);
        for (const p of twice) expect(rowsOf.filter((m) => String(m["to_address"]).toLowerCase() === p).length).toBe(2);
      }, 240_000);

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
        await moveClock(venueAt("2026-07-28T18:01"));
        await until(async () => ((await box.list("orders", { where: [{ column: "number", eq: "WV-S8793" }] })).rows[0]?.["status"] === "released" ? true : undefined), "WV-S8793 released", 180_000);
      }, 240_000);

      it("runs the door at 19:58 as a door person: let in, again, money first, wrong show, a late replay, undo, a sale — and nothing past the door's role", async (ctx) => {
        needsWrites(() => ctx.skip());
        const roles = ok(await staff.get<{ data?: { id: string; slug: string }[]; roles?: { id: string; slug: string }[] }>("/api/v1/roles"));
        const doorRole = (roles.data ?? roles.roles ?? []).find((r) => r.slug === "events-door")!;
        const invited = await staff.post("/api/v1/users", { email: DOOR_PERSON.email, name: "Sam", roleIds: [doorRole.id] });
        const token = JSON.stringify(invited.body).match(/\/reset\/([A-Za-z0-9_-]+)/)![1]!;
        ok(await new Caller(server.base, { origin: server.base }).post("/api/v1/auth/password/reset", { token, newPassword: DOOR_PERSON.password }));
        await moveClock(venueAt("2026-07-28T19:58"));
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
        await moveClock(venueAt("2026-07-29T16:30"));
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

      describe("box fixes", () => {
        /** A show of this block's own, in the sample's Main Hall, on sale: nothing the other steps read. */
        const ownShow = async (box: AdminiumStaff, name: string, extra: Record<string, unknown> = {}, types: Record<string, unknown>[] = [{ name: "Standard", price: 20, capacity: 400 }]) => {
          const room = (await box.rows("rooms")).find((r) => r["name"] === "Main Hall")!;
          const at = (h: number) => new Date(venueAt("2026-09-20T19:00") + h * 3_600_000).toISOString();
          const made = await box.saveEvent(
            null,
            { name, slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${engine}`, kind: "gig", room_id: room.id, doors_at: at(0), starts_at: at(1), curfew_at: at(4), ends_at: at(4), ...extra },
            { event_days: [{ day: 1, doors_at: at(0), curfew_at: at(4) }], ticket_types: types.map((t, i) => ({ kind: "standard", max_per_order: 8, visibility: "public", position: i, ...t })), acts: [], questions: [] },
          );
          await box.update("events", made.id, { status: "published" }, "draft");
          const typeRows = (await box.list("ticket_types", { where: [{ column: "event_id", eq: made.id }], sort: [{ column: "position" }] })).rows;
          return { id: made.id, types: typeRows };
        };
        /** A box-office person of this block's own: their own requests-a-minute. */
        const BOX_PERSON = { email: `bo.fix.${engine}@waveform.test`, password: `box-${Math.random().toString(36).slice(2)}-${String(Date.now())}` };
        const boxPerson = async () => {
          const roles = ok(await staff.get<{ data?: { id: string; slug: string }[]; roles?: { id: string; slug: string }[] }>("/api/v1/roles"));
          const role = (roles.data ?? roles.roles ?? []).find((r) => r.slug === "events-box-office")!;
          const invited = await staff.post("/api/v1/users", { email: BOX_PERSON.email, name: "Priya", roleIds: [role.id] });
          const token = JSON.stringify(invited.body).match(/\/reset\/([A-Za-z0-9_-]+)/)![1]!;
          ok(await new Caller(server.base, { origin: server.base }).post("/api/v1/auth/password/reset", { token, newPassword: BOX_PERSON.password }));
          return staffPort(BOX_PERSON);
        };

        it("reads every yes/no as a yes/no: a code turned off stays off, a required question stays required, a voided payment counts for nothing, a waitlist show's cancel returns its tickets", async (ctx) => {
          needsWrites(() => ctx.skip());
          const box = await staffPort(ADMIN);
          const code = await box.create("codes", { code: `BOXFIX${engine.toUpperCase()}`, kind: "percent", value: 10 });
          expect(code["active"]).toBe(true);
          const off = await box.update("codes", code.id, { active: false });
          expect(off["active"]).toBe(false);
          expect((await box.list("codes", { where: [{ column: "id", eq: code.id }] })).rows[0]!["active"]).toBe(false);

          const show = await ownShow(box, `Yes No ${engine}`, { waitlist_on: true });
          await box.saveEvent(show.id, {}, { questions: [{ text: "Dietary needs?", kind: "text", per: "order", required: true, position: 0 }] });
          const q = (await box.list("questions", { where: [{ column: "event_id", eq: show.id }] })).rows[0]!;
          expect(q["required"]).toBe(true);
          expect((await box.list("events", { where: [{ column: "id", eq: show.id }] })).rows[0]!["waitlist_on"]).toBe(true);

          const order = await box.newOrder({ values: { event_id: show.id, buyer_name: "Yes No", email: "yes.no@example.com" }, tickets: [{ ticket_type_id: show.types[0]!.id }, { ticket_type_id: show.types[0]!.id }] }, key("yesno"));
          await box.move(order.data.id, "door", {}, "held");
          const pay = await box.recordPayment(order.data.id, 5, "cash", null, key("pay"));
          await box.update("payments", pay.id, { voided: true });
          const paid = (await box.list("payments", { where: [{ column: "id", eq: pay.id }] })).rows[0]!;
          expect(paid["voided"]).toBe(true);
          expect(Number((await box.list("orders", { where: [{ column: "id", eq: order.data.id }] })).rows[0]!["paid_in"])).toBe(0);
          await box.cancelTickets([order.tickets[0]!.id], "box_office");
          expect((await box.list("tickets", { where: [{ column: "id", eq: order.tickets[0]!.id }] })).rows[0]!["status"]).toBe("returned");
        }, 240_000);

        it("records money once per press, and never takes a let-go order's replay for a made one", async (ctx) => {
          needsWrites(() => ctx.skip());
          const box = await staffPort(ADMIN);
          const show = await ownShow(box, `Retry ${engine}`);
          const k = key("retry");
          const first = await box.newOrder({ values: { event_id: show.id, buyer_name: "Rae Try" }, tickets: [{ ticket_type_id: show.types[0]!.id }] }, k);
          // The step after the create failed: the order is let go.
          await box.move(first.data.id, "let_go", {}, "held");
          const again = await box.newOrder({ values: { event_id: show.id, buyer_name: "Rae Try" }, tickets: [{ ticket_type_id: show.types[0]!.id }] }, k);
          expect([again.replayed, again.data.id, again.data["status"]]).toEqual([true, first.data.id, "let_go"]);
          // A new press is a new key: a new order.
          const fresh = await box.newOrder({ values: { event_id: show.id, buyer_name: "Rae Try" }, tickets: [{ ticket_type_id: show.types[0]!.id }] }, key("retry"));
          expect(fresh.data.id).not.toBe(first.data.id);
          expect(await refusal(() => box.newOrder({ values: { event_id: show.id, buyer_name: "Rae Try" }, tickets: [{ ticket_type_id: show.types[0]!.id }], expect: { total: 1 } }, key("retry")))).toMatchObject({ code: "PRICE_CHANGED" });
          await box.move(fresh.data.id, "door", {}, "held");
          const pk = key("pay");
          const one = await box.recordPayment(fresh.data.id, 20, "cash", null, pk);
          const two = await box.recordPayment(fresh.data.id, 20, "cash", null, pk);
          expect(two.id).toBe(one.id);
          expect((await box.list("payments", { where: [{ column: "order_id", eq: fresh.data.id }] })).rows).toHaveLength(1);
        }, 240_000);

        it("claims a message before sending it: a second sender is refused, and a send picked up later reaches only those not reached", async (ctx) => {
          needsWrites(() => ctx.skip());
          const box = await staffPort(ADMIN);
          const show = await ownShow(box, `Message ${engine}`);
          const buyers: Row[] = [];
          for (let i = 0; i < 3; i += 1) {
            const o = await box.newOrder({ values: { event_id: show.id, buyer_name: `Buyer ${String(i)}`, email: `buyer${String(i)}.${engine}@example.com` }, tickets: [{ ticket_type_id: show.types[0]!.id }] }, key("msg"));
            buyers.push(await box.move(o.data.id, "door", {}, "held"));
          }
          const to = buyers.map((o) => ({ order_id: o.id, to_address: o["email"] }));
          const waiting = await box.broadcast({ event_id: show.id, audience: "everyone", template: "other", subject: "Doors at 19:00", body: "See you.", people: 3, order_count: 3 }, [], false);
          expect(waiting["status"]).toBe("waiting");
          const both = await Promise.allSettled([box.sendBroadcast(waiting.id, {}, to), box.sendBroadcast(waiting.id, {}, to)]);
          expect(both.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"]);
          expect((both.find((r) => r.status === "rejected") as PromiseRejectedResult).reason).toMatchObject({ code: "STATE_MOVE_REFUSED" });
          expect((await box.list("messages", { where: [{ column: "broadcast_id", eq: waiting.id }] })).total).toBe(3);
          // One that stopped part-way (claimed, one email written): finishing it writes the other two.
          const part = await box.broadcast({ event_id: show.id, audience: "everyone", template: "other", subject: "Set times", body: "Up.", people: 3, order_count: 3 }, [], false);
          await box.update("broadcasts", part.id, { status: "sending" }, "waiting");
          await box.mail("broadcast", [{ event_id: show.id, broadcast_id: part.id, ...to[0]! }]);
          expect((await box.sendBroadcast(part.id, {}, to))["status"]).toBe("sent");
          expect((await box.list("messages", { where: [{ column: "broadcast_id", eq: part.id }] })).total).toBe(3);
        }, 240_000);

        it("keeps a waitlist offer's order on the place, ends the offer by its order, and puts someone back at the end of the list", async (ctx) => {
          needsWrites(() => ctx.skip());
          const box = await staffPort(ADMIN);
          const show = await ownShow(box, `Waitlist ${engine}`, { waitlist_on: true }, [{ name: "Standard", price: 20, capacity: 2 }, { name: "Balcony", price: 30, capacity: 2 }]);
          const [std, bal] = show.types;
          const sold = await box.newOrder({ values: { event_id: show.id, buyer_name: "Full House", email: `full.${engine}@example.com` }, tickets: [{ ticket_type_id: std!.id }, { ticket_type_id: bal!.id }] }, key("wl"));
          await box.move(sold.data.id, "door", {}, "held");
          const people: Row[] = [];
          for (const who of ["kai", "ana"]) {
            const c = await box.create("customers", { email: `${who}.${engine}@example.com`, name: who });
            people.push(await box.create("waitlist", { event_id: show.id, customer_id: c.id, email: `${who}.${engine}@example.com`, qty: 2 }));
          }
          // A Standard and a Balcony come back: both are offered, each as its own type.
          await box.cancelTickets(sold.tickets.map((t) => t.id), "box_office");
          const offers = await box.offerWaitlist(show.id);
          expect(offers).toHaveLength(1);
          const offered = (await box.list("tickets", { where: [{ column: "order_id", eq: offers[0]!.id }] })).rows.map((t) => t["ticket_type_id"]).sort();
          expect(offered).toEqual([std!.id, bal!.id].sort());
          const place = (await box.list("waitlist", { where: [{ column: "id", eq: people[0]!.id }] })).rows[0]!;
          expect([place["status"], place["order_id"]]).toEqual(["offered", offers[0]!.id]);
          // Removed while offered: the offer's order runs out, and the place is missed.
          await box.move(offers[0]!.id, "expired", {}, "offered");
          const missed = await until(async () => {
            const row = (await box.list("waitlist", { where: [{ column: "id", eq: people[0]!.id }] })).rows[0]!;
            return row["status"] === "missed" ? row : undefined;
          }, "the place missed", 60_000);
          // Put back: waiting again, joined now (at the end of the list).
          const back = await box.update("waitlist", missed.id, { status: "waiting", qty: 1, order_id: null }, "missed");
          expect(back["status"]).toBe("waiting");
          expect(Date.parse(String(back["joined_at"]))).toBeGreaterThan(Date.parse(String(people[1]!["joined_at"])));
        }, 240_000);

        it("moves a show and its days in one write, and a save sends only what changed, keeping a colleague's new type", async (ctx) => {
          needsWrites(() => ctx.skip());
          const box = await staffPort(ADMIN);
          const show = await ownShow(box, `Moved ${engine}`);
          const day = (await box.list("event_days", { where: [{ column: "event_id", eq: show.id }] })).rows[0]!;
          const later = (iso: unknown) => new Date(Date.parse(String(iso)) + 7 * 86_400_000).toISOString();
          const ev = (await box.list("events", { where: [{ column: "id", eq: show.id }] })).rows[0]!;
          await box.saveEvent(show.id, { doors_at: later(ev["doors_at"]), starts_at: later(ev["starts_at"]), curfew_at: later(ev["curfew_at"]), ends_at: later(ev["curfew_at"]), was_starts_at: ev["starts_at"] }, { event_days: [{ id: day.id, doors_at: later(day["doors_at"]), curfew_at: later(day["curfew_at"]) }] });
          const moved = (await box.list("event_days", { where: [{ column: "event_id", eq: show.id }] })).rows;
          expect(moved.map((d) => [d.id, Date.parse(String(d["doors_at"]))])).toEqual([[day.id, Date.parse(later(day["doors_at"]))]]);
          // A colleague adds a type; this save changes only the show's words and sends the list as it is now.
          await box.saveEvent(show.id, {}, { ticket_types: [...show.types.map((t) => ({ id: t.id })), { name: "Late", kind: "standard", price: 15, capacity: 20, max_per_order: 8, visibility: "public", position: 1 }] });
          const now = (await box.list("ticket_types", { where: [{ column: "event_id", eq: show.id }] })).rows;
          await box.saveEvent(show.id, { about: "New words." }, { ticket_types: now.map((t) => ({ id: t.id })) });
          const after = (await box.list("ticket_types", { where: [{ column: "event_id", eq: show.id }] })).rows.map((t) => t["name"]).sort();
          expect(after).toEqual(["Late", "Standard"]);
          const still = (await box.list("events", { where: [{ column: "id", eq: show.id }] })).rows[0]!;
          expect([still["about"], Date.parse(String(still["doors_at"]))]).toEqual(["New words.", Date.parse(later(ev["doors_at"]))]);
        }, 240_000);

        it("cancels a show with more orders than a minute's requests at the pace Adminium allows, and a cancel stopped part-way is finished: every order, every email once", async (ctx) => {
          needsWrites(() => ctx.skip());
          const admin = await staffPort(ADMIN);
          const show = await ownShow(admin, `Big Cancel ${engine}`);
          const N = 160;
          for (let i = 0; i < N; i += 1) {
            const o = await admin.newOrder({ values: { event_id: show.id, buyer_name: `Guest ${String(i)}`, email: `guest${String(i)}.${engine}@example.com` }, tickets: [{ ticket_type_id: show.types[0]!.id }] }, key("big"));
            await admin.move(o.data.id, "door", {}, "held");
          }
          // Another person's own requests-a-minute: the cancel alone is more than one minute's (an order and an email each).
          const box = await boxPerson();
          const words = { subject: "Big Cancel is off", body: "Sorry — the show is cancelled." };
          await expect(cancelRun(box, show.id, words, { stopAfter: 60 })).rejects.toThrow("stopped");
          const midway = await cancelLeft(box, show.id);
          expect(midway.orders.length).toBeGreaterThan(0);
          expect(midway.message?.["status"]).toBe("waiting");
          // Over a minute's requests for one person: the rate limit is waited out, never met with a stop.
          const done = await cancelRun(box, show.id, { subject: "other words", body: "never sent" });
          expect(done.orders).toBe(N);
          const left = await cancelLeft(box, show.id);
          expect([left.orders.length, left.emails.length, left.message?.["status"]]).toEqual([0, 0, "sent"]);
          const orders = new Set((await box.list("orders", { where: [{ column: "event_id", eq: show.id }], limit: 1000 })).rows.map((o) => o.id));
          const mails = (await box.list("messages", { where: [{ column: "kind", in: ["cancelled-paid", "cancelled-unpaid"] }], limit: 20_000 })).rows.filter((m) => orders.has(m["order_id"] as number));
          // Each order's email once, none still held, with the first words typed.
          expect(new Set(mails.map((m) => m["order_id"])).size).toBe(mails.length);
          expect(mails.length).toBe(N);
          expect(mails.filter((m) => m["status"] === "held")).toEqual([]);
          expect(mails.every((m) => m["subject_override"] === words.subject)).toBe(true);
        }, 900_000);
      });

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
