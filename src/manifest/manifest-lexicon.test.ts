/**
 * The manifest says nothing the release sweep would refuse, in any language.
 *
 * Every label, title, reason and email the manifest ships is read by the word
 * list in `testing/lexicon.ts`: the English substrings (`free`, `plan`,
 * `upgrade` … as SUBSTRINGS) and each other language's spelling of the same
 * ideas. A ticket with nothing to pay is "at no charge", never "free", in any
 * language.
 */
import { describe, expect, it } from "vitest";

import { offences } from "../testing/lexicon.ts";
import { buildManifest } from "./build.ts";

type Json = unknown;

/** Every string in the manifest, with the language it is in when it is one of a set of labels. */
function strings(value: Json, tag: string | null, out: { tag: string | null; text: string }[]): void {
  if (typeof value === "string") out.push({ tag, text: value });
  else if (Array.isArray(value)) value.forEach((v) => strings(v, tag, out));
  else if (value !== null && typeof value === "object") {
    for (const [key, v] of Object.entries(value as Record<string, Json>)) {
      const isTag = /^[a-z]{2}-[A-Z]{2}$/.test(key);
      strings(v, isTag ? key : tag, out);
    }
  }
}

const manifest = buildManifest();
const all: { tag: string | null; text: string }[] = [];
// Only what a person reads: labels, titles, names, reasons, emails — not refs, icons or rules.
for (const part of ["requiredSchema", "pages", "navGroups", "emailTemplates", "description", "addOns", "documents", "roles"] as const) {
  strings(manifest[part], null, all);
}
const readable = all.filter(({ text }) => /\s/.test(text) || /[A-Z]/.test(text.charAt(0)) || /[^\x00-\x7F]/.test(text));

describe("the manifest's words pass the release sweep's word list", () => {
  it("reads enough words to mean something", () => {
    expect(readable.length).toBeGreaterThan(300);
  });

  it("contains none of the banned words, in any language", () => {
    const hits = readable.flatMap(({ tag, text }) => offences(text, tag).map((word) => `${tag ?? "?"}: ${word} in ${JSON.stringify(text)}`));
    expect(hits).toEqual([]);
  });
});
