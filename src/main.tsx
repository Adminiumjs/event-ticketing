/*
 * Entry point.
 *
 * The demo build draws the venue's screens (`app/WaveRoot.tsx`, with their
 * own stylesheet) on the demo's own Adminium. The hosted and standalone
 * builds still draw the first screens until the real doors reach the new
 * ones; their four stylesheets load with them, in cascade order.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";


import { I18nProvider } from "./i18n/index.tsx";
import { setDataSource } from "./data/source.ts";
import { clientFromConfig, loadSnapshot, snapshotFailure, snapshotSource } from "./data/adminiumSource.ts";
import { createSessionTransport } from "./data/sessionSource.ts";
import { TABLE_OF_REF } from "./data/tableOfRef.ts";
import { resolveStaffConnectionId } from "./staffConnection.ts";
import { appName, setTenantCurrency, setTimezoneClaim } from "./i18n/ambient.ts";
import { DEMO, HOSTED, SURFACE_SIDE } from "./surface.ts";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root — check index.html");

/*
 * ONE condition decides demo vs connected: whether the API base URL and key are
 * present at build time. `createPublicClient` returns null when either is
 * missing, so the fallback is structural rather than a catch, and there is no
 * second flag to drift. The marketplace demo builds set neither and behave
 * byte-identically to before this file changed.
 *
 * The dynamic `import()` of `App` is load-bearing, not stylistic: `App` pulls
 * `state/store.ts`, which reads the seam at MODULE SCOPE to build `SEED` — the
 * shows, the tickets, the clock and the show the site opens on. A static import
 * would evaluate the store during this module's own imports, before the fetch
 * below could resolve, and the box office would render demo data whatever the
 * server said. The `await` has to sit between the swap and the import, so the
 * import has to be dynamic. The seam's `setDataSource` throws if that ordering
 * is ever broken, because the failure is otherwise silent and looks exactly
 * like a working app.
 */
/** This app's name, as the failure screen says it. */
const BRAND = "Waveform";

/**
 * The headline for a startup failure, chosen by CAUSE.
 *
 * One sentence used to cover every cause: "<Brand> is not connected". It was
 * wrong for most of them and actively misleading for two — an app that reached
 * Adminium, authenticated, and refused only because two databases are serving
 * is not "not connected", and an operator who reads that goes looking for a
 * broken connection instead of the choice the app is actually waiting on.
 *
 * The DETAIL under it already says precisely what happened; this only has to
 * name the KIND of problem without contradicting it.
 */
function titleFor(code: string | null): string {
  switch (code) {
    case "AMBIGUOUS_CONNECTION":
      return `${BRAND} does not know which database to read`;
    case "CONNECTION_PAUSED":
      return `${BRAND}'s database is paused`;
    case "NO_CONNECTION":
      return `${BRAND} is not connected`;
    case "NO_BACKEND":
      return `${BRAND} has no backend configured`;
    default:
      // Reached the server and could not finish: a refused scope, a schema that
      // does not match, an expired session. "Not connected" would be a guess.
      return `${BRAND} could not load its data`;
  }
}

/**
 * The smallest honest "this is not configured" surface.
 *
 * Deliberately plain DOM and inline styles: it has to work when the data layer,
 * and possibly the locale bundle, did not. Anything richer would be one more
 * thing that can fail while reporting a failure.
 */
function showStartupFailure(mount: HTMLElement, detail: string, code: string | null): void {
  const title = titleFor(code);
  console.error(`[adminium] ${title}: ${detail}`);
  mount.innerHTML = "";
  const box = document.createElement("div");
  box.setAttribute("role", "alert");
  box.style.cssText =
    "max-width:34rem;margin:12vh auto;padding:1.5rem;font:400 15px/1.6 system-ui,sans-serif;" +
    "border:1px solid #d4d4d8;border-radius:12px;color:#18181b;background:#fff";
  const h = document.createElement("h1");
  h.textContent = title;
  h.style.cssText = "margin:0 0 .5rem;font-size:1.05rem;font-weight:600";
  const p = document.createElement("p");
  p.textContent = detail;
  // `pre-wrap`: the detail is a LIST — one problem per line, and a blank line
  // before any hint. Collapsed to a single run of prose (the CSS default) the
  // nine missing tables and the sentence that explains them read as one
  // sentence, which is how "resume it in Connections" ends up glued to a
  // column name.
  p.style.cssText = "margin:0;color:#52525b;white-space:pre-wrap";
  box.append(h, p);
  mount.append(box);
}

