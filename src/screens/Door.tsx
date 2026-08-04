/**
 * DOOR (organizer) — the scanner, the counter, and the last few people in.
 *
 * Before check-in opens this screen refuses to pretend: it says doors aren't
 * open, names the minute they are, and offers the demo's own way of getting
 * there. A scanner that accepts codes four hours early would be a lie the
 * whole rest of the app has been careful not to tell.
 *
 * The recent list uses a RESERVED GRID TRACK for its time markers (house
 * layout rule 4) rather than absolutely positioning them over the names — at
 * 375px an overlaid marker lands on top of somebody's surname.
 */

import { Camera, DoorOpen, ScanLine } from "lucide-react";

import { useI18n } from "../i18n/index.tsx";
import { clock, label } from "../lib/format.ts";
import {
  checkInOpensAt,
  checkInState,
  doorCount,
  doorSamples,
  doorsAt,
  recentCheckIns,
  showById,
  soldCount,
} from "../lib/tickets.ts";
import type { CheckInVerdict } from "../lib/tickets.ts";
import { useStore } from "../state/store.ts";
import { Button, Empty, Panel } from "../components/Primitives.tsx";
import type { Show } from "../data/types.ts";

/** Which tone and which sentence each of the four verdicts gets. */
function Verdict({ verdict, show }: { verdict: CheckInVerdict; show: Show }) {
  const { t } = useI18n();
  const shows = useStore((s) => s.shows);
  const clearVerdict = useStore((s) => s.clearVerdict);

  if (verdict.kind === "empty") return null;

  let tone: "pos" | "warn" | "danger" = "pos";
  let title = "";
  let body = "";

  switch (verdict.kind) {
    case "checkedIn": {
      const type = show.types.find((x) => x.id === verdict.ttId);
      tone = "pos";
      title = t("door.verdict.checkedIn");
      body = t("door.verdict.checkedIn.sub", {
        name: verdict.holder,
        type: type === undefined ? verdict.ttId : label(type.name),
      });
      break;
    }
    case "alreadyCheckedIn":
      tone = "warn";
      title = t("door.verdict.alreadyIn", { time: clock(verdict.at) });
      body = t("door.verdict.alreadyIn.sub", { name: verdict.holder });
      break;
    case "unknownCode":
      tone = "danger";
      title = t("door.verdict.unknown");
      body = t("door.verdict.unknown.sub", { code: verdict.code });
      break;
    case "wrongShow": {
      const other = showById(shows, verdict.evId);
      tone = "danger";
      title = t("door.verdict.wrongShow");
      body = t("door.verdict.wrongShow.sub", {
        code: verdict.code,
        name: verdict.holder,
        show: other?.name ?? verdict.evId,
      });
      break;
    }
  }

  return (
    <div className={`wv-verdict wv-verdict--${tone}`} role="status" aria-live="assertive">
      <div className="wv-verdict__body">
        <p className="wv-verdict__title">{title}</p>
        <p className="wv-verdict__sub">{body}</p>
        <p className="wv-verdict__code wv-mono">{verdict.code}</p>
      </div>
      <button type="button" className="wv-verdict__clear" onClick={clearVerdict}>
        {t("door.verdict.clear")}
      </button>
    </div>
  );
}

function Scanner({ show }: { show: Show }) {
  const { t } = useI18n();
  const code = useStore((s) => s.doorCode);
  const setCode = useStore((s) => s.setDoorCode);
  const scan = useStore((s) => s.scan);
  const tickets = useStore((s) => s.tickets);
  const now = useStore((s) => s.clock);
  const verdict = useStore((s) => s.verdict);

  const samples = doorSamples(tickets, show.id, now);
  const offered: { code: string | null; labelKey: "door.sample.valid" | "door.sample.duplicate" | "door.sample.wrongShow" | "door.sample.unknown" }[] = [
    { code: samples.valid, labelKey: "door.sample.valid" },
    { code: samples.duplicate, labelKey: "door.sample.duplicate" },
    { code: samples.wrongShow, labelKey: "door.sample.wrongShow" },
    { code: samples.unknown, labelKey: "door.sample.unknown" },
  ];

  return (
    <Panel title={t("door.scanner.title")}>
      {/* The camera frame is fiction and says so in its own label — a fake
          viewfinder that did not admit it would be the one dishonest pixel in
          the app. */}
      <div className="wv-camera">
        <span className="wv-camera__corner wv-camera__corner--tl" aria-hidden="true" />
        <span className="wv-camera__corner wv-camera__corner--tr" aria-hidden="true" />
        <span className="wv-camera__corner wv-camera__corner--bl" aria-hidden="true" />
        <span className="wv-camera__corner wv-camera__corner--br" aria-hidden="true" />
        <span className="wv-camera__sweep" aria-hidden="true" />
        <Camera size={26} aria-hidden="true" />
        <p className="wv-camera__text">{t("door.camera")}</p>
      </div>

      <form
        className="wv-scanrow"
        onSubmit={(e) => {
          e.preventDefault();
          scan();
        }}
      >
        <input
          className="wv-input wv-fld wv-mono"
          value={code}
          placeholder={t("door.code.ph")}
          aria-label={t("door.code.label")}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setCode(e.target.value)}
        />
        <Button type="submit">
          <ScanLine size={16} aria-hidden="true" />
          {t("door.scan")}
        </Button>
      </form>

      <div className="wv-samples">
        <span className="wv-label">{t("door.samples")}</span>
        <div className="wv-samples__row">
          {offered.map(
            (sample) =>
              sample.code !== null && (
                <button
                  key={sample.labelKey}
                  type="button"
                  className="wv-sample wv-btn"
                  onClick={() => scan(sample.code as string)}
                >
                  <span className="wv-sample__what">{t(sample.labelKey)}</span>
                  <span className="wv-sample__code wv-mono">{sample.code}</span>
                </button>
              ),
          )}
        </div>
      </div>

      {verdict !== null && <Verdict verdict={verdict} show={show} />}
    </Panel>
  );
}

