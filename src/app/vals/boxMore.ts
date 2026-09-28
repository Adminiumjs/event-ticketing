/**
 * The box office's messages and settings: Messages (write to a show's
 * buyers, what waits to be sent, what went), Postpone or cancel (and a
 * cancelled show's refunds to make), Settings. The words a message starts
 * from are the venue's own, from its settings and the show.
 */
import type { Id, Row } from "../../data/wire.ts";
import { tr } from "../../i18n/tr.ts";
import { LIVE, plural, type Box } from "../box.ts";
import type { BoxShow, BoxWorld } from "../boxWorld.ts";
import { fD, fT, money, ms, num } from "../fmt.ts";
import type { WaveApp } from "../wave.ts";
import { posterOf } from "./audience.ts";
import { palette, S, type V } from "./base.ts";
import { orderState, pill, when } from "./box.ts";
import { fromLocal, payHow } from "./boxOrders.ts";
import { focusLater } from "../focus.ts";

type Tpl = "doors" | "set_times" | "moved" | "cancelled" | "other";

/** The words a message starts from: its subject and its body, in the box office's language. */
export function tplText(tpl: Tpl, show: BoxShow, w: BoxWorld, moved: { newTxt: string; untilTxt: string } | null = null): [string, string] {
  const venue = w.settings.venueName;
  const name = show.name;
  const day = fD(show.start);
  const sign = `\n\n${venue}`;
  switch (tpl) {
    case "doors":
      return [tr("Doors time changed: {name}", { name }), `${tr("Hi there,")}\n\n${tr("Doors for {name} on {day} now open at {time}. Everything else stays the same, and your tickets still work.", { name, day, time: fT(show.doors) })}${sign}`];
    case "set_times": {
      const acts = show.acts.filter((a) => a.start !== null);
      const lines = acts.length > 0 ? acts.map((a) => `${fT(a.start)}  ${a.name}`).join("\n") : `${tr("Doors {time}", { time: fT(show.doors) })}\n${fT(show.start)}  ${name}`;
      return [tr("Set times are up: {name}", { name }), `${tr("Hi there,")}\n\n${tr("Here are the set times for {name} on {day}:", { name, day })}\n\n${lines}${sign}`];
    }
    case "moved": {
      const to = moved?.newTxt || (show.was === null ? tr("the new date") : fD(show.start));
      // Being written: only the refund day picked; sent later from Messages: the show's own.
      const until = moved !== null ? moved.untilTxt : show.refundUntil === null ? "" : fD(show.refundUntil);
      const was = show.was === null ? day : fD(show.was);
      return [
        tr("{name} has moved to {when}", { name, when: to }),
        `${tr("Hi there,")}\n\n${tr("{name} has moved from {was} to {when}. Your tickets are valid for the new date — you don't need to do anything.", { name, was, when: to })}${
          until === "" ? "" : `\n\n${tr("If you can't make it, ask for a refund until {day} from My tickets, or reply to this email.", { day: until })}`
        }\n\n${tr("Sorry for the change,")}${sign}`,
      ];
    }
    case "cancelled":
      return [
        tr("{name} is cancelled", { name }),
        `${tr("Hi there,")}\n\n${tr("We're sorry: {name} on {day} is cancelled. Your tickets no longer work.", { name, day })}\n\n${tr("If you paid, the box office pays you back the way you paid {when}. You don't need to do anything.", { when: w.settings.refundPayback || tr("within 5 working days") })}${sign}`,
      ];
    default:
      return [tr("About {name}", { name }), `${tr("Hi there,")}\n\n${sign.trim()}`];
  }
}

const TPL_WORDS = (): Record<Tpl, string> => ({ doors: tr("Doors time changed"), set_times: tr("Set times are up"), moved: tr("Postponed"), cancelled: tr("Cancelled"), other: tr("Something else") });
const CTA = (): Record<Tpl, string> => ({ doors: tr("Show my tickets"), set_times: tr("See the night"), moved: tr("Keep or refund my tickets"), cancelled: tr("See my order"), other: tr("See my order") });
const people = (n: number) => plural(n, "{n} person", "{n} people");

export function boxMoreVals(app: WaveApp, box: Box, w: BoxWorld, B: Record<string, unknown>, _v: V): V {
  return { ...msgVals(app, box, w, B), ...pcVals(app, box, w, B), ...settingsVals(app, box, w, B) };
}

