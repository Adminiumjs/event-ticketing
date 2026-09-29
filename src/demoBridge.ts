/**
 * The demo's side of the website card's protocol (`demo-types.ts`): the card
 * picks a side and a screen, sets the language and the theme, moves the
 * clock; this answers with the venue's state after every change — which
 * screen, which side, the clock as the card should print it, and whether a
 * sheet, menu or the ticket on the phone covers the page (the card hides then).
 *
 * Only the demo build contains this file (`DEMO` folds it away), and only a
 * page framed by the website's own origin speaks it.
 */
import { fD, fT, strip } from "./app/fmt.ts";
import type { BoxScreen, WaveApp } from "./app/wave.ts";
import { doorOf } from "./app/door.ts";
import type { DemoAdminium } from "./demo/adminium.ts";
import { DEMO_APP_KEY, DEMO_DOORS_AT, DEMO_PERSONAS, DEMO_SCREENS, DEMO_SHORTCUT_IDS, type CardPersona } from "./demo-card.ts";
import { runShortcut } from "./demoShortcuts.ts";
import { DEMO_PROTOCOL_VERSION, isDemoMessage, type DemoMessage } from "./demo-types.ts";
import { isLocaleTag } from "./i18n/locales.ts";

/** The demo's clock, as the bridge moves it. */
export interface DemoClock {
  readonly now: number;
  advanceTo(at: number): void;
  /** On to the doors, with what happens at the door on the way (the demo's Adminium makes the early scans). */
  toDoors?(): void;
}

/** The demo's own Adminium (a bare clock in some tests plays no shortcut). */
const isDemo = (clock: DemoClock): clock is DemoClock & DemoAdminium => "engine" in clock && "audience" in clock;

const cardPersona = (app: WaveApp): CardPersona => (app.persona === "box" ? "box" : "aud");

/** The card's screen for what is showing. */
export function currentScreen(app: WaveApp): string {
  const s = app.state;
  if (app.persona === "box") return s.bx;
  if (s.dm !== null) return "doormode";
  if (s.scr === "event" && s.evId !== null && app.world()?.byId.get(s.evId)?.festival === true) return "festival";
  return s.scr;
}

/** Whether a sheet, a menu, the ticket panel or the ticket on the phone covers the page. */
export function overlayOpen(app: WaveApp): boolean {
  const s = app.state;
  return s.sheet !== null || s.dm !== null || s.acctOpen || s.panelOpen;
}

export function stateMessage(app: WaveApp, clock: DemoClock): DemoMessage {
  return {
    type: "adminium:demo:state",
    dv: DEMO_PROTOCOL_VERSION,
    screen: currentScreen(app),
    persona: cardPersona(app),
    mode: null,
    online: app.state.door?.offline !== true,
    toggles: {},
    locale: app.state.lang,
    theme: app.state.theme,
    clockLabel: `${strip(fD(clock.now))} · ${strip(fT(clock.now))}`,
    overlay: overlayOpen(app),
  };
}

function setPersona(app: WaveApp, id: string | undefined): void {
  const persona = DEMO_PERSONAS.find((p) => p.id === id)?.persona;
  if (persona !== undefined) app.setPersona(persona);
}

/**
 * Opens a card screen on its side. A screen that is about something — a
 * checkout, an order, a ticket, an offer — opens only while there is one on
 * this page; the card's shortcuts are what set one up.
 */
export function goToScreen(app: WaveApp, id: string): void {
  const screen = DEMO_SCREENS.find((x) => x.id === id);
  if (screen === undefined) return;
  setPersona(app, screen.persona);
  if (screen.persona === "box") {
    app.setState({ bx: screen.view as BoxScreen, sheet: null });
    return;
  }
  const s = app.state;
  const w = app.world();
  const upcoming = (w?.shows ?? []).filter((e) => !e.cancelled && e.ends > app.now);
  switch (screen.view) {
    case "home":
    case "404":
      return app.go(screen.view);
    case "signin":
      return app.goSignIn();
    case "tickets":
      return app.goTickets();
    case "event": {
      const open = s.evId === null ? undefined : w?.byId.get(s.evId);
      const show = open !== undefined && !open.festival ? open : upcoming.find((e) => !e.festival);
      if (show !== undefined) app.openShow(show.id);
      return;
    }
    case "festival": {
      const show = upcoming.find((e) => e.festival);
      if (show !== undefined) app.openShow(show.id);
      return;
    }
    case "checkout":
      if (s.co !== null) app.go("checkout");
      return;
    case "going":
      if (s.going !== null) app.go("going");
      return;
    case "offer":
      if (s.going !== null) app.go("offer");
      return;
    case "friend":
      if (s.fr.token !== null) app.go("friend");
      return;
    case "doormode":
      if (s.dm === null) app.goTickets();
      return;
    default:
      return;
  }
}

export function applyDemoMessage(message: DemoMessage, app: WaveApp, clock: DemoClock): void {
  switch (message.type) {
    case "adminium:demo:init":
      if (isLocaleTag(message.locale)) app.setState({ lang: message.locale });
      app.setState({ theme: message.theme });
      setPersona(app, message.persona);
      if (message.screen !== undefined) goToScreen(app, message.screen);
      return;
    case "adminium:demo:go":
      goToScreen(app, message.screen);
      return;
    case "adminium:demo:set":
      if (message.theme !== undefined) app.setState({ theme: message.theme });
      if (message.locale !== undefined && isLocaleTag(message.locale)) app.setState({ lang: message.locale });
      setPersona(app, message.persona);
      // The card's online switch is the door's signal.
      if (message.online !== undefined) doorOf(app).setOffline(!message.online);
      return;
    case "adminium:demo:do":
      if (isDemo(clock) && DEMO_SHORTCUT_IDS.includes(message.shortcut)) void runShortcut(message.shortcut, app, clock);
      return;
    case "adminium:demo:clock":
      // The demo's Adminium never moves back: "Advance to doors" after "+1 day" does nothing.
      if (message.advance === "doors") {
        if (clock.toDoors !== undefined) clock.toDoors();
        else clock.advanceTo(DEMO_DOORS_AT);
      }
      else if (message.advance === "next-day") clock.advanceTo(clock.now + 24 * 3_600_000);
      return;
    case "adminium:demo:reset":
      // Everything back as it was: the sample venue, Tuesday 16:30. The card sends `init` again after the `hello`.
      window.location.reload();
      return;
    default:
      return;
  }
}

export function startDemoBridge(app: WaveApp, clock: DemoClock): () => void {
  if (typeof window === "undefined" || window.parent === window) return () => {};
  const origin = window.location.origin;
  const parent = window.parent;
  const post = (message: DemoMessage) => parent.postMessage(message, origin);
  let last = "";
  const report = () => {
    const message = stateMessage(app, clock);
    const text = JSON.stringify(message);
    if (text === last) return;
    last = text;
    post(message);
  };
  const onMessage = (event: MessageEvent) => {
    if (event.origin !== origin || event.source !== parent || !isDemoMessage(event.data)) return;
    applyDemoMessage(event.data, app, clock);
    report();
  };
  window.addEventListener("message", onMessage);
  const off = app.subscribe(report);
  post({ type: "adminium:demo:hello", dv: DEMO_PROTOCOL_VERSION, appKey: DEMO_APP_KEY });
  return () => {
    window.removeEventListener("message", onMessage);
    off();
  };
}
