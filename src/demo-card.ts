/**
 * What the website's demo card offers for this app: two sides, the audience
 * site and the box office, each with its own screens (the card shows only the
 * current side's), and a clock row that moves the demo's Tuesday on — to the
 * doors, or a whole day — and puts it back.
 *
 * Icons are lucide names. DEMO BUILD ONLY — nothing in a real build imports it.
 */
import type { DemoFrame } from "./demo-types.ts";
/** The controller's screens, as names (the card's declaration reaches no screen code: the Vite config reads it). */
type Screen = "home" | "event" | "checkout" | "going" | "signin" | "tickets" | "friend" | "offer" | "confirm" | "404";
type BoxScreen = "today" | "events" | "editor" | "sales" | "orders" | "refunds" | "guests" | "waits" | "codes" | "msgs" | "pc" | "settings" | "door";

export const DEMO_APP_KEY = "events";
export const DEMO_DIR = "event-ticketing";

export const DEMO_FRAMES: DemoFrame[] = ["desktop", "phone"];

/** The card's two sides, and the controller's name for each. */
export const DEMO_PERSONAS = [
  { id: "aud", icon: "user-round", persona: "audience", labelKey: "demo.persona.aud" },
  { id: "box", icon: "store", persona: "box", labelKey: "demo.persona.box" },
] as const;

export type CardPersona = (typeof DEMO_PERSONAS)[number]["id"];

export interface DemoCardShortcut {
  id: string;
  icon: string;
  labelKey: string;
}

export interface DemoCardScreen {
  id: string;
  /** The controller's screen: an audience `Screen` (or the ticket on the phone, drawn over My tickets), or a box-office one. */
  view: Screen | BoxScreen | "festival" | "doormode";
  icon: string;
  labelKey: string;
  side: "customer" | "staff";
  persona: CardPersona;
  shortcuts?: DemoCardShortcut[];
}

/** A moment of the venue a screen's card can play, through the screens' own actions (`demoShortcuts.ts`). */
const cut = (id: string, icon: string): DemoCardShortcut => ({ id, icon, labelKey: `demo.do.${id}` });
const aud = (id: string, view: DemoCardScreen["view"], icon: string, shortcuts?: DemoCardShortcut[]): DemoCardScreen => ({
  id,
  view,
  icon,
  labelKey: `demo.screen.${id}`,
  side: "customer",
  persona: "aud",
  ...(shortcuts === undefined ? {} : { shortcuts }),
});
const box = (id: BoxScreen, icon: string, shortcuts?: DemoCardShortcut[]): DemoCardScreen => ({
  id,
  view: id,
  icon,
  labelKey: `demo.screen.${id}`,
  side: "staff",
  persona: "box",
  ...(shortcuts === undefined ? {} : { shortcuts }),
});

export const DEMO_SCREENS: DemoCardScreen[] = [
  aud("home", "home", "calendar-days"),
  aud("event", "event", "ticket", [cut("sold-out", "ban"), cut("presale", "key"), cut("postponed", "calendar-clock")]),
  aud("festival", "festival", "tent"),
  aud("checkout", "checkout", "shopping-bag", [
    cut("fill", "wand-sparkles"),
    cut("last-balcony", "zap"),
    cut("transfer", "landmark"),
    cut("hold-out", "timer-off"),
    cut("code-out", "ticket-x"),
  ]),
  aud("going", "going", "party-popper", [
    cut("going-transfer", "landmark"),
    cut("going-free", "gift"),
    cut("going-door", "banknote"),
    cut("going-paid", "badge-check"),
    cut("going-released", "timer-off"),
    cut("going-cancelled", "circle-x"),
    cut("going-past", "history"),
  ]),
  aud("signin", "signin", "key-round", [
    cut("mia", "wand-sparkles"),
    cut("open-link", "mail-open"),
    cut("link-expires", "unplug"),
    cut("mail-down", "cloud-off"),
    cut("too-many", "octagon-alert"),
    cut("check-fails", "shield-alert"),
    cut("signed-out", "monitor-off"),
  ]),
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
  box("waits", "list-ordered", [cut("waits-back", "undo-2")]),
  box("codes", "ticket-percent"),
  box("msgs", "send"),
  box("pc", "calendar-x"),
  box("settings", "settings"),
  box("door", "scan-line", [cut("door-ok", "check"), cut("door-in", "repeat"), cut("door-collect", "banknote"), cut("door-wrong", "shuffle"), cut("door-day", "calendar-x")]),
];

/** Every shortcut's id. */
export const DEMO_SHORTCUT_IDS = DEMO_SCREENS.flatMap((x) => (x.shortcuts ?? []).map((c) => c.id));

/** The clock row: to Tuesday's doors, a whole day on, and back to 16:30. */
export const DEMO_CLOCK = {
  advance: [
    { id: "doors", labelKey: "demo.clock.doors" },
    { id: "next-day", labelKey: "demo.clock.next-day" },
  ],
  reset: { labelKey: "demo.clock.reset" },
};

/** The door's signal is the card's online switch. */
export const DEMO_TOGGLES = ["online"] as const;

/**
 * The clock row's steps. "Advance to doors" goes to Tuesday's doors, 19:58 at
 * the venue, and never back (after "+1 day" it does nothing); "+1 day" moves
 * the clock on 24 hours. Either way the demo's Adminium makes every timed move
 * that came due on the way.
 */
export const DEMO_DOORS_AT = Date.parse("2026-07-28T23:58:00Z");
export const DEMO_ADVANCE = ["doors", "next-day"] as const;
