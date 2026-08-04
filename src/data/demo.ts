/**
 * Seeded demo data — Waveform, a fictional independent music venue with two
 * rooms and a small weekend festival.
 *
 * Everything here is invention, written so the box office looks like a real
 * week rather than a fixture: one show nearly sold out, one gone entirely, one
 * whose sale has not opened, two anonymous carts holding tickets right now,
 * and an early-entry line that has already scanned ten people by the time
 * doors open — so the door counter has history the moment it is switched on.
 *
 * The six shows and their ticket types are hand-written. The ~1,000 orders
 * behind them are GENERATED, deterministically, from a seeded PRNG: a
 * thousand hand-typed names would be a thousand chances to typo an e-mail
 * address, and the generator gives every machine the same fiction anyway.
 * Nothing in here reads `Date.now()` — see `NOW`.
 *
 * Translatable prose (the kind of night, the room, descriptions, ticket-type
 * names and notes) is stored as an i18n KEY, not as English; `lib/format.ts`'s
 * `label()` resolves it. Proper nouns — show names, act names, people's names,
 * e-mail addresses — are never translated and are stored literally.
 *
 * The DataSource seam (`data/source.ts`) is what a real deployment replaces;
 * this module is what it replaces it *with* in demo mode.
 */

import {
  atMinute,
  daySerial,
  fnv1a,
  mulberry32,
  ticketCode,
  typeById,
} from "../lib/tickets.ts";
import type { Buyer, Hold, Order, Show, Ticket } from "./types.ts";

/**
 * The pinned clock: Tuesday, 28 July 2026, 16:30 — a few hours before the
 * featured show's 20:00 doors. Nothing user-visible reads the real clock; the
 * hold countdown is the single exception and it ticks a stored offset, not a
 * wall-clock time.
 */
export const NOW = atMinute(2026, 7, 28, 16, 30);

/** The show the site opens on, and the one the organizer's tabs default to. */
export const FEATURED = "neon";

/** The two-week window the sales-pace chart draws. */
export const PACE_DAYS = 14;

