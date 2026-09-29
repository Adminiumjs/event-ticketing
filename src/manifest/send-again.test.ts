/**
 * "Send it again" on the transfer's confirm email: the order's own link asks
 * Adminium for a new confirm link, mailed as the app's own confirm email to
 * the order's own address, only while the order waits for its confirm. The
 * validator holds the shape: pinned here, and each of its refusals shown to
 * bite on this manifest, so a later change cannot loosen it unseen.
 */
import { describe, expect, it } from "vitest";

import manifest from "../../manifest.json";
import { validateManifest } from "../testing/manifest/index.ts";

type Entry = { table: string; key?: string; methods: string[]; writable?: string[]; newLink?: { column: string; kind: string; when?: unknown } };
const entries = manifest.publicAccess as unknown as Entry[];
const at = entries.findIndex((e) => e.newLink !== undefined);
const withEntries = (change: (list: Entry[]) => void) => {
  const list = structuredClone(entries);
  change(list);
  return validateManifest({ ...manifest, publicAccess: list });
};
const says = (result: ReturnType<typeof validateManifest>) => (result.ok ? [] : result.issues.map((i) => `${String(i.path)}: ${i.message}`));

describe("send it again", () => {
  it("is on the order's own link alone: the confirm link, as the confirm email, while the order waits for it and is no waitlist offer", () => {
    expect(entries.filter((e) => e.newLink !== undefined).map((e) => [e.table, e.key])).toEqual([["orders", "link"]]);
    expect(entries[at]!.newLink).toEqual({
      column: "confirm_token",
      kind: "transfer-confirm",
      when: { where: [{ column: "status", eq: "confirming" }, { column: "offer_until", isNull: true }] },
    });
    const producer = (manifest.outbox.producers as { kind: string; hold?: boolean; repeatBy?: string }[]).find((p) => p.kind === "transfer-confirm")!;
    expect([producer.hold, producer.repeatBy]).toEqual([undefined, undefined]);
    expect(validateManifest(manifest).ok).toBe(true);
  });

  it("goes only where the order says: no order entry lets a guest change the address", () => {
    const writes = entries.filter((e) => e.table === "orders" && e.methods.includes("PATCH")).flatMap((e) => e.writable ?? []);
    expect(writes).not.toContain("email");
    expect(entries.filter((e) => e.table === "customers" && e.methods.includes("PATCH")).flatMap((e) => e.writable ?? [])).not.toContain("email");
    // Were it writable, the validator would refuse the manifest.
    const refused = withEntries((list) => list.filter((e) => e.table === "orders" && e.key === "link" && e.methods.includes("PATCH")).forEach((e) => e.writable!.push("email")));
    expect(says(refused).some((s) => s.includes("where it is sent again"))).toBe(true);
  });

  it("is refused by the validator without its when, for a held kind, or on its own link's code", () => {
    expect(says(withEntries((list) => delete list[at]!.newLink!.when)).some((s) => s.includes("newLink"))).toBe(true);
    expect(says(withEntries((list) => (list[at]!.newLink!.kind = "cancelled-paid"))).some((s) => s.includes("approve"))).toBe(true);
    expect(says(withEntries((list) => (list[at]!.newLink!.column = "link_token"))).some((s) => s.includes("newLink"))).toBe(true);
  });
});
