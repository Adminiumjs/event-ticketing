/**
 * The screens' words beside English, keyed by the English sentence (see
 * `../tr.ts`): one file per language in `./wave/`, each loaded only when a
 * reader picks that language (English is the source itself). A sentence with
 * no entry shows in English.
 */
import { isLocaleTag, type LocaleTag } from "../locales.ts";

export const WAVE: Partial<Record<LocaleTag, Record<string, string>>> = {};

type Words = { default: Record<string, string> };
const LOAD: Record<Exclude<LocaleTag, "en-US">, () => Promise<Words>> = {
  "de-DE": () => import("./wave/de-DE.json"),
  "fr-FR": () => import("./wave/fr-FR.json"),
  "da-DK": () => import("./wave/da-DK.json"),
  "cs-CZ": () => import("./wave/cs-CZ.json"),
  "ar-EG": () => import("./wave/ar-EG.json"),
  "zh-CN": () => import("./wave/zh-CN.json"),
  "zh-TW": () => import("./wave/zh-TW.json"),
};

const loading = new Map<string, Promise<void>>();
/** A language's words, fetched once; resolves when `tr()` can speak it. */
export function loadWave(tag: string): Promise<void> {
  if (!isLocaleTag(tag) || tag === "en-US" || WAVE[tag] !== undefined) return Promise.resolve();
  let p = loading.get(tag);
  if (p === undefined) {
    p = LOAD[tag]().then(
      (m) => {
        WAVE[tag] = m.default;
      },
      () => {
        loading.delete(tag);
      },
    );
    loading.set(tag, p);
  }
  return p;
}
