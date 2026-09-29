/**
 * The buyer's own pages: checkout, the order's page, sign in, My tickets, the
 * ticket on the phone, a ticket from a friend, a waitlist offer, the confirm
 * link's page, the account menu — and their sheets. Every figure is the
 * order's or the ticket's own (its total, balance, due, codes, deadlines);
 * every status line reads the rows' states.
 */
import { qrSvg } from "@adminiumjs/public-client/qr";

import type { OrderWithTickets } from "../../data/ports.ts";
import type { Id, Row } from "../../data/wire.ts";
import { tr } from "../../i18n/tr.ts";
import { cssUrl, poster, svgData, wave } from "../art.ts";
import { masked, refusalWords, transferDeadline } from "../buyer.ts";
import { codeFace, dur, fD, fT, money, ms, places, sameDay, strip, tickets as ticketsW } from "../fmt.ts";
import type { WaveApp } from "../wave.ts";
import type { Show, World } from "../world.ts";
import { ageWords, stStyle, type Status } from "./audience.ts";
import { latin, savePdf, ticketPdf, type PdfLine } from "../pdf.ts";
import { S, type V } from "./base.ts";
import { isWorkshop, refundSentence } from "./event.ts";
import type { SheetKit } from "./sheets.ts";

const n = (v: unknown): number => Number(v ?? 0);
const qrOf = (code: string): string => {
  try {
    return svgData(qrSvg(code.replace(/-/g, ""), { size: 200 }));
  } catch {
    return "";
  }
};
const first = (name: unknown) => String(name ?? "").split(" ")[0] ?? "";
const LIVE = ["door", "no_charge", "paid", "awaiting_transfer", "overdue"];

/**
 * A ticket a friend accepted: stamped when they took it, and its code (a new one, theirs) never shown to the
 * buyer. Who the friend is stays with Adminium: the buyer's reads never carry the holder's account.
 */
export function acceptedByFriend(t: Row): boolean {
  return t["accepted_at"] !== null && t["accepted_at"] !== undefined && (t["code"] === null || t["code"] === undefined);
}

/** A ticket's line on the buyer's pages: its words and tone, from its own state and its order's. */
export function ticketStatus(app: WaveApp, show: Show, order: Row, t: Row): Status {
  const os = String(order["status"]);
  const ts = String(t["status"]);
  const mine = app.signedIn();
  if (acceptedByFriend(t) && t["holder_name"] !== null && os !== "awaiting_transfer")
    return { txt: tr("Sent to {name}", { name: String(t["holder_name"]) }), k: "muted", icon: "forward" };
  if (show.cancelled || os === "cancelled")
    return n(order["paid_in"]) - n(order["refunded"]) > 0.004 ? { txt: tr("Cancelled — refund due"), k: "danger", icon: "circle-x" } : { txt: tr("Cancelled"), k: "muted", icon: "circle-x" };
  if (ts === "cancelled" || ts === "returned" || ts === "released") return { txt: tr("Cancelled"), k: "muted", icon: "circle-x" };
  if (os === "released") return { txt: tr("Released"), k: "muted", icon: "timer-off" };
  if (os === "not_collected") return { txt: tr("Didn't come"), k: "muted", icon: "history" };
  if (ts === "refund_asked") return { txt: tr("Refund asked · the box office will be in touch"), k: "warn", icon: "undo-2" };
  const inTimes = n(t["times_in"]);
  if (app.now > show.curfew) return inTimes > 0 ? { txt: tr("Used"), k: "muted", icon: "history" } : { txt: tr("Not used"), k: "muted", icon: "history" };
  if (inTimes > 0 && sameDay(app.now, show.doors)) return { txt: tr("In tonight"), k: "pos", icon: "circle-check" };
  if (ts === "offered") return { txt: tr("Offered to {name} · still yours until they accept", { name: first(t["pending_name"]) }), k: "accent", icon: "forward" };
  if (show.was !== null) return { txt: tr("Moved to {date}", { date: fD(show.start) }), k: "warn", icon: "calendar-clock" };
  if (os === "door" && n(t["due"]) - n(t["collected"]) > 0.004) return { txt: tr("Pay {amount} at the door", { amount: money(n(t["due"]) - n(t["collected"])) }), k: "info", icon: "banknote" };
  if (os === "awaiting_transfer") return { txt: tr("Waiting for payment · pay by {date}, {time}", { date: fD(order["pay_by"]), time: fT(order["pay_by"]) }), k: "warn", icon: "hourglass" };
  if (os === "overdue") return { txt: tr("Transfer overdue · goes back on sale {date}, {time}", { date: fD(releaseAt(app, order)), time: fT(releaseAt(app, order)) }), k: "danger", icon: "hourglass" };
  void mine;
  return { txt: tr("Valid"), k: "pos", icon: "circle-check" };
}

/** A pay-at-the-door ticket its buyer may still cancel: before doors, no money taken for it, not let in. */
function untouchedAtDoor(app: WaveApp, show: Show, t: Row): boolean {
  return app.now < show.doors && n(t["collected"]) <= 0.004 && n(t["times_in"]) === 0 && !acceptedByFriend(t);
}

/** When an overdue transfer goes back on sale: its deadline plus the venue's grace. */
function releaseAt(app: WaveApp, order: Row): number {
  const hours = app.world()?.settings ? n(app.world()!.settings["releaseAfterHours" as never] ?? 24) : 24;
  return (ms(order["pay_by"]) ?? app.now) + hours * 3_600_000;
}

/** A ticket's one-page PDF, saved in the browser, with a toast naming the file. */
export function downloadTicket(app: WaveApp, w: World, show: Show, number: string, t: Row, statusTxt: string): void {
  const code = codeFace(String(t["code"] ?? ""));
  if (code === "") return;
  const line = (words: string, english: string) => (latin(words) ? words : english);
  const lines: PdfLine[] = [
    [line(show.name, show.name), 24, "F2"],
    [line(`${strip(fD(show.start))}  |  ${tr("Doors {time}", { time: strip(fT(show.doors)) })}  |  ${tr("On stage {time}", { time: strip(fT(show.start)) })}`, `Doors ${strip(fT(show.doors))}`), 11, "F1", "0.3 0.3 0.36"],
    [line(`${show.room?.name ?? ""}  |  ${ageWords(show.age, true)}`, show.room?.name ?? ""), 11, "F1", "0.3 0.3 0.36"],
    [line(tr("Holder: {name}", { name: String(t["holder_name"] ?? "") }), `Holder: ${String(t["holder_name"] ?? "")}`), 13, "F2"],
    [line(`${tr("Ticket type: {type}", { type: String(t["name"] ?? "") })}${number === "" ? "" : `  |  ${tr("Order {number}", { number })}`}`, `Ticket type: ${String(t["name"] ?? "")}`), 11, "F1", "0.3 0.3 0.36"],
    [line(statusTxt, ""), 11, "F2", "0.11 0.35 0.88"],
  ];
  const foot = line(tr("Show this at the door. Works without signal."), "Show this at the door. Works without signal.");
  const name = `${number === "" ? "ticket" : number}-${code}.pdf`;
  if (savePdf(ticketPdf({ venue: w.settings.venueName, address: w.settings.address }, lines, code, foot), name)) app.toast(tr("Downloaded {file}", { file: name }), "file-down");
}

const pill = (st: Status) => `${stStyle(st.k)}align-self:flex-start; white-space:normal; line-height:1.3; padding-block:5px;`;

// ── checkout ──────────────────────────────────────────────────────────────

