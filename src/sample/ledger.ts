/**
 * Waveform's sample, as rows: the one source of the app's sample data.
 *
 * `ledger.json` holds every row of a small two-room venue on Tuesday 28 July
 * 2026 at 16:30 — thirteen shows from a gig that has happened to a festival
 * at the end of August, 799 orders (WV-8017 to WV-8815, numbered in the order
 * they were placed), their 1,945 tickets, the payments, door money, refunds,
 * check-ins, guest lists, a waitlist, reminders and messages. It is a ledger:
 * every figure the screens show is worked out from these rows, never typed.
 *
 * The file is written once from the ledger's generator and checked in; the
 * sample bundle (`waveform.ts`), the demo and the figure tests all read it,
 * so they cannot disagree.
 */
import raw from "./ledger.json";

export type Stamp = string; // "2026-07-28T16:30", the venue's wall clock

export interface LedgerTicketType {
  key: string;
  name: string;
  price: number;
  cap: number;
  max: number;
  pay: ("door" | "transfer")[];
  vis: "public" | "code" | "box";
  sales_start?: Stamp;
  days: number[];
}

export interface LedgerShow {
  key: string;
  name: string;
  room: "main" | "annex" | "both";
  kind: "gig" | "club" | "comedy" | "talks" | "festival";
  age: string;
  doors: Stamp;
  start: Stamp;
  curfew: Stamp;
  on_sale: Stamp;
  guest_places: number;
  guest_closes?: Stamp;
  refund_until?: Stamp;
  waitlist: boolean;
  cancelled_at?: Stamp;
  postponed_at?: Stamp;
  was?: Stamp;
  was_doors?: Stamp;
  announced?: Stamp;
  day2_doors?: Stamp;
  last_entry?: string;
  types: LedgerTicketType[];
}

export type OrderStatus =
  | "held"
  | "offered"
  | "door"
  | "awaiting_transfer"
  | "overdue"
  | "released"
  | "no_charge"
  | "paid"
  | "not_collected"
  | "let_go"
  | "expired"
  | "cancelled";

export interface LedgerTicket {
  type: string;
  holder?: string;
  code: string;
  status: "valid" | "offered" | "refund_asked" | "cancelled";
  price: number;
  discount: number;
  cancelled_at?: Stamp;
  refund_asked_at?: Stamp;
  answers?: Record<string, string>;
}

export interface LedgerOrder {
  no: number;
  show: string;
  placed: Stamp;
  buyer: string;
  email?: string;
  status: OrderStatus;
  mode: string;
  channel: "online" | "box_office";
  code?: string;
  by?: string;
  held_until?: Stamp;
  offer_until?: Stamp;
  pay_by?: Stamp;
  paid_at?: Stamp;
  confirmed_at?: Stamp;
  cancelled_at?: Stamp;
  claimed_at?: Stamp;
  tickets: LedgerTicket[];
  payments: { amount: number; method: "bank_transfer" | "card" | "cash"; at: Stamp; by: string }[];
  collections: { ticket: string; amount: number; method: "card" | "cash"; device: string; at: Stamp; by: string }[];
  refunds: { amount: number; method: "bank_transfer" | "card" | "cash"; at: Stamp; by: string }[];
}

export interface LedgerCheckIn {
  order: number;
  ticket: string;
  day: number;
  at: Stamp;
  device: string;
  by: string;
}

export interface Ledger {
  now: Stamp;
  venue: {
    name: string;
    address: string;
    contact: string;
    currency: string;
    bank_name: string;
    account_name: string;
    account: string;
    routing: string;
    transfer_days: number;
    transfer_time: string;
    cutoff_days: number;
    release_after_hours: number;
    hold_minutes: number;
    offer_hours: number;
    refund_days: number;
    check_in_minutes: number;
    remind_lead_hours: number;
    friend_hours: number;
  };
  rooms: { key: "main" | "annex" | "both"; name: string; capacity: number; note?: string }[];
  staff: Record<string, string>;
  devices: string[];
  shows: LedgerShow[];
  codes: { code: string; kind: "percent" | "amount" | "unlock"; value?: number; show?: string; room?: string; type_name?: string; unlocks?: string; max_uses?: number; until: Stamp; on: boolean }[];
  orders: LedgerOrder[];
  check_ins: LedgerCheckIn[];
  /** Demo-only: the Early-entry scans the demo's "Advance to doors" makes at 19:58. Never installed. */
  door_1958: LedgerCheckIn[];
  guests: Record<string, { name: string; plus: number; on_behalf: string; note?: string }[]>;
  waitlist: { show: string; name: string; email: string; qty: number; joined: Stamp; status: "claimed" | "missed" | "offered" | "waiting" }[];
  reminders: Record<string, { name: string; email: string }[]>;
  acts: Record<string, { name: string; day: number; room: string; start: string; end: string }[]>;
  /** Each message to a show's buyers: who it reached as it went (buyers' addresses, and orders — one email an order). */
  broadcasts: { show: string; template: string; subject: string; sent_at: Stamp; by: string; people: number; orders: number }[];
  /** The postponement's message, written and not sent yet: who it would reach now. */
  waiting_broadcast: { show: string; template: string; subject: string; by: string; people: number; orders: number };
  studio_questions: { text: string; kind: "choice" | "yes_no"; options?: string[]; per: "ticket" | "order"; required: boolean }[];
}

type RawOrder = Omit<LedgerOrder, "tickets" | "payments" | "collections" | "refunds"> & {
  tickets: (Omit<LedgerTicket, "status" | "discount"> & Partial<Pick<LedgerTicket, "status" | "discount">>)[];
  payments?: LedgerOrder["payments"];
  collections?: LedgerOrder["collections"];
  refunds?: LedgerOrder["refunds"];
};

/** The file leaves out empty lists and a ticket's defaults (valid, no discount): put them back. */
function fill(file: typeof raw): Ledger {
  const data = file as unknown as Omit<Ledger, "orders"> & { orders: RawOrder[] };
  return {
    ...data,
    shows: data.shows.map((s) => ({ ...s, types: s.types.map((t) => ({ ...t, pay: t.pay ?? [] })) })),
    orders: data.orders.map((o) => ({
      ...o,
      tickets: o.tickets.map((t) => ({ ...t, status: t.status ?? "valid", discount: t.discount ?? 0 })),
      payments: o.payments ?? [],
      collections: o.collections ?? [],
      refunds: o.refunds ?? [],
    })),
  };
}

export const LEDGER: Ledger = fill(raw);

/** The sample's own moment: Tuesday 28 July 2026, 16:30 at the venue. */
export const SAMPLE_NOW: Stamp = LEDGER.now;
