/**
 * What the audience site may read and write, through four browser keys.
 *
 * The `customer` key is the site's: the venue's public settings, the rooms,
 * the published shows with their days, acts, ticket types and questions, what
 * is left of each type (said only when little is); buying tickets in one
 * write, priced by Adminium and checked against the price the buyer saw;
 * joining a waitlist or asking to be reminded; and, once a person has signed
 * in with a link emailed to them, their own orders and tickets and nothing
 * else.
 *
 * The `link` key opens one order by the code in its own link (the checkout
 * page, the emails): the same order and tickets, without signing in.
 *
 * The `confirm` key opens one order by the code emailed only in "Confirm your
 * order": it alone may move a bank-transfer checkout on to waiting for the
 * transfer, so a page that never opened the email cannot.
 *
 * The `ticket` key opens one ticket sent to a friend, by the code in the link
 * emailed to that friend: they may accept it, in their own name.
 *
 * What never leaves: payments, refunds, door money, guest lists, codes,
 * messages, doors, check-ins, anyone else's order, the link and confirm codes,
 * the retry keys, who at the box office did what, why something was
 * cancelled. A ticket's code is shown only to its holder.
 */
import { LIVE_ORDER, setting } from "./tables.ts";

/** What a buyer sees of their order. */
export const ORDER_SELECT = [
  "id",
  "number",
  "status",
  "event_id",
  "buyer_name",
  "email",
  "language",
  "code_text",
  "code_kind",
  "code_value",
  "code_type_kind",
  "subtotal",
  "discount",
  "adjusted",
  "total",
  "ticket_count",
  "collected",
  "paid_in",
  "refunded",
  "balance",
  "held_until",
  "offer_until",
  "pay_by",
  "created_at",
  "paid_at",
  "paid_method",
  "cancelled_at",
  "answers",
  "access_note",
  "opt_in",
  "kept_at",
];

/** What a create answers: nothing personal goes back to an endpoint anyone may call. */
const PERSONAL_ORDER = ["buyer_name", "email", "answers", "access_note"];
const CREATED_SELECT = ORDER_SELECT.filter((c) => !PERSONAL_ORDER.includes(c));

/** What a buyer sees of each ticket; the code only when they hold it. */
export const TICKET_SELECT = [
  "id",
  "order_id",
  "ticket_type_id",
  "event_id",
  "status",
  "name",
  "price",
  "discount",
  "due",
  "collected",
  "position",
  "admits_day1",
  "admits_day2",
  "admits_day3",
  "code",
  "holder_name",
  "holder_email",
  "pending_name",
  "pending_email",
  "offer_until",
  "sent_at",
  "accepted_at",
  "refund_asked_at",
  "times_in",
  "answers",
];

/** An order's states in which its tickets can be named: held in a checkout, or live. */
const NAMED = ["held", "confirming", "offered", "door", "no_charge", "paid", "awaiting_transfer", "overdue"];

/** An order's states in which nothing is paid yet: its tickets carry no code to the browser. */
const UNPAID = ["held", "confirming", "offered", "awaiting_transfer", "overdue", "released"];

/**
 * A friend's code and address stay with the friend; the buyer sees "Sent to Kai Renner". And no ticket shows
 * a code before its order is paid or confirmed to pay at the door.
 */
const WITHHOLD = {
  columns: ["code", "holder_email"],
  unlessHolder: "holder_customer_id",
  when: { where: [{ column: "order_status", in: UNPAID }] },
};

/** The venue's public face. */
export const SETTINGS_SELECT = [
  "venue_name",
  "address",
  "contact_email",
  "day_starts_at",
  "door_on",
  "transfer_on",
  "transfer_days",
  "transfer_time",
  "transfer_cutoff_days",
  "release_after_hours",
  "hold_minutes",
  "offer_hours",
  "send_hours",
  "refund_days",
  "refund_payback_text",
  "accounts_on",
  "waitlist_on",
  "send_on",
  "codes_on",
  "timetable_on",
  "questions_on",
  "getting_there",
  "accessibility",
  "policies",
  "faq",
];
const BANK_SELECT = ["bank_account_name", "bank_name", "bank_account_number", "bank_routing"];

