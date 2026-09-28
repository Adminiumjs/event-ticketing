/**
 * The screens' words, in the reader's language.
 *
 * A screen writes its sentence in English — the English IS the key, so the
 * source reads as the page does — and `tr()` hands back the reader's
 * translation from `strings/wave.ts`, or the English while a translation is
 * still owed (each deferred one is marked there, and counted). `{name}`
 * placeholders are filled from `params`; a message with `|` variants is a
 * plural, its variant picked by `Intl.PluralRules` for `params.n`, in the
 * locale's own category order (`PLURAL_ORDER`). Whole sentences only: a
 * sentence is never built from translated pieces.
 */
import { WAVE } from "./strings/wave.ts";
import { DEFAULT_LOCALE, isLocaleTag, type LocaleTag } from "./locales.ts";

/** CLDR cardinal categories, in the order a translation writes its `|` variants. */
export const PLURAL_ORDER: Record<LocaleTag, Intl.LDMLPluralRule[]> = {
  "en-US": ["one", "other"],
  "de-DE": ["one", "other"],
  "fr-FR": ["one", "other"],
  "da-DK": ["one", "other"],
  "cs-CZ": ["one", "few", "other"],
  "zh-CN": ["other"],
  "zh-TW": ["other"],
  "ar-EG": ["zero", "one", "two", "few", "many", "other"],
};

let current: LocaleTag = DEFAULT_LOCALE;
const rules = new Map<LocaleTag, Intl.PluralRules>();

export function setLocale(tag: string): void {
  current = isLocaleTag(tag) ? tag : DEFAULT_LOCALE;
}

export function locale(): LocaleTag {
  return current;
}

/** One plural variant of `raw` for `n`, in `tag`'s category order. */
function variant(raw: string, n: number, tag: LocaleTag): string {
  const variants = raw.split("|");
  const order = PLURAL_ORDER[tag];
  let pr = rules.get(tag);
  if (pr === undefined) {
    pr = new Intl.PluralRules(tag);
    rules.set(tag, pr);
  }
  const at = order.indexOf(pr.select(n));
  return variants[Math.min(at < 0 ? variants.length - 1 : at, variants.length - 1)] ?? variants[variants.length - 1]!;
}

/** The reader's words for an English sentence, its `{placeholders}` filled. */
export function tr(en: string, params?: Record<string, string | number>): string {
  const own = WAVE[current]?.[en];
  const tag = own === undefined ? "en-US" : current;
  let raw = own ?? en;
  if (raw.includes("|") && params !== undefined && typeof params["n"] === "number") raw = variant(raw, params["n"], tag);
  if (params === undefined) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

/** A sentence translated where it is drawn (a view's `trx`), marked so the catalog finds it. */
export const key = (en: string): string => en;
