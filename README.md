# Event Ticketing

A complete, production-shaped box office — built with Vite + React +
TypeScript, no CSS framework, no backend required. It's an example app that
ships with [Adminium](https://adminium.dev): browse a room's upcoming shows,
hold three tickets for ten minutes, check out, carry the wallet cards on your
phone, then flip to the organizer and work the door as the queue comes in —
all from built-in demo data.

It is **not** an admin database UI. Full-table CRUD, imports, settlements and
refunds live in the dashboard Adminium generates from your schema; this is the
audience's evening and the box office's view of it. Every screen says so where
it matters, rather than offering a "New record" button that would lie.

The demo is dressed as **Waveform**, a fictional independent music venue with
two rooms and one small weekend festival, so the shows, orders and the
early-entry line read like a Tuesday already half sold rather than lorem ipsum.

**Live demo → [adminium.dev/demo/event-ticketing](https://adminium.dev/demo/event-ticketing)**

## What it does

- **Two personas in one build.** The demo dock switches between an attendee
  buying tickets and an organizer watching them go. The loop closes across the
  switch: start a hold as the attendee, switch to Organizer, and "held in
  carts" has already moved. Buy the tickets and they turn up on the door's
  attendee list under the names you typed.

- **A real ticket engine.** [`src/lib/tickets.ts`](src/lib/tickets.ts) is a
  pure, React-free module: per-ticket-type inventory, ten-minute cart holds
  evaluated against a clock that is always passed in, a six-per-order cap,
  on-sale states derived from the calendar, order-number minting, four
  check-in verdicts and a door count that is derived from the check-in list
  rather than stored next to it. Nothing is pre-computed, because a stored
  "remaining" is a number that goes wrong the moment somebody's cart expires —
  and expiry is not an event this app can observe, it is a comparison. 182
  assertions across 57 cases in
  [`tickets.test.ts`](src/lib/tickets.test.ts) run against the shipped seed.

- **Holds you can watch work.** "Get tickets" drops the remaining counts
  instantly. A mono countdown follows you into checkout. Let it run out and the
  tickets go back on sale with a gentle toast that says nothing was charged —
  which is the same code path the organizer's "held in carts" figure reads.

- **A door that is honest before it opens.** Check-in opens thirty minutes
  before doors, and until then the scanner is not a scanner: it says doors
  aren't open, names the minute they are, and offers the demo's own way of
  getting there. Once open, four sample codes are labelled by *what they
  demonstrate* — a good one, an already-scanned one, another night's, and one
  that was never issued.

- **General admission, on purpose.** No seat maps, no reserved seating, no
  floor plans anywhere. The different kinds of ticket are **ticket types** —
  never "tiers" — in every label, heading and piece of alt text, in all eight
  locales.

- **Eight languages, including a right-to-left one.** English, German, French,
  Czech, Danish, Simplified and Traditional Chinese, and Egyptian Arabic. The
  seeded fiction is translated too, not just the chrome, so a locale switch
  does not leave an English island inside a translated screen. Plurals go
  through `Intl.PluralRules` in each locale's own CLDR order — Czech gets its
  three forms, Arabic its six.

- **RTL by construction.** Every positional rule in the stylesheets is a CSS
  logical property, so stamping `dir="rtl"` on `<html>` mirrors the site
  header, the event art's date tile and chip, the door's marker gutter and the
  demo dock with no second stylesheet. Prices, times and ticket codes are
  isolated so the bidi algorithm cannot reorder their digits.

- **Light / dark themes** via CSS custom properties. The app follows your
  operating system on first load; the header's sun/moon toggle latches it. The
  magenta accent lightens in dark and pairs with a near-black foreground so
  both themes clear AA.

- **A pinned clock.** Nothing user-visible reads `Date.now()`. "Now" is
  Tuesday 28 July 2026, 16:30 — a few hours before the featured show's 20:00
  doors — so every machine sees the same nearly-sold-out Thursday and the same
  ten people waiting to come through the early-entry line. The only thing that
  moves is a live hold's countdown, and it counts intervals, not wall time.

- **No bitmaps, no external requests.** Event art is layered gradients from
  per-show tints under an oversized Lucide glyph. The wallet tickets' QR codes
  are deterministic fiction: a 17×17 grid hashed from the ticket code, with
  finder squares in three corners, drawn as inline SVG — shipping a QR library
  to encode a demo ticket that opens nothing would be a strange trade. Fonts
  are self-hosted woff2. The app works offline and behind a firewall.

## Local development

```bash
npm install
```

```bash
npm run dev
```

Then open the URL Vite prints (default http://localhost:5173).

### Driving the demo

The dock in the corner is the demo. Everything else is the product.

| Control | What it does |
| --- | --- |
| **Attendee / Organizer** | Switches persona. The loop closes across it — this is the thing to show. |
| **Clock** | The pinned "now", read by every screen and every engine call. |
| **Advance to doors** | Jumps to the next show's doors. On-sale states flip, expired holds release, and door check-in opens. |
| **Language** | Eight locales, including Arabic, which flips the whole layout to RTL. |
| **Theme** | Latches light or dark over the OS preference. |
| **Reset** | Puts the seeded box office back the way it started. |

A ninety-second tour: **Neon Circuit** → two Early entry and one Balcony →
*Get tickets* → watch the remaining counts drop and the countdown appear →
check out with a name, an email and one guest's name → three wallet cards,
order **WV-8815** → switch to **Organizer**: sold is up by three and "held in
carts" is back to the two strangers' carts → **Advance to doors** → **Door**:
ten people already came through the early-entry line → tap *A good one* → the
counter reads **11 of 43 issued** → tap *Already scanned* and it names the
original time.

## Deploy

- **Vercel** — import the repo. Build command `npm run build`, output `dist`.
- **DigitalOcean App Platform** — import the repo; it builds with the same
  command.
- **Host anywhere** — `npm run build` produces a fully static `dist/` you can
  drop on any static host (Netlify, Cloudflare Pages, S3, GitHub Pages…). Or
  build the container:

  ```bash
  docker build -t event-ticketing .
  ```

### Build scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server. |
| `npm run build` | Type-check + build to `dist/` at base `/` (root deploys). |
| `npm run build:demo` | Build to `dist/` at base `/demo/event-ticketing/` (Adminium demo). |
| `npm run preview` | Preview a production build locally. |
| `npm test` | Run the ticket engine suite. |

## The split: the box office and the back office

The app you deploy is **the venue's box office**. The dashboard Adminium
generates from your schema is **the back office**. That is the product story,
not a limitation:

| In this app | In the generated dashboard |
| --- | --- |
| Browsing shows, holding and buying tickets | Every table as records, with full CRUD |
| The wallet, looked up by the buyer's email | Refunds, exchanges and settlements |
| Sold / held / remaining for tonight | Reporting across seasons and rooms |
| One door, one scanner, one list | Imports, exports and bulk edits |

## Connecting to Adminium

All data access goes through a thin `DataSource` interface
([`src/data/source.ts`](src/data/source.ts)) with a single `demoSource`
implementation backed by the bundled fiction. **Today the deployed demo is
demo data only — nothing is persisted, no card is charged and no email is
sent.** Once Adminium's browser-safe publishable key (`adm_pub_…`) ships, the
frontend will read and write live data through the Adminium records API via a
second `DataSource` implementation, without touching any of the screens or the
store. The seam is already in place; the key is the only missing piece.

### What is deliberately out of scope

- **Taking money.** The card sheet says so in as many words. Real payments
  need a payment processor and a server this version does not have.
- **Sending the tickets.** Confirmation shows them and My tickets finds them
  again; no email leaves the browser.
- **Reserved seating.** Waveform is general admission. A seat map would be a
  whole second product, and pretending otherwise with a decorative grid would
  be the one dishonest screen in the app.
- **Multi-gate scanning and offline sync.** One door, one list. Two doors that
  agree with each other needs a server.
- **Record administration.** Creating shows, editing allocations and importing
  orders belongs in the generated dashboard, on purpose.

## Project structure

```
src/
  app/         App shell + the exhaustive 9-view switch
  state/       Zustand store (persona, clock, holds, tickets, orders, toasts)
  data/        demo.ts (six shows + ~1,000 seeded orders), types.ts,
               source.ts (DataSource seam)
  i18n/        8-locale runtime, locale registry, ambient bridge,
               strings/ (chrome, screens, seeded prose)
  lib/         tickets.ts (the engine) + tests, format.ts (locale-aware output)
  screens/     home, event, checkout, confirmation, my tickets,
               sales, attendees, door, 404
  components/  two shells, demo dock, overlays, primitives
  styles/      tokens.css (canonical design tokens), base.css, components.css,
               screens.css
public/fonts/  self-hosted Manrope + JetBrains Mono (woff2)
```

## License

[AGPL-3.0](LICENSE) © 2026 Waveform. A demo shipped with Adminium.
