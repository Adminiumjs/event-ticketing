/**
 * The three doors the screens go through — one per side of the app, each the
 * calls that side makes and nothing else.
 *
 *   AudiencePort   the audience site: the public API through the venue's
 *                  browser keys (the shows, what is left, a price, buying,
 *                  an order's own link, the confirm link, a friend's ticket,
 *                  the waitlist, reminders);
 *   BoxOfficePort  the box office's screens: the data API as a signed-in
 *                  person (every row, the counts, phone orders, payments,
 *                  refunds, cancels, releases, the waitlist's offers);
 *   DoorPort       the door's screen: tonight's shows, a scan, a door
 *                  payment, a check-in and its undo, a door sale.
 *
 * Every answer is a wire shape (`wire.ts`) and every refusal an `ApiError`
 * carrying Adminium's code, so a screen has one path whoever answers: the
 * real server, or the demo's stand-in, which plays the same rules.
 */
import type { ClaimReply, Config, Id, OrderBody, OrderReply, PoolCount, QuoteReply, Row, TypeLeft } from "./wire.ts";

/** The venue and its shows, as the audience site reads them. */
export interface Venue {
  settings: Row;
  rooms: Row[];
  events: Row[];
  days: Row[];
  acts: Row[];
  types: Row[];
  questions: Row[];
}

/** An order with its tickets, as its own page reads it. */
export interface OrderWithTickets {
  order: Row;
  tickets: Row[];
}

export interface AudiencePort {
  config(): Promise<Config>;
  venue(): Promise<Venue>;
  /** What is left of each type of a show (said only when little is). */
  left(eventId: Id): Promise<TypeLeft[]>;
  /** The types a code unlocks on a show. */
  unlock(eventId: Id, code: string): Promise<Row[]>;

  /** The order priced by Adminium, written nowhere. */
  quote(body: OrderBody): Promise<QuoteReply>;
  /** The order made, its places held. `clientKey` makes a retry land on the same order. */
  buy(body: OrderBody, clientKey: string): Promise<OrderReply>;

  /** Opens an order behind its own link (the code in the link's fragment). */
  openOrder(token: string): Promise<ClaimReply>;
  /** The order the link opened. */
  order(): Promise<OrderWithTickets>;
  /** How the buyer pays (at the door, by transfer — then confirmed by email —, at no charge), or letting it go. */
  choose(status: "door" | "confirming" | "no_charge" | "let_go"): Promise<Row>;
  /** The emailed confirm link: the transfer checkout goes on to waiting for the transfer. */
  confirmTransfer(token: string): Promise<Row>;

  /** A ticket sent to a friend, taken back, a refund asked or withdrawn, or cancelled when nothing was paid. */
  sendTicket(ticketId: Id, email: string, name: string): Promise<Row>;
  takeBack(ticketId: Id): Promise<Row>;
  askRefund(ticketId: Id): Promise<Row>;
  withdrawRefund(ticketId: Id): Promise<Row>;
  cancelTicket(ticketId: Id): Promise<Row>;

  /** A friend's ticket, opened by the link emailed to them, and accepted in their name. */
  openTicket(token: string): Promise<Row>;
  acceptTicket(token: string, name: string): Promise<Row>;

  joinWaitlist(eventId: Id, email: string, qty: number): Promise<Row>;
  remindMe(eventId: Id, email: string, ticketTypeId: Id | null): Promise<Row>;
}

/** Who is signed in to the box office or the door, and what they may do. */
export interface StaffPerson {
  name: string;
  roles: string[];
}

export interface BoxOfficePort {
  me(): Promise<StaffPerson>;
  config(): Promise<Config>;
  /** Every row of a table the person may read. */
  rows(table: string): Promise<Row[]>;
  /** A show's pools: each type's, and the show's own. */
  counts(eventId: Id): Promise<PoolCount[]>;

  /** A phone order or comps: made held; `staffKey` makes a retry land on the same order. */
  newOrder(body: OrderBody, staffKey: string): Promise<OrderReply>;
  /** An order moved on by the box office (to the door, to waiting for a transfer, released, paid). */
  move(orderId: Id, status: string, values?: Record<string, unknown>): Promise<Row>;
  recordPayment(orderId: Id, amount: number, method: "bank_transfer" | "card" | "cash", note?: string | null): Promise<Row>;
  recordRefund(orderId: Id, amount: number, method: "bank_transfer" | "card" | "cash", kind: "cancelled_tickets" | "goodwill"): Promise<Row>;
  /** Tickets cancelled (on a show with a waitlist, handed to it). */
  cancelTickets(ticketIds: Id[], cause: "box_office" | "request"): Promise<void>;
  declineRefund(ticketId: Id): Promise<Row>;
  /** The places back for a waitlist offered to the next people, strictly in joining order. */
  offerWaitlist(eventId: Id): Promise<Row[]>;
  /** A show cancelled: the show, then each live order, each its own write. */
  cancelShow(eventId: Id): Promise<void>;
}

export interface DoorPort {
  me(): Promise<StaffPerson>;
  config(): Promise<Config>;
  /** The shows on the venue's day, with their days. */
  tonight(): Promise<{ events: Row[]; days: Row[] }>;
  /** A code scanned or typed: its ticket, order and any check-in today; null for no such ticket. */
  find(code: string, eventDayId: Id): Promise<{ ticket: Row; order: Row; checkIn: Row | null } | null>;
  /** A ticket's door money taken (and the order paid when nothing is owed any more). */
  collect(ticketId: Id, method: "card" | "cash", deviceId: Id | null): Promise<Row>;
  checkIn(ticketId: Id, eventDayId: Id, deviceId: Id | null, occurredAt?: number): Promise<Row>;
  undo(checkInId: Id): Promise<void>;
}