/** The from line and the foot of a message, as the venue's emails print them. */
function frame(w: BoxWorld): { from: string; foot: string } {
  const st = w.settings;
  return {
    from: tr("From {venue} · {email}", { venue: st.venueName, email: st.contactEmail }),
    foot: tr("{venue} · {address}. You're getting this because you have tickets for this show.", { venue: st.venueName, address: st.address }),
  };
}

// ── Messages ─────────────────────────────────────────────────────────────────

function msgVals(app: WaveApp, box: Box, w: BoxWorld, B: Record<string, unknown>): V {
  if (app.state.bx !== "msgs") return { ms: { evOpts: [], tos: [], typeOpts: [], tpls: [], paras: [], hist: [], waiting: [], p: {} } };
  const s = box.s;
  const m = s.msg;
  const nar = app.narrow();
  const light = app.light();
  const chip = B["chip"] as (on: boolean) => string;
  const seg = B["seg"] as (on: boolean) => string;
  const shows = w.shows.filter((e) => !box.isPast(e) || e.status === "cancelled").sort((a, b) => a.start - b.start);
  const show = (m.ev === null ? undefined : w.byId.get(m.ev)) ?? box.nextShow() ?? shows[0];
  if (show === undefined) return { ms: { evOpts: [], tos: [], typeOpts: [], tpls: [], paras: [], hist: [], waiting: [], p: {} } };
  const cancelled = show.status === "cancelled";
  // Only the words that fit the show: a cancelled show's, a moved show's, set times once they are up.
  const fits: Tpl[] = cancelled ? ["cancelled"] : [...(show.postponed ? (["moved"] as Tpl[]) : []), "doors", ...(show.setsPublished && show.acts.length > 0 ? (["set_times"] as Tpl[]) : [])];
  // "" is no words chosen yet; null is the show's own (moved, cancelled, else doors).
  const none = m.tpl === "";
  const tpl: Tpl = m.tpl !== null && (fits as string[]).includes(m.tpl) ? (m.tpl as Tpl) : m.tpl === "other" || none ? "other" : fits[0]!;
  const [tSubj, tBody] = none ? ["", ""] : tplText(tpl, show, w);
  const subj = m.subj ?? tSubj;
  const body = m.body ?? tBody;
  const setM = (p: Partial<typeof m>) => box.set({ msg: { ...m, ev: show.id, ...p } });
  const who = box.audience(show, m.to, m.typeId ?? show.types[0]?.id ?? null);
  const countTxt =
    who === undefined
      ? "…"
      : [people(who.people), plural(who.orders, "{n} order", "{n} orders"), ...(who.holders > 0 ? [plural(who.holders, "{n} sent-on ticket", "{n} sent-on tickets")] : [])].join(" · ");
  const waiting = (box.list("broadcasts", { where: [{ column: "status", eq: "waiting" }], sort: [{ column: "id" }], limit: 50 })?.rows ?? []).filter((b) => w.byId.get(b["event_id"] as Id)?.status !== "cancelled").map((b) => {
    const e = w.byId.get(b["event_id"] as Id);
    return {
      id: b.id,
      show: e?.name ?? "",
      tpl: TPL_WORDS()[(b["template"] as Tpl) ?? "other"] ?? "",
      n: `${people(Number(b["people"] ?? 0))} · ${plural(Number(b["order_count"] ?? 0), "{n} order", "{n} orders")}`,
      go: () => box.reviewWaiting(b),
    };
  });
  const sent = box.list("broadcasts", { where: [{ column: "status", eq: "sent" }], sort: [{ column: "sent_at", desc: true }], limit: 200 })?.rows ?? [];
  const audienceWord = (b: Row) => (b["audience"] === "type" ? (w.typeRows.find((t) => t.id === b["ticket_type_id"])?.["name"] as string | undefined) ?? tr("One ticket type") : b["audience"] === "not_in" ? tr("Not yet checked in") : tr("Everyone"));
  const f = frame(w);
  // Doors before 16:00: the reminder goes the evening before.
  const eve = show.row["eve_email"] === true;
  const st = w.settingsRow;
  const tonightOn = st["tonight_email_on"] !== false;
  return {
    ms: {
      cols: nar ? "1fr" : "minmax(0,1fr) minmax(0,420px)",
      ev: String(show.id),
      onEv: (e: { target: { value: string } }) => box.set({ msg: { ev: Number(e.target.value) as Id, to: "everyone", typeId: null, tpl: null, subj: null, body: null, waiting: null } }),
      evOpts: shows.map((e) => ({ id: String(e.id), label: `${e.name} · ${fD(e.start)}` })),
      tos: (
        [
          ["everyone", tr("Everyone")],
          ["type", tr("One ticket type")],
          ["not_in", tr("Not yet checked in")],
        ] as ["everyone" | "type" | "not_in", string][]
      ).map(([id, label]) => ({ id: label, on: m.to === id, go: () => setM({ to: id }), style: seg(m.to === id) })),
      typeOn: m.to === "type",
      type: String(m.typeId ?? show.types[0]?.id ?? ""),
      onType: (e: { target: { value: string } }) => setM({ typeId: Number(e.target.value) as Id }),
      typeOpts: show.types.map((t) => ({ id: String(t.id), label: t.name })),
      tpls: fits.map((k) => ({ id: k, label: TPL_WORDS()[k], on: !none && tpl === k, style: chip(!none && tpl === k), go: () => setM({ tpl: k, subj: null, body: null }) })),
      subj,
      body,
      onSubj: (e: { target: { value: string } }) => setM({ subj: e.target.value }),
      onBody: (e: { target: { value: string } }) => setM({ body: e.target.value }),
      langNote: tr("Everyone gets these words, whatever language they chose."),
      paras: body.split(/\n\n+/).map((t, i) => ({ k: `p${String(i)}`, t })),
      countTxt: who === undefined ? "…" : tr("{who} will get this", { who: countTxt }),
      sendOff: who === undefined || who.orders === 0 || subj.trim() === "" || body.trim() === "",
      sendLabel: who === undefined ? tr("Send") : plural(who.people, "Send to {n} person", "Send to {n} people"),
      test: () => void box.testMessage(show, subj, body),
      autoTxt: !tonightOn ? tr('"See you tonight" is switched off in Settings.') : eve ? tr('"See you tomorrow" goes by itself at 18:00 the evening before.') : tr('"See you tonight" goes by itself at noon on the show day.'),
      send: () =>
        app.openSheet("bxMsg", {
          ev: show.id,
          n: who?.people ?? 0,
          subj,
          body,
          to: m.to,
          typeId: m.typeId ?? show.types[0]?.id ?? null,
          tpl,
          waiting: m.waiting,
        }),
      p: posterOf(app, show),
      btnBg: palette(light)["accent"],
      cta: CTA()[tpl],
      from: f.from,
      foot: f.foot,
      waiting,
      hist: sent.map((b) => ({
        id: b.id,
        at: when(b["sent_at"]),
        show: w.byId.get(b["event_id"] as Id)?.name ?? "",
        tpl: TPL_WORDS()[(b["template"] as Tpl) ?? "other"],
        subj: String(b["subject"] ?? ""),
        body: String(b["body"] ?? ""),
        to: audienceWord(b),
        n: num(Number(b["people"] ?? 0)),
        by: String(b["sent_by"] ?? ""),
      })),
      histEmpty: sent.length === 0,
    },
  };
}

