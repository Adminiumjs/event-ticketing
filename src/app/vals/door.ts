/**
 * The door's values: its header (the show day, who is in of how many, this
 * phone's door, the clock), the show picker, before check-in opens and after
 * it closes, the scan pad and Find, Last scans, the guest list, the door's
 * sales, the verdict over it all, and the signal gone. Every count is
 * Adminium's, every verdict Adminium's answer to the check-in.
 */
import type { Id, Row } from "../../data/wire.ts";
import { tr } from "../../i18n/tr.ts";
import { LIVE, LIVE_TICKET, plural } from "../box.ts";
import { doorOf, looksLikeCode, segs, typedCode, type Door, type Seg, type Tonight } from "../door.ts";
import { dur, fD, fT, money, ms, strip } from "../fmt.ts";
import type { WaveApp } from "../wave.ts";
import { pill } from "./box.ts";
import type { V } from "./base.ts";

const CHIP_ON = "display:inline-flex; align-items:center; min-height:34px; padding:0 12px; border-radius:999px; border:1px solid var(--fg); background:var(--fg); color:var(--bg); font-size:12.5px; font-weight:800; white-space:nowrap; cursor:pointer;";
const CHIP = "display:inline-flex; align-items:center; min-height:34px; padding:0 12px; border-radius:999px; border:1px solid var(--border-strong); background:var(--surface); color:var(--fg-muted); font-size:12.5px; font-weight:800; white-space:nowrap; cursor:pointer;";
const CHIP_OFF = "display:inline-flex; align-items:center; min-height:34px; padding:0 12px; border-radius:999px; border:1px dashed var(--border-strong); background:transparent; color:var(--fg-subtle); font-size:12.5px; font-weight:700; white-space:nowrap; cursor:not-allowed;";

/** The weekday of a day, in full ("Sunday"). */
const weekday = (app: WaveApp, t: number): string => new Intl.DateTimeFormat(app.state.lang, { weekday: "long", timeZone: app.zone }).format(t);
/** "Day 2 · Sunday" */
const dayLabel = (app: WaveApp, n: number, t: number): string => tr("Day {n} · {weekday}", { n, weekday: weekday(app, t) });