function checkoutVals(app: WaveApp, w: World): V {
  const s = app.state;
  const co = s.co;
  const nar = app.narrow();
  if (co === null) return { pad: "0", steps: [], tix: [], pays: [], lines: [], p: {}, orderQs: [] };
  const show = w.byId.get(co.evId);
  if (show === undefined) return { pad: "0", steps: [], tix: [], pays: [], lines: [], p: {}, orderQs: [] };
  const b = app.buyer;
  const me = app.signedIn();
  const guest = me === null;
  const ph = co.phase;
  const p = poster(show.name, show.short, show.posterStyle, app.light(), show.posterHue);
  // What Adminium priced: the held order once there is one, the dry run of the choice before.
  const quote = co.order === null ? app.quoteFor(show) : null;
  // A claim confirms only the places kept: their own figures, until the claim writes them.
  const total = co.claim ? co.tickets.reduce((a, t) => a + n(t["due"]), 0) : co.order !== null ? n(co.order["total"]) : (quote?.total ?? null);
  const discount = co.order !== null ? n(co.order["discount"]) : (quote?.discount ?? 0);
  const count = co.tix.length;
  const free = show.types.filter((t) => co.lines.some((l) => l.typeId === t.id)).every((t) => t.price === 0);
  const left = co.heldUntil === null ? 0 : Math.max(0, co.heldUntil - app.now);
  const mm = Math.floor(left / 60_000);
  const ss = Math.floor((left % 60_000) / 1000);
  const curStep = ph === "details" ? 1 : 2;
  const steps = (
    [
      [tr("Tickets"), true],
      [tr("Your details"), true],
      [tr("Confirm"), ph !== "details"],
    ] as const
  ).map(([label, on], i) => {
    const cur = i === curStep;
    return {
      label,
      cur: cur ? "step" : undefined,
      bar: `display:block; height:4px; border-radius:2px; background:${on ? "var(--accent)" : "var(--surface-3)"};`,
      lbl: `font-size:12.5px; font-weight:${cur ? 800 : 700}; color:${cur ? "var(--fg)" : "var(--fg-subtle)"};`,
    };
  });
  const segSt = (on: boolean) =>
    `min-height:36px; padding:0 13px; border-radius:10px; cursor:pointer; font-size:13px; font-weight:700; border:1px solid ${on ? "var(--accent)" : "var(--border-strong)"}; background:${on ? "var(--accent-soft)" : "var(--surface)"}; color:${on ? "var(--accent)" : "var(--fg-muted)"};`;
  const seg2 = (on: boolean) =>
    `min-height:32px; padding:0 14px; border-radius:8px; border:0; cursor:pointer; font-size:13px; font-weight:700; background:${on ? "var(--surface)" : "transparent"}; color:${on ? "var(--fg)" : "var(--fg-muted)"}; box-shadow:${on ? "0 1px 3px rgba(0,0,0,.12)" : "none"};`;
  const questions = w.settings.questionsOn ? w.questions.filter((q) => q["event_id"] === show.id).sort((a, c) => n(a["position"]) - n(c["position"])) : [];
  const qVals = (q: Row, key: string, value: string, set: (v: string) => void, err: string | null) => {
    const kind = String(q["kind"] ?? "text");
    const opts = kind === "yes_no" ? [tr("Yes"), tr("No")] : String(q["options"] ?? "").split("\n").map((x) => x.trim()).filter((x) => x !== "");
    return {
      id: `${key}-${String(q.id)}`,
      gid: `${key}-${String(q.id)}-g`,
      eid: `${key}-${String(q.id)}-e`,
      text: String(q["text"] ?? ""),
      kind,
      value,
      onText: (e: { target: { value: string } }) => set(e.target.value),
      fld: err !== null ? S.fldErr : S.fld,
      errOn: err !== null,
      err: err ?? "",
      options: opts.map((o) => ({ id: o, label: o, on: value === o, go: () => set(o), style: kind === "yes_no" ? seg2(value === o) : segSt(value === o) })),
    };
  };
  const tix = co.tix.map((x, i) => {
    const t = show.types.find((y) => y.id === x.typeId);
    const err = co.errs[`t${String(i)}`] ?? null;
    const myName = me?.name ?? co.buyer.name;
    return {
      k: `t${String(i)}`,
      n: i + 1,
      label: tr("Ticket {n} · {type}", { n: i + 1, type: t?.short ?? "" }),
      type: t?.short ?? "",
      name: x.name,
      fid: `f-t${String(i)}`,
      eid: `e-t${String(i)}`,
      errOn: err !== null,
      err: err ?? "",
      fld: err !== null ? S.fldErr : S.fld,
      mineOn: i === 0 && myName.trim() !== "" && x.name !== myName,
      useMine: () => b.setTicket(0, { name: myName }),
      onName: (e: { target: { value: string } }) => b.setTicket(i, { name: e.target.value }),
      qs: questions
        .filter((q) => q["per"] !== "order")
        .map((q) => qVals(q, `q${String(i)}`, x.answers[String(q.id)] ?? "", (v) => b.setTicket(i, { answers: { [String(q.id)]: v } }), co.errs[`q${String(i)}`] !== undefined && co.errs[`q${String(i)}`] !== null && q["required"] === true && (x.answers[String(q.id)] ?? "") === "" ? tr("Pick an answer") : null)),
    };
  });
  const orderQs = questions
    .filter((q) => q["per"] === "order")
    .map((q) => qVals(q, "qo", co.orderAnswers[String(q.id)] ?? "", (v) => b.setCoField({ orderAnswers: { ...co.orderAnswers, [String(q.id)]: v }, errs: { ...co.errs, qo: null } }), co.errs["qo"] ?? null));
  const opts = b.payOptions(show, co.lines);
  const due = transferDeadline(app, show);
  const PD = {
    door: { title: tr("Pay at the door"), icon: "door-open", desc: tr("Bring {total} on the night — card or cash.", { total: money(total ?? 0) }) },
    transfer: {
      title: tr("Pay by bank transfer"),
      icon: "landmark",
      desc: tr("We'll show you our bank details and a reference. Pay by {date}, {time}, or the tickets go back on sale.", { date: fD(due), time: fT(due) }),
    },
  };
  const pays = opts.map((id) => {
    const on = co.pay === id;
    return {
      id,
      on,
      go: () => b.setCoField({ pay: id }),
      style: `display:flex; align-items:flex-start; gap:12px; width:100%; padding:14px 16px; border-radius:14px; text-align:start; cursor:pointer; border:${on ? "2px solid var(--accent)" : "1px solid var(--border-strong)"}; background:${on ? "var(--accent-soft)" : "var(--surface)"}; color:var(--fg);`,
      dot: `width:18px; height:18px; flex-shrink:0; margin-block-start:1px; border-radius:50%; border:${on ? "5px solid var(--accent)" : "2px solid var(--border-strong)"}; background:var(--surface);`,
      ...PD[id],
    };
  });
  const unit = isWorkshop(show) || free ? places : ticketsW;
  const nm = unit(count);
  const cta = free ? (count > 1 ? tr("Get my tickets") : tr("Get my ticket")) : co.pay === "transfer" ? tr("Confirm — {n}, pay by transfer", { n: nm }) : tr("Confirm — {n}, pay at the door", { n: nm });
  const errN = Object.entries(co.errs).filter(([k, v]) => v !== null && v !== undefined && (k.startsWith("t") || k.startsWith("q"))).length;
  const warn = left < 120_000;
  const q = co.holdQ;
  const qType = q?.kind === "last" ? show.types.find((t) => t.id === q.typeId) : undefined;
  const qNm = qType?.short ?? "";
  const holdWhat = co.lines.map((l) => `${String(l.q)} × ${show.types.find((t) => t.id === l.typeId)?.short ?? ""}`).join(", ");
  const doorOnly = opts.length === 1 && opts[0] === "door";
  const xNote = doorOnly
    ? show.types.some((t) => co.lines.some((l) => l.typeId === t.id) && t.payTransfer)
      ? tr("Bank transfer closes {n} days before a show.", { n: w.settings.transferCutoffDays })
      : tr("{name} is pay at the door only.", { name: show.short })
    : "";
  const email = guest ? co.buyer.email : me.email;
  // The lines Adminium priced, by type.
  const byType = new Map<Id, { q: number; amt: number }>();
  if (co.tickets.length > 0)
    for (const t of co.tickets) {
      const k = t["ticket_type_id"] as Id;
      const cur = byType.get(k) ?? { q: 0, amt: 0 };
      byType.set(k, { q: cur.q + 1, amt: cur.amt + n(t["price"]) });
    }
  else
    for (const l of co.lines) {
      const t = show.types.find((x) => x.id === l.typeId);
      byType.set(l.typeId, { q: l.q, amt: (t?.price ?? 0) * l.q });
    }
  const code = s.codes[String(show.id)];
  const discOn = discount > 0.004;
  const fail = co.errs["hold"] ?? co.errs["confirm"] ?? null;
  return {
    pad: nar ? "14px 16px 40px" : "24px 32px 64px",
    cols: nar ? "minmax(0,1fr)" : "minmax(0,1fr) 360px",
    evShort: show.short,
    evName: show.name,
    backLabel: tr("Back to {name}", { name: show.short }),
    when: tr("{date} · Doors {time}", { date: fD(show.start), time: fT(show.doors) }),
    room: show.room?.name ?? "",
    p,
    steps,
    back: () => {
      if ((ph === "held" || ph === "mail") && !co.claim) return app.openSheet("keepHold");
      if (co.claim) return app.go("offer");
      void b.letGo();
    },
    submit: (e?: { preventDefault: () => void }) => void b.confirm(e),
    locked: !guest,
    guest,
    meName: me?.name ?? "",
    meEmail: me?.email ?? "",
    notYou: () => void b.notYou(),
    notYouOn: !co.claim,
    bName: co.buyer.name,
    bEmail: co.buyer.email,
    onBName: (e: { target: { value: string } }) => b.setBuyer({ name: e.target.value }),
    onBEmail: (e: { target: { value: string } }) => b.setBuyer({ email: e.target.value }),
    eNameOn: (co.errs["name"] ?? null) !== null,
    eName: co.errs["name"] ?? "",
    eEmailOn: (co.errs["email"] ?? null) !== null,
    eEmail: co.errs["email"] ?? "",
    fName: co.errs["name"] ? S.fldErr : S.fld,
    fEmail: co.errs["email"] ? S.fldErr : S.fld,
    detailsOff: ph !== "details",
    detailsStep: ph === "details",
    heldOn: ph === "held" || ph === "gone",
    goneOn: ph === "gone",
    mailOn: ph === "mail",
    dim: ph === "gone" ? "color:var(--fg-subtle); pointer-events:none;" : "",
    goneTxt: tr("Your {n} minutes ran out, so they went back on sale for everyone.", { n: w.settings.holdMinutes }),
    hold: () => void b.hold(),
    holdOff: (guest && co.check !== "ok") || co.busy,
    busy: co.busy,
    holdWhat,
    holdLabelTxt: tr("Hold my tickets — {what}", { what: holdWhat }),
    qLast: q?.kind === "last",
    qLastTake: q?.kind === "last" && q.n !== null && q.n > 0,
    qLastTxt:
      q?.kind === "last"
        ? q.n === null
          ? tr("Fewer {type} tickets are left than you chose.", { type: qNm })
          : q.n > 0
            ? tr("Only {n} {type} ticket is left. Take it?|Only {n} {type} tickets are left. Take them?", { n: q.n, type: qNm })
            : tr("The last {type} tickets have gone.", { type: qNm })
        : "",
    qLastBtn: q?.kind === "last" ? tr("Hold {n} {type}", { n: q.n ?? 0, type: qNm }) : "",
    takeLast: () => void b.hold("last"),
    backToTix: () => void b.letGo(),
    qCode: q?.kind === "code",
    qCodeTxt: q?.kind === "code" ? (q.total === null ? tr("{code} ran out while you were choosing.", { code: q.code }) : tr("{code} ran out while you were choosing. Your total is now {total}.", { code: q.code, total: money(q.total) })) : "",
    qCodeBtn: q?.kind === "code" && q.total !== null ? tr("Hold at {total}", { total: money(q.total) }) : tr("Hold without the code"),
    takeCode: () => void b.hold("code"),
    tix,
    orderQs,
    access: co.access,
    onAccess: (e: { target: { value: string } }) => b.setCoField({ access: e.target.value }),
    optIn: co.optIn,
    optLabel: tr("Email me about new shows at {venue}", { venue: w.settings.venueName }),
    toggleOpt: () => b.setCoField({ optIn: !co.optIn }),
    boxStyle: `width:20px; height:20px; flex-shrink:0; border-radius:6px; display:flex; align-items:center; justify-content:center; border:${co.optIn ? "0" : "2px solid var(--border-strong)"}; background:${co.optIn ? "var(--accent)" : "transparent"}; color:var(--accent-fg);`,
    payOn: opts.length > 0,
    pays,
    xferNoteOn: xNote !== "",
    xferNote: xNote,
    errSum: errN > 0,
    errSumTxt: tr("One thing needs fixing above.|{n} things need fixing above.", { n: errN }),
    failOn: fail !== null,
    failTxt: fail ?? "",
    checkOn: guest && ph === "details",
    checkRun: co.check === "run",
    checkOk: co.check === "ok",
    checkTxt: co.check === "ok" ? tr("You're a person. Thanks.") : co.check === "fail" ? tr("We couldn't check that this browser is a person.") : tr("Checking you're a person…"),
    cta,
    masked: masked(email),
    confirmBy: co.heldUntil === null ? "" : `${fD(co.heldUntil)}, ${fT(co.heldUntil)}`,
    otherPay: () => void b.payOtherWay(),
    otherPayOn: opts.some((x) => x !== "transfer"),
    checkAgain: () => b.checkAgain(),
    asideStyle: nar
      ? "order:-1; position:sticky; inset-block-start:60px; z-index:15; border-radius:16px; border:1px solid var(--border); background:var(--surface); box-shadow:0 12px 30px -20px rgba(0,0,0,.5);"
      : "position:sticky; inset-block-start:84px; border-radius:20px; border:1px solid var(--border); background:var(--surface);",
    sumOpen: !nar || co.sumOpen,
    sumPad: nar ? "4px 14px 16px" : "20px",
    toggleSum: () => b.setCoField({ sumOpen: !co.sumOpen }),
    sumIcon: co.sumOpen ? "chevron-up" : "chevron-down",
    stripTxt: `${nm} · ${free ? tr("No charge") : money(total ?? 0)}`,
    lines: [...byType].map(([typeId, x]) => ({
      k: typeId,
      label: `${String(x.q)} × ${show.types.find((t) => t.id === typeId)?.short ?? ""}`,
      amt: x.amt > 0 ? money(x.amt) : tr("No charge"),
    })),
    discOn,
    discLabel: discOn ? (code?.label ?? String(co.order?.["code_text"] ?? "")) : "",
    discAmt: `−${money(discount)}`,
    total: free ? tr("No charge") : total === null ? "" : money(total),
    timerOn: (ph === "held" || ph === "mail") && !co.claim,
    preHold: ph === "details",
    preHoldTxt: tr("We hold them for {n} minutes once you press Hold.", { n: w.settings.holdMinutes }),
    claimOn: co.claim,
    claimTxt: co.heldUntil === null ? "" : `${fD(co.heldUntil)}, ${fT(co.heldUntil)}`,
    hold2: `${String(mm)}:${String(ss).padStart(2, "0")}`,
    holdLabel: tr("Held for {m} minutes {s} seconds", { m: mm, s: ss }),
    holdStyle: `font-family:var(--mono); font-size:12.5px; font-weight:700; padding:2px 7px; border-radius:6px; background:${warn ? "var(--warn-soft)" : "var(--surface-2)"}; color:${warn ? "var(--warn)" : "var(--fg)"};`,
    letGo: () => void b.letGo(),
  };
}

