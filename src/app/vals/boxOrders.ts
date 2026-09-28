/**
 * The box office's orders: Orders (searched and counted on the server) and
 * the order drawer, Refund requests, Guest lists, Waitlists and Codes. The
 * states, money and counts are Adminium's; a button shows only where its
 * move can happen.
 */
import type { Id, ListQuery, Row, Where } from "../../data/wire.ts";
import { tr } from "../../i18n/tr.ts";
import { LIVE, LIVE_TICKET, plural, type Box } from "../box.ts";
import type { BoxWorld } from "../boxWorld.ts";
import { fD, fT, money, ms, num, venueZone } from "../fmt.ts";
import type { WaveApp } from "../wave.ts";
import { posterOf } from "./audience.ts";
import type { V } from "./base.ts";
import { orderState, pill, when, type Tone } from "./box.ts";

const ALL_STATUSES = ["held", "confirming", "offered", "door", "awaiting_transfer", "overdue", "released", "no_charge", "paid", "not_collected", "let_go", "expired", "cancelled"];
const NOT_LET_GO = ALL_STATUSES.filter((x) => x !== "let_go" && x !== "expired");

/** Each chip of Orders, and the orders it counts. */
const LIVE_ST = ["door", "awaiting_transfer", "overdue", "no_charge", "paid"];
const has: Where = { column: "ticket_count", gt: 0 };
const none: Where = { column: "ticket_count", lte: 0 };
const owesNothing: Where = { column: "balance", gte: 0 };
const CHIPS: { id: string; label: () => string; where: Where[] }[] = [
  { id: "all", label: () => tr("All"), where: [{ column: "status", in: NOT_LET_GO }] },
  { id: "paid", label: () => tr("Paid"), where: [{ column: "status", eq: "paid" }, owesNothing, has] },
  { id: "door", label: () => tr("Pay at the door"), where: [{ column: "status", eq: "door" }, owesNothing, has] },
  { id: "awaiting", label: () => tr("Awaiting transfer"), where: [{ column: "status", eq: "awaiting_transfer" }, owesNothing, has] },
  { id: "overdue", label: () => tr("Transfer overdue"), where: [{ column: "status", eq: "overdue" }, owesNothing, has] },
  { id: "released", label: () => tr("Released"), where: [{ column: "status", eq: "released" }, owesNothing, { column: "refunded", lte: 0 }] },
  { id: "checkout", label: () => tr("In checkout"), where: [{ column: "status", in: ["held", "confirming"] }] },
  { id: "offered", label: () => tr("Offered"), where: [{ column: "status", eq: "offered" }] },
  { id: "nocharge", label: () => tr("No charge"), where: [{ column: "status", eq: "no_charge" }, owesNothing, has] },
  { id: "notcollected", label: () => tr("Didn't come"), where: [{ column: "status", eq: "not_collected" }, owesNothing] },
  { id: "refund", label: () => tr("Refund due"), where: [{ column: "balance", lt: 0 }] },
  { id: "refunded", label: () => tr("Refunded"), where: [{ column: "status", in: ["cancelled", "released", ...LIVE_ST] }, owesNothing, { column: "refunded", gt: 0 }, none] },
  { id: "cancelled", label: () => tr("Cancelled"), where: [{ column: "status", in: ["cancelled", ...LIVE_ST] }, owesNothing, { column: "refunded", lte: 0 }, none] },
  { id: "letgo", label: () => tr("Let go or expired"), where: [{ column: "status", in: ["let_go", "expired"] }] },
];

/** How an order pays, as its line says. */
export function payHow(o: Row): string {
  const st = String(o["status"]);
  if (Number(o["total"] ?? 0) <= 0 && Number(o["paid_in"] ?? 0) <= 0) return tr("No charge");
  if (st === "door" || st === "not_collected") return tr("At the door");
  if (["awaiting_transfer", "overdue", "confirming"].includes(st)) return tr("Bank transfer");
  switch (o["paid_method"]) {
    case "card":
      return tr("Card");
    case "cash":
      return tr("Cash");
    case "bank_transfer":
      return tr("Bank transfer");
    default:
      return Number(o["collected"] ?? 0) > 0 ? tr("At the door") : tr("Bank transfer");
  }
}

const methodWord = (m: unknown): string => (m === "card" ? tr("Card") : m === "cash" ? tr("Cash") : tr("Bank transfer"));

export function boxOrderVals(app: WaveApp, box: Box, w: BoxWorld, B: Record<string, unknown>, _v: V): V {
  return {
    ...ordersVals(app, box, w, B),
    ...drawerVals(app, box, w),
    ...refundsVals(app, box, w),
    ...guestVals(app, box, w, B),
    ...waitVals(app, box, w, B),
    ...codeVals(app, box, w),
  };
}

// ── Orders ───────────────────────────────────────────────────────────────────

/** The orders a search names: by number, buyer or email, or through a ticket's code or holder. */
function searchQuery(box: Box, q: string): { any?: Where[] } {
  const t = q.trim();
  if (t === "") return {};
  const tickets = box.list("tickets", { any: [{ column: "code", like: t }, { column: "holder_name", like: t }], limit: 50 })?.rows ?? [];
  const ids = [...new Set(tickets.map((x) => x["order_id"] as Id))];
  return { any: [{ column: "number", like: t }, { column: "buyer_name", like: t }, { column: "email", like: t }, ...(ids.length > 0 ? [{ column: "id", in: ids }] : [])] };
}

export function ordersQuery(box: Box): ListQuery {
  const o = box.s.ord;
  const chip = CHIPS.find((c) => c.id === o.st) ?? CHIPS[0]!;
  return {
    where: [...(o.ev === "all" ? [] : [{ column: "event_id", eq: o.ev }]), ...chip.where],
    ...searchQuery(box, o.q),
    sort: [{ column: "created_at", desc: true }],
  };
}