export const SHOWS: Show[] = [
  {
    id: "neon",
    name: "Neon Circuit",
    sub: "data.sub.club",
    room: "data.room.main",
    date: daySerial(2026, 7, 28),
    doors: 20 * 60,
    start: 21 * 60,
    end: 23 * 60 + 45,
    saleStart: atMinute(2026, 6, 26, 10, 0),
    icon: "music",
    art: ["--art-a1", "--art-a2"],
    chip: "WV·JUL28",
    desc: "data.desc.neon",
    lineup: ["Volt Arcade", "Kessler Twins", "Mirror Phase (DJ set)"],
    types: [
      { id: "ne", name: "data.tt.early", note: "data.note.neon.early", price: 2200, cap: 80 },
      { id: "ns", name: "data.tt.standard", note: "data.note.neon.standard", price: 2800, cap: 260 },
      { id: "nb", name: "data.tt.balcony", note: "data.note.balcony", price: 3400, cap: 70 },
    ],
  },
  {
    id: "velvet",
    name: "Velvet Hour",
    sub: "data.sub.acoustic",
    room: "data.room.annex",
    date: daySerial(2026, 7, 30),
    doors: 19 * 60,
    start: 19 * 60 + 45,
    end: 22 * 60 + 30,
    saleStart: atMinute(2026, 7, 2, 10, 0),
    icon: "mic-vocal",
    art: ["--art-b1", "--art-b2"],
    chip: "WV·JUL30",
    desc: "data.desc.velvet",
    lineup: ["June Marlowe", "Hollis & the Quiet", "Petra Lune"],
    types: [
      { id: "ve", name: "data.tt.early", note: "data.note.velvet.early", price: 2600, cap: 40 },
      { id: "vs", name: "data.tt.standard", note: "data.note.velvet.standard", price: 3000, cap: 120 },
      { id: "vp", name: "data.tt.supporter", note: "data.note.velvet.supporter", price: 4000, cap: 30 },
    ],
  },
  {
    id: "cinder",
    name: "Cinder",
    sub: "data.sub.release",
    room: "data.room.main",
    date: daySerial(2026, 7, 31),
    doors: 22 * 60,
    start: 22 * 60 + 30,
    end: 3 * 60,
    saleStart: atMinute(2026, 7, 3, 10, 0),
    icon: "flame",
    art: ["--art-c1", "--art-c2"],
    chip: "WV·JUL31",
    desc: "data.desc.cinder",
    lineup: ["Cinder", "Ash Motif", "Kiln"],
    types: [
      { id: "ce", name: "data.tt.early", note: "data.note.cinder.early", price: 1900, cap: 90 },
      { id: "cs", name: "data.tt.standard", note: "data.note.cinder.standard", price: 2400, cap: 300 },
      { id: "cb", name: "data.tt.balcony", note: "data.note.balcony", price: 3000, cap: 60 },
    ],
  },
  {
    id: "static",
    name: "Static Bloom",
    sub: "data.sub.club",
    room: "data.room.main",
    date: daySerial(2026, 8, 1),
    doors: 21 * 60,
    start: 22 * 60,
    end: 2 * 60 + 30,
    saleStart: atMinute(2026, 6, 20, 10, 0),
    icon: "zap",
    art: ["--art-d1", "--art-d2"],
    chip: "WV·AUG01",
    desc: "data.desc.static",
    lineup: ["Static Bloom", "Fern Haze", "Glasshouse"],
    types: [
      { id: "se", name: "data.tt.early", note: "data.note.static.early", price: 2000, cap: 60 },
      { id: "ss", name: "data.tt.standard", note: "data.note.static.standard", price: 2600, cap: 200 },
      { id: "sb", name: "data.tt.balcony", note: "data.note.balcony", price: 3200, cap: 50 },
    ],
  },
  {
    id: "hollow",
    name: "Hollow Tide",
    sub: "data.sub.club",
    room: "data.room.annex",
    date: daySerial(2026, 8, 8),
    doors: 21 * 60,
    start: 21 * 60 + 30,
    end: 2 * 60,
    /* The one sale that has not opened yet against the pinned clock. */
    saleStart: atMinute(2026, 8, 1, 10, 0),
    icon: "waves",
    art: ["--art-e1", "--art-e2"],
    chip: "WV·AUG08",
    desc: "data.desc.hollow",
    lineup: ["Hollow Tide", "Saltmark", "Undertow"],
    types: [
      { id: "he", name: "data.tt.early", note: "data.note.hollow.early", price: 2000, cap: 70 },
      { id: "hs", name: "data.tt.standard", note: "data.note.hollow.standard", price: 2600, cap: 240 },
      { id: "hb", name: "data.tt.balcony", note: "data.note.balcony", price: 3200, cap: 60 },
    ],
  },
  {
    id: "week",
    name: "Waveform Weekender",
    sub: "data.sub.festival",
    room: "data.room.both",
    date: daySerial(2026, 8, 15),
    date2: daySerial(2026, 8, 16),
    doors: 15 * 60,
    start: 16 * 60,
    end: 23 * 60,
    saleStart: atMinute(2026, 5, 30, 10, 0),
    icon: "sparkles",
    art: ["--art-f1", "--art-f2"],
    chip: "WV·AUG15+16",
    desc: "data.desc.week",
    lineup: [
      "Volt Arcade",
      "June Marlowe",
      "Static Bloom",
      "Kiln",
      "Petra Lune",
    ],
    types: [
      { id: "wp", name: "data.tt.weekend", note: "data.note.week.weekend", price: 8500, cap: 420 },
      { id: "wa", name: "data.tt.saturday", note: "data.note.week.day", price: 4800, cap: 300 },
      { id: "wu", name: "data.tt.sunday", note: "data.note.week.day", price: 4800, cap: 300 },
    ],
  },
];

/* ------------------------------------------------------------ the audience */

const FIRST_NAMES = [
  "Ana", "Mia", "Liam", "Noah", "Sofia", "Jonas", "Ella", "Ruben", "Nora",
  "Iris", "Felix", "Lena", "Marco", "Tessa", "Owen", "Kai", "Zoe", "Theo",
  "Alba", "Milan", "Esme", "Aldo", "Bo", "Nell", "Sasha", "Ines",
];

