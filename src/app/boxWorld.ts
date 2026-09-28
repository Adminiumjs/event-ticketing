/**
 * The venue as the box office reads it: every show (drafts, cancelled and
 * past ones too), each with every ticket type (box-office-only and behind a
 * code as well), its money as Adminium totals it, and its guest list's size.
 * The audience's `World` shapes, widened.
 */
import type { Id, Row } from "../data/wire.ts";
import { ms } from "./fmt.ts";
import { worldOf, type Show, type Type, type World } from "./world.ts";

export interface BoxType extends Type {
  visibility: "public" | "code" | "box";
  min: number | null;
}

export interface BoxShow extends Show {
  types: BoxType[];
  status: "draft" | "published" | "cancelled";
  postponed: boolean;
  guestPlaces: number;
  guestCloses: number | null;
  sellLimit: number | null;
  roomCapacity: number | null;
  money: { received: number; refunded: number; owedDoor: number; owedTransfer: number; owedOverdue: number };
  row: Row;
}

export interface BoxWorld extends World {
  shows: BoxShow[];
  byId: Map<Id, BoxShow>;
  bySlug: Map<string, BoxShow>;
  settingsRow: Row;
  roomRows: Row[];
  typeRows: Row[];
  dayRows: Row[];
  actRows: Row[];
}

export interface BoxRows {
  settings: Row[];
  rooms: Row[];
  events: Row[];
  event_days: Row[];
  acts: Row[];
  ticket_types: Row[];
  questions: Row[];
}

const num = (v: unknown): number => (typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) : 0);
const numOrNull = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : num(v));

export function boxWorldOf(rows: BoxRows): BoxWorld {
  const venue = { settings: rows.settings[0] ?? ({ id: 0 } as Row), rooms: rows.rooms, events: rows.events, days: rows.event_days, acts: rows.acts, types: rows.ticket_types, questions: rows.questions };
  const w = worldOf(venue, new Map());
  const typeRow = new Map(rows.ticket_types.map((t) => [t.id, t]));
  const eventRow = new Map(rows.events.map((e) => [e.id, e]));
  const shows: BoxShow[] = w.shows.map((show) => {
    const e = eventRow.get(show.id)!;
    const types: BoxType[] = show.types.map((t) => {
      const r = typeRow.get(t.id)!;
      const vis = r["visibility"] === "code" || r["visibility"] === "box" ? r["visibility"] : "public";
      return { ...t, visibility: vis, min: numOrNull(r["min_per_order"]) };
    });
    return {
      ...show,
      types,
      status: e["status"] === "draft" || e["status"] === "cancelled" ? e["status"] : "published",
      postponed: e["was_starts_at"] !== null && e["was_starts_at"] !== undefined && e["status"] !== "cancelled",
      guestPlaces: num(e["guest_places"]),
      guestCloses: ms(e["guest_list_closes_at"]),
      sellLimit: numOrNull(e["sell_limit"]),
      roomCapacity: numOrNull(e["room_capacity"]),
      money: {
        received: num(e["received"]),
        refunded: num(e["refunded"]),
        owedDoor: num(e["owed_door"]),
        owedTransfer: num(e["owed_transfer"]),
        owedOverdue: num(e["owed_overdue"]),
      },
      row: e,
    };
  });
  return {
    ...w,
    shows,
    byId: new Map(shows.map((s) => [s.id, s])),
    bySlug: new Map(shows.map((s) => [s.slug, s])),
    settingsRow: venue.settings,
    roomRows: rows.rooms,
    typeRows: rows.ticket_types,
    dayRows: rows.event_days,
    actRows: rows.acts,
  };
}
