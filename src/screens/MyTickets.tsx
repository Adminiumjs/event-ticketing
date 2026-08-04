/**
 * MY TICKETS — an e-mail lookup, then the wallet.
 *
 * There is no account and no password: tickets belong to the address that
 * bought them, which is how a small venue actually works and which means the
 * demo has nothing to sign into. The hint offers a seeded address, because a
 * lookup screen with nothing to look up is a dead end.
 */

import { Mail, Search } from "lucide-react";

import { DEMO_BUYER } from "../data/demo.ts";
import { useI18n } from "../i18n/index.tsx";
import { showById, ticketsForEmail } from "../lib/tickets.ts";
import { useStore } from "../state/store.ts";
import { Button, Empty, Field, Panel, WalletTicket } from "../components/Primitives.tsx";

export default function MyTickets() {
  const { t } = useI18n();
  const shows = useStore((s) => s.shows);
  const tickets = useStore((s) => s.tickets);
  const now = useStore((s) => s.clock);
  const email = useStore((s) => s.lookupEmail);
  const lookedUp = useStore((s) => s.lookedUp);
  const setLookupEmail = useStore((s) => s.setLookupEmail);
  const lookup = useStore((s) => s.lookup);

  const found = lookedUp === null ? [] : ticketsForEmail(tickets, lookedUp);

  return (
    <div className="wv-screen wv-narrowcol">
      <header className="wv-head">
        <h1 className="wv-head__title">{t("mytickets.title")}</h1>
        <p className="wv-head__sub">{t("mytickets.sub")}</p>
      </header>

      <Panel>
        <form
          className="wv-lookup"
          onSubmit={(e) => {
            e.preventDefault();
            lookup();
          }}
        >
          <Field label={t("mytickets.email")}>
            <input
              className="wv-input wv-fld"
              type="email"
              value={email}
              placeholder={t("mytickets.email.ph")}
              autoComplete="email"
              onChange={(e) => setLookupEmail(e.target.value)}
            />
          </Field>
          <Button type="submit">
            <Search size={15} aria-hidden="true" />
            {t("mytickets.lookup")}
          </Button>
        </form>
        <p className="wv-honest">
          {t("mytickets.hint")}{" "}
          {/* A tap fills the field rather than making anyone retype a seeded
              address they cannot be expected to remember. */}
          <button
            type="button"
            className="wv-linkbtn wv-mono"
            onClick={() => setLookupEmail(DEMO_BUYER.email)}
          >
            {DEMO_BUYER.email}
          </button>
        </p>
      </Panel>

      {lookedUp === null ? (
        <Empty
          icon={<Mail size={22} aria-hidden="true" />}
          title={t("mytickets.start.title")}
          body={t("mytickets.start.body")}
        />
      ) : found.length === 0 ? (
        <Empty
          icon={<Mail size={22} aria-hidden="true" />}
          title={t("mytickets.none.title")}
          body={t("mytickets.none.body")}
        />
      ) : (
        <>
          <p className="wv-foundline">
            {t("mytickets.found", { count: found.length, email: lookedUp }, found.length)}
          </p>
          <div className="wv-wallets">
            {found.map((ticket) => {
              const show = showById(shows, ticket.evId);
              if (show === null) return null;
              return (
                <WalletTicket key={ticket.code} ticket={ticket} show={show} now={now} />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
