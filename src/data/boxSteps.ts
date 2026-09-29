/**
 * The box office's longer runs, as the port's own writes: a waitlist offer's share of what came back, and
 * a show's cancel — every live order, then its held emails, then its message — made so a run that stops
 * part-way (the person's rate limit, a dropped connection, a closed tab) is picked up where it stopped:
 * nothing is done twice, nothing is left undone, and the message is marked sent only at the very end.
 * The real Adminium's port and the demo's run the same steps.
 */
import type { BoxOfficePort } from "./ports.ts";
import { ApiError, isApiError, type Id, type PoolCount, type Row, type Where } from "./wire.ts";

/** The order states a show's cancel moves on: every order still holding places or money. */
export const CANCELS = ["held", "confirming", "offered", "door", "awaiting_transfer", "overdue", "no_charge", "paid"];
/** A show's cancellation emails, held until the box office sends them. */
export const CANCEL_KINDS = ["cancelled-paid", "cancelled-unpaid", "cancelled-holder"];
/** Every row, as one read brings them back (more is refused, never cut). */
const ALL = 20_000;
/** How many ids one `in` condition carries. */
const PART = 150;

/** How far a run has got: its stage, and how many of the stage's rows are done. */
export interface RunProgress {
  stage: "orders" | "emails";
  done: number;
  total: number;
}

async function allIn(port: BoxOfficePort, table: string, column: string, ids: Id[], where: Where[]): Promise<Row[]> {
  const out = new Map<Id, Row>();
  const sorted = [...new Set(ids)].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i += PART) {
    for (const r of (await port.list(table, { where: [{ column, in: sorted.slice(i, i + PART) }, ...where], limit: ALL })).rows) out.set(r.id, r);
  }
  return [...out.values()];
}

/** What a show's cancel still has to do: its live orders, its held emails, and its message (if written). */
export async function cancelLeft(port: BoxOfficePort, eventId: Id): Promise<{ orders: Row[]; emails: Row[]; message: Row | undefined }> {
  const orders = (await port.list("orders", { where: [{ column: "event_id", eq: eventId }, { column: "status", in: CANCELS }], sort: [{ column: "id" }], limit: ALL })).rows;
  const byShow = (await port.list("orders", { where: [{ column: "event_id", eq: eventId }, { column: "cancel_cause", eq: "show" }], limit: ALL })).rows.map((o) => o.id);
  const tickets = byShow.length === 0 ? [] : (await allIn(port, "tickets", "order_id", byShow, [])).map((t) => t.id);
  const held: Where[] = [{ column: "status", eq: "held" }, { column: "kind", in: CANCEL_KINDS }];
  const emails = new Map<Id, Row>();
  for (const m of [...(await allIn(port, "messages", "order_id", byShow, held)), ...(await allIn(port, "messages", "ticket_id", tickets, held))]) emails.set(m.id, m);
  const message = (await port.list("broadcasts", { where: [{ column: "event_id", eq: eventId }, { column: "template", eq: "cancelled" }], sort: [{ column: "id", desc: true }], limit: 1 })).rows[0];
  return { orders, emails: [...emails.values()].sort((a, b) => a.id - b.id), message };
}

/**
 * A show and its live orders cancelled, each order its own write (named in the state it was read in, so
 * one moved on meanwhile is left to the next run): its cancellation emails are held as the orders move,
 * until the box office sends them (`cancelRun` does both).
 */
export async function cancelShowOrders(port: BoxOfficePort, eventId: Id, progress?: (p: RunProgress) => void, wrote: () => void = () => undefined): Promise<void> {
  const show = (await port.list("events", { where: [{ column: "id", eq: eventId }], limit: 1 })).rows[0];
  if (show === undefined) return;
  if (show["status"] !== "cancelled") {
    await port.update("events", eventId, { status: "cancelled" }, String(show["status"]));
    wrote();
  }
  const live = (await port.list("orders", { where: [{ column: "event_id", eq: eventId }, { column: "status", in: CANCELS }], sort: [{ column: "id" }], limit: ALL })).rows;
  let done = 0;
  for (const order of live) {
    progress?.({ stage: "orders", done, total: live.length });
    try {
      await port.move(order.id, "cancelled", { cancel_cause: "show" }, String(order["status"]));
    } catch (error) {
      // Moved on by someone else meanwhile (paid, let go): the next run finds it again if it is still live.
      if (!isApiError(error) || error.code !== "STATE_MOVE_REFUSED") throw error;
    }
    done += 1;
    wrote();
  }
}

/**
 * A show cancelled, or its cancel finished: the show, then each live order (its cancellation email is
 * held as the order moves), then each held email released with the words typed, then the message marked
 * sent. The words are kept on the message first, so a run picked up later sends the same ones. `stopAfter`
 * (tests) stops the run after that many writes, as a closed tab would.
 */
