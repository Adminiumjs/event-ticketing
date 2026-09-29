/**
 * The box office's sheets, on the one sheet anatomy: money recorded and given
 * back, names, cancels, a refund request approved or declined, a release, a
 * note, an export, a new order; guests pasted and removed; a waitlist place
 * added or ended; a code made or changed. Each checks what it can before it
 * asks; Adminium decides, and its refusal lands in the sheet.
 */
import type { Id, OrderBody, Row } from "../../data/wire.ts";
import { tr } from "../../i18n/tr.ts";
import { boxOf, hashKey, LIVE_TICKET, mintKey, plural, unsentScans, type Box } from "../box.ts";
import { doorOf } from "../door.ts";
import type { BoxShow } from "../boxWorld.ts";
import { codeFace, fD, fT, money, ms, num } from "../fmt.ts";
import type { WaveApp } from "../wave.ts";
import { S, type V } from "./base.ts";
import { fromLocal, localValue, ordersQuery, payHow } from "./boxOrders.ts";
import type { SheetKit } from "./sheets.ts";

type Opt = [string, string] | [string, string, boolean];
const okEmail = (v: unknown): boolean => /^\S+@\S+\.\S+$/.test(String(v ?? "").trim());
const amountOf = (v: unknown): number => {
  const n = Number(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
};
const METHODS = (): Opt[] => [
  ["bank_transfer", tr("Bank transfer")],
  ["card", tr("Card")],
  ["cash", tr("Cash")],
];

export function boxSheet(app: WaveApp, o: V & { fields: unknown[]; btns: unknown[]; groups: unknown[] }, sh: Record<string, unknown>, kit: SheetKit): void {
  const box = boxOf(app);
  const w = box.world();
  if (w === null) return;
  const k = String(sh.kind);
  const { set, fld, P, busy } = kit;
  const errs = (sh["err"] ?? {}) as Record<string, string | null>;
  const chipSt = (on: boolean, off = false) =>
    `min-height:36px; padding:0 12px; border-radius:10px; cursor:${off ? "not-allowed" : "pointer"}; font-size:13px; font-weight:700; border:1px solid ${on ? "var(--accent)" : "var(--border-strong)"}; background:${on ? "var(--accent-soft)" : "var(--surface)"}; color:${off ? "var(--fg-subtle)" : on ? "var(--accent)" : "var(--fg-muted)"};`;
  const grp = (label: string, opts: Opt[], cur: unknown, key: string, multi = false, hint = "") => ({
    k: label,
    role: multi ? "group" : "radiogroup",
    itemRole: multi ? "checkbox" : "radio",
    hint,
    hintOn: hint !== "",
    opts: opts.map(([id, lab, off]) => {
      const on = multi ? ((sh[key] ?? {}) as Record<string, boolean>)[id] === true : cur === id;
      return {
        id,
        label: lab,
        on,
        off: off === true,
        style: chipSt(on, off === true),
        go: () => {
          if (off === true) return;
          set(multi ? { [key]: { ...((sh[key] ?? {}) as Record<string, boolean>), [id]: !on } } : { [key]: id, err: {} });
        },
      };
    }),
  });
  const monoFld = (key: string) => `${errs[key] ? S.fldErr : S.fld}font-family:var(--mono);`;
  const refusal = typeof sh["refusal"] === "string" ? String(sh["refusal"]) : "";
  if (refusal !== "") Object.assign(o, { refusalOn: true, refusal });
  if (busy) Object.assign(o, { noteOn: true, note: tr("Saving…") });

  const order = sh["o"] === undefined ? undefined : box.list("orders", { where: [{ column: "id", eq: sh["o"] as Id }] })?.rows[0];
  const tickets = order === undefined ? [] : (box.list("tickets", { where: [{ column: "order_id", eq: order.id }], sort: [{ column: "id" }] })?.rows ?? []);
  const show = order === undefined ? undefined : w.byId.get(order["event_id"] as Id);
  const number = String(order?.["number"] ?? "");
  const buyer = String(order?.["buyer_name"] ?? "") || tr("Walk-in");
  const bal = Number(order?.["balance"] ?? 0);
  const paid = Number(order?.["paid_in"] ?? 0) + Number(order?.["collected"] ?? 0);
  const refunded = Number(order?.["refunded"] ?? 0);
  const live = tickets.filter((t) => LIVE_TICKET.includes(String(t["status"])));
  const label = (t: Row) => `${String(t["holder_name"] ?? "") || tr("Name to add")} · ${codeFace(String(t["code"] ?? "—"))}`;

  if (k === "bxUser") {
    const me = box.me();
    const doorRole = me?.roles.includes("box-office") !== true;
    const dev = doorRole ? doorOf(app).device() : null;
    Object.assign(o, {
      icon: "user-round",
      title: doorRole ? `${me?.name ?? ""} · ${String(dev?.["name"] ?? tr("Door"))}` : `${me?.name ?? ""} · ${tr("Box office")}`,
      sub: doorRole ? tr("Signed in to the door on this phone") : tr("Signed in to the {venue} box office", { venue: w.settings.venueName }),
      btns: [P(tr("Sign out"), () => box.signOut(), "g")],
    });
  }

  // Which door this phone is: its check-ins and the money it takes are this door's.
  if (k === "drDevice") {
    const door = doorOf(app);
    const cur = door.device();
    Object.assign(o, {
      icon: "smartphone",
      title: tr("Which door is this phone?"),
      sub: tr("Its check-ins and the money it takes count for that door."),
      groups: [grp(tr("Door"), door.devices().map((d) => [String(d.id), String(d["name"] ?? "")] as Opt), String(sh["pick"] ?? cur?.id ?? ""), "pick")],
      submitLabel: tr("Use this door"),
      submit: (e?: { preventDefault: () => void }) => {
        e?.preventDefault();
        const pick = sh["pick"] ?? cur?.id;
        if (pick !== undefined) door.chooseDevice(Number(pick));
      },
    });
  }

  // Signing out with check-ins this phone has not sent yet.
  if (k === "drSignOut") {
    const n = unsentScans();
    Object.assign(o, {
      icon: "wifi-off",
      tone: "warn",
      title: tr("{n} check-in hasn't synced yet|{n} check-ins haven't synced yet", { n }),
      body: tr("They are only on this phone. Signing out now loses them."),
      btns: [P(tr("Stay signed in"), () => app.closeSheet()), P(tr("Sign out anyway"), () => box.signOut(true), "d")],
    });
  }

  if (k === "bxLeave") {
    Object.assign(o, {
      icon: "triangle-alert",
      tone: "warn",
      title: tr("Leave without saving?"),
      body: tr("Your changes to this event will be lost."),
      btns: [
        P(tr("Leave without saving"), () => box.leaveEditor(sh), "d"),
        P(tr("Keep editing"), () => app.closeSheet(), "g"),
      ],
    });
  }

  if (k === "bxPaid" && order !== undefined) {
    const amt = amountOf(sh["amt"]);
    const over = Number.isFinite(amt) && amt > bal + 0.001 ? Math.round((amt - bal) * 100) / 100 : 0;
    Object.assign(o, {
      icon: "badge-check",
      title: tr("Mark {number} as paid", { number }),
      sub: `${buyer} · ${tr("owes {amount}", { amount: money(bal) })}`,
      groups: [grp(tr("How"), METHODS(), sh["method"], "method")],
      fields: [fld("bp-amt", tr("Amount"), "amt", "text", { im: "decimal", style: monoFld("amt") }), fld("bp-note", tr("Note (optional)"), "note", "text")],
      ...(over > 0 ? { noteOn: true, note: tr("That's {amount} more than owed — it will show as due back.", { amount: money(over) }) } : {}),
      submitLabel: tr("Mark as paid"),
      submit: (e?: { preventDefault: () => void }) => {
        e?.preventDefault();
        if (busy) return;
        if (!(amt > 0)) return set({ err: { amt: tr("Enter the amount received") } });
        // The sheet's own key with what it records: pressed again after a lost answer, the same payment is found.
        const key = String(sh["key"] ?? "") || mintKey("pay");
        if (sh["key"] !== key) set({ key });
        void box.pay(order, amt, sh["method"] as "bank_transfer" | "card" | "cash", String(sh["note"] ?? "").trim(), `${key}-${hashKey(`${String(amt)}:${String(sh["method"])}`)}`);
      },
    });
  }

  if (k === "bxName" && order !== undefined) {
    const chosen = live.find((t) => t.id === sh["t"]) ?? live[0];
    Object.assign(o, {
      icon: "user-pen",
      title: tr("Change a name on {number}", { number }),
      groups: [
        {
          ...grp(
            tr("Ticket"),
            live.map((t) => [String(t.id), label(t)] as Opt),
            String(chosen?.id ?? ""),
            "tsel",
          ),
          // The field follows the ticket chosen.
          opts: live.map((t) => ({
            id: String(t.id),
            label: label(t),
            on: t.id === chosen?.id,
            off: false,
            style: chipSt(t.id === chosen?.id),
            go: () => set({ t: t.id, name: String(t["holder_name"] ?? ""), err: {} }),
          })),
        },
      ],
      fields: [fld("bn-name", tr("New name"), "name", "text")],
      noteOn: !busy,
      note: busy ? tr("Saving…") : tr("The ticket keeps its code."),
      submitLabel: tr("Save the name"),
      submit: (e?: { preventDefault: () => void }) => {
        e?.preventDefault();
        if (busy || chosen === undefined) return;
        const name = String(sh["name"] ?? "").trim();
        if (name === "") return set({ err: { name: tr("Add a name") } });
        void box.rename(chosen.id, name);
      },
    });
  }

  if (k === "bxCancel" && order !== undefined && show !== undefined) {
    const sel = (sh["sel"] ?? {}) as Record<string, boolean>;
    const chosen = live.filter((t) => sel[String(t.id)] === true);
    const n = chosen.length;
    const drop = chosen.reduce((a, t) => a + Number(t["due"] ?? t["price"] ?? 0), 0);
    const newTotal = Math.max(0, Number(order["total"] ?? 0) - drop);
    const back = Math.max(0, paid - refunded - newTotal);
    const waitlist = show.waitlistOn;
    const note =
      n === 0
        ? tr("Cancelled tickets stop working at the door. Recording a refund is a separate step.")
        : paid - refunded > 0
          ? tr("The order's total drops to {total}; {back} will be due back. Cancelled tickets stop working at the door.", { total: money(newTotal), back: money(back) })
          : tr("The order's total drops to {total}.", { total: money(newTotal) });
    Object.assign(o, {
      icon: "ticket-x",
      tone: "danger",
      title: tr("Cancel tickets on {number}", { number }),
      groups: [grp(tr("Which tickets"), live.map((t) => [String(t.id), label(t)] as Opt), null, "sel", true)],
      noteOn: true,
      note: waitlist && n > 0 ? `${note} ${tr("They go to the waitlist.")}` : note,
      submitLabel: n === 0 ? tr("Choose tickets to cancel") : plural(n, "Cancel {n} ticket", "Cancel {n} tickets"),
      submitStyle: `${S.btnP}width:100%; background:var(--danger); color:#fff;`,
      submit: (e?: { preventDefault: () => void }) => {
        e?.preventDefault();
        if (busy) return;
        if (n === 0) return set({ refusal: tr("Choose at least one ticket") });
        void box.cancelTickets(order, chosen.map((t) => t.id), n >= live.length, waitlist);
      },
    });
  }

  if (k === "bxRefund" && order !== undefined) {
    const max = Math.round((paid - refunded) * 100) / 100;
    const kind = sh["rkind"] === "goodwill" ? "goodwill" : "cancelled_tickets";
    Object.assign(o, {
      icon: "undo-2",
      title: tr("Record a refund on {number}", { number }),
      sub: [buyer, tr("received {amount}", { amount: money(paid) }), ...(refunded > 0 ? [tr("refunded {amount}", { amount: money(refunded) })] : []), payHow(order)].join(" · "),
      groups: [
        grp(
          tr("What is it for?"),
          [
            ["cancelled_tickets", tr("Cancelled tickets")],
            ["goodwill", tr("Money back, tickets stay")],
          ],
          kind,
          "rkind",
          false,
          kind === "goodwill" ? tr("The order's total drops by this amount. The tickets still work.") : "",
        ),
        grp(tr("How it was paid back"), METHODS(), sh["how"], "how"),
      ],
      fields: [fld("br-amt", tr("Amount paid back"), "amount", "text", { im: "decimal", style: monoFld("amount") }), fld("br-note", tr("Note (optional)"), "note", "text")],
      noteOn: true,
      note: busy ? tr("Saving…") : tr("Recording a refund doesn't move money. Pay it back first, then record it here. It never cancels anything by itself."),
      submitLabel: tr("Record the refund"),
      submit: (e?: { preventDefault: () => void }) => {
        e?.preventDefault();
        if (busy) return;
        const amt = amountOf(sh["amount"]);
        if (!(amt > 0) || amt > max + 0.001) return set({ err: { amount: tr("Enter an amount up to {max}", { max: money(max) }) } });
        const key = String(sh["key"] ?? "") || mintKey("refund");
        if (sh["key"] !== key) set({ key });
        void box.refund(order, amt, sh["how"] as "bank_transfer" | "card" | "cash", kind, `${key}-${hashKey(`${String(amt)}:${String(sh["how"])}:${kind}`)}`);
      },
    });
  }

  if (k === "bxApprove" && order !== undefined) {
    const asked = tickets.filter((t) => t["status"] === "refund_asked");
    const back = asked.reduce((a, t) => a + Number(t["due"] ?? t["price"] ?? 0), 0);
    const who = asked.map((t) => tr("{name}'s ticket ({code})", { name: String(t["holder_name"] ?? ""), code: codeFace(String(t["code"] ?? "")) })).join(", ");
    Object.assign(o, {
      icon: "check",
      title: tr("Approve the refund on {number}?", { number }),
      body: asked.length === 1 ? tr("{who} is cancelled and {amount} becomes due back. {buyer} is told.", { who, amount: money(back), buyer }) : tr("{who} are cancelled and {amount} becomes due back. {buyer} is told.", { who, amount: money(back), buyer }),
      btns: [P(tr("Approve"), () => void box.approve(asked.map((t) => t.id))), P(tr("Not yet"), () => app.closeSheet(), "g")],
    });
  }

  if (k === "bxDecline" && order !== undefined) {
    const asked = tickets.filter((t) => t["status"] === "refund_asked");
    Object.assign(o, {
      icon: "x",
      title: tr("Decline the refund request on {number}", { number }),
      sub: tr("The ticket works again."),
      areaOn: true,
      areaLabel: tr("Reason (for the order's notes)"),
      area: String(sh["note"] ?? ""),
      onArea: (e: { target: { value: string } }) => set({ note: e.target.value }),
      areaPh: show?.refundUntil === null || show === undefined ? tr("Refunds for this show closed…") : tr("Refunds for this show closed on {day}.", { day: fD(show.refundUntil) }),
      submitLabel: tr("Decline"),
      submit: (e?: { preventDefault: () => void }) => {
        e?.preventDefault();
        if (busy) return;
        void box.decline(order, asked.map((t) => t.id), String(sh["note"] ?? ""));
      },
    });
  }

  if (k === "bxRelease" && order !== undefined) {
    const n = live.length || Number(order["ticket_count"] ?? 0);
    const tix = plural(n, "{n} ticket", "{n} tickets");
    Object.assign(o, {
      icon: "undo-2",
      tone: "danger",
      title: tr("Release {number}?", { number }),
      body:
        show?.waitlistOn === true
          ? tr("Its {tickets} are held for the waitlist and {buyer} is told.", { tickets: tix, buyer })
          : tr("Its {tickets} go back on sale and {buyer} is told.", { tickets: tix, buyer }),
      btns: [P(tr("Release"), () => void box.release(order.id, number), "d"), P(tr("Keep waiting"), () => app.closeSheet(), "g")],
    });
  }

  if (k === "bxNote" && order !== undefined) {
    Object.assign(o, {
      icon: "sticky-note",
      title: tr("Add a note to {number}", { number }),
      sub: tr("Only the box office sees notes."),
      areaOn: true,
      areaLabel: tr("Note"),
      area: String(sh["area"] ?? ""),
      onArea: (e: { target: { value: string } }) => set({ area: e.target.value, refusal: null }),
      areaPh: tr("What happened"),
      submitLabel: tr("Add the note"),
      submit: (e?: { preventDefault: () => void }) => {
        e?.preventDefault();
        if (busy) return;
        const text = String(sh["area"] ?? "").trim();
        if (text === "") return set({ refusal: tr("Write a note first") });
        void box.note(order, text);
      },
    });
  }

  if (k === "bxExport") {
    const n = Number(sh["n"] ?? 0);
    const formats = box.port.exportFormats?.() ?? ["csv"];
    const words: Record<string, string> = { csv: "CSV", xlsx: tr("Excel (.xlsx)"), pdf: "PDF" };
    const fmt = formats.includes(String(sh["fmt"])) ? String(sh["fmt"]) : formats[0]!;
    Object.assign(o, {
      icon: "download",
      title: plural(n, "Export {n} order", "Export {n} orders"),
      groups: [grp(tr("File type"), formats.map((f) => [f, words[f] ?? f] as Opt), fmt, "fmt")],
      submitLabel: tr("Export"),
      submit: (e?: { preventDefault: () => void }) => {
        e?.preventDefault();
        if (busy) return;
        void box.exportOrders(ordersQuery(box), fmt, n);
      },
    });
  }

  if (k === "bxNew") newOrderSheet(app, box, o, sh, kit, grp, chipSt);

  if (k === "bxPaste") {
    const ev = w.byId.get(sh["ev"] as Id);
    const current = ev === undefined ? [] : (box.list("guest_list", { where: [{ column: "event_id", eq: ev.id }], limit: 2000 })?.rows ?? []);
    const have = current.reduce((a, g) => a + 1 + Number(g["plus"] ?? 0), 0);
    const names = new Set(current.map((g) => String(g["name"] ?? "").trim().toLowerCase()));
    const parsed = String(sh["area"] ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l !== "")
      .map((l) => {
        // Only a comma separates who they're on behalf of: a hyphenated name stays whole.
        const [head, ...rest] = l.split(",");
        const m = /^(.*?)(?:\s*\+(\d))?\s*$/.exec(head ?? "") ?? [];
        return { name: String(m[1] ?? head ?? "").trim(), plus: m[2] === undefined ? 0 : Math.min(2, Number(m[2])), on_behalf: rest.join(",").trim(), note: "" };
      })
      .filter((g) => g.name !== "");
    const skipped = parsed.filter((g) => names.has(g.name.toLowerCase()));
    const adding = parsed.filter((g) => !names.has(g.name.toLowerCase()));
    const want = adding.reduce((a, g) => a + 1 + g.plus, 0);
    const places = ev?.guestPlaces ?? 0;
    const over = places > 0 && have + want > places;
    const people = (n: number) => plural(n, "{n} person", "{n} people");
    Object.assign(o, {
      icon: "clipboard-paste",
      title: tr("Paste a list of names"),
      sub: tr('One per line. Add "+1" or "+2", and a comma for who they\'re on behalf of.'),
      areaOn: true,
      areaLabel: tr("Names"),
      area: String(sh["area"] ?? ""),
      onArea: (e: { target: { value: string } }) => set({ area: e.target.value, refusal: null }),
      areaPh: "Rosa Linde +1, Tessellate\nDan Wexler, Press",
      summary:
        parsed.length === 0
          ? ""
          : [
              over
                ? tr("The list is full — {places}. {left}.", { places: plural(places, "{n} place", "{n} places"), left: plural(Math.max(0, places - have), "{n} left", "{n} left") })
                : `${plural(adding.length, "{n} name", "{n} names")}, ${people(want)}`,
              ...skipped.map((g) => tr("{name} is already on the list — skipped", { name: g.name })),
            ].join(" · "),
      submitLabel: adding.length === 0 ? tr("Add names") : plural(adding.length, "Add {n} name", "Add {n} names"),
      submit: (e?: { preventDefault: () => void }) => {
        e?.preventDefault();
        if (busy || ev === undefined || adding.length === 0 || over) return;
        void box.addGuests(ev.id, adding);
      },
    });
  }

  if (k === "bxGRemove") {
    const name = String(sh["name"] ?? "");
    const arrived = Number(sh["arrived"] ?? 0);
    Object.assign(o, {
      icon: "user-minus",
      tone: "danger",
      title: tr("Remove {name} from the list?", { name }),
      body: arrived > 0 ? tr("{name} is in ({n} of {all}). Remove anyway?", { name, n: arrived, all: Number(sh["all"] ?? 1) }) : tr("They won't be on the door's guest list any more."),
      btns: [
        P(tr("Remove"), () => {
          void box.removeGuest(sh["g"] as Id, name).then(() => {
            // The row's button is gone: the list takes the focus.
            if (typeof document !== "undefined") setTimeout(() => document.getElementById("gl-name")?.focus(), 40);
          });
        }, "d"),
        P(tr("Keep"), () => app.closeSheet(), "g"),
      ],
    });
  }

  if (k === "bxWlAdd") {
    const ev = w.byId.get(sh["ev"] as Id);
    const n = Number(sh["n"] ?? 1);
    Object.assign(o, {
      icon: "user-plus",
      title: tr("Add someone to the {name} waitlist", { name: ev?.name ?? "" }),
      qtyOn: true,
      qs: [1, 2, 3, 4].map((q) => ({
        id: q,
        on: n === q,
        go: () => set({ n: q }),
        style: `min-height:34px; padding:0 14px; border-radius:9px; border:0; cursor:pointer; font-family:var(--mono); font-size:14px; font-weight:700; background:${n === q ? "var(--surface)" : "transparent"}; color:${n === q ? "var(--fg)" : "var(--fg-muted)"};`,
      })),
      fields: [fld("wa-name", tr("Name"), "name", "text"), fld("wa-email", tr("Email"), "email", "email")],
      submitLabel: tr("Add to the waitlist"),
      submit: (e?: { preventDefault: () => void }) => {
        e?.preventDefault();
        if (busy || ev === undefined) return;
        const err: Record<string, string> = {};
        if (String(sh["name"] ?? "").trim() === "") err["name"] = tr("Add a name");
        if (!okEmail(sh["email"])) err["email"] = tr("Check the email address");
        if (Object.keys(err).length > 0) return set({ err });
        void box.addWaiting(ev.id, String(sh["name"]).trim(), String(sh["email"]), n);
      },
    });
  }

  if (k === "bxWlRemove") {
    const name = String(sh["name"] ?? "");
    const row = box.list("waitlist", { where: [{ column: "id", eq: sh["w"] as Id }] })?.rows[0];
    Object.assign(o, {
      icon: "user-minus",
      tone: "danger",
      title: tr("Remove {name} from the waitlist?", { name }),
      body: sh["offered"] === true ? tr("Their offer ends now and its places are back for the next people.") : tr("They won't be offered tickets from this list."),
      btns: [P(tr("Remove"), () => row !== undefined && void box.removeWaiting(row, name), "d"), P(tr("Keep"), () => app.closeSheet(), "g")],
    });
  }

  if (k === "bxPutBack") {
    const ev = w.byId.get(sh["ev"] as Id);
    const n = Number(sh["n"] ?? 0);
    Object.assign(o, {
      icon: "undo-2",
      title: plural(n, "Put {n} {show} ticket back on sale?", "Put {n} {show} tickets back on sale?", { show: ev?.name ?? "" }),
      body: tr("Nobody is left waiting, so anyone can buy them."),
      btns: [P(tr("Put back on sale"), () => ev !== undefined && void box.putBack(ev.id, n)), P(tr("Keep them"), () => app.closeSheet(), "g")],
    });
  }

  if (k === "bxCode") codeSheet(app, box, o, sh, kit, grp);

  if (k === "bxMsg") {
    const ev = w.byId.get(sh["ev"] as Id);
    const n = Number(sh["n"] ?? 0);
    const to = String(sh["to"]);
    const typeName = ev?.types.find((t) => t.id === sh["typeId"])?.name ?? "";
    const subj = String(sh["subj"] ?? "");
    const whom =
      to === "not_in"
        ? tr('"{subj}" goes to everyone not yet in with tickets for {name}. You can\'t unsend it.', { subj, name: ev?.name ?? "" })
        : to === "type"
          ? tr('"{subj}" goes to everyone with {type} tickets for {name}. You can\'t unsend it.', { subj, type: typeName, name: ev?.name ?? "" })
          : tr('"{subj}" goes to everyone with tickets for {name}. You can\'t unsend it.', { subj, name: ev?.name ?? "" });
    Object.assign(o, {
      icon: "send",
      title: plural(n, "Send to {n} person?", "Send to {n} people?"),
      body: whom,
      btns: [
        P(plural(n, "Send to {n} person", "Send to {n} people"), () => {
          if (ev === undefined || busy) return;
          void box.sendMessage(
            ev,
            { audience: to, ticket_type_id: to === "type" ? (sh["typeId"] ?? null) : null, template: sh["tpl"], subject: subj, body: String(sh["body"] ?? "") },
            (sh["waiting"] ?? null) as Id | null,
          );
        }),
        P(tr("Not yet"), () => app.closeSheet(), "g"),
      ],
    });
  }

  if (k === "bxPost") {
    const ev = w.byId.get(sh["ev"] as Id);
    const n = Number(sh["n"] ?? 0);
    const later = sh["later"] === true;
    const newTxt = String(sh["newTxt"] ?? "");
    const untilTxt = String(sh["untilTxt"] ?? "");
    Object.assign(o, {
      icon: "calendar-clock",
      tone: "warn",
      title: tr("Postpone {name} to {when}?", { name: ev?.name ?? "", when: newTxt.split(" ").slice(0, 3).join(" ") }),
      body: [
        tr("Tickets stay valid for the new date."),
        later ? tr("Your message waits in Messages until you send it.") : plural(n, "{n} person gets your message now.", "{n} people get your message now."),
        untilTxt === "" ? "" : tr("They can ask for a refund until {day}.", { day: untilTxt }),
      ]
        .filter((x) => x !== "")
        .join(" "),
      btns: [
        P(later ? tr("Postpone, send later") : tr("Postpone and send"), () => {
          if (ev === undefined || busy) return;
          void box.postpone(ev, sh["at"] as { doors: string; start: string; curfew: string; refundUntil: string }, { subject: String(sh["subj"] ?? ""), body: String(sh["body"] ?? "") }, !later, newTxt.split(" ").slice(0, 3).join(" "));
        }),
        P(tr("Not yet"), () => app.closeSheet(), "g"),
      ],
    });
  }

  if (k === "bxCancelShow") {
    const ev = w.byId.get(sh["ev"] as Id);
    const n = Number(sh["n"] ?? 0);
    const run = box.s.pc.run;
    // How far it has got, while it goes (a big show goes at the pace Adminium allows).
    if (busy && run !== null)
      Object.assign(o, {
        noteOn: true,
        note:
          run.stage === "orders"
            ? tr("Cancelling orders: {done} of {total}. Keep this page open.", { done: num(run.done), total: num(run.total) })
            : tr("Sending the cancellation emails: {done} of {total}. Keep this page open.", { done: num(run.done), total: num(run.total) }),
      });
    Object.assign(o, {
      icon: "calendar-x",
      tone: "danger",
      title: tr("Cancel {name}?", { name: ev?.name ?? "" }),
      body: plural(n, "Every ticket stops working and {n} person gets your message. Then you'll see the list of refunds to make.", "Every ticket stops working and {n} people get your message. Then you'll see the list of refunds to make."),
      btns: [
        P(tr("Cancel the show"), () => ev !== undefined && !busy && void box.cancelShow(ev, { subject: String(sh["subj"] ?? ""), body: String(sh["body"] ?? "") }), "d"),
        P(tr("Keep the show"), () => app.closeSheet(), "g"),
      ],
    });
  }

  if (k === "bxDevice") {
    const name = String(sh["name"] ?? "");
    Object.assign(o, {
      icon: "smartphone",
      tone: "danger",
      title: tr("Remove {door}?", { door: name }),
      body: tr("The door on that phone stops working until it is added again."),
      btns: [
        P(tr("Remove"), () => {
          const d = box.s.set;
          const devices = d?.devices ?? (box.rows("devices") ?? []).map((x) => ({ ...x }));
          const id = sh["d"] as Id;
          box.set({ set: { settings: d?.settings ?? {}, rooms: d?.rooms ?? w.roomRows.filter((r) => r["kind"] !== "both").map((r) => ({ ...r })), devices: devices.filter((x) => x.id !== id), gone: id > 0 ? [...(d?.gone ?? []), id] : (d?.gone ?? []) } });
          app.closeSheet();
        }, "d"),
        P(tr("Keep"), () => app.closeSheet(), "g"),
      ],
    });
  }

  if (k === "bxRules") {
    const num2 = (key: string, label: string) => fld(`rl-${key}`, label, key, "text", { im: "numeric", style: `${errs[key] ? S.fldErr : S.fld}font-family:var(--mono);` });
    Object.assign(o, {
      icon: "settings",
      title: tr("Edit the rules"),
      sub: tr("New checkouts, offers and deadlines follow these; what is already running keeps its times."),
      fields: [
        num2("transfer_days", tr("Days to pay by transfer")),
        fld("rl-transfer_time", tr("Transfers due by"), "transfer_time", "time", { style: `${S.fld}font-family:var(--mono);` }),
        num2("transfer_cutoff_days", tr("No transfers in the last days before a show")),
        num2("release_after_hours", tr("Hours of grace before unpaid tickets go back on sale")),
        num2("hold_minutes", tr("Minutes a checkout holds tickets")),
        num2("offer_hours", tr("Hours a waitlist offer lasts")),
        num2("send_hours", tr("Hours a friend has to accept a ticket")),
        num2("refund_days", tr("Refunds close this many days before a show")),
        num2("check_in_minutes", tr("Check-in opens this many minutes before doors")),
        fld("rl-day_starts_at", tr("The venue day starts at"), "day_starts_at", "time", { style: `${S.fld}font-family:var(--mono);` }),
      ],
      noteOn: true,
      note: tr("Shows that run past midnight stay on tonight's door and on Today until then."),
      submitLabel: tr("Use these rules"),
      submit: (e?: { preventDefault: () => void }) => {
        e?.preventDefault();
        const bounds: Record<string, [number, number]> = { transfer_days: [1, 14], transfer_cutoff_days: [0, 30], release_after_hours: [0, 168], hold_minutes: [2, 60], offer_hours: [1, 72], send_hours: [1, 168], refund_days: [0, 60], check_in_minutes: [0, 240] };
        const err: Record<string, string> = {};
        const values: Record<string, unknown> = {};
        for (const [key, [lo, hi]] of Object.entries(bounds)) {
          const v = Number(sh[key]);
          if (!Number.isInteger(v) || v < lo || v > hi) err[key] = tr("Enter a whole number from {lo} to {hi}", { lo, hi });
          else values[key] = v;
        }
        for (const key of ["transfer_time", "day_starts_at"]) {
          if (!/^\d{2}:\d{2}$/.test(String(sh[key] ?? ""))) err[key] = tr("Enter a time, like 18:00");
          else values[key] = sh[key];
        }
        if (Object.keys(err).length > 0) return set({ err });
        const d = box.s.set;
        box.set({ set: { settings: { ...(d?.settings ?? {}), ...values }, rooms: d?.rooms ?? w.roomRows.filter((r) => r["kind"] !== "both").map((r) => ({ ...r })), devices: d?.devices ?? (box.rows("devices") ?? []).map((x) => ({ ...x })), gone: d?.gone ?? [] } });
        app.closeSheet();
      },
    });
  }
}

// ── New order ────────────────────────────────────────────────────────────────

type Grp = (label: string, opts: Opt[], cur: unknown, key: string, multi?: boolean, hint?: string) => unknown;

function newOrderSheet(app: WaveApp, box: Box, o: V & { fields: unknown[] }, sh: Record<string, unknown>, kit: SheetKit, grp: Grp, chipSt: (on: boolean, off?: boolean) => string): void {
  const w = box.world()!;
  const { set, fld, busy } = kit;
  const now = app.now;
  const selling = w.shows.filter((e) => e.status === "published" && now < e.ends).sort((a, b) => a.start - b.start);
  const ev = (sh["ev"] === null || sh["ev"] === undefined ? undefined : w.byId.get(sh["ev"] as Id)) ?? selling[0];
  if (ev === undefined) return;
  const q = (sh["q"] ?? {}) as Record<string, number>;
  const names = (sh["names"] ?? {}) as Record<string, string>;
  const pools = box.sold(ev);
  const lines = ev.types.map((t) => ({ t, n: Number(q[String(t.id)] ?? 0) })).filter((x) => x.n > 0);
  const count = lines.reduce((a, x) => a + x.n, 0);
  const tickets = lines.flatMap((x) => Array.from({ length: x.n }, () => ({ ticket_type_id: x.t.id })));
  const body: OrderBody = { values: { event_id: ev.id, channel: "box_office" }, tickets };
  const quote = count === 0 ? undefined : app.get(`box:quote:${JSON.stringify(body)}`, () => box.port.quote(body));
  const quoteKey = `box:quote:${JSON.stringify(body)}`;
  const quoteFailed = count > 0 && app.failed(quoteKey);
  const total = quote === undefined ? lines.reduce((a, x) => a + x.n * x.t.price, 0) : Number(quote.data["total"] ?? 0);
  // How they can pay: every chosen type must allow it; a transfer only while the show is far enough off.
  const cutoff = Number(w.settingsRow["transfer_cutoff_days"] ?? 3) * 86_400_000;
  const doorOk = w.settings.doorOn && lines.every((x) => x.t.payDoor);
  const transferOk = w.settings.transferOn && lines.every((x) => x.t.payTransfer);
  const tooClose = ev.doors - now <= cutoff;
  const hows: Opt[] =
    count > 0 && total <= 0
      ? [["none", tr("No charge")]]
      : [
          ["paidnow", tr("Paid now at the box office (card / cash)")],
          ...(doorOk ? ([["door", tr("Pay at the door")]] as Opt[]) : []),
          ...(transferOk ? ([["transfer", tr("Bank transfer"), tooClose]] as Opt[]) : []),
        ];
  const how = hows.some((h) => h[0] === sh["how"] && h[2] !== true) ? String(sh["how"]) : hows[0]![0];
  const method = sh["method"] === "cash" ? "cash" : "card";
  const needEmail = how === "transfer";
  const steps = ev.types
    .filter((t) => t.selling || t.visibility === "box")
    .map((t) => {
      const n = Number(q[String(t.id)] ?? 0);
      const left = Math.max(0, pools?.byType.get(t.id)?.left ?? 0);
      const cap = Math.min(t.max, left);
      const bump = (d: number) => set({ q: { ...q, [String(t.id)]: Math.max(0, n + d) }, err: {}, refusal: null });
      return {
        id: t.id,
        name: `${t.short}${t.visibility === "box" ? ` (${tr("box office only")})` : ""}`,
        sub: [t.price === 0 ? tr("No charge") : money(t.price), left <= 0 && t.capacity !== null ? tr("0 left of {n}", { n: t.capacity }) : plural(left, "{n} left", "{n} left")].join(" · "),
        q: String(n),
        dec: () => bump(-1),
        decOff: n <= 0,
        decLabel: tr("One less {type}", { type: t.short }),
        inc: () => bump(1),
        incOff: n >= cap,
        incLabel: tr("One more {type}", { type: t.short }),
      };
    });
  const nameFields = tickets.map((t, i) => {
    const type = ev.types.find((x) => x.id === t.ticket_type_id)!;
    return fld(`bn-name-${String(i)}`, tr("Name on ticket {n} ({type})", { n: i + 1, type: type.short }), `name${String(i)}`, "text", {
      v: names[String(i)] ?? "",
      on: (e: { target: { value: string } }) => set({ names: { ...names, [String(i)]: e.target.value } }),
    });
  });
  const ticketsErr = errsOf(sh)["tickets"] ?? null;
  Object.assign(o, {
    icon: "plus",
    title: tr("New order"),
    sub: tr("For walk-ins, comps and phone bookings."),
    groups: [
      {
        ...(grp(tr("Show"), [], String(ev.id), "evPick") as object),
        opts: selling.map((e) => ({ id: String(e.id), label: `${e.short} · ${fD(e.start)}`, on: e.id === ev.id, off: false, style: chipSt(e.id === ev.id), go: () => set({ ev: e.id, q: {}, names: {}, err: {}, refusal: null }) })),
      },
    ],
    groupsAfter: [
      grp(
        tr("How they pay"),
        hows,
        how,
        "how",
        false,
        transferOk && tooClose && count > 0 && total > 0 ? tr("Too close to the show for a transfer — take the payment now or at the door.") : "",
      ),
      ...(how === "paidnow"
        ? [
            grp(
              tr("Paid by"),
              [
                ["card", tr("Card")],
                ["cash", tr("Cash")],
              ],
              method,
              "method",
            ),
          ]
        : []),
    ],
    stepsOn: true,
    stepsLabel: tr("Tickets"),
    steps,
    stepsErrOn: ticketsErr !== null,
    stepsErr: ticketsErr ?? "",
    fields: [
      ...nameFields,
      fld("bn-email", needEmail ? tr("Buyer email (the bank details go here)") : tr("Buyer email (optional for walk-ins and comps)"), "email", "email"),
    ],
    summary: count === 0 ? "" : quoteFailed ? "" : `${plural(count, "{n} ticket", "{n} tickets")} · ${total <= 0 ? tr("No charge") : money(total)}`,
    ...(quoteFailed ? { refusalOn: true, refusal: tr("Adminium didn't take those tickets — check what's left.") } : {}),
    submitLabel: tr("Create the order"),
    submit: (e?: { preventDefault: () => void }) => {
      e?.preventDefault();
      if (busy) return;
      if (count === 0) return set({ err: { tickets: tr("Choose at least one ticket") } });
      const email = String(sh["email"] ?? "").trim().toLowerCase();
      if (email !== "" && !okEmail(email)) return set({ err: { email: tr("Check the email address") } });
      if (needEmail && email === "") return set({ err: { email: tr("A bank transfer needs the buyer's email — the details go there.") } });
      const given = tickets.map((_, i) => String(names[String(i)] ?? "").trim());
      void box.createOrder({
        eventId: ev.id,
        tickets: tickets.map((t, i) => ({ ticket_type_id: t.ticket_type_id, holder_name: given[i] === "" ? null : given[i]! })),
        email,
        buyer: given.find((x) => x !== "") ?? "",
        how: how as "paidnow" | "door" | "transfer" | "none",
        method,
        key: String(sh["key"] ?? "") || mintKey("bo"),
        // The total on screen, when Adminium priced it: a different price makes nothing.
        ...(quote === undefined ? {} : { expect: total }),
      });
    },
  });
  void quoteKey;
}

const errsOf = (sh: Record<string, unknown>): Record<string, string | null> => (sh["err"] ?? {}) as Record<string, string | null>;

// ── a code ───────────────────────────────────────────────────────────────────

function codeSheet(app: WaveApp, box: Box, o: V & { fields: unknown[] }, sh: Record<string, unknown>, kit: SheetKit, grp: Grp): void {
  const w = box.world()!;
  const { set, fld, busy } = kit;
  const errs = errsOf(sh);
  const codes = box.rows("codes") ?? [];
  const id = (sh["id"] ?? null) as Id | null;
  const raw = String(sh["code"] ?? "");
  const code = raw.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const fold = (x: string) => x.replace(/O/g, "0").replace(/[IL]/g, "1");
  const lookAlike = code === "" ? undefined : codes.find((c) => c.id !== id && String(c["code"]) !== code && fold(String(c["code"])) === fold(code));
  const kind = ["percent", "amount", "unlock"].includes(String(sh["ckind"])) ? String(sh["ckind"]) : "percent";
  const now = app.now;
  const upcoming = w.shows.filter((e) => e.status === "published" && now < e.ends).sort((a, b) => a.start - b.start);
  const whereOpts: Opt[] = [
    ...upcoming.map((e) => [`ev:${String(e.id)}`, e.short] as Opt),
    ...w.rooms.filter((r) => r.kind !== "both").map((r) => [`room:${String(r.id)}`, tr("Every {room} show", { room: r.name })] as Opt),
    ["all", tr("Every show")],
  ];
  const where = String(sh["where"] ?? "all");
  const shows: BoxShow[] = where.startsWith("ev:") ? [w.byId.get(Number(where.slice(3)) as Id)].filter((x): x is BoxShow => x !== undefined) : where.startsWith("room:") ? upcoming.filter((e) => e.room?.id === Number(where.slice(5))) : upcoming;
  const kindWords: Record<string, string> = { standard: tr("Standard"), place: tr("Place"), presale: tr("Presale"), pass: tr("Weekend pass"), early: tr("Early entry"), balcony: tr("Balcony") };
  const typeKinds = [...new Set(shows.flatMap((e) => e.types.map((t) => t.kind)))].filter((x) => kindWords[x] !== undefined);
  const unlockable = shows.flatMap((e) => e.types.filter((t) => t.visibility === "code").map((t) => ({ e, t })));
  const typeKind = String(sh["typeKind"] ?? "");
  const until = String(sh["until"] ?? "");
  const untilAt = until === "" ? null : ms(fromLocal(until, app.zone));
  const whereWords = where === "all" ? tr("every show") : where.startsWith("room:") ? tr("every {room} show", { room: w.rooms.find((r) => `room:${String(r.id)}` === where)?.name ?? "" }) : (shows[0]?.name ?? "");
  const val = amountOf(sh["val"]);
  const what = kind === "percent" ? tr("{pct} % off", { pct: Number.isFinite(val) ? val : "?" }) : kind === "amount" ? tr("{amount} off each ticket", { amount: money(Number.isFinite(val) ? val : 0) }) : tr("unlocks {type}", { type: unlockable.find((x) => String(x.t.id) === sh["unlocks"])?.t.name ?? tr("a hidden ticket type") });
  const limit = String(sh["limit"] ?? "").trim();
  const noType = kind !== "unlock" && typeKind !== "" && !shows.some((e) => e.types.some((t) => t.kind === typeKind));
  Object.assign(o, {
    icon: "ticket-percent",
    title: id === null ? tr("New code") : tr("Edit {code}", { code }),
    groups: [
      grp(
        tr("What it does"),
        [
          ["percent", tr("Percent off")],
          ["amount", tr("Amount off")],
          ["unlock", tr("Unlocks a hidden ticket type")],
        ],
        kind,
        "ckind",
      ),
      grp(tr("Where"), whereOpts, where, "where"),
      kind === "unlock"
        ? grp(tr("Ticket type"), unlockable.map((x) => [String(x.t.id), `${x.e.short} · ${x.t.short}`] as Opt), String(sh["unlocks"] ?? ""), "unlocks", false, unlockable.length === 0 ? tr("No ticket type there waits for a code — set one to \"Only with a code\" in the event editor.") : "")
        : grp(tr("Ticket type"), [["", tr("Every ticket type")], ...typeKinds.map((x) => [x, kindWords[x]!] as Opt)], typeKind, "typeKind"),
    ],
    fields: [
      fld("bc-code", tr("Code"), "code", "text", { style: `${errs["code"] ? S.fldErr : S.fld}font-family:var(--mono); text-transform:uppercase; letter-spacing:.06em;` }),
      ...(kind !== "unlock" ? [fld("bc-val", kind === "percent" ? tr("Percent off") : tr("Amount off each ticket"), "val", "text", { im: "decimal", style: `${errs["val"] ? S.fldErr : S.fld}font-family:var(--mono);` })] : []),
      fld("bc-lim", tr("How many uses (empty for no limit)"), "limit", "text", { im: "numeric", style: `${errs["limit"] ? S.fldErr : S.fld}font-family:var(--mono);` }),
      fld("bc-until", tr("Valid until"), "until", "datetime-local", { style: `${errs["until"] ? S.fldErr : S.fld}font-family:var(--mono); font-size:14px;` }),
    ],
    noteOn: lookAlike !== undefined || noType,
    note: [
      ...(lookAlike !== undefined ? [tr("Careful: {a} reads the same as {b} once O/0 and I/1 are folded. People may type the wrong one.", { a: code, b: String(lookAlike["code"]) })] : []),
      ...(noType ? [tr("No show there has a ticket of that type.")] : []),
    ].join(" "),
    summary: tr("{code} gives {what} on {where}{limit}{until}.", {
      code: code === "" ? tr("This code") : code,
      what,
      where: whereWords,
      limit: limit === "" ? "" : tr(", for up to {n} uses", { n: limit }),
      until: untilAt === null ? "" : tr(", until {when}", { when: `${fD(untilAt)} ${fT(untilAt)}` }),
    }),
    submitLabel: id === null ? tr("Create the code") : tr("Save the code"),
    submit: (e?: { preventDefault: () => void }) => {
      e?.preventDefault();
      if (busy) return;
      const err: Record<string, string> = {};
      if (code.replace(/-/g, "").length < 4) err["code"] = tr("Use at least 4 letters or numbers");
      else if (codes.some((c) => c.id !== id && String(c["code"]) === code)) err["code"] = tr("That code already exists");
      if (kind === "percent" && !(val >= 1 && val <= 100)) err["val"] = tr("Enter a number between 1 and 100 %");
      if (kind === "amount" && !(val >= 0.01 && val <= 500)) err["val"] = tr("Enter an amount between {a} and {b}", { a: money(0.01), b: money(500) });
      if (limit !== "" && !(Number(limit) >= 1 && Number.isInteger(Number(limit)))) err["limit"] = tr("Enter at least 1, or leave it empty");
      if (untilAt !== null && untilAt < box.venueDayStart(now)) err["until"] = tr("Pick a date from today");
      if (kind === "unlock" && String(sh["unlocks"] ?? "") === "") err["code"] = err["code"] ?? tr("Choose the ticket type it unlocks");
      if (Object.keys(err).length > 0) return set({ err });
      const values: Record<string, unknown> = {
        code,
        kind,
        value: kind === "unlock" ? null : val,
        event_id: where.startsWith("ev:") ? Number(where.slice(3)) : null,
        room_id: where.startsWith("room:") ? Number(where.slice(5)) : null,
        type_kind: kind === "unlock" || typeKind === "" ? null : typeKind,
        unlocks_type_id: kind === "unlock" ? Number(sh["unlocks"]) : null,
        max_uses: limit === "" ? null : Number(limit),
        valid_until: until === "" ? null : fromLocal(until, app.zone),
      };
      void box.saveCode(id, values);
    },
  });
  void num;
  void localValue;
}
