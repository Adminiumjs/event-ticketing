/**
 * The Overview page's layout: the venue at a glance, drawn by Adminium's own
 * widgets from the app's tables. Nothing on it is typed in — every figure is
 * a stored row, counted or summed where Adminium runs the query, on the
 * venue's clock.
 *
 * What the words mean, once:
 *   - a "coming show" is one on sale or postponed, not cancelled, whose night
 *     has not ended before today;
 *   - "tickets sold" counts the places the ticket limit counts as taken: live
 *     tickets on orders that hold them, not a checkout still holding places
 *     and not a place kept back for the waitlist;
 *   - "owed at the door" is what pay-at-the-door orders still owe;
 *   - "awaiting bank transfer" is what orders waiting for a transfer owe,
 *     overdue ones included;
 *   - "refunds to make" is money an order has been paid beyond what it now
 *     costs, not yet given back;
 *   - "received" is money the box office recorded: payments and money taken
 *     at the door.
 *
 * A card's words are written in every language the app speaks; money is
 * shown in the connection's currency.
 */
import { l, titles, type Labels } from "./labels.ts";
import { LIVE_TICKET } from "./tables.ts";

type Json = Record<string, unknown>;

const query = (name: string, rest: Json): Json => ({ kind: "table-query", source: { name, type: "table" }, ...rest });
const metric = (name: string, aggregation: Json, rest: Json): Json => query(name, { shape: "metric+delta", aggregations: [aggregation], ...rest });
const list = (name: string, rest: Json): Json => query(name, { shape: "record-list", ...rest });

const count = (alias: string): Json => ({ fn: "count", alias });
const sum = (column: string, alias: string): Json => ({ fn: "sum", column, alias });
const eq = (column: string, value: unknown): Json => ({ column, op: "eq", value });
const oneOf = (column: string, value: string[]): Json => ({ column, op: "in", value });
const day = (column: string, op: string, when: string): Json => ({ column, op, day: when });

/** Orders holding their places: paid, to pay, or at no charge (a checkout still holding them is not one). */
const HOLDS_PLACES = ["door", "awaiting_transfer", "overdue", "no_charge", "paid"];
/** A coming show, through a row's link to it. */
const comingVia = (link: string): Json[] => [eq(`${link}.status`, "published"), day(`${link}.curfew_at`, "gte", "today")];
/** Tonight's show, through a row's link to it. */
const tonightVia = (link: string): Json[] => [eq(`${link}.status`, "published"), day(`${link}.doors_at`, "eq", "today")];

const COUNT = { metricFormat: "plain", deltaMode: "none", showSparkline: false };
const MONEY = { metricFormat: "currency", deltaMode: "none", showSparkline: false };

/** A records page, filtered as a card counts. */
const page = (ref: string, ...filters: string[]) => `/p/events-${ref}${filters.length === 0 ? "" : `?${filters.join("&")}`}`;

type Place = [x: number, y: number, w: number, h: number];

/** A card's words beside its title, each in every language the app speaks. */
interface Words {
  subtitle?: string;
  caption?: string;
  empty?: string;
}

function card(i: string, widget: string, [x, y, w, h]: Place, en: string, config: Json, words: Words = {}): Json {
  const all: Labels = l(en);
  return {
    i,
    widget,
    x,
    y,
    w,
    h,
    config: {
      title: all["en-US"],
      titles: all,
      ...(words.subtitle === undefined ? {} : { subtitle: words.subtitle, subtitles: titles(words.subtitle) }),
      ...(words.caption === undefined ? {} : { metricLabel: words.caption, metricLabels: titles(words.caption) }),
      ...(words.empty === undefined ? {} : { emptyState: { titleKey: words.empty, titles: titles(words.empty) } }),
      ...config,
    },
  };
}

/** A list column, its label in every language. */
const col = (name: string, en: string, rest: Json = {}): Json => ({ name, label: en, labels: titles(en), ...rest });

