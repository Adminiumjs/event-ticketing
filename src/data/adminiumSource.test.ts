// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Connected mode (28-public-surface.md §5.2, 28-T28).
 *
 * ── WHY THIS DRIVES A REAL CLIENT ──────────────────────────────────────────
 * `createPublicClient` takes an injectable `fetch`, so these run the SHIPPED
 * client against canned wire responses rather than a hand-written stub of it.
 * That puts `assertRefs`, the config fetch, the paging and the URL building
 * under test too — and those are where a connected app actually fails, not in
 * the mapping.
 *
 * ── WHAT IS WORTH ASSERTING, AND WHY ───────────────────────────────────────
 * Every property below fails SILENTLY if it breaks:
 *
 *  1. Demo mode survives an absent variable. Every marketplace demo is a static
 *     clone with no server; if that stopped meaning "demo", thirteen public
 *     demos would break at once and the build would still be green.
 *  2. The swap happens before the store reads. `state/store.ts` reads at module
 *     scope, so a late swap renders demo data against a real backend and looks
 *     completely fine.
 *  3. Times are the VENUE's. The app's absolute minutes are UTC-anchored and
 *     every formatter forces `timeZone: "UTC"`, so a mapping that skipped the
 *     tenant zone would print a London night an hour early — with no error.
 *  4. The whole ticket list is read. This venue seeds a thousand of them and a
 *     scope's page limit is the operator's number; a single-shot read returns
 *     page one and the door turns away everybody after it.
 *  5. A `void` ticket and an unpaid order do not become admissions.
 */

import { describe, expect, it } from "vitest";

import { createPublicClient } from "@adminiumjs/public-client";

import { loadSnapshot, snapshotSource } from "./adminiumSource.ts";
import { demoSource, isConnected, setDataSource, source } from "./source.ts";

const REFS = ["venues", "events", "ticketTypes", "orders", "tickets"];

const ROWS: Record<string, unknown[]> = {
  venues: [{ id: 1, name: "Main Hall" }],
  events: [
    {
      id: 1,
      slug: "neon-circuit",
      venue_id: 1,
      name: "Neon Circuit",
      description: "Modular hardware and a very loud room.",
      // 21:00 UTC is 22:00 in London in July. Everything below is asserted
      // against the LONDON wall clock, which is the whole point.
      starts_at: "2026-07-28T21:00:00Z",
      doors_at: "2026-07-28T20:00:00Z",
      image: "",
      status: "on_sale",
    },
  ],
  ticketTypes: [
    {
      id: 8, event_id: 1, name: "Standard", price: "28.00",
      capacity: 260, sales_start: null, position: 1,
    },
    {
      id: 7, event_id: 1, name: "Early entry", price: "22.00",
      capacity: 80, sales_start: "2026-06-26T10:00:00Z", position: 0,
    },
  ],
  orders: [
    {
      id: 100, number: "WV-8814", buyer_name: "Mia Okada", email: "mia@example.test",
      total: "50.00", status: "paid", placed_at: "2026-07-20T09:15:00Z",
    },
    {
      id: 101, number: "WV-8815", buyer_name: "Someone Else", email: "no@example.test",
      total: "28.00", status: "pending", placed_at: "2026-07-28T16:20:00Z",
    },
  ],
  tickets: [
    { id: 1, code: "WV-8814-01", order_id: 100, ticket_type_id: 7, attendee_name: null, status: "valid", checked_in_at: null },
    { id: 2, code: "WV-8814-02", order_id: 100, ticket_type_id: 8, attendee_name: "Kai Renner", status: "checked_in", checked_in_at: "2026-07-28T20:12:00Z" },
    { id: 3, code: "WV-8814-03", order_id: 100, ticket_type_id: 7, attendee_name: null, status: "void", checked_in_at: null },
  ],
};

interface FakeOptions {
  rows?: Record<string, unknown[]>;
  expose?: (ref: string) => string[];
  /** The scope's per-ref page ceiling — the operator's number, not the app's. */
  limit?: number;
}

