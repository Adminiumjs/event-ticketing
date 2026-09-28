/**
 * The event editor: a show's basics, when (one night, or up to three days)
 * and where, its poster, lineup, ticket types, checkout questions, policies
 * and publishing, beside the live preview of its public page. The page checks
 * what it can before Save; Adminium decides on the save — one write of the
 * show with its days, types, acts and questions.
 */
import type { EventChildren } from "../../data/ports.ts";
import type { Id } from "../../data/wire.ts";
import { tr } from "../../i18n/tr.ts";
import { poster } from "../art.ts";
import { plural, type Box } from "../box.ts";
import type { BoxShow, BoxWorld } from "../boxWorld.ts";
import { fD, fT, money, ms, num, venueZone } from "../fmt.ts";
import type { WaveApp } from "../wave.ts";
import type { V } from "./base.ts";
import { fromLocal, localValue } from "./boxOrders.ts";

// ── the draft ────────────────────────────────────────────────────────────────

export interface DraftType {
  k: string;
  id: Id | null;
  kind: string;
  name: string;
  desc: string;
  free: boolean;
  price: string;
  pay: "door" | "transfer" | "both";
  cap: string;
  start: string;
  end: string;
  vis: "public" | "code" | "box";
  min: string;
  max: string;
  sold: number;
  held: number;
  orig: number | null;
  selling: boolean;
  days: number[];
}
export interface DraftDay {
  k: string;
  id: Id | null;
  date: string;
  gates: string;
  last: string;
  curfew: string;
}
export interface DraftAct {
  k: string;
  id: Id | null;
  name: string;
  s: string;
  e: string;
  day: number;
  room: Id | null;
}
export interface DraftQ {
  k: string;
  id: Id | null;
  text: string;
  kind: "text" | "choice" | "yes_no";
  per: "ticket" | "order";
  required: boolean;
  options: string[];
}
export interface Draft {
  id: Id | null;
  slug: string | null;
  name: string;
  support: string;
  kind: string;
  about: string;
  date: string;
  doors: string;
  stage: string;
  curfew: string;
  room: Id | null;
  style: string;
  image: string | null;
  days: DraftDay[] | null;
  acts: DraftAct[];
  sets: boolean;
  types: DraftType[];
  qs: DraftQ[];
  age: string;
  ageNote: string;
  refund: "days" | "none" | "custom";
  refundTxt: string;
  reentry: string;
  bags: string;
  pub: "draft" | "published";
  wasPub: boolean;
  onSale: string;
  gl: string;
  waitlist: boolean;
  /** Set on a show that has happened or is cancelled: nothing changes. */
  frozen: "past" | "cancelled" | null;
  /** As saved: the refund close and the start it was set against (kept while neither the start nor the policy moves). */
  savedRefund: { until: number | null; start: number } | null;
  posterError: string | null;
}

const STYLES = ["dots", "rings", "stripes", "grain", "glyph"];
let seq = 0;
const key = (p: string) => `${p}${String(Date.now())}${String((seq += 1))}`;
const dateOf = (t: number | null): string => (t === null ? "" : localValue(t).slice(0, 10));
const timeOf = (t: number | null): string => (t === null ? "" : localValue(t).slice(11, 16));
const at = (date: string, time: string, zone: string): number | null => (date === "" || time === "" ? null : ms(fromLocal(`${date}T${time}`, zone)));
const hm = (v: string): number => {
  const [h, m] = v.split(":").map(Number) as [number, number];
  return h * 60 + (m || 0);
};
export const slugOf = (name: string): string =>
  name
    .toLowerCase()
    .replace(/&/g, "and")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);

