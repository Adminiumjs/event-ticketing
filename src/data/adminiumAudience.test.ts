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
