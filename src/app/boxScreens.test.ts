/**
 * The box office reads what the demo's Adminium answers, at the pinned clock
 * (Tue 28 Jul 2026, 16:30 at the venue): Today, Events, Sales, Orders, the
 * drawer, the guest lists, the waitlist, codes, messages and a cancelled
 * show's refunds show the sample's own figures, and its buttons land where
 * the plan says. Values only — the browser pass draws them.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { DemoAdminium } from "../demo/adminium.ts";
import { DemoBoxOffice } from "../demo/sides.ts";
import { cancelRun, CANCELS } from "../data/boxSteps.ts";
import type { BoxOfficePort } from "../data/ports.ts";
import { ApiError, type Id } from "../data/wire.ts";
import { boxOf, sentByAnother, type BoxState } from "./box.ts";
import { fT } from "./fmt.ts";
import { mergeDraft, type SaveRows } from "./vals/editor.ts";
import { renderVals } from "./vals/base.ts";
import { WaveApp } from "./wave.ts";

// The demo engine answers from memory, so its awaits never leave the microtask queue: a whole file of
// cases would hold the worker's event loop for over a minute on a CI runner, and vitest's own messages
// to the worker then time out ("Timeout calling onTaskUpdate"). One macrotask between cases lets them through.
afterEach(() => new Promise<void>((done) => setTimeout(done, 0)));

// A day's move re-settles the whole venue: slow on a busy machine.
vi.setConfig({ testTimeout: 60_000 });

type V = Record<string, unknown>;
const bidi = (s: unknown) => String(s).replace(/[⁦-⁩]/g, "");

async function open(bx: WaveApp["state"]["bx"] = "today", patch: Partial<BoxState> = {}) {
  const demo = new DemoAdminium();
  const app = new WaveApp({ audience: demo.audience, boxOffice: demo.boxOffice, door: demo.door }, "box", { lang: "en-US", theme: "dark" });
  app.demo = { onClock: (fn) => demo.onClock(fn) };
  await app.start({ timers: false });
  const box = boxOf(app);
  const settle = async () => {
    for (let i = 0; i < 8; i += 1) {
      renderVals(app);
      await app.idle();
    }
    return renderVals(app);
  };
  const go = async (to: WaveApp["state"]["bx"], p: Partial<BoxState> = {}) => {
    app.setState({ bx: to, box: { ...box.s, ...p } });
    return settle();
  };
  await go(bx, patch);
  const idOf = (name: string) => box.world()!.shows.find((s) => s.name === name)!.id;
  return { app, demo, box, v: settle, go, idOf };
}

describe("Today at 16:30", () => {
  it("draws Neon Circuit's card from Adminium's counts", async () => {
    const { v } = await open();
    const td = (await v())["td"] as V;
    const card = (td["shows"] as V[])[0]!;
    expect(card["name"]).toBe("Neon Circuit");
    expect(bidi(card["doorsIn"])).toBe("Doors in 3 h 30 m");
    expect((card["kpis"] as V[]).map((k) => `${bidi(k["v"])} | ${bidi(k["sub"])}`)).toEqual([
      "388 of 414 | 23 left · 3 held · includes 4 comps",
      "$336.00 | across 12 tickets",
      "14 names | 22 people · list closes 18:00",
      "Opens 19:30 | 30 minutes before doors",
    ]);
  });

  it("lists what needs the box office, in the design's order", async () => {
    const { v } = await open();
    const td = (await v())["td"] as V;
    const needs = td["needs"] as V[];
    expect(needs.map((n) => bidi(n["title"]))).toEqual([
      "3 bank transfers are overdue",
      "1 refund request",
      "Dust Parade: 52 refunds still to make · $2,376.00",
      "Hollow Tide's postponement message is waiting · 88 people",
      "Static Bloom goes on sale Sat 1 Aug 10:00 · presale Thu 30 Jul 10:00 · 41 people asked for a reminder",
    ]);
    expect(bidi(needs[0]!["sub"])).toBe("They go back on sale at 18:00 today unless you mark them paid.");
    expect((needs[0]!["items"] as V[]).map((i) => `${String(i["no"])} ${bidi(i["txt"])}`)).toEqual([
      "WV-S8793 Dara Price · Cinder · $72.00 · was due Mon 27 Jul 18:00",
      "WV-S8795 Milo Castell · Cinder · $72.00 · was due Mon 27 Jul 18:00",
      "WV-S8797 Dev Nakai · Cinder · $60.00 · was due Mon 27 Jul 18:00",
    ]);
    expect(bidi((needs[1]!["items"] as V[])[0]!["txt"])).toBe("Nia Hart · Cinder · 1 of 2 tickets · $48.00 paid");
    expect(bidi(needs[3]!["sub"])).toBe("Postponed today at 15:40 from Sat 15 Aug to Fri 11 Sep.");
  });

  it("labels the next 14 days by the usual pace, and counts the day so far", async () => {
    const { v } = await open();
    const td = (await v())["td"] as V;
    expect((td["next"] as V[]).map((e) => `${String(e["name"])} | ${bidi(e["soldTxt"])} | ${String(e["pace"])}`)).toEqual([
      "Neon Circuit | 388 of 414 | ",
      "Velvet Hour | sold out · 2 held for a waitlist offer | ",
      "Low Ceiling: new material night | 64 of 120 | ",
      "First Listen: Hollow Tide's new record | 71 of 120 | behind",
      "Home Studio Basics | 13 of 20 | behind",
    ]);
    expect((td["day"] as V[]).map((k) => bidi(k["v"]))).toEqual(["16", "$434.00", "$190.00", "$303.00"]);
  });

  it("badges Orders with the overdue transfers and Refund requests with the request", async () => {
    const { v } = await open();
    const nav = ((await v())["bo"] as V)["nav"] as V[];
    const badge = (id: string) => nav.find((n) => n["id"] === id)!;
    expect([badge("orders")["badge"], badge("orders")["badgeLabel"]]).toEqual(["3", "3 transfers past their deadline"]);
    expect([badge("refunds")["badge"], badge("refunds")["badgeOn"]]).toEqual(["1", true]);
    expect(badge("waits")["badgeOn"]).toBe(false);
  });
});

describe("Events and Sales", () => {
  it("lists the 14 shows with their counts and money", async () => {
    const { go } = await open();
    const el = (await go("events"))["el"] as V;
    expect((el["filters"] as V[]).map((f) => bidi(f["label"]))).toEqual(["All 14", "On sale 8", "On sale soon 2", "Sold out 1", "Postponed or cancelled 2", "Past 1", "Draft 0"]);
    const rows = Object.fromEntries((el["rows"] as V[]).map((r) => [String(r["name"]), `${String(r["st"])} | ${bidi(r["soldTxt"])} | ${bidi(r["taken"])} | ${bidi(r["owed"])}`]));
    expect(rows["Neon Circuit"]).toBe("On sale | 388 / 414 | $10,287.00 | $336.00");
    expect(rows["Velvet Hour"]).toBe("Sold out | 118 / 120 · sold out | $2,080.00 | $280.00");
    expect(rows["Dust Parade"]).toBe("Cancelled | Cancelled · $2,376.00 still to pay back | — | —");
    expect(rows["First Listen: Hollow Tide's new record"]).toBe("On sale | 71 / 120 | No charge | —");
    expect(rows["Cinder"]).toBe("On sale | 245 / 440 | $4,409.00 | $1,146.00");
    expect(rows["Waveform Weekender"]).toBe("On sale | 391 / 570 | $23,189.00 | $4,711.00");
    expect(rows["Hollow Tide"]).toBe("Postponed | 247 / 450 | $7,023.00 | $570.00");
    expect(rows["Paper Moons"]).toBe("Past | 120 / 120 | $1,920.00 | $0.00");
  });

  it("reads Neon Circuit's Sales, type by type", async () => {
    const { go, idOf } = await open();
    const probe = await open();
    const sa = (await go("sales", { bev: probe.idOf("Neon Circuit") }))["sa"] as V;
    void idOf;
    expect((sa["kpis"] as V[]).map((k) => `${String(k["k"])} ${bidi(k["v"])} ${bidi(k["sub"])}`)).toEqual([
      "Sold 388 of 414",
      "Held right now 3 in checkouts, for 10 minutes",
      "Left 23 general admission",
      "Taken $10,287.00 recorded",
      "Owed $336.00 at the door or by transfer",
      "Checked in — after doors",
    ]);
    expect((sa["types"] as V[]).map((t) => bidi(t["txt"]))).toEqual([
      "80 paid · 0 owed · 0 held · 0 left",
      "231 paid · 12 owed · 3 held · 14 left",
      "61 paid · 0 owed · 0 held · 9 left",
      "4 no charge · 0 held · 0 left",
    ]);
    expect((sa["codes"] as V[]).map((c) => `${String(c["code"])} ${bidi(c["txt"])}`)).toEqual(["CREW5 3 on this show (11 of 50 in all)"]);
  });

  it("splits paid and owed on the other shows as the ledger does, and a cancelled show's money", async () => {
    const { go, idOf } = await open();
    const types = async (name: string) => (((await go("sales", { bev: idOf(name) }))["sa"] as V)["types"] as V[]).map((t) => bidi(t["txt"]));
    expect(await types("Cinder")).toEqual(["57 paid · 15 owed · 0 held · 28 left", "117 paid · 34 owed · 0 held · 129 left", "20 paid · 2 owed · 0 held · 48 left"]);
    expect(await types("Velvet Hour")).toEqual(["104 paid · 14 owed · 2 held · 0 left"]);
    expect(await types("Home Studio Basics")).toEqual(["9 paid · 4 owed · 0 held · 7 left"]);
    const velvet = (await go("sales", { bev: idOf("Velvet Hour") }))["sa"] as V;
    expect(bidi((velvet["kpis"] as V[])[1]!["sub"])).toBe("for a waitlist offer");
    const dust = (await go("sales", { bev: idOf("Dust Parade") }))["sa"] as V;
    expect((dust["kpis"] as V[]).map((k) => bidi(k["v"]))).toEqual(["$3,816.00", "$1,440.00", "$2,376.00"]);
    expect(dust["paceOn"]).toBe(false);
  });
});

describe("Orders and the drawer", () => {
  it("counts every state as the sample has them", async () => {
    const { go } = await open();
    const or = (await go("orders"))["or"] as V;
    const chips = Object.fromEntries((or["sts"] as V[]).map((c) => [String(c["label"]), bidi(c["n"])]));
    expect(chips).toEqual({
      All: "784",
      Paid: "569",
      "Pay at the door": "69",
      "Awaiting transfer": "8",
      "Transfer overdue": "3",
      "In checkout": "1",
      Offered: "1",
      "No charge": "50",
      "Refund due": "52",
      Refunded: "30",
      Cancelled: "1",
      "Let go or expired": "15",
    });
    expect(bidi(or["countTxt"])).toBe("Showing 50 of 784 orders");
  });

  it("approves WV-S8741's refund request, then records the refund: Refund due $24.00, then Refunded $24.00 of $48.00", async () => {
    const { app, box, v, go } = await open();
    await go("refunds");
    const order = (await box.port.list("orders", { where: [{ column: "number", eq: "WV-S8741" }] })).rows[0]!;
    box.openDrawer(order.id);
    let dr = (await v())["dr"] as V;
    expect([dr["st"], bidi(dr["balTxt"]), (dr["tickets"] as V[]).map((t) => `${String(t["holder"])} ${String(t["code"])} ${String(t["st"])}`)]).toEqual([
      "Paid",
      "Paid in full",
      ["Nia Hart SRH6-P0XF Valid", "Rui Varga 7EH5-79AZ Refund asked"],
    ]);
    const asked = (await box.port.list("tickets", { where: [{ column: "order_id", eq: order.id }, { column: "status", eq: "refund_asked" }] })).rows.map((t) => t.id);
    await box.approve(asked);
    dr = (await v())["dr"] as V;
    expect(bidi(dr["balTxt"])).toBe("Refund due $24.00");
    await box.refund((await box.port.list("orders", { where: [{ column: "id", eq: order.id }] })).rows[0]!, 24, "bank_transfer", "cancelled_tickets");
    dr = (await v())["dr"] as V;
    expect(bidi(dr["balTxt"])).toBe("Refunded $24.00 of $48.00 · 1 ticket live");
    expect(bidi(dr["st"])).toBe("Refunded $24.00 of $48.00");
    void app;
  });

  it("marks an overdue transfer paid, and releases another", async () => {
    const { box, v } = await open();
    const find = async (n: string) => (await box.port.list("orders", { where: [{ column: "number", eq: n }] })).rows[0]!;
    await box.pay(await find("WV-S8793"), 72, "bank_transfer", "");
    // How it was paid goes with the move: the transfer's payment email is sent on it, and the receipt says it.
    expect([(await find("WV-S8793"))["status"], (await find("WV-S8793"))["paid_method"]]).toEqual(["paid", "bank_transfer"]);
    await box.release((await find("WV-S8795")).id, "WV-S8795");
    expect((await find("WV-S8795"))["status"]).toBe("released");
    const td = (await v())["td"] as V;
    expect(bidi((td["needs"] as V[])[0]!["title"])).toBe("1 bank transfer is overdue");
  });

  it("refuses two more comps for Neon Circuit and leaves nothing held", async () => {
    const { app, box, v, idOf } = await open();
    const neon = idOf("Neon Circuit");
    const comps = box.world()!.byId.get(neon)!.types.find((t) => t.visibility === "box")!;
    app.openSheet("bxNew", { ev: neon, q: {}, names: {}, email: "", how: "", err: {}, key: "t-comps" });
    await box.createOrder({ eventId: neon, tickets: [{ ticket_type_id: comps.id, holder_name: null }, { ticket_type_id: comps.id, holder_name: null }], email: "", buyer: "", how: "none", method: "card", key: "t-comps" });
    const sh = (await v())["sh"] as V;
    expect(sh["refusal"]).toBe("Comps: all 4 are issued.");
    const pool = (await box.port.counts(neon)).find((p) => p.ticket_type_id === null)!;
    expect([pool.taken, pool.held]).toEqual([388, 3]);
  });

  it("makes a box-office order paid now, straight away", async () => {
    const { box, idOf } = await open();
    const neon = idOf("Neon Circuit");
    const std = box.world()!.byId.get(neon)!.types.find((t) => t.name === "Standard")!;
    await box.createOrder({ eventId: neon, tickets: [{ ticket_type_id: std.id, holder_name: "Lee Tan" }], email: "", buyer: "Lee Tan", how: "paidnow", method: "cash", key: "t-paid" });
    const made = (await box.port.list("orders", { where: [{ column: "channel", eq: "box_office" }, { column: "event_id", eq: neon }], sort: [{ column: "id", desc: true }], limit: 1 })).rows[0]!;
    expect([made["number"], made["status"], made["total"], made["balance"]]).toEqual(["WV-8816", "paid", 28, 0]);
  });
});

describe("Guest lists, the waitlist, codes, messages", () => {
  it("reads Neon's and Cinder's guest lists", async () => {
    const { go, idOf } = await open();
    const kpis = async (name: string) => ((((await go("guests", { gl: { ev: idOf(name), name: "", plus: 0, by: "", note: "", err: null } }))["gl"] as V)["kpis"] as V[]).map((k) => `${bidi(k["v"])} ${bidi(k["sub"])}`));
    expect(await kpis("Neon Circuit")).toEqual(["14 on the list", "22 counting the +1s", "36 14 left"]);
    expect(await kpis("Cinder")).toEqual(["3 on the list", "5 counting the +1s", "10 5 left"]);
  });

  it("shows Velvet Hour's waitlist, and a day on offers the two places back in joining order", async () => {
    const { demo, box, go, idOf } = await open();
    const velvet = idOf("Velvet Hour");
    let wv = (await go("waits", { wl: { ev: velvet } }))["wv"] as V;
    expect((wv["rows"] as V[]).map((r) => `${String(r["name"])} ${String(r["qty"])} ${bidi(r["st"])}`)).toEqual([
      "Lior Tamm 1 Claimed",
      "Gia Price 2 Didn't claim",
      "Mia Okada 2 Offered · 11 h 42 m left",
      "Kai Renner 1 Waiting",
      "Ana Ruiz 2 Waiting",
      "Hal Sato 1 Waiting",
      "Esme Rask 3 Waiting",
      "Otis Wilde 2 Waiting",
    ]);
    expect([bidi(wv["backTxt"]), wv["offerOn"]]).toEqual(["0 back", false]);
    demo.advance(24 * 60);
    wv = (await go("waits", { wl: { ev: velvet } }))["wv"] as V;
    expect([bidi(wv["backTxt"]), wv["offerLabel"]]).toEqual(["2 back", "Offer 2 tickets"]);
    await box.offer(velvet);
    wv = (await go("waits", { wl: { ev: velvet } }))["wv"] as V;
    expect((wv["rows"] as V[]).filter((r) => bidi(r["st"]).startsWith("Offered")).map((r) => String(r["name"]))).toEqual(["Kai Renner", "Ana Ruiz"]);
  });

  it("lists the four codes with their uses", async () => {
    const { go } = await open();
    const cd = (await go("codes"))["cd"] as V;
    expect((cd["rows"] as V[]).map((c) => `${String(c["code"])} | ${bidi(c["what"])} | ${bidi(c["where"])} | ${bidi(c["uses"])} | ${bidi(c["until"])} | ${String(c["on"])}`)).toEqual([
      "STUDENT10 | 10 % off | Home Studio Basics | 3 of 20 | Tue 28 Jul 23:59 | true",
      "BLOOMEARLY | Unlocks Presale | Static Bloom | 0 used | Sat 1 Aug 10:00 | true",
      "CREW5 | $5.00 off each ticket | Every Main Hall show | 11 of 50 | Wed 30 Sep 23:59 | true",
      "WKND-EARLY | 10 % off | Waveform Weekender | Used up · 40 of 40 | Sun 5 Jul 23:59 | false",
    ]);
  });

  it("counts a message's people and orders, the waiting one and the sent", async () => {
    const { go, idOf } = await open();
    const ms = (await go("msgs", { msg: { ev: idOf("Neon Circuit"), to: "everyone", typeId: null, tpl: null, subj: null, body: null, waiting: null } }))["ms"] as V;
    expect(bidi(ms["countTxt"])).toBe("145 people · 156 orders will get this");
    expect((ms["waiting"] as V[]).map((w) => `${String(w["show"])} · ${String(w["tpl"])} · ${bidi(w["n"])}`)).toEqual(["Hollow Tide · Postponed · 88 people · 90 orders"]);
    expect((ms["hist"] as V[]).map((h) => `${String(h["show"])} ${String(h["n"])} ${String(h["by"])}`)).toEqual(["Neon Circuit 145 Priya", "Dust Parade 79 Priya", "Cinder 79 Priya", "Waveform Weekender 162 Priya"]);
  });
});

describe("Postpone or cancel", () => {
  it("says what cancelling Cinder means in money, and whom it reaches", async () => {
    const { box, go, idOf } = await open();
    const cinder = idOf("Cinder");
    const pc = (await go("pc", { bev: cinder, pc: { ...box.s.pc, ev: cinder, mode: "cancel" } }))["pc"] as V;
    expect(bidi(pc["cancelMoney"])).toBe('75 orders · $4,409.00 received — pay each back and record it. The 13 pay-at-the-door and 6 transfer orders are listed as "Paid nothing".');
    expect(bidi(pc["people"])).toBe("94 people");
    expect((pc["sum"] as V[]).map((r) => bidi(r["v"]))).toEqual(["Fri 14 Aug", "245", "75", "$4,409.00"]);
  });

  it("lists Dust Parade's refunds to make, 20 a page, Mia's last", async () => {
    const { box, go, idOf } = await open();
    const dust = idOf("Dust Parade");
    let pc = (await go("pc", { bev: dust, pc: { ...box.s.pc, ev: dust } }))["pc"] as V;
    expect(bidi(pc["rfHead"])).toBe("82 orders · $3,816.00 received · $1,440.00 refunded · $2,376.00 still to pay back");
    expect(bidi(pc["rfProg"])).toBe("$1,440.00 of $3,816.00 · 30 of 82 orders");
    expect((pc["rfTabs"] as V[]).map((t) => `${String(t["label"])} ${bidi(t["n"])}`)).toEqual(["To refund 52", "Refunded 30", "Paid nothing 0"]);
    pc = (await go("pc", { bev: dust, pc: { ...box.s.pc, ev: dust, rfPage: 2 } }))["pc"] as V;
    expect(bidi(pc["rfPageTxt"])).toBe("Page 3 of 3 · 52 orders");
    expect((pc["rfRows"] as V[]).at(-1)!["no"]).toBe("WV-S8744");
  });
});

describe("The event editor", () => {
  it("saves a renamed show as one write, its counts and times untouched", async () => {
    const { box, v, go, idOf } = await open();
    const neon = idOf("Neon Circuit");
    await go("editor", { bev: neon, ed: null });
    await v();
    const ed = box.s.ed as { name: string; types: { sold: number; held: number }[] };
    expect(ed.types.map((t) => `${String(t.sold)}/${String(t.held)}`)).toEqual(["80/0", "243/3", "61/0", "4/0"]);
    const vals = (await go("editor", { ed: { ...ed, name: "Neon Circuit — late show" }, edDirty: true }))["ed"] as V;
    (vals["save"] as () => void)();
    await v();
    const saved = box.world()!.byId.get(neon as Id)!;
    expect([saved.name, saved.slug, box.s.edDirty]).toEqual(["Neon Circuit — late show", "neon-circuit", false]);
    const pool = (await box.port.counts(neon)).find((p) => p.ticket_type_id === null)!;
    expect([pool.size, pool.taken, pool.held]).toEqual([414, 388, 3]);
    expect(saved.refundUntil).toBe(Date.parse("2026-07-22T00:30:00Z"));
  });

  it("will not save a show without a name, and says why on the field", async () => {
    const { box, v, go } = await open();
    box.newEvent();
    await v();
    const vals = (await go("editor"))["ed"] as V;
    (vals["save"] as () => void)();
    const again = (await v())["ed"] as V;
    expect(((again["name"] as V)["err"] as string)).toBe("Give the night a name.");
    expect(box.world()!.shows).toHaveLength(14);
  });
});

describe("The editor after a save, and between shows", () => {
  it("reads the show back as saved after a save, and opens another show's own draft", async () => {
    const { box, v, go, idOf } = await open();
    const neon = idOf("Neon Circuit");
    await go("editor", { bev: neon, ed: null });
    await v();
    const ed = box.s.ed as { name: string };
    const vals = (await go("editor", { ed: { ...ed, name: "Neon Circuit — late show" }, edDirty: true }))["ed"] as V;
    (vals["save"] as () => void)();
    for (let i = 0; i < 5; i += 1) await v();
    expect([(box.s.ed as { name: string }).name, box.s.edDirty]).toEqual(["Neon Circuit — late show", false]);
    box.goShow(idOf("Cinder"), "editor");
    await v();
    expect((box.s.ed as { name: string; id: Id }).name).toBe("Cinder");
  });

  it("opens in Danish, and keeps a festival's start when only its words change", async () => {
    const { app, box, v, go, idOf } = await open();
    app.setState({ lang: "da-DK" });
    const fest = idOf("Waveform Weekender");
    const before = box.world()!.byId.get(fest)!.start;
    await go("editor", { bev: fest, ed: null });
    await v();
    const ed = box.s.ed as { about: string; days: unknown[] | null };
    expect(ed.days).toHaveLength(2);
    const vals = (await go("editor", { ed: { ...ed, about: "Two days, two rooms." }, edDirty: true }))["ed"] as V;
    (vals["save"] as () => void)();
    for (let i = 0; i < 5; i += 1) await v();
    expect(box.world()!.byId.get(fest)!.start).toBe(before);
  });

  it("will not save a show with its date cleared", async () => {
    const { box, v, go } = await open();
    box.newEvent();
    await v();
    const ed = box.s.ed as Record<string, unknown>;
    const vals = (await go("editor", { ed: { ...ed, name: "Night Swim", date: "" }, edDirty: true }))["ed"] as V;
    (vals["save"] as () => void)();
    const again = (await v())["ed"] as V;
    expect(bidi(again["timeErrTxt"])).toBe("Give the date and the times.");
    expect(box.world()!.shows).toHaveLength(14);
  });
});

describe("Release now", () => {
  it("is offered on an overdue transfer and not on one still awaited", async () => {
    const { box, v } = await open();
    const find = async (n: string) => (await box.port.list("orders", { where: [{ column: "number", eq: n }] })).rows[0]!;
    const acts = async (n: string) => {
      box.openDrawer((await find(n)).id);
      return (((await v())["dr"] as V)["acts"] as V[]).map((a) => String(a["id"]));
    };
    expect(await acts("WV-S8793")).toContain("rl");
    expect(await acts("WV-S8809")).not.toContain("rl");
  });
});

describe("box fixes", () => {
  /** The box office on the demo's Adminium, with the box office's port swapped or watched before anything is read. */
  async function boot(bx: WaveApp["state"]["bx"] = "today", patch: Partial<BoxState> = {}, before: (demo: DemoAdminium) => BoxOfficePort = (d) => d.boxOffice) {
    const demo = new DemoAdminium();
    const port = before(demo);
    const app = new WaveApp({ audience: demo.audience, boxOffice: port, door: demo.door }, "box", { lang: "en-US", theme: "dark" });
    app.demo = { onClock: (fn) => demo.onClock(fn) };
    await app.start({ timers: false });
    const box = boxOf(app);
    const settle = async () => {
      for (let i = 0; i < 8; i += 1) {
        renderVals(app);
        await app.idle();
      }
      return renderVals(app);
    };
    app.setState({ bx, box: { ...box.s, ...patch } });
    await settle();
    const idOf = (name: string) => box.world()!.shows.find((s) => s.name === name)!.id;
    const find = async (n: string) => (await demo.boxOffice.list("orders", { where: [{ column: "number", eq: n }] })).rows[0]!;
    return { app, demo, box, v: settle, idOf, find };
  }
  /** Which tables a port was asked to read, and how many pool counts. */
  const watch = (port: BoxOfficePort) => {
    const reads: string[] = [];
    const list = port.list.bind(port);
    const rows = port.rows.bind(port);
    const count = port.count.bind(port);
    const counts = port.counts.bind(port);
    port.list = (t, q) => (reads.push(t), list(t, q));
    port.rows = (t) => (reads.push(`rows:${t}`), rows(t));
    port.count = (t, w) => (reads.push(`count:${t}`), count(t, w));
    port.counts = (id) => (reads.push("pools"), counts(id));
    return reads;
  };

  it("asks again only what a write touched: a guest added re-reads the guest lists, never the shows or their places", async () => {
    let reads: string[] = [];
    const { box, v, idOf } = await boot("today", {}, (d) => ((reads = watch(d.boxOffice)), d.boxOffice));
    reads.length = 0;
    await box.addGuests(idOf("Neon Circuit"), [{ name: "Zed Ora", plus: 0, on_behalf: "", note: "" }]);
    await v();
    expect(reads).toContain("guest_list");
    expect(reads.filter((r) => r === "pools" || r.startsWith("rows:") || r === "orders" || r === "payments")).toEqual([]);
  });

  it("asks none of Today's or Events' reads on the door screen", async () => {
    let reads: string[] = [];
    const { v } = await boot("door", {}, (d) => ((reads = watch(d.boxOffice)), d.boxOffice));
    const out = await v();
    expect((out["td"] as V)["shows"]).toEqual([]);
    expect(reads.filter((r) => ["payments", "reminders", "broadcasts", "count:reminders"].includes(r))).toEqual([]);
  });

  it("keeps a door person on the door, whatever address they came in by", async () => {
    const { app, v } = await boot("orders", {}, (d) => new DemoBoxOffice(d.engine, { name: "Sam", roles: ["door"] }));
    await v();
    expect(app.state.bx).toBe("door");
    const nav = ((await v())["bo"] as V)["nav"] as V[];
    expect(nav.map((n) => n["id"])).toEqual(["door"]);
  });

  it("leaves out the drawer's buttons a role may not use", async () => {
    const { box, v, find } = await boot("orders", {}, (d) => new DemoBoxOffice(d.engine, { name: "Viv", roles: ["viewer"], tables: { orders: ["read"], tickets: ["read"] } }));
    box.openDrawer((await find("WV-S8793")).id);
    const acts = (((await v())["dr"] as V)["acts"] as V[]).map((a) => a["id"]);
    expect(acts).toEqual([]);
    expect(((await v())["or"] as V)["newOn"]).toBe(false);
  });

  it("finishes a show's cancel that stopped part-way: every order cancelled, every held email sent once, the message marked sent", async () => {
    const { app, demo, box, v, idOf } = await boot("pc");
    const low = idOf("Low Ceiling: new material night");
    const words = { subject: "Low Ceiling is cancelled", body: "Sorry." };
    await expect(cancelRun(demo.boxOffice, low, words, { stopAfter: 6 })).rejects.toThrow("stopped");
    const live = demo.world.where("orders", (o) => o["event_id"] === low && CANCELS.includes(String(o["status"])));
    expect(live.length).toBeGreaterThan(0);
    // The box office opens the show again later: Adminium's rows as they are now.
    app.refresh("box:");
    const pc = (await (async () => {
      box.goShow(low, "pc");
      return v();
    })())["pc"] as V;
    expect(pc["finishOn"]).toBe(true);
    await box.cancelShow(box.world()!.byId.get(low)!, { subject: "other words", body: "never used" });
    const orders = demo.world.where("orders", (o) => o["event_id"] === low && o["cancel_cause"] === "show");
    expect(demo.world.where("orders", (o) => o["event_id"] === low && CANCELS.includes(String(o["status"])))).toEqual([]);
    const ids = new Set(orders.map((o) => o.id));
    const mails = demo.world.where("messages", (m) => String(m["kind"]).startsWith("cancelled-") && ids.has(m["order_id"] as Id));
    expect(mails.filter((m) => m["status"] === "held")).toEqual([]);
    expect(mails.every((m) => m["subject_override"] === words.subject)).toBe(true);
    const sent = demo.world.where("broadcasts", (b) => b["event_id"] === low && b["template"] === "cancelled");
    expect(sent.map((b) => [b["status"], b["order_count"]])).toEqual([["sent", orders.length]]);
    // Run again: nothing more is written.
    const before = demo.world.all("messages").length;
    await cancelRun(demo.boxOffice, low, words);
    expect(demo.world.all("messages").length).toBe(before);
    expect((((await v())["pc"] as V)["finishOn"])).toBe(false);
  });

  it("says, while a cancel waits out Adminium's limit for the sign-in, when it goes on — and then goes on", async () => {
    const until = Date.parse("2026-07-28T20:31:00Z");
    const seen: (number | null | undefined)[] = [];
    const { app, demo, box, v, idOf } = await boot("pc", {}, (d) => {
      const port = d.boxOffice;
      const hear = new Set<(u: number | null) => void>();
      const list = port.list.bind(port);
      let waited = false;
      // The first orders read of the run is refused once for rate: the port waits (the screen says until when), then reads.
      port.list = async (table, query) => {
        if (table === "orders" && box.s.pc.run !== null && !waited) {
          waited = true;
          for (const h of hear) h(until);
          seen.push(box.s.pc.run?.waitUntil);
          const words = (renderVals(app)["pc"] as V)["runTxt"] as string;
          expect(words).toBe(`Adminium asks this sign-in to slow down: going on at ${fT(until)}. Keep this page open.`);
          for (const h of hear) h(null);
          seen.push(box.s.pc.run?.waitUntil);
        }
        return list(table, query);
      };
      (port as BoxOfficePort).onRateWait = (h: (u: number | null) => void) => {
        hear.add(h);
        return () => hear.delete(h);
      };
      return port;
    });
    const low = idOf("Low Ceiling: new material night");
    box.goShow(low, "pc");
    await v();
    await box.cancelShow(box.world()!.byId.get(low)!, { subject: "Low Ceiling is cancelled", body: "Sorry." });
    expect(seen).toEqual([until, null]);
    expect(demo.world.where("orders", (o) => o["event_id"] === low && CANCELS.includes(String(o["status"])))).toEqual([]);
    expect(app.state.toast?.msg).toBe("Low Ceiling: new material night cancelled");
  });

  it("says someone else is sending a message a colleague claimed first", async () => {
    const { app, demo, box, idOf } = await boot("msgs");
    const neon = idOf("Neon Circuit");
    const show = box.world()!.byId.get(neon)!;
    const waiting = await demo.boxOffice.broadcast({ event_id: neon, audience: "everyone", template: "other", subject: "Doors", body: "Soon.", people: 0, order_count: 0 }, [], false);
    // Adminium's answer to the second claim: the message is going out already.
    demo.boxOffice.sendBroadcast = () => Promise.reject(new ApiError(409, "STATE_UNCHANGED", { column: "status", state: "sending" }));
    await box.sendMessage(show, { audience: "everyone", template: "other", subject: "Doors", body: "Soon." }, waiting.id);
    expect(app.state.toast?.msg).toBe("Someone else is sending this message already — it goes out once.");
    // The demo refuses a claim of one going out already as Adminium does.
    await demo.boxOffice.update("broadcasts", waiting.id, { status: "sending" }, "waiting");
    await expect(demo.boxOffice.update("broadcasts", waiting.id, { status: "sending" }, "waiting")).rejects.toMatchObject({ code: "STATE_UNCHANGED", params: { column: "status", state: "sending" } });
    expect(sentByAnother(new ApiError(409, "STATE_MOVE_REFUSED", { column: "status", from: "sent", to: "sending", named: "waiting" }))).toBe(true);
    expect(sentByAnother(new ApiError(409, "STATE_MOVE_REFUSED", { requires: "time" }))).toBe(false);
  });

  it("never reports an order let go after a failed step as made; the sheet takes a fresh key", async () => {
    const { app, demo, box, v, idOf } = await boot("orders");
    const neon = idOf("Neon Circuit");
    const std = box.world()!.byId.get(neon)!.types.find((t) => t.name === "Standard")!;
    const move = demo.boxOffice.move.bind(demo.boxOffice);
    let fail = true;
    demo.boxOffice.move = async (id, status, values, from) => {
      if (status === "paid" && fail) {
        fail = false;
        throw new ApiError(503, "INTERNAL");
      }
      return move(id, status, values, from);
    };
    app.openSheet("bxNew", { ev: neon, q: {}, names: {}, email: "", how: "", err: {}, key: "bo-1753720200000-aaaaaa" });
    const order = { eventId: neon, tickets: [{ ticket_type_id: std.id, holder_name: "Lee Tan" }], email: "", buyer: "Lee Tan", how: "paidnow" as const, method: "cash" as const, key: "bo-1753720200000-aaaaaa" };
    await box.createOrder(order);
    await v();
    expect(app.state.sheet?.["key"]).not.toBe("bo-1753720200000-aaaaaa");
    const letGo = demo.world.where("orders", (o) => o["event_id"] === neon && o["buyer_name"] === "Lee Tan");
    expect(letGo.map((o) => o["status"])).toEqual(["let_go"]);
    // The same press again (the old key): the let-go order is named, not reported made.
    await box.createOrder(order);
    expect(String((await v())["sh"] && ((await v())["sh"] as V)["refusal"])).toContain("let go");
    expect(box.s.drawer).toBeNull();
    // With the fresh key: a new order, paid.
    await box.createOrder({ ...order, key: String(app.state.sheet?.["key"]) });
    const made = demo.world.where("orders", (o) => o["event_id"] === neon && o["buyer_name"] === "Lee Tan");
    expect(made.map((o) => o["status"])).toEqual(["let_go", "paid"]);
    expect(demo.world.where("payments", (p) => made.some((o) => o.id === p["order_id"]) && p["voided"] !== true)).toHaveLength(1);
  });

  it("makes nothing when the price is not the one on screen, and names the new total", async () => {
    const { app, demo, box, v, idOf } = await boot("orders");
    const neon = idOf("Neon Circuit");
    const std = box.world()!.byId.get(neon)!.types.find((t) => t.name === "Standard")!;
    app.openSheet("bxNew", { ev: neon, q: {}, names: {}, email: "", how: "", err: {}, key: "bo-1753720200000-bbbbbb" });
    await box.createOrder({ eventId: neon, tickets: [{ ticket_type_id: std.id, holder_name: "Pat Low" }], email: "", buyer: "Pat Low", how: "paidnow", method: "cash", key: "bo-1753720200000-bbbbbb", expect: 1 });
    expect(bidi(((await v())["sh"] as V)["refusal"])).toBe("The price changed to $28.00. Check it with them, then press Create again.");
    expect(demo.world.where("orders", (o) => o["buyer_name"] === "Pat Low")).toEqual([]);
  });

  it("records a payment once when the same press is sent again", async () => {
    const { demo, box, find } = await boot("orders");
    const order = await find("WV-S8793");
    await box.pay(order, 10, "bank_transfer", "", "pay-1753720200000-cccccc-0000000a");
    await box.pay(order, 10, "bank_transfer", "", "pay-1753720200000-cccccc-0000000a");
    expect(demo.world.where("payments", (p) => p["order_id"] === order.id && p["amount"] === 10)).toHaveLength(1);
  });

  it("ends an offer on the waitlist from its order, and puts someone who missed theirs back at the end", async () => {
    const { demo, box, idOf } = await boot("waits");
    const velvet = idOf("Velvet Hour");
    const mia = demo.world.where("waitlist", (w) => w["event_id"] === velvet && w["status"] === "offered")[0]!;
    await box.removeWaiting({ ...mia, order_id: null }, "Mia Okada");
    const offer = demo.world.where("orders", (o) => o["waitlist_id"] === mia.id)[0]!;
    expect(offer["status"]).toBe("expired");
    const gia = demo.world.where("waitlist", (w) => w["event_id"] === velvet && w["status"] === "missed")[0]!;
    await box.addWaiting(velvet, "Gia Price", String(gia["email"]), 1);
    const back = demo.world.get("waitlist", gia.id)!;
    expect([back["status"], back["qty"]]).toEqual(["waiting", 1]);
  });

  it("adds a note under the order's newest notes, never from the copy on screen", async () => {
    const { demo, box, find } = await boot("orders");
    const stale = await find("WV-S8793");
    demo.engine.update("orders", stale.id, { note: "Called them at 10:00" }, { origin: "staff", name: "Jo", roles: ["box-office"] });
    await box.note(stale, "Paid by phone");
    expect(demo.world.get("orders", stale.id)!["note"]).toBe("Called them at 10:00\nPaid by phone");
  });

  it("makes one set of offers when Offer is pressed twice", async () => {
    const { demo, box, v, idOf } = await boot("waits");
    const velvet = idOf("Velvet Hour");
    demo.advance(24 * 60);
    await v();
    const before = demo.world.all("orders").length;
    await Promise.all([box.offer(velvet), box.offer(velvet)]);
    // Kai's one and Ana's one: made once.
    expect(demo.world.all("orders").length - before).toBe(2);
  });

  it("turns off a code a database keeps as 1", async () => {
    const { demo, box } = await boot("codes");
    const code = demo.world.all("codes").find((c) => c["active"] === true)!;
    await box.toggleCode({ ...code, active: 1 });
    expect(demo.world.get("codes", code.id)!["active"]).toBe(false);
  });

  it("moves a festival's show and every day in one write; a message that did not go is offered again", async () => {
    const { demo, box, v, idOf } = await boot("pc");
    const fest = idOf("Waveform Weekender");
    const show = box.world()!.byId.get(fest)!;
    demo.boxOffice.broadcast = async () => {
      throw new ApiError(503, "INTERNAL");
    };
    const at = (t: number) => new Date(t + 7 * 86_400_000).toISOString();
    await box.postpone(show, { doors: at(show.doors), start: at(show.start), curfew: at(show.curfew), refundUntil: at(show.doors - 86_400_000) }, { subject: "Moved", body: "Moved." }, true, "later");
    const days = demo.world.where("event_days", (d) => d["event_id"] === fest).map((d) => Date.parse(String(d["doors_at"])));
    expect(days).toEqual(show.days.map((d) => d.doors + 7 * 86_400_000));
    box.goShow(fest, "pc");
    expect((((await v())["pc"] as V)["doneWriteOn"])).toBe(true);
  });

  it("sends a message that stopped part-way only to those it has not reached, and a sent one never again", async () => {
    const { demo } = await boot("msgs");
    const port = demo.boxOffice;
    const to = [{ order_id: 1, to_address: "a@example.com" }, { order_id: 2, to_address: "b@example.com" }];
    const b = await port.broadcast({ event_id: 1, audience: "everyone", template: "other", subject: "s", body: "b" }, [], false);
    demo.engine.update("broadcasts", b.id, { status: "sending" }, { origin: "staff", name: "Priya", roles: ["box-office"] });
    demo.engine.create("messages", { kind: "broadcast", status: "queued", event_id: 1, broadcast_id: b.id, order_id: 1, to_address: "a@example.com" }, { origin: "staff", name: "Priya", roles: ["box-office"] });
    await port.sendBroadcast(b.id, {}, to);
    expect(demo.world.where("messages", (m) => m["broadcast_id"] === b.id).map((m) => m["order_id"]).sort()).toEqual([1, 2]);
    expect(demo.world.get("broadcasts", b.id)!["status"]).toBe("sent");
    await expect(port.sendBroadcast(b.id, {}, to)).rejects.toMatchObject({ code: "STATE_MOVE_REFUSED" });
  });

  it("starts the venue day at 06:00 on its own clock, on both clock-change days", async () => {
    const { app, box } = await boot("today");
    app.zone = "Europe/London";
    expect(new Date(box.venueDayStart(Date.parse("2026-03-29T12:00:00Z"))).toISOString()).toBe("2026-03-29T05:00:00.000Z");
    expect(new Date(box.venueDayStart(Date.parse("2026-10-25T12:00:00Z"))).toISOString()).toBe("2026-10-25T06:00:00.000Z");
    expect(new Date(box.venueDayStart(Date.parse("2026-10-25T05:30:00Z"))).toISOString()).toBe("2026-10-24T05:00:00.000Z");
    expect(box.venueDayEnd(Date.parse("2026-10-24T12:00:00Z")) - box.venueDayStart(Date.parse("2026-10-24T12:00:00Z"))).toBe(25 * 3_600_000);
  });

  it("uploads a poster onto the show being edited", async () => {
    const { demo, box, v, idOf } = await boot("editor");
    const neon = idOf("Neon Circuit");
    box.goShow(neon, "editor");
    await v();
    const got: unknown[] = [];
    (demo.boxOffice as BoxOfficePort).uploadPoster = async (_file, eventId) => (got.push(eventId), "ref-1");
    const Img = class {
      naturalWidth = 2000;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    };
    vi.stubGlobal("Image", Img);
    vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:1", revokeObjectURL: () => undefined });
    await box.pickPoster(new File(["x"], "poster.jpg", { type: "image/jpeg" }));
    vi.unstubAllGlobals();
    expect(got).toEqual([neon]);
    expect((box.s.ed as { image: string }).image).toBe("ref-1");
  });
});

