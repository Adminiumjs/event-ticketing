/**
 * Small rules a walk through the app found loose: an email's word in the
 * order timeline, a waiting postponement written for a day the show has
 * left, and what is left asked for every show at once.
 */
import { describe, expect, it } from "vitest";

import { AdminiumAudience } from "../data/adminiumAudience.ts";
import { KINDS } from "../manifest/outbox.ts";
import { staleMoved } from "./box.ts";
import { mailWord } from "./vals/boxOrders.ts";

describe("an email's word in the order timeline", () => {
  it("has one for every kind the app sends", () => {
    const bare = mailWord("no-such-kind");
    for (const kind of KINDS) expect(mailWord(kind), kind).not.toBe(bare);
  });
});

describe("a waiting postponement's words", () => {
  it("are stale when neither the subject nor the body names the show's new day", () => {
    expect(staleMoved("Hollow Tide has moved to Fri 11 Sep", "from Sat 15 Aug to Fri 11 Sep", "Fri 13 Nov")).toBe(true);
  });
  it("are kept when they name it, anywhere", () => {
    expect(staleMoved("A change of plan", "We now play on Fri 13 Nov.", "Fri 13 Nov")).toBe(false);
    expect(staleMoved("Hollow Tide has moved to Fri 13 Nov", "", "Fri 13 Nov")).toBe(false);
  });
  it("are kept when the show has no day to name", () => {
    expect(staleMoved("x", "y", "")).toBe(false);
  });
});

describe("what is left, for every show at once", () => {
  it("asks twenty shows a time, as one list", async () => {
    const asked: string[] = [];
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      asked.push(url.searchParams.get("under") ?? "");
      const first = (url.searchParams.get("under") ?? "").split(",")[0];
      return new Response(JSON.stringify({ data: [{ id: `${first}1`, state: "on", left: 3 }] }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    const door = new AdminiumAudience({ baseUrl: "http://venue.test", publishableKey: "pk_customer" }, { fetch: fetchImpl, storage: null });
    const ids = Array.from({ length: 23 }, (_, i) => i + 1);
    const left = await door.leftAll(ids);
    expect(asked).toEqual([ids.slice(0, 20).join(","), "21,22,23"]);
    expect(left).toEqual([
      { ticket_type_id: 11, state: "open", left: 3 },
      { ticket_type_id: 211, state: "open", left: 3 },
    ]);
  });
});
