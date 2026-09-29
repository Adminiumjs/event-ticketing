/**
 * The venue's emails to its audience: the `messages` table is the outbox, and
 * every email is a row in it the dashboard lists. One email goes per order,
 * to the order's buyer; a ticket sent to a friend and accepted also has its
 * holder told what a buyer is told about the show.
 *
 *   tickets                the order is confirmed to pay at the door or at no
 *                          charge: the tickets, each with its code and QR;
 *   tickets-paid           paid by card or cash before any email carried the
 *                          tickets (at the box office, or an unpaid transfer
 *                          settled there);
 *   transfer-confirm       the buyer chose a bank transfer: the confirm link,
 *                          emailed only here (the order waits for it);
 *   transfer-confirm-offer the same for a waitlist offer claimed by transfer,
 *                          by the offer's own end;
 *   transfer-waiting       the order waits for the transfer: the bank details
 *                          and the day it is due by;
 *   transfer-released      the transfer never came: the tickets went back;
 *   payment-received       the transfer came: the tickets (never to an order
 *                          whose tickets went out when it chose the door);
 *   friend-offer           a ticket sent to a friend: the link that accepts it;
 *   friend-ready           the friend accepted: their own ticket and code;
 *   friend-returned        nobody accepted in time: the ticket is the buyer's again;
 *   waitlist-offer         tickets are back for someone on the waitlist;
 *   on-sale                a reminder before a sale opens;
 *   on-sale-presale        a reminder before a presale opens, at its own time;
 *   cancelled-paid/-unpaid the show is cancelled (held until the box office
 *                          sends them), with or without money to give back;
 *   cancelled-holder       the same, to a friend holding one of the tickets;
 *   tonight / tomorrow     the running order before the show: at noon on the
 *                          day, or at 18:00 the evening before a daytime show
 *                          (never to an order with no ticket left, nor to a
 *                          friend holding a ticket of an order that is gone);
 *   refund-recorded        money given back, one email for each refund;
 *   tickets-cancelled      the box office cancelled tickets, or a refund request
 *                          was approved, or the buyer cancelled unpaid ones;
 *   refund-declined        a refund request was declined.
 *
 * Messages the box office writes itself — a transfer reminder, the tickets or
 * the confirm link sent again, a moved show (with the words it typed), a
 * message to a show's buyers, a new holder set by hand — are rows it adds to
 * the outbox, with the kind that picks their template. A friend holding a
 * ticket gets their own copy of a moved show or a message (`moved-holder`,
 * `broadcast-holder`): linked to the ticket and to the friend as the customer,
 * so it goes to the friend's own address and opens their ticket.
 *
 * The log is the dedupe: a kind already queued or sent for the same row is
 * not queued again — except a ticket sent to a friend, emailed once per send,
 * and one that came back, told each time. Every email waits while its switch
 * in Settings is off where it has one.
 */

export const KINDS = [
  "tickets",
  "tickets-paid",
  "transfer-confirm",
  "transfer-confirm-offer",
  "transfer-waiting",
  "transfer-reminder",
  "transfer-released",
  "payment-received",
  "friend-offer",
  "friend-ready",
  "friend-returned",
  "holder-set",
  "waitlist-offer",
  "on-sale",
  "on-sale-presale",
  "moved",
  "moved-holder",
  "cancelled-paid",
  "cancelled-unpaid",
  "cancelled-holder",
  "tonight",
  "tomorrow",
  "tonight-holder",
  "tomorrow-holder",
  "refund-recorded",
  "tickets-cancelled",
  "refund-declined",
  "broadcast",
  "broadcast-holder",
] as const;
export type Kind = (typeof KINDS)[number];

const onOrder = (column: string, to: unknown, where?: Record<string, unknown>) => ({
  onChange: { table: "orders", column, to, ...(where === undefined ? {} : { where }) },
});
const onTicket = (column: string, to: unknown, where?: Record<string, unknown>) => ({
  onChange: { table: "tickets", column, to, ...(where === undefined ? {} : { where }) },
});
const byOrder = { link: "order_id" };
const byTicket = { link: "ticket_id" };
/** A friend's ticket, to the friend it is sent to or held by. */
const toPending = { recipient: { column: "pending_email", name: "pending_name" } };
const toHolder = { recipient: { column: "holder_email", name: "holder_name" } };
const accepted = { column: "holder_customer_id", isNull: false };
const TONIGHT = { gate: { setting: { table: "settings", column: "tonight_email_on" } } };
/** The orders that will not come to the show. */
const ORDER_GONE = ["cancelled", "released", "let_go", "expired", "not_collected"];
/** An order that will not come to the show, or has no ticket left: its waiting reminder is dropped. */
const GONE = [
  { column: "status", in: ORDER_GONE, reason: "no-longer-needed" },
  { column: "ticket_count", lte: 0, reason: "no-longer-needed" },
];
/** A ticket gone, or its order gone (a show cancelled moves the orders, not the tickets): the friend's reminder is dropped. */
const TICKET_GONE = [
  { column: "status", in: ["cancelled", "returned", "released"], reason: "no-longer-needed" },
  { column: "order_status", in: ORDER_GONE, reason: "no-longer-needed" },
];
const CONFIRMED = ["door", "no_charge", "paid"];

