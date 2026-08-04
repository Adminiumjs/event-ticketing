-- Event Ticketing — PostgreSQL schema (manifest §requiredSchema contract).
--
-- This is the real database behind the full self-host stack: the box office
-- reads it (through Adminium's records API) and the auto-generated Adminium
-- dashboard is the back office that runs it. Applied automatically on the
-- first boot of the `events-db` container via
-- /docker-entrypoint-initdb.d/01-schema.sql, then seeded by 02-seed.sql. The
-- seed mirrors src/data/demo.ts one for one — the same six shows, the same
-- 684 orders, the same 1,011 issued tickets and the same early-entry line — so
-- the site and the dashboard are the same venue.
--
-- Seven tables. The split is deliberate: the box office owns the evening, the
-- generated dashboard owns the records.
--
-- Money is numeric(12, 2). The app carries integer cents so that summing three
-- ticket prices cannot drift; the database carries the same amounts as exact
-- decimals, for the same reason. Never a float — a box office that is a penny
-- out is a bug report.
--
-- Every instant is timestamptz and every literal in the seed is written in UTC,
-- which is what the app's absolute-minute clock counts in. Doors, stage times
-- and on-sale moments are all instants; nothing here is a bare wall-clock
-- string.
--
-- General admission throughout: there is no place in this schema to record
-- where somebody stood, because Waveform does not sell one.

DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS ticket_types CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS venues CASCADE;
DROP TABLE IF EXISTS promo_codes CASCADE;

-- Rooms ----------------------------------------------------------------------

-- A room, or a pair of rooms opened into one for the festival. `capacity` is
-- what the room legally holds, which is not the same number as what any one
-- night puts on sale — a quiet acoustic evening in the same room sells fewer
-- tickets than a club night does.
CREATE TABLE venues (
  id       serial PRIMARY KEY,
  name     text    NOT NULL,
  address  text    NOT NULL DEFAULT '',
  capacity integer NOT NULL DEFAULT 0 CHECK (capacity >= 0)
);

-- The calendar ---------------------------------------------------------------

-- One night. `doors_at` is when people come in, `starts_at` is when the first
-- act is on, and doors can never be after the stage time — a night that opened
-- its doors mid-set would be a data-entry mistake, so it is a constraint.
--
-- `status` is the box office's view of the night, not the clock's:
--   draft     — announced, sale not open yet
--   on_sale   — selling
--   sold_out  — the whole allocation has gone
--   closed    — the night is over and nothing more can be sold
CREATE TABLE events (
  id          serial PRIMARY KEY,
  slug        text        NOT NULL UNIQUE,          -- 'neon-circuit'
  venue_id    integer     NOT NULL REFERENCES venues (id) ON DELETE RESTRICT,
  name        text        NOT NULL,
  description text        NOT NULL DEFAULT '',
  starts_at   timestamptz NOT NULL,
  doors_at    timestamptz NOT NULL,
  image       text        NOT NULL DEFAULT '',
  status      text        NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'on_sale', 'sold_out', 'closed')),
  CONSTRAINT events_doors_before_stage CHECK (doors_at <= starts_at)
);

CREATE INDEX events_venue_idx  ON events (venue_id);
CREATE INDEX events_status_idx ON events (status);
-- The site lists what is coming up, soonest first.
CREATE INDEX events_starts_idx ON events (starts_at);