function ordersVals(app: WaveApp, box: Box, w: BoxWorld, B: Record<string, unknown>): V {
  if (app.state.bx !== "orders") return { or: { rows: [], sts: [], evOpts: [] } };
  const s = box.s;
  const o = s.ord;
  const chip = B["chip"] as (on: boolean) => string;
  const base: Where[] = o.ev === "all" ? [] : [{ column: "event_id", eq: o.ev }];
  const search = searchQuery(box, o.q);
  const q = ordersQuery(box);
  const page = box.list("orders", { ...q, limit: o.n });
  const sts = CHIPS.map((c) => {
    const n = box.list("orders", { where: [...base, ...c.where], ...search, limit: 0 })?.total;
    return { c, n };
  })
    .filter(({ c, n }) => c.id === "all" || (n ?? 0) > 0 || o.st === c.id)
    .map(({ c, n }) => ({
      id: c.id,
      label: c.label(),
      n: n === undefined ? "…" : num(n),
      on: o.st === c.id,
      style: chip(o.st === c.id),
      go: () => box.set({ ord: { ...o, st: c.id, n: 50 } }),
    }));
  const total = page?.total ?? 0;
  const shown = page?.rows.length ?? 0;
  const setOrd = (p: Partial<typeof o>) => box.set({ ord: { ...o, ...p } });
  return {
    or: {
      global: !o.tab,
      q: o.q,
      onQ: (e: { target: { value: string } }) => setOrd({ q: e.target.value, n: 50 }),
      ev: String(o.ev),
      // A show changed: the status goes back to All.
      onEv: (e: { target: { value: string } }) => setOrd({ ev: e.target.value === "all" ? "all" : (Number(e.target.value) as Id), st: "all", n: 50 }),
      evOpts: [{ id: "all", label: tr("All events") }, ...[...w.shows].sort((a, b) => b.start - a.start).map((e) => ({ id: String(e.id), label: `${e.name} · ${fD(e.start)}` }))],
      sts,
      rows: (page?.rows ?? []).map((r) => {
        const st = orderState(r, app.now);
        const show = w.byId.get(r["event_id"] as Id);
        const number = String(r["number"] ?? "");
        return {
          no: number,
          aria: tr("Open order {number}", { number }),
          buyer: String(r["buyer_name"] ?? "") || tr("Walk-in"),
          email: r["email"] === null || r["email"] === undefined || r["email"] === "" ? "—" : String(r["email"]),
          show: show?.short ?? show?.name ?? "",
          n: num(Number(r["ticket_count"] ?? 0)),
          total: Number(r["total"] ?? 0) === 0 && Number(r["paid_in"] ?? 0) === 0 ? tr("No charge") : money(r["total"]),
          how: payHow(r),
          st: st.txt,
          stStyle: pill(st.k),
          placed: when(r["created_at"]),
          open: (e?: { stopPropagation?: () => void }) => {
            e?.stopPropagation?.();
            box.openDrawer(r.id);
          },
        };
      }),
      empty: page !== undefined && total === 0,
      countTxt: page === undefined ? "" : tr("Showing {shown} of {total}", { shown: num(shown), total: plural(total, "{n} order", "{n} orders") }),
      moreOn: total > shown,
      more: () => setOrd({ n: o.n + 50 }),
      newOrder: () => box.newOrder(o.ev === "all" ? null : o.ev),
      csv: () => app.openSheet("bxExport", { fmt: "csv", n: total }),
    },
  };
}

// ── the order drawer ─────────────────────────────────────────────────────────

