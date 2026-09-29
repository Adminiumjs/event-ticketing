/**
 * Every screen names itself in the browser tab: the screen, or the show it
 * is about, and the venue — in the reader's language.
 */
import { afterEach, describe, expect, it } from "vitest";

import { DemoAdminium } from "../demo/adminium.ts";
import { setLocale } from "../i18n/tr.ts";
import { loadWave } from "../i18n/strings/wave.ts";
import { SURFACE_EXTRAS, SURFACE_NAV } from "../surface-nav.ts";
import { docTitle } from "./title.ts";
import { WaveApp, type BoxScreen, type Screen } from "./wave.ts";

async function open(): Promise<{ app: WaveApp; venue: string }> {
  const demo = new DemoAdminium();
  const app = new WaveApp({ audience: demo.audience, boxOffice: demo.boxOffice, door: demo.door }, "audience", { lang: "en-US", theme: "dark" });
  app.demo = { onClock: (fn) => demo.onClock(fn) };
  await app.start({ timers: false });
  app.world();
  await app.idle();
  const venue = app.world()!.settings.venueName;
  return { app, venue };
}

afterEach(() => setLocale("en-US"));

describe("the tab's title", () => {
  it("names the audience's screens and the venue", async () => {
    const { app, venue } = await open();
    expect(venue).not.toBe("");
    expect(docTitle(app)).toBe(`What's on · ${venue}`);
    const show = app.world()!.shows.find((s) => s.name === "Neon Circuit")!;
    app.setState({ scr: "event", evId: show.id });
    expect(docTitle(app)).toBe(`Neon Circuit · ${venue}`);
    app.setState({ scr: "tickets" });
    expect(docTitle(app)).toBe(`My tickets · ${venue}`);
  });

  it("gives every screen of both sides its own words", async () => {
    const { app, venue } = await open();
    const show = app.world()!.shows[0]!;
    const seen = new Map<string, string>();
    const audience = [...SURFACE_NAV.filter((e) => e.side === "customer").map((e) => e.view), ...SURFACE_EXTRAS.customer] as Screen[];
    for (const scr of audience) {
      app.setState({ scr, evId: show.id });
      const t = docTitle(app);
      expect(t, scr).toMatch(new RegExp(`^.+ · ${venue}$`));
      seen.set(`aud:${scr}`, t);
    }
    app.setPersona("box");
    const box = [...SURFACE_NAV.filter((e) => e.side === "staff").map((e) => e.view), ...SURFACE_EXTRAS.staff] as BoxScreen[];
    for (const bx of box) {
      app.setState({ bx });
      const t = docTitle(app);
      expect(t, bx).toMatch(new RegExp(`^.+ · ${venue}$`));
      seen.set(`box:${bx}`, t);
    }
    expect(seen.get("box:orders")).toBe(`Orders · ${venue}`);
    expect(seen.get("box:door")).toBe(`Door · ${venue}`);
  });

  it("speaks the reader's language", async () => {
    const { app, venue } = await open();
    await loadWave("de-DE");
    setLocale("de-DE");
    expect(docTitle(app)).toBe(`Programm · ${venue}`);
  });
});
