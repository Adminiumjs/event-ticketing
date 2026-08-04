/**
 * The app's single store.
 *
 * Deliberately one zustand store rather than several: the home grid, the event
 * page, the checkout, the organizer's sales panel and the door all read the
 * same three lists — shows, tickets, holds — and splitting them would mean
 * keeping several copies of the inventory in step. Everything derived
 * (remaining, on-sale state, the door count) is computed in `lib/tickets.ts`
 * at render time, never stored.
 *
 * THE CLOCK lives here as an integer count of absolute minutes, seeded from
 * `NOW`. `nowMinutes()` adds the seconds ticked since the last whole minute,
 * which is the ONLY moving time in the app — and it moves because a hold is
 * counting down, not because anybody read `Date.now()`. Advancing the demo
 * folds those seconds back into the minute so the two can never drift apart.
 *
 * The seed is copied in through the DataSource seam on creation, so the demo
 * can be reset without reloading and `data/demo.ts` stays an immutable
 * description of the fiction rather than mutable app state.
 */

import { create } from "zustand";

import { FEATURED, NOW } from "../data/demo.ts";
import { source } from "../data/source.ts";
import type {
  Hold,
  Order,
  Persona,
  Show,
  Ticket,
  Toast,
  View,
} from "../data/types.ts";
import { t } from "../i18n/ambient.ts";
import { label } from "../lib/format.ts";
import { clock as fmtClock } from "../lib/format.ts";
import {
  checkInVerdict,
  createHold,
  checkoutOrder,
  doorsAt,
  holdQty,
  holdSecondsLeft,
  nextDoors,
  showById,
  typeById,
  type CheckInVerdict,
} from "../lib/tickets.ts";

const THEME_KEY = "event-ticketing-theme";

export type Theme = "light" | "dark";

interface State {
  /* --- routing + persona --- */
  view: View;
  persona: Persona;
  /** Which show the attendee is looking at. */
  showId: string;
  /** Which show the organizer's three tabs are pointed at. */
  orgShowId: string;

  /* --- chrome --- */
  theme: Theme;
  navOpen: boolean;
  switcherOpen: boolean;
  dockOpen: boolean;
  /** True while any overlay owns a corner, so the dock steps aside. */
  overlayOpen: boolean;

  /* --- the clock --- */
  /** Absolute minutes. Whole; the seconds live next door. */
  clock: number;
  /** Seconds ticked since `clock`, moved only while a hold is counting down. */
  tickSeconds: number;

  /* --- data --- */
  shows: Show[];
  tickets: Ticket[];
  orders: Order[];
  holds: Hold[];
  nextSeq: number;

  /* --- the attendee's session --- */
  /** Stepper quantities on the event page, keyed by ticket-type id. */
  quantities: Record<string, number>;
  /** Set when a hold ran out under the reader, so checkout can say so. */
  holdExpired: boolean;
  buyerName: string;
  buyerEmail: string;
  /** Optional per-ticket names, positional against the hold's lines. */
  attendeeNames: string[];
  lastOrder: Order | null;
  lookupEmail: string;
  /** The address the reader actually submitted, or null before they have. */
  lookedUp: string | null;

  /* --- the organizer's session --- */
  attendeeQuery: string;
  doorCode: string;
  verdict: CheckInVerdict | null;

  toasts: Toast[];

  /* --- actions --- */
  go: (view: View) => void;
  openShow: (id: string) => void;
  setPersona: (p: Persona) => void;
  initTheme: () => void;
  toggleTheme: () => void;
  setNavOpen: (open: boolean) => void;
  setSwitcherOpen: (open: boolean) => void;
  setDockOpen: (open: boolean) => void;

  nowMinutes: () => number;
  advanceToDoors: () => void;
  tickHold: () => void;

  setQuantity: (ttId: string, qty: number) => void;
  startHold: () => void;
  releaseHold: () => void;
  myHold: () => Hold | null;

  setBuyerName: (v: string) => void;
  setBuyerEmail: (v: string) => void;
  setAttendeeName: (index: number, v: string) => void;
  placeOrder: () => void;

  setLookupEmail: (v: string) => void;
  lookup: () => void;