function drawerVals(app: WaveApp, box: Box, w: BoxWorld): V {
  const s = box.s;
  const blank = { dr: { on: false, tickets: [], pays: [], log: [], refs: [], acts: [], ans: [] } };
  if (s.drawer === null) return blank;
  const id = s.drawer;
  const order = box.list("orders", { where: [{ column: "id", eq: id }] })?.rows[0];
  if (order === undefined) return blank;
  const nar = app.narrow();
  const now = app.now;
  const show = w.byId.get(order["event_id"] as Id);
  const tickets = box.list("tickets", { where: [{ column: "order_id", eq: id }], sort: [{ column: "id" }] })?.rows ?? [];
  const payments = (box.list("payments", { where: [{ column: "order_id", eq: id }], sort: [{ column: "recorded_at" }] })?.rows ?? []).filter((p) => p["voided"] !== true);
  const refunds = (box.list("refunds", { where: [{ column: "order_id", eq: id }], sort: [{ column: "recorded_at" }] })?.rows ?? []).filter((p) => p["voided"] !== true);
  const collections = (box.list("door_collections", { where: [{ column: "order_id", eq: id }], sort: [{ column: "taken_at" }] })?.rows ?? []).filter((c) => c["state"] === "taken");
  const checkIns = tickets.length === 0 ? [] : (box.list("check_ins", { where: [{ column: "ticket_id", in: tickets.map((t) => t.id) }] })?.rows ?? []);
  const mails = box.list("messages", { where: [{ column: "order_id", eq: id }], sort: [{ column: "created_at" }] })?.rows ?? [];
  const history = box.history("orders", id) ?? [];
  const devices = new Map((box.rows("devices") ?? []).map((d) => [d.id, String(d["name"] ?? "")]));
  const past = show !== undefined && box.isPast(show);
  const st = orderState(order, now);
  const status = String(order["status"]);
  const gone = ["cancelled", "released", "let_go", "expired"].includes(status);
  const liveOrder = LIVE.includes(status);
  const bal = Number(order["balance"] ?? 0);
  const paid = Number(order["paid_in"] ?? 0) + Number(order["collected"] ?? 0);
  const refunded = Number(order["refunded"] ?? 0);
  const total = Number(order["total"] ?? 0);
  const liveTickets = tickets.filter((t) => LIVE_TICKET.includes(String(t["status"])));
  const typeName = (t: Row) => show?.types.find((x) => x.id === t["ticket_type_id"])?.short ?? "";

  const ticketRows = tickets.map((t) => {
    const ts = String(t["status"]);
    const ci = checkIns.find((c) => c["ticket_id"] === t.id);
    let x: [string, Tone];
    if (ts === "cancelled" || status === "cancelled") x = [tr("Cancelled"), "muted"];
    else if (status === "released") x = [tr("Released"), "muted"];
    else if (ts === "returned" || ts === "released") x = [tr("Back for the waitlist"), "muted"];
    else if (ts === "refund_asked") x = [tr("Refund asked"), "warn"];
    else if (ci !== undefined)
      x = [
        [tr("in at {time}", { time: fT(ci["scanned_at"]) }), devices.get(ci["device_id"] as Id) ?? "", String(ci["scanned_by"] ?? "")].filter((p) => p !== "").join(" · "),
        "pos",
      ];
    else if (past) x = [tr("Not used"), "muted"];
    else if (ts === "offered") x = [tr("Offered to {name}", { name: String(t["pending_name"] ?? "").split(" ")[0] ?? "" }), "accent"];
    else if (status === "door") {
      const due = Number(t["due"] ?? 0) - Number(t["collected"] ?? 0);
      x = due > 0 ? [tr("Pay {amount} at the door", { amount: money(due) }), "info"] : [tr("Valid"), "pos"];
    } else if (["awaiting_transfer", "overdue", "confirming", "held"].includes(status)) x = [tr("Waiting for payment"), "warn"];
    else if (status === "offered") x = [tr("Offered from the waitlist"), "accent"];
    else x = [tr("Valid"), "pos"];
    return { code: String(t["code"] ?? "—"), holder: String(t["holder_name"] ?? "") || tr("Name to add"), type: typeName(t), st: x[0], stStyle: pill(x[1]) };
  });

  const payRow = (p: Row, how: string, by: unknown, at: unknown, extra = "") => ({
    k: `${String(p.id)}-${how}`,
    v: [money(p["amount"]), how, fD(at), String(by ?? ""), extra].filter((x) => x !== "").join(" · "),
  });
  const pays = [
    ...payments.map((p) => payRow(p, methodWord(p["method"]), p["recorded_by"], p["recorded_at"])),
    ...collections.map((c) => payRow(c, c["method"] === "cash" ? tr("Cash at the door") : tr("Card at the door"), c["taken_by"], c["taken_at"], devices.get(c["device_id"] as Id) ?? "")),
    ...(w.settings.codesOn && order["code_id"] !== null && order["code_id"] !== undefined && Number(order["discount"] ?? 0) > 0
      ? [{ k: "code", v: tr("Code {code} · −{amount}", { code: String(order["code_text"] ?? ""), amount: money(order["discount"]) }) }]
      : []),
  ];
  const refs = refunds.map((r) => payRow(r, methodWord(r["method"]), r["recorded_by"], r["recorded_at"], r["kind"] === "goodwill" ? tr("tickets kept") : ""));

  // The balance, in words (Adminium's balance: above 0 owed, below 0 due back).
  const liveN = liveTickets.length;
  let balTxt: string;
  if (status === "not_collected") balTxt = tr("Not collected · {amount} — nobody paid at the door", { amount: money(bal) });
  else if (total === 0 && paid === 0 && !gone) balTxt = tr("No charge");
  else if (status === "released" && bal < 0) balTxt = tr("Released · {amount} came in after — refund due {due}", { amount: money(paid - refunded), due: money(-bal) });
  else if (bal > 0) balTxt = tr("Owes {amount}", { amount: money(bal) });
  else if (bal < 0) balTxt = tr("Refund due {amount}", { amount: money(-bal) });
  else if (refunded > 0) balTxt = tr("Refunded {refunded} of {paid} · {live}", { refunded: money(refunded), paid: money(paid), live: plural(liveN, "{n} ticket live", "{n} tickets live") });
  else if (gone) balTxt = tr("Nothing owing");
  else balTxt = tr("Paid in full");

  // The timeline: stamps, money, emails, check-ins and what the box office did.
  type L = { at: number; txt: string; dot: string };
  const log: L[] = [];
  const push = (at: unknown, txt: string, dot: string) => {
    const t = ms(at);
    if (t !== null) log.push({ at: t, txt, dot });
  };
  push(order["created_at"], order["channel"] === "box_office" ? tr("Order made at the box office") : order["channel"] === "door" ? tr("Sold at the door") : tr("Order placed"), "var(--accent)");
  // Confirmed later than placed: a transfer checkout confirmed from its email.
  if ((ms(order["confirmed_at"]) ?? 0) - (ms(order["created_at"]) ?? 0) > 60_000) push(order["confirmed_at"], tr("Confirmed by email"), "var(--fg-subtle)");
  for (const m of mails) push(m["sent_at"] ?? m["created_at"], tr("{kind} emailed to {to}", { kind: mailWord(String(m["kind"])), to: String(m["to_address"] ?? "") }), "var(--fg-subtle)");
  for (const p of payments) push(p["recorded_at"], tr("{amount} recorded · {how} · by {by}", { amount: money(p["amount"]), how: methodWord(p["method"]), by: String(p["recorded_by"] ?? "") }), "var(--pos)");
  for (const c of collections) push(c["taken_at"], tr("{amount} taken at the door · by {by}", { amount: money(c["amount"]), by: String(c["taken_by"] ?? "") }), "var(--pos)");
  for (const r of refunds) push(r["recorded_at"], tr("Refund of {amount} recorded · {how} · by {by}", { amount: money(r["amount"]), how: methodWord(r["method"]), by: String(r["recorded_by"] ?? "") }), "var(--info)");
  push(order["released_at"], tr("Released — tickets back on sale"), "var(--warn)");
  if (show?.status === "cancelled" && order["cancel_cause"] === "show") push(show.row["cancelled_at"], tr("{name} cancelled — tickets cancelled", { name: show.name }), "var(--danger)");
  else push(order["cancelled_at"], tr("Order cancelled"), "var(--danger)");
  for (const t of tickets) {
    const holder = String(t["holder_name"] ?? "");
    push(t["refund_asked_at"], tr("{name} asked for a refund", { name: holder }), "var(--warn)");
    push(t["refund_declined_at"], tr("Refund request declined"), "var(--warn)");
    if (t["accepted_at"] !== null && t["accepted_at"] !== undefined) push(t["accepted_at"], tr("Sent by {sender} · accepted by {name} — new code", { sender: String(t["sender_name"] ?? ""), name: holder }), "var(--info)");
    else if (t["sent_at"] !== null && t["sent_at"] !== undefined && t["status"] === "offered") push(t["sent_at"], tr("Offered to {name}", { name: String(t["pending_name"] ?? "") }), "var(--info)");
    push(t["cancelled_at"], tr("{name}'s ticket cancelled", { name: holder }), "var(--danger)");
  }
  for (const c of checkIns) {
    const t = tickets.find((x) => x.id === c["ticket_id"]);
    push(c["scanned_at"], [tr("{name} in at {time}", { name: String(t?.["holder_name"] ?? ""), time: fT(c["scanned_at"]) }), devices.get(c["device_id"] as Id) ?? "", String(c["scanned_by"] ?? "")].filter((x) => x !== "").join(" · "), "var(--pos)");
  }
  for (const h of history) {
    if (h.table === "orders" && typeof h.changes["note"] === "string") {
      const line = h.changes["note"].split("\n").pop() ?? "";
      push(h.at, tr("Note by {by}: {note}", { by: h.by ?? "", note: line }), "var(--warn)");
    }
    if (h.table === "tickets" && h.op === "update" && typeof h.changes["holder_name"] === "string") push(h.at, tr("Name changed by {by}: {name}", { by: h.by ?? "", name: h.changes["holder_name"] }), "var(--warn)");
  }
  log.sort((a, b) => a.at - b.at);

  // What can be done, by the order's state.
  const act = (aid: string, label: string, icon: string, go: () => void, danger = false) => ({
    id: aid,
    label,
    icon,
    go,
    style: `display:flex; align-items:center; gap:8px; min-height:40px; padding:0 12px; border-radius:10px; border:1px solid var(--border-strong); background:var(--surface); font-size:13px; font-weight:700; text-align:start; color:${danger ? "var(--danger)" : "var(--fg)"};`,
  });
  const asked = tickets.filter((t) => t["status"] === "refund_asked");
  const hasEmail = typeof order["email"] === "string" && order["email"] !== "";
  const waiting = ["awaiting_transfer", "overdue"].includes(status);
  const acts = [
    ...(hasEmail && liveOrder && !past ? [act("rs", tr("Resend"), "mail", () => void box.resend(order))] : []),
    ...(waiting && hasEmail ? [act("rm", tr("Remind"), "bell", () => void box.remind(order))] : []),
    ...(status === "confirming" && hasEmail ? [act("rc", tr("Send the confirm email again"), "mail", () => void box.resendConfirm(order))] : []),
    ...(liveOrder && !past && liveTickets.length > 0 ? [act("nm", tr("Change a name"), "user-pen", () => app.openSheet("bxName", { o: id, t: liveTickets[0]!.id, name: String(liveTickets[0]!["holder_name"] ?? ""), err: {} }))] : []),
    ...(bal > 0 && (["door", "awaiting_transfer", "overdue", "not_collected"].includes(status) || status === "released")
      ? [act("mp", tr("Mark as paid"), "badge-check", () => app.openSheet("bxPaid", { o: id, amt: bal.toFixed(2), method: status === "door" ? "card" : "bank_transfer", note: "", err: {} }))]
      : []),
    ...(paid - refunded > 0 ? [act("rf", tr("Record a refund"), "undo-2", () => app.openSheet("bxRefund", { o: id, amount: (bal < 0 ? -bal : paid - refunded).toFixed(2), how: String(payments[0]?.["method"] ?? collections[0]?.["method"] ?? "bank_transfer"), rkind: bal < 0 ? "cancelled_tickets" : "goodwill", note: "", err: {} }))] : []),
    ...(liveOrder && !past && liveTickets.length > 0 ? [act("cx", tr("Cancel tickets"), "ticket-x", () => app.openSheet("bxCancel", { o: id, sel: {} }), true)] : []),
    ...(asked.length > 0
      ? [
          act("ap", tr("Approve the refund request"), "check", () => app.openSheet("bxApprove", { o: id })),
          act("dc", tr("Decline the refund request"), "x", () => app.openSheet("bxDecline", { o: id, note: "" })),
        ]
      : []),
    ...(status === "overdue" ? [act("rl", tr("Release now"), "undo-2", () => app.openSheet("bxRelease", { o: id }), true)] : []),
    act("nt", tr("Add a note"), "sticky-note", () => app.openSheet("bxNote", { o: id, area: "" })),
  ];

  const answers = w.settings.questionsOn ? answerRows(order, tickets, w) : [];
  const due = ms(order["pay_by"]);
  // An order still waiting on someone: until when.
  const holdEnd = ms(order["offer_until"]) ?? ms(order["held_until"]);
  const note =
    holdEnd === null
      ? ""
      : status === "offered"
        ? tr("Offered from the waitlist · until {when}", { when: when(holdEnd) })
        : status === "confirming"
          ? tr("Waiting for {name} to confirm by email · until {when}", { name: String(order["buyer_name"] ?? "") || tr("the buyer"), when: when(holdEnd) })
          : status === "held"
            ? tr("In checkout · until {when}", { when: when(holdEnd) })
            : "";
  return {
    dr: {
      on: true,
      no: String(order["number"] ?? ""),
      st: st.txt,
      stStyle: pill(st.k),
      show: show === undefined ? "" : [show.name, fD(show.start), show.room?.name ?? ""].filter((x) => x !== "").join(" · "),
      buyer: String(order["buyer_name"] ?? "") || tr("Walk-in"),
      email: hasEmail ? String(order["email"]) : tr("No email — walk-in"),
      tickets: ticketRows,
      pays,
      paysNone: pays.length === 0,
      refs,
      refsOn: refs.length > 0,
      total: total === 0 && paid === 0 ? tr("No charge") : money(total),
      how: payHow(order),
      balTxt,
      noteOn: note !== "",
      note,
      dueOn: waiting && due !== null,
      due: due === null ? "" : when(due),
      ans: answers,
      ansOn: answers.length > 0,
      accessOn: typeof order["access_note"] === "string" && order["access_note"] !== "",
      access: String(order["access_note"] ?? ""),
      acts,
      log: log.map((l, i) => ({ k: `l${String(i)}`, txt: l.txt, at: when(l.at), dot: l.dot })),
      close: () => box.closeDrawer(),
      box: `position:absolute; inset-block:0; inset-inline-end:0; z-index:113; width:${nar ? "100%" : "min(480px,100%)"}; display:flex; flex-direction:column; background:var(--surface); color:var(--fg); border-inline-start:1px solid var(--border); box-shadow:-30px 0 60px -30px rgba(0,0,0,.5);`,
    },
  };
}

