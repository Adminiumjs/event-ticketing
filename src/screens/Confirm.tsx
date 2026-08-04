/**
 * CONFIRMATION — "You're going!", the order number, and one wallet ticket per
 * admission.
 *
 * The tickets are read back out of the store's ticket list by their codes
 * rather than kept on the order, so a ticket scanned at the door immediately
 * looks scanned here too — the confirmation is a view, not a receipt frozen at
 * the moment of purchase.
 */

import { PartyPopper, Ticket as TicketIcon } from "lucide-react";

import { useI18n } from "../i18n/index.tsx";
import { clock, dateLong } from "../lib/format.ts";
import { doorsAt, showById } from "../lib/tickets.ts";
import { useStore } from "../state/store.ts";
import { Button, Empty, WalletTicket } from "../components/Primitives.tsx";

export default function Confirm() {
  const { t } = useI18n();
  const order = useStore((s) => s.lastOrder);
  const shows = useStore((s) => s.shows);
  const tickets = useStore((s) => s.tickets);
  const now = useStore((s) => s.clock);
  const go = useStore((s) => s.go);

  const show = order === null ? null : showById(shows, order.evId);

  if (order === null || show === null) {
    return (
      <div className="wv-screen wv-narrowcol">
        <Empty
          icon={<TicketIcon size={22} aria-hidden="true" />}
          title={t("confirm.empty.title")}
          body={t("confirm.empty.body")}
          action={<Button onClick={() => go("home")}>{t("chrome.action.backToEvents")}</Button>}
        />
      </div>
    );
  }

  const codes = new Set(order.tickets);
  const mine = tickets.filter((ticket) => codes.has(ticket.code));

  return (
    <div className="wv-screen wv-narrowcol">
      <header className="wv-confirmhead">
        <span className="wv-confirmhead__mark" aria-hidden="true">
          <PartyPopper size={24} />
        </span>
        <h1 className="wv-confirmhead__title">{t("confirm.title")}</h1>
        <p className="wv-confirmhead__sub">
          {t("confirm.sub", {
            show: show.name,
            date: dateLong(show.date),
            doors: clock(doorsAt(show)),
          })}
        </p>
        <p className="wv-confirmhead__order">
          {t("confirm.order")} <span className="wv-mono">{order.code}</span>
        </p>
      </header>

      <div className="wv-wallets">
        {mine.map((ticket) => (
          <WalletTicket key={ticket.code} ticket={ticket} show={show} now={now} />
        ))}
      </div>

      <p className="wv-honest">{t("confirm.hint")}</p>

      <div className="wv-confirmactions">
        <Button onClick={() => go("mytickets")}>{t("confirm.mytickets")}</Button>
        <Button tone="ghost" onClick={() => go("home")}>
          {t("confirm.more")}
        </Button>
      </div>
    </div>
  );
}