const EVENT_SELECT = [
  "id",
  "slug",
  "name",
  "short_name",
  "support",
  "kind",
  "room_id",
  "doors_at",
  "starts_at",
  "curfew_at",
  "ends_at",
  "age",
  "age_note",
  "about",
  "image",
  "poster_style",
  "on_sale_at",
  "refund_until",
  "refund_text",
  "bags",
  "re_entry",
  "waitlist_on",
  "sets_published",
  "guest_places",
  "status",
  "published_at",
  "was_starts_at",
  "postponed_at",
  "cancelled_at",
  "code_types",
];
const TYPE_SELECT = [
  "id",
  "event_id",
  "name",
  "kind",
  "description",
  "price",
  "capacity",
  "min_per_order",
  "max_per_order",
  "pay_door",
  "pay_transfer",
  "sales_start",
  "sales_end",
  "admits_day1",
  "admits_day2",
  "admits_day3",
  "selling",
  "position",
];

const SIGNED_IN = { level: "verified", claimedBy: { table: "customers", column: "customer_id" } };
const OWN_LINK = { claim: { by: "token", column: "link_token", stopped: "link_stopped", own: true, address: "email" } };
const WITH_ORDER = { level: "verified", visibleWith: { table: "orders", via: "order_id" } };

/** An order's own changes, through a signed-in session or its own link. */
function orderEntry(keyed: Record<string, unknown>, who: Record<string, unknown>) {
  return {
    // Choosing how to pay, letting a checkout go, keeping tickets after a move. Never on to waiting for a
    // transfer: the emailed confirm does that. "No charge" is for a free show's places only: the order's own
    // rule refuses it while anything is to pay. Which move is allowed from where is the order's own rule.
    table: "orders",
    ...keyed,
    methods: ["GET", "PATCH"],
    ...who,
    select: ORDER_SELECT,
    writable: ["status", "buyer_name", "opt_in", "answers", "access_note", "language", "kept_at"],
    writableValues: { status: ["confirming", "door", "no_charge", "let_go"] },
    writableWhen: { status: LIVE_ORDER },
    documents: ["receipt"],
  };
}

/** An order's tickets: read with the order, and the changes a buyer makes to them. */
function ticketEntries(keyed: Record<string, unknown>) {
  return [
    // Send a ticket to a friend or take it back; ask for a refund or withdraw the ask (the refund
    // window is the ticket's own rule). Only once the order is confirmed, and only while nobody
    // else holds the ticket.
    {
      table: "tickets",
      ...keyed,
      methods: ["GET", "PATCH"],
      ...WITH_ORDER,
      select: TICKET_SELECT,
      writable: ["status", "pending_email", "pending_name"],
      writableValues: { status: ["offered", "valid", "refund_asked"] },
      writableWhen: { status: ["valid", "offered", "refund_asked"], holder_customer_id: [null], order_status: ["door", "no_charge", "paid"] },
      limits: { perValue: { columns: ["pending_email"], n: 5 }, plainText: ["pending_name"] },
      withhold: WITHHOLD,
    },
    // The names on the tickets and their answers: from the moment the places are held (checkout asks
    // for them then), for as long as the order lives and nobody else holds the ticket.
    {
      table: "tickets",
      ...keyed,
      methods: ["PATCH"],
      ...WITH_ORDER,
      select: TICKET_SELECT,
      writable: ["holder_name", "answers"],
      writableWhen: { status: ["valid", "offered", "refund_asked"], holder_customer_id: [null], order_status: NAMED },
      limits: { plainText: ["holder_name"] },
      withhold: WITHHOLD,
    },
    // Cancel a ticket nothing was paid for, until doors.
    {
      table: "tickets",
      ...keyed,
      methods: ["PATCH"],
      ...WITH_ORDER,
      select: TICKET_SELECT,
      writable: ["status"],
      writableValues: { status: ["cancelled"] },
      defaults: { cancel_cause: "buyer" },
      writableWhen: { status: ["valid"], order_status: ["door"], event_id: { before: { column: "doors_at" } } },
      withhold: WITHHOLD,
    },
  ];
}

