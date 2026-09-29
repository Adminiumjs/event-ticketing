/**
 * The public refs the audience's pages read and write through, as the server
 * names this app's `publicAccess` entries: `<real table><suffix>`, the suffix
 * counted across every key in the manifest's order. Pinned by a test that
 * works the names out from the manifest the way the server does
 * (`publicRefs.test.ts`), so an entry added or moved cannot leave a page
 * asking for a ref that is not there.
 */

export const PUBLIC_REFS = {
  // The customer key: the person who signs in, and their own.
  account: ["customers", "_claimed"],
  myOrders: ["orders", "_verified"],
  myTickets: ["tickets", "_verified"],
  myNames: ["tickets", "_verified_2"],
  myReturns: ["tickets", "_verified_3"],
  myCancels: ["tickets", "_verified_4"],
  heldTickets: ["tickets", "_verified_5"],
  myWaitlist: ["waitlist", "_verified"],
  myReminders: ["reminders", "_verified"],
  bank: ["settings", "_verified"],
  // The customer key: the venue and its shows.
  settings: ["settings", ""],
  rooms: ["rooms", ""],
  events: ["events", ""],
  days: ["event_days", ""],
  acts: ["acts", ""],
  actTimes: ["acts", "_2"],
  types: ["ticket_types", ""],
  codeTypes: ["ticket_types", "_unlocked"],
  questions: ["questions", ""],
  left: ["tickets", "_availability"],
  // The customer key: buying, joining a waitlist, a reminder.
  buy: ["orders", "_verified_2"],
  join: ["waitlist", "_verified_2"],
  remind: ["reminders", "_verified_2"],
  // The `link` key: the one order its own link opens.
  linkOrder: ["orders", "_claimed"],
  linkTickets: ["tickets", "_verified_6"],
  linkNames: ["tickets", "_verified_7"],
  linkReturns: ["tickets", "_verified_8"],
  linkCancels: ["tickets", "_verified_9"],
  linkBank: ["settings", "_verified_2"],
  // The `confirm` key: a transfer's emailed confirm link.
  confirmOrder: ["orders", "_claimed_2"],
  confirmBank: ["settings", "_verified_3"],
  // The `ticket` key: a ticket sent to a friend.
  ticket: ["tickets", "_claimed"],
} as const satisfies Record<string, readonly [string, string]>;

export type RefName = keyof typeof PUBLIC_REFS;
export type Refs = Record<RefName, string>;

const APP_KEY = "events";

/** Every ref, over the server's real table names (`events_<table>` when it does not say). */
export function publicRefs(tables: Readonly<Record<string, string>> = {}): Refs {
  const out = {} as Refs;
  for (const [name, [table, suffix]] of Object.entries(PUBLIC_REFS) as [RefName, readonly [string, string]][]) {
    out[name] = `${tables[table] ?? `${APP_KEY}_${table}`}${suffix}`;
  }
  return out;
}
