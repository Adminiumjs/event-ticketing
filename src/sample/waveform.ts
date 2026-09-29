/**
 * Waveform's sample bundle (`adminium.sample/1`), built from the ledger's rows.
 *
 * `npm run sample` writes `seeds/events.sample.json` from this module — the
 * bundle an operator adds from Adminium — so a real install shows the same
 * venue the design draws and the figure tests pin.
 *
 * Dates move by whole days: every time is written as days from the adding day
 * at its own wall time, so Neon Circuit is tonight on the day the sample is
 * added (the ledger's Tuesday 28 July is "day 0"). The two things that must
 * run out on their own — a checkout held for ten minutes, a waitlist offer
 * held for twelve hours — are written as time from the adding moment instead.
 *
 * Order numbers carry an `S` (`WV-S8761`) and no running number, so a
 * venue's own first order is never one of them. Addresses end in
 * `.example`, which Adminium never mails. Adminium works out every price on a
 * ticket, every total and every figure again as it adds the rows; the bundle
 * gives only what a person would have typed or chosen, and when.
 */
import { LEDGER, type Ledger, type LedgerOrder, type LedgerShow, type Stamp } from "./ledger.ts";
import { ROOM_ACCESS, SHOW_WORDS, TYPE_WORDS, VENUE_WORDS } from "./words.ts";


type Value = string | number | boolean | null | Record<string, unknown> | unknown[];
type Row = Record<string, Value>;
export interface SampleBundle {
  format: "adminium.sample/1";
  app: string;
  assets: Record<string, never>;
  tables: { ref: string; rows: Row[] }[];
}

const DAY0 = Date.UTC(2026, 6, 28);

/** A wall time as days from the adding day at the same time of day. */
export function wall(at: Stamp): { "@day": number; "@time": string } {
  const [d, t] = at.split("T") as [string, string];
  const [y, m, day] = d.split("-").map(Number) as [number, number, number];
  return { "@day": Math.round((Date.UTC(y, m - 1, day) - DAY0) / 86_400_000), "@time": t };
}

/** A moment after the adding moment, for something that must run out on its own (the ledger's clock is 16:30). */
export function after(at: Stamp, now: Stamp): { "@in": string } {
  const minutes = Math.round((Date.parse(`${at}:00Z`) - Date.parse(`${now}:00Z`)) / 60_000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return { "@in": `PT${h > 0 ? `${String(h)}H` : ""}${m > 0 || h === 0 ? `${String(m)}M` : ""}` };
}

const opt = (at: Stamp | undefined) => (at === undefined ? null : wall(at));
/** A row's label: letters, digits and : . _ - only. */
const lab = (label: string) => label.replace(/[^A-Za-z0-9:._-]/g, "_");
const ref = (label: string) => ({ "@ref": lab(label) });
const slug = (name: string) => name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const AGE: Record<string, string> = { "All ages": "all", "14+ with an adult": "14_adult", "16+": "16", "18+": "18" };
const AGE_NOTE: Record<string, string> = {
  "All ages": "All ages.",
  "14+ with an adult": "14+ with an adult.",
  "16+": "It's 16+.",
  "18+": "It's 18+, so bring photo ID.",
};
const KIND: Record<string, string> = { early: "early", std: "standard", bal: "balcony", comp: "comp", wk: "pass", sat: "day", sun: "day", reg: "register", pre: "presale" };
const CODE_KIND: Record<string, string> = { Place: "place", Presale: "presale", Standard: "standard", "Weekend pass": "pass" };
const BROADCAST: Record<string, string> = { "Set times are up": "set_times", "Doors time changed": "doors", Cancelled: "cancelled", Postponed: "moved" };

/** "Sat 15 Aug": a date as the venue's messages print it. */
const dayWords = (at: Stamp): string => {
  const d = new Date(`${at.slice(0, 10)}T12:00:00Z`);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()]!;
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()]!;
  return `${weekday} ${String(d.getUTCDate())} ${month}`;
};

