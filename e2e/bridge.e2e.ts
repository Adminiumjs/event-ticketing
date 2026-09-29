/**
 * The demo inside the website's card: a page on the demo's own origin frames
 * the demo build and speaks the card's protocol to it — init, a screen, a
 * shortcut, the clock — and the demo answers with `hello` and its `state`.
 * A page on another origin gets no answer at all.
 */
import { expect, test, type Page } from "@playwright/test";

import { DEMO_BASE } from "../playwright.config.ts";

interface State {
  type: string;
  screen?: string;
  persona?: string | null;
  clockLabel?: string;
  locale?: string;
  theme?: string;
  overlay?: boolean;
}

async function frame(page: Page, src: string): Promise<void> {
  await page.setContent(`<!doctype html><html><body style="margin:0"><iframe id="demo" src="${src}" style="width:1280px;height:900px;border:0"></iframe>
<script>
window.got = [];
window.addEventListener("message", (e) => { if (e.data && typeof e.data.type === "string" && e.data.type.startsWith("adminium:demo:")) window.got.push(e.data); });
window.send = (m) => document.getElementById("demo").contentWindow.postMessage(Object.assign({ dv: 1 }, m), "*");
</script></body></html>`);
}

const got = (page: Page) => page.evaluate(() => (window as unknown as { got: State[] }).got);
const send = (page: Page, message: object) => page.evaluate((m) => (window as unknown as { send: (m: object) => void }).send(m), message);

test("the card drives the demo, and the demo says where it is", async ({ page, baseURL }) => {
  // The framing page must share the demo's origin, as the website's card does.
  await page.goto(`${baseURL!}/`);
  await frame(page, `${baseURL!}${DEMO_BASE}`);
  const last = async (): Promise<State> => (await got(page)).filter((m) => m.type === "adminium:demo:state").at(-1) ?? { type: "" };
  await expect.poll(async () => (await got(page)).map((m) => m.type), { timeout: 30_000 }).toContain("adminium:demo:hello");

  await send(page, { type: "adminium:demo:init", locale: "de-DE", theme: "dark", persona: "box", screen: "sales" });
  await expect.poll(async () => (await last()).screen).toBe("sales");
  expect((await last()).locale).toBe("de-DE");
  expect((await last()).theme).toBe("dark");

  await send(page, { type: "adminium:demo:go", screen: "home" });
  await expect.poll(async () => (await last()).persona).toBe("aud");
  expect((await last()).screen).toBe("home");

  await send(page, { type: "adminium:demo:go", screen: "door" });
  await send(page, { type: "adminium:demo:do", shortcut: "door-ok" });
  // The door's verdict covers the page: the card hides.
  await expect.poll(async () => (await last()).overlay, { timeout: 30_000 }).toBe(true);

  const before = (await last()).clockLabel;
  await send(page, { type: "adminium:demo:clock", advance: "next-day" });
  await expect.poll(async () => (await last()).clockLabel).not.toBe(before);
});

test("a page on another origin gets no answer", async ({ page, baseURL }) => {
  // 127.0.0.1 and localhost are two origins for one server.
  const other = baseURL!.replace("127.0.0.1", "localhost");
  await page.goto(`${baseURL!}/`);
  await frame(page, `${other}${DEMO_BASE}`);
  await page.frameLocator("#demo").locator("main").first().waitFor();
  await send(page, { type: "adminium:demo:go", screen: "today" });
  await page.waitForTimeout(1000);
  expect(await got(page)).toEqual([]);
});