export const OUTBOX = {
  table: "messages",
  columns: {
    kind: "kind",
    status: "status",
    to: "to_address",
    language: "language",
    due: "due",
    sentAt: "sent_at",
    error: "error",
    skipReason: "skip_reason",
    repeatKey: "repeat_key",
    subjectOverride: "subject_override",
    bodyOverride: "body_override",
    approvedBy: "approved_by",
  },
  links: {
    order: "order_id",
    ticket: "ticket_id",
    customer: "customer_id",
    event: "event_id",
    waitlist: "waitlist_id",
    reminder: "reminder_id",
    refund: "refund_id",
    broadcast: "broadcast_id",
  },
  recipient: {
    via: "customer_id",
    table: "customers",
    email: "email",
    name: "name",
    // An order nobody signed in for carries its own details, and its language.
    fallback: { via: "order_id", email: "email", name: "buyer_name", language: "language" },
  },
  settings: { table: "settings", name: "venue_name" },
  // An order's own link opens it on the audience site; its code rides the fragment.
  pages: { manage: "/o", booking: "/" },
  kinds: Object.fromEntries(KINDS.map((kind) => [kind, `events-${kind}`])),
  producers: [
    { kind: "tickets", ...byOrder, ...onOrder("status", ["door", "no_charge"]) },
    // Paid: the tickets, once, by what the buyer has not had yet (`paid_email`): an order that chose the door had them then.
    { kind: "tickets-paid", ...byOrder, ...onOrder("status", "paid", { column: "paid_email", eq: 1 }) },
    { kind: "transfer-confirm", ...byOrder, ...onOrder("status", "confirming", { column: "waitlist_id", isNull: true }) },
    // A waitlist offer claimed by transfer is confirmed by the offer's own end, which is when it runs out.
    { kind: "transfer-confirm-offer", ...byOrder, ...onOrder("status", "confirming", { column: "waitlist_id", isNull: false }) },
    { kind: "transfer-waiting", ...byOrder, ...onOrder("status", "awaiting_transfer") },
    { kind: "transfer-released", ...byOrder, ...onOrder("status", "released") },
    { kind: "payment-received", ...byOrder, ...onOrder("status", "paid", { column: "paid_email", eq: 2 }) },
    { kind: "waitlist-offer", ...byOrder, ...onOrder("status", "offered") },
    // The show's cancellation, held until the box office sends it: the cause is written with the move.
    { kind: "cancelled-paid", ...byOrder, hold: true, ...onOrder("cancel_cause", "show", { column: "cancel_email", eq: 1 }) },
    { kind: "cancelled-unpaid", ...byOrder, hold: true, ...onOrder("cancel_cause", "show", { column: "cancel_email", eq: 2 }) },
    { kind: "cancelled-holder", ...byTicket, ...toHolder, hold: true, ...onTicket("order_cancel_cause", "show", accepted) },
    // Before the show: at noon on the day, or at 18:00 the evening before doors earlier than 16:00.
    { kind: "tonight", ...byOrder, ...TONIGHT, due: { date: "doors_at", days: 0, at: "12:00" }, dropWhen: GONE, ...onOrder("status", CONFIRMED, { column: "eve_email", eq: false }) },
    { kind: "tomorrow", ...byOrder, ...TONIGHT, due: { date: "eve_at", days: 0, at: "18:00" }, dropWhen: GONE, ...onOrder("status", CONFIRMED, { column: "eve_email", eq: true }) },
    { kind: "tonight-holder", ...byTicket, ...toHolder, ...TONIGHT, due: { date: "doors_at", days: 0, at: "12:00" }, dropWhen: TICKET_GONE, ...onTicket("holder_reminder", 1) },
    { kind: "tomorrow-holder", ...byTicket, ...toHolder, ...TONIGHT, due: { date: "eve_at", days: 0, at: "18:00" }, dropWhen: TICKET_GONE, ...onTicket("holder_reminder", 2) },
    // Sent to a friend, accepted by them, or back with the buyer.
    { kind: "friend-offer", ...byTicket, ...toPending, repeatBy: "link_token", ...onTicket("status", "offered") },
    { kind: "friend-ready", ...byTicket, ...toHolder, ...onTicket("status", "valid", accepted) },
    { kind: "friend-returned", ...byTicket, repeat: true, ...onTicket("lapsed", true) },
    { kind: "refund-declined", ...byTicket, ...onTicket("status", "valid", { column: "refund_declined_at", isNull: false }) },
    // A ticket the box office cancelled, a refund request approved, unpaid tickets the buyer cancelled: one email an order.
    {
      kind: "tickets-cancelled",
      link: "order_id",
      batchMinutes: 2,
      onChange: { table: "tickets", via: "order_id", column: "cancel_cause", to: ["box_office", "request", "buyer"] },
    },
    // One email for each refund, saying its own amount: the refund is what the message is about (its order is linked too).
    { kind: "refund-recorded", link: "refund_id", onCreate: { table: "refunds", where: { column: "voided", eq: false } } },
    // An hour (by default) before a sale opens, and before a presale.
    {
      kind: "on-sale",
      link: "reminder_id",
      before: {
        table: "reminders",
        at: "on_sale_at",
        lead: { via: "event_id", table: "events", column: "remind_lead_hours", fallback: { table: "settings", column: "remind_lead_hours" }, max: 24 },
        where: { column: "target", eq: "sale" },
      },
    },
    {
      kind: "on-sale-presale",
      link: "reminder_id",
      before: {
        table: "reminders",
        at: "type_sales_start",
        lead: { via: "event_id", table: "events", column: "remind_lead_hours", fallback: { table: "settings", column: "remind_lead_hours" }, max: 24 },
        where: { column: "ticket_type_id", isNull: false },
      },
    },
  ],
};
