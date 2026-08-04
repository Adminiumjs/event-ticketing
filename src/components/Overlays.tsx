/**
 * The overlay layer: toasts and the organizer's show switcher.
 *
 * The toast layer is mounted once at the root, outside the view switch, so a
 * view change never remounts it and a toast raised by an action survives the
 * navigation that action triggered. The switcher is anchored to its button in
 * the topbar, so it lives with the chrome instead.
 */

import { AlertTriangle, Check, ChevronDown, X } from "lucide-react";

import { useI18n } from "../i18n/index.tsx";
import { clock, dateShort, label } from "../lib/format.ts";
import { doorsAt, showInventory } from "../lib/tickets.ts";
import { useStore } from "../state/store.ts";

export function ToastLayer() {
  const { t } = useI18n();
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);

  return (
    <div className="wv-toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`wv-toast wv-toast--${toast.tone}`}>
          {toast.tone === "pos" && <Check size={15} aria-hidden="true" />}
          {toast.tone === "warn" && <AlertTriangle size={15} aria-hidden="true" />}
          <span>{toast.text}</span>
          <button
            type="button"
            className="wv-toast__x"
            onClick={() => dismiss(toast.id)}
            aria-label={t("chrome.toast.dismiss")}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Every show in one popover, with the same sold/capacity figures the sales
 * screen shows. Door staff switch between rooms mid-evening, so the list
 * carries enough to pick the right one without opening it first.
 */
export function ShowSwitcher() {
  const { t } = useI18n();
  const open = useStore((s) => s.switcherOpen);
  const setOpen = useStore((s) => s.setSwitcherOpen);
  const shows = useStore((s) => s.shows);
  const tickets = useStore((s) => s.tickets);
  const holds = useStore((s) => s.holds);
  const orgShowId = useStore((s) => s.orgShowId);
  const setOrgShow = useStore((s) => s.setOrgShow);
  const now = useStore((s) => s.clock);

  const current = shows.find((s) => s.id === orgShowId);

  return (
    <div className="wv-switcher">
      <button
        type="button"
        className="wv-switcher__btn wv-btn"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={t("chrome.switcher.open")}
      >
        <span className="wv-switcher__name">{current?.name ?? "—"}</span>
        <span className="wv-switcher__when wv-mono">
          {current === undefined ? "" : dateShort(current.date)}
        </span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>

      {open && (
        <>
          {/* A full-bleed catcher rather than a document listener: one click
              outside closes it, and the click does not also hit whatever it
              landed on. */}
          <button
            type="button"
            className="wv-popcatch"
            aria-label={t("chrome.action.close")}
            onClick={() => setOpen(false)}
          />
          <div className="wv-popover wv-scroll" role="dialog" aria-modal="true" aria-label={t("chrome.switcher.title")}>
            <div className="wv-popover__title">{t("chrome.switcher.title")}</div>
            {shows.map((show) => {
              const inv = showInventory(show, tickets, holds, now);
              const selected = show.id === orgShowId;
              return (
                <button
                  key={show.id}
                  type="button"
                  className="wv-popover__item"
                  aria-current={selected ? "true" : undefined}
                  onClick={() => setOrgShow(show.id)}
                >
                  <span className="wv-popover__main">
                    <span className="wv-popover__name">{show.name}</span>
                    <span className="wv-popover__meta">
                      {label(show.room)} · {dateShort(show.date)}{" "}
                      <span className="wv-mono">{clock(doorsAt(show))}</span>
                    </span>
                  </span>
                  <span className="wv-popover__count wv-mono">
                    {t("chrome.fmt.ofTotal", { value: inv.sold, total: inv.capacity })}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
