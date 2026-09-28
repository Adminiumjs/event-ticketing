/**
 * What the website's demo card offers for this app: two sides, the audience
 * site and the box office, each with its own screens (the card shows only the
 * current side's), and a clock row that moves the demo's Tuesday on — to the
 * doors, or a whole day — and puts it back.
 *
 * Icons are lucide names. DEMO BUILD ONLY — nothing in a real build imports it.
 */
import type { DemoFrame } from "./demo-types.ts";
import type { BoxScreen, Screen } from "./app/wave.ts";

export const DEMO_APP_KEY = "events";
export const DEMO_DIR = "event-ticketing";

export const DEMO_FRAMES: DemoFrame[] = ["desktop", "phone"];

/** The card's two sides, and the controller's name for each. */
export const DEMO_PERSONAS = [
  { id: "aud", icon: "user-round", persona: "audience" },
  { id: "box", icon: "store", persona: "box" },
] as const;

export type CardPersona = (typeof DEMO_PERSONAS)[number]["id"];

export interface DemoCardScreen {
  id: string;
  /** The controller's screen: an audience `Screen` (or the ticket on the phone, drawn over My tickets), or a box-office one. */
  view: Screen | BoxScreen | "festival" | "doormode";
  icon: string;
  side: "customer" | "staff";
  persona: CardPersona;
}

const aud = (id: string, view: DemoCardScreen["view"], icon: string): DemoCardScreen => ({ id, view, icon, side: "customer", persona: "aud" });
const box = (id: BoxScreen, icon: string): DemoCardScreen => ({ id, view: id, icon, side: "staff", persona: "box" });

export const DEMO_SCREENS: DemoCardScreen[] = [
  aud("home", "home", "calendar-days"),
  aud("event", "event", "ticket"),
  aud("festival", "festival", "tent"),
  aud("checkout", "checkout", "shopping-bag"),
  aud("going", "going", "party-popper"),
  aud("signin", "signin", "key-round"),
  aud("tickets", "tickets", "wallet"),
  aud("doormode", "doormode", "qr-code"),
  aud("friend", "friend", "gift"),
  aud("offer", "offer", "hourglass"),
  aud("404", "404", "triangle-alert"),
  box("today", "house"),
  box("events", "calendar-range"),
  box("editor", "square-pen"),
  box("sales", "chart-line"),
  box("orders", "receipt-text"),
  box("refunds", "undo-2"),
  box("guests", "list-checks"),
  box("waits", "list-ordered"),
  box("codes", "ticket-percent"),
  box("msgs", "send"),
  box("pc", "calendar-x"),
  box("settings", "settings"),
  box("door", "scan-line"),
];

/**
 * The clock row's steps. "Advance to doors" goes to Tuesday's doors, 19:58 at
 * the venue, and never back (after "+1 day" it does nothing); "+1 day" moves
 * the clock on 24 hours. Either way the demo's Adminium makes every timed move
 * that came due on the way.
 */
export const DEMO_DOORS_AT = Date.parse("2026-07-28T23:58:00Z");
export const DEMO_ADVANCE = ["doors", "next-day"] as const;
