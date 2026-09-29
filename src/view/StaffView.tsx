// Drawn from the Waveform design (its template ported to JSX): the layout, as drawn.
// Every value comes from the screens' values bag `v` (../app/vals/*.ts).
import { Fragment } from "react";

import { tr } from "../i18n/tr.ts";
import { DoorView } from "./DoorView.tsx";
import { Icon, st } from "./dom.tsx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function StaffView({ v }: { v: any }) {
  return (
    <>
    {v.bo.on ? (
      <>
        <div style={st(v.bo.shell)}>
          <nav aria-label={tr("Box office")} style={st(v.bo.side)}>
            <div style={st(v.bo.brand)}>
              <span style={st("display:flex; flex-direction:column; gap:3px;")}>
                <span style={st("font-size:17px; font-weight:800; letter-spacing:-.05em;")}>
                  {tr("Waveform")}
                </span>
                <img src={v.waveMark} alt="" style={st("display:block; width:74px; height:6px;")} />
              </span>
              <span style={st("font-size:10.5px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--fg-subtle);")}>
                {tr("Box office")}
              </span>
            </div>
            {" "}
            {(v.bo.nav ?? []).map((n: any, i_n: number) => (
              <Fragment key={n.id ?? i_n}>
                <button className="wv-gi" onClick={n.go} aria-current={n.cur} style={st(n.style)}>
                  <Icon name={n.icon} style={st("width:16px;height:16px;")} />
                  <span style={st("flex:1;")}>
                    {n.label}
                  </span>
                  {n.badgeOn ? (
                    <>
                      <span aria-hidden="true" style={st("min-width:20px; height:20px; padding:0 6px; border-radius:999px; background:var(--warn-soft); color:var(--warn); font-family:var(--mono); font-size:11px; font-weight:700; display:inline-flex; align-items:center; justify-content:center;")}>
                        {n.badge}
                      </span>
                      <span className="wv-sr">{n.badgeLabel}</span>
                    </>
                  ) : null}
                </button>
              </Fragment>
            ))}
          </nav>
          {" "}
          <div style={st("flex:1; min-width:0; min-height:0; display:flex; flex-direction:column;")}>
            <div style={st(`position:relative; z-index:5; flex-shrink:0; display:flex; align-items:center; gap:10px; height:58px; padding-inline:${v.bo.padX}; border-block-end:1px solid var(--border); background:var(--surface);`)}>
              {v.bo.searchOn ? (
                <>
                  <div style={st("position:relative; flex:1; max-width:520px;")}>
                    <Icon name={"search"} style={st("position:absolute; inset-inline-start:12px; inset-block-start:12px; width:15px; height:15px; color:var(--fg-subtle);")} />
                    {" "}
                    <input className="wv-fld" type="search" role="combobox" aria-autocomplete="list" aria-expanded={v.bo.qOn} aria-controls="bo-q-list" aria-activedescendant={v.bo.qActive} value={v.bo.q ?? ""} onChange={v.bo.onQ} onKeyDown={v.bo.onQKey} aria-label={tr("Search orders")} placeholder={tr("Search orders by number, name, email or ticket code")} style={st("width:100%; height:40px; padding-inline:36px 12px; border-radius:11px; border:1px solid var(--border-strong); background:var(--surface-2); color:var(--fg); font-size:13.5px; font-weight:600;")} />
                    {" "}
                    {v.bo.qOn ? (
                      <>
                        <div id="bo-q-list" role="listbox" aria-label={tr("Matching orders")} style={st("position:absolute; inset-inline:0; inset-block-start:calc(100% + 6px); max-height:360px; overflow-y:auto; padding:6px; border-radius:14px; border:1px solid var(--border); background:var(--surface); box-shadow:0 20px 50px -18px rgba(0,0,0,.45);")}>
                          {(v.bo.qRes ?? []).map((r: any, i_r: number) => (
                            <Fragment key={r.no ?? i_r}>
                              <button id={r.id} role="option" aria-selected={r.on} tabIndex={-1} className="wv-gi" onClick={r.open} style={st(`display:grid; grid-template-columns:78px minmax(0,1fr) auto; gap:10px; align-items:center; width:100%; min-height:44px; padding:6px 10px; border-radius:10px; border:0; background:${r.on ? "var(--surface-2)" : "transparent"}; text-align:start;`)}>
                                <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:700;")}>
                                  {r.no}
                                </span>
                                <span style={st("display:flex; flex-direction:column; min-width:0;")}>
                                  <span style={st("font-size:13.5px; font-weight:800;")}>
                                    {r.buyer}
                                  </span>
                                  <span style={st("font-size:12px; font-weight:600; color:var(--fg-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;")}>
                                    {r.sub}
                                  </span>
                                </span>
                                <span style={st(r.stStyle)}>
                                  {r.st}
                                </span>
                              </button>
                            </Fragment>
                          ))}
                          {" "}
                          {v.bo.qNone ? (
                            <>
                              <p style={st("margin:0; padding:12px; font-size:13px; font-weight:600; color:var(--fg-muted);")}>
                                {tr("No orders match that.")}
                              </p>
                            </>
                          ) : null}
                          {v.bo.qMoreOn ? (
                            <button className="wv-gi" onClick={v.bo.toAllOrders} tabIndex={-1} style={st(`${v.s.btnT}width:100%; justify-content:center;`)}>
                              {v.bo.qMore}
                            </button>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                  </div>
                </>
              ) : null}
              {" "}
              <span style={st("flex:1;")}></span>
              {" "}
              <button className="wv-gi" onClick={v.toggleTheme} aria-label={v.themeLabel} title={v.themeLabel} style={st("width:38px; height:38px; border:0; border-radius:10px; background:transparent; color:var(--fg-muted); display:flex; align-items:center; justify-content:center;")}>
                <Icon name={v.themeIcon} style={st("width:17px;height:17px;")} />
              </button>
              {" "}
              <button className="wv-gi" onClick={v.bo.userOpen} aria-haspopup="dialog" aria-label={v.bo.userLabel} style={st("display:flex; align-items:center; gap:9px; padding:4px 10px 4px 4px; border-radius:999px; border:1px solid var(--border); background:transparent; color:var(--fg);")}>
                <span style={st("width:30px; height:30px; border-radius:50%; background:oklch(0.62 0.12 150); color:#0f0f14; font-size:12px; font-weight:800; display:flex; align-items:center; justify-content:center;")}>
                  {v.bo.userIni}
                </span>
                <span style={st("display:flex; flex-direction:column; align-items:flex-start; line-height:1.15;")}>
                  <span style={st("font-size:13px; font-weight:800;")}>
                    {v.bo.userName}
                  </span>
                  {v.wide ? (
                    <>
                      <span style={st("font-size:11px; font-weight:600; color:var(--fg-subtle);")}>
                        {v.bo.userRole}
                      </span>
                    </>
                  ) : null}
                </span>
                <Icon name={"chevron-down"} style={st("width:14px;height:14px;color:var(--fg-subtle);")} />
              </button>
            </div>
            {" "}
            <div ref={v.boRef} style={st("flex:1; min-height:0; overflow-y:auto; overflow-x:hidden;")}>
              {v.bo.ehOn ? (
                <>
                  <div style={st(`max-width:1240px; margin-inline:auto; padding:20px ${v.bo.padX} 0; display:flex; flex-direction:column; gap:12px;`)}>
                    <button className="wv-gi" onClick={v.bo.toEvents} style={st(`${v.s.btnT}align-self:flex-start; color:var(--fg-muted); min-height:28px;`)}>
                      <Icon name={"arrow-left"} style={st("width:14px;height:14px;")} />
                      {tr("All events")}
                    </button>
                    {" "}
                    <div style={st("display:flex; align-items:center; gap:14px; flex-wrap:wrap;")}>
                      <span style={st(`width:46px; aspect-ratio:4/5; border-radius:8px; flex-shrink:0; ${v.eh.p.bg}`)}></span>
                      {" "}
                      <div style={st("flex:1; min-width:200px; display:flex; flex-direction:column; gap:3px;")}>
                        <h1 style={st("margin:0; font-size:24px; font-weight:800; letter-spacing:-.04em;")}>
                          {v.eh.name}
                        </h1>
                        <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:600; color:var(--fg-muted);")}>
                          {v.eh.meta}
                        </span>
                      </div>
                      {" "}
                      <span style={st(v.eh.stStyle)}>
                        {v.eh.st}
                      </span>
                      {" "}
                      <button className="wv-gi" onClick={v.eh.preview} style={st(v.s.btnS)}>
                        <Icon name={"eye"} style={st("width:14px;height:14px;")} />
                        {tr("Preview as the audience")}
                      </button>
                    </div>
                    {" "}
                    <nav aria-label={tr("Event")} className="wv-hide" style={st("display:flex; gap:2px; overflow-x:auto; border-block-end:1px solid var(--border);")}>
                      {(v.eh.tabs ?? []).map((t: any, i_t: number) => (
                        <Fragment key={t.id ?? i_t}>
                          <button aria-current={t.on ? "page" : undefined} onClick={t.go} style={st(t.style)}>
                            {t.label}
                          </button>
                        </Fragment>
                      ))}
                    </nav>
                  </div>
                </>
              ) : null}
              {" "}
              {v.boLoading ? (
                <div aria-busy="true" aria-label={tr("Loading")} className="wv-screen" style={st(v.bo.page)}>
                  <div className="wv-pulse" style={st("height:34px; width:30%; border-radius:8px; background:var(--surface-2);")}></div>
                  <div className="wv-pulse" style={st("height:220px; border-radius:18px; background:var(--surface-2);")}></div>
                  <div className="wv-pulse" style={st("height:22px; width:55%; border-radius:8px; background:var(--surface-2);")}></div>
                </div>
              ) : null}
              {" "}
              {v.bo.s.today ? (
                <>
                  <div className="wv-screen" style={st(v.bo.page)}>
                    <div style={st("display:flex; align-items:baseline; gap:12px; flex-wrap:wrap;")}>
                      <h1 style={st(v.bo.h1)}>
                        {tr("Today")}
                      </h1>
                      <span style={st("font-family:var(--mono); font-size:13px; font-weight:600; color:var(--fg-muted);")}>
                        {v.td.date}
                      </span>
                    </div>
                    {" "}
                    {(v.td.shows ?? []).map((sh: any, i_sh: number) => (
                      <Fragment key={sh.id ?? i_sh}>
                        <section aria-labelledby={`tn-h-${String(sh.id)}`} style={st(`${v.bo.card}padding:20px; display:grid; grid-template-columns:${v.td.cols}; gap:20px; align-items:start;`)}>
                          <span style={st(`display:block; width:100%; max-width:150px; aspect-ratio:4/5; border-radius:12px; overflow:hidden; position:relative; container-type:inline-size; ${sh.p.bg}`)}>
                            <span style={st(sh.p.glyph)}>
                              {sh.p.letter}
                            </span>
                            <span style={st(sh.p.title)}>
                              {sh.name}
                            </span>
                          </span>
                          {" "}
                          <div style={st("display:flex; flex-direction:column; gap:14px; min-width:0;")}>
                            <div style={st("display:flex; align-items:center; gap:10px; flex-wrap:wrap;")}>
                              <span style={st("font-size:11.5px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:var(--accent);")}>
                                {tr("Tonight")}
                              </span>
                              <span style={st("display:inline-flex; align-items:center; gap:6px; min-height:26px; padding:0 10px; border-radius:999px; border:1px solid var(--border-strong); font-family:var(--mono); font-size:12px; font-weight:700;")}>
                                {sh.doorsIn}
                              </span>
                            </div>
                            {" "}
                            <div style={st("display:flex; flex-direction:column; gap:4px;")}>
                              <h2 id={`tn-h-${String(sh.id)}`} style={st("margin:0; font-size:30px; font-weight:800; letter-spacing:-.05em; line-height:1;")}>
                                {sh.name}
                              </h2>
                              <span style={st("font-family:var(--mono); font-size:13px; font-weight:600; color:var(--fg-muted);")}>
                                {sh.when}
                              </span>
                            </div>
                            {" "}
                            <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:10px;")}>
                              {(sh.kpis ?? []).map((k: any, i_k: number) => (
                                <Fragment key={k.k ?? i_k}>
                                  <div style={st(v.bo.kpi)}>
                                    <span style={st(`${v.s.eyebrow}font-size:10.5px;`)}>
                                      {k.k}
                                    </span>
                                    <span style={st(v.bo.kpiV)}>
                                      {k.v}
                                    </span>
                                    <span style={st(v.bo.kpiS)}>
                                      {k.sub}
                                    </span>
                                    {k.waveOn ? (
                                      <>
                                        <img src={k.wave} alt={k.waveAlt} style={st("display:block; width:100%; height:18px;")} />
                                      </>
                                    ) : null}
                                  </div>
                                </Fragment>
                              ))}
                            </div>
                            {" "}
                            <div style={st("display:flex; gap:8px; flex-wrap:wrap;")}>
                              <button className="wv-btn" onClick={sh.openDoor} style={st(`${v.s.btnP}min-height:42px;`)}>
                                <Icon name={"scan-line"} style={st("width:16px;height:16px;")} />
                                {tr("Open the door")}
                              </button>
                              <button className="wv-gi" onClick={sh.message} style={st(`${v.s.btnG}min-height:42px;`)}>
                                <Icon name={"send"} style={st("width:16px;height:16px;")} />
                                {tr("Message ticket holders")}
                              </button>
                            </div>
                          </div>
                        </section>
                      </Fragment>
                    ))}
                    {" "}
                    <section aria-labelledby="nd-h" style={st(v.bo.card)}>
                      <div style={st("display:flex; align-items:baseline; gap:8px; padding:16px 20px 10px;")}>
                        <h2 id="nd-h" style={st(`${v.s.h2}font-size:18px;`)}>
                          {tr("Needs you")}
                        </h2>
                        <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:700; color:var(--fg-subtle);")}>
                          {v.td.needCount}
                        </span>
                      </div>
                      {" "}
                      {(v.td.needs ?? []).map((n: any, i_n: number) => (
                        <Fragment key={n.id ?? i_n}>
                          <div style={st("display:flex; align-items:flex-start; gap:14px; padding:14px 20px; border-block-start:1px solid var(--border); flex-wrap:wrap;")}>
                            <span style={st(n.iconWrap)}>
                              <Icon name={n.icon} style={st("width:16px;height:16px;")} />
                            </span>
                            {" "}
                            <div style={st("flex:1; min-width:220px; display:flex; flex-direction:column; gap:3px;")}>
                              <span style={st("font-size:14.5px; font-weight:800;")}>
                                {n.title}
                              </span>
                              <span style={st("font-size:13px; font-weight:500; color:var(--fg-muted); line-height:1.5;")}>
                                {n.sub}
                              </span>
                              {" "}
                              {n.itemsOn ? (
                                <>
                                  <div style={st("display:flex; flex-direction:column; gap:6px; margin-block-start:8px;")}>
                                    {(n.items ?? []).map((it: any, i_it: number) => (
                                      <Fragment key={it.no ?? i_it}>
                                        <div style={st("display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:8px 10px; border-radius:10px; background:var(--surface-2);")}>
                                          <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:700;")}>
                                            {it.no}
                                          </span>
                                          <span style={st("flex:1; min-width:160px; font-size:13px; font-weight:700;")}>
                                            {it.txt}
                                          </span>
                                          {it.remindedOn ? (
                                            <>
                                              <span style={st("font-family:var(--mono); font-size:11.5px; font-weight:600; color:var(--fg-subtle);")}>
                                                {it.reminded}
                                              </span>
                                            </>
                                          ) : null}
                                          {(it.acts ?? []).map((a: any, i_a: number) => (
                                            <Fragment key={a.id ?? i_a}>
                                              <button className="wv-gi" onClick={a.go} style={st(`${v.s.btnS}min-height:30px; padding:0 10px; font-size:12px;`)}>
                                                {a.label}
                                              </button>
                                            </Fragment>
                                          ))}
                                        </div>
                                      </Fragment>
                                    ))}
                                  </div>
                                </>
                              ) : null}
                            </div>
                            {" "}
                            <div style={st("display:flex; gap:6px; flex-wrap:wrap;")}>
                              {(n.acts ?? []).map((a: any, i_a: number) => (
                                <Fragment key={a.id ?? i_a}>
                                  <button className="wv-btn" onClick={a.go} style={st(a.style)}>
                                    {a.label}
                                  </button>
                                </Fragment>
                              ))}
                            </div>
                          </div>
                        </Fragment>
                      ))}
                      {" "}
                      {v.td.needsEmpty ? (
                        <>
                          <p style={st("margin:0; padding:14px 20px 18px; font-size:14px; font-weight:600; color:var(--fg-muted); border-block-start:1px solid var(--border);")}>
                            {tr("Nothing needs you right now.")}
                          </p>
                        </>
                      ) : null}
                    </section>
                    {" "}
                    <div style={st(`display:grid; grid-template-columns:${v.td.cols2}; gap:20px; align-items:start;`)}>
                      <section aria-labelledby="nx-h" style={st(`${v.bo.card}padding-block-end:6px;`)}>
                        <div style={st("display:flex; flex-direction:column; gap:3px; padding:16px 20px 10px;")}>
                          <h2 id="nx-h" style={st(`${v.s.h2}font-size:18px;`)}>
                            {tr("The next 14 days")}
                          </h2>
                          <span style={st(v.s.hint)}>
                            {tr("Ahead or behind, compared with this season's shows in the same room.")}
                          </span>
                        </div>
                        {" "}
                        {(v.td.next ?? []).map((e: any, i_e: number) => (
                          <Fragment key={e.id ?? i_e}>
                            <button className="wv-row" onClick={e.open} style={st(`display:grid; grid-template-columns:${v.td.nextCols}; gap:12px; align-items:center; width:100%; padding:11px 20px; border:0; border-block-start:1px solid var(--border); background:transparent; color:var(--fg); text-align:start;`)}>
                              <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:700;")}>
                                {e.date}
                              </span>
                              {" "}
                              <span style={st("display:flex; flex-direction:column; min-width:0;")}>
                                <span style={st("font-size:14px; font-weight:800; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;")}>
                                  {e.name}
                                </span>
                                <span style={st("font-size:12px; font-weight:600; color:var(--fg-subtle);")}>
                                  {e.room}
                                </span>
                              </span>
                              {" "}
                              <span style={st("display:flex; flex-direction:column; gap:4px;")}>
                                <span style={st("font-family:var(--mono); font-size:12px; font-weight:600; color:var(--fg-muted);")}>
                                  {e.soldTxt}
                                </span>
                                <span style={st(v.bo.track)}>
                                  <span style={st(e.bar)}></span>
                                </span>
                              </span>
                              {" "}
                              <span style={st(e.paceStyle)}>
                                {e.pace}
                              </span>
                            </button>
                          </Fragment>
                        ))}
                      </section>
                      {" "}
                      <div style={st("display:flex; flex-direction:column; gap:20px;")}>
                        <section aria-labelledby="ld-h" style={st(`${v.bo.card}padding:16px 20px; display:flex; flex-direction:column; gap:12px;`)}>
                          <h2 id="ld-h" style={st(`${v.s.h2}font-size:18px;`)}>
                            {tr("Today so far")}
                          </h2>
                          {" "}
                          {(v.td.day ?? []).map((k: any, i_k: number) => (
                            <Fragment key={k.k ?? i_k}>
                              <div style={st("display:flex; justify-content:space-between; align-items:baseline; gap:12px; padding-block:8px; border-block-start:1px solid var(--border);")}>
                                <span style={st("font-size:13.5px; font-weight:700; color:var(--fg-muted);")}>
                                  {k.k}
                                </span>
                                <span style={st("font-family:var(--mono); font-size:17px; font-weight:700;")}>
                                  {k.v}
                                </span>
                              </div>
                            </Fragment>
                          ))}
                        </section>
                        {" "}
                        <section aria-labelledby="en-h" style={st(`${v.bo.card}padding:16px 20px; display:flex; flex-direction:column; gap:8px;`)}>
                          <h2 id="en-h" style={st(`${v.s.h2}font-size:18px;`)}>
                            {tr("End of night")}
                          </h2>
                          <span style={st("font-size:13.5px; font-weight:600; line-height:1.55; color:var(--fg-muted);")}>
                            {v.td.endTxt}
                          </span>
                        </section>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
              {" "}
              {v.bo.s.events ? (
                <>
                  <div className="wv-screen" style={st(v.bo.page)}>
                    <div style={st("display:flex; align-items:center; gap:12px; flex-wrap:wrap;")}>
                      <h1 style={st(`${v.bo.h1}flex:1;`)}>
                        {tr("Events")}
                      </h1>
                      <button className="wv-btn" onClick={v.el.create} style={st(`${v.s.btnP}min-height:40px;`)}>
                        <Icon name={"plus"} style={st("width:16px;height:16px;")} />
                        {tr("New event")}
                      </button>
                    </div>
                    {" "}
                    <div role="group" aria-label={tr("Filter events")} className="wv-hide" style={st("display:flex; gap:6px; overflow-x:auto;")}>
                      {(v.el.filters ?? []).map((f: any, i_f: number) => (
                        <Fragment key={f.id ?? i_f}>
                          <button className="wv-gi" onClick={f.go} aria-pressed={f.on} style={st(f.style)}>
                            {f.label}
                          </button>
                        </Fragment>
                      ))}
                    </div>
                    {" "}
                    <div style={st(`${v.bo.card}overflow-x:auto;`)}>
                      <table style={st(v.bo.table)}>
                        <thead>
                          <tr>
                            <th style={st(v.bo.th)}>
                              {tr("Event")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("Date")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("Room")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("Status")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("Sold")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("Taken")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("Owed")}
                            </th>
                            <th style={st(v.bo.th)}>
                              <span style={st("position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0);")}>
                                {tr("Actions")}
                              </span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(v.el.rows ?? []).map((r: any, i_r: number) => (
                            <Fragment key={r.id ?? i_r}>
                              <tr className="wv-row" onClick={r.open}>
                                <td style={st(v.bo.td)}>
                                  <div style={st("display:flex; align-items:center; gap:10px; min-width:200px;")}>
                                    <span style={st(`width:34px; aspect-ratio:4/5; border-radius:6px; flex-shrink:0; ${r.p.bg}`)}></span>
                                    <span style={st("display:flex; flex-direction:column; min-width:0;")}>
                                      <button className="wv-gi" onClick={r.open} style={st("padding:0; border:0; background:transparent; color:var(--fg); font-size:14px; font-weight:800; text-align:start; cursor:pointer;")}>
                                        {r.name}
                                      </button>
                                      <span style={st("font-size:12px; font-weight:600; color:var(--fg-subtle);")}>
                                        {r.kind}
                                      </span>
                                    </span>
                                  </div>
                                </td>
                                <td style={st(v.bo.tdm)}>
                                  {r.date}
                                </td>
                                <td style={st(`${v.bo.td}white-space:nowrap;`)}>
                                  {r.room}
                                </td>
                                <td style={st(v.bo.td)}>
                                  <span style={st(r.stStyle)}>
                                    {r.st}
                                  </span>
                                </td>
                                <td style={st(v.bo.td)}>
                                  <div style={st("display:flex; flex-direction:column; gap:4px; min-width:120px;")}>
                                    <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:600;")}>
                                      {r.soldTxt}
                                    </span>
                                    <span style={st(v.bo.track)}>
                                      <span style={st(r.bar)}></span>
                                    </span>
                                  </div>
                                </td>
                                <td style={st(v.bo.tdm)}>
                                  {r.taken}
                                </td>
                                <td style={st(v.bo.tdm)}>
                                  {r.owed}
                                </td>
                                <td style={st(v.bo.td)}>
                                  <button className="wv-gi" onClick={r.edit} style={st(`${v.s.btnS}min-height:30px; font-size:12px;`)}>
                                    <Icon name={"square-pen"} style={st("width:13px;height:13px;")} />
                                    {tr("Edit")}
                                  </button>
                                </td>
                              </tr>
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : null}
              {" "}
              {v.bo.s.editor ? (
                <>
                  <div className="wv-screen" style={st(v.bo.page)}>
                    <div style={st(`display:grid; grid-template-columns:${v.ed.cols}; gap:22px; align-items:start;`)}>
                      <div style={st("display:flex; flex-direction:column; gap:16px; min-width:0;")}>
                        {v.ed.isNew ? (
                          <>
                            <h1 style={st(v.bo.h1)}>
                              {tr("New event")}
                            </h1>
                          </>
                        ) : null}
                        {" "}
                        <section aria-labelledby="eb-h" style={st(v.bo.sec)}>
                          <h2 id="eb-h" style={st(v.bo.secH)}>
                            {tr("Basics")}
                          </h2>
                          {" "}
                          <label style={st(v.bo.fl)}>
                            <span style={st(v.s.lbl)}>
                              {tr("Name")}
                            </span>
                            <input id="ed-name" className="wv-fld" value={v.ed.name.v ?? ""} onChange={v.ed.name.on} readOnly={v.ed.frozen} aria-invalid={v.ed.name.errOn} aria-describedby={v.ed.name.errOn ? "ed-name-e" : v.ed.slugHint ? "ed-slug" : undefined} style={st(`${v.ed.name.fld}font-size:16px; font-weight:800;`)} />
                            {v.ed.name.errOn ? (
                              <span id="ed-name-e" role="alert" style={st(v.s.err)}>
                                <Icon name={"circle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                                {v.ed.name.err}
                              </span>
                            ) : null}
                            {v.ed.slugHint ? (
                              <span id="ed-slug" style={st(`${v.s.hint}font-family:var(--mono); font-size:12px; unicode-bidi:plaintext;`)}>
                                {v.ed.slugHint}
                              </span>
                            ) : null}
                          </label>
                          {" "}
                          <label style={st(v.bo.fl)}>
                            <span style={st(v.s.lbl)}>
                              {tr("Supporting acts")}
                            </span>
                            <input className="wv-fld" value={v.ed.support.v ?? ""} onChange={v.ed.support.on} style={st(v.bo.fld)} />
                            <span style={st(v.s.hint)}>
                              {tr("Separate them with commas.")}
                            </span>
                          </label>
                          {" "}
                          <div style={st(v.bo.fl)}>
                            <span style={st(v.s.lbl)}>
                              {tr("Kind of night")}
                            </span>
                            <div role="radiogroup" aria-label={tr("Kind of night")} style={st("display:flex; flex-wrap:wrap; gap:6px;")}>
                              {(v.ed.kinds ?? []).map((o: any, i_o: number) => (
                                <Fragment key={o.id ?? i_o}>
                                  <button role="radio" aria-checked={o.on} onClick={o.go} style={st(o.style)}>
                                    {o.label}
                                  </button>
                                </Fragment>
                              ))}
                            </div>
                            <span style={st(v.s.hint)}>
                              {tr("Sets which filter it shows under on What's on.")}
                            </span>
                          </div>
                          {" "}
                          <label style={st(v.bo.fl)}>
                            <span style={st(v.s.lbl)}>
                              {tr("Description")}
                            </span>
                            <textarea className="wv-fld" rows={4} value={v.ed.about.v} onChange={v.ed.about.on} style={st(`${v.bo.fld}padding-block:10px; line-height:1.55; font-weight:500; resize:vertical;`)}></textarea>
                          </label>
                        </section>
                        {" "}
                        <section aria-labelledby="ew-h" style={st(v.bo.sec)}>
                          <h2 id="ew-h" style={st(v.bo.secH)}>
                            {tr("When")}
                          </h2>
                          {" "}
                          {v.ed.whenOn ? (
                          <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:12px;")}>
                            <label style={st(v.bo.fl)}>
                              <span style={st(v.s.lbl)}>
                                {tr("Date")}
                              </span>
                              <input className="wv-fld" type="date" value={v.ed.date.v ?? ""} onChange={v.ed.date.on} readOnly={v.ed.lockWhen} aria-describedby={v.ed.lockOn ? "ed-lock" : undefined} style={st(`${v.bo.fld}font-family:var(--mono); font-size:13px;`)} />
                            </label>
                            {" "}
                            <label style={st(v.bo.fl)}>
                              <span style={st(v.s.lbl)}>
                                {tr("Doors")}
                              </span>
                              <input id="ed-doors" className="wv-fld" type="time" value={v.ed.doors.v ?? ""} onChange={v.ed.doors.on} readOnly={v.ed.lockWhen} aria-invalid={v.ed.timeErr} aria-describedby={v.ed.timeErr ? "ed-terr" : undefined} style={st(v.ed.tFld)} />
                            </label>
                            {" "}
                            <label style={st(v.bo.fl)}>
                              <span style={st(v.s.lbl)}>
                                {tr("On stage")}
                              </span>
                              <input className="wv-fld" type="time" value={v.ed.stage.v ?? ""} onChange={v.ed.stage.on} readOnly={v.ed.lockWhen} aria-invalid={v.ed.timeErr} aria-describedby={v.ed.timeErr ? "ed-terr" : undefined} style={st(v.ed.tFld)} />
                            </label>
                            {" "}
                            <label style={st(v.bo.fl)}>
                              <span style={st(v.s.lbl)}>
                                {tr("Curfew")}
                              </span>
                              <input className="wv-fld" type="time" value={v.ed.curfew.v ?? ""} onChange={v.ed.curfew.on} readOnly={v.ed.lockWhen} style={st(`${v.bo.fld}font-family:var(--mono); font-size:13px;`)} />
                            </label>
                          </div>
                          ) : null}
                          {" "}
                          {v.ed.timeErr ? (
                            <>
                              <span id="ed-terr" role="alert" style={st(v.s.err)}>
                                <Icon name={"circle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                                {v.ed.timeErrTxt}
                              </span>
                            </>
                          ) : null}
                          {" "}
                          <span style={st(v.s.hint)}>
                            {v.ed.localTxt}{" "}{v.ed.whenOn ? v.ed.dateTxt : ""}
                          </span>
                          {" "}
                          {v.ed.lockOn ? (
                            <>
                              <div id="ed-lock" style={st("display:flex; align-items:center; gap:8px; flex-wrap:wrap; font-size:12.5px; font-weight:700; color:var(--fg-muted);")}>
                                <Icon name={"lock"} style={st("width:13px;height:13px;")} />
                                {v.ed.lockLine}
                                {v.ed.postponeOn ? (
                                  <button className="wv-gi" onClick={v.ed.postpone} style={st(`${v.s.btnT}min-height:28px;`)}>
                                    {tr("Change the date — Postpone")}
                                  </button>
                                ) : null}
                              </div>
                            </>
                          ) : null}
                          {" "}
                          {v.ed.daysOn ? (
                            <>
                              <div style={st("display:flex; flex-direction:column; gap:8px; padding-block-start:6px;")}>
                                <span id="ed-days" tabIndex={-1} style={st(v.s.lbl)}>
                                  {tr("Days")}
                                </span>
                                {" "}
                                {(v.ed.days ?? []).map((dy: any, i_dy: number) => (
                                  <Fragment key={dy.k ?? i_dy}>
                                    <div style={st("display:grid; grid-template-columns:60px repeat(3,minmax(0,1fr)); gap:8px; align-items:end;")}>
                                      <span style={st("font-size:13px; font-weight:800; padding-block-end:10px;")}>
                                        {dy.label}
                                      </span>
                                      <label style={st(v.bo.fl)}>
                                        <span style={st(v.s.hint)}>
                                          {tr("Date")}
                                        </span>
                                        <input className="wv-fld" type="date" value={dy.date.v ?? ""} onChange={dy.date.on} readOnly={v.ed.lockWhen} style={st(`${v.bo.fld}font-family:var(--mono); font-size:12.5px;`)} />
                                      </label>
                                      <label style={st(v.bo.fl)}>
                                        <span style={st(v.s.hint)}>
                                          {tr("Gates")}
                                        </span>
                                        <input className="wv-fld" type="time" value={dy.gates.v ?? ""} onChange={dy.gates.on} readOnly={v.ed.lockWhen} style={st(`${v.bo.fld}font-family:var(--mono); font-size:12.5px;`)} />
                                      </label>
                                      <label style={st(v.bo.fl)}>
                                        <span style={st(v.s.hint)}>
                                          {tr("Last entry")}
                                        </span>
                                        <input className="wv-fld" type="time" value={dy.last.v ?? ""} onChange={dy.last.on} readOnly={v.ed.lockWhen} style={st(`${v.bo.fld}font-family:var(--mono); font-size:12.5px;`)} />
                                      </label>
                                    </div>
                                    {dy.dateHint ? (
                                      <span style={st(`${v.s.hint}padding-inline-start:68px;`)}>
                                        {dy.dateHint}
                                      </span>
                                    ) : null}
                                  </Fragment>
                                ))}
                                {" "}
                              </div>
                            </>
                          ) : null}
                          {v.ed.addDayOn ? (
                            <button className="wv-gi" onClick={v.ed.addDay} style={st(`${v.s.btnS}align-self:flex-start;`)}>
                              <Icon name={"plus"} style={st("width:14px;height:14px;")} />
                              {tr("Add a day")}
                            </button>
                          ) : null}
                        </section>
                        {" "}
                        <section aria-labelledby="ewh-h" style={st(v.bo.sec)}>
                          <h2 id="ewh-h" style={st(v.bo.secH)}>
                            {tr("Where")}
                          </h2>
                          {" "}
                          <div role="radiogroup" aria-label={tr("Room")} style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:8px;")}>
                            {(v.ed.rooms ?? []).map((o: any, i_o: number) => (
                              <Fragment key={o.id ?? i_o}>
                                <button role="radio" aria-checked={o.on} aria-disabled={v.ed.lockWhen} onClick={o.go} style={st(o.style)}>
                                  <span style={st("font-size:14.5px; font-weight:800;")}>
                                    {o.id}{" · "}
                                    <span style={st("font-family:var(--mono);")}>
                                      {o.cap}
                                    </span>
                                  </span>
                                </button>
                              </Fragment>
                            ))}
                          </div>
                          {" "}
                          <span style={st(v.s.hint)}>
                            {tr("Capacities come from Settings.")}
                          </span>
                        </section>
                        {" "}
                        <section aria-labelledby="ep-h" style={st(v.bo.sec)}>
                          <h2 id="ep-h" style={st(v.bo.secH)}>
                            {tr("Poster")}
                          </h2>
                          {" "}
                          <div style={st("display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap;")}>
                            <span style={st(`position:relative; display:block; width:120px; aspect-ratio:4/5; border-radius:12px; overflow:hidden; container-type:inline-size; flex-shrink:0; ${v.ed.pBg}`)}>
                              <span style={st(v.ed.p.glyph)}>
                                {v.ed.p.letter}
                              </span>
                              {v.ed.genOn ? (
                                <>
                                  <span style={st(v.ed.p.title)}>
                                    {v.ed.name.v}
                                  </span>
                                </>
                              ) : null}
                            </span>
                            {" "}
                            <div style={st("flex:1; min-width:200px; display:flex; flex-direction:column; gap:8px; align-items:flex-start;")}>
                              <label className="wv-gi" style={st(`${v.s.btnS}cursor:pointer;`)}>
                                <Icon name={"upload"} style={st("width:14px;height:14px;")} />
                                {tr("Upload a poster")}
                                <input type="file" accept="image/*" onChange={v.ed.upload} style={st("position:absolute; width:1px; height:1px; opacity:0;")} />
                              </label>
                              {" "}
                              {v.ed.imgOn ? (
                                <>
                                  <button className="wv-gi" onClick={v.ed.useGen} style={st(v.s.btnT)}>
                                    {tr("Use the generated art instead")}
                                  </button>
                                </>
                              ) : null}
                              {" "}
                              {v.ed.genOn ? (
                                <>
                                  <button className="wv-gi" onClick={v.ed.shuffle} style={st(v.s.btnS)}>
                                    <Icon name={"shuffle"} style={st("width:14px;height:14px;")} />
                                    {tr("Shuffle the graphic (")}{v.ed.sysName}{")"}
                                  </button>
                                </>
                              ) : null}
                              {" "}
                              {v.ed.posterErrOn ? (
                                <span role="alert" style={st(v.s.err)}>
                                  <Icon name={"circle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                                  {v.ed.posterErr}
                                </span>
                              ) : null}
                              <span style={st(v.s.hint)}>
                                {tr("Portrait, 4:5, at least 1200 px wide — a picture of another shape is cropped to 4:5. Without one, we make one — the two colours come from the name and stay the same.")}
                              </span>
                            </div>
                          </div>
                        </section>
                        {" "}
                        <section aria-labelledby="el-h" style={st(v.bo.sec)}>
                          <h2 id="el-h" style={st(v.bo.secH)}>
                            {tr("Lineup")}
                          </h2>
                          {" "}
                          {(v.ed.acts ?? []).map((a: any, i_a: number) => (
                            <Fragment key={a.k ?? i_a}>
                              <div style={st("display:grid; grid-template-columns:minmax(0,1fr) 110px 110px 36px; gap:8px; align-items:center;")}>
                                <input className="wv-fld" aria-label={tr("Act name")} value={a.name.v ?? ""} onChange={a.name.on} style={st(v.bo.fld)} />
                                {" "}
                                <input className="wv-fld" type="time" aria-label={tr("Starts")} value={a.s.v ?? ""} onChange={a.s.on} style={st(`${v.bo.fld}font-family:var(--mono); font-size:13px;`)} />
                                {" "}
                                <input className="wv-fld" type="time" aria-label={tr("Ends")} value={a.e.v ?? ""} onChange={a.e.on} style={st(`${v.bo.fld}font-family:var(--mono); font-size:13px;`)} />
                                {" "}
                                <button className="wv-gi" onClick={a.del} aria-label={a.delLabel} style={st("width:36px; height:36px; border:0; border-radius:10px; background:transparent; color:var(--fg-subtle); display:flex; align-items:center; justify-content:center;")}>
                                  <Icon name={"trash-2"} style={st("width:15px;height:15px;")} />
                                </button>
                              </div>
                              {a.dayOn || a.roomOn ? (
                                <div style={st("display:flex; gap:14px; flex-wrap:wrap; align-items:center; margin-block-start:-2px;")}>
                                  {a.dayOn ? (
                                    <div role="radiogroup" aria-label={tr("Day")} style={st("display:flex; gap:6px;")}>
                                      {(a.days ?? []).map((o: any, i_o: number) => (
                                        <button key={o.id ?? i_o} role="radio" aria-checked={o.on} onClick={o.go} style={st(o.style)}>
                                          {o.id}
                                        </button>
                                      ))}
                                    </div>
                                  ) : null}
                                  {a.roomOn ? (
                                    <div role="radiogroup" aria-label={tr("Room")} style={st("display:flex; gap:6px;")}>
                                      {(a.rooms ?? []).map((o: any, i_o: number) => (
                                        <button key={o.id ?? i_o} role="radio" aria-checked={o.on} onClick={o.go} style={st(o.style)}>
                                          {o.id}
                                        </button>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </Fragment>
                          ))}
                          {" "}
                          <div style={st("display:flex; gap:10px; align-items:center; flex-wrap:wrap;")}>
                            <button className="wv-gi" onClick={v.ed.addAct} style={st(v.s.btnS)}>
                              <Icon name={"plus"} style={st("width:14px;height:14px;")} />
                              {tr("Add an act")}
                            </button>
                            {" "}
                            <span style={st("flex:1;")}></span>
                            {" "}
                            <button role="switch" aria-checked={v.ed.setsOut} onClick={v.ed.toggleSets} className="wv-gi" style={st("display:flex; align-items:center; gap:10px; min-height:36px; padding:0 10px; border-radius:10px; border:0; background:transparent; font-size:13.5px; font-weight:700;")}>
                              <span style={st(v.ed.swTrack)}>
                                <span style={st(v.ed.swKnob)}></span>
                              </span>
                              {tr("Publish set times")}
                            </button>
                          </div>
                          {" "}
                          <span style={st(v.s.hint)}>
                            {tr("Off until the day. Until then the page says \"Set times go up on the day\".")}
                          </span>
                        </section>
                        {" "}
                        <section aria-labelledby="et-h" style={st(v.bo.sec)}>
                          <h2 id="et-h" style={st(v.bo.secH)}>
                            {tr("Ticket types")}
                          </h2>
                          {" "}
                          <div style={st("display:flex; flex-direction:column; gap:6px; padding:12px 14px; border-radius:12px; background:var(--surface-2);")}>
                            <div style={st("display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;")}>
                              <span style={st("font-size:13.5px; font-weight:800;")}>
                                {v.ed.gaugeTxt}
                              </span>
                              <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:700; color:var(--fg-muted);")}>
                                {v.ed.gaugeNum}
                              </span>
                            </div>
                            {" "}
                            <span style={st(`${v.bo.track}height:8px;`)}>
                              <span style={st(v.ed.gaugeBar)}></span>
                            </span>
                            {" "}
                            {v.ed.overOn ? (
                              <>
                                <span role="alert" style={st("display:flex; gap:6px; font-size:12.5px; font-weight:800; color:var(--warn);")}>
                                  <Icon name={"triangle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                                  {v.ed.overTxt}
                                </span>
                              </>
                            ) : null}
                            {" "}
                            <label style={st(`${v.bo.fl}max-width:180px; margin-block-start:4px;`)}>
                              <span style={st(v.s.lbl)}>
                                {tr("Guest-list places")}
                              </span>
                              <input id="ed-gl" className="wv-fld" inputMode="numeric" value={v.ed.gl.v ?? ""} onChange={v.ed.gl.on} aria-invalid={v.ed.gl.errOn} aria-describedby={v.ed.gl.errOn ? "ed-gl-e" : undefined} style={st(`${v.ed.gl.fld}font-family:var(--mono);`)} />
                              {v.ed.gl.errOn ? (
                                <span id="ed-gl-e" role="alert" style={st(v.s.err)}>
                                  <Icon name={"circle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                                  {v.ed.gl.err}
                                </span>
                              ) : null}
                            </label>
                          </div>
                          {" "}
                          {(v.ed.types ?? []).map((t: any, i_t: number) => (
                            <Fragment key={t.k ?? i_t}>
                              <div style={st("display:flex; flex-direction:column; gap:12px; padding:14px; border-radius:14px; border:1px solid var(--border-strong);")}>
                                <div style={st("display:flex; align-items:center; gap:6px;")}>
                                  <span style={st("font-family:var(--mono); font-size:12px; font-weight:700; color:var(--fg-subtle);")}>
                                    {t.n}
                                  </span>
                                  <span style={st("flex:1; font-size:15px; font-weight:800;")}>
                                    {t.name.v}
                                  </span>
                                  {" "}
                                  <button className="wv-gi" onClick={t.up} disabled={t.upOff} aria-label={t.upLabel} style={st("width:32px; height:32px; border:1px solid var(--border); border-radius:9px; background:transparent; display:flex; align-items:center; justify-content:center;")}>
                                    <Icon name={"arrow-up"} style={st("width:14px;height:14px;")} />
                                  </button>
                                  {" "}
                                  <button className="wv-gi" onClick={t.down} disabled={t.downOff} aria-label={t.downLabel} style={st("width:32px; height:32px; border:1px solid var(--border); border-radius:9px; background:transparent; display:flex; align-items:center; justify-content:center;")}>
                                    <Icon name={"arrow-down"} style={st("width:14px;height:14px;")} />
                                  </button>
                                  {" "}
                                  {t.delOn ? (
                                    <>
                                      <button className="wv-gi" onClick={t.del} aria-label={t.delLabel} style={st("width:32px; height:32px; border:1px solid var(--border); border-radius:9px; background:transparent; color:var(--fg-subtle); display:flex; align-items:center; justify-content:center;")}>
                                        <Icon name={"trash-2"} style={st("width:14px;height:14px;")} />
                                      </button>
                                    </>
                                  ) : null}
                                  {t.stopOn ? (
                                    <>
                                      <button className="wv-gi" onClick={t.toggleStop} aria-pressed={t.stoppedOn} style={st(`${v.s.btnS}min-height:32px; font-size:12px;`)}>
                                        <Icon name={"circle-pause"} style={st("width:13px;height:13px;")} />
                                        {t.stopLabel}
                                      </button>
                                    </>
                                  ) : null}
                                </div>
                                {" "}
                                <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:10px;")}>
                                  <label style={st(v.bo.fl)}>
                                    <span style={st(v.s.lbl)}>
                                      {tr("Name")}
                                    </span>
                                    <input id={`${t.k}-name`} className="wv-fld" value={t.name.v ?? ""} onChange={t.name.on} aria-invalid={t.nameErrOn} style={st(v.bo.fld)} />
                                    {t.nameErrOn ? (
                                      <span id={`${t.k}-name-e`} role="alert" style={st(v.s.err)}>
                                        <Icon name={"circle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                                        {t.nameErr}
                                      </span>
                                    ) : null}
                                  </label>
                                  {" "}
                                  <label style={st(v.bo.fl)}>
                                    <span style={st(v.s.lbl)}>
                                      {tr("Description")}
                                    </span>
                                    <input className="wv-fld" value={t.desc.v ?? ""} onChange={t.desc.on} style={st(v.bo.fld)} />
                                  </label>
                                </div>
                                {" "}
                                <div style={st("display:flex; gap:14px; flex-wrap:wrap; align-items:flex-end;")}>
                                  <div style={st(v.bo.fl)}>
                                    <span style={st(v.s.lbl)}>
                                      {tr("Costs")}
                                    </span>
                                    <div style={st("display:flex; gap:8px; align-items:center;")}>
                                      <div role="radiogroup" aria-label={tr("Costs")} style={st(v.bo.segW)}>
                                        {(t.costs ?? []).map((o: any, i_o: number) => (
                                          <Fragment key={o.id ?? i_o}>
                                            <button role="radio" aria-checked={o.on} onClick={o.go} style={st(o.style)}>
                                              {o.id}
                                            </button>
                                          </Fragment>
                                        ))}
                                      </div>
                                      {t.paid ? (
                                        <>
                                          <span style={st("display:flex; align-items:center; gap:4px; font-family:var(--mono); font-size:14px; font-weight:700;")}>
                                            {"$"}
                                            <input id={`${t.k}-price`} className="wv-fld" inputMode="decimal" aria-label={tr("Price")} aria-invalid={t.priceErrOn} aria-describedby={t.priceHintOn ? `${t.k}-ph` : t.priceErrOn ? `${t.k}-price-e` : undefined} value={t.price.v ?? ""} onChange={t.price.on} style={st(`${v.bo.fld}width:90px; font-family:var(--mono);`)} />
                                          </span>
                                        </>
                                      ) : null}
                                    </div>
                                    {t.priceHintOn ? (
                                      <>
                                        <span id={`${t.k}-ph`} style={st(`${v.s.hint}color:var(--info); font-weight:700;`)}>
                                          {t.priceHint}
                                        </span>
                                      </>
                                    ) : null}
                                    {t.priceErrOn ? (
                                      <span id={`${t.k}-price-e`} role="alert" style={st(v.s.err)}>
                                        <Icon name={"circle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                                        {t.priceErr}
                                      </span>
                                    ) : null}
                                  </div>
                                  {" "}
                                  {t.paid ? (
                                    <>
                                      <div style={st(v.bo.fl)}>
                                        <span style={st(v.s.lbl)}>
                                          {tr("How people pay")}
                                        </span>
                                        <div role="radiogroup" aria-label={tr("How people pay")} style={st(v.bo.segW)}>
                                          {(t.pays ?? []).map((o: any, i_o: number) => (
                                            <Fragment key={o.id ?? i_o}>
                                              <button role="radio" aria-checked={o.on} onClick={o.go} style={st(o.style)}>
                                                {o.id}
                                              </button>
                                            </Fragment>
                                          ))}
                                        </div>
                                      </div>
                                    </>
                                  ) : null}
                                  {" "}
                                  <label style={st(v.bo.fl)}>
                                    <span style={st("display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;")}>
                                      <span style={st(v.s.lbl)}>
                                        {tr("How many")}
                                      </span>
                                      {t.soldOn ? (
                                        <>
                                          <span style={st("font-family:var(--mono); font-size:11.5px; font-weight:700; color:var(--fg-muted);")}>
                                            {t.soldTxt}
                                          </span>
                                        </>
                                      ) : null}
                                    </span>
                                    <input id={t.capId} className="wv-fld" inputMode="numeric" value={t.cap.v ?? ""} onChange={t.cap.on} aria-invalid={t.capErrOn} aria-describedby={t.capErrOn ? `${t.capId}-e` : undefined} style={st(`${t.capFld}width:110px;`)} />
                                    {t.capErrOn ? (
                                      <>
                                        <span id={`${t.capId}-e`} role="alert" style={st(v.s.err)}>
                                          <Icon name={"circle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                                          {t.capErr}
                                        </span>
                                      </>
                                    ) : null}
                                  </label>
                                  {" "}
                                  {t.daysOn ? (
                                    <>
                                      <div style={st(v.bo.fl)}>
                                        <span style={st(v.s.lbl)}>
                                          {tr("Days it admits")}
                                        </span>
                                        <div style={st("display:flex; gap:6px;")}>
                                          {(t.dayTicks ?? []).map((dt: any, i_dt: number) => (
                                            <Fragment key={dt.id ?? i_dt}>
                                              <button className="wv-gi" onClick={dt.go} aria-pressed={dt.on} style={st(dt.style)}>
                                                {dt.label}
                                              </button>
                                            </Fragment>
                                          ))}
                                        </div>
                                      </div>
                                    </>
                                  ) : null}
                                </div>
                                {" "}
                                <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:10px;")}>
                                  <label style={st(v.bo.fl)}>
                                    <span style={st(v.s.lbl)}>
                                      {tr("Sales start")}
                                    </span>
                                    <input className="wv-fld" type="datetime-local" value={t.start.v ?? ""} onChange={t.start.on} style={st(`${v.bo.fld}font-family:var(--mono); font-size:12.5px;`)} />
                                    {t.startHint ? (
                                      <span style={st(v.s.hint)}>
                                        {t.startHint}
                                      </span>
                                    ) : null}
                                  </label>
                                  {" "}
                                  <label style={st(v.bo.fl)}>
                                    <span style={st(v.s.lbl)}>
                                      {tr("Sales end")}
                                    </span>
                                    <input id={`${t.k}-end`} className="wv-fld" type="datetime-local" value={t.end.v ?? ""} onChange={t.end.on} aria-invalid={t.endErrOn} style={st(`${v.bo.fld}font-family:var(--mono); font-size:12.5px;`)} />
                                    {t.endHint ? (
                                      <span style={st(v.s.hint)}>
                                        {t.endHint}
                                      </span>
                                    ) : null}
                                    {t.endErrOn ? (
                                      <span id={`${t.k}-end-e`} role="alert" style={st(v.s.err)}>
                                        <Icon name={"circle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                                        {t.endErr}
                                      </span>
                                    ) : null}
                                  </label>
                                  {" "}
                                  <label style={st(v.bo.fl)}>
                                    <span style={st(v.s.lbl)}>
                                      {tr("Per order: min")}
                                    </span>
                                    <input id={`${t.k}-min`} className="wv-fld" inputMode="numeric" value={t.min.v ?? ""} onChange={t.min.on} aria-invalid={t.minErrOn} style={st(`${v.bo.fld}font-family:var(--mono);`)} />
                                    {t.minErrOn ? (
                                      <span id={`${t.k}-min-e`} role="alert" style={st(v.s.err)}>
                                        <Icon name={"circle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                                        {t.minErr}
                                      </span>
                                    ) : null}
                                  </label>
                                  {" "}
                                  <label style={st(v.bo.fl)}>
                                    <span style={st(v.s.lbl)}>
                                      {tr("Per order: max")}
                                    </span>
                                    <input className="wv-fld" inputMode="numeric" value={t.max.v ?? ""} onChange={t.max.on} style={st(`${v.bo.fld}font-family:var(--mono);`)} />
                                  </label>
                                </div>
                                {" "}
                                <div style={st(v.bo.fl)}>
                                  <span style={st(v.s.lbl)}>
                                    {tr("Who can see it")}
                                  </span>
                                  <div role="radiogroup" aria-label={tr("Who can see it")} style={st(v.bo.segW)}>
                                    {(t.vis ?? []).map((o: any, i_o: number) => (
                                      <Fragment key={o.id ?? i_o}>
                                        <button role="radio" aria-checked={o.on} onClick={o.go} style={st(o.style)}>
                                          {o.id}
                                        </button>
                                      </Fragment>
                                    ))}
                                  </div>
                                  <span style={st(v.s.hint)}>
                                    {t.visHint}
                                  </span>
                                </div>
                              </div>
                            </Fragment>
                          ))}
                          {" "}
                          <button className="wv-gi" onClick={v.ed.addType} style={st(`${v.s.btnS}align-self:flex-start;`)}>
                            <Icon name={"plus"} style={st("width:14px;height:14px;")} />
                            {tr("Add a ticket type")}
                          </button>
                        </section>
                        {" "}
                        {v.ed.qFeat ? (
                          <>
                            <section aria-labelledby="eq-h" style={st(v.bo.sec)}>
                              <h2 id="eq-h" style={st(v.bo.secH)}>
                                {tr("Checkout questions")}
                              </h2>
                              {" "}
                              {v.ed.qEmpty ? (
                                <>
                                  <p style={st(`${v.s.p}font-size:14px;`)}>
                                    {tr("No questions. People only give their name and email.")}
                                  </p>
                                </>
                              ) : null}
                              {" "}
                              {(v.ed.qs ?? []).map((x: any, i_x: number) => (
                                <Fragment key={x.k ?? i_x}>
                                  <div style={st("display:flex; flex-direction:column; gap:8px; padding:12px; border-radius:12px; border:1px solid var(--border);")}>
                                    <div style={st("display:flex; gap:8px;")}>
                                      <input className="wv-fld" aria-label={tr("Question")} value={x.q.v ?? ""} onChange={x.q.on} style={st(v.bo.fld)} />
                                      <button className="wv-gi" onClick={x.del} aria-label={tr("Remove this question")} style={st("width:40px; height:40px; flex-shrink:0; border:0; border-radius:10px; background:transparent; color:var(--fg-subtle); display:flex; align-items:center; justify-content:center;")}>
                                        <Icon name={"trash-2"} style={st("width:15px;height:15px;")} />
                                      </button>
                                    </div>
                                    {" "}
                                    <div style={st("display:flex; gap:10px; flex-wrap:wrap; align-items:center;")}>
                                      <div role="radiogroup" aria-label={tr("Kind of answer")} style={st(v.bo.segW)}>
                                        {(x.kinds ?? []).map((o: any, i_o: number) => (
                                          <Fragment key={o.id ?? i_o}>
                                            <button role="radio" aria-checked={o.on} onClick={o.go} style={st(o.style)}>
                                              {o.id}
                                            </button>
                                          </Fragment>
                                        ))}
                                      </div>
                                      {" "}
                                      <div role="radiogroup" aria-label={tr("Asked")} style={st(v.bo.segW)}>
                                        {(x.scopes ?? []).map((o: any, i_o: number) => (
                                          <Fragment key={o.id ?? i_o}>
                                            <button role="radio" aria-checked={o.on} onClick={o.go} style={st(o.style)}>
                                              {o.id}
                                            </button>
                                          </Fragment>
                                        ))}
                                      </div>
                                      {" "}
                                      {x.choiceOn ? (
                                        <>
                                          <div style={st("flex-basis:100%; display:flex; flex-direction:column; gap:6px; padding:10px; border-radius:10px; background:var(--surface-2);")}>
                                            <span style={st(v.s.lbl)}>
                                              {tr("Choices")}
                                            </span>
                                            {(x.choices ?? []).map((c: any, i_c: number) => (
                                              <Fragment key={c.k ?? i_c}>
                                                <div style={st("display:flex; gap:6px;")}>
                                                  <input className="wv-fld" aria-label={c.label} value={c.v ?? ""} onChange={c.on} style={st(v.bo.fld)} />
                                                  <button className="wv-gi" onClick={c.del} aria-label={c.delLabel} style={st("width:40px; height:40px; flex-shrink:0; border:0; border-radius:10px; background:transparent; color:var(--fg-subtle); display:flex; align-items:center; justify-content:center;")}>
                                                    <Icon name={"x"} style={st("width:14px;height:14px;")} />
                                                  </button>
                                                </div>
                                              </Fragment>
                                            ))}
                                            <button className="wv-gi" onClick={x.addChoice} style={st(`${v.s.btnT}align-self:flex-start; min-height:30px;`)}>
                                              <Icon name={"plus"} style={st("width:13px;height:13px;")} />
                                              {tr("Add a choice")}
                                            </button>
                                          </div>
                                        </>
                                      ) : null}
                                      {" "}
                                      <button role="switch" aria-checked={x.req} onClick={x.toggleReq} className="wv-gi" style={st("display:flex; align-items:center; gap:8px; min-height:34px; padding:0 8px; border:0; border-radius:9px; background:transparent; font-size:13px; font-weight:700;")}>
                                        <span style={st(x.swTrack)}>
                                          <span style={st(x.swKnob)}></span>
                                        </span>
                                        {tr("Required")}
                                      </button>
                                    </div>
                                  </div>
                                </Fragment>
                              ))}
                              {" "}
                              <button className="wv-gi" onClick={v.ed.addQ} style={st(`${v.s.btnS}align-self:flex-start;`)}>
                                <Icon name={"plus"} style={st("width:14px;height:14px;")} />
                                {tr("Add a question")}
                              </button>
                            </section>
                          </>
                        ) : null}
                        {" "}
                        <section aria-labelledby="epo-h" style={st(v.bo.sec)}>
                          <h2 id="epo-h" style={st(v.bo.secH)}>
                            {tr("Policies")}
                          </h2>
                          {" "}
                          <div style={st(v.bo.fl)}>
                            <span style={st(v.s.lbl)}>
                              {tr("Age")}
                            </span>
                            <div role="radiogroup" aria-label={tr("Age")} style={st(v.bo.segW)}>
                              {(v.ed.ages ?? []).map((o: any, i_o: number) => (
                                <Fragment key={o.id ?? i_o}>
                                  <button role="radio" aria-checked={o.on} onClick={o.go} style={st(o.style)}>
                                    {o.id}
                                  </button>
                                </Fragment>
                              ))}
                            </div>
                          </div>
                          {" "}
                          <div style={st(v.bo.fl)}>
                            <span style={st(v.s.lbl)}>
                              {tr("Refunds")}
                            </span>
                            <div role="radiogroup" aria-label={tr("Refunds")} style={st(v.bo.segW)}>
                              {(v.ed.refunds ?? []).map((o: any, i_o: number) => (
                                <Fragment key={o.id ?? i_o}>
                                  <button role="radio" aria-checked={o.on} onClick={o.go} style={st(o.style)}>
                                    {o.id}
                                  </button>
                                </Fragment>
                              ))}
                            </div>
                            {" "}
                            {v.ed.refundCustom ? (
                              <>
                                <input className="wv-fld" aria-label={tr("Your refund policy")} value={v.ed.refundTxt.v ?? ""} onChange={v.ed.refundTxt.on} placeholder={tr("One plain sentence")} style={st(v.bo.fld)} />
                              </>
                            ) : null}
                            {" "}
                            <span style={st(v.s.hint)}>
                              {tr("On the page: \"")}{v.ed.refundLine}{"\""}
                            </span>
                          </div>
                          {" "}
                          <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px;")}>
                            <label style={st(v.bo.fl)}>
                              <span style={st(v.s.lbl)}>
                                {tr("Re-entry")}
                              </span>
                              <input className="wv-fld" value={v.ed.reentry.v ?? ""} onChange={v.ed.reentry.on} style={st(v.bo.fld)} />
                            </label>
                            {" "}
                            <label style={st(v.bo.fl)}>
                              <span style={st(v.s.lbl)}>
                                {tr("Bags")}
                              </span>
                              <input className="wv-fld" value={v.ed.bags.v ?? ""} onChange={v.ed.bags.on} style={st(v.bo.fld)} />
                            </label>
                          </div>
                        </section>
                        {" "}
                        <section aria-labelledby="epu-h" style={st(v.bo.sec)}>
                          <h2 id="epu-h" style={st(v.bo.secH)}>
                            {tr("Publishing")}
                          </h2>
                          {" "}
                          <div role="radiogroup" aria-label={tr("Publishing")} style={st(v.bo.segW)}>
                            {(v.ed.pubs ?? []).map((o: any, i_o: number) => (
                              <Fragment key={o.id ?? i_o}>
                                <button role="radio" aria-checked={o.on} onClick={o.go} style={st(o.style)}>
                                  {o.id}
                                </button>
                              </Fragment>
                            ))}
                          </div>
                          {" "}
                          {v.ed.schedOn ? (
                            <>
                              <label style={st(`${v.bo.fl}max-width:260px;`)}>
                                <span style={st(v.s.lbl)}>
                                  {tr("Tickets go on sale")}
                                </span>
                                <input className="wv-fld" type="datetime-local" value={v.ed.pubAt.v ?? ""} onChange={v.ed.pubAt.on} style={st(`${v.bo.fld}font-family:var(--mono); font-size:12.5px;`)} />
                                {v.ed.pubAtHint ? (
                                  <span style={st(v.s.hint)}>
                                    {v.ed.pubAtHint}
                                  </span>
                                ) : null}
                              </label>
                            </>
                          ) : null}
                          {v.ed.wlOn ? (
                            <button role="switch" aria-checked={v.ed.waitlist} onClick={v.ed.toggleWl} className="wv-gi" style={st("display:flex; align-items:center; gap:10px; min-height:36px; padding:0 10px; border-radius:10px; border:0; background:transparent; font-size:13.5px; font-weight:700; align-self:flex-start;")}>
                              <span style={st(v.ed.wlTrack)}>
                                <span style={st(v.ed.wlKnob)}></span>
                              </span>
                              {tr("Waitlist when sold out")}
                            </button>
                          ) : null}
                          {" "}
                          <span style={st(v.s.hint)}>
                            {v.ed.pubHint}
                          </span>
                          {" "}
                          <button className="wv-gi" onClick={v.eh.preview} style={st(`${v.s.btnS}align-self:flex-start;`)}>
                            <Icon name={"eye"} style={st("width:14px;height:14px;")} />
                            {tr("Preview as the audience")}
                          </button>
                        </section>
                      </div>
                      {" "}
                      <aside aria-label={tr("Live preview")} style={st(v.ed.pvWrap)}>
                        <div style={st("display:flex; align-items:center; gap:8px;")}>
                          <span style={st(`${v.s.eyebrow}flex:1;`)}>
                            {tr("Live preview")}
                          </span>
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
                        <div style={st("width:100%;")}>
                          {v.ed.pvNode}
                        </div>
                        {" "}
                        <span style={st(v.s.hint)}>
                          {tr("The public page for this draft, as the audience will see it. Nothing is saved until you press Save.")}
                        </span>
                        {" "}
                        <button className="wv-gi" onClick={v.ed.openFull} style={st(`${v.s.btnS}align-self:flex-start;`)}>
                          <Icon name={"maximize-2"} style={st("width:14px;height:14px;")} />
                          {tr("Open full size")}
                        </button>
                      </aside>
                    </div>
                    {" "}
                    {v.ed.dirty ? (
                      <>
                        <div role="region" aria-label={tr("Unsaved changes")} className="wv-slide" style={st("position:sticky; inset-block-end:12px; z-index:10; display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding:10px 12px 10px 16px; border-radius:14px; background:var(--fg); color:var(--bg); box-shadow:0 20px 40px -18px rgba(0,0,0,.5);")}>
                          <Icon name={"circle-dot"} style={st("width:15px;height:15px;")} />
                          <span style={st("flex:1; min-width:140px; font-size:13.5px; font-weight:800;")}>
                            {tr("Unsaved changes")}
                          </span>
                          {" "}
                          <button className="wv-gi" onClick={v.ed.discard} style={st("min-height:36px; padding:0 14px; border-radius:10px; border:1px solid rgba(128,128,140,.5); background:transparent; color:var(--bg); font-size:13px; font-weight:700;")}>
                            {tr("Discard")}
                          </button>
                          {" "}
                          <button className="wv-btn" onClick={v.ed.save} aria-disabled={v.ed.saveOff} style={st(`${v.s.btnP}min-height:36px; font-size:13px;${v.ed.saveOff ? " background:var(--surface-3); color:var(--fg-muted);" : ""}`)}>
                            {v.ed.saveLabel}
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                </>
              ) : null}
              {" "}
              {v.bo.s.sales ? (
                <>
                  <div className="wv-screen" style={st(v.bo.page)}>
                    <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px;")}>
                      {(v.sa.kpis ?? []).map((k: any, i_k: number) => (
                        <Fragment key={k.k ?? i_k}>
                          <div style={st(`${v.bo.kpi}background:var(--surface);`)}>
                            <span style={st(`${v.s.eyebrow}font-size:10.5px;`)}>
                              {k.k}
                            </span>
                            <span style={st(`${v.bo.kpiV}font-size:22px;${k.style}`)}>
                              {k.v}
                            </span>
                            <span style={st(v.bo.kpiS)}>
                              {k.sub}
                            </span>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                    {" "}
                    {v.sa.cancelled ? (
                      <>
                        <button className="wv-gi" onClick={v.sa.toRefunds} style={st(`${v.s.btnS}align-self:flex-start;`)}>
                          <Icon name={"undo-2"} style={st("width:14px;height:14px;")} />
                          {tr("Open the refunds list")}
                        </button>
                      </>
                    ) : null}
                    {v.sa.paceOn ? (
                    <section aria-labelledby="sp-h" style={st(v.bo.sec)}>
                      <div style={st("display:flex; align-items:baseline; gap:12px; flex-wrap:wrap;")}>
                        <h2 id="sp-h" style={st(`${v.bo.secH}flex:1;`)}>
                          {tr("Sales pace")}
                        </h2>
                        <span style={st("display:flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:var(--fg-muted);")}>
                          <span style={st("width:18px; height:3px; border-radius:2px; background:var(--accent);")}></span>
                          {tr("This show")}
                        </span>
                        {v.sa.peersOn ? (
                          <span style={st("display:flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:var(--fg-muted);")}>
                            <span style={st("width:18px; border-block-start:2px dashed var(--fg-subtle);")}></span>
                            {v.sa.usual}
                          </span>
                        ) : null}
                      </div>
                      {" "}
                      <div style={st("display:grid; grid-template-columns:44px minmax(0,1fr); gap:8px;")}>
                        <div style={st("display:flex; flex-direction:column; justify-content:space-between; font-family:var(--mono); font-size:11px; font-weight:600; color:var(--fg-subtle); text-align:end; height:200px;")}>
                          <span>
                            {v.sa.yMax}
                          </span>
                          <span>
                            {v.sa.yMid}
                          </span>
                          <span>
                            {"0"}
                          </span>
                        </div>
                        {" "}
                        <div style={st("display:flex; flex-direction:column; gap:6px;")}>
                          <img src={v.sa.chart} alt={v.sa.chartAlt} style={st("display:block; width:100%; height:200px; border-radius:10px; background:var(--surface-2);")} />
                          <div style={st("display:flex; justify-content:space-between; font-family:var(--mono); font-size:11px; font-weight:600; color:var(--fg-subtle);")}>
                            <span>
                              {v.sa.x0}
                            </span>
                            <span>
                              {v.sa.x1}
                            </span>
                            <span>
                              {v.sa.x2}
                            </span>
                          </div>
                        </div>
                      </div>
                      {" "}
                      <span style={st(v.s.hint)}>
                        {v.sa.paceTxt}
                      </span>
                    </section>
                    ) : null}
                    {" "}
                    <section aria-labelledby="st-h" style={st(v.bo.sec)}>
                      <h2 id="st-h" style={st(v.bo.secH)}>
                        {tr("By ticket type")}
                      </h2>
                      {" "}
                      <div style={st("display:flex; flex-wrap:wrap; gap:14px; font-size:12px; font-weight:700; color:var(--fg-muted);")}>
                        {(v.sa.legend ?? []).map((l: any, i_l: number) => (
                          <Fragment key={l.k ?? i_l}>
                            <span style={st("display:flex; align-items:center; gap:6px;")}>
                              <span style={st(l.sw)}></span>
                              {l.k}
                            </span>
                          </Fragment>
                        ))}
                      </div>
                      {" "}
                      {(v.sa.types ?? []).map((t: any, i_t: number) => (
                        <Fragment key={t.id ?? i_t}>
                          <div style={st("display:flex; flex-direction:column; gap:6px; padding-block:10px; border-block-start:1px solid var(--border);")}>
                            <div style={st("display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;")}>
                              <span style={st("font-size:14.5px; font-weight:800;")}>
                                {t.name}{" "}
                                <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:600; color:var(--fg-subtle);")}>
                                  {t.price}
                                </span>
                              </span>
                              <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:600; color:var(--fg-muted);")}>
                                {t.txt}
                              </span>
                            </div>
                            {" "}
                            <div role="img" aria-label={t.txt} style={st("display:flex; height:14px; border-radius:7px; overflow:hidden; background:var(--surface-3);")}>
                              {(t.segs ?? []).map((g: any, i_g: number) => (
                                <Fragment key={g.k ?? i_g}>
                                  <span style={st(g.style)}></span>
                                </Fragment>
                              ))}
                            </div>
                          </div>
                        </Fragment>
                      ))}
                    </section>
                    {" "}
                    <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr)); gap:16px;")}>
                      {v.sa.codesFeat ? (
                        <>
                          <section aria-labelledby="sc-h" style={st(v.bo.sec)}>
                            <h2 id="sc-h" style={st(v.bo.secH)}>
                              {tr("Codes used on this show")}
                            </h2>
                            {v.sa.codesEmpty ? (
                              <>
                                <p style={st(`${v.s.p}font-size:13.5px;`)}>
                                  {tr("No codes on this show.")}
                                </p>
                              </>
                            ) : null}
                            {(v.sa.codes ?? []).map((c: any, i_c: number) => (
                              <Fragment key={c.code ?? i_c}>
                                <div style={st("display:flex; justify-content:space-between; gap:10px; padding-block:8px; border-block-start:1px solid var(--border);")}>
                                  <span style={st("font-family:var(--mono); font-size:13px; font-weight:700;")}>
                                    {c.code}
                                  </span>
                                  <span style={st("font-size:13px; font-weight:600; color:var(--fg-muted);")}>
                                    {c.txt}
                                  </span>
                                </div>
                              </Fragment>
                            ))}
                          </section>
                        </>
                      ) : null}
                      {" "}
                      {v.sa.waitFeat ? (
                        <>
                          <section aria-labelledby="sw-h" style={st(v.bo.sec)}>
                            <h2 id="sw-h" style={st(v.bo.secH)}>
                              {tr("Waitlist")}
                            </h2>
                            <p style={st(`${v.s.p}font-size:13.5px;`)}>
                              {v.sa.waitTxt}
                            </p>
                            {v.sa.waitOn ? (
                              <>
                                <button className="wv-gi" onClick={v.sa.toWait} style={st(`${v.s.btnS}align-self:flex-start;`)}>
                                  {tr("Open the waitlist")}
                                </button>
                              </>
                            ) : null}
                          </section>
                        </>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : null}
              {" "}
              {v.bo.s.orders ? (
                <>
                  <div className="wv-screen" style={st(v.bo.page)}>
                    {v.or.global ? (
                      <>
                        <h1 style={st(v.bo.h1)}>
                          {tr("Orders")}
                        </h1>
                      </>
                    ) : null}
                    {" "}
                    <div style={st("display:flex; gap:10px; flex-wrap:wrap; align-items:center;")}>
                      <div style={st("position:relative; flex:1; min-width:220px; max-width:380px;")}>
                        <Icon name={"search"} style={st("position:absolute; inset-inline-start:12px; inset-block-start:12px; width:15px; height:15px; color:var(--fg-subtle);")} />
                        <input className="wv-fld" type="search" aria-label={tr("Filter orders")} value={v.or.q ?? ""} onChange={v.or.onQ} placeholder={tr("Number, name, email or ticket code")} style={st(`${v.bo.fld}padding-inline-start:36px;`)} />
                      </div>
                      {" "}
                      {v.or.global ? (
                        <>
                          <select className="wv-fld" aria-label={tr("Event")} value={v.or.ev} onChange={v.or.onEv} style={st(`${v.bo.fld}width:auto; min-width:180px;`)}>
                            {(v.or.evOpts ?? []).map((o: any, i_o: number) => (
                              <Fragment key={o.id ?? i_o}>
                                <option value={o.id}>
                                  {o.label}
                                </option>
                              </Fragment>
                            ))}
                          </select>
                        </>
                      ) : null}
                      {" "}
                      <span style={st("flex:1;")}></span>
                      {" "}
                      <button className="wv-gi" onClick={v.or.csv} style={st(v.s.btnS)}>
                        <Icon name={"download"} style={st("width:14px;height:14px;")} />
                        {tr("Export")}
                      </button>
                      <button className="wv-btn" onClick={v.or.newOrder} style={st(`${v.s.btnP}min-height:36px; font-size:13px;`)}>
                        <Icon name={"plus"} style={st("width:14px;height:14px;")} />
                        {tr("New order")}
                      </button>
                    </div>
                    {" "}
                    <div role="group" aria-label={tr("Status")} className="wv-hide" style={st("display:flex; gap:6px; overflow-x:auto;")}>
                      {(v.or.sts ?? []).map((f: any, i_f: number) => (
                        <Fragment key={f.id ?? i_f}>
                          <button className="wv-gi" onClick={f.go} aria-pressed={f.on} style={st(f.style)}>
                            {f.label}{" "}
                            <span style={st("font-family:var(--mono); font-size:11.5px; opacity:.75;")}>
                              {f.n}
                            </span>
                          </button>
                        </Fragment>
                      ))}
                    </div>
                    {" "}
                    <div style={st(`${v.bo.card}overflow-x:auto;`)}>
                      <table style={st(v.bo.table)}>
                        <thead>
                          <tr>
                            <th style={st(v.bo.th)}>
                              {tr("Order")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("Buyer")}
                            </th>
                            {v.or.global ? (
                              <>
                                <th style={st(v.bo.th)}>
                                  {tr("Show")}
                                </th>
                              </>
                            ) : null}
                            <th style={st(v.bo.th)}>
                              {tr("Tickets")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("Total")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("How they pay")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("Status")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("Placed")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(v.or.rows ?? []).map((r: any, i_r: number) => (
                            <Fragment key={r.no ?? i_r}>
                              <tr className="wv-row" onClick={r.open}>
                                <td style={st(v.bo.tdm)}>
                                  <button onClick={r.open} aria-label={r.aria} style={st("padding:0; border:0; background:transparent; font-family:var(--mono); font-size:12.5px; font-weight:700; color:var(--accent); cursor:pointer;")}>
                                    {r.no}
                                  </button>
                                </td>
                                <td style={st(v.bo.td)}>
                                  <div style={st("display:flex; flex-direction:column; min-width:160px;")}>
                                    <span style={st("font-weight:800;")}>
                                      {r.buyer}
                                    </span>
                                    <span style={st("font-family:var(--mono); font-size:11.5px; color:var(--fg-subtle);")}>
                                      {r.email}
                                    </span>
                                  </div>
                                </td>
                                {v.or.global ? (
                                  <>
                                    <td style={st(`${v.bo.td}white-space:nowrap;`)}>
                                      {r.show}
                                    </td>
                                  </>
                                ) : null}
                                <td style={st(v.bo.tdm)}>
                                  {r.n}
                                </td>
                                <td style={st(v.bo.tdm)}>
                                  {r.total}
                                </td>
                                <td style={st(`${v.bo.td}white-space:nowrap;`)}>
                                  {r.how}
                                </td>
                                <td style={st(v.bo.td)}>
                                  <span style={st(r.stStyle)}>
                                    {r.st}
                                  </span>
                                </td>
                                <td style={st(v.bo.tdm)}>
                                  {r.placed}
                                </td>
                              </tr>
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                      {" "}
                      {v.or.empty ? (
                        <>
                          <p style={st("margin:0; padding:28px; text-align:center; font-size:14px; font-weight:600; color:var(--fg-muted);")}>
                            {tr("No orders match. Try fewer filters.")}
                          </p>
                        </>
                      ) : null}
                    </div>
                    {" "}
                    <div style={st("display:flex; align-items:center; gap:10px; flex-wrap:wrap;")}>
                      <span style={st(`${v.s.hint}flex:1;`)}>
                        {v.or.countTxt}
                      </span>
                      {v.or.moreOn ? (
                        <>
                          <button className="wv-gi" onClick={v.or.more} style={st(v.s.btnS)}>
                            {tr("Show 50 more")}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : null}
              {" "}
              {v.bo.s.refunds ? (
                <>
                  <div className="wv-screen" style={st(v.bo.page)}>
                    <h1 style={st(v.bo.h1)}>
                      {tr("Refund requests")}
                    </h1>
                    {" "}
                    <span style={st(`${v.s.hint}margin-block-start:-8px;`)}>
                      {tr("Approving cancels the ticket and records what is due back. Recording a refund doesn't move money — pay it back first, then record it on the order.")}
                    </span>
                    {" "}
                    <div style={st(v.bo.card)}>
                      {(v.rq.rows ?? []).map((r: any, i_r: number) => (
                        <Fragment key={r.no ?? i_r}>
                          <div style={st("display:flex; align-items:center; gap:12px; flex-wrap:wrap; padding:14px 18px; border-block-end:1px solid var(--border);")}>
                            <button className="wv-gi" onClick={r.open} style={st("padding:0; border:0; background:transparent; font-family:var(--mono); font-size:13px; font-weight:700; color:var(--accent);")}>
                              {r.no}
                            </button>
                            {" "}
                            <span style={st("flex:1; min-width:240px; display:flex; flex-direction:column; gap:2px;")}>
                              <span style={st("font-size:14px; font-weight:800;")}>
                                {r.buyer}{" · "}{r.show}{" · "}{r.what}
                              </span>
                              <span style={st("font-size:12.5px; font-weight:600; color:var(--fg-muted);")}>
                                <span style={st("font-family:var(--mono);")}>
                                  {r.paid}
                                </span>
                                {" · "}
                                <span style={st("font-family:var(--mono);")}>
                                  {r.asked}
                                </span>
                              </span>
                            </span>
                            {" "}
                            <button className="wv-btn" onClick={r.approve} style={st(`${v.s.btnP}min-height:36px; font-size:13px;`)}>
                              {tr("Approve")}
                            </button>
                            {" "}
                            <button className="wv-gi" onClick={r.decline} style={st(v.s.btnS)}>
                              {tr("Decline")}
                            </button>
                          </div>
                        </Fragment>
                      ))}
                      {" "}
                      {v.rq.empty ? (
                        <>
                          <p style={st("margin:0; padding:24px; text-align:center; font-size:14px; font-weight:600; color:var(--fg-muted);")}>
                            {tr("No refund requests waiting.")}
                          </p>
                        </>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : null}
              {" "}
              {v.bo.s.guests ? (
                <>
                  <div className="wv-screen" style={st(v.bo.page)}>
                    {!v.bo.ehOn ? (
                      <h1 style={st(v.bo.h1)}>
                        {tr("Guest lists")}
                      </h1>
                    ) : null}
                    <div style={st("display:flex; gap:10px; align-items:center; flex-wrap:wrap;")}>
                      <select className="wv-fld" aria-label={tr("Show")} value={v.gl.ev} onChange={v.gl.onEv} style={st(`${v.bo.fld}width:auto; min-width:200px;`)}>
                        {(v.gl.evOpts ?? []).map((o: any, i_o: number) => (
                          <Fragment key={o.id ?? i_o}>
                            <option value={o.id}>
                              {o.label}
                            </option>
                          </Fragment>
                        ))}
                      </select>
                      {" "}
                      <label style={st("display:flex; align-items:center; gap:8px;")}>
                        <span style={st(v.s.lbl)}>
                          {tr("List closes")}
                        </span>
                        <input className="wv-fld" type="datetime-local" value={v.gl.closeV ?? ""} onChange={v.gl.onClose} style={st(`${v.bo.fld}width:auto; font-family:var(--mono); font-size:12.5px;`)} />
                      </label>
                      {" "}
                      <span style={st("flex:1;")}></span>
                      {" "}
                      <button className="wv-gi" onClick={v.gl.paste} style={st(v.s.btnS)}>
                        <Icon name={"clipboard-paste"} style={st("width:14px;height:14px;")} />
                        {tr("Paste a list")}
                      </button>
                    </div>
                    {" "}
                    <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:10px;")}>
                      {(v.gl.kpis ?? []).map((k: any, i_k: number) => (
                        <Fragment key={k.k ?? i_k}>
                          <div style={st(`${v.bo.kpi}background:var(--surface);`)}>
                            <span style={st(`${v.s.eyebrow}font-size:10.5px;`)}>
                              {k.k}
                            </span>
                            <span style={st(v.bo.kpiV)}>
                              {k.v}
                            </span>
                            <span style={st(v.bo.kpiS)}>
                              {k.sub}
                            </span>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                    {" "}
                    {v.gl.closedOn ? (
                      <>
                        <div role="status" style={st(v.s.aInfo)}>
                          <Icon name={"clock"} style={st("width:17px;height:17px;flex-shrink:0;margin-block-start:2px;color:var(--info);")} />
                          <span>
                            {v.gl.closedTxt}
                          </span>
                        </div>
                      </>
                    ) : null}
                    {" "}
                    {v.gl.overOn ? (
                      <>
                        <div role="alert" style={st(v.s.aWarn)}>
                          <Icon name={"triangle-alert"} style={st("width:17px;height:17px;flex-shrink:0;margin-block-start:2px;color:var(--warn);")} />
                          <span>
                            {v.gl.overTxt}
                          </span>
                        </div>
                      </>
                    ) : null}
                    {" "}
                    <form onSubmit={v.gl.add} style={st(`${v.bo.sec}flex-direction:row; flex-wrap:wrap; align-items:flex-end; gap:10px;`)}>
                      <label style={st(`${v.bo.fl}flex:2; min-width:180px;`)}>
                        <span style={st(v.s.lbl)}>
                          {tr("Name")}
                        </span>
                        <input id="gl-name" className="wv-fld" value={v.gl.nName ?? ""} onChange={v.gl.onName} aria-invalid={v.gl.nErrOn} aria-describedby="gl-err" style={st(v.bo.fld)} />
                        {v.gl.nErrOn ? (
                          <>
                            <span id="gl-err" role="alert" style={st(v.s.err)}>
                              <Icon name={"circle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                              {v.gl.nErr}
                            </span>
                          </>
                        ) : null}
                      </label>
                      {" "}
                      <div style={st(v.bo.fl)}>
                        <span style={st(v.s.lbl)}>
                          {tr("Plus")}
                        </span>
                        <div role="radiogroup" aria-label={tr("Plus ones")} style={st(v.bo.segW)}>
                          {(v.gl.plus ?? []).map((o: any, i_o: number) => (
                            <Fragment key={o.id ?? i_o}>
                              <button type="button" role="radio" aria-checked={o.on} onClick={o.go} style={st(o.style)}>
                                {o.id}
                              </button>
                            </Fragment>
                          ))}
                        </div>
                      </div>
                      {" "}
                      <label style={st(`${v.bo.fl}flex:1; min-width:150px;`)}>
                        <span style={st(v.s.lbl)}>
                          {tr("On behalf of")}
                        </span>
                        <input className="wv-fld" value={v.gl.nBy ?? ""} onChange={v.gl.onBy} placeholder={tr("The band, press…")} style={st(v.bo.fld)} />
                      </label>
                      {" "}
                      <label style={st(`${v.bo.fl}flex:1; min-width:150px;`)}>
                        <span style={st(v.s.lbl)}>
                          {tr("Note")}
                        </span>
                        <input className="wv-fld" value={v.gl.nNote ?? ""} onChange={v.gl.onNote} style={st(v.bo.fld)} />
                      </label>
                      {" "}
                      <button type="submit" className="wv-btn" style={st(`${v.s.btnP}min-height:40px;`)}>
                        <Icon name={"user-plus"} style={st("width:15px;height:15px;")} />
                        {tr("Add")}
                      </button>
                    </form>
                    {" "}
                    <div style={st(`${v.bo.card}overflow-x:auto;`)}>
                      <table style={st(`${v.bo.table}min-width:620px;`)}>
                        <thead>
                          <tr>
                            <th style={st(v.bo.th)}>
                              {tr("Name")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("Plus")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("On behalf of")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("Note")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("At the door")}
                            </th>
                            <th style={st(v.bo.th)}>
                              <span style={st("position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0);")}>
                                {tr("Remove")}
                              </span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(v.gl.rows ?? []).map((g: any, i_g: number) => (
                            <Fragment key={g.id ?? i_g}>
                              <tr>
                                <td style={st(`${v.bo.td}font-weight:800;`)}>
                                  {g.name}
                                </td>
                                <td style={st(v.bo.tdm)}>
                                  {g.plus}
                                </td>
                                <td style={st(v.bo.td)}>
                                  {g.by}
                                </td>
                                <td style={st(`${v.bo.td}color:var(--fg-muted);`)}>
                                  {g.note}
                                </td>
                                <td style={st(v.bo.td)}>
                                  <span style={st(g.inStyle)}>
                                    {g.inTxt}
                                  </span>
                                </td>
                                <td style={st(v.bo.td)}>
                                  <button className="wv-gi" onClick={g.del} aria-label={g.delLabel} style={st("width:32px; height:32px; border:0; border-radius:9px; background:transparent; color:var(--fg-subtle); display:flex; align-items:center; justify-content:center;")}>
                                    <Icon name={"x"} style={st("width:14px;height:14px;")} />
                                  </button>
                                </td>
                              </tr>
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                      {" "}
                      {v.gl.empty ? (
                        <>
                          <p style={st("margin:0; padding:24px; text-align:center; font-size:14px; font-weight:600; color:var(--fg-muted);")}>
                            {tr("No guests yet for this show.")}
                          </p>
                        </>
                      ) : null}
                    </div>
                    {" "}
                    <span style={st(v.s.hint)}>
                      {tr("Guests show at the door as their own list.")}{" "}{v.gl.closeTxt}{tr(". A guest with a +1 or +2 can arrive in parts.")}
                    </span>
                  </div>
                </>
              ) : null}
              {" "}
              {v.bo.s.waits ? (
                <>
                  <div className="wv-screen" style={st(v.bo.page)}>
                    <div style={st("display:flex; align-items:center; gap:10px; flex-wrap:wrap;")}>
                      <h1 style={st(`${v.bo.h1}flex:1;`)}>
                        {tr("Waitlists")}
                      </h1>
                      <select className="wv-fld" aria-label={tr("Show")} value={v.wv.ev} onChange={v.wv.onEv} style={st(`${v.bo.fld}width:auto; min-width:200px;`)}>
                        {(v.wv.evOpts ?? []).map((o: any, i_o: number) => (
                          <Fragment key={o.id ?? i_o}>
                            <option value={o.id}>
                              {o.label}
                            </option>
                          </Fragment>
                        ))}
                      </select>
                      <button className="wv-gi" onClick={v.wv.add} style={st(v.s.btnS)}>
                        <Icon name={"user-plus"} style={st("width:14px;height:14px;")} />
                        {tr("Add someone")}
                      </button>
                    </div>
                    {" "}
                    <section aria-labelledby="wv-h" style={st(v.bo.sec)}>
                      <div style={st("display:flex; align-items:center; gap:14px; flex-wrap:wrap;")}>
                        <span style={st(`width:40px; aspect-ratio:4/5; border-radius:7px; ${v.wv.p.bg}`)}></span>
                        {" "}
                        <div style={st("flex:1; min-width:200px; display:flex; flex-direction:column; gap:2px;")}>
                          <h2 id="wv-h" style={st(v.bo.secH)}>
                            {v.wv.name}
                          </h2>
                          <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:600; color:var(--fg-muted);")}>
                            {v.wv.line}
                          </span>
                        </div>
                        {" "}
                        <span style={st(v.wv.backStyle)}>
                          {v.wv.backTxt}
                        </span>
                        {" "}
                        {v.wv.offerOn ? (
                          <button className="wv-btn" onClick={v.wv.offer} style={st(`${v.s.btnP}min-height:40px;`)}>
                            <Icon name={"send"} style={st("width:15px;height:15px;")} />
                            {v.wv.offerLabel}
                          </button>
                        ) : null}
                        {v.wv.putBackOn ? (
                          <button className="wv-gi" onClick={v.wv.putBack} style={st(v.s.btnS)}>
                            <Icon name={"undo-2"} style={st("width:14px;height:14px;")} />
                            {v.wv.putBackLabel}
                          </button>
                        ) : null}
                      </div>
                      {" "}
                      <span style={st(v.s.hint)}>
                        {v.wv.hint}
                      </span>
                      {" "}
                      <div style={st("overflow-x:auto;")}>
                        <table style={st(`${v.bo.table}min-width:640px;`)}>
                          <thead>
                            <tr>
                              <th style={st(v.bo.th)}>
                                {"#"}
                              </th>
                              <th style={st(v.bo.th)}>
                                {tr("Name")}
                              </th>
                              <th style={st(v.bo.th)}>
                                {tr("Email")}
                              </th>
                              <th style={st(v.bo.th)}>
                                {tr("How many")}
                              </th>
                              <th style={st(v.bo.th)}>
                                {tr("Joined")}
                              </th>
                              <th style={st(v.bo.th)}>
                                {tr("State")}
                              </th>
                              <th style={st(v.bo.th)}>
                                <span style={st("position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0);")}>
                                  {tr("Remove")}
                                </span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(v.wv.rows ?? []).map((w: any, i_w: number) => (
                              <Fragment key={w.id ?? i_w}>
                                <tr>
                                  <td style={st(v.bo.tdm)}>
                                    {w.n}
                                  </td>
                                  <td style={st(`${v.bo.td}font-weight:800;`)}>
                                    {w.name}
                                  </td>
                                  <td style={st(v.bo.tdm)}>
                                    {w.email}
                                  </td>
                                  <td style={st(v.bo.tdm)}>
                                    {w.qty}
                                  </td>
                                  <td style={st(v.bo.tdm)}>
                                    {w.joined}
                                  </td>
                                  <td style={st(v.bo.td)}>
                                    <span style={st(w.stStyle)}>
                                      {w.st}
                                    </span>
                                  </td>
                                  <td style={st(v.bo.td)}>
                                    {w.delOn ? (
                                      <button className="wv-gi" onClick={w.del} aria-label={w.delLabel} style={st("width:32px; height:32px; border:0; border-radius:9px; background:transparent; color:var(--fg-subtle); display:flex; align-items:center; justify-content:center;")}>
                                        <Icon name={"x"} style={st("width:14px;height:14px;")} />
                                      </button>
                                    ) : null}
                                  </td>
                                </tr>
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </div>
                </>
              ) : null}
              {" "}
              {v.bo.s.codes ? (
                <>
                  <div className="wv-screen" style={st(v.bo.page)}>
                    <div style={st("display:flex; align-items:center; gap:12px; flex-wrap:wrap;")}>
                      <h1 style={st(`${v.bo.h1}flex:1;`)}>
                        {tr("Codes")}
                      </h1>
                      <button className="wv-btn" onClick={v.cd.create} style={st(`${v.s.btnP}min-height:40px;`)}>
                        <Icon name={"plus"} style={st("width:16px;height:16px;")} />
                        {tr("New code")}
                      </button>
                    </div>
                    {" "}
                    <div style={st(`${v.bo.card}overflow-x:auto;`)}>
                      <table style={st(v.bo.table)}>
                        <thead>
                          <tr>
                            <th style={st(v.bo.th)}>
                              {tr("Code")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("What it does")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("Where")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("Ticket type")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("Uses")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("Valid until")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("On")}
                            </th>
                            <th style={st(v.bo.th)}>
                              <span style={st("position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0);")}>
                                {tr("Edit")}
                              </span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(v.cd.rows ?? []).map((c: any, i_c: number) => (
                            <Fragment key={c.code ?? i_c}>
                              <tr>
                                <td style={st(`${v.bo.tdm}font-size:13.5px; font-weight:700;`)}>
                                  {c.code}
                                </td>
                                <td style={st(v.bo.td)}>
                                  {c.what}
                                </td>
                                <td style={st(v.bo.td)}>
                                  {c.where}
                                </td>
                                <td style={st(`${v.bo.td}color:var(--fg-muted);`)}>
                                  {c.type}
                                </td>
                                <td style={st(v.bo.td)}>
                                  <div style={st("display:flex; flex-direction:column; gap:4px; min-width:90px;")}>
                                    <span style={st("font-family:var(--mono); font-size:12.5px;")}>
                                      {c.uses}
                                    </span>
                                    {c.perShowOn ? (
                                      <span style={st("font-family:var(--mono); font-size:11.5px; color:var(--fg-subtle);")}>
                                        {c.perShow}
                                      </span>
                                    ) : null}
                                    <span style={st(v.bo.track)}>
                                      <span style={st(c.bar)}></span>
                                    </span>
                                  </div>
                                </td>
                                <td style={st(v.bo.tdm)}>
                                  {c.until}
                                </td>
                                <td style={st(v.bo.td)}>
                                  <button role="switch" aria-checked={c.on} aria-label={c.swLabel} onClick={c.toggle} style={st("padding:4px; border:0; background:transparent; cursor:pointer;")}>
                                    <span style={st(c.swTrack)}>
                                      <span style={st(c.swKnob)}></span>
                                    </span>
                                  </button>
                                </td>
                                <td style={st(v.bo.td)}>
                                  <button className="wv-gi" onClick={c.edit} aria-label={c.editLabel} style={st(`${v.s.btnS}min-height:30px; font-size:12px;`)}>
                                    <Icon name={"square-pen"} style={st("width:13px;height:13px;")} />
                                    {tr("Edit")}
                                  </button>
                                </td>
                              </tr>
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                      {v.cd.empty ? (
                        <p style={st("margin:0; padding:28px; text-align:center; font-size:14px; font-weight:600; color:var(--fg-muted);")}>
                          {tr("No codes yet.")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : null}
              {" "}
              {v.bo.s.msgs ? (
                <>
                  <div className="wv-screen" style={st(v.bo.page)}>
                    <h1 style={st(v.bo.h1)}>
                      {tr("Messages")}
                    </h1>
                    {" "}
                    <div style={st(`display:grid; grid-template-columns:${v.ms.cols}; gap:20px; align-items:start;`)}>
                      <section aria-labelledby="mc-h" style={st(v.bo.sec)}>
                        <h2 id="mc-h" style={st(v.bo.secH)}>
                          {tr("Write to ticket holders")}
                        </h2>
                        {" "}
                        <label style={st(v.bo.fl)}>
                          <span style={st(v.s.lbl)}>
                            {tr("Show")}
                          </span>
                          <select className="wv-fld" value={v.ms.ev} onChange={v.ms.onEv} style={st(v.bo.fld)}>
                            {(v.ms.evOpts ?? []).map((o: any, i_o: number) => (
                              <Fragment key={o.id ?? i_o}>
                                <option value={o.id}>
                                  {o.label}
                                </option>
                              </Fragment>
                            ))}
                          </select>
                        </label>
                        {" "}
                        <div style={st(v.bo.fl)}>
                          <span style={st(v.s.lbl)}>
                            {tr("To")}
                          </span>
                          <div role="radiogroup" aria-label={tr("To")} style={st(v.bo.segW)}>
                            {(v.ms.tos ?? []).map((o: any, i_o: number) => (
                              <Fragment key={o.id ?? i_o}>
                                <button role="radio" aria-checked={o.on} onClick={o.go} style={st(o.style)}>
                                  {o.id}
                                </button>
                              </Fragment>
                            ))}
                          </div>
                          {" "}
                          {v.ms.typeOn ? (
                            <>
                              <select className="wv-fld" aria-label={tr("Ticket type")} value={v.ms.type} onChange={v.ms.onType} style={st(`${v.bo.fld}max-width:260px;`)}>
                                {(v.ms.typeOpts ?? []).map((o: any, i_o: number) => (
                                  <Fragment key={o.id ?? i_o}>
                                    <option value={o.id}>
                                      {o.label}
                                    </option>
                                  </Fragment>
                                ))}
                              </select>
                            </>
                          ) : null}
                        </div>
                        {" "}
                        <div style={st(v.bo.fl)}>
                          <span style={st(v.s.lbl)}>
                            {tr("Start from")}
                          </span>
                          <div style={st("display:flex; flex-wrap:wrap; gap:6px;")}>
                            {(v.ms.tpls ?? []).map((o: any, i_o: number) => (
                              <Fragment key={o.id ?? i_o}>
                                <button className="wv-gi" onClick={o.go} aria-pressed={o.on} style={st(o.style)}>
                                  {o.label}
                                </button>
                              </Fragment>
                            ))}
                          </div>
                        </div>
                        {" "}
                        <label style={st(v.bo.fl)}>
                          <span style={st(v.s.lbl)}>
                            {tr("Subject")}
                          </span>
                          <input className="wv-fld" value={v.ms.subj ?? ""} onChange={v.ms.onSubj} style={st(v.bo.fld)} />
                        </label>
                        {" "}
                        <label style={st(v.bo.fl)}>
                          <span style={st(v.s.lbl)}>
                            {tr("Message")}
                          </span>
                          <textarea className="wv-fld" rows={9} value={v.ms.body} onChange={v.ms.onBody} aria-describedby="ms-lang" style={st(`${v.bo.fld}padding-block:10px; line-height:1.6; font-weight:500; resize:vertical;`)}></textarea>
                          <span id="ms-lang" style={st(v.s.hint)}>
                            {v.ms.langNote}
                          </span>
                        </label>
                        {" "}
                        <div style={st("display:flex; align-items:center; gap:10px; flex-wrap:wrap;")}>
                          <span style={st("flex:1; font-size:13px; font-weight:700; color:var(--fg-muted);")}>
                            {v.ms.countTxt}
                          </span>
                          <button className="wv-gi" onClick={v.ms.test} style={st(`${v.s.btnS}min-height:42px;`)}>
                            <Icon name={"mail"} style={st("width:14px;height:14px;")} />
                            {tr("Send a test to me")}
                          </button>
                          <button className="wv-btn" onClick={v.ms.send} disabled={v.ms.sendOff} style={st(`${v.s.btnP}min-height:42px;`)}>
                            <Icon name={"send"} style={st("width:15px;height:15px;")} />
                            {v.ms.sendLabel}
                          </button>
                        </div>
                        {" "}
                        <span style={st(v.s.hint)}>
                          {v.ms.autoTxt}{" "}{tr("We don't track opens or clicks.")}
                        </span>
                      </section>
                      {" "}
                      <section aria-label={tr("Email preview")} style={st("display:flex; flex-direction:column; gap:10px;")}>
                        <span style={st(v.s.eyebrow)}>
                          {tr("Preview")}
                        </span>
                        {" "}
                        <div style={st("border-radius:16px; overflow:hidden; border:1px solid #e2e2e8; background:#ffffff; color:#191920;")}>
                          <div style={st(`height:10px; ${v.ms.p.bg}`)}></div>
                          {" "}
                          <div style={st("padding:20px; display:flex; flex-direction:column; gap:12px;")}>
                            <span style={st("font-size:12px; font-weight:700; color:#5a5a65;")}>
                              {v.ms.from}
                            </span>
                            {" "}
                            <span style={st("font-size:19px; font-weight:800; letter-spacing:-.03em;")}>
                              {v.ms.subj}
                            </span>
                            {" "}
                            {(v.ms.paras ?? []).map((l: any, i_l: number) => (
                              <Fragment key={l.k ?? i_l}>
                                <p style={st("margin:0; font-size:14px; font-weight:500; line-height:1.6; color:#2a2a33; white-space:pre-wrap;")}>
                                  {l.t}
                                </p>
                              </Fragment>
                            ))}
                            {" "}
                            <span style={st(`display:inline-flex; align-self:flex-start; align-items:center; min-height:40px; padding:0 16px; border-radius:11px; background:${v.ms.btnBg}; color:#ffffff; font-size:13.5px; font-weight:800;`)}>
                              {v.ms.cta}
                            </span>
                            {" "}
                            <span style={st("font-size:11.5px; font-weight:500; color:#5a5a65;")}>
                              {v.ms.foot}
                            </span>
                          </div>
                        </div>
                      </section>
                    </div>
                    {" "}
                    {(v.ms.waiting ?? []).map((w: any, i_w: number) => (
                      <Fragment key={w.id ?? i_w}>
                        <section aria-label={tr("Waiting to send")} style={st(`${v.bo.card}padding:14px 18px; display:flex; align-items:center; gap:12px; flex-wrap:wrap;`)}>
                          <Icon name={"clock"} style={st("width:16px;height:16px;color:var(--warn);")} />
                          <span style={st("flex:1; min-width:220px; font-size:14px; font-weight:800;")}>
                            {tr("Waiting to send ·")}{" "}{w.show}{" · "}{w.tpl}{" · "}
                            <span style={st("font-family:var(--mono);")}>
                              {w.n}
                            </span>
                          </span>
                          <button className="wv-btn" onClick={w.go} style={st(`${v.s.btnP}min-height:36px; font-size:13px;`)}>
                            {tr("Review and send")}
                          </button>
                        </section>
                      </Fragment>
                    ))}
                    {" "}
                    <section aria-labelledby="mh-h" style={st(`${v.bo.card}overflow-x:auto;`)}>
                      <h2 id="mh-h" style={st(`${v.bo.secH}padding:16px 16px 6px;`)}>
                        {tr("Sent")}
                      </h2>
                      <table style={st(`${v.bo.table}min-width:600px;`)}>
                        <thead>
                          <tr>
                            <th style={st(v.bo.th)}>
                              {tr("When")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("Show")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("Message")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("To")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("People")}
                            </th>
                            <th style={st(v.bo.th)}>
                              {tr("By")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(v.ms.hist ?? []).map((h: any, i_h: number) => (
                            <Fragment key={h.id ?? i_h}>
                              <tr>
                                <td style={st(v.bo.tdm)}>
                                  {h.at}
                                </td>
                                <td style={st(v.bo.td)}>
                                  {h.show}
                                </td>
                                <td style={st(v.bo.td)}>
                                  <details>
                                    <summary style={st("cursor:pointer; font-weight:800;")}>
                                      {h.subj}
                                    </summary>
                                    <p style={st("margin:6px 0 0; font-size:13px; font-weight:500; line-height:1.55; color:var(--fg-muted); white-space:pre-wrap; max-width:48ch;")}>
                                      {h.body}
                                    </p>
                                  </details>
                                </td>
                                <td style={st(v.bo.td)}>
                                  {h.to}
                                </td>
                                <td style={st(v.bo.tdm)}>
                                  {h.n}
                                </td>
                                <td style={st(v.bo.td)}>
                                  {h.by}
                                </td>
                              </tr>
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                      {v.ms.histEmpty ? (
                        <p style={st("margin:0; padding:20px; text-align:center; font-size:14px; font-weight:600; color:var(--fg-muted);")}>
                          {tr("Nothing sent yet.")}
                        </p>
                      ) : null}
                    </section>
                  </div>
                </>
              ) : null}
              {" "}
              {v.bo.s.pc ? (
                <>
                  <div className="wv-screen" style={st(v.bo.page)}>
                    {v.pc.doneOn ? (
                      <>
                        <section aria-label={tr("Postponed")} style={st(`${v.bo.sec}flex-direction:row; align-items:center; flex-wrap:wrap; gap:12px;`)}>
                          <Icon name={"calendar-clock"} style={st("width:18px;height:18px;color:var(--warn);")} />
                          <span style={st("flex:1; min-width:240px; font-size:14.5px; font-weight:800; line-height:1.5;")}>
                            {v.pc.doneTxt}
                          </span>
                          {v.pc.doneSendOn ? (
                            <>
                              <button className="wv-btn" onClick={v.pc.review} style={st(`${v.s.btnP}min-height:40px;`)}>
                                {tr("Review and send")}
                              </button>
                            </>
                          ) : null}
                        </section>
                      </>
                    ) : null}
                    {" "}
                    {v.pc.formOn ? (
                      <>
                        <div role="radiogroup" aria-label={tr("What's happening")} style={st(v.bo.segW)}>
                          {(v.pc.modes ?? []).map((o: any, i_o: number) => (
                            <Fragment key={o.id ?? i_o}>
                              <button role="radio" aria-checked={o.on} onClick={o.go} style={st(`${o.style}min-height:36px; padding:0 16px;`)}>
                                {o.id}
                              </button>
                            </Fragment>
                          ))}
                        </div>
                        {" "}
                        <div style={st(`display:grid; grid-template-columns:${v.pc.cols}; gap:20px; align-items:start;`)}>
                          <div style={st("display:flex; flex-direction:column; gap:16px; min-width:0;")}>
                            {v.pc.post ? (
                              <>
                                <section aria-labelledby="pp-h" style={st(v.bo.sec)}>
                                  <h2 id="pp-h" style={st(v.bo.secH)}>
                                    {tr("1 · The new date")}
                                  </h2>
                                  {" "}
                                  <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px;")}>
                                    <label style={st(v.bo.fl)}>
                                      <span style={st(v.s.lbl)}>
                                        {tr("Date")}
                                      </span>
                                      <input id="pc-date" className="wv-fld" type="date" value={v.pc.date.v ?? ""} onChange={v.pc.date.on} aria-invalid={v.pc.dateErrOn} aria-describedby="pc-date-e" style={st(`${v.pc.dFld}font-family:var(--mono); font-size:13px;`)} />
                                      {v.pc.dateErrOn ? (
                                        <>
                                          <span id="pc-date-e" role="alert" style={st(v.s.err)}>
                                            <Icon name={"circle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                                            {v.pc.dateErr}
                                          </span>
                                        </>
                                      ) : null}
                                    </label>
                                    {" "}
                                    <label style={st(v.bo.fl)}>
                                      <span style={st(v.s.lbl)}>
                                        {tr("Doors")}
                                      </span>
                                      <input id="pc-doors" className="wv-fld" type="time" value={v.pc.doors.v ?? ""} onChange={v.pc.doors.on} aria-invalid={v.pc.timeErrOn} aria-describedby="pc-time-e" style={st(`${v.pc.tFld}font-family:var(--mono); font-size:13px;`)} />
                                    </label>
                                    {" "}
                                    <label style={st(v.bo.fl)}>
                                      <span style={st(v.s.lbl)}>
                                        {tr("On stage")}
                                      </span>
                                      <input className="wv-fld" type="time" value={v.pc.stage.v ?? ""} onChange={v.pc.stage.on} aria-invalid={v.pc.timeErrOn} aria-describedby="pc-time-e" style={st(`${v.pc.tFld}font-family:var(--mono); font-size:13px;`)} />
                                    </label>
                                  </div>
                                  {" "}
                                  {v.pc.timeErrOn ? (
                                    <>
                                      <span id="pc-time-e" role="alert" style={st(v.s.err)}>
                                        <Icon name={"circle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                                        {v.pc.timeErr}
                                      </span>
                                    </>
                                  ) : null}
                                  {" "}
                                  <div role="note" style={st(v.s.aInfo)}>
                                    <Icon name={"ticket-check"} style={st("width:16px;height:16px;flex-shrink:0;margin-block-start:2px;color:var(--info);")} />
                                    <span>
                                      {tr("Tickets stay valid for the new date. Nobody has to do anything to keep them.")}
                                    </span>
                                  </div>
                                </section>
                                {" "}
                                <section aria-labelledby="pr-h" style={st(v.bo.sec)}>
                                  <h2 id="pr-h" style={st(v.bo.secH)}>
                                    {tr("2 · The refund window")}
                                  </h2>
                                  {" "}
                                  <label style={st(`${v.bo.fl}max-width:240px;`)}>
                                    <span style={st(v.s.lbl)}>
                                      {tr("People can ask for a refund until")}
                                    </span>
                                    <input id="pc-until" className="wv-fld" type="date" value={v.pc.until.v ?? ""} onChange={v.pc.until.on} aria-invalid={v.pc.untilErrOn} aria-describedby="pc-until-e pc-until-h" style={st(`${v.pc.uFld}font-family:var(--mono); font-size:13px;`)} />
                                    {v.pc.untilErrOn ? (
                                      <>
                                        <span id="pc-until-e" role="alert" style={st(v.s.err)}>
                                          <Icon name={"circle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                                          {v.pc.untilErr}
                                        </span>
                                      </>
                                    ) : null}
                                  </label>
                                  {" "}
                                  <span id="pc-until-h" style={st(v.s.hint)}>
                                    {v.pc.untilTxt}
                                  </span>
                                </section>
                              </>
                            ) : null}
                            {" "}
                            {v.pc.cancel ? (
                              <>
                                <section aria-labelledby="pk-h" style={st(v.bo.sec)}>
                                  <h2 id="pk-h" style={st(v.bo.secH)}>
                                    {tr("1 · What happens")}
                                  </h2>
                                  {" "}
                                  <div role="note" style={st(v.s.aDanger)}>
                                    <Icon name={"circle-x"} style={st("width:16px;height:16px;flex-shrink:0;margin-block-start:2px;color:var(--danger);")} />
                                    <span>
                                      {tr("Every ticket for")}{" "}{v.pc.name}{" "}{tr("is cancelled and stops working. The page says the show is cancelled.")}{" "}{v.pc.cancelMoney}
                                    </span>
                                  </div>
                                </section>
                              </>
                            ) : null}
                            {" "}
                            <section aria-labelledby="pm-h" style={st(v.bo.sec)}>
                              <h2 id="pm-h" style={st(v.bo.secH)}>
                                {v.pc.msgStep}
                              </h2>
                              {" "}
                              <label style={st(v.bo.fl)}>
                                <span style={st(v.s.lbl)}>
                                  {tr("Message")}
                                </span>
                                <textarea className="wv-fld" rows={7} value={v.pc.msg} onChange={v.pc.onMsg} style={st(`${v.bo.fld}padding-block:10px; line-height:1.6; font-weight:500; resize:vertical;`)}></textarea>
                              </label>
                              {" "}
                              <span style={st(v.s.eyebrow)}>
                                {tr("Preview")}
                              </span>
                              {" "}
                              <div style={st("border-radius:16px; overflow:hidden; border:1px solid #e2e2e8; background:#ffffff; color:#191920;")}>
                                <div style={st(`height:10px; ${v.pc.p.bg}`)}></div>
                                {" "}
                                <div style={st("padding:18px; display:flex; flex-direction:column; gap:10px;")}>
                                  <span style={st("font-size:12px; font-weight:700; color:#5a5a65;")}>
                                    {v.pc.from}
                                  </span>
                                  {" "}
                                  <span style={st("font-size:18px; font-weight:800; letter-spacing:-.03em;")}>
                                    {v.pc.subj}
                                  </span>
                                  {" "}
                                  {(v.pc.paras ?? []).map((l: any, i_l: number) => (
                                    <Fragment key={l.k ?? i_l}>
                                      <p style={st("margin:0; font-size:14px; font-weight:500; line-height:1.6; color:#2a2a33; white-space:pre-wrap;")}>
                                        {l.t}
                                      </p>
                                    </Fragment>
                                  ))}
                                  {" "}
                                  <span style={st(`display:inline-flex; align-self:flex-start; align-items:center; min-height:40px; padding:0 16px; border-radius:11px; background:${v.pc.btnBg}; color:#ffffff; font-size:13.5px; font-weight:800;`)}>
                                    {tr("See my order")}
                                  </span>
                                </div>
                              </div>
                              {" "}
                              <span style={st(v.s.hint)}>
                                {tr("Goes to")}{" "}{v.pc.people}{"."}
                              </span>
                            </section>
                            {" "}
                            <div style={st("display:flex; gap:8px; flex-wrap:wrap;")}>
                              <button className="wv-btn" onClick={v.pc.confirm} style={st(v.pc.btnStyle)}>
                                {v.pc.cta}
                              </button>
                              {v.pc.laterOn ? (
                                <>
                                  <button className="wv-gi" onClick={v.pc.later} style={st(v.s.btnG)}>
                                    {tr("Postpone, send later")}
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </div>
                          {" "}
                          <aside aria-label={tr("Summary")} style={st(v.bo.sec)}>
                            <span style={st(v.s.eyebrow)}>
                              {tr("Summary")}
                            </span>
                            {" "}
                            {(v.pc.sum ?? []).map((r: any, i_r: number) => (
                              <Fragment key={r.k ?? i_r}>
                                <div style={st("display:flex; justify-content:space-between; gap:12px; padding-block:6px; border-block-end:1px solid var(--border);")}>
                                  <span style={st("font-size:13px; font-weight:700; color:var(--fg-muted);")}>
                                    {r.k}
                                  </span>
                                  <span style={st("font-family:var(--mono); font-size:13px; font-weight:700; text-align:end;")}>
                                    {r.v}
                                  </span>
                                </div>
                              </Fragment>
                            ))}
                          </aside>
                        </div>
                      </>
                    ) : null}
                    {" "}
                    {v.pc.refundsOn ? (
                      <>
                        <section aria-labelledby="rf-h" style={st(v.bo.sec)}>
                          <div style={st("display:flex; flex-direction:column; gap:4px;")}>
                            <h2 id="rf-h" style={st(`${v.bo.secH}font-size:20px;`)}>
                              {tr("Refunds to make")}
                            </h2>
                            <span style={st("font-family:var(--mono); font-size:13.5px; font-weight:700;")}>
                              {v.pc.rfHead}
                            </span>
                          </div>
                          {" "}
                          <div role="note" style={st(v.s.aInfo)}>
                            <Icon name={"info"} style={st("width:16px;height:16px;flex-shrink:0;margin-block-start:2px;color:var(--info);")} />
                            <span>
                              {tr("Pay each person back the way they paid, then record it here. Recording a refund doesn't move money.")}
                            </span>
                          </div>
                          {" "}
                          <div style={st("display:flex; flex-direction:column; gap:6px;")}>
                            <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:700; color:var(--fg-muted);")}>
                              {v.pc.rfProg}
                            </span>
                            <span style={st(`${v.bo.track}height:8px;`)}>
                              <span style={st(v.pc.rfBar)}></span>
                            </span>
                          </div>
                          {" "}
                          <div role="group" aria-label={tr("Filter")} style={st("display:flex; gap:6px; flex-wrap:wrap;")}>
                            {(v.pc.rfTabs ?? []).map((f: any, i_f: number) => (
                              <Fragment key={f.id ?? i_f}>
                                <button className="wv-gi" onClick={f.go} aria-pressed={f.on} style={st(f.style)}>
                                  {f.label}{" "}
                                  <span style={st("font-family:var(--mono); font-size:11.5px; opacity:.75;")}>
                                    {f.n}
                                  </span>
                                </button>
                              </Fragment>
                            ))}
                          </div>
                          {" "}
                          <div style={st("overflow-x:auto;")}>
                            <table style={st(`${v.bo.table}min-width:620px;`)}>
                              <thead>
                                <tr>
                                  <th style={st(v.bo.th)}>
                                    {tr("Order")}
                                  </th>
                                  <th style={st(v.bo.th)}>
                                    {tr("Buyer")}
                                  </th>
                                  <th style={st(v.bo.th)}>
                                    {tr("Paid")}
                                  </th>
                                  <th style={st(v.bo.th)}>
                                    {tr("How they paid")}
                                  </th>
                                  <th style={st(v.bo.th)}>
                                    {tr("State")}
                                  </th>
                                  <th style={st(v.bo.th)}>
                                    <span style={st("position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0);")}>
                                      {tr("Action")}
                                    </span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {(v.pc.rfRows ?? []).map((r: any, i_r: number) => (
                                  <Fragment key={r.no ?? i_r}>
                                    <tr>
                                      <td style={st(v.bo.tdm)}>
                                        {r.no}
                                      </td>
                                      <td style={st(v.bo.td)}>
                                        <div style={st("display:flex; flex-direction:column;")}>
                                          <span style={st("font-weight:800;")}>
                                            {r.buyer}
                                          </span>
                                          <span style={st("font-family:var(--mono); font-size:11.5px; color:var(--fg-subtle);")}>
                                            {r.email}
                                          </span>
                                        </div>
                                      </td>
                                      <td style={st(v.bo.tdm)}>
                                        {r.total}
                                      </td>
                                      <td style={st(v.bo.td)}>
                                        {r.how}
                                      </td>
                                      <td style={st(v.bo.td)}>
                                        <span style={st(r.stStyle)}>
                                          {r.st}
                                        </span>
                                      </td>
                                      <td style={st(v.bo.td)}>
                                        {r.actOn ? (
                                          <>
                                            <button className="wv-gi" onClick={r.mark} style={st(`${v.s.btnS}min-height:30px; font-size:12px;`)}>
                                              {tr("Record a refund")}
                                            </button>
                                          </>
                                        ) : null}
                                      </td>
                                    </tr>
                                  </Fragment>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {" "}
                          {v.pc.rfPageOn ? (
                            <>
                              <div style={st("display:flex; align-items:center; gap:8px;")}>
                                <button className="wv-gi" onClick={v.pc.rfPrev} disabled={v.pc.rfPrevOff} style={st(v.s.btnS)}>
                                  <Icon name={"chevron-left"} style={st("width:14px;height:14px;")} />
                                  {tr("Previous")}
                                </button>
                                <span style={st("flex:1; text-align:center; font-family:var(--mono); font-size:12.5px; font-weight:700; color:var(--fg-muted);")}>
                                  {v.pc.rfPageTxt}
                                </span>
                                <button className="wv-gi" onClick={v.pc.rfNext} disabled={v.pc.rfNextOff} style={st(v.s.btnS)}>
                                  {tr("Next")}
                                  <Icon name={"chevron-right"} style={st("width:14px;height:14px;")} />
                                </button>
                              </div>
                            </>
                          ) : null}
                          {" "}
                          <span style={st(v.s.hint)}>
                            {v.pc.rfMore}
                          </span>
                        </section>
                      </>
                    ) : null}
                  </div>
                </>
              ) : null}
              {" "}
              {v.bo.s.settings ? (
                <>
                  <div className="wv-screen" style={st(`${v.bo.page}max-width:860px;`)}>
                    <h1 style={st(v.bo.h1)}>
                      {tr("Settings")}
                    </h1>
                    {" "}
                    <section aria-labelledby="sv-h" style={st(v.bo.sec)}>
                      <h2 id="sv-h" style={st(v.bo.secH)}>
                        {tr("The venue")}
                      </h2>
                      {" "}
                      <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px;")}>
                        <label style={st(v.bo.fl)}>
                          <span style={st(v.s.lbl)}>
                            {tr("Name")}
                          </span>
                          <input className="wv-fld" value={v.st.name.v ?? ""} onChange={v.st.name.on} style={st(v.bo.fld)} />
                        </label>
                        <label style={st(v.bo.fl)}>
                          <span style={st(v.s.lbl)}>
                            {tr("Address")}
                          </span>
                          <input className="wv-fld" value={v.st.addr.v ?? ""} onChange={v.st.addr.on} style={st(v.bo.fld)} />
                        </label>
                        <label style={st(v.bo.fl)}>
                          <span style={st(v.s.lbl)}>
                            {tr("Contact email")}
                          </span>
                          <input id="st-email" className="wv-fld" type="email" value={v.st.email.v ?? ""} onChange={v.st.email.on} aria-invalid={v.st.email.errOn} aria-describedby={v.st.email.errOn ? "st-email-e" : undefined} style={st(`${v.bo.fld}font-family:var(--mono); font-size:13px;`)} />
                          {v.st.email.errOn ? (
                            <span id="st-email-e" role="alert" style={st(v.s.err)}>
                              <Icon name={"circle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                              {v.st.email.err}
                            </span>
                          ) : null}
                        </label>
                      </div>
                      {(v.st.texts ?? []).map((t: any, i_t: number) => (
                        <Fragment key={t.k ?? i_t}>
                          <label style={st(v.bo.fl)}>
                            <span style={st(v.s.lbl)}>
                              {t.label}
                            </span>
                            <textarea className="wv-fld" rows={3} value={t.v ?? ""} onChange={t.on} style={st(`${v.bo.fld}padding-block:8px; line-height:1.55; font-weight:500; resize:vertical;`)}></textarea>
                          </label>
                        </Fragment>
                      ))}
                      {" "}
                      <span style={st(v.s.lbl)}>
                        {tr("Rooms")}
                      </span>
                      {" "}
                      {(v.st.rooms ?? []).map((r: any, i_r: number) => (
                        <Fragment key={r.k ?? i_r}>
                          <div style={st("display:grid; grid-template-columns:minmax(0,1fr) 120px; gap:8px; align-items:center;")}>
                            <span style={st("display:flex; flex-direction:column; gap:2px;")}>
                              <input className="wv-fld" aria-label={tr("Room name")} value={r.n.v ?? ""} onChange={r.n.on} style={st(v.bo.fld)} />
                              {r.noteOn ? (
                                <>
                                  <span style={st(v.s.hint)}>
                                    {r.note}
                                  </span>
                                </>
                              ) : null}
                            </span>
                            <input className="wv-fld" aria-label={r.capLabel} inputMode="numeric" value={r.c.v ?? ""} onChange={r.c.on} style={st(`${v.bo.fld}font-family:var(--mono);`)} />
                          </div>
                        </Fragment>
                      ))}
                      <button className="wv-gi" onClick={v.st.addRoom} style={st(`${v.s.btnS}align-self:flex-start;`)}>
                        <Icon name={"plus"} style={st("width:14px;height:14px;")} />
                        {tr("Add a room")}
                      </button>
                    </section>
                    {" "}
                    <section aria-labelledby="spy-h" style={st(v.bo.sec)}>
                      <h2 id="spy-h" style={st(v.bo.secH)}>
                        {tr("How people can pay")}
                      </h2>
                      {" "}
                      <span style={st(`${v.s.hint}margin-block-start:-8px;`)}>
                        {tr("Defaults for new ticket types.")}
                      </span>
                      {" "}
                      {(v.st.sws ?? []).map((w: any, i_w: number) => (
                        <Fragment key={w.id ?? i_w}>
                          <button role="switch" aria-checked={w.on} onClick={w.go} className="wv-gi" style={st("display:flex; align-items:center; gap:12px; min-height:44px; padding:0 10px; border-radius:11px; border:1px solid var(--border); background:transparent; text-align:start;")}>
                            <span style={st(w.track)}>
                              <span style={st(w.knob)}></span>
                            </span>
                            <span style={st("display:flex; flex-direction:column;")}>
                              <span style={st("font-size:14px; font-weight:800;")}>
                                {w.label}
                              </span>
                              <span style={st("font-size:12.5px; font-weight:500; color:var(--fg-muted);")}>
                                {w.sub}
                              </span>
                            </span>
                          </button>
                        </Fragment>
                      ))}
                      {" "}
                      {v.st.xferOn ? (
                        <>
                          <span style={st(v.s.lbl)}>
                            {tr("Bank details")}
                          </span>
                          {" "}
                          <span style={st(`${v.s.hint}margin-block-start:-8px;`)}>
                            {v.st.bankHint}
                          </span>
                          {" "}
                          <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:10px;")}>
                            {(v.st.bank ?? []).map((f: any, i_f: number) => (
                              <Fragment key={f.k ?? i_f}>
                                <label style={st(v.bo.fl)}>
                                  <span style={st(v.s.lbl)}>
                                    {f.k}
                                  </span>
                                  <input className="wv-fld" value={f.v ?? ""} onChange={f.on} style={st(`${v.bo.fld}font-family:var(--mono); font-size:13px;`)} />
                                </label>
                              </Fragment>
                            ))}
                          </div>
                        </>
                      ) : null}
                    </section>
                    {" "}
                    <section aria-labelledby="sru-h" style={st(v.bo.sec)}>
                      <h2 id="sru-h" style={st(v.bo.secH)}>
                        {tr("Rules")}
                      </h2>
                      {" "}
                      <dl style={st("margin:0; display:flex; flex-direction:column;")}>
                        {(v.st.rules ?? []).map((r: any, i_r: number) => (
                          <Fragment key={r.k ?? i_r}>
                            <div style={st("display:grid; grid-template-columns:150px minmax(0,1fr); gap:12px; padding-block:9px; border-block-end:1px solid var(--border);")}>
                              <dt style={st("font-size:13px; font-weight:800;")}>
                                {r.label}
                              </dt>
                              <dd style={st("margin:0; font-size:13.5px; font-weight:600; color:var(--fg-muted);")}>
                                {r.v}
                              </dd>
                            </div>
                          </Fragment>
                        ))}
                      </dl>
                      <button className="wv-gi" onClick={v.st.editRules} style={st(`${v.s.btnS}align-self:flex-start;`)}>
                        <Icon name={"square-pen"} style={st("width:14px;height:14px;")} />
                        {tr("Edit the rules")}
                      </button>
                      {" "}
                      <button role="switch" aria-checked={v.st.tonight.on} onClick={v.st.tonight.go} className="wv-gi" style={st("display:flex; align-items:center; gap:12px; min-height:44px; padding:0 10px; border-radius:11px; border:1px solid var(--border); background:transparent; text-align:start;")}>
                        <span style={st(v.st.tonight.track)}>
                          <span style={st(v.st.tonight.knob)}></span>
                        </span>
                        <span style={st("font-size:14px; font-weight:800;")}>
                          {tr("\"See you tonight\" at noon on the show day")}
                        </span>
                      </button>
                    </section>
                    {" "}
                    <section aria-labelledby="sdp-h" style={st(v.bo.sec)}>
                      <h2 id="sdp-h" style={st(v.bo.secH)}>
                        {tr("Defaults for new events")}
                      </h2>
                      {" "}
                      <div style={st(v.bo.fl)}>
                        <span style={st(v.s.lbl)}>
                          {tr("Age")}
                        </span>
                        <div role="radiogroup" aria-label={tr("Default age")} style={st(v.bo.segW)}>
                          {(v.st.ages ?? []).map((o: any, i_o: number) => (
                            <Fragment key={o.id ?? i_o}>
                              <button role="radio" aria-checked={o.on} onClick={o.go} style={st(o.style)}>
                                {o.id}
                              </button>
                            </Fragment>
                          ))}
                        </div>
                      </div>
                      {" "}
                      <div style={st(v.bo.fl)}>
                        <span style={st(v.s.lbl)}>
                          {tr("Refunds")}
                        </span>
                        <div role="radiogroup" aria-label={tr("Default refunds")} style={st(v.bo.segW)}>
                          {(v.st.refunds ?? []).map((o: any, i_o: number) => (
                            <Fragment key={o.id ?? i_o}>
                              <button role="radio" aria-checked={o.on} onClick={o.go} style={st(o.style)}>
                                {o.id}
                              </button>
                            </Fragment>
                          ))}
                        </div>
                      </div>
                    </section>
                    {" "}
                    <section aria-labelledby="sfs-h" style={st(v.bo.sec)}>
                      <h2 id="sfs-h" style={st(v.bo.secH)}>
                        {tr("Feature switches")}
                      </h2>
                      {" "}
                      <span style={st(`${v.s.hint}margin-block-start:-8px;`)}>
                        {tr("When one is off, every entry point for it disappears — on the audience pages and here.")}
                      </span>
                      {" "}
                      <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:8px;")}>
                        {(v.st.feats ?? []).map((w: any, i_w: number) => (
                          <Fragment key={w.id ?? i_w}>
                            <button role="switch" aria-checked={w.on} onClick={w.go} className="wv-gi" style={st("display:flex; align-items:center; gap:12px; min-height:44px; padding:0 10px; border-radius:11px; border:1px solid var(--border); background:transparent; text-align:start;")}>
                              <span style={st(w.track)}>
                                <span style={st(w.knob)}></span>
                              </span>
                              <span style={st("font-size:14px; font-weight:800;")}>
                                {w.label}
                              </span>
                            </button>
                          </Fragment>
                        ))}
                      </div>
                    </section>
                    {" "}
                    <section aria-labelledby="sdd-h" style={st(v.bo.sec)}>
                      <h2 id="sdd-h" style={st(v.bo.secH)}>
                        {tr("Door devices")}
                      </h2>
                      {" "}
                      {(v.st.devices ?? []).map((d: any, i_d: number) => (
                        <Fragment key={d.k ?? i_d}>
                          <div style={st("display:flex; gap:8px; align-items:center;")}>
                            <Icon name={"smartphone"} style={st("width:16px;height:16px;color:var(--fg-muted);")} />
                            <input className="wv-fld" aria-label={tr("Device name")} value={d.v ?? ""} onChange={d.on} style={st(`${v.bo.fld}max-width:280px;`)} />
                            <button className="wv-gi" onClick={d.del} aria-label={d.delLabel} style={st(`${v.s.btnS}min-height:36px;`)}>
                              <Icon name={"trash-2"} style={st("width:14px;height:14px;")} />
                              {tr("Remove")}
                            </button>
                          </div>
                        </Fragment>
                      ))}
                      {" "}
                      <button className="wv-gi" onClick={v.st.addDevice} style={st(`${v.s.btnS}align-self:flex-start;`)}>
                        <Icon name={"plus"} style={st("width:14px;height:14px;")} />
                        {tr("Add a device")}
                      </button>
                    </section>
                    {" "}
                    {v.st.dirty ? (
                      <>
                        <div className="wv-slide" style={st("position:sticky; inset-block-end:12px; display:flex; align-items:center; gap:10px; padding:10px 12px 10px 16px; border-radius:14px; background:var(--fg); color:var(--bg);")}>
                          <span style={st("flex:1; font-size:13.5px; font-weight:800;")}>
                            {tr("Unsaved changes")}
                          </span>
                          <button className="wv-btn" onClick={v.st.save} style={st(`${v.s.btnP}min-height:36px; font-size:13px;`)}>
                            {tr("Save settings")}
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                </>
              ) : null}
              {" "}
              {v.bo.s.door ? <DoorView d={v.dd} s={v.s} bo={v.bo} /> : null}
              {" "}
            </div>
          </div>
        </div>
      </>
    ) : null}
    </>
  );
}
