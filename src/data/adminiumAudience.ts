/**
 * The audience's door into a real Adminium: the public API through the
 * venue's four browser keys, as `surface-config.json` serves them.
 *
 *   customer  the site's own key: the venue and its shows, what is left,
 *             buying, joining a waitlist or a reminder, signing in by an
 *             emailed link, and the signed-in person's own orders and tickets;
 *   link      the key an order's own link opens it by (`…/o#<code>`);
 *   confirm   a transfer checkout's emailed confirm link (`…/confirm#<code>`);
 *   ticket    a ticket sent to a friend (`…/t#<code>`).
 *
 * A session belongs to the key that opened it, so each key has its own
 * client, and the tab keeps each one's session across a reload (the client
 * hands it over; `sessionStorage` holds it). Every figure is Adminium's: a
 * price from its dry run, an order's number and total from its reply. A
 * refusal reaches the screens as an `ApiError` with the public API's code.
 */
import { createPublicClient, PublicApiError, type HeldSession, type PublicClient, type Row as ClientRow } from "@adminiumjs/public-client";

import type { AudiencePort, BankDoor, OrderWithTickets, Person, Venue } from "./ports.ts";
import { publicRefs, type Refs } from "./publicRefs.ts";
import { ApiError, type ClaimReply, type Config, type Id, type OrderBody, type OrderReply, type QuoteReply, type Row, type TypeLeft } from "./wire.ts";

export interface AudienceConfig {
  /** Where the public API is: `""` for this same origin. */
  baseUrl: string;
  /** The `customer` key. */
  publishableKey: string;
  /** The app's other browser keys, by what they open: `link`, `confirm`, `ticket`. */
  publicKeys?: Readonly<Record<string, string>>;
  /** The app's tables' real names by their short ones. */
  tables?: Readonly<Record<string, string>>;
  /** Whether an add-on that draws receipts is attached to the app (the hosted page's configuration says). */
  receipts?: boolean;
}

export interface AudienceOptions {
  fetch?: typeof fetch;
  storage?: Storage | null;
}

type Key = "customer" | "link" | "confirm" | "ticket";

const PAGE = 200;
/** The order states a person's own list shows (a checkout still open or let go is not an order yet). */
const LIVE_OR_PAST = ["door", "awaiting_transfer", "overdue", "no_charge", "paid", "offered", "released", "cancelled", "not_collected"];
/** The columns the public door answers as decimal strings, read as numbers here. */
const MONEY = new Set(["price", "subtotal", "discount", "adjusted", "total", "collected", "paid_in", "refunded", "balance", "due", "code_value", "live_price", "live_discount", "received", "owed_door", "owed_transfer", "owed_overdue"]);

/** A row as the screens read one: ids and money as numbers. */
export function rowOf(row: ClientRow): Row {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if ((k === "id" || k.endsWith("_id")) && typeof v === "string" && /^\d+$/.test(v)) out[k] = Number(v);
    // Money by its name, when it is a number: a message's `due` is a moment, a ticket's is money.
    else if (MONEY.has(k) && typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v)) out[k] = Number(v);
    else out[k] = v;
  }
  return out as Row;
}

/** The public client's refusal as the screens read one. */
export function asApiError(error: unknown): unknown {
  if (error instanceof PublicApiError) return new ApiError(error.status, error.code, { ...(error.params ?? {}) }, error.message);
  return error;
}

async function answer<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw asApiError(error);
  }
}

/** Every row of a list, a page at a time. */
async function all(client: PublicClient, ref: string, options: { code?: string } = {}): Promise<Row[]> {
  const rows: Row[] = [];
  for (let offset = 0; offset < 50 * PAGE; offset += PAGE) {
    const got = await client.list(ref, { limit: PAGE, offset, ...options });
    rows.push(...got.data.map(rowOf));
    if (got.data.length < PAGE) break;
  }
  return rows;
}