// ── the order's own page ──────────────────────────────────────────────────

function goingVals(app: WaveApp, w: World): V {
  const nar = app.narrow();
  const light = app.light();
  const o = app.buyer.going();
  if (o === undefined) return { tickets: [], bank: [], dlCols: "", loadOn: true };
  const order = o.order;
  const show = w.byId.get(order["event_id"] as Id);
  if (show === undefined) return { tickets: [], bank: [], dlCols: "" };
  const p = poster(show.name, show.short, show.posterStyle, light, show.posterHue);
  const os = String(order["status"]);
  const tear = nar
    ? `height:14px; background:${cssUrl(wave(160, 12, () => 0.9, 3, light ? "#c9c9d2" : "#3a3a44", 1.3))} repeat-x center / 160px 12px;`
    : `width:14px; background:${cssUrl(wave(12, 160, () => 0.9, 3, light ? "#c9c9d2" : "#3a3a44", 1.3, true))} repeat-y center / 12px 160px;`;
  const waiting = os === "awaiting_transfer" || os === "overdue";
  const rel = os === "released";
  const gone = os === "let_go" || os === "expired" || os === "held" || os === "confirming";
  const canc = show.cancelled || os === "cancelled";
  const past = app.now > show.curfew;
  const paid = os === "paid";
  const list = o.tickets.filter((t) => t["status"] !== "returned" && t["status"] !== "released");
  const tickets = list.map((t, i) => {
    const st = ticketStatus(app, show, order, t);
    const code = t["code"] === null || t["code"] === undefined ? "" : codeFace(String(t["code"]));
    const sent = st.icon === "forward" && st.k === "muted";
    const hide = waiting || rel || sent || code === "";
    const live = !hide && !canc && !past && t["status"] !== "cancelled" && t["status"] !== "refund_asked";
    return {
      code,
      codeOn: !hide,
      holder: String(t["holder_name"] ?? ""),
      type: String(t["name"] ?? ""),
      room: show.room?.name ?? "",
      show: show.name,
      venue: w.settings.venueName.toUpperCase(),
      when: tr("{date} · Doors {time}", { date: fD(show.start), time: fT(show.doors) }),
      p,
      tear,
      delay: `${(0.15 + i * 0.55).toFixed(2)}s`,
      aria: tr("Ticket {i} of {n} for {show}", { i: i + 1, n: list.length, show: show.name }),
      qr: live ? qrOf(code) : "",
      qrAlt: tr("QR code for ticket {code}", { code }),
      qrOn: live,
      waitOn: !live,
      waitTxt: waiting ? tr("Your ticket appears here once we've seen the payment") : st.txt,
      waitIcon: waiting ? "hourglass" : st.icon,
      dim: waiting || canc || rel ? "color:var(--fg-subtle); filter:saturate(.3);" : "",
      payOn: st.txt !== tr("Valid"),
      payTxt: st.txt,
      payIcon: st.icon,
      payStyle: pill(st),
    };
  });
  const email = String(order["email"] ?? "");
  const paidAmt = n(order["paid_in"]) - n(order["refunded"]);
  let heading = tr("You're going!");
  let sub = tr("We've emailed your order to {email}.", { email });
  let note = "";
  let noteOn = false;
  let noteStyle = S.aInfo;
  let noteIcon = "info";
  let noteColor = "var(--info)";
  let seeOn = false;
  if (rel || gone) {
    heading = rel ? tr("This order was released") : tr("These tickets weren't kept");
    sub = "";
    note = rel
      ? tr("We didn't see the transfer by the deadline, so the tickets went back on sale. If you sent it, reply to your email and the box office will sort it out.")
      : tr("The {n} minutes ran out before the order was confirmed, so the tickets went back on sale.", { n: w.settings.holdMinutes });
    noteOn = true;
    noteStyle = S.aDanger;
    noteIcon = "circle-x";
    noteColor = "var(--danger)";
    seeOn = true;
  } else if (canc) {
    heading = tr("{name} is cancelled", { name: show.name });
    sub =
      paidAmt > 0.004
        ? w.settings.refundPayback === ""
          ? tr("You paid {amount}. The box office pays it back the way you paid.", { amount: money(paidAmt) })
          : tr("You paid {amount}. The box office pays it back the way you paid, {when}.", { amount: money(paidAmt), when: w.settings.refundPayback })
        : tr("You hadn't paid anything, so there's nothing to pay back.");
  } else if (past) {
    heading = tr("This one's happened");
    sub = tr("{name}, {date}.", { name: show.name, date: fD(show.start) });
  } else if (os === "not_collected") {
    heading = tr("This one's happened");
    sub = tr("This one's happened. Nothing was paid at the door, so there's nothing to pay.");
  } else if (waiting) heading = tr("Awaiting payment");
  const balance = n(order["balance"]);
  const door = app.state.going?.via === "me" ? "me" : "link";
  const bankRows = waiting ? app.get(`aud:bank:${door}:${String(order.id)}`, () => app.ports.audience!.bank(door)) : undefined;
  const overdue = os === "overdue";
  return {
    pad: nar ? "24px 16px 48px" : "40px 32px 72px",
    no: String(order["number"] ?? ""),
    eyebrow: tr("Order {number}", { number: String(order["number"] ?? "") }),
    heading,
    subOn: sub !== "",
    sub,
    noteOn,
    note,
    noteStyle,
    noteIcon,
    noteColor,
    seeOn,
    seeWhatsOn: () => app.go("home"),
    doorOn: os === "door" && !canc && !past && balance > 0.004,
    doorTxt: tr("Pay {amount} at the door", { amount: money(balance) }),
    noneOn: os === "no_charge" && !canc && !past,
    xferOn: waiting && !canc,
    total: money(balance),
    due: order["pay_by"] ? `${fD(order["pay_by"])}, ${fT(order["pay_by"])}` : "",
    dueTxt: overdue
      ? tr("Overdue · was due {date}", { date: `${fD(order["pay_by"])}, ${fT(order["pay_by"])}` })
      : tr("Pay by {date}", { date: `${fD(order["pay_by"])}, ${fT(order["pay_by"])}` }),
    xferTxt: overdue
      ? tr("Your tickets go back on sale at {time} unless the box office has seen your payment.", { time: `${fD(releaseAt(app, order))}, ${fT(releaseAt(app, order))}` })
      : tr("Send {amount} by bank transfer with the reference below. Your tickets appear here once we've seen the payment. If it hasn't arrived by the deadline, the tickets go back on sale.", { amount: money(balance) }),
    paidOn: paid && !canc,
    paidHow: paidWords(order["paid_method"]),
    paidDate: fD(order["paid_at"]),
    receiptOn: paid && app.receipts,
    receipt: () => void app.receipt(order),
    dueChip: `display:inline-flex; align-items:center; min-height:26px; padding:0 10px; border-radius:999px; background:${overdue ? "var(--danger-soft)" : "var(--warn-soft)"}; color:${overdue ? "var(--danger)" : "var(--warn)"}; font-family:var(--mono); font-size:12px; font-weight:700;`,
    dlCols: nar ? "1fr" : "repeat(3,minmax(0,1fr))",
    bank: [
      { k: tr("Account name"), v: String(bankRows?.["bank_account_name"] ?? "") },
      { k: tr("Bank"), v: String(bankRows?.["bank_name"] ?? "") },
      { k: tr("Account number"), v: String(bankRows?.["bank_account_number"] ?? "") },
      { k: tr("Sort code or routing number"), v: String(bankRows?.["bank_routing"] ?? "") },
      { k: tr("Reference"), v: String(order["number"] ?? "") },
      { k: tr("Amount"), v: money(balance) },
    ],
    copyRef: () => {
      void navigator.clipboard?.writeText(String(order["number"] ?? "")).catch(() => undefined);
      app.toast(tr("Reference {number} copied", { number: String(order["number"] ?? "") }), "copy");
    },
    tixOn: !rel && !gone,
    tickets,
    tkCols: nar ? "1fr" : "96px minmax(0,1fr) 14px 184px",
    edgeMin: nar ? "64px" : "100%",
    actsOn: !rel && !gone && !canc && !past,
    ics: () => app.ics(show),
    directions: () => app.openSheet("venue", { sec: "getting" }),
    sendOn: w.settings.sendOn && !waiting && !rel && !gone && !canc && !past && sendable(o).length > 0,
    send: () => {
      const s = sendable(o);
      if (s.length === 1) app.openSheet("tSend", { ticket: s[0]!.id, order: order.id, name: "", email: "", err: {} });
      else app.openSheet("whichTicket", { order: order.id });
    },
    guestOn: app.signedIn() === null && w.settings.accountsOn && !rel && !gone,
    email,
    sendMe: () => {
      app.go("signin", { si: { ...app.state.si, step: "email", email, fieldErr: null } });
      setTimeout(() => void app.buyer.sendCode(), 60);
    },
  };
}

