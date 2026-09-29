/**
 * Every screen the demo card offers, on both sides — the audience site and
 * the box office with its door — in light, dark, Arabic and on a phone, each
 * shot and swept by axe. A screen that is about something (a checkout, an
 * order, a friend's ticket, an offer) is given one by the card's own `go`.
 */
import { expect, test } from "@playwright/test";

import { DEMO_SCREENS } from "../src/demo-card.ts";
import { check, demoUrl, goTo, newContext, ready, showing, VARIANTS } from "./browser.ts";

/** The screen the controller reports for a card screen (a festival is a show's page). */
const expected = (view: string) => (view === "festival" ? "event" : view);

for (const variant of VARIANTS) {
  test(`every screen, ${variant}`, async ({ browser }) => {
    const context = await newContext(browser, variant);
    const errors: string[] = [];
    for (const screen of DEMO_SCREENS) {
      // Each screen on a fresh Tuesday, so one screen's setup never shows on the next.
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(`${screen.id}: ${error.message}`));
      await page.goto(demoUrl(screen.persona === "box" ? "box" : "audience", variant));
      await ready(page);
      await goTo(page, screen.id);
      await expect.poll(() => showing(page), { message: `${screen.id} did not open` }).toBe(expected(screen.view));
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await check(page, screen.persona === "box" ? "box" : "audience", screen.id, variant);
      await page.close();
    }
    expect(errors).toEqual([]);
    await context.close();
  });
}
