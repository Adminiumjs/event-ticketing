/**
 * The door reads and writes through the demo's Adminium: before check-in
 * opens at 16:30, the doors at 19:58 with the ledger's 38 early scans, each
 * verdict as Adminium's answer to the check-in, collecting at the door, Last
 * scans and Undo, the guest list, a door sale, a festival day, the signal
 * lost and back, after the curfew and the day after. Values only — the
 * browser pass draws them.
 */
import { describe, expect, it, vi } from "vitest";

import { DemoAdminium } from "../demo/adminium.ts";
import { DemoBoxOffice, DemoDoor } from "../demo/sides.ts";
import type { Id, Row } from "../data/wire.ts";
import { boxOf } from "./box.ts";
import { doorOf, plainLine, type Seg } from "./door.ts";
import { renderVals } from "./vals/base.ts";
import { WaveApp } from "./wave.ts";

// Each test builds a whole venue and walks its clock: more than the default 5 s on a busy machine.
vi.setConfig({ testTimeout: 60_000 });

type V = Record<string, unknown>;
const bidi = (s: unknown) => String(s).replace(/[⁦-⁩]/g, "");
const at = (local: string) => Date.parse(`${local}:00-04:00`);
const line = (v: V) => bidi(plainLine(v["line"] as Seg[]));

async function open(opts: { now?: string; person?: { name: string; roles: string[] } } = {}) {
  const demo = new DemoAdminium();
  if (opts.now !== undefined) demo.advanceTo(at(opts.now));
  const person = opts.person;
  const app = new WaveApp(
    person === undefined ? { audience: demo.audience, boxOffice: demo.boxOffice, door: demo.door } : { audience: demo.audience, boxOffice: new DemoBoxOffice(demo.engine, person), door: new DemoDoor(demo.engine, person) },
    "box",
    { lang: "en-US", theme: "dark" },
  );
  app.demo = { onClock: (fn) => demo.onClock(fn), doorDevice: "Door 1", nextScan: (id) => demo.nextInQueue(id) };
  await app.start({ timers: false });
  app.setState({ bx: "door" });
  const door = doorOf(app);
  const v = async (): Promise<V> => {
    for (let i = 0; i < 10; i += 1) {
      renderVals(app);
      await app.idle();
    }
    return renderVals(app)["dd"] as V;
  };
  const scan = async (code: string) => {
    await v();
    await door.scan(code, "find");
    return (await v())["v"] as V;
  };
  const ticket = (code: string): Row => demo.world.all("tickets").find((t) => t["code"] === code)!;
  const order = (no: string): Row => demo.world.all("orders").find((o) => o["number"] === no)!;
  await v();
  return { demo, app, door, box: boxOf(app), v, scan, ticket, order };
}

describe("the door before check-in opens (Tue 16:30)", () => {
  it("reads Neon Circuit's numbers from Adminium and this phone's door", async () => {
    const { v } = await open();
    const d = await v();
    expect([d["title"], bidi(d["count"]), d["device"], d["before"], d["open"]]).toEqual(["Neon Circuit", "In 0 · of 410", "Door 1 · Priya", true, false]);
    expect([bidi(d["openTxt"]), bidi(d["opensIn"])]).toEqual(["Check-in opens at 19:30", "Opens in 3 h 0 m"]);
    expect((d["nums"] as V[]).map((k) => `${String(k["k"])} ${bidi(k["v"])}`)).toEqual(["Tickets 388", "Pay at the door $336.00", "Guest list 14 · 22 people", "Early entry 80"]);
    expect((d["shows"] as V[]).map((s) => [s["label"], s["on"], s["off"]])).toEqual([
      ["Tonight: Neon Circuit · Main Hall", true, false],
      ["Velvet Hour · The Annex · Fri 31 Jul", false, true],
    ]);
    expect((d["checks"] as V[]).map((c) => c["label"])).toEqual(["Screens bright", "Second device signed in (Door 2)"]);
    expect([d["endTxt"], d["endSolid"], d["scanTop"]]).toEqual(["The door's takings show here after the show.", false, true]);
  });

  it("counts the Weekender's tickets for each day as the ledger does: Saturday 327, Sunday 320", async () => {
    const { box, demo } = await open();
    const fest = demo.world.all("events").find((e) => e["name"] === "Waveform Weekender")!.id;
    const live = (day: number) => box.port.count("tickets", [
      { column: "event_id", eq: fest },
      { column: "status", in: ["valid", "offered", "refund_asked"] },
      { column: "order_status", in: ["door", "awaiting_transfer", "overdue", "no_charge", "paid"] },
      { column: `admits_day${String(day)}`, eq: true },
    ]);
    expect([await live(1), await live(2)]).toEqual([327, 320]);
  });

  it("answers a scan before 19:30 with TOO EARLY, and writes nothing", async () => {
    const { scan, demo } = await open();
    const v = await scan("NG7T-6G8C");
    expect([v["word"], v["name"], line(v)]).toEqual(["Too early", "Ana Brandt", "Check-in opens 19:30"]);
    expect(demo.world.all("check_ins").filter((c) => c["event_id"] === demo.world.all("events").find((e) => e["name"] === "Neon Circuit")!.id)).toHaveLength(0);
  });
});

