/**
 * The DataSource seam.
 *
 * This app ships in demo mode: every read below returns the seeded fiction in
 * `demo.ts`, synchronously, with no network involved. The seam exists so that
 * pointing the app at a real Adminium deployment is a change to ONE file
 * rather than a rewrite — the screens and the store already talk to this
 * interface and never import `demo.ts` for data they render.
 *
 * When `@adminium/manifest` lands (Phase B), a second implementation of
 * `DataSource` backed by `AdminiumDataSource` slots in here and `demoSource`
 * becomes the fallback used when no `adm_pub_` key is configured.
 */

import { HOLDS, NEXT_SEQ, ORDERS, SHOWS, TICKETS } from "./demo.ts";
import type { Hold, Order, Show, Ticket } from "./types.ts";

export interface DataSource {
  shows(): Show[];
  tickets(): Ticket[];
  orders(): Order[];
  holds(): Hold[];
  /** The next order number to mint, so a reload does not re-issue WV-8815. */
  nextOrderSeq(): number;
}

/**
 * Everything is copied on the way out, deeply enough that no caller can reach
 * back into the seed: the nested ticket types, hold lines and buyer records
 * are rebuilt rather than shared. That is what lets the demo reset cleanly
 * after a checkout has written a dozen new tickets into the store.
 */
export const demoSource: DataSource = {
  shows: () =>
    SHOWS.map((s) => ({
      ...s,
      art: [s.art[0], s.art[1]],
      lineup: [...s.lineup],
      types: s.types.map((t) => ({ ...t })),
    })),
  tickets: () => TICKETS.map((t) => ({ ...t, buyer: { ...t.buyer } })),
  orders: () =>
    ORDERS.map((o) => ({
      ...o,
      buyer: { ...o.buyer },
      tickets: [...o.tickets],
    })),
  holds: () => HOLDS.map((h) => ({ ...h, lines: h.lines.map((l) => ({ ...l })) })),
  nextOrderSeq: () => NEXT_SEQ,
};

/** The source the app is currently wired to. */
export const source: DataSource = demoSource;