/** The draft of a saved show, with what is sold and held of each type (Adminium's counts). */
export function draftOf(box: Box, show: BoxShow): Draft {
  const w = box.world()!;
  const sold = box.sold(show);
  const rows = w.typeRows.filter((t) => t["event_id"] === show.id);
  const multi = show.days.length > 1;
  const now = box.app.now;
  return {
    id: show.id,
    slug: show.slug,
    name: show.name,
    support: show.support ?? "",
    kind: show.kind === "festival" ? "gig" : show.kind,
    about: show.about ?? "",
    date: dateOf(show.start),
    doors: timeOf(show.doors),
    stage: timeOf(show.start),
    curfew: timeOf(show.curfew),
    room: show.room?.id ?? null,
    style: show.posterStyle ?? "rings",
    image: show.image,
    days: multi
      ? show.days.map((d) => ({ k: `d${String(d.id)}`, id: d.id, date: dateOf(d.doors), gates: timeOf(d.doors), last: timeOf(d.lastEntry ?? d.curfew), curfew: timeOf(d.curfew) }))
      : null,
    acts: show.acts.map((a) => ({ k: `a${String(a.id)}`, id: a.id, name: a.name, s: timeOf(a.start), e: timeOf(a.end), day: a.day, room: a.roomId })),
    sets: show.setsPublished,
    types: rows
      .map((r) => {
        const t = show.types.find((x) => x.id === r.id)!;
        const pool = sold?.byType.get(r.id);
        return {
          k: `t${String(r.id)}`,
          id: r.id,
          kind: String(r["kind"] ?? "standard"),
          name: t.name,
          desc: t.description ?? "",
          free: t.price === 0,
          price: t.price === 0 ? "" : String(t.price),
          pay: t.payDoor && t.payTransfer ? "both" : t.payTransfer ? "transfer" : "door",
          cap: t.capacity === null ? "" : String(t.capacity),
          start: t.salesStart === null ? "" : localValue(t.salesStart),
          end: t.salesEnd === null ? "" : localValue(t.salesEnd),
          vis: t.visibility,
          min: t.min === null ? "1" : String(t.min),
          max: String(t.max),
          sold: pool?.taken ?? 0,
          held: pool?.held ?? 0,
          orig: t.price,
          selling: t.selling,
          days: t.admits,
        } satisfies DraftType;
      })
      .sort((a, b) => (show.types.findIndex((x) => x.id === a.id) ?? 0) - (show.types.findIndex((x) => x.id === b.id) ?? 0)),
    qs: w.questions
      .filter((q) => q["event_id"] === show.id)
      .sort((a, b) => Number(a["position"] ?? 0) - Number(b["position"] ?? 0))
      .map((q) => ({
        k: `q${String(q.id)}`,
        id: q.id,
        text: String(q["text"] ?? ""),
        kind: q["kind"] === "choice" || q["kind"] === "yes_no" ? q["kind"] : "text",
        per: q["per"] === "order" ? "order" : "ticket",
        required: q["required"] === true,
        options: String(q["options"] ?? "")
          .split("\n")
          .map((x) => x.trim())
          .filter((x) => x !== ""),
      })),
    age: show.age,
    ageNote: show.ageNote ?? "",
    refund: show.refundText !== null ? "custom" : show.refundUntil === null ? "none" : "days",
    refundTxt: show.refundText ?? "",
    reentry: show.reEntry ?? "",
    bags: show.bags ?? "",
    pub: show.status === "draft" ? "draft" : "published",
    wasPub: show.status !== "draft",
    onSale: show.onSaleAt === null ? "" : localValue(show.onSaleAt),
    gl: String(show.guestPlaces),
    waitlist: show.waitlistOn,
    frozen: show.status === "cancelled" ? "cancelled" : now > show.ends ? "past" : null,
    savedRefund: show.refundText === null && show.refundUntil !== null ? { until: show.refundUntil, start: show.start } : null,
    posterError: null,
  };
}

/** A new show: a month out in the first room, one Standard type, the venue's own defaults. */
export function newDraft(box: Box): Draft {
  const w = box.world()!;
  const s = w.settingsRow;
  const date = dateOf(box.app.now + 30 * 86_400_000);
  const room = w.rooms.find((r) => r.kind !== "both") ?? w.rooms[0];
  const door = s["door_on"] !== false;
  const transfer = s["transfer_on"] !== false;
  return {
    id: null,
    slug: null,
    name: "",
    support: "",
    kind: "gig",
    about: "",
    date,
    doors: "19:30",
    stage: "20:30",
    curfew: "23:00",
    room: room?.id ?? null,
    style: STYLES[Math.floor(Math.random() * STYLES.length)]!,
    image: null,
    days: null,
    acts: [],
    sets: false,
    types: [
      {
        k: key("t"),
        id: null,
        kind: "standard",
        name: tr("Standard"),
        desc: "",
        free: false,
        price: "",
        pay: door && transfer ? "both" : transfer ? "transfer" : "door",
        cap: String(room?.capacity ?? 100),
        start: "",
        end: "",
        vis: "public",
        min: "1",
        max: "6",
        sold: 0,
        held: 0,
        orig: null,
        selling: true,
        days: [1],
      },
    ],
    qs: [],
    age: String(s["default_age"] ?? "all"),
    ageNote: "",
    refund: Number(s["refund_days"] ?? 7) > 0 ? "days" : "none",
    refundTxt: "",
    reentry: "",
    bags: "",
    pub: "draft",
    wasPub: false,
    onSale: "",
    gl: "0",
    waitlist: false,
    frozen: null,
    savedRefund: null,
    posterError: null,
  };
}

// ── what the draft saves as ──────────────────────────────────────────────────

