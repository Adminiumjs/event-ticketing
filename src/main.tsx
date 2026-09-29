/*
 * Entry point.
 *
 * The demo build draws the venue's screens on the demo's own Adminium, in the
 * browser. The hosted and standalone builds draw the same screens through the
 * real doors into Adminium (`app/bootAdminium.tsx`), and a build with no
 * Adminium to reach says so and stops: a non-demo build never draws invented
 * rows.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { appName } from "./i18n/ambient.ts";
import { DEMO } from "./surface.ts";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root — check index.html");

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
 * The demo build: the venue's screens on the demo's own Adminium, in this
 * browser, driven by the website's demo card (`demoBridge.ts`). `?side=box`
 * opens the box office.
 */
async function bootDemo(mount: HTMLElement): Promise<void> {
  const [{ DemoAdminium }, { WaveApp }, { WaveRoot }, { startDemoBridge, goToScreen, applyDemoMessage }, { runShortcut }] = await Promise.all([
    import("./demo/adminium.ts"),
    import("./app/wave.ts"),
    import("./app/WaveRoot.tsx"),
    import("./demoBridge.ts"),
    import("./demoShortcuts.ts"),
  ]);
  const demo = new DemoAdminium();
  const params = new URLSearchParams(window.location.search);
  const persona = params.get("side") === "box" ? "box" : "audience";
  const lang = params.get("lang") ?? "en-US";
  const theme = params.get("theme") === "light" ? "light" : "dark";
  const frame = params.get("frame") === "phone" ? "phone" : "auto";
  const app = new WaveApp({ audience: demo.audience, boxOffice: demo.boxOffice, door: demo.door }, persona, { lang, theme, frame });
  app.demo = { onClock: (fn) => demo.onClock(fn), doorDevice: "Door 1", nextScan: (dayId) => demo.nextInQueue(dayId) };
  // The browser pass drives the demo as the card does: a screen, a shortcut, a card message.
  const card = {
    go: (screen: string) => goToScreen(app, screen),
    play: (shortcut: string) => runShortcut(shortcut, app, demo),
    send: (message: Parameters<typeof applyDemoMessage>[0]) => applyDemoMessage(message, app, demo),
  };
  (window as unknown as { __wave?: unknown }).__wave = { app, demo, card };
  await app.start();
  const { pathUnderBase, surfaceBase } = await import("./urlSync.ts");
  await app.arrive(pathUnderBase(window.location.pathname, surfaceBase(window.location.pathname, import.meta.env.BASE_URL)), window.location.hash);
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
  const { bootAdminium } = await import("./app/bootAdminium.tsx");
  const before = document.title;
  await bootAdminium(container as HTMLElement, (detail, code) => showStartupFailure(container as HTMLElement, detail, code));
  // The browser tab carries the name the operator gave the app, when they gave one — unless a screen has named
  // itself already ("{screen} · {venue}", which falls back to that name too).
  const named = appName();
  if (named !== null && document.title === before) document.title = named;
}

void boot();
