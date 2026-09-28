/**
 * The sample venue, resolved in the browser.
 *
 * The website's demo runs with no server: it reads the very bundle an operator
 * adds from Adminium (`seeds/events.sample.json`) and needs the rows Adminium
 * would have written from it. `resolveSample()` is that loader, done here —
 * and done the SAME way, because a demo that worked out "today" or a total
 * differently from a real install would show a house nobody can get:
 *
 *   - each table's rows get `id`s 1, 2, 3 … in bundle order, as a fresh
 *     table's counter hands them out; a row left out by `@byClock` takes none;
 *   - `@ref` is the id of the earlier row with that `@label`;
 *   - `@ago` is an instant that long before `now`; `@in` one that long after,
 *     rounded up with `@grid` to the next step of that many minutes on the
 *     house's clock, counted from its midnight and never past the next;
 *   - `@day`/`@time` is a wall time on the house's clock, `@day` alone a
 *     date there; with `@workdays` the days count Monday to Friday, and day 0
 *     on a weekend is the Monday after;
 *   - `@month`/`@dom` is that day of the month so many months back, the
 *     month's last day when it has fewer, and never later than today (with
 *     `@time`, never later than now) — so a month's history keeps its shape
 *     whatever day it is added;
 *   - `@onlyIfEmpty` is a row for a table that holds one: the demo's tables
 *     start empty, so the row is always added;
 *   - `@byClock` merges its `before`, `around` or `after` set by where the
 *     row's time falls against `now` — more than half an hour before, within
 *     half an hour, or later — and `"@skip": true` leaves the row out;
 *   - `@t` is the reader's language: the exact tag, then the same language,
 *     then US English;
 *   - what the database fills in is filled in: a copy through the row's link
 *     (always, or only when the row names none), a setting the column falls
 *     back to (a column of the app's own settings row, read as the bundle
 *     wrote it), each column's default ("now" is the adding moment), a running
 *     number the row leaves out, and null for the rest;
 *   - then, once every row is in, the totals are settled from the rows that
 *     feed them, as the loader does last: each copy that follows its row,
 *     each price by the night (the rate of the row it links to, and every
 *     rate rule that matches the night, each night rounded, then summed), each
 *     formula (a stay's nights, an extra's amount, a name joined from its
 *     parts), each total over child rows and the balance it leaves.
 *
 * Instants come out as ISO strings in UTC (`…Z`), dates as `YYYY-MM-DD` on the
 * house's clock, worked-out money as numbers. Formulas are worked out exactly
 * (fractions, not floats) and rounded once, half away from zero, to the
 * column's scale — a currency's own decimals for money.
 *
 * Nothing is stamped: Adminium's stamps skip a sample load, so a row carries
 * the times and names it spells — a stay's cancel-by moment too. A code the server draws at random (a share
 * link's token) is left empty here.
 *
 * Pure, and browser-safe: it imports nothing, and nothing that runs only in
 * Node — it ships in the demo bundle. The server's own resolver is in Adminium
 * (`apps/server/src/apps/sample-data.ts`); sampleRows.test.ts holds this one
 * to the same answers, and sample-drift.test.ts holds the written part below
 * to manifest.json.
 */

/** The parts of an `adminium.sample/1` bundle this resolver reads. */
export interface SampleBundleRows {
  format: string;
  app: string;
  tables: { ref: string; rows: Record<string, unknown>[] }[];
}

export type ResolvedRow = Record<string, unknown>;
export type ResolvedSample = Record<string, ResolvedRow[]>;

export interface ResolveOptions {
  /** The adding moment, in epoch milliseconds. */
  now: number;
  /** The house's IANA zone, e.g. "America/New_York". */
  zone: string;
  /** The reader's BCP 47 tag, e.g. "de-DE". */
  locale: string;
  /** The connection's currency, for a column that falls back to it. */
  currency?: string;
  /** The add-ons' settings a column falls back to, by `<addOn>.<setting>`. */
  settings?: Readonly<Record<string, unknown>>;
}

/** A column the database fills with the adding moment. */
export const NOW = Symbol("now");
/** A column every row must name: it has no default and may not be empty. */
export const REQUIRED = Symbol("required");
export type Fill = string | number | boolean | null | typeof NOW | typeof REQUIRED;

/** A decimal column's places: a number, or the row's currency's own. */
type Scale = number | "currency";

/** A formula as the manifest writes it (`rules.formula`). */
export type Formula =
  | number
  | string
  | { add: Formula[] }
  | { sub: [Formula, Formula] }
  | { mul: Formula[] }
  | { div: [Formula, Formula] }
  | { min: Formula[] }
  | { max: Formula[] }
  | { round: Formula | [Formula, number] }
  | { coalesce: [Formula, Formula] }
  | { if: [Condition, Formula, Formula] }
  | { daysBetween: [string, string] }
  | { join: string[] };

export type Condition =
  | { eq: [string, string | number | boolean] }
  | { neq: [string, string | number | boolean] }
  | { gt: [Formula, Formula] }
  | { gte: [Formula, Formula] }
  | { lt: [Formula, Formula] }
  | { lte: [Formula, Formula] }
  | { isNull: string }
  | { and: Condition[] }
  | { or: Condition[] };

export interface Rules {
  /** `column.copy`: the value of `from` on the row `via` links to (a `parent` row); `always`, or only when the row names none. */
  copies: { table: string; column: string; via: string; parent: string; from: string; always: boolean }[];
  /** `column.default.from`: a setting the column falls back to when the row and its copy leave it empty. */
  defaults: { table: string; column: string; from: string }[];
  /** `column.formula`, worked out over the row's own columns. */
  formulas: { table: string; column: string; scale: Scale; expr: Formula }[];
  /** `column.rollup`: the sum of `child.sum` over the rows linked by `via`, and the balance it leaves. */
  rollups: {
    table: string;
    column: string;
    child: string;
    via: string;
    /** The child column added up; absent, the child rows are counted. */
    sum: string | null;
    scale: Scale;
    where?: { column: string; eq: unknown };
    balance?: { column: string; of: string };
  }[];
  /** `column.sequence`: the next number when a row leaves it out (per `scope` row when scoped). */
  sequences: { table: string; column: string; scope: string | null }[];
  /** `column.format`: the text of a running number, with its prefix. */
  formats: { table: string; column: string; from: string; prefix: string | null; prefixSetting: string | null; pad: number }[];
  /** `column.code`: drawn at random by the server; left empty here. */
  codes: { table: string; column: string }[];
  /**
   * `column.perNight`: for each night from `from` up to the day before `to`,
   * the rate on the row `rateVia` links to, plus every adjustment row that
   * matches the night; each night rounded, and the column holds their sum.
   */
  perNights: PerNight[];
}

