# Event Ticketing

A small venue's audience site, box office and door, installed into
[Adminium](https://adminium.dev). People buy general-admission tickets and look
after them online; the box office puts shows on sale and keeps the money
straight; the door scans each code on a phone and lets people in. Adminium
decides every price, total, order number, ticket code and status — the pages
only ask.

**One venue, its rooms, nothing taken online.** Nobody pays on the site and
nothing is sent by text message: an order is paid at the door, by bank
transfer before its deadline, or costs nothing when the show does. Every ticket
is general admission; the different kinds of ticket are **ticket types**.

The demo is dressed as **Waveform**, a fictional independent music venue with
two rooms and one weekend festival, at 16:30 on a Tuesday in July: tonight's
Neon Circuit has 388 of 414 places taken and three more in someone's checkout,
twelve people will pay at the door, and a cancelled show still has $2,376 to
pay back.

**Live demo → [adminium.dev/demo/event-ticketing](https://adminium.dev/demo/event-ticketing)**

## What it needs

- Adminium **0.3.8** or later, on SQLite, Postgres or MySQL.
- Nothing else. **Invoices & Receipts** is offered at install: with it, an
  order paid in full gets its receipt by email, and the buyer can open it from
  their order.

## What it does

**For the audience** (the app's customer side):
- The coming shows, a show's page with its line-up, age and ticket types, and a
  festival's days and timetable. A show that is sold out offers its waitlist;
  a presale opens with its code.
- Checkout: tickets by ticket type, the names on them, a code, and the total
  Adminium works out before the order is placed. The checkout holds its
  tickets for a few minutes, so the last place in a room is sold once. Pay at
  the door, by bank transfer (confirmed from an email — which the buyer can have
  sent again — and due by a deadline), or take a place at no charge when the
  show costs nothing.
- An email in the buyer's language with the order's own link; the tickets with
  their codes, on screen and on the phone at the door. An unpaid transfer's
  tickets carry no code until it is paid.
- Signing in with a code emailed to them: every order and ticket, sending a
  ticket on to a friend (the friend gets a new code and the old one stops
  working), taking it back while it waits, claiming a returned place offered
  from the waitlist, asking for a refund, signing out on every device and
  deleting their details.

**For the box office** (the app's staff side):
- Today: tonight's shows, what is taken and held of each room, what is owed at
  the door, transfers past their deadline, refunds to make and messages
  waiting.
- Shows and their days, rooms, acts, ticket types and places; codes and
  presales; checkout questions.
- Orders and their money: a new order at the desk, comps, marking a transfer
  paid, part cancels, refunds in two steps (agreed, then paid back), releasing
  unpaid tickets after the grace hours.
- Guest lists, waitlists (offering returned places), a message to everyone
  going, postponing or cancelling a show (each order told why).

**At the door** (a phone or a tablet): scan a code or type it; one code scanned
on two phones lets one person in, and a weekend pass lets its holder in once a
day. What is owed is collected in cash or by card and the order is paid.
Scans made with no signal are kept on the device and sent when it returns.

**Roles.** The box office runs the venue; the door scans, collects what is
owed and sells at the door, and reads no more than the evening needs.

**In the dashboard** (the Event Ticketing section): the Overview (tickets sold
for coming shows, what is owed at the door, awaiting transfer, refunds to make,
tonight's list, what needs you, the coming shows and the money by show), and
every table the screens use — shows, ticket types, orders, tickets,
check-ins, door payments, payments, refunds, guest lists, waitlists,
reminders, codes, customers, messages — and the settings: the venue's name and
words, when its day starts, the ways to pay, a transfer's days and deadline,
how long a checkout holds, an offer and a friend's hours, refunds, check-in
and the emails.

## Installing it

Install Event Ticketing from Adminium's app catalog and pick the database it
should use. Adminium creates the app's tables, the dashboard pages, the
`box-office` and `door` roles, the audience's browser keys and the emails. Tick
sample data at the install step to start with Waveform's Tuesday, or add it
later from the app's settings.

Once installed, the box office and the door are served at
`/apps/events/staff/` and the audience site at `/apps/events/customer/`. A
venue can also give the audience site a domain of its own.

**Coming from 0.1.x?** 0.2.0 is a different app on new tables, and it cannot
update a 0.1.x install in place. Uninstall 0.1.x first (its tables stay unless
you choose to drop them), then install 0.2.0. Nothing is carried over from the
old tables.

## Local development

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default http://localhost:5173): the demo, with
the audience site, the box office and the door on a browser-only Adminium of
their own. `?side=box` opens the box office.

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server (the demo). |
| `npm run build` | Type-check and build to `dist/`. |
| `npm run build:demo` | Build the website's demo, at base `/demo/event-ticketing/app/`. |
| `npm run build:surface` | Build the two sides Adminium serves (`dist-surface/`). |
| `npm run manifest` | Write `manifest.json` from `src/manifest/`. |
| `npm run sample` | Write the sample (`seeds/events.sample.json`) from `src/sample/`. |
| `npm test` | Run the suite. |
| `npm run e2e` | Walk the demo in a browser: every screen in light, dark, Arabic and on a phone, swept by axe. |

`manifest.json` and the sample are written from the typed modules in
`src/manifest/` and `src/sample/`; edit those and run the script. A test fails
when the two disagree.

### The three-engine contract

With a built Adminium checkout beside this one, the suite also installs the app
on SQLite, Postgres and MySQL and drives every write through the app's own
doors — the audience's and the box office's — including the races (the last
place in a room, one code scanned on two phones):

```bash
ADMINIUM_CONTRACT=1 ADMINIUM_REPO=../adminium npx vitest run src/contract
```

## License

AGPL-3.0-only.
