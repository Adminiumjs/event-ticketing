/**
 * The venue as the screens read it, built from what Adminium answered: the
 * settings, the rooms, each show with its days, acts and ticket types, and
 * what is left of each type. Nothing here is worked out that Adminium
 * decides — a type's state (open, sold out, not on sale) and its count come
 * from the availability answer; the only arithmetic is choosing between the
 * states the page draws ("soon" or "sales closed" for a type not on sale,
 * from its own sales window).
 */
import type { Venue } from "../data/ports.ts";
import type { Id, Row, TypeLeft } from "../data/wire.ts";
import { ms } from "./fmt.ts";

export interface Room {
  id: Id;
  name: string;
  kind: string;
  note: string | null;
  access: string | null;
  capacity: number;
}

export interface Day {
  id: Id;
  day: number;
  doors: number;
  lastEntry: number | null;
  curfew: number | null;
}

export interface Act {
  id: Id;
  name: string;
  roomId: Id | null;
  day: number;
  start: number | null;
  end: number | null;
  position: number;
}

export interface Type {
  id: Id;
  name: string;
  /** The type's name up to its dash ("Balcony" for "Balcony — seated, unreserved"): how a line or a button names it. */
  short: string;
  kind: string;
  description: string | null;
  price: number;
  /** How many the type holds (a public fact: "Places 20"). */
  capacity: number | null;
  max: number;
  payDoor: boolean;
  payTransfer: boolean;
  salesStart: number | null;
  salesEnd: number | null;
  admits: number[];
  selling: boolean;
  position: number;
  /** A type behind a code (seen only once the code was typed). */
  unlocked: string | null;
}

export interface Show {
  id: Id;
  slug: string;
  name: string;
  short: string;
  support: string | null;
  kind: string;
  festival: boolean;
  room: Room | null;
  doors: number;
  start: number;
  curfew: number;
  ends: number;
  age: string;
  ageNote: string | null;
  about: string | null;
  image: string | null;
  posterStyle: string | null;
  onSaleAt: number | null;
  refundUntil: number | null;
  refundText: string | null;
  bags: string | null;
  reEntry: string | null;
  waitlistOn: boolean;
  setsPublished: boolean;
  cancelled: boolean;
  publishedAt: number | null;
  was: number | null;
  postponedAt: number | null;
  codeTypes: number;
  days: Day[];
  acts: Act[];
  types: Type[];
}

export interface Settings {
  venueName: string;
  address: string;
  contactEmail: string;
  gettingThere: string[];
  accessibility: string[];
  policies: string[];
  faq: { q: string; a: string }[];
  refundPayback: string;
  holdMinutes: number;
  offerHours: number;
  sendHours: number;
  remindLeadHours: number;
  transferDays: number;
  transferTime: string;
  transferCutoffDays: number;
  accountsOn: boolean;
  waitlistOn: boolean;
  sendOn: boolean;
  codesOn: boolean;
  timetableOn: boolean;
  questionsOn: boolean;
  doorOn: boolean;
  transferOn: boolean;
}

export interface World {
  settings: Settings;
  rooms: Room[];
  shows: Show[];
  byId: Map<Id, Show>;
  bySlug: Map<string, Show>;
  questions: Row[];
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);
const lines = (v: unknown): string[] =>
  (str(v) ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "");
const bool = (v: unknown, fallback: boolean): boolean => (v === true || v === 1 ? true : v === false || v === 0 ? false : fallback);
const n = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : fallback);

/** The words of a type's name up to its dash. */
export const shortOf = (name: string): string => name.split(/\s+[—–-]\s+/)[0] ?? name;

export function settingsOf(row: Row | undefined): Settings {
  const r = row ?? ({ id: 0 } as Row);
  return {
    venueName: str(r["venue_name"]) ?? "",
    address: str(r["address"]) ?? "",
    contactEmail: str(r["contact_email"]) ?? "",
    gettingThere: lines(r["getting_there"]),
    accessibility: lines(r["accessibility"]),
    policies: lines(r["policies"]),
    faq: (str(r["faq"]) ?? "")
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter((block) => block !== "")
      .map((block) => {
        const [q, ...a] = block.split("\n");
        return { q: q!.trim(), a: a.join(" ").trim() };
      }),
    refundPayback: str(r["refund_payback_text"]) ?? "",
    holdMinutes: n(r["hold_minutes"], 10),
    offerHours: n(r["offer_hours"], 12),
    sendHours: n(r["send_hours"], 48),
    remindLeadHours: n(r["remind_lead_hours"], 1),
    transferDays: n(r["transfer_days"], 3),
    transferTime: str(r["transfer_time"]) ?? "18:00",
    transferCutoffDays: n(r["transfer_cutoff_days"], 3),
    accountsOn: bool(r["accounts_on"], true),
    waitlistOn: bool(r["waitlist_on"], true),
    sendOn: bool(r["send_on"], true),
    codesOn: bool(r["codes_on"], true),
    timetableOn: bool(r["timetable_on"], true),
    questionsOn: bool(r["questions_on"], true),
    doorOn: bool(r["door_on"], true),
    transferOn: bool(r["transfer_on"], true),
  };
}