/** An email's kind, as the timeline names it. */
function mailWord(kind: string): string {
  const words: Record<string, string> = {
    tickets: tr("Tickets"),
    "tickets-paid": tr("Tickets"),
    "transfer-confirm": tr("The confirm link"),
    "transfer-waiting": tr("The transfer details"),
    "transfer-reminder": tr("A transfer reminder"),
    "transfer-released": tr("Tickets released"),
    "payment-received": tr("Payment received"),
    "waitlist-offer": tr("The waitlist offer"),
    moved: tr("The new date"),
    "refund-recorded": tr("Refund recorded"),
    "tickets-cancelled": tr("Tickets cancelled"),
    "refund-declined": tr("Refund request declined"),
    broadcast: tr("A message about the show"),
  };
  return words[kind] ?? tr("An email");
}

/** An order's checkout answers: each question, by ticket where asked for each. */
function answerRows(order: Row, tickets: Row[], w: BoxWorld): { k: string; v: string }[] {
  const qs = w.questions.filter((q) => q["event_id"] === order["event_id"]);
  if (qs.length === 0) return [];
  const read = (a: unknown, q: Row): string | null => {
    if (typeof a !== "object" || a === null) return null;
    const v = (a as Record<string, unknown>)[String(q.id)] ?? (a as Record<string, unknown>)[String(q["text"])];
    return v === undefined || v === null || v === "" ? null : v === true ? tr("Yes") : v === false ? tr("No") : String(v);
  };
  const out: { k: string; v: string }[] = [];
  for (const q of qs) {
    if (q["per"] === "order") {
      const v = read(order["answers"], q);
      if (v !== null) out.push({ k: String(q["text"]), v });
    } else {
      for (const t of tickets) {
        const v = read(t["answers"], q);
        if (v !== null) out.push({ k: `${String(t["holder_name"] ?? "")} · ${String(q["text"])}`, v });
      }
    }
  }
  return out;
}