/** A moved show's message, as the box office wrote it when the show moved. */
function movedBody(s: LedgerShow, venue: string): string {
  const refunds = s.refund_until === undefined ? "" : `\n\nIf you can't make it, ask for a refund until ${dayWords(s.refund_until)} from My tickets, or reply to this email.`;
  return `Hi there,\n\n${s.name} has moved from ${dayWords(s.was ?? s.start)} to ${dayWords(s.start)}. Your tickets are valid for the new date — you don't need to do anything.${refunds}\n\nSorry for the change,\n${venue}`;
}

/** The festival's days: gates each day, last entry 21:30, curfew 22:00. */
function daysOf(s: LedgerShow): Row[] {
  if (s.day2_doors === undefined) {
    return [{ "@label": `day:${s.key}:1`, event_id: ref(`event:${s.key}`), day: 1, doors_at: wall(s.doors), last_entry_at: null, curfew_at: wall(s.curfew) }];
  }
  const last = s.last_entry ?? "21:30";
  const curfewTime = s.curfew.slice(11);
  const first = s.doors.slice(0, 10);
  const second = s.day2_doors.slice(0, 10);
  return [
    { "@label": `day:${s.key}:1`, event_id: ref(`event:${s.key}`), day: 1, doors_at: wall(s.doors), last_entry_at: wall(`${first}T${last}`), curfew_at: wall(`${first}T${curfewTime}`) },
    { "@label": `day:${s.key}:2`, event_id: ref(`event:${s.key}`), day: 2, doors_at: wall(s.day2_doors), last_entry_at: wall(`${second}T${last}`), curfew_at: wall(s.curfew) },
  ];
}

/**
 * A cancelled ticket on a show with a waitlist: its place is owed to the
 * waitlist ("returned"). A whole order cancelled gave both its places to the
 * offer still open; one ticket of a live order gave its place to an offer
 * already claimed, so that place is back on sale ("released").
 */
function ticketStatus(o: LedgerOrder, index: number): { status: string; cause: string | null } {
  const t = o.tickets[index]!;
  if (t.status !== "cancelled") return { status: t.status, cause: null };
  const s = LEDGER.shows.find((x) => x.key === o.show)!;
  if (s.cancelled_at !== undefined) return { status: "cancelled", cause: "show" };
  if (s.waitlist) return { status: o.status === "cancelled" ? "returned" : "released", cause: "buyer" };
  return { status: "cancelled", cause: "buyer" };
}

