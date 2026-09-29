/**
 * Every shortcut the demo card plays — the last Balcony seat bought by
 * someone else, a hold that runs out, a code scanned twice at the door — each
 * on a fresh Tuesday, on its own screen, shot and swept by axe. Then the
 * clock row: to the doors, and a whole day on.
 */
import { expect, test } from "@playwright/test";

import { DEMO_SCREENS } from "../src/demo-card.ts";
import { check, demoUrl, goTo, newContext, play, ready, settle, type WaveHandles } from "./browser.ts";

type Handles = { __wave: WaveHandles };

const MOMENTS = DEMO_SCREENS.flatMap((screen) => (screen.shortcuts ?? []).map((cut) => ({ screen, cut })));

test("every shortcut on its screen", async ({ browser }) => {
  expect(MOMENTS.length).toBeGreaterThan(25);
  const context = await newContext(browser, "light");
  const errors: string[] = [];
  for (const { screen, cut } of MOMENTS) {
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(`${cut.id}: ${error.message}`));
    await page.goto(demoUrl(screen.persona === "box" ? "box" : "audience", "light"));
    await ready(page);
    await goTo(page, screen.id);
    await play(page, cut.id);
    await settle(page);
    // A moment's own follow-up (a toast, a sheet, a verdict) lands a beat later.
    await page.waitForTimeout(400);
    await check(page, "moments", `${screen.id}-${cut.id}`, "light");
    await page.close();
  }
  expect(errors).toEqual([]);
  await context.close();
});

test("the clock row moves the venue on", async ({ browser }) => {
  const context = await newContext(browser, "light");
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(demoUrl("box", "light"));
  await ready(page);
  await goTo(page, "today");
  const now = () => page.evaluate(() => (window as unknown as Handles).__wave.app.now);
  const start = await now();
  await page.evaluate(() => (window as unknown as Handles).__wave.card.send({ type: "adminium:demo:clock", dv: 1, advance: "doors" }));
  await expect.poll(now).toBe(Date.parse("2026-07-28T23:58:00Z"));
  await check(page, "moments", "clock-doors", "light");
  await page.evaluate(() => (window as unknown as Handles).__wave.card.send({ type: "adminium:demo:clock", dv: 1, advance: "next-day" }));
  await expect.poll(now).toBeGreaterThan(start + 24 * 3_600_000);
  await check(page, "moments", "clock-next-day", "light");
  expect(errors).toEqual([]);
  await context.close();
});
