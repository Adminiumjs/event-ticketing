/**
 * HOME — "Upcoming at Waveform".
 *
 * A grid of shows plus one wide banner for the festival, which is a different
 * kind of thing (two days, both rooms) and would read as a lie squeezed into
 * the same card as a Tuesday club night.
 *
 * Every card's status chip comes from the engine, not from a field on the
 * seed, so advancing the clock re-labels the grid without anything here
 * knowing that time moved.
 */

import { ArrowRight, Clock3, MapPin } from "lucide-react";

import { useI18n } from "../i18n/index.tsx";
import { clock, dayMonth, label, money } from "../lib/format.ts";
import {
  dayOf,
  doorsAt,
  fromPrice,
  showStatus,
  upcoming,
} from "../lib/tickets.ts";
import { useStore } from "../state/store.ts";
import { Art, Chip, DateTile, Empty, StatusChip } from "../components/Primitives.tsx";
import type { Show } from "../data/types.ts";

function ShowCard({ show, tonight }: { show: Show; tonight: boolean }) {
  const { t } = useI18n();
  const tickets = useStore((s) => s.tickets);
  const holds = useStore((s) => s.holds);
  const now = useStore((s) => s.clock);
  const openShow = useStore((s) => s.openShow);

  const status = showStatus(show, tickets, holds, now);

  /*
   * An <article> with one stretched button rather than a card-sized <button>:
   * a heading is not phrasing content and cannot legally live inside a button,
   * and losing the heading would leave the grid unnavigable by landmark.
   */
  return (
    <article className="wv-showcard wv-card">
      {/* The date tile floats in the corner OPPOSITE the art's own mono chip
          (house layout rule 2), so the two can never overlap at any width. */}
      <Art show={show} height={148} glyph={78} badge={<DateTile show={show} />} />

      <div className="wv-showcard__body">
        <div className="wv-showcard__head">
          <h3 className="wv-showcard__name">
            <button
              type="button"
              className="wv-showcard__open"
              onClick={() => openShow(show.id)}
            >
              {show.name}
              <span className="wv-sr-only"> — {t("home.card.open")}</span>
            </button>
          </h3>
          {tonight && <Chip tone="accent">{t("chrome.status.tonight")}</Chip>}
        </div>
        <p className="wv-showcard__sub">{label(show.sub)}</p>

        <div className="wv-showcard__facts">
          <span className="wv-fact">
            <MapPin size={13} aria-hidden="true" />
            {label(show.room)}
          </span>
          <span className="wv-fact">
            <Clock3 size={13} aria-hidden="true" />
            {t("home.card.doors")} <span className="wv-mono">{clock(doorsAt(show))}</span>
          </span>
        </div>

        <div className="wv-showcard__foot">
          <span className="wv-price wv-mono">
            {t("home.card.from", { price: money(fromPrice(show)) })}
          </span>
          <StatusChip status={status} />
        </div>
      </div>
    </article>
  );
}

function FestivalBanner({ show }: { show: Show }) {
  const { t } = useI18n();
  const tickets = useStore((s) => s.tickets);
  const holds = useStore((s) => s.holds);
  const now = useStore((s) => s.clock);
  const openShow = useStore((s) => s.openShow);

  return (
    <article className="wv-banner wv-card">
      <Art show={show} glyph={140} className="wv-banner__art" badge={<DateTile show={show} />} />

      <div className="wv-banner__body">
        <Chip tone="accent">{t("home.banner.badge")}</Chip>
        <h3 className="wv-banner__name">{show.name}</h3>
        <p className="wv-banner__sub">
          {label(show.sub)} ·{" "}
          <span className="wv-mono">
            {dayMonth(show.date)}–{dayMonth(show.date2 ?? show.date)}
          </span>
        </p>
        <p className="wv-banner__desc">{label(show.desc)}</p>

        <div className="wv-banner__foot">
          <span className="wv-price wv-mono">
            {t("home.card.from", { price: money(fromPrice(show)) })}
          </span>
          <StatusChip status={showStatus(show, tickets, holds, now)} />
          <button
            type="button"
            className="wv-banner__cta wv-btn"
            onClick={() => openShow(show.id)}
          >
            {t("home.banner.cta")}
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const { t } = useI18n();
  const shows = useStore((s) => s.shows);
  const now = useStore((s) => s.clock);

  const list = upcoming(shows, now);
  const festival = list.find((s) => s.date2 !== undefined) ?? null;
  const nights = list.filter((s) => s !== festival);
  const today = dayOf(now);

  return (
    <div className="wv-screen">
      <header className="wv-hero">
        <h1 className="wv-hero__title">{t("home.title")}</h1>
        <p className="wv-hero__sub">{t("home.sub")}</p>
      </header>

      {list.length === 0 ? (
        <Empty title={t("home.empty.title")} body={t("home.empty.body")} />
      ) : (
        <>
          <div className="wv-grid">
            {nights.map((show) => (
              <ShowCard key={show.id} show={show} tonight={show.date === today} />
            ))}
          </div>
          {festival !== null && <FestivalBanner show={festival} />}
        </>
      )}
    </div>
  );
}
