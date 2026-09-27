/**
 * The documents this app declares, drawn by Invoices & Receipts (the feature
 * `receipts`): a receipt for an order paid in full.
 *
 * Its number is the order's, its lines the order's live tickets with the
 * holder's name under each, and it says how the order was paid and when.
 */
import { l } from "./labels.ts";

export const DOCUMENTS = [
  {
    kind: "receipt",
    addOn: "invoices",
    table: "orders",
    feature: "receipts",
    name: l("Receipt"),
    mapping: {
      issuedAt: { column: "paid_at" },
      amount: { column: "total" },
      paidWith: { column: "paid_method" },
      reference: { column: "number" },
      customerName: { column: "buyer_name" },
    },
  },
];