/** "Paid · Bank transfer": how the order was paid, in words. */
function paidWords(method: unknown): string {
  switch (method) {
    case "bank_transfer":
      return tr("Paid · Bank transfer");
    case "card":
      return tr("Paid · Card");
    case "cash":
      return tr("Paid · Cash");
    default:
      return tr("Paid");
  }
}

/** The tickets of an order its buyer may send to a friend: valid, nobody else's, not offered already. */
function sendable(o: OrderWithTickets): Row[] {
  return o.tickets.filter((t) => t["status"] === "valid" && !acceptedByFriend(t) && t["code"] !== null && t["code"] !== undefined);
}

// ── sign in ───────────────────────────────────────────────────────────────

function signinVals(app: WaveApp): V {
  const si = app.state.si;
  const b = app.buyer;
  const rs = Math.max(0, Math.ceil((si.resendAt - app.now) / 1000));
  const locked = si.err === "locked";
  const bad = si.err === "wrong" || si.err === "many" || si.err === "locked";
  const errs: Record<string, string> = {
    wrong: si.tries === null ? tr("That code isn't right") : tr("That code isn't right — {n} try left|That code isn't right — {n} tries left", { n: si.tries }),
    expired: tr("That link and code have run out"),
    many: tr("No tries left for this code. Send a new link."),
    locked: tr("Too many wrong codes today. The link in your email still works."),
    short: tr("Enter all 6 digits"),
  };
  const boxes = si.digits.map((v, i) => ({
    id: `si-d${String(i)}`,
    v,
    label: tr("Digit {n} of 6", { n: i + 1 }),
    onChange: (e: { target: { value: string } }) => {
      const raw = e.target.value.replace(/\D/g, "");
      const d = si.digits.slice();
      if (raw.length > 1) {
        for (let k = 0; k < raw.length && i + k < 6; k += 1) d[i + k] = raw[k]!;
        b.setDigits(d, i + raw.length);
      } else {
        d[i] = raw;
        b.setDigits(d, raw !== "" ? i + 1 : null);
      }
    },
    onKey: (e: { key: string; preventDefault: () => void }) => {
      const rtl = app.state.lang === "ar-EG";
      if (e.key === "Backspace" && si.digits[i] === "" && i > 0) {
        const d = si.digits.slice();
        d[i - 1] = "";
        b.setDigits(d, i - 1);
        e.preventDefault();
      } else if (e.key === (rtl ? "ArrowRight" : "ArrowLeft") && i > 0) {
        document.getElementById(`si-d${String(i - 1)}`)?.focus();
        e.preventDefault();
      } else if (e.key === (rtl ? "ArrowLeft" : "ArrowRight") && i < 5) {
        document.getElementById(`si-d${String(i + 1)}`)?.focus();
        e.preventDefault();
      }
    },
    onPaste: (e: { clipboardData?: { getData: (k: string) => string } | null; preventDefault: () => void }) => {
      const t = (e.clipboardData?.getData("text") ?? "").replace(/\D/g, "").slice(0, 6);
      if (t === "") return;
      e.preventDefault();
      const d = ["", "", "", "", "", ""];
      for (let k = 0; k < t.length; k += 1) d[k] = t[k]!;
      b.setDigits(d, t.length);
    },
  }));
  const mailErr = si.mailErr === "down" ? tr("We can't send email right now. Try again in a few minutes.") : si.mailErr === "limit" ? tr("Too many links asked for. Wait a few minutes.") : "";
  return {
    pad: app.narrow() ? "28px 16px 48px" : "56px 20px 72px",
    noticeOn: si.notice === "out",
    noticeHead: tr("You were signed out on this device"),
    notice: tr("Someone signed out of all devices on this account."),
    noticeIcon: "log-out",
    emailStep: si.step === "email",
    codeStep: si.step === "code",
    email: si.email,
    onEmail: (e: { target: { value: string } }) => app.setState({ si: { ...si, email: e.target.value, fieldErr: null, mailErr: "", check: "idle" } }),
    fieldErrOn: si.fieldErr !== null,
    fieldErr: si.fieldErr ?? "",
    fld: si.fieldErr !== null ? S.fldErr : S.fld,
    mailErrOn: mailErr !== "",
    mailErr,
    mailIcon: si.mailErr === "down" ? "cloud-off" : "octagon-alert",
    checkOn: si.check !== "idle",
    checkRun: si.check === "run",
    checkIconOn: si.check === "ok" || si.check === "fail",
    checkIcon: si.check === "fail" ? "shield-alert" : "shield-check",
    checkFail: si.check === "fail",
    checkTxt: si.check === "run" ? tr("Checking you're a person…") : si.check === "fail" ? tr("We couldn't check that this browser is a person.") : tr("You're a person. Thanks."),
    checkColor: si.check === "fail" ? "var(--danger)" : si.check === "ok" ? "var(--pos)" : "var(--fg-subtle)",
    retry: () => void b.sendCode(),
    send: (e?: { preventDefault: () => void }) => void b.sendCode(e),
    sendOff: si.check === "run",
    masked: masked(si.email.trim()),
    boxes,
    boxOff: locked,
    boxStyle: `width:100%; height:58px; padding:0; border-radius:12px; border:1.5px solid ${bad ? "var(--danger)" : "var(--border-strong)"}; background:${locked ? "var(--surface-2)" : "var(--surface)"}; color:${bad ? "var(--danger)" : "var(--fg)"}; text-align:center; font-family:var(--mono); font-size:24px; font-weight:700;`,
    errOn: si.err !== null,
    err: si.err === null ? "" : errs[si.err],
    expOn: si.err === "expired",
    verify: (e?: { preventDefault: () => void }) => void b.verify(e),
    verifyOff: locked || si.digits.join("").length < 6 || si.busy,
    resendOff: rs > 0,
    resendTxt: rs > 0 ? tr("Send a new link in {time}", { time: `0:${String(rs).padStart(2, "0")}` }) : tr("Send a new link"),
    resend: () => void b.resend(),
    other: () => app.setState({ si: { ...si, step: "email", err: null, check: "idle" } }),
  };
}