/** The show's row and its children's, as one write sends them. */
export function rowsOf(box: Box, d: Draft, zone: string): { values: Record<string, unknown>; children: EventChildren } {
  const w = box.world()!;
  const multi = d.days !== null && d.days.length > 1;
  const days: DraftDay[] = multi ? d.days! : [{ k: "d1", id: d.days?.[0]?.id ?? existingDay(box, d.id), date: d.date, gates: d.doors, last: "", curfew: d.curfew }];
  const dayRows = days.map((x, i) => {
    const doors = at(x.date, x.gates, zone)!;
    let curfew = at(x.date, multi ? x.curfew || addMinutes(x.last, 30) : x.curfew, zone)!;
    if (curfew <= doors) curfew += 86_400_000;
    const last = multi && x.last !== "" ? at(x.date, x.last, zone) : null;
    return { ...(x.id === null ? {} : { id: x.id }), day: i + 1, doors_at: new Date(doors).toISOString(), last_entry_at: last === null ? null : new Date(last).toISOString(), curfew_at: new Date(curfew).toISOString() };
  });
  const firstDoors = ms(dayRows[0]!.doors_at)!;
  let start = multi ? firstDoors : (at(d.date, d.stage, zone) ?? firstDoors);
  if (!multi && start < firstDoors) start += 86_400_000;
  let curfew = ms(dayRows[dayRows.length - 1]!.curfew_at)!;
  if (!multi && curfew <= start) curfew = Math.max(curfew, start + 3_600_000);
  const refundDays = Number(w.settingsRow["refund_days"] ?? 7);
  const refundUntil =
    d.refund !== "days" ? null : d.savedRefund !== null && d.savedRefund.start === start ? d.savedRefund.until : at(dateOf(start - refundDays * 86_400_000), "23:59", zone);
  const slug = d.slug ?? uniqueSlug(box, slugOf(d.name) || "show");
  const doorsHour = hm(timeOf(firstDoors));
  const values: Record<string, unknown> = {
    name: d.name.trim(),
    slug,
    support: d.support.trim() === "" ? null : d.support.trim(),
    kind: multi ? "festival" : d.kind,
    room_id: d.room,
    doors_at: new Date(firstDoors).toISOString(),
    starts_at: new Date(start).toISOString(),
    curfew_at: new Date(curfew).toISOString(),
    ends_at: new Date(curfew).toISOString(),
    about: d.about.trim() === "" ? null : d.about.trim(),
    image: d.image,
    poster_style: d.style,
    age: d.age,
    age_note: d.ageNote.trim() === "" ? null : d.ageNote.trim(),
    refund_until: refundUntil === null ? null : new Date(refundUntil).toISOString(),
    refund_text: d.refund === "custom" && d.refundTxt.trim() !== "" ? d.refundTxt.trim() : null,
    re_entry: d.reentry.trim() === "" ? null : d.reentry.trim(),
    bags: d.bags.trim() === "" ? null : d.bags.trim(),
    guest_places: Number(d.gl || 0),
    waitlist_on: d.waitlist,
    sets_published: d.sets,
    status: d.pub,
    on_sale_at: d.onSale === "" ? null : fromLocal(d.onSale, zone),
    eve_email: doorsHour < 16 * 60,
  };
  const dateOfDay = (n: number) => (multi ? (d.days![n - 1]?.date ?? d.days![0]!.date) : d.date);
  const children: EventChildren = {
    event_days: dayRows,
    ticket_types: d.types.map((t, i) => ({
      ...(t.id === null ? {} : { id: t.id }),
      name: t.name.trim(),
      kind: t.kind,
      description: t.desc.trim() === "" ? null : t.desc.trim(),
      price: t.free ? 0 : Number(t.price),
      capacity: t.cap === "" ? null : Number(t.cap),
      min_per_order: t.min === "" ? null : Number(t.min),
      max_per_order: Number(t.max || 6),
      visibility: t.vis,
      pay_door: !t.free && t.pay !== "transfer",
      pay_transfer: !t.free && t.pay !== "door",
      sales_start: t.start === "" ? (d.onSale === "" ? null : fromLocal(d.onSale, zone)) : fromLocal(t.start, zone),
      sales_end: t.end === "" ? null : fromLocal(t.end, zone),
      admits_day1: !multi || t.days.includes(1),
      admits_day2: multi && t.days.includes(2),
      admits_day3: multi && t.days.includes(3),
      selling: t.selling,
      position: i,
    })),
    acts: d.acts
      .filter((a) => a.name.trim() !== "" && a.e !== "")
      .map((a, i) => {
        const date = dateOfDay(a.day);
        let s = a.s === "" ? null : at(date, a.s, zone);
        let e = at(date, a.e, zone);
        if (s !== null && s < firstDoors - 6 * 3_600_000) s += 86_400_000;
        if (e !== null && s !== null && e <= s) e += 86_400_000;
        return {
          ...(a.id === null ? {} : { id: a.id }),
          name: a.name.trim(),
          starts_at: s === null ? null : new Date(s).toISOString(),
          ends_at: e === null ? null : new Date(e).toISOString(),
          day: a.day,
          room_id: a.room,
          position: i,
        };
      }),
    questions: d.qs
      .filter((q) => q.text.trim() !== "")
      .map((q, i) => ({
        ...(q.id === null ? {} : { id: q.id }),
        text: q.text.trim(),
        kind: q.kind,
        options: q.kind === "choice" ? q.options.map((o) => o.trim()).filter((o) => o !== "").join("\n") : null,
        per: q.per,
        required: q.required,
        position: i,
      })),
  };
  return { values, children };
}

const existingDay = (box: Box, id: Id | null): Id | null => (id === null ? null : (box.world()?.byId.get(id)?.days[0]?.id ?? null));
const addMinutes = (time: string, m: number): string => {
  if (time === "") return "";
  const t = (hm(time) + m) % (24 * 60);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};
