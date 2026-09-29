/**
 * The audience's real door against a server that does not answer: what this
 * device keeps when Adminium refuses (or never hears) a sign-out on every
 * device. The door against a real Adminium is the contract's.
 */
import { describe, expect, it } from "vitest";

import { AdminiumAudience } from "./adminiumAudience.ts";
import { ApiError } from "./wire.ts";

function tab(): { storage: Storage; store: Map<string, string> } {
  const store = new Map<string, string>();
  const storage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  } as unknown as Storage;
  return { storage, store };
}

describe("signing out on every device when Adminium does not take it", () => {
  it("drops this device's session all the same, and says it failed", async () => {
    const { storage, store } = tab();
    store.set("wv.session.customer", JSON.stringify({ token: "held-session", expiresAt: Date.now() + 3_600_000 }));
    const asked: string[] = [];
    const down = (async (input: RequestInfo | URL, init?: RequestInit) => {
      asked.push(`${init?.method ?? "GET"} ${new URL(String(input)).pathname}`);
      return new Response(JSON.stringify({ error: { code: "INTERNAL", message: "down" } }), { status: 503, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    const door = new AdminiumAudience({ baseUrl: "http://venue.test", publishableKey: "pk_customer" }, { fetch: down, storage });
    const failed = await door.signOutEverywhere().then(
      () => null,
      (error: unknown) => error,
    );
    expect(failed).toBeInstanceOf(ApiError);
    expect(asked).toEqual(["POST /api/v1/public/session/revoke-all", "DELETE /api/v1/public/session"]);
    // Nothing of the session is left here: not in the tab's storage, not in the client.
    expect(store.has("wv.session.customer")).toBe(false);
    expect(await door.me()).toBeNull();
  });
});

/** A fake Adminium answering by method and path; every request kept. */
function fakeServer(answer: (method: string, path: string) => { status: number; body: unknown }) {
  const asked: { method: string; path: string; auth: string | null; session: string | null }[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const headers = new Headers(init?.headers);
    const method = init?.method ?? "GET";
    asked.push({ method, path: url.pathname, auth: headers.get("authorization"), session: headers.get("x-adminium-public-session") });
    const got = answer(method, url.pathname);
    return new Response(JSON.stringify(got.body), { status: got.status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { asked, fetchImpl };
}
const refusalOf = (error: unknown) => (error instanceof ApiError ? [error.status, error.code] : error);

describe("the signed-in person's own account row", () => {
  it("is who is signed in; a fault reading it is a fault, never a stand-in", async () => {
    const { storage, store } = tab();
    store.set("wv.session.customer", JSON.stringify({ token: "held-session", expiresAt: Date.now() + 3_600_000 }));
    let down = false;
    const server = fakeServer((method, path) =>
      down
        ? { status: 503, body: { error: { code: "INTERNAL", message: "down" } } }
        : method === "GET" && path === "/api/v1/public/records/events_customers_claimed"
          ? { status: 200, body: { data: [{ email: "mia.okada@example.com", name: "Mia Okada", opt_in: false }] } }
          : { status: 404, body: { error: { code: "PUBLIC_REF_NOT_FOUND", message: "no" } } },
    );
    const door = new AdminiumAudience({ baseUrl: "http://venue.test", publishableKey: "pk_customer" }, { fetch: server.fetchImpl, storage });
    expect(await door.me()).toEqual({ email: "mia.okada@example.com", name: "Mia Okada" });
    down = true;
    expect((await door.me().then(() => null, refusalOf) as unknown[])[0]).toBe(503);
  });
});
