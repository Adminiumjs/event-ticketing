/**
 * The box office's values: its shell (the side nav with its badges, the
 * search over every order, the signed-in person), the event header and its
 * tabs, Today, Events and a show's Sales. Every figure is Adminium's — a
 * show's pools, its own money totals, exact counts of the orders and tickets
 * a line is about — and every date and time is the venue's.
 */
import type { Id, Row, Where } from "../../data/wire.ts";
import { tr } from "../../i18n/tr.ts";
import { svgData, wave, hsh } from "../art.ts";
import { boxOf, LIVE, LIVE_TICKET, plural, type Box } from "../box.ts";
export { plural };
import type { BoxWorld } from "../boxWorld.ts";
import { dur, fD, fT, fsi, iso, money, ms, num, sameDay } from "../fmt.ts";
import type { WaveApp } from "../wave.ts";
import { posterOf, stStyle } from "./audience.ts";
import { palette, S, type V } from "./base.ts";
import { boxMoreVals } from "./boxMore.ts";
import { boxOrderVals } from "./boxOrders.ts";
import { editorVals } from "./editor.ts";

const DAY = 86_400_000;

/** The box office's shared styles (the design's `B`). */
export function boxStyles(nar: boolean): Record<string, unknown> {
  const card = "background:var(--surface); border:1px solid var(--border); border-radius:16px;";
  const padX = nar ? "16px" : "24px";
  const seg = (on: boolean) =>
    `min-height:32px; padding:0 12px; border-radius:8px; border:0; cursor:pointer; font-size:13px; font-weight:700; background:${on ? "var(--surface)" : "transparent"}; color:${on ? "var(--fg)" : "var(--fg-muted)"}; box-shadow:${on ? "0 1px 3px rgba(0,0,0,.12)" : "none"};`;
  const chip = (on: boolean) =>
    `display:inline-flex; align-items:center; gap:6px; min-height:32px; padding:0 12px; border-radius:999px; white-space:nowrap; font-size:13px; font-weight:700; cursor:pointer; border:1px solid ${on ? "var(--fg)" : "var(--border-strong)"}; background:${on ? "var(--fg)" : "var(--surface)"}; color:${on ? "var(--bg)" : "var(--fg-muted)"};`;
  const td = "padding:11px 12px; border-block-end:1px solid var(--border); font-size:13.5px; font-weight:600; vertical-align:middle;";
  return {
    card,
    kpi: "display:flex; flex-direction:column; gap:4px; padding:12px 14px; border-radius:12px; background:var(--surface-2); border:1px solid var(--border);",
    kpiV: "font-family:var(--mono); font-size:20px; font-weight:700; letter-spacing:-.02em;",
    kpiS: "font-size:12px; font-weight:600; color:var(--fg-muted); line-height:1.4;",
    track: "display:flex; height:6px; border-radius:3px; background:var(--surface-3); overflow:hidden;",
    table: "width:100%; border-collapse:collapse; min-width:760px;",
    th: "padding:10px 12px; text-align:start; font-size:10.5px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--fg-subtle); border-block-end:1px solid var(--border); white-space:nowrap; position:relative;",
    td,
    tdm: `${td}font-family:var(--mono); font-size:12.5px; white-space:nowrap;`,
    h1: "margin:0; font-size:28px; font-weight:800; letter-spacing:-.045em;",
    padX,
    page: `max-width:1240px; margin-inline:auto; padding:20px ${padX} 72px; display:flex; flex-direction:column; gap:18px;`,
    sec: `${card}padding:20px; display:flex; flex-direction:column; gap:14px;`,
    secH: "margin:0; font-size:17px; font-weight:800; letter-spacing:-.03em;",
    fl: "display:flex; flex-direction:column; gap:6px; min-width:0;",
    fld: "width:100%; min-height:40px; padding:0 12px; border-radius:10px; border:1px solid var(--border-strong); background:var(--surface); color:var(--fg); font-size:14px; font-weight:600;",
    segW: "display:inline-flex; flex-wrap:wrap; gap:3px; padding:3px; border-radius:11px; background:var(--surface-2); border:1px solid var(--border); align-self:flex-start;",
    shell: `position:absolute; inset:0; z-index:60; background:var(--bg); display:flex; flex-direction:${nar ? "column" : "row"};`,
    side: nar
      ? "flex-shrink:0; display:flex; gap:2px; overflow-x:auto; padding:8px 10px; border-block-end:1px solid var(--border); background:var(--surface-2); scrollbar-width:none;"
      : "flex-shrink:0; width:228px; display:flex; flex-direction:column; gap:2px; padding:16px 12px; border-inline-end:1px solid var(--border); background:var(--surface-2); overflow-y:auto;",
    brand: nar ? "display:none;" : "display:flex; flex-direction:column; gap:8px; padding:4px 10px 18px;",
    seg,
    chip,
  };
}

/** A pill in the tone of a state. */
export const pill = (k: "pos" | "warn" | "danger" | "info" | "accent" | "muted"): string => stStyle(k);


/** "Tue 28 Jul · 16:30": the clock as a heading says it. */
export const dayTime = (t: unknown): string => `${fD(t)} · ${fT(t)}`;
/** "Mon 27 Jul 18:00": a moment inside a line. */
export const when = (t: unknown): string => `${fD(t)} ${fT(t)}`;

