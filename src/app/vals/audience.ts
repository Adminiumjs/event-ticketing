/**
 * The audience site's values: the header and its nav, What's on (the hero,
 * the filters, the lists, the festival band, the calendar), the footer, the
 * page nobody found — and, from `event.ts` and `account.ts`, the show's page,
 * the ticket panel, checkout and the buyer's own pages.
 */
import type { TypeLeft } from "../../data/wire.ts";
import { tr } from "../../i18n/tr.ts";
import { poster, wave, type Poster } from "../art.ts";
import { day0, dayKey, dayOf, dur, fD, fMonth, fT, fWd, fMon, money, sameDay } from "../fmt.ts";
import type { WaveApp } from "../wave.ts";
import { typeState, type Show, type TypeState, type World } from "../world.ts";
import type { V } from "./base.ts";
import { accountVals } from "./account.ts";
import { eventVals } from "./event.ts";

const DAY = 86_400_000;

/** A show's chip on a card: its words, icon and tone. */
export interface Status {
  txt: string;
  k: "pos" | "warn" | "danger" | "info" | "accent" | "muted";
  icon: string;
}

export const stStyle = (k: Status["k"]): string => {
  const m = {
    pos: ["var(--pos)", "var(--pos-soft)"],
    warn: ["var(--warn)", "var(--warn-soft)"],
    danger: ["var(--danger)", "var(--danger-soft)"],
    info: ["var(--info)", "var(--info-soft)"],
    accent: ["var(--accent)", "var(--accent-soft)"],
    muted: ["var(--fg-muted)", "var(--surface-3)"],
  }[k];
  return `display:inline-flex; align-items:center; gap:5px; min-height:28px; padding:0 11px; border-radius:999px; background:${m[1]}; color:${m[0]}; font-size:12.5px; font-weight:800; white-space:nowrap; justify-self:start;`;
};

/** The age as the chip says it; `long` adds what the door will ask. */
export function ageWords(age: string, long = false): string {
  switch (age) {
    case "18":
      return long ? tr("18+ — bring photo ID") : tr("18+");
    case "16":
      return tr("16+");
    case "14_adult":
      return tr("14+ with an adult");
    default:
      return tr("All ages");
  }
}

/** What the page knows of a show at this moment: its types' states and counts, as Adminium answered. */
export interface Reading {
  show: Show;
  left: Map<number, TypeLeft> | undefined;
  states: TypeState[];
  past: boolean;
}

export function reading(app: WaveApp, show: Show): Reading {
  const left = app.left(show);
  const past = app.now > show.curfew;
  return { show, left, states: show.types.map((t) => typeState(show, t, left?.get(t.id), app.now)), past };
}

/** The lowest count Adminium said is left (it says one only when little is), or null. */
export function lowest(r: Reading): number | null {
  const counts = r.show.types.map((t, i) => (r.states[i] === "on" ? r.left?.get(t.id)?.left : undefined)).filter((n): n is number => typeof n === "number");
  return counts.length > 0 ? Math.min(...counts) : null;
}

export function status(_app: WaveApp, w: World, r: Reading): Status {
  const ev = r.show;
  if (ev.cancelled) return { txt: tr("Cancelled"), k: "danger", icon: "circle-x" };
  if (r.past) return { txt: tr("This one's happened"), k: "muted", icon: "history" };
  if (ev.was !== null) return { txt: tr("Postponed from {date}", { date: fD(ev.was) }), k: "warn", icon: "calendar-clock" };
  const st = r.states;
  if (st.length > 0 && st.every((x) => x === "soldout")) {
    return { txt: w.settings.waitlistOn && ev.waitlistOn ? tr("Sold out — join the waitlist") : tr("Sold out"), k: "danger", icon: "ban" };
  }
  if (st.length > 0 && st.every((x) => x === "soon" || x === "soldout")) {
    const opens = Math.min(...ev.types.filter((_, i) => st[i] === "soon").map((t) => t.salesStart ?? ev.onSaleAt ?? Infinity));
    return { txt: tr("On sale {date} {time}", { date: fD(opens), time: fT(opens) }), k: "info", icon: "clock" };
  }
  if (st.length > 0 && st.every((x) => x === "ended" || x === "stopped" || x === "soldout")) {
    // Pay at the door only when some type takes the door's money.
    return ev.types.some((t) => t.payDoor && t.price > 0) ? { txt: tr("Pay at the door"), k: "info", icon: "door-open" } : { txt: tr("Sales closed"), k: "muted", icon: "ban" };
  }
  if (ev.types.length > 0 && ev.types.every((t) => t.price === 0)) return { txt: tr("Just register"), k: "accent", icon: "pen-line" };
  const low = lowest(r);
  if (low !== null) return { txt: tr("{n} left", { n: low }), k: "warn", icon: "gauge" };
  return { txt: tr("On sale"), k: "pos", icon: "ticket" };
}

