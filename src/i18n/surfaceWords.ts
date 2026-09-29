/**
 * The sidebar's words (`surface.json`): the screens' own sentences in every
 * language, read from the translation files at build time — only the Vite
 * config imports this, so no bundle carries it.
 */
import ar from "./strings/wave/ar-EG.json" with { type: "json" };
import cs from "./strings/wave/cs-CZ.json" with { type: "json" };
import da from "./strings/wave/da-DK.json" with { type: "json" };
import de from "./strings/wave/de-DE.json" with { type: "json" };
import fr from "./strings/wave/fr-FR.json" with { type: "json" };
import zhCN from "./strings/wave/zh-CN.json" with { type: "json" };
import zhTW from "./strings/wave/zh-TW.json" with { type: "json" };

const OTHER: Record<string, Record<string, string>> = { "de-DE": de, "fr-FR": fr, "da-DK": da, "cs-CZ": cs, "ar-EG": ar, "zh-CN": zhCN, "zh-TW": zhTW };

/** The keys' words in all eight languages (the brand stays as it is written). */
export function surfaceWords(keys: readonly string[]): Record<string, Record<string, string>> {
  const en = Object.fromEntries(keys.map((k) => [k, k]));
  return { "en-US": en, ...Object.fromEntries(Object.entries(OTHER).map(([tag, words]) => [tag, Object.fromEntries(keys.map((k) => [k, words[k] ?? k]))])) };
}