export function boxVals(app: WaveApp, v: V): V {
  const box = boxOf(app);
  const s = box.s;
  const nar = app.narrow();
  const B = boxStyles(nar);
  const w = box.world();
  const bx = app.state.bx;
  const me = box.me();
  const door = me !== undefined && me.roles.includes("door") && !me.roles.includes("box-office");
  const settings = w?.settings;

  // The nav, with what needs the box office counted by Adminium.
  const overdueN = box.count("orders", [{ column: "status", eq: "overdue" }]) ?? 0;
  const asked = box.list("tickets", { where: [{ column: "status", eq: "refund_asked" }], limit: 500 });
  const rqN = new Set((asked?.rows ?? []).map((t) => t["order_id"])).size;
  const backN = (w?.shows ?? []).filter((e) => e.waitlistOn).reduce((a, e) => a + (box.back(e.id) ?? 0), 0);
  const navDef: [string, string, string][] = door
    ? [["door", tr("Door"), "scan-line"]]
    : [
        ["today", tr("Today"), "house"],
        ["events", tr("Events"), "calendar-range"],
        ["orders", tr("Orders"), "receipt-text"],
        ["refunds", tr("Refund requests"), "undo-2"],
        ["guests", tr("Guest lists"), "list-checks"],
        ...(settings?.waitlistOn !== false ? ([["waits", tr("Waitlists"), "list-ordered"]] as [string, string, string][]) : []),
        ...(settings?.codesOn !== false ? ([["codes", tr("Codes"), "ticket-percent"]] as [string, string, string][]) : []),
        ["msgs", tr("Messages"), "send"],
        ["door", tr("Door"), "scan-line"],
        ["settings", tr("Settings"), "settings"],
      ];
  const evScr = ["editor", "sales", "pc"];
  const curNav = evScr.includes(bx) || (bx === "orders" && s.ord.tab) ? "events" : bx;
  const badge = (id: string): { on: boolean; n: number; label: string } =>
    id === "orders"
      ? { on: overdueN > 0, n: overdueN, label: plural(overdueN, "{n} transfer past its deadline", "{n} transfers past their deadline") }
      : id === "refunds"
        ? { on: rqN > 0, n: rqN, label: plural(rqN, "{n} refund request", "{n} refund requests") }
        : id === "waits"
          ? { on: backN > 0, n: backN, label: plural(backN, "{n} ticket back for the waitlist", "{n} tickets back for the waitlist") }
          : { on: false, n: 0, label: "" };
  const nav = navDef.map(([id, label, icon]) => {
    const b = badge(id);
    const cur = curNav === id;
    return {
      id,
      label,
      icon,
      cur: cur ? "page" : undefined,
      go: () => box.go(id as never),
      badgeOn: b.on,
      badge: String(b.n),
      badgeLabel: b.label,
      style: `display:flex; align-items:center; gap:10px; ${nar ? "flex-shrink:0; " : ""}min-height:38px; padding:0 10px; border-radius:10px; border:0; font-size:13.5px; font-weight:700; text-align:start; white-space:nowrap; background:${cur ? "var(--surface)" : "transparent"}; color:${cur ? "var(--fg)" : "var(--fg-muted)"}; box-shadow:${cur ? "0 1px 3px rgba(0,0,0,.1)" : "none"};`,
    };
  });

  // Search: orders by number, buyer or email, and tickets by code or holder — on the server.
  const q = s.bq.trim();
  let qRes: V[] = [];
  let qTotal = 0;
  if (q.length >= 2) {
    const byOrder = box.list("orders", { any: [{ column: "number", like: q }, { column: "buyer_name", like: q }, { column: "email", like: q }], sort: [{ column: "number_seq", desc: true }], limit: 8 });
    const byTicket = box.list("tickets", { any: [{ column: "code", like: q.replace(/[-\s]/g, "").length >= 4 ? q : `${q}\u0000` }, { column: "holder_name", like: q }], limit: 8 });
    const extra = [...new Set((byTicket?.rows ?? []).map((t) => t["order_id"] as Id))].filter((id) => !(byOrder?.rows ?? []).some((o) => o.id === id));
    const more = extra.length === 0 ? { rows: [] as Row[], total: 0 } : box.list("orders", { where: [{ column: "id", in: extra }], limit: 8 });
    const found = [...(byOrder?.rows ?? []), ...(more?.rows ?? [])];
    qTotal = (byOrder?.total ?? 0) + extra.length;
    qRes = found.slice(0, 8).map((o, i) => {
      const st = orderState(o, app.now);
      const show = w?.byId.get(o["event_id"] as Id);
      return {
        no: String(o["number"] ?? ""),
        buyer: String(o["buyer_name"] ?? "") || tr("Walk-in"),
        sub: [show?.name ?? "", o["email"] === null || o["email"] === undefined || o["email"] === "" ? tr("No email") : String(o["email"])].join(" · "),
        st: st.txt,
        stStyle: pill(st.k),
        id: `bo-q-${String(i)}`,
        on: s.qAt === i,
        open: () => box.openDrawer(o.id),
      };
    });
  }
  // The search as a combobox: arrows move through the results, Enter opens one, Escape clears.
  const onQKey = (e: { key: string; preventDefault: () => void; stopPropagation: () => void }) => {
    const n = qRes.length;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (n === 0) return;
      e.preventDefault();
      const next = e.key === "ArrowDown" ? (s.qAt + 1) % n : (s.qAt - 1 + n) % n;
      box.set({ qAt: next });
    } else if (e.key === "Enter") {
      const pick = qRes[s.qAt >= 0 ? s.qAt : 0] as { open?: () => void } | undefined;
      if (pick?.open !== undefined) {
        e.preventDefault();
        pick.open();
      }
    } else if (e.key === "Escape" && s.bq !== "") {
      e.preventDefault();
      e.stopPropagation();
      box.set({ bq: "", qAt: -1 });
    }
  };

  const person = me?.name ?? "";
  const role = door ? tr("Door") : tr("Box office");
  const bo: V = {
    ...B,
    on: true,
    nav,
    searchOn: !door,
    q: s.bq,
    onQ: (e: { target: { value: string } }) => box.set({ bq: e.target.value, qAt: -1 }),
    onQKey,
    qActive: s.qAt >= 0 && s.qAt < qRes.length ? `bo-q-${String(s.qAt)}` : undefined,
    qOn: q.length >= 2,
    qRes,
    qNone: q.length >= 2 && qRes.length === 0 && qTotal === 0,
    qMoreOn: qTotal > 8,
    qMore: tr("See all {n} in Orders", { n: qTotal }),
    toAllOrders: () => box.go("orders", { ord: { ...s.ord, ev: "all", tab: false, st: "all", q: s.bq, n: 50 } }),
    userName: person,
    userRole: role,
    userIni: person.charAt(0).toUpperCase(),
    userLabel: tr("{name} · {role} — account", { name: person, role }),
    userOpen: () => app.openSheet("bxUser", {}),
    toEvents: () => box.go("events"),
    ehOn: (evScr.includes(bx) || (bx === "orders" && s.ord.tab) || bx === "guests") && !(bx === "editor" && isNewDraft(s.ed)) && !(bx === "guests" && s.gl.ev === null),
    s: Object.fromEntries(["refunds", "today", "events", "editor", "sales", "orders", "guests", "waits", "codes", "msgs", "pc", "settings", "door"].map((k) => [k, bx === k])),
  };

  const out: V = { bo, boRef: (el: HTMLElement | null) => el?.setAttribute("data-bo-scroll", "1"), dd: { shows: [], tabs: [], recent: [], guests: [], sellTypes: [], nums: [], res: [], v: {} } };
  if (w === null) return { ...out, td: blankToday(), el: { rows: [], filters: [] }, eh: { tabs: [], p: {} }, sa: blankSales(), boLoading: true };
  Object.assign(out, headerVals(app, box, w, B));
  Object.assign(out, todayVals(app, box, w));
  Object.assign(out, eventsVals(app, box, w, B));
  Object.assign(out, salesVals(app, box, w));
  Object.assign(out, boxOrderVals(app, box, w, B, v));
  Object.assign(out, boxMoreVals(app, box, w, B, v));
  Object.assign(out, editorVals(app, box, w, B, v));
  return out;
}

