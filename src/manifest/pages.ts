/**
 * The Event ticketing section in the dashboard: its pages, their forms and
 * the groups they sit in.
 *
 * The Overview first, with no heading of its own; then the records — the
 * shows and what hangs on them, the orders with their tickets, the money,
 * the lists — and the venue itself (Manage): the settings, the rooms, the
 * acts, the checkout questions and the doors. The box office and the door
 * have their own screens on the app's staff side; the sidebar links to them.
 *
 * A value Adminium works out — a total, a number, a stamp, a code — shows in
 * a form and cannot be typed over. Pages of a feature the venue switched off
 * stay: they are records, not ways in.
 */
import { l, titles } from "./labels.ts";
import { OVERVIEW_LAYOUT } from "./overview.ts";

export const NAV_GROUPS = [
  { key: "records", label: l("Records"), order: 1 },
  { key: "manage", label: l("Manage"), order: 2 },
];

type Field = Record<string, unknown>;
const f = (column: string, more: Field = {}): Field => ({ column, ...more });
const title = (column: string): Field => ({ column, control: "title", span: 2 });
const wide = (column: string, control = "textarea"): Field => ({ column, control, span: 2 });
const toggle = (column: string): Field => ({ column, control: "toggle-row" });
const money = (column: string): Field => ({ column, control: "currency" });
const when = (column: string): Field => ({ column, control: "datetime" });
const ref = (column: string): Field => ({ column, control: "reference" });
const rows = (relation: string, columns: Field[]): Field => ({ relation, control: "child-rows", span: 2, columns });
const form = (...sections: Field[][]) => ({
  form: { v: 2, sections: sections.map((fields, i) => ({ id: `s${String(i + 1)}`, fields })) },
});

interface PageSpec {
  ref: string;
  template: string;
  title: string;
  group: string;
  icon: string;
  order: number;
  table?: string;
  config: Record<string, unknown>;
}

const voidRow = [toggle("voided"), when("voided_at"), f("voided_by")];

