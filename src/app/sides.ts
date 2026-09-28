import { SURFACE_SIDE } from "../surface.ts";

/**
 * Which side of the venue this build draws, folded at build time: the box
 * office and door build draws theirs, the audience site's build draws the
 * audience's, and the demo draws both. Each is a literal once Vite has replaced
 * the surface flag, so a screen or a door guarded by one is not in the other
 * side's bundle at all.
 */
export const STAFF = SURFACE_SIDE !== "customer";
export const AUDIENCE = SURFACE_SIDE !== "staff";
