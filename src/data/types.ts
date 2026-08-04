/**
 * The app's domain types.
 *
 * `View` is the routing union: `app/App.tsx` maps every member to a screen, so
 * adding a view here is a compile error until a screen exists for it. That is
 * what keeps every nav item, sheet link and footer link landing somewhere real.
 *
 * TIME is absolute minutes: `daySerial * 1440 + minutesIntoTheDay`, where the
 * day serial is days since the Unix epoch. One integer carries a date and a
 * clock time, arithmetic on it is exact, and `Date` never enters the engine —
 * which is what lets "now" be a parameter rather than a wall-clock read.
 *
 * MONEY is integer cents. Floating-point dollars accumulate error the moment
 * you sum three ticket prices, and a box office that is a penny out is a bug
 * report.
 */

export type View =
  | "home"
  | "event"
  | "checkout"
  | "confirm"
  | "mytickets"
  | "sales"
  | "attendees"
  | "door"
  | "notfound";

export type Persona = "attendee" | "organizer";

/**
 * One kind of ticket for one show. Never a "tier" — not in a label, not in a
 * variable name, not in alt text. `cap` is the whole allocation; how much of
 * it is left is derived in `lib/tickets.ts`, never stored.
 */
export interface TicketType {
  id: string;
  /** i18n key for the display name. */
  name: string;
  /** i18n key for the one-line note under the name. */
  note: string;
  /** Price in integer cents. */
  price: number;
  cap: number;
  /** Absolute minute this type goes on sale; falls back to the show's own. */
  saleStart?: number;
}

export interface Show {
  id: string;
  /** The act or night's name — a proper noun, never translated. */
  name: string;
  /** i18n key for the kind of night it is. */
  sub: string;
  /** i18n key for the room. */
  room: string;
  /** Day serial of the first (usually only) date. */
  date: number;
  /** Day serial of the second date — the festival only. */
  date2?: number;
  /** Minutes into the day: doors, stage time, and the end of the night. */
  doors: number;
  start: number;
  end: number;
  /** Absolute minute the show's general on-sale opens. */
  saleStart: number;
  /** Lucide icon name for the art tile. */
  icon: string;
  /** Two CSS custom-property names — the art gradient's tints. */
  art: [string, string];
  /** The mono chip printed on the art, e.g. "WV·JUL28". */
  chip: string;
  /** i18n key for the description paragraph. */
  desc: string;
  /** Act names — proper nouns, never translated. */
  lineup: string[];
  types: TicketType[];
}

export interface Buyer {
  name: string;
  email: string;
}

export interface Ticket {
  /** "WV-8815-01" — the order code plus a two-digit index. */
  code: string;
  evId: string;
  /** The `TicketType` id this ticket was issued against. */
  tt: string;
  /** Whose name prints on the ticket; defaults to the buyer's. */
  holder: string;
  buyer: Buyer;
  orderCode: string;
  /** Absolute minute the order was placed. */
  soldAt: number;
  /** Absolute minute this ticket was scanned at the door, or null. */
  checkedInAt: number | null;
}

export interface Order {
  code: string;
  evId: string;
  buyer: Buyer;
  placedAt: number;
  /** Integer cents. */
  total: number;
  /** Ticket codes, in issue order. */
  tickets: string[];
}

/** One ticket type and a quantity inside a cart hold. */
export interface HoldLine {
  tt: string;
  qty: number;
}

/**
 * A cart hold. Inventory is decremented the instant one is created and
 * restored the instant it expires, so `expiresAt` is the whole mechanism —
 * there is no timer anywhere that "releases" a hold, only a comparison
 * against whatever `now` the caller passes in.
 */
export interface Hold {
  id: string;
  evId: string;
  lines: HoldLine[];
  startedAt: number;
  expiresAt: number;
  /** True for the hold this browser started, false for the seeded carts. */
  mine: boolean;
}

export interface Toast {
  id: number;
  /** Already-resolved text — toasts are raised from the store, post-`t()`. */
  text: string;
  tone: "pos" | "warn" | "danger" | "info";
}