export const PUBLIC_KEYS = { link: {}, confirm: {}, ticket: {} };

export const PUBLIC_ACCESS = [
  // ── the person who signs in with a link emailed to them ─────────────────────
  {
    table: "customers",
    methods: ["GET", "PATCH"],
    select: ["name", "email", "opt_in"],
    writable: ["name", "opt_in"],
    claim: { verify: "email-link", email: "email" },
    humanCheck: true,
    // Deleting their details also stops their orders' own links: an old email no longer opens a name and an address.
    forget: { columns: ["email", "name", "opt_in"], stamp: "forgotten_at", links: true },
  },
  orderEntry({}, SIGNED_IN),
  ...ticketEntries({}),
  // A ticket a friend sent them, once they accepted it.
  {
    table: "tickets",
    methods: ["GET"],
    level: "verified",
    claimedBy: { table: "customers", column: "holder_customer_id" },
    select: ["id", "ticket_type_id", "event_id", "status", "name", "due", "collected", "code", "holder_name", "admits_day1", "admits_day2", "admits_day3"],
  },
  { table: "waitlist", methods: ["GET", "PATCH"], ...SIGNED_IN, select: ["id", "event_id", "qty", "status", "order_id", "offer_until"], writable: ["status"], writableValues: { status: ["left"] }, writableWhen: { status: ["waiting"] } },
  { table: "reminders", methods: ["GET"], ...SIGNED_IN, select: ["id", "event_id", "ticket_type_id", "target"] },
  // The venue's bank details, for a transfer: only for a person whose session is proved.
  { table: "settings", methods: ["GET"], level: "verified", select: BANK_SELECT },

  // ── the venue and its shows ─────────────────────────────────────────────────
  { table: "settings", methods: ["GET"], select: SETTINGS_SELECT },
  { table: "rooms", methods: ["GET"], select: ["id", "name", "kind", "note", "access_text", "position"] },
  {
    table: "events",
    methods: ["GET"],
    select: EVENT_SELECT,
    filters: [{ column: "status", op: "in", value: ["published", "cancelled"] }],
    pictures: ["image"],
  },
  { table: "event_days", methods: ["GET"], select: ["id", "event_id", "day", "doors_at", "last_entry_at", "curfew_at"] },
  // The acts by name; their times only once the show's set times are up.
  { table: "acts", methods: ["GET"], select: ["id", "event_id", "name", "room_id", "day", "position"] },
  {
    table: "acts",
    methods: ["GET"],
    select: ["id", "event_id", "name", "room_id", "day", "starts_at", "ends_at", "position"],
    filters: [{ column: "sets_published", op: "eq", value: true }],
  },
  { table: "ticket_types", methods: ["GET"], select: TYPE_SELECT, filters: [{ column: "visibility", op: "eq", value: "public" }] },
  // A type behind a code, shown to the person who typed it.
  {
    table: "ticket_types",
    methods: ["GET"],
    select: TYPE_SELECT,
    filters: [{ column: "visibility", op: "eq", value: "code" }],
    unlockBy: { table: "codes", column: "code", link: "unlocks_type_id", where: [{ column: "active", eq: true }] },
  },
  { table: "questions", methods: ["GET"], select: ["id", "event_id", "text", "kind", "options", "per", "required", "position"] },
  // What is left of each type of a show: said only when little is.
  { table: "tickets", kind: "availability", methods: ["GET"], under: "event_id", showLeft: { belowShare: 15 } },

  // ── buying tickets ──────────────────────────────────────────────────────────
  {
    table: "orders",
    methods: ["POST"],
    level: "verified",
    humanCheck: true,
    select: CREATED_SELECT,
    writable: ["event_id", "room_id", "buyer_name", "email", "code_text", "client_key", "opt_in", "answers", "access_note", "language"],
    requires: ["email", "buyer_name"],
    claimedBy: { table: "customers", column: "customer_id", optional: true },
    identity: { table: "customers", email: "email", link: "customer_id", fill: { name: "buyer_name" } },
    shareLink: "link_token",
    // The room the page sends is the show's own: a code for a room is found by it, and a wrong one buys nothing.
    agrees: [{ column: "room_id", eq: { via: "event_id", column: "room_id" } }],
    anonymous: { perValue: { columns: ["email"], n: 20 }, plainText: ["buyer_name"] },
    children: {
      tickets: {
        via: "order_id",
        writable: ["ticket_type_id", "holder_name", "answers"],
        select: ["id", "ticket_type_id", "name", "price", "discount", "due", "holder_name", "position"],
        min: 1,
        max: 12,
        agrees: [{ column: "ticket_type_id", path: ["event_id"], eq: { parent: "event_id" } }],
      },
    },
    dryRun: true,
    expect: "total",
    clientKey: "client_key",
  },
  {
    table: "waitlist",
    methods: ["POST"],
    level: "verified",
    humanCheck: true,
    select: ["id", "event_id", "qty", "status"],
    writable: ["event_id", "email", "qty"],
    requires: ["email"],
    claimedBy: { table: "customers", column: "customer_id", optional: true },
    identity: { table: "customers", email: "email", link: "customer_id" },
    anonymous: { perValue: { columns: ["email"], n: 5 } },
    requireSetting: [{ ...setting("waitlist_on"), when: "anonymous" }],
  },
  {
    table: "reminders",
    methods: ["POST"],
    level: "verified",
    humanCheck: true,
    select: ["id", "event_id", "ticket_type_id", "target"],
    writable: ["event_id", "ticket_type_id", "target", "email"],
    requires: ["email"],
    claimedBy: { table: "customers", column: "customer_id", optional: true },
    identity: { table: "customers", email: "email", link: "customer_id" },
    anonymous: { perValue: { columns: ["email"], n: 10 } },
  },

  // ── one order, by its own link ──────────────────────────────────────────────
  orderEntry({ key: "link" }, OWN_LINK),
  ...ticketEntries({ key: "link" }),
  { table: "settings", key: "link", methods: ["GET"], level: "verified", select: BANK_SELECT },

  // ── confirming a bank-transfer checkout, by the code emailed only for it ────
  {
    table: "orders",
    key: "confirm",
    methods: ["GET", "PATCH"],
    claim: { by: "token", column: "confirm_token", own: true, address: "email" },
    select: ["id", "number", "status", "event_id", "total", "ticket_count", "held_until", "offer_until", "pay_by"],
    writable: ["status"],
    writableValues: { status: ["awaiting_transfer"] },
    writableWhen: { status: ["confirming"] },
  },
  { table: "settings", key: "confirm", methods: ["GET"], level: "verified", select: BANK_SELECT },

  // ── one ticket a friend sent, by the link emailed to that friend ────────────
  {
    table: "tickets",
    key: "ticket",
    methods: ["GET", "PATCH"],
    claim: { by: "token", column: "link_token", own: true, address: ["pending_email", "holder_email"] },
    // The code only once the ticket is theirs: before they accept, the ticket still belongs to the sender.
    select: ["id", "ticket_type_id", "event_id", "status", "name", "due", "collected", "code", "pending_name", "holder_name", "sender_name", "offer_until", "accepted_at"],
    withhold: { columns: ["code"], when: { where: [{ column: "holder_customer_id", isNull: true }] } },
    writable: ["status", "holder_name"],
    requires: ["status", "holder_name"],
    writableValues: { status: ["valid"] },
    writableWhen: { status: ["offered"] },
    limits: { plainText: ["holder_name"] },
    // The friend is found (or made) only by the save that accepts the ticket.
    identity: { table: "customers", email: "pending_email", link: "holder_customer_id", fill: { name: "holder_name" }, on: { to: "valid" } },
  },
];