-- One kind of ticket for one night — never a ranked-price synonym, here or
-- anywhere else in the product. `capacity` is the whole allocation for this
-- type; how much of it is left is DERIVED from the issued tickets, never
-- stored, because a stored "remaining" is wrong the moment a cart expires.
--
-- `sales_start` and `sales_end` bracket the window this type can be bought in.
-- A NULL start means it is on sale as soon as the night is; a NULL end means it
-- sells until the night is over.
CREATE TABLE ticket_types (
  id          serial PRIMARY KEY,
  event_id    integer NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  name        text    NOT NULL,
  price       numeric(12, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  capacity    integer NOT NULL CHECK (capacity > 0),
  sales_start timestamptz,
  sales_end   timestamptz,
  position    integer NOT NULL DEFAULT 0,
  CONSTRAINT ticket_types_window CHECK (
    sales_start IS NULL OR sales_end IS NULL OR sales_end > sales_start
  ),
  -- The order they are listed in on the night's page. Two types cannot share a
  -- place in that list.
  CONSTRAINT ticket_types_position_unique UNIQUE (event_id, position)
);

CREATE INDEX ticket_types_event_idx ON ticket_types (event_id);

-- Sales ----------------------------------------------------------------------

-- One purchase. `number` is the running box-office code — 'WV-8814' — and it is
-- what a buyer reads back over the phone, so it is unique and it is the display
-- field.
--
-- `pending` is where a real deployment would park a cart that is holding
-- tickets but has not paid yet. The demo does not persist carts: in the app a
-- hold lives in the ticket engine and is settled by a comparison against the
-- clock, so every order that reaches this table is already paid.
CREATE TABLE orders (
  id         serial PRIMARY KEY,
  number     text        NOT NULL UNIQUE,
  buyer_name text        NOT NULL,
  email      text        NOT NULL,
  total      numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  status     text        NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'paid', 'cancelled')),
  placed_at  timestamptz NOT NULL DEFAULT now()
);

-- The wallet is looked up by the buyer's email address and nothing else, so the
-- index is on the lower-cased form the lookup normalises to.
CREATE INDEX orders_email_idx  ON orders (lower(email));
CREATE INDEX orders_status_idx ON orders (status);
CREATE INDEX orders_placed_idx ON orders (placed_at);

-- How many of which type the order was for. `unit_price` is copied from the
-- ticket type at the moment of sale: charging more for a type next season must
-- not rewrite what somebody paid last season.
CREATE TABLE order_items (
  id             serial PRIMARY KEY,
  order_id       integer NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  ticket_type_id integer NOT NULL REFERENCES ticket_types (id) ON DELETE RESTRICT,
  qty            integer NOT NULL CHECK (qty > 0),
  unit_price     numeric(12, 2) NOT NULL CHECK (unit_price >= 0)
);

CREATE INDEX order_items_order_idx ON order_items (order_id);
CREATE INDEX order_items_type_idx  ON order_items (ticket_type_id);

-- The door -------------------------------------------------------------------

-- One admission. `code` is the order number plus a two-digit index —
-- 'WV-8814-01' — which is what is printed on the ticket and typed at the door.
--
-- `attendee_name` is whose name prints on it and is nullable: a buyer who takes
-- three tickets and has not decided who is coming yet leaves them blank, and
-- the box office falls back to the buyer.
--
-- The scan time and the status are one fact written twice, so they are
-- constrained to agree: a checked-in ticket has a scan time, and a ticket that
-- has not been scanned has none. `void` is the refunded or revoked ticket — the
-- seed has none, because refunds in this demo are fiction the dashboard tells
-- and not something the box office does.
CREATE TABLE tickets (
  id             serial PRIMARY KEY,
  code           text    NOT NULL UNIQUE,
  order_id       integer NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  ticket_type_id integer NOT NULL REFERENCES ticket_types (id) ON DELETE RESTRICT,
  attendee_name  text,
  status         text    NOT NULL DEFAULT 'valid'
                         CHECK (status IN ('valid', 'checked_in', 'void')),
  checked_in_at  timestamptz,
  CONSTRAINT tickets_scan_agrees CHECK (
    (status = 'checked_in') = (checked_in_at IS NOT NULL)
  )
);

CREATE INDEX tickets_order_idx    ON tickets (order_id);
CREATE INDEX tickets_type_idx     ON tickets (ticket_type_id);
CREATE INDEX tickets_status_idx   ON tickets (status);
-- The door list is "who came through, most recent first".
CREATE INDEX tickets_scanned_idx  ON tickets (checked_in_at);
-- The attendee search is a plain substring over the name, case-insensitively.
CREATE INDEX tickets_attendee_idx ON tickets (lower(attendee_name));

-- Promotions -----------------------------------------------------------------

-- A percentage off, handed out to a mailing list or a support act. This is a
-- back-office table: the box office in this repo never applies one, so no
-- seeded order is discounted and every total is the exact sum of its tickets.
CREATE TABLE promo_codes (
  id      serial PRIMARY KEY,
  code    text    NOT NULL UNIQUE,
  pct_off integer NOT NULL CHECK (pct_off BETWEEN 1 AND 100),
  active  boolean NOT NULL DEFAULT true
);

CREATE INDEX promo_codes_active_idx ON promo_codes (active);
