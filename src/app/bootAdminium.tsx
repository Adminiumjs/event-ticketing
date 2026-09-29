/**
 * The venue on a real Adminium: the box office and the door served by
 * Adminium to the person signed in to it, or the audience's pages through the
 * venue's browser keys — the same screens the demo draws, through the real
 * doors (`../data/adminium*.ts`).
 *
 * The staff build reads its whole start from the staff `surface-config.json`;
 * the audience's from the customer one, or from a standalone build's baked
 * address and key. Nothing here falls back to invented rows: a build with no
 * Adminium to reach says so and stops.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { resolveLocale } from "../i18n/locales.ts";
import { HOSTED, SURFACE_SIDE } from "../surface.ts";
import type { View } from "../surface-nav.ts";
import { WaveRoot } from "./WaveRoot.tsx";
import { WaveApp, type BoxScreen, type Screen } from "./wave.ts";

export type StartupFailure = (detail: string, code: string | null) => void;

export async function bootAdminium(mount: HTMLElement, fail: StartupFailure): Promise<void> {
  const lang = resolveLocale(typeof navigator === "undefined" ? [] : navigator.languages);
  const theme = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  let app: WaveApp;

  // Each side loads only its own door: the branch not taken folds away, and its imports with it.
  if (HOSTED && SURFACE_SIDE === "staff") {
    const [{ loadStaffConfig }, { createSessionTransport }, { AdminiumStaff }] = await Promise.all([import("../staffConnection.ts"), import("../data/sessionSource.ts"), import("../data/adminiumStaff.ts")]);
    const staff = await loadStaffConfig();
    if (staff === null) {
      fail("This Adminium did not answer the box office's configuration. It may be older than this app, or the app is not installed.", "NO_BACKEND");
      return;
    }
    if (staff.user === null || staff.csrfToken === null) {
      window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const transport = createSessionTransport({
      tableOfRef: staff.tables,
      connectionId: staff.connectionId ?? undefined,
      staff: { csrfToken: staff.csrfToken, timezone: staff.timezone, timezoneSource: staff.timezoneSource, serverTimezone: staff.serverTimezone, currency: staff.currency },
      refreshToken: async () => (await loadStaffConfig())?.csrfToken ?? null,
    });
    const port = new AdminiumStaff(transport, staff);
    app = new WaveApp({ boxOffice: port, door: port }, "box", { lang, theme });
  } else {
    const [{ resolveSurfaceConfig }, { AdminiumAudience }] = await Promise.all([import("../publicConfig.ts"), import("../data/adminiumAudience.ts")]);
    const served = await resolveSurfaceConfig();
    if (served === null) {
      fail(
        "This build has no backend configured. A hosted audience site needs a key bound to it in Studio (or VITE_ADMINIUM_PUBLISHABLE_KEY baked at build time); a standalone build needs that and VITE_ADMINIUM_API_BASE_URL.",
        "NO_BACKEND",
      );
      return;
    }
    const port = new AdminiumAudience(served);
    app = new WaveApp({ audience: port }, "audience", { lang, theme });
    // Signed out on another device, or the details deleted: this tab lets go too, and says so.
    port.onSessionEnded(() => app.buyer.sessionEnded());
  }

  await app.start();
  const path = window.location.pathname;
  const hash = window.location.hash;
  // A link's code leaves the address bar at once: a reload must not spend it again.
  if (app.persona === "audience" && hash !== "" && /\/(o|t|c|confirm)\/?$/.test(path)) window.history.replaceState(window.history.state, "", path.replace(/\/(o|t|c|confirm)\/?$/, "/"));
  // The address bar's screen first, then where a link takes the reader: the link wins.
  if (HOSTED) await attachToHost(app);
  if (app.persona === "audience") {
    const { pathUnderBase, surfaceBase } = await import("../urlSync.ts");
    await app.arrive(pathUnderBase(path, surfaceBase(path, import.meta.env.BASE_URL)), hash);
  }

  createRoot(mount).render(
    <StrictMode>
      <WaveRoot app={app} />
    </StrictMode>,
  );
}

/** The screen the address bar names. */
function viewOf(app: WaveApp): View {
  return app.persona === "box" ? app.state.bx : app.state.scr;
}

/**
 * Hosted inside Adminium: the address bar follows the screen, and the
 * dashboard's frame — its theme, its language, its sidebar — drives the app.
 */
async function attachToHost(app: WaveApp): Promise<void> {
  const [{ attachUrlSync }, { connectToHost }, { SURFACE_NAV, APP_KEY }] = await Promise.all([import("../urlSync.ts"), import("../embed.ts"), import("../surface-nav.ts")]);
  // The box office's own screens change through its controller; only the staff build loads it.
  const staffGo = HOSTED && SURFACE_SIDE === "staff" ? (await import("./box.ts")).boxOf(app) : null;
  let bridge: { navigated: (path: string) => void } | null = null;
  const sync = attachUrlSync<View>({
    nav: SURFACE_NAV,
    side: SURFACE_SIDE,
    go: (view) => (staffGo !== null ? staffGo.go(view as BoxScreen) : app.go(view as Screen)),
    current: () => viewOf(app),
    onPath: (path) => bridge?.navigated(path),
  });
  bridge = await connectToHost(APP_KEY, SURFACE_SIDE as "staff" | "customer", sync.path(), {
    onTheme: (theme) => app.setState({ theme }),
    onLocale: (tag) => app.setState({ lang: resolveLocale([tag]) }),
    onPath: (path) => sync.applyPath(path),
  });
  let last = viewOf(app);
  app.subscribe(() => {
    const now = viewOf(app);
    if (now === last) return;
    last = now;
    sync.reflect();
  });
}
