/**
 * The venue's tables, as the manifest asks Adminium to make them.
 *
 * Everything the audience site, the box office, the door and the dashboard
 * read or write is here, and so is every rule the server keeps on their
 * behalf — a rule the browser keeps is a rule another browser can skip:
 *
 *   - an order's number runs without gaps from the first number in Settings;
 *     each ticket copies its type's price when it is made, its discount comes
 *     from the code the order carries, and the order's total, what came in,
 *     what went back and what is still owed are worked out by the server,
 *     never sent by a page;
 *   - a ticket type sells no more than its size, the show no more than the
 *     room less its guest places, and a checkout holds its places for ten
 *     minutes; a place a waitlist is owed is counted but not sold to the
 *     public; a guest list keeps no more people than its places; a door takes
 *     each ticket's money once;
 *   - an order moves held → paid, at the door, by transfer or at no charge,
 *     and the clock lets a checkout, an offer or an unpaid transfer go;
 *   - a ticket is let in once a day, only on a day its type admits, only at
 *     the door of its own show, only inside the day's window and only when
 *     it is paid for (or its door money has just been taken).
 *
 * The venue's own words — the shows, the ticket types, the notes — are the
 * venue's, shown as typed.
 */
import { l, type Labels } from "./labels.ts";

type Tone = "pos" | "warn" | "danger" | "info" | "neutral" | "accent";

export interface Column {
  ref: string;
  type: "int" | "text" | "decimal" | "bool" | "enum" | "date" | "timestamptz" | "fk" | "json";
  role?: "pk" | "created_at";
  semantic?: "name" | "email" | "image" | "money";
  nullable?: true;
  enum?: string[];
  references?: string;
  default?: string | number | boolean;
  maxLength?: number;
  unique?: true;
  index?: true;
  scale?: number | "currency";
  rules?: Record<string, unknown>;
  label?: Labels | Record<string, string>;
}

export interface Table {
  ref: string;
  label: Labels | Record<string, string>;
  labelPlural: Labels | Record<string, string>;
  keyField?: string;
  unique?: string[][];
  capacity?: Record<string, unknown> | Record<string, unknown>[];
  states?: Record<string, unknown>;
  columns: Column[];
}

// ── column makers ───────────────────────────────────────────────────────────

const id: Column = { ref: "id", type: "int", role: "pk" };
const opt = { nullable: true } as const;

function text(ref: string, maxLength: number, label: string, more: Partial<Column> = {}): Column {
  return { ref, type: "text", maxLength, label: l(label), ...more };
}
function int(ref: string, label: string, more: Partial<Column> = {}): Column {
  return { ref, type: "int", label: l(label), ...more };
}
function bool(ref: string, label: string, value: boolean, more: Partial<Column> = {}): Column {
  return { ref, type: "bool", default: value, label: l(label), ...more };
}
function fk(ref: string, references: string, label: string, more: Partial<Column> = {}): Column {
  return { ref, type: "fk", references, label: l(label), ...more };
}
function at(ref: string, label: string, more: Partial<Column> = {}): Column {
  return { ref, type: "timestamptz", label: l(label), ...more };
}
function json(ref: string, label: string): Column {
  return { ref, type: "json", nullable: true, label: l(label) };
}
/** A price the venue types: the connection's currency decides the places. */
function price(ref: string, label: string, more: Partial<Column> = {}): Column {
  return { ref, type: "decimal", scale: "currency", label: l(label), ...more };
}
/** Money Adminium works out. */
function money(ref: string, label: string, rules: Record<string, unknown>): Column {
  return { ref, type: "decimal", scale: "currency", nullable: true, label: l(label), rules };
}
/** A whole number Adminium works out. */
function worked(ref: string, label: string, rules: Record<string, unknown>): Column {
  return { ref, type: "int", nullable: true, label: l(label), rules };
}
/** A wall time on the venue's clock, "18:00". */
function clock(ref: string, label: string, value: string): Column {
  return { ref, type: "text", maxLength: 5, default: value, label: l(label) };
}
/** An enum, each value labelled, with tones where a list shows it as a chip. */
function choice(
  ref: string,
  label: string,
  values: Record<string, string>,
  more: Partial<Column> & { tones?: Record<string, Tone> } = {},
): Column {
  const { tones, rules, ...rest } = more;
  return {
    ref,
    type: "enum",
    enum: Object.keys(values),
    label: l(label),
    ...rest,
    rules: {
      ...rules,
      enumLabels: {
        labels: Object.fromEntries(Object.entries(values).map(([value, word]) => [value, l(word)])),
        ...(tones === undefined ? {} : { tones }),
      },
    },
  };
}

const stamp = (set: unknown, on: unknown) => ({ stamp: { set, on } });
const onCreate = "create";
const onStatus = (...values: string[]) => ({ column: "status", values });
const onState = (...values: string[]) => ({ column: "state", values });
export const setting = (column: string) => ({ table: "settings", column });
const voidedNow = { column: "voided", values: [true] };
const copyOf = (via: string, from: string, follow = false) => ({ copy: { via, from, mode: "always", ...(follow ? { follow: true } : {}) } });
/** A 1 or a 0 a condition reads: a formula fills only a number. */
const yes = (condition: unknown) => ({ formula: { if: [condition, 1, 0] } });
const eq = (column: string, value: string | number | boolean) => ({ eq: [column, value] });

// ── the words the tables share ──────────────────────────────────────────────

/** The eight languages an order may be kept in, by their own names. */
export const LANGUAGES: Record<string, string> = {
  "en-US": "English",
  "de-DE": "Deutsch",
  "fr-FR": "Français",
  "da-DK": "Dansk",
  "cs-CZ": "Čeština",
  "ar-EG": "العربية",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
};

/** A language column: the emails read their language from it. */
function language(ref: string): Column {
  return {
    ref,
    type: "text",
    maxLength: 16,
    nullable: true,
    label: l("Language"),
    rules: { options: { values: Object.entries(LANGUAGES).map(([value, label]) => ({ value, label })) } },
  };
}

export const ORDER_STATUSES = {
  held: "In checkout",
  confirming: "Confirming by email",
  offered: "Offered",
  door: "Pay at the door",
  awaiting_transfer: "Awaiting transfer",
  overdue: "Transfer overdue",
  released: "Released",
  no_charge: "No charge",
  paid: "Paid",
  not_collected: "Didn't come",
  let_go: "Let go",
  expired: "Expired",
  cancelled: "Cancelled",
} as const;
export type OrderStatus = keyof typeof ORDER_STATUSES;

/** An order that still holds its places and its money: every other one's total reads 0. */
export const LIVE_ORDER: OrderStatus[] = [
  "held",
  "confirming",
  "offered",
  "door",
  "awaiting_transfer",
  "overdue",
  "no_charge",
  "paid",
  "not_collected",
];
/** The orders a ticket counts against its type, its show and its room while in. */
export const COUNTING_ORDER: OrderStatus[] = ["held", "confirming", "offered", "door", "awaiting_transfer", "overdue", "no_charge", "paid"];
/** The orders whose tickets the clock may still take back: a checkout, a claim being confirmed, a waitlist offer. */
export const HOLDING_ORDER: OrderStatus[] = ["held", "confirming", "offered"];
/** Unpaid by transfer: the codes of these orders' tickets never leave Adminium. */
export const UNPAID_TRANSFER: OrderStatus[] = ["held", "confirming", "awaiting_transfer", "overdue", "released"];