export function sampleBundle(ledger: Ledger = LEDGER): SampleBundle {
  const v = ledger.venue;
  const now = ledger.now;
  const settings: Row = {
    "@label": "settings",
    "@onlyIfEmpty": true,
    venue_name: v.name,
    address: v.address,
    contact_email: v.contact,
    bank_account_name: v.account_name,
    bank_name: v.bank_name,
    bank_account_number: v.account,
    bank_routing: v.routing,
    transfer_days: v.transfer_days,
    transfer_time: v.transfer_time,
    transfer_cutoff_days: v.cutoff_days,
    release_after_hours: v.release_after_hours,
    hold_minutes: v.hold_minutes,
    offer_hours: v.offer_hours,
    send_hours: v.friend_hours,
    refund_days: v.refund_days,
    check_in_minutes: v.check_in_minutes,
    remind_lead_hours: v.remind_lead_hours,
    ...VENUE_WORDS,
  };

  const rooms: Row[] = ledger.rooms.map((r, i) => ({
    "@label": `room:${r.key}`,
    name: r.name,
    capacity: r.capacity,
    kind: r.key === "both" ? "both" : "room",
    note: r.note ?? null,
    access_text: ROOM_ACCESS[r.key] ?? null,
    position: i,
  }));

  const events: Row[] = ledger.shows.map((s) => ({
    "@label": `event:${s.key}`,
    slug: slug(s.name),
    name: s.name,
    short_name: SHOW_WORDS[s.key]?.short_name ?? null,
    support: SHOW_WORDS[s.key]?.support ?? null,
    about: SHOW_WORDS[s.key]?.about ?? null,
    poster_style: SHOW_WORDS[s.key]?.poster_style ?? null,
    bags: SHOW_WORDS[s.key]?.bags ?? null,
    re_entry: SHOW_WORDS[s.key]?.re_entry ?? null,
    kind: s.kind,
    room_id: ref(`room:${s.room}`),
    doors_at: wall(s.doors),
    starts_at: wall(s.start),
    curfew_at: wall(s.curfew),
    ends_at: wall(s.curfew),
    age: AGE[s.age] ?? "all",
    age_note: AGE_NOTE[s.age] ?? null,
    eve_email: s.doors.slice(11) < "16:00",
    on_sale_at: wall(s.on_sale),
    refund_until: opt(s.refund_until),
    waitlist_on: s.waitlist,
    sets_published: s.key === "neon" || s.key === "fest",
    guest_places: s.guest_places,
    guest_list_closes_at: opt(s.guest_closes),
    status: s.cancelled_at === undefined ? "published" : "cancelled",
    published_at: wall(s.announced ?? s.on_sale),
    was_starts_at: opt(s.was),
    postponed_at: opt(s.postponed_at),
    cancelled_at: opt(s.cancelled_at),
  }));

  const eventDays: Row[] = ledger.shows.flatMap(daysOf);

  const acts: Row[] = Object.entries(ledger.acts).flatMap(([key, list]) => {
    const s = ledger.shows.find((x) => x.key === key)!;
    return list.map((a, i) => {
      const date = a.day === 1 ? s.doors.slice(0, 10) : (s.day2_doors ?? s.doors).slice(0, 10);
      return {
        event_id: ref(`event:${key}`),
        name: a.name,
        room_id: ref(`room:${a.room}`),
        day: a.day,
        starts_at: wall(`${date}T${a.start}`),
        ends_at: wall(`${date}T${a.end}`),
        position: i,
      };
    });
  });

  const types: Row[] = ledger.shows.flatMap((s) =>
    s.types.map((t, i) => ({
      "@label": `type:${s.key}:${t.key}`,
      event_id: ref(`event:${s.key}`),
      name: t.name,
      description: TYPE_WORDS[`${s.key}:${t.key}`] ?? null,
      kind: s.key === "studio" ? "place" : (KIND[t.key] ?? "other"),
      price: t.price,
      capacity: t.cap,
      max_per_order: t.max,
      visibility: t.vis,
      pay_door: t.pay.includes("door"),
      pay_transfer: t.pay.includes("transfer"),
      sales_start: opt(t.sales_start),
      admits_day1: t.days.includes(1),
      admits_day2: t.days.includes(2),
      position: i,
    })),
  );

  const codes: Row[] = ledger.codes.map((c) => ({
    "@label": `code:${c.code}`,
    code: c.code,
    kind: c.kind,
    value: c.value ?? null,
    event_id: c.show === undefined ? null : ref(`event:${c.show}`),
    room_id: c.room === undefined ? null : ref(`room:${c.room}`),
    type_kind: c.kind === "unlock" || c.type_name === undefined ? null : (CODE_KIND[c.type_name] ?? null),
    unlocks_type_id: c.unlocks === undefined || c.show === undefined ? null : ref(`type:${c.show}:${c.unlocks}`),
    max_uses: c.max_uses ?? null,
    valid_until: wall(c.until),
    active: c.on,
  }));

  // Everyone who ordered, waited or asked to be reminded, once each.
  const people = new Map<string, string>();
  for (const o of ledger.orders) if (o.email !== undefined && !people.has(o.email)) people.set(o.email, o.buyer);
  for (const w of ledger.waitlist) if (!people.has(w.email)) people.set(w.email, w.name);
  for (const list of Object.values(ledger.reminders)) for (const r of list) if (!people.has(r.email)) people.set(r.email, r.name);
  const customers: Row[] = [...people].map(([email, name]) => ({ "@label": lab(`customer:${email}`), email, name }));

  const questions: Row[] = ledger.studio_questions.map((q, i) => ({
    event_id: ref("event:studio"),
    text: q.text,
    kind: q.kind,
    options: q.options === undefined ? null : q.options.join("\n"),
    per: q.per,
    required: q.required,
    position: i,
  }));

  // The waitlist's offers: which order each claimed, missed or holds.
  const offerOf = new Map<string, number>();
  const velvet = ledger.orders.filter((o) => o.show === "velvet" && o.channel === "box_office");
  for (const w of ledger.waitlist) {
    const offer = velvet.filter((o) => o.buyer === w.name).at(-1);
    if (offer !== undefined) offerOf.set(w.name, offer.no);
  }
  // A show with a waitlist whose order was cancelled keeps the order: its places went to the waitlist.
  const cancelledOrders = new Set(ledger.orders.filter((o) => o.status === "cancelled" && ledger.shows.find((s) => s.key === o.show)!.waitlist).map((o) => o.no));

  const orders: Row[] = ledger.orders.map((o) => {
    const s = ledger.shows.find((x) => x.key === o.show)!;
    const status = cancelledOrders.has(o.no) ? "door" : o.status;
    const method = o.payments.at(-1)?.method ?? (o.collections.length > 0 ? o.collections.at(-1)!.method : null);
    const offerOwner = [...offerOf].find(([, no]) => no === o.no)?.[0];
    return {
      "@label": `order:${String(o.no)}`,
      number_seq: null,
      number: `WV-S${String(o.no)}`,
      status,
      event_id: ref(`event:${o.show}`),
      room_id: ref(`room:${s.room}`),
      customer_id: o.email === undefined ? null : ref(`customer:${o.email}`),
      buyer_name: o.buyer,
      email: o.email ?? null,
      channel: o.channel,
      language: "en-US",
      code_text: o.code ?? null,
      // The code Adminium found for what was typed, spelled so a load that skips the lookup keeps it.
      code_id: o.code === undefined ? null : ref(`code:${o.code}`),
      created_at: wall(o.placed),
      held_until: o.held_until === undefined ? null : o.status === "held" ? after(o.held_until, now) : wall(o.held_until),
      offer_until: o.offer_until === undefined ? null : o.status === "offered" ? after(o.offer_until, now) : wall(o.offer_until),
      pay_by: opt(o.pay_by),
      confirmed_at: opt(o.confirmed_at),
      // An order that chose the door had its tickets then: being paid later sends them again to nobody.
      door_at: status === "door" || status === "not_collected" ? opt(o.confirmed_at) : null,
      paid_at: opt(o.paid_at),
      cancelled_at: status === "cancelled" ? opt(o.cancelled_at) : null,
      cancel_cause: status === "cancelled" ? (s.cancelled_at !== undefined ? "show" : "buyer") : null,
      paid_method: o.status === "paid" ? method : null,
      waitlist_id: offerOwner === undefined ? null : ref(`waitlist:${offerOwner}`),
    };
  });

  const tickets: Row[] = ledger.orders.flatMap((o) =>
    o.tickets.map((t, i) => {
      const { status, cause } = ticketStatus(o, i);
      return {
        "@label": `ticket:${t.code}`,
        order_id: ref(`order:${String(o.no)}`),
        ticket_type_id: ref(`type:${o.show}:${t.type}`),
        status,
        holder_name: t.holder ?? null,
        code: t.code,
        answers: t.answers ?? null,
        position: i,
        cancel_cause: status === "cancelled" ? cause : null,
        cancelled_at: status === "cancelled" ? opt(t.cancelled_at ?? o.cancelled_at) : null,
        refund_asked_at: opt(t.refund_asked_at),
      };
    }),
  );

  const devices: Row[] = ledger.devices.map((name) => ({ "@label": lab(`device:${name}`), name }));

  const checkIns: Row[] = ledger.check_ins.map((c) => ({
    ticket_id: ref(`ticket:${c.ticket}`),
    event_day_id: ref(`day:${ledger.orders.find((o) => o.no === c.order)!.show}:${String(c.day)}`),
    scanned_at: wall(c.at),
    scanned_by: c.by,
    device_id: ref(`device:${c.device}`),
  }));

  const collections: Row[] = ledger.orders.flatMap((o) =>
    o.collections.map((c) => ({
      ticket_id: ref(`ticket:${c.ticket}`),
      method: c.method,
      device_id: ref(`device:${c.device}`),
      taken_at: wall(c.at),
      taken_by: c.by,
    })),
  );

  const payments: Row[] = ledger.orders.flatMap((o) =>
    o.payments.map((p) => ({ order_id: ref(`order:${String(o.no)}`), amount: p.amount, method: p.method, recorded_at: wall(p.at), recorded_by: p.by })),
  );

  const refunds: Row[] = ledger.orders.flatMap((o) =>
    o.refunds.map((r) => ({ order_id: ref(`order:${String(o.no)}`), amount: r.amount, kind: "cancelled_tickets", method: r.method, recorded_at: wall(r.at), recorded_by: r.by })),
  );

  const guests: Row[] = Object.entries(ledger.guests).flatMap(([key, list]) =>
    list.map((g) => ({ event_id: ref(`event:${key}`), name: g.name, plus: g.plus, on_behalf: g.on_behalf, note: g.note ?? null, added_by: "Priya" })),
  );

  const waitlist: Row[] = ledger.waitlist.map((w) => {
    const offer = offerOf.get(w.name);
    const order = offer === undefined ? undefined : ledger.orders.find((o) => o.no === offer);
    return {
      "@label": lab(`waitlist:${w.name}`),
      event_id: ref(`event:${w.show}`),
      customer_id: ref(`customer:${w.email}`),
      email: w.email,
      qty: w.qty,
      status: w.status,
      joined_at: wall(w.joined),
      offered_at: order === undefined ? null : wall(order.placed),
      offer_until: order?.offer_until === undefined ? null : w.status === "offered" ? after(order.offer_until, now) : wall(order.offer_until),
    };
  });

  const reminders: Row[] = Object.entries(ledger.reminders).flatMap(([key, list]) =>
    list.map((r) => ({ event_id: ref(`event:${key}`), customer_id: ref(`customer:${r.email}`), email: r.email, target: "sale" })),
  );

  const waiting = ledger.waiting_broadcast;
  const moved = ledger.shows.find((s) => s.key === waiting.show)!;
  const broadcasts: Row[] = [
    ...ledger.broadcasts.map((b) => ({
      event_id: ref(`event:${b.show}`),
      audience: "everyone",
      template: BROADCAST[b.template] ?? "other",
      subject: b.subject,
      body: b.subject,
      status: "sent",
      people: b.people,
      order_count: b.orders,
      sent_at: wall(b.sent_at),
      sent_by: b.by,
    })),
    // Written when the show moved, waiting for the box office to send it.
    {
      event_id: ref(`event:${waiting.show}`),
      audience: "everyone",
      template: BROADCAST[waiting.template] ?? "other",
      subject: waiting.subject,
      body: movedBody(moved, ledger.venue.name),
      status: "waiting",
      people: waiting.people,
      order_count: waiting.orders,
      sent_at: null,
      sent_by: null,
    },
  ];

  const tables: { ref: string; rows: Row[] }[] = [
    { ref: "settings", rows: [settings] },
    { ref: "rooms", rows: rooms },
    { ref: "events", rows: events },
    { ref: "event_days", rows: eventDays },
    { ref: "acts", rows: acts },
    { ref: "ticket_types", rows: types },
    { ref: "codes", rows: codes },
    { ref: "customers", rows: customers },
    { ref: "questions", rows: questions },
    // The waitlist before the orders its offers are.
    { ref: "waitlist", rows: waitlist },
    { ref: "orders", rows: orders },
    { ref: "tickets", rows: tickets },
    { ref: "devices", rows: devices },
    { ref: "check_ins", rows: checkIns },
    { ref: "door_collections", rows: collections },
    { ref: "payments", rows: payments },
    { ref: "refunds", rows: refunds },
    { ref: "guest_list", rows: guests },
    { ref: "reminders", rows: reminders },
    { ref: "broadcasts", rows: broadcasts },
  ];
  // An empty column is left out (it is empty anyway); a running number is spelled empty, so it stays off the real series.
  const trimmed = tables.map((table) => ({
    ref: table.ref,
    rows: table.rows.map((row) => Object.fromEntries(Object.entries(row).filter(([column, value]) => value !== null || column === "number_seq"))),
  }));
  return { format: "adminium.sample/1", app: "events", assets: {}, tables: trimmed };
}