export function roomOf(r: Row): Room {
  return { id: r.id, name: String(r["name"] ?? ""), kind: String(r["kind"] ?? "room"), note: str(r["note"]), access: str(r["access_text"]), capacity: n(r["capacity"], 0) };
}

export function typeOf(r: Row, unlocked: string | null = null): Type {
  const name = String(r["name"] ?? "");
  const admits = [1, 2, 3].filter((d) => r[`admits_day${String(d)}`] === true || r[`admits_day${String(d)}`] === 1);
  return {
    id: r.id,
    name,
    short: shortOf(name),
    kind: String(r["kind"] ?? "other"),
    description: str(r["description"]),
    price: n(r["price"], 0),
    capacity: typeof r["capacity"] === "number" ? r["capacity"] : null,
    max: n(r["max_per_order"], 6),
    payDoor: bool(r["pay_door"], true),
    payTransfer: bool(r["pay_transfer"], true),
    salesStart: ms(r["sales_start"]),
    salesEnd: ms(r["sales_end"]),
    admits: admits.length > 0 ? admits : [1],
    selling: bool(r["selling"], true),
    position: n(r["position"], 0),
    unlocked,
  };
}

export function worldOf(venue: Venue, unlocked: Map<Id, { code: string; types: Row[] }>): World {
  const settings = settingsOf(venue.settings);
  const rooms = venue.rooms.map(roomOf);
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const shows: Show[] = venue.events.map((e) => {
    const extra = unlocked.get(e.id);
    const own = venue.types.filter((t) => t["event_id"] === e.id).map((t) => typeOf(t));
    const behind = (extra?.types ?? []).filter((t) => !own.some((o) => o.id === t.id)).map((t) => typeOf(t, extra!.code));
    const types = [...own, ...behind].sort((a, b) => a.position - b.position);
    const days = venue.days
      .filter((d) => d["event_id"] === e.id)
      .map((d) => ({ id: d.id, day: n(d["day"], 1), doors: ms(d["doors_at"]) ?? 0, lastEntry: ms(d["last_entry_at"]), curfew: ms(d["curfew_at"]) }))
      .sort((a, b) => a.day - b.day);
    const acts = venue.acts
      .filter((a) => a["event_id"] === e.id)
      .map((a) => ({ id: a.id, name: String(a["name"] ?? ""), roomId: (a["room_id"] as Id | null) ?? null, day: n(a["day"], 1), start: ms(a["starts_at"]), end: ms(a["ends_at"]), position: n(a["position"], 0) }))
      .sort((a, b) => a.day - b.day || (a.start ?? 0) - (b.start ?? 0) || a.position - b.position);
    const name = String(e["name"] ?? "");
    const start = ms(e["starts_at"]) ?? 0;
    const curfew = ms(e["curfew_at"]) ?? start + 3 * 3_600_000;
    return {
      id: e.id,
      slug: String(e["slug"] ?? e.id),
      name,
      short: str(e["short_name"]) ?? name,
      support: str(e["support"]),
      kind: String(e["kind"] ?? "gig"),
      festival: e["kind"] === "festival",
      room: roomById.get(e["room_id"] as Id) ?? null,
      doors: ms(e["doors_at"]) ?? start,
      start,
      curfew,
      ends: ms(e["ends_at"]) ?? curfew,
      age: String(e["age"] ?? "all"),
      ageNote: str(e["age_note"]),
      about: str(e["about"]),
      image: str(e["image"]),
      posterStyle: str(e["poster_style"]),
      onSaleAt: ms(e["on_sale_at"]),
      refundUntil: ms(e["refund_until"]),
      refundText: str(e["refund_text"]),
      bags: str(e["bags"]),
      reEntry: str(e["re_entry"]),
      waitlistOn: bool(e["waitlist_on"], false),
      setsPublished: bool(e["sets_published"], false),
      cancelled: e["status"] === "cancelled",
      publishedAt: ms(e["published_at"]),
      was: ms(e["was_starts_at"]),
      postponedAt: ms(e["postponed_at"]),
      codeTypes: n(e["code_types"], 0),
      days,
      acts,
      types,
    };
  });
  shows.sort((a, b) => a.start - b.start);
  return {
    settings,
    rooms,
    shows,
    byId: new Map(shows.map((s) => [s.id, s])),
    bySlug: new Map(shows.map((s) => [s.slug, s])),
    questions: venue.questions,
  };
}

/** A type's state on the page: Adminium's availability, told apart by the type's own sales window when not on sale. */
export type TypeState = "on" | "soldout" | "soon" | "ended" | "stopped" | "cancelled" | "past";

export function typeState(show: Show, type: Type, left: TypeLeft | undefined, now: number): TypeState {
  if (show.cancelled) return "cancelled";
  if (now > show.curfew) return "past";
  if (left === undefined) {
    // Not in the availability answer (a type behind a code): its own sales window says.
    if (type.salesStart !== null && now < type.salesStart) return "soon";
    if (type.salesEnd !== null && now >= type.salesEnd) return type.selling ? "ended" : "stopped";
    return type.selling ? "on" : "stopped";
  }
  if (left.state === "sold_out") return "soldout";
  if (left.state === "open") return "on";
  const opens = type.salesStart ?? show.onSaleAt;
  if (opens !== null && now < opens) return "soon";
  if (!type.selling) return "stopped";
  return "ended";
}