// ── Postpone or cancel ───────────────────────────────────────────────────────

const hm = (v: string): number => {
  const [h, m] = v.split(":").map(Number) as [number, number];
  return h * 60 + (m || 0);
};

function pcVals(app: WaveApp, box: Box, w: BoxWorld, B: Record<string, unknown>): V {
  const blank = { pc: { modes: [], sum: [], rfTabs: [], rfRows: [], date: {}, doors: {}, stage: {}, until: {}, paras: [] } };
  if (app.state.bx !== "pc") return blank;
  const show = box.headShow();
  if (show === null) return blank;
  const s = box.s;
  const p = s.pc;
  const now = app.now;
  const nar = app.narrow();
  const light = app.light();
  const seg = B["seg"] as (on: boolean) => string;
  const set = (q: Partial<typeof p>) => box.set({ pc: { ...p, ev: show.id, ...q } });
  const F = (k: "date" | "doors" | "stage" | "until") => ({ v: p[k], on: (e: { target: { value: string } }) => set({ [k]: e.target.value, msg: k === "date" || k === "until" ? null : p.msg, tried: false }) });
  const cancelled = show.status === "cancelled";
  const past = box.isPast(show) && !cancelled;
  const sold = box.sold(show);
  const fld = String(B["fld"]);
  const errFld = fld.replace("border:1px solid var(--border-strong)", "border:1.5px solid var(--danger)");
  const sendOn = w.settings.sendOn;

  // The new date and the refund window, on the venue's clock.
  const zone = app.zone;
  const startAt = p.date === "" ? null : ms(fromLocal(`${p.date}T${p.stage || "20:00"}`, zone));
  const doorsAt = p.date === "" ? null : ms(fromLocal(`${p.date}T${p.doors || "19:00"}`, zone));
  const untilAt = p.until === "" ? null : ms(fromLocal(`${p.until}T23:59`, zone));
  const newTxt = startAt === null ? "" : fD(startAt);
  const untilTxt = untilAt === null ? "" : fD(untilAt);
  const todayEnd = box.venueDayStart(now) + 86_400_000;
  const dateErr = startAt === null || startAt < todayEnd ? tr("Pick a date after today") : "";
  const timeErr = p.doors !== "" && p.stage !== "" && hm(p.doors) >= hm(p.stage) ? tr("Doors must be before on stage") : "";
  const untilErr =
    untilAt === null
      ? tr("Pick the last day people can ask for a refund")
      : untilAt < box.venueDayStart(now)
        ? tr("Pick a day from today")
        : startAt !== null && untilAt >= box.venueDayStart(startAt)
          ? tr("The refund window must end before the new date")
          : "";
  const errs = p.mode === "post" ? [dateErr, timeErr, untilErr].filter((x) => x !== "") : [];
  const shown = p.tried;
  const [subj, tBody] = tplText(p.mode === "post" ? "moved" : "cancelled", show, w, p.mode === "post" ? { newTxt, untilTxt } : null);
  const msg = p.msg ?? tBody;
  const who = box.audience(show, "everyone", null);
  const peopleTxt = who === undefined ? "…" : people(who.people);

  // What a cancel means in money: orders that paid, and those that paid nothing yet.
  const orders = box.list("orders", { where: [{ column: "event_id", eq: show.id }, { column: "status", in: LIVE }], limit: 5000 })?.rows ?? [];
  const paidOrders = orders.filter((o) => Number(o["paid_in"] ?? 0) + Number(o["collected"] ?? 0) > 0);
  const doorN = orders.filter((o) => o["status"] === "door" && Number(o["paid_in"] ?? 0) + Number(o["collected"] ?? 0) === 0).length;
  const xferN = orders.filter((o) => (o["status"] === "awaiting_transfer" || o["status"] === "overdue") && Number(o["paid_in"] ?? 0) === 0).length;

  const go = (later: boolean) => {
    set({ tried: true });
    if (errs.length > 0) {
      focusLater(dateErr !== "" ? "pc-date" : timeErr !== "" ? "pc-doors" : "pc-until");
      return;
    }
    const curfewAt = startAt === null ? null : startAt + Math.max(3_600_000, show.curfew - show.start);
    app.openSheet(p.mode === "post" ? "bxPost" : "bxCancelShow", {
      ev: show.id,
      n: who?.people ?? 0,
      later,
      subj,
      body: msg,
      newTxt: startAt === null ? "" : `${fD(startAt)} ${fT(startAt)}`,
      untilTxt,
      at: { doors: doorsAt === null ? "" : new Date(doorsAt).toISOString(), start: startAt === null ? "" : new Date(startAt).toISOString(), curfew: curfewAt === null ? "" : new Date(curfewAt).toISOString(), refundUntil: untilAt === null ? "" : new Date(untilAt).toISOString() },
    });
  };

  const waitingMsg = (box.list("broadcasts", { where: [{ column: "event_id", eq: show.id }, { column: "status", eq: "waiting" }], limit: 5 })?.rows ?? [])[0];
  const sentMoved = (box.list("broadcasts", { where: [{ column: "event_id", eq: show.id }, { column: "template", eq: "moved" }, { column: "status", eq: "sent" }], sort: [{ column: "sent_at", desc: true }], limit: 1 })?.rows ?? [])[0];
  const out: V = {
    formOn: !cancelled && !show.postponed && !past,
    doneOn: show.postponed || past,
    refundsOn: cancelled,
    name: show.name,
    cols: nar ? "1fr" : "minmax(0,1fr) 300px",
    doneTxt: past
      ? tr("{name} has happened, so nothing here can change.", { name: show.name })
      : [
          tr("Postponed from {was} to {now}", { was: show.was === null ? "" : fD(show.was), now: fD(show.start) }),
          ...(show.refundUntil === null ? [] : [tr("refunds until {day}", { day: fD(show.refundUntil) })]),
          waitingMsg !== undefined
            ? tr("the message to {people} is waiting", { people: people(Number(waitingMsg["people"] ?? 0)) })
            : sentMoved !== undefined
              ? tr("the message went to {people}", { people: people(Number(sentMoved["people"] ?? 0)) })
              : "",
        ]
          .filter((x) => x !== "")
          .join(" · "),
    doneSendOn: !past && waitingMsg !== undefined,
    review: () => waitingMsg !== undefined && box.reviewWaiting(waitingMsg),
    modes: (
      [
        [tr("Postpone"), "post"],
        [tr("Cancel"), "cancel"],
      ] as [string, "post" | "cancel"][]
    ).map(([id, k]) => ({ id, on: p.mode === k, go: () => set({ mode: k, msg: null, tried: false }), style: seg(p.mode === k) })),
    post: p.mode === "post",
    cancel: p.mode === "cancel",
    date: F("date"),
    doors: F("doors"),
    stage: F("stage"),
    until: F("until"),
    untilTxt:
      untilTxt === ""
        ? tr("Pick a day before the new date.")
        : `${tr("Refunds until {day}, before the new date.", { day: untilTxt })}${sendOn ? ` ${tr("After that, people can still send their ticket to a friend.")}` : ""}`,
    dateErrOn: shown && dateErr !== "",
    dateErr,
    timeErrOn: shown && timeErr !== "",
    timeErr,
    untilErrOn: shown && untilErr !== "",
    untilErr,
    dFld: shown && dateErr !== "" ? errFld : fld,
    tFld: shown && timeErr !== "" ? errFld : fld,
    uFld: shown && untilErr !== "" ? errFld : fld,
    cancelMoney: tr('{orders} · {received} received — pay each back and record it. The {door} pay-at-the-door and {xfer} transfer orders are listed as "Paid nothing".', {
      orders: plural(paidOrders.length, "{n} order", "{n} orders"),
      received: money(show.money.received - show.money.refunded),
      door: num(doorN),
      xfer: num(xferN),
    }),
    msgStep: p.mode === "post" ? tr("3 · Tell ticket holders") : tr("2 · Tell ticket holders"),
    msg,
    onMsg: (e: { target: { value: string } }) => set({ msg: e.target.value }),
    subj,
    paras: msg.split(/\n\n+/).map((t, i) => ({ k: `p${String(i)}`, t })),
    p: posterOf(app, show),
    btnBg: palette(light)["accent"],
    people: peopleTxt,
    cta: p.mode === "post" ? tr("Postpone and send") : tr("Cancel {name} and send", { name: show.name }),
    laterOn: p.mode === "post",
    later: () => go(true),
    btnStyle: p.mode === "post" ? `${S.btnP}align-self:flex-start;` : `${S.btnP}align-self:flex-start; background:var(--danger); color:#fff;`,
    confirm: () => go(false),
    from: frame(w).from,
    foot: frame(w).foot,
    sum:
      p.mode === "post"
        ? [
            { k: tr("Was"), v: fD(show.start) },
            { k: tr("Moves to"), v: startAt === null ? "—" : `${newTxt} ${p.stage}` },
            { k: tr("Doors"), v: p.doors || "—" },
            { k: tr("Refunds until"), v: untilTxt || "—" },
            { k: tr("Ticket holders"), v: peopleTxt },
          ]
        : [
            { k: tr("Show"), v: fD(show.start) },
            { k: tr("Tickets cancelled"), v: num(sold?.taken ?? 0) },
            { k: tr("Orders to pay back"), v: num(paidOrders.length) },
            { k: tr("Money received"), v: money(show.money.received - show.money.refunded) },
          ],
    rfTabs: [],
    rfRows: [],
  };
  if (cancelled) Object.assign(out, refundsToMake(app, box, show, B));
  return { pc: out };
}

