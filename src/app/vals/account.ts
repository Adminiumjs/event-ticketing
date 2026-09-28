/**
 * The buyer's own pages: checkout, the order's page, sign in, My tickets, a
 * ticket from a friend, a waitlist offer — and their sheets.
 */
import type { WaveApp } from "../wave.ts";
import type { World } from "../world.ts";
import type { V } from "./base.ts";
import type { SheetKit } from "./sheets.ts";

export function accountVals(_app: WaveApp, _w: World | null, _v: V): V {
  return {
    co: { tix: [], lines: [], steps: [], pays: [] },
    gw: { tickets: [], dlCols: "" },
    si: { boxes: [] },
    mt: { orders: [], tabs: [] },
    fr: {},
    of: { qs: [] },
  };
}

export function accountSheet(_app: WaveApp, _w: World, _o: V, _sh: Record<string, unknown>, _kit: SheetKit): void {}
