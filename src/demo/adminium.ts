/**
 * The demo's Adminium, whole: one venue in memory, its engine, the three
 * sides' doors, and the clock the demo card moves.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import { door_1958 } from "../sample/ledger.json";
import { wallTime } from "../lib/venueTime.ts";
import type { Id } from "../data/wire.ts";
import { Engine } from "./engine.ts";
import { normalizeCode } from "./codes.ts";
import { DemoAudience, DemoBoxOffice, DemoDoor } from "./sides.ts";
import { DEMO_START, World } from "./world.ts";

/** Tuesday's doors at the venue, 19:58: where "Advance to doors" goes. */
export const DOORS_AT = Date.parse("2026-07-28T23:58:00Z");

export class DemoAdminium {
  readonly world: World;
  readonly engine: Engine;
  readonly audience: DemoAudience;
  readonly boxOffice: DemoBoxOffice;
  /** The door, run by whoever is signed in to the box office (the demo's is Priya). */
  readonly door: DemoDoor;
  private clockListeners = new Set<(now: number) => void>();

  constructor(opts: { now?: number } = {}) {
    this.world = new World(opts.now ?? DEMO_START);
    this.engine = new Engine(this.world);
    this.audience = new DemoAudience(this.engine);
    this.boxOffice = new DemoBoxOffice(this.engine);
    this.door = new DemoDoor(this.engine, { name: "Priya", roles: ["box-office"], email: "priya@waveform.example" });
  }

  get now(): number {
    return this.world.now;
  }

  /** Moves the clock to `at` (never back), and makes every move that came due on the way, in time order. */
  advanceTo(at: number): void {
    if (at < this.world.now) return;
    this.step(at);
    for (const listener of this.clockListeners) listener(at);
  }

  /** The clock on to `at`, making the timed moves that came due; nobody is told yet. */
  private step(at: number): void {
    // Step through the due moments one by one, so a move judged at its own time sees the rows as they were then.
    this.world.now = at;
    this.engine.runTimed();
  }

  /**
   * "Advance to doors": the clock on to Tuesday 19:58, and on the way the 38
   * Early-entry scans the ledger names, each made at its own minute by its own
   * door and person, judged as Adminium judges any check-in. After the doors
   * (or "+1 day") it does nothing.
   */
  toDoors(): void {
    if (this.world.now >= DOORS_AT) return;
    const w = this.world;
    const stamp = (s: string) => wallTime({ y: Number(s.slice(0, 4)), m: Number(s.slice(5, 7)), d: Number(s.slice(8, 10)) }, s.slice(11, 16), w.zone);
    const devices = new Map(w.all("devices").map((d) => [String(d["name"]), d.id]));
    const days = w.all("event_days");
    const byCode = new Map(w.all("tickets").map((t) => [normalizeCode(String(t["code"] ?? "")), t]));
    // Each scan judged at its own minute (as a phone's replay is), all settled at once.
    this.step(DOORS_AT);
    const items = door_1958.flatMap((scan) => {
      const ticket = byCode.get(normalizeCode(scan.ticket));
      const day = ticket === undefined ? undefined : days.find((d) => d["event_id"] === ticket["event_id"] && d["day"] === scan.day);
      if (ticket === undefined || day === undefined) return [];
      return [{ values: { ticket_id: ticket.id, event_day_id: day.id, device_id: (devices.get(scan.device) ?? null) as Id | null }, writer: { origin: "staff" as const, name: scan.by, roles: ["door"], occurredAt: stamp(scan.at) } }];
    });
    this.engine.createMany("check_ins", items);
    this.advanceTo(DOORS_AT);
  }

  /** The demo's scan pad: the next person in the queue at a show day's door — a paid ticket not in yet. */
  nextInQueue(eventDayId: Id): string | null {
    const w = this.world;
    const day = w.get("event_days", eventDayId);
    if (day === undefined) return null;
    const ins = new Set(w.where("check_ins", (c) => c["event_day_id"] === eventDayId).map((c) => c["ticket_id"]));
    const t = w.all("tickets").find(
      (x) => x["event_id"] === day["event_id"] && x["status"] === "valid" && x["order_status"] === "paid" && x["kind"] !== "comp" && x[`admits_day${String(day["day"])}`] === true && !ins.has(x.id),
    );
    return t === undefined ? null : String(t["code"]);
  }

  advance(minutes: number): void {
    this.advanceTo(this.world.now + minutes * 60_000);
  }

  onClock(listener: (now: number) => void): () => void {
    this.clockListeners.add(listener);
    return () => this.clockListeners.delete(listener);
  }
}