/** The editor's draft of a show not saved yet. */
const isNewDraft = (ed: unknown): boolean => typeof ed === "object" && ed !== null && (ed as { id?: unknown }).id === null;

const blankToday = (): V => ({ kpis: [], needs: [], next: [], day: [], shows: [], p: {} });
const blankSales = (): V => ({ kpis: [], legend: [], types: [], codes: [] });

// ── an order's state, as the box office names it ─────────────────────────────

export type Tone = "pos" | "warn" | "danger" | "info" | "accent" | "muted";

/** An order's word on the lists, from its state and its money (Adminium's balance). */
export function orderState(o: Row, now: number): { txt: string; k: Tone; id: string } {
  const st = String(o["status"]);
  const bal = Number(o["balance"] ?? 0);
  const paid = Number(o["paid_in"] ?? 0) + Number(o["collected"] ?? 0);
  const refunded = Number(o["refunded"] ?? 0);
  switch (st) {
    case "let_go":
    case "expired":
      return { txt: st === "expired" ? tr("Expired") : tr("Let go"), k: "muted", id: "letgo" };
    case "held":
    case "confirming":
      return { txt: st === "confirming" ? tr("Confirming by email") : tr("In checkout"), k: "info", id: "checkout" };
    case "offered":
      return { txt: tr("Offered"), k: "accent", id: "offered" };
    case "released":
      return bal < 0 ? { txt: tr("Refund due"), k: "danger", id: "refund" } : { txt: tr("Released"), k: "muted", id: "released" };
    case "cancelled":
      if (bal < 0) return { txt: tr("Refund due"), k: "danger", id: "refund" };
      return paid > 0 && refunded >= paid ? { txt: tr("Refunded"), k: "muted", id: "refunded" } : { txt: tr("Cancelled"), k: "muted", id: "cancelled" };
    case "not_collected":
      return { txt: tr("Didn't come"), k: "muted", id: "notcollected" };
    default:
  }
  // Every ticket gone (cancelled, or handed to the waitlist): the order is over.
  if (Number(o["ticket_count"] ?? 1) <= 0 && bal >= 0) return refunded > 0 ? { txt: tr("Refunded"), k: "muted", id: "refunded" } : { txt: tr("Cancelled"), k: "muted", id: "cancelled" };
  if (bal < 0) return { txt: tr("Refund due"), k: "danger", id: "refund" };
  if (refunded > 0) return { txt: tr("Refunded {refunded} of {paid}", { refunded: money(refunded), paid: money(paid) }), k: "muted", id: "paid" };
  if (st === "door") return { txt: tr("Pay at the door"), k: "info", id: "door" };
  if (st === "awaiting_transfer") return { txt: tr("Awaiting transfer"), k: "warn", id: "awaiting" };
  if (st === "overdue") return { txt: tr("Transfer overdue"), k: "danger", id: "overdue" };
  if (st === "no_charge") return { txt: tr("No charge"), k: "accent", id: "nocharge" };
  void now;
  return { txt: tr("Paid"), k: "pos", id: "paid" };
}

// ── the event header ─────────────────────────────────────────────────────────

function headerVals(app: WaveApp, box: Box, w: BoxWorld, B: Record<string, unknown>): V {
  const s = box.s;
  const bx = app.state.bx;
  const hev = box.headShow();
  if (hev === null) return { eh: { tabs: [], p: {} } };
  const st = box.status(hev);
  const tabSt = (on: boolean) =>
    `min-height:40px; padding:0 14px; border:0; border-block-end:2px solid ${on ? "var(--accent)" : "transparent"}; background:transparent; cursor:pointer; white-space:nowrap; font-size:13.5px; font-weight:${on ? 800 : 700}; color:${on ? "var(--fg)" : "var(--fg-muted)"};`;
  const tabs: [string, string][] = [
    ["editor", tr("Edit")],
    ["sales", tr("Sales")],
    ["orders", tr("Orders and attendees")],
    ["guests", tr("Guest list")],
    ["pc", tr("Postpone or cancel")],
  ];
  const multi = hev.days.length > 1;
  void B;
  void w;
  return {
    eh: {
      name: hev.name,
      meta: [fD(hev.start), multi ? tr("Gates {time}", { time: fT(hev.doors) }) : tr("Doors {time}", { time: fT(hev.doors) }), hev.room?.name ?? ""].filter((x) => x !== "").join(" · "),
      p: posterOf(app, hev),
      st: st.txt,
      stStyle: pill(st.k),
      preview: () => {
        if (bx === "editor" && s.ed !== null) {
          app.remember();
          box.set({ edFull: true });
          return;
        }
        box.openPublic(hev);
      },
      tabs: tabs.map(([id, label]) => ({ id, label, on: bx === id, style: tabSt(bx === id), go: () => box.goShow(hev.id, id as never) })),
    },
  };
}

// ── Today ────────────────────────────────────────────────────────────────────