/** The tab's storage, or none (a private window, a test). */
function tabStorage(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

function keptSession(storage: Storage | null, key: Key): HeldSession | undefined {
  try {
    const raw = storage?.getItem(`wv.session.${key}`);
    if (raw === null || raw === undefined) return undefined;
    const s = JSON.parse(raw) as Partial<HeldSession>;
    return typeof s.token === "string" && typeof s.expiresAt === "number" && s.expiresAt > Date.now() ? (s as HeldSession) : undefined;
  } catch {
    return undefined;
  }
}
function keepSession(storage: Storage | null, key: Key, session: HeldSession | null): void {
  try {
    if (session === null) storage?.removeItem(`wv.session.${key}`);
    else storage?.setItem(`wv.session.${key}`, JSON.stringify(session));
  } catch {
    // storage refused: the session lasts as long as the page
  }
}

export class AdminiumAudience implements AudiencePort {
  private readonly clients: Partial<Record<Key, PublicClient>> = {};
  private readonly refs: Refs;
  /** The order this tab's own link (or a checkout it made) opened. */
  private openedId: Id | null = null;
  /** Each ticket's order, as last read: which door a change to it goes through. */
  private orderOfTicket = new Map<Id, Id>();
  /** The codes a show's page unlocked types with: sent when asking what is left. */
  private codes = new Map<Id, string>();
  /** The address the person signed in with, when Adminium cannot read their own row yet. */
  private signedAs: Person | null = null;
  private endedListeners: ((reason: string) => void)[] = [];
  /** Each key's browser key, for a download the page makes itself. */
  private readonly keys: Partial<Record<Key, string>> = {};
  private readonly fetchImpl: typeof fetch;
  private readonly receiptsOn: boolean;

  constructor(config: AudienceConfig, options: AudienceOptions = {}) {
    this.refs = publicRefs(config.tables);
    this.fetchImpl = options.fetch ?? ((input, init) => fetch(input, init));
    this.receiptsOn = config.receipts === true;
    const storage = options.storage === undefined ? tabStorage() : options.storage;
    const keys: Record<Key, string | undefined> = {
      customer: config.publishableKey,
      link: config.publicKeys?.["link"],
      confirm: config.publicKeys?.["confirm"],
      ticket: config.publicKeys?.["ticket"],
    };
    for (const key of Object.keys(keys) as Key[]) {
      const publishableKey = keys[key];
      if (publishableKey === undefined || publishableKey === "") continue;
      const kept = keptSession(storage, key);
      const client = createPublicClient({
        baseUrl: config.baseUrl,
        publishableKey,
        ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
        ...(kept === undefined ? {} : { session: kept }),
        onSessionChange: (session) => keepSession(storage, key, session),
        onSessionEnded: (reason) => {
          if (key === "customer") this.signedAs = null;
          for (const listener of this.endedListeners) listener(String(reason));
        },
        // The customer key's writes ask a person check: solved before sending rather than after a refusal.
        ...(key === "customer" ? { humanCheck: { refs: [this.refs.buy, this.refs.join, this.refs.remind], claim: true } } : {}),
      });
      if (client !== null) {
        this.clients[key] = client;
        this.keys[key] = publishableKey;
      }
    }
    if (this.clients.customer === undefined) throw new Error("the audience's pages need Adminium's address and the venue's browser key");
  }

  /** Called when a session this tab held was ended elsewhere (signed out everywhere, details deleted). */
  onSessionEnded(listener: (reason: string) => void): void {
    this.endedListeners.push(listener);
  }

  private get customer(): PublicClient {
    return this.clients.customer!;
  }
  private client(key: Key): PublicClient {
    const c = this.clients[key];
    if (c === undefined) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND", {}, `This venue opens nothing by a ${key} link.`);
    return c;
  }
  /** Whether a change to this order goes through its own link (the link this tab opened it by). */
  private byLink(orderId: Id | undefined): boolean {
    return this.clients.link !== undefined && this.openedId !== null && (orderId === undefined || String(orderId) === String(this.openedId));
  }
  private remember(tickets: Row[]): Row[] {
    for (const t of tickets) this.orderOfTicket.set(t.id, t["order_id"] as Id);
    return tickets;
  }

  // ── the venue ─────────────────────────────────────────────────────────────

  config(): Promise<Config> {
    return answer(async () => {
      const c = await this.customer.config();
      return { timezone: c.timezone, currency: c.currency ?? "", ...(c.now === undefined ? {} : { now: c.now }), receipts: this.receiptsOn };
    });
  }

  venue(): Promise<Venue> {
    return answer(async () => {
      const r = this.refs;
      const c = this.customer;
      const [settings, rooms, events, days, acts, times, types, questions] = await Promise.all([all(c, r.settings), all(c, r.rooms), all(c, r.events), all(c, r.days), all(c, r.acts), all(c, r.actTimes), all(c, r.types), all(c, r.questions)]);
      const timed = new Map(times.map((a) => [a.id, a]));
      return {
        settings: settings[0] ?? ({ id: 0 } as Row),
        rooms,
        events,
        days,
        // The acts by name, with their times once the show's set times are up.
        acts: acts.map((a) => ({ ...a, starts_at: timed.get(a.id)?.["starts_at"] ?? null, ends_at: timed.get(a.id)?.["ends_at"] ?? null, sets_published: timed.has(a.id) })),
        types,
        questions,
      };
    });
  }

  left(eventId: Id): Promise<TypeLeft[]> {
    return answer(async () => {
      const code = this.codes.get(eventId);
      const got = await this.customer.parentAvailability(this.refs.left, { under: String(eventId), ...(code === undefined ? {} : { code }) });
      return got.map((p) => ({
        ticket_type_id: Number(p.id),
        state: p.state === "on" ? "open" : p.state === "soldout" ? "sold_out" : "not_on_sale",
        ...(p.left === undefined ? {} : { left: p.left }),
      }));
    });
  }

  unlock(eventId: Id, code: string): Promise<Row[]> {
    return answer(async () => {
      const rows = (await all(this.customer, this.refs.codeTypes, { code })).filter((t) => t["event_id"] === eventId);
      if (rows.length > 0) this.codes.set(eventId, code);
      return rows;
    });
  }

  /** The person check is Adminium's, solved with each write that asks one: nothing to prove ahead. */
  async prove(): Promise<boolean> {
    return true;
  }

  // ── buying ────────────────────────────────────────────────────────────────

  private tree(body: OrderBody) {
    return { values: body.values as ClientRow, children: { tickets: body.tickets.map((t) => ({ values: t as unknown as ClientRow })) } };
  }

  quote(body: OrderBody): Promise<QuoteReply> {
    return answer(async () => {
      const got = await this.customer.quote(this.refs.buy, this.tree(body));
      return { data: rowOf(got.data), tickets: (got.children["tickets"] ?? []).map((c) => rowOf(c.data)) };
    });
  }

  buy(body: OrderBody, clientKey: string): Promise<OrderReply> {
    return answer(async () => {
      const write = this.tree(body);
      const got = await this.customer.createTree(this.refs.buy, {
        values: { ...write.values, client_key: clientKey },
        children: write.children,
        ...(body.expect === undefined ? {} : { expect: { total: String(body.expect.total) } }),
      });
      const data = rowOf(got.data);
      const tickets = this.remember((got.children["tickets"] ?? []).map((c) => rowOf(c.data)));
      // The order's own link: its session is open already on the link key, so its page needs no claim.
      if (got.link !== null && got.link.session !== null) {
        this.clients.link?.adoptSession({ token: got.link.session, expiresAt: got.link.expiresAt ?? Date.now() + 30 * 60_000 });
        this.openedId = data.id;
      }
      return {
        data,
        tickets,
        ...(got.replayed ? { replayed: true as const } : {}),
        ...(got.link === null || got.replayed ? {} : { link: { key: got.link.key, token: got.link.token } }),
      };
    });
  }

  // ── the order's own link, the confirm link ──────────────────────────────

  private async open(key: Key, token: string): Promise<void> {
    const opened = await this.client(key).openShared(token);
    if (opened === "unknown") throw new ApiError(404, "PUBLIC_REF_NOT_FOUND", {}, "Nothing opens with that link.");
    if (opened === "closed") throw new ApiError(410, "LINK_EXPIRED", {}, "That link no longer opens anything.");
  }

  openOrder(token: string): Promise<ClaimReply> {
    return answer(async () => {
      await this.open("link", token);
      const order = (await all(this.client("link"), this.refs.linkOrder))[0];
      if (order === undefined) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
      this.openedId = order.id;
      const held = this.client("link").session();
      return { session: "kept", expiresAt: held?.expiresAt ?? Date.now() + 30 * 60_000, name: (order["buyer_name"] as string | null) ?? null };
    });
  }

  order(): Promise<OrderWithTickets> {
    return answer(async () => {
      const link = this.client("link");
      if (!link.isClaimed()) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
      const order = (await all(link, this.refs.linkOrder))[0];
      if (order === undefined) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
      this.openedId = order.id;
      const tickets = this.remember((await all(link, this.refs.linkTickets)).filter((t) => t["order_id"] === order.id));
      return { order, tickets };
    });
  }

  choose(status: "door" | "confirming" | "no_charge" | "let_go", keep?: number, orderId?: Id): Promise<Row> {
    return answer(async () => {
      const viaLink = this.byLink(orderId);
      const client = viaLink ? this.client("link") : this.customer;
      const id = orderId ?? this.openedId;
      if (id === null) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
      // Claiming part of a waitlist offer: the places not wanted go back first, for the next in line.
      if (keep !== undefined) {
        const tickets = (await all(client, viaLink ? this.refs.linkTickets : this.refs.myTickets)).filter((t) => String(t["order_id"]) === String(id) && t["status"] === "valid");
        for (const t of tickets.slice(keep)) await client.update(viaLink ? this.refs.linkReturns : this.refs.myReturns, String(t.id), { status: "returned" });
      }
      return rowOf(await client.update(viaLink ? this.refs.linkOrder : this.refs.myOrders, String(id), { status }));
    });
  }

  confirmTransfer(token: string): Promise<Row> {
    return answer(async () => {
      const confirm = this.client("confirm");
      await this.open("confirm", token);
      const order = (await all(confirm, this.refs.confirmOrder))[0];
      if (order === undefined || order["status"] !== "confirming") throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
      return rowOf(await confirm.update(this.refs.confirmOrder, String(order.id), { status: "awaiting_transfer" }));
    });
  }

  openConfirm(token: string): Promise<Row> {
    return answer(async () => {
      await this.open("confirm", token);
      const order = (await all(this.client("confirm"), this.refs.confirmOrder))[0];
      if (order === undefined) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
      return order;
    });
  }

  bank(door: BankDoor): Promise<Row> {
    return answer(async () => {
      const [client, ref] = door === "link" ? [this.client("link"), this.refs.linkBank] : door === "confirm" ? [this.client("confirm"), this.refs.confirmBank] : [this.customer, this.refs.bank];
      if (!client.isClaimed()) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
      return (await all(client, ref))[0] ?? ({ id: 0 } as Row);
    });
  }

  // ── a ticket's changes ──────────────────────────────────────────────────

  /** The door a change to a ticket goes through: its order's own link, or the signed-in person. */
  private ticketDoor(ticketId: Id): { client: PublicClient; viaLink: boolean } {
    const orderId = this.orderOfTicket.get(ticketId);
    const viaLink = this.clients.link?.isClaimed() === true && this.openedId !== null && (orderId === undefined ? !this.customer.isClaimed() : String(orderId) === String(this.openedId));
    return { client: viaLink ? this.client("link") : this.customer, viaLink };
  }
  private changeTicket(ticketId: Id, values: ClientRow, refs: { link: string; mine: string }): Promise<Row> {
    return answer(async () => {
      const { client, viaLink } = this.ticketDoor(ticketId);
      return rowOf(await client.update(viaLink ? refs.link : refs.mine, String(ticketId), values));
    });
  }
  private get statusRefs() {
    return { link: this.refs.linkTickets, mine: this.refs.myTickets };
  }

  sendTicket(ticketId: Id, email: string, name: string): Promise<Row> {
    return this.changeTicket(ticketId, { status: "offered", pending_email: email.trim().toLowerCase(), pending_name: name }, this.statusRefs);
  }
  takeBack(ticketId: Id): Promise<Row> {
    return this.changeTicket(ticketId, { status: "valid", pending_email: null, pending_name: null }, this.statusRefs);
  }
  askRefund(ticketId: Id): Promise<Row> {
    return this.changeTicket(ticketId, { status: "refund_asked" }, this.statusRefs);
  }
  withdrawRefund(ticketId: Id): Promise<Row> {
    return this.changeTicket(ticketId, { status: "valid" }, this.statusRefs);
  }
  cancelTicket(ticketId: Id, toWaitlist = false): Promise<Row> {
    // On a show that keeps a waitlist the place goes to the next in line, never straight back on sale.
    if (toWaitlist) return this.changeTicket(ticketId, { status: "returned", cancel_cause: "buyer" }, { link: this.refs.linkReturns, mine: this.refs.myReturns });
    return this.changeTicket(ticketId, { status: "cancelled" }, { link: this.refs.linkCancels, mine: this.refs.myCancels });
  }
  nameTicket(ticketId: Id, name: string, answers?: Record<string, string> | null): Promise<Row> {
    return this.changeTicket(ticketId, { holder_name: name, ...(answers === undefined ? {} : { answers }) }, { link: this.refs.linkNames, mine: this.refs.myNames });
  }

  updateOrder(values: { answers?: Record<string, string> | null; access_note?: string | null; opt_in?: boolean }, orderId?: Id): Promise<Row> {
    return answer(async () => {
      const viaLink = this.byLink(orderId);
      const id = orderId ?? this.openedId;
      if (id === null) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
      return rowOf(await (viaLink ? this.client("link") : this.customer).update(viaLink ? this.refs.linkOrder : this.refs.myOrders, String(id), values as ClientRow));
    });
  }

  keep(orderId: Id): Promise<Row> {
    return answer(async () => {
      const viaLink = this.byLink(orderId);
      const now = await this.customer.now();
      return rowOf(await (viaLink ? this.client("link") : this.customer).update(viaLink ? this.refs.linkOrder : this.refs.myOrders, String(orderId), { kept_at: now.toISOString() }));
    });
  }

  // ── a ticket sent to a friend ───────────────────────────────────────────

  openTicket(token: string): Promise<Row> {
    return answer(async () => {
      await this.open("ticket", token);
      const row = (await all(this.client("ticket"), this.refs.ticket))[0];
      if (row === undefined) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
      return row;
    });
  }

  acceptTicket(token: string, name: string): Promise<Row> {
    return answer(async () => {
      const t = this.client("ticket");
      if (!t.isClaimed()) await this.open("ticket", token);
      const row = (await all(t, this.refs.ticket))[0];
      if (row === undefined || row["status"] !== "offered") throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
      await t.update(this.refs.ticket, String(row.id), { status: "valid", holder_name: name });
      // The reply hides what the accept renewed (the code): read the ticket again.
      return (await all(t, this.refs.ticket))[0] ?? row;
    });
  }

  // ── waitlists and reminders ─────────────────────────────────────────────

  joinWaitlist(eventId: Id, email: string, qty: number): Promise<Row> {
    return answer(async () => rowOf(await this.customer.create(this.refs.join, { event_id: eventId, email, qty })));
  }
  remindMe(eventId: Id, email: string, ticketTypeId: Id | null): Promise<Row> {
    return answer(async () => rowOf(await this.customer.create(this.refs.remind, { event_id: eventId, email, ticket_type_id: ticketTypeId, target: ticketTypeId === null ? "sale" : String(ticketTypeId) })));
  }
  myWaitlist(): Promise<Row[]> {
    return answer(() => all(this.customer, this.refs.myWaitlist));
  }
  leaveWaitlist(waitlistId: Id): Promise<Row> {
    return answer(async () => rowOf(await this.customer.update(this.refs.myWaitlist, String(waitlistId), { status: "left" })));
  }

  // ── signing in ──────────────────────────────────────────────────────────

  signIn(email: string): Promise<void> {
    return answer(async () => {
      await this.customer.requestLink({ email: email.trim() });
    });
  }

  verify(email: string, code: string): Promise<Person> {
    return answer(async () => {
      const got = await this.customer.verifyLinkCode({ email: email.trim(), code: code.replace(/\s/g, "") });
      if (!got.ok) throw new ApiError(403, "PUBLIC_CODE_WRONG", { tries: (got as { triesLeft?: number }).triesLeft ?? null });
      this.signedAs = { email: got.email ?? email.trim().toLowerCase(), name: null };
      return (await this.me()) ?? this.signedAs;
    });
  }

  openSignIn(token: string): Promise<Person> {
    return answer(async () => {
      const opened = await this.customer.openLink(token);
      if (!opened) throw new ApiError(410, "PUBLIC_CODE_EXPIRED");
      const me = await this.me();
      if (me === null) throw new ApiError(410, "PUBLIC_CODE_EXPIRED");
      return me;
    });
  }

  me(): Promise<Person | null> {
    return answer(async () => {
      if (!this.customer.isClaimed()) return null;
      try {
        const row = (await all(this.customer, this.refs.account))[0];
        if (row === undefined || row["email"] === null || row["email"] === undefined || row["email"] === "") return this.signedAs;
        this.signedAs = { email: String(row["email"]), name: (row["name"] as string | null) ?? null };
        return this.signedAs;
      } catch (error) {
        // A session that has ended reads as signed out; one Adminium cannot read the row of yet keeps the typed address.
        if (error instanceof PublicApiError && (error.code === "PUBLIC_REF_NOT_FOUND" || error.status === 404)) return null;
        if (error instanceof PublicApiError && error.status >= 500 && this.signedAs !== null) return this.signedAs;
        throw error;
      }
    });
  }

  signOut(): Promise<void> {
    return answer(async () => {
      for (const client of Object.values(this.clients)) if (client.isClaimed()) await client.signOut().catch(() => undefined);
      this.signedAs = null;
      this.openedId = null;
    });
  }

  /**
   * Signs out on every device. When Adminium does not take it (offline, too many requests, a fault), this
   * device is signed out all the same — the session dropped here whatever the server says — and the refusal
   * reaches the page, which says the other devices are still signed in.
   */
  signOutEverywhere(): Promise<void> {
    return answer(async () => {
      try {
        await this.customer.signOutEverywhere();
      } catch (error) {
        await this.customer.signOut().catch(() => undefined);
        throw error;
      } finally {
        for (const [key, client] of Object.entries(this.clients)) if (key !== "customer" && client.isClaimed()) await client.signOut().catch(() => undefined);
        this.signedAs = null;
        this.openedId = null;
      }
    });
  }

  forget(): Promise<void> {
    return answer(async () => {
      await this.customer.forgetMe();
      for (const [key, client] of Object.entries(this.clients)) if (key !== "customer" && client.isClaimed()) await client.signOut().catch(() => undefined);
      this.signedAs = null;
      this.openedId = null;
    });
  }

  myOrders(): Promise<{ orders: OrderWithTickets[]; held: Row[] }> {
    return answer(async () => {
      if (!this.customer.isClaimed()) throw new ApiError(404, "PUBLIC_REF_NOT_FOUND");
      const c = this.customer;
      const [orders, tickets, held] = await Promise.all([all(c, this.refs.myOrders), all(c, this.refs.myTickets), all(c, this.refs.heldTickets)]);
      this.remember(tickets);
      const mine = new Set(tickets.map((t) => t.id));
      return {
        orders: orders.filter((o) => LIVE_OR_PAST.includes(String(o["status"]))).map((order) => ({ order, tickets: tickets.filter((t) => t["order_id"] === order.id) })),
        // Tickets a friend sent them: those not of their own orders.
        held: held.filter((t) => !mine.has(t.id)),
      };
    });
  }

  receipt(orderId: Id): Promise<Blob> {
    return answer(async () => {
      const viaLink = this.byLink(orderId);
      const key: Key = viaLink ? "link" : "customer";
      const client = viaLink ? this.client("link") : this.customer;
      const drawn = await client.documents.render({ kind: "receipt", ref: viaLink ? this.refs.linkOrder : this.refs.myOrders, id: String(orderId) });
      // The bytes answer the session, which a plain link does not send: fetched here, saved by the page.
      const session = client.session()?.token;
      const res = await this.fetchImpl(client.documents.contentUrl(drawn.id), {
        headers: { authorization: `Bearer ${this.keys[key]!}`, ...(session === undefined ? {} : { "x-adminium-public-session": session }) },
      });
      if (!res.ok) throw new ApiError(res.status, "PUBLIC_DOCUMENT_UNAVAILABLE");
      return res.blob();
    });
  }

  myOrder(orderId: Id): Promise<OrderWithTickets> {
    return answer(async () => {
      const order = rowOf(await this.customer.get(this.refs.myOrders, String(orderId)));
      const tickets = this.remember((await all(this.customer, this.refs.myTickets)).filter((t) => t["order_id"] === order.id));
      return { order, tickets };
    });
  }
}
