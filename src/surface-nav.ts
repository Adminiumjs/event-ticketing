/**
 * The app's screens as Adminium's sidebar and the address bar name them: each
 * side's sections, with the path under the surface's base, the controller's
 * screen it opens and an icon. Labels are the screens' own sentences, so the
 * sidebar speaks every language the screens do (`surfaceWords`).
 *
 * Read by the Vite config (to write `surface.json`) and by the surface gate:
 * it reaches no screen code.
 */
import type { SurfaceNavEntry } from "./surface-types.ts";

export const APP_KEY = "events";

/** The app's name in the sidebar: the venue product's own. */
export const APP_LABEL_KEY = "Waveform";

/** The controller's screens (`app/wave.ts`), by name. */
export type AudienceView = "home" | "event" | "checkout" | "going" | "signin" | "tickets" | "friend" | "offer" | "confirm" | "404";
export type BoxView = "today" | "events" | "editor" | "sales" | "orders" | "refunds" | "guests" | "waits" | "codes" | "msgs" | "pc" | "settings" | "door";
export type View = AudienceView | BoxView;

type Entry = SurfaceNavEntry<View> & { labelKey: string };

export const SURFACE_NAV = [
  { id: "today", path: "", view: "today", side: "staff", icon: "house", labelKey: "Today" },
  { id: "events", path: "events", view: "events", side: "staff", icon: "calendar-range", labelKey: "Events" },
  { id: "orders", path: "orders", view: "orders", side: "staff", icon: "receipt-text", labelKey: "Orders" },
  { id: "refunds", path: "refunds", view: "refunds", side: "staff", icon: "undo-2", labelKey: "Refund requests" },
  { id: "guests", path: "guests", view: "guests", side: "staff", icon: "list-checks", labelKey: "Guest lists" },
  { id: "waits", path: "waitlists", view: "waits", side: "staff", icon: "list-ordered", labelKey: "Waitlists" },
  { id: "codes", path: "codes", view: "codes", side: "staff", icon: "ticket-percent", labelKey: "Codes" },
  { id: "msgs", path: "messages", view: "msgs", side: "staff", icon: "send", labelKey: "Messages" },
  { id: "door", path: "door", view: "door", side: "staff", icon: "scan-line", labelKey: "Door" },
  { id: "settings", path: "settings", view: "settings", side: "staff", icon: "settings", labelKey: "Settings" },
  { id: "whats-on", path: "", view: "home", side: "customer", icon: "calendar-days", labelKey: "What's on" },
  { id: "my-tickets", path: "my-tickets", view: "tickets", side: "customer", icon: "wallet", labelKey: "My tickets" },
] as const satisfies readonly Entry[];

/** Screens each side draws that are not sidebar items (opened from another screen or a link). */
export const SURFACE_EXTRAS = {
  staff: ["editor", "sales", "pc"],
  customer: ["event", "checkout", "going", "signin", "friend", "offer", "confirm", "404"],
} as const satisfies Record<"staff" | "customer", readonly View[]>;

/**
 * The staff side's doors: every module the shared code reaches the box office and the door through, each behind a
 * side flag. The surface gate adds every module reachable from these and from nothing else (the box office's
 * screens' values, its sheets, the editor, the preview, the camera…), and no audience build may contain one.
 */
export const SURFACE_STAFF_ONLY = [
  "src/view/StaffView.tsx",
  "src/view/BoxLayersView.tsx",
  "src/view/DoorView.tsx",
  "src/app/box.ts",
  "src/app/door.ts",
  "src/app/vals/box.ts",
  "src/app/vals/boxSheets.ts",
  "src/data/adminiumStaff.ts",
  "src/data/sessionSource.ts",
];

/** The standalone build (a browser key, no side) is the audience's: the surface gate builds it and holds it to the customer side's rules. */
export const SURFACE_STANDALONE_SIDE = "customer";

/** The demo's seeded words: no surface build may contain them. */
export const SURFACE_DEMO_DATA = "src/sample/words.ts";

export type StaffView = Extract<(typeof SURFACE_NAV)[number], { side: "staff" }>["view"] | (typeof SURFACE_EXTRAS)["staff"][number];
export type CustomerView = Extract<(typeof SURFACE_NAV)[number], { side: "customer" }>["view"] | (typeof SURFACE_EXTRAS)["customer"][number];
