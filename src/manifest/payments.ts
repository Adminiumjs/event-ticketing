/**
 * Paying online, through Adminium's pay page.
 *
 * An order is paid online from the checkout ("Pay now", beside the door and
 * the transfer), from a waitlist offer's checkout, and by a pay link the box
 * office copies for an order that still owes money. The page never sends an
 * amount: Adminium reads the order's own total and what is still owed.
 *
 *   - The checkout moves to `paying` and keeps its hold: the places count by
 *     that state, and the clock lets them go at the hold's end unless a
 *     payment is landing then. A payment that lands writes a row in
 *     `payments` (method `online`, its reference and service, written by
 *     Adminium alone) and moves the order to `paid`, which sends the tickets.
 *   - Only ways that settle at once: a bank debit that takes days would keep
 *     places off sale for nothing, and a buyer close to the show would have
 *     no code at the door.
 *   - Refunds are rows of `refunds`: the box office writes one (method
 *     `online`, naming the payment), and Adminium sends the money back and
 *     writes where it stands. Writing one needs the right to give refunds.
 *     A paid order cancelled by someone who holds that right, or by the clock,
 *     is refunded in full by itself, while the venue's "Refund free
 *     cancellations automatically" is on; otherwise it shows "Refund owed".
 *
 * Nothing here switches payments on: someone who manages payments does that
 * in Adminium, and until then every screen reads as it always has.
 */
import { PAYABLE_ORDER, setting } from "./tables.ts";

/** Where the pay page sends the buyer back: the order's own page, which finds the order this tab was paying. */
export const RETURN_TO = "/o";

export const PAYMENTS = {
  payables: [
    {
      table: "orders",
      label: "number",
      amount: { column: "total" },
      currency: { connection: true },
      due: { column: "balance" },
      payments: {
        kind: "table",
        table: "payments",
        link: "order_id",
        amount: "amount",
        paidAt: "recorded_at",
        method: { column: "method", values: { "*": "online" } },
        voided: "voided",
        reference: "payment_ref",
        provider: "provider",
        currency: "currency",
        refundedElsewhere: "refunded_elsewhere",
      },
      // A payment taken online says so: the order reads "Paid · Online", whatever way it was to be paid before.
      status: { column: "status", paid: "paid", from: PAYABLE_ORDER, set: { paid_method: "online" } },
      customerEmail: "email",
      payableWhen: [{ column: "status", in: PAYABLE_ORDER }],
      returnTo: RETURN_TO,
      receipt: "engine",
      // The checkout shows the door and the transfer itself.
      onlyOnline: true,
      instantOnly: true,
      refunds: {
        model: "rows",
        table: "refunds",
        payment: "payment_id",
        amount: "amount",
        when: [{ column: "method", eq: "online" }],
        providerRef: "provider_ref",
        state: "refund_state",
        openIn: "/",
        auto: { values: { method: "online", kind: "cancelled_tickets" } },
      },
      refundOn: {
        moves: [{ from: ["paid"], to: "cancelled", by: ["system", "refund-right"] }],
        switch: setting("auto_refund"),
      },
    },
  ],
};
