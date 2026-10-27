/**
 * The venue's people, as Adminium is told of them (`people`), and the tick a
 * buyer gives at checkout ("Email me about new shows").
 *
 * A customer is a person: the account a buyer signs in to, made by the
 * checkout from the address they type. Their address is the one the outbox
 * writes to and the one they sign in with; their language is the one their
 * first checkout was in. `opt_in` ("News from the venue") is the newsletter's
 * consent, kept in step with Adminium's consent log: the tick at checkout
 * writes a row in the log and sets it, an unsubscribe clears it, and "Delete
 * my details" records the withdrawal before it empties it.
 *
 * A person is also copied onto other rows: an order keeps its buyer's name and
 * address, a ticket its holder's, the friend it was sent to and the buyer who
 * sent it, a waitlist place and a reminder the address they were asked for
 * with. Each copy is declared, so that finding, exporting and erasing a person
 * reaches it; an order and a ticket are the sale's record, which the law keeps
 * (`keep` on their tables), so an erasure leaves those as they are.
 *
 * An order keeps the tick it was sold with (`orders.opt_in`): before this
 * release nothing copied it to the customer, so the update carries each
 * customer's newest confirmed answer over once, as a yes with no record that
 * the first send's review asks about.
 */
import ar from "../i18n/strings/wave/ar-EG.json" with { type: "json" };
import cs from "../i18n/strings/wave/cs-CZ.json" with { type: "json" };
import da from "../i18n/strings/wave/da-DK.json" with { type: "json" };
import de from "../i18n/strings/wave/de-DE.json" with { type: "json" };
import fr from "../i18n/strings/wave/fr-FR.json" with { type: "json" };
import zhCN from "../i18n/strings/wave/zh-CN.json" with { type: "json" };
import zhTW from "../i18n/strings/wave/zh-TW.json" with { type: "json" };
import { LOCALES, type Tag } from "./labels.ts";

/** The tick, and the line under it: what a buyer is shown at checkout, as the screens say it. */
export const TICK_SENTENCES = ["Email me about new shows at {venue}", "Every email has a link to stop them."] as const;

const SCREENS: Record<Exclude<Tag, "en-US">, Record<string, string>> = {
  "de-DE": de,
  "fr-FR": fr,
  "da-DK": da,
  "cs-CZ": cs,
  "ar-EG": ar,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
};

/** The two sentences in one language, one a line, from the screens' own words. */
function shown(tag: Tag): string {
  return TICK_SENTENCES.map((sentence) => {
    if (tag === "en-US") return sentence;
    const said = SCREENS[tag][sentence];
    if (said === undefined) throw new Error(`the checkout's tick has no ${tag} words for "${sentence}"`);
    return said;
  }).join("\n");
}

/**
 * The checkout's tick, as the consent log keeps it: the order's `opt_in`, for
 * the newsletter, with the sentences shown beside the box. `{venue}` stands for
 * the venue's name, which the box shows in its place. A new wording is a new
 * version.
 */
export const NEWS_TICK = {
  column: "opt_in",
  purpose: "newsletter",
  wording: { version: 1, text: Object.fromEntries(LOCALES.map((tag) => [tag, shown(tag)])) },
};

export const PEOPLE = [
  {
    table: "customers",
    kind: "people",
    email: "email",
    name: "name",
    firstName: "firstWordOfName",
    language: "language",
    consent: { column: "opt_in", purpose: "newsletter" },
    copies: [
      { table: "orders", column: "buyer_name", holds: "name", via: "customer_id" },
      { table: "orders", column: "email", holds: "email", via: "customer_id" },
      { table: "tickets", column: "holder_name", holds: "name", via: "holder_customer_id" },
      { table: "tickets", column: "holder_email", holds: "email", via: "holder_customer_id" },
      // A friend a ticket was sent to, not yet a customer; and the buyer who sent it, shown to the friend.
      { table: "tickets", column: "pending_name", holds: "name" },
      { table: "tickets", column: "pending_email", holds: "email" },
      { table: "tickets", column: "sender_name", holds: "name" },
      { table: "waitlist", column: "email", holds: "email", via: "customer_id" },
      { table: "reminders", column: "email", holds: "email", via: "customer_id" },
    ],
    // Once, on the update that brings it: each customer's newest confirmed order's tick.
    carry: [{ consent: { from: "orders", via: "customer_id", column: "opt_in", latest: "confirmed_at" } }],
  },
];
