/**
 * The editor's live preview: the audience's own event page, drawn inside
 * the box office from the unsaved draft — its name, times, words, poster,
 * types, lineup and questions — with what is left of the saved types from
 * Adminium's counts. Nothing in it goes anywhere: every button only says so.
 * The public API is never asked (a draft is not public).
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import type { AudiencePort, OrderWithTickets, Person, Venue } from "../data/ports.ts";
import { ApiError, type ClaimReply, type Config, type Id, type OrderBody, type OrderReply, type QuoteReply, type Row, type TypeLeft } from "../data/wire.ts";
import { tr } from "../i18n/tr.ts";
import { AudienceView } from "../view/AudienceView.tsx";
import { st } from "../view/dom.tsx";
import type { Box } from "./box.ts";
import { venueCurrency } from "./fmt.ts";
import { audienceVals } from "./vals/audience.ts";
import { renderVals } from "./vals/base.ts";
import { rowsOf, type Draft } from "./vals/editor.ts";
import { WaveApp } from "./wave.ts";

/** The id a show not saved yet takes in its preview. */
const NEW_ID = -1 as Id;

const inert = (): Promise<never> => Promise.reject(new ApiError(400, "PREVIEW", {}));

/** The venue as the audience would read it with the draft saved, answered here without asking anyone. */
class PreviewAudience implements AudiencePort {
  private readonly box: Box;
  private readonly draft: () => Draft;

  constructor(box: Box, draft: () => Draft) {
    this.box = box;
    this.draft = draft;
  }

  async config(): Promise<Config> {
    return { timezone: this.box.app.zone, currency: venueCurrency(), now: new Date(this.box.app.now).toISOString() };
  }

  async venue(): Promise<Venue> {
    const w = this.box.world()!;
    const d = this.draft();
    const id = d.id ?? NEW_ID;
    const { values, children } = rowsOf(this.box, d, this.box.app.zone);
    const saved = d.id === null ? undefined : w.byId.get(d.id)?.row;
    const event: Row = { ...(saved ?? {}), ...values, id, status: "published", code_types: 0 };
    const withIds = (rows: Record<string, unknown>[], prefix: number) => rows.map((r, i) => ({ ...r, event_id: id, id: (r["id"] as Id | undefined) ?? ((prefix * 1000 + i) * -1) }) as Row);
    const others = (rows: Row[]) => rows.filter((r) => r["event_id"] !== d.id);
    return {
      settings: w.settingsRow,
      rooms: w.roomRows,
      events: [...w.shows.filter((s) => s.id !== d.id).map((s) => s.row), event],
      days: [...others(w.dayRows), ...withIds(children.event_days, 1)],
      acts: [...others(w.actRows), ...withIds(children.acts, 2)],
      types: [...others(w.typeRows), ...withIds(children.ticket_types, 3).filter((t) => t["visibility"] === "public")],
      questions: [...w.questions.filter((q) => q["event_id"] !== d.id), ...withIds(children.questions, 4)],
    };
  }

  /** What is left of the saved types (a type only drafted has its size). */
  async left(eventId: Id): Promise<TypeLeft[]> {
    const d = this.draft();
    if (eventId !== (d.id ?? NEW_ID)) return [];
    const show = d.id === null ? undefined : this.box.world()?.byId.get(d.id);
    const pools = show === undefined ? null : this.box.sold(show);
    return d.types.map((t, i) => {
      const pool = t.id === null ? undefined : pools?.byType.get(t.id);
      const size = Number(t.cap || 0);
      const left = pool === undefined ? size : pool.left;
      const tid = t.id ?? (((3 * 1000 + i) * -1) as Id);
      if (!t.selling) return { ticket_type_id: tid, state: "not_on_sale" };
      if (left <= 0) return { ticket_type_id: tid, state: "sold_out" };
      return { ticket_type_id: tid, state: "open", ...(size > 0 && left / size <= 0.15 ? { left } : {}) };
    });
  }