export function doorVals(app: WaveApp, nar: boolean): V {
  const door = doorOf(app);
  const box = door.box;
  const s = door.s;
  const w = box.world();
  const light = app.light();
  const me = box.me();
  const person = me?.name ?? "";
  const dev = door.device();
  const devName = dev === null ? tr("Which door?") : String(dev["name"] ?? "");
  const online = door.online();
  const t = door.chosen();
  const next = door.next();
  const outer = nar ? "height:100%; display:flex;" : "height:100%; display:flex; justify-content:center; align-items:stretch; padding:20px; background:var(--surface-2);";
  const col = nar
    ? "position:relative; flex:1; display:flex; flex-direction:column; background:var(--bg); overflow:hidden;"
    : "position:relative; width:390px; max-width:100%; display:flex; flex-direction:column; background:var(--bg); border-radius:30px; border:1px solid var(--border-strong); overflow:hidden; box-shadow:0 30px 70px -30px rgba(0,0,0,.5);";
  const clock = `${strip(fT(app.now))}:${String(new Date(app.now).getUTCSeconds()).padStart(2, "0")}`;
  const queued = s.queue.filter((q) => q.kind === "in").length;
  const base: V = {
    outer,
    col,
    device: tr("{door} · {person}", { door: devName, person }),
    deviceLabel: tr("{door} · {person} — which door this phone is", { door: devName, person }),
    deviceGo: () => app.openSheet("drDevice", {}),
    dot: online ? "var(--pos)" : "var(--warn)",
    dotCls: online ? "" : "wv-pulse",
    clock,
    offOn: !online,
    offTxt: segs("Offline — {n} check-in will sync|Offline — {n} check-ins will sync", { n: String(queued) }, { n: queued }),
    clashOn: s.clash.length > 0,
    clash: s.clash,
    clearClash: () => door.set({ clash: [] }),
    tabs: [],
    shows: [],
    nums: [],
    checks: [],
    res: [],
    recent: [],
    guests: [],
    sellTypes: [],
    v: {},
    vOn: false,
  };
  if (w === null) return { ...base, title: "", count: "", loading: true };
  // A phone at a venue with more than one door says which it is, once.
  if (door.needsDevice() && app.state.sheet === null && !door.askedDevice) {
    door.askedDevice = true;
    setTimeout(() => app.openSheet("drDevice", {}), 0);
  }

  // The picker: tonight's show days (the one open first), then what is next, greyed with its date.
  const all = door.tonight();
  const shows: V[] = all.map((x) => {
    const on = t !== null && x.day.id === t.day.id;
    const label = x.show.days.length > 1 ? `${dayLabel(app, x.day.day, x.day.doors)} · ${strip(fD(x.day.doors))}` : tr("Tonight: {show} · {room}", { show: x.show.name, room: x.show.room?.name ?? "" });
    return { id: `day-${String(x.day.id)}`, label, on, off: false, go: () => door.pick(x.day.id), style: on ? CHIP_ON : CHIP };
  });
  // A festival's other days: greyed with their dates — the door runs the day it is.
  if (t !== null && t.show.days.length > 1) {
    for (const d of t.show.days) {
      if (all.some((x) => x.day.id === d.id)) continue;
      shows.push({ id: `day-${String(d.id)}`, label: `${dayLabel(app, d.day, d.doors)} · ${strip(fD(d.doors))}`, on: false, off: true, go: () => undefined, style: CHIP_OFF });
    }
  }
  if (next !== null && !(t !== null && next.show.id === t.show.id)) {
    shows.push({ id: "next", label: [next.show.name, next.show.room?.name ?? "", strip(fD(next.day.doors))].filter((x) => x !== "").join(" · "), on: false, off: true, go: () => undefined, style: CHIP_OFF });
  }
  base["shows"] = shows;

  if (t === null) {
    return { ...base, title: tr("Nothing on tonight"), count: "", noShow: true, before: false, open: false };
  }
  const show = t.show;
  const fest = show.days.length > 1;
  const phase = door.phase(t);
  const admitsToday = fest ? [{ column: `admits_day${String(t.day.day)}`, eq: true }] : [];
  const liveWhere = [
    { column: "event_id", eq: show.id },
    { column: "status", in: LIVE_TICKET },
    { column: "order_status", in: LIVE },
    ...admitsToday,
  ];
  const ticketsToday = online ? box.count("tickets", liveWhere) : undefined;
  const guestRows = show.guestPlaces > 0 || fest === false ? (box.list("guest_list", { where: [{ column: "event_id", eq: show.id }], sort: [{ column: "id" }], limit: 500 })?.rows ?? []) : [];
  const gPeople = guestRows.reduce((a, g) => a + Number(g["people"] ?? 1), 0);
  const gIn = guestRows.reduce((a, g) => a + door.arrivedOf(g), 0);
  const list = door.list(t);
  const kept = !online && list !== undefined;
  const inToday = kept ? list.checkIns.length + s.queue.filter((q) => q.kind === "in" && q.dayId === t.day.id).length : (box.count("check_ins", [{ column: "event_day_id", eq: t.day.id }]) ?? 0);
  const ofToday = ticketsToday ?? (kept ? list.tickets.filter((x) => LIVE_TICKET.includes(String(x["status"])) && LIVE.includes(String(x["order_status"])) && (!fest || x[`admits_day${String(t.day.day)}`] === true)).length : 0);
  const title = fest ? `${show.name} · ${dayLabel(app, t.day.day, t.day.doors)}` : show.name;

  // The numbers before check-in opens (and after it closes).
  const byKind = (kind: string) => show.types.filter((x) => x.kind === kind);
  const kindCount = (kind: string) =>
    byKind(kind).length === 0
      ? null
      : box.count("tickets", [
          { column: "event_id", eq: show.id },
          { column: "ticket_type_id", in: byKind(kind).map((x) => x.id) },
          { column: "status", in: LIVE_TICKET },
          { column: "order_status", in: LIVE },
          ...admitsToday,
        ]);
  const nums: V[] = [
    { k: fest ? tr("Tickets for today") : tr("Tickets"), v: String(ofToday) },
    { k: tr("Pay at the door"), v: money(show.money.owedDoor) },
  ];
  if (guestRows.length > 0) nums.push({ k: tr("Guest list"), v: `${String(guestRows.length)} · ${plural(gPeople, "{n} person", "{n} people")}` });
  if (fest) {
    const passes = kindCount("pass");
    const days = kindCount("day");
    if (passes !== null) nums.push({ k: tr("Weekend passes"), v: String(passes ?? 0) });
    if (days !== null) nums.push({ k: tr("Day tickets"), v: String(days ?? 0) });
  } else {
    const early = kindCount("early");
    if (early !== null) nums.push({ k: byKind("early")[0]!.short, v: String(early ?? 0) });
  }

  // "Before you open": this phone's own ticks.
  const other = door.devices().find((d) => d.id !== dev?.id);
  const tick = (on: boolean) =>
    `width:32px; height:32px; flex-shrink:0; border-radius:9px; display:flex; align-items:center; justify-content:center; border:${on ? "0" : "2px solid var(--border-strong)"}; background:${on ? "var(--pos)" : "transparent"}; color:${light ? "#fff" : "#0f0f14"};`;
  const checks = [
    ["bright", tr("Screens bright")],
    ...(other === undefined ? [] : [["second", tr("Second device signed in ({door})", { door: String(other["name"] ?? "") })]]),
  ].map(([id, label]) => ({ id: id!, label: label!, on: s.chk[id!] === true, box: tick(s.chk[id!] === true), go: () => door.set({ chk: { ...s.chk, [id!]: s.chk[id!] !== true } }) }));

  const ended = app.now >= t.ends;
  const endTxt = ended ? box.takings(show) : tr("The door's takings show here after the show.");

  // The tabs: scan, the guest list (a show with guests), sell.
  const tabDefs: [string, string][] = [["scan", tr("Scan")], ...(guestRows.length > 0 ? ([["guests", tr("Guest list")]] as [string, string][]) : []), ["sell", tr("Sell")]];
  const tab = tabDefs.some(([id]) => id === s.tab) ? s.tab : "scan";
  const tabs = tabDefs.map(([id, label]) => {
    const on = tab === id;
    return {
      id: `dr-tab-${id}`,
      panel: on ? `dr-panel-${id}` : undefined,
      label,
      on,
      tabIndex: on ? 0 : -1,
      go: () => door.set({ tab: id as "scan" | "guests" | "sell" }),
      style: `min-height:52px; border:0; border-block-end:3px solid ${on ? "var(--accent)" : "transparent"}; background:transparent; cursor:pointer; font-size:15px; font-weight:800; color:${on ? "var(--fg)" : "var(--fg-muted)"};`,
    };
  });

  // Find: tonight's tickets by name, code or the friend it was offered to; then the guest list.
  const q = s.q.trim();
  let res: V[] = [];
  const findOn = q.length >= 2;
  if (findOn) res = found(app, door, t, q, guestRows, list, online);

  // Last scans: this phone's, newest first.
  const nowWall = Date.now();
  const recent = s.recent.map((r) => ({
    id: r.key + String(r.made),
    name: r.name,
    type: r.undone && r.paid !== null ? tr("Paid {amount} · not in", { amount: money(r.paid.amount) }) : r.paid !== null ? (r.paid.method === "card" ? tr("{type} · paid {amount} by card", { type: r.type, amount: money(r.paid.amount) }) : tr("{type} · paid {amount} in cash", { type: r.type, amount: money(r.paid.amount) })) : r.type,
    at: strip(fT(r.at)),
    undoOn: !r.undone && nowWall - r.made < 60_000,
    undo: () => void door.undo(r.key),
    undoLabel: tr("Undo {name}'s check-in", { name: r.name }),
  }));
  // After a reload: this door's check-ins of tonight from Adminium, when this phone has none of its own yet.
  if (recent.length === 0 && dev !== null && online) {
    const mine = box.list("check_ins", { where: [{ column: "event_day_id", eq: t.day.id }, { column: "device_id", eq: dev.id }], sort: [{ column: "scanned_at", desc: true }], limit: 8 })?.rows ?? [];
    const ids = mine.map((c) => c["ticket_id"] as Id);
    const tk = ids.length === 0 ? [] : (box.list("tickets", { where: [{ column: "id", in: [...ids].sort((a, b) => a - b) }], limit: 8 })?.rows ?? []);
    for (const c of mine) {
      const x = tk.find((y) => y.id === c["ticket_id"]);
      if (x === undefined) continue;
      recent.push({ id: `c${String(c.id)}`, name: String(x["holder_name"] ?? "") || tr("Door sale"), type: door.typeName(show, x), at: strip(fT(c["scanned_at"])), undoOn: false, undo: () => undefined, undoLabel: "" });
    }
  }

  // The guest list, each party ticked in person by person.
  const guests = guestRows.map((g) => {
    const tot = Number(g["people"] ?? 1);
    const k = door.arrivedOf(g);
    const plus = Number(g["plus"] ?? 0);
    const sub = [String(g["on_behalf"] ?? ""), String(g["note"] ?? "")].filter((x) => x !== "" && x !== "null");
    if (k > 0) sub.push(tot > 1 ? tr("{n} of {total} in", { n: k, total: tot }) : tr("in {time}", { time: strip(fT(g["in_at"])) }));
    return {
      id: `g${String(g.id)}`,
      name: String(g["name"] ?? ""),
      plus: plus > 0 ? `+${String(plus)}` : "",
      sub: sub.join(" · "),
      on: k >= tot ? true : k > 0 ? "mixed" : false,
      off: !online,
      box: tick(k >= tot),
      mark: k > 0,
      go: () => {
        if (online) void door.tickGuest(g);
      },
    };
  });
  const namesIn = guestRows.filter((g) => door.arrivedOf(g) > 0).length;
  const gTxt = `${tr("{n} of {total} names in|{n} of {total} names in", { n: namesIn, total: guestRows.length })} · ${tr("{n} of {total} person|{n} of {total} people", { n: gIn, total: gPeople })}`;

  // Sell: the show's types (a festival's, those that let in today) with what is left for the box office.
  const sold = box.sold(show);
  const types = show.types
    .filter((x) => !fest || x.admits.includes(t.day.day))
    .map((x) => ({ x, left: Math.max(0, sold?.byType.get(x.id)?.left ?? 0) }));
  const cur = types.find((y) => y.x.id === s.sellType && y.left > 0) ?? types.find((y) => y.left > 0) ?? types[0];
  const maxQ = cur === undefined ? 0 : Math.max(0, Math.min(cur.left, cur.x.max > 0 ? cur.x.max : cur.left));
  const qn = Math.max(0, Math.min(s.sellQ, maxQ));
  const quote =
    cur === undefined || qn === 0 || !online
      ? undefined
      : app.get(`box:dquote:${String(show.id)}:${String(cur.x.id)}:${String(qn)}`, () =>
          box.port.quote({ values: { event_id: show.id, buyer_name: tr("Door sale"), channel: "door" }, tickets: Array.from({ length: qn }, () => ({ ticket_type_id: cur.x.id, holder_name: null })) }),
        );
  const total = quote === undefined ? (cur === undefined ? 0 : cur.x.price * qn) : Number(quote.data["total"] ?? 0);
  const free = cur !== undefined && cur.x.price <= 0;
  const sellTypes = types.map(({ x, left }) => {
    const on = cur !== undefined && cur.x.id === x.id && left > 0;
    const off = left <= 0 || !online;
    return {
      id: `st${String(x.id)}`,
      name: x.visibility === "box" ? tr("{type} · box office only", { type: x.short }) : x.short,
      price: x.price > 0 ? money(x.price) : tr("No charge"),
      left: left > 0 ? tr("{n} left", { n: left }) : x.visibility === "box" ? tr("{n} left", { n: 0 }) : tr("Sold out"),
      off,
      on,
      go: () => door.set({ sellType: x.id, sellQ: 1 }),
      style: `display:flex; align-items:center; gap:12px; min-height:64px; padding:0 16px; border-radius:16px; text-align:start; cursor:${off ? "not-allowed" : "pointer"}; border:${on ? "2px solid var(--accent)" : "1px solid var(--border-strong)"}; background:${on ? "var(--accent-soft)" : "var(--surface)"}; color:${off ? "var(--fg-subtle)" : "var(--fg)"};`,
    };
  });
  const sellOff = maxQ <= 0 || !online || s.busy;

  // The verdict.
  const v = s.verdict;
  const colr = { pos: "var(--pos)", warn: "var(--warn)", info: "var(--info)", danger: "var(--danger)" };
  const icon = { pos: "circle-check-big", warn: "repeat", info: "banknote", danger: "circle-x" };
  const vfg = light ? "#ffffff" : "#0f0f14";
  const word = v === null ? "" : v.amount === "" ? v.word : `${v.word} ${v.amount}`;
  const vv: V =
    v === null
      ? {}
      : {
          word: v.word,
          wordAll: word,
          amount: v.amount,
          amountOn: v.amount !== "",
          icon: icon[v.k],
          size: `min(${word.length > 9 ? "52px" : "72px"}, 15vw)`,
          name: v.name,
          nameOn: v.name !== "",
          type: v.type,
          typeOn: v.type !== "",
          id: v.id,
          idOn: v.id !== "" && v.k !== "danger" && v.k !== "warn",
          line: v.line,
          lineOn: v.line.length > 0,
          collect: v.collect !== null,
          hintOn: v.collect === null,
          fg: vfg,
          bg: colr[v.k],
          busy: s.busy,
          card: (e: { stopPropagation: () => void }) => {
            e.stopPropagation();
            void door.collect("card");
          },
          cash: (e: { stopPropagation: () => void }) => {
            e.stopPropagation();
            void door.collect("cash");
          },
          dismiss: (e: { stopPropagation: () => void }) => {
            e.stopPropagation();
            door.dismiss();
          },
          tap: v.collect !== null ? () => undefined : () => door.dismiss(),
          key: (e: { key: string; preventDefault: () => void }) => {
            if (v.collect === null && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              door.dismiss();
            } else if (e.key !== "Escape") door.hold(true);
          },
          blur: () => door.hold(false),
          down: () => door.hold(true),
          up: () => door.hold(false),
          style: `position:absolute; inset:0; z-index:20; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; padding:28px 22px; background:${colr[v.k]}; color:${vfg}; cursor:${v.collect === null ? "pointer" : "default"}; overflow-wrap:anywhere;`,
        };

  // The scan pad: the camera, or (the demo's) the next ticket in the queue.
  const demoScan = app.demo?.nextScan;
  const cam = s.camera;
  const padMsg = cam === "blocked" || cam === "none" ? tr("Camera blocked — allow it in the browser, or find by name or code") : tr("Point the camera at the QR code");
  const tapScan = () => {
    if (demoScan !== undefined) {
      const code = demoScan(t.day.id);
      if (code !== null) void door.scan(code, "pad");
      return;
    }
    door.cameraState(cam === "on" ? "off" : "on");
  };

  const before = phase === "before";
  const after = phase === "after";
  return {
    ...base,
    title,
    count: tr("In {n} · of {total}", { n: inToday + gIn, total: ofToday + gPeople }),
    noShow: false,
    // Before check-in opens, and after it closes: the numbers, the scan pad and Find (a scan says too early,
    // or that the show has finished); End of night.
    before: before || after,
    open: phase === "open",
    eyebrow: tr("{door} · {person}", { door: devName, person }),
    openTxt: after ? tr("Check-in closed at {time}", { time: strip(fT(t.closes)) }) : tr("Check-in opens at {time}", { time: strip(fT(t.opens)) }),
    opensInOn: before,
    opensIn: tr("Opens in {span}", { span: dur(t.opens - app.now) }),
    nums,
    checks,
    checksOn: before,
    endTxt,
    endSolid: ended,
    tabs,
    tabCols: `repeat(${String(tabs.length)},1fr)`,
    tabKey: (e: { key: string; preventDefault: () => void }) => {
      const at = tabDefs.findIndex(([id]) => id === tab);
      const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
      const step = e.key === "ArrowRight" ? (rtl ? -1 : 1) : e.key === "ArrowLeft" ? (rtl ? 1 : -1) : e.key === "Home" ? -at : e.key === "End" ? tabDefs.length - 1 - at : 0;
      if (step === 0) return;
      e.preventDefault();
      const nextTab = tabDefs[(at + step + tabDefs.length) % tabDefs.length]![0];
      door.set({ tab: nextTab as "scan" | "guests" | "sell" });
      setTimeout(() => document.getElementById(`dr-tab-${nextTab}`)?.focus(), 0);
    },
    scan: phase === "open" && tab === "scan",
    scanTop: before || after,
    guestsOn: phase === "open" && tab === "guests",
    sellOn: phase === "open" && tab === "sell",
    panelId: `dr-panel-${tab}`,
    tabId: `dr-tab-${tab}`,
    frame: "var(--accent)",
    tapScan,
    padLabel: demoScan !== undefined ? tr("Scan the next ticket in the queue") : tr("Camera — point it at the ticket's QR code"),
    padMsg,
    usesCamera: demoScan === undefined,
    camOn: cam === "on",
    camBad: cam === "blocked" || cam === "none",
    // A code the camera reads is taken only when the door is ready for it (no verdict up, no scan on its way).
    onCode: (text: string) => door.s.verdict === null && !door.s.busy && (void door.scan(text, "pad"), true),
    onCamera: (state: "on" | "off" | "blocked" | "none") => door.cameraState(state),
    q: s.q,
    onQ: (e: { target: { value: string } }) => door.set({ q: e.target.value }),
    find: (e: { preventDefault: () => void }) => {
      e.preventDefault();
      if (looksLikeCode(s.q)) void door.scan(typedCode(s.q), "find");
    },
    res,
    resNone: findOn && res.length === 0,
    recent: recent.slice(0, 8),
    recentEmpty: recent.length === 0,
    gTxt,
    guests,
    guestHintOn: !online,
    guestHint: tr("Ticking guests in needs the signal."),
    sellTypes,
    sellQ: String(qn),
    qDec: () => door.set({ sellQ: Math.max(1, qn - 1) }),
    qInc: () => door.set({ sellQ: Math.min(maxQ, qn + 1) }),
    decOff: qn <= 1,
    incOff: qn >= maxQ,
    sellTotal: money(total),
    sellOff,
    sellPay: !free,
    sellFree: free,
    sellCard: () => cur !== undefined && void door.sell(t, cur.x.id, qn, "card"),
    sellCash: () => cur !== undefined && void door.sell(t, cur.x.id, qn, "cash"),
    sellIssue: () => cur !== undefined && void door.sell(t, cur.x.id, qn, "none"),
    sellHint: online ? tr("Tickets sold here are checked in straight away.") : tr("Selling needs the signal — tickets and their codes come from Adminium."),
    vOn: v !== null,
    v: vv,
  };
}

