/**
 * Who may do what, enforced by Adminium on every read and write.
 *
 *   box-office   the box office's own screens and the dashboard section:
 *                every show, type, code, order, payment, refund, message,
 *                guest list, waitlist and setting; postpone and cancel; the
 *                door too. Sees buyers' names and emails (to find them and
 *                write to them).
 *   door         the door screen only: reads tonight's shows, their tickets,
 *                orders, check-ins, door money and guest list; lets people in
 *                (a check-in row), takes a ticket's door money, sells at the
 *                door (an order held, then at the door, then paid once every
 *                ticket's money is taken), ticks guest-list arrivals. Never a
 *                payment of another kind, a refund, a cancel, a setting, a code
 *                or a message; never marks an order paid while money is owed.
 *
 * Adminium's own admins see everything, as ever.
 *
 * The screens show or hide a button by the role, but the grants and the
 * limits below are what refuse the write — a hidden button is not a lock.
 */
import { PAGE_REFS } from "./pages.ts";
import { TABLE_REFS } from "./tables.ts";

const grant = (table: string, ...actions: string[]) => actions.map((action) => `table:@${table}:${action}`);
const view = (page: string) => `page:@${page}:view`;
/** Seeing a table's personal columns (a buyer's name and email). */
const pii = (table: string) => `table:@${table}:read_pii`;

/** The records the box office never deletes: money, check-ins and what was sent. */
const KEPT = new Set(["payments", "refunds", "door_collections", "messages", "check_ins", "orders", "tickets"]);

/** What the door reads to run a night. */
const DOOR_READS = [
  "settings",
  "rooms",
  "events",
  "event_days",
  "ticket_types",
  "orders",
  "tickets",
  "check_ins",
  "door_collections",
  "payments",
  "guest_list",
  "devices",
];

export const ROLES = [
  {
    key: "box-office",
    name: "Box office",
    permissions: [
      "app:@:staff",
      ...TABLE_REFS.flatMap((table) => (KEPT.has(table) ? grant(table, "read", "create", "update") : grant(table, "read", "create", "update", "delete"))),
      ...PAGE_REFS.flatMap((page) => [view(page), `page:@${page}:edit`]),
      ...["orders", "customers", "tickets", "waitlist", "reminders", "messages", "guest_list"].map(pii),
    ],
  },
  {
    key: "door",
    name: "Door",
    screensOnly: true,
    permissions: [
      "app:@:staff",
      ...DOOR_READS.flatMap((table) => grant(table, "read")),
      ...grant("check_ins", "create", "delete"),
      ...grant("door_collections", "create", "update"),
      // A door sale: the order and its tickets in one write, then its moves.
      ...grant("orders", "create", "update"),
      ...grant("tickets", "create"),
      ...grant("guest_list", "update"),
    ],
    limits: {
      // At the door: an order is sold held, moved to the door, and paid once nothing is owed.
      orders: {
        writable: ["status", "buyer_name", "channel", "note", "paid_method"],
        writableValues: { status: ["door", "paid"], channel: ["door"], paid_method: ["card", "cash"] },
      },
      // A collection taken by mistake is voided; nothing else of it changes.
      door_collections: { writable: ["state"], writableValues: { state: ["voided"] } },
      guest_list: { writable: ["status", "arrived"] },
    },
  },
];