export interface PerNight {
  table: string;
  column: string;
  scale: Scale;
  from: string;
  to: string;
  rateVia: string;
  rateTable: string;
  rateColumn: string;
  adjust: {
    table: string;
    match: { via?: string; weekdays?: string; from?: string; to?: string };
    add: string;
    name: string;
    where?: { column: string; eq: unknown };
  } | null;
}

/*
 * Every column after `id`, in the manifest's order, with what the database
 * puts there when a row does not say, and the rules the loader settles rows
 * by (manifest.json `requiredSchema`). The manifest is too big to ship to the
 * browser for this, so `npm run sample` writes them here from it, between
 * the two marker lines.
 */
// ── written by `npm run sample` from manifest.json; do not edit by hand ──
export const COLUMNS: Record<string, Record<string, Fill>> = {
  settings: { venue_name: REQUIRED, address: REQUIRED, contact_email: REQUIRED, day_starts_at: "06:00", door_on: true, transfer_on: true, bank_account_name: null, bank_name: null, bank_account_number: null, bank_routing: null, transfer_days: 3, transfer_time: "18:00", transfer_cutoff_days: 3, release_after_hours: 24, hold_minutes: 10, offer_hours: 12, send_hours: 48, refund_days: 7, refund_payback_text: "within 5 working days", check_in_minutes: 30, remind_lead_hours: 1, tonight_email_on: true, default_age: "all", accounts_on: true, waitlist_on: true, send_on: true, codes_on: true, timetable_on: true, questions_on: true, getting_there: null, accessibility: null, policies: null, faq: null, number_start: 1001 },
  rooms: { name: REQUIRED, capacity: REQUIRED, kind: "room", note: null, access_text: null, position: 0 },
  events: { slug: REQUIRED, name: REQUIRED, short_name: null, support: null, kind: "gig", room_id: REQUIRED, doors_at: REQUIRED, starts_at: REQUIRED, curfew_at: REQUIRED, ends_at: null, age: "all", age_note: null, eve_email: false, remind_lead_hours: null, about: null, image: null, poster_style: null, on_sale_at: null, refund_until: null, refund_text: null, bags: null, re_entry: null, waitlist_on: false, sets_published: false, guest_places: 0, guest_list_closes_at: null, room_capacity: null, sell_limit: null, status: "draft", published_at: null, was_starts_at: null, postponed_at: null, cancelled_at: null, code_types: null, paid_in: null, collected: null, received: null, refunded: null, owed_door: null, owed_door_n: null, owed_transfer: null, owed_overdue: null },
  event_days: { event_id: REQUIRED, day: 1, doors_at: REQUIRED, last_entry_at: null, curfew_at: REQUIRED },
  acts: { event_id: REQUIRED, name: REQUIRED, room_id: null, day: 1, starts_at: null, ends_at: null, sets_published: false, position: 0 },
  ticket_types: { event_id: REQUIRED, name: REQUIRED, kind: "standard", description: null, price: 0, capacity: null, min_per_order: null, max_per_order: 8, visibility: "public", pay_door: true, pay_transfer: true, sales_start: null, sales_end: null, admits_day1: true, admits_day2: false, admits_day3: false, selling: true, position: 0 },
  codes: { code: REQUIRED, kind: "percent", value: null, event_id: null, room_id: null, type_kind: null, unlocks_type_id: null, max_uses: null, valid_until: null, active: true, note: null },
  customers: { email: null, name: null, opt_in: false, forgotten_at: null, created_at: null },
  questions: { event_id: REQUIRED, text: REQUIRED, kind: "text", options: null, per: "ticket", required: false, position: 0 },
  orders: { number_seq: null, number: null, status: "held", event_id: REQUIRED, room_id: null, customer_id: null, buyer_name: null, email: null, channel: "online", language: null, code_text: null, code_id: null, code_kind: null, code_value: null, code_type_kind: null, subtotal: null, discount: null, adjusted: null, total: null, ticket_count: null, collected: null, paid_in: null, refunded: null, balance: null, no_door: null, no_transfer: null, held_until: null, offer_until: null, pay_by: null, doors_at: null, eve_email: false, eve_at: null, ends_at: null, created_at: null, confirmed_at: null, paid_at: null, released_at: null, cancelled_at: null, cancel_cause: null, cancel_reason: null, cancel_email: null, paid_method: null, waitlist_id: null, answers: null, access_note: null, opt_in: false, kept_at: null, note: null, link_token: null, link_stopped: false, confirm_token: null, client_key: null },
  tickets: { order_id: REQUIRED, ticket_type_id: REQUIRED, event_id: null, status: "valid", order_status: null, order_cancel_cause: null, doors_at: null, eve_email: false, eve_at: null, holder_reminder: null, name: null, kind: null, price: null, pay_door: true, pay_transfer: true, no_door: null, no_transfer: null, admits_day1: true, admits_day2: false, admits_day3: false, position: 0, code_kind: null, code_value: null, code_type_kind: null, kind_match: null, discount: null, due: null, live_price: null, live_discount: null, live_one: null, collected: null, settled: null, sender_name: null, times_in: null, code: null, holder_name: null, holder_email: null, answers: null, pending_name: null, pending_email: null, offer_until: null, holder_customer_id: null, link_token: null, sent_at: null, accepted_at: null, lapsed: false, refund_asked_at: null, refund_declined_at: null, cancel_cause: null, cancelled_at: null },
  check_ins: { ticket_id: REQUIRED, event_day_id: REQUIRED, order_id: null, event_id: null, door_event_id: null, ticket_event_no: null, day_event_no: null, day: null, admits_day1: false, admits_day2: false, admits_day3: false, right_show: null, admitted: null, status: "in", scanned_at: null, scanned_by: null, device_id: null },
  door_collections: { ticket_id: REQUIRED, order_id: null, amount: null, method: "card", device_id: null, state: "taken", taken_at: null, taken_by: null, voided_at: null, voided_by: null },
  payments: { order_id: REQUIRED, amount: REQUIRED, method: "card", device_id: null, note: null, recorded_at: null, recorded_by: null, voided: false, voided_at: null, voided_by: null },
  refunds: { order_id: REQUIRED, amount: REQUIRED, kind: "cancelled_tickets", counts_off: 0, method: "bank_transfer", note: null, recorded_at: null, recorded_by: null, voided: false, voided_at: null, voided_by: null },
  guest_list: { event_id: REQUIRED, name: REQUIRED, plus: 0, people: null, on_behalf: null, note: null, arrived: 0, status: "not_in", in_at: null, in_by: null, added_by: null },
  waitlist: { event_id: REQUIRED, customer_id: null, email: REQUIRED, qty: 1, status: "waiting", order_id: null, joined_at: null, offered_at: null, offer_until: null },
  reminders: { event_id: REQUIRED, customer_id: null, email: REQUIRED, ticket_type_id: null, target: "sale", type_sales_start: null, on_sale_at: null, created_at: null, sent_at: null },
  broadcasts: { event_id: REQUIRED, audience: "everyone", ticket_type_id: null, template: "other", subject: REQUIRED, body: REQUIRED, status: "sent", people: null, order_count: null, sent_at: null, sent_by: null },
  messages: { kind: REQUIRED, status: "queued", to_address: null, language: null, order_id: null, ticket_id: null, customer_id: null, event_id: null, waitlist_id: null, reminder_id: null, refund_id: null, broadcast_id: null, due: null, created_at: null, sent_at: null, error: null, skip_reason: null, subject_override: null, body_override: null, approved_by: null, repeat_key: null },
  devices: { name: REQUIRED, active: true },
};

