/**
 * The screens' words in every language: each sentence the screens hand to
 * `tr()` (read from the source, `sentences.ts`) is in all seven translation
 * files, nothing is left over, each keeps the English's `{placeholders}`, a
 * plural has the language's own number of forms (in `PLURAL_ORDER`), and no
 * translation says a banned idea in its language. No sentence is built at run
 * time where a translator cannot see it.
 */
import { describe, expect, it } from "vitest";

import { offences } from "../testing/lexicon.ts";
import { sentences } from "./sentences.ts";
import ar from "./strings/wave/ar-EG.json" with { type: "json" };
import cs from "./strings/wave/cs-CZ.json" with { type: "json" };
import da from "./strings/wave/da-DK.json" with { type: "json" };
import de from "./strings/wave/de-DE.json" with { type: "json" };
import fr from "./strings/wave/fr-FR.json" with { type: "json" };
import zhCN from "./strings/wave/zh-CN.json" with { type: "json" };
import zhTW from "./strings/wave/zh-TW.json" with { type: "json" };
import { PLURAL_ORDER } from "./tr.ts";
import type { LocaleTag } from "./locales.ts";

const WAVE: Record<string, Record<string, string>> = { "de-DE": de, "fr-FR": fr, "da-DK": da, "cs-CZ": cs, "ar-EG": ar, "zh-CN": zhCN, "zh-TW": zhTW };
const found = sentences(process.cwd());
const keys = [...found.keys.keys()].sort();
const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

describe("the screens' sentences", () => {
  it("are all written out where a translator can see them", () => {
    expect(found.dynamic).toEqual([]);
  });
});

for (const [lang, words] of Object.entries(WAVE) as [LocaleTag, Record<string, string>][]) {
  describe(`the screens in ${lang}`, () => {
    it("has every sentence and nothing else", () => {
      const have = new Set(Object.keys(words));
      expect(keys.filter((k) => !have.has(k) || words[k]!.trim() === "")).toEqual([]);
      expect(Object.keys(words).filter((k) => !found.keys.has(k))).toEqual([]);
    });

    it("keeps each sentence's placeholders, and the language's plural forms", () => {
      const bad: string[] = [];
      const forms = PLURAL_ORDER[lang].length;
      for (const k of keys) {
        const t = words[k];
        if (t === undefined) continue;
        if (k.includes("|")) {
          const parts = t.split("|");
          if (parts.length !== forms) bad.push(`${k} → ${String(parts.length)} forms, want ${String(forms)}`);
          const en = holes(k.split("|")[1]!);
          for (const p of parts) if (JSON.stringify(holes(p).filter((h) => h !== "{n}")) !== JSON.stringify(en.filter((h) => h !== "{n}"))) bad.push(`${k} → ${p}`);
        } else if (t.includes("|")) bad.push(`${k} → a "|" in a sentence that has no plural`);
        else if (JSON.stringify(holes(t)) !== JSON.stringify(holes(k))) bad.push(`${k} → ${t}`);
      }
      expect(bad).toEqual([]);
    });

    it("says none of the banned ideas", () => {
      const hits = Object.entries(words).flatMap(([k, t]) => offences(t, lang).map((w) => `${w}: ${k} → ${t}`));
      expect(hits).toEqual([]);
    });
  });
}
