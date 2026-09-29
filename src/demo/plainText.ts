/**
 * The demo's copy of Adminium's rule for a name a guest types (a column an
 * entry holds to plain text): letters, spaces and ordinary punctuation, at
 * most 80 characters, and no web or email address — "Claim your refund at
 * evil.com", "@handle", "refund-desk.com Smith" and "rui.com" are refused,
 * however their letters are dressed (fullwidth, accents, invisible marks, a
 * hyphen after the ending); "Mary.Ann", "J.R.R. Tolkien", "St. John", "W.Hu"
 * and "M.De Vries" are names, and pass. A word joined to another by a dot
 * with no space ("Wong.Ng") is refused when its last part is a known ending.
 *
 * The same answers as the server's, so the demo refuses the names the real
 * one does. DEMO BUILD ONLY.
 */

const PLAIN_TEXT_MAX = 80;
const PLAIN = /^[\p{L}\p{M} .,'’()&-]*$/u;

/** Letters, spaces and ordinary punctuation only; no `://`, no `www.`. */
function plainText(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value !== "string") return false;
  const lower = value.toLowerCase();
  return value.length <= PLAIN_TEXT_MAX && PLAIN.test(value) && !lower.includes("://") && !lower.includes("www.");
}

/** The endings a web address is read in (a closed list, as the server's). */
const KNOWN_TLDS: ReadonlySet<string> = new Set([
  // generic
  "com", "net", "org", "info", "biz", "edu", "gov", "mil", "int", "io", "co", "ai", "app", "dev", "xyz", "online", "site",
  "top", "shop", "store", "club", "live", "me", "tv", "cc", "ly", "gg", "sh", "fm", "ws", "link", "click", "help", "support",
  "page", "pro", "name", "mobi", "tech", "website", "space", "world", "today", "news", "blog", "cloud", "email", "host", "lol",
  "vip", "win", "bid", "loan", "work", "review", "download", "racing", "date", "trade", "science", "party", "stream", "fun",
  "icu", "buzz", "cam", "rest", "bar", "cyou", "monster", "sbs", "cfd", "ink", "wiki", "social", "events", "tickets",
  "finance", "money", "bank", "pay", "gift", "gifts", "deals", "sale", "promo", "claims", "refund",
  // what a venue, a shop or a clinic is called online
  "cafe", "restaurant", "pub", "hotel", "clinic", "dental", "health", "care", "company", "menu", "pizza", "food", "kitchen",
  "delivery", "booking", "travel", "ticket", "services", "center", "agency", "group", "solutions", "network", "express",
  "digital", "market", "shopping", "global", "plus", "zone", "one", "best", "free", "new", "studio", "design", "media",
  "art", "chat", "cash", "credit", "loans", "tax", "legal", "law", "exchange", "zip", "mov",
  // countries a link is usually made with
  "uk", "de", "fr", "nl", "eu", "us", "ca", "au", "in", "br", "jp", "cn", "ru", "it", "es", "pl", "ch", "se", "dk", "fi",
  "at", "cz", "pt", "ie", "nz", "za", "mx", "tr", "ua", "kr", "hk", "sg", "tw", "vn", "ng", "ke", "gr", "ro", "hu", "su",
  "be", "to", "li", "im", "nu", "ee", "lv", "lt", "sk", "si", "hr", "bg", "rs", "il", "ae", "sa", "qa", "ph", "th", "pk",
  "eg", "kz", "lu", "cl", "tk", "ga", "ml", "cf", "gy", "ac", "st", "vc",
  // other scripts
  "рф", "срб", "укр", "бел", "қаз", "москва", "онлайн", "сайт", "中国", "中國", "网址", "公司", "网络",
]);

/** The endings read as an address even after one capital letter (`X.Com`, `J.Co`). */
const ALWAYS_ADDRESS: ReadonlySet<string> = new Set(["com", "net", "org", "info", "biz", "io", "co", "app", "dev", "shop", "online", "site"]);

const DOTTED = /[\p{L}\p{M}-]+(?:\.[\p{L}\p{M}-]+)+/gu;

/** The text as a reader takes it in: compatibility letters as plain ones, marks and invisible characters out. */
const asShown = (value: string): string => value.normalize("NFKD").replace(/[\p{M}\p{Default_Ignorable_Code_Point}]/gu, "");
const trimmed = (part: string): string => part.replace(/^[-\p{P}]+|[-\p{P}]+$/gu, "");

/** Initials before a surname: single capitals, then one capitalised word. */
function initialsName(parts: readonly string[]): boolean {
  const last = parts[parts.length - 1]!;
  return parts.slice(0, -1).every((part) => /^\p{Lu}$/u.test(part)) && /^\p{Lu}\p{Ll}+$/u.test(last);
}

/** Whether a value is only a name: plain, and naming no place to go. */
export function linkFreeText(value: unknown): boolean {
  if (!plainText(value)) return false;
  if (typeof value !== "string") return true;
  if (value.includes("@") || value.includes("/")) return false;
  for (const [dotted] of asShown(value).matchAll(DOTTED)) {
    const parts = dotted.split(".").map(trimmed).filter((part) => part !== "");
    if (parts.length < 2) continue;
    const ending = parts[parts.length - 1]!.toLowerCase();
    if (!KNOWN_TLDS.has(ending)) continue;
    if (initialsName(parts) && !ALWAYS_ADDRESS.has(ending)) continue;
    return false;
  }
  return true;
}