/**
 * The transport's code for a failure, when it carried one.
 *
 * Duck-typed rather than `instanceof`: the reason travels through
 * `snapshotFailure()` as a plain `Error`, and a build that swaps transports
 * should not have to share a class for the screen above to stay accurate.
 */
function codeOf(reason: Error | null): string | null {
  const code = (reason as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : null;
}

/**
 * The demo build: the venue's screens on the demo's own Adminium, in this
 * browser, driven by the website's demo card (`demoBridge.ts`). `?side=box`
 * opens the box office.
 */
async function bootDemo(mount: HTMLElement): Promise<void> {
  const [{ DemoAdminium }, { WaveApp }, { WaveRoot }, { startDemoBridge }] = await Promise.all([
    import("./demo/adminium.ts"),
    import("./app/wave.ts"),
    import("./app/WaveRoot.tsx"),
    import("./demoBridge.ts"),
  ]);
  const demo = new DemoAdminium();
  const params = new URLSearchParams(window.location.search);
  const persona = params.get("side") === "box" ? "box" : "audience";
  const lang = params.get("lang") ?? "en-US";
  const theme = params.get("theme") === "light" ? "light" : "dark";
  const frame = params.get("frame") === "phone" ? "phone" : "auto";
  const app = new WaveApp({ audience: demo.audience, boxOffice: demo.boxOffice, door: demo.door }, persona, { lang, theme, frame });
  app.demo = { onClock: (fn) => demo.onClock(fn), doorDevice: "Door 1", nextScan: (dayId) => demo.nextInQueue(dayId) };
  (window as unknown as { __wave?: unknown }).__wave = { app, demo };
  await app.start();
  await app.arrive(window.location.pathname, window.location.hash);
  createRoot(mount).render(
    <StrictMode>
      <WaveRoot app={app} />
    </StrictMode>,
  );
  // The website's demo card, when the page is framed by it: its screens, side, language, theme and clock.
  startDemoBridge(app, demo);
}

async function boot(): Promise<void> {
  if (DEMO) {
    await bootDemo(container as HTMLElement);
    return;
  }
  /*
   * A NON-DEMO BUILD NEVER RENDERS DEMO DATA.
   *
   * This used to fall through: no client, or a failed snapshot, and the seam
   * kept its `demoSource` default — so a real deployment whose backend was
   * unreachable painted a plausible app full of invented rows, for real people,
   * with no error. Falling back to fiction is the failure the build-time split
   * exists to remove, so it is a hard stop here instead.
   *
   * The transport is chosen at BUILD time and the two are not interchangeable.
   * Hosted staff talks to this same origin with the operator's session — no
   * key, no scope, no CORS. Everything else goes through the public API with a
   * publishable key. `HOSTED` folds to a literal, so each build contains only
   * the transport it uses.
   */
  if (!DEMO) {
    /*
     * The staff surface asks WHICH DATABASE it belongs to before it reads one
     * (29 D9). Null — unbound, or an Adminium too old to answer — keeps the old
     * inference, so this is additive for every instance that has one connection.
     */
    const boundConnection =
      HOSTED && SURFACE_SIDE === "staff" ? await resolveStaffConnectionId() : null;

    const client =
      HOSTED && SURFACE_SIDE === "staff"
        ? createSessionTransport({
            tableOfRef: TABLE_OF_REF,
            connectionId: boundConnection ?? undefined,
          }).port
        : // Baked vars first, then — hosted customer — the SERVED config
          // (surface-config.json, 29 D10): the key an operator bound in Studio,
          // fetched at boot, so rotation is Studio + reload with no rebuild.
          await clientFromConfig();
    const snap = client === null ? null : await loadSnapshot(client);
    if (snap === null) {
      // `client === null` is the no-backend path: nothing was ever attempted,
      // so it throws nothing and carries no code of its own.
      const reason = client === null ? null : snapshotFailure();
      showStartupFailure(
        container as HTMLElement,
        // The server said WHY when it said anything. Repeating a generic
        // sentence over a specific one is how an operator ends up checking a
        // key that does not exist in a build that never had one.
        reason?.message ??
          "This build has no backend configured. A hosted customer surface needs " +
            "a key bound to it in Studio (or VITE_ADMINIUM_PUBLISHABLE_KEY baked at " +
            "build time); a standalone build needs that and VITE_ADMINIUM_API_BASE_URL.",
        client === null ? "NO_BACKEND" : codeOf(reason),
      );
      return;
    }
    // Before `App` mounts, so the first paint formats in the tenant's
    // currency rather than flashing dollars and correcting itself.
    setTenantCurrency(snap.currency);
    // Same timing, same reason: the zone notice must be there on the first
    // paint, not appear after one.
    setTimezoneClaim(snap.timezone, snap.timezoneSource);
    setDataSource(snapshotSource(snap));
    console.info(
        `[adminium] connected: ${String(snap.shows.length)} shows, ` +
          `${String(snap.orders.length)} orders, ${String(snap.tickets.length)} tickets`,
    );
  }

  // The gen-1 screens' stylesheets, in cascade order (the demo build's screens bring their own).
  await import("./styles/tokens.css");
  await import("./styles/base.css");
  await import("./styles/components.css");
  await import("./styles/screens.css");
  const { default: App } = await import("./app/App.tsx");

  /*
   * The side→persona map is the ONE app-specific line here, which is why it is
   * not in `surface.ts`: every app names its personas differently, and a shared
   * module that knew those names could not be shared.
   */
  const persona = SURFACE_SIDE === "staff" ? "organizer" : SURFACE_SIDE === "customer" ? "attendee" : null;
  if (persona !== null) {
    const { useStore } = await import("./state/store.ts");
    useStore.getState().setPersona(persona);
  }
  /*
   * URL ⇄ SCREEN, and the host bridge — both hosted-only, both before the first
   * paint (29-app-surfaces.md D6/D8).
   *
   * Order matters and is not obvious:
   *
   *  1. `attachUrlSync` reads the CURRENT path and applies it, so a reload of
   *     `/apps/events/staff/attendees` renders attendees rather than sales and
   *     then correcting itself.
   *  2. `connectToHost` handshakes with the dashboard, if there is one. It is
   *     AWAITED so `isEmbedded()` is settled before any component renders;
   *     un-framed it returns immediately and costs nothing.
   *  3. The store subscription reflects later screen changes into the URL and
   *     tells the host, so the dashboard's address bar follows the app.
   *
   * `HOSTED` folds to a literal, so a demo or standalone build contains none of
   * this — not the bridge, not the sync, not the subscription.
   */
  if (HOSTED) {
    const { useStore } = await import("./state/store.ts");
    const { attachUrlSync } = await import("./urlSync.ts");
    const { connectToHost } = await import("./embed.ts");
    const { SURFACE_NAV, APP_KEY } = await import("./surface-nav.ts");
    const { setHostLocale } = await import("./i18n/index.tsx");

    // Forward reference on purpose: the sync reports paths TO the bridge, and
    // the bridge applies paths THROUGH the sync. Nothing fires before both
    // exist — `attachUrlSync`'s own boot read does not call `onPath`.
    let bridge: { navigated: (path: string) => void } | null = null;

    const sync = attachUrlSync({
      nav: SURFACE_NAV,
      side: SURFACE_SIDE,
      go: (view) => useStore.getState().go(view),
      current: () => useStore.getState().view,
      onPath: (path) => bridge?.navigated(path),
    });

    bridge = await connectToHost(APP_KEY, SURFACE_SIDE as "staff" | "customer", sync.path(), {
      onTheme: (theme) => useStore.getState().setHostTheme(theme),
      onLocale: setHostLocale,
      onPath: (path) => sync.applyPath(path),
    });

    useStore.subscribe(sync.reflect);
  }

  /*
   * THE BROWSER TAB carries the operator's name too.
   *
   * Everything on screen resolves through `useBrand()`, but the tab is not on
   * screen — it is the static `<title>` in index.html, which is the name this
   * app was BUILT with. Rename the app in Adminium and every heading changes
   * while the tab still says "Client Portal", which is the same half-applied
   * rename this whole change exists to remove.
   *
   * Only when an override is set: with none, index.html's own title is already
   * the right answer and rewriting it with the same string is noise.
   */
  const named = appName();
  if (named !== null) document.title = named;

  createRoot(container as HTMLElement).render(
    <StrictMode>
      <I18nProvider>
        <App />
      </I18nProvider>
    </StrictMode>,
  );
}

void boot();
