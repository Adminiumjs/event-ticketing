/**
 * The sample bundle an operator adds is what `src/sample/` builds, and the
 * product's own checks find nothing wrong with it: every table and column is
 * the manifest's, every row a later one names comes first, every running
 * number is left for Adminium, no share code is given.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import manifest from "../../manifest.json";
import { sampleText } from "../../scripts/write-sample.ts";
import { sampleBundleIssues, type SampleBundle } from "../testing/manifest/sample.ts";
import type { Manifest } from "../testing/manifest/schema.ts";
import { sampleBundle } from "./waveform.ts";

const FILE = join(__dirname, "..", "..", "seeds", "events.sample.json");

describe("seeds/events.sample.json", () => {
  it("is byte for byte what src/sample/ builds — run `npm run sample` after changing it", () => {
    expect(readFileSync(FILE, "utf8") === sampleText()).toBe(true);
  });

  it("passes the product's sample checks against this manifest", () => {
    expect(sampleBundleIssues(sampleBundle() as unknown as SampleBundle, manifest as unknown as Manifest)).toEqual([]);
  });

  it("is named by the manifest", () => {
    expect((manifest as { sampleData?: { file: string } }).sampleData?.file).toBe("seeds/events.sample.json");
  });

  it("gives no share code, retry key or running number", () => {
    const text = JSON.stringify(sampleBundle());
    for (const column of ["link_token", "confirm_token", "client_key"]) expect(text).not.toContain(`"${column}"`);
    const orders = sampleBundle().tables.find((t) => t.ref === "orders")!.rows;
    expect(orders.every((row) => row["number_seq"] === null && String(row["number"]).startsWith("WV-S"))).toBe(true);
  });

  it("puts Neon Circuit on the adding day and lets only the held checkout and the open offer run out on their own", () => {
    const events = sampleBundle().tables.find((t) => t.ref === "events")!.rows;
    expect(events.find((row) => row["name"] === "Neon Circuit")!["doors_at"]).toEqual({ "@day": 0, "@time": "20:00" });
    const orders = sampleBundle().tables.find((t) => t.ref === "orders")!.rows;
    const running = orders.filter((row) => JSON.stringify(row).includes("@in"));
    expect(running.map((row) => [row["number"], row["held_until"] ?? row["offer_until"]])).toEqual([
      ["WV-S8814", { "@in": "PT11H42M" }],
      ["WV-S8815", { "@in": "PT4M" }],
    ]);
  });
});
