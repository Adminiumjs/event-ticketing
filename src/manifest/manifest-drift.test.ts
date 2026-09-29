/**
 * `manifest.json` is written from `src/manifest/` (`npm run manifest`), and
 * this is what keeps the two from drifting: an edit to a module that was not
 * written out, or a hand edit to the file, fails here with the fix named.
 *
 * It also holds the manifest's own promises that the product's validator
 * cannot see: nobody in the audience reads anyone else's order, or anything
 * the box office keeps to itself; only the emailed confirm link moves a
 * transfer checkout on; a friend's page shows no code; nothing is marked paid
 * while money is owed; the door lets in only a paid ticket of its own show on
 * a day it admits; and the door can take a ticket's money but not record
 * another kind of payment.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildManifest, manifestText } from "./build.ts";
import { emailWords } from "./emails.ts";
import { OVERVIEW_LAYOUT } from "./overview.ts";
import { LOCALES, untranslated } from "./labels.ts";

const FILE = join(__dirname, "..", "..", "manifest.json");

type Json = Record<string, unknown>;
type Entry = Json & {
  table: string;
  methods: string[];
  key?: string;
  select?: string[];
  kind?: string;
  writableValues?: Record<string, unknown[]>;
};
type Move = string | { to: string; requires?: Json };
const manifest = buildManifest() as Json & {
  requiredSchema: { tables: (Json & { ref: string; columns: (Json & { ref: string })[]; states?: Json })[] };
  publicAccess: Entry[];
  roles: (Json & { key: string; permissions: string[]; limits?: Record<string, Json> })[];
  outbox: Json & { producers: Json[] };
};
const table = (ref: string) => manifest.requiredSchema.tables.find((t) => t.ref === ref)!;
const states = (t: string) => table(t)["states"] as Json & { moves: Record<string, Move[]>; effects?: Json[]; create?: Json };
const role = (key: string) => manifest.roles.find((r) => r.key === key)!;

describe("manifest.json is what src/manifest/ writes", () => {
  it("is byte for byte the modules' output — run `npm run manifest` after changing them", () => {
    expect(readFileSync(FILE, "utf8") === manifestText()).toBe(true);
  });

  it("has every label in every language (drafts until the native review)", () => {
    buildManifest();
    expect(untranslated()).toEqual([]);
  });

  it("has every email in every language, with the same variables as the English", () => {
    const words = emailWords();
    const vars = (value: unknown) => [...JSON.stringify(value).matchAll(/\{\{([A-Za-z_.]+)\}\}/g)].map((m) => m[1]).sort();
    for (const tag of LOCALES) {
      for (const kind of Object.keys(words["en-US"]) as (keyof (typeof words)["en-US"])[]) {
        expect(vars(words[tag][kind]), `${tag} ${String(kind)}`).toEqual(vars(words["en-US"][kind]));
      }
    }
  });

  it("reaches no email variable more than one link from the row it is about (Adminium fills no deeper; the email would not go)", () => {
    const FORMATS = new Set(["date", "time", "grouped", "qr"]);
    const deep = [...JSON.stringify(manifest["emailTemplates"]).matchAll(/\{\{([A-Za-z_.]+)\}\}/g)]
      .map((m) => m[1]!.split("."))
      .map((parts) => (FORMATS.has(parts[parts.length - 1]!) ? parts.slice(0, -1) : parts))
      .filter((parts) => parts.length > 3)
      .map((parts) => parts.join("."));
    expect([...new Set(deep)]).toEqual([]);
  });
});

describe("nobody in the audience reads what is not theirs", () => {
  const STAFF_ONLY = ["payments", "refunds", "door_collections", "guest_list", "codes", "broadcasts", "messages", "devices", "check_ins"];
  const NEVER = [
    "link_token",
    "confirm_token",
    "link_stopped",
    "client_key",
    "number_seq",
    "customer_id",
    "holder_customer_id",
    "cancel_cause",
    "cancel_reason",
    // A box-office note on an order; a room's note ("70 seated on the balcony") is the venue's own words.
    "note",
    "channel",
    "code_id",
    "waitlist_id",
    "recorded_by",
    "scanned_by",
    "order_status",
  ];

  it("reaches none of the box office's tables", () => {
    expect(manifest.publicAccess.filter((e) => STAFF_ONLY.includes(e.table)).map((e) => e.table)).toEqual([]);
  });

  it("selects no code, key, cause or name of who did what", () => {
    const leaks = manifest.publicAccess.flatMap((e) => (e.select ?? []).filter((c) => NEVER.includes(c) && !(e.table === "rooms" && c === "note")).map((c) => `${e.key ?? "customer"} ${e.table}.${c}`));
    expect(leaks).toEqual([]);
  });

  it("keeps a friend's code and address from the buyer who sent it, and every code back until the order is paid", () => {
    const buyerTickets = manifest.publicAccess.filter((e) => e.table === "tickets" && (e.select ?? []).includes("code") && e["visibleWith"] !== undefined);
    expect(buyerTickets.length).toBeGreaterThan(0);
    for (const e of buyerTickets) {
      expect(e["withhold"]).toEqual({
        columns: ["code", "holder_email"],
        unlessHolder: "holder_customer_id",
        when: { where: [{ column: "order_status", in: ["held", "confirming", "offered", "awaiting_transfer", "overdue", "released"] }] },
      });
    }
  });

  it("shows a friend the code on the page their link opens only once they accept it", () => {
    const friend = manifest.publicAccess.find((e) => e.table === "tickets" && e.key === "ticket")!;
    expect(friend.select).toContain("code");
    expect(friend["withhold"]).toEqual({ columns: ["code"], when: { where: [{ column: "holder_customer_id", isNull: true }] } });
    // The friend is found by the save that accepts, not by any save while the ticket has no holder.
    expect((friend["identity"] as { on?: unknown }).on).toEqual({ to: "valid" });
  });
});

describe("only the emailed confirm link moves a bank-transfer checkout on", () => {
  it("is listed by the confirm key alone", () => {
    const movers = manifest.publicAccess.filter((e) => e.table === "orders" && (e.writableValues?.["status"] ?? []).includes("awaiting_transfer"));
    expect(movers.map((e) => e.key)).toEqual(["confirm"]);
  });

  it("is sent only in the confirm emails (a checkout's, and a waitlist claim's by the offer's end)", () => {
    const templates = manifest["emailTemplates"] as { key: string }[];
    expect(templates.filter((template) => JSON.stringify(template).includes("confirm_token")).map((template) => template.key)).toEqual([
      "events-transfer-confirm",
      "events-transfer-confirm-offer",
    ]);
  });
});

describe("Adminium decides the money", () => {
  it("marks nothing paid while money is owed", () => {
    for (const [from, moves] of Object.entries(states("orders").moves)) {
      for (const move of moves) {
        const to = typeof move === "string" ? move : move.to;
        if (to !== "paid") continue;
        expect(typeof move === "string" ? null : move.requires, `${from} → paid`).toEqual({ where: [{ column: "balance", lte: 0 }] });
      }
    }
  });

  it("reaches no charge only with nothing to pay: a priced order's tickets never count as paid for nothing", () => {
    const into = Object.entries(states("orders").moves).flatMap(([from, moves]) => moves.filter((m) => (typeof m === "string" ? m : m.to) === "no_charge").map((m) => [from, m] as const));
    expect(into.map(([from]) => from).sort()).toEqual(["confirming", "held", "offered"]);
    for (const [from, move] of into) expect(typeof move === "string" ? null : move.requires, `${from} → no_charge`).toEqual({ where: [{ column: "total", lte: 0 }] });
  });

  it("stops a person's own order links when they delete their details", () => {
    const identity = manifest.publicAccess.find((e) => e.table === "customers" && e["forget"] !== undefined)!;
    expect((identity["forget"] as Json)["links"]).toBe(true);
  });

  it("never lets a buyer write a price, a total, a number, a code or a status the order does not allow", () => {
    const decided = ["price", "discount", "due", "total", "subtotal", "balance", "paid_in", "collected", "refunded", "number", "code", "held_until", "pay_by", "offer_until"];
    const writes = manifest.publicAccess.flatMap((e) => ((e["writable"] as string[] | undefined) ?? []).filter((c) => decided.includes(c)).map((c) => `${e.table}.${c}`));
    expect(writes).toEqual([]);
  });

  it("lets the clock and a waitlist offer move orders, and nothing else by effect", () => {
    expect((states("orders").effects ?? []).map((e) => e["via"])).toEqual(["waitlist_id", "waitlist_id", "waitlist_id", "waitlist_id"]);
    for (const t of manifest.requiredSchema.tables) if (t.ref !== "orders") expect((t.states as Json | undefined)?.["effects"], t.ref).toBeUndefined();
  });
});

describe("the door lets in only a paid ticket of its own show, on a day it admits, in the day's window", () => {
  const create = (states("check_ins").create as Json)["requires"] as Json;

  it("judges the show, the day, the ticket and the window on every check-in", () => {
    expect(create["where"]).toEqual([
      { column: "right_show", eq: 1 },
      { column: "admitted", eq: 1 },
    ]);
    expect(create["linked"]).toEqual([{ via: "ticket_id", where: [{ column: "status", in: ["valid", "offered"] }, { column: "settled", eq: 1 }] }]);
    expect(Object.keys(create["time"] as Json).sort()).toEqual(["after", "before"]);
  });

  it("lets a ticket in once a day", () => {
    expect(table("check_ins")["unique"]).toEqual([["ticket_id", "event_day_id"]]);
  });
});

describe("the door takes a ticket's money, not payments of another kind", () => {
  const door = role("door");

  it("records no payment and no refund", () => {
    expect(door.permissions.filter((p) => /:(payments|refunds):(create|update|delete)$/.test(p))).toEqual([]);
  });

  it("moves an order only to the door or to paid, and says it was paid by card or cash", () => {
    expect((door.limits?.["orders"] as Json)["writableValues"]).toEqual({ status: ["door", "paid"], channel: ["door"], paid_method: ["card", "cash"] });
  });

  it("works from the door screen only", () => {
    expect(door["screensOnly"]).toBe(true);
  });
});

describe("a cancellation email follows who cancelled, never the status alone", () => {
  it("sends the show's cancellation only for the show's cause, held for the box office", () => {
    const shows = manifest.outbox.producers.filter((p) => String(p["kind"]).startsWith("cancelled-"));
    expect(shows.length).toBe(3);
    for (const p of shows) {
      expect(p["hold"]).toBe(true);
      expect(((p["onChange"] as Json)["to"])).toBe("show");
    }
  });
});

describe("the Overview is drawn as written", () => {
  // A list column's type must be one the dashboard's lists know, or the card's whole setup is refused and it
  // falls back to plain columns (a moment of a show is `timestamptz`: a `date` would print the UTC day).
  const TYPES = ["text", "varchar", "integer", "bigint", "decimal", "float", "boolean", "date", "time", "timestamp", "timestamptz", "interval", "uuid", "json", "binary", "enum", "geometry", "inet", "unknown"];
  it("names only list column types the dashboard draws, and no moment of a show as a bare date", () => {
    const columns = OVERVIEW_LAYOUT.items.flatMap((item) => ((item.config as Json)["columns"] as Json[] | undefined) ?? []);
    expect(columns.length).toBeGreaterThan(0);
    expect(columns.filter((c) => c["logicalType"] !== undefined && !TYPES.includes(String(c["logicalType"])))).toEqual([]);
    expect(columns.filter((c) => String(c["name"]).endsWith("_at") && c["logicalType"] !== "timestamptz")).toEqual([]);
  });
});