export const TICKET_STATUSES = {
  valid: "Valid",
  offered: "Sent to a friend",
  refund_asked: "Refund asked",
  returned: "Back for the waitlist",
  released: "Back on sale",
  cancelled: "Cancelled",
} as const;
/** A ticket someone may still use. */
export const LIVE_TICKET = ["valid", "offered", "refund_asked"];

/**
 * Why an order or a ticket was cancelled, written in the same write as the
 * move: the emails are picked by it, never by the status alone.
 */
export const CANCEL_CAUSES = {
  show: "The show was cancelled",
  box_office: "The box office cancelled it",
  request: "A refund request was approved",
  buyer: "The buyer cancelled it",
  claim: "Part of a waitlist offer not claimed",
  waitlist_ended: "Back on sale at doors",
} as const;

/**
 * What kind of ticket a type is. A code names a kind, not a type's own name,
 * so "every Main Hall show, Standard tickets" is one code: Adminium compares
 * the kinds, which it cannot do with two names typed by people.
 */
export const TICKET_KINDS = {
  standard: "Standard",
  early: "Early entry",
  balcony: "Balcony",
  pass: "Weekend pass",
  day: "Day ticket",
  place: "Place",
  presale: "Presale",
  register: "Register",
  comp: "Comps",
  other: "Other",
} as const;
/** The kinds a code may be limited to. */
export const CODE_KINDS = ["standard", "early", "balcony", "pass", "day", "place", "presale"] as const;

/** The outbox's kinds, as the Messages page names them. */
export const EMAIL_KINDS: Record<string, string> = {
  tickets: "Your tickets",
  "tickets-paid": "Your tickets (paid at the box office)",
  "transfer-confirm": "Confirm your order",
  "transfer-waiting": "Waiting for your transfer",
  "transfer-reminder": "Reminder: your transfer",
  "transfer-released": "Your tickets went back on sale",
  "payment-received": "Payment received",
  "friend-offer": "A ticket from a friend",
  "friend-ready": "Your ticket is ready",
  "friend-returned": "Your ticket came back",
  "holder-set": "A ticket in your name",
  "waitlist-offer": "Tickets are back",
  "on-sale": "On sale soon",
  moved: "Your show has moved",
  "cancelled-paid": "Your show is cancelled (paid)",
  "cancelled-unpaid": "Your show is cancelled (nothing paid)",
  "moved-holder": "Your show has moved (a friend's ticket)",
  "cancelled-holder": "Your show is cancelled (a friend's ticket)",
  tonight: "See you tonight",
  tomorrow: "See you tomorrow",
  "tonight-holder": "See you tonight (a friend's ticket)",
  "tomorrow-holder": "See you tomorrow (a friend's ticket)",
  "refund-recorded": "Refund recorded",
  "tickets-cancelled": "Tickets cancelled",
  "refund-declined": "Refund request declined",
  broadcast: "A message about your show",
};

// ── the rules the tables keep ───────────────────────────────────────────────

/**
 * An order's own clock: a checkout, a claim being confirmed and a waitlist
 * offer each run out; an unpaid transfer is overdue at its deadline and let
 * go after the grace hours; a pay-at-the-door order nobody collected is
 * marked when the show's last day ends.
 */
const ORDER_TIMED = [
  { from: "held", to: "expired", at: { column: "held_until" } },
  { from: "confirming", to: "expired", at: { column: "offer_until", or: [{ column: "held_until" }] } },
  { from: "offered", to: "expired", at: { column: "offer_until" } },
  { from: "awaiting_transfer", to: "overdue", at: { column: "pay_by" } },
  { from: "overdue", to: "released", at: { column: "pay_by", plus: { hours: setting("release_after_hours") } } },
  { from: "door", to: "not_collected", at: { column: "ends_at" } },
];

/** Paid: only when nothing is owed. */
const PAID = { to: "paid", requires: { where: [{ column: "balance", lte: 0 }] } };
const DOOR = { to: "door", requires: { setting: [{ table: "settings", column: "door_on", eq: true }] } };
const CONFIRMING = { to: "confirming", requires: { setting: [{ table: "settings", column: "transfer_on", eq: true }] } };
/** The box office takes a phone order by transfer straight to waiting, with the buyer's email. */
const AWAITING_BY_STAFF = {
  to: "awaiting_transfer",
  requires: { setting: [{ table: "settings", column: "transfer_on", eq: true }], where: [{ column: "email", isNull: false }] },
};
const CANCELLED = { to: "cancelled", requires: { where: [{ column: "cancel_cause", isNull: false }] } };

const ORDER_STATES = {
  column: "status",
  initial: "held",
  // "Paid by card at 14:30 by Priya": a second screen's tap is refused, naming the first.
  strict: true,
  moves: {
    held: [DOOR, CONFIRMING, "no_charge", AWAITING_BY_STAFF, PAID, "offered", "let_go", "expired", CANCELLED],
    // The only way on to waiting is the confirm link in the email: no key the page holds lists it.
    confirming: ["awaiting_transfer", DOOR, "no_charge", "expired", CANCELLED],
    offered: [DOOR, CONFIRMING, "no_charge", "expired", CANCELLED],
    door: [PAID, { to: "not_collected", requires: { where: [{ column: "balance", gt: 0 }] } }, CANCELLED],
    awaiting_transfer: [PAID, "overdue", CANCELLED],
    overdue: [PAID, "released", CANCELLED],
    released: [PAID],
    no_charge: [CANCELLED],
    paid: [CANCELLED],
    not_collected: [PAID],
  },
  timed: ORDER_TIMED,
  // A waitlist entry follows its offer: claimed when the offer is taken, missed when it runs out.
  effects: [
    { on: { to: "door" }, via: "waitlist_id", set: { status: "claimed" } },
    { on: { to: "confirming" }, via: "waitlist_id", set: { status: "claimed" } },
    { on: { to: "no_charge" }, via: "waitlist_id", set: { status: "claimed" } },
    { on: { to: "expired" }, via: "waitlist_id", set: { status: "missed" } },
  ],
};

/**
 * A ticket's type sells no more than its size, the show no more than the
 * room less its guest places; a checkout, a claim being confirmed and an
 * offer hold their places until their time runs out; a place the waitlist is
 * owed counts for the public and not for the box office.
 */
const TICKET_POOL = {
  kind: "parent",
  via: "ticket_type_id",
  size: { column: "capacity" },
  window: { opens: "sales_start", closes: "sales_end" },
  perWrite: { max: { column: "max_per_order" }, within: "order_id" },
  also: [{ via: "event_id", size: { column: "sell_limit" } }],
  lockBy: "event_id",
  countWhere: [
    { column: "status", values: [...LIVE_TICKET, "returned"] },
    { via: "order_id", column: "status", values: COUNTING_ORDER },
  ],
  hold: { via: "order_id", states: HOLDING_ORDER, column: { column: "offer_until", via: "waitlist_id", or: [{ column: "held_until" }] } },
  reserved: { states: ["returned"] },
};

/**
 * A refund is asked for inside the show's refund window, until its refund
 * date (the editor fills it from the refund days). A show with no refund date
 * takes no refund requests.
 */
const REFUND_ASK = { to: "refund_asked", requires: { time: { before: { column: "refund_until", via: "event_id" } } } };

