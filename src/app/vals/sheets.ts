/**
 * The sheets and menus over a page: one sheet anatomy (icon, title, sub,
 * fields, a done line, buttons) filled per kind. Every write a sheet makes
 * goes to Adminium; the sheet shows its answer, or the refusal's words.
 */
import type { Id } from "../../data/wire.ts";
import { tr } from "../../i18n/tr.ts";
import { fD, fT } from "../fmt.ts";
import { AUDIENCE, STAFF } from "../sides.ts";
import type { WaveApp } from "../wave.ts";
import { accountSheet } from "./account.ts";
import { boxSheet } from "./boxSheets.ts";
import { S, type V } from "./base.ts";

type Field = { id: string; label: string; type: string; v: string; on: (e: { target: { value: string } }) => void; errOn: boolean; err: string; eid: string; ac: string; im: string; style: string };

const okEmail = (v: unknown): boolean => /^\S+@\S+\.\S+$/.test(String(v ?? "").trim());

export function sheetVals(app: WaveApp, v: V): V {
  const s = app.state;
  const nar = app.narrow();
  const defaults: V = {
    sh: { on: false, fields: [], list: [], rows: [], secs: [], btns: [], qs: [], groups: [] },
    acct: { items: [], name: "", email: "" },
    closeAcct: () => {
      app.setState({ acctOpen: false });
      app.refocus();
    },
    dm: { on: false, tickets: [], dots: [] },
    dr: { on: false, tickets: [], pays: [], log: [], refs: [], acts: [], ans: [] },
    ed: { fullOn: false, pvs: [] },
    bo: { segW: "" },
    panelScrim: nar && s.panelOpen,
  };
  // What the side's own values already gave (the account menu, the phone ticket) is kept.
  const closed: V = Object.fromEntries(Object.entries(defaults).filter(([k]) => v[k] === undefined || k === "sh" || k === "panelScrim"));
  const sh = s.sheet;
  const w = app.persona === "audience" ? app.world() : null;
  if (sh === null) return closed;
  const set = (p: Record<string, unknown>) => app.patchSheet(p);
  const errs = (sh["err"] ?? {}) as Record<string, string | null>;
  const fld = (id: string, label: string, key: string, type = "text", opt: Partial<Field> = {}): Field => {
    const err = errs[key] ?? null;
    return {
      id,
      label,
      type,
      v: String(sh[key] ?? ""),
      on: (e) => set({ [key]: e.target.value, err: { ...errs, [key]: null } }),
      errOn: err !== null,
      err: err ?? "",
      eid: `${id}-e`,
      ac: "off",
      im: type === "email" ? "email" : "text",
      style: (err !== null ? S.fldErr : S.fld) + (type === "email" ? "font-family:var(--mono); font-size:14.5px; unicode-bidi:plaintext;" : "unicode-bidi:plaintext;"),
      ...opt,
    };
  };
  const P = (label: string, go: () => void, kind: "p" | "g" | "d" = "p") => ({
    id: label,
    label,
    go,
    style: kind === "g" ? `${S.btnG}flex:1;` : kind === "d" ? `${S.btnP}flex:1; background:var(--danger); color:#fff;` : `${S.btnP}flex:1;`,
  });
  const o: V & { fields: Field[]; btns: unknown[]; list: unknown[]; rows: unknown[]; secs: unknown[]; qs: unknown[]; groups: unknown[] } = {
    on: true,
    icon: "info",
    tone: "accent",
    title: "",
    sub: "",
    fields: [],
    list: [],
    rows: [],
    secs: [],
    btns: [],
    qs: [],
    groups: [],
    areaOn: false,
    summaryOn: false,
    submitLabel: tr("Save"),
    submitStyle: `${S.btnP}width:100%;`,
    submit: (e?: { preventDefault: () => void }) => e?.preventDefault(),
  };
  const k = sh.kind;
  const show = w === null || sh["ev"] === undefined ? null : (w.byId.get(sh["ev"] as Id) ?? null);
  const busy = sh["busy"] === true;
  const check = busy ? { noteOn: true, note: tr("Checking you're a person…") } : {};

  if (k === "remind" && show !== null && w !== null) {
    const lead = w.settings.remindLeadHours;
    Object.assign(o, {
      icon: "bell",
      title: tr("Remind me: {name}", { name: show.short }),
      sub: lead === 1 ? tr("We'll email you once, an hour before tickets go on sale.") : tr("We'll email you once, {n} hours before tickets go on sale.", { n: lead }),
    });
    if (sh["done"] === true) Object.assign(o, { done: lead === 1 ? tr("Done. One email, an hour before the sale. That's all.") : tr("Done. One email, {n} hours before the sale. That's all.", { n: lead }), btns: [P(tr("Close"), () => app.closeSheet())] });
    else
      Object.assign(o, {
        fields: [fld("rm-email", tr("Email"), "email", "email", { ac: "email" })],
        ...check,
        submitLabel: tr("Remind me"),
        submit: (e?: { preventDefault: () => void }) => {
          e?.preventDefault();
          if (busy) return;
          if (!okEmail(sh["email"])) return set({ err: { email: tr("Check the email address") } });
          void app.remind(show.id, String(sh["email"]), (sh["type"] as Id | null | undefined) ?? null);
        },
      });
  }

  if (k === "waitlist" && show !== null && w !== null) {
    const maxQ = Math.max(1, ...show.types.map((t) => t.max));
    const n = Number(sh["n"] ?? 1);
    Object.assign(o, {
      icon: "list-plus",
      title: tr("Join the waitlist for {name}", { name: show.name }),
      sub: tr("Tickets that come back are offered to the list in the order people joined."),
    });
    if (sh["done"] === true)
      Object.assign(o, {
        done: tr("You're on the list — we'll email you if tickets come back. You'll have {n} hours to claim them.", { n: w.settings.offerHours }),
        btns: [P(tr("Close"), () => app.closeSheet())],
      });
    else
      Object.assign(o, {
        qtyOn: true,
        qtyLabel: tr("How many?"),
        qs: Array.from({ length: Math.min(maxQ, 6) }, (_, i) => i + 1).map((q) => ({
          id: q,
          on: n === q,
          checked: n === q ? "true" : "false",
          go: () => set({ n: q }),
          style: `min-height:34px; padding:0 14px; border-radius:9px; border:0; cursor:pointer; font-family:var(--mono); font-size:14px; font-weight:700; background:${n === q ? "var(--surface)" : "transparent"}; color:${n === q ? "var(--fg)" : "var(--fg-muted)"};`,
        })),
        fields: [fld("wl-email", tr("Email"), "email", "email", { ac: "email" })],
        ...check,
        submitLabel: tr("Join the waitlist"),
        submit: (e?: { preventDefault: () => void }) => {
          e?.preventDefault();
          if (busy) return;
          if (!okEmail(sh["email"])) return set({ err: { email: tr("Check the email address") } });
          void app.joinWaitlist(show.id, String(sh["email"]), n);
        },
      });
  }

  if (k === "dayPick" && w !== null) {
    const evs = ((sh["evs"] ?? []) as Id[]).map((id) => w.byId.get(id)).filter((e) => e !== undefined);
    Object.assign(o, {
      icon: "calendar-days",
      title: fD(sh["day"]),
      sub: tr("{n} shows on this day", { n: evs.length }),
      listOn: true,
      list: evs.map((e) => ({ id: e.id, label: `${e.name} · ${fT(e.doors)}`, icon: "ticket", go: () => app.openShow(e.id) })),
    });
  }

  if (k === "venue" && w !== null) {
    const st = w.settings;
    const sendLine = st.sendOn ? ` ${tr("You can always send a ticket to a friend.")}` : "";
    const secs: Record<string, { k: string; lines: string[] }> = {
      getting: { k: tr("Getting there"), lines: [st.address, ...st.gettingThere].filter((x) => x !== "") },
      access: { k: tr("Accessibility"), lines: st.accessibility },
      policies: { k: tr("Policies"), lines: [...st.policies, `${tr("Refunds follow each show's policy, shown on its page.")}${sendLine}`] },
    };
    const first = String(sh["sec"] ?? "getting");
    const order = [first, ...["getting", "access", "policies"].filter((x) => x !== first)].filter((x) => secs[x]!.lines.length > 0);
    Object.assign(o, {
      icon: "map-pin",
      title: secs[first]?.k ?? "",
      sub: [st.venueName, st.address].filter((x) => x !== "").join(" · "),
      secsOn: true,
      secs: order.map((x) => secs[x]!),
    });
  }

  // The sheets of the buyer's own pages, and the box office's.
  if (AUDIENCE && w !== null) accountSheet(app, w, o, sh, { set, fld, P, busy });
  if (STAFF && app.persona === "box") boxSheet(app, o, sh, { set, fld, P, busy });

  const tones: Record<string, [string, string]> = {
    accent: ["var(--accent-soft)", "var(--accent)"],
    warn: ["var(--warn-soft)", "var(--warn)"],
    danger: ["var(--danger-soft)", "var(--danger)"],
  };
  const tone = tones[String(o["tone"])] ?? tones["accent"]!;
  o["iconWrap"] = `width:38px; height:38px; flex-shrink:0; border-radius:11px; display:flex; align-items:center; justify-content:center; background:${tone[0]}; color:${tone[1]};`;
  o["subOn"] = o["sub"] !== "";
  o["fieldsOn"] = o.fields.length > 0 || o["qtyOn"] === true || o.groups.length > 0 || o["areaOn"] === true;
  o["groupsAfter"] = o["groupsAfter"] ?? [];
  o["summaryOn"] = o["summary"] !== undefined && o["summary"] !== "";
  o["doneOn"] = o["done"] !== undefined && o["done"] !== "";
  o["bodyOn"] = o["body"] !== undefined && o["body"] !== "";
  o["listOn"] = o["listOn"] === true;
  o["rowsOn"] = o["rowsOn"] === true;
  o["secsOn"] = o["secsOn"] === true;
  o["mailOn"] = o["mailOn"] === true;
  o["btnsOn"] = (o.btns.length > 0 && o["fieldsOn"] !== true) || o["btnsOn"] === true;
  o["noteOn"] = o["noteOn"] === true;
  o["qtyOn"] = o["qtyOn"] === true;
  o["stepsOn"] = o["stepsOn"] === true;
  o["refusalOn"] = o["refusalOn"] === true;
  if (o["stepsOn"] === true) o["fieldsOn"] = true;
  if (o["doneOn"] === true) o["fieldsOn"] = false;
  o["close"] = () => app.closeSheet();
  o["align"] = nar ? "flex-end" : "center";
  o["pad"] = nar ? "0" : "24px";
  o["box"] =
    (nar ? "width:100%; max-height:90%; border-radius:22px 22px 0 0; padding:18px 18px 26px;" : "width:min(470px,100%); max-height:calc(100% - 48px); border-radius:20px; padding:22px;") +
    " overflow-y:auto; display:flex; flex-direction:column; gap:16px; background:var(--surface); color:var(--fg); border:1px solid var(--border); box-shadow:0 40px 90px -30px rgba(0,0,0,.6);";
  return { ...closed, sh: o };
}

/** What a kind's filler gets to build its sheet with. */
export interface SheetKit {
  set: (p: Record<string, unknown>) => void;
  fld: (id: string, label: string, key: string, type?: string, opt?: Partial<Field>) => Field;
  P: (label: string, go: () => void, kind?: "p" | "g" | "d") => { id: string; label: string; go: () => void; style: string };
  busy: boolean;
}
export type { Field };
