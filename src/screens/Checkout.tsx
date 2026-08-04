/**
 * CHECKOUT — order summary, who's buying, who's coming, and a card sheet that
 * is honest about being a demo.
 *
 * The hold's countdown and its Release action stay on screen the whole way
 * through, because the one thing a reader needs to know here is how long they
 * have. When the hold runs out this screen does not throw them back to the
 * show: it explains what happened, says nothing was charged, and offers the
 * way back.
 */

import { CreditCard, Info, Ticket } from "lucide-react";

import { useI18n } from "../i18n/index.tsx";
import { countdown, dateShort, label, money } from "../lib/format.ts";
import { holdSecondsLeft, holdTotal, showById, typeById } from "../lib/tickets.ts";
import { useStore } from "../state/store.ts";
import { Button, Empty, Field, Panel } from "../components/Primitives.tsx";

/** The countdown and the release, together, above everything else on the page. */
function HoldBar() {
  const { t } = useI18n();
  const holds = useStore((s) => s.holds);
  const clock = useStore((s) => s.clock);
  const tickSeconds = useStore((s) => s.tickSeconds);
  const releaseHold = useStore((s) => s.releaseHold);

  const hold = holds.find((h) => h.mine);
  if (hold === undefined) return null;
  const left = holdSecondsLeft(hold, clock + tickSeconds / 60);

  return (
    <div className={`wv-holdbar${left <= 60 ? " wv-holdbar--low" : ""}`} role="status" aria-live="off">
      <Ticket size={15} aria-hidden="true" />
      <span className="wv-holdbar__text">{t("chrome.hold.heldFor")}</span>
      <span className="wv-holdbar__time wv-mono">{countdown(left)}</span>
      <button type="button" className="wv-holdbar__release" onClick={releaseHold}>
        {t("checkout.release")}
      </button>
    </div>
  );
}

export default function Checkout() {
  const { t } = useI18n();
  const shows = useStore((s) => s.shows);
  const holds = useStore((s) => s.holds);
  const holdExpired = useStore((s) => s.holdExpired);
  const buyerName = useStore((s) => s.buyerName);
  const buyerEmail = useStore((s) => s.buyerEmail);
  const attendeeNames = useStore((s) => s.attendeeNames);
  const setBuyerName = useStore((s) => s.setBuyerName);
  const setBuyerEmail = useStore((s) => s.setBuyerEmail);
  const setAttendeeName = useStore((s) => s.setAttendeeName);
  const placeOrder = useStore((s) => s.placeOrder);
  const go = useStore((s) => s.go);

  const hold = holds.find((h) => h.mine) ?? null;
  const show = hold === null ? null : showById(shows, hold.evId);

  if (hold === null || show === null) {
    return (
      <div className="wv-screen wv-narrowcol">
        <Empty
          icon={<Ticket size={22} aria-hidden="true" />}
          title={t(holdExpired ? "checkout.expired.title" : "checkout.empty.title")}
          body={t(holdExpired ? "checkout.expired.body" : "checkout.empty.body")}
          action={
            <Button onClick={() => go(holdExpired ? "event" : "home")}>
              {t(holdExpired ? "checkout.expired.cta" : "chrome.action.backToEvents")}
            </Button>
          }
        />
      </div>
    );
  }

  const total = holdTotal(hold, show);
  const ready = buyerName.trim().length > 0 && buyerEmail.trim().length > 0;
  const buyerLabel =
    buyerName.trim().length > 0 ? buyerName.trim() : t("checkout.names.fallback");

  return (
    <div className="wv-screen wv-narrowcol">
      <header className="wv-head">
        <h1 className="wv-head__title">{t("checkout.title")}</h1>
        <p className="wv-head__sub">
          {t("checkout.sub", { show: show.name, date: dateShort(show.date) })}
        </p>
      </header>

      <HoldBar />

      <Panel title={t("checkout.summary")}>
        <ul className="wv-lines">
          {hold.lines.map((line) => {
            const type = typeById(show, line.tt);
            if (type === null) return null;
            return (
              <li key={line.tt} className="wv-lines__row">
                <span>{t("checkout.line", { qty: line.qty, type: label(type.name) })}</span>
                <span className="wv-mono">{money(type.price * line.qty)}</span>
              </li>
            );
          })}
        </ul>
        <div className="wv-lines__total">
          <span>{t("checkout.total")}</span>
          <span className="wv-mono">{money(total)}</span>
        </div>
        <p className="wv-honest">{t("checkout.fees")}</p>
      </Panel>

      <Panel title={t("checkout.buyer")}>
        <div className="wv-formgrid">
          <Field label={t("checkout.name")}>
            <input
              className="wv-input wv-fld"
              value={buyerName}
              placeholder={t("checkout.name.ph")}
              autoComplete="name"
              onChange={(e) => setBuyerName(e.target.value)}
            />
          </Field>
          <Field label={t("checkout.email")} hint={t("checkout.email.hint")}>
            <input
              className="wv-input wv-fld"
              type="email"
              value={buyerEmail}
              placeholder={t("checkout.email.ph")}
              autoComplete="email"
              onChange={(e) => setBuyerEmail(e.target.value)}
            />
          </Field>
        </div>
      </Panel>

      <Panel title={t("checkout.names")} subtitle={t("checkout.names.hint")}>
        <div className="wv-formgrid">
          {attendeeNames.map((value, index) => (
            <Field key={index} label={`${index + 1}`}>
              <input
                className="wv-input wv-fld"
                value={value}
                placeholder={t("checkout.names.ph", { n: index + 1, buyer: buyerLabel })}
                onChange={(e) => setAttendeeName(index, e.target.value)}
              />
            </Field>
          ))}
        </div>
      </Panel>

      <Panel title={t("checkout.card")}>
        <p className="wv-callout">
          <Info size={15} aria-hidden="true" />
          {t("checkout.card.demo")}
        </p>
        <div className="wv-cardsheet">
          <Field label={t("checkout.card.number")}>
            <input
              className="wv-input wv-fld wv-mono"
              inputMode="numeric"
              placeholder={t("checkout.card.number.ph")}
              /* Deliberately uncontrolled and never read: nothing typed here
                 reaches the store, because nothing here is a real card. */
              defaultValue=""
            />
          </Field>
          <div className="wv-cardsheet__pair">
            <Field label={t("checkout.card.expiry")}>
              <input
                className="wv-input wv-fld wv-mono"
                inputMode="numeric"
                placeholder={t("checkout.card.expiry.ph")}
                defaultValue=""
              />
            </Field>
            <Field label={t("checkout.card.cvc")}>
              <input
                className="wv-input wv-fld wv-mono"
                inputMode="numeric"
                placeholder={t("checkout.card.cvc.ph")}
                defaultValue=""
              />
            </Field>
          </div>
        </div>

        <div className="wv-paybar">
          <Button onClick={placeOrder} disabled={!ready}>
            <CreditCard size={16} aria-hidden="true" />
            {t("checkout.pay", { total: money(total) })}
          </Button>
          {!ready && <p className="wv-paybar__why">{t("chrome.refuse.needBuyer")}</p>}
        </div>
      </Panel>
    </div>
  );
}
