// Drawn from the Waveform design (its door, ported to JSX): the layout, as drawn.
// Every value comes from the door's values `d` (../app/vals/door.ts).
import { Fragment, useEffect, useRef } from "react";

import { prepareReader, problemOf, startScanner } from "../app/camera.ts";
import { tr } from "../i18n/tr.ts";
import { Icon, st } from "./dom.tsx";

type Seg = { t: string; mono?: boolean };

/** A line whose times, codes and amounts are drawn in the mono face. */
function Line({ segs }: { segs: Seg[] }) {
  return (
    <>
      {segs.map((x, i) =>
        x.mono === true ? (
          <span key={i} dir="ltr" style={st("font-family:var(--mono); unicode-bidi:isolate;")}>
            {x.t}
          </span>
        ) : (
          <Fragment key={i}>{x.t}</Fragment>
        ),
      )}
    </>
  );
}

/** The scan pad: the phone's camera while it is on; a tap turns it on (or, in the demo, scans the next in the queue). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ScanPad({ d }: { d: any }) {
  const video = useRef<HTMLVideoElement | null>(null);
  const onCode = useRef(d.onCode);
  onCode.current = d.onCode;
  const onCamera = useRef(d.onCamera);
  onCamera.current = d.onCamera;
  // The QR reader is fetched while the signal is here, so the camera still reads codes without it.
  useEffect(() => {
    if (d.usesCamera) prepareReader();
  }, [d.usesCamera]);
  useEffect(() => {
    if (!d.camOn || video.current === null) return;
    let stop: (() => void) | null = null;
    let gone = false;
    startScanner(video.current, (text) => onCode.current(text)).then(
      (s) => {
        if (gone) s.stop();
        else stop = () => s.stop();
      },
      (error: unknown) => {
        if (!gone) onCamera.current(problemOf(error));
      },
    );
    return () => {
      gone = true;
      stop?.();
    };
  }, [d.camOn]);
  return (
    <button id="door-pad" onClick={d.tapScan} aria-label={d.padLabel} aria-pressed={d.camOn} style={st("position:relative; display:block; flex-shrink:0; width:min(100%, 300px); height:280px; margin-inline:auto; padding:0; border:0; border-radius:24px; background:#050507; overflow:hidden; cursor:pointer;")}>
      {d.camOn ? <video ref={video} muted playsInline aria-hidden="true" style={st("position:absolute; inset:0; width:100%; height:100%; object-fit:cover;")} /> : null}
      <span className="wv-breathe" style={st(`position:absolute; inset:17%; border-radius:18px; border:3px solid ${d.camBad ? "var(--warn)" : d.frame};`)}></span>
      {d.camBad ? (
        <span role="status" style={st("position:absolute; inset-inline:18px; top:50%; transform:translateY(-50%); display:flex; flex-direction:column; align-items:center; gap:8px; text-align:center; font-size:13.5px; font-weight:700; line-height:1.4; color:#f4f4f6;")}>
          <Icon name={"camera-off"} style={st("width:22px;height:22px;color:var(--warn);")} />
          {d.padMsg}
        </span>
      ) : null}
      <span style={st("position:absolute; inset-inline:0; inset-block-end:14px; text-align:center; font-size:12.5px; font-weight:700; color:#b7b7c3;")}>
        {d.camBad ? "" : d.padMsg}
      </span>
    </button>
  );
}

/** The scan pad and Find, with Find's results. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ScanFind({ d, s }: { d: any; s: any }) {
  return (
    <>
      <ScanPad d={d} />
      {" "}
      <form onSubmit={d.find} style={st("display:flex; flex-direction:column; gap:8px;")}>
        <label htmlFor="door-q" style={st(`${s.lbl}font-size:14px;`)}>
          {tr("Find by name or code")}
        </label>
        {" "}
        <input id="door-q" className="wv-fld" type="search" autoComplete="off" dir="auto" value={d.q ?? ""} onChange={d.onQ} placeholder={tr("Name, or K7QX-M2PD")} style={st(`${s.fld}min-height:56px; font-size:17px; unicode-bidi:plaintext;`)} />
        {" "}
        {(d.res ?? []).map((r: any, i_r: number) => (
          <Fragment key={r.id ?? i_r}>
            <button type="button" className="wv-gi" onClick={r.go} style={st("display:grid; grid-template-columns:minmax(0,1fr) auto; gap:2px 10px; align-items:center; min-height:56px; padding:8px 14px; border-radius:14px; border:1px solid var(--border-strong); background:var(--surface); text-align:start;")}>
              <span style={st("font-size:15px; font-weight:800;")}>{r.name}</span>
              <span dir="ltr" style={st("font-family:var(--mono); font-size:12.5px; font-weight:700; justify-self:end;")}>
                {r.code}
              </span>
              <span style={st("font-size:12.5px; font-weight:600; color:var(--fg-muted);")}>{r.sub}</span>
              <span style={st(`${r.stStyle}justify-self:end;`)}>{r.st}</span>
            </button>
          </Fragment>
        ))}
        {" "}
        {d.resNone ? <span style={st("font-size:13px; font-weight:700; color:var(--fg-muted);")}>{tr("Nobody by that name or code on tonight's list.")}</span> : null}
      </form>
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DoorView({ d, s, bo }: { d: any; s: any; bo: any }) {
  const v = d.v ?? {};
  return (
    <div style={st(d.outer)}>
      <div style={st(d.col)}>
        <div style={st("display:flex; align-items:center; gap:10px; padding:12px 16px; border-block-end:1px solid var(--border); background:var(--surface);")}>
          <div style={st("flex:1; min-width:0; display:flex; flex-direction:column; gap:2px;")}>
            <span style={st("font-size:15px; font-weight:800; letter-spacing:-.02em;")}>{d.title}</span>
            <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:700; color:var(--fg-muted);")}>{d.count}</span>
          </div>
          {" "}
          <button className="wv-gi" onClick={d.deviceGo} aria-label={d.deviceLabel} style={st("display:inline-flex; align-items:center; gap:6px; min-height:28px; padding:0 10px; border-radius:999px; border:1px solid var(--border-strong); background:transparent; color:var(--fg); font-size:12px; font-weight:800; cursor:pointer;")}>
            <span className={d.dotCls} style={st(`width:8px; height:8px; border-radius:50%; background:${d.dot};`)}></span>
            {d.device}
          </button>
          {" "}
          <span dir="ltr" style={st("font-family:var(--mono); font-size:13px; font-weight:700;")}>{d.clock}</span>
        </div>
        {" "}
        <div role="group" aria-label={tr("Show")} className="wv-hide" style={st("display:flex; gap:6px; overflow-x:auto; padding:8px 16px; border-block-end:1px solid var(--border); background:var(--surface);")}>
          {(d.shows ?? []).map((o: any, i_o: number) => (
            <Fragment key={o.id ?? i_o}>
              <button className="wv-gi" onClick={o.go} aria-pressed={o.on} aria-disabled={o.off} style={st(o.style)}>
                {o.label}
              </button>
            </Fragment>
          ))}
        </div>
        {" "}
        {d.offOn ? (
          <div role="status" style={st("display:flex; align-items:center; gap:10px; padding:12px 16px; background:var(--warn-soft); font-size:14px; font-weight:800;")}>
            <Icon name={"wifi-off"} style={st("width:17px;height:17px;color:var(--warn);")} />
            <span>
              <Line segs={d.offTxt} />
            </span>
          </div>
        ) : null}
        {" "}
        {d.clashOn ? (
          <div role="alert" style={st("display:flex; align-items:flex-start; gap:10px; padding:12px 16px; background:var(--danger-soft); font-size:13.5px; font-weight:700; line-height:1.45;")}>
            <Icon name={"triangle-alert"} style={st("width:17px;height:17px;flex-shrink:0;color:var(--danger);")} />
            <span style={st("flex:1; display:flex; flex-direction:column; gap:4px;")}>
              {(d.clash ?? []).map((c: string, i: number) => (
                <span key={i}>{c}</span>
              ))}
            </span>
            <button className="wv-gi" onClick={d.clearClash} style={st(`${s.btnS}min-height:32px;`)}>
              {tr("OK")}
            </button>
          </div>
        ) : null}
        {" "}
        {d.before ? (
          <div style={st("flex:1; overflow-y:auto; padding:22px 18px; display:flex; flex-direction:column; gap:18px;")}>
            <div style={st("display:flex; flex-direction:column; gap:6px;")}>
              <span style={st(s.eyebrow)}>{d.eyebrow}</span>
              <h1 style={st("margin:0; font-size:34px; font-weight:800; letter-spacing:-.05em; line-height:1;")}>{d.openTxt}</h1>
              {d.opensInOn ? <span style={st("font-family:var(--mono); font-size:14px; font-weight:700; color:var(--accent);")}>{d.opensIn}</span> : null}
            </div>
            {" "}
            <div style={st("display:grid; grid-template-columns:1fr 1fr; gap:8px;")}>
              {(d.nums ?? []).map((k: any, i_k: number) => (
                <Fragment key={k.k ?? i_k}>
                  <div style={st(`${bo.kpi}background:var(--surface);`)}>
                    <span style={st(`${s.eyebrow}font-size:10.5px;`)}>{k.k}</span>
                    <span style={st(bo.kpiV)}>{k.v}</span>
                  </div>
                </Fragment>
              ))}
            </div>
            {" "}
            {d.checksOn ? (
              <div style={st("display:flex; flex-direction:column; gap:8px;")}>
                <span id="dr-before" style={st(s.lbl)}>
                  {tr("Before you open")}
                </span>
                {" "}
                {(d.checks ?? []).map((c: any, i_c: number) => (
                  <Fragment key={c.id ?? i_c}>
                    <button role="checkbox" aria-checked={c.on} onClick={c.go} className="wv-gi" style={st("display:flex; align-items:center; gap:12px; min-height:56px; padding:0 14px; border-radius:14px; border:1px solid var(--border-strong); background:var(--surface); color:var(--fg); font-size:15px; font-weight:800; text-align:start;")}>
                      <span style={st(c.box)}>{c.on ? <Icon name={"check"} style={st("width:16px;height:16px;")} /> : null}</span>
                      {c.label}
                    </button>
                  </Fragment>
                ))}
              </div>
            ) : null}
            {" "}
            {d.scanTop ? <ScanFind d={d} s={s} /> : null}
            {" "}
            <div style={st(`display:flex; flex-direction:column; gap:6px; padding:14px; border-radius:14px; border:1px ${d.endSolid ? "solid" : "dashed"} var(--border-strong);`)}>
              <span style={st(s.eyebrow)}>{tr("End of night")}</span>
              <span style={st(`font-size:13.5px; font-weight:700; line-height:1.5; color:${d.endSolid ? "var(--fg)" : "var(--fg-muted)"};`)}>{d.endTxt}</span>
            </div>
          </div>
        ) : null}
        {" "}
        {/* The screen's heading once check-in is open (or there is no show): the show, for a screen reader and for focus. */}
        {d.before ? null : <h1 className="wv-sr">{d.title}</h1>}
        {d.open ? (
          <>
            <div role="tablist" aria-label={tr("Door")} onKeyDown={d.tabKey} style={st(`display:grid; grid-template-columns:${d.tabCols}; border-block-end:1px solid var(--border);`)}>
              {(d.tabs ?? []).map((t: any, i_t: number) => (
                <Fragment key={t.id ?? i_t}>
                  <button role="tab" id={t.id} aria-selected={t.on} aria-controls={t.panel} tabIndex={t.tabIndex} onClick={t.go} style={st(t.style)}>
                    {t.label}
                  </button>
                </Fragment>
              ))}
            </div>
            {" "}
            <div role="tabpanel" id={d.panelId} aria-labelledby={d.tabId} style={st("flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:16px;")}>
              {d.scan ? (
                <>
                  <ScanFind d={d} s={s} />
                  {" "}
                  <div style={st("display:flex; flex-direction:column; gap:0;")}>
                    <span style={st(`${s.eyebrow}padding-block-end:6px;`)}>{tr("Last scans")}</span>
                    {" "}
                    {(d.recent ?? []).map((r: any, i_r: number) => (
                      <Fragment key={r.id ?? i_r}>
                        <div style={st("display:grid; grid-template-columns:52px minmax(0,1fr) auto; gap:10px; align-items:center; min-height:52px; padding-block:6px; border-block-start:1px solid var(--border);")}>
                          <span dir="ltr" style={st("font-family:var(--mono); font-size:12.5px; font-weight:700; color:var(--fg-muted);")}>{r.at}</span>
                          <span style={st("display:flex; flex-direction:column; min-width:0;")}>
                            <span style={st("font-size:14.5px; font-weight:800; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;")}>{r.name}</span>
                            <span style={st("font-size:12px; font-weight:600; color:var(--fg-subtle);")}>{r.type}</span>
                          </span>
                          {r.undoOn ? (
                            <button className="wv-gi" onClick={r.undo} aria-label={r.undoLabel} style={st(`${s.btnS}min-height:40px;`)}>
                              <Icon name={"undo-2"} style={st("width:14px;height:14px;")} />
                              {tr("Undo")}
                            </button>
                          ) : (
                            <span></span>
                          )}
                        </div>
                      </Fragment>
                    ))}
                    {" "}
                    {d.recentEmpty ? <span style={st("font-size:13px; font-weight:600; color:var(--fg-muted); padding-block:8px;")}>{tr("Nobody scanned yet.")}</span> : null}
                  </div>
                </>
              ) : null}
              {" "}
              {d.guestsOn ? (
                <>
                  <span style={st("font-size:13px; font-weight:700; color:var(--fg-muted);")}>{d.gTxt}</span>
                  {d.guestHintOn ? <span style={st(s.hint)}>{d.guestHint}</span> : null}
                  {" "}
                  {(d.guests ?? []).map((g: any, i_g: number) => (
                    <Fragment key={g.id ?? i_g}>
                      <button role="checkbox" aria-checked={g.on} aria-disabled={g.off} onClick={g.go} className="wv-gi" style={st(`display:flex; align-items:center; gap:12px; min-height:60px; padding:8px 14px; border-radius:14px; border:1px solid var(--border-strong); background:var(--surface); color:${g.off ? "var(--fg-subtle)" : "var(--fg)"}; text-align:start; cursor:${g.off ? "not-allowed" : "pointer"};`)}>
                        <span style={st(g.box)}>{g.mark ? <Icon name={g.on === true ? "check" : "minus"} style={st("width:18px;height:18px;")} /> : null}</span>
                        <span style={st("flex:1; min-width:0; display:flex; flex-direction:column;")}>
                          <span style={st("font-size:16px; font-weight:800;")}>
                            {g.name}{" "}
                            <span dir="ltr" style={st("font-family:var(--mono); font-size:14px; color:var(--accent);")}>
                              {g.plus}
                            </span>
                          </span>
                          <span style={st("font-size:12.5px; font-weight:600; color:var(--fg-muted);")}>{g.sub}</span>
                        </span>
                      </button>
                    </Fragment>
                  ))}
                </>
              ) : null}
              {" "}
              {d.sellOn ? (
                <>
                  <div role="radiogroup" aria-label={tr("Ticket type")} style={st("display:flex; flex-direction:column; gap:8px;")}>
                    {(d.sellTypes ?? []).map((t: any, i_t: number) => (
                      <Fragment key={t.id ?? i_t}>
                        <button role="radio" aria-checked={t.on} onClick={t.go} disabled={t.off} style={st(t.style)}>
                          <span style={st("flex:1; display:flex; flex-direction:column;")}>
                            <span style={st("font-size:16px; font-weight:800;")}>{t.name}</span>
                            <span style={st("font-size:12.5px; font-weight:700; color:var(--fg-muted);")}>{t.left}</span>
                          </span>
                          <span style={st("font-family:var(--mono); font-size:16px; font-weight:700;")}>{t.price}</span>
                        </button>
                      </Fragment>
                    ))}
                  </div>
                  {" "}
                  <div style={st("display:flex; align-items:center; justify-content:space-between; gap:12px;")}>
                    <span id="dr-qty" style={st("font-size:15px; font-weight:800;")}>
                      {tr("How many")}
                    </span>
                    <div role="group" aria-labelledby="dr-qty" style={st("display:flex; align-items:center; gap:4px; padding:4px; border-radius:14px; border:1px solid var(--border-strong);")}>
                      <button className="wv-gi" onClick={d.qDec} disabled={d.decOff} aria-label={tr("One fewer")} style={st("width:48px; height:48px; border:0; border-radius:10px; background:transparent; color:var(--fg); display:flex; align-items:center; justify-content:center;")}>
                        <Icon name={"minus"} style={st("width:18px;height:18px;")} />
                      </button>
                      <span aria-live="polite" style={st("min-width:36px; text-align:center; font-family:var(--mono); font-size:20px; font-weight:700;")}>
                        {d.sellQ}
                      </span>
                      <button className="wv-gi" onClick={d.qInc} disabled={d.incOff} aria-label={tr("One more")} style={st("width:48px; height:48px; border:0; border-radius:10px; background:transparent; color:var(--fg); display:flex; align-items:center; justify-content:center;")}>
                        <Icon name={"plus"} style={st("width:18px;height:18px;")} />
                      </button>
                    </div>
                  </div>
                  {" "}
                  <div style={st("display:flex; justify-content:space-between; align-items:baseline;")}>
                    <span style={st("font-size:15px; font-weight:800;")}>{tr("Total")}</span>
                    <span style={st("font-family:var(--mono); font-size:26px; font-weight:700;")}>{d.sellTotal}</span>
                  </div>
                  {" "}
                  {d.sellPay ? (
                    <div style={st("display:grid; grid-template-columns:1fr 1fr; gap:8px;")}>
                      <button className="wv-btn" onClick={d.sellCard} disabled={d.sellOff} style={st(`${s.btnP}min-height:60px; font-size:16px;`)}>
                        <Icon name={"credit-card"} style={st("width:18px;height:18px;")} />
                        {tr("Paid by card")}
                      </button>
                      <button className="wv-btn" onClick={d.sellCash} disabled={d.sellOff} style={st(`${s.btnG}min-height:60px; font-size:16px;`)}>
                        <Icon name={"banknote"} style={st("width:18px;height:18px;")} />
                        {tr("Paid in cash")}
                      </button>
                    </div>
                  ) : null}
                  {d.sellFree ? (
                    <button className="wv-btn" onClick={d.sellIssue} disabled={d.sellOff} style={st(`${s.btnP}min-height:60px; font-size:16px;`)}>
                      <Icon name={"ticket-check"} style={st("width:18px;height:18px;")} />
                      {tr("Issue and let in")}
                    </button>
                  ) : null}
                  {" "}
                  <span style={st(s.hint)}>{d.sellHint}</span>
                </>
              ) : null}
            </div>
          </>
        ) : null}
        {" "}
        {d.vOn ? (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="dr-v-word"
            aria-describedby="dr-v-desc"
            onClick={v.tap}
            onKeyDown={v.key}
            onPointerDown={v.down}
            onPointerUp={v.up}
            onPointerCancel={v.up}
            onBlur={v.blur}
            className="wv-verdict"
            style={st(v.style)}
          >
            <Icon name={v.icon} style={st("width:64px;height:64px;")} />
            {" "}
            <span id="dr-v-word" tabIndex={-1} data-autofocus={v.collect ? undefined : ""} style={st(`font-size:${v.size}; font-weight:800; letter-spacing:-.05em; line-height:.9; text-transform:uppercase; text-align:center; outline:none;`)}>
              {v.word}
              {v.amountOn ? (
                <>
                  {" "}
                  <span dir="ltr" style={st("font-family:var(--mono); letter-spacing:-.03em;")}>
                    {v.amount}
                  </span>
                </>
              ) : null}
            </span>
            {" "}
            <span id="dr-v-desc" style={st("display:flex; flex-direction:column; align-items:center; gap:14px;")}>
              {v.nameOn ? <span style={st("font-size:26px; font-weight:800; text-align:center;")}>{v.name}</span> : null}
              {v.typeOn ? <span style={st("font-size:17px; font-weight:700;")}>{v.type}</span> : null}
              {v.idOn ? (
                <span style={st("display:inline-flex; align-items:center; gap:8px; min-height:40px; padding:0 16px; border-radius:999px; border:2px solid currentColor; font-size:16px; font-weight:800;")}>
                  <Icon name={"id-card"} style={st("width:18px;height:18px;")} />
                  {v.id}
                </span>
              ) : null}
              {v.lineOn ? (
                <span style={st("max-width:300px; font-size:17px; font-weight:700; line-height:1.4; text-align:center;")}>
                  <Line segs={v.line} />
                </span>
              ) : null}
            </span>
            {" "}
            {v.collect ? (
              <div style={st("display:flex; flex-direction:column; gap:10px; width:100%; max-width:320px; margin-block-start:8px;")}>
                <button data-autofocus="" onClick={v.card} disabled={v.busy} style={st(`min-height:64px; border-radius:16px; border:0; background:${v.fg}; color:${v.bg}; font-size:18px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px;`)}>
                  <Icon name={"credit-card"} style={st("width:20px;height:20px;")} />
                  {tr("Paid by card")}
                </button>
                {" "}
                <button onClick={v.cash} disabled={v.busy} style={st(`min-height:64px; border-radius:16px; border:2px solid ${v.fg}; background:transparent; color:${v.fg}; font-size:18px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px;`)}>
                  <Icon name={"banknote"} style={st("width:20px;height:20px;")} />
                  {tr("Paid in cash")}
                </button>
                {" "}
                <button onClick={v.dismiss} style={st(`min-height:48px; border:0; background:transparent; color:${v.fg}; font-size:15px; font-weight:700; cursor:pointer; text-decoration:underline; text-align:center;`)}>
                  {tr("Not now")}
                </button>
              </div>
            ) : null}
            {" "}
            {v.hintOn ? <span style={st("position:absolute; inset-block-end:22px; font-size:13px; font-weight:700;")}>{tr("Tap to scan the next one")}</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
