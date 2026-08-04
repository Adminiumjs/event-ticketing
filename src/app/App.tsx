/**
 * The app shell.
 *
 * Routing is a plain state switch over `store.view` — no react-router. Every
 * member of the `View` union is mapped to a screen below, so no nav item,
 * sheet link or button can land on a route that does not exist; anything the
 * union does not cover falls through to the 404.
 *
 * The chrome — the two shells, the dock, the toast layer — is mounted once
 * around the switch, so a view change never remounts it and a toast survives
 * the navigation that raised it.
 */

import { useEffect } from "react";
import type { ComponentType } from "react";

import DemoDock from "../components/DemoDock.tsx";
import { ToastLayer } from "../components/Overlays.tsx";
import Shell from "../components/Shell.tsx";
import type { View } from "../data/types.ts";
import { setAmbient } from "../i18n/ambient.ts";
import { useI18n } from "../i18n/index.tsx";
import { useStore } from "../state/store.ts";

import Attendees from "../screens/Attendees.tsx";
import Checkout from "../screens/Checkout.tsx";
import Confirm from "../screens/Confirm.tsx";
import Door from "../screens/Door.tsx";
import EventPage from "../screens/Event.tsx";
import Home from "../screens/Home.tsx";
import MyTickets from "../screens/MyTickets.tsx";
import NotFound from "../screens/NotFound.tsx";
import Sales from "../screens/Sales.tsx";

const SCREENS: Record<View, ComponentType> = {
  home: Home,
  event: EventPage,
  checkout: Checkout,
  confirm: Confirm,
  mytickets: MyTickets,
  sales: Sales,
  attendees: Attendees,
  door: Door,
  notfound: NotFound,
};

function CurrentScreen() {
  const view = useStore((s) => s.view);
  /* Unknown values can only arrive from injected state — 404 them. */
  const Screen = SCREENS[view] ?? NotFound;
  return <Screen />;
}

export default function App() {
  const initTheme = useStore((s) => s.initTheme);
  const escape = useStore((s) => s.escape);
  const tickHold = useStore((s) => s.tickHold);
  const holding = useStore((s) => s.holds.some((h) => h.mine));

  /*
   * Publish the live locale to the module-level bridge before anything below
   * renders. `lib/format.ts` builds its `Intl` instances from it, and the
   * store and the engine call those formatters from outside React where no
   * hook can reach the provider. Assigning during render rather than in an
   * effect matters: children render after this line, so the first paint after
   * a locale switch is already in the new locale instead of one frame behind.
   */
  const { locale, t, money, number } = useI18n();
  setAmbient(locale, t, money, number);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  /*
   * The ONLY moving clock in the app, and it only runs while the reader is
   * holding tickets. `tickHold` advances a counter the store owns; it never
   * reads the wall clock, so the demo shows the same minute on every machine
   * until somebody starts a hold or presses "Advance to doors".
   */
  useEffect(() => {
    if (!holding) return;
    const id = window.setInterval(tickHold, 1000);
    return () => window.clearInterval(id);
  }, [holding, tickHold]);

  /* Document-level Escape. The store closes overlays outermost-first. */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") escape();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [escape]);

  return (
    <>
      <a className="wv-sr-only" href="#main">
        {t("chrome.skipToContent")}
      </a>
      <Shell>
        <CurrentScreen />
      </Shell>
      <DemoDock />
      <ToastLayer />
    </>
  );
}