// ── Refund requests ──────────────────────────────────────────────────────────

function refundsVals(app: WaveApp, box: Box, w: BoxWorld): V {
  if (app.state.bx !== "refunds") return { rq: { rows: [] } };
  const asked = box.list("tickets", { where: [{ column: "status", eq: "refund_asked" }], sort: [{ column: "refund_asked_at" }], limit: 500 })?.rows ?? [];
  const ids = [...new Set(asked.map((t) => t["order_id"] as Id))];
  const orders = ids.length === 0 ? [] : (box.list("orders", { where: [{ column: "id", in: ids }] })?.rows ?? []);
  const all = ids.length === 0 ? [] : (box.list("tickets", { where: [{ column: "order_id", in: ids }], limit: 2000 })?.rows ?? []);
  const rows = ids
    .map((oid) => orders.find((o) => o.id === oid))
    .filter((o): o is Row => o !== undefined)
    .map((o) => {
      const mine = asked.filter((t) => t["order_id"] === o.id);
      const show = w.byId.get(o["event_id"] as Id);
      const type = show?.types.find((t) => t.id === mine[0]?.["ticket_type_id"]);
      const n = mine.length;
      const of = all.filter((t) => t["order_id"] === o.id).length;
      return {
        no: String(o["number"]),
        buyer: String(o["buyer_name"] ?? ""),
        show: show?.name ?? "",
        what: tr("{tickets} (of {all})", { tickets: plural(n, `{n} ${type?.short ?? ""} ticket`, `{n} ${type?.short ?? ""} tickets`), all: num(of) }),
        paid: tr("{amount} paid", { amount: money(Number(o["paid_in"] ?? 0) + Number(o["collected"] ?? 0)) }),
        asked: tr("asked {when}", { when: when(mine[0]?.["refund_asked_at"]) }),
        open: () => box.openDrawer(o.id),
        approve: () => app.openSheet("bxApprove", { o: o.id }),
        decline: () => app.openSheet("bxDecline", { o: o.id, note: "" }),
      };
    });
  return { rq: { rows, empty: rows.length === 0 } };
}

