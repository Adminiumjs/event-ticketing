/**
 * The demo's Adminium, whole: one venue in memory, its engine, the three
 * sides' doors, and the clock the demo card moves.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import { Engine } from "./engine.ts";
import { DemoAudience, DemoBoxOffice, DemoDoor } from "./sides.ts";
import { DEMO_START, World } from "./world.ts";

export class DemoAdminium {
  readonly world: World;
  readonly engine: Engine;
  readonly audience: DemoAudience;
  readonly boxOffice: DemoBoxOffice;
  readonly door: DemoDoor;
  private clockListeners = new Set<(now: number) => void>();

  constructor(opts: { now?: number } = {}) {
    this.world = new World(opts.now ?? DEMO_START);
    this.engine = new Engine(this.world);
    this.audience = new DemoAudience(this.engine);
    this.boxOffice = new DemoBoxOffice(this.engine);
    this.door = new DemoDoor(this.engine);
  }

  get now(): number {
    return this.world.now;
  }

  /** Moves the clock to `at` (never back), and makes every move that came due on the way, in time order. */
  advanceTo(at: number): void {
    if (at < this.world.now) return;
    // Step through the due moments one by one, so a move judged at its own time sees the rows as they were then.
    this.world.now = at;
    this.engine.runTimed();
    for (const listener of this.clockListeners) listener(at);
  }

  advance(minutes: number): void {
    this.advanceTo(this.world.now + minutes * 60_000);
  }

  onClock(listener: (now: number) => void): () => void {
    this.clockListeners.add(listener);
    return () => this.clockListeners.delete(listener);
  }
}
