/**
 * The add-ons this app works better with. It needs none: a show sells, its
 * money is kept straight and its door runs without any.
 *
 * Invoices & Receipts draws the receipt an order paid in full may be sent and
 * opened: it is offered ticked, and the receipt is the feature `receipts`.
 * Without it there is no receipt, and everything else is the same.
 *
 * The range names the add-ons' release that first prints each ticket's holder
 * under its line.
 */
import { l } from "./labels.ts";

export const ADD_ONS_RANGE = ">=1.0.6";

export const ADD_ONS = {
  suggests: [
    {
      key: "invoices",
      range: ADD_ONS_RANGE,
      checked: true,
      reason: l("Send a receipt with an order paid in full, and let the buyer open it from their order."),
    },
  ],
  features: [{ id: "receipts", label: l("Receipts"), requires: ["invoices"] }],
};
