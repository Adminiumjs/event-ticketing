/**
 * A smoke pass: the demo opens as the website serves it, in every variant,
 * and its first screen settles. No axe sweep runs yet — `check()` in
 * `browser.ts` (axe, the reading direction, overflow) is what the screens of
 * the audience site, the box office and the door will each go through as they
 * are added here.
 */
import { expect, test } from "@playwright/test";

import { newContext, settle, VARIANTS } from "./browser.ts";
import { DEMO_BASE } from "../playwright.config.ts";

for (const variant of VARIANTS) {
  test(`the demo opens (${variant})`, async ({ browser }) => {
    const context = await newContext(browser, variant);
    const page = await context.newPage();
    await page.goto(DEMO_BASE);
    await settle(page);
    await expect(page.locator("body")).toBeVisible();
    await context.close();
  });
}