// ── My tickets ────────────────────────────────────────────────────────────

function ticketsVals(app: WaveApp, w: World): V {
  const s = app.state;
  const nar = app.narrow();
  const light = app.light();
  const me = app.signedIn();
  const tabSt = (on: boolean) =>
    `min-height:36px; padding:0 14px; border-radius:9px; border:0; cursor:pointer; font-size:13.5px; font-weight:700; background:${on ? "var(--surface)" : "transparent"}; color:${on ? "var(--fg)" : "var(--fg-muted)"}; box-shadow:${on ? "0 1px 3px rgba(0,0,0,.12)" : "none"};`;
  const base = {
    pad: nar ? "24px 16px 48px" : "40px 32px 72px",
    out: me === null,
    in: me !== null,
    tabs: (
      [
        ["up", tr("Upcoming")],
        ["past", tr("Past")],
      ] as const
    ).map(([id, label]) => ({ id, label, on: s.mtTab === id, selected: s.mtTab === id ? "true" : "false", style: tabSt(s.mtTab === id), go: () => app.setState({ mtTab: id }) })),
    notices: [],
    waits: [],
    groups: [],
    empty: false,
    grpCols: nar ? "1fr" : "14px minmax(0,1fr)",
    edgeMin: nar ? "10px" : "100%",
    goSignIn: () => app.goSignIn(),
  };
  if (me === null) return base;
  const mine = app.buyer.mine();
  const waitRows = app.buyer.myWaitlist() ?? [];
  if (mine === undefined) return { ...base, loading: true };
  const up = s.mtTab === "up";
  const isPast = (show: Show) => app.now > show.curfew;
  const byShow = new Map<Id, OrderWithTickets[]>();
  for (const o of mine.orders) {
    if (o.order["status"] === "offered") continue;
    const id = o.order["event_id"] as Id;
    byShow.set(id, [...(byShow.get(id) ?? []), o]);
  }
  const offers = w.settings.waitlistOn && up ? waitRows.filter((x) => x["status"] === "offered" && ms(x["offer_until"]) !== null && ms(x["offer_until"])! > app.now) : [];
  const heldByShow = new Map<Id, Row[]>();
  for (const t of mine.held) heldByShow.set(t["event_id"] as Id, [...(heldByShow.get(t["event_id"] as Id) ?? []), t]);
  const showIds = [...new Set([...byShow.keys(), ...heldByShow.keys(), ...offers.map((o) => o["event_id"] as Id)])];
  const shows = showIds
    .map((id) => w.byId.get(id))
    .filter((e): e is Show => e !== undefined && (up ? !isPast(e) : isPast(e)))
    .sort((a, c) => (up ? a.start - c.start : c.start - a.start));
  const groups = shows.map((show) => {
    const p = poster(show.name, show.short, show.posterStyle, light, show.posterHue);
    const off = offers.find((x) => x["event_id"] === show.id);
    const os = byShow.get(show.id) ?? [];
    if (off !== undefined && os.length === 0) {
      const q = n(off["qty"]);
      return {
        id: show.id,
        isOffer: true,
        isEv: false,
        name: show.name,
        p,
        acts: [],
        tickets: [],
        offerTxt: tr("{n} ticket for {show} is yours if you want it|{n} tickets for {show} are yours if you want them", { n: q, show: show.name }),
        offerLeft: tr("Claim within {span}", { span: dur(ms(off["offer_until"])! - app.now) }),
        claim: () => app.openOffer(off["order_id"] as Id),
        leave: () => void app.buyer.act(() => app.ports.audience!.leaveWaitlist(off.id), tr("You've left the waitlist"), "list-x"),
      };
    }
    const tiles: V[] = [];
    for (const o of os) {
      for (const t of o.tickets) {
        if (t["status"] === "returned" || t["status"] === "released") continue;
        const st = ticketStatus(app, show, o.order, t);
        const code = t["code"] === null || t["code"] === undefined ? "" : codeFace(String(t["code"]));
        const sent = st.icon === "forward" && st.k === "muted";
        const codeOn = code !== "" && !sent;
        const usable = codeOn && (["pos", "info", "accent"].includes(st.k) || (st.k === "warn" && show.was !== null && t["status"] !== "refund_asked"));
        tiles.push({
          code,
          codeOn,
          holder: String(t["holder_name"] ?? ""),
          type: String(t["name"] ?? ""),
          st: st.txt,
          stStyle: pill(st),
          showOn: usable,
          show: () => app.setState({ dm: { orderId: o.order.id, i: o.tickets.filter(dmOk).findIndex((x) => x.id === t.id), via: "me" } }),
          moreOn: !sent && t["status"] !== "cancelled" && t["status"] !== "refund_asked" && !isPast(show) && !show.cancelled && o.order["status"] !== "released",
          more: () => app.openSheet("tMenu", { ticket: t.id, order: o.order.id }),
          moreLabel: tr("More for {name}'s ticket", { name: String(t["holder_name"] ?? "") }),
          takeOn: t["status"] === "offered",
          take: () => void app.buyer.act(() => app.ports.audience!.takeBack(t.id), tr("Ticket taken back"), "undo-2"),
          withdrawOn: t["status"] === "refund_asked" && !show.cancelled,
          withdraw: () => void app.buyer.act(() => app.ports.audience!.withdrawRefund(t.id), tr("Refund request withdrawn"), "undo-2"),
        });
      }
    }
    for (const t of heldByShow.get(show.id) ?? []) {
      const code = codeFace(String(t["code"] ?? ""));
      tiles.push({
        code,
        codeOn: code !== "",
        holder: String(t["holder_name"] ?? ""),
        type: String(t["name"] ?? ""),
        st: tr("Valid"),
        stStyle: pill({ txt: "", k: "pos", icon: "" }),
        showOn: code !== "" && !isPast(show),
        show: () => app.setState({ dm: { orderId: -1, i: 0, via: "me" } }),
        moreOn: !isPast(show) && !show.cancelled,
        more: () => app.openSheet("tMenu", { ticket: t.id, order: null, held: true }),
        moreLabel: tr("More for {name}'s ticket", { name: String(t["holder_name"] ?? "") }),
        takeOn: false,
        withdrawOn: false,
      });
    }
    const acts: V[] = [];
    if (!isPast(show) && !show.cancelled) {
      acts.push({ id: "cal", label: tr("Add to calendar"), icon: "calendar-plus", go: () => app.ics(show) });
      acts.push({ id: "dir", label: tr("Get directions"), icon: "navigation", go: () => app.openSheet("venue", { sec: "getting" }) });
    }
    for (const o of os) acts.push({ id: `o${String(o.order.id)}`, label: tr("Order {number}", { number: String(o.order["number"] ?? "") }), icon: "receipt-text", go: () => app.buyer.openMine(o.order.id) });
    const numbers = os.map((o) => String(o.order["number"] ?? "")).join(", ");
    return {
      id: show.id,
      isOffer: false,
      isEv: true,
      name: show.name,
      open: () => app.openShow(show.id),
      p,
      meta: [tr("{date} · Doors {time}", { date: fD(show.start), time: fT(show.doors) }), show.room?.name ?? "", numbers].filter((x) => x !== "").join(" · "),
      acts,
      tickets: tiles,
    };
  });
  const notices = up
    ? mine.orders
        .filter((o) => {
          const show = w.byId.get(o.order["event_id"] as Id);
          return show !== undefined && show.was !== null && !show.cancelled && !isPast(show) && (o.order["kept_at"] === null || o.order["kept_at"] === undefined) && LIVE.includes(String(o.order["status"])) && !o.tickets.every((t) => t["status"] === "refund_asked");
        })
        .map((o) => {
          const show = w.byId.get(o.order["event_id"] as Id)!;
          return {
            id: o.order.id,
            head: tr("{name} has moved to {date}.", { name: show.name, date: fD(show.start) }),
            txt:
              show.refundUntil === null
                ? tr("Your tickets are valid for the new date.")
                : tr("Your tickets are valid for the new date — or ask for a refund until {date}.", { date: fD(show.refundUntil) }),
            keep: () => void app.buyer.act(() => app.ports.audience!.keep(o.order.id), tr("Kept — see you on {date}", { date: fD(show.start) }), "check"),
            refund: () => {
              const t = o.tickets.find((x) => x["status"] === "valid");
              if (t !== undefined) app.openSheet("tRefund", { ticket: t.id, order: o.order.id });
            },
          };
        })
    : [];
  const waits =
    up && w.settings.waitlistOn
      ? waitRows
          .filter((x) => x["status"] === "waiting" && !offers.some((o) => o["event_id"] === x["event_id"]))
          .map((x) => {
            const show = w.byId.get(x["event_id"] as Id);
            return show === undefined || isPast(show)
              ? null
              : {
                  id: x.id,
                  txt: tr("On the waitlist for {show} — {n} ticket|On the waitlist for {show} — {n} tickets", { show: show.name, n: n(x["qty"]) }),
                  view: () => app.openShow(show.id),
                  leave: () => void app.buyer.act(() => app.ports.audience!.leaveWaitlist(x.id), tr("You've left the waitlist"), "list-x"),
                };
          })
          .filter((x) => x !== null)
      : [];
  return {
    ...base,
    notices,
    waits,
    groups,
    empty: groups.length === 0 && waits.length === 0,
    emptyHead: up ? tr("No tickets yet") : tr("Nothing here yet"),
    emptyTxt: up ? tr("When you get tickets with {email}, they show up here.", { email: me.email }) : tr("Shows you have been to will show up here."),
  };
}

