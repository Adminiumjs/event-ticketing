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
import type { ClaimReply, Config, HistoryEntry, Id, ListQuery, ListReply, OrderBody, OrderReply, PoolCount, QuoteReply, Row, TypeLeft, Where } from "./wire.ts";

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

  /**
   * The quiet person check: proves this browser to the server ahead of a write that asks for it (a checkout,
   * a sign-in, a reminder). False when it could not be proved.
   */
  prove(): Promise<boolean>;
  /** The order priced by Adminium, written nowhere. */
  quote(body: OrderBody): Promise<QuoteReply>;
  /** The order made, its places held. `clientKey` makes a retry land on the same order. */
  buy(body: OrderBody, clientKey: string): Promise<OrderReply>;

  /** Opens an order behind its own link (the code in the link's fragment). */
  openOrder(token: string): Promise<ClaimReply>;
  /** The order the link opened. */
  order(): Promise<OrderWithTickets>;
  /**
   * How the buyer pays (at the door, by transfer — then confirmed by email —,
   * at no charge), or letting it go. On a waitlist offer, `keep` claims fewer
   * than offered: the rest go back to the waitlist. `orderId` names one of the
   * signed-in person's orders; without it, the order the link opened.
   */
  choose(status: "door" | "confirming" | "no_charge" | "let_go", keep?: number, orderId?: Id): Promise<Row>;
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

  /** A ticket's name (and its answers) written: the ticket keeps its code. */
  nameTicket(ticketId: Id, name: string, answers?: Record<string, string> | null): Promise<Row>;
  /** The opened order's own details: the answers, the access note, the opt-in. */
  updateOrder(values: { answers?: Record<string, string> | null; access_note?: string | null; opt_in?: boolean }, orderId?: Id): Promise<Row>;
  /** A moved show: the buyer keeps their tickets for the new date. */
  keep(orderId: Id): Promise<Row>;
  /** A transfer checkout's confirm link: the order it confirms, read before the press. */
  openConfirm(token: string): Promise<Row>;

  /** Sign in by email: a link and a 6-digit code go to the address. */
  signIn(email: string): Promise<void>;
  /** The code typed from that email. */
  verify(email: string, code: string): Promise<Person>;
  /** The link from that email. */
  openSignIn(token: string): Promise<Person>;
  /** The person this browser is signed in as, or null. */
  me(): Promise<Person | null>;
  signOut(): Promise<void>;
  /** Signs out here and on every device this person signed in on. */
  signOutEverywhere(): Promise<void>;
  /** "Delete my details": refused with `PUBLIC_CODE_STEP_UP` when the sign-in is not fresh. */
  forget(): Promise<void>;
  /** The signed-in person's orders, each with its tickets, and the tickets they hold from someone else's order. */
  myOrders(): Promise<{ orders: OrderWithTickets[]; held: Row[] }>;
  /** One of the signed-in person's orders (its own page). */
  myOrder(orderId: Id): Promise<OrderWithTickets>;
  /** A paid order's receipt, as a file to save: drawn by the add-on that makes receipts. */
  receipt(orderId: Id): Promise<Blob>;
  /** The signed-in person's places on waitlists (with any live offer's order). */
  myWaitlist(): Promise<Row[]>;
  leaveWaitlist(waitlistId: Id): Promise<Row>;
}

/** Who a sign-in names. */
export interface Person {
  email: string;
  name: string | null;
}

/** Who is signed in to the box office or the door, and what they may do. */
export interface StaffPerson {
  name: string;
  roles: string[];
  /** Where a test of a message goes. */
  email?: string | null;
  /**
   * What the person may do with each of the app's tables (by short name), as Adminium says: a screen leaves
   * out a button whose write would be refused. Absent or null when Adminium does not say (every button shows).
   */
  tables?: Record<string, string[]> | null;
}

/** A show's own rows saved with it: its days, ticket types, acts and questions (a row without an id is new; one left out goes). */
export interface EventChildren {
  event_days: Record<string, unknown>[];
  ticket_types: Record<string, unknown>[];
  acts: Record<string, unknown>[];
  questions: Record<string, unknown>[];
}

export interface BoxOfficePort {
  me(): Promise<StaffPerson>;
  config(): Promise<Config>;
  /** Every row of a table the person may read. */
  rows(table: string): Promise<Row[]>;
  /** A page of a table's rows, filtered and sorted, with how many match in all. */
  list(table: string, query?: ListQuery): Promise<ListReply>;
  /** How many rows of a table match. */
  count(table: string, where?: Where[]): Promise<number>;
  /** What happened to a row, oldest first — for an order, its tickets', payments', refunds' and door money's too. */
  history(table: string, id: Id): Promise<HistoryEntry[]>;
  /** A show's pools: each type's, and the show's own. */
  counts(eventId: Id): Promise<PoolCount[]>;

