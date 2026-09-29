/**
 * The word list itself, and every word the app ships that no other test
 * reads with it.
 *
 * The list must catch each banned idea in each language — a ticket "free",
 * "per month", in the words a translator would naturally reach for — and must
 * let the venue's own words through (German "Plätze frei" is places left,
 * French "placement libre" is general admission, "offert à" is offered to
 * someone). Then: the screens' English sentences, and the demo card's words
 * in all eight languages (the card is the demo's own, so "demo" is its word;
 * every other ban holds). The translations are read in `wave.test.ts`, the
 * manifest's labels and emails in `manifest-lexicon.test.ts`.
 */
import { describe, expect, it } from "vitest";

import { offences, OTHER_LANGUAGES } from "../testing/lexicon.ts";
import { sentences } from "./sentences.ts";
import { DEMO_CARD_MESSAGES } from "./strings/card.ts";

const CAUGHT: Record<string, { free: string[]; month: string[] }> = {
  "en-US": { free: ["Free entry", "Tickets are free"], month: ["$9 per month", "$9 a month", "Monthly pass", "$9/mo"] },
  "de-DE": { free: ["Eintritt frei", "Der Eintritt ist frei", "Freier Eintritt", "kostenfrei", "Kostenlos"], month: ["9 € pro Monat", "monatlich kündbar", "9 €/Monat"] },
  "fr-FR": { free: ["Billet offert", "Entrée libre", "Entrée gratuite"], month: ["9 € par mois", "Abonnement mensuel", "9 €/mois"] },
  "da-DK": { free: ["Gratis adgang", "Fri entré"], month: ["99 kr. om måneden", "99 kr. pr. måned", "Månedlig"] },
  "cs-CZ": { free: ["Vstup zdarma", "Vstup volný", "Gratis vstupenka"], month: ["99 Kč měsíčně", "99 Kč za měsíc", "99 Kč/měs."] },
  "ar-EG": { free: ["الدخول مجاني", "تذكرة بلا مقابل", "بدون مقابل", "ببلاش"], month: ["اشتراك شهري", "٩٩ جنيه في الشهر", "كل شهر"] },
  "zh-CN": { free: ["免费入场", "免单"], month: ["每月 99 元", "包月", "99元/月"] },
  "zh-TW": { free: ["免費入場", "免單"], month: ["每月 99 元", "包月", "99元/月"] },
};

const LET_THROUGH: Record<string, string[]> = {
  "en-US": ["At no charge", "No booking fees. The price is the price.", "Previous month", "Next month"],
  "de-DE": ["Dafür sind nicht mehr genug Plätze frei.", "Freie Platzwahl", "Jetzt freigeben", "Schaltet {type} frei", "Vorheriger Monat"],
  "fr-FR": ["Placement libre", "Offert à {name}", "Mois précédent"],
  "da-DK": ["Forrige måned"],
  "cs-CZ": ["Předchozí měsíc"],
  "ar-EG": ["الشهر السابق", "الشهر التالي"],
  "zh-CN": ["上个月", "下个月"],
  "zh-TW": ["上個月", "月曆"],
};

describe("the word list", () => {
  for (const [tag, { free, month }] of Object.entries(CAUGHT)) {
    it(`catches "free" and "per month" in ${tag}`, () => {
      const missed = [...free, ...month].filter((text) => offences(text, tag).length === 0);
      expect(missed).toEqual([]);
    });
    it(`lets the venue's own words through in ${tag}`, () => {
      const hit = (LET_THROUGH[tag] ?? []).flatMap((text) => offences(text, tag).map((w) => `${w}: ${text}`));
      expect(hit).toEqual([]);
    });
  }

  it("knows every language the app ships", () => {
    expect(Object.keys(CAUGHT).sort()).toEqual(["en-US", ...OTHER_LANGUAGES].sort());
  });
});

describe("the words no other test reads", () => {
  it("the screens' English sentences say none of the banned ideas", () => {
    const hits = [...sentences(process.cwd()).keys.keys()].flatMap((k) => offences(k, "en-US").map((w) => `${w}: ${k}`));
    expect(hits).toEqual([]);
  });

  it("the demo card's words say none of them either, in any language (bar its own name)", () => {
    const hits = Object.entries(DEMO_CARD_MESSAGES).flatMap(([tag, words]) =>
      Object.entries(words).flatMap(([k, t]) =>
        offences(t, tag)
          .filter((w) => w !== '"demo"' && !w.startsWith("demo "))
          .map((w) => `${tag} ${w}: ${k} → ${t}`),
      ),
    );
    expect(hits).toEqual([]);
  });
});