function Counter({ show }: { show: Show }) {
  const { t } = useI18n();
  const tickets = useStore((s) => s.tickets);
  const now = useStore((s) => s.clock);

  const through = doorCount(tickets, show.id, now);
  const issued = soldCount(tickets, show.id);
  const recent = recentCheckIns(tickets, show.id, now);
  const fraction = issued === 0 ? 0 : through / issued;

  return (
    <Panel title={t("door.counter.title")} subtitle={t("door.counter.hint")}>
      <p className="wv-counter wv-mono">
        {t("door.counter.value", { count: through, total: issued })}
      </p>
      <div
        className="wv-counter__bar"
        role="img"
        aria-label={t("door.counter.value", { count: through, total: issued })}
      >
        <span
          className="wv-counter__fill"
          style={{ inlineSize: `${Math.max(1, fraction * 100)}%` }}
        />
      </div>

      <h3 className="wv-recent__title">{t("door.recent.title")}</h3>
      {recent.length === 0 ? (
        <p className="wv-recent__empty">{t("door.recent.empty")}</p>
      ) : (
        <ul className="wv-recent">
          {recent.map((ticket) => {
            const type = show.types.find((x) => x.id === ticket.tt);
            return (
              <li key={ticket.code} className="wv-recent__row">
                {/* Column one is the reserved marker track. */}
                <span className="wv-recent__marker" aria-hidden="true" />
                <span className="wv-recent__who">
                  {ticket.holder}
                  <span className="wv-recent__type">
                    {type === undefined ? ticket.tt : label(type.name)}
                  </span>
                </span>
                <span className="wv-recent__at wv-mono">
                  {clock(ticket.checkedInAt as number)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export default function Door() {
  const { t } = useI18n();
  const shows = useStore((s) => s.shows);
  const orgShowId = useStore((s) => s.orgShowId);
  const now = useStore((s) => s.clock);
  const advance = useStore((s) => s.advanceToDoors);

  const show = showById(shows, orgShowId);
  if (show === null) {
    return (
      <div className="wv-screen">
        <Empty title={t("event.notFound.title")} body={t("event.notFound.body")} />
      </div>
    );
  }

  const state = checkInState(show, now);

  return (
    <div className="wv-screen">
      <header className="wv-head">
        <h1 className="wv-head__title">{t("door.title")}</h1>
        <p className="wv-head__sub">
          {show.name} · {label(show.room)}
        </p>
      </header>

      {state === "before" && (
        <Empty
          icon={<DoorOpen size={22} aria-hidden="true" />}
          title={t("door.shut.title")}
          body={t("door.shut.body", {
            time: clock(checkInOpensAt(show)),
            doors: clock(doorsAt(show)),
          })}
          action={
            <Button onClick={advance}>
              <DoorOpen size={16} aria-hidden="true" />
              {t("door.shut.cta")}
            </Button>
          }
        />
      )}

      {state === "after" && (
        <Empty
          icon={<DoorOpen size={22} aria-hidden="true" />}
          title={t("door.over.title")}
          body={t("door.over.body", { show: show.name })}
        />
      )}

      {state === "open" && (
        <>
          <div className="wv-doorgrid">
            <Scanner show={show} />
            <Counter show={show} />
          </div>
          <p className="wv-honest">{t("door.honest")}</p>
        </>
      )}
    </div>
  );
}