function uniqueSlug(box: Box, base: string): string {
  const taken = new Set((box.world()?.shows ?? []).map((s) => s.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i += 1) if (!taken.has(`${base}-${String(i)}`)) return `${base}-${String(i)}`;
}

// ── what the page checks ─────────────────────────────────────────────────────

export interface DraftErrors {
  name?: string;
  time?: string;
  gl?: string;
  types: Record<string, { price?: string; cap?: string; min?: string; end?: string; name?: string }>;
  first: string | null;
}

export function checkDraft(box: Box, d: Draft, zone: string): DraftErrors {
  const w = box.world()!;
  const out: DraftErrors = { types: {}, first: null };
  const first = (id: string) => {
    if (out.first === null) out.first = id;
  };
  if (d.name.trim() === "") {
    out.name = tr("Give the night a name.");
    first("ed-name");
  }
  if (d.days === null && d.doors !== "" && d.stage !== "" && hm(d.doors) >= hm(d.stage)) {
    out.time = tr("Doors must be before on stage.");
    first("ed-doors");
  }
  const room = w.rooms.find((r) => r.id === d.room);
  const guests = d.id === null ? [] : (box.list("guest_list", { where: [{ column: "event_id", eq: d.id }], limit: 2000 })?.rows ?? []);
  const people = guests.reduce((a, g) => a + 1 + Number(g["plus"] ?? 0), 0);
  const gl = Number(d.gl || 0);
  if (gl < people) {
    out.gl = plural(people, "{n} person is on the list already.", "{n} people are on the list already.");
    first("ed-gl");
  } else if (room !== undefined && gl > room.capacity) {
    out.gl = tr("The room holds {n}.", { n: num(room.capacity) });
    first("ed-gl");
  }
  const showStart = d.days === null ? at(d.date, d.stage, zone) : at(d.days[d.days.length - 1]?.date ?? d.date, d.days[d.days.length - 1]?.last || "23:59", zone);
  for (const t of d.types) {
    const e: DraftErrors["types"][string] = {};
    if (t.name.trim() === "") e.name = tr("Give the ticket type a name.");
    if (!t.free && !(Number(t.price) > 0)) e.price = tr("Enter a price, or choose No charge.");
    const cap = Number(t.cap || 0);
    if (cap < t.sold + t.held) e.cap = tr("Can't go below {sold} sold and {held} held", { sold: t.sold, held: t.held });
    const min = Number(t.min || 1);
    const max = Number(t.max || 6);
    if (!(min >= 1) || min > max) e.min = tr("At least 1, and no more than the max.");
    const s = t.start === "" ? null : ms(fromLocal(t.start, zone));
    const en = t.end === "" ? null : ms(fromLocal(t.end, zone));
    if (en !== null && ((s !== null && en <= s) || (showStart !== null && en > showStart))) e.end = tr("Sales end after they start, and no later than the show.");
    if (Object.keys(e).length > 0) {
      out.types[t.k] = e;
      first(`${t.k}-${Object.keys(e)[0]!}`);
    }
  }
  return out;
}

export const hasErrors = (e: DraftErrors): boolean => e.first !== null;

// ── the editor's values ──────────────────────────────────────────────────────

const weekday = (date: string): string => {
  if (date === "") return "";
  const d = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat(undefined, { weekday: "long", timeZone: "UTC" }).format(d);
};
const hintOf = (value: string, zone: string): string => {
  if (value === "") return "";
  const t = ms(fromLocal(value, zone));
  return t === null ? "" : tr("That's {when}.", { when: `${fD(t)}, ${fT(t)}` });
};

export function editorVals(app: WaveApp, box: Box, w: BoxWorld, B: Record<string, unknown>, _v: V): V {
  const blank = { ed: { fullOn: false, pvs: [], kinds: [], rooms: [], acts: [], types: [], qs: [], ages: [], refunds: [], pubs: [], days: [], p: {}, name: {}, support: {}, about: {}, date: {}, doors: {}, stage: {}, curfew: {}, refundTxt: {}, reentry: {}, bags: {}, pubAt: {}, gl: {} } };
  if (app.state.bx !== "editor") return blank;
  const s = box.s;
  const zone = app.zone || venueZone();
  let d = s.ed as Draft | null;
  if (d === null) {
    const show = s.bev === null ? null : (w.byId.get(s.bev) ?? null);
    if (show !== null && box.sold(show) === null) return blank;
    d = show === null ? newDraft(box) : draftOf(box, show);
    // First look: kept as the draft (not a change yet).
    queueMicrotask(() => box.set({ ed: d, edDirty: s.edDirty && show === null }));
  }
  const draft: Draft = d;
  const nar = app.narrow();
  const light = app.light();
  const seg = B["seg"] as (on: boolean) => string;
  const chip = B["chip"] as (on: boolean) => string;
  const fld = String(B["fld"]);
  const errFld = fld.replace("border:1px solid var(--border-strong)", "border:1.5px solid var(--danger)");
  const frozen = draft.frozen !== null;
  const set = (p: Partial<Draft>) => {
    if (frozen) return;
    box.set({ ed: { ...(box.s.ed as Draft), ...p }, edDirty: true });
  };
  const F = (k: keyof Draft) => ({ v: String(draft[k] ?? ""), on: (e: { target: { value: string } }) => set({ [k]: e.target.value } as Partial<Draft>) });
  const arr = <T extends { k: string }>(k: "types" | "acts" | "qs" | "days", i: number, p: Partial<T>) => set({ [k]: ((draft[k] as T[] | null) ?? []).map((x, j) => (j === i ? { ...x, ...p } : x)) } as Partial<Draft>);
  const lockWhen = draft.types.some((t) => t.sold > 0 || t.held > 0);
  const errs = checkDraft(box, draft, zone);
  const tried = s.edTried;
  const room = w.rooms.find((r) => r.id === draft.room);
  const roomCap = room?.capacity ?? 0;
  const alloc = draft.types.reduce((a, t) => a + (Number(t.cap) || 0), 0);
  const gl = Number(draft.gl || 0);
  const onSale = roomCap - gl;
  const multi = draft.days !== null && draft.days.length > 1;
  const sw = (on: boolean) => ({
    track: `position:relative; width:36px; height:21px; flex-shrink:0; border-radius:999px; background:${on ? "var(--accent)" : "var(--surface-3)"}; transition:background .15s;`,
    knob: `position:absolute; inset-block-start:3px; inset-inline-start:${on ? "18px" : "3px"}; width:15px; height:15px; border-radius:50%; background:${on ? "var(--accent-fg)" : "var(--fg-subtle)"}; transition:inset-inline-start .15s;`,
  });
  const segO = (list: [string, string][], cur: string, go: (id: string) => void) => list.map(([id, label]) => ({ id: label, key: id, on: cur === id, go: () => go(id), style: seg(cur === id) }));
  const p = poster(draft.name || tr("New event"), null, draft.style, light);
  const sysName: Record<string, string> = { dots: tr("halftone dots"), rings: tr("rings"), stripes: tr("stripes"), grain: tr("grain"), glyph: tr("big letter") };
  const refundDays = Number(w.settingsRow["refund_days"] ?? 7);
  const sendOn = w.settings.sendOn;
  const refundLine =
    draft.refund === "days"
      ? `${plural(refundDays, "Refunds until {n} day before the show.", "Refunds until {n} days before the show.")}${sendOn ? ` ${tr("After that, you can send your ticket to a friend.")}` : ""}`
      : draft.refund === "none"
        ? sendOn
          ? tr("No refunds — you can send your ticket to a friend.")
          : tr("No refunds.")
        : draft.refundTxt || tr("Write your policy in one plain sentence.");
  const dayLabel = (n: number) => {
    const dd = draft.days?.[n - 1]?.date ?? "";
    return dd === "" ? tr("Day {n}", { n }) : fD(ms(fromLocal(`${dd}T12:00`, zone)));
  };
  const types = draft.types.map((t, i) => {
    const e = tried ? (errs.types[t.k] ?? {}) : ((errs.types[t.k]?.cap !== undefined ? { cap: errs.types[t.k]!.cap } : {}) as DraftErrors["types"][string]);
    const nm = t.name || tr("this ticket type");
    const pr = t.free ? 0 : Number(t.price) || 0;
    const codesOn = w.settings.codesOn || t.vis === "code";
    return {
      k: t.k,
      n: String(i + 1).padStart(2, "0"),
      soldOn: t.sold > 0 || t.held > 0,
      soldTxt: tr("{sold} sold · {held} held", { sold: num(t.sold), held: num(t.held) }),
      capErrOn: e.cap !== undefined,
      capErr: e.cap ?? "",
      capId: `${t.k}-cap`,
      capFld: `${e.cap !== undefined ? errFld : fld}font-family:var(--mono);`,
      priceErrOn: e.price !== undefined,
      priceErr: e.price ?? "",
      minErrOn: e.min !== undefined,
      minErr: e.min ?? "",
      endErrOn: e.end !== undefined,
      endErr: e.end ?? "",
      nameErrOn: e.name !== undefined,
      nameErr: e.name ?? "",
      priceHintOn: t.sold > 0 && t.orig !== null && pr !== t.orig,
      priceHint: tr("A new price applies to new tickets; the {n} sold keep {price}", { n: num(t.sold), price: money(t.orig ?? 0) }),
      delOn: !frozen && t.sold === 0 && t.held === 0,
      stopOn: !frozen && (t.sold > 0 || t.held > 0),
      stopLabel: t.selling ? tr("Stop selling") : tr("Start selling again"),
      stoppedOn: !t.selling,
      toggleStop: () => arr<DraftType>("types", i, { selling: !t.selling }),
      daysOn: multi,
      dayTicks: (draft.days ?? []).map((_, j) => {
        const n = j + 1;
        const on = t.days.includes(n);
        return { id: `${t.k}-d${String(n)}`, label: dayLabel(n).split(" ")[0] ?? "", on, go: () => arr<DraftType>("types", i, { days: on ? t.days.filter((x) => x !== n) : [...t.days, n].sort() }), style: `${chip(on)}min-height:30px;` };
      }),
      name: { v: t.name, on: (ev: { target: { value: string } }) => arr<DraftType>("types", i, { name: ev.target.value }) },
      desc: { v: t.desc, on: (ev: { target: { value: string } }) => arr<DraftType>("types", i, { desc: ev.target.value }) },
      price: { v: t.price, on: (ev: { target: { value: string } }) => arr<DraftType>("types", i, { price: ev.target.value.replace(",", ".").replace(/[^0-9.]/g, "") }) },
      cap: { v: t.cap, on: (ev: { target: { value: string } }) => arr<DraftType>("types", i, { cap: ev.target.value.replace(/\D/g, "") }) },
      start: { v: t.start, on: (ev: { target: { value: string } }) => arr<DraftType>("types", i, { start: ev.target.value }) },
      startHint: hintOf(t.start, zone),
      end: { v: t.end, on: (ev: { target: { value: string } }) => arr<DraftType>("types", i, { end: ev.target.value }) },
      endHint: hintOf(t.end, zone),
      min: { v: t.min, on: (ev: { target: { value: string } }) => arr<DraftType>("types", i, { min: ev.target.value.replace(/\D/g, "") }) },
      max: { v: t.max, on: (ev: { target: { value: string } }) => arr<DraftType>("types", i, { max: ev.target.value.replace(/\D/g, "") }) },
      paid: !t.free,
      costs: segO(
        [
          ["costs", tr("Costs")],
          ["free", tr("No charge")],
        ],
        t.free ? "free" : "costs",
        (v) => arr<DraftType>("types", i, { free: v === "free" }),
      ),
      pays: segO(
        [
          ["door", tr("At the door")],
          ["transfer", tr("Transfer")],
          ["both", tr("Both")],
        ],
        t.pay,
        (v) => arr<DraftType>("types", i, { pay: v as DraftType["pay"] }),
      ),
      vis: segO(
        [["public", tr("Everyone")], ...(codesOn ? ([["code", tr("Only with a code")]] as [string, string][]) : []), ["box", tr("Box office only")]],
        t.vis,
        (v) => arr<DraftType>("types", i, { vis: v as DraftType["vis"] }),
      ),
      visHint: t.vis === "code" ? tr("Hidden until someone enters an access code set up in Codes.") : t.vis === "box" ? tr("Never on the public page — for comps and door sales.") : tr("Shown on the public page."),
      upOff: i === 0,
      downOff: i === draft.types.length - 1,
      upLabel: tr("Move {name} up", { name: nm }),
      downLabel: tr("Move {name} down", { name: nm }),
      delLabel: tr("Remove {name}", { name: nm }),
      up: () => {
        const a = [...draft.types];
        [a[i - 1], a[i]] = [a[i]!, a[i - 1]!];
        set({ types: a });
      },
      down: () => {
        const a = [...draft.types];
        [a[i + 1], a[i]] = [a[i]!, a[i + 1]!];
        set({ types: a });
      },
      del: () => set({ types: draft.types.filter((_, j) => j !== i) }),
    };
  });
  const twoRooms = room?.kind === "both";
  const actRooms = w.rooms.filter((r) => r.kind !== "both");
  const acts = draft.acts.map((a, i) => ({
    k: a.k,
    name: { v: a.name, on: (ev: { target: { value: string } }) => arr<DraftAct>("acts", i, { name: ev.target.value }) },
    s: { v: a.s, on: (ev: { target: { value: string } }) => arr<DraftAct>("acts", i, { s: ev.target.value }) },
    e: { v: a.e, on: (ev: { target: { value: string } }) => arr<DraftAct>("acts", i, { e: ev.target.value }) },
    dayOn: multi,
    days: (draft.days ?? []).map((_, j) => ({ id: dayLabel(j + 1).split(" ")[0] ?? "", on: a.day === j + 1, go: () => arr<DraftAct>("acts", i, { day: j + 1 }), style: `${chip(a.day === j + 1)}min-height:30px;` })),
    roomOn: twoRooms,
    rooms: actRooms.map((r) => ({ id: r.name, on: a.room === r.id, go: () => arr<DraftAct>("acts", i, { room: r.id }), style: `${chip(a.room === r.id)}min-height:30px;` })),
    del: () => set({ acts: draft.acts.filter((_, j) => j !== i) }),
    delLabel: tr("Remove {name}", { name: a.name || tr("this act") }),
  }));
  const qs = draft.qs.map((x, i) => {
    const w0 = sw(x.required);
    return {
      k: x.k,
      choiceOn: x.kind === "choice",
      choices: x.options.map((c, j) => ({
        k: `${x.k}c${String(j)}`,
        v: c,
        label: tr("Choice {n}", { n: j + 1 }),
        on: (ev: { target: { value: string } }) => arr<DraftQ>("qs", i, { options: x.options.map((y, m) => (m === j ? ev.target.value : y)) }),
        del: () => arr<DraftQ>("qs", i, { options: x.options.filter((_, m) => m !== j) }),
        delLabel: tr("Remove choice {n}", { n: j + 1 }),
      })),
      addChoice: () => arr<DraftQ>("qs", i, { options: [...x.options, ""] }),
      q: { v: x.text, on: (ev: { target: { value: string } }) => arr<DraftQ>("qs", i, { text: ev.target.value }) },
      kinds: segO(
        [
          ["text", tr("Short text")],
          ["choice", tr("Choice")],
          ["yes_no", tr("Yes or no")],
        ],
        x.kind,
        (v) => arr<DraftQ>("qs", i, { kind: v as DraftQ["kind"] }),
      ),
      scopes: segO(
        [
          ["ticket", tr("Per ticket")],
          ["order", tr("Per order")],
        ],
        x.per,
        (v) => arr<DraftQ>("qs", i, { per: v as DraftQ["per"] }),
      ),
      req: x.required,
      toggleReq: () => arr<DraftQ>("qs", i, { required: !x.required }),
      swTrack: w0.track,
      swKnob: w0.knob,
      del: () => set({ qs: draft.qs.filter((_, j) => j !== i) }),
    };
  });
  const setsSw = sw(draft.sets);
  const wlSw = sw(draft.waitlist);
  const pvPhone = s.edPv === "phone";
  const d0 = draft.date === "" ? null : ms(fromLocal(`${draft.date}T12:00`, zone));
  const wd = d0 === null ? "" : weekday(draft.date);
  const saveLabel = draft.pub === "draft" ? tr("Save draft") : draft.wasPub ? tr("Save") : tr("Save and publish");
  const slug = draft.slug ?? uniqueSlug(box, slugOf(draft.name) || "show");
  const base = typeof window === "undefined" ? "" : `${window.location.host}${(import.meta.env.BASE_URL ?? "/").replace(/\/staff\/?$/, "/customer/")}`;
  const gaugeTxt =
    alloc > roomCap
      ? tr("{n} in types in a room of {room}", { n: num(alloc), room: num(roomCap) })
      : alloc + gl > roomCap
        ? tr("{n} in types · {sale} on sale · {gl} kept for the guest list — sales stop at {sale}, whichever type sells first", { n: num(alloc), sale: num(onSale), gl: num(gl) })
        : tr("{n} of {room} — {gl} kept for the guest list", { n: num(alloc), room: num(roomCap), gl: num(gl) });
  const lockLine = draft.frozen === "past" ? tr("{name} has happened, so nothing here can change.", { name: draft.name }) : draft.frozen === "cancelled" ? tr("{name} is cancelled, so nothing here can change.", { name: draft.name }) : tr("This show has tickets, so the date, times and room can't be edited here.");
  return {
    ed: {
      cols: nar ? "1fr" : "minmax(0,1fr) 360px",
      isNew: draft.id === null,
      frozen,
      name: { ...F("name"), errOn: tried && errs.name !== undefined, err: errs.name ?? "", fld: tried && errs.name !== undefined ? errFld : fld },
      slugHint: draft.name.trim() === "" ? "" : `${base.replace(/\/$/, "")}/events/${slug}`,
      support: F("support"),
      about: F("about"),
      date: F("date"),
      doors: F("doors"),
      stage: F("stage"),
      curfew: F("curfew"),
      refundTxt: F("refundTxt"),
      reentry: F("reentry"),
      bags: F("bags"),
      pubAt: F("onSale"),
      pubAtHint: hintOf(draft.onSale, zone),
      kinds: [
        ["gig", tr("Gig")],
        ["club", tr("Club night")],
        ["comedy", tr("Comedy")],
        ["talks", tr("Talks & workshops")],
      ].map(([id, label]) => ({ id, label, on: draft.kind === id, go: () => set({ kind: id! }), style: chip(draft.kind === id) })),
      timeErr: errs.time !== undefined,
      timeErrTxt: errs.time ?? "",
      tFld: `${errs.time !== undefined ? errFld : fld}font-family:var(--mono); font-size:13px;`,
      dateTxt: wd === "" ? "" : tr("That's a {day}.", { day: wd }),
      localTxt: tr("All times are {venue}'s local time.", { venue: w.settings.venueName }),
      lockWhen: lockWhen || frozen,
      lockOn: lockWhen || frozen,
      lockLine,
      postponeOn: lockWhen && !frozen,
      postpone: () => draft.id !== null && box.goShow(draft.id, "pc"),
      gl: { ...F("gl"), on: (e: { target: { value: string } }) => set({ gl: e.target.value.replace(/\D/g, "") }), errOn: errs.gl !== undefined, err: errs.gl ?? "", fld: errs.gl !== undefined ? errFld : fld },
      whenOn: !multi,
      daysOn: multi,
      days: (draft.days ?? []).map((x, i) => ({
        k: x.k,
        label: tr("Day {n}", { n: i + 1 }),
        date: { v: x.date, on: (e: { target: { value: string } }) => arr<DraftDay>("days", i, { date: e.target.value }) },
        gates: { v: x.gates, on: (e: { target: { value: string } }) => arr<DraftDay>("days", i, { gates: e.target.value }) },
        last: { v: x.last, on: (e: { target: { value: string } }) => arr<DraftDay>("days", i, { last: e.target.value }) },
        dateHint: x.date === "" ? "" : weekday(x.date),
      })),
      addDayOn: !frozen && !lockWhen && (draft.days?.length ?? 1) < 3,
      addDay: () => {
        if (draft.days === null) {
          const first: DraftDay = { k: key("d"), id: null, date: draft.date, gates: draft.doors, last: draft.curfew, curfew: draft.curfew };
          const nextDate = draft.date === "" ? "" : dateOf((ms(fromLocal(`${draft.date}T12:00`, zone)) ?? 0) + 86_400_000);
          set({ days: [first, { k: key("d"), id: null, date: nextDate, gates: draft.doors, last: draft.curfew, curfew: draft.curfew }], types: draft.types.map((t) => ({ ...t, days: [1, 2] })) });
        } else {
          const last = draft.days[draft.days.length - 1]!;
          const nextDate = last.date === "" ? "" : dateOf((ms(fromLocal(`${last.date}T12:00`, zone)) ?? 0) + 86_400_000);
          set({ days: [...draft.days, { k: key("d"), id: null, date: nextDate, gates: last.gates, last: last.last, curfew: last.curfew }] });
        }
      },
      rooms: w.rooms.map((r) => ({
        id: r.name,
        key: r.id,
        cap: `${num(r.capacity)}${r.note === null ? "" : ` (${r.note})`}`,
        on: draft.room === r.id,
        go: () => {
          if (!lockWhen) set({ room: r.id });
        },
        style: `display:flex; flex-direction:column; gap:3px; padding:12px 14px; border-radius:12px; text-align:start; cursor:${lockWhen || frozen ? "not-allowed" : "pointer"}; border:${draft.room === r.id ? "2px solid var(--accent)" : "1px solid var(--border-strong)"}; background:${draft.room === r.id ? "var(--accent-soft)" : "var(--surface)"}; color:var(--fg);`,
      })),
      p,
      pBg: draft.image !== null ? `background:url("${draft.image}") center/cover, var(--surface-3);` : p.bg,
      imgOn: draft.image !== null,
      genOn: draft.image === null,
      sysName: sysName[draft.style] ?? draft.style,
      posterErrOn: draft.posterError !== null,
      posterErr: draft.posterError ?? "",
      upload: (e: { target: { files: FileList | null; value: string } }) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (f === undefined) return;
        void box.pickPoster(f);
      },
      useGen: () => set({ image: null, posterError: null }),
      shuffle: () => set({ style: STYLES[(STYLES.indexOf(draft.style) + 1) % STYLES.length]! }),
      acts,
      addAct: () => set({ acts: [...draft.acts, { k: key("a"), id: null, name: "", s: "", e: "", day: 1, room: twoRooms ? (actRooms[0]?.id ?? null) : null }] }),
      setsOut: draft.sets,
      toggleSets: () => set({ sets: !draft.sets }),
      swTrack: setsSw.track,
      swKnob: setsSw.knob,
      wlOn: w.settings.waitlistOn,
      waitlist: draft.waitlist,
      toggleWl: () => set({ waitlist: !draft.waitlist }),
      wlTrack: wlSw.track,
      wlKnob: wlSw.knob,
      gaugeTxt,
      gaugeNum: `${num(alloc)} / ${num(roomCap)}`,
      gaugeBar: `display:block; width:${Math.min(100, (alloc / Math.max(1, roomCap)) * 100).toFixed(1)}%; background:${alloc > roomCap ? "var(--warn)" : "var(--accent)"};`,
      overOn: alloc > roomCap,
      overTxt: tr("The ticket types add up to more than the room. Sales stop at {n}, whichever type sells first.", { n: num(onSale) }),
      types,
      addType: () =>
        set({
          types: [
            ...draft.types,
            { k: key("t"), id: null, kind: "other", name: tr("New ticket type"), desc: "", free: false, price: "", pay: "both", cap: "0", start: "", end: "", vis: "public", min: "1", max: "6", sold: 0, held: 0, orig: null, selling: true, days: multi ? (draft.days ?? []).map((_, j) => j + 1) : [1] },
          ],
        }),
      qFeat: w.settings.questionsOn,
      qs,
      qEmpty: qs.length === 0,
      addQ: () => set({ qs: [...draft.qs, { k: key("q"), id: null, text: "", kind: "text", per: "order", required: false, options: [] }] }),
      ages: segO(
        [
          ["all", tr("All ages")],
          ["14_adult", tr("14+ with an adult")],
          ["16", tr("16+")],
          ["18", tr("18+ with ID")],
        ],
        draft.age,
        (v) => set({ age: v }),
      ),
      refunds: segO(
        [
          ["days", plural(refundDays, "Refunds until {n} day before", "Refunds until {n} days before")],
          ["none", sendOn ? tr("No refunds — send to a friend") : tr("No refunds")],
          ["custom", tr("Custom")],
        ],
        draft.refund,
        (v) => set({ refund: v as Draft["refund"] }),
      ),
      refundCustom: draft.refund === "custom",
      refundLine,
      pubs: segO(draft.wasPub ? [["published", tr("Published")]] : [["draft", tr("Draft")], ["published", tr("Published")]], draft.pub, (v) => set({ pub: v as Draft["pub"] })),
      schedOn: true,
      pubHint: `${draft.pub === "draft" ? tr("Only the box office can see a draft.") : tr("The page is public.")} ${tr("New ticket types start at the sale time; people who asked are reminded an hour before.")}`,
      pvs: (
        [
          ["desktop", tr("Desktop"), "monitor"],
          ["phone", tr("Phone"), "smartphone"],
        ] as [string, string, string][]
      ).map(([id, label, icon]) => ({ id: label, key: id, icon, on: (id === "phone") === pvPhone, go: () => box.set({ edPv: id as "desktop" | "phone" }), style: `${seg((id === "phone") === pvPhone)}display:inline-flex; align-items:center; gap:5px;` })),
      pvWrap: nar ? "display:flex; flex-direction:column; gap:10px;" : "position:sticky; inset-block-start:16px; display:flex; flex-direction:column; gap:10px;",
      pvNode: box.previewNode(draft, pvPhone, false),
      fullNode: s.edFull ? box.previewNode(draft, pvPhone, true) : null,
      fullOn: s.edFull,
      openFull: () => {
        app.remember();
        box.set({ edFull: true });
        setTimeout(() => document.getElementById("pv-back")?.focus(), 60);
      },
      closeFull: () => {
        box.set({ edFull: false });
        app.refocus();
      },
      fullPad: pvPhone ? "20px" : "0",
      dirty: s.edDirty && !frozen,
      discard: () => {
        box.set({ ed: null, edDirty: false, edTried: false });
        app.toast(tr("Changes discarded"), "undo-2");
      },
      saveLabel,
      saveOff: tried && hasErrors(errs),
      save: () => {
        if (hasErrors(errs)) {
          box.set({ edTried: true });
          setTimeout(() => document.getElementById(errs.first!)?.focus(), 40);
          return;
        }
        void box.saveEvent(draft, rowsOf(box, draft, zone));
      },
    },
  };
}

