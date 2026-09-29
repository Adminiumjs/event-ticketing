// Drawn from the Waveform design (its template ported to JSX): the layout, as drawn.
// Every value comes from the screens' values bag `v` (../app/vals/*.ts).
//
// The box office's own layers over its screens — the editor's full preview and an order's drawer — in a module of
// their own, drawn beside the box office only: the audience's builds never import it, so neither the markup nor the
// words of a drawer (payments, refunds, the access note, the timeline) reach a visitor's bundle.
import { Fragment } from "react";

import { tr } from "../i18n/tr.ts";
import { Icon, st } from "./dom.tsx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function BoxLayersView({ v }: { v: any }) {
  return (
    <>
    {v.ed.fullOn ? (
      <>
        <div role="dialog" aria-modal="true" aria-labelledby="pv-h" style={st("position:absolute; inset:0; z-index:140; display:flex; flex-direction:column; background:var(--surface-2);")}>
          <div style={st("display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding:10px 16px; border-block-end:1px solid var(--border); background:var(--surface);")}>
            <button id="pv-back" className="wv-gi" onClick={v.ed.closeFull} style={st(v.s.btnS)}>
              <Icon name={"arrow-left"} style={st("width:14px;height:14px;")} />
              {tr("Back to the editor")}
            </button>
            {" "}
            <span id="pv-h" style={st("flex:1; min-width:180px; font-size:13.5px; font-weight:800;")}>
              {tr("Previewing the draft as the audience · nothing is saved")}
            </span>
            {" "}
            <div role="radiogroup" aria-label={tr("Preview size")} style={st(v.bo.segW)}>
              {(v.ed.pvs ?? []).map((o: any, i_o: number) => (
                <Fragment key={o.id ?? i_o}>
                  <button role="radio" aria-checked={o.on} onClick={o.go} style={st(o.style)}>
                    <Icon name={o.icon} style={st("width:13px;height:13px;")} />
                    {o.id}
                  </button>
                </Fragment>
              ))}
            </div>
          </div>
          {" "}
          <div style={st(`flex:1; min-height:0; display:flex; justify-content:center; align-items:stretch; padding:${v.ed.fullPad};`)}>
            {v.ed.fullNode}
          </div>
        </div>
      </>
    ) : null}
    {" "}
    {v.dr.on ? (
      <>
        <div className="wv-scrim" onClick={v.dr.close} style={st("position:absolute; inset:0; z-index:112; background:rgba(10,10,15,.55); backdrop-filter:blur(3px);")}></div>
        {" "}
        <aside role="dialog" aria-modal="true" aria-labelledby="dr-h" className="wv-sheet" style={st(v.dr.box)}>
          <div style={st("display:flex; align-items:flex-start; gap:12px; padding:18px 20px; border-block-end:1px solid var(--border);")}>
            <div style={st("flex:1; display:flex; flex-direction:column; gap:6px;")}>
              <div style={st("display:flex; align-items:center; gap:10px; flex-wrap:wrap;")}>
                <h2 id="dr-h" style={st("margin:0; font-family:var(--mono); font-size:19px; font-weight:700;")}>
                  {v.dr.no}
                </h2>
                <span style={st(v.dr.stStyle)}>
                  {v.dr.st}
                </span>
              </div>
              <span style={st("font-size:13px; font-weight:600; color:var(--fg-muted);")}>
                {v.dr.show}
              </span>
              {v.dr.noteOn ? (
                <span style={st("font-size:12.5px; font-weight:700; color:var(--accent);")}>
                  {v.dr.note}
                </span>
              ) : null}
            </div>
            {" "}
            <button className="wv-gi" onClick={v.dr.close} aria-label={tr("Close")} style={st("width:34px; height:34px; border-radius:10px; border:0; background:var(--surface-2); display:flex; align-items:center; justify-content:center;")}>
              <Icon name={"x"} style={st("width:15px;height:15px;")} />
            </button>
          </div>
          {" "}
          <div style={st("flex:1; overflow-y:auto; padding:18px 20px 28px; display:flex; flex-direction:column; gap:20px;")}>
            <div style={st("display:flex; flex-direction:column; gap:2px;")}>
              <span style={st(`${v.s.eyebrow}font-size:10.5px;`)}>
                {tr("Buyer")}
              </span>
              <span style={st("font-size:15px; font-weight:800;")}>
                {v.dr.buyer}
              </span>
              <span style={st("font-family:var(--mono); font-size:12.5px; color:var(--fg-muted);")}>
                {v.dr.email}
              </span>
            </div>
            {" "}
            <div style={st("display:flex; flex-direction:column; gap:8px;")}>
              <span style={st(`${v.s.eyebrow}font-size:10.5px;`)}>
                {tr("Tickets")}
              </span>
              {" "}
              {(v.dr.tickets ?? []).map((t: any, i_t: number) => (
                <Fragment key={t.code ?? i_t}>
                  <div style={st("display:grid; grid-template-columns:minmax(0,1fr) auto; gap:4px 10px; padding:10px 12px; border-radius:12px; background:var(--surface-2);")}>
                    <span style={st("font-size:14px; font-weight:800;")}>
                      {t.holder}
                    </span>
                    <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:700;")}>
                      {t.code}
                    </span>
                    <span style={st("font-size:12.5px; font-weight:600; color:var(--fg-muted);")}>
                      {t.type}
                    </span>
                    <span style={st(`${t.stStyle}justify-self:end;`)}>
                      {t.st}
                    </span>
                  </div>
                </Fragment>
              ))}
            </div>
            {" "}
            <div style={st("display:flex; flex-direction:column; gap:8px; padding:12px 14px; border-radius:12px; border:1px solid var(--border);")}>
              <div style={st("display:flex; justify-content:space-between; gap:10px; font-size:13.5px; font-weight:600;")}>
                <span style={st("color:var(--fg-muted);")}>
                  {tr("Total ·")}{" "}{v.dr.how}
                </span>
                <span style={st("font-family:var(--mono); font-weight:700;")}>
                  {v.dr.total}
                </span>
              </div>
              {" "}
              {v.dr.dueOn ? (
                <>
                  <div style={st("display:flex; justify-content:space-between; gap:10px; font-size:13.5px; font-weight:600;")}>
                    <span style={st("color:var(--fg-muted);")}>
                      {tr("Pay by · reference")}{" "}{v.dr.no}
                    </span>
                    <span style={st("font-family:var(--mono); font-weight:700;")}>
                      {v.dr.due}
                    </span>
                  </div>
                </>
              ) : null}
              {" "}
              <span style={st(`${v.s.eyebrow}font-size:10.5px; padding-block-start:4px;`)}>
                {tr("Payments")}
              </span>
              {" "}
              {(v.dr.pays ?? []).map((r: any, i_r: number) => (
                <Fragment key={r.k ?? i_r}>
                  <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:700;")}>
                    {r.v}
                  </span>
                </Fragment>
              ))}
              {" "}
              {v.dr.paysNone ? (
                <>
                  <span style={st("font-size:12.5px; font-weight:600; color:var(--fg-subtle);")}>
                    {tr("Nothing recorded yet.")}
                  </span>
                </>
              ) : null}
              {" "}
              {v.dr.refsOn ? (
                <>
                  <span style={st(`${v.s.eyebrow}font-size:10.5px; padding-block-start:4px;`)}>
                    {tr("Refunds")}
                  </span>
                  {(v.dr.refs ?? []).map((r: any, i_r: number) => (
                    <Fragment key={r.k ?? i_r}>
                      <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:700;")}>
                        {r.v}
                      </span>
                    </Fragment>
                  ))}
                </>
              ) : null}
              {" "}
              <div style={st("display:flex; justify-content:space-between; gap:10px; padding-block-start:8px; border-block-start:1px solid var(--border);")}>
                <span style={st("font-size:13.5px; font-weight:800;")}>
                  {tr("Balance")}
                </span>
                <span style={st("font-family:var(--mono); font-size:13.5px; font-weight:700; text-align:end;")}>
                  {v.dr.balTxt}
                </span>
              </div>
            </div>
            {" "}
            {v.dr.accessOn ? (
              <>
                <div style={st("display:flex; flex-direction:column; gap:4px; padding:12px 14px; border-radius:12px; background:var(--surface-2); border:1px dashed var(--border-strong);")}>
                  <span style={st(`display:flex; align-items:center; gap:6px; ${v.s.eyebrow}font-size:10.5px;`)}>
                    <Icon name={"lock"} style={st("width:11px;height:11px;")} />
                    {tr("Access note · only the box office sees this")}
                  </span>
                  <span style={st("font-size:13.5px; font-weight:600; line-height:1.5;")}>
                    {v.dr.access}
                  </span>
                </div>
              </>
            ) : null}
            {" "}
            {v.dr.ansOn ? (
              <>
                <div style={st("display:flex; flex-direction:column; gap:6px;")}>
                  <span style={st(`${v.s.eyebrow}font-size:10.5px;`)}>
                    {tr("Checkout answers")}
                  </span>
                  {(v.dr.ans ?? []).map((a: any, i_a: number) => (
                    <Fragment key={a.k ?? i_a}>
                      <div style={st("display:flex; flex-direction:column; gap:2px; padding-block:6px; border-block-end:1px solid var(--border);")}>
                        <span style={st("font-size:12.5px; font-weight:700; color:var(--fg-muted);")}>
                          {a.k}
                        </span>
                        <span style={st("font-size:13.5px; font-weight:700;")}>
                          {a.v}
                        </span>
                      </div>
                    </Fragment>
                  ))}
                </div>
              </>
            ) : null}
            {" "}
            <div style={st("display:flex; flex-direction:column; gap:8px;")}>
              <span style={st(`${v.s.eyebrow}font-size:10.5px;`)}>
                {tr("Actions")}
              </span>
              <div style={st("display:grid; grid-template-columns:1fr 1fr; gap:6px;")}>
                {(v.dr.acts ?? []).map((a: any, i_a: number) => (
                  <Fragment key={a.id ?? i_a}>
                    <button className="wv-gi" onClick={a.go} style={st(a.style)}>
                      <Icon name={a.icon} style={st("width:14px;height:14px;flex-shrink:0;")} />
                      {a.label}
                    </button>
                  </Fragment>
                ))}
              </div>
            </div>
            {" "}
            <div style={st("display:flex; flex-direction:column; gap:0;")}>
              <span style={st(`${v.s.eyebrow}font-size:10.5px; padding-block-end:8px;`)}>
                {tr("Timeline")}
              </span>
              {" "}
              {(v.dr.log ?? []).map((l: any, i_l: number) => (
                <Fragment key={l.k ?? i_l}>
                  <div style={st("display:grid; grid-template-columns:14px minmax(0,1fr); gap:10px;")}>
                    <span style={st("display:flex; flex-direction:column; align-items:center;")}>
                      <span style={st(`width:9px; height:9px; margin-block-start:5px; border-radius:50%; background:${l.dot};`)}></span>
                      <span style={st("flex:1; width:2px; background:var(--border);")}></span>
                    </span>
                    <span style={st("display:flex; flex-direction:column; gap:1px; padding-block-end:12px;")}>
                      <span style={st("font-size:13.5px; font-weight:700;")}>
                        {l.txt}
                      </span>
                      <span style={st("font-family:var(--mono); font-size:11.5px; color:var(--fg-subtle);")}>
                        {l.at}
                      </span>
                    </span>
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        </aside>
      </>
    ) : null}
    </>
  );
}
