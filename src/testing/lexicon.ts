/**
 * The words the release sweep refuses, in every language the app ships.
 *
 * The English list is SUBSTRINGS, case-insensitive, with no word boundaries:
 * the sweep reads built output that way, so "explanation", "freed" and
 * "tiered" fail here exactly as they fail there. An anchored version of this
 * list would pass while the gate it stands for fails.
 *
 * Each other language gets its own spelling of the same ideas: a German venue
 * would say "kostenlos" for a ticket at no charge; a French one "gratuit".
 * The translators are given this list with the strings (native review).
 *
 * A word the venue legitimately borrows is listed in `ALLOWED_TOKENS`,
 * whole token by whole token, with what it means.
 */

export const SUBSTRING_BANNED = ["pricing", "plan", "tier", "billing", "upgrade", "free", "premium", "/mo", "per month", "a month", "monthly", "demo"] as const;

export const OTHER_LANGUAGES = ["de-DE", "fr-FR", "da-DK", "cs-CZ", "ar-EG", "zh-CN", "zh-TW"] as const;
export type OtherLanguage = (typeof OTHER_LANGUAGES)[number];

/** Whole tokens that contain a banned substring and mean something else. */
export const ALLOWED_TOKENS: readonly { token: string; language: string; means: string }[] = [];

export const IDEA_IN_LANGUAGE: Record<OtherLanguage, Record<string, RegExp[]>> = {
  "de-DE": {
    pricing: [/preisgestaltung/i, /preismodell/i],
    plan: [/\btarif/i, /\babo\b/i, /abonnement/i],
    tier: [/preisstufe/i, /stufenpreis/i],
    billing: [/abrechnung/i, /rechnungsstellung/i],
    upgrade: [/höherstufen/i, /hochstufen/i, /aufwerten/i],
    // "frei" alone is the venue's own word ("Plätze frei", "freie Platzwahl", "freigeben"): only its no-charge phrases.
    free: [/kostenlos/i, /\bgratis/i, /umsonst/i, /kostenfrei/i, /eintritt (ist )?frei/i, /freie[nr]? eintritt/i],
    "per month": [/pro monat/i, /im monat/i, /monatlich/i, /\/\s?monat/i],
    premium: [/premium/i, /\bprofi/i],
    demo: [/vorführ/i],
  },
  "fr-FR": {
    pricing: [/tarification/i, /grille tarifaire/i],
    plan: [/forfait/i, /abonnement/i],
    tier: [/palier tarifaire/i, /niveau tarifaire/i],
    billing: [/facturation/i],
    upgrade: [/mise à niveau/i, /surclassement/i, /surclasser/i],
    // "offert à" is offered to someone (a waitlist place); "offert" alone is on the house. "Placement libre" is general admission.
    free: [/gratuit/i, /\boffert(e|s|es)?\b(?!\s+à)/i, /entrée libre/i],
    "per month": [/par mois/i, /mensuel/i, /\/\s?mois/i],
    premium: [/premium/i],
    demo: [/démo/i, /démonstration/i],
  },
  "da-DK": {
    pricing: [/prisplan/i, /prismodel/i],
    plan: [/abonnement/i],
    tier: [/prisniveau/i, /pristrin/i],
    billing: [/fakturering/i],
    upgrade: [/opgrader/i],
    free: [/\bgratis/i, /vederlagsfri/i, /\bfri entré/i],
    "per month": [/om måneden/i, /pr\.? måned/i, /månedlig/i, /\/\s?md\b/i],
    premium: [/premium/i],
    demo: [/demonstration/i],
  },
  "cs-CZ": {
    pricing: [/cenový plán/i, /cenová politika/i],
    plan: [/\btarif/i, /předplatn/i],
    tier: [/cenová hladina/i],
    billing: [/fakturace/i, /vyúčtování/i],
    upgrade: [/povýšit/i, /vyšší tarif/i],
    free: [/zdarma/i, /zadarmo/i, /bezplatn/i, /\bgratis/i, /vstup volný/i],
    "per month": [/měsíčně/i, /za měsíc/i, /\/\s?měs/i],
    premium: [/prémiov/i],
    demo: [/ukázk/i],
  },
  "ar-EG": {
    pricing: [/تسعير/],
    plan: [/باقة/, /اشتراك/],
    tier: [/فئة سعرية/, /مستوى سعري/],
    billing: [/فوترة/],
    upgrade: [/ترقية/],
    free: [/مجان/, /بلا مقابل/, /بدون مقابل/, /ببلاش/],
    "per month": [/شهري/, /في الشهر/, /كل شهر/, /\/\s?شهر/],
    premium: [/احترافي/, /مميز/],
    demo: [/تجريبي/],
  },
  "zh-CN": {
    pricing: [/定价/, /价格方案/],
    plan: [/套餐/, /订阅/],
    tier: [/价格档/, /套餐档/],
    billing: [/账单/, /计费/],
    upgrade: [/升级/],
    free: [/免费/, /免單/, /免单/],
    "per month": [/每月/, /月费/, /包月/, /\/\s?月/],
    premium: [/高级版/, /专业版/],
    demo: [/演示/],
  },
  "zh-TW": {
    pricing: [/定價/, /價格方案/],
    plan: [/方案/, /訂閱/],
    tier: [/價格級/, /方案級/],
    billing: [/帳單/, /計費/],
    upgrade: [/升級/],
    free: [/免費/, /免單/],
    "per month": [/每月/, /月費/, /包月/, /\/\s?月/],
    premium: [/高級版/, /專業版/],
    demo: [/示範/, /演示/],
  },
};

/** Every banned substring in `text`, English list first, then the language's own ideas. */
export function offences(text: string, tag: string | null): string[] {
  const lower = text.toLowerCase();
  const tokens = ALLOWED_TOKENS.map((t) => t.token.toLowerCase());
  const english = SUBSTRING_BANNED.filter((word) => {
    for (const match of lower.matchAll(new RegExp(word.replace("/", "\\/"), "g"))) {
      const start = lower.slice(0, match.index).search(/[\p{L}\p{N}]*$/u);
      const end = match.index + word.length + (lower.slice(match.index + word.length).match(/^[\p{L}\p{N}]*/u)?.[0].length ?? 0);
      if (!tokens.includes(lower.slice(start, end))) return true;
    }
    return false;
  }).map((word) => `"${word}"`);
  const own =
    tag !== null && (OTHER_LANGUAGES as readonly string[]).includes(tag)
      ? Object.entries(IDEA_IN_LANGUAGE[tag as OtherLanguage]).flatMap(([idea, patterns]) =>
          patterns.filter((p) => p.test(text)).map((p) => `${idea} ${String(p)}`),
        )
      : [];
  return [...english, ...own];
}