describe("the doors (Tue 19:58, after the 38 early scans)", () => {
  async function doors(person?: { name: string; roles: string[] }) {
    const o = await open(person === undefined ? {} : { person });
    o.demo.toDoors();
    await o.v();
    return o;
  }

  it("counts the 38 in, lists this door's last scans and sells what is left", async () => {
    const { v, door } = await doors();
    const d = await v();
    expect([bidi(d["count"]), d["open"], d["scan"]]).toEqual(["In 38 · of 410", true, true]);
    expect((d["recent"] as V[]).slice(0, 3).map((r) => `${bidi(r["at"])} ${String(r["name"])} · ${String(r["type"])}`)).toEqual([
      "19:57 Mae Lindqvist · Early entry",
      "19:55 Omar Price · Early entry",
      "19:52 Lux Ilves · Early entry",
    ]);
    door.set({ tab: "sell" });
    const s = await v();
    expect((s["sellTypes"] as V[]).map((t) => `${String(t["name"])} ${String(t["left"])} ${bidi(t["price"])}`)).toEqual([
      "Early entry Sold out $22.00",
      "Standard 17 left $28.00",
      "Balcony 9 left $34.00",
      "Comps · box office only 0 left No charge",
    ]);
  });

  it("says ALREADY IN with the first scan's time, door and person", async () => {
    const { scan } = await doors();
    const v = await scan("W9S9-QH7R");
    expect([v["word"], v["name"], v["type"], line(v)]).toEqual(["Already in", "Pia Sato", "Early entry", "In at 19:31 on Door 1 by Sam"]);
  });

  it("lets a paid ticket in, with the show's age check; Undo takes the check-in back", async () => {
    const { scan, v, door, demo, ticket } = await doors();
    const verdict = await scan("NG7T-6G8C");
    expect([verdict["word"], verdict["name"], verdict["type"], verdict["id"], verdict["idOn"]]).toEqual(["Let in", "Ana Brandt", "Standard", "18+ — check ID", true]);
    expect(demo.world.all("check_ins").filter((c) => c["ticket_id"] === ticket("NG7T-6G8C").id)).toHaveLength(1);
    const d = await v();
    expect(bidi(d["count"])).toBe("In 39 · of 410");
    const top = (d["recent"] as V[])[0]!;
    expect([top["name"], top["undoOn"]]).toEqual(["Ana Brandt", true]);
    await door.undo(door.s.recent[0]!.key);
    expect(demo.world.all("check_ins").filter((c) => c["ticket_id"] === ticket("NG7T-6G8C").id)).toHaveLength(0);
    expect(bidi((await v())["count"])).toBe("In 38 · of 410");
  });

  it("asks for the door money, takes it by card and lets in; an undo leaves the payment", async () => {
    const { scan, door, v, order } = await doors();
    const c = await scan("H3TW-9CXR");
    expect([c["word"], bidi(c["amount"]), c["name"], line(c), c["collect"], c["id"]]).toEqual(["Collect", "$28.00", "Mia Okada", "Pay at the door — Standard", true, "18+ — check ID"]);
    await door.collect("card");
    const after = (await v())["v"] as V;
    expect([after["word"], after["type"]]).toEqual(["Let in", "Standard · paid by card"]);
    expect(Number(order("WV-S8761")["balance"])).toBe(28);
    const second = await scan("P4MA-7VKE");
    expect(second["word"]).toBe("Collect");
    await door.collect("cash");
    expect([order("WV-S8761")["status"], Number(order("WV-S8761")["balance"])]).toEqual(["paid", 0]);
    const rows = (await v())["recent"] as V[];
    expect(bidi(rows[0]!["type"])).toBe("Standard · paid $28.00 in cash");
    await door.undo(door.s.recent[0]!.key);
    expect(bidi(((await v())["recent"] as V[])[0]!["type"])).toBe("Paid $28.00 · not in");
  });

  it("names the wrong show, an unknown code, a refund asked and a transfer not paid", async () => {
    const { scan, demo, ticket, order } = await doors();
    expect(await scan("YDG2-C508").then((v) => [v["word"], line(v)])).toEqual(["Wrong show", "This ticket is for Velvet Hour, Fri 31 Jul"]);
    expect(await scan("ZZZZ-ZZZZ").then((v) => [v["word"], line(v)])).toEqual(["Not found", "No ticket with that code. If they were sent a ticket, ask for the new one."]);
    // A request inside the refund window (a door fixture: Neon's window closed on 21 Jul).
    const asked = ticket("NG7T-6G8C");
    Object.assign(asked, { status: "refund_asked", refund_asked_at: "2026-07-27T14:20:00.000Z" });
    expect(await scan("NG7T-6G8C").then((v) => [v["word"], line(v)])).toEqual(["Refund asked", "Asked for a refund on Mon 27 Jul — this ticket doesn't work now"]);
    // A transfer still owed (a door fixture: no Neon transfer exists at 16:30).
    Object.assign(order("WV-S8761"), { status: "awaiting_transfer", pay_by: "2026-07-31T22:00:00.000Z" });
    demo.engine.settleAll();
    expect(await scan("H3TW-9CXR").then((v) => [v["word"], line(v)])).toEqual(["Not paid yet", "Waiting for a bank transfer · order WV-S8761 · due Fri 31 Jul, 18:00"]);
  });

  it("ticks guests in person by person, and a tap on a party all in steps one back", async () => {
    const { door, v } = await doors();
    door.set({ tab: "guests" });
    const rosa = async () => ((await v())["guests"] as V[]).find((g) => g["name"] === "Rosa Linde")!;
    expect(((await v())["gTxt"] as string).replace(/[⁦-⁩]/g, "")).toBe("0 of 14 names in · 0 of 22 people");
    ((await rosa())["go"] as () => void)();
    await v();
    expect([(await rosa())["on"], (await rosa())["sub"]]).toEqual(["mixed", "Tessellate · 1 of 2 in"]);
    ((await rosa())["go"] as () => void)();
    await v();
    expect((await rosa())["on"]).toBe(true);
    ((await rosa())["go"] as () => void)();
    await v();
    expect((await rosa())["sub"]).toBe("Tessellate · 1 of 2 in");
    expect(bidi((await v())["count"])).toBe("In 39 · of 410");
  });

  it("sells two Standard at the door by card: Adminium's order, prices and codes, checked in at once", async () => {
    const { door, v, demo } = await doors();
    door.set({ tab: "sell" });
    let d = await v();
    ((d["sellTypes"] as V[]).find((t) => t["name"] === "Standard")!["go"] as () => void)();
    (((await v())["qInc"]) as () => void)();
    d = await v();
    expect([d["sellQ"], bidi(d["sellTotal"])]).toEqual(["2", "$56.00"]);
    const t = door.chosen()!;
    await door.sell(t, t.show.types.find((x) => x.short === "Standard")!.id, 2, "card");
    const sale = demo.world.all("orders").find((o) => o["channel"] === "door")!;
    expect([sale["number"], sale["status"], Number(sale["total"]), sale["buyer_name"]]).toEqual(["WV-8816", "paid", 56, "Door sale"]);
    expect(demo.world.where("door_collections", (c) => c["order_id"] === sale.id).map((c) => [Number(c["amount"]), c["method"]])).toEqual([
      [28, "card"],
      [28, "card"],
    ]);
    expect(bidi((await v())["count"])).toBe("In 40 · of 412");
  });

  it("keeps tonight's list on the phone without the signal, and sends each scan with its own time", async () => {
    const { door, v, demo, scan, ticket } = await doors();
    await v();
    door.setOffline(true);
    const off = await scan("NG7T-6G8C");
    expect([off["word"], off["name"]]).toEqual(["Let in", "Ana Brandt"]);
    let d = await v();
    expect([d["offOn"], bidi(plainLine(d["offTxt"] as Seg[])), bidi(d["count"])]).toEqual([true, "Offline — 1 check-in will sync", "In 39 · of 410"]);
    expect(demo.world.all("check_ins").some((c) => c["ticket_id"] === ticket("NG7T-6G8C").id)).toBe(false);
    // Meanwhile Door 2 lets the same Early-entry ticket in that this phone scans offline.
    await scan("328V-F2CK");
    const jo = new DemoDoor(demo.engine, { name: "Jo", roles: ["door"] });
    const day = door.chosen()!.day.id;
    demo.advance(1);
    await jo.checkIn(ticket("328V-F2CK").id, day, 2 as Id);
    door.setOffline(false);
    for (let i = 0; i < 5; i += 1) await v();
    d = await v();
    expect(d["offOn"]).toBe(false);
    expect(d["clash"]).toEqual(["328V-F2CK was already in at 19:59 on Door 2 — check the person in front of you."]);
    const made = demo.world.all("check_ins").find((c) => c["ticket_id"] === ticket("NG7T-6G8C").id)!;
    expect([made["scanned_by"], made["device_id"], made["scanned_at"]]).toEqual(["Priya", 1, new Date(at("2026-07-28T19:58")).toISOString()]);
  });

  it("gives the door role its own shell: the Door only, no search, its door on the account sheet", async () => {
    const { app, v } = await doors({ name: "Sam", roles: ["door"] });
    await v();
    const bo = renderVals(app)["bo"] as V;
    expect([(bo["nav"] as V[]).map((n) => n["label"]), bo["searchOn"]]).toEqual([["Door"], false]);
    expect(((await v())["device"])).toBe("Door 1 · Sam");
  });
});