export function priceFrom(show: Show): string {
  const prices = show.types.map((t) => t.price);
  if (prices.length === 0 || prices.every((p) => p === 0)) return tr("No charge");
  return tr("from {price}", { price: money(Math.min(...prices.filter((p) => p > 0))) });
}

export function posterOf(app: WaveApp, show: Show): Poster {
  return poster(show.name, show.short, show.posterStyle, app.light(), show.posterHue);
}

/** The show's line of acts or words under its name. */
export const supportTxt = (show: Show): string => (show.support === null ? "" : tr("with {support}", { support: show.support }));

export function evCard(app: WaveApp, w: World, show: Show): V {
  const r = reading(app, show);
  const st = status(app, w, r);
  return {
    id: show.id,
    name: show.name,
    supportTxt: show.support ?? "",
    room: show.room?.name ?? "",
    age: ageWords(show.age),
    // A cancelled show's card names no price.
    price: show.cancelled ? "" : priceFrom(show),
    dow: fWd(show.start),
    dnum: dayOf(show.start)?.d.toString().padStart(2, "0") ?? "",
    mon: fMon(show.start),
    date: `${fD(show.start)} · ${fT(show.start)}`,
    p: posterOf(app, show),
    status: st.txt,
    statusIcon: st.icon,
    statusStyle: stStyle(st.k) + (app.narrow() ? "grid-column:3;" : ""),
    open: () => app.openShow(show.id),
    remind: () => app.openSheet("remind", { ev: show.id, email: "", done: false, err: null }),
  };
}

function matches(app: WaveApp, show: Show): boolean {
  const s = app.state;
  if (s.room !== "all" && show.room?.id !== s.room && show.room?.kind !== "both") return false;
  switch (s.filter) {
    case "all":
      return true;
    case "free":
      return show.types.length > 0 && show.types.every((t) => t.price === 0);
    case "allages":
      return show.age === "all";
    case "gig":
      return show.kind === "gig" || show.kind === "festival";
    default:
      return show.kind === s.filter;
  }
}

/** The next published festival still to come (the Festival tab and band open it). */
export function nextFestival(app: WaveApp, w: World): Show | null {
  return w.shows.find((e) => e.festival && !e.cancelled && app.now <= e.curfew) ?? null;
}

