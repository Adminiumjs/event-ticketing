/**
 * The venue on screen: one controller, its values worked out on every
 * change, and the design's screens drawn from them — the audience site or
 * the box office and door, the sheets over either, and the toast.
 */
import { useEffect, useRef, useSyncExternalStore } from "react";

import { AudienceView } from "../view/AudienceView.tsx";
import { BoxLayersView } from "../view/BoxLayersView.tsx";
import { OverlaysView } from "../view/OverlaysView.tsx";
import { StaffView } from "../view/StaffView.tsx";
import { st } from "../view/dom.tsx";
import { AUDIENCE, STAFF } from "./sides.ts";
import { docTitle } from "./title.ts";
import { renderVals } from "./vals/base.ts";
import type { WaveApp } from "./wave.ts";

import "./wave.css";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** What counts as a layer over the page: a sheet, a menu, a dialog (the phone's ticket panel is one while open). */
const LAYER = '[role="dialog"],[role="alertdialog"],[role="menu"]';

/** The sheet, menu or dialog on top, if one is open. */
function topLayer(): HTMLElement | null {
  const all = [...document.querySelectorAll<HTMLElement>(LAYER)];
  return all[all.length - 1] ?? null;
}

/**
 * A sheet or dialog keeps the keyboard inside it: its first control is
 * focused as it opens (the layer itself when it has none — a verdict with no
 * buttons), Tab goes round its own controls, and closing it gives focus back
 * to what opened it. A menu is not a trap: the arrows move through it, and
 * Tab leaves it closed (`WaveRoot`).
 */
function useLayerFocus(): void {
  // A stack: a sheet opened from the drawer gives focus back to the drawer's button, then the drawer to its row.
  const layers = useRef<{ el: HTMLElement; opener: Element | null }[]>([]);
  useEffect(() => {
    const top = topLayer();
    const stack = layers.current;
    // Layers that closed since: each gives focus back to what opened it.
    let back: Element | null = null;
    // A layer closes by leaving the page, or by staying and ceasing to be one (the phone's ticket panel).
    const gone = (el: HTMLElement) => !el.isConnected || !el.matches(LAYER);
    while (stack.length > 0 && gone(stack[stack.length - 1]!.el)) back = stack.pop()!.opener;
    if (top !== null && stack[stack.length - 1]?.el !== top) {
      stack.push({ el: top, opener: back ?? document.activeElement });
      const first = top.querySelector<HTMLElement>("[data-autofocus]") ?? top.querySelector<HTMLElement>("input,textarea") ?? top.querySelector<HTMLElement>(FOCUSABLE);
      if (first !== null) first.focus();
      else {
        if (!top.hasAttribute("tabindex")) top.tabIndex = -1;
        top.focus();
      }
    } else if (back instanceof HTMLElement && back.isConnected) back.focus();
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const top = topLayer();
      if (top === null || top.getAttribute("role") === "menu") return;
      const items = [...top.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        // Nothing to press (a verdict that only speaks): the keyboard stays on the layer.
        e.preventDefault();
        if (!top.hasAttribute("tabindex")) top.tabIndex = -1;
        top.focus();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const at = document.activeElement;
      if (!top.contains(at)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && at === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && at === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export function WaveRoot({ app }: { app: WaveApp }) {
  useSyncExternalStore(app.subscribe, app.snapshot);
  useLayerFocus();
  useEffect(() => {
    const onResize = () => app.setState({ width: window.innerWidth });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") app.escape();
      if (e.defaultPrevented) return;
      // A menu: Up/Down (and Home/End) move through its items; Tab leaves it, closed, back where it opened from.
      const menu = (e.target as HTMLElement | null)?.closest?.('[role="menu"]');
      if (menu instanceof HTMLElement) {
        if (e.key === "Tab") {
          e.preventDefault();
          app.escape();
          return;
        }
        const items = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')];
        const i = items.indexOf(e.target as HTMLElement);
        const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: items.length - 1 }[e.key];
        if (to !== undefined && items.length > 0) {
          e.preventDefault();
          items[(to + items.length) % items.length]!.focus();
        }
        return;
      }
      // A radio group: the arrows move to the next choice and take it.
      const radio = (e.target as HTMLElement | null)?.closest?.('[role="radio"]');
      const group = radio?.closest('[role="radiogroup"]');
      if (radio instanceof HTMLElement && group !== null && group !== undefined && ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) {
        const items = [...group.querySelectorAll<HTMLElement>('[role="radio"]')].filter((x) => x.getAttribute("aria-disabled") !== "true");
        const i = items.indexOf(radio);
        if (i < 0 || items.length < 2) return;
        const rtl = getComputedStyle(group).direction === "rtl";
        const fwd = e.key === "ArrowDown" || (e.key === "ArrowRight" && !rtl) || (e.key === "ArrowLeft" && rtl);
        const next = items[(i + (fwd ? 1 : -1) + items.length) % items.length]!;
        e.preventDefault();
        next.focus();
        next.click();
      }
    };
    // The editor's unsaved changes: closing or reloading the tab asks first.
    const onLeave = (e: BeforeUnloadEvent) => {
      if (STAFF && app.persona === "box" && app.state.box?.edDirty === true) e.preventDefault();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [app]);
  const v = renderVals(app);
  useEffect(() => {
    document.documentElement.lang = String(v["langCode"]);
    document.documentElement.dir = String(v["dir"]);
    document.documentElement.dataset["theme"] = String(v["themeAttr"]);
    document.documentElement.style.background = "var(--bg)";
    // Every screen names itself in the tab (and to a screen reader's page change).
    const title = docTitle(app);
    if (title !== "" && document.title !== title) document.title = title;
  });
  return (
    <div data-wv-root="1" dir={String(v["dir"])} lang={String(v["langCode"])} style={st(String(v["rootStyle"]))}>
      <div style={st(String(v["frameWrap"]))}>
        {AUDIENCE && app.persona === "audience" ? (
          <div data-wv-scroll="1" style={st(String(v["scrollStyle"]))}>
            <AudienceView v={v} />
          </div>
        ) : null}
        {STAFF && app.persona === "box" ? <StaffView v={v} /> : null}
        {STAFF && app.persona === "box" ? <BoxLayersView v={v} /> : null}
        <OverlaysView v={v} />
        <div id="wv-said" className="wv-sr" role="status" aria-live="polite" />
      </div>
    </div>
  );
}
