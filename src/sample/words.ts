/**
 * The venue's own words in the sample: each show's supporting acts, its
 * short name, what it is about, its poster style and its house rules; each
 * ticket type's line; each room's access line; the venue's pages (getting
 * there, access, policies, questions). They are the venue's words, written
 * once in one language, as a venue types them into its settings — the
 * screens translate their own sentences, never these.
 *
 * `faq` holds one question and its answer per block, question on the first
 * line, blocks separated by a blank line; `getting_there` one line per way
 * of getting there.
 */

export interface ShowWords {
  short_name?: string;
  support?: string;
  about: string;
  poster_style: string;
  bags?: string;
  re_entry?: string;
}

const BAGS = "Small bags only — nothing bigger than a sheet of A4. No large backpacks.";
const RE_ENTRY = "No re-entry after 22:00. Before that, get a stamp on the way out.";

export const SHOW_WORDS: Record<string, ShowWords> = {
  paper: { support: "Juno Park", about: "A last loud night before Paper Moons go back into the studio.", poster_style: "stripes", bags: BAGS, re_entry: RE_ENTRY },
  neon: {
    support: "Kiri Vale · Tessellate",
    about:
      "Neon Circuit play long, patient sets that start as a hum and end with a room that won't sit still. It's their only club night here this summer. The system is loud, the room is warm, and the balcony is there if you'd rather watch.",
    poster_style: "rings",
    bags: BAGS,
    re_entry: RE_ENTRY,
  },
  velvet: { support: "Juno Park", about: "An acoustic evening: two voices, one guitar and a cello, in the smaller room with the lights down.", poster_style: "grain", bags: BAGS, re_entry: RE_ENTRY },
  dust: { support: "Low Orbit", about: "Dust Parade have had to cancel their summer shows.", poster_style: "stripes", bags: BAGS, re_entry: RE_ENTRY },
  low: {
    short_name: "Low Ceiling",
    support: "Bea Marsh (host) · Tom Idowu · Ruth Adeyemi · Dev Kalra",
    about: "Four comics trying out things that might not work yet. Some of it will be great. That's the deal.",
    poster_style: "glyph",
    bags: BAGS,
    re_entry: RE_ENTRY,
  },
  listen: {
    short_name: "First Listen",
    about:
      "Played front to back, with the band in the room. Hollow Tide play their new record through the big speakers before anyone else hears it, then stay for questions.",
    poster_style: "dots",
    bags: BAGS,
    re_entry: "Come and go as you like.",
  },
  studio: {
    support: "producer Lena Brandt",
    about:
      "A workshop. Four hours on getting a good recording at home: rooms, microphones, levels and a clean mix. Bring headphones. Laptops welcome but not needed.",
    poster_style: "rings",
    bags: "Small bags only.",
    re_entry: "Come and go as you like.",
  },
  cinder: { support: "Ossie Wren · Hana Kobe", about: "Six hours, three selectors, one very long build. Cinder close the summer season in the Main Hall.", poster_style: "stripes", bags: BAGS, re_entry: RE_ENTRY },
  hollow: { support: "Wren & Wire", about: "Hollow Tide bring the new record to the Main Hall with a full band and strings.", poster_style: "grain", bags: BAGS, re_entry: RE_ENTRY },
  static: { support: "Maren · Soft Arcade", about: "Static Bloom play their first headline show in two years, with the new songs and the old loud ones.", poster_style: "glyph", bags: BAGS, re_entry: RE_ENTRY },
  fest: { about: "Two days in both rooms: fourteen acts, short changeovers, and food in the yard.", poster_style: "dots", bags: BAGS, re_entry: "Come and go as you like — keep your wristband on." },
  quiet: { support: "Sofie Lund", about: "Quiet Engines return with a record made in a lighthouse. It sounds like one.", poster_style: "rings", bags: BAGS, re_entry: RE_ENTRY },
  pale: { short_name: "Pale Harbour", support: "hosted by Nell Achterberg", about: "Six people, ten minutes each, one true story. No notes allowed.", poster_style: "dots", bags: BAGS, re_entry: RE_ENTRY },
  marrow: { support: "Tidal Tongue", about: "Marrow & Salt: close harmony, a double bass and a lot of stories between songs.", poster_style: "glyph", bags: BAGS, re_entry: RE_ENTRY },
};

/** A ticket type's line, by the show and the type's key. */
export const TYPE_WORDS: Record<string, string> = {
  "paper:std": "General admission, standing.",
  "neon:early": "In before 20:30, with a drink on us.",
  "neon:std": "General admission, standing.",
  "neon:bal": "Upstairs seats, first come, first served.",
  "neon:comp": "Box office only — for the bands and crew, from the spare capacity.",
  "velvet:std": "General admission. A few chairs at the back.",
  "dust:std": "General admission, standing.",
  "low:std": "Unreserved seats in rows.",
  "listen:reg": "One place each. Up to 2 per person.",
  "studio:std": "A seat at the workshop, coffee and notes.",
  "cinder:early": "In before 22:30.",
  "cinder:std": "General admission, standing.",
  "cinder:bal": "Upstairs seats, first come, first served.",
  "hollow:std": "General admission, standing.",
  "hollow:bal": "Upstairs seats, first come, first served.",
  "static:pre": "Early tickets for the mailing list.",
  "static:std": "General admission, standing.",
  "static:bal": "Upstairs seats, first come, first served.",
  "fest:wk": "Both days, both rooms.",
  "fest:sat": "Saturday, both rooms.",
  "fest:sun": "Sunday, both rooms.",
  "quiet:std": "General admission, standing.",
  "quiet:bal": "Upstairs seats, first come, first served.",
  "pale:std": "Unreserved seats.",
  "marrow:std": "General admission, standing.",
};

/** Each room's access line. */
export const ROOM_ACCESS: Record<string, string> = {
  main: "Level access through the main doors and a lift to the balcony. Companion tickets are no charge — tell us at checkout.",
  annex: "Level access; accessible toilet on the ground floor. Companion tickets are no charge — tell us at checkout.",
  both: "Level access through the main doors and into The Annex; a lift goes to the balcony. Companion tickets are no charge — tell us at checkout.",
};

/** The venue's pages. */
export const VENUE_WORDS = {
  getting_there: [
    "Buses 12 and 40 stop outside on Foundry Lane.",
    "Canal Street station is a 6-minute walk.",
    "Bike racks in the yard. No parking at the venue.",
  ].join("\n"),
  accessibility: [
    "Level access through the main doors. A lift goes to the balcony. Accessible toilets on both floors.",
    "Companion tickets are no charge. Tell us at checkout or email hello@waveform.example.",
  ].join("\n"),
  policies: ["Bags and re-entry follow each show, shown on its page.", "Cloakroom by the main doors, $2.00 per item."].join("\n"),
  faq: [
    "Can I buy on the door?\nUsually, if there are tickets left. Pay-at-the-door tickets are card or cash.",
    "Is there a cloakroom?\nYes, by the main doors. $2.00 per item, card or cash.",
  ].join("\n\n"),
};
