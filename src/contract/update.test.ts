/**
 * THE VENUE'S UPDATE CONTRACT: THE RELEASED 0.2.4, UPDATED IN PLACE.
 *
 * On SQLite, Postgres and MySQL, along the path a venue takes:
 *
 *   1. install the RELEASED 0.2.4 — the published package's own bytes
 *      (`CONTRACT_FROM_TARBALL`), refused unless they hash to what
 *      RELEASES.json recorded — on the Adminium it was released for
 *      (`CONTRACT_FROM_ADMINIUM`, 0.3.9, its floor);
 *   2. its own sample, added at the demo's moment (16:30 on 28 July);
 *   3. buyers at work in 0.2.4, through 0.2.4's own doors: checkouts with
 *      "Email me about new shows" ticked and unticked, one buyer who ticked
 *      and later did not, one who did not and later did;
 *   4. ADMINIUM UPGRADED IN PLACE: that Adminium stopped, and the one this
 *      build needs (`ADMINIUM_REPO`) started on the same data directory,
 *      secret and database — the app still 0.2.4, and nothing in its tables
 *      moved by the upgrade;
 *   5. ENGINE FIRST: a buyer's address put on the do-not-email list, and
 *      0.2.4's tickets email still reaches them (an app that says no class is
 *      read as service mail);
 *   6. every table of the app read straight from the database (each value as
 *      the engine spells it, each column as the engine declares it) and over
 *      HTTP: the snapshot;
 *   7. THIS build uploaded: the plan is exactly one new column (a customer's
 *      language) — nothing dropped, renamed or rewritten — and it applies;
 *   8. every row that was there is unchanged, byte for byte, but for the one
 *      thing the update carries: each customer whose newest confirmed order
 *      ticked the box now has the newsletter's yes, with nothing in the
 *      consent log (the first send's review asks about them); the new column
 *      is empty on the rows that were there;
 *   9. THE APP NEXT: the tickets email still reaches the buyer on the
 *      do-not-email list (every kind is service mail);
 *  10. THE SAMPLE ON UPDATE: the update adds no sample rows; removing the
 *      sample afterwards keeps what the buyers themselves made.
 *
 * It runs where the plain contract runs, with the published package of the
 * release it updates and a built checkout of the Adminium that release was
 * made for; `ADMINIUM_REQUIRE_CONTRACT=1` makes a missing one a failure. Its
 * servers take ports from `CONTRACT_UPDATE_PORT_BASE`.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AdminiumAudience } from "../data/adminiumAudience.ts";
import { DEMO_CURRENCY, DEMO_START, DEMO_ZONE } from "../demo/world.ts";
import { TABLES } from "../manifest/tables.ts";
import { appBundle, boot, Caller, ENGINES, FROM_ADMINIUM, missing, ok, PORTS_PER_ENGINE, rawTables, releasedBundle, releasedMissing, until, type Engine, type RawTable, type Server } from "./harness.ts";

type Row = Record<string, unknown> & { id: number };

const REQUIRED = ["1", "true"].includes(process.env["ADMINIUM_REQUIRE_CONTRACT"] ?? "");
const why = missing() ?? releasedMissing();
if (why !== null && REQUIRED) throw new Error(`the update contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_UPDATE_PORT_BASE"] ?? Number(process.env["CONTRACT_PORT_BASE"] ?? 8670) + 30);
const ADMIN = { email: process.env["E2E_ADMIN_EMAIL"] ?? "e2e@adminium.local", password: process.env["E2E_ADMIN_PASSWORD"] ?? "adminium-e2e-password" };
const PREFIX = "events_";

/** What 0.2.5 adds to 0.2.4's tables, from the manifest: the update's plan must be exactly this. */
const NEW_TABLES: string[] = [];
const NEW_COLUMNS: Record<string, string[]> = { customers: ["language"] };

const yesNoColumns = (ref: string): string[] => (TABLES.find((t) => t.ref === ref)?.columns ?? []).filter((c) => c.type === "bool").map((c) => c.ref);
const yes = (value: unknown) => value === true || value === 1 || value === "1" || value === "true" || value === "t";
const realNow = () => performance.timeOrigin + performance.now();

const released = why === null ? releasedBundle() : null;
const FROM = released?.version ?? "0.2.4";
const TO = why === null ? appBundle().version : "0.2.5";

