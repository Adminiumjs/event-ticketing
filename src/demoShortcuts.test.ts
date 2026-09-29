/**
 * Every shortcut of the demo card, played on a fresh demo: where it lands and
 * what the demo's Adminium then holds. And the card's `demo.json`, as the
 * website would read it, in all eight languages.
 */
import { describe, expect, it, vi } from "vitest";

import { buildDemoJson } from "../demo-emit.ts";
import { boxOf } from "./app/box.ts";
import { doorOf } from "./app/door.ts";
import type { BoxScreen, Screen } from "./app/wave.ts";
import { WaveApp } from "./app/wave.ts";
import { renderVals } from "./app/vals/base.ts";
import { DemoAdminium } from "./demo/adminium.ts";
import { DEMO_APP_KEY, DEMO_CLOCK, DEMO_DIR, DEMO_FRAMES, DEMO_PERSONAS, DEMO_SCREENS, DEMO_SHORTCUT_IDS, DEMO_TOGGLES } from "./demo-card.ts";
import { demoJsonIssues } from "./demo-types.ts";
import { runShortcut } from "./demoShortcuts.ts";
import { DEMO_CARD_MESSAGES } from "./i18n/strings/card.ts";

vi.setConfig({ testTimeout: 60_000 });

// The card names the controller's screens without importing them: the two lists must stay the same.
type CardView = (typeof DEMO_SCREENS)[number]["view"];
const views: Exclude<CardView, "festival" | "doormode">[] = [] as (Screen | BoxScreen)[];
const back: (Screen | BoxScreen)[] = views;
void back;

async function play(id: string) {
  const demo = new DemoAdminium();
  const app = new WaveApp({ audience: demo.audience, boxOffice: demo.boxOffice, door: demo.door }, "audience", { lang: "en-US", theme: "dark" });
  app.demo = { onClock: (fn) => demo.onClock(fn), doorDevice: "Door 1", nextScan: (d) => demo.nextInQueue(d) };
  await app.start({ timers: false });
  for (let i = 0; i < 4; i += 1) {
    renderVals(app);
    await app.idle();
  }
  await runShortcut(id, app, demo);
  for (let i = 0; i < 6; i += 1) {
    renderVals(app);
    await app.idle();
  }
  const order = () => (app.state.going === null ? undefined : demo.world.get("orders", app.state.going.orderId));
  return { demo, app, order };
}

