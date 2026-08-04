/**
 * EVENT PAGE — art header, the facts, and the ticket-types panel.
 *
 * The panel is the whole product in one screen: every remaining count is
 * derived at render time from tickets and holds against the store's clock, so
 * "Get tickets" visibly drops the numbers the instant the hold exists, and
 * letting the hold run out visibly puts them back. Nothing here writes a
 * remaining count anywhere.
 */

import { ArrowLeft, CalendarDays, Clock3, MapPin, Music2, Ticket } from "lucide-react";

import { useI18n } from "../i18n/index.tsx";
import { clock, dateLong, dowClock, label, money } from "../lib/format.ts";
import {
  MAX_PER_TYPE,
  doorsAt,
  endsAt,
  holdQty,
  inventory,
  saleStartOf,
  showById,
  stageTimeAt,
  typeSaleState,
} from "../lib/tickets.ts";
import { useStore } from "../state/store.ts";
import {
  Art,
  Button,
  Chip,
  DateTile,
  Empty,
  Meter,
  Panel,
  Stepper,
} from "../components/Primitives.tsx";
import type { Show, TicketType } from "../data/types.ts";

function Facts({ show }: { show: Show }) {
  const { t } = useI18n();
  return (
    <dl className="wv-facts">
      <div className="wv-facts__row">
        <dt>
          <CalendarDays size={13} aria-hidden="true" />
          {t("event.facts.date")}
        </dt>
        <dd className="wv-mono">{dateLong(show.date)}</dd>
      </div>
      <div className="wv-facts__row">
        <dt>
          <Clock3 size={13} aria-hidden="true" />
          {t("event.facts.doors")}
        </dt>
        <dd className="wv-mono">{clock(doorsAt(show))}</dd>
      </div>
      <div className="wv-facts__row">
        <dt>
          <Music2 size={13} aria-hidden="true" />
          {t("event.facts.stage")}
        </dt>
        <dd className="wv-mono">{clock(stageTimeAt(show))}</dd>
      </div>
      <div className="wv-facts__row">
        <dt>
          <MapPin size={13} aria-hidden="true" />
          {t("event.facts.room")}
        </dt>
        <dd>{label(show.room)}</dd>
      </div>
    </dl>
  );
}

function TypeRow({ show, type }: { show: Show; type: TicketType }) {
  const { t } = useI18n();
  const tickets = useStore((s) => s.tickets);
  const holds = useStore((s) => s.holds);
  const now = useStore((s) => s.clock);
  const quantities = useStore((s) => s.quantities);
  const setQuantity = useStore((s) => s.setQuantity);

  const inv = inventory(show, type, tickets, holds, now);
  const state = typeSaleState(show, type, tickets, holds, now);
  const qty = quantities[type.id] ?? 0;
  const name = label(type.name);

  return (
    <div className={`wv-type${state === "onSale" ? "" : " wv-type--off"}`}>
      <div className="wv-type__head">
        <div className="wv-type__id">
          <h3 className="wv-type__name">{name}</h3>
          <p className="wv-type__note">{label(type.note)}</p>
        </div>
        <span className="wv-type__price wv-mono">{money(type.price)}</span>
      </div>

      {state === "onSale" && (
        <>
          <Meter
            remaining={inv.remaining}
            capacity={inv.capacity}
            label={t("event.type.bar", { count: inv.remaining, cap: inv.capacity })}
          />
          <div className="wv-type__foot">
            <span className="wv-type__left wv-mono">
              {t("event.type.left", { count: inv.remaining, cap: inv.capacity })}
            </span>
            <Stepper
              value={qty}
              /* Six per ticket type, or whatever is actually left if that is
                 fewer — offering a seventh you cannot have is a worse
                 experience than a stepper that stops. */
              max={Math.min(MAX_PER_TYPE, inv.remaining)}
              onChange={(next) => setQuantity(type.id, next)}
              labelValue={t("event.type.qty", { type: name })}
              labelMinus={t("event.type.minus", { type: name })}
              labelPlus={t("event.type.plus", { type: name })}
            />
          </div>
        </>
      )}

      {state === "soldOut" && (
        <div className="wv-type__foot">
          <Chip>{t("event.type.soldOut")}</Chip>
        </div>
      )}

      {state === "notYetOnSale" && (
        <div className="wv-type__foot">
          <Chip tone="info">
            {t("event.type.notYet", { when: dowClock(saleStartOf(show, type)) })}
          </Chip>
        </div>
      )}
    </div>
  );
}

