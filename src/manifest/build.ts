/**
 * `manifest.json`, assembled from the modules beside this file.
 *
 * The manifest is what Adminium installs: the tables and their rules, the
 * pages, the roles, the audience site's doors, the emails, the documents and
 * the add-ons the app works better with. It is written from typed modules
 * rather than by hand because it is long and mostly the same eight languages
 * over and over; the modules say each thing once. The file itself is still the
 * product's input, checked in, and `manifest-drift.test.ts` fails when it and
 * the modules disagree (`npm run manifest` re-writes it).
 */
import { ADD_ONS } from "./add-ons.ts";
import { DOCUMENTS } from "./documents.ts";
import { emailTemplates } from "./emails.ts";
import { KINDS, OUTBOX } from "./outbox.ts";
import { NAV_GROUPS, pages } from "./pages.ts";
import { PUBLIC_ACCESS, PUBLIC_KEYS } from "./public.ts";
import { ROLES } from "./roles.ts";
import { TABLES } from "./tables.ts";

/** This release, a patch over 0.2.x (the version moved 0.1.3 → 0.2.0 once: its tables were new). */
export const VERSION = "0.2.2";

/**
 * The Adminium release that first reads everything below: places counted by
 * type, show and room with holds that run out, an order written with its
 * tickets, strict moves and moves made by the clock, conditions on a new row,
 * codes looked up, a friend's ticket, an order's own link. Written from the
 * version actually released, never guessed.
 */
export const MIN_ADMINIUM = "0.3.8";

const ENV = {
  VITE_ADMINIUM_API_BASE_URL: { required: false, example: "https://admin.example.com" },
  VITE_ADMINIUM_PUBLISHABLE_KEY: { required: false, example: "adm_pub_..." },
};

/** The box office's screens, and the door's. */
export const STAFF_ROUTES = { boxOffice: "/", door: "/door" };

/**
 * The audience site. An order's own link lands on `/o`, the confirm link on
 * `/confirm` and a friend's ticket on `/t`, each code in the fragment.
 */
export const CUSTOMER_ROUTES = {
  home: "/",
  event: "/e",
  checkout: "/checkout",
  order: "/o",
  confirm: "/confirm",
  ticket: "/t",
  signIn: "/sign-in",
  myTickets: "/my-tickets",
};

export function buildManifest(): Record<string, unknown> {
  return {
    kind: "app",
    manifestVersion: 1,
    key: "events",
    name: "Event Ticketing",
    version: VERSION,
    publisher: { id: "adminium", name: "Adminium", url: "https://adminium.dev" },
    license: "AGPL-3.0-only",
    description: {
      key: "mft.events.desc",
      fallback:
        "A small venue's box office, door and audience site: people buy tickets, pay at the door, by bank transfer or at no charge, and manage their own; the box office keeps the money straight and the door lets people in — every price, number, code and status decided by your own database.",
    },
    categories: ["hospitality"],
    compatibility: {
      minAdminiumVersion: MIN_ADMINIUM,
      engines: ["sqlite", "postgres", "mysql"],
      requires: ["realtime"],
      // 0.1.x kept other tables in another shape: it cannot be updated in
      // place (uninstall it first — its tables are kept).
      updatesFrom: ">=0.2.0",
    },
    capabilities: ["realtime", "email-delivery"],
    frontends: [
      { side: "staff", kind: "spa", entry: "index.html", env: ENV, placement: "external", routes: STAFF_ROUTES },
      { side: "customer", kind: "spa", entry: "index.html", env: ENV, routes: CUSTOMER_ROUTES },
    ],
    addOns: ADD_ONS,
    documents: DOCUMENTS,
    navGroups: NAV_GROUPS,
    requiredSchema: { prefixed: true, tables: TABLES },
    pages: pages(),
    roles: ROLES,
    publicKeys: PUBLIC_KEYS,
    publicAccess: PUBLIC_ACCESS,
    outbox: OUTBOX,
    emailTemplates: emailTemplates(KINDS),
    sampleData: { file: "seeds/events.sample.json" },
  };
}

/** The file's text: two-space JSON and a final newline. */
export function manifestText(): string {
  return `${JSON.stringify(buildManifest(), null, 2)}\n`;
}