export const OVERVIEW_LAYOUT = {
  version: 1,
  toolbar: {
    link: { label: "Open the box office", labels: titles("Open the box office"), href: "@staff", icon: "external-link" },
  },
  items: [
    // ── the season at a glance
    card(
      "sold",
      "kpi-stat-card",
      [0, 0, 3, 3],
      "Tickets sold for coming shows",
      {
        ...COUNT,
        iconName: "ticket",
        href: page("tickets", `f.status=in:${LIVE_TICKET.join(",")}`, `f.order_status=in:${HOLDS_PLACES.join(",")}`, "f.doors_at=gte:today"),
        binding: metric("tickets", count("tickets"), { filters: [oneOf("status", LIVE_TICKET), oneOf("order_status", HOLDS_PLACES), ...comingVia("event_id")] }),
      },
      { caption: "comps included" },
    ),
    card("owed-door", "kpi-stat-card", [3, 0, 3, 3], "Owed at the door", {
      ...MONEY,
      iconName: "door-open",
      href: page("orders", "f.status=eq:door"),
      binding: metric("orders", sum("balance", "owed"), { filters: [eq("status", "door"), ...comingVia("event_id")] }),
    }),
    card("awaiting", "kpi-stat-card", [6, 0, 3, 3], "Awaiting bank transfer", {
      ...MONEY,
      iconName: "landmark",
      iconTone: "warn",
      href: page("orders", "f.status=in:awaiting_transfer,overdue"),
      binding: metric("orders", sum("balance", "awaiting"), { filters: [oneOf("status", ["awaiting_transfer", "overdue"])] }),
    }),
    card(
      "refunds",
      "kpi-stat-card",
      [9, 0, 3, 3],
      "Refunds to make",
      {
        ...MONEY,
        iconName: "undo-2",
        iconTone: "danger",
        href: page("orders", "f.balance=lt:0"),
        binding: metric("orders", sum("refund_due", "to_give_back"), { filters: [{ column: "balance", op: "lt", value: 0 }] }),
      },
      { caption: "paid, not yet given back" },
    ),

    // ── tonight
    card(
      "tonight",
      "mini-table",
      [0, 3, 6, 5],
      "Tonight",
      {
        limit: 3,
        columns: [col("name", "Show"), col("doors_at", "Doors", { logicalType: "time" }), col("sold", "Sold", { semantic: "capacity-bar" })],
        secondary: ["room"],
        viewAllHref: page("shows", "f.doors_at=gte:today", "f.doors_at=lte:today"),
        binding: list("events", {
          select: ["id", "name", "doors_at"],
          lookups: ["room:room_id.name"],
          filters: [eq("status", "published"), day("doors_at", "eq", "today")],
          orderBy: [{ column: "doors_at", dir: "asc" }],
          limit: 3,
          counts: { table: "tickets", as: "sold" },
        }),
      },
      { subtitle: "Sold and held of what the show can sell", empty: "No show tonight" },
    ),
    card("tonight-door", "kpi-stat-tile-compact", [0, 8, 3, 3], "To collect at the door", {
      ...MONEY,
      iconName: "door-open",
      href: page("orders", "f.status=eq:door"),
      binding: metric("orders", sum("balance", "to_collect"), { filters: [eq("status", "door"), ...tonightVia("event_id")] }),
    }),
    card(
      "tonight-guests",
      "kpi-stat-tile-compact",
      [3, 8, 3, 3],
      "Guest list",
      {
        ...COUNT,
        iconName: "list-checks",
        href: page("guest-lists"),
        binding: metric("guest_list", sum("people", "people"), { filters: tonightVia("event_id") }),
      },
      { caption: "people" },
    ),

    // ── what needs a person
    card(
      "overdue",
      "mini-table",
      [6, 3, 6, 4],
      "Bank transfers past their deadline",
      {
        limit: 6,
        columns: [col("buyer_name", "Buyer"), col("balance", "Owed", { logicalType: "decimal", semantic: "money" })],
        secondary: ["number", "show"],
        viewAllHref: page("orders", "f.status=eq:overdue"),
        binding: list("orders", {
          select: ["id", "number", "buyer_name", "balance"],
          lookups: ["show:event_id.name"],
          filters: [eq("status", "overdue")],
          orderBy: [{ column: "pay_by", dir: "asc" }],
          limit: 6,
        }),
      },
      { subtitle: "Mark them paid, or they go back on sale", empty: "No transfers past their deadline." },
    ),
    card(
      "refund-requests",
      "mini-table",
      [6, 7, 6, 4],
      "Refund requests",
      {
        limit: 6,
        columns: [col("holder_name", "Ticket holder"), col("refund_asked_at", "Asked", { logicalType: "datetime" })],
        secondary: ["order", "show"],
        viewAllHref: page("tickets", "f.status=eq:refund_asked"),
        binding: list("tickets", {
          select: ["id", "holder_name", "refund_asked_at"],
          lookups: ["order:order_id.number", "show:event_id.name"],
          filters: [eq("status", "refund_asked")],
          orderBy: [{ column: "refund_asked_at", dir: "asc" }],
          limit: 6,
        }),
      },
      { empty: "No refund requests." },
    ),
    card(
      "waiting",
      "mini-table",
      [0, 11, 6, 4],
      "Messages waiting",
      {
        limit: 6,
        columns: [col("subject", "Message"), col("people", "People", { logicalType: "integer" })],
        secondary: ["show"],
        viewAllHref: page("broadcasts", "f.sent_at=unset"),
        binding: list("broadcasts", {
          select: ["id", "subject", "people"],
          lookups: ["show:event_id.name"],
          filters: [{ column: "sent_at", op: "is_null" }],
          orderBy: [{ column: "id", dir: "asc" }],
          limit: 6,
        }),
      },
      { subtitle: "Written, not sent yet", empty: "No messages waiting." },
    ),
    card(
      "on-sale",
      "mini-table",
      [6, 11, 6, 4],
      "Going on sale",
      {
        limit: 6,
        columns: [col("name", "Show"), col("on_sale_at", "On sale", { logicalType: "datetime" }), col("reminder_count", "Reminders", { logicalType: "integer" })],
        viewAllHref: page("reminders"),
        binding: list("events", {
          select: ["id", "name", "on_sale_at", "reminder_count"],
          filters: [eq("status", "published"), day("on_sale_at", "gte", "today"), day("on_sale_at", "lte", "today+7")],
          orderBy: [{ column: "on_sale_at", dir: "asc" }],
          limit: 6,
        }),
      },
      { subtitle: "In the next 7 days", empty: "Nothing going on sale." },
    ),

    // ── the season, show by show
    card(
      "coming",
      "mini-table",
      [0, 15, 12, 9],
      "Coming shows",
      {
        limit: 20,
        columns: [col("doors_at", "Date", { logicalType: "date" }), col("name", "Show"), col("sold", "Sold", { semantic: "capacity-bar" })],
        secondary: ["room"],
        viewAllHref: page("shows", "f.status=eq:published", "f.curfew_at=gte:today"),
        binding: list("events", {
          select: ["id", "name", "doors_at"],
          lookups: ["room:room_id.name"],
          filters: [eq("status", "published"), day("curfew_at", "gte", "today")],
          orderBy: [{ column: "doors_at", dir: "asc" }],
          limit: 20,
          counts: { table: "tickets", as: "sold" },
        }),
      },
      { subtitle: "Sold of capacity, in date order", empty: "No shows coming up." },
    ),
    card(
      "money",
      "chart-bar",
      [0, 24, 12, 8],
      "Money by show",
      {
        metricFormat: "currency",
        href: page("payments"),
        series: [
          { label: "Received", labels: titles("Received") },
          { label: "Still owed", labels: titles("Still owed") },
        ],
        // Each coming show's orders that took or owe money, in the shows' date order.
        binding: query("orders", {
          shape: "categorical",
          groupBy: ["event_id"],
          groupLabel: "event_id.name",
          aggregations: [sum("received", "received"), sum("owed", "owed")],
          filters: [{ or: [{ column: "received", op: "gt", value: 0 }, { column: "owed", op: "gt", value: 0 }] }, ...comingVia("event_id")],
          orderBy: [{ column: "event_id.doors_at", dir: "asc" }],
          limit: 20,
        }),
      },
      { subtitle: "Received counts payments staff recorded; owed is at the door or by bank transfer.", empty: "No money taken or owed for coming shows." },
    ),
  ],
};
