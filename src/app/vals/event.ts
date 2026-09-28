/**
 * A show's page (or the festival's), its ticket panel, and the festival's
 * timetable with My weekend. The panel's states and counts are Adminium's
 * availability; its total is Adminium's dry run of the order as chosen.
 */
import type { Id } from "../../data/wire.ts";
import { tr } from "../../i18n/tr.ts";
import { dur, fD, fT, fWdLong, money, places, sameDay, tickets } from "../fmt.ts";
import type { WaveApp } from "../wave.ts";
import type { Show, Type, World } from "../world.ts";
import { ageWords, evCard, paceOf, posterOf, reading, status, supportTxt, type Reading } from "./audience.ts";
import { S, type V } from "./base.ts";

const DAY = 86_400_000;

/** A workshop: a show whose tickets are places at a table, not a night out. */
export const isWorkshop = (show: Show): boolean => show.types.some((t) => t.kind === "place");

/** What the show's refund rule says, in one sentence. */
export function refundSentence(w: World, show: Show): string {
  if (show.refundText !== null) return show.refundText;
  const place = isWorkshop(show);
  const send = w.settings.sendOn;
  if (show.refundUntil === null) {
    const none = tr("{name} has no refunds.", { name: show.name });
    return send ? `${none} ${place ? tr("You can still send your place to a friend.") : tr("You can still send your ticket to a friend.")}` : none;
  }
  const until = tr("Refunds until {date}.", { date: fD(show.refundUntil) });
  return send ? `${until} ${place ? tr("After that, you can still send your place to a friend.") : tr("After that, you can still send your ticket to a friend.")}` : until;
}

/** Whether a bank transfer can still reach the venue before this show (the server's rule, printed). */
const transferOk = (app: WaveApp, w: World, show: Show): boolean => w.settings.transferOn && app.now < show.doors - w.settings.transferCutoffDays * DAY;

export function pays(app: WaveApp, w: World, show: Show, t: Type): ("door" | "transfer")[] {
  if (t.price === 0) return [];
  const out: ("door" | "transfer")[] = [];
  if (t.payTransfer && transferOk(app, w, show)) out.push("transfer");
  if (t.payDoor && w.settings.doorOn) out.push("door");
  return out;
}

function payTxt(p: ("door" | "transfer")[], price: number): string {
  if (price === 0) return tr("Just register");
  if (p.length === 2) return tr("Bank transfer or pay at the door");
  return p[0] === "transfer" ? tr("Bank transfer") : tr("Pay at the door");
}

function gaWords(show: Show): string {
  if (isWorkshop(show)) return tr("Unreserved seats");
  if (show.room?.note !== null && show.room?.note !== undefined && /seat/i.test(show.room.note)) return tr("General admission — standing, with a seated balcony");
  return tr("General admission");
}