function todayVals(app: WaveApp, box: Box, w: BoxWorld): V {
  const now = app.now;
  const nar = app.narrow();
  const light = app.light();
  const set = w.settings;
  const dayStart = box.venueDayStart(now);
  const dayEnd = dayStart + DAY;

  // A card for each show whose doors are on this venue day and which hasn't finished.
  const tonight = w.shows.filter((e) => e.status === "published" && e.days.some((d) => d.doors >= dayStart && d.doors < dayEnd) && now < e.ends).sort((a, b) => a.doors - b.doors);
  const checkMin = Number(w.settingsRow["check_in_minutes"] ?? 30);
  const shows = tonight.map((e) => {
    const sold = box.sold(e);
    const comps = e.types.filter((t) => t.visibility === "box").reduce((a, t) => a + (sold?.byType.get(t.id)?.taken ?? 0), 0);
    const doorN = box.count("tickets", [
      { column: "event_id", eq: e.id },
      { column: "order_status", eq: "door" },
      { column: "status", in: LIVE_TICKET },
    ]);
    const guests = box.list("guest_list", { where: [{ column: "event_id", eq: e.id }], limit: 2000 })?.rows ?? [];
    const gPeople = guests.reduce((a, g) => a + 1 + Number(g["plus"] ?? 0), 0);
    const gIn = guests.reduce((a, g) => a + Number(g["arrived"] ?? 0), 0);
    const day = e.days.find((d) => d.doors >= dayStart && d.doors < dayEnd) ?? e.days[0];
    const opens = (day?.doors ?? e.doors) - checkMin * 60_000;
    const inN = day === undefined ? 0 : (box.count("check_ins", [{ column: "event_day_id", eq: day.id }]) ?? 0);
    const closes = e.guestCloses;
    const pace = wave(260, 18, () => Math.max(0.05, sold === null || sold.size === 0 ? 0.5 : ((sold.size - sold.taken) / sold.size) * 2.2), hsh(e.slug), palette(light)["accent"]!, 1.5);
    const soldSub = [
      plural(sold?.left ?? 0, "{n} left", "{n} left"),
      plural(sold?.held ?? 0, "{n} held", "{n} held"),
      ...(comps > 0 ? [plural(comps, "includes {n} comp", "includes {n} comps")] : []),
    ].join(" · ");
    return {
      id: e.id,
      p: posterOf(app, e),
      name: e.name,
      when: [fD(e.start), tr("Doors {time}", { time: fT(e.doors) }), tr("on stage {time}", { time: fT(e.start) }), e.room?.name ?? ""].filter((x) => x !== "").join(" · "),
      doorsIn: now < e.doors ? tr("Doors in {time}", { time: dur(e.doors - now) }) : tr("Doors open"),
      kpis: [
        { k: tr("Sold"), v: sold === null ? "…" : tr("{sold} of {size}", { sold: num(sold.taken), size: num(sold.size) }), sub: soldSub, waveOn: true, wave: pace, waveAlt: "" },
        { k: tr("Owed at the door"), v: money(e.money.owedDoor), sub: plural(doorN ?? 0, "across {n} ticket", "across {n} tickets"), waveOn: false, wave: "", waveAlt: "" },
        {
          k: tr("Guest list"),
          v: plural(guests.length, "{n} name", "{n} names"),
          sub: [plural(gPeople, "{n} person", "{n} people"), ...(closes === null ? [] : [tr("list closes {time}", { time: fT(closes) })])].join(" · "),
          waveOn: false,
          wave: "",
          waveAlt: "",
        },
        now < opens
          ? { k: tr("Check-in"), v: tr("Opens {time}", { time: fT(opens) }), sub: plural(checkMin, "{n} minute before doors", "{n} minutes before doors"), waveOn: false, wave: "", waveAlt: "" }
          : { k: tr("Check-in"), v: plural(inN + gIn, "{n} in", "{n} in"), sub: tr("of {n}", { n: num((sold?.taken ?? 0) + gPeople) }), waveOn: false, wave: "", waveAlt: "" },
      ],
      openDoor: () => box.go("door"),
      message: () => box.go("msgs", { msg: { ev: e.id, to: "everyone", typeId: null, tpl: null, subj: null, body: null, waiting: null } }),
    };
  });

  // What needs the box office.
  const needs: V[] = [];
  const act = (id: string, label: string, go: () => void, primary = false) => ({ id, label, go, style: primary ? `${S.btnP}min-height:36px; font-size:13px;` : S.btnS });
  const overdue = box.list("orders", { where: [{ column: "status", eq: "overdue" }], sort: [{ column: "number_seq" }], limit: 50 })?.rows ?? [];
  if (overdue.length > 0) {
    const grace = Number(w.settingsRow["release_after_hours"] ?? 24) * 3_600_000;
    const first = ms(overdue[0]!["pay_by"]) ?? now;
    const back = first + grace;
    needs.push({
      id: "ov",
      icon: "landmark",
      tone: "danger",
      title: plural(overdue.length, "{n} bank transfer is overdue", "{n} bank transfers are overdue"),
      sub: sameDay(back, now)
        ? plural(overdue.length, "It goes back on sale at {time} today unless you mark it paid.", "They go back on sale at {time} today unless you mark them paid.").replace("{time}", fT(back))
        : plural(overdue.length, "It goes back on sale on {day} unless you mark it paid.", "They go back on sale on {day} unless you mark them paid.").replace("{day}", when(back)),
      items: overdue.map((o) => {
        const show = w.byId.get(o["event_id"] as Id);
        const reminded = box.s.reminded[String(o.id)];
        return {
          no: String(o["number"]),
          txt: [String(o["buyer_name"] ?? ""), show?.name ?? "", money(o["total"]), tr("was due {when}", { when: when(o["pay_by"]) })].join(" · "),
          remindedOn: reminded !== undefined,
          reminded: reminded === undefined ? "" : tr("Reminded {time}", { time: fT(reminded) }),
          acts: [
            act("mp", tr("Mark paid"), () => app.openSheet("bxPaid", { o: o.id, method: "bank_transfer", amt: Number(o["balance"] ?? 0).toFixed(2), note: "" })),
            act("rm", tr("Remind"), () => void box.remind(o)),
            act("rl", tr("Release now"), () => app.openSheet("bxRelease", { o: o.id })),
          ],
        };
      }),
      acts: [],
    });
  }
  const asked = box.list("tickets", { where: [{ column: "status", eq: "refund_asked" }], limit: 500 })?.rows ?? [];
  const askedOrders = [...new Set(asked.map((t) => t["order_id"] as Id))];
  const askedRows = askedOrders.length === 0 ? [] : (box.list("orders", { where: [{ column: "id", in: askedOrders }], limit: 500 })?.rows ?? []);
  const ticketsOf = askedOrders.length === 0 ? [] : (box.list("tickets", { where: [{ column: "order_id", in: askedOrders }], limit: 2000 })?.rows ?? []);
  if (askedRows.length > 0) {
    needs.push({
      id: "rq",
      icon: "undo-2",
      tone: "warn",
      title: plural(askedRows.length, "{n} refund request", "{n} refund requests"),
      sub: tr("Approve to record what is due back, or decline with a reason."),
      items: askedRows.map((o) => {
        const n = asked.filter((t) => t["order_id"] === o.id).length;
        const all = ticketsOf.filter((t) => t["order_id"] === o.id).length;
        const show = w.byId.get(o["event_id"] as Id);
        return {
          no: String(o["number"]),
          txt: [String(o["buyer_name"] ?? ""), show?.name ?? "", tr("{n} of {all}", { n, all: plural(all, "{n} ticket", "{n} tickets") }), tr("{amount} paid", { amount: money(Number(o["paid_in"] ?? 0) + Number(o["collected"] ?? 0)) })].join(" · "),
          remindedOn: false,
          reminded: "",
          acts: [act("op", tr("Open"), () => box.go("refunds"))],
        };
      }),
      acts: [],
    });
  }
  for (const e of w.shows.filter((x) => x.status === "cancelled")) {
    const owe = box.list("orders", { where: [{ column: "event_id", eq: e.id }, { column: "balance", lt: 0 }], limit: 1000 });
    if (owe === undefined || owe.total === 0) continue;
    const toPay = -owe.rows.reduce((a, o) => a + Number(o["balance"] ?? 0), 0);
    needs.push({
      id: `dp${String(e.id)}`,
      icon: "circle-x",
      tone: "danger",
      title: tr("{name}: {refunds} still to make · {amount}", { name: e.name, refunds: plural(owe.total, "{n} refund", "{n} refunds"), amount: money(toPay) }),
      sub: tr("Pay each one back the way they paid, then record it."),
      items: [],
      acts: [act("ol", tr("Open the list"), () => box.goShow(e.id, "pc"))],
    });
  }
  if (set.waitlistOn) {
    for (const e of w.shows.filter((x) => x.waitlistOn && x.status === "published" && !box.isPast(x))) {
      const back = box.back(e.id);
      if (back === undefined || back === 0) continue;
      const waiting = box.count("waitlist", [
        { column: "event_id", eq: e.id },
        { column: "status", eq: "waiting" },
      ]) ?? 0;
      needs.push({
        id: `wl${String(e.id)}`,
        icon: "list-ordered",
        tone: "accent",
        title: tr("{tickets} came back", { tickets: plural(back, "{n} {name} ticket", "{n} {name} tickets").replace("{name}", e.name) }),
        sub: tr("{waiting} waiting. They are held for the waitlist and offered in joining order, {hours} hours each.", {
          waiting: plural(waiting, "{n} person is", "{n} people are"),
          hours: set.offerHours,
        }),
        items: [],
        acts: [act("of", tr("Offer them"), () => box.go("waits", { wl: { ev: e.id } }), true)],
      });
    }
  }
  const waitingMsgs = box.list("broadcasts", { where: [{ column: "status", eq: "waiting" }], limit: 50 })?.rows ?? [];
  for (const b of waitingMsgs) {
    const e = w.byId.get(b["event_id"] as Id);
    if (e === undefined) continue;
    const moved = b["template"] === "moved";
    needs.push({
      id: `bm${String(b.id)}`,
      icon: "calendar-clock",
      tone: "warn",
      title: moved
        ? tr("{name}'s postponement message is waiting · {people}", { name: e.name, people: plural(Number(b["people"] ?? 0), "{n} person", "{n} people") })
        : tr("A message to {name}'s buyers is waiting · {people}", { name: e.name, people: plural(Number(b["people"] ?? 0), "{n} person", "{n} people") }),
      sub:
        moved && e.was !== null && e.postponedAt !== null
          ? tr("Postponed {when} from {was} to {now}.", { when: sameDay(e.postponedAt, now) ? tr("today at {time}", { time: fT(e.postponedAt) }) : dayTime(e.postponedAt), was: fD(e.was), now: fD(e.start) })
          : String(b["subject"] ?? ""),
      items: [],
      acts: [act("fin", tr("Review and send"), () => box.reviewWaiting(b), true)],
    });
  }
  // A show going on sale within a week: check its page first.
  for (const e of w.shows.filter((x) => x.status === "published" && !x.cancelled)) {
    const pub = e.types.filter((t) => t.visibility === "public");
    const opens = pub.map((t) => t.salesStart ?? e.onSaleAt).filter((o): o is number => o !== null);
    if (pub.length === 0 || opens.length < pub.length) continue;
    const first = Math.min(...opens);
    if (first <= now || first > now + 7 * DAY) continue;
    const presale = set.codesOn ? e.types.filter((t) => t.visibility === "code" && t.salesStart !== null && t.salesStart > now).map((t) => t.salesStart!) : [];
    const asking = box.count("reminders", [{ column: "event_id", eq: e.id }]) ?? 0;
    needs.push({
      id: `sb${String(e.id)}`,
      icon: "clock",
      tone: "accent",
      title: [
        tr("{name} goes on sale {when}", { name: e.name, when: when(first) }),
        ...(presale.length > 0 ? [tr("presale {when}", { when: when(Math.min(...presale)) })] : []),
        plural(asking, "{n} person asked for a reminder", "{n} people asked for a reminder"),
      ].join(" · "),
      sub: tr("Check the page before it goes live."),
      items: [],
      acts: [act("ck", tr("Check the page"), () => box.openPublic(e))],
    });
  }
  const tones: Record<string, [string, string]> = { danger: ["var(--danger-soft)", "var(--danger)"], warn: ["var(--warn-soft)", "var(--warn)"], accent: ["var(--accent-soft)", "var(--accent)"] };
  for (const x of needs) {
    const t = tones[String(x["tone"])]!;
    x["iconWrap"] = `width:34px; height:34px; flex-shrink:0; border-radius:10px; display:flex; align-items:center; justify-content:center; background:${t[0]}; color:${t[1]};`;
    x["itemsOn"] = (x["items"] as unknown[]).length > 0;
  }

  // The next 14 days, with the usual pace where there are shows enough to compare.
  const last = box.venueDayStart(now) + 14 * DAY;
  const next = w.shows
    .filter((e) => e.status === "published" && e.doors >= box.venueDayStart(now) && e.doors < last && now < e.ends)
    .sort((a, b) => a.doors - b.doors)
    .map((e) => {
      const sold = box.sold(e);
      const fr = sold === null || sold.size === 0 ? 0 : sold.taken / sold.size;
      const out = sold !== null && sold.left <= 0;
      const offered = out ? (sold?.held ?? 0) : 0;
      const pace = box.pace(e);
      const label = pace?.label ?? null;
      return {
        id: e.id,
        name: e.name,
        room: e.room?.name ?? "",
        date: fD(e.start),
        soldTxt: sold === null ? "…" : out ? [tr("sold out"), ...(offered > 0 ? [plural(offered, "{n} held for a waitlist offer", "{n} held for a waitlist offer")] : [])].join(" · ") : tr("{sold} of {size}", { sold: num(sold.taken), size: num(sold.size) }),
        bar: `display:block; width:${(fr * 100).toFixed(1)}%; background:${out ? "var(--danger)" : "var(--accent)"};`,
        pace: label === "ahead" ? tr("ahead") : label === "behind" ? tr("behind") : label === "on" ? tr("on pace") : "",
        paceStyle: `justify-self:end; font-size:12px; font-weight:800; color:${label === "ahead" ? "var(--pos)" : label === "behind" ? "var(--warn)" : "var(--fg-muted)"};`,
        open: () => box.goShow(e.id, "sales"),
      };
    });

  // Today so far: this venue day's orders and money.
  const today: Where[] = [
    { column: "created_at", gte: new Date(dayStart).toISOString() },
    { column: "created_at", lt: new Date(dayEnd).toISOString() },
  ];
  const placed = box.list("orders", { where: [...today, { column: "status", in: LIVE }], limit: 2000 })?.rows ?? [];
  const out = placed.length === 0 ? 0 : (box.count("tickets", [{ column: "order_id", in: placed.map((o) => o.id) }, { column: "status", in: [...LIVE_TICKET, "cancelled", "returned"] }]) ?? 0);
  const recorded = [
    ...(box.list("payments", { where: [{ column: "recorded_at", gte: new Date(dayStart).toISOString() }, { column: "recorded_at", lt: new Date(dayEnd).toISOString() }], limit: 2000 })?.rows ?? []),
    ...(box.list("door_collections", { where: [{ column: "taken_at", gte: new Date(dayStart).toISOString() }, { column: "taken_at", lt: new Date(dayEnd).toISOString() }, { column: "state", eq: "taken" }], limit: 2000 })?.rows ?? []),
  ]
    .filter((p) => p["voided"] !== true)
    .reduce((a, p) => a + Number(p["amount"] ?? 0), 0);
  const sumOf = (st: string) => placed.filter((o) => o["status"] === st).reduce((a, o) => a + Number(o["total"] ?? 0), 0);

  // End of night, once tonight's shows are over: the door's takings, by door.
  const endTxt = box.endOfNight(w);
  return {
    td: {
      date: dayTime(now),
      tonightOn: shows.length > 0,
      shows,
      cols: nar ? "1fr" : "150px minmax(0,1fr)",
      cols2: nar ? "1fr" : "minmax(0,1.5fr) minmax(0,1fr)",
      nextCols: nar ? "70px minmax(0,1fr) 90px" : "86px minmax(0,1fr) 190px 70px",
      needs,
      needCount: String(needs.length),
      needsEmpty: needs.length === 0,
      next,
      nextEmpty: next.length === 0,
      day: [
        { k: tr("Tickets out"), v: num(out) },
        { k: tr("Money recorded"), v: money(recorded) },
        { k: tr("New owed at the door"), v: money(sumOf("door")) },
        { k: tr("New awaiting transfer"), v: money(sumOf("awaiting_transfer")) },
      ],
      endTxt,
      light,
    },
  };
}

