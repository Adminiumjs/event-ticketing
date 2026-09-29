// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Preloaded into the contract's Adminium (`node --import`): the server's clock
 * starts at `CONTRACT_NOW` (epoch ms) and runs on from there.
 *
 * The contract adds the sample at the moment the sample's own figures are
 * written for — 16:30 on Tuesday 28 July 2026 at the venue — so every figure
 * it asserts is the literal one, on every engine. Only JavaScript's clock
 * moves; the server reads its "now" from it.
 *
 * With `CONTRACT_CLOCK_FILE`, the contract moves the clock on as the evening
 * goes (to the doors, a day on): the file holds `{at, real}` — the moment the
 * clock was set to, and when — and is read again a few times a second. The
 * clock never goes back.
 */
import { readFileSync } from "node:fs";

const target = Number(process.env.CONTRACT_NOW);
if (Number.isFinite(target)) {
  const RealDate = Date;
  let offset = target - RealDate.now();
  const file = process.env.CONTRACT_CLOCK_FILE;
  if (typeof file === "string" && file !== "") {
    const read = () => {
      try {
        const set = JSON.parse(readFileSync(file, "utf8"));
        const next = Number(set.at) - Number(set.real);
        if (Number.isFinite(next) && next > offset) offset = next;
      } catch {
        // no move asked yet
      }
    };
    setInterval(read, 250).unref();
  }
  class ContractDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(RealDate.now() + offset);
      else super(...args);
    }
    static now() {
      return RealDate.now() + offset;
    }
  }
  globalThis.Date = ContractDate;
}
