/**
 * The box office's messages and settings: Messages, Postpone or cancel (and a
 * cancelled show's refunds to make), Settings.
 */
import type { Box } from "../box.ts";
import type { BoxWorld } from "../boxWorld.ts";
import type { WaveApp } from "../wave.ts";
import type { V } from "./base.ts";

export function boxMoreVals(_app: WaveApp, _box: Box, _w: BoxWorld, _B: Record<string, unknown>, _v: V): V {
  return {};
}