// ── Events ───────────────────────────────────────────────────────────────────

function eventsVals(app: WaveApp, box: Box, w: BoxWorld, B: Record<string, unknown>): V {
  const s = box.s;
  const chip = B["chip"] as (on: boolean) => string;
  const fmap: Record<string, string[]> = { on: ["on"], soon: ["soon"], sold: ["sold"], post: ["post", "cancelled"], past: ["past"], draft: ["draft"] };
  const all = w.shows.map((e) => ({ e, st: box.status(e) }));
  const rows = all
    .filter((x) => s.evF === "all" || fmap[s.evF]!.includes(x.st.id))
    .sort((a, b) => Number(box.isPast(a.e)) - Number(box.isPast(b.e)) || a.e.start - b.e.start)
    .map(({ e, st }) => {
      const sold = box.sold(e);
      const cancelled = st.id === "cancelled";
      const free = e.types.every((t) => t.price === 0);
      const toPay = e.money.received - e.money.refunded;
      const owed = e.money.owedDoor + e.money.owedTransfer + e.money.owedOverdue;
      const fr = sold === null || sold.size === 0 ? 0 : sold.taken / sold.size;
      return {
        id: e.id,
        name: e.name,
        kind: e.festival || e.days.length < 2 ? kindWord(e.kind) : `${kindWord(e.kind)} · ${tr("festival")}`,
        p: posterOf(app, e),
        date: fD(e.start),
        room: e.room?.name ?? "",
        st: st.txt,
        stStyle: pill(st.k),
        soldTxt: cancelled
          ? tr("Cancelled · {amount} still to pay back", { amount: money(toPay) })
          : sold === null
            ? "…"
            : `${num(sold.taken)} / ${num(sold.size)}${st.id === "sold" ? ` · ${tr("sold out")}` : ""}`,
        bar: `display:block; width:${(cancelled ? 0 : fr * 100).toFixed(1)}%; background:${st.id === "sold" ? "var(--danger)" : "var(--accent)"};`,
        taken: free ? tr("No charge") : cancelled ? "—" : money(e.money.received),
        owed: free || cancelled ? "—" : money(owed),
        open: () => box.goShow(e.id, "sales"),
        onKey: (ev: { key: string; preventDefault: () => void }) => {
          if (ev.key === "Enter") {
            ev.preventDefault();
            box.goShow(e.id, "sales");
          }
        },
        edit: (ev: { stopPropagation: () => void }) => {
          ev.stopPropagation();
          box.goShow(e.id, "editor");
        },
      };
    });
  const efs: [BoxStateF, string][] = [
    ["all", tr("All")],
    ["on", tr("On sale")],
    ["soon", tr("On sale soon")],
    ["sold", tr("Sold out")],
    ["post", tr("Postponed or cancelled")],
    ["past", tr("Past")],
    ["draft", tr("Draft")],
  ];
  return {
    el: {
      filters: efs.map(([id, label]) => {
        const c = id === "all" ? all.length : all.filter((x) => fmap[id]!.includes(x.st.id)).length;
        return { id, label: `${label} ${fsi(num(c))}`, on: s.evF === id, style: chip(s.evF === id), go: () => box.set({ evF: id }) };
      }),
      rows,
      create: () => box.newEvent(),
    },
  };
}
type BoxStateF = "all" | "on" | "soon" | "sold" | "post" | "past" | "draft";

