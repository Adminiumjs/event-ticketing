/**
 * Every screen the demo card offers, on both sides — the audience site and
 * the box office with its door — in light, dark, Arabic and on a phone, each
 * shot and swept by axe. A screen that is about something (a checkout, an
 * order, a ticket, an offer) is first given one, as the card's shortcuts or
 * an emailed link would.
 */
import { expect, test, type Page } from "@playwright/test";

import { DEMO_SCREENS } from "../src/demo-card.ts";
import { check, demoUrl, goTo, newContext, play, ready, showing, VARIANTS, type WaveHandles } from "./browser.ts";

type Handles = { __wave: WaveHandles };

/** What a screen needs before the card can open it. */
const SETUP: Record<string, (page: Page) => Promise<void>> = {
  checkout: (page) => play(page, "fill"),
  going: (page) => play(page, "going-paid"),
  tickets: (page) => play(page, "mia"),
  doormode: async (page) => {
    await play(page, "mia");
    await page.evaluate(async () => {
      const { app } = (window as unknown as Handles).__wave;
      app.goTickets();
      await app.idle();
      app.setState({ dm: { orderId: -1, i: 0, via: "me" } });
    });
  },
  // A friend's ticket, opened by the link in the friend's email.
  friend: (page) =>
    page.evaluate(async () => {
      const { app, demo } = (window as unknown as Handles).__wave;
      const sent = demo.world.all("tickets").find((t) => t["status"] === "offered" && typeof t["link_token"] === "string");
      if (sent === undefined) throw new Error("the sample has no ticket waiting for a friend");
      await app.arrive("/t", `#${String(sent["link_token"])}`);
    }),
  // A waitlist offer, opened by the link in its email.
  offer: (page) =>
    page.evaluate(async () => {
      const { app, demo } = (window as unknown as Handles).__wave;
      const offered = demo.world.all("orders").find((o) => o["status"] === "offered");
      if (offered === undefined) throw new Error("the sample has no waitlist offer");
      await app.buyer.openByLink(String(offered["link_token"]));
    }),
};

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
      await SETUP[screen.id]?.(page);
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