function panelVals(app: WaveApp, w: World, r: Reading): V {
  const s = app.state;
  const n = app.now;
  const nar = app.narrow();
  const ev = r.show;
  const muted = ev.cancelled || r.past;
  const rows = ev.types.map((t, i) => {
    const k = `${String(ev.id)}:${String(t.id)}`;
    const q = s.sel[k] ?? 0;
    const st = r.states[i]!;
    const l = r.left?.get(t.id)?.left;
    const p = pays(app, w, ev, t);
    const noWay = t.price > 0 && p.length === 0 && st === "on";
    const low = st === "on" && typeof l === "number";
    let stateTxt = "";
    let stateStyle = "font-size:13px; font-weight:800; color:var(--fg-muted);";
    let note = "";
    let noteStyle = "font-size:12.5px; font-weight:700; color:var(--fg-subtle); line-height:1.45;";
    const info = "font-size:12.5px; font-weight:800; color:var(--info); line-height:1.45;";
    if (st === "soldout") {
      stateTxt = tr("Sold out");
      stateStyle = "font-size:13px; font-weight:800; color:var(--danger);";
    }
    if (st === "soon") {
      const opens = t.salesStart ?? ev.onSaleAt ?? n;
      noteStyle = info;
      if (t.unlocked !== null) note = tr("Unlocked with {code} · On sale {date} {time} · in {span}", { code: t.unlocked, date: fD(opens), time: fT(opens), span: dur(opens - n) });
      else {
        note = tr("On sale {date} {time}", { date: fD(opens), time: fT(opens) });
        stateTxt = tr("in {span}", { span: dur(opens - n) });
        stateStyle = "font-family:var(--mono); font-size:12.5px; font-weight:700; color:var(--info);";
      }
    }
    if (note === "" && t.admits.length > 1) note = t.admits.length === 2 ? tr("One ticket, in both days") : tr("One ticket, every day");
    if (st === "ended") {
      const closed = t.salesEnd ?? ev.start;
      note = t.payDoor ? tr("Sales closed at {time} — you can still pay at the door", { time: fT(closed) }) : tr("Sales closed at {time}", { time: fT(closed) });
      noteStyle = info;
      stateTxt = t.payDoor ? tr("At the door") : tr("Sales closed");
    }
    if (st === "stopped") {
      note = tr("{type} is no longer on sale.", { type: t.short });
      noteStyle = info;
      stateTxt = tr("Sales closed");
    }
    if (noWay) {
      note = tr("Sales closed online");
      noteStyle = info;
      stateTxt = tr("At the door");
    }
    const cap = Math.min(t.max, typeof l === "number" ? Math.max(l, 0) : t.max);
    return {
      id: t.id,
      name: t.name,
      desc: t.description ?? "",
      price: muted ? "" : t.price > 0 ? money(t.price) : tr("No charge"),
      pay: muted ? "" : payTxt(p, t.price),
      payOn: !muted,
      payIcon: t.price === 0 ? "pen-line" : p.length === 2 ? "landmark" : "door-open",
      lowOn: low,
      low: low ? tr("{n} left", { n: l }) : "",
      unlocked: t.unlocked !== null && st !== "soon",
      code: t.unlocked ?? "",
      noteOn: note !== "",
      note,
      noteStyle,
      stepOn: st === "on" && !noWay,
      stateOn: stateTxt !== "",
      stateTxt,
      stateStyle,
      remindOn: st === "soon",
      remind: () => app.openSheet("remind", { ev: ev.id, type: t.unlocked === null ? null : t.id, email: app.signedIn()?.email ?? "", done: false, err: null }),
      roll: [{ k: `q${String(q)}`, v: q }],
      qtyLabel: tr("How many {type} tickets", { type: t.short }),
      decLabel: tr("One fewer {type}", { type: t.short }),
      incLabel: tr("One more {type}", { type: t.short }),
      decOff: q <= 0,
      incOff: typeof l === "number" && q >= l,
      maxTxt: tr("Up to {n}", { n: cap }),
      dec: () => app.dec(ev, t.id),
      inc: () => app.inc(ev, t.id, t.max, l),
      limitOn: s.limitHit === k,
      limitTxt: tr("You can take up to {n} {type} tickets per order|You can take up to {n} {type} tickets per order", { n: t.max, type: t.short }),
    };
  });
  const count = ev.types.reduce((a, t) => a + (s.sel[`${String(ev.id)}:${String(t.id)}`] ?? 0), 0);
  const free = ev.types.length > 0 && ev.types.every((t) => t.price === 0);
  const quote = count > 0 ? app.quoteFor(ev) : null;
  const total = quote === null ? null : quote.total;
  const allSold = r.states.length > 0 && r.states.every((x) => x === "soldout");
  const allSoon = r.states.length > 0 && r.states.every((x) => x === "soon" || x === "soldout") && r.states.includes("soon");
  const wlOn = w.settings.waitlistOn && ev.waitlistOn;
  const mine = app.myWaitlist(ev.id);
  const offer = app.liveOffer(ev.id);
  let banner = "";
  let bIcon = "info";
  let bStyle = S.aInfo;
  let bColor = "var(--info)";
  if (ev.cancelled) {
    banner = tr("This show is cancelled. Tickets aren't on sale.");
    bIcon = "circle-x";
    bStyle = S.aDanger;
    bColor = "var(--danger)";
  } else if (r.past) {
    banner = tr("This one's happened. Tickets aren't on sale any more.");
    bIcon = "history";
  } else if (allSold) {
    banner = wlOn ? tr("Sold out. Seats that come back go to the waitlist first.") : tr("Sold out.");
    bIcon = "ban";
    bStyle = S.aDanger;
    bColor = "var(--danger)";
  } else if (allSoon) {
    const opens = Math.min(...ev.types.filter((t) => t.unlocked === null).map((t) => t.salesStart ?? ev.onSaleAt ?? Infinity));
    banner = tr("Public sale opens {date} {time} · in {span}.", { date: fD(opens), time: fT(opens), span: dur(opens - n) });
    bIcon = "clock";
  } else if (ev.was !== null) {
    banner = tr("Now on {date}. Tickets bought for {was} are valid.", { date: fD(ev.start), was: fD(ev.was) });
    bIcon = "calendar-clock";
    bStyle = S.aWarn;
    bColor = "var(--warn)";
  }
  const buyOn = !muted && rows.some((x) => x.stepOn);
  const pace = paceOf(app, r, 360);
  const codeOn = w.settings.codesOn && !muted && r.states.some((x) => x === "on" || x === "soon");
  const code = s.codes[String(ev.id)];
  const discOn = code?.kind === "discount" && quote !== null && quote.discount > 0;
  const lowestOn = ev.types.filter((_, i) => r.states[i] === "on");
  const fromTxt = ev.cancelled
    ? tr("Cancelled")
    : r.past
      ? tr("This one's happened")
      : allSold
        ? tr("Sold out")
        : free
          ? tr("No charge")
          : lowestOn.length > 0
            ? tr("from {price}", { price: money(Math.min(...lowestOn.map((t) => t.price))) })
            : "";
  const totalTxt = free ? tr("No charge") : total === null ? money(0) : money(total);
  const unit = isWorkshop(ev) || free ? places : tickets;
  return {
    title: ev.festival ? tr("Passes") : free ? tr("Register") : tr("Tickets"),
    rows,
    gaLabel: isWorkshop(ev) ? tr("Unreserved seats") : tr("General admission"),
    paceOn: !muted && pace.on,
    pace: pace.src,
    paceAlt: pace.alt,
    leftOn: !muted && pace.left !== null,
    leftTxt: pace.left === null ? "" : pace.left <= 0 ? tr("none left") : tr("{n} left", { n: pace.left }),
    offerOn: offer !== null && w.settings.waitlistOn && !r.past,
    offerTxt: offer === null ? "" : tr("{n} ticket is yours until|{n} tickets are yours until", { n: offer.qty }),
    offerUntil: offer === null ? "" : `${fD(offer.until)}, ${fT(offer.until)}`,
    claim: () => (offer === null ? undefined : app.openOffer(offer.orderId)),
    bannerOn: banner !== "",
    banner,
    bannerIcon: bIcon,
    bannerStyle: bStyle,
    bannerColor: bColor,
    waitOn: allSold && wlOn && mine === null && offer === null && !r.past,
    join: () => app.openSheet("waitlist", { ev: ev.id, n: 2, email: app.signedIn()?.email ?? "", done: false, err: null }),
    waitingOn: mine !== null && allSold && offer === null && w.settings.waitlistOn,
    waitingTxt: mine === null ? "" : tr("You're on the waitlist for {n} ticket. We'll email you if some come back.|You're on the waitlist for {n} tickets. We'll email you if some come back.", { n: mine.qty }),
    codeOn,
    codeClosed: !s.codeOpen,
    codeOpen: s.codeOpen,
    codePrompt: ev.codeTypes > 0 ? tr("Got a presale code?") : tr("Have a code?"),
    openCode: () => {
      app.setState({ codeOpen: true });
      setTimeout(() => document.getElementById("code-in")?.focus(), 40);
    },
    codeIn: s.codeIn,
    onCode: (e: { target: { value: string } }) => app.setState({ codeIn: e.target.value, codeErr: null }),
    codeErr: s.codeErr !== null,
    codeErrTxt:
      s.codeErr === "used" ? tr("That code has been used up") : s.codeErr === "busy" ? tr("Too many codes tried just now — wait a minute and try again.") : tr("That code isn't valid for this show"),
    codeFld: s.codeErr !== null ? S.fldErr : S.fld,
    applyCode: (e?: { preventDefault: () => void }) => {
      e?.preventDefault();
      void app.applyCode(ev);
    },
    discOn,
    discTxt: discOn ? code!.label : "",
    buyOn,
    total: totalTxt,
    contOff: count === 0 || (quote !== null && quote.pending),
    contLabel:
      count > 0
        ? free
          ? tr("Continue — {places}", { places: places(count) })
          : tr("Continue — {tickets} · {total}", { tickets: unit(count), total: totalTxt })
        : free
          ? tr("Choose how many")
          : tr("Choose your tickets"),
    cont: () => app.startCheckout(ev),
    fromTxt,
    barSub: count > 0 ? tr("{n} chosen · {total}", { n: count, total: totalTxt }) : allSoon ? banner : status(app, w, r).txt,
    barCta: count > 0 ? tr("Continue") : buyOn ? tr("Get tickets") : tr("See details"),
    noFees: tr("No booking fees. The price is the price."),
    localTime: tr("All times are {venue}'s local time.", { venue: w.settings.venueName }),
    openSheet: () => {
      app.remember();
      app.setState({ panelOpen: true });
    },
    close: () => {
      app.setState({ panelOpen: false });
      app.refocus();
    },
    wrap: nar
      ? s.panelOpen
        ? "position:absolute; inset-inline:0; inset-block-end:0; z-index:110; max-height:88%; overflow-y:auto;"
        : "display:none;"
      : "position:sticky; inset-block-start:84px; align-self:start;",
    box: nar
      ? "display:flex; flex-direction:column; gap:14px; padding:12px 18px 22px; background:var(--surface); border-radius:22px 22px 0 0; border-block-start:1px solid var(--border-strong); box-shadow:0 -20px 50px -20px rgba(0,0,0,.5);"
      : "display:flex; flex-direction:column; gap:14px; padding:20px; background:var(--surface); border:1px solid var(--border); border-radius:20px; box-shadow:0 24px 50px -30px rgba(10,10,25,.45);",
  };
}