describe.skipIf(why !== null)(`the update of a live ${FROM} venue to ${TO}${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    describe.skipIf(!available)(`on ${engine}`, () => {
      const port = PORT_BASE + index * PORTS_PER_ENGINE;
      const database = `events_update_${engine}${process.env["CONTRACT_DB_SUFFIX"] ?? ""}`;
      let server: Server;
      let staff: Caller;
      let connectionId = "";
      let tableIds: Record<string, string> = {};
      let before: Record<string, RawTable> = {};
      let beforeHttp: Record<string, Row[]> = {};
      let sampleBefore = { loaded: false, total: 0 };
      /** The buyers of 0.2.4, by what they answered: ticked, unticked, ticked then not, not then ticked; and one stop-listed. */
      const buyer = (who: string) => `${who}.${engine}@waveform.dev`;
      const BUYERS = { ticked: buyer("ana"), unticked: buyer("ben"), thenNot: buyer("cai"), thenTicked: buyer("dee"), stopped: buyer("eli") };
      const orders: Record<string, number> = {};
      const house = mkdtempSync(join(tmpdir(), `events-update-${engine}-`));
      const ran = { from: "", to: "" };

      const signIn = async () => {
        staff = new Caller(server.base, { origin: server.base });
        await staff.signIn(ADMIN.email, ADMIN.password);
        const connections = ok(await staff.get<{ connections: { id: string; name: string }[] }>("/api/v1/connections"));
        connectionId = connections.connections.find((c) => c.name === "northwind")!.id;
        return ok(await staff.get<{ version: string }>("/api/v1/healthz")).version;
      };
      const learnTables = async () => {
        const schema = ok(await staff.get<{ model: { tables: { id: string; name: string }[] } }>(`/api/v1/connections/${connectionId}/schema`));
        tableIds = Object.fromEntries(schema.model.tables.map((t) => [t.name, t.id]));
      };
      const dataOf = (table: string) => `/api/v1/data/${connectionId}/${encodeURIComponent(tableIds[table]!)}`;
      const data = (ref: string) => dataOf(`${PREFIX}${ref}`);
      const rowsOf = async (table: string): Promise<Row[]> => {
        const out: Row[] = [];
        for (let offset = 0; ; offset += 200) {
          const page = ok(await staff.get<{ data: Row[] }>(`${dataOf(table)}?limit=200&offset=${String(offset)}`)).data;
          out.push(...page);
          if (page.length < 200) return out.sort((a, b) => Number(a.id) - Number(b.id));
        }
      };
      const rows = (ref: string) => rowsOf(`${PREFIX}${ref}`);
      const appRefs = () => Object.keys(tableIds).filter((name) => name.startsWith(PREFIX) && name !== `${PREFIX}sample_data`).map((name) => name.slice(PREFIX.length));
      const all = async () => Object.fromEntries(await Promise.all(appRefs().map(async (ref) => [ref, await rows(ref)] as const)));
      const raw = () => rawTables(engine as Engine, port, database, PREFIX);
      const sample = async () => ok(await staff.get<{ loaded: boolean; total: number }>("/api/v1/apps/events/sample-data"));
      const upload = async (bundle: { buffer: Buffer; integrity: string }) => {
        const reply = await staff.post(`/api/v1/apps/upload?expectedSha512=${encodeURIComponent(bundle.integrity)}`, bundle.buffer);
        expect([200, 201], JSON.stringify(reply.body).slice(0, 800)).toContain(reply.status);
      };
      /** The audience's own door, as a page on the server's origin opens it: the app's own port, against the installed version's doors. */
      const audience = async () => {
        const served = ok(await new Caller(server.base).get<{ publishableKey: string; publicKeys: Record<string, string>; tables: Record<string, string> }>("/apps/events/customer/surface-config.json"));
        const originFetch = ((input: RequestInfo | URL, init?: RequestInit) => {
          const headers = new Headers(input instanceof Request ? input.headers : undefined);
          new Headers(init?.headers).forEach((v, k) => headers.set(k, v));
          headers.set("origin", server.base);
          return fetch(input, { ...init, headers });
        }) as typeof fetch;
        return new AdminiumAudience({ baseUrl: server.base, publishableKey: served.publishableKey, publicKeys: served.publicKeys, tables: served.tables, receipts: false }, { storage: null, fetch: originFetch });
      };
      /** A checkout as the screens make it: held, the names, the tick (or not) at "Confirm", then pay at the door. */
      const checkout = async (email: string, show: string, tick: boolean): Promise<number> => {
        const aud = await audience();
        const venue = await aud.venue();
        const e = venue.events.find((found) => found["name"] === show)!;
        const standard = venue.types.find((t) => t["event_id"] === e.id && t["name"] === "Standard")!;
        const body = { values: { event_id: e.id, room_id: e["room_id"], buyer_name: "Lee Tan", email, language: "de-DE" }, tickets: [{ ticket_type_id: standard.id }] };
        const total = Number((await aud.quote(body)).data["total"]);
        const made = await aud.buy({ ...body, expect: { total } }, `upd-${engine}-${String(Date.now())}-${Math.random().toString(36).slice(2, 12)}`);
        const held = await aud.order();
        await aud.nameTicket(held.tickets[0]!.id, "Lee Tan");
        await aud.updateOrder({ opt_in: tick });
        expect((await aud.choose("door"))["status"]).toBe("door");
        return made.data.id;
      };
      /** The tickets email of an order, written by the box office as "Send the tickets again" writes it; its row once the outbox is done with it. */
      const sendTickets = async (orderId: number, to: string) => {
        const sinkBefore = ((await (await fetch(`${server.sink}/messages`)).json()) as unknown[]).length;
        const made = ok(await staff.post<{ data: Row }>(data("messages"), { values: { kind: "tickets", order_id: orderId, to_address: to } }), 201).data;
        const done = await until(async () => {
          const row = (await rows("messages")).find((m) => m.id === made.id);
          return row !== undefined && row["status"] !== "queued" ? row : undefined;
        }, `the tickets email to ${to}`, 150_000);
        const mail = done["status"] === "sent" ? await until(async () => ((await (await fetch(`${server.sink}/messages`)).json()) as { to: string[]; subject: string }[]).slice(sinkBefore).find((m) => m.to.includes(to)), `the mail to ${to}`, 60_000) : undefined;
        return { status: `${String(done["status"])}${done["skip_reason"] ? `: ${String(done["skip_reason"])}` : ""}${done["error"] ? `: ${String(done["error"])}` : ""}`, subject: mail?.subject ?? null };
      };

      beforeAll(async () => {
        server = await boot(engine as Engine, port, DEMO_START, { database, adminium: FROM_ADMINIUM, keep: house });
        ran.from = await signIn();
        ok(await staff.patch(`/api/v1/connections/${connectionId}`, { timezone: DEMO_ZONE, currency: DEMO_CURRENCY }));
      }, 240_000);

      afterAll(async () => {
        await server?.stop();
        rmSync(house, { recursive: true, force: true });
        rmSync(join(tmpdir(), `adminium-e2e-source-sqlite-${String(port)}.db`), { force: true });
      });

      // ── 0.2.4, released, at work ────────────────────────────────────────────

      it(`installs the RELEASED ${FROM} — the published package, byte for byte — on the Adminium it was released for`, async () => {
        const app = released!;
        await upload(app);
        const body = { key: app.key, version: app.version, connectionId };
        const plan = ok(await staff.post<{ plan: { installable: boolean; checksum: string } }>("/api/v1/apps/plan", body)).plan;
        expect(plan.installable).toBe(true);
        ok(await staff.post("/api/v1/apps/install", { ...body, planChecksum: plan.checksum }));
        ok(await staff.put("/api/v1/public-api", { enabled: true }));
        await learnTables();
        expect(appRefs().sort()).toEqual(TABLES.map((t) => t.ref).filter((ref) => !NEW_TABLES.includes(ref)).sort());
      }, 180_000);

      it(`adds ${FROM}'s own sample at 16:30 on 28 July`, async () => {
        const added = await staff.post("/api/v1/apps/events/sample-data");
        ok(added, added.status === 202 ? 202 : 200);
        // Postgres and MySQL take several minutes over the 4,500 rows and their rules.
        await until(async () => ((await sample()).loaded ? true : undefined), "the sample to be added", 900_000);
        expect((await rows("orders")).length).toBeGreaterThan(700);
      }, 1_000_000);

      it(`sells through ${FROM}'s own doors: ticked, unticked, ticked then not, not then ticked`, async () => {
        orders["ticked"] = await checkout(BUYERS.ticked, "Neon Circuit", true);
        orders["unticked"] = await checkout(BUYERS.unticked, "Neon Circuit", false);
        orders["thenNot1"] = await checkout(BUYERS.thenNot, "Cinder", true);
        orders["thenTicked1"] = await checkout(BUYERS.thenTicked, "Cinder", false);
        orders["stopped"] = await checkout(BUYERS.stopped, "Cinder", false);
        // A second order a moment later (a moment's column keeps seconds on some engines): the newest answer is this one.
        await new Promise((resolve) => setTimeout(resolve, 1_500));
        orders["thenNot2"] = await checkout(BUYERS.thenNot, "Neon Circuit", false);
        orders["thenTicked2"] = await checkout(BUYERS.thenTicked, "Neon Circuit", true);
        const byId = new Map((await rows("orders")).map((o) => [o.id, o]));
        expect(Object.entries(orders).map(([what, id]) => [what, byId.get(id)!["status"], yes(byId.get(id)!["opt_in"])])).toEqual([
          ["ticked", "door", true],
          ["unticked", "door", false],
          ["thenNot1", "door", true],
          ["thenTicked1", "door", false],
          ["stopped", "door", false],
          ["thenNot2", "door", false],
          ["thenTicked2", "door", true],
        ]);
        // In 0.2.4 nothing copies the tick to the customer.
        const customers = await rows("customers");
        for (const email of Object.values(BUYERS)) expect([email, yes(customers.find((c) => c["email"] === email)!["opt_in"])]).toEqual([email, false]);
      }, 240_000);

      // ── Adminium upgraded ───────────────────────────────────────────────────

      it("upgrades Adminium in place to the one this build needs, on the same data, the app still at its release", async () => {
        // Twenty minutes on first, so that every ten-minute hold of the sample has run out, and then nothing moving.
        const movedTo = DEMO_START + 20 * 60_000;
        await server.moveClock(movedTo);
        const movedAt = realNow();
        const still = async () => {
          const a = await raw();
          await new Promise((resolve) => setTimeout(resolve, 3_000));
          const b = await raw();
          return JSON.stringify(a) === JSON.stringify(b) ? b : undefined;
        };
        const rawUnder = await until(still, "the database to be still", 240_000);
        await server.stop();
        server = await boot(engine as Engine, port, Math.round(movedTo + (realNow() - movedAt)), { database, keep: house });
        ran.to = await signIn();
        console.info(`[upgrade, ${engine}] Adminium ${ran.from} → ${ran.to}`);
        expect(ran.to).not.toBe(ran.from);
        const apps = ok(await staff.get<{ apps: { key: string; version: string; connectionId: string }[] }>("/api/v1/apps"));
        expect(apps.apps.filter((a) => a.key === "events").map((a) => [a.version, a.connectionId])).toEqual([[FROM, connectionId]]);
        // The upgrade itself writes nothing into the app's tables.
        expect(await raw()).toEqual(rawUnder);
        // Where emailed links point: the tickets email carries the order's own link.
        ok(await staff.put("/api/v1/settings/email", { publicOrigin: server.base }));
      }, 600_000);

      it(`still sends ${FROM}'s tickets email to a buyer on the do-not-email list: an app that says no class sends service mail`, async () => {
        const added = ok(await staff.post<{ data: { added: number } }>("/api/v1/consent/stop-list", { addresses: [BUYERS.stopped] })).data;
        expect(added.added).toBe(1);
        expect(await sendTickets(orders["stopped"]!, BUYERS.stopped)).toEqual({ status: "sent", subject: expect.stringMatching(/Cinder/) });
      }, 240_000);

      it("reads every table of the app, straight from the database and over HTTP, once nothing is moving", async () => {
        await until(
          async () => {
            const a = await raw();
            await new Promise((resolve) => setTimeout(resolve, 3_000));
            const b = await raw();
            return JSON.stringify(a) === JSON.stringify(b) ? (before = b) : undefined;
          },
          "the database to be still",
          180_000,
        );
        await learnTables();
        beforeHttp = await all();
        expect(Object.keys(beforeHttp).sort()).toEqual(TABLES.map((t) => t.ref).filter((ref) => !NEW_TABLES.includes(ref)).sort());
        sampleBefore = await sample();
        expect(sampleBefore.loaded).toBe(true);
      }, 240_000);

      // ── the update ──────────────────────────────────────────────────────────

      let plan: {
        installable: boolean;
        checksum: string;
        problems: unknown[];
        tables: { ref: string; table: string; class: string; action: string; edits: { kind: string; column: string; values?: string[] }[]; blocked: unknown[]; renameExistingTo?: string }[];
      };

      it(`plans the update to ${TO}: a customer's language, and nothing dropped, renamed or rewritten`, async () => {
        const app = appBundle();
        await upload(app);
        plan = ok(await staff.post<{ plan: typeof plan }>("/api/v1/apps/plan", { key: app.key, version: app.version, connectionId })).plan;
        console.info(
          `[update plan, ${engine}] ` +
            JSON.stringify({
              installable: plan.installable,
              problems: plan.problems,
              changed: plan.tables.filter((t) => t.action !== "reuse" || t.edits.length > 0 || t.blocked.length > 0).map((t) => ({ ref: t.ref, action: t.action, edits: t.edits, blocked: t.blocked })),
            }),
        );
        expect([plan.installable, plan.problems]).toEqual([true, []]);
        const byRef = Object.fromEntries(plan.tables.map((t) => [t.ref, t]));
        expect(Object.keys(byRef).sort()).toEqual(TABLES.map((t) => t.ref).sort());
        for (const ref of Object.keys(beforeHttp)) {
          const planned = byRef[ref]!;
          expect([ref, planned.action, planned.class, planned.table, planned.renameExistingTo, planned.blocked]).toEqual([ref, "reuse", "own-leftover", `${PREFIX}${ref}`, undefined, []]);
          expect([ref, planned.edits.filter((e) => e.kind === "add-column").map((e) => e.column).sort()]).toEqual([ref, NEW_COLUMNS[ref] ?? []]);
          expect([ref, planned.edits.filter((e) => e.kind !== "add-column")]).toEqual([ref, []]);
        }
      }, 120_000);

      it(`updates in place to ${TO}, as planned`, async () => {
        const reply = await staff.post<{ from: string; to: string; app: { version: string; schema?: { created: string[] }; rules?: { skipped: unknown[] } } }>("/api/v1/apps/events/update", {
          planChecksum: plan.checksum,
          // What the new version's doors do (the tick kept in the consent log) is the operator's to allow.
          publicAccess: true,
        });
        expect(reply.status, JSON.stringify(reply.body).slice(0, 1500)).toBe(200);
        const updated = reply.body;
        console.info(`[update reply, ${engine}] ${JSON.stringify({ from: updated.from, to: updated.to, schema: updated.app.schema, rulesSkipped: updated.app.rules?.skipped })}`);
        expect([updated.from, updated.to, updated.app.version]).toEqual([FROM, TO, TO]);
        expect([...(updated.app.schema?.created ?? [])]).toEqual([]);
        expect(JSON.stringify(updated.app.rules?.skipped ?? [])).toBe("[]");
        await learnTables();
      }, 240_000);

      /** Each customer whose newest confirmed order ticked the box, worked out from the rows before the update. */
      const carried = () => {
        const newest = new Map<number, Row>();
        for (const order of beforeHttp["orders"]!) {
          const person = order["customer_id"];
          if (person === null || person === undefined || order["confirmed_at"] === null || order["confirmed_at"] === undefined) continue;
          const held = newest.get(Number(person));
          if (held === undefined || Date.parse(String(order["confirmed_at"])) > Date.parse(String(held["confirmed_at"]))) newest.set(Number(person), order);
        }
        return beforeHttp["customers"]!.filter((c) => typeof c["email"] === "string" && c["email"] !== "" && newest.has(c.id) && yes(newest.get(c.id)!["opt_in"]) !== yes(c["opt_in"])).map((c) => c.id);
      };

      it("keeps every row that was there, byte for byte, but the newsletter's yes it carries to each customer whose newest order ticked it", async () => {
        const changed = carried();
        const byEmail = new Map(beforeHttp["customers"]!.map((c) => [String(c["email"]), c.id]));
        // Exactly the buyers who ticked last: the one who ticked, and the one who ticked on the later order.
        expect(changed.sort((a, b) => a - b)).toEqual([byEmail.get(BUYERS.ticked)!, byEmail.get(BUYERS.thenTicked)!].sort((a, b) => a - b));
        const after = await raw();
        const added: Record<string, string[]> = {};
        const redeclared: string[] = [];
        for (const [name, was] of Object.entries(before)) {
          const now = after[name];
          expect(now, `${name} is still there`).toBeDefined();
          expect([name, now!.key]).toEqual([name, was.key]);
          added[name] = Object.keys(now!.columns).filter((c) => !(c in was.columns)).sort();
          for (const [column, declared] of Object.entries(was.columns)) {
            expect(now!.columns[column], `${name}.${column} is still there`).toBeDefined();
            if (now!.columns[column] !== declared) redeclared.push(`${name}.${column}: ${declared} → ${now!.columns[column]!}`);
          }
          expect([name, now!.rows.length]).toEqual([name, was.rows.length]);
          const kept = now!.rows.map((found) => Object.fromEntries(Object.keys(was.columns).map((c) => [c, found[c]])));
          if (name === `${PREFIX}customers`) {
            // The carried yes is the one change: the column, on exactly those rows, and nothing else of any row.
            const carriedIds = new Set(changed.map(String));
            const strip = (list: Record<string, string | null>[]) => list.map((r) => (carriedIds.has(String(r["id"])) ? { ...r, opt_in: "carried" } : r));
            expect(strip(kept), `the rows of ${name}`).toEqual(strip(was.rows));
            for (const r of kept.filter((found) => carriedIds.has(String(found["id"])))) expect([r["id"], yes(r["opt_in"])]).toEqual([r["id"], true]);
            for (const r of was.rows.filter((found) => carriedIds.has(String(found["id"])))) expect([r["id"], yes(r["opt_in"])]).toEqual([r["id"], false]);
          } else {
            expect(kept, `the rows of ${name}`).toEqual(was.rows);
          }
          for (const column of added[name]!) expect([name, column, now!.rows.filter((found) => found[column] !== null).length]).toEqual([name, column, 0]);
        }
        console.info(`[redeclared, ${engine}] ${JSON.stringify(redeclared)}`);
        expect(redeclared).toEqual([]);
        expect(Object.fromEntries(Object.entries(added).filter(([, list]) => list.length > 0))).toEqual(Object.fromEntries(Object.entries(NEW_COLUMNS).map(([ref, list]) => [`${PREFIX}${ref}`, list])));
        // And over HTTP: every row Adminium hands out is the one it handed out before, the carried yes apart.
        const nowHttp = await all();
        for (const [ref, list] of Object.entries(beforeHttp)) {
          const extra = NEW_COLUMNS[ref] ?? [];
          const bools = yesNoColumns(ref);
          const said = (rowsSaid: Record<string, unknown>[]) =>
            rowsSaid.map((found) =>
              Object.fromEntries(
                Object.entries(found)
                  .filter(([column]) => !extra.includes(column))
                  .map(([column, value]) => [column, ref === "customers" && column === "opt_in" && changed.includes(Number(found["id"])) ? "carried" : bools.includes(column) && (value === 1 || value === 0) ? value === 1 : value]),
              ),
            );
          expect(said(nowHttp[ref]!), `${ref} over HTTP`).toEqual(said(list));
        }
      }, 120_000);

      it("writes nothing in the consent log for a carried yes: the first send's review asks about it", async () => {
        const customers = await rows("customers");
        for (const email of [BUYERS.ticked, BUYERS.thenTicked, BUYERS.unticked]) {
          const customer = customers.find((c) => c["email"] === email)!;
          const panel = ok(await staff.post<{ data: { declared: boolean; purposes: { purpose: string; state: string }[]; history: unknown[] } }>("/api/v1/consent/panel", { connectionId, table: tableIds[`${PREFIX}customers`]!, recordId: String(customer.id) })).data;
          expect([email, panel.declared, panel.purposes.find((p) => p.purpose === "newsletter")!.state, panel.history]).toEqual([email, true, "not-asked", []]);
        }
      }, 120_000);

      // ── the app next ────────────────────────────────────────────────────────

      it(`still sends the tickets email to the buyer on the do-not-email list in ${TO}: every kind is service mail`, async () => {
        expect(await sendTickets(orders["stopped"]!, BUYERS.stopped)).toEqual({ status: "sent", subject: expect.stringMatching(/Cinder/) });
      }, 240_000);

      // ── the sample on update ────────────────────────────────────────────────

      it(`leaves the sample as ${FROM} added it: the update adds no sample rows`, async () => {
        const now = await sample();
        expect([now.loaded, now.total]).toEqual([sampleBefore.loaded, sampleBefore.total]);
      }, 60_000);

      it("removes the sample afterwards, keeping what the buyers themselves made", async () => {
        const removed = await staff.post<{ removed: number; kept: number }>("/api/v1/apps/events/sample-data/remove", { keepChanged: true });
        expect(removed.status, JSON.stringify(removed.body).slice(0, 800)).toBe(200);
        expect(removed.body.removed).toBeGreaterThan(0);
        expect((await sample()).loaded).toBe(false);
        const left = (await rows("orders")).map((o) => o.id);
        for (const id of Object.values(orders)) expect(left).toContain(id);
      }, 600_000);
    });
  });
});
