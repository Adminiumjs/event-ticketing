/**
 * The demo card's words — its sides, screens, shortcuts, clock row, and the
 * toasts its shortcuts show — in the eight languages the card speaks. Only the
 * demo build and `demo.json` carry them; the product never draws them.
 */
import type { LocaleTag } from "../locales.ts";
import ar from "./card/ar-EG.json" with { type: "json" };
import cs from "./card/cs-CZ.json" with { type: "json" };
import da from "./card/da-DK.json" with { type: "json" };
import de from "./card/de-DE.json" with { type: "json" };
import en from "./card/en-US.json" with { type: "json" };
import fr from "./card/fr-FR.json" with { type: "json" };
import zhCN from "./card/zh-CN.json" with { type: "json" };
import zhTW from "./card/zh-TW.json" with { type: "json" };

export const DEMO_CARD_MESSAGES: Record<LocaleTag, Record<string, string>> = {
  "en-US": en,
  "de-DE": de,
  "fr-FR": fr,
  "da-DK": da,
  "cs-CZ": cs,
  "ar-EG": ar,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
};

/** A card word in a language (English while one is missing), `{placeholders}` filled. */
export function cardWord(lang: string, key: string, params: Record<string, string> = {}): string {
  const raw = (DEMO_CARD_MESSAGES as Record<string, Record<string, string>>)[lang]?.[key] ?? (en as Record<string, string>)[key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) => params[name] ?? m);
}