function timetableVals(app: WaveApp, w: World, fest: Show): V {
  const s = app.state;
  const n = app.now;
  const px = 64;
  const timed = fest.acts.filter((a) => a.start !== null && a.end !== null);
  const localMins = (t: number) => {
    const hhmm = fT(t).replace(/[⁦⁩]/g, "");
    const [h, m] = hhmm.split(":").map(Number) as [number, number];
    return h * 60 + m;
  };
  const from = timed.length > 0 ? Math.floor(Math.min(...timed.map((a) => localMins(a.start!))) / 60) * 60 : 14 * 60;
  const to = timed.length > 0 ? Math.ceil(Math.max(...timed.map((a) => localMins(a.end!))) / 60) * 60 : 22 * 60;
  const H = ((to - from) / 60) * px;
  const actKey = (id: Id) => `${String(fest.id)}:${String(id)}`;
  const starred = timed.filter((a) => s.stars.includes(actKey(a.id)));
  const roomName = (id: Id | null) => w.rooms.find((r) => r.id === id)?.name ?? "";
  const clashOf = (a: (typeof timed)[number]) => starred.find((b) => b.id !== a.id && b.day === a.day && b.start! < a.end! && a.start! < b.end!);
  const block = (a: (typeof timed)[number]) => {
    const on = s.stars.includes(actKey(a.id));
    const c = on ? clashOf(a) : undefined;
    const top = ((localMins(a.start!) - from) / 60) * px;
    const h = Math.max(44, ((localMins(a.end!) - localMins(a.start!)) / 60) * px - 4);
    return {
      id: a.id,
      name: a.name,
      time: `${fT(a.start)}–${fT(a.end)}`,
      on,
      pressed: on ? "true" : "false",
      clash: c !== undefined,
      clashTxt: c === undefined ? "" : tr("Clashes with {act} in {room}", { act: c.name, room: roomName(c.roomId) }),
      starLabel: on
        ? tr("Unstar {act} — {room}, {day} {from} to {to}", { act: a.name, room: roomName(a.roomId), day: fD(a.start), from: fT(a.start), to: fT(a.end) })
        : tr("Star {act} — {room}, {day} {from} to {to}", { act: a.name, room: roomName(a.roomId), day: fD(a.start), from: fT(a.start), to: fT(a.end) }),
      star: () => app.toggleStar(actKey(a.id)),
      starStyle: `width:30px; height:30px; flex-shrink:0; border-radius:8px; border:0; display:flex; align-items:center; justify-content:center; background:transparent; color:${on ? "var(--accent)" : "var(--fg-subtle)"};${on ? "fill:currentColor;" : ""}`,
      style: `position:absolute; inset-inline:4px; inset-block-start:${String(top + 2)}px; height:${String(h)}px; overflow:hidden; display:flex; flex-direction:column; gap:4px; padding-block:7px; padding-inline:10px 6px; border-radius:11px; border:1px solid ${c !== undefined ? "var(--warn)" : on ? "var(--accent)" : "var(--border-strong)"}; background:${on ? "var(--accent-soft)" : "var(--surface)"};`,
    };
  };
  const dayNums = [...new Set(timed.map((a) => a.day))].sort();
  const dayAt = (d: number) => fest.days.find((x) => x.day === d)?.doors ?? fest.doors + (d - 1) * DAY;
  const cur = dayNums.includes(s.festDay) ? s.festDay : (dayNums[0] ?? 1);
  const days = dayNums.map((d) => ({
    id: d,
    label: fD(dayAt(d)),
    on: cur === d,
    pressed: cur === d ? "true" : "false",
    go: () => app.setState({ festDay: d }),
    style: `min-height:34px; padding:0 14px; border-radius:9px; border:0; cursor:pointer; font-family:var(--mono); font-size:12.5px; font-weight:700; background:${cur === d ? "var(--surface)" : "transparent"}; color:${cur === d ? "var(--fg)" : "var(--fg-muted)"}; box-shadow:${cur === d ? "0 1px 3px rgba(0,0,0,.12)" : "none"};`,
  }));
  const nowMins = localMins(n);
  const nowOn = sameDay(n, dayAt(cur)) && nowMins >= from && nowMins <= to;
  const hours = [];
  for (let h = from / 60; h <= to / 60; h += 1) {
    hours.push({ k: `${String(h).padStart(2, "0")}:00`, style: `position:absolute; inset-inline-start:0; inset-block-start:${String(((h * 60 - from) / 60) * px - 7)}px; font-family:var(--mono); font-size:11px; font-weight:600; color:var(--fg-subtle);` });
  }
  const roomIds = [...new Set(timed.map((a) => a.roomId))].filter((x): x is Id => x !== null);
  const columns = roomIds.map((id) => ({ id, name: roomName(id), acts: timed.filter((a) => a.day === cur && a.roomId === id).map(block) }));
  const mine = starred
    .slice()
    .sort((a, b) => a.start! - b.start!)
    .map((a) => {
      const c = clashOf(a);
      return {
        id: a.id,
        name: a.name,
        day: fD(a.start),
        time: `${fT(a.start)}–${fT(a.end)}`,
        room: roomName(a.roomId),
        clash: c !== undefined,
        clashTxt: c === undefined ? "" : tr("Clashes with {act} in {room}", { act: c.name, room: roomName(c.roomId) }),
        star: () => app.toggleStar(actKey(a.id)),
        unLabel: tr("Remove {act} from My weekend", { act: a.name }),
      };
    });
  return {
    on: w.settings.timetableOn && fest.setsPublished && timed.length > 0,
    days,
    h: `${String(H)}px`,
    hours,
    grid: `repeating-linear-gradient(to bottom, var(--border) 0 1px, transparent 1px ${String(px)}px), var(--surface-2)`,
    columns,
    main: columns[0]?.acts ?? [],
    annex: columns[1]?.acts ?? [],
    mainName: columns[0]?.name ?? "",
    annexName: columns[1]?.name ?? "",
    nowOn,
    nowTop: `${String(30 + ((nowMins - from) / 60) * px)}px`,
    nowTxt: fT(n),
    mine,
    mineEmpty: mine.length === 0,
    savedTxt: tr("Saved in this browser"),
    hint: tr("Tap the star on an act to add it to My weekend. All times are {venue}'s local time.", { venue: w.settings.venueName }),
  };
}

