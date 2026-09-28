/**
 * The screens' words beside English, keyed by the English sentence (see
 * `../tr.ts`): one file per language in `./wave/`. A sentence with no entry
 * shows in English.
 */
import type { LocaleTag } from "../locales.ts";
import ar from "./wave/ar-EG.json" with { type: "json" };
import cs from "./wave/cs-CZ.json" with { type: "json" };
import da from "./wave/da-DK.json" with { type: "json" };
import de from "./wave/de-DE.json" with { type: "json" };
import fr from "./wave/fr-FR.json" with { type: "json" };
import zhCN from "./wave/zh-CN.json" with { type: "json" };
import zhTW from "./wave/zh-TW.json" with { type: "json" };

export const WAVE: Partial<Record<LocaleTag, Record<string, string>>> = {
  "de-DE": de,
  "fr-FR": fr,
  "cs-CZ": cs,
  "da-DK": da,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  "ar-EG": ar,
};