  async unlock(): Promise<Row[]> {
    return [];
  }
  async prove(): Promise<boolean> {
    return true;
  }
  async quote(body: OrderBody): Promise<QuoteReply> {
    const d = this.draft();
    const total = body.tickets.reduce((a, t) => {
      const i = d.types.findIndex((x, j) => (x.id ?? ((3 * 1000 + j) * -1)) === t.ticket_type_id);
      const type = d.types[i];
      return a + (type === undefined || type.free ? 0 : Number(type.price) || 0);
    }, 0);
    return { data: { total, discount: 0 }, tickets: [] };
  }
  buy(): Promise<OrderReply> {
    return inert();
  }
  openOrder(): Promise<ClaimReply> {
    return inert();
  }
  order(): Promise<OrderWithTickets> {
    return inert();
  }
  choose(): Promise<Row> {
    return inert();
  }
  confirmTransfer(): Promise<Row> {
    return inert();
  }
  confirmAgain(): Promise<void> {
    return inert();
  }
  bank(): Promise<Row> {
    return inert();
  }
  sendTicket(): Promise<Row> {
    return inert();
  }
  takeBack(): Promise<Row> {
    return inert();
  }
  askRefund(): Promise<Row> {
    return inert();
  }
  withdrawRefund(): Promise<Row> {
    return inert();
  }
  cancelTicket(): Promise<Row> {
    return inert();
  }
  openTicket(): Promise<Row> {
    return inert();
  }
  acceptTicket(): Promise<Row> {
    return inert();
  }
  joinWaitlist(): Promise<Row> {
    return inert();
  }
  remindMe(): Promise<Row> {
    return inert();
  }
  nameTicket(): Promise<Row> {
    return inert();
  }
  updateOrder(): Promise<Row> {
    return inert();
  }
  keep(): Promise<Row> {
    return inert();
  }
  openConfirm(): Promise<Row> {
    return inert();
  }
  signIn(): Promise<void> {
    return inert();
  }
  verify(): Promise<Person> {
    return inert();
  }
  openSignIn(): Promise<Person> {
    return inert();
  }
  async me(): Promise<Person | null> {
    return null;
  }
  signOut(): Promise<void> {
    return inert();
  }
  signOutEverywhere(): Promise<void> {
    return inert();
  }
  forget(): Promise<void> {
    return inert();
  }
  myOrders(): Promise<{ orders: OrderWithTickets[]; held: Row[] }> {
    return inert();
  }
  myOrder(): Promise<OrderWithTickets> {
    return inert();
  }
  receipt(): Promise<Blob> {
    return inert();
  }
  async myWaitlist(): Promise<Row[]> {
    return [];
  }
  leaveWaitlist(): Promise<Row> {
    return inert();
  }
}

/** The public page for the draft, at a desktop's width or a phone's, scaled into its box. */
export function PreviewPane({ box, draft, phone, full }: { box: Box; draft: Draft; phone: boolean; full: boolean }) {
  const ref = useRef<Draft>(draft);
  ref.current = draft;
  const app = useMemo(() => {
    const a = new WaveApp({ audience: new PreviewAudience(box, () => ref.current) }, "audience", { lang: box.app.state.lang, theme: box.app.state.theme, frame: "desktop" });
    void a.start({ timers: false });
    return a;
  }, [box]);
  useSyncExternalStore(app.subscribe, app.snapshot);
  const W = phone ? 390 : 1280;
  const outer = useRef<HTMLDivElement | null>(null);
  const [avail, setAvail] = useState(336);
  useEffect(() => {
    const el = outer.current;
    if (el === null || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setAvail(el.clientWidth || 336));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // The draft, the clock, the language and the theme follow the editor's.
  const sig = JSON.stringify(draft);
  useEffect(() => {
    app.now = box.app.now;
    app.setState({ scr: "event", evId: draft.id ?? NEW_ID, loading: false, lang: box.app.state.lang, theme: box.app.state.theme, frame: phone ? "phone" : "desktop", width: W });
    app.refresh("aud:");
  }, [app, sig, phone, box.app.state.lang, box.app.state.theme, box.app.now, W, draft.id]);
  const base = renderVals(app);
  const v = { ...base, ...audienceVals(app, base) };
  const dispW = full ? (phone ? Math.min(avail, 390) : avail) : phone ? Math.min(avail, 312) : avail;
  const sc = dispW / W;
  const boxH = full ? "100%" : `${String(phone ? Math.round(dispW * (844 / 390)) : Math.round(avail * 1.3))}px`;
  const onClick = (e: { target: EventTarget | null; preventDefault: () => void; stopPropagation: () => void }) => {
    const el = e.target as HTMLElement | null;
    if (el?.closest("button,a,input,select,textarea,[role=button]") === null || el === null) return;
    e.preventDefault();
    e.stopPropagation();
    box.app.toast(tr("This is a preview — nothing is held or sold"), "eye");
  };
  return (
    <div ref={outer} style={st(`width:100%; height:${full ? "100%" : "auto"};`)}>
      <div
        role="img"
        aria-label={tr("The public page for this draft")}
        onClickCapture={onClick}
        style={st(`position:relative; width:${String(dispW)}px; height:${boxH}; margin-inline:auto; overflow:hidden; border-radius:${phone ? "28px" : "14px"}; border:${phone ? "6px solid var(--surface-3)" : "1px solid var(--border)"}; background:var(--bg);`)}
      >
        <div
          data-wv-root="1"
          dir={String(v["dir"])}
          lang={String(v["langCode"])}
          style={st(`${String(v["rootStyle"])}position:absolute; inset-block-start:0; inset-inline-start:0; width:${String(W)}px; height:${full ? `${String(Math.ceil(100 / sc))}%` : `${String(Math.ceil((phone ? 844 : avail * 1.3) / sc))}px`}; transform:scale(${sc.toFixed(4)}); transform-origin:top ${String(v["dir"]) === "rtl" ? "right" : "left"}; overflow:hidden;`)}
        >
          <div style={st("height:100%; overflow-y:auto; overflow-x:hidden; display:flex; flex-direction:column;")}>
            <AudienceView v={v} />
          </div>
        </div>
      </div>
    </div>
  );
}