export default function EventPage() {
  const { t } = useI18n();
  const shows = useStore((s) => s.shows);
  const showId = useStore((s) => s.showId);
  const now = useStore((s) => s.clock);
  const quantities = useStore((s) => s.quantities);
  const tickets = useStore((s) => s.tickets);
  const holds = useStore((s) => s.holds);
  const startHold = useStore((s) => s.startHold);
  const go = useStore((s) => s.go);

  const show = showById(shows, showId);
  if (show === null) {
    return (
      <div className="wv-screen">
        <Empty
          icon={<Ticket size={22} aria-hidden="true" />}
          title={t("event.notFound.title")}
          body={t("event.notFound.body")}
          action={<Button onClick={() => go("home")}>{t("chrome.action.backToEvents")}</Button>}
        />
      </div>
    );
  }

  const mine = holds.find((h) => h.mine) ?? null;
  const picked = show.types.reduce((n, type) => n + (quantities[type.id] ?? 0), 0);
  const total = show.types.reduce(
    (cents, type) => cents + type.price * (quantities[type.id] ?? 0),
    0,
  );
  const over = now >= endsAt(show);
  const states = show.types.map((type) => typeSaleState(show, type, tickets, holds, now));
  const anyOnSale = states.includes("onSale");
  const allSoldOut = states.every((state) => state === "soldOut");

  return (
    <div className="wv-screen">
      <button type="button" className="wv-backlink" onClick={() => go("home")}>
        <ArrowLeft size={15} aria-hidden="true" />
        {t("chrome.action.backToEvents")}
      </button>

      <header className="wv-eventhead">
        <Art show={show} height={220} glyph={130} badge={<DateTile show={show} />} />
        <div className="wv-eventhead__body">
          <p className="wv-eventhead__kicker">{label(show.sub)}</p>
          <h1 className="wv-eventhead__title">{show.name}</h1>
          <Facts show={show} />
          <p className="wv-ga">{t("event.ga")}</p>
        </div>
      </header>

      <div className="wv-eventgrid">
        <div className="wv-eventgrid__main">
          <Panel title={t("event.about")}>
            <p className="wv-prose">{label(show.desc)}</p>
          </Panel>

          <Panel title={t("event.lineup")}>
            <div className="wv-acts">
              {show.lineup.map((act) => (
                <Chip key={act}>{act}</Chip>
              ))}
            </div>
          </Panel>
        </div>

        <Panel
          className="wv-eventgrid__side"
          title={t("event.types.title")}
          subtitle={t("event.types.sub")}
        >
          {over ? (
            <Empty title={t("event.closed.title")} body={t("event.closed.body")} />
          ) : (
            <>
              <div className="wv-types">
                {show.types.map((type) => (
                  <TypeRow key={type.id} show={show} type={type} />
                ))}
              </div>

              {/* A buy bar under three "on sale Saturday" chips would be a
                  control that cannot do anything and does not say why. */}
              {!anyOnSale ? (
                <p className="wv-honest">
                  {t(allSoldOut ? "event.allSoldOut" : "event.saleNotOpen")}
                </p>
              ) : mine !== null && mine.evId === show.id ? (
                <div className="wv-holdnote">
                  <p>{t("event.hold.live", { count: holdQty(mine) }, holdQty(mine))}</p>
                  <Button onClick={() => go("checkout")}>{t("event.hold.continue")}</Button>
                </div>
              ) : (
                <div className="wv-buybar">
                  <div className="wv-buybar__total">
                    <span className="wv-label">{t("event.total")}</span>
                    <span className="wv-buybar__amount wv-mono">{money(total)}</span>
                  </div>
                  <Button onClick={startHold} disabled={picked === 0}>
                    {picked === 0 ? t("event.cta.empty") : t("event.cta")}
                  </Button>
                </div>
              )}
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