export async function cancelRun(
  port: BoxOfficePort,
  eventId: Id,
  words: { subject: string; body: string },
  opts: { progress?: (p: RunProgress) => void; stopAfter?: number } = {},
): Promise<{ orders: number; emails: number }> {
  let writes = 0;
  const wrote = () => {
    writes += 1;
    if (opts.stopAfter !== undefined && writes >= opts.stopAfter) throw new Error("stopped");
  };
  const show = (await port.list("events", { where: [{ column: "id", eq: eventId }], limit: 1 })).rows[0];
  if (show === undefined) return { orders: 0, emails: 0 };
  if (show["status"] !== "cancelled") {
    await port.update("events", eventId, { status: "cancelled" }, String(show["status"]));
    wrote();
  }
  let left = await cancelLeft(port, eventId);
  // The words go on the message before any email: a run picked up later sends the same ones.
  let message = left.message;
  if (message === undefined) {
    message = await port.broadcast({ event_id: eventId, audience: "everyone", template: "cancelled", subject: words.subject, body: words.body, people: 0, order_count: 0 }, [], false);
    wrote();
  }
  const said = { subject: String(message["subject"] ?? words.subject), body: String(message["body"] ?? words.body) };
  // A message still waiting (a postponement's) would tell them the wrong thing now.
  for (const b of (await port.list("broadcasts", { where: [{ column: "event_id", eq: eventId }, { column: "status", eq: "waiting" }], limit: 50 })).rows) {
    if (b.id === message.id || b["template"] === "cancelled") continue;
    await port.remove("broadcasts", b.id);
    wrote();
  }
  // An order moved on meanwhile (paid at that moment) is found again and cancelled from where it is now.
  for (let pass = 0; pass < 3; pass += 1) {
    await cancelShowOrders(port, eventId, opts.progress, wrote);
    left = await cancelLeft(port, eventId);
    if (left.orders.length === 0) break;
  }
  if (left.orders.length > 0) throw new ApiError(409, "STATE_MOVE_REFUSED", { stillLive: left.orders.length });
  let done = 0;
  for (const m of left.emails) {
    opts.progress?.({ stage: "emails", done, total: left.emails.length });
    await port.update("messages", m.id, { status: "queued", subject_override: said.subject, body_override: said.body });
    done += 1;
    wrote();
  }
  const orders = (await port.list("orders", { where: [{ column: "event_id", eq: eventId }, { column: "cancel_cause", eq: "show" }], limit: ALL })).rows;
  const people = new Set(orders.map((o) => String(o["email"] ?? "").toLowerCase()).filter((e) => e !== "")).size;
  if (message["status"] !== "sent") await port.update("broadcasts", message.id, { people, order_count: orders.length, status: "sent" }, String(message["status"]));
  return { orders: orders.length, emails: left.emails.length };
}

/** Which order (and friend's ticket) an email of a message goes for: a message writes one each. */
export const recipientKey = (row: Record<string, unknown>): string => `${String(row["order_id"] ?? "")}:${String(row["ticket_id"] ?? "")}`;

/**
 * What a waitlist offer may hand out: the places back of each type, less those in offers already, never
 * more than a type's pool (or the show's) has free — a claim that kept its places could not hand the
 * waitlist's back, so the tickets back can outnumber them. `take(n)` draws up to n, type by type.
 */
export function offerPlan(returned: Row[], offered: Row[], pools: PoolCount[]): { take: (n: number) => Id[] } {
  const back = new Map<Id, number>();
  for (const t of returned) back.set(t["ticket_type_id"] as Id, (back.get(t["ticket_type_id"] as Id) ?? 0) + 1);
  for (const t of offered) if (back.has(t["ticket_type_id"] as Id)) back.set(t["ticket_type_id"] as Id, back.get(t["ticket_type_id"] as Id)! - 1);
  const show = pools.find((p) => p.ticket_type_id === null);
  let room = show === undefined ? Infinity : Math.max(0, show.left);
  const free = new Map<Id, number>();
  for (const [type, n] of [...back].sort((a, b) => b[1] - a[1] || a[0] - b[0])) {
    const pool = pools.find((p) => p.ticket_type_id === type);
    free.set(type, Math.max(0, Math.min(n, pool === undefined ? n : pool.left)));
  }
  return {
    take: (n: number) => {
      const out: Id[] = [];
      for (const [type, left] of free) {
        while (out.length < n && room > 0 && (free.get(type) ?? 0) > 0) {
          out.push(type);
          free.set(type, free.get(type)! - 1);
          room -= 1;
        }
        void left;
      }
      return out;
    },
  };
}