export const RULES: Rules = {
  copies: [
    { table: "events", column: "room_capacity", via: "room_id", parent: "rooms", from: "capacity", always: true },
    { table: "acts", column: "sets_published", via: "event_id", parent: "events", from: "sets_published", always: true },
    { table: "orders", column: "code_kind", via: "code_id", parent: "codes", from: "kind", always: true },
    { table: "orders", column: "code_value", via: "code_id", parent: "codes", from: "value", always: true },
    { table: "orders", column: "code_type_kind", via: "code_id", parent: "codes", from: "type_kind", always: true },
    { table: "orders", column: "doors_at", via: "event_id", parent: "events", from: "doors_at", always: true },
    { table: "orders", column: "eve_email", via: "event_id", parent: "events", from: "eve_email", always: true },
    { table: "orders", column: "ends_at", via: "event_id", parent: "events", from: "ends_at", always: true },
    { table: "tickets", column: "event_id", via: "ticket_type_id", parent: "ticket_types", from: "event_id", always: true },
    { table: "tickets", column: "order_status", via: "order_id", parent: "orders", from: "status", always: true },
    { table: "tickets", column: "order_cancel_cause", via: "order_id", parent: "orders", from: "cancel_cause", always: true },
    { table: "tickets", column: "doors_at", via: "event_id", parent: "events", from: "doors_at", always: true },
    { table: "tickets", column: "eve_email", via: "event_id", parent: "events", from: "eve_email", always: true },
    { table: "tickets", column: "name", via: "ticket_type_id", parent: "ticket_types", from: "name", always: true },
    { table: "tickets", column: "kind", via: "ticket_type_id", parent: "ticket_types", from: "kind", always: true },
    { table: "tickets", column: "price", via: "ticket_type_id", parent: "ticket_types", from: "price", always: true },
    { table: "tickets", column: "pay_door", via: "ticket_type_id", parent: "ticket_types", from: "pay_door", always: true },
    { table: "tickets", column: "pay_transfer", via: "ticket_type_id", parent: "ticket_types", from: "pay_transfer", always: true },
    { table: "tickets", column: "admits_day1", via: "ticket_type_id", parent: "ticket_types", from: "admits_day1", always: true },
    { table: "tickets", column: "admits_day2", via: "ticket_type_id", parent: "ticket_types", from: "admits_day2", always: true },
    { table: "tickets", column: "admits_day3", via: "ticket_type_id", parent: "ticket_types", from: "admits_day3", always: true },
    { table: "tickets", column: "code_kind", via: "order_id", parent: "orders", from: "code_kind", always: true },
    { table: "tickets", column: "code_value", via: "order_id", parent: "orders", from: "code_value", always: true },
    { table: "tickets", column: "code_type_kind", via: "order_id", parent: "orders", from: "code_type_kind", always: true },
    { table: "tickets", column: "sender_name", via: "order_id", parent: "orders", from: "buyer_name", always: true },
    { table: "check_ins", column: "order_id", via: "ticket_id", parent: "tickets", from: "order_id", always: true },
    { table: "check_ins", column: "event_id", via: "ticket_id", parent: "tickets", from: "event_id", always: true },
    { table: "check_ins", column: "door_event_id", via: "event_day_id", parent: "event_days", from: "event_id", always: true },
    { table: "check_ins", column: "ticket_event_no", via: "ticket_id", parent: "tickets", from: "event_id", always: true },
    { table: "check_ins", column: "day_event_no", via: "event_day_id", parent: "event_days", from: "event_id", always: true },
    { table: "check_ins", column: "day", via: "event_day_id", parent: "event_days", from: "day", always: true },
    { table: "check_ins", column: "admits_day1", via: "ticket_id", parent: "tickets", from: "admits_day1", always: true },
    { table: "check_ins", column: "admits_day2", via: "ticket_id", parent: "tickets", from: "admits_day2", always: true },
    { table: "check_ins", column: "admits_day3", via: "ticket_id", parent: "tickets", from: "admits_day3", always: true },
    { table: "door_collections", column: "order_id", via: "ticket_id", parent: "tickets", from: "order_id", always: true },
    { table: "door_collections", column: "amount", via: "ticket_id", parent: "tickets", from: "due", always: true },
    { table: "reminders", column: "type_sales_start", via: "ticket_type_id", parent: "ticket_types", from: "sales_start", always: true },
    { table: "reminders", column: "on_sale_at", via: "event_id", parent: "events", from: "on_sale_at", always: true },
  ],
  defaults: [
  ],
  formulas: [
    { table: "events", column: "sell_limit", scale: 2, expr: {"sub":["room_capacity","guest_places"]} },
    { table: "events", column: "received", scale: "currency", expr: {"add":[{"coalesce":["paid_in",0]},{"coalesce":["collected",0]}]} },
    { table: "orders", column: "total", scale: "currency", expr: {"if":[{"or":[{"eq":["status","held"]},{"eq":["status","confirming"]},{"eq":["status","offered"]},{"eq":["status","door"]},{"eq":["status","awaiting_transfer"]},{"eq":["status","overdue"]},{"eq":["status","no_charge"]},{"eq":["status","paid"]}]},{"sub":[{"sub":[{"coalesce":["subtotal",0]},{"coalesce":["discount",0]}]},{"coalesce":["adjusted",0]}]},{"if":[{"eq":["status","not_collected"]},{"sub":[{"sub":[{"coalesce":["subtotal",0]},{"coalesce":["discount",0]}]},{"coalesce":["adjusted",0]}]},0]}]} },
    { table: "orders", column: "balance", scale: "currency", expr: {"add":[{"sub":[{"sub":[{"coalesce":["total",0]},{"coalesce":["collected",0]}]},{"coalesce":["paid_in",0]}]},{"coalesce":["refunded",0]}]} },
    { table: "orders", column: "cancel_email", scale: 2, expr: {"if":[{"eq":["cancel_cause","show"]},{"if":[{"gt":[{"add":[{"coalesce":["paid_in",0]},{"coalesce":["collected",0]}]},0]},1,2]},0]} },
    { table: "tickets", column: "holder_reminder", scale: 2, expr: {"if":[{"isNull":"holder_customer_id"},0,{"if":[{"eq":["eve_email",true]},2,1]}]} },
    { table: "tickets", column: "no_door", scale: 2, expr: {"if":[{"eq":["pay_door",false]},1,0]} },
    { table: "tickets", column: "no_transfer", scale: 2, expr: {"if":[{"eq":["pay_transfer",false]},1,0]} },
    { table: "tickets", column: "kind_match", scale: 2, expr: {"if":[{"isNull":"code_type_kind"},1,{"if":[{"or":[{"and":[{"eq":["kind","standard"]},{"eq":["code_type_kind","standard"]}]},{"and":[{"eq":["kind","early"]},{"eq":["code_type_kind","early"]}]},{"and":[{"eq":["kind","balcony"]},{"eq":["code_type_kind","balcony"]}]},{"and":[{"eq":["kind","pass"]},{"eq":["code_type_kind","pass"]}]},{"and":[{"eq":["kind","day"]},{"eq":["code_type_kind","day"]}]},{"and":[{"eq":["kind","place"]},{"eq":["code_type_kind","place"]}]},{"and":[{"eq":["kind","presale"]},{"eq":["code_type_kind","presale"]}]}]},1,0]}]} },
    { table: "tickets", column: "discount", scale: "currency", expr: {"if":[{"and":[{"eq":["code_kind","percent"]},{"eq":["kind_match",1]}]},{"round":{"div":[{"mul":["price",{"coalesce":["code_value",0]}]},100]}},{"if":[{"and":[{"eq":["code_kind","amount"]},{"eq":["kind_match",1]}]},{"min":["price",{"coalesce":["code_value",0]}]},0]}]} },
    { table: "tickets", column: "due", scale: "currency", expr: {"sub":[{"coalesce":["price",0]},{"coalesce":["discount",0]}]} },
    { table: "tickets", column: "live_price", scale: "currency", expr: {"if":[{"or":[{"eq":["status","valid"]},{"eq":["status","offered"]},{"eq":["status","refund_asked"]}]},{"coalesce":["price",0]},0]} },
    { table: "tickets", column: "live_discount", scale: "currency", expr: {"if":[{"or":[{"eq":["status","valid"]},{"eq":["status","offered"]},{"eq":["status","refund_asked"]}]},{"coalesce":["discount",0]},0]} },
    { table: "tickets", column: "live_one", scale: 2, expr: {"if":[{"or":[{"eq":["status","valid"]},{"eq":["status","offered"]},{"eq":["status","refund_asked"]}]},1,0]} },
    { table: "tickets", column: "settled", scale: 2, expr: {"if":[{"or":[{"eq":["order_status","paid"]},{"eq":["order_status","no_charge"]},{"and":[{"eq":["order_status","door"]},{"gte":[{"coalesce":["collected",0]},{"coalesce":["due",0]}]}]}]},1,0]} },
    { table: "check_ins", column: "right_show", scale: 2, expr: {"if":[{"and":[{"gte":["ticket_event_no","day_event_no"]},{"lte":["ticket_event_no","day_event_no"]}]},1,0]} },
    { table: "check_ins", column: "admitted", scale: 2, expr: {"if":[{"or":[{"and":[{"eq":["day",1]},{"eq":["admits_day1",true]}]},{"and":[{"eq":["day",2]},{"eq":["admits_day2",true]}]},{"and":[{"eq":["day",3]},{"eq":["admits_day3",true]}]}]},1,0]} },
    { table: "refunds", column: "counts_off", scale: 2, expr: {"if":[{"and":[{"eq":["kind","goodwill"]},{"eq":["voided",false]}]},1,0]} },
    { table: "guest_list", column: "people", scale: 2, expr: {"add":[1,{"coalesce":["plus",0]}]} },
  ],
  rollups: [
    { table: "events", column: "code_types", child: "ticket_types", via: "event_id", sum: null, scale: 2, where: {"column":"visibility","eq":"code"} },
    { table: "events", column: "paid_in", child: "orders", via: "event_id", sum: "paid_in", scale: "currency" },
    { table: "events", column: "collected", child: "orders", via: "event_id", sum: "collected", scale: "currency" },
    { table: "events", column: "refunded", child: "orders", via: "event_id", sum: "refunded", scale: "currency" },
    { table: "events", column: "owed_door", child: "orders", via: "event_id", sum: "balance", scale: "currency", where: {"column":"status","eq":"door"} },
    { table: "events", column: "owed_door_n", child: "orders", via: "event_id", sum: null, scale: 2, where: {"column":"status","eq":"door"} },
    { table: "events", column: "owed_transfer", child: "orders", via: "event_id", sum: "balance", scale: "currency", where: {"column":"status","eq":"awaiting_transfer"} },
    { table: "events", column: "owed_overdue", child: "orders", via: "event_id", sum: "balance", scale: "currency", where: {"column":"status","eq":"overdue"} },
    { table: "orders", column: "subtotal", child: "tickets", via: "order_id", sum: "live_price", scale: "currency" },
    { table: "orders", column: "discount", child: "tickets", via: "order_id", sum: "live_discount", scale: "currency" },
    { table: "orders", column: "adjusted", child: "refunds", via: "order_id", sum: "amount", scale: "currency", where: {"column":"counts_off","eq":1} },
    { table: "orders", column: "ticket_count", child: "tickets", via: "order_id", sum: "live_one", scale: 2 },
    { table: "orders", column: "collected", child: "tickets", via: "order_id", sum: "collected", scale: "currency" },
    { table: "orders", column: "paid_in", child: "payments", via: "order_id", sum: "amount", scale: "currency", where: {"column":"voided","eq":false} },
    { table: "orders", column: "refunded", child: "refunds", via: "order_id", sum: "amount", scale: "currency", where: {"column":"voided","eq":false} },
    { table: "orders", column: "no_door", child: "tickets", via: "order_id", sum: "no_door", scale: 2 },
    { table: "orders", column: "no_transfer", child: "tickets", via: "order_id", sum: "no_transfer", scale: 2 },
    { table: "tickets", column: "collected", child: "door_collections", via: "ticket_id", sum: "amount", scale: "currency", where: {"column":"state","eq":"taken"} },
    { table: "tickets", column: "times_in", child: "check_ins", via: "ticket_id", sum: null, scale: 2 },
  ],
  sequences: [
    { table: "orders", column: "number_seq", scope: null },
  ],
  formats: [
    { table: "orders", column: "number", from: "number_seq", prefix: "WV-", prefixSetting: null, pad: 0 },
  ],
  codes: [
    { table: "orders", column: "link_token" },
    { table: "orders", column: "confirm_token" },
    { table: "tickets", column: "code" },
    { table: "tickets", column: "link_token" },
  ],
  perNights: [
  ],
};
// ── end of the written part ──