const TICKET_STATES = {
  column: "status",
  initial: "valid",
  strict: true,
  moves: {
    valid: ["offered", REFUND_ASK, { to: "cancelled", requires: { where: [{ column: "cancel_cause", isNull: false }] } }, "returned"],
    offered: ["valid", { to: "cancelled", requires: { where: [{ column: "cancel_cause", isNull: false }] } }],
    refund_asked: ["valid", { to: "cancelled", requires: { where: [{ column: "cancel_cause", isNull: false }] } }, "returned"],
    returned: ["released"],
  },
  // A friend who did not accept in time: the ticket comes back, and the link sent to them stops.
  timed: [{ from: "offered", to: "valid", at: { column: "offer_until" }, set: { pending_email: null, pending_name: null, lapsed: true } }],
  // "Stop selling": a type the box office stopped takes no new ticket, from anyone.
  create: { requires: { linked: [{ via: "ticket_type_id", where: [{ column: "selling", eq: true }] }] } },
};

/**
 * A check-in is a row, one a ticket a day. It is let in only when the ticket
 * is valid (or offered to a friend: its old code still works), paid for, for
 * the show whose day the door is running, on a day its type admits, and
 * inside that day's window — from doors less the check-in minutes to last
 * entry (or the curfew, when a day has no last entry). An offline scan is
 * judged at the time it was scanned.
 */
const CHECK_IN_STATES = {
  column: "status",
  initial: "in",
  moves: {},
  create: {
    requires: {
      where: [
        { column: "right_show", eq: 1 },
        { column: "admitted", eq: 1 },
      ],
      linked: [
        { via: "ticket_id", where: [{ column: "status", in: ["valid", "offered"] }, { column: "settled", eq: 1 }] },
      ],
      time: {
        after: { column: "doors_at", via: "event_day_id", minus: { minutes: setting("check_in_minutes") } },
        before: { column: "last_entry_at", via: "event_day_id", or: [{ column: "curfew_at", via: "event_day_id" }] },
      },
    },
  },
};

/** Whether a ticket's kind is one its order's code applies to (any kind, when the code names none). */
const KIND_MATCH = {
  if: [
    { isNull: "code_type_kind" },
    1,
    { if: [{ or: CODE_KINDS.map((k) => ({ and: [eq("kind", k), eq("code_type_kind", k)] })) }, 1, 0] },
  ],
};

/** What a ticket's code takes off: a share of its price, or an amount no larger than the price. */
const DISCOUNT = {
  if: [
    { and: [eq("code_kind", "percent"), eq("kind_match", 1)] },
    { round: { div: [{ mul: ["price", { coalesce: ["code_value", 0] }] }, 100] } },
    { if: [{ and: [eq("code_kind", "amount"), eq("kind_match", 1)] }, { min: ["price", { coalesce: ["code_value", 0] }] }, 0] },
  ],
};

/** Paid for: the order is paid or at no charge, or this ticket's door money has been taken. */
const SETTLED = {
  if: [
    {
      or: [
        eq("order_status", "paid"),
        eq("order_status", "no_charge"),
        { and: [eq("order_status", "door"), { gte: [{ coalesce: ["collected", 0] }, { coalesce: ["due", 0] }] }] },
      ],
    },
    1,
    0,
  ],
};

/** A live ticket's own figure, 0 for one that is not live: an order adds only its live tickets. */
const live = (column: string) => ({ if: [{ or: LIVE_TICKET.map((s) => eq("status", s)) }, { coalesce: [column, 0] }, 0] });

/** An order's total: its live tickets less their discounts and any money given back as goodwill — 0 once it is not live. */
const ORDER_TOTAL = {
  if: [
    { or: LIVE_ORDER.slice(0, 8).map((s) => eq("status", s)) },
    { sub: [{ sub: [{ coalesce: ["subtotal", 0] }, { coalesce: ["discount", 0] }] }, { coalesce: ["adjusted", 0] }] },
    { if: [eq("status", "not_collected"), { sub: [{ sub: [{ coalesce: ["subtotal", 0] }, { coalesce: ["discount", 0] }] }, { coalesce: ["adjusted", 0] }] }, 0] },
  ],
};

// ── the tables ──────────────────────────────────────────────────────────────