describe("the card's shortcuts, each on a fresh demo", () => {
  it("covers every shortcut the card declares", () => {
    expect(DEMO_SHORTCUT_IDS).toHaveLength(28);
    expect(new Set(DEMO_SHORTCUT_IDS).size).toBe(28);
  });

  it("opens the sold-out night, the presale and the postponed show", async () => {
    const a = await play("sold-out");
    expect([a.app.state.scr, a.app.world()!.byId.get(a.app.state.evId!)!.name]).toEqual(["event", "Velvet Hour"]);
    const b = await play("presale");
    const bloom = b.app.world()!.shows.find((s) => s.name === "Static Bloom")!;
    expect(b.app.state.codes[String(bloom.id)]?.kind).toBe("unlock");
    const c = await play("postponed");
    expect(c.app.world()!.byId.get(c.app.state.evId!)!.name).toBe("Hollow Tide");
  });

  it("plays the checkout: filled, the last Balcony seat gone, by transfer, the hold and the code running out", async () => {
    const fill = await play("fill");
    expect([fill.app.state.scr, fill.app.state.co?.buyer.email]).toEqual(["checkout", "mia.okada@example.com"]);
    const last = await play("last-balcony");
    expect(last.app.state.co?.holdQ).toMatchObject({ kind: "last", n: 1 });
    const xfer = await play("transfer");
    expect(xfer.app.state.co?.phase).toBe("mail");
    const out = await play("hold-out");
    expect(out.app.state.co?.phase).toBe("gone");
    const code = await play("code-out");
    expect(code.app.state.co?.holdQ).toMatchObject({ kind: "code", code: "STUDENT10" });
  });

  it("opens an order in each state", async () => {
    const want: [string, string][] = [
      ["going-door", "door"],
      ["going-free", "no_charge"],
      ["going-transfer", "awaiting_transfer"],
      ["going-paid", "paid"],
      ["going-released", "released"],
      ["going-cancelled", "cancelled"],
      ["going-past", "paid"],
    ];
    for (const [id, status] of want) {
      const g = await play(id);
      expect([id, g.app.state.scr, g.order()?.["status"]]).toEqual([id, "going", status]);
    }
  });

  it("plays sign-in: Mia's address, her link, a link run out, the mail down, too many, the check failing, signed out elsewhere", async () => {
    expect((await play("mia")).app.state.si.email).toBe("mia.okada@example.com");
    const link = await play("open-link");
    expect([link.app.state.scr, link.app.buyer.signedIn()?.email]).toEqual(["tickets", "mia.okada@example.com"]);
    expect((await play("link-expires")).app.state.si.err).toBe("expired");
    expect((await play("mail-down")).app.state.si.mailErr).toBe("down");
    expect((await play("too-many")).app.state.si.mailErr).toBe("limit");
    expect((await play("check-fails")).app.state.si.check).toBe("fail");
    const out = await play("signed-out");
    expect([out.app.state.scr, out.app.state.si.notice]).toEqual(["signin", "out"]);
  });

  it("brings two Velvet places back for the waitlist from a real order", async () => {
    const w = await play("waits-back");
    const velvet = w.demo.world.all("events").find((e) => e["name"] === "Velvet Hour")!;
    expect(w.app.state.bx).toBe("waits");
    expect(w.demo.world.where("tickets", (t) => t["event_id"] === velvet.id && t["status"] === "returned").length).toBeGreaterThanOrEqual(2);
    expect(boxOf(w.app).back(velvet.id)).toBeGreaterThanOrEqual(2);
  });

  it("plays the door's verdicts", async () => {
    const want: [string, string][] = [
      ["door-ok", "Let in"],
      ["door-in", "Already in"],
      ["door-collect", "Collect"],
      ["door-wrong", "Wrong show"],
      ["door-day", "Not today"],
    ];
    for (const [id, word] of want) {
      const d = await play(id);
      expect([id, d.app.state.bx, doorOf(d.app).s.verdict?.word]).toEqual([id, "door", word]);
    }
  });
});

describe("demo.json", () => {
  it("is what the website accepts, every label in all eight languages", () => {
    const doc = buildDemoJson({
      appKey: DEMO_APP_KEY,
      dir: DEMO_DIR,
      frames: DEMO_FRAMES,
      screens: DEMO_SCREENS,
      personas: [...DEMO_PERSONAS],
      clock: DEMO_CLOCK,
      toggles: [...DEMO_TOGGLES],
      messages: DEMO_CARD_MESSAGES,
    });
    expect(demoJsonIssues(doc, { appKey: "events", dir: "event-ticketing" })).toEqual([]);
    expect([doc.screens.length, doc.screens.flatMap((s) => s.shortcuts ?? []).length, doc.base]).toEqual([24, 28, "/demo/event-ticketing/app/"]);
  });

  it("has the same words in every language, placeholders kept", () => {
    const en = DEMO_CARD_MESSAGES["en-US"];
    for (const [lang, words] of Object.entries(DEMO_CARD_MESSAGES)) {
      expect([lang, Object.keys(words).sort()]).toEqual([lang, Object.keys(en).sort()]);
      for (const [k, v] of Object.entries(words)) expect([lang, k, (v.match(/\{\w+\}/g) ?? []).sort()]).toEqual([lang, k, (en[k]!.match(/\{\w+\}/g) ?? []).sort()]);
    }
  });
});