export const kindWord = (kind: string): string =>
  ({ gig: tr("Gig"), club: tr("Club night"), comedy: tr("Comedy"), talks: tr("Talks & workshops"), festival: tr("Festival") })[kind] ?? tr("Gig");

// ── Sales ────────────────────────────────────────────────────────────────────

function salesVals(app: WaveApp, box: Box, w: BoxWorld): V {
  const e = box.headShow();
  if (app.state.bx !== "sales" || e === null) return { sa: blankSales() };
  const now = app.now;
  const light = app.light();
  const sold = box.sold(e);
  const cancelled = e.status === "cancelled";
  const past = box.isPast(e);
  const rows = box.paceRows([e.id]);
  const byType = new Map<Id, { paid: number; owed: number; free: number; cancelled: number }>();
  for (const t of rows?.tickets ?? []) {
    const k = t["ticket_type_id"] as Id;
    const agg = byType.get(k) ?? { paid: 0, owed: 0, free: 0, cancelled: 0 };
    const os = String(t["order_status"]);
    if (LIVE_TICKET.includes(String(t["status"])) && LIVE.includes(os)) {
      if (os === "no_charge") agg.free += 1;
      else if (os === "paid") agg.paid += 1;
      else agg.owed += 1;
    } else if (String(t["status"]) === "cancelled" || os === "cancelled") agg.cancelled += 1;
    byType.set(k, agg);
  }
  // Held right now: checkouts, and waitlist offers.
  const offersHeld = box.count("tickets", [
    { column: "event_id", eq: e.id },
    { column: "order_status", eq: "offered" },
    { column: "status", in: LIVE_TICKET },
  ]);
  const held = sold?.held ?? 0;
  const inOffers = Math.min(held, offersHeld ?? 0);
  const inCheckouts = held - inOffers;
  const holdMin = w.settings.holdMinutes;
  const heldSub =
    held === 0 || inOffers === 0
      ? plural(holdMin, "in checkouts, for {n} minute", "in checkouts, for {n} minutes")
      : inCheckouts === 0
        ? tr("for a waitlist offer")
        : tr("{a} in checkouts · {b} for a waitlist offer", { a: inCheckouts, b: inOffers });
  // Checked in: once check-in has opened, or after the show.
  const checkMin = Number(w.settingsRow["check_in_minutes"] ?? 30);
  const opened = now >= e.doors - checkMin * 60_000;
  const perDay = e.days.map((d) => ({ d, n: box.count("check_ins", [{ column: "event_day_id", eq: d.id }]) }));
  const inTxt = perDay.length > 1 ? perDay.map((x) => `${fDayShort(x.d.doors)} ${num(x.n ?? 0)}`).join(" · ") : num(perDay[0]?.n ?? 0);
  const money4 = e.money;
  const kpis = cancelled
    ? [
        { k: tr("Received"), v: money(money4.received), sub: tr("before the show was cancelled") },
        { k: tr("Refunded"), v: money(money4.refunded), sub: tr("recorded") },
        { k: tr("Still to pay back"), v: money(money4.received - money4.refunded), sub: tr("to the people who paid"), warn: true },
      ]
    : [
        { k: tr("Sold"), v: num(sold?.taken ?? 0), sub: tr("of {n}", { n: num(sold?.size ?? 0) }) },
        ...(past ? [] : [{ k: tr("Held right now"), v: num(held), sub: heldSub }]),
        ...(past ? [] : [{ k: tr("Left"), v: num(sold?.left ?? 0), sub: tr("general admission") }]),
        { k: tr("Taken"), v: money(money4.received), sub: tr("recorded") },
        { k: tr("Owed"), v: money(money4.owedDoor + money4.owedTransfer + money4.owedOverdue), sub: tr("at the door or by transfer") },
        { k: tr("Checked in"), v: opened ? inTxt : "—", sub: opened ? tr("of {n}", { n: num(sold?.taken ?? 0) }) : tr("after doors") },
      ];

  // The pace: this show's tickets over time, against the same room's shows at the same lead.
  const pace = cancelled ? null : box.pace(e);
  const myRows = rows;
  const orders = (myRows?.orders ?? []).filter((o) => ms(o["created_at"]) !== null).sort((a, b) => ms(a["created_at"])! - ms(b["created_at"])!);
  const t0 = orders.length > 0 ? box.venueDayStart(ms(orders[0]!["created_at"])!) : box.venueDayStart(now) - 30 * DAY;
  const t1 = Math.min(now, e.start);
  const span = Math.max(DAY, t1 - t0);
  const size = Math.max(1, sold?.size ?? 1);
  const steps = 40;
  const pts: [number, number][] = [];
  const peerPts: [number, number][] = [];
  const peersOn = pace !== null && pace.peers.length >= 3 && pace.rows !== undefined;
  for (let i = 0; i <= steps; i += 1) {
    const t = t0 + (span * i) / steps;
    const share = myRows === undefined ? 0 : box.shareAt(e, t, myRows, size);
    pts.push([(i / steps) * 600, 200 - share * 190]);
    if (peersOn) {
      const lead = e.doors - t;
      const avg = pace.peers.reduce((a, p) => a + box.shareAt(p, p.doors - lead, pace.rows!, box.sold(p)!.size), 0) / pace.peers.length;
      peerPts.push([(i / steps) * 600, 200 - avg * 190]);
    }
  }
  const line = (p: [number, number][]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const accent = palette(light)["accent"]!;
  const chart = svgData(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200" preserveAspectRatio="none"><path d="M0 ${(200 - 0.5 * 190).toFixed(0)}H600M0 10H600" stroke="${light ? "#e2e2e8" : "#2a2a33"}" stroke-width="1" vector-effect="non-scaling-stroke"/>${
      peersOn ? `<polyline points="${line(peerPts)}" fill="none" stroke="${light ? "#8a8a95" : "#7a7a86"}" stroke-width="1.6" stroke-dasharray="6 5" vector-effect="non-scaling-stroke"/>` : ""
    }<polyline points="${line(pts)}" fill="none" stroke="${accent}" stroke-width="2.4" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`,
  );
  const room = e.room?.name ?? "";
  const paceTxt =
    orders.length === 0
      ? tr("No sales yet.")
      : !peersOn
        ? tr("Too few shows in {room} to compare yet.", { room })
        : pace.label === "ahead"
          ? tr("Selling faster than this season's shows in {room} at this point.", { room })
          : pace.label === "behind"
            ? tr("Selling slower than this season's shows in {room} at this point.", { room })
            : tr("Selling about as fast as this season's shows in {room} at this point.", { room });

  // By ticket type: paid, owed (at the door or by transfer), held and left, from Adminium's counts.
  const types = e.types.map((t) => {
    const b = byType.get(t.id) ?? { paid: 0, owed: 0, free: 0, cancelled: 0 };
    const pool = sold?.byType.get(t.id);
    const h = cancelled || past ? 0 : (pool?.held ?? 0);
    const left = cancelled || past ? 0 : Math.max(0, pool?.left ?? 0);
    const cap = Math.max(1, pool?.size ?? t.capacity ?? 1);
    const pc = (x: number) => `${((x / cap) * 100).toFixed(2)}%`;
    const txt = cancelled
      ? plural(b.cancelled, "{n} cancelled", "{n} cancelled")
      : t.price === 0
        ? [plural(b.free, "{n} no charge", "{n} no charge"), ...(past ? [] : [plural(h, "{n} held", "{n} held"), plural(left, "{n} left", "{n} left")])].join(" · ")
        : [plural(b.paid, "{n} paid", "{n} paid"), plural(b.owed, "{n} owed", "{n} owed"), ...(past ? [] : [plural(h, "{n} held", "{n} held"), plural(left, "{n} left", "{n} left")])].join(" · ");
    const segs: [string, number, string][] = cancelled
      ? []
      : [
          ["p", b.paid + b.free, "var(--accent)"],
          ["o", b.owed, "var(--info)"],
          ["h", h, "var(--warn)"],
        ];
    return {
      id: t.id,
      name: t.name,
      price: t.price === 0 ? tr("No charge") : money(t.price),
      txt,
      segs: segs.filter((x) => x[1] > 0).map(([k, n, c]) => ({ k, style: `display:block; width:${pc(n)}; background:${c};` })),
    };
  });

  // Codes used on this show: every code that applies here with a use here (per show, and in all).
  const codeRows = box.rows("codes") ?? [];
  const uses = box.list("orders", { where: [{ column: "event_id", eq: e.id }, { column: "code_id", isNull: false }, { column: "status", in: LIVE }], limit: 2000 })?.rows ?? [];
  const usesAll = box.list("orders", { where: [{ column: "code_id", isNull: false }, { column: "status", in: LIVE }], limit: 5000 })?.rows ?? [];
  const here = codeRows.filter((c) => uses.some((o) => o["code_id"] === c.id) || (!past && !cancelled && (c["event_id"] === e.id || (c["room_id"] !== null && c["room_id"] === e.room?.id) || (c["event_id"] === null && c["room_id"] === null)) && c["active"] === true));
  const codes = here.map((c) => {
    const onShow = uses.filter((o) => o["code_id"] === c.id).length;
    const inAll = usesAll.filter((o) => o["code_id"] === c.id).length;
    const max = c["max_uses"] === null || c["max_uses"] === undefined ? null : Number(c["max_uses"]);
    return {
      code: String(c["code"]),
      txt: tr("{here} on this show ({all} in all)", { here: num(onShow), all: max === null ? plural(inAll, "{n} used", "{n} used") : tr("{n} of {max}", { n: num(inAll), max: num(max) }) }),
    };
  });

  // The waitlist, where the show has one.
  const waiting = e.waitlistOn ? box.count("waitlist", [{ column: "event_id", eq: e.id }, { column: "status", eq: "waiting" }]) : 0;
  const back = e.waitlistOn ? box.back(e.id) : 0;
  const setn = w.settings;
  return {
    sa: {
      kpis: kpis.map((k) => ({ ...k, style: "warn" in k && k.warn === true ? "color:var(--warn);" : "" })),
      paceOn: !cancelled,
      usual: tr("{venue}'s usual pace", { venue: w.settings.venueName }),
      peersOn,
      cancelled,
      toRefunds: () => box.goShow(e.id, "pc"),
      chart,
      chartAlt: tr("Tickets sold since they went on sale, against the usual pace"),
      yMax: num(sold?.size ?? 0),
      yMid: num(Math.round((sold?.size ?? 0) / 2)),
      x0: fD(t0),
      x1: fD(t0 + span / 2),
      x2: t1 >= e.start ? fD(e.start) : tr("Today"),
      paceTxt,
      legend: [
        [tr("Paid"), "var(--accent)"],
        [tr("Owed"), "var(--info)"],
        [tr("Held"), "var(--warn)"],
        [tr("Left"), "var(--surface-3)"],
      ].map(([k, c]) => ({ k, sw: `width:12px; height:12px; border-radius:3px; background:${c}; border:1px solid var(--border-strong);` })),
      types,
      codesFeat: setn.codesOn,
      codes,
      codesEmpty: codes.length === 0,
      waitFeat: setn.waitlistOn,
      waitTxt: !e.waitlistOn
        ? tr("No waitlist on this show.")
        : (waiting ?? 0) === 0 && (back ?? 0) === 0
          ? tr("Nobody waiting.")
          : tr("{waiting} · {back} back", { waiting: plural(waiting ?? 0, "{n} person waiting", "{n} people waiting"), back: num(back ?? 0) }),
      waitOn: e.waitlistOn && setn.waitlistOn,
      toWait: () => box.go("waits", { wl: { ev: e.id } }),
    },
  };
}

/** "Sat" — a festival day's short name. */
const fDayShort = (t: number): string => fD(t).split(" ")[0] ?? "";

export { iso };
