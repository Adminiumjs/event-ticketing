/**
 * The DataSource seam.
 *
 * This app ships in demo mode: every read below returns the seeded fiction in
 * `demo.ts`, synchronously, with no network involved. The seam exists so that
 * pointing the app at a real Adminium deployment is a change to ONE file
 * rather than a rewrite — the screens and the store already talk to this
 * interface and never import `demo.ts` for data they render.
 *
 * That second implementation now exists: `adminiumSource.ts` reads a real
 * Adminium instance through `@adminiumjs/public-client` and is swapped in by
 * `main.tsx` before React mounts. `demoSource` remains the fallback whenever
 * either build-time env var is absent — which is the case for every
 * marketplace demo, and is why that fallback is structural rather than a catch.
 *
 * THREE READS MOVED HERE FROM `demo.ts` WHEN CONNECTED MODE LANDED, and each
 * was a real hole rather than tidying: `store.ts` imported the pinned clock and
 * the featured show slug straight from the seed, and `MyTickets.tsx` imported a
 * seeded buyer's e-mail. A connected build would have opened on a show that
 * does not exist, against a clock two months stale, offering to look up a
 * stranger's tickets — with the seam swapped and every row real.
 */

import { DEMO_BUYER, FEATURED, HOLDS, NEXT_SEQ, NOW, ORDERS, SHOWS, TICKETS } from "./demo.ts";
import type { Buyer, Hold, Order, Show, Ticket } from "./types.ts";

export interface DataSource {
  shows(): Show[];
  tickets(): Ticket[];
  orders(): Order[];
  holds(): Hold[];
  /** The next order number to mint, so a reload does not re-issue WV-8815. */
  nextOrderSeq(): number;
  /** The clock the whole app runs on, as an absolute minute. */
  now(): number;
  /** The show the site opens on. Null when there is nothing to open on. */
  featured(): string | null;
  /**
   * The buyer the wallet screen offers as a one-tap example, or null.
   *
   * Demo-only by construction: a connected deployment has real buyers with
   * real e-mail addresses, and pre-filling one of them on a public screen
   * would hand a stranger's tickets to whoever loaded the page.
   */
  exampleBuyer(): Buyer | null;
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
  now: () => NOW,
  featured: () => FEATURED,
  exampleBuyer: () => ({ ...DEMO_BUYER }),
};

let current: DataSource = demoSource;
let read = false;

/**
 * The source the app is currently wired to.
 *
 * An indirection rather than a re-export, because `state/store.ts` reads it at
 * MODULE SCOPE (the initial store state) — a re-exported binding would be
 * captured at import time and a later swap would change nothing.
 */
export const source: DataSource = {
  shows: () => ((read = true), current.shows()),
  tickets: () => ((read = true), current.tickets()),
  orders: () => ((read = true), current.orders()),
  holds: () => ((read = true), current.holds()),
  nextOrderSeq: () => ((read = true), current.nextOrderSeq()),
  now: () => ((read = true), current.now()),
  featured: () => ((read = true), current.featured()),
  exampleBuyer: () => ((read = true), current.exampleBuyer()),
};

/**
 * Swap the backing source. Must happen before any module-scope read.
 *
 * The tripwire is the whole reason this is a function and not an assignment:
 * the ordering it depends on is invisible, and getting it wrong fails SILENTLY
 * — the app renders demo data against a configured backend and looks fine. A
 * thrown error at boot is the only way that mistake announces itself.
 */
export function setDataSource(next: DataSource): void {
  if (read) {
    throw new Error(
      "setDataSource() called after the store already read — import App dynamically, after the snapshot resolves.",
    );
  }
  current = next;
}

/**
 * True once a real backend is behind the seam.
 *
 * Read by the demo dock, which resets the store, advances the clock and forces
 * card declines: against real rows those controls either lie or do damage, so
 * it does not render.
 */
export function isConnected(): boolean {
  return current !== demoSource;
}
