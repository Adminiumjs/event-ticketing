/**
 * ATTENDEES (organizer) — everyone holding a ticket for the selected show.
 *
 * A filter over what is already in memory rather than a query: there is no
 * server in a demo, and pretending otherwise would mean a spinner that lies.
 * The search matches names, ticket codes and e-mail addresses, because those
 * are the three things somebody at the desk actually has to hand.
 */

import { Search, Users } from "lucide-react";

import { useI18n } from "../i18n/index.tsx";
import { clock, label } from "../lib/format.ts";
import { isCheckedIn, searchAttendees, showById, soldCount } from "../lib/tickets.ts";
import { useStore } from "../state/store.ts";
import { Chip, Empty, Panel } from "../components/Primitives.tsx";

export default function Attendees() {
  const { t } = useI18n();
  const shows = useStore((s) => s.shows);
  const orgShowId = useStore((s) => s.orgShowId);
  const tickets = useStore((s) => s.tickets);
  const now = useStore((s) => s.clock);
  const query = useStore((s) => s.attendeeQuery);
  const setQuery = useStore((s) => s.setAttendeeQuery);

  const show = showById(shows, orgShowId);
  if (show === null) {
    return (
      <div className="wv-screen">
        <Empty title={t("event.notFound.title")} body={t("event.notFound.body")} />
      </div>
    );
  }

  const issued = soldCount(tickets, show.id);
  const rows = searchAttendees(tickets, show.id, query);

  return (
    <div className="wv-screen">
      <header className="wv-head">
        <h1 className="wv-head__title">{t("attendees.title")}</h1>
        <p className="wv-head__sub">
          {t("attendees.sub", { count: issued, show: show.name }, issued)}
        </p>
      </header>

      <Panel>
        <div className="wv-searchrow">
          <Search size={15} aria-hidden="true" />
          <input
            className="wv-input wv-fld"
            type="search"
            value={query}
            placeholder={t("attendees.search")}
            aria-label={t("attendees.search.label")}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="wv-searchrow__count wv-mono">
            {t("attendees.count", { count: rows.length }, rows.length)}
          </span>
        </div>

        {rows.length === 0 ? (
          <Empty
            icon={<Users size={22} aria-hidden="true" />}
            title={t("attendees.empty.title")}
            body={t("attendees.empty.body")}
          />
        ) : (
          <div className="wv-table" role="table" aria-label={t("attendees.title")}>
            <div className="wv-table__head" role="row">
              <span role="columnheader">{t("attendees.col.name")}</span>
              <span role="columnheader">{t("attendees.col.code")}</span>
              <span role="columnheader">{t("attendees.col.type")}</span>
              <span role="columnheader">{t("attendees.col.status")}</span>
            </div>
            {rows.map((ticket) => {
              const type = show.types.find((x) => x.id === ticket.tt);
              const inside = isCheckedIn(ticket, now);
              return (
                <div key={ticket.code} className="wv-table__row" role="row">
                  <span role="cell" className="wv-table__name">
                    {ticket.holder}
                    <span className="wv-table__email">{ticket.buyer.email}</span>
                  </span>
                  <span role="cell" className="wv-mono">
                    {ticket.code}
                  </span>
                  <span role="cell">{type === undefined ? ticket.tt : label(type.name)}</span>
                  <span role="cell">
                    {inside ? (
                      <Chip tone="pos">
                        {t("attendees.status.in", {
                          time: clock(ticket.checkedInAt as number),
                        })}
                      </Chip>
                    ) : (
                      <Chip>{t("attendees.status.out")}</Chip>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