export function eventVals(app: WaveApp, w: World, show: Show | null, _v: V): V {
  if (show === null) return { pl: { on: false }, pn: { rows: [] }, tt: { on: false, days: [], hours: [], main: [], annex: [], mine: [], columns: [] }, venueFacts: [] };
  const n = app.now;
  const r = reading(app, show);
  const past = r.past;
  const p = posterOf(app, show);
  const workshop = isWorkshop(show);
  const facts = show.festival
    ? [
        ...show.days.map((d) => ({ k: fWdLong(d.doors), v: tr("Gates {time}", { time: fT(d.doors) }) })),
        ...lastEntryFacts(show),
      ]
    : workshop
      ? [
          { k: tr("Date"), v: fD(show.start) },
          { k: tr("Workshop"), v: `${fT(show.start)}–${fT(show.curfew)}` },
          { k: tr("Arrive from"), v: fT(show.doors) },
          { k: tr("Places"), v: String(show.types.reduce((a, t) => a + (t.capacity ?? 0), 0)) },
        ]
      : [
          { k: tr("Date"), v: fD(show.start) },
          { k: tr("Doors"), v: fT(show.doors) },
          { k: tr("On stage"), v: fT(show.start) },
          { k: tr("Curfew"), v: fT(show.curfew) },
        ];
  let bannerHead = "";
  let bannerTxt = "";
  let bIcon = "info";
  let bStyle = S.aInfo;
  let bColor = "var(--info)";
  if (show.was !== null && !show.cancelled) {
    bannerHead = tr("Moved to {date}.", { date: fD(show.start) });
    bannerTxt =
      show.refundUntil === null
        ? tr("Your tickets are valid for the new date.")
        : tr("Your tickets are valid for the new date — or ask for a refund until {date}.", { date: fD(show.refundUntil) });
    bIcon = "calendar-clock";
    bStyle = S.aWarn;
    bColor = "var(--warn)";
  } else if (show.cancelled) {
    bannerHead = tr("{name} is cancelled.", { name: show.name });
    bannerTxt =
      w.settings.refundPayback === ""
        ? tr("We're sorry. Everyone who paid gets their money back — the box office pays you back the way you paid.")
        : tr("We're sorry. Everyone who paid gets their money back — the box office pays you back the way you paid, {when}.", { when: w.settings.refundPayback });
    bIcon = "circle-x";
    bStyle = S.aDanger;
    bColor = "var(--danger)";
  } else if (past) {
    bannerHead = tr("This one's happened.");
    bannerTxt = tr("Thanks to everyone who came. Here are the next nights like it.");
    bIcon = "history";
  }
  const timed = show.acts.filter((a) => a.start !== null && a.end !== null);
  const setsOn = show.setsPublished && !past && timed.length > 0 && !show.festival;
  const t0 = timed[0]?.start ?? 0;
  const t1 = timed[timed.length - 1]?.end ?? 1;
  const setBars = timed.map((a, i) => ({
    name: a.name,
    short: a.name,
    time: `${fT(a.start)}–${fT(a.end)}`,
    style: `position:absolute; inset-block:4px; inset-inline-start:calc(${(((a.start! - t0) / (t1 - t0)) * 100).toFixed(2)}% + 2px); width:calc(${(((a.end! - a.start!) / (t1 - t0)) * 100).toFixed(2)}% - 4px); border-radius:9px; display:flex; align-items:center; padding-inline:10px; overflow:hidden; white-space:nowrap; font-size:12.5px; font-weight:800; background:${i === timed.length - 1 ? "var(--accent)" : "var(--surface-3)"}; color:${i === timed.length - 1 ? "var(--accent-fg)" : "var(--fg)"};`,
  }));
  const acts = show.acts.length > 0 ? show.acts.map((a) => a.name) : [show.name];
  const kindSame = w.shows
    .filter((e) => e.id !== show.id && !e.festival && !e.cancelled && n <= e.curfew && (!past || e.kind === show.kind))
    .sort((a, b) => a.start - b.start)
    .slice(0, 3);
  const good = [
    { k: tr("Bags"), v: show.bags },
    { k: tr("Re-entry"), v: show.reEntry },
    { k: tr("Refunds"), v: refundSentence(w, show) },
    { k: tr("Access"), v: show.room?.access ?? null },
  ].filter((x): x is { k: string; v: string } => x.v !== null && x.v !== "");
  const names = w.settings.accountsOn ? tr("Names can be changed from your order's link, or in My tickets.") : tr("Names can be changed from your order's link.");
  const faqs = [...w.settings.faq];
  faqs.splice(Math.min(1, faqs.length), 0, { q: tr("What if I can't make it?"), a: `${refundSentence(w, show)} ${names}` });
  const tt = show.festival ? timetableVals(app, w, show) : { on: false, days: [], hours: [], main: [], annex: [], mine: [], columns: [] };
  const first = show.days[0]?.doors ?? show.doors;
  const last = show.days[show.days.length - 1]?.doors ?? show.doors;
  const festLineup = show.festival && !(tt.on as boolean);
  return {
    pl: {
      on: app.state.scr === "event",
      isFest: show.festival,
      name: show.name,
      supportTxt: show.festival ? tr("{n} acts across both rooms, {from} – {to}", { n: show.acts.length, from: fD(first), to: fD(last) }) : supportTxt(show),
      supportOn: show.festival || show.support !== null,
      p,
      wash: p.wash,
      glow: p.glow,
      badge: (show.festival ? `${fD(first)} – ${fD(last)}` : fD(show.start)).toUpperCase(),
      facts,
      room: show.room?.name ?? "",
      ageLong: ageWords(show.age, true),
      ga: gaWords(show),
      bannerOn: bannerHead !== "",
      bannerHead,
      bannerTxt,
      bannerIcon: bIcon,
      bannerStyle: bStyle,
      bannerColor: bColor,
      share: () => void app.share(show),
      ics: () => app.ics(show),
      calOn: !past && !show.cancelled,
      about: show.about ?? "",
      aboutOn: show.about !== null,
      lineupOn: !show.festival || festLineup,
      setsOn,
      setsOff: !setsOn,
      setBars,
      acts,
      good,
      faq: faqs,
      otherTitle: past ? tr("Next nights like this") : tr("Other nights you might like"),
      others: kindSame.map((e) => evCard(app, w, e)),
      othersOn: kindSame.length > 0,
      barOn: app.narrow(),
    },
    pn: panelVals(app, w, r),
    tt,
    venueFacts: [
      ...w.settings.gettingThere.map((txt, i) => ({ icon: i === 0 ? "bus" : "map-pin", txt })),
      ...(show.room?.access === null || show.room?.access === undefined ? [] : [{ icon: "accessibility", txt: show.room.access }]),
    ],
    venueAddress: w.settings.address,
    directions: () => app.openSheet("venue", { sec: "getting" }),
  };
}

/** "Last entry 21:30": one line when every day matches, else one per day. */
function lastEntryFacts(show: Show): { k: string; v: string }[] {
  const times = show.days.map((d) => d.lastEntry).filter((t): t is number => t !== null);
  if (times.length === 0) return [];
  const same = times.every((t) => fT(t) === fT(times[0]));
  if (same) return [{ k: tr("Last entry"), v: fT(times[0]) }];
  return show.days.filter((d) => d.lastEntry !== null).map((d) => ({ k: tr("Last entry, {day}", { day: fWdLong(d.doors) }), v: fT(d.lastEntry) }));
}
