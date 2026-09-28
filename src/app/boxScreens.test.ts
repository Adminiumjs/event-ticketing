/**
 * The box office reads what the demo's Adminium answers, at the pinned clock
 * (Tue 28 Jul 2026, 16:30 at the venue): Today, Events, Sales, Orders, the
 * drawer, the guest lists, the waitlist, codes, messages and a cancelled
 * show's refunds show the sample's own figures, and its buttons land where
 * the plan says. Values only — the browser pass draws them.
 */
import { describe, expect, it } from "vitest";

import { DemoAdminium } from "../demo/adminium.ts";
import type { Id } from "../data/wire.ts";
import { boxOf, type BoxState } from "./box.ts";
import { renderVals } from "./vals/base.ts";
import { WaveApp } from "./wave.ts";

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
    expect((await find("WV-S8793"))["status"]).toBe("paid");
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