  setOrgShow: (id: string) => void;
  setAttendeeQuery: (v: string) => void;
  setDoorCode: (v: string) => void;
  scan: (code?: string) => void;
  clearVerdict: () => void;

  toast: (text: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
  escape: () => void;
  reset: () => void;
}

let toastSeq = 0;
let holdSeq = 0;

/** Fresh copies of everything the seam hands out — the shape `reset` restores. */
function seeded() {
  return {
    shows: source.shows(),
    tickets: source.tickets(),
    orders: source.orders(),
    holds: source.holds(),
    nextSeq: source.nextOrderSeq(),
  };
}

const SEED = seeded();

export const useStore = create<State>((set, get) => ({
  view: "home",
  persona: "attendee",
  showId: FEATURED,
  orgShowId: FEATURED,

  theme: "light",
  navOpen: false,
  switcherOpen: false,
  dockOpen: true,
  overlayOpen: false,

  clock: NOW,
  tickSeconds: 0,

  ...SEED,

  quantities: {},
  holdExpired: false,
  buyerName: "",
  buyerEmail: "",
  attendeeNames: [],
  lastOrder: null,
  lookupEmail: "",
  lookedUp: null,

  attendeeQuery: "",
  doorCode: "",
  verdict: null,

  toasts: [],

  /**
   * Every view change scrolls back to the top (house layout rule 3) and closes
   * the mobile nav, so a reader arriving at checkout lands on its header
   * rather than halfway down the event page they came from.
   */
  go: (view) => {
    set({ view, navOpen: false, switcherOpen: false, overlayOpen: false });
    window.scrollTo({ top: 0, behavior: "auto" });
  },

  openShow: (id) => {
    /* The stepper is per-show state; carrying it across would offer somebody
     * three Balcony tickets for a room that has no balcony. */
    set({
      view: "event",
      showId: id,
      quantities: {},
      navOpen: false,
      switcherOpen: false,
      overlayOpen: false,
    });
    window.scrollTo({ top: 0, behavior: "auto" });
  },

  /*
   * Switching persona lands on that persona's home view rather than keeping
   * the current one: an organizer arriving on somebody's checkout would be
   * looking at a stranger's card details.
   */
  setPersona: (persona) => {
    set({
      persona,
      view: persona === "organizer" ? "sales" : "home",
      navOpen: false,
      switcherOpen: false,
      overlayOpen: false,
      verdict: null,
    });
    window.scrollTo({ top: 0, behavior: "auto" });
  },

  initTheme: () => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch {
      // Storage disabled — fall back to the OS preference.
    }
    const prefersDark =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme: Theme =
      stored === "dark" || stored === "light" ? stored : prefersDark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },

  toggleTheme: () => {
    const theme: Theme = get().theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Not remembering the choice is not a reason to refuse it.
    }
    set({ theme });
  },

  setNavOpen: (navOpen) => set({ navOpen, overlayOpen: navOpen }),
  setSwitcherOpen: (switcherOpen) => set({ switcherOpen, overlayOpen: switcherOpen }),
  setDockOpen: (dockOpen) => set({ dockOpen }),

  /** The single "now" every screen and every engine call is given. */
  nowMinutes: () => get().clock + get().tickSeconds / 60,

  /**
   * The dock's one piece of time travel. It jumps to the next show's doors,
   * which flips three things at once: on-sale states move, every hold that
   * expired in between is released, and door check-in opens — because it
   * opened thirty minutes before the minute we just landed on.
   */
  advanceToDoors: () => {
    const s = get();
    const now = s.nowMinutes();
    const show = nextDoors(s.shows, now);
    if (show === null) {
      s.toast(t("chrome.toast.noDoors"), "info");
      return;
    }

    const target = doorsAt(show);
    const mineLost = s.holds.some((h) => h.mine && h.expiresAt <= target);
    const kept = s.holds.filter((h) => h.expiresAt > target);

    set({
      clock: target,
      tickSeconds: 0,
      holds: kept,
      holdExpired: mineLost || s.holdExpired,
      orgShowId: show.id,
      verdict: null,
      switcherOpen: false,
      overlayOpen: false,
    });

    s.toast(
      t("chrome.toast.advanced", { when: fmtClock(target), show: show.name }),
      "info",
    );
    if (mineLost) s.toast(t("chrome.toast.holdExpired"), "warn");
  },

  /**
   * One second of a live hold. Called from an interval in `<App>` only while
   * the reader is holding something, so the rest of the demo sits still: a
   * pinned clock that quietly drifts is worse than one that never moves.
   */
  tickHold: () => {
    const s = get();
    const hold = s.myHold();
    if (hold === null) return;

    const next = s.tickSeconds + 1;
    if (holdSecondsLeft(hold, s.clock + next / 60) > 0) {
      set({ tickSeconds: next });
      return;
    }

    /* Out of time. The hold is dropped, the counts it was suppressing come
     * back on their own, and the seconds fold into the minute. */
    set({
      clock: Math.floor(s.clock + next / 60),
      tickSeconds: 0,
      holds: s.holds.filter((h) => !h.mine),
      holdExpired: true,
    });
    s.toast(t("chrome.toast.holdExpired"), "warn");
  },

  setQuantity: (ttId, qty) =>
    set({ quantities: { ...get().quantities, [ttId]: Math.max(0, qty) } }),

  myHold: () => get().holds.find((h) => h.mine) ?? null,

  /**
   * Start the ten-minute hold and go straight to checkout. The refusal cases
   * come back from the engine as a shape rather than a sentence, so the copy
   * lives in the string bundle and the engine stays translatable.
   */
  startHold: () => {
    const s = get();
    const show = showById(s.shows, s.showId);
    if (show === null) return;

    holdSeq += 1;
    const result = createHold(
      show,
      s.quantities,
      s.tickets,
      s.holds,
      s.nowMinutes(),
      `H-MINE-${holdSeq}`,
    );

    if (!result.ok) {
      const typeName = (id: string): string =>
        label(typeById(show, id)?.name ?? id);
      const message =
        result.reason === "empty"
          ? t("chrome.refuse.empty")
          : result.reason === "overCap"
            ? t("chrome.refuse.overCap", { max: result.max })
            : result.reason === "notOnSale"
              ? t("chrome.refuse.notOnSale", { type: typeName(result.ttId) })
              : t("chrome.refuse.notEnough", {
                  count: result.available,
                  type: typeName(result.ttId),
                });
      s.toast(message, "warn");
      return;
    }

    const count = holdQty(result.hold);
    set({
      holds: [...s.holds, result.hold],
      holdExpired: false,
      attendeeNames: Array.from({ length: count }, () => ""),
      view: "checkout",
      switcherOpen: false,
      overlayOpen: false,
    });
    window.scrollTo({ top: 0, behavior: "auto" });
    s.toast(t("chrome.toast.holdStarted", { count }, count), "pos");
  },

  releaseHold: () => {
    const s = get();
    set({
      holds: s.holds.filter((h) => !h.mine),
      holdExpired: false,
      quantities: {},
      attendeeNames: [],
      view: "event",
      tickSeconds: 0,
      clock: Math.floor(s.nowMinutes()),
    });
    window.scrollTo({ top: 0, behavior: "auto" });
    s.toast(t("chrome.toast.holdReleased"), "info");
  },

  setBuyerName: (buyerName) => set({ buyerName }),
  setBuyerEmail: (buyerEmail) => set({ buyerEmail }),
  setAttendeeName: (index, value) =>
    set({
      attendeeNames: get().attendeeNames.map((n, i) => (i === index ? value : n)),
    }),

  /**
   * Convert the hold into issued tickets. The hold is consumed rather than
   * left to expire: its quantities become sold, and `remaining` does not move,
   * which is the invariant the whole inventory model rests on.
   */
  placeOrder: () => {
    const s = get();
    const hold = s.myHold();
    const show = hold === null ? null : showById(s.shows, hold.evId);
    if (hold === null || show === null) return;

    const name = s.buyerName.trim();
    const email = s.buyerEmail.trim();
    if (name.length === 0 || email.length === 0) {
      s.toast(t("chrome.refuse.needBuyer"), "warn");
      return;
    }

    const { order, tickets, nextSeq } = checkoutOrder(
      hold,
      show,
      { name, email },
      s.attendeeNames,
      s.nextSeq,
      s.nowMinutes(),
    );

    set({
      tickets: [...s.tickets, ...tickets],
      orders: [...s.orders, order],
      holds: s.holds.filter((h) => !h.mine),
      nextSeq,
      lastOrder: order,
      quantities: {},
      holdExpired: false,
      tickSeconds: 0,
      clock: Math.floor(s.nowMinutes()),
      /* Pre-fill the lookup so My tickets works without retyping the address. */
      lookupEmail: email,
      lookedUp: email,
      view: "confirm",
    });
    window.scrollTo({ top: 0, behavior: "auto" });
    s.toast(t("chrome.toast.orderPlaced", { order: order.code }), "pos");
  },

  setLookupEmail: (lookupEmail) => set({ lookupEmail }),
  lookup: () => set({ lookedUp: get().lookupEmail.trim() }),

  setOrgShow: (id) => {
    set({
      orgShowId: id,
      verdict: null,
      doorCode: "",
      attendeeQuery: "",
      switcherOpen: false,
      overlayOpen: false,
    });
    window.scrollTo({ top: 0, behavior: "auto" });
  },

  setAttendeeQuery: (attendeeQuery) => set({ attendeeQuery }),
  setDoorCode: (doorCode) => set({ doorCode }),

  /**
   * Scan a code against the show the organizer is pointed at. The engine
   * returns the verdict; applying it — stamping the check-in time — is this
   * store's job, which is what keeps the door count derivable from the ticket
   * list rather than kept alongside it.
   */
  scan: (code) => {
    const s = get();
    const now = s.nowMinutes();
    const raw = code ?? s.doorCode;
    const verdict = checkInVerdict(raw, s.orgShowId, s.tickets, now);

    if (verdict.kind === "empty") return;

    if (verdict.kind === "checkedIn") {
      set({
        tickets: s.tickets.map((ticket) =>
          ticket.code === verdict.code
            ? { ...ticket, checkedInAt: Math.floor(now) }
            : ticket,
        ),
        verdict,
        doorCode: "",
      });
      s.toast(t("chrome.toast.checkedIn", { name: verdict.holder }), "pos");
      return;
    }

    set({ verdict, doorCode: "" });
    s.toast(
      verdict.kind === "alreadyCheckedIn"
        ? t("chrome.toast.alreadyIn")
        : verdict.kind === "wrongShow"
          ? t("chrome.toast.wrongShow")
          : t("chrome.toast.unknownCode"),
      verdict.kind === "alreadyCheckedIn" ? "warn" : "danger",
    );
  },

  clearVerdict: () => set({ verdict: null }),

  toast: (text, tone = "info") => {
    toastSeq += 1;
    const id = toastSeq;
    set({ toasts: [...get().toasts, { id, text, tone }] });
    window.setTimeout(() => get().dismissToast(id), 4200);
  },

  dismissToast: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),

  /**
   * The document-level Escape handler. Overlays close outermost-first so one
   * press does one thing rather than dismissing the whole stack.
   */
  escape: () => {
    const s = get();
    if (s.switcherOpen) return set({ switcherOpen: false, overlayOpen: false });
    if (s.navOpen) return set({ navOpen: false, overlayOpen: false });
    if (s.verdict !== null) return set({ verdict: null });
  },

  reset: () => {
    set({
      ...seeded(),
      clock: NOW,
      tickSeconds: 0,
      view: get().persona === "organizer" ? "sales" : "home",
      showId: FEATURED,
      orgShowId: FEATURED,
      quantities: {},
      holdExpired: false,
      buyerName: "",
      buyerEmail: "",
      attendeeNames: [],
      lastOrder: null,
      lookupEmail: "",
      lookedUp: null,
      attendeeQuery: "",
      doorCode: "",
      verdict: null,
      navOpen: false,
      switcherOpen: false,
      overlayOpen: false,
    });
    get().toast(t("chrome.toast.reset"), "info");
  },
}));

/** The show the attendee is on, or the featured one if state went sideways. */
export function currentShow(shows: Show[], id: string): Show | null {
  return showById(shows, id);
}
