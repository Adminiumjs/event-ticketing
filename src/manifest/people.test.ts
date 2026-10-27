/**
 * The venue's people, as the manifest tells Adminium of them: who a customer
 * is and where they are copied, which emails the do-not-email list may stop
 * (none), which tables the law keeps, and the checkout's tick — declared with
 * the very sentences the checkout shows, and the only way the newsletter is
 * said yes to from the audience's side.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import ar from "../i18n/strings/wave/ar-EG.json" with { type: "json" };
import cs from "../i18n/strings/wave/cs-CZ.json" with { type: "json" };
import da from "../i18n/strings/wave/da-DK.json" with { type: "json" };
import de from "../i18n/strings/wave/de-DE.json" with { type: "json" };
import fr from "../i18n/strings/wave/fr-FR.json" with { type: "json" };
import zhCN from "../i18n/strings/wave/zh-CN.json" with { type: "json" };
import zhTW from "../i18n/strings/wave/zh-TW.json" with { type: "json" };
import { mailClassOf } from "../testing/manifest/mail-class.ts";
import { buildManifest } from "./build.ts";
import { LOCALES } from "./labels.ts";
import { KINDS } from "./outbox.ts";
import { TICK_SENTENCES } from "./people.ts";

type Json = Record<string, unknown>;
type Entry = Json & { table: string; key?: string; methods: string[]; writable?: string[]; consent?: Json; identity?: Json; claim?: Json; claimedBy?: Json };

const manifest = buildManifest() as Json & {
  people: Json[];
  publicAccess: Entry[];
  outbox: Json & { recipient: Json; classes: Record<string, string> };
  requiredSchema: { tables: (Json & { ref: string; keep?: Json; columns: (Json & { ref: string; rules?: Json })[] })[] };
  compatibility: Json;
};
const table = (ref: string) => manifest.requiredSchema.tables.find((t) => t.ref === ref)!;
const column = (t: string, ref: string) => table(t).columns.find((c) => c.ref === ref);
const SCREENS: Record<string, Record<string, string>> = { "de-DE": de, "fr-FR": fr, "da-DK": da, "cs-CZ": cs, "ar-EG": ar, "zh-CN": zhCN, "zh-TW": zhTW };

describe("the venue's people", () => {
  it("are the customers: their address, name, language and the newsletter's consent, and every copy of them", () => {
    expect(manifest.people).toEqual([
      {
        table: "customers",
        kind: "people",
        email: "email",
        name: "name",
        firstName: "firstWordOfName",
        language: "language",
        consent: { column: "opt_in", purpose: "newsletter" },
        copies: [
          { table: "orders", column: "buyer_name", holds: "name", via: "customer_id" },
          { table: "orders", column: "email", holds: "email", via: "customer_id" },
          { table: "tickets", column: "holder_name", holds: "name", via: "holder_customer_id" },
          { table: "tickets", column: "holder_email", holds: "email", via: "holder_customer_id" },
          { table: "tickets", column: "pending_name", holds: "name" },
          { table: "tickets", column: "pending_email", holds: "email" },
          { table: "tickets", column: "sender_name", holds: "name" },
          { table: "waitlist", column: "email", holds: "email", via: "customer_id" },
          { table: "reminders", column: "email", holds: "email", via: "customer_id" },
        ],
        carry: [{ consent: { from: "orders", via: "customer_id", column: "opt_in", latest: "confirmed_at" } }],
      },
    ]);
    expect(manifest.compatibility["minAdminiumVersion"]).toBe("0.3.38");
  });

  it("have one address: the outbox's and the one they sign in with", () => {
    const person = manifest.people[0]!;
    expect(manifest.outbox.recipient["table"]).toBe(person["table"]);
    expect(manifest.outbox.recipient["email"]).toBe(person["email"]);
    const signIn = manifest.publicAccess.filter((e) => e.table === "customers" && e.claim !== undefined);
    expect(signIn.map((e) => e.claim!["email"])).toEqual([person["email"]]);
  });

  it("keep a language with the same eight choices as an order's, filled by the checkout that makes them", () => {
    expect(column("customers", "language")).toEqual({ ...column("orders", "language") });
    const buy = manifest.publicAccess.find((e) => e.table === "orders" && e.methods.includes("POST"))!;
    expect(buy.identity!["fill"]).toEqual({ name: "buyer_name", language: "language" });
    // A waitlist place and a reminder take no language: a person first met there keeps none until a checkout.
    for (const ref of ["waitlist", "reminders"]) {
      const join = manifest.publicAccess.find((e) => e.table === ref && e.methods.includes("POST"))!;
      expect([ref, join.identity!["fill"]]).toEqual([ref, undefined]);
    }
  });

  it("are copied onto columns that hold what the copy says, and the free text a buyer writes about themselves is personal", () => {
    for (const copy of manifest.people[0]!["copies"] as { table: string; column: string }[]) {
      expect([copy.table, copy.column, column(copy.table, copy.column)?.["type"]]).toEqual([copy.table, copy.column, "text"]);
    }
    expect(column("orders", "access_note")!.rules).toEqual({ personal: true });
  });
});

describe("the tables the law keeps", () => {
  it("are the sale's record — orders, tickets and the money — kept for tax, and no other", () => {
    const kept = manifest.requiredSchema.tables.filter((t) => t.keep !== undefined).map((t) => [t.ref, t.keep]);
    expect(kept).toEqual([
      ["orders", { law: "tax" }],
      ["tickets", { law: "tax" }],
      ["door_collections", { law: "tax" }],
      ["payments", { law: "tax" }],
      ["refunds", { law: "tax" }],
    ]);
  });
});

describe("the venue's emails", () => {
  it("are every one service mail: the do-not-email list stops none", () => {
    expect(Object.keys(manifest.outbox.classes).sort()).toEqual([...KINDS].sort());
    for (const kind of KINDS) expect([kind, mailClassOf(manifest as never, { outboxKind: kind })]).toEqual([kind, "service"]);
  });
});

describe("the checkout's tick", () => {
  const wording = (manifest.publicAccess.find((e) => e.consent !== undefined)!.consent as { wording: { version: number; text: Record<string, string> } }).wording;

  it("is declared with the sentences the checkout shows, in every language, as version 1", () => {
    expect(wording.version).toBe(1);
    expect(Object.keys(wording.text).sort()).toEqual([...LOCALES].sort());
    for (const tag of LOCALES) {
      const shown = TICK_SENTENCES.map((sentence) => (tag === "en-US" ? sentence : SCREENS[tag]![sentence]));
      expect(shown.every((s) => typeof s === "string" && s !== "")).toBe(true);
      expect([tag, wording.text[tag]]).toEqual([tag, shown.join("\n")]);
    }
    // And the checkout says exactly these, by these English keys.
    const screen = readFileSync(join(__dirname, "..", "app", "vals", "account.ts"), "utf8");
    for (const sentence of TICK_SENTENCES) expect(screen).toContain(`tr(${JSON.stringify(sentence)}`);
  });

  it("is carried by every door that writes an order's tick, kept for its customer", () => {
    const ticks = manifest.publicAccess.filter((e) => e.table === "orders" && (e.writable ?? []).includes("opt_in"));
    expect(ticks.map((e) => [e.key ?? "customer", e.methods.join()])).toEqual([
      ["customer", "GET,PATCH"],
      ["customer", "POST"],
      ["link", "GET,PATCH"],
    ]);
    for (const e of ticks) {
      expect(e.consent).toEqual({ column: "opt_in", purpose: "newsletter", wording });
      // Whose tick it is: the signed-in customer, the customer the address finds, or the customer the order is linked to.
      const person = (e.identity?.["table"] ?? e.claimedBy?.["table"]) as string | undefined;
      expect([e.key ?? "customer", person, e.identity?.["link"] ?? e.claimedBy?.["column"]]).toEqual([e.key ?? "customer", "customers", "customer_id"]);
    }
    // By the order's own link, the customer is found only on the move to pay at the door, never on a note or a tick.
    expect(ticks.find((e) => e.key === "link")!.identity).toEqual({ table: "customers", email: "email", link: "customer_id", on: { to: "door" } });
  });

  it("is the only yes the audience's side can give: a person's own account cannot set the newsletter", () => {
    const account = manifest.publicAccess.find((e) => e.table === "customers" && e.claim !== undefined)!;
    expect(account.writable).toEqual(["name"]);
    expect(manifest.publicAccess.filter((e) => e.table === "customers" && (e.writable ?? []).includes("opt_in"))).toEqual([]);
    // Deleting their details still empties it: Adminium records the withdrawal first.
    expect((account["forget"] as { columns: string[] }).columns).toContain("opt_in");
  });
});