// ── the clock ───────────────────────────────────────────────────────────────

interface Ymd {
  y: number;
  m: number;
  d: number;
}

/** How far `zone` is ahead of UTC at `instant`, in ms. */
function zoneOffsetMs(zone: string, instant: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const local = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((local - instant) / 60_000) * 60_000;
}

/** The instant of a wall-clock time in `zone`; across a clock change a second pass settles it. */
function zonedWallTime(date: Ymd, time: string, zone: string): number {
  const [hh, mm] = time.split(":").map(Number) as [number, number];
  const guess = Date.UTC(date.y, date.m - 1, date.d, hh, mm);
  const offset = zoneOffsetMs(zone, guess);
  const again = zoneOffsetMs(zone, guess - offset);
  return again === offset ? guess - offset : guess - again;
}

/** Today's date in `zone`, moved by `days`. */
function zonedDay(now: number, zone: string, days: number): Ymd {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(now));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const shifted = new Date(Date.UTC(get("year"), get("month") - 1, get("day") + days));
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth() + 1, d: shifted.getUTCDate() };
}

/** `n` working days from today in `zone`; day 0 on a weekend is the Monday after. */
function zonedWorkday(now: number, zone: string, n: number): Ymd {
  const today = zonedDay(now, zone, 0);
  const at = new Date(Date.UTC(today.y, today.m - 1, today.d));
  const weekend = (date: Date) => date.getUTCDay() === 0 || date.getUTCDay() === 6;
  while (weekend(at)) at.setUTCDate(at.getUTCDate() + 1);
  for (let left = Math.abs(n); left > 0; ) {
    at.setUTCDate(at.getUTCDate() + Math.sign(n));
    if (!weekend(at)) left -= 1;
  }
  return { y: at.getUTCFullYear(), m: at.getUTCMonth() + 1, d: at.getUTCDate() };
}

