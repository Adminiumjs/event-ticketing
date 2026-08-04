/**
 * SALES (organizer) — four KPI chips, a per-ticket-type breakdown, and a small
 * pace chart.
 *
 * The KPI row and the stacked bars are computed from the same `inventory()`
 * call the attendee's event page uses, so a hold started in the other persona
 * shows up here as "held in carts" without anything syncing. The pace chart is
 * decoration for figures that are already written out above it, which is why
 * it is `aria-hidden` — a screen reader gets the numbers, not a shrug.
 */

import { PACE_DAYS } from "../data/demo.ts";
import { useI18n } from "../i18n/index.tsx";
import { clock, dateLong, dayMonth, label, money, number } from "../lib/format.ts";
import {
  checkInOpensAt,
  checkInState,
  dayOf,
  doorCount,
  inventory,
  salesPace,
  showById,
  showInventory,
} from "../lib/tickets.ts";
import type { Pace } from "../lib/tickets.ts";
import { useStore } from "../state/store.ts";
import { Empty, Kpi, Panel, StackedBar } from "../components/Primitives.tsx";

/**
 * The pace line. `preserveAspectRatio="none"` lets it stretch to whatever
 * width the panel is without a resize observer, which is the whole reason it
 * is an inline SVG rather than a canvas.
 */
function PaceChart({ pace }: { pace: Pace }) {
  const width = 100;
  const height = 32;
  const points = pace.points;
  const span = Math.max(1, points.length - 1);
  const floor = pace.base;
  const range = Math.max(1, pace.max - floor);

  const coords = points.map((p, i) => {
    const x = (i / span) * width;
    const y = height - ((p.cumulative - floor) / range) * height;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return (
    <svg
      className="wv-pace"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <polygon
        className="wv-pace__area"
        points={`0,${height} ${coords.join(" ")} ${width},${height}`}
      />
      <polyline className="wv-pace__line" points={coords.join(" ")} />
    </svg>
  );
}

export default function Sales() {
  const { t } = useI18n();
  const shows = useStore((s) => s.shows);
  const orgShowId = useStore((s) => s.orgShowId);
  const tickets = useStore((s) => s.tickets);
  const holds = useStore((s) => s.holds);
  const now = useStore((s) => s.clock);

  const show = showById(shows, orgShowId);
  if (show === null) {
    return (
      <div className="wv-screen">
        <Empty title={t("event.notFound.title")} body={t("event.notFound.body")} />
      </div>
    );
  }

  const inv = showInventory(show, tickets, holds, now);
  const through = doorCount(tickets, show.id, now);
  const state = checkInState(show, now);
  const gross = show.types.reduce(
    (cents, type) => cents + type.price * inventory(show, type, tickets, holds, now).sold,
    0,
  );

  const today = dayOf(now);
  const pace = salesPace(tickets, show.id, today - (PACE_DAYS - 1), today);

  return (
    <div className="wv-screen">
      <header className="wv-head">
        <h1 className="wv-head__title">{t("sales.title")}</h1>
        <p className="wv-head__sub">
          {t("sales.sub", { show: show.name, date: dateLong(show.date) })}
        </p>
      </header>

      <div className="wv-kpis">
        <Kpi
          label={t("sales.kpi.sold")}
          value={number(inv.sold)}
          hint={t("sales.kpi.sold.hint")}
        />
        <Kpi
          label={t("sales.kpi.held")}
          value={number(inv.held)}
          hint={t("sales.kpi.held.hint")}
          tone={inv.held > 0 ? "warn" : undefined}
        />
        <Kpi
          label={t("sales.kpi.remaining")}
          value={number(inv.remaining)}
          hint={t("sales.kpi.remaining.hint", { cap: number(inv.capacity) })}
        />
        <Kpi
          label={t("sales.kpi.door")}
          value={number(through)}
          hint={
            state === "before"
              ? t("sales.kpi.door.shut", { time: clock(checkInOpensAt(show)) })
              : state === "open"
                ? t("sales.kpi.door.open")
                : t("sales.kpi.door.after")
          }
          tone={state === "open" ? "pos" : undefined}
        />
        <Kpi
          label={t("sales.kpi.gross")}
          value={money(gross)}
          hint={t("sales.kpi.gross.hint")}
        />
      </div>

      <Panel title={t("sales.types.title")} subtitle={t("sales.types.sub")}>
        <div className="wv-legend">
          <span className="wv-legend__item">
            <span className="wv-legend__swatch wv-legend__swatch--sold" aria-hidden="true" />
            {t("sales.legend.sold")}
          </span>
          <span className="wv-legend__item">
            <span className="wv-legend__swatch wv-legend__swatch--held" aria-hidden="true" />
            {t("sales.legend.held")}
          </span>
          <span className="wv-legend__item">
            <span className="wv-legend__swatch wv-legend__swatch--rem" aria-hidden="true" />
            {t("sales.legend.remaining")}
          </span>
        </div>

        <div className="wv-typerows">
          {show.types.map((type) => {
            const row = inventory(show, type, tickets, holds, now);
            const counts = t("sales.row.counts", {
              sold: row.sold,
              held: row.held,
              remaining: row.remaining,
            });
            return (
              <div key={type.id} className="wv-typerow">
                <div className="wv-typerow__head">
                  <span className="wv-typerow__name">{label(type.name)}</span>
                  <span className="wv-typerow__cap wv-mono">
                    {t("chrome.fmt.ofTotal", { value: row.sold, total: row.capacity })}
                  </span>
                </div>
                <StackedBar
                  sold={row.sold}
                  held={row.held}
                  remaining={row.remaining}
                  capacity={row.capacity}
                  label={`${label(type.name)} — ${counts}`}
                />
                <p className="wv-typerow__counts wv-mono">{counts}</p>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title={t("sales.pace.title")} subtitle={t("sales.pace.sub")}>
        <PaceChart pace={pace} />
        <div className="wv-pace__foot">
          <span className="wv-mono">
            {dayMonth(pace.points[0].day)} · {t("sales.pace.from", { count: pace.base })}
          </span>
          <span className="wv-mono">
            {dayMonth(pace.points[pace.points.length - 1].day)} ·{" "}
            {t("sales.pace.to", { count: pace.max })}
          </span>
        </div>
      </Panel>

      <p className="wv-honest">{t("sales.honest")}</p>
    </div>
  );
}