const SPECS: PageSpec[] = [
  {
    ref: "events-overview",
    template: "page-dashboard",
    title: "Overview",
    group: "overview",
    icon: "layout-dashboard",
    order: 0,
    config: { layout: OVERVIEW_LAYOUT },
  },

  // ── the records ─────────────────────────────────────────────────────────────
  {
    ref: "events-shows",
    template: "page-crud",
    title: "Shows",
    group: "records",
    icon: "calendar-days",
    order: 1,
    table: "events",
    config: form(
      [title("name"), f("short_name"), f("slug"), f("support"), f("kind", { control: "select" }), ref("room_id"), f("status", { control: "segmented" })],
      [when("doors_at"), when("starts_at"), when("curfew_at"), when("ends_at"), when("on_sale_at"), when("guest_list_closes_at")],
      [
        rows("event_days", [
          { column: "day", width: "70px" },
          { column: "doors_at", control: "datetime", width: "1fr" },
          { column: "last_entry_at", control: "datetime", width: "1fr" },
          { column: "curfew_at", control: "datetime", width: "1fr" },
        ]),
      ],
      [f("age", { control: "select" }), f("age_note"), wide("about"), f("image"), f("poster_style"), wide("bags", "text"), wide("re_entry", "text")],
      [when("refund_until"), wide("refund_text", "text"), f("guest_places", { control: "stepper" }), f("room_capacity"), f("sell_limit"), toggle("waitlist_on"), toggle("sets_published")],
      [money("received"), money("refunded"), money("owed_door"), f("owed_door_n"), money("owed_transfer"), money("owed_overdue")],
      [when("published_at"), when("was_starts_at"), when("postponed_at"), when("cancelled_at")],
    ),
  },
  {
    ref: "events-ticket-types",
    template: "page-crud",
    title: "Ticket types",
    group: "records",
    icon: "ticket",
    order: 2,
    table: "ticket_types",
    config: form(
      [title("name"), ref("event_id"), f("kind", { control: "select" }), money("price"), f("capacity", { control: "number" }), wide("description", "text")],
      [f("visibility", { control: "segmented" }), f("min_per_order", { control: "stepper" }), f("max_per_order", { control: "stepper" }), when("sales_start"), when("sales_end"), toggle("selling")],
      [toggle("pay_door"), toggle("pay_transfer"), toggle("admits_day1"), toggle("admits_day2"), toggle("admits_day3"), f("position", { control: "stepper" })],
    ),
  },
  {
    ref: "events-orders",
    template: "page-crud",
    title: "Orders",
    group: "records",
    icon: "receipt",
    order: 3,
    table: "orders",
    config: form(
      [title("number"), f("status", { control: "select" }), ref("event_id"), f("channel", { control: "segmented" }), when("created_at"), when("held_until")],
      [f("buyer_name"), f("email", { control: "email" }), ref("customer_id"), f("language"), toggle("opt_in"), wide("access_note", "text")],
      [
        rows("tickets", [
          { column: "name", width: "1fr" },
          { column: "holder_name", width: "1.4fr" },
          { column: "status", width: "130px" },
          { column: "due", control: "currency", width: "100px" },
          { column: "collected", control: "currency", width: "100px" },
        ]),
      ],
      [f("code_text"), ref("code_id"), money("subtotal"), money("discount"), money("adjusted"), money("total"), money("collected"), money("paid_in"), money("refunded"), money("balance")],
      [when("offer_until"), when("pay_by"), when("confirmed_at"), when("paid_at"), f("paid_method", { control: "select" }), when("released_at")],
      [when("cancelled_at"), f("cancel_cause", { control: "select" }), wide("cancel_reason", "text"), ref("waitlist_id"), when("kept_at"), wide("note")],
    ),
  },
  {
    ref: "events-tickets",
    template: "page-crud",
    title: "Tickets",
    group: "records",
    icon: "tickets",
    order: 4,
    table: "tickets",
    config: form(
      [title("code"), ref("order_id"), ref("ticket_type_id"), f("status", { control: "select" }), f("holder_name"), f("holder_email", { control: "email" })],
      [money("price"), money("discount"), money("due"), money("collected"), f("settled")],
      [f("pending_name"), f("pending_email", { control: "email" }), when("offer_until"), when("sent_at"), when("accepted_at"), ref("holder_customer_id")],
      [when("refund_asked_at"), when("refund_declined_at"), f("cancel_cause", { control: "select" }), when("cancelled_at")],
    ),
  },
  {
    ref: "events-check-ins",
    template: "page-crud",
    title: "Check-ins",
    group: "records",
    icon: "scan-line",
    order: 5,
    table: "check_ins",
    config: form([ref("ticket_id"), ref("event_day_id"), f("day"), when("scanned_at"), f("scanned_by"), ref("device_id")]),
  },
  {
    ref: "events-door-payments",
    template: "page-crud",
    title: "Door payments",
    group: "records",
    icon: "hand-coins",
    order: 6,
    table: "door_collections",
    config: form([ref("ticket_id"), ref("order_id"), money("amount"), f("method", { control: "segmented" }), ref("device_id"), f("state", { control: "segmented" })], [when("taken_at"), f("taken_by"), when("voided_at"), f("voided_by")]),
  },
  {
    ref: "events-payments",
    template: "page-crud",
    title: "Payments",
    group: "records",
    icon: "wallet",
    order: 7,
    table: "payments",
    config: form([ref("order_id"), money("amount"), f("method", { control: "segmented" }), ref("device_id"), wide("note", "text")], [when("recorded_at"), f("recorded_by"), ...voidRow]),
  },
  {
    ref: "events-refunds",
    template: "page-crud",
    title: "Refunds",
    group: "records",
    icon: "undo-2",
    order: 8,
    table: "refunds",
    config: form([ref("order_id"), money("amount"), f("kind", { control: "segmented" }), f("method", { control: "segmented" }), wide("note", "text")], [when("recorded_at"), f("recorded_by"), ...voidRow]),
  },
  {
    ref: "events-guest-lists",
    template: "page-crud",
    title: "Guest lists",
    group: "records",
    icon: "clipboard-list",
    order: 9,
    table: "guest_list",
    config: form([title("name"), ref("event_id"), f("plus", { control: "stepper" }), f("people"), f("on_behalf"), wide("note", "text")], [f("status", { control: "segmented" }), f("arrived", { control: "stepper" }), when("in_at"), f("in_by"), f("added_by")]),
  },
  {
    ref: "events-waitlists",
    template: "page-crud",
    title: "Waitlists",
    group: "records",
    icon: "list-ordered",
    order: 10,
    table: "waitlist",
    config: form([f("email", { control: "email" }), ref("event_id"), f("qty", { control: "stepper" }), f("status", { control: "select" }), ref("order_id")], [when("joined_at"), when("offered_at"), when("offer_until"), ref("customer_id")]),
  },
  {
    ref: "events-reminders",
    template: "page-crud",
    title: "Reminders",
    group: "records",
    icon: "bell",
    order: 11,
    table: "reminders",
    config: form([f("email", { control: "email" }), ref("event_id"), ref("ticket_type_id"), f("target"), when("created_at"), when("sent_at")]),
  },
  {
    ref: "events-codes",
    template: "page-crud",
    title: "Codes",
    group: "records",
    icon: "badge-percent",
    order: 12,
    table: "codes",
    config: form(
      [title("code"), f("kind", { control: "segmented" }), f("value", { control: "number" }), toggle("active")],
      [ref("event_id"), ref("room_id"), f("type_kind", { control: "select" }), ref("unlocks_type_id"), f("max_uses", { control: "number" }), when("valid_until"), wide("note", "text")],
    ),
  },
  {
    ref: "events-customers",
    template: "page-crud",
    title: "Customers",
    group: "records",
    icon: "contact",
    order: 13,
    table: "customers",
    config: form([f("name"), f("email", { control: "email" }), toggle("opt_in"), when("created_at"), when("forgotten_at")]),
  },
  {
    ref: "events-messages",
    template: "page-crud",
    title: "Emails",
    group: "records",
    icon: "mail",
    order: 14,
    table: "messages",
    config: form(
      [f("kind"), f("status", { control: "select" }), f("to_address", { control: "email" }), f("language"), when("due"), when("sent_at")],
      [ref("order_id"), ref("ticket_id"), ref("event_id"), ref("broadcast_id"), f("skip_reason", { control: "select" }), wide("error", "text")],
    ),
  },
  {
    ref: "events-broadcasts",
    template: "page-crud",
    title: "Messages to buyers",
    group: "records",
    icon: "megaphone",
    order: 15,
    table: "broadcasts",
    config: form([ref("event_id"), f("audience", { control: "segmented" }), ref("ticket_type_id"), f("template", { control: "select" }), wide("subject", "text"), wide("body")], [f("people"), when("sent_at"), f("sent_by")]),
  },

  // ── the venue ────────────────────────────────────────────────────────────────
  {
    ref: "events-settings",
    template: "page-crud",
    title: "Settings",
    group: "manage",
    icon: "settings",
    order: 1,
    table: "settings",
    config: form(
      [title("venue_name"), f("contact_email", { control: "email" }), wide("address", "text"), f("day_starts_at"), f("number_start", { control: "number" })],
      [toggle("door_on"), toggle("transfer_on"), f("bank_account_name"), f("bank_name"), f("bank_account_number"), f("bank_routing")],
      [f("transfer_days", { control: "stepper" }), f("transfer_time"), f("transfer_cutoff_days", { control: "stepper" }), f("release_after_hours", { control: "stepper" })],
      [f("hold_minutes", { control: "stepper" }), f("offer_hours", { control: "stepper" }), f("send_hours", { control: "stepper" }), f("refund_days", { control: "stepper" }), f("refund_payback_text"), f("check_in_minutes", { control: "stepper" }), f("remind_lead_hours", { control: "stepper" })],
      [toggle("accounts_on"), toggle("waitlist_on"), toggle("send_on"), toggle("codes_on"), toggle("timetable_on"), toggle("questions_on"), toggle("tonight_email_on"), f("default_age", { control: "select" })],
      [wide("getting_there"), wide("accessibility"), wide("policies"), wide("faq")],
    ),
  },
  {
    ref: "events-rooms",
    template: "page-crud",
    title: "Rooms",
    group: "manage",
    icon: "door-open",
    order: 2,
    table: "rooms",
    config: form([title("name"), f("capacity", { control: "number" }), f("kind", { control: "segmented" }), wide("note", "text"), wide("access_text"), f("position", { control: "stepper" })]),
  },
  {
    ref: "events-acts",
    template: "page-crud",
    title: "Acts",
    group: "manage",
    icon: "mic-vocal",
    order: 3,
    table: "acts",
    config: form([title("name"), ref("event_id"), ref("room_id"), f("day", { control: "stepper" }), when("starts_at"), when("ends_at"), f("position", { control: "stepper" })]),
  },
  {
    ref: "events-questions",
    template: "page-crud",
    title: "Checkout questions",
    group: "manage",
    icon: "message-circle-question",
    order: 4,
    table: "questions",
    config: form([wide("text", "text"), ref("event_id"), f("kind", { control: "segmented" }), wide("options"), f("per", { control: "segmented" }), toggle("required"), f("position", { control: "stepper" })]),
  },
  {
    ref: "events-doors",
    template: "page-crud",
    title: "Door devices",
    group: "manage",
    icon: "smartphone",
    order: 5,
    table: "devices",
    config: form([title("name"), toggle("active")]),
  },
];

/** A page as the manifest carries it. */
const pageOf = (spec: PageSpec) => ({
  ref: spec.ref,
  template: spec.template,
  title: { key: `mft.${spec.ref.replaceAll("-", ".")}`, fallback: spec.title },
  titles: titles(spec.title),
  nav: { group: spec.group, icon: spec.icon, order: spec.order },
  ...(spec.table === undefined ? {} : { bindings: { rows: spec.table } }),
  config: spec.config,
});

export function pages(): unknown[] {
  return SPECS.map(pageOf);
}

/** Every page's ref, in order (the box office's role grants them by name). */
export const PAGE_REFS = SPECS.map((spec) => spec.ref);