/**
 * Day `dom` of the month `months` from this one in `zone`: the month's last
 * day when it has fewer, and today when that day has not come yet.
 */
export function zonedMonthDay(now: number, zone: string, months: number, dom: number): Ymd & { today: boolean } {
  const today = zonedDay(now, zone, 0);
  const first = new Date(Date.UTC(today.y, today.m - 1 + months, 1));
  const y = first.getUTCFullYear();
  const m = first.getUTCMonth() + 1;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const day = { y, m, d: Math.min(dom, last) };
  const later = day.y * 10_000 + day.m * 100 + day.d >= today.y * 10_000 + today.m * 100 + today.d;
  return later ? { ...today, today: true } : { ...day, today: false };
}

/**
 * The first time at or after `instant` on a `grid`-minute step of the
 * kitchen's own clock, counted from its midnight: 12:07 on a 15-minute grid
 * is 12:15, and 12:15 stays 12:15. Never past the next midnight.
 */
export function onVenueGrid(instant: number, grid: number, zone: string): number {
  const local = instant + zoneOffsetMs(zone, instant);
  const midnight = Math.floor(local / 86_400_000) * 86_400_000;
  const step = grid * 60_000;
  const rounded = new Date(midnight + Math.min(Math.ceil((local - midnight) / step) * step, 86_400_000));
  const time = `${pad2(rounded.getUTCHours())}:${pad2(rounded.getUTCMinutes())}`;
  return zonedWallTime({ y: rounded.getUTCFullYear(), m: rounded.getUTCMonth() + 1, d: rounded.getUTCDate() }, time, zone);
}

/** `P[nW][nD][T[nH][nM][nS]]` in ms. */
function durationMs(duration: string): number {
  const match = /^P(?!$)(\d+W)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/.exec(duration);
  if (match === null) throw new Error(`"${duration}" is not an ISO-8601 duration`);
  const n = (part: string | undefined) => (part === undefined ? 0 : Number.parseFloat(part));
  return ((((n(match[1]) * 7 + n(match[2])) * 24 + n(match[4])) * 60 + n(match[5])) * 60 + n(match[6])) * 1000;
}

/** Half an hour either side of the adding moment is "around" it. */
const AROUND_MS = 30 * 60_000;

const pad2 = (n: number) => String(n).padStart(2, "0");
const spellDay = (day: Ymd) => `${String(day.y).padStart(4, "0")}-${pad2(day.m)}-${pad2(day.d)}`;

/** The text for the reader's language: theirs, their language, US English, any. */
export function pickText(texts: Readonly<Record<string, string>>, locale: string): string {
  const tag = locale.replace("_", "-");
  if (texts[tag] !== undefined) return texts[tag]!;
  const language = tag.split("-")[0];
  const near = Object.entries(texts).find(([key]) => key.split("-")[0] === language);
  if (near !== undefined) return near[1];
  return texts["en-US"] ?? Object.values(texts)[0] ?? "";
}

// ── exact arithmetic ────────────────────────────────────────────────────────

/** A fraction of two big integers; `d` is always positive. */
interface Ratio {
  n: bigint;
  d: bigint;
}

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) [x, y] = [y, x % y];
  return x === 0n ? 1n : x;
}

function ratio(n: bigint, d: bigint): Ratio {
  if (d < 0n) return ratio(-n, -d);
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

/** A stored value as an exact fraction, from its decimal text (never a float product); null when empty. */
function toRatio(value: unknown): Ratio | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return { n: value ? 1n : 0n, d: 1n };
  const text = typeof value === "number" ? (Number.isFinite(value) ? String(value) : "") : typeof value === "string" ? value.trim() : "";
  const match = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(text);
  if (match === null) return null;
  const [, sign = "", whole = "", fraction = "", exponent = "0"] = match;
  if (whole === "" && fraction === "") return null;
  let n = BigInt(`${whole}${fraction}` || "0");
  let d = 10n ** BigInt(fraction.length);
  const e = Number.parseInt(exponent, 10);
  if (e > 0) n *= 10n ** BigInt(e);
  else if (e < 0) d *= 10n ** BigInt(-e);
  return ratio(sign === "-" ? -n : n, d);
}

