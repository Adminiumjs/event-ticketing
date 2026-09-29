/**
 * What the screens tell a screen reader and the keyboard, read from the
 * markup they draw. On a phone, "Get tickets" slides the ticket panel over a
 * scrim: the panel is then a modal dialog (so the page's layer focus moves
 * the keyboard into it, holds Tab there and hands focus back when it
 * closes); on a wide screen, and on a phone while it is closed, it is the
 * page's own aside. An event's hub is a row of links between screens, not
 * tabs; the open door has a heading to land on.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 60_000 });

import { DemoAdminium } from "../demo/adminium.ts";
import { boxOf } from "../app/box.ts";
import { renderVals } from "../app/vals/base.ts";
import { WaveApp } from "../app/wave.ts";
import { AudienceView } from "./AudienceView.tsx";
import { DoorView } from "./DoorView.tsx";
import { StaffView } from "./StaffView.tsx";

async function onShow(width: number): Promise<{ app: WaveApp; panel: () => string }> {
  const demo = new DemoAdminium();
  const app = new WaveApp({ audience: demo.audience, boxOffice: demo.boxOffice, door: demo.door }, "audience", { lang: "en-US", theme: "dark" });
  app.demo = { onClock: (fn) => demo.onClock(fn) };
  await app.start({ timers: false });
  app.setState({ width });
  app.world();
  await app.idle();
  app.openShow(app.world()!.shows.find((s) => s.name === "Neon Circuit")!.id);
  const vals = async () => {
    for (let i = 0; i < 5; i += 1) {
      renderVals(app);
      await app.idle();
    }
    return renderVals(app);
  };
  await vals();
  const panel = () => {
    const html = renderToStaticMarkup(<AudienceView v={renderVals(app)} />);
    return /<div id="panel"[^>]*>/.exec(html)?.[0] ?? "";
  };
  return { app, panel };
}

describe("the ticket panel on a phone", () => {
  it("is a modal dialog while open, and the page's aside while closed", async () => {
    const { app, panel } = await onShow(390);
    expect(panel()).not.toContain('role="dialog"');
    (renderVals(app)["pn"] as { openSheet: () => void }).openSheet();
    expect(panel()).toContain('role="dialog"');
    expect(panel()).toContain('aria-modal="true"');
    expect(panel()).toContain('aria-label="Tickets"');
    (renderVals(app)["pn"] as { close: () => void }).close();
    expect(panel()).not.toContain('role="dialog"');
  });

  it("is never a dialog on a wide screen", async () => {
    const { app, panel } = await onShow(1280);
    app.setState({ panelOpen: true });
    expect(panel()).not.toContain('role="dialog"');
  });
});

async function boxAt(now?: string): Promise<{ app: WaveApp; vals: () => Promise<Record<string, unknown>> }> {
  const demo = new DemoAdminium();
  if (now !== undefined) demo.advanceTo(Date.parse(`${now}:00-04:00`));
  const app = new WaveApp({ audience: demo.audience, boxOffice: demo.boxOffice, door: demo.door }, "box", { lang: "en-US", theme: "dark" });
  app.demo = { onClock: (fn) => demo.onClock(fn), doorDevice: "Door 1", nextScan: (id) => demo.nextInQueue(id) };
  await app.start({ timers: false });
  const vals = async () => {
    for (let i = 0; i < 10; i += 1) {
      renderVals(app);
      await app.idle();
    }
    return renderVals(app);
  };
  return { app, vals };
}

describe("the box office's hub and the door", () => {
  it("an event's hub is a row of links between its screens, the current one marked", async () => {
    const { app, vals } = await boxAt();
    const box = boxOf(app);
    await vals();
    const show = box.world()!.shows.find((s) => s.name === "Neon Circuit")!;
    box.goShow(show.id, "sales");
    const html = renderToStaticMarkup(<StaffView v={await vals()} />);
    const hub = /<nav aria-label="Event"[^>]*>[\s\S]*?<\/nav>/.exec(html)?.[0] ?? "";
    expect(hub).not.toBe("");
    expect(hub).not.toContain('role="tab"');
    expect(hub.match(/aria-current="page"/g) ?? []).toHaveLength(1);
  });

  it("the open door has a heading", async () => {
    const { app, vals } = await boxAt("2026-07-28T20:15");
    app.setState({ bx: "door" });
    const v = await vals();
    expect((v["dd"] as { open: boolean }).open).toBe(true);
    const html = renderToStaticMarkup(<DoorView d={v["dd"]} s={v["s"]} bo={v["bo"]} />);
    expect(html).toMatch(/<h1 class="wv-sr">[^<]+<\/h1>/);
  });
});