// ── Guest lists ──────────────────────────────────────────────────────────────

/** A datetime-local value of an instant on the venue's clock ("2026-07-28T18:00"). */
export function localValue(t: number | null): string {
  if (t === null) return "";
  const d = fDateParts(t);
  return `${d.y}-${d.m}-${d.d}T${d.h}:${d.mi}`;
}
function fDateParts(t: number): { y: string; m: string; d: string; h: string; mi: string } {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: venueZone(), year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(t);
  const g = (k: string) => p.find((x) => x.type === k)?.value ?? "";
  return { y: g("year"), m: g("month"), d: g("day"), h: g("hour"), mi: g("minute") };
}

function guestVals(app: WaveApp, box: Box, w: BoxWorld, B: Record<string, unknown>): V {
  const s = box.s;
  const withList = w.shows.filter((e) => e.status === "published" && !box.isPast(e) && e.guestPlaces > 0).sort((a, b) => a.start - b.start);
  if (app.state.bx !== "guests") return { gl: { kpis: [], plus: [], rows: [], evOpts: [] } };
  const ev = (s.gl.ev === null ? undefined : w.byId.get(s.gl.ev)) ?? withList[0];
  if (ev === undefined) return { gl: { kpis: [], plus: [], rows: [], evOpts: [], empty: true, noShow: true } };
  const now = app.now;
  const rows = box.list("guest_list", { where: [{ column: "event_id", eq: ev.id }], sort: [{ column: "id" }], limit: 2000 })?.rows ?? [];
  const people = rows.reduce((a, g) => a + 1 + Number(g["plus"] ?? 0), 0);
  const places = ev.guestPlaces;
  const closes = ev.guestCloses;
  const closed = closes !== null && now >= closes;
  const full = places > 0 && people >= places;
  const gl = s.gl;
  const set = (p: Partial<typeof gl>) => box.set({ gl: { ...gl, ev: ev.id, ...p } });
  const seg = B["seg"] as (on: boolean) => string;
  return {
    gl: {
      ev: String(ev.id),
      onEv: (e: { target: { value: string } }) => box.set({ gl: { ...gl, ev: Number(e.target.value) as Id, err: null }, bev: Number(e.target.value) as Id }),
      evOpts: withList.map((e) => ({ id: String(e.id), label: `${e.name} · ${fD(e.start)}` })),
      closeV: localValue(closes),
      onClose: (e: { target: { value: string } }) => void box.setListCloses(ev.id, e.target.value === "" ? null : fromLocal(e.target.value, app.zone)),
      paste: () => app.openSheet("bxPaste", { ev: ev.id, area: "" }),
      kpis: [
        { k: tr("Names"), v: num(rows.length), sub: tr("on the list") },
        { k: tr("People"), v: num(people), sub: tr("counting the +1s") },
        { k: tr("Places"), v: num(places), sub: plural(Math.max(0, places - people), "{n} left", "{n} left") },
      ],
      closedOn: closed,
      closedTxt: tr("The list closed at {time}. You can still add a name — tell the door.", { time: fT(closes) }),
      overOn: full,
      overTxt: tr("The list is full — {places}. Raise the places in the event editor to add more.", { places: plural(places, "{n} place", "{n} places") }),
      nName: gl.name,
      onName: (e: { target: { value: string } }) => set({ name: e.target.value, err: null }),
      nErrOn: gl.err !== null,
      nErr: gl.err ?? "",
      plus: [0, 1, 2].map((p) => ({ id: p === 0 ? tr("None") : `+${String(p)}`, on: gl.plus === p, go: () => set({ plus: p }), style: seg(gl.plus === p) })),
      nBy: gl.by,
      onBy: (e: { target: { value: string } }) => set({ by: e.target.value }),
      nNote: gl.note,
      onNote: (e: { target: { value: string } }) => set({ note: e.target.value }),
      add: (e?: { preventDefault: () => void }) => {
        e?.preventDefault();
        const name = gl.name.trim();
        if (name === "") return set({ err: tr("Add a name") });
        if (places > 0 && people + 1 + gl.plus > places) return set({ err: tr("The list is full — {places}.", { places: plural(places, "{n} place", "{n} places") }) });
        void box.addGuests(ev.id, [{ name, plus: gl.plus, on_behalf: gl.by.trim(), note: gl.note.trim() }]).then((ok) => {
          if (ok) {
            set({ name: "", plus: 0, by: "", note: "", err: null });
            if (closed) app.toast(tr("The list closed at {time} — tell the door.", { time: fT(closes) }), "clock");
          }
        });
      },
      rows: rows.map((g) => {
        const plus = Number(g["plus"] ?? 0);
        const arrived = Number(g["arrived"] ?? 0);
        const name = String(g["name"] ?? "");
        return {
          id: g.id,
          name,
          plus: plus > 0 ? `+${String(plus)}` : "—",
          by: String(g["on_behalf"] ?? ""),
          note: String(g["note"] ?? ""),
          inTxt: arrived === 0 ? tr("Not yet") : arrived >= 1 + plus ? tr("In {time}", { time: fT(g["in_at"]) }) : tr("{n} of {all} in", { n: arrived, all: 1 + plus }),
          inStyle: `font-family:var(--mono); font-size:12px; font-weight:700; color:${arrived === 0 ? "var(--fg-subtle)" : arrived >= 1 + plus ? "var(--pos)" : "var(--warn)"};`,
          del: () => app.openSheet("bxGRemove", { g: g.id, ev: ev.id, name, arrived, all: 1 + plus }),
          delLabel: tr("Remove {name}", { name }),
        };
      }),
      empty: rows.length === 0,
      closeTxt: closes === null ? "" : tr("List closes {when}", { when: when(closes) }),
    },
  };
}

