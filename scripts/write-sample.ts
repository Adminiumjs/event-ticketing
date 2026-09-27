/**
 * `npm run sample`: write `seeds/events.sample.json` from the one source of the
 * sample (`src/sample/ledger.json`, through `src/sample/waveform.ts`).
 * `src/sample/sample-bundle.test.ts` fails when the file and the source disagree.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { sampleBundle } from "../src/sample/waveform.ts";

export const SAMPLE_FILE = join(import.meta.dirname, "..", "seeds", "events.sample.json");

export const sampleText = (): string => `${JSON.stringify(sampleBundle(), null, 1)}\n`;

if (process.env["VITEST"] === undefined) {
  writeFileSync(SAMPLE_FILE, sampleText());
  const bundle = sampleBundle();
  console.info(`[sample] wrote seeds/events.sample.json (${bundle.tables.map((t) => `${t.ref} ${String(t.rows.length)}`).join(", ")})`);
}
