/**
 * The demo plays the manifest's rules: `rules.ts` (the stamps, renewals,
 * unique sets, limits, states, public entries, roles and email producers) and
 * the written part of `src/data/sampleRows.ts` (every column's fill, the
 * copies, formulas, totals and running numbers) are written from
 * `manifest.json`, and fail here the moment the manifest moves without them.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { demoRulesText } from "../../scripts/write-demo-rules.ts";
import { withWrittenPart, type ManifestForSample } from "../../scripts/write-sample-columns.ts";

type Json = Record<string, unknown>;
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const manifest = JSON.parse(read("../../manifest.json")) as Json;

describe("the demo's rules are the manifest's", () => {
  it("is what `npm run demo-rules` writes from manifest.json", () => {
    expect(read("./rules.ts") === demoRulesText(manifest)).toBe(true);
  });

  it("settles the sample by the columns and rules `npm run sample` writes from manifest.json", () => {
    const source = read("../data/sampleRows.ts");
    expect(withWrittenPart(source, manifest as unknown as ManifestForSample) === source).toBe(true);
  });
});