/** A ticket that gets in: shown on the phone. */
const dmOk = (t: Row) => t["status"] === "valid" || t["status"] === "offered";

function dmVals(app: WaveApp, w: World): V {
  const s = app.state;
  if (s.dm === null) return { on: false, tickets: [], dots: [] };
  const o =
    s.dm.via === "link"
      ? app.buyer.going()
      : (app.buyer.mine()?.orders.find((x) => x.order.id === s.dm!.orderId) ?? app.get(`aud:me:order:${String(s.dm.orderId)}`, () => app.ports.audience!.myOrder(s.dm!.orderId)));
  if (o === undefined) return { on: false, tickets: [], dots: [] };
  const show = w.byId.get(o.order["event_id"] as Id);
  if (show === undefined) return { on: false, tickets: [], dots: [] };
  const list = o.tickets.filter((t) => dmOk(t) && t["code"] !== null && t["code"] !== undefined);
  const idx = Math.max(0, Math.min(list.length - 1, s.dm.i));
  const scrollTo = (k: number) => {
    const el = document.querySelector<HTMLElement>("[data-wv-dm]");
    const rtl = app.state.lang === "ar-EG";
    el?.scrollTo({ left: (rtl ? -1 : 1) * k * el.clientWidth, behavior: "smooth" });
    app.setState({ dm: { ...s.dm!, i: k } });
  };
  return {
    on: true,
    close: () => {
      app.setState({ dm: null });
      app.refocus();
    },
    pos: tr("Ticket {i} of {n}", { i: idx + 1, n: list.length }),
    multi: list.length > 1,
    prevOff: idx <= 0,
    nextOff: idx >= list.length - 1,
    prev: () => scrollTo(Math.max(0, idx - 1)),
    next: () => scrollTo(Math.min(list.length - 1, idx + 1)),
    onScroll: (e: { currentTarget: HTMLElement }) => {
      const el = e.currentTarget;
      const k = Math.round(Math.abs(el.scrollLeft) / Math.max(1, el.clientWidth));
      if (k !== s.dm!.i && list[k] !== undefined) app.setState({ dm: { ...s.dm!, i: k } });
    },
    dots: list.map((_, k) => ({ k: `d${String(k)}`, style: `width:${k === idx ? "18" : "7"}px; height:7px; border-radius:4px; background:${k === idx ? "var(--accent)" : "var(--border-strong)"}; transition:width .2s;` })),
    tickets: list.map((t) => {
      const st = ticketStatus(app, show, o.order, t);
      const code = codeFace(String(t["code"] ?? ""));
      return {
        code,
        holder: String(t["holder_name"] ?? ""),
        type: String(t["name"] ?? ""),
        room: show.room?.name ?? "",
        show: show.name,
        when: tr("{date} · Doors {time}", { date: fD(show.start), time: fT(show.doors) }),
        qr: qrOf(code),
        qrAlt: tr("QR code for ticket {code}", { code }),
        payOn: st.txt !== tr("Valid"),
        payTxt: st.txt,
      };
    }),
  };
}

// ── a ticket from a friend ────────────────────────────────────────────────

function friendVals(app: WaveApp, w: World): V {
  const fr = app.state.fr;
  const t = app.buyer.friend();
  if (fr.token === null) return {};
  if (t === undefined) return { loadOn: true, p: {} };
  const show = w.byId.get(t["event_id"] as Id);
  if (show === undefined) return { p: {} };
  const p = poster(show.name, show.short, show.posterStyle, app.light(), show.posterHue);
  const past = app.now > show.curfew;
  const status = String(t["status"]);
  const holder = String(t["holder_name"] ?? "");
  const accepted = t["accepted_at"] !== null && t["accepted_at"] !== undefined;
  let st: "offer" | "done" | "back" | "ranout" | "past" = "offer";
  if (accepted) st = past ? "past" : "done";
  else if (past) st = "past";
  else if (status !== "offered") st = t["offer_until"] !== null && ms(t["offer_until"])! <= app.now ? "ranout" : "back";
  const sender = first(t["sender_name"] ?? "");
  const gone: Record<string, [string, string]> = {
    back: [tr("This ticket was taken back"), tr("The ticket went back to the person who sent it before you accepted it. Nothing more to do.")],
    ranout: [tr("This offer ran out"), tr("Nobody accepted it in time, so it went back to the person who sent it.")],
    past: [tr("This show has happened"), tr("{show} was on {date}.", { show: show.name, date: fD(show.start) })],
  };
  const code = t["code"] === null || t["code"] === undefined ? "" : codeFace(String(t["code"]));
  const owed = n(t["due"]) - n(t["collected"]);
  return {
    head: st === "done" ? tr("It's yours") : sender === "" ? tr("A ticket for {show}", { show: show.name }) : tr("{name} sent you a ticket for {show}", { name: sender, show: show.name }),
    p,
    offer: st === "offer",
    done: st === "done",
    gone: gone[st] !== undefined,
    goneHead: gone[st]?.[0] ?? "",
    goneTxt: gone[st]?.[1] ?? "",
    cardOn: st === "offer",
    card: {
      when: tr("{date} · Doors {time}", { date: fD(show.start), time: fT(show.doors) }),
      show: show.name,
      line: [String(t["name"] ?? ""), show.room?.name ?? "", ageWords(show.age, true)].filter((x) => x !== "").join(" · "),
      payOn: owed > 0.004,
      pay: tr("Pay {amount} at the door", { amount: money(owed) }),
    },
    name: fr.name,
    onName: (e: { target: { value: string } }) => app.setState({ fr: { ...fr, name: e.target.value, err: null } }),
    errOn: fr.err !== null,
    err: fr.err ?? "",
    fld: fr.err !== null ? S.fldErr : S.fld,
    accept: (e?: { preventDefault: () => void }) => void app.buyer.accept(e),
    busy: fr.busy,
    holder: `${holder} · ${String(t["name"] ?? "")}`,
    newCode: code,
    qr: code === "" ? "" : qrOf(code),
    qrOn: code !== "",
    qrAlt: tr("QR code for ticket {code}", { code }),
    payOn: st === "done" && owed > 0.004,
    payTxt: tr("Pay {amount} at the door", { amount: money(owed) }),
    pdf: () => downloadTicket(app, w, show, "", t, owed > 0.004 ? tr("Pay {amount} at the door", { amount: money(owed) }) : tr("Valid")),
    seeWhatsOn: () => app.go("home"),
  };
}