export const TABLES: Table[] = [
  {
    ref: "settings",
    label: l("Venue settings"),
    labelPlural: l("Venue settings"),
    keyField: "venue_name",
    columns: [
      id,
      text("venue_name", 80, "Venue name"),
      // A venue's own address and email, shown on its site and its emails: not a person's.
      text("address", 160, "Address", { rules: { personal: false } }),
      text("contact_email", 254, "Contact email", { semantic: "email", rules: { personal: false, validation: { format: "email" } } }),
      // The venue's day starts here: a show running past midnight stays on tonight's door.
      clock("day_starts_at", "The venue day starts at", "06:00"),
      bool("door_on", "Pay at the door", true),
      bool("transfer_on", "Bank transfer", true),
      text("bank_account_name", 80, "Account name", { ...opt, rules: { personal: false } }),
      text("bank_name", 80, "Bank", { ...opt, rules: { personal: false } }),
      text("bank_account_number", 34, "Account number", { ...opt, rules: { personal: false } }),
      text("bank_routing", 34, "Sort code or routing number", { ...opt, rules: { personal: false } }),
      int("transfer_days", "Days to pay by transfer", { default: 3, rules: { validation: { min: 1, max: 14 } } }),
      clock("transfer_time", "Transfers due by", "18:00"),
      int("transfer_cutoff_days", "No transfers in the last days before a show", { default: 3, rules: { validation: { min: 0, max: 30 } } }),
      int("release_after_hours", "Hours of grace before unpaid tickets go back on sale", { default: 24, rules: { validation: { min: 0, max: 168 } } }),
      int("hold_minutes", "Minutes a checkout holds tickets", { default: 10, rules: { validation: { min: 2, max: 60 } } }),
      int("offer_hours", "Hours a waitlist offer lasts", { default: 12, rules: { validation: { min: 1, max: 72 } } }),
      int("send_hours", "Hours a friend has to accept a ticket", { default: 48, rules: { validation: { min: 1, max: 168 } } }),
      int("refund_days", "Refunds close this many days before a show", { default: 7, rules: { validation: { min: 0, max: 60 } } }),
      text("refund_payback_text", 80, "When money goes back", { default: "within 5 working days" }),
      int("check_in_minutes", "Check-in opens this many minutes before doors", { default: 30, rules: { validation: { min: 0, max: 240 } } }),
      int("remind_lead_hours", "Hours before a sale the reminder goes", { default: 1, rules: { validation: { min: 1, max: 48 } } }),
      bool("tonight_email_on", "Send \"See you tonight\"", true),
      choice("default_age", "Age for new shows", { all: "All ages", "14_adult": "14+ with an adult", "16": "16+", "18": "18+" }, { default: "all" }),
      bool("accounts_on", "Sign in and My tickets", true),
      bool("waitlist_on", "Waitlists", true),
      bool("send_on", "Send a ticket to a friend", true),
      bool("codes_on", "Codes", true),
      bool("timetable_on", "Festival timetable", true),
      bool("questions_on", "Checkout questions", true),
      text("getting_there", 1000, "Getting there", opt),
      text("accessibility", 1000, "Accessibility", opt),
      text("policies", 1000, "Good to know", opt),
      text("faq", 1000, "Questions people ask", opt),
      int("number_start", "First order number", { default: 1001, rules: { validation: { min: 1 } } }),
    ],
  },
  {
    ref: "rooms",
    label: l("Room"),
    labelPlural: l("Rooms"),
    keyField: "name",
    columns: [
      id,
      text("name", 80, "Name"),
      int("capacity", "Capacity", { rules: { validation: { min: 1, max: 100000 } } }),
      choice("kind", "Kind", { room: "One room", both: "Both rooms" }, { default: "room" }),
      text("note", 160, "Note", opt),
      text("access_text", 500, "Getting in", opt),
      int("position", "Position", { default: 0 }),
    ],
  },
  {
    ref: "events",
    label: l("Show"),
    labelPlural: l("Shows"),
    keyField: "name",
    states: {
      column: "status",
      initial: "draft",
      moves: { draft: ["published"], published: ["cancelled", "draft"] },
    },
    columns: [
      id,
      text("slug", 80, "Address", { unique: true }),
      text("name", 120, "Name"),
      text("short_name", 40, "Short name", opt),
      text("support", 160, "With", opt),
      choice("kind", "Kind", { gig: "Gig", club: "Club night", comedy: "Comedy", talks: "Talk", festival: "Festival" }, { default: "gig" }),
      fk("room_id", "rooms", "Room"),
      at("doors_at", "Doors"),
      at("starts_at", "On stage"),
      at("curfew_at", "Curfew"),
      // The last day's curfew, written by the editor whenever it saves the days.
      at("ends_at", "Ends", opt),
      choice("age", "Age", { all: "All ages", "14_adult": "14+ with an adult", "16": "16+", "18": "18+" }, { default: "all" }),
      text("age_note", 120, "Age line", opt),
      // Doors before 16:00: "See you tomorrow" goes at 18:00 the evening before, not at noon on the day.
      bool("eve_email", "Remind the evening before", false),
      int("remind_lead_hours", "Hours before a sale the reminder goes", { ...opt, rules: { validation: { min: 1, max: 24 } } }),
      text("about", 1000, "About", opt),
      text("image", 400, "Poster", { ...opt, semantic: "image" }),
      text("poster_style", 24, "Poster style", opt),
      at("on_sale_at", "On sale", opt),
      at("refund_until", "Refunds until", opt),
      text("refund_text", 300, "Refund words", opt),
      text("bags", 300, "Bags", opt),
      text("re_entry", 300, "Re-entry", opt),
      bool("waitlist_on", "Waitlist when sold out", false),
      bool("sets_published", "Set times are up", false),
      int("guest_places", "Guest-list places", { default: 0, rules: { validation: { min: 0, max: 1000 } } }),
      at("guest_list_closes_at", "Guest list closes", opt),
      int("room_capacity", "Room capacity", { ...opt, rules: copyOf("room_id", "capacity") }),
      worked("sell_limit", "On sale at most", { formula: { sub: ["room_capacity", "guest_places"] } }),
      choice("status", "Status", { draft: "Draft", published: "Published", cancelled: "Cancelled" }, {
        default: "draft",
        tones: { draft: "neutral", published: "pos", cancelled: "danger" },
      }),
      at("published_at", "Announced", { ...opt, rules: stamp("now", onStatus("published")) }),
      at("was_starts_at", "Was on", opt),
      at("postponed_at", "Postponed", { ...opt, rules: stamp("now", { column: "was_starts_at", filled: true }) }),
      at("cancelled_at", "Cancelled", { ...opt, rules: stamp("now", onStatus("cancelled")) }),
      // How many of its ticket types need a code: the page asks for a code only then.
      worked("code_types", "Types behind a code", { rollup: { from: "ticket_types", via: "event_id", count: true, where: { column: "visibility", eq: "code" } } }),
      // The show's money, from its orders.
      money("paid_in", "Paid in", { rollup: { from: "orders", via: "event_id", sum: "paid_in" } }),
      money("collected", "Taken at the door", { rollup: { from: "orders", via: "event_id", sum: "collected" } }),
      money("received", "Received", { formula: { add: [{ coalesce: ["paid_in", 0] }, { coalesce: ["collected", 0] }] } }),
      money("refunded", "Refunded", { rollup: { from: "orders", via: "event_id", sum: "refunded" } }),
      money("owed_door", "Owed at the door", { rollup: { from: "orders", via: "event_id", sum: "balance", where: { column: "status", eq: "door" } } }),
      worked("owed_door_n", "Orders to pay at the door", { rollup: { from: "orders", via: "event_id", count: true, where: { column: "status", eq: "door" } } }),
      money("owed_transfer", "Awaiting transfer", { rollup: { from: "orders", via: "event_id", sum: "balance", where: { column: "status", eq: "awaiting_transfer" } } }),
      money("owed_overdue", "Transfers overdue", { rollup: { from: "orders", via: "event_id", sum: "balance", where: { column: "status", eq: "overdue" } } }),
    ],
  },
  {
    ref: "event_days",
    label: l("Show day"),
    labelPlural: l("Show days"),
    keyField: "day",
    unique: [["event_id", "day"]],
    columns: [
      id,
      fk("event_id", "events", "Show"),
      int("day", "Day", { default: 1, rules: { validation: { min: 1, max: 3 } } }),
      at("doors_at", "Doors"),
      at("last_entry_at", "Last entry", opt),
      at("curfew_at", "Curfew"),
    ],
  },
  {
    ref: "acts",
    label: l("Act"),
    labelPlural: l("Acts"),
    keyField: "name",
    columns: [
      id,
      fk("event_id", "events", "Show"),
      text("name", 120, "Name"),
      fk("room_id", "rooms", "Room", opt),
      int("day", "Day", { default: 1, rules: { validation: { min: 1, max: 3 } } }),
      at("starts_at", "On", opt),
      at("ends_at", "Off", opt),
      bool("sets_published", "Set times are up", false, { rules: copyOf("event_id", "sets_published", true) }),
      int("position", "Position", { default: 0 }),
    ],
  },
  {
    ref: "ticket_types",
    label: l("Ticket type"),
    labelPlural: l("Ticket types"),
    keyField: "name",
    columns: [
      id,
      fk("event_id", "events", "Show", { index: true }),
      text("name", 80, "Name"),
      choice("kind", "Kind", TICKET_KINDS, { default: "standard" }),
      text("description", 300, "Description", opt),
      price("price", "Price", { default: 0, rules: { validation: { min: 0 } } }),
      int("capacity", "How many", { ...opt, rules: { validation: { min: 0 } } }),
      int("min_per_order", "At least", { ...opt, rules: { validation: { min: 1, max: 12 } } }),
      int("max_per_order", "At most in one order", { default: 8, rules: { validation: { min: 1, max: 12 } } }),
      choice("visibility", "Who can buy", { public: "Everyone", code: "With a code", box: "Box office only" }, { default: "public" }),
      bool("pay_door", "Pay at the door", true),
      bool("pay_transfer", "Bank transfer", true),
      at("sales_start", "On sale from", opt),
      at("sales_end", "On sale until", opt),
      bool("admits_day1", "Day 1", true),
      bool("admits_day2", "Day 2", false),
      bool("admits_day3", "Day 3", false),
      bool("selling", "Selling", true),
      int("position", "Position", { default: 0 }),
    ],
  },
  {
    ref: "codes",
    label: l("Code"),
    labelPlural: l("Codes"),
    keyField: "code",
    columns: [
      id,
      text("code", 32, "Code", { unique: true, rules: { normalize: "code" } }),
      choice("kind", "What it does", { percent: "Percent off", amount: "Amount off", unlock: "Unlocks a hidden ticket type" }, { default: "percent" }),
      { ref: "value", type: "decimal", scale: 2, nullable: true, label: l("Amount"), rules: { validation: { min: 0 } } },
      fk("event_id", "events", "Show", opt),
      fk("room_id", "rooms", "Every show in", opt),
      choice("type_kind", "Ticket type", Object.fromEntries(CODE_KINDS.map((k) => [k, TICKET_KINDS[k]])), opt),
      fk("unlocks_type_id", "ticket_types", "Unlocks", opt),
      int("max_uses", "Uses at most", { ...opt, rules: { validation: { min: 1 } } }),
      at("valid_until", "Valid until", opt),
      bool("active", "On", true),
      text("note", 240, "Note", opt),
    ],
  },
  {
    ref: "customers",
    label: l("Customer"),
    labelPlural: l("Customers"),
    keyField: "email",
    columns: [
      id,
      text("email", 254, "Email", { ...opt, unique: true, semantic: "email", rules: { normalize: "email", validation: { format: "email" } } }),
      text("name", 120, "Name", opt),
      bool("opt_in", "News from the venue", false),
      at("forgotten_at", "Details deleted", opt),
      at("created_at", "First order", { ...opt, rules: stamp("now", onCreate) }),
    ],
  },
  {
    ref: "questions",
    label: l("Checkout question"),
    labelPlural: l("Checkout questions"),
    keyField: "text",
    columns: [
      id,
      fk("event_id", "events", "Show"),
      text("text", 300, "Question"),
      choice("kind", "Answer", { text: "Words", choice: "A choice", yes_no: "Yes or no" }, { default: "text" }),
      text("options", 1000, "Choices, one a line", opt),
      choice("per", "Asked", { ticket: "For each ticket", order: "Once an order" }, { default: "ticket" }),
      bool("required", "Must be answered", false),
      int("position", "Position", { default: 0 }),
    ],
  },
  {
    ref: "orders",
    label: l("Order"),
    labelPlural: l("Orders"),
    keyField: "number",
    states: ORDER_STATES,
    // A code is used no more times than it allows: a checkout holding it counts until it runs out.
    capacity: {
      kind: "parent",
      via: "code_id",
      size: { column: "max_uses" },
      window: { closes: "valid_until" },
      countWhere: { column: "status", values: COUNTING_ORDER },
      hold: { column: "held_until", states: ["held", "confirming"] },
    },
    columns: [
      id,
      int("number_seq", "Number (running)", { ...opt, rules: { sequence: { gapless: true, startSetting: setting("number_start") } } }),
      text("number", 16, "Order", { ...opt, unique: true, rules: { format: { from: "number_seq", prefix: "WV-" } } }),
      choice("status", "Status", ORDER_STATUSES, {
        default: "held",
        tones: {
          held: "neutral",
          confirming: "info",
          offered: "accent",
          door: "info",
          awaiting_transfer: "warn",
          overdue: "danger",
          released: "neutral",
          no_charge: "pos",
          paid: "pos",
          not_collected: "neutral",
          let_go: "neutral",
          expired: "neutral",
          cancelled: "danger",
        },
      }),
      fk("event_id", "events", "Show", { index: true }),
      // Sent by the page and checked against the show's own room: a code for a room is found by it.
      fk("room_id", "rooms", "Room", opt),
      fk("customer_id", "customers", "Customer account", opt),
      text("buyer_name", 120, "Buyer", { ...opt, semantic: "name" }),
      text("email", 254, "Email", { ...opt, semantic: "email", rules: { normalize: "email", validation: { format: "email" } } }),
      choice("channel", "Made", { online: "Online", box_office: "At the box office", door: "At the door" }, { default: "online" }),
      language("language"),
      // The code the buyer typed, and the code Adminium found for it.
      text("code_text", 32, "Code typed", opt),
      fk("code_id", "codes", "Code", {
        ...opt,
        rules: {
          lookup: {
            from: "code_text",
            table: "codes",
            column: "code",
            where: [{ column: "active", eq: true }],
            scope: [
              { column: "event_id", equals: "event_id", orEmpty: true },
              { column: "room_id", equals: "room_id", orEmpty: true },
            ],
          },
        },
      }),
      choice("code_kind", "Code gives", { percent: "Percent off", amount: "Amount off", unlock: "Unlocks a hidden ticket type" }, {
        ...opt,
        rules: copyOf("code_id", "kind"),
      }),
      { ref: "code_value", type: "decimal", scale: 2, nullable: true, label: l("Code amount"), rules: copyOf("code_id", "value") },
      choice("code_type_kind", "Code's ticket type", Object.fromEntries(CODE_KINDS.map((k) => [k, TICKET_KINDS[k]])), {
        ...opt,
        rules: copyOf("code_id", "type_kind"),
      }),
      // The money, all of it worked out here.
      money("subtotal", "Tickets", { rollup: { from: "tickets", via: "order_id", sum: "live_price" } }),
      money("discount", "Code discount", { rollup: { from: "tickets", via: "order_id", sum: "live_discount" } }),
      money("adjusted", "Money back, tickets kept", {
        rollup: { from: "refunds", via: "order_id", sum: "amount", where: { column: "counts_off", eq: 1 } },
      }),
      money("total", "Total", { formula: ORDER_TOTAL }),
      worked("ticket_count", "Tickets", { rollup: { from: "tickets", via: "order_id", sum: "live_one" } }),
      money("collected", "Taken at the door", { rollup: { from: "tickets", via: "order_id", sum: "collected" } }),
      money("paid_in", "Paid", { rollup: { from: "payments", via: "order_id", sum: "amount", where: { column: "voided", eq: false } } }),
      money("refunded", "Refunded", { rollup: { from: "refunds", via: "order_id", sum: "amount", where: { column: "voided", eq: false } } }),
      // Above 0 something is owed; below 0 money is to go back.
      money("balance", "Owed", {
        formula: {
          add: [
            { sub: [{ sub: [{ coalesce: ["total", 0] }, { coalesce: ["collected", 0] }] }, { coalesce: ["paid_in", 0] }] },
            { coalesce: ["refunded", 0] },
          ],
        },
      }),
      worked("no_door", "Tickets that can't be paid at the door", { rollup: { from: "tickets", via: "order_id", sum: "no_door" } }),
      worked("no_transfer", "Tickets that can't be paid by transfer", { rollup: { from: "tickets", via: "order_id", sum: "no_transfer" } }),
      at("held_until", "Held until", {
        ...opt,
        // Written at the checkout and again when the buyer chooses a transfer: they get ten fresh minutes to confirm.
        rules: stamp({ addMinutes: { minutes: setting("hold_minutes") } }, { columns: ["status"] }),
      }),
      at("offer_until", "Offer runs until", { ...opt, rules: stamp({ addMinutes: { hours: setting("offer_hours") } }, onStatus("offered")) }),
      at("pay_by", "Pay by", {
        ...opt,
        rules: stamp(
          {
            deadline: {
              days: setting("transfer_days"),
              time: setting("transfer_time"),
              notAfter: { column: "doors_at", via: "event_id", minus: { days: setting("transfer_cutoff_days") } },
            },
          },
          onStatus("awaiting_transfer"),
        ),
      }),
      // The show's doors, kept in step with it: "See you tonight" goes by them.
      at("doors_at", "Doors", { ...opt, rules: copyOf("event_id", "doors_at", true) }),
      bool("eve_email", "Remind the evening before", false, { rules: copyOf("event_id", "eve_email", true) }),
      at("eve_at", "The evening before", { ...opt, rules: stamp({ moment: { column: "doors_at", minus: { days: 1 } } }, { columns: ["doors_at"] }) }),
      // The show's last day's end: the clock marks a door order nobody collected then.
      at("ends_at", "Show ends", { ...opt, rules: copyOf("event_id", "ends_at", true) }),
      at("created_at", "Placed", { ...opt, rules: stamp("now", onCreate) }),
      at("confirmed_at", "Confirmed", { ...opt, rules: stamp("now", onStatus("door", "no_charge", "awaiting_transfer", "paid")) }),
      at("paid_at", "Paid on", { ...opt, rules: stamp("now", onStatus("paid")) }),
      at("released_at", "Released", { ...opt, rules: stamp("now", onStatus("released")) }),
      at("cancelled_at", "Cancelled", { ...opt, rules: stamp("now", onStatus("cancelled")) }),
      choice("cancel_cause", "Why it was cancelled", CANCEL_CAUSES, opt),
      text("cancel_reason", 240, "Note on the cancel", opt),
      // Which cancellation email goes: 1 paid something, 2 paid nothing, 0 none (not the show's cancel).
      worked("cancel_email", "Cancellation email", {
        formula: {
          if: [
            eq("cancel_cause", "show"),
            { if: [{ gt: [{ add: [{ coalesce: ["paid_in", 0] }, { coalesce: ["collected", 0] }] }, 0] }, 1, 2] },
            0,
          ],
        },
      }),
      choice("paid_method", "Paid by", { bank_transfer: "Bank transfer", card: "Card", cash: "Cash" }, opt),
      fk("waitlist_id", "waitlist", "Waitlist place", opt),
      json("answers", "Answers"),
      text("access_note", 500, "Access needs", opt),
      bool("opt_in", "News from the venue", false),
      at("kept_at", "Kept after the move", opt),
      text("note", 500, "Box-office note", opt),
      // The order's own link, emailed to the buyer; and the confirm code, emailed only in "Confirm your order".
      text("link_token", 16, "Link code", { ...opt, rules: { code: { length: 16 } } }),
      bool("link_stopped", "Link stopped", false),
      text("confirm_token", 16, "Confirm code", { ...opt, rules: { code: { length: 16 } } }),
      // The buyer's retry key, and the box office's: a retried sale lands on the same order.
      text("client_key", 64, "Retry key", { ...opt, unique: true }),
      text("staff_key", 64, "Box-office retry key", { ...opt, unique: true }),
    ],
  },
  {
    ref: "tickets",
    label: l("Ticket"),
    labelPlural: l("Tickets"),
    keyField: "code",
    capacity: TICKET_POOL,
    states: TICKET_STATES,
    columns: [
      id,
      fk("order_id", "orders", "Order", { index: true }),
      fk("ticket_type_id", "ticket_types", "Ticket type", { index: true }),
      fk("event_id", "events", "Show", { ...opt, rules: copyOf("ticket_type_id", "event_id") }),
      choice("status", "Status", TICKET_STATUSES, {
        default: "valid",
        tones: { valid: "pos", offered: "accent", refund_asked: "warn", returned: "info", released: "neutral", cancelled: "danger" },
      }),
      choice("order_status", "Order", ORDER_STATUSES, { ...opt, rules: copyOf("order_id", "status", true) }),
      choice("order_cancel_cause", "Why the order was cancelled", CANCEL_CAUSES, { ...opt, rules: copyOf("order_id", "cancel_cause", true) }),
      // Copied, not followed (a ticket follows its order alone): the Postpone action saves the show's tickets again.
      at("doors_at", "Doors", { ...opt, rules: copyOf("event_id", "doors_at") }),
      bool("eve_email", "Remind the evening before", false, { rules: copyOf("event_id", "eve_email") }),
      at("eve_at", "The evening before", { ...opt, rules: stamp({ moment: { column: "doors_at", minus: { days: 1 } } }, { columns: ["doors_at"] }) }),
      // A friend holding the ticket gets the show's reminder too: 1 at noon on the day, 2 the evening before.
      worked("holder_reminder", "Holder's reminder", {
        formula: { if: [{ isNull: "holder_customer_id" }, 0, { if: [eq("eve_email", true), 2, 1] }] },
      }),
      text("name", 80, "Type", { ...opt, rules: copyOf("ticket_type_id", "name") }),
      choice("kind", "Kind", TICKET_KINDS, { ...opt, rules: copyOf("ticket_type_id", "kind") }),
      money("price", "Price", copyOf("ticket_type_id", "price")),
      bool("pay_door", "Pay at the door", true, { rules: copyOf("ticket_type_id", "pay_door") }),
      bool("pay_transfer", "Bank transfer", true, { rules: copyOf("ticket_type_id", "pay_transfer") }),
      worked("no_door", "Not at the door", yes(eq("pay_door", false))),
      worked("no_transfer", "Not by transfer", yes(eq("pay_transfer", false))),
      bool("admits_day1", "Day 1", true, { rules: copyOf("ticket_type_id", "admits_day1") }),
      bool("admits_day2", "Day 2", false, { rules: copyOf("ticket_type_id", "admits_day2") }),
      bool("admits_day3", "Day 3", false, { rules: copyOf("ticket_type_id", "admits_day3") }),
      int("position", "Position", { default: 0 }),
      // The order's code, and what it takes off this ticket.
      choice("code_kind", "Code gives", { percent: "Percent off", amount: "Amount off", unlock: "Unlocks a hidden ticket type" }, {
        ...opt,
        rules: copyOf("order_id", "code_kind"),
      }),
      { ref: "code_value", type: "decimal", scale: 2, nullable: true, label: l("Code amount"), rules: copyOf("order_id", "code_value") },
      choice("code_type_kind", "Code's ticket type", Object.fromEntries(CODE_KINDS.map((k) => [k, TICKET_KINDS[k]])), {
        ...opt,
        rules: copyOf("order_id", "code_type_kind"),
      }),
      worked("kind_match", "Code applies", { formula: KIND_MATCH }),
      money("discount", "Discount", { formula: DISCOUNT }),
      money("due", "Due", { formula: { sub: [{ coalesce: ["price", 0] }, { coalesce: ["discount", 0] }] } }),
      money("live_price", "Price while live", { formula: live("price") }),
      money("live_discount", "Discount while live", { formula: live("discount") }),
      worked("live_one", "Live", { formula: { if: [{ or: LIVE_TICKET.map((s) => eq("status", s)) }, 1, 0] } }),
      money("collected", "Taken at the door", { rollup: { from: "door_collections", via: "ticket_id", sum: "amount", where: { column: "state", eq: "taken" } } }),
      worked("settled", "Paid for", { formula: SETTLED }),
      // The ticket's code: the door scans it. A new holder gets a new one.
      text("code", 12, "Ticket code", { ...opt, rules: { code: { length: 8, renew: { on: { column: "holder_customer_id", changed: true } } } } }),
      text("holder_name", 120, "Name on the ticket", { ...opt, semantic: "name" }),
      text("holder_email", 254, "Holder's email", {
        ...opt,
        semantic: "email",
        rules: { validation: { format: "email" }, stamp: { set: { copy: "pending_email" }, on: { columns: ["holder_customer_id"] } } },
      }),
      json("answers", "Answers"),
      // Sent to a friend.
      text("pending_name", 120, "Sent to", opt),
      text("pending_email", 254, "Sent to email", { ...opt, semantic: "email", rules: { validation: { format: "email" } } }),
      at("offer_until", "Accept by", { ...opt, rules: stamp({ addMinutes: { hours: setting("send_hours") } }, onStatus("offered")) }),
      fk("holder_customer_id", "customers", "Holder's account", opt),
      // The ticket's own link, emailed only to the friend it is sent to; a new send makes a new one.
      text("link_token", 16, "Link code", { ...opt, rules: { code: { length: 16, renew: { on: { column: "pending_email", changed: true } } } } }),
      at("sent_at", "Sent", { ...opt, rules: stamp("now", onStatus("offered")) }),
      at("accepted_at", "Accepted", { ...opt, rules: stamp("now", { column: "holder_customer_id", filled: true }) }),
      bool("lapsed", "Came back unaccepted", false),
      at("refund_asked_at", "Refund asked", { ...opt, rules: stamp("now", onStatus("refund_asked")) }),
      at("refund_declined_at", "Refund declined", opt),
      choice("cancel_cause", "Why it was cancelled", CANCEL_CAUSES, opt),
      at("cancelled_at", "Cancelled", { ...opt, rules: stamp("now", onStatus("cancelled")) }),
    ],
  },
  {
    ref: "check_ins",
    label: l("Check-in"),
    labelPlural: l("Check-ins"),
    keyField: "scanned_at",
    // Once a ticket a day: a second scan the same day is refused, and the door reads the first.
    unique: [["ticket_id", "event_day_id"]],
    states: CHECK_IN_STATES,
    columns: [
      id,
      fk("ticket_id", "tickets", "Ticket"),
      // The show day the door is running: the only thing the door chooses.
      fk("event_day_id", "event_days", "Show day"),
      fk("order_id", "orders", "Order", { ...opt, rules: copyOf("ticket_id", "order_id") }),
      fk("event_id", "events", "Ticket's show", { ...opt, rules: copyOf("ticket_id", "event_id") }),
      fk("door_event_id", "events", "Door's show", { ...opt, rules: copyOf("event_day_id", "event_id") }),
      // The two shows as numbers, so Adminium can say whether they are the same one.
      worked("ticket_event_no", "Ticket's show number", copyOf("ticket_id", "event_id")),
      worked("day_event_no", "Door's show number", copyOf("event_day_id", "event_id")),
      worked("day", "Day", copyOf("event_day_id", "day")),
      bool("admits_day1", "Day 1", false, { rules: copyOf("ticket_id", "admits_day1") }),
      bool("admits_day2", "Day 2", false, { rules: copyOf("ticket_id", "admits_day2") }),
      bool("admits_day3", "Day 3", false, { rules: copyOf("ticket_id", "admits_day3") }),
      worked("right_show", "Right show", yes({ and: [{ gte: ["ticket_event_no", "day_event_no"] }, { lte: ["ticket_event_no", "day_event_no"] }] })),
      worked("admitted", "Day admitted", yes({
        or: [
          { and: [eq("day", 1), eq("admits_day1", true)] },
          { and: [eq("day", 2), eq("admits_day2", true)] },
          { and: [eq("day", 3), eq("admits_day3", true)] },
        ],
      })),
      choice("status", "Status", { in: "In" }, { default: "in", tones: { in: "pos" } }),
      at("scanned_at", "In at", { ...opt, rules: stamp("now", onCreate) }),
      text("scanned_by", 80, "By", { ...opt, rules: stamp("user-name", onCreate) }),
      fk("device_id", "devices", "Door", opt),
    ],
  },
  {
    ref: "door_collections",
    label: l("Door payment"),
    labelPlural: l("Door payments"),
    keyField: "taken_at",
    // A ticket's door money is taken once.
    capacity: { kind: "parent", via: "ticket_id", size: 1, countWhere: { column: "state", values: ["taken"] } },
    columns: [
      id,
      fk("ticket_id", "tickets", "Ticket", { index: true }),
      fk("order_id", "orders", "Order", { ...opt, rules: copyOf("ticket_id", "order_id") }),
      money("amount", "Amount", copyOf("ticket_id", "due")),
      choice("method", "How", { card: "Card", cash: "Cash" }, { default: "card" }),
      fk("device_id", "devices", "Door", opt),
      choice("state", "State", { taken: "Taken", voided: "Voided" }, { default: "taken", tones: { taken: "pos", voided: "neutral" } }),
      at("taken_at", "Taken", { ...opt, rules: stamp("now", onCreate) }),
      text("taken_by", 80, "Taken by", { ...opt, rules: stamp("user-name", onCreate) }),
      at("voided_at", "Voided on", { ...opt, rules: stamp("now", onState("voided")) }),
      text("voided_by", 80, "Voided by", { ...opt, rules: stamp("user-name", onState("voided")) }),
    ],
  },
  {
    ref: "payments",
    label: l("Payment"),
    labelPlural: l("Payments"),
    keyField: "method",
    columns: [
      id,
      fk("order_id", "orders", "Order", { index: true }),
      price("amount", "Amount", { rules: { validation: { min: 0.01 } } }),
      choice("method", "How", { bank_transfer: "Bank transfer", card: "Card", cash: "Cash" }, { default: "card" }),
      fk("device_id", "devices", "Door", opt),
      text("note", 240, "Note", opt),
      at("recorded_at", "Recorded", { ...opt, rules: stamp("now", onCreate) }),
      text("recorded_by", 80, "Recorded by", { ...opt, rules: stamp("user-name", onCreate) }),
      bool("voided", "Voided", false),
      at("voided_at", "Voided on", { ...opt, rules: stamp("now", voidedNow) }),
      text("voided_by", 80, "Voided by", { ...opt, rules: stamp("user-name", voidedNow) }),
    ],
  },
  {
    ref: "refunds",
    label: l("Refund"),
    labelPlural: l("Refunds"),
    keyField: "method",
    columns: [
      id,
      fk("order_id", "orders", "Order", { index: true }),
      price("amount", "Amount", { rules: { validation: { min: 0.01 } } }),
      // Money back for tickets cancelled, or money back while the tickets still work.
      choice("kind", "What it is for", { cancelled_tickets: "Cancelled tickets", goodwill: "Money back, tickets stay" }, { default: "cancelled_tickets" }),
      { ref: "counts_off", type: "int", default: 0, label: l("Taken off the total"), rules: yes({ and: [eq("kind", "goodwill"), eq("voided", false)] }) },
      choice("method", "How", { bank_transfer: "Bank transfer", card: "Card", cash: "Cash" }, { default: "bank_transfer" }),
      text("note", 240, "Note", opt),
      at("recorded_at", "Recorded", { ...opt, rules: stamp("now", onCreate) }),
      text("recorded_by", 80, "Recorded by", { ...opt, rules: stamp("user-name", onCreate) }),
      bool("voided", "Voided", false),
      at("voided_at", "Voided on", { ...opt, rules: stamp("now", voidedNow) }),
      text("voided_by", 80, "Voided by", { ...opt, rules: stamp("user-name", voidedNow) }),
    ],
  },
  {
    ref: "guest_list",
    label: l("Guest"),
    labelPlural: l("Guest list"),
    keyField: "name",
    // A show's guest list holds no more people than its guest places.
    capacity: { kind: "parent", via: "event_id", size: { column: "guest_places" }, amount: "people" },
    states: { column: "status", initial: "not_in", strict: true, moves: { not_in: ["in"], in: ["not_in"] } },
    columns: [
      id,
      fk("event_id", "events", "Show", { index: true }),
      text("name", 120, "Name", { semantic: "name" }),
      int("plus", "Plus", { default: 0, rules: { validation: { min: 0, max: 2 } } }),
      worked("people", "People", { formula: { add: [1, { coalesce: ["plus", 0] }] } }),
      text("on_behalf", 80, "For", opt),
      text("note", 240, "Note", opt),
      int("arrived", "Arrived", { default: 0, rules: { validation: { min: 0, max: 3 } } }),
      choice("status", "At the door", { not_in: "Not in", in: "In" }, { default: "not_in", tones: { not_in: "neutral", in: "pos" } }),
      at("in_at", "In at", { ...opt, rules: stamp("now", onStatus("in")) }),
      text("in_by", 80, "Let in by", { ...opt, rules: stamp("user-name", onStatus("in")) }),
      text("added_by", 80, "Added by", { ...opt, rules: stamp("user-name", onCreate) }),
    ],
  },
  {
    ref: "waitlist",
    label: l("Waitlist place"),
    labelPlural: l("Waitlists"),
    keyField: "email",
    unique: [["event_id", "email"]],
    states: {
      column: "status",
      initial: "waiting",
      strict: true,
      moves: { waiting: ["offered", "left", "removed"], offered: ["claimed", "missed"], claimed: ["missed"] },
    },
    columns: [
      id,
      fk("event_id", "events", "Show"),
      fk("customer_id", "customers", "Customer account", opt),
      text("email", 254, "Email", { semantic: "email", rules: { normalize: "email", validation: { format: "email" } } }),
      int("qty", "How many", { default: 1, rules: { validation: { min: 1, max: 4 } } }),
      choice("status", "Status", { waiting: "Waiting", offered: "Offered", claimed: "Claimed", missed: "Missed", left: "Left", removed: "Removed" }, {
        default: "waiting",
        tones: { waiting: "info", offered: "accent", claimed: "pos", missed: "neutral", left: "neutral", removed: "neutral" },
      }),
      fk("order_id", "orders", "Offer", opt),
      at("joined_at", "Joined", { ...opt, rules: stamp("now", onCreate) }),
      at("offered_at", "Offered", { ...opt, rules: stamp("now", onStatus("offered")) }),
      at("offer_until", "Offer runs until", { ...opt, rules: stamp({ addMinutes: { hours: setting("offer_hours") } }, onStatus("offered")) }),
    ],
  },
  {
    ref: "reminders",
    label: l("Reminder"),
    labelPlural: l("Reminders"),
    keyField: "email",
    // One reminder a person for a show's sale, and one for each presale.
    unique: [["event_id", "email", "target"]],
    columns: [
      id,
      fk("event_id", "events", "Show"),
      fk("customer_id", "customers", "Customer account", opt),
      text("email", 254, "Email", { semantic: "email", rules: { normalize: "email", validation: { format: "email" } } }),
      fk("ticket_type_id", "ticket_types", "Presale", opt),
      // "sale", or the presale type's number: what makes a reminder a person's one of a kind.
      text("target", 16, "For", { default: "sale", rules: { normalize: "trim" } }),
      at("type_sales_start", "Presale opens", { ...opt, rules: copyOf("ticket_type_id", "sales_start") }),
      at("on_sale_at", "On sale", { ...opt, rules: copyOf("event_id", "on_sale_at", true) }),
      at("created_at", "Asked", { ...opt, rules: stamp("now", onCreate) }),
      at("sent_at", "Sent", opt),
    ],
  },
  {
    ref: "broadcasts",
    label: l("Message to buyers"),
    labelPlural: l("Messages to buyers"),
    keyField: "subject",
    columns: [
      id,
      fk("event_id", "events", "Show"),
      choice("audience", "To", { everyone: "Everyone", type: "One ticket type", not_in: "Not yet checked in" }, { default: "everyone" }),
      fk("ticket_type_id", "ticket_types", "Ticket type", opt),
      choice("template", "About", {
        set_times: "Set times are up",
        doors: "Doors time changed",
        moved: "Postponed",
        cancelled: "Cancelled",
        other: "Something else",
      }, { default: "other" }),
      text("subject", 200, "Subject"),
      text("body", 1000, "Message"),
      worked("people", "Orders it went to", { rollup: { from: "messages", via: "broadcast_id", count: true } }),
      at("sent_at", "Sent", { ...opt, rules: stamp("now", onCreate) }),
      text("sent_by", 80, "Sent by", { ...opt, rules: stamp("user-name", onCreate) }),
    ],
  },
  {
    ref: "messages",
    label: l("Email"),
    labelPlural: l("Emails"),
    keyField: "kind",
    columns: [
      id,
      choice("kind", "Kind", EMAIL_KINDS),
      choice("status", "Status", { queued: "Going out", held: "Waiting to be sent", sent: "Sent", failed: "Not sent", skipped: "Skipped" }, {
        default: "queued",
        tones: { queued: "info", held: "warn", sent: "pos", failed: "danger", skipped: "neutral" },
      }),
      text("to_address", 254, "To", { ...opt, semantic: "email" }),
      text("language", 16, "Language", opt),
      fk("order_id", "orders", "Order", opt),
      fk("ticket_id", "tickets", "Ticket", opt),
      fk("customer_id", "customers", "Customer", opt),
      fk("event_id", "events", "Show", opt),
      fk("waitlist_id", "waitlist", "Waitlist place", opt),
      fk("reminder_id", "reminders", "Reminder", opt),
      fk("refund_id", "refunds", "Refund", opt),
      fk("broadcast_id", "broadcasts", "Message to buyers", opt),
      at("due", "Due", opt),
      at("created_at", "Created", { ...opt, rules: stamp("now", onCreate) }),
      at("sent_at", "Sent", opt),
      text("error", 500, "What went wrong", opt),
      choice("skip_reason", "Why it was skipped", {
        overtaken: "A later email took its place",
        paid: "Paid",
        void: "Void",
        "no-longer-needed": "No longer needed",
        "by-hand": "Skipped by hand",
      }, opt),
      text("subject_override", 200, "Subject as sent", opt),
      text("body_override", 1000, "Message as sent", opt),
      text("approved_by", 80, "Sent by", opt),
    ],
  },
  {
    ref: "devices",
    label: l("Door"),
    labelPlural: l("Doors"),
    keyField: "name",
    columns: [id, text("name", 40, "Name"), bool("active", "In use", true)],
  },
];

export const TABLE_REFS = TABLES.map((t) => t.ref);
