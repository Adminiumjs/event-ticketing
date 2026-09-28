/**
 * The demo's side of the website card: it says hello when framed, follows the
 * card's side, screen, language, theme and clock on the demo's Adminium, and
 * answers each change with the venue's state — and it listens to nothing but
 * the framing page's own origin and window.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { DemoAdminium } from "./demo/adminium.ts";
import { WaveApp } from "./app/wave.ts";
import { DEMO_APP_KEY, DEMO_SCREENS } from "./demo-card.ts";
import { applyDemoMessage, startDemoBridge, stateMessage } from "./demoBridge.ts";
import type { DemoMessage } from "./demo-types.ts";

const ORIGIN = "https://adminium.example.test";
type State = Extract<DemoMessage, { type: "adminium:demo:state" }>;

async function open(): Promise<{ app: WaveApp; demo: DemoAdminium; state: () => State }> {
  const demo = new DemoAdminium();
  const app = new WaveApp({ audience: demo.audience, boxOffice: demo.boxOffice, door: demo.door }, "audience", { lang: "en-US", theme: "dark" });
  app.demo = { onClock: (fn) => demo.onClock(fn) };
  await app.start({ timers: false });
  app.world();
  await app.idle();
  return { app, demo, state: () => stateMessage(app, demo) as State };
}

const send = async (app: WaveApp, demo: DemoAdminium, message: Record<string, unknown>) => {
  applyDemoMessage({ dv: 1, ...message } as DemoMessage, app, demo);
  await app.idle();
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the card's screens", () => {
  it("lists the design's 24: eleven for the audience, thirteen for the box office", () => {
    expect(DEMO_SCREENS).toHaveLength(24);
    expect(new Set(DEMO_SCREENS.map((s) => s.id)).size).toBe(24);
    expect(DEMO_SCREENS.filter((s) => s.persona === "aud" && s.side === "customer")).toHaveLength(11);
    expect(DEMO_SCREENS.filter((s) => s.persona === "box" && s.side === "staff")).toHaveLength(13);
  });
});

describe("the state the card reads", () => {
  it("opens on What's on, the audience's side, at Tuesday 16:30", async () => {
    const { state } = await open();
    expect(state()).toMatchObject({ screen: "home", persona: "aud", locale: "en-US", theme: "dark", clockLabel: "Tue 28 Jul · 16:30", overlay: false });
  });

  it("follows the card to a show, the festival, sign in and My tickets", async () => {
    const { app, demo, state } = await open();
    await send(app, demo, { type: "adminium:demo:go", screen: "event" });
    expect(state().screen).toBe("event");
    expect(app.world()!.byId.get(app.state.evId!)!.name).toBe("Neon Circuit");
    await send(app, demo, { type: "adminium:demo:go", screen: "festival" });
    expect(state().screen).toBe("festival");
    await send(app, demo, { type: "adminium:demo:go", screen: "signin" });
    expect(state().screen).toBe("signin");
    await send(app, demo, { type: "adminium:demo:go", screen: "404" });
    expect(state().screen).toBe("404");
  });

  it("stays put on a screen that is about something not on this page yet", async () => {
    const { app, demo, state } = await open();
    await send(app, demo, { type: "adminium:demo:go", screen: "checkout" });
    await send(app, demo, { type: "adminium:demo:go", screen: "friend" });
    expect(state().screen).toBe("home");
  });

  it("switches sides: the box office opens on Today, a box screen switches with it", async () => {
    const { app, demo, state } = await open();
    await send(app, demo, { type: "adminium:demo:set", persona: "box" });
    expect(state()).toMatchObject({ persona: "box", screen: "today" });
    await send(app, demo, { type: "adminium:demo:go", screen: "home" });
    expect(state()).toMatchObject({ persona: "aud", screen: "home" });
    await send(app, demo, { type: "adminium:demo:go", screen: "orders" });
    expect(state()).toMatchObject({ persona: "box", screen: "orders" });
  });

  it("takes the card's language and theme, and says the clock in that language", async () => {
    const { app, demo, state } = await open();
    await send(app, demo, { type: "adminium:demo:set", locale: "de-DE", theme: "light" });
    expect(state()).toMatchObject({ locale: "de-DE", theme: "light" });
    expect(state().clockLabel).toMatch(/28/);
    expect(state().clockLabel).not.toContain("Tue");
    await send(app, demo, { type: "adminium:demo:set", locale: "xx-XX" });
    expect(state().locale).toBe("de-DE");
  });

  it("init sets the language, theme, side and screen at once", async () => {
    const { app, demo, state } = await open();
    await send(app, demo, { type: "adminium:demo:init", locale: "ar-EG", theme: "light", persona: "box", screen: "door" });
    expect(state()).toMatchObject({ locale: "ar-EG", theme: "light", persona: "box", screen: "door" });
  });

  it("hides the card while a sheet or the account menu covers the page", async () => {
    const { app, state } = await open();
    app.openSheet("waitlist");
    expect(state().overlay).toBe(true);
    app.closeSheet();
    app.setState({ acctOpen: true });
    expect(state().overlay).toBe(true);
  });
});

describe("the clock row", () => {
  it("advances to the doors, then a day, and never back", async () => {
    const { app, demo, state } = await open();
    await send(app, demo, { type: "adminium:demo:clock", advance: "doors" });
    expect(state().clockLabel).toBe("Tue 28 Jul · 19:58");
    expect(app.now).toBe(demo.now);
    await send(app, demo, { type: "adminium:demo:clock", advance: "next-day" });
    expect(state().clockLabel).toBe("Wed 29 Jul · 19:58");
    await send(app, demo, { type: "adminium:demo:clock", advance: "doors" });
    expect(state().clockLabel).toBe("Wed 29 Jul · 19:58");
  });
});

describe("the handshake", () => {
  function frame(framed: boolean) {
    const listeners = new Set<(event: { origin: string; source: unknown; data: unknown }) => void>();
    const posted: { data: DemoMessage; origin: string }[] = [];
    const win: Record<string, unknown> = {
      location: { origin: ORIGIN, reload: vi.fn() },
      addEventListener: (type: string, fn: (event: { origin: string; source: unknown; data: unknown }) => void) => {
        if (type === "message") listeners.add(fn);
      },
      removeEventListener: (_type: string, fn: (event: { origin: string; source: unknown; data: unknown }) => void) => {
        listeners.delete(fn);
      },
    };
    const parent = framed ? { postMessage: (data: DemoMessage, origin: string) => posted.push({ data, origin }) } : win;
    win["parent"] = parent;
    vi.stubGlobal("window", win);
    const deliver = (data: unknown, from: { origin?: string; source?: unknown } = {}) => {
      for (const fn of [...listeners]) fn({ origin: from.origin ?? ORIGIN, source: from.source ?? parent, data });
    };
    return { posted, deliver, listeners, reload: (win["location"] as { reload: () => void }).reload };
  }

  it("says hello to the framing page, on its own origin, and answers init with the state", async () => {
    const { app, demo } = await open();
    const f = frame(true);
    startDemoBridge(app, demo);
    expect(f.posted[0]).toEqual({ data: { type: "adminium:demo:hello", dv: 1, appKey: DEMO_APP_KEY }, origin: ORIGIN });
    f.deliver({ type: "adminium:demo:init", dv: 1, locale: "en-US", theme: "light", screen: "signin" });
    const last = f.posted[f.posted.length - 1]!;
    expect(last.origin).toBe(ORIGIN);
    expect(last.data).toMatchObject({ type: "adminium:demo:state", screen: "signin", theme: "light", persona: "aud" });
  });

  it("tells the card when the page changes on its own, once per change", async () => {
    const { app, demo } = await open();
    const f = frame(true);
    startDemoBridge(app, demo);
    const before = f.posted.length;
    app.goTickets();
    app.goTickets();
    const states = f.posted.slice(before).filter((p) => p.data.type === "adminium:demo:state");
    expect(states).toHaveLength(1);
    expect(states[0]!.data).toMatchObject({ screen: "tickets" });
  });

  it("ignores another origin, another window and another protocol version", async () => {
    const { app, demo } = await open();
    const f = frame(true);
    startDemoBridge(app, demo);
    f.deliver({ type: "adminium:demo:go", dv: 1, screen: "signin" }, { origin: "https://elsewhere.example.test" });
    f.deliver({ type: "adminium:demo:go", dv: 1, screen: "signin" }, { source: {} });
    f.deliver({ type: "adminium:demo:go", dv: 2, screen: "signin" });
    expect(app.state.scr).toBe("home");
  });

  it("reset reloads the page: the sample venue at 16:30 again", async () => {
    const { app, demo } = await open();
    const f = frame(true);
    startDemoBridge(app, demo);
    f.deliver({ type: "adminium:demo:reset", dv: 1 });
    expect(f.reload).toHaveBeenCalledOnce();
  });

  it("says nothing and listens to nothing when the page is not framed", async () => {
    const { app, demo } = await open();
    const f = frame(false);
    startDemoBridge(app, demo);
    expect(f.posted).toEqual([]);
    expect(f.listeners.size).toBe(0);
  });
});