describe("a festival day (Sun 30 Aug 15:10)", () => {
  it("runs Day 2 with its own count; a Saturday ticket is not for today; a pass is let in once a day", async () => {
    const { v, scan } = await open({ now: "2026-08-30T15:10" });
    const d = await v();
    // The ledger's 320 for Sunday is Tuesday's; a month of released transfers later Adminium counts 312.
    expect([d["title"], bidi(d["count"]), d["open"]]).toEqual(["Waveform Weekender · Day 2 · Sunday", "In 0 · of 312", true]);
    expect((d["shows"] as V[]).slice(0, 2).map((s) => [s["label"], s["on"], s["off"]])).toEqual([
      ["Day 2 · Sunday · Sun 30 Aug", true, false],
      ["Day 1 · Saturday · Sat 29 Aug", false, true],
    ]);
    expect(await scan("E767-DH7N").then((x) => [x["word"], line(x)])).toEqual(["Not today", "This ticket is for Saturday"]);
    expect(await scan("R9DF-X3KN").then((x) => [x["word"], x["idOn"]])).toEqual(["Let in", true]);
    expect(await scan("R9DF-X3KN").then((x) => [x["word"], line(x)])).toEqual(["Already in", "In at 15:10 on Door 1 by Priya"]);
  });
});

describe("after the curfew, and the day after", () => {
  it("closes check-in at 23:30 and shows the door's takings, with what nobody paid", async () => {
    const { v, scan } = await open({ now: "2026-07-28T23:40" });
    const d = await v();
    expect([bidi(d["openTxt"]), d["endSolid"], d["open"]]).toEqual(["Check-in closed at 23:30", true, false]);
    expect(bidi(d["endTxt"])).toBe("Neon Circuit · nothing taken at the door · door sales $0.00 · collected $0.00 · not collected $336.00 (12 tickets)");
    expect(await scan("NG7T-6G8C").then((x) => [x["word"], line(x)])).toEqual(["Not today", "This show has finished"]);
  });

  it("has nothing on the next day, and names the next show", async () => {
    const { v } = await open({ now: "2026-07-29T16:30" });
    const d = await v();
    expect([d["title"], d["noShow"]]).toEqual(["Nothing on tonight", true]);
    expect((d["shows"] as V[]).map((s) => s["label"])).toEqual(["Velvet Hour · The Annex · Fri 31 Jul"]);
  });
});