function homeVals(app: WaveApp, w: World): V {
  const s = app.state;
  const n = app.now;
  const nar = app.narrow();
  const live = w.shows.filter((e) => !e.festival && n <= e.curfew);
  const tonight = live.find((e) => sameDay(e.start, n) && !e.cancelled) ?? live.filter((e) => !e.cancelled && e.was === null)[0] ?? null;
  const out: V = {};
  if (tonight !== null) {
    const r = reading(app, tonight);
    const hp = posterOf(app, tonight);
    const doorsIn =
      n < tonight.doors
        ? sameDay(tonight.start, n)
          ? tr("Doors in {span}", { span: dur(tonight.doors - n) })
          : tr("In {span}", { span: dur(tonight.doors - n) })
        : n < tonight.curfew
          ? tr("Doors are open")
          : tr("Finished");
    const avail = tonight.types
      .map((t, i) => {
        const st = r.states[i];
        const l = r.left?.get(t.id)?.left;
        const low = st === "on" && typeof l === "number";
        const txt =
          st === "soldout" ? tr("sold out") : st === "soon" ? tr("on sale {date}", { date: fD(t.salesStart ?? tonight.onSaleAt) }) : st === "ended" ? tr("at the door") : low ? tr("{n} left", { n: l }) : tr("available");
        const col = st === "soldout" ? "var(--danger)" : low ? "var(--warn)" : "var(--fg)";
        return { id: t.id, name: t.short, txt, style: `color:${col}; font-weight:800; font-family:var(--mono);`, sold: st === "soldout" };
      })
      .sort((a, b) => Number(a.sold) - Number(b.sold));
    const pace = paceOf(app, r, 520);
    out["hero"] = {
      name: tonight.name,
      supportTxt: supportTxt(tonight),
      when: tr("{date} · Doors {doors} · on stage {start}", { date: fD(tonight.start), doors: fT(tonight.doors), start: fT(tonight.start) }),
      room: tonight.room?.name ?? "",
      age: ageWords(tonight.age),
      eyebrow: sameDay(tonight.start, n) ? tr("Tonight") : tr("Next up"),
      doorsIn,
      avail,
      paceOn: pace.on,
      pace: pace.src,
      paceAlt: pace.alt,
      p: hp,
      wash: hp.wash,
      dateShort: fD(tonight.start).toUpperCase(),
      posterLabel: tr("Poster for {name}", { name: tonight.name }),
      open: () => app.openShow(tonight.id),
      about: () => {
        app.openShow(tonight.id);
        setTimeout(() => {
          const h = document.querySelector<HTMLElement>("#about h2");
          if (h !== null) {
            h.setAttribute("tabindex", "-1");
            h.scrollIntoView({ block: "start" });
            h.focus({ preventScroll: true });
          }
        }, 80);
      },
    };
  }
  out["heroOn"] = tonight !== null;
  const pool = live.filter((e) => e.id !== tonight?.id && matches(app, e));
  const soonL = pool.filter((e) => {
    const r = reading(app, e);
    return r.states.length > 0 && r.states.every((x) => x === "soon");
  });
  // Just announced: published within the last 14 days, on sale, not "soon".
  const annL = pool.filter((e) => !soonL.includes(e) && e.publishedAt !== null && n - e.publishedAt <= 14 * DAY && n >= e.publishedAt);
  const rest = pool.filter((e) => !soonL.includes(e) && !annL.includes(e)).sort((a, b) => a.start - b.start);
  const cut = day0(n, 7);
  const week = rest.filter((e) => e.start < cut).map((e) => evCard(app, w, e));
  const coming = rest.filter((e) => e.start >= cut).map((e) => evCard(app, w, e));
  const fest = nextFestival(app, w);
  const festBand = fest !== null && matches(app, fest);
  const chip = (on: boolean) =>
    `display:inline-flex; align-items:center; min-height:36px; padding:0 14px; border-radius:999px; white-space:nowrap; font-size:13.5px; font-weight:700; border:1px solid ${on ? "var(--fg)" : "var(--border-strong)"}; background:${on ? "var(--fg)" : "var(--surface)"}; color:${on ? "var(--bg)" : "var(--fg-muted)"};`;
  const seg = (on: boolean) =>
    `display:inline-flex; align-items:center; gap:6px; min-height:32px; padding:0 12px; border-radius:9px; border:0; cursor:pointer; font-size:13px; font-weight:700; background:${on ? "var(--surface)" : "transparent"}; color:${on ? "var(--fg)" : "var(--fg-muted)"}; box-shadow:${on ? "0 1px 3px rgba(0,0,0,.12)" : "none"};`;
  const filters = (
    [
      ["all", tr("All")],
      ["gig", tr("Gigs")],
      ["club", tr("Club nights")],
      ["comedy", tr("Comedy")],
      ["talks", tr("Talks & workshops")],
      ["allages", tr("All ages")],
      ["free", tr("No charge")],
    ] as const
  ).map(([id, label]) => ({ id, label, on: s.filter === id, pressed: s.filter === id ? "true" : "false", style: chip(s.filter === id), go: () => app.setState({ filter: id }) }));
  const roomList = w.rooms.filter((r) => r.kind === "room");
  const rooms = [{ id: "all" as const, label: tr("All rooms") }, ...roomList.map((r) => ({ id: r.id, label: r.name }))].map(({ id, label }) => ({
    id,
    label,
    on: s.room === id,
    pressed: s.room === id ? "true" : "false",
    style: seg(s.room === id),
    go: () => app.setState({ room: id }),
  }));
  const views = (
    [
      ["list", tr("List"), "list"],
      ["cal", tr("Calendar"), "calendar-days"],
    ] as const
  ).map(([id, label, icon]) => ({ id, label, icon, on: s.view === id, pressed: s.view === id ? "true" : "false", style: seg(s.view === id), go: () => app.setState({ view: id }) }));

  // The calendar: the months that have shows (not past), today ringed, past days dimmed.
  const months: string[] = [];
  for (const e of w.shows) {
    if (n > e.curfew) continue;
    for (const t of [e.start, ...e.days.map((d) => d.doors)]) {
      const d = dayOf(t);
      if (d === null) continue;
      const key = dayKey(d).slice(0, 7);
      if (!months.includes(key)) months.push(key);
    }
  }
  months.sort();
  const m = s.calM !== null && months.includes(s.calM) ? s.calM : (months[0] ?? dayKey(dayOf(n)!).slice(0, 7));
  const mi = months.indexOf(m);
  const [yy, mm] = m.split("-").map(Number) as [number, number];
  const firstUtc = Date.UTC(yy, mm - 1, 1);
  const lead = (new Date(firstUtc).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  const today = dayOf(n)!;
  const cells: V[] = [];
  for (let i = 0; i < lead; i += 1) cells.push({ k: `b${String(i)}`, num: "", evs: [], off: true, blank: true, label: "", style: `min-height:${nar ? "54px" : "92px"}; border:0; background:transparent;`, open: null });
  for (let d = 1; d <= days; d += 1) {
    const key = `${m}-${String(d).padStart(2, "0")}`;
    const evs = w.shows.filter((e) => matches(app, e) && (e.days.length > 0 ? e.days.some((x) => dayKey(dayOf(x.doors)!) === key) : dayKey(dayOf(e.start)!) === key));
    const past = key < dayKey(today);
    const isToday = key === dayKey(today);
    const at = Date.UTC(yy, mm - 1, d, 12);
    cells.push({
      k: `d${String(d)}`,
      num: d,
      off: evs.length === 0,
      blank: false,
      today: isToday,
      label: `${fD(at)}${evs.length > 0 ? `: ${evs.map((e) => e.name).join(", ")}` : ""}`,
      evs: evs.map((e) => ({ id: e.id, name: e.short, dot: posterOf(app, e).dot })),
      open: evs.length > 1 ? () => app.openSheet("dayPick", { day: at, evs: evs.map((e) => e.id) }) : evs.length === 1 ? () => app.openShow(evs[0]!.id) : null,
      style: `display:flex; flex-direction:column; align-items:flex-start; gap:6px; min-height:${nar ? "54px" : "92px"}; padding:8px; border-radius:12px; text-align:start; cursor:${evs.length > 0 ? "pointer" : "default"}; color:${past ? "var(--fg-subtle)" : "var(--fg)"}; border:${isToday ? "2px solid var(--accent)" : "1px solid var(--border)"}; background:${evs.length > 0 ? "var(--surface)" : "transparent"};`,
    });
  }
  const heads = [1, 2, 3, 4, 5, 6, 0].map((wd) => fWd(Date.UTC(2026, 5, 7 + wd, 12)));
  // One tab stop in the grid: today, else the first day with a show, else the first day.
  const days1 = cells.filter((c) => c["blank"] !== true);
  const stop = days1.find((c) => c["today"] === true) ?? days1.find((c) => c["off"] !== true) ?? days1[0];
  for (const c of days1) c["tab"] = c === stop ? 0 : -1;
  const weeks: V[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push({ k: `w${String(i / 7)}`, cells: cells.slice(i, i + 7) });
  const cal = {
    weeks,
    title: fMonth(Date.UTC(yy, mm - 1, 15, 12)),
    heads,
    cells,
    prevOff: mi <= 0,
    nextOff: mi >= months.length - 1,
    prev: () => app.setState({ calM: months[Math.max(0, mi - 1)] ?? m }),
    next: () => app.setState({ calM: months[Math.min(months.length - 1, mi + 1)] ?? m }),
  };
  const soon = soonL.map((e) => {
    const c = evCard(app, w, e);
    const opens = Math.min(...e.types.map((t) => t.salesStart ?? e.onSaleAt ?? Infinity));
    c["countdown"] = tr("in {span}", { span: dur(opens - n) });
    return c;
  });
  const fp = fest === null ? null : posterOf(app, fest);
  out["fest"] = fest === null ? { p: fp } : festBandVals(fest, fp!);
  return Object.assign(out, {
    week,
    coming,
    soon,
    announced: annL.map((e) => evCard(app, w, e)),
    festBand,
    filters,
    rooms,
    views,
    listView: s.view === "list",
    calView: s.view === "cal",
    cal,
    emptyList: week.length === 0 && coming.length === 0 && soonL.length === 0 && annL.length === 0 && !festBand,
    weekRange: `${fD(n)} – ${fD(cut - DAY)}`,
    localTime: tr("All times are {venue}'s local time", { venue: w.settings.venueName }),
    clearFilters: () => app.setState({ filter: "all", room: "all" }),
    goFest: () => (fest === null ? undefined : app.openShow(fest.id)),
    festCta: w.settings.timetableOn && fest?.setsPublished === true ? tr("See the timetable") : tr("See the passes"),
  });
}

/** The festival band: its dates, rooms, acts and the passes' prices, from its own rows. */
function festBandVals(fest: Show, p: Poster): V {
  const first = fest.days[0]?.doors ?? fest.doors;
  const last = fest.days[fest.days.length - 1]?.doors ?? fest.doors;
  const passes = fest.types.filter((t) => t.admits.length > 1).map((t) => t.price);
  const dayTypes = fest.types.filter((t) => t.admits.length === 1).map((t) => t.price);
  const bits = [tr("{n} acts across two rooms", { n: fest.acts.length })];
  if (passes.length > 0) bits.push(tr("Weekend pass {price}", { price: money(Math.min(...passes)) }));
  if (dayTypes.length > 0) bits.push(tr("Day tickets {price}", { price: money(Math.min(...dayTypes)) }));
  return {
    p,
    name: fest.name,
    eyebrow: tr("Festival · {from} – {to} · both rooms", { from: fD(first), to: fD(last) }),
    line: bits.join(" · "),
  };
}

export function paceOf(app: WaveApp, r: Reading, width: number): { on: boolean; src: string; alt: string; left: number | null } {
  // Adminium says a count only when little is left: the line is drawn only then (or flat, when sold out).
  const onTypes = r.show.types.filter((_, i) => r.states[i] === "on");
  const counts = onTypes.map((t) => r.left?.get(t.id)?.left);
  const all = counts.length > 0 && counts.every((c) => typeof c === "number");
  const soldOut = r.states.length > 0 && r.states.every((x) => x === "soldout");
  const accent = app.light() ? "#a21caf" : "#e08bea";
  if (soldOut) return { on: true, src: wave(width, 24, () => 0.05, r.show.id, accent, 1.6), alt: tr("Sold out: the line is flat."), left: 0 };
  if (!all) return { on: false, src: "", alt: "", left: null };
  const left = (counts as number[]).reduce((a, b) => a + b, 0);
  const cap = onTypes.reduce((a, t) => a + (t.capacity ?? 0), 0);
  const fr = cap > 0 ? left / cap : 0.1;
  return {
    on: true,
    src: wave(width, 24, () => Math.max(0.05, Math.min(1, fr * 2.2)), r.show.id, accent, 1.6),
    alt: cap > 0 ? tr("{pct}% of tickets left", { pct: Math.round(fr * 100) }) : tr("{n} left", { n: left }),
    left,
  };
}

/** Every nested bag the audience's screens read, closed: what they draw while nothing has answered yet. */
const CLOSED: V = {
  hero: { avail: [], p: {} },
  heroOn: false,
  pl: { on: false, facts: [], good: [], faq: [], acts: [], setBars: [], others: [], p: {} },
  pn: { rows: [] },
  tt: { on: false, days: [], hours: [], main: [], annex: [], mine: [], columns: [] },
  cal: { heads: [], cells: [] },
  fest: { p: {} },
  filters: [],
  rooms: [],
  views: [],
  week: [],
  coming: [],
  soon: [],
  announced: [],
  venueFacts: [],
};

export function audienceVals(app: WaveApp, v: V): V {
  const s = app.state;
  const w = app.world();
  const out: V = { ...CLOSED, ...accountVals(app, w, v) };
  const scr: Record<string, boolean> = {};
  for (const k of ["home", "event", "festival", "checkout", "going", "signin", "tickets", "friend", "offer", "confirm", "404"]) scr[k] = false;
  const fest = w === null ? null : nextFestival(app, w);
  const show = w === null ? null : s.evId !== null ? (w.byId.get(s.evId) ?? null) : s.pendingSlug !== null ? (w.bySlug.get(s.pendingSlug) ?? null) : null;
  if (w !== null && !(v["loading"] as boolean)) {
    if (s.scr === "event") {
      if (show === null) scr["404"] = true;
      else if (show.festival) scr["festival"] = true;
      else scr["event"] = true;
    } else if ((s.scr === "signin" || s.scr === "tickets") && !w.settings.accountsOn) scr["404"] = true;
    else scr[s.scr] = true;
  }
  out["scr"] = scr;
  const accountsOn = w?.settings.accountsOn ?? false;
  const cur = s.scr === "event" ? (show?.festival === true ? "festival" : "home") : s.scr;
  const navDef: [string, string, string, () => void][] = [["home", tr("What's on"), "calendar-days", () => app.go("home")]];
  if (fest !== null) navDef.push(["festival", tr("Festival"), "tent", () => app.openShow(fest.id)]);
  if (accountsOn) navDef.push(["tickets", tr("My tickets"), "wallet", () => app.goTickets()]);
  out["nav"] = navDef.map(([id, label, icon, go]) => ({
    id,
    label,
    icon,
    cur: cur === id ? "page" : undefined,
    go,
    style: `height:38px; padding:0 12px; border:0; border-radius:10px; font-size:14px; font-weight:700; background:${cur === id ? "var(--surface-2)" : "transparent"}; color:${cur === id ? "var(--fg)" : "var(--fg-muted)"};`,
    tabStyle: `display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; border:0; background:transparent; cursor:pointer; font-size:11px; font-weight:800; color:${cur === id ? "var(--accent)" : "var(--fg-subtle)"};`,
  }));
  out["navCols"] = `repeat(${String(navDef.length)},1fr)`;
  out["goHome"] = () => app.go("home");
  const signed = app.signedIn();
  out["showSignIn"] = accountsOn && signed === null;
  out["signedIn"] = signed !== null;
  out["signInLabel"] = tr("Sign in");
  out["goSignIn"] = () => app.goSignIn();
  out["acctOpen"] = s.acctOpen;
  out["initials"] = signed === null ? "" : (v["initialsOf"] as (x: string) => string)(signed.name ?? signed.email);
  out["avatarStyle"] = `width:36px; height:36px; border-radius:50%; border:0; background:${signed === null ? "var(--surface-3)" : (v["avatarOf"] as (x: string) => string)(signed.email)}; color:var(--fg); font-size:12.5px; font-weight:800; display:flex; align-items:center; justify-content:center;`;
  out["toggleAcct"] = () => {
    app.remember();
    app.setState({ acctOpen: !s.acctOpen });
  };
  // The footer and the venue sheet.
  out["venueGetting"] = () => app.openSheet("venue", { sec: "getting" });
  out["venueAccess"] = () => app.openSheet("venue", { sec: "access" });
  out["venuePolicies"] = () => app.openSheet("venue", { sec: "policies" });
  out["venueName"] = w?.settings.venueName ?? "";
  out["venueAddress"] = w?.settings.address ?? "";
  out["venueRooms"] = (w?.rooms ?? []).filter((r) => r.kind === "room").map((r) => r.name).join(" · ");
  out["contactEmail"] = w?.settings.contactEmail ?? "";
  out["contactHref"] = `mailto:${w?.settings.contactEmail ?? ""}`;
  out["copyright"] = `© ${String(dayOf(app.now)?.y ?? "")} ${w?.settings.venueName ?? ""}`;
  // The page nobody found.
  out["nf"] = {
    on: scr["404"],
    code: "404",
    head: tr("This page doesn't exist"),
    txt: tr("The link might be old, or mistyped."),
  };
  if (w === null) return out;
  Object.assign(out, homeVals(app, w));
  Object.assign(out, eventVals(app, w, show, v));
  return out;
}