/** An instant from a datetime-local value on the venue's clock. */
export function fromLocal(value: string, zone: string): string {
  const [d, t] = value.split("T") as [string, string];
  const [y, m, day] = d.split("-").map(Number) as [number, number, number];
  const [h, mi] = (t ?? "00:00").split(":").map(Number) as [number, number];
  const guess = Date.UTC(y, m - 1, day, h, mi);
  const off = (at: number) => {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(at);
    const g = (k: string) => Number(p.find((x) => x.type === k)?.value ?? 0);
    return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute")) - at;
  };
  return new Date(guess - off(guess - off(guess))).toISOString();
}

// ── Waitlists ────────────────────────────────────────────────────────────────

function waitVals(app: WaveApp, box: Box, w: BoxWorld, B: Record<string, unknown>): V {
  const blank = { wv: { rows: [], p: {}, evOpts: [] } };
  if (app.state.bx !== "waits") return blank;
  const shows = w.shows.filter((e) => e.waitlistOn && e.status !== "cancelled").sort((a, b) => a.start - b.start);
  const ev = (box.s.wl.ev === null ? undefined : w.byId.get(box.s.wl.ev)) ?? shows.find((e) => !box.isPast(e)) ?? shows[0];
  if (ev === undefined) return { wv: { ...blank.wv, noShow: true } };
  const now = app.now;
  const rows = box.list("waitlist", { where: [{ column: "event_id", eq: ev.id }], sort: [{ column: "joined_at" }], limit: 2000 })?.rows ?? [];
  const customers = rows.length === 0 ? [] : (box.list("customers", { where: [{ column: "id", in: rows.map((r) => r["customer_id"]).filter((x) => x !== null) }] })?.rows ?? []);
  const nameOf = (r: Row) => String(customers.find((c) => c.id === r["customer_id"])?.["name"] ?? "") || String(r["email"] ?? "");
  const back = box.back(ev.id) ?? 0;
  const waiting = rows.filter((r) => r["status"] === "waiting").length;
  const sold = box.sold(ev);
  const doors = ev.doors;
  const offerH = w.settings.offerHours;
  const stOf = (r: Row): [string, Tone] => {
    switch (r["status"]) {
      case "claimed":
        return [tr("Claimed"), "pos"];
      case "missed":
        return [tr("Didn't claim"), "danger"];
      case "left":
      case "removed":
        return [tr("Left the list"), "muted"];
      case "offered": {
        const until = ms(r["offer_until"]);
        if (until === null || until <= now) return [tr("Didn't claim"), "danger"];
        return until >= doors - 60_000 ? [tr("Offered · until {time} (doors)", { time: fT(until) }), "warn"] : [tr("Offered · {left} left", { left: durShort(until - now) }), "warn"];
      }
      default:
        return [tr("Waiting"), "muted"];
    }
  };
  const nobody = back > 0 && waiting === 0;
  void B;
  return {
    wv: {
      ev: String(ev.id),
      onEv: (e: { target: { value: string } }) => box.set({ wl: { ev: Number(e.target.value) as Id } }),
      evOpts: shows.map((e) => ({ id: String(e.id), label: `${e.name} · ${fD(e.start)}` })),
      add: () => app.openSheet("bxWlAdd", { ev: ev.id, n: 1, name: "", email: "", err: {} }),
      p: posterOf(app, ev),
      name: ev.name,
      line: [fD(ev.start), ev.room?.name ?? "", ...(sold !== null && sold.left <= 0 ? [tr("sold out")] : [])].filter((x) => x !== "").join(" · "),
      backTxt: tr("{n} back", { n: num(back) }),
      backStyle: pill(back > 0 ? "warn" : "muted"),
      offerOn: back > 0 && waiting > 0,
      offerOff: back === 0 || waiting === 0,
      offerLabel: plural(back, "Offer {n} ticket", "Offer {n} tickets"),
      offer: () => void box.offer(ev.id),
      putBackOn: nobody,
      putBackLabel: plural(back, "Put {n} back on sale", "Put {n} back on sale"),
      putBack: () => app.openSheet("bxPutBack", { ev: ev.id, n: back }),
      hint: tr("Tickets that come back are held for the waitlist and go to the next people in order. Each offer is held for {hours} hours, and never past doors; if the next person asked for more than is back, they're offered what's back. Anything still back at doors goes on sale at the door.", { hours: offerH }),
      rows: rows.map((r, i) => {
        const st = stOf(r);
        const name = nameOf(r);
        const active = r["status"] === "waiting" || r["status"] === "offered";
        return {
          id: r.id,
          n: String(i + 1),
          name,
          email: String(r["email"] ?? ""),
          qty: String(r["qty"] ?? 1),
          joined: when(r["joined_at"]),
          st: st[0],
          stStyle: pill(st[1]),
          delOn: active,
          del: () => app.openSheet("bxWlRemove", { w: r.id, ev: ev.id, name, offered: r["status"] === "offered" }),
          delLabel: tr("Remove {name}", { name }),
        };
      }),
    },
  };
}