/** A server that answers exactly what the scope would, paging included. */
function fakeFetch(overrides: FakeOptions = {}) {
  const rows = overrides.rows ?? ROWS;
  const limit = overrides.limit ?? 500;
  return async (input: RequestInfo | URL): Promise<Response> => {
    const url = new URL(String(input));
    const json = (body: unknown) =>
      new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

    if (url.pathname.endsWith("/public/config")) {
      const refs: Record<string, unknown> = {};
      for (const ref of REFS) {
        refs[ref] = {
          actions: ["list"],
          // Everything the source asks for, unless a case narrows it.
          expose: overrides.expose?.(ref) ?? Object.keys((rows[ref]?.[0] ?? {}) as object),
          filterable: [], searchable: [], orderable: [], writable: [], limit,
        };
      }
      // `/public/config` is the one route the client unwraps: it reads
      // `body.data`, while `list` reads the body itself.
      return json({
        data: { version: 1, side: "staff", timezone: "Europe/London", currency: "GBP", claim: null, refs },
      });
    }

    const ref = url.pathname.split("/").pop() ?? "";
    const all = rows[ref] ?? [];
    // Honour the window the caller asked for — a fake that ignores it cannot
    // tell a paging bug from a working read.
    const offset = Number(url.searchParams.get("offset") ?? "0");
    const size = Number(url.searchParams.get("limit") ?? String(all.length));
    return json({ data: all.slice(offset, offset + size) });
  };
}

const clientWith = (fetch: ReturnType<typeof fakeFetch>) =>
  createPublicClient({ baseUrl: "https://api.example.test", publishableKey: "adm_pub_test", fetch });

const snapshot = async (overrides: FakeOptions = {}) =>
  loadSnapshot(clientWith(fakeFetch(overrides))!);

describe("demo mode is the structural default", () => {
  it("builds no client when either variable is absent", () => {
    // The marketplace demos are static clones with no server. This is the one
    // condition (§5.4) that keeps all thirteen of them working.
    expect(createPublicClient({ baseUrl: "https://x.test", publishableKey: "" })).toBeNull();
    expect(createPublicClient({ baseUrl: "", publishableKey: "adm_pub_x" })).toBeNull();
    expect(createPublicClient(undefined)).toBeNull();
  });

  it("falls back rather than throwing when the server is unreachable", async () => {
    const client = clientWith(async () => {
      throw new Error("ECONNREFUSED");
    });
    expect(await loadSnapshot(client!)).toBeNull();
  });

  it("falls back when the scope does not expose a column the app reads", async () => {
    // An operator can narrow a scope at any time. `assertRefs` turns that into
    // one legible boot failure instead of a 403 on whichever screen reads it.
    expect(await snapshot({ expose: (ref) => (ref === "tickets" ? ["code"] : ["id"]) })).toBeNull();
  });
});

