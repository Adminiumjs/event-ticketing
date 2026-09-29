/**
 * The audience's refs are the server's names for this app's public entries:
 * worked out here from the manifest the way the server does
 * (`planPublicEndpoints`: availability, unlock, claimed or verified, then a
 * `_2`, `_3` counted across all keys in order), and each ref pinned to the
 * entry it is meant to reach.
 */
import { describe, expect, it } from "vitest";

import { buildManifest } from "../manifest/build.ts";
import { PUBLIC_REFS, publicRefs, type RefName } from "./publicRefs.ts";

type Entry = {
  table: string;
  key?: string;
  kind?: string;
  claim?: unknown;
  claimedBy?: unknown;
  visibleWith?: unknown;
  unlockBy?: unknown;
  level?: string;
  methods: string[];
  writable?: string[];
  writableValues?: Record<string, string[]>;
  filters?: { column: string }[];
};

function serverRefs(entries: Entry[], real: (table: string) => string): string[] {
  const taken = new Set<string>();
  return entries.map((entry) => {
    const name = real(entry.table);
    const own = entry.claimedBy !== undefined || entry.visibleWith !== undefined;
    const sessionOnly = entry.level !== undefined && entry.claim === undefined && !own;
    const base =
      entry.kind === "availability"
        ? `${name}_availability`
        : entry.unlockBy !== undefined
          ? `${name}_unlocked`
          : entry.claim !== undefined || ((own || sessionOnly) && entry.level !== "verified")
            ? `${name}_claimed`
            : own || sessionOnly
              ? `${name}_verified`
              : name;
    let ref = base;
    for (let n = 2; taken.has(ref); n += 1) ref = `${base}_${String(n)}`;
    taken.add(ref);
    return ref;
  });
}

const entries = (buildManifest() as unknown as { publicAccess: Entry[] }).publicAccess;
const refs = serverRefs(entries, (t) => `events_${t}`);
const refOf = (find: (e: Entry) => boolean) => {
  const at = entries.findIndex(find);
  return at < 0 ? undefined : refs[at];
};
const has = (e: Entry, m: string) => e.methods.includes(m);
const writes = (e: Entry, c: string) => (e.writable ?? []).includes(c);
const moves = (e: Entry, to: string) => (e.writableValues?.["status"] ?? []).includes(to);
const plain = (e: Entry) => e.key === undefined && e.level === undefined && e.claim === undefined && e.claimedBy === undefined && e.visibleWith === undefined && e.kind === undefined && e.unlockBy === undefined;

describe("the audience's refs", () => {
  const r = publicRefs();
  const pin = (name: RefName, find: (e: Entry) => boolean) => expect([name, r[name]]).toEqual([name, refOf(find)]);

  it("name the venue's plain reads", () => {
    for (const [name, table] of [["settings", "settings"], ["rooms", "rooms"], ["events", "events"], ["days", "event_days"], ["types", "ticket_types"], ["questions", "questions"]] as const) {
      pin(name, (e) => e.table === table && plain(e));
    }
    pin("acts", (e) => e.table === "acts" && !(e.filters ?? []).some((f) => f.column === "sets_published"));
    pin("actTimes", (e) => e.table === "acts" && (e.filters ?? []).some((f) => f.column === "sets_published"));
    pin("codeTypes", (e) => e.table === "ticket_types" && e.unlockBy !== undefined);
    pin("left", (e) => e.table === "tickets" && e.kind === "availability");
  });

  it("name buying, joining a waitlist and a reminder", () => {
    pin("buy", (e) => e.table === "orders" && has(e, "POST"));
    pin("join", (e) => e.table === "waitlist" && has(e, "POST"));
    pin("remind", (e) => e.table === "reminders" && has(e, "POST"));
  });

  it("name the signed-in person's own", () => {
    pin("account", (e) => e.table === "customers" && e.claim !== undefined);
    pin("myOrders", (e) => e.table === "orders" && e.key === undefined && has(e, "GET"));
    pin("myTickets", (e) => e.table === "tickets" && e.key === undefined && has(e, "GET") && e.visibleWith !== undefined);
    pin("myNames", (e) => e.table === "tickets" && e.key === undefined && writes(e, "holder_name"));
    pin("myReturns", (e) => e.table === "tickets" && e.key === undefined && moves(e, "returned"));
    pin("myCancels", (e) => e.table === "tickets" && e.key === undefined && moves(e, "cancelled"));
    pin("heldTickets", (e) => e.table === "tickets" && e.key === undefined && e.claimedBy !== undefined);
    pin("myWaitlist", (e) => e.table === "waitlist" && has(e, "GET"));
    pin("myReminders", (e) => e.table === "reminders" && has(e, "GET"));
    pin("bank", (e) => e.table === "settings" && e.key === undefined && e.level === "verified");
  });

  it("name the order's own link, the confirm link and a friend's ticket, each on its key", () => {
    pin("linkOrder", (e) => e.table === "orders" && e.key === "link");
    pin("linkTickets", (e) => e.table === "tickets" && e.key === "link" && has(e, "GET"));
    pin("linkNames", (e) => e.table === "tickets" && e.key === "link" && writes(e, "holder_name"));
    pin("linkReturns", (e) => e.table === "tickets" && e.key === "link" && moves(e, "returned"));
    pin("linkCancels", (e) => e.table === "tickets" && e.key === "link" && moves(e, "cancelled"));
    pin("linkBank", (e) => e.table === "settings" && e.key === "link");
    pin("confirmOrder", (e) => e.table === "orders" && e.key === "confirm");
    pin("confirmBank", (e) => e.table === "settings" && e.key === "confirm");
    pin("ticket", (e) => e.table === "tickets" && e.key === "ticket");
  });

  it("follow the server's table names", () => {
    const renamed = publicRefs({ orders: "wv_orders" });
    expect([renamed.buy, renamed.linkOrder, renamed.settings]).toEqual(["wv_orders_verified_2", "wv_orders_claimed", "events_settings"]);
  });

  it("leave no entry of the manifest unnamed", () => {
    const named = new Set(Object.values(r));
    expect(refs.filter((ref) => !named.has(ref))).toEqual([]);
    expect(Object.keys(PUBLIC_REFS)).toHaveLength(refs.length);
  });
});
