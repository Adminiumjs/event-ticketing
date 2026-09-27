/**
 * The Overview page's layout: the venue at a glance, drawn by Adminium's own
 * widgets from the app's tables. Nothing on it is typed in — every figure is
 * a stored row, counted or summed where Adminium runs the query, on the
 * venue's clock.
 *
 * What the words mean, once:
 *   - "owed at the door" is what pay-at-the-door orders still owe;
 *   - "awaiting bank transfer" is what orders waiting for a transfer owe,
 *     overdue ones included;
 *   - "tickets sold" counts tickets someone may still use, on orders that
 *     hold them.
 *
 * A card's title is written in every language the app speaks; money is shown
 * in the connection's currency.
 */
import { l, type Labels } from "./labels.ts";
import { COUNTING_ORDER, LIVE_TICKET } from "./tables.ts";

type Json = Record<string, unknown>;

const from = (name: string, rest: Json): Json => ({ kind: "table-query", source: { name, type: "table" }, ...rest });
const metric = (name: string, aggregation: Json, rest: Json): Json => from(name, { shape: "metric+delta", aggregations: [aggregation], ...rest });

const count = (alias: string): Json => ({ fn: "count", alias });
const sum = (column: string, alias: string): Json => ({ fn: "sum", column, alias });
const eq = (column: string, value: unknown): Json => ({ column, op: "eq", value });
const oneOf = (column: string, value: string[]): Json => ({ column, op: "in", value });

/** The eight weeks ending this one. */
const weeks = (column: string): Json => ({ column, last: 8, unit: "week", calendar: true });

const COUNT = { metricFormat: "plain", deltaMode: "none", showSparkline: false };
const MONEY = { metricFormat: "currency", deltaMode: "none", showSparkline: false };

type Place = [x: number, y: number, w: number, h: number];

function card(i: string, widget: string, [x, y, w, h]: Place, en: string, config: Json): Json {
  const titles: Labels = l(en);
  return { i, widget, x, y, w, h, config: { title: titles["en-US"], titles, ...config } };
}

export const OVERVIEW_LAYOUT = {
  version: 1,
  items: [
    card("sold", "kpi-stat-card", [0, 0, 3, 3], "Tickets sold", {
      ...COUNT,
      iconName: "ticket",
      binding: metric("tickets", count("tickets"), { filters: [oneOf("status", LIVE_TICKET), oneOf("order_status", COUNTING_ORDER)] }),
    }),
    card("owed-door", "kpi-stat-card", [3, 0, 3, 3], "Owed at the door", {
      ...MONEY,
      iconName: "door-open",
      binding: metric("orders", sum("balance", "owed"), { filters: [eq("status", "door")] }),
    }),
    card("awaiting", "kpi-stat-card", [6, 0, 3, 3], "Awaiting bank transfer", {
      ...MONEY,
      iconName: "landmark",
      binding: metric("orders", sum("balance", "awaiting"), { filters: [oneOf("status", ["awaiting_transfer", "overdue"])] }),
    }),
    card("overdue", "kpi-stat-card", [9, 0, 3, 3], "Transfers overdue", {
      ...COUNT,
      iconName: "clock-alert",
      binding: metric("orders", count("orders"), { filters: [eq("status", "overdue")] }),
    }),
    card("orders-by-week", "chart-bar", [0, 3, 12, 8], "Orders each week", {
      binding: from("orders", {
        shape: "timeseries",
        aggregations: [count("orders")],
        filters: [oneOf("status", COUNTING_ORDER)],
        bucket: { column: "created_at", unit: "week" },
        window: weeks("created_at"),
      }),
    }),
  ],
};