/** "11 h 42 m" */
const durShort = (span: number): string => {
  const m = Math.max(0, Math.round(span / 60_000));
  const h = Math.floor(m / 60);
  return h > 0 ? `${String(h)} h ${String(m % 60)} m` : `${String(m)} m`;
};

// ── Codes ────────────────────────────────────────────────────────────────────

/** What a code does, as its row says. */
export function codeWhat(c: Row, w: BoxWorld): string {
  const v = Number(c["value"] ?? 0);
  if (c["kind"] === "percent") return tr("{pct} % off", { pct: v });
  if (c["kind"] === "amount") return tr("{amount} off each ticket", { amount: money(v) });
  const t = w.typeRows.find((x) => x.id === c["unlocks_type_id"]);
  return tr("Unlocks {type}", { type: String(t?.["name"] ?? tr("a hidden ticket type")) });
}
/** Where a code works: a show, every show in a room, or every show. */
export function codeWhere(c: Row, w: BoxWorld): string {
  if (c["event_id"] !== null && c["event_id"] !== undefined) return w.byId.get(c["event_id"] as Id)?.name ?? "";
  if (c["room_id"] !== null && c["room_id"] !== undefined) return tr("Every {room} show", { room: w.rooms.find((r) => r.id === c["room_id"])?.name ?? "" });
  return tr("Every show");
}

function codeVals(app: WaveApp, box: Box, w: BoxWorld): V {
  if (app.state.bx !== "codes") return { cd: { rows: [] } };
  const codes = box.rows("codes") ?? [];
  const uses = box.list("orders", { where: [{ column: "code_id", isNull: false }, { column: "status", in: LIVE }], limit: 5000 })?.rows ?? [];
  const kinds: Record<string, string> = { standard: tr("Standard"), place: tr("Place"), presale: tr("Presale"), pass: tr("Weekend pass"), early: tr("Early entry"), balcony: tr("Balcony") };
  const rows = codes.map((c) => {
    const mine = uses.filter((o) => o["code_id"] === c.id);
    const used = mine.length;
    const max = c["max_uses"] === null || c["max_uses"] === undefined ? null : Number(c["max_uses"]);
    const on = c["active"] === true;
    const code = String(c["code"]);
    const byShow = new Map<Id, number>();
    for (const o of mine) byShow.set(o["event_id"] as Id, (byShow.get(o["event_id"] as Id) ?? 0) + 1);
    const wide = c["event_id"] === null || c["event_id"] === undefined;
    const usedUp = max !== null && used >= max;
    return {
      code,
      what: codeWhat(c, w),
      where: codeWhere(c, w),
      type: c["type_kind"] === null || c["type_kind"] === undefined ? tr("Every ticket type") : (kinds[String(c["type_kind"])] ?? String(c["type_kind"])),
      uses: usedUp ? tr("Used up · {n} of {max}", { n: num(used), max: num(max) }) : max === null ? plural(used, "{n} used", "{n} used") : tr("{n} of {max}", { n: num(used), max: num(max) }),
      perShowOn: wide && byShow.size > 0,
      perShow: [...byShow.entries()].map(([eid, n]) => `${w.byId.get(eid)?.short ?? ""} ${num(n)}`).join(" · "),
      bar: `display:block; width:${max === null ? 0 : Math.min(100, (used / Math.max(1, max)) * 100).toFixed(1)}%; background:${usedUp ? "var(--danger)" : "var(--accent)"};`,
      until: c["valid_until"] === null || c["valid_until"] === undefined ? "—" : when(c["valid_until"]),
      on,
      swLabel: on ? tr("Turn off {code}", { code }) : tr("Turn on {code}", { code }),
      swTrack: `position:relative; display:inline-block; width:36px; height:21px; flex-shrink:0; border-radius:999px; background:${on ? "var(--accent)" : "var(--surface-3)"};`,
      swKnob: `position:absolute; inset-block-start:3px; inset-inline-start:${on ? "18px" : "3px"}; width:15px; height:15px; border-radius:50%; background:${on ? "var(--accent-fg)" : "var(--fg-subtle)"};`,
      toggle: () => void box.toggleCode(c),
      edit: () => app.openSheet("bxCode", codeSheetState(c, app.zone)),
      editLabel: tr("Edit {code}", { code }),
    };
  });
  return { cd: { rows, empty: rows.length === 0, create: () => app.openSheet("bxCode", codeSheetState(null, app.zone)) } };
}

/** A code's sheet, filled from the code (or empty for a new one). */
export function codeSheetState(c: Row | null, zone: string): Record<string, unknown> {
  void zone;
  if (c === null) return { id: null, code: "", ckind: "percent", val: "", where: "all", typeKind: "", unlocks: "", limit: "", until: "", err: {} };
  const where = c["event_id"] !== null && c["event_id"] !== undefined ? `ev:${String(c["event_id"])}` : c["room_id"] !== null && c["room_id"] !== undefined ? `room:${String(c["room_id"])}` : "all";
  return {
    id: c.id,
    code: String(c["code"]),
    ckind: String(c["kind"] ?? "percent"),
    val: c["value"] === null || c["value"] === undefined ? "" : String(c["value"]),
    where,
    typeKind: String(c["type_kind"] ?? ""),
    unlocks: c["unlocks_type_id"] === null || c["unlocks_type_id"] === undefined ? "" : String(c["unlocks_type_id"]),
    limit: c["max_uses"] === null || c["max_uses"] === undefined ? "" : String(c["max_uses"]),
    until: localValue(ms(c["valid_until"])),
    err: {},
  };
}

