/**
 * What goes over the wire, as Adminium's APIs answer it — the one shape every
 * screen reads, whichever Adminium answers: the real one, or the demo's
 * stand-in (`src/demo/`).
 *
 * Rows are the table's columns by their names (`doors_at`, `balance`), as the
 * entry's `select` lets them out. Instants are ISO strings, money a number. A
 * refusal is an {@link ApiError}: its HTTP status, its code, and its params —
 * the code is the contract, never the message.
 */

export type Id = number;

/** A row as an API answers it. */
export type Row = Record<string, unknown> & { id: Id };

/** A refusal: Adminium's status, code and params. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly params: Readonly<Record<string, unknown>>;

  constructor(status: number, code: string, params: Record<string, unknown> = {}, message = code) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.params = params;
  }
}

/** Whether a thrown value is a refusal from Adminium (or the demo's stand-in). */
export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError || (typeof e === "object" && e !== null && (e as { name?: unknown }).name === "ApiError");

/**
 * A yes/no column as a yes: Postgres answers `true`, MySQL and SQLite a `1`
 * (a TINYINT or an integer), and a text copy `"1"` or `"true"`. Every
 * comparison of a stored yes/no goes through here, never `=== true`.
 */
export const yes = (v: unknown): boolean => v === true || v === 1 || v === "1" || v === "true" || v === "t";

/** `/public/config` (and the staff surface's config): the venue's zone and money, and the server's clock. */
export interface Config {
  timezone: string;
  currency: string;
  now?: string;
  /** Whether the venue's receipts are drawn (an add-on that makes them is installed): a paid order offers one. */
  receipts?: boolean;
}

/**
 * What is left of one ticket type of a show, as the availability answers it:
 * open (with how many are left when few are), sold out, or not on sale (its
 * window has not opened, or has closed).
 */
export interface TypeLeft {
  ticket_type_id: Id;
  state: "open" | "sold_out" | "not_on_sale";
  left?: number;
}

/** One ticket of an order being made: its type, the name on it, its answers. */
export interface TicketLine {
  ticket_type_id: Id;
  holder_name?: string | null;
  answers?: Record<string, string> | null;
}

/** An order with its tickets, as a create sends it. */
export interface OrderBody {
  values: Record<string, unknown>;
  tickets: TicketLine[];
  /** The total the buyer was shown: a different one writes nothing. */
  expect?: { total: number };
}

/**
 * The tickets as a create writes them: each names the order's show
 * (`show_id`). Adminium copies the show's doors, waitlist and reminder switch
 * through it as sent, and refuses a ticket whose type or order is of another
 * show.
 */
export function ticketRows(body: OrderBody): Record<string, unknown>[] {
  return body.tickets.map((t) => ({ ...t, show_id: body.values["event_id"] }));
}

/** A create's reply: the order and its tickets; `replayed` for a retry of one already made. */
export interface OrderReply {
  data: Row;
  tickets: Row[];
  replayed?: true;
  /** The order's own link, answered once, on the first create (never on a replay). */
  link?: { key: string; token: string };
}

/** A dry run: every figure a create would write, written nowhere. */
export interface QuoteReply {
  data: Record<string, unknown>;
  tickets: Record<string, unknown>[];
}

/** A session a claim opens (an order's link, a ticket's link, a sign-in). */
export interface ClaimReply {
  session: string;
  expiresAt: number;
  name?: string | null;
}

/**
 * One pool of a show, as the staff counts answer it: a ticket type's (or the
 * show's own, `ticket_type_id` null) size, what is taken, held for a
 * checkout or an offer, owed to the waitlist, and left.
 */
export interface PoolCount {
  event_id: Id;
  ticket_type_id: Id | null;
  size: number;
  taken: number;
  held: number;
  reserved: number;
  left: number;
}

/** One change the live stream announces. */
export interface LiveFrame {
  table: string;
  id: Id;
  op: "insert" | "update" | "delete";
}

/**
 * One condition of a staff read, as the records list's filter takes it: a
 * column equal to a value, in a list, empty or not, above or below a bound,
 * or containing some words (any case).
 */
export interface Where {
  column: string;
  eq?: unknown;
  in?: unknown[];
  isNull?: boolean;
  gte?: number | string;
  lte?: number | string;
  gt?: number | string;
  lt?: number | string;
  like?: string;
}

/** A staff read of a table: every condition in `where`, and one of `any` when given; sorted, a page of it. */
export interface ListQuery {
  where?: Where[];
  any?: Where[];
  sort?: { column: string; desc?: boolean }[];
  limit?: number;
  offset?: number;
}

/** A page of rows, and how many match in all (an exact count). */
export interface ListReply {
  rows: Row[];
  total: number;
}

/** One change to a row, as the record's history tells it: when, by whom, and what each column became. */
export interface HistoryEntry {
  at: string;
  by: string | null;
  table: string;
  id: Id;
  op: "insert" | "update" | "delete";
  changes: Record<string, unknown>;
}