// ── a waitlist offer ──────────────────────────────────────────────────────

function offerVals(app: WaveApp, w: World): V {
  const s = app.state;
  if (s.scr !== "offer") return { qs: [] };
  const o = app.buyer.going();
  if (o === undefined) return { qs: [], loadOn: true, p: {} };
  const show = w.byId.get(o.order["event_id"] as Id);
  if (show === undefined) return { qs: [], p: {} };
  const until = ms(o.order["offer_until"]);
  const live = o.order["status"] === "offered" && until !== null && until > app.now;
  const wn = o.tickets.length;
  const q = Math.max(1, Math.min(s.offerQ, wn));
  const seg = (on: boolean) =>
    `min-height:34px; padding:0 16px; border-radius:9px; border:0; cursor:pointer; font-family:var(--mono); font-size:14px; font-weight:700; background:${on ? "var(--surface)" : "transparent"}; color:${on ? "var(--fg)" : "var(--fg-muted)"}; box-shadow:${on ? "0 1px 3px rgba(0,0,0,.12)" : "none"};`;
  const each = n(o.tickets[0]?.["due"] ?? 0);
  const type = String(o.tickets[0]?.["name"] ?? "");
  return {
    live,
    gone: !live,
    hours: w.settings.offerHours,
    left: until === null ? "" : tr("Claim within {span}", { span: dur(until - app.now) }),
    endTxt: until === null ? "" : `${fD(until)}, ${fT(until)}`,
    goneTxt: tr("The {n} hours ended at {time}, so they went to the next person on the list. You're still on the waitlist if more come back.", {
      n: w.settings.offerHours,
      time: until === null ? "" : `${fD(until)}, ${fT(until)}`,
    }),
    p: poster(show.name, show.short, show.posterStyle, app.light(), show.posterHue),
    headTxt: tr("{n} ticket for {show} is yours if you want it|{n} tickets for {show} are yours if you want them", { n: wn, show: show.name }),
    card: {
      when: tr("{date} · Doors {time}", { date: fD(show.start), time: fT(show.doors) }),
      show: show.name,
      line: [show.room?.name ?? "", ageWords(show.age), type].filter((x) => x !== "").join(" · "),
      price: money(each),
    },
    qs: Array.from({ length: wn }, (_, i) => i + 1).map((x) => ({ id: x, on: q === x, checked: q === x ? "true" : "false", go: () => app.setState({ offerQ: x }), style: seg(q === x) })),
    label: tr("Continue — {tickets} · {total}", { tickets: ticketsW(q), total: money(o.tickets.slice(0, q).reduce((a, t) => a + n(t["due"]), 0)) }),
    go: () => app.buyer.claim(o, q),
    seeWhatsOn: () => app.go("home"),
  };
}

// ── the transfer's confirm link ───────────────────────────────────────────

function confirmVals(app: WaveApp, w: World): V {
  const c = app.state.confirm;
  if (c.token === null) return { on: false };
  const o = app.buyer.confirmRead();
  if (o === undefined) return { on: true, loadOn: true, bank: [] };
  const show = w.byId.get(o["event_id"] as Id);
  const st = String(o["status"]);
  const heldUntil = ms(o["held_until"]);
  const ranOut = st === "expired" || st === "let_go" || (st === "confirming" && heldUntil !== null && heldUntil <= app.now);
  const done = c.done || st === "awaiting_transfer" || st === "overdue" || st === "paid";
  // The bank details only once the order is confirmed: the confirm link's own session reads them.
  const settings = done ? app.get(`aud:confirm:bank:${c.token}`, () => app.ports.audience!.bank("confirm")) : undefined;
  return {
    on: true,
    no: String(o["number"] ?? ""),
    eyebrow: tr("Order {number}", { number: String(o["number"] ?? "") }),
    show: show?.name ?? "",
    askOn: st === "confirming" && !ranOut && !done,
    doneOn: done,
    ranOutOn: ranOut && !done,
    head: done ? tr("Order confirmed — pay by bank transfer") : ranOut ? tr("This checkout ran out") : tr("Confirm your order"),
    askTxt: tr("{show} · {tickets} · {total}. Press the button to keep them and see our bank details.", { show: show?.name ?? "", tickets: ticketsW(n(o["ticket_count"])), total: money(n(o["total"])) }),
    ranOutTxt: tr("The {n} minutes ran out before the order was confirmed, so the tickets went back on sale.", { n: w.settings.holdMinutes }),
    doneTxt: tr("Send {amount} by bank transfer with the reference below. Your tickets appear once we've seen the payment.", { amount: money(n(o["total"])) }),
    dueTxt: o["pay_by"] ? tr("Pay by {date}", { date: `${fD(o["pay_by"])}, ${fT(o["pay_by"])}` }) : "",
    busy: c.busy,
    press: () => void app.buyer.confirmByEmail(),
    bank: [
      { k: tr("Account name"), v: String(settings?.["bank_account_name"] ?? "") },
      { k: tr("Bank"), v: String(settings?.["bank_name"] ?? "") },
      { k: tr("Account number"), v: String(settings?.["bank_account_number"] ?? "") },
      { k: tr("Sort code or routing number"), v: String(settings?.["bank_routing"] ?? "") },
      { k: tr("Reference"), v: String(o["number"] ?? "") },
      { k: tr("Amount"), v: money(n(o["total"])) },
    ],
    seeWhatsOn: () => app.go("home"),
  };
}

// ── the account menu ──────────────────────────────────────────────────────

function acctVals(app: WaveApp): V {
  const me = app.signedIn();
  const item = (id: string, label: string, icon: string, go: () => void) => ({
    id,
    label,
    icon,
    go,
    style: `display:flex; align-items:center; gap:10px; min-height:40px; padding:0 10px; border-radius:10px; border:0; background:transparent; font-size:13.5px; font-weight:700; text-align:start; color:${id === "del" ? "var(--danger)" : "var(--fg)"};`,
  });
  return {
    name: me?.name ?? "",
    email: me?.email ?? "",
    items: [
      item("out", tr("Sign out"), "log-out", () => void app.buyer.signOut()),
      item("all", tr("Sign out on all devices"), "monitor-off", () => app.openSheet("outAll")),
      item("del", tr("Delete my details"), "user-x", () => app.openSheet("delAcct")),
    ],
  };
}

export function accountVals(app: WaveApp, w: World | null, _v: V): V {
  if (w === null) return { co: { tix: [], lines: [], steps: [], pays: [], orderQs: [] }, gw: { tickets: [], bank: [], dlCols: "" }, si: { boxes: [] }, mt: { groups: [], tabs: [], notices: [], waits: [] }, fr: {}, of: { qs: [] }, cf: { on: false, bank: [] }, dm: { on: false, tickets: [], dots: [] }, acct: { items: [] } };
  return {
    co: checkoutVals(app, w),
    gw: goingVals(app, w),
    si: signinVals(app),
    mt: ticketsVals(app, w),
    dm: dmVals(app, w),
    fr: friendVals(app, w),
    of: offerVals(app, w),
    cf: confirmVals(app, w),
    acct: acctVals(app),
  };
}

// ── the buyer's sheets ────────────────────────────────────────────────────

/** The order and ticket a ticket sheet is about. */
function ticketOf(app: WaveApp, sh: Record<string, unknown>): { order: Row | null; t: Row; show: Show } | null {
  const w = app.world();
  if (w === null) return null;
  const id = sh["ticket"] as Id | undefined;
  const orders = [...(app.buyer.mine()?.orders ?? []), ...(app.buyer.going() === undefined ? [] : [app.buyer.going()!])];
  for (const o of orders) {
    const t = o.tickets.find((x) => x.id === id);
    if (t !== undefined) {
      const show = w.byId.get(o.order["event_id"] as Id);
      return show === undefined ? null : { order: o.order, t, show };
    }
  }
  const held = app.buyer.mine()?.held.find((x) => x.id === id);
  if (held !== undefined) {
    const show = w.byId.get(held["event_id"] as Id);
    return show === undefined ? null : { order: null, t: held, show };
  }
  return null;
}