const add = (a: Ratio, b: Ratio) => ratio(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a: Ratio, b: Ratio) => ratio(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a: Ratio, b: Ratio) => ratio(a.n * b.n, a.d * b.d);
const cmp = (a: Ratio, b: Ratio) => Math.sign(Number(a.n * b.d - b.n * a.d));

/** Round half away from zero to `scale` places. */
function roundTo(value: Ratio, scale: number): Ratio {
  const factor = 10n ** BigInt(scale);
  const scaled = value.n * factor;
  const negative = scaled < 0n;
  const magnitude = negative ? -scaled : scaled;
  let q = magnitude / value.d;
  if ((magnitude % value.d) * 2n >= value.d) q += 1n;
  return ratio(negative ? -q : q, factor);
}

/** A fraction as a number, rounded to `scale` places first. */
function toNumber(value: Ratio, scale: number): number {
  const rounded = roundTo(value, scale);
  const factor = 10n ** BigInt(scale);
  const units = (rounded.n * factor) / rounded.d;
  return Number(units) / Number(factor);
}

/** The decimals a currency is written with: JPY 0, most 2, KWD 3. Unknown → 2. */
export function currencyScale(code: unknown): number {
  if (typeof code !== "string" || !/^[A-Za-z]{3}$/.test(code)) return 2;
  const upper = code.toUpperCase();
  if (["BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW", "PYG", "RWF", "UGX", "UYI", "VND", "VUV", "XAF", "XOF", "XPF"].includes(upper)) return 0;
  if (["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"].includes(upper)) return 3;
  return 2;
}

function sameValue(stored: unknown, literal: string | number | boolean): boolean {
  if (stored === null || stored === undefined) return false;
  if (typeof literal === "boolean") return stored === literal || stored === (literal ? 1 : 0) || stored === (literal ? "1" : "0") || stored === String(literal);
  if (typeof literal === "number") {
    const a = toRatio(stored);
    const b = toRatio(literal);
    return a !== null && b !== null && cmp(a, b) === 0;
  }
  return String(stored) === literal;
}

function holds(condition: Condition, row: Readonly<Record<string, unknown>>, scale: number): boolean {
  const [op, args] = Object.entries(condition)[0] as [string, unknown];
  switch (op) {
    case "eq": {
      const [column, value] = args as [string, string | number | boolean];
      return sameValue(row[column], value);
    }
    case "neq": {
      const [column, value] = args as [string, string | number | boolean];
      return row[column] !== null && row[column] !== undefined && !sameValue(row[column], value);
    }
    case "isNull": {
      const stored = row[args as string];
      return stored === null || stored === undefined || stored === "";
    }
    case "and":
      return (args as Condition[]).every((c) => holds(c, row, scale));
    case "or":
      return (args as Condition[]).some((c) => holds(c, row, scale));
    default: {
      const [left, right] = (args as [Formula, Formula]).map((side) => evaluate(side, row, scale));
      if (left === null || left === undefined || right === null || right === undefined) return false;
      const order = cmp(left, right);
      return op === "gt" ? order > 0 : op === "gte" ? order >= 0 : op === "lt" ? order < 0 : order <= 0;
    }
  }
}

/** A formula over the row, exactly; null when an input it needs is empty or a divisor is zero. */
function evaluate(expr: Formula, row: Readonly<Record<string, unknown>>, scale: number): Ratio | null {
  if (typeof expr === "number") return toRatio(expr);
  if (typeof expr === "string") return toRatio(row[expr]);
  const [op, args] = Object.entries(expr)[0] as [string, unknown];
  const all = (list: Formula[]): Ratio[] | null => {
    const out: Ratio[] = [];
    for (const item of list) {
      const v = evaluate(item, row, scale);
      if (v === null) return null;
      out.push(v);
    }
    return out;
  };
  switch (op) {
    case "add":
    case "mul":
    case "min":
    case "max": {
      const values = all(args as Formula[]);
      if (values === null) return null;
      return values.reduce((a, b) =>
        op === "add" ? add(a, b) : op === "mul" ? mul(a, b) : op === "min" ? (cmp(a, b) <= 0 ? a : b) : cmp(a, b) >= 0 ? a : b,
      );
    }
    case "sub": {
      const values = all(args as Formula[]);
      return values === null ? null : sub(values[0]!, values[1]!);
    }
    case "div": {
      const values = all(args as Formula[]);
      if (values === null || values[1]!.n === 0n) return null;
      return ratio(values[0]!.n * values[1]!.d, values[0]!.d * values[1]!.n);
    }
    case "round": {
      const [inner, places] = Array.isArray(args) ? (args as [Formula, number]) : [args as Formula, scale];
      const v = evaluate(inner, row, scale);
      return v === null ? null : roundTo(v, places);
    }
    case "coalesce": {
      const [first, second] = args as [Formula, Formula];
      return evaluate(first, row, scale) ?? evaluate(second, row, scale);
    }
    case "if": {
      const [condition, then, otherwise] = args as [Condition, Formula, Formula];
      return evaluate(holds(condition, row, scale) ? then : otherwise, row, scale);
    }
    case "daysBetween": {
      const [start, end] = (args as [string, string]).map((column) => dayNumber(row[column]));
      if (start === null || end === null || end < start) return null;
      return { n: BigInt(end - start), d: 1n };
    }
    default:
      return null;
  }
}

/** A date's day count since 1970, read from its `YYYY-MM-DD` text; null when it is none. */
function dayNumber(value: unknown): number | null {
  const match = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  if (match === null) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000;
}

/** A formula's value for the row at `scale` places, as a number; null when it has none. */
export function workOut(expr: Formula, row: Readonly<Record<string, unknown>>, scale: number): number | string | null {
  if (typeof expr === "object" && expr !== null && "join" in expr) {
    // Columns of the row and text, empty parts left out, and nothing left at either end.
    const parts = expr.join.map((part) => (/^[a-z][a-z0-9_]*$/.test(part) ? row[part] : part));
    const text = parts
      .map((part) => (part === null || part === undefined ? "" : String(part)))
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    return text === "" ? null : text;
  }
  const value = evaluate(expr, row, scale);
  return value === null ? null : toNumber(value, scale);
}

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** One night of a price by the night: its date, its rate, the base it started from, and what it was tagged with. */
export interface PricedNight {
  date: string;
  rate: number;
  base: number;
  tags: string[];
}

/**
 * The nights of a row's price by the night, each priced: the rate of the row
 * `rateVia` links to, plus every active adjustment that matches the night (the
 * same room type or none, the night's weekday listed or no list, inside its
 * first and last night where it names them), rounded once a night.
 */