const LAST_NAMES = [
  "Ruiz", "Okada", "Berg", "Silva", "Novak", "Haas", "Moreau", "Vance", "Kim",
  "Petit", "Sato", "Vega", "Marsh", "Costa", "Iversen", "Dahl", "Rios", "Blom",
  "Kade", "Ferreira", "Lindqvist", "Adeyemi", "Horvat", "Nakamura", "Quint",
  "Baros",
];

/**
 * The two named buyers the demo points at by hand. Generated people are
 * steered away from these exact spellings below, so "mia.okada@example.com"
 * always resolves to the two tickets the My-tickets hint promises and not to
 * a stranger the RNG happened to name the same thing.
 */
export const DEMO_BUYER: Buyer = { name: "Mia Okada", email: "mia.okada@example.com" };
const SECOND_BUYER: Buyer = { name: "Ana Ruiz", email: "ana.ruiz@example.com" };

function person(rnd: () => number): Buyer {
  const first = FIRST_NAMES[Math.floor(rnd() * FIRST_NAMES.length)];
  let last = LAST_NAMES[Math.floor(rnd() * LAST_NAMES.length)];
  if ((first === "Mia" && last === "Okada") || (first === "Ana" && last === "Ruiz")) {
    last = "Vance";
  }
  return {
    name: `${first} ${last}`,
    email: `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "") + "@example.com",
  };
}

/* --------------------------------------------------------- the sales ledger */

/**
 * How many tickets of each type have gone. These numbers ARE the story:
 * Velvet Hour is down to fifteen across three ticket types, Static Bloom is
 * flat sold out, Hollow Tide has not opened, and the featured show has sold a
 * comfortable forty out of four hundred and ten.
 */
const SOLD_SO_FAR: Record<string, Record<string, number>> = {
  neon: { ne: 13, ns: 19, nb: 5 },
  velvet: { ve: 36, vs: 109, vp: 30 },
  cinder: { ce: 41, cs: 96, cb: 12 },
  static: { se: 60, ss: 200, sb: 50 },
  hollow: {},
  week: { wp: 175, wa: 88, wu: 74 },
};

/** Static Bloom sold out days ago; everything else sells right up to the clock. */
const SALE_CUTOFF: Record<string, number> = {
  static: atMinute(2026, 7, 24, 12, 0),
};

interface DraftOrder {
  evId: string;
  tt: string;
  /** Set when one order spans two ticket types, one entry per holder. */
  mix?: string[];
  buyer: Buyer;
  holders: string[];
  soldAt: number;
}

function buildLedger(): {
  orders: Order[];
  tickets: Ticket[];
  holds: Hold[];
  nextSeq: number;
} {
  const drafts: DraftOrder[] = [];

  for (const show of SHOWS) {
    const target = SOLD_SO_FAR[show.id] ?? {};
    /* One RNG per show, seeded by its id — adding a show cannot reshuffle the
     * others' buyers, which would churn every assertion in the test suite. */
    const rnd = mulberry32(fnv1a(`seed:${show.id}`));
    const cutoff = SALE_CUTOFF[show.id] ?? NOW - 45;

    for (const type of show.types) {
      let left = target[type.id] ?? 0;
      while (left > 0) {
        const roll = rnd();
        let qty = roll < 0.62 ? 1 : roll < 0.9 ? 2 : 3;
        if (qty > left) qty = left;

        const buyer = person(rnd);
        const span = Math.max(60, cutoff - show.saleStart);
        /* Pace ramps toward the show rather than running flat: the exponent
         * bunches sales into the last stretch, which is what the pace chart
         * is there to show. */
        const soldAt = show.saleStart + Math.floor(Math.pow(rnd(), 0.7) * span);

        const holders = [buyer.name];
        for (let g = 1; g < qty; g += 1) holders.push(person(rnd).name);

        drafts.push({ evId: show.id, tt: type.id, buyer, holders, soldAt });
        left -= qty;
      }
    }
  }

  /* The two orders the demo reaches for by name: Mia's pair spans two ticket
   * types (so the wallet shows two different ones), Ana's single is the
   * scanner's "valid code" sample. */
  drafts.push({
    evId: "neon",
    tt: "ne",
    mix: ["ne", "ns"],
    buyer: DEMO_BUYER,
    holders: ["Mia Okada", "Rafael Okada"],
    soldAt: atMinute(2026, 7, 20, 11, 24),
  });
  drafts.push({
    evId: "neon",
    tt: "ns",
    buyer: SECOND_BUYER,
    holders: ["Ana Ruiz"],
    soldAt: atMinute(2026, 7, 24, 18, 2),
  });

  /* Order numbers run in the order the orders were placed, and the last one
   * is WV-8814 — so the first live checkout mints WV-8815. */
  drafts.sort((a, b) => a.soldAt - b.soldAt || (a.evId < b.evId ? -1 : 1));
  const firstSeq = 8814 - drafts.length + 1;

  const orders: Order[] = [];
  const tickets: Ticket[] = [];

  drafts.forEach((draft, i) => {
    const code = `WV-${firstSeq + i}`;
    const show = SHOWS.find((s) => s.id === draft.evId) as Show;
    const issued: Ticket[] = draft.holders.map((holder, j) => ({
      code: ticketCode(code, j),
      evId: draft.evId,
      tt: draft.mix?.[j] ?? draft.tt,
      holder,
      buyer: draft.buyer,
      orderCode: code,
      soldAt: draft.soldAt,
      checkedInAt: null,
    }));

    tickets.push(...issued);
    orders.push({
      code,
      evId: draft.evId,
      buyer: draft.buyer,
      placedAt: draft.soldAt,
      total: issued.reduce(
        (cents, t) => cents + (typeById(show, t.tt)?.price ?? 0),
        0,
      ),
      tickets: issued.map((t) => t.code),
    });
  });

  /*
   * The early-entry line. Ten people are already inside by 19:58 — Mia at
   * 19:42 because the My-tickets screen shows a checked-in wallet card, and
   * nine more scattered across 19:31–19:58. All of it is in the FUTURE at the
   * pinned 16:30 clock, so the door reads zero until the dock advances; the
   * history appears the moment doors open, which is the point.
   */
  const lineRnd = mulberry32(fnv1a("checkins"));
  const lineStart = daySerial(2026, 7, 28) * 1440 + 19 * 60 + 31;
  let scanned = 0;
  for (const ticket of tickets) {
    if (ticket.evId !== "neon" || ticket.tt !== "ne") continue;
    if (ticket.buyer.email === DEMO_BUYER.email) {
      ticket.checkedInAt = daySerial(2026, 7, 28) * 1440 + 19 * 60 + 42;
      continue;
    }
    if (scanned < 9) {
      ticket.checkedInAt = lineStart + Math.floor(lineRnd() * 27);
      scanned += 1;
    }
  }

  /*
   * Two strangers' carts, holding featured tickets right now. They are what
   * makes "held in carts" a non-zero number on the organizer's sales screen,
   * and they expire four and seven minutes after the pinned clock — so
   * advancing the demo visibly hands three tickets back.
   */
  const holds: Hold[] = [
    {
      id: "H-SEED1",
      evId: "neon",
      lines: [{ tt: "ns", qty: 2 }],
      startedAt: NOW - 3,
      expiresAt: NOW + 7,
      mine: false,
    },
    {
      id: "H-SEED2",
      evId: "neon",
      lines: [{ tt: "ne", qty: 1 }],
      startedAt: NOW - 6,
      expiresAt: NOW + 4,
      mine: false,
    },
  ];

  return { orders, tickets, holds, nextSeq: 8815 };
}

const LEDGER = buildLedger();

export const ORDERS: Order[] = LEDGER.orders;
export const TICKETS: Ticket[] = LEDGER.tickets;
export const HOLDS: Hold[] = LEDGER.holds;

/** The next order number to mint. The seed ends WV-8814. */
export const NEXT_SEQ = LEDGER.nextSeq;