describe("the snapshot maps the wire onto the app's shapes", () => {
  it("keys a show by its slug and reads its room from the venue", async () => {
    const snap = await snapshot();
    expect(snap).not.toBeNull();
    const show = snap!.shows[0]!;
    expect(show.id).toBe("neon-circuit");
    expect(show.name).toBe("Neon Circuit");
    // Operator text where the seed held an i18n key: `label()` resolves with
    // `tOr(key, key)`, so a value that is not a key renders literally.
    expect(show.room).toBe("Main Hall");
    expect(show.desc).toBe("Modular hardware and a very loud room.");
    // WS-I G-1/G-3: no column for the kind of night, none for a lineup.
    expect(show.sub).toBe("");
    expect(show.lineup).toEqual([]);
  });

  it("builds every time from the venue's zone, not the reader's", async () => {
    const snap = await snapshot();
    const show = snap!.shows[0]!;
    // 21:00Z in July is 22:00 in London. Reading the instant as UTC — which is
    // what the app's own formatters do — would print the night an hour early.
    expect(show.start).toBe(22 * 60);
    expect(show.doors).toBe(21 * 60);
    // WS-I G-2: no `ends_at`, so one rule for every row — three hours on.
    expect(show.end).toBe(60);
  });

  it("orders ticket types by position and carries prices as cents", async () => {
    const snap = await snapshot();
    const types = snap!.shows[0]!.types;
    // Seeded out of order on purpose: `position` is the list order, not the
    // order the rows happened to arrive in.
    expect(types.map((t) => t.name)).toEqual(["Early entry", "Standard"]);
    // `numeric` arrives as a string and must not reach arithmetic as one.
    expect(types.map((t) => t.price)).toEqual([2200, 2800]);
    // No slug on `ticket_types`, so a type is its row id — the people-ops
    // pattern. Internally consistent because every reference is a foreign key.
    expect(types.map((t) => t.id)).toEqual(["7", "8"]);
    // A NULL window means "on sale as soon as the night is".
    expect(types[1]!.saleStart).toBeUndefined();
    // The show's own on-sale is derived from the earliest window it declares.
    expect(snap!.shows[0]!.saleStart).toBe(types[0]!.saleStart);
  });

  it("drops a void ticket and an unpaid order rather than admitting them", async () => {
    const snap = await snapshot();
    // Three ticket rows, one of them refunded: two admissions.
    expect(snap!.tickets.map((t) => t.code)).toEqual(["WV-8814-01", "WV-8814-02"]);
    // Two orders, one still a cart: one purchase.
    expect(snap!.orders.map((o) => o.code)).toEqual(["WV-8814"]);
    expect(snap!.orders[0]!.tickets).toEqual(["WV-8814-01", "WV-8814-02"]);
    expect(snap!.orders[0]!.total).toBe(5000);
  });

  it("falls back to the buyer for a ticket with no attendee named", async () => {
    const snap = await snapshot();
    expect(snap!.tickets[0]!.holder).toBe("Mia Okada");
    expect(snap!.tickets[1]!.holder).toBe("Kai Renner");
    expect(snap!.tickets[0]!.evId).toBe("neon-circuit");
    // 20:12Z is 21:12 in London — the same conversion as the show's own times.
    expect(snap!.tickets[1]!.checkedInAt).toBe(snap!.shows[0]!.date * 1440 + 21 * 60 + 12);
  });

  it("continues the tenant's own box-office sequence", async () => {
    const snap = await snapshot();
    // WV-8815 is taken by the unpaid cart, so the next number is 8816. A number
    // already issued must not be minted twice, paid or not.
    expect(snap!.nextSeq).toBe(8816);
  });

  it("opens on a real show instead of the seed's pinned slug", async () => {
    const snap = await snapshot();
    // `demo.ts` pins this to "neon". A connected build that kept that would
    // route every visitor to the not-found screen, with every row around it
    // real — which reads as a routing bug for a day.
    expect(snap!.featured).toBe("neon-circuit");
  });

  it("derives the art and the chip stably, and marks them as presentation", async () => {
    const first = await snapshot();
    const second = await snapshot();
    // Stable per slug: adding a show must not recolour the ones beside it.
    expect(first!.shows[0]!.art).toEqual(second!.shows[0]!.art);
    expect(first!.shows[0]!.art[0]).toMatch(/^--art-[a-f]1$/);
    // Room initials plus the date. WS-I G-4: there is no chip column.
    expect(first!.shows[0]!.chip).toBe("MH·JUL28");
    // `image` is the only column of the icon's shape; empty falls back.
    expect(first!.shows[0]!.icon).toBe("music");
  });

  it("reads every page, not just the first the scope allows", async () => {
    // THE FAILURE THIS PINS. A scope whose per-ref ceiling is one row makes a
    // single-shot read return one ticket out of three, with a 200 and no
    // warning — and the door then turns away everybody who is not on page one.
    const snap = await snapshot({ limit: 1 });
    expect(snap!.tickets).toHaveLength(2);
    expect(snap!.shows[0]!.types).toHaveLength(2);
  });

  it("hands back the same shapes demoSource does", async () => {
    const connected = snapshotSource((await snapshot())!);
    for (const key of ["shows", "tickets", "orders", "holds", "nextOrderSeq", "now", "featured"] as const) {
      expect(typeof connected[key]).toBe("function");
    }
    // WS-I G-5: there is no holds table, so nothing is held.
    expect(connected.holds()).toEqual([]);
    // Never on a connected build — a real buyer's address is not a hint.
    expect(connected.exampleBuyer()).toBeNull();
    // Copied on the way out, like the demo source: a caller that mutates what
    // it is given must not reach back into the snapshot.
    connected.shows()[0]!.types.push({ id: "x", name: "x", note: "", price: 0, cap: 0 });
    expect(connected.shows()[0]!.types).toHaveLength(2);
  });
});

describe("the seam", () => {
  it("reports demo mode until a real source is installed", () => {
    expect(isConnected()).toBe(false);
  });

  it("refuses a swap that arrives after the store has read", () => {
    // THE SILENT FAILURE THIS PINS. `state/store.ts` reads at module scope, so
    // a static `import App` evaluates it during main.tsx's own imports — before
    // any fetch can resolve. The app then renders demo data against a
    // configured backend and looks entirely correct. Nothing else notices.
    source.shows();
    expect(() => setDataSource(demoSource)).toThrow(/after the store already read/);
  });
});
