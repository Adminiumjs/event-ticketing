/**
 * The demo, opened as the website serves it: the first screen is still, and
 * axe finds nothing serious on it. Each screen of the audience site, the box
 * office and the door is added here as it is built, in every variant.
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