export function pricedNights(rule: PerNight, row: Readonly<Record<string, unknown>>, out: Readonly<ResolvedSample>, places: number): PricedNight[] | null {
  const start = dayNumber(row[rule.from]);
  const end = dayNumber(row[rule.to]);
  const rateRow = out[rule.rateTable]?.find((candidate) => candidate["id"] === row[rule.rateVia]);
  const base = toRatio(rateRow?.[rule.rateColumn]);
  if (start === null || end === null || end <= start || base === null) return null;
  const adjustments = (rule.adjust === null ? [] : (out[rule.adjust.table] ?? [])).filter((candidate) => {
    const adjust = rule.adjust!;
    return adjust.where === undefined || sameValue(candidate[adjust.where.column], adjust.where.eq as string | number | boolean);
  });
  const nights: PricedNight[] = [];
  for (let day = start; day < end; day += 1) {
    const date = new Date(day * 86_400_000).toISOString().slice(0, 10);
    const weekday = WEEKDAYS[new Date(day * 86_400_000).getUTCDay()]!;
    let rate = base;
    const tags: string[] = [];
    for (const candidate of adjustments) {
      const { match, add: addColumn, name } = rule.adjust!;
      if (match.via !== undefined && candidate[match.via] !== null && candidate[match.via] !== undefined && candidate[match.via] !== row[rule.rateVia]) continue;
      const listed = match.weekdays === undefined ? null : candidate[match.weekdays];
      if (typeof listed === "string" && listed.trim() !== "" && !listed.toLowerCase().split(",").map((w) => w.trim()).includes(weekday)) continue;
      const first = match.from === undefined ? null : dayNumber(candidate[match.from]);
      const last = match.to === undefined ? null : dayNumber(candidate[match.to]);
      if ((first !== null && day < first) || (last !== null && day > last)) continue;
      const amount = toRatio(candidate[addColumn]);
      if (amount === null) continue;
      rate = add(rate, amount);
      if (typeof candidate[name] === "string") tags.push(candidate[name]);
    }
    nights.push({ date, rate: toNumber(roundTo(rate, places), places), base: toNumber(base, places), tags });
  }
  return nights;
}

/** A column's places for this row: its own, or its currency's (the row's, else the connection's). */
function placesOf(scale: Scale, row: Readonly<Record<string, unknown>>, currency: string | undefined): number {
  return scale === "currency" ? currencyScale(row["currency"] ?? currency) : scale;
}

// ── one value, one row ──────────────────────────────────────────────────────

/** An instant, kept as a Date until the row is spelled out, so `@byClock` can compare it. */
type Resolved = unknown;

interface Context extends ResolveOptions {
  labels: Map<string, number>;
}

function resolveValue(value: unknown, ctx: Context): Resolved {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  if (typeof record["@ref"] === "string") {
    const id = ctx.labels.get(record["@ref"]);
    if (id === undefined) throw new Error(`The sample row "${record["@ref"]}" was not written.`);
    return id;
  }
  if (typeof record["@ago"] === "string") return new Date(ctx.now - durationMs(record["@ago"]));
  if (typeof record["@in"] === "string") {
    const at = ctx.now + durationMs(record["@in"]);
    return typeof record["@grid"] === "number" ? new Date(onVenueGrid(at, record["@grid"], ctx.zone)) : new Date(at);
  }
  if (typeof record["@day"] === "number") {
    const day = record["@workdays"] === true ? zonedWorkday(ctx.now, ctx.zone, record["@day"]) : zonedDay(ctx.now, ctx.zone, record["@day"]);
    if (typeof record["@time"] === "string") return new Date(zonedWallTime(day, record["@time"], ctx.zone));
    return spellDay(day);
  }
  if (typeof record["@month"] === "number" && typeof record["@dom"] === "number") {
    const day = zonedMonthDay(ctx.now, ctx.zone, record["@month"], record["@dom"]);
    if (typeof record["@time"] !== "string") return spellDay(day);
    const at = zonedWallTime(day, record["@time"], ctx.zone);
    // A time on today that has not come yet is now: a month's history never runs into the future.
    return new Date(day.today && at > ctx.now ? ctx.now : at);
  }
  if (typeof record["@t"] === "object" && record["@t"] !== null) return pickText(record["@t"] as Record<string, string>, ctx.locale);
  if (typeof record["@asset"] === "string") throw new Error(`The sample asset "${record["@asset"]}" cannot be shown without a server.`);
  return value;
}

/** One row with its directives resolved, or null when its `@byClock` set leaves it out. */
function resolveRow(row: Readonly<Record<string, unknown>>, ctx: Context): Record<string, Resolved> | null {
  let values: Readonly<Record<string, unknown>> = row;
  const clock = row["@byClock"] as { at: unknown; before?: Record<string, unknown>; around?: Record<string, unknown>; after?: Record<string, unknown> } | undefined;
  if (clock !== undefined) {
    const when = resolveValue(typeof clock.at === "string" ? row[clock.at] : clock.at, ctx);
    const instant = when instanceof Date ? when.getTime() : Number.NaN;
    const branch = Number.isNaN(instant)
      ? undefined
      : instant < ctx.now - AROUND_MS
        ? clock.before
        : instant <= ctx.now + AROUND_MS
          ? clock.around
          : clock.after;
    if (branch?.["@skip"] === true) return null;
    const { ["@skip"]: _skip, ...columns } = branch ?? {};
    values = { ...row, ...columns };
  }
  const out: Record<string, Resolved> = {};
  for (const [column, value] of Object.entries(values)) {
    if (column === "@label" || column === "@byClock" || column === "@onlyIfEmpty") continue;
    out[column] = resolveValue(value, ctx);
  }
  return out;
}

const spell = (value: Resolved): unknown => (value instanceof Date ? value.toISOString() : value);

/**
 * A setting a column falls back to: the connection's currency, a column of
 * the app's own settings row (`app:<table>.<column>`, as resolved so far), or
 * an add-on's setting.
 */
function settingValue(name: string, options: ResolveOptions, out?: ResolvedSample): unknown {
  if (name === "connection.currency") return options.currency;
  const own = /^app:([a-z_]+)\.([a-z_]+)$/.exec(name);
  if (own !== null) return out?.[own[1]!]?.[0]?.[own[2]!] ?? undefined;
  return options.settings?.[name];
}

// ── the whole bundle ────────────────────────────────────────────────────────