/** A cancelled show's orders to pay back: to refund, refunded, and those that paid nothing. */
function refundsToMake(app: WaveApp, box: Box, show: BoxShow, B: Record<string, unknown>): V {
  const s = box.s;
  const chip = B["chip"] as (on: boolean) => string;
  const all = box.list("orders", { where: [{ column: "event_id", eq: show.id }, { column: "status", eq: "cancelled" }], sort: [{ column: "number_seq" }], limit: 5000 })?.rows ?? [];
  const paidOf = (o: Row) => Number(o["paid_in"] ?? 0) + Number(o["collected"] ?? 0);
  const due = all.filter((o) => paidOf(o) > 0 && Number(o["balance"] ?? 0) < 0);
  const done = all.filter((o) => paidOf(o) > 0 && Number(o["balance"] ?? 0) >= 0);
  const none = all.filter((o) => paidOf(o) === 0);
  const received = all.reduce((a, o) => a + paidOf(o), 0);
  const refunded = all.reduce((a, o) => a + Number(o["refunded"] ?? 0), 0);
  const tab = s.pc.rfTab;
  const list = tab === "to" ? due : tab === "done" ? done : none;
  const PER = 20;
  const pages = Math.max(1, Math.ceil(list.length / PER));
  const page = Math.min(s.pc.rfPage, pages - 1);
  const setPc = (q: Partial<typeof s.pc>) => box.set({ pc: { ...s.pc, ev: show.id, ...q } });
  const payments = list.length === 0 ? [] : (box.list("payments", { where: [{ column: "order_id", in: list.slice(page * PER, page * PER + PER).map((o) => o.id) }] })?.rows ?? []);
  return {
    rfHead: [plural(all.length, "{n} order", "{n} orders"), tr("{amount} received", { amount: money(received) }), tr("{amount} refunded", { amount: money(refunded) }), tr("{amount} still to pay back", { amount: money(received - refunded) })].join(" · "),
    rfProg: tr("{refunded} of {received} · {n} of {all}", { refunded: money(refunded), received: money(received), n: num(done.length), all: plural(all.length, "{n} order", "{n} orders") }),
    rfBar: `display:block; width:${((refunded / Math.max(1, received)) * 100).toFixed(1)}%; background:var(--pos);`,
    rfTabs: (
      [
        ["to", tr("To refund"), due.length],
        ["done", tr("Refunded"), done.length],
        ["none", tr("Paid nothing"), none.length],
      ] as ["to" | "done" | "none", string, number][]
    ).map(([id, label, n]) => ({ id, label, n: num(n), on: tab === id, style: chip(tab === id), go: () => setPc({ rfTab: id, rfPage: 0 }) })),
    rfRows: list.slice(page * PER, page * PER + PER).map((o) => {
      const st = orderState(o, app.now);
      const pay = payments.find((x) => x["order_id"] === o.id);
      return {
        no: String(o["number"]),
        buyer: String(o["buyer_name"] ?? ""),
        email: String(o["email"] ?? ""),
        total: money(paidOf(o)),
        how: paidOf(o) === 0 ? tr("Nothing paid") : pay === undefined ? payHow(o) : pay["method"] === "card" ? tr("Card") : pay["method"] === "cash" ? tr("Cash") : tr("Bank transfer"),
        st: st.txt,
        stStyle: pill(st.k),
        actOn: tab === "to",
        mark: () => app.openSheet("bxRefund", { o: o.id, amount: (-Number(o["balance"] ?? 0)).toFixed(2), how: String(pay?.["method"] ?? "bank_transfer"), rkind: "cancelled_tickets", note: "", err: {} }),
      };
    }),
    rfPageOn: pages > 1,
    rfPageTxt: tr("Page {n} of {pages} · {orders}", { n: page + 1, pages, orders: plural(list.length, "{n} order", "{n} orders") }),
    rfPrevOff: page <= 0,
    rfNextOff: page >= pages - 1,
    rfPrev: () => setPc({ rfPage: page - 1 }),
    rfNext: () => setPc({ rfPage: page + 1 }),
    rfMore: list.length === 0 ? tr("Nothing here.") : "",
  };
}