  /** A row added, changed or deleted: a guest, a waitlist place, a code, a setting, a room, a door, a note. */
  create(table: string, values: Record<string, unknown>): Promise<Row>;
  /**
   * A row changed. With `from`, only while the row is still in that state (a table that keeps states): a
   * row another screen moved on since is refused (`STATE_MOVE_REFUSED`), never changed from where it is now.
   */
  update(table: string, id: Id, values: Record<string, unknown>, from?: string): Promise<Row>;
  remove(table: string, id: Id): Promise<void>;
  /**
   * A show saved with its days, types, acts and questions in one write; a new one when `id` is null. Each
   * list given is the whole list (a row left out goes); a list not given is left as it is.
   */
  saveEvent(id: Id | null, values: Record<string, unknown>, children: Partial<EventChildren>): Promise<Row>;
  /** Emails the box office writes into the outbox itself, one for each row given (a transfer reminder, tickets sent again). */
  mail(kind: string, rows: Record<string, unknown>[]): Promise<void>;
  /**
   * A message to a show's buyers: kept waiting in Messages, or sent now with its emails, one an order
   * (`to`). Sending claims the message first (waiting → sending, which a second sender is refused), writes
   * each email the message does not have yet, then marks it sent: a send that stops part-way is picked up
   * by sending it again, and nobody gets it twice.
   */
  broadcast(values: Record<string, unknown>, to: Record<string, unknown>[], send: boolean): Promise<Row>;
  /** A waiting message sent as it stands (its words changed first), or one that stopped part-way finished. */
  sendBroadcast(id: Id, values: Record<string, unknown>, to: Record<string, unknown>[]): Promise<Row>;

  /** The file types the box office's exports come in (absent: the screen writes a CSV itself). */
  exportFormats?(): string[];
  /** A poster uploaded as a public picture; its address (the demo keeps it in the browser). */
  uploadPoster?(file: File, eventId: Id | null): Promise<string>;
  /** Ends the box office's session (Adminium's own sign-out); the demo has none. */
  signOut?(): Promise<void>;
  /** A box-office order priced by Adminium, written nowhere. */
  quote(body: OrderBody): Promise<QuoteReply>;
  /** A phone order or comps: made held; `clientKey` makes a retry land on the same order. */
  newOrder(body: OrderBody, clientKey: string): Promise<OrderReply>;
  /** An order moved on by the box office (to the door, to waiting for a transfer, released, paid). */
  move(orderId: Id, status: string, values?: Record<string, unknown>, from?: string): Promise<Row>;
  /** Money recorded; `key` makes a retry of the same press land on the same payment, never a second one. */
  recordPayment(orderId: Id, amount: number, method: "bank_transfer" | "card" | "cash", note?: string | null, key?: string): Promise<Row>;
  recordRefund(orderId: Id, amount: number, method: "bank_transfer" | "card" | "cash", kind: "cancelled_tickets" | "goodwill", key?: string): Promise<Row>;
  /** Tickets cancelled (on a show with a waitlist, handed to it). */
  cancelTickets(ticketIds: Id[], cause: "box_office" | "request"): Promise<void>;
  declineRefund(ticketId: Id): Promise<Row>;
  /** The places back for a waitlist offered to the next people, strictly in joining order. */
  offerWaitlist(eventId: Id): Promise<Row[]>;
  /**
   * A show and its live orders cancelled, each order its own write (one moved on meanwhile is left for the
   * next run, which picks up where this one stopped); their cancellation emails are held until sent.
   */
  cancelShow(eventId: Id): Promise<void>;
}

export interface DoorPort {
  me(): Promise<StaffPerson>;
  config(): Promise<Config>;
  /** A code scanned or typed: its ticket, order and any check-in today; null for no such ticket. */
  find(code: string, eventDayId: Id): Promise<{ ticket: Row; order: Row; checkIn: Row | null } | null>;
  /** A ticket's door money taken (and the order paid when nothing is owed any more); a replay from the phone's offline list carries its time. */
  collect(ticketId: Id, method: "card" | "cash", deviceId: Id | null, occurredAt?: number): Promise<Row>;
  checkIn(ticketId: Id, eventDayId: Id, deviceId: Id | null, occurredAt?: number): Promise<Row>;
  undo(checkInId: Id): Promise<void>;
}