describe("a save of a show's draft", () => {
  const base: SaveRows = {
    values: { name: "Cinder", about: "Old", doors_at: "a", status: "published" },
    children: { event_days: [{ id: 1, doors_at: "a" }], ticket_types: [{ id: 10, name: "Standard", price: 20 }, { id: 11, name: "Balcony", price: 30 }], acts: [], questions: [] },
  };
  it("sends only what the draft changed, onto the show as it is now", () => {
    const mine: SaveRows = { ...base, values: { ...base.values, about: "New" }, children: { ...base.children, ticket_types: [{ id: 10, name: "Standard", price: 22 }] } };
    const cur: SaveRows = {
      values: { ...base.values, doors_at: "b" },
      children: { ...base.children, event_days: [{ id: 1, doors_at: "b" }], ticket_types: [...base.children.ticket_types, { id: 12, name: "Late", price: 15 }] },
    };
    const out = mergeDraft(base, mine, cur) as SaveRows;
    expect(out.values).toEqual({ about: "New" });
    expect(out.children.event_days).toEqual([{ id: 1, doors_at: "b" }]);
    // Balcony removed by this draft goes; Late added by a colleague stays; Standard's price is this draft's.
    expect(out.children.ticket_types).toEqual([{ id: 10, name: "Standard", price: 22 }, { id: 12, name: "Late", price: 15 }]);
  });
  it("names a conflict where both changed the same thing, and sends nothing", () => {
    const mine: SaveRows = { ...base, values: { ...base.values, doors_at: "c" } };
    const cur: SaveRows = { ...base, values: { ...base.values, doors_at: "b" } };
    expect(mergeDraft(base, mine, cur)).toEqual({ conflict: ["doors_at"] });
  });
});

describe("settings on a venue with no settings row", () => {
  it("makes the row on the first save (the sample removed, nothing saved since)", async () => {
    const { demo, box, go } = await open("settings");
    const row = demo.world.all("settings")[0]!;
    demo.world.remove("settings", row.id);
    box.refresh();
    await go("settings");
    expect(box.world()!.settingsRow.id).toBe(0);
    box.set({ set: { settings: { venue_name: "The Loft", address: "2 Mill Street", contact_email: "hello@loft.example" }, rooms: [], devices: [], gone: [] } });
    await box.saveSettings();
    const made = demo.world.all("settings");
    expect(made).toHaveLength(1);
    expect(made[0]!["venue_name"]).toBe("The Loft");
  });
});
