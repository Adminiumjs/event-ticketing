/**
 * The codes the server draws, and how a typed code is compared.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** A code the server draws: Crockford letters, `XXXX-XXXX` for a ticket's. */
export function randomCode(length: number, grouped = false): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  const text = [...bytes].map((b) => CROCKFORD[b % 32]).join("");
  return grouped ? `${text.slice(0, 4)}-${text.slice(4)}` : text;
}

/** A code as typed, compared as a code: upper case, spaces and dashes left out, O read as 0 and I or L as 1. */
export const normalizeCode = (text: string): string => text.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