// ── Settings ─────────────────────────────────────────────────────────────────

function settingsVals(app: WaveApp, box: Box, w: BoxWorld, B: Record<string, unknown>): V {
  if (app.state.bx !== "settings") return { st: { rooms: [], sws: [], bank: [], ages: [], refunds: [], devices: [], rules: [], feats: [], name: {}, addr: {}, email: {}, texts: [] } };
  const saved = w.settingsRow;
  const devicesRows = box.rows("devices") ?? [];
  const d = box.s.set ?? { settings: {}, rooms: w.roomRows.filter((r) => r["kind"] !== "both").map((r) => ({ ...r })), devices: devicesRows.map((x) => ({ ...x })), gone: [] };
  const val = (k: string): unknown => (k in d.settings ? d.settings[k] : saved[k]);
  const put = (p: Record<string, unknown>) => box.set({ set: { ...d, settings: { ...d.settings, ...p } } });
  const seg = B["seg"] as (on: boolean) => string;
  const F = (k: string) => ({ v: String(val(k) ?? ""), on: (e: { target: { value: string } }) => put({ [k]: e.target.value }) });
  const sw = (on: boolean) => ({
    track: `position:relative; display:inline-block; width:36px; height:21px; flex-shrink:0; border-radius:999px; background:${on ? "var(--accent)" : "var(--surface-3)"};`,
    knob: `position:absolute; inset-block-start:3px; inset-inline-start:${on ? "18px" : "3px"}; width:15px; height:15px; border-radius:50%; background:${on ? "var(--accent-fg)" : "var(--fg-subtle)"};`,
  });
  const onOf = (k: string) => val(k) !== false;
  const days = Number(val("transfer_days") ?? 3);
  const cutoff = Number(val("transfer_cutoff_days") ?? 3);
  const release = Number(val("release_after_hours") ?? 24);
  const hold = Number(val("hold_minutes") ?? 10);
  const offer = Number(val("offer_hours") ?? 12);
  const send = Number(val("send_hours") ?? 48);
  const refund = Number(val("refund_days") ?? 7);
  const check = Number(val("check_in_minutes") ?? 30);
  const emailOk = /^\S+@\S+\.\S+$/.test(String(val("contact_email") ?? ""));
  const ages: [string, string][] = [
    ["all", tr("All ages")],
    ["14_adult", tr("14+ with an adult")],
    ["16", tr("16+")],
    ["18", tr("18+ with ID")],
  ];
  const feats: [string, string][] = [
    ["accounts_on", tr("Accounts")],
    ["waitlist_on", tr("Waitlists")],
    ["send_on", tr("Send to a friend")],
    ["codes_on", tr("Codes")],
    ["timetable_on", tr("Timetable")],
    ["questions_on", tr("Checkout questions")],
  ];
  const noRefund = refund <= 0;
  return {
    st: {
      name: F("venue_name"),
      addr: F("address"),
      email: { ...F("contact_email"), errOn: !emailOk, err: tr("Check the email address") },
      texts: (
        [
          ["getting_there", tr("Getting there")],
          ["accessibility", tr("Accessibility")],
          ["policies", tr("Good to know")],
          ["faq", tr("Questions people ask")],
        ] as [string, string][]
      ).map(([k, label]) => ({ k, label, ...F(k) })),
      dirty: box.s.set !== null,
      save: () => (emailOk ? void box.saveSettings() : focusLater("st-email", 0)),
      rooms: d.rooms.map((r, i) => ({
        k: `r${String(r.id)}`,
        capLabel: tr("Capacity of {room}", { room: String(r["name"] ?? "") }),
        noteOn: typeof r["note"] === "string" && r["note"] !== "",
        note: String(r["note"] ?? ""),
        n: { v: String(r["name"] ?? ""), on: (e: { target: { value: string } }) => box.set({ set: { ...d, rooms: d.rooms.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) } }) },
        c: { v: String(r["capacity"] ?? ""), on: (e: { target: { value: string } }) => box.set({ set: { ...d, rooms: d.rooms.map((x, j) => (j === i ? { ...x, capacity: e.target.value.replace(/\D/g, "") } : x)) } }) },
      })),
      addRoom: () => box.set({ set: { ...d, rooms: [...d.rooms, { id: -Date.now(), name: tr("New room"), capacity: 100, note: null } as Row] } }),
      sws: (
        [
          ["door_on", tr("Pay at the door"), tr("The ticket works straight away; the door takes card or cash on its own terminal and records it.")],
          ["transfer_on", tr("Bank transfer"), tr("The order waits until the box office records the money.")],
        ] as [string, string, string][]
      ).map(([id, label, sub]) => {
        const on = onOf(id);
        return { id, label, sub, on, ...sw(on), go: () => put({ [id]: !on }) };
      }),
      xferOn: onOf("transfer_on"),
      bankHint: onOf("accounts_on") ? tr("Only shown to a buyer who opened their order or signed in.") : tr("Only shown to a buyer who opened their order."),
      bank: (
        [
          [tr("Account name"), "bank_account_name"],
          [tr("Bank"), "bank_name"],
          [tr("Account number"), "bank_account_number"],
          [tr("Sort code or routing number"), "bank_routing"],
        ] as [string, string][]
      ).map(([k, key]) => ({ k, ...F(key) })),
      rules: [
        [tr("Bank transfer"), tr("Pay within {days} (by {time})", { days: plural(days, "{n} day", "{n} days"), time: String(val("transfer_time") ?? "18:00") })],
        [tr("Bank transfer"), tr("Not offered within {days} of a show", { days: plural(cutoff, "{n} day", "{n} days") })],
        [tr("Bank transfer"), tr("Overdue at the deadline; released {hours} later", { hours: plural(release, "{n} hour", "{n} hours") })],
        [tr("Holds"), plural(hold, "{n} minute", "{n} minutes")],
        ...(onOf("waitlist_on") ? [[tr("Waitlist offers"), plural(offer, "{n} hour", "{n} hours")]] : []),
        ...(onOf("send_on") ? [[tr("Send to a friend"), tr("A friend has {hours} to accept a ticket (never later than doors)", { hours: plural(send, "{n} hour", "{n} hours") })]] : []),
        [tr("Refunds"), noRefund ? tr("No refunds, by default") : tr("Until {days} before, by default", { days: plural(refund, "{n} day", "{n} days") })],
        [tr("Door"), tr("Check-in opens {minutes} before doors", { minutes: plural(check, "{n} minute", "{n} minutes") })],
        [tr("Door"), tr("The venue day starts at {time}", { time: String(val("day_starts_at") ?? "06:00") })],
      ].map(([label, v], i) => ({ k: `rl${String(i)}`, label, v })),
      editRules: () => app.openSheet("bxRules", Object.fromEntries(RULE_KEYS.map((k) => [k, String(val(k) ?? "")]))),
      tonight: (() => {
        const on = onOf("tonight_email_on");
        return { on, ...sw(on), go: () => put({ tonight_email_on: !on }) };
      })(),
      ages: ages.map(([id, label]) => ({ id: label, on: String(val("default_age") ?? "all") === id, go: () => put({ default_age: id }), style: seg(String(val("default_age") ?? "all") === id) })),
      refunds: (
        [
          ["7", tr("Refunds until {days} before", { days: plural(refund > 0 ? refund : 7, "{n} day", "{n} days") })],
          ["0", onOf("send_on") ? tr("No refunds — send to a friend") : tr("No refunds")],
        ] as [string, string][]
      ).map(([id, label]) => ({ id: label, on: (id === "0") === noRefund, go: () => put({ refund_days: id === "0" ? 0 : refund > 0 ? refund : 7 }), style: seg((id === "0") === noRefund) })),
      feats: feats.map(([k, label]) => {
        const on = onOf(k);
        return { id: k, label, on, ...sw(on), go: () => put({ [k]: !on }) };
      }),
      devices: d.devices.map((dev, i) => ({
        k: `d${String(dev.id)}`,
        v: String(dev["name"] ?? ""),
        on: (e: { target: { value: string } }) => box.set({ set: { ...d, devices: d.devices.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) } }),
        delLabel: tr("Remove {door}", { door: String(dev["name"] ?? "") }),
        del: () => app.openSheet("bxDevice", { d: dev.id, name: String(dev["name"] ?? "") }),
      })),
      addDevice: () => box.set({ set: { ...d, devices: [...d.devices, { id: -Date.now(), name: tr("Door {n}", { n: d.devices.length + 1 }) } as Row] } }),
    },
  };
}

/** The rules the "Edit the rules" sheet changes. */
export const RULE_KEYS = ["transfer_days", "transfer_time", "transfer_cutoff_days", "release_after_hours", "hold_minutes", "offer_hours", "send_hours", "refund_days", "check_in_minutes", "day_starts_at"] as const;