/** Find's results: tonight's tickets by name, code or the friend it was offered to, then guests by name. */
function found(app: WaveApp, door: Door, t: Tonight, q: string, guestRows: Row[], list: { tickets: Row[]; orders: Row[]; checkIns: Row[] } | undefined, online: boolean): V[] {
  const box = door.box;
  const show = t.show;
  const code = looksLikeCode(q) || /^[A-Z0-9-]{4,}$/i.test(q);
  const fold = (x: unknown) => String(x ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  let tickets: Row[];
  let orders: Row[];
  let ins: Row[];
  if (online) {
    const any = [{ column: "holder_name", like: q }, { column: "pending_name", like: q }, ...(code ? [{ column: "code", like: q.replace(/\s/g, "") }] : [])];
    tickets = box.list("tickets", { where: [{ column: "event_id", eq: show.id }], any, sort: [{ column: "id" }], limit: 6 })?.rows ?? [];
    const ids = tickets.map((x) => x["order_id"] as Id);
    orders = ids.length === 0 ? [] : (box.list("orders", { where: [{ column: "id", in: [...new Set(ids)].sort((a, b) => a - b) }], limit: 6 })?.rows ?? []);
    const tids = tickets.map((x) => x.id);
    ins = tids.length === 0 ? [] : (box.list("check_ins", { where: [{ column: "event_day_id", eq: t.day.id }, { column: "ticket_id", in: [...tids].sort((a, b) => a - b) }], limit: 6 })?.rows ?? []);
  } else {
    const f = fold(q);
    tickets = (list?.tickets ?? []).filter((x) => x["event_id"] === show.id).filter((x) => fold(x["holder_name"]).includes(f) || fold(x["pending_name"]).includes(f) || (code && fold(x["code"]).replace(/-/g, "").includes(f.replace(/-/g, "")))).slice(0, 6);
    orders = list?.orders ?? [];
    ins = list?.checkIns ?? [];
  }
  const out: V[] = tickets.map((x) => {
    const o = orders.find((y) => y.id === x["order_id"]);
    const c = ins.find((y) => y["ticket_id"] === x.id);
    const st = ticketChip(app, x, o, c);
    return {
      id: `r${String(x.id)}`,
      name: String(x["holder_name"] ?? "") || String(x["sender_name"] ?? ""),
      code: String(x["code"] ?? ""),
      sub: `${door.typeName(show, x)} · ${String(o?.["number"] ?? "")}`,
      st: st[0],
      stStyle: pill(st[1]),
      go: () => void door.scan(String(x["code"] ?? ""), "find"),
    };
  });
  const f = fold(q);
  for (const g of guestRows) {
    if (out.length >= 8 || !fold(g["name"]).includes(f)) continue;
    const k = Number(g["arrived"] ?? 0);
    const tot = Number(g["people"] ?? 1);
    const plus = Number(g["plus"] ?? 0);
    out.push({
      id: `g${String(g.id)}`,
      name: String(g["name"] ?? ""),
      code: tr("Guest list"),
      sub: [plus > 0 ? `+${String(plus)}` : "", String(g["on_behalf"] ?? "")].filter((x) => x !== "" && x !== "null").join(" · "),
      st: k > 0 ? (tot > 1 ? tr("{n} of {total} in", { n: k, total: tot }) : tr("In")) : tr("Not in yet"),
      stStyle: pill(k > 0 ? "warn" : "pos"),
      go: () => door.set({ tab: "guests", q: "" }),
    });
  }
  return out;
}

/** A ticket's word at the door: in already, not paid, to pay, refund asked, offered to a friend, cancelled. */
function ticketChip(app: WaveApp, x: Row, o: Row | undefined, c: Row | undefined): [string, "pos" | "warn" | "danger" | "info" | "accent" | "muted"] {
  const ts = String(x["status"] ?? "");
  const os = String(o?.["status"] ?? "");
  if (os === "cancelled" || ["cancelled", "returned", "released"].includes(ts)) return [tr("Cancelled"), "muted"];
  if (os === "released") return [tr("Released"), "muted"];
  if (c !== undefined) return [tr("In {time}", { time: strip(fT(c["scanned_at"])) }), "warn"];
  if (ts === "refund_asked") return [tr("Refund asked"), "danger"];
  if (os === "awaiting_transfer" || os === "overdue") return [tr("Not paid yet"), "danger"];
  if (!LIVE.includes(os)) return [tr("Not valid"), "muted"];
  const owed = Number(x["due"] ?? 0) - Number(x["collected"] ?? 0);
  if (os === "door" && owed > 0.004) return [tr("Pay {amount}", { amount: money(owed) }), "info"];
  if (ts === "offered") return [tr("Offered to {name}", { name: String(x["pending_name"] ?? "") }), "accent"];
  const back = ms(x["offer_until"]);
  if (x["lapsed"] === true && x["pending_name"] !== null && x["pending_name"] !== undefined && back !== null && app.now - back < 86_400_000) return [tr("Offered to {name} — came back at {time}", { name: String(x["pending_name"]), time: strip(fT(back)) }), "accent"];
  return [tr("Not in yet"), "pos"];
}

export type { Seg };
