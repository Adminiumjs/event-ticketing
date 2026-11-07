/**
 * The staff surface's connection binding.
 *
 * Every case here is a way the answer can be ABSENT, because absent is the
 * common case — unbound surfaces, and any Adminium older than the binding —
 * and all of them must keep the app booting on its old inference.
 */
import { describe, expect, it, vi } from "vitest";

import { configBase, loadAttachedAddOns, loadStaffConfig, resolveStaffConnectionId } from "./staffConnection.ts";

const ok = (doc: unknown) =>
  vi.fn(async () =>
    new Response(JSON.stringify(doc), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  ) as unknown as typeof fetch;

/** A server that answers each config path with its own document, and 404 elsewhere. */
const byPath = (docs: Record<string, unknown>) =>
  vi.fn(async (input: unknown) => {
    const doc = docs[String(input)];
    return doc === undefined ? new Response("{}", { status: 404 }) : new Response(JSON.stringify(doc), { status: 200, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;

describe("resolveStaffConnectionId", () => {
  it("reads the bound connection from the served document", async () => {
    const fetchImpl = ok({ connectionId: "con_42" });
    expect(
      await resolveStaffConnectionId({ hostedStaff: true, base: "/apps/clients/staff/", fetchImpl }),
    ).toBe("con_42");
  });

  it("returns null for an UNBOUND surface — a complete answer, not a failure", async () => {
    const fetchImpl = ok({ connectionId: null });
    expect(
      await resolveStaffConnectionId({ hostedStaff: true, base: "/apps/clients/staff/", fetchImpl }),
    ).toBeNull();
  });

  it("returns null when an older server answers with the SPA index", async () => {
    // The route does not exist there; the wildcard serves index.html and
    // `json()` throws. The app must still boot against that Adminium.
    const fetchImpl = vi.fn(
      async () => new Response("<!doctype html><html></html>", { status: 200 }),
    ) as unknown as typeof fetch;
    expect(
      await resolveStaffConnectionId({ hostedStaff: true, base: "/apps/clients/staff/", fetchImpl }),
    ).toBeNull();
  });

  it("never asks on a non-staff build", async () => {
    // A demo or customer bundle has no session and no business fetching this.
    const fetchImpl = ok({ connectionId: "con_42" });
    expect(await resolveStaffConnectionId({ hostedStaff: false, fetchImpl })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("configBase", () => {
  const BAKED = "/apps/clients/staff/";

  it("asks the INSTANCE mount when the page is served from one", () => {
    expect(configBase(BAKED, "/apps/clients/berlin/staff/invoices")).toBe(
      "/apps/clients/berlin/staff/",
    );
  });

  it("keeps the baked base on the unslugged mount", () => {
    expect(configBase(BAKED, "/apps/clients/staff/invoices")).toBe(BAKED);
  });

  it("asks `/` on a MAPPED DOMAIN, which is the only place its instance is known", () => {
    /*
     * Reversed deliberately. This returned the baked `/apps/…` form while
     * nothing answered at the root — but a mapped host can now point at an
     * instance, and the bundle never sees the domain map, so the root document
     * is the only thing that can tell it which database it belongs to. Asking
     * the baked form would pin every mapped host to the app's own.
     */
    expect(configBase(BAKED, "/invoices/7")).toBe("/");
    expect(configBase(BAKED, "/")).toBe("/");
  });

  it("never reads the unslugged mount as an instance called `staff`", () => {
    // `/apps/clients/staff/staff` is a deep link, not an instance.
    expect(configBase(BAKED, "/apps/clients/staff/staff")).toBe(BAKED);
  });

  it("ignores an instance path belonging to a DIFFERENT app or side", () => {
    // One bundle must never fetch another surface's binding.
    expect(configBase(BAKED, "/apps/clinic/berlin/staff/x")).toBe(BAKED);
    expect(configBase(BAKED, "/apps/clients/berlin/customer/x")).toBe(BAKED);
  });
});

describe("loadStaffConfig", () => {
  it("reads everything a till boots from, and keeps nothing it does not understand", async () => {
    const fetchImpl = ok({
      connectionId: "con_42",
      installId: "ins_7",
      appName: null,
      tables: { tickets: "pos_tickets", odd: 7 },
      settings: { business_type: "retail" },
      timezone: "Europe/Lisbon",
      timezoneSource: "operator",
      serverTimezone: "UTC",
      currency: "EUR",
      now: "2026-07-28T13:05:00.000Z",
      user: { id: "usr_1", name: "Cara", email: "cara@example.com" },
      csrfToken: "tok",
      publicKeys: { kiosk: "adm_pub_k", broken: 3 },
      access: { tables: { tickets: ["read", "update", "fly"], odd: "all" }, roles: [{ slug: "pos-cashier", name: "POS cashier" }, { name: "no slug" }] },
      addOns: { invoices: { version: "1.0.3", settings: { business_name: "Harbour Café" } }, odd: 3 },
    });
    expect(await loadStaffConfig({ hostedStaff: true, base: "/apps/pos/staff/", fetchImpl })).toEqual({
      connectionId: "con_42",
      installId: "ins_7",
      appName: null,
      tables: { tickets: "pos_tickets" },
      settings: { business_type: "retail" },
      timezone: "Europe/Lisbon",
      timezoneSource: "operator",
      serverTimezone: "UTC",
      currency: "EUR",
      now: "2026-07-28T13:05:00.000Z",
      user: { id: "usr_1", name: "Cara", email: "cara@example.com" },
      csrfToken: "tok",
      publicKeys: { kiosk: "adm_pub_k" },
      access: { tables: { tickets: ["read", "update"] }, roles: [{ slug: "pos-cashier", name: "POS cashier" }] },
      addOns: { invoices: { version: "1.0.3", settings: { business_name: "Harbour Café" } } },
    });
  });

  it("says nothing of access when the server said nothing, so no button is hidden on a guess", async () => {
    const fetchImpl = ok({ connectionId: "con_42", tables: {} });
    const config = await loadStaffConfig({ hostedStaff: true, base: "/apps/pos/staff/", fetchImpl });
    expect(config?.access).toBeNull();
    expect(config?.publicKeys).toEqual({});
    // No add-on said attached: a feature that needs one stays off.
    expect(config?.addOns).toEqual({});
  });

  it("is null outside a hosted staff build", async () => {
    const fetchImpl = ok({});
    expect(await loadStaffConfig({ hostedStaff: false, fetchImpl })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("names no install from an Adminium too old to say, so no install header is sent", async () => {
    const config = await loadStaffConfig({ hostedStaff: true, base: "/apps/events/staff/", fetchImpl: ok({ connectionId: "con_42" }) });
    expect(config?.installId).toBeNull();
  });

  it("gives a second install, served at its own mount, its own install id and database", async () => {
    const fetchImpl = byPath({
      "/apps/events/staff/surface-config.json": { connectionId: "con_hall", installId: "ins_hall" },
      "/apps/events/arena/staff/surface-config.json": { connectionId: "con_arena", installId: "ins_arena" },
    });
    const first = await loadStaffConfig({ hostedStaff: true, base: configBase("/apps/events/staff/", "/apps/events/staff/"), fetchImpl });
    const second = await loadStaffConfig({ hostedStaff: true, base: configBase("/apps/events/staff/", "/apps/events/arena/staff/door"), fetchImpl });
    expect([first?.installId, first?.connectionId]).toEqual(["ins_hall", "con_hall"]);
    expect([second?.installId, second?.connectionId]).toEqual(["ins_arena", "con_arena"]);
  });
});

describe("loadAttachedAddOns", () => {
  const docs = {
    "/apps/events/customer/surface-config.json": { publishableKey: "adm_pub_hall", addOns: { invoices: { keys: {} } } },
    "/apps/events/arena/customer/surface-config.json": { publishableKey: "adm_pub_arena" },
  };

  it("reads a later install's own add-ons from its own mount, not the first install's", async () => {
    const fetchImpl = byPath(docs);
    // The arena has no Invoices; the hall does. The arena's page must not offer receipts.
    expect(await loadAttachedAddOns({ hosted: true, base: configBase("/apps/events/customer/", "/apps/events/arena/customer/o"), fetchImpl })).toEqual({});
    expect(await loadAttachedAddOns({ hosted: true, base: configBase("/apps/events/customer/", "/apps/events/customer/"), fetchImpl })).toEqual({ invoices: { keys: {} } });
    expect(vi.mocked(fetchImpl).mock.calls.map((call) => String(call[0]))).toEqual([
      "/apps/events/arena/customer/surface-config.json",
      "/apps/events/customer/surface-config.json",
    ]);
  });

  it("is null outside a hosted build, and when no config answers", async () => {
    const fetchImpl = byPath(docs);
    expect(await loadAttachedAddOns({ hosted: false, fetchImpl })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(await loadAttachedAddOns({ hosted: true, base: "/apps/events/gone/customer/", fetchImpl })).toBeNull();
  });
});