/** Every table of the bundle, as Adminium would have written it at `now`. */
export function resolveSample(bundle: SampleBundleRows, options: ResolveOptions): ResolvedSample {
  const ctx: Context = { ...options, labels: new Map() };
  const out: ResolvedSample = {};
  const rowById = (table: string, id: unknown) => out[table]?.find((candidate) => candidate["id"] === id);
  for (const table of bundle.tables) {
    const shape = COLUMNS[table.ref];
    if (shape === undefined) throw new Error(`"${table.ref}" is not a table of this app.`);
    const rows = (out[table.ref] ??= []);
    for (const row of table.rows) {
      const values = resolveRow(row, ctx);
      if (values === null) continue;
      for (const column of Object.keys(values)) {
        if (!(column in shape)) throw new Error(`"${table.ref}" has no column "${column}".`);
      }
      // A copy through the row's link, from a row written earlier: always, or when the row names none.
      for (const copy of RULES.copies) {
        if (copy.table !== table.ref || (!copy.always && values[copy.column] !== undefined)) continue;
        const link = values[copy.via];
        if (link === null || link === undefined) continue;
        const source = rowById(copy.parent, link);
        if (source !== undefined) values[copy.column] = source[copy.from];
      }
      // A setting the column falls back to when it is still empty.
      for (const fallback of RULES.defaults) {
        if (fallback.table !== table.ref || (values[fallback.column] !== undefined && values[fallback.column] !== null)) continue;
        const setting = settingValue(fallback.from, options, out);
        if (setting !== undefined) values[fallback.column] = setting;
      }
      // A running number the row leaves out: the largest so far (in its scope) + 1.
      for (const sequence of RULES.sequences) {
        if (sequence.table !== table.ref || values[sequence.column] !== undefined) continue;
        const peers = rows.filter((peer) => sequence.scope === null || peer[sequence.scope] === values[sequence.scope]);
        values[sequence.column] = Math.max(0, ...peers.map((peer) => Number(peer[sequence.column] ?? 0))) + 1;
      }
      for (const format of RULES.formats) {
        if (format.table !== table.ref || values[format.column] !== undefined) continue;
        const number = values[format.from];
        const prefix = format.prefix ?? (format.prefixSetting === null ? undefined : settingValue(format.prefixSetting, options));
        if (typeof number === "number" && typeof prefix === "string") values[format.column] = `${prefix}${String(number).padStart(format.pad, "0")}`;
      }
      const id = rows.length + 1;
      const record: ResolvedRow = { id };
      for (const [column, fill] of Object.entries(shape)) {
        const value = values[column];
        if (value !== undefined) record[column] = spell(value);
        else if (fill === REQUIRED) throw new Error(`A sample row for "${table.ref}" has no "${column}".`);
        else record[column] = fill === NOW ? new Date(options.now).toISOString() : fill;
      }
      rows.push(record);
      const label = row["@label"];
      if (typeof label === "string") ctx.labels.set(label, id);
    }
  }
  settle(out, options);
  return out;
}

/**
 * Every total, from every row that feeds it — last, as the loader does. A
 * document's tax reads its subtotal, a stage line's rate reads its proposal's
 * total, so the rules run again until nothing moves (a handful of passes).
 */
export function settle(out: ResolvedSample, options: Pick<ResolveOptions, "currency">): void {
  const order = [...Object.keys(COLUMNS)];
  /** Each table's rows by id: a copy finds its source without scanning. */
  const ids = new Map<string, Map<unknown, ResolvedRow>>();
  const byId = (table: string) => {
    let found = ids.get(table);
    if (found === undefined) {
      found = new Map((out[table] ?? []).map((row) => [row["id"], row]));
      ids.set(table, found);
    }
    return found;
  };
  for (let pass = 0; pass < 12; pass += 1) {
    let moved = false;
    const put = (row: ResolvedRow, column: string, value: unknown) => {
      if (row[column] === value) return;
      row[column] = value;
      moved = true;
    };
    for (const table of order) {
      const rows = out[table] ?? [];
      for (const row of rows) {
        for (const copy of RULES.copies) {
          if (copy.table !== table || !copy.always || row[copy.via] === null || row[copy.via] === undefined) continue;
          const source = byId(copy.parent).get(row[copy.via]);
          if (source !== undefined) put(row, copy.column, source[copy.from]);
        }
        for (const rule of RULES.perNights) {
          if (rule.table !== table) continue;
          const places = placesOf(rule.scale, row, options.currency);
          const nights = pricedNights(rule, row, out, places);
          put(row, rule.column, nights === null ? null : nights.reduce((sum, night) => toNumber(add(toRatio(sum)!, toRatio(night.rate)!), places), 0));
        }
        for (const formula of formulaOrder(table)) {
          put(row, formula.column, workOut(formula.expr, row, placesOf(formula.scale, row, options.currency)));
        }
      }
      for (const rollup of RULES.rollups) {
        if (rollup.table !== table) continue;
        // The child rows by the parent they link to, once a pass: a total reads only its own.
        const byParent = new Map<unknown, ResolvedRow[]>();
        for (const child of out[rollup.child] ?? []) {
          const list = byParent.get(child[rollup.via]);
          if (list === undefined) byParent.set(child[rollup.via], [child]);
          else list.push(child);
        }
        for (const row of rows) {
          let total: Ratio = { n: 0n, d: 1n };
          for (const child of byParent.get(row["id"]) ?? []) {
            if (rollup.where !== undefined && !sameValue(child[rollup.where.column], rollup.where.eq as string | number | boolean)) continue;
            const amount = rollup.sum === null ? { n: 1n, d: 1n } : toRatio(child[rollup.sum]);
            if (amount !== null) total = add(total, amount);
          }
          const places = placesOf(rollup.scale, row, options.currency);
          put(row, rollup.column, toNumber(total, places));
          if (rollup.balance !== undefined) {
            const of = toRatio(row[rollup.balance.of]);
            put(row, rollup.balance.column, of === null ? null : toNumber(sub(of, total), places));
          }
        }
      }
    }
    if (!moved) return;
  }
  throw new Error("The sample's totals did not settle.");
}

/** A table's formulas in the order they can be worked out: each after every formula column it reads. */
function formulaOrder(table: string): Rules["formulas"] {
  const own = RULES.formulas.filter((formula) => formula.table === table);
  const byColumn = new Map(own.map((formula) => [formula.column, formula]));
  const done: Rules["formulas"] = [];
  const reads = (node: unknown, found: Set<string>): Set<string> => {
    if (typeof node === "string") found.add(node);
    else if (Array.isArray(node)) node.forEach((child) => reads(child, found));
    else if (typeof node === "object" && node !== null) Object.values(node).forEach((child) => reads(child, found));
    return found;
  };
  const visit = (formula: Rules["formulas"][number]) => {
    if (done.includes(formula)) return;
    for (const name of reads(formula.expr, new Set())) {
      const before = byColumn.get(name);
      if (before !== undefined && before !== formula) visit(before);
    }
    done.push(formula);
  };
  own.forEach(visit);
  return done;
}