export function accountSheet(app: WaveApp, w: World, o: V & { list: unknown[]; btns: unknown[]; fields: unknown[] }, sh: Record<string, unknown>, kit: SheetKit): void {
  const { set, fld, P } = kit;
  const k = sh["kind"];
  const b = app.buyer;
  const port = app.ports.audience!;
  const anyErr = ((sh["err"] ?? {}) as Record<string, string | null>)["any"] ?? null;
  if (anyErr !== null) Object.assign(o, { noteOn: true, note: anyErr });
  if (k === "holdGone")
    Object.assign(o, {
      icon: "timer-off",
      tone: "warn",
      title: tr("We let those tickets go"),
      body: tr("Your {n} minutes ran out, so the tickets went back on sale for everyone. They may still be there.", { n: w.settings.holdMinutes }),
      btns: [P(tr("Check again"), () => b.checkAgain())],
    });
  if (k === "keepHold") {
    const co = app.state.co;
    const left = co?.heldUntil === null || co === null ? 0 : Math.max(0, co.heldUntil - app.now);
    const mmss = `${String(Math.floor(left / 60_000))}:${String(Math.floor((left % 60_000) / 1000)).padStart(2, "0")}`;
    Object.assign(o, {
      icon: "timer",
      title: tr("Keep holding your tickets?"),
      body: tr("They're held for you for another {time}. Come back to checkout from the event page before then.", { time: mmss }),
      btns: [
        P(tr("Keep them"), () => app.go("event", { evId: co?.evId ?? null })),
        P(tr("Let them go"), () => void b.letGo(), "g"),
      ],
    });
  }
  if (k === "outAll")
    Object.assign(o, {
      icon: "monitor-off",
      title: tr("Sign out on all devices?"),
      body: tr("You'll be signed out here and on every phone or computer where you signed in with your email. The links in your order emails still open your orders."),
      btns: [P(tr("Sign out everywhere"), () => void b.signOutEverywhere()), P(tr("Cancel"), () => app.closeSheet(), "g")],
    });
  if (k === "delAcct")
    Object.assign(o, {
      icon: "user-x",
      tone: "danger",
      title: tr("Delete my details?"),
      body: tr("Your sign-in and your name and email on the account are removed. Tickets you already have still work at the door, but the links in your emails stop opening your orders."),
      btns: [P(tr("Delete my details"), () => void b.forget(), "d"), P(tr("Keep them"), () => app.closeSheet(), "g")],
    });
  if (k === "delAuth")
    Object.assign(o, {
      icon: "shield-check",
      tone: "danger",
      title: tr("Delete my details"),
      body: tr("For your safety, sign in again to delete your details."),
      btns: [P(tr("Send me a link"), () => void b.stepUp()), P(tr("Cancel"), () => app.closeSheet(), "g")],
    });
  if (k === "whichTicket") {
    const g = b.going();
    const list = g === undefined ? [] : sendable(g);
    Object.assign(o, {
      icon: "forward",
      title: tr("Which ticket?"),
      listOn: true,
      list: list.map((t) => ({ id: t.id, label: `${String(t["holder_name"] ?? "")} · ${String(t["name"] ?? "")}`, icon: "ticket", go: () => set({ kind: "tSend", ticket: t.id, name: "", email: "", err: {} }) })),
    });
  }
  const c = ticketOf(app, sh);
  if (c === null) return;
  const { t, show, order } = c;
  const code = t["code"] === null || t["code"] === undefined ? "" : codeFace(String(t["code"]));
  const os = order === null ? "held" : String(order["status"]);
  const unpaidX = os === "awaiting_transfer" || os === "overdue";
  const paid = os === "paid";
  const holderName = String(t["holder_name"] ?? "");
  const sub = `${show.name}, ${fD(show.start)}${unpaidX || code === "" ? "" : ` · ${code}`}`;
  if (k === "tMenu") {
    const items: [string, string, string, () => void][] = [["nm", tr("Change the name"), "user-pen", () => set({ kind: "tName", name: holderName, err: {} })]];
    if (sh["held"] !== true) {
      if (w.settings.sendOn && !unpaidX && t["status"] === "valid") items.push(["sd", tr("Send to a friend"), "forward", () => set({ kind: "tSend", name: "", email: "", err: {} })]);
      if (paid) items.push(["rf", tr("Ask for a refund"), "undo-2", () => set({ kind: "tRefund" })]);
      else if (os === "door" && untouchedAtDoor(app, show, t)) items.push(["cx", tr("Cancel this ticket"), "circle-x", () => set({ kind: "tCancel" })]);
    }
    if (!unpaidX && code !== "")
      items.push(["pdf", tr("Download as PDF"), "file-down", () => {
        app.closeSheet();
        downloadTicket(app, w, show, String(order?.["number"] ?? ""), t, order === null ? tr("Valid") : ticketStatus(app, show, order, t).txt);
      }]);
    items.push(
      ["cal", tr("Add to calendar"), "calendar-plus", () => {
        app.closeSheet();
        app.ics(show);
      }],
      ["dir", tr("Get directions"), "navigation", () => set({ kind: "venue", sec: "getting" })],
    );
    Object.assign(o, {
      icon: "ticket",
      title: `${holderName} · ${String(t["name"] ?? "")}`,
      sub,
      listOn: true,
      list: items.map(([id, label, icon, go]) => ({ id, label, icon, go })),
    });
  }
  if (k === "tName")
    Object.assign(o, {
      icon: "user-pen",
      title: tr("Change the name"),
      sub: tr("The ticket keeps its code."),
      fields: [fld("tn-name", tr("Name on the ticket"), "name", "text", { ac: "name" })],
      submitLabel: tr("Save the name"),
      submit: (e?: { preventDefault: () => void }) => {
        e?.preventDefault();
        const name = String(sh["name"] ?? "").trim();
        if (name === "") return set({ err: { name: tr("Add a name") } });
        void b.act(() => port.nameTicket(t.id, name), tr("Name changed to {name}", { name }), "user-pen").then((ok) => ok && app.closeSheet());
      },
    });
  if (k === "tSend") {
    const doors = show.doors;
    const hours = w.settings.sendHours;
    const until = Math.min(app.now + hours * 3_600_000, doors);
    Object.assign(o, {
      icon: "forward",
      title: tr("Send to a friend"),
      sub,
      fields: [fld("ts-name", tr("Their name"), "name", "text"), fld("ts-email", tr("Their email"), "email", "email")],
      noteOn: true,
      note: tr("They get an email with a link to accept it. Until they do, this ticket still works and you can take it back. If they don't accept by {time}, it comes back to you. Once they accept, their ticket gets a new code and this one stops working.", {
        time: `${fD(until)}, ${fT(until)}`,
      }),
      submitLabel: tr("Send the ticket"),
      submit: (e?: { preventDefault: () => void }) => {
        e?.preventDefault();
        const name = String(sh["name"] ?? "").trim();
        const email = String(sh["email"] ?? "").trim();
        const er: Record<string, string> = {};
        if (name === "") er["name"] = tr("Add their name");
        if (!/^\S+@\S+\.\S+$/.test(email)) er["email"] = tr("Check the email address");
        if (Object.keys(er).length > 0) return set({ err: er });
        void b.act(() => port.sendTicket(t.id, email, name), tr("Offered to {name}", { name: first(name) }), "forward").then((ok) => ok && app.closeSheet());
      },
    });
  }
  if (k === "tRefund") {
    const r = show.refundUntil;
    const inWindow = r !== null && app.now < r;
    Object.assign(o, { icon: "undo-2", title: tr("Ask for a refund"), sub: `${show.name}, ${fD(show.start)}` });
    const friendBtns = w.settings.sendOn ? [P(tr("Send to a friend"), () => set({ kind: "tSend", name: "", email: "", err: {} })), P(tr("Close"), () => app.closeSheet(), "g")] : [P(tr("Close"), () => app.closeSheet(), "g")];
    if (r === null) Object.assign(o, { body: refundSentence(w, show), btns: friendBtns });
    else if (inWindow)
      Object.assign(o, {
        body:
          w.settings.refundPayback === ""
            ? tr("Refunds until {date} — the box office pays you back. This ticket stops working once you ask.", { date: fD(r) })
            : tr("Refunds until {date} — the box office pays you back {when}. This ticket stops working once you ask.", { date: fD(r), when: w.settings.refundPayback }),
        btns: [
          P(tr("Ask for a refund"), () => void b.act(() => port.askRefund(t.id), tr("Refund asked"), "undo-2").then((ok) => ok && app.closeSheet())),
          P(tr("Keep it"), () => app.closeSheet(), "g"),
        ],
      });
    else Object.assign(o, { body: `${tr("Refunds have closed for this show.")}${w.settings.sendOn ? ` ${tr("You can still send your ticket to a friend.")}` : ""}`, btns: friendBtns });
  }
  if (k === "tCancel")
    Object.assign(o, {
      icon: "circle-x",
      tone: "danger",
      title: tr("Cancel this ticket?"),
      sub: `${holderName} · ${show.name}, ${fD(show.start)}`,
      body: show.waitlistOn ? tr("You haven't paid for it, so there's nothing to pay back. Your place goes to the waitlist.") : tr("You haven't paid for it, so there's nothing to pay back. Your ticket goes back on sale."),
      btns: [
        P(tr("Cancel this ticket"), () => void b.act(() => port.cancelTicket(t.id, show.waitlistOn), tr("Ticket cancelled"), "circle-x").then((ok) => ok && app.closeSheet()), "d"),
        P(tr("Keep it"), () => app.closeSheet(), "g"),
      ],
    });
  void refusalWords;
}
