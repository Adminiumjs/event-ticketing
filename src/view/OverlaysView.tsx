// Drawn from the Waveform design (its template ported to JSX): the layout, as drawn.
// Every value comes from the screens' values bag `v` (../app/vals/*.ts).
import { Fragment } from "react";

import { tr } from "../i18n/tr.ts";
import { Icon, st } from "./dom.tsx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function OverlaysView({ v }: { v: any }) {
  return (
    <>
    {v.acctOpen ? (
      <>
        <div onClick={v.closeAcct} style={st("position:absolute; inset:0; z-index:95;")}></div>
        {" "}
        <div role="menu" aria-label={tr("Your account")} className="wv-slide" style={st("position:absolute; inset-block-start:64px; inset-inline-end:16px; z-index:96; width:272px; padding:6px; border-radius:16px; border:1px solid var(--border); background:var(--surface); box-shadow:0 20px 50px -18px rgba(0,0,0,.5); display:flex; flex-direction:column; gap:2px;")}>
          <div style={st("display:flex; flex-direction:column; gap:2px; padding:10px 10px 12px; border-block-end:1px solid var(--border); margin-block-end:4px;")}>
            <span style={st("font-size:14.5px; font-weight:800;")}>
              {v.acct.name}
            </span>
            <span style={st("font-family:var(--mono); font-size:12px; color:var(--fg-muted);")}>
              {v.acct.email}
            </span>
          </div>
          {" "}
          {(v.acct.items ?? []).map((m: any, i_m: number) => (
            <Fragment key={m.id ?? i_m}>
              <button role="menuitem" className="wv-gi" onClick={m.go} style={st(m.style)}>
                <Icon name={m.icon} style={st("width:15px;height:15px;")} />
                {m.label}
              </button>
            </Fragment>
          ))}
        </div>
      </>
    ) : null}
    {" "}
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
            <iframe data-wv-pv="1" title={tr("The public page for this draft, full size")} src={`Waveform%20Tickets.dc.html?wvPreview=1&theme=${v.ed.pvTheme}`} onLoad={v.ed.pvLoad} style={st(v.ed.fullIframe)}></iframe>
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
    {" "}
    {v.panelScrim ? (
      <>
        <div className="wv-scrim" onClick={v.pn.close} style={st("position:absolute; inset:0; z-index:105; background:rgba(10,10,15,.55); backdrop-filter:blur(3px);")}></div>
      </>
    ) : null}
    {" "}
    {v.sh.on ? (
      <>
        <div className="wv-scrim" onClick={v.sh.close} style={st(`position:absolute; inset:0; z-index:120; background:rgba(10,10,15,.55); backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px); display:flex; align-items:${v.sh.align}; justify-content:center; padding:${v.sh.pad};`)}>
          <div data-wv-sheet="1" className="wv-sheet" role="dialog" aria-modal="true" aria-labelledby="sh-h" onClick={v.stop} style={st(v.sh.box)}>
            <div style={st("display:flex; align-items:flex-start; gap:12px;")}>
              <span style={st(v.sh.iconWrap)}>
                <Icon name={v.sh.icon} style={st("width:18px;height:18px;")} />
              </span>
              {" "}
              <div style={st("flex:1; min-width:0; display:flex; flex-direction:column; gap:4px;")}>
                <h2 id="sh-h" style={st(`${v.s.h2}font-size:19px;`)}>
                  {v.sh.title}
                </h2>
                {v.sh.subOn ? (
                  <>
                    <p style={st(`${v.s.p}font-size:13.5px;`)}>
                      {v.sh.sub}
                    </p>
                  </>
                ) : null}
              </div>
              {" "}
              <button className="wv-gi" onClick={v.sh.close} aria-label={tr("Close")} style={st("width:34px; height:34px; flex-shrink:0; border-radius:10px; border:0; background:var(--surface-2); display:flex; align-items:center; justify-content:center;")}>
                <Icon name={"x"} style={st("width:15px;height:15px;")} />
              </button>
            </div>
            {" "}
            {v.sh.fieldsOn ? (
              <>
                <form onSubmit={v.sh.submit} noValidate={true} style={st("display:flex; flex-direction:column; gap:12px;")}>
                  {v.sh.qtyOn ? (
                    <>
                      <div style={st("display:flex; align-items:center; gap:12px; flex-wrap:wrap;")}>
                        <span style={st(v.s.lbl)}>
                          {tr("How many?")}
                        </span>
                        <div role="radiogroup" aria-label={tr("How many")} style={st("display:flex; gap:3px; padding:3px; border-radius:11px; background:var(--surface-2); border:1px solid var(--border);")}>
                          {(v.sh.qs ?? []).map((q: any, i_q: number) => (
                            <Fragment key={q.id ?? i_q}>
                              <button type="button" role="radio" aria-checked={q.on} onClick={q.go} style={st(q.style)}>
                                {q.id}
                              </button>
                            </Fragment>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : null}
                  {" "}
                  {(v.sh.groups ?? []).map((g: any, i_g: number) => (
                    <Fragment key={g.k ?? i_g}>
                      <div style={st("display:flex; flex-direction:column; gap:6px;")}>
                        <span style={st(v.s.lbl)}>
                          {g.k}
                        </span>
                        <div role={g.role} aria-label={g.k} style={st("display:flex; flex-wrap:wrap; gap:6px;")}>
                          {(g.opts ?? []).map((o: any, i_o: number) => (
                            <Fragment key={o.id ?? i_o}>
                              <button type="button" role={g.itemRole} aria-checked={o.on} aria-disabled={o.off ? true : undefined} onClick={o.go} style={st(o.style)}>
                                {o.label}
                              </button>
                            </Fragment>
                          ))}
                        </div>
                        {g.hintOn ? (
                          <span style={st(v.s.hint)}>
                            {g.hint}
                          </span>
                        ) : null}
                      </div>
                    </Fragment>
                  ))}
                  {" "}
                  {v.sh.stepsOn ? (
                    <>
                      <div role="group" aria-label={v.sh.stepsLabel} style={st("display:flex; flex-direction:column; gap:6px;")}>
                        <span style={st(v.s.lbl)}>
                          {v.sh.stepsLabel}
                        </span>
                        {(v.sh.steps ?? []).map((x: any, i_x: number) => (
                          <Fragment key={x.id ?? i_x}>
                            <div style={st("display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:12px; border:1px solid var(--border);")}>
                              <span style={st("flex:1; min-width:0; display:flex; flex-direction:column; gap:2px;")}>
                                <span style={st("font-size:14px; font-weight:800;")}>
                                  {x.name}
                                </span>
                                <span style={st("font-family:var(--mono); font-size:12px; font-weight:600; color:var(--fg-muted);")}>
                                  {x.sub}
                                </span>
                              </span>
                              <button type="button" className="wv-gi" onClick={x.dec} disabled={x.decOff} aria-label={x.decLabel} style={st(v.s.stepBtn)}>
                                <Icon name={"minus"} style={st("width:15px;height:15px;")} />
                              </button>
                              <span aria-live="polite" style={st("min-width:24px; text-align:center; font-family:var(--mono); font-size:15px; font-weight:700;")}>
                                {x.q}
                              </span>
                              <button type="button" className="wv-gi" onClick={x.inc} disabled={x.incOff} aria-label={x.incLabel} style={st(v.s.stepBtn)}>
                                <Icon name={"plus"} style={st("width:15px;height:15px;")} />
                              </button>
                            </div>
                          </Fragment>
                        ))}
                        {v.sh.stepsErrOn ? (
                          <span role="alert" style={st(v.s.err)}>
                            <Icon name={"circle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                            {v.sh.stepsErr}
                          </span>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                  {" "}
                  {v.sh.areaOn ? (
                    <>
                      <label style={st("display:flex; flex-direction:column; gap:6px;")}>
                        <span style={st(v.s.lbl)}>
                          {v.sh.areaLabel}
                        </span>
                        <textarea id="sh-area" className="wv-fld" rows={7} value={v.sh.area} onChange={v.sh.onArea} placeholder={v.sh.areaPh} style={st(`${v.s.fld}padding-block:10px; min-height:140px; line-height:1.55; font-weight:500; resize:vertical;`)}></textarea>
                      </label>
                    </>
                  ) : null}
                  {" "}
                  {v.sh.summaryOn ? (
                    <>
                      <div role="status" style={st(v.s.aInfo)}>
                        <Icon name={"info"} style={st("width:16px;height:16px;flex-shrink:0;margin-block-start:2px;color:var(--info);")} />
                        <span>
                          {v.sh.summary}
                        </span>
                      </div>
                    </>
                  ) : null}
                  {" "}
                  {(v.sh.fields ?? []).map((f: any, i_f: number) => (
                    <Fragment key={f.id ?? i_f}>
                      <label style={st("display:flex; flex-direction:column; gap:6px;")}>
                        <span style={st(v.s.lbl)}>
                          {f.label}
                        </span>
                        <input id={f.id} className="wv-fld" type={f.type} value={f.v ?? ""} onChange={f.on} aria-invalid={f.errOn} aria-describedby={f.eid} autoComplete={f.ac} inputMode={f.im} style={st(f.style)} />
                        {f.errOn ? (
                          <>
                            <span id={f.eid} role="alert" style={st(v.s.err)}>
                              <Icon name={"circle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                              {f.err}
                            </span>
                          </>
                        ) : null}
                      </label>
                    </Fragment>
                  ))}
                  {" "}
                  {v.sh.noteOn ? (
                    <>
                      <span style={st(v.s.hint)}>
                        {v.sh.note}
                      </span>
                    </>
                  ) : null}
                  {" "}
                  {v.sh.refusalOn ? (
                    <div role="alert" style={st(v.s.aDanger)}>
                      <Icon name={"circle-alert"} style={st("width:16px;height:16px;flex-shrink:0;margin-block-start:2px;color:var(--danger);")} />
                      <span>
                        {v.sh.refusal}
                      </span>
                    </div>
                  ) : null}
                  {" "}
                  <button type="submit" className="wv-btn" style={st(v.sh.submitStyle)}>
                    {v.sh.submitLabel}
                  </button>
                </form>
              </>
            ) : null}
            {" "}
            {v.sh.doneOn ? (
              <>
                <div role="status" style={st(v.s.aPos)}>
                  <Icon name={"circle-check"} style={st("width:17px;height:17px;flex-shrink:0;margin-block-start:2px;color:var(--pos);")} />
                  <span>
                    {v.sh.done}
                  </span>
                </div>
              </>
            ) : null}
            {" "}
            {v.sh.bodyOn ? (
              <>
                <p style={st(`${v.s.p}font-size:14.5px; color:var(--fg);`)}>
                  {v.sh.body}
                </p>
              </>
            ) : null}
            {" "}
            {v.sh.listOn ? (
              <>
                <div style={st("display:flex; flex-direction:column; gap:2px;")}>
                  {(v.sh.list ?? []).map((m: any, i_m: number) => (
                    <Fragment key={m.id ?? i_m}>
                      <button className="wv-gi" onClick={m.go} style={st("display:flex; align-items:center; gap:12px; min-height:48px; padding:0 12px; border-radius:12px; border:0; background:transparent; color:var(--fg); font-size:14.5px; font-weight:700; text-align:start;")}>
                        <Icon name={m.icon} style={st("width:17px;height:17px;color:var(--fg-muted);")} />
                        <span style={st("flex:1;")}>
                          {m.label}
                        </span>
                        <Icon name={"chevron-right"} style={st("width:15px;height:15px;color:var(--fg-subtle);")} />
                      </button>
                    </Fragment>
                  ))}
                </div>
              </>
            ) : null}
            {" "}
            {v.sh.rowsOn ? (
              <>
                <dl style={st("margin:0; display:flex; flex-direction:column;")}>
                  {(v.sh.rows ?? []).map((r: any, i_r: number) => (
                    <Fragment key={r.k ?? i_r}>
                      <div style={st("display:flex; justify-content:space-between; gap:14px; padding-block:9px; border-block-end:1px solid var(--border);")}>
                        <dt style={st("font-size:13.5px; font-weight:700; color:var(--fg-muted);")}>
                          {r.k}
                        </dt>
                        <dd style={st("margin:0; font-family:var(--mono); font-size:13.5px; font-weight:700; text-align:end;")}>
                          {r.v}
                        </dd>
                      </div>
                    </Fragment>
                  ))}
                </dl>
              </>
            ) : null}
            {" "}
            {v.sh.secsOn ? (
              <>
                <div style={st("display:flex; flex-direction:column; gap:14px;")}>
                  {(v.sh.secs ?? []).map((x: any, i_x: number) => (
                    <Fragment key={x.k ?? i_x}>
                      <div style={st("display:flex; flex-direction:column; gap:6px;")}>
                        <span style={st("font-size:14.5px; font-weight:800;")}>
                          {x.k}
                        </span>
                        {(x.lines ?? []).map((l: any, i_l: number) => (
                          <Fragment key={l ?? i_l}>
                            <span style={st("font-size:13.5px; font-weight:500; line-height:1.55; color:var(--fg-muted);")}>
                              {l}
                            </span>
                          </Fragment>
                        ))}
                      </div>
                    </Fragment>
                  ))}
                </div>
              </>
            ) : null}
            {" "}
            {v.sh.mailOn ? (
              <>
                <div style={st("display:flex; flex-direction:column; gap:12px; padding:18px; border-radius:14px; background:#ffffff; color:#191920; border:1px solid #e2e2e8;")}>
                  <span style={st("font-size:12px; font-weight:700; color:#5a5a65;")}>
                    {tr("From Waveform · to")}{" "}{v.sh.mailTo}
                  </span>
                  {" "}
                  <span style={st("font-size:17px; font-weight:800;")}>
                    {tr("Sign in to Waveform")}
                  </span>
                  {" "}
                  <span style={st("font-size:13.5px; font-weight:500; color:#4a4a54; line-height:1.5;")}>
                    {tr("Open the link to sign in on this phone, or type this code:")}
                  </span>
                  {" "}
                  <span style={st("font-family:'JetBrains Mono',monospace; font-size:34px; font-weight:700; letter-spacing:.24em;")}>
                    {"482913"}
                  </span>
                  {" "}
                  <span style={st("font-size:13px; font-weight:500; color:#4a4a54;")}>
                    {tr("The link and the code both work for 20 minutes, once. If you didn't ask for this, ignore it.")}
                  </span>
                </div>
              </>
            ) : null}
            {" "}
            {v.sh.refusalOn && !v.sh.fieldsOn ? (
              <div role="alert" style={st(v.s.aDanger)}>
                <Icon name={"circle-alert"} style={st("width:16px;height:16px;flex-shrink:0;margin-block-start:2px;color:var(--danger);")} />
                <span>
                  {v.sh.refusal}
                </span>
              </div>
            ) : null}
            {" "}
            {v.sh.btnsOn ? (
              <>
                <div style={st("display:flex; gap:8px; flex-wrap:wrap;")}>
                  {(v.sh.btns ?? []).map((b: any, i_b: number) => (
                    <Fragment key={b.id ?? i_b}>
                      <button className="wv-btn" onClick={b.go} style={st(b.style)}>
                        {b.label}
                      </button>
                    </Fragment>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </>
    ) : null}
    {" "}
    {v.dm.on ? (
      <>
        <div role="dialog" aria-modal="true" aria-label={tr("Your ticket")} style={st("position:absolute; inset:0; z-index:130; background:var(--bg); display:flex; flex-direction:column;")}>
          <div style={st("display:flex; align-items:center; gap:10px; padding:12px 16px; border-block-end:1px solid var(--border);")}>
            <button className="wv-gi" onClick={v.dm.close} style={st(v.s.btnS)}>
              <Icon name={"x"} style={st("width:15px;height:15px;")} />
              {tr("Done")}
            </button>
            {" "}
            <span style={st("flex:1; text-align:center; font-family:var(--mono); font-size:13px; font-weight:700;")}>
              {v.dm.pos}
            </span>
            {" "}
            <span style={st("display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:700; color:var(--fg-muted);")}>
              <Icon name={"sun"} style={st("width:14px;height:14px;")} />
              {tr("Brightness up")}
            </span>
          </div>
          {" "}
          <div ref={v.dmRef} className="wv-snap wv-hide" onScroll={v.dm.onScroll} style={st("flex:1; display:flex; overflow-x:auto; overflow-y:auto;")}>
            {(v.dm.tickets ?? []).map((t: any, i_t: number) => (
              <Fragment key={t.code ?? i_t}>
                <div style={st("flex:0 0 100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; padding:20px;")}>
                  <div style={st("width:min(340px,100%); display:flex; flex-direction:column; align-items:center; gap:12px; padding:22px; border-radius:26px; background:#ffffff; color:#191920; box-shadow:0 30px 60px -30px rgba(0,0,0,.6);")}>
                    <span style={st("font-family:'JetBrains Mono',monospace; font-size:12.5px; font-weight:700; color:#5a5a65;")}>
                      {t.when}
                    </span>
                    {" "}
                    <span style={st("font-size:22px; font-weight:800; letter-spacing:-.04em; text-align:center;")}>
                      {t.show}
                    </span>
                    {" "}
                    <img src={t.qr} alt={t.qrAlt} style={st("width:min(100%, 40vh); aspect-ratio:1; display:block;")} />
                    {" "}
                    <span style={st("font-family:'JetBrains Mono',monospace; font-size:22px; font-weight:700; letter-spacing:.1em;")}>
                      {t.code}
                    </span>
                    {" "}
                    <span style={st("font-size:15px; font-weight:800;")}>
                      {t.holder}
                    </span>
                    {" "}
                    <span style={st("font-size:13px; font-weight:700; color:#4a4a54;")}>
                      {t.type}{" · "}{t.room}
                    </span>
                    {" "}
                    {t.payOn ? (
                      <>
                        <span style={st("display:inline-flex; align-items:center; min-height:28px; padding:0 11px; border-radius:999px; background:#e7edfd; color:#1c59e0; font-size:12.5px; font-weight:800;")}>
                          {t.payTxt}
                        </span>
                      </>
                    ) : null}
                  </div>
                  {" "}
                  <span style={st("font-size:13px; font-weight:700; color:var(--fg-muted);")}>
                    {tr("Turn your brightness up")}
                  </span>
                </div>
              </Fragment>
            ))}
          </div>
          {" "}
          <div style={st("display:flex; flex-direction:column; align-items:center; gap:10px; padding:12px 16px 20px; border-block-start:1px solid var(--border);")}>
            {v.dm.multi ? (
              <>
                <div style={st("display:flex; align-items:center; gap:14px;")}>
                  <button className="wv-gi" onClick={v.dm.prev} disabled={v.dm.prevOff} aria-label={tr("Previous ticket")} style={st("width:44px; height:44px; border-radius:12px; border:1px solid var(--border-strong); background:var(--surface); display:flex; align-items:center; justify-content:center;")}>
                    <Icon name={"chevron-left"} style={st("width:18px;height:18px;")} />
                  </button>
                  <div style={st("display:flex; gap:6px;")}>
                    {(v.dm.dots ?? []).map((d: any, i_d: number) => (
                      <Fragment key={d.k ?? i_d}>
                        <span style={st(d.style)}></span>
                      </Fragment>
                    ))}
                  </div>
                  <button className="wv-gi" onClick={v.dm.next} disabled={v.dm.nextOff} aria-label={tr("Next ticket")} style={st("width:44px; height:44px; border-radius:12px; border:1px solid var(--border-strong); background:var(--surface); display:flex; align-items:center; justify-content:center;")}>
                    <Icon name={"chevron-right"} style={st("width:18px;height:18px;")} />
                  </button>
                </div>
              </>
            ) : null}
            {" "}
            <span style={st("display:flex; align-items:center; gap:6px; font-size:12.5px; font-weight:700; color:var(--fg-subtle);")}>
              <Icon name={"wifi-off"} style={st("width:14px;height:14px;flex-shrink:0;")} />
              {tr("Save it: download the PDF, or keep this page open — it then works without signal.")}
            </span>
          </div>
        </div>
      </>
    ) : null}
    {" "}
    <div aria-live="polite" role="status" style={st(`position:absolute; inset-inline:0; inset-block-end:${v.toastBottom}; z-index:150; display:flex; justify-content:center; pointer-events:none; padding-inline:16px;`)}>
      {v.toastOn ? (
        <>
          <div className="wv-sheet" style={st("display:inline-flex; align-items:center; gap:9px; min-height:42px; padding:0 18px; border-radius:999px; background:var(--fg); color:var(--bg); font-size:13.5px; font-weight:700; box-shadow:0 14px 34px -12px rgba(0,0,0,.45);")}>
            <Icon name={v.toastIcon} style={st("width:16px;height:16px;")} />
            {v.toastMsg}
          </div>
        </>
      ) : null}
    </div>
    </>
  );
}
