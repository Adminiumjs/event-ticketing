/**
 * The box office and the door as a real Adminium serves them: the app made
 * with the staff's two ports and no audience port, exactly as `bootAdminium`
 * makes it. Every other test here builds the demo's app, which has all three,
 * so a staff screen that reached for the audience's port drew a blank page on
 * every hosted install and passed every test.
 *
 * One frame of each is drawn the way `WaveRoot` draws it: the values, the tab's
 * title its effect sets, and the markup.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import manifest from "../../manifest.json";
import type { BoxOfficePort } from "../data/ports.ts";
import { ApiError } from "../data/wire.ts";
import { DemoAdminium } from "../demo/adminium.ts";
import { DemoBoxOffice, DemoDoor } from "../demo/sides.ts";
import { DoorView } from "../view/DoorView.tsx";
import { StaffView } from "../view/StaffView.tsx";
import { tabTitle } from "./WaveRoot.tsx";
import { boxOf } from "./box.ts";
import { renderVals } from "./vals/base.ts";
import { WaveApp } from "./wave.ts";

vi.setConfig({ testTimeout: 60_000 });

/** What the manifest's role may do with each table, by short name — what Adminium tells the staff side. */
function grants(role: string): Record<string, string[]> {
  const tables: Record<string, string[]> = {};
  for (const p of manifest.roles.find((r) => r.key === role)!.permissions) {
    const m = /^table:@([a-z_]+):([a-z]+)$/.exec(p);
    if (m !== null) (tables[m[1]!] ??= []).push(m[2]!);
  }
  return tables;
}

/**
 * The demo's box office answering as Adminium does for a role: it says what the role may do, and refuses
 * a read of a table the role has no grant on. (The demo's own port reads every table for anyone.)
 */
function asRole(port: BoxOfficePort, role: string): { port: BoxOfficePort; refused: string[] } {
  const tables = grants(role);
  const refused: string[] = [];
  const read = (table: string) => {
    if ((tables[table] ?? []).includes("read")) return;
    refused.push(table);
    throw new ApiError(403, "TABLE_FORBIDDEN");
  };
  const wrapped = new Proxy(port, {
    get(target, key) {
      if (key === "me") return async () => ({ ...(await target.me()), tables });
      if (key === "rows" || key === "list" || key === "count")
        return async (table: string, ...rest: unknown[]) => {
          read(table);
          return (target[key] as (table: string, ...rest: unknown[]) => unknown).call(target, table, ...rest);
        };
      const v = Reflect.get(target, key, target) as unknown;
      return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(target) : v;
    },
  });
  return { port: wrapped, refused };
}

/** The hosted staff build's app: `{ boxOffice, door }` and nothing else. */
async function hosted(opts: { now?: string; person?: { name: string; roles: string[] } } = {}) {
  const demo = new DemoAdminium();
  if (opts.now !== undefined) demo.advanceTo(Date.parse(`${opts.now}:00-04:00`));
  const ports = opts.person === undefined ? { boxOffice: demo.boxOffice, door: demo.door } : { boxOffice: new DemoBoxOffice(demo.engine, opts.person), door: new DemoDoor(demo.engine, opts.person) };
  const app = new WaveApp(ports, "box", { lang: "en-US", theme: "dark" });
  expect(app.ports.audience).toBeUndefined();
  await app.start({ timers: false });
  /** One frame, as `WaveRoot` draws it: the values, then the title its effect sets. */
  const frame = () => {
    const v = renderVals(app);
    return { v, title: tabTitle(app) };
  };
  const settled = async () => {
    for (let i = 0; i < 10; i += 1) {
      frame();
      await app.idle();
    }
    return frame();
  };
  return { app, frame, settled };
}

describe("the staff side with no audience port", () => {
  it("draws the box office's first frame, before Adminium has answered", async () => {
    const { frame } = await hosted();
    const { v, title } = frame();
    expect(title).toBe("Today");
    expect(() => renderToStaticMarkup(<StaffView v={v} />)).not.toThrow();
  });

  it("draws Today and names the venue from the box office's own settings", async () => {
    const { app, settled } = await hosted();
    const { v, title } = await settled();
    const venue = boxOf(app).world()!.settings.venueName;
    expect(venue).not.toBe("");
    expect(title).toBe(`Today · ${venue}`);
    expect(renderToStaticMarkup(<StaffView v={v} />)).not.toBe("");
  });

  it("names the show an event's screen is about", async () => {
    const { app, settled } = await hosted();
    await settled();
    const box = boxOf(app);
    const show = box.world()!.shows.find((s) => s.name === "Neon Circuit")!;
    box.goShow(show.id, "sales");
    expect((await settled()).title).toBe(`Neon Circuit · ${box.world()!.settings.venueName}`);
  });

  it("draws the door, for the box office and for someone who only works the door", async () => {
    for (const person of [undefined, { name: "Dana Door", roles: ["door"] }]) {
      const { app, settled } = await hosted({ now: "2026-07-28T20:15", person });
      app.setState({ bx: "door" });
      const { v, title } = await settled();
      expect(title).toMatch(/^Door( · .+)?$/);
      expect(renderToStaticMarkup(<DoorView d={v["dd"]} s={v["s"]} bo={v["bo"]} />)).not.toBe("");
    }
  });

  it("opens the door for the Door role, which may read neither acts nor questions", async () => {
    const demo = new DemoAdminium();
    demo.advanceTo(Date.parse("2026-07-28T20:15:00-04:00"));
    const person = { name: "Dee", roles: ["door"] };
    const { port, refused } = asRole(new DemoBoxOffice(demo.engine, person), "door");
    const app = new WaveApp({ boxOffice: port, door: new DemoDoor(demo.engine, person) }, "box", { lang: "en-US", theme: "dark" });
    await app.start({ timers: false });
    app.setState({ bx: "door" });
    for (let i = 0; i < 10; i += 1) {
      renderVals(app);
      await app.idle();
    }
    const box = boxOf(app);
    expect(box.can("acts", "read")).toBe(false);
    expect(box.can("questions", "read")).toBe(false);
    // The venue arrives without them, and neither was asked for.
    expect(box.world()).not.toBeNull();
    expect(refused.filter((t) => t === "acts" || t === "questions")).toEqual([]);
    const v = renderVals(app);
    expect((v["dd"] as { open: boolean }).open).toBe(true);
    expect(tabTitle(app)).toBe(`Door · ${box.world()!.settings.venueName}`);
    expect(renderToStaticMarkup(<DoorView d={v["dd"]} s={v["s"]} bo={v["bo"]} />)).toContain("Neon Circuit");
  });

  it("has no audience's venue to read, and says so with null", async () => {
    const { app } = await hosted();
    expect(app.world()).toBeNull();
  });
});
