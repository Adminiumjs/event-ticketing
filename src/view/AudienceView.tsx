// Drawn from the Waveform design (its template ported to JSX): the layout, as drawn.
// Every value comes from the screens' values bag `v` (../app/vals/*.ts).
import { Fragment } from "react";

import { tr } from "../i18n/tr.ts";
import { Icon, roving, st, trx } from "./dom.tsx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function AudienceView({ v }: { v: any }) {
  return (
    <>
    <header style={st("position:sticky; inset-block-start:0; z-index:40; flex-shrink:0; background:var(--hdr); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); border-block-end:1px solid var(--border);")}>
      <div style={st(`max-width:1280px; margin-inline:auto; height:60px; padding-inline:${v.L.padX}; display:flex; align-items:center; gap:6px;`)}>
        <button className="wv-gi" onClick={v.goHome} aria-label={v.brandLabel} style={st("display:flex; flex-direction:column; align-items:flex-start; gap:3px; padding:6px 8px; margin-inline-start:-8px; border:0; border-radius:10px; background:transparent; color:var(--fg);")}>
          <span style={st("font-size:20px; font-weight:800; letter-spacing:-.055em; line-height:1;")}>
            {v.brand}
          </span>
          {" "}
          <img src={v.waveMark} alt="" style={st("display:block; width:88px; height:7px;")} />
        </button>
        {" "}
        {v.wide ? (
          <>
            <nav aria-label={tr("Main")} style={st("display:flex; gap:2px; margin-inline-start:18px;")}>
              {(v.nav ?? []).map((n: any, i_n: number) => (
                <Fragment key={n.id ?? i_n}>
                  <button className="wv-gi" onClick={n.go} aria-current={n.cur} style={st(n.style)}>
                    {n.label}
                  </button>
                </Fragment>
              ))}
            </nav>
          </>
        ) : null}
        {" "}
        <span style={st("flex:1;")}></span>
        {" "}
        <button className="wv-gi" onClick={v.toggleTheme} aria-label={v.themeLabel} title={v.themeLabel} style={st("width:38px; height:38px; border:0; border-radius:10px; background:transparent; color:var(--fg-muted); display:flex; align-items:center; justify-content:center;")}>
          <Icon name={v.themeIcon} style={st("width:17px;height:17px;")} />
        </button>
        {" "}
        {v.showSignIn ? (
          <>
            <button className="wv-gi" onClick={v.goSignIn} style={st("height:38px; padding-inline:12px; border:0; border-radius:10px; background:transparent; color:var(--fg); font-size:14px; font-weight:700;")}>
              {v.signInLabel}
            </button>
          </>
        ) : null}
        {" "}
        {v.signedIn ? (
          <>
            <button className="wv-btn" onClick={v.toggleAcct} aria-haspopup="menu" aria-expanded={v.acctOpen} aria-label={tr("Your account")} style={st(v.avatarStyle)}>
              {v.initials}
            </button>
          </>
        ) : null}
      </div>
    </header>
    {" "}
    <main style={st("flex:1 0 auto; display:flex; flex-direction:column;")}>
      {v.loading ? (
        <>
          <div aria-busy="true" aria-label={tr("Loading")} style={st(`max-width:1280px; width:100%; margin-inline:auto; padding:40px ${v.L.padX}; display:flex; flex-direction:column; gap:18px;`)}>
            <div className="wv-skel" style={st(`height:48px; background-image:${v.skelBg}; background-size:240px 48px; background-repeat:repeat-x;`)}></div>
            {" "}
            <div className="wv-pulse" style={st("height:180px; border-radius:18px; background:var(--surface-2);")}></div>
            {" "}
            <div className="wv-pulse" style={st("height:22px; width:40%; border-radius:8px; background:var(--surface-2);")}></div>
            {" "}
            <div className="wv-pulse" style={st("height:22px; width:65%; border-radius:8px; background:var(--surface-2);")}></div>
          </div>
        </>
      ) : null}
      {v.loadFailed ? (
        <div style={st(`max-width:1280px; width:100%; margin-inline:auto; padding:40px ${v.L.padX}; display:flex; flex-direction:column; gap:14px; align-items:flex-start;`)}>
          <div role="alert" style={st(v.s.aDanger)}>
            <Icon name={"circle-alert"} style={st("width:16px;height:16px;flex-shrink:0;margin-block-start:2px;color:var(--danger);")} />
            <span>{tr("We couldn't load this.")}</span>
          </div>
          <button className="wv-btn" onClick={v.retry} style={st(v.s.btnP)}>
            <Icon name={"refresh-cw"} style={st("width:16px;height:16px;")} />
            {tr("Try again")}
          </button>
        </div>
      ) : null}
      {" "}
      {v.scr.home ? (
        <>
          <div className="wv-screen" style={st(`display:flex; flex-direction:column; gap:${v.L.gapBig}; padding-block-end:48px;`)}>
            <section aria-labelledby="hero-h" style={st(`position:relative; border-block-end:1px solid var(--border); background:${v.hero.wash};`)}>
              <div style={st(`max-width:1280px; margin-inline:auto; padding:${v.L.heroPad}; display:grid; grid-template-columns:${v.L.heroCols}; gap:${v.L.heroGap}; align-items:center;`)}>
                <button className="wv-card" onClick={v.hero.open} aria-label={v.hero.posterLabel} style={st(`position:relative; display:block; width:100%; max-width:${v.L.heroPosterMax}; aspect-ratio:4/5; padding:0; border:0; border-radius:20px; overflow:hidden; container-type:inline-size; ${v.hero.p.bg}`)}>
                  <span style={st(v.hero.p.glyph)}>
                    {v.hero.p.letter}
                  </span>
                  {" "}
                  <span style={st("position:absolute; inset-block-start:6cqw; inset-inline-end:6cqw; display:inline-flex; align-items:center; min-height:28px; padding:0 11px; border-radius:999px; background:rgba(10,10,15,.72); color:#ffffff; font-family:var(--mono); font-size:max(12px, 3.4cqw); font-weight:700; letter-spacing:.06em;")}>
                    {v.hero.dateShort}
                  </span>
                  {" "}
                  <span style={st(v.hero.p.title)}>
                    {v.hero.name}
                  </span>
                </button>
                {" "}
                <div style={st("display:flex; flex-direction:column; gap:16px; min-width:0;")}>
                  <div style={st("display:flex; align-items:center; gap:10px; flex-wrap:wrap;")}>
                    <span style={st("font-size:12px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:var(--accent);")}>
                      {v.hero.eyebrow}
                    </span>
                    {" "}
                    <span style={st("display:inline-flex; align-items:center; gap:6px; height:26px; padding-inline:10px; border-radius:999px; background:var(--surface); border:1px solid var(--border-strong); font-family:var(--mono); font-size:12px; font-weight:600;")}>
                      <span className="wv-pulse" style={st("width:6px; height:6px; border-radius:50%; background:var(--pos);")}></span>
                      {v.hero.doorsIn}
                    </span>
                  </div>
                  {" "}
                  <h1 id="hero-h" style={st(`margin:0; font-size:${v.L.h1}; font-weight:800; letter-spacing:-.055em; line-height:.95; text-wrap:balance;`)}>
                    {v.hero.name}
                  </h1>
                  {" "}
                  <p style={st("margin:0; font-size:17px; font-weight:600; color:var(--fg-muted);")}>
                    {v.hero.supportTxt}
                  </p>
                  {" "}
                  <div style={st("font-family:var(--mono); font-size:14px; font-weight:600; color:var(--fg);")}>
                    {v.hero.when}
                  </div>
                  {" "}
                  <div style={st("display:flex; gap:6px; flex-wrap:wrap;")}>
                    <span style={st("display:inline-flex; align-items:center; gap:5px; min-height:26px; padding:0 10px; border-radius:999px; border:1px solid var(--border-strong); font-size:12px; font-weight:700; color:var(--fg-muted);")}>
                      <Icon name={"map-pin"} style={st("width:12px;height:12px;")} />
                      {v.hero.room}
                    </span>
                    {" "}
                    <span style={st("display:inline-flex; align-items:center; min-height:26px; padding:0 10px; border-radius:999px; border:1px solid var(--border-strong); font-size:12px; font-weight:700; color:var(--fg-muted);")}>
                      {v.hero.age}
                    </span>
                  </div>
                  {" "}
                  <div style={st("display:flex; flex-direction:column; gap:8px; padding:14px 16px; border-radius:16px; background:var(--surface); border:1px solid var(--border);")}>
                    <div style={st("display:flex; flex-wrap:wrap; gap:4px 16px; font-size:14px; font-weight:600; color:var(--fg-muted);")}>
                      {(v.hero.avail ?? []).map((a: any, i_a: number) => (
                        <Fragment key={a.id ?? i_a}>
                          <span>
                            {a.name}{": "}
                            <strong style={st(a.style)}>
                              {a.txt}
                            </strong>
                          </span>
                        </Fragment>
                      ))}
                    </div>
                    {" "}
                    {v.hero.paceOn ? <img src={v.hero.pace} alt={v.hero.paceAlt} style={st("display:block; width:100%; height:22px;")} /> : null}
                  </div>
                  {" "}
                  <div style={st("display:flex; gap:10px; flex-wrap:wrap;")}>
                    <button className="wv-btn" onClick={v.hero.open} style={st(v.s.btnP)}>
                      <Icon name={"ticket"} style={st("width:17px;height:17px;")} />
                      {tr("Get tickets")}
                    </button>
                    {" "}
                    <button className="wv-gi" onClick={v.hero.about} style={st(v.s.btnG)}>
                      {tr("About the night")}
                    </button>
                  </div>
                </div>
              </div>
            </section>
            {" "}
            <div style={st(`max-width:1280px; width:100%; margin-inline:auto; padding-inline:${v.L.padX}; display:flex; flex-direction:column; gap:${v.L.gapBig};`)}>
              <div style={st("display:flex; flex-direction:column; gap:12px;")}>
                <div role="group" aria-label={tr("Kind of night")} className="wv-hide" style={st("display:flex; gap:6px; overflow-x:auto; padding-block:2px;")}>
                  {(v.filters ?? []).map((f: any, i_f: number) => (
                    <Fragment key={f.id ?? i_f}>
                      <button className="wv-gi" onClick={f.go} aria-pressed={f.on} style={st(f.style)}>
                        {f.label}
                      </button>
                    </Fragment>
                  ))}
                </div>
                {" "}
                <div style={st("display:flex; gap:10px; flex-wrap:wrap; justify-content:space-between; align-items:center;")}>
                  <div role="group" aria-label={tr("Room")} style={st("display:flex; gap:3px; padding:3px; border-radius:12px; background:var(--surface-2); border:1px solid var(--border);")}>
                    {(v.rooms ?? []).map((r: any, i_r: number) => (
                      <Fragment key={r.id ?? i_r}>
                        <button onClick={r.go} aria-pressed={r.on} style={st(r.style)}>
                          {r.label}
                        </button>
                      </Fragment>
                    ))}
                  </div>
                  {" "}
                  <div role="group" aria-label={tr("View")} style={st("display:flex; gap:3px; padding:3px; border-radius:12px; background:var(--surface-2); border:1px solid var(--border);")}>
                    {(v.views ?? []).map((r: any, i_r: number) => (
                      <Fragment key={r.id ?? i_r}>
                        <button onClick={r.go} aria-pressed={r.on} style={st(r.style)}>
                          <Icon name={r.icon} style={st("width:14px;height:14px;")} />
                          {r.label}
                        </button>
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>
              {" "}
              {v.listView ? (
                <>
                  {v.week.length ? (
                    <>
                      <section aria-labelledby="wk-h" style={st("display:flex; flex-direction:column;")}>
                        <div style={st("display:flex; align-items:baseline; justify-content:space-between; gap:12px; padding-block-end:12px; border-block-end:2px solid var(--fg);")}>
                          <h2 id="wk-h" style={st(`margin:0; font-size:${v.L.h2}; font-weight:800; letter-spacing:-.045em;`)}>
                            {tr("This week")}
                          </h2>
                          {" "}
                          <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:600; color:var(--fg-subtle);")}>
                            {v.weekRange}
                          </span>
                        </div>
                        {" "}
                        {(v.week ?? []).map((e: any, i_e: number) => (
                          <Fragment key={e.id ?? i_e}>
                            <button className="wv-row" onClick={e.open} style={st(v.L.runRow)}>
                              <span style={st("display:flex; flex-direction:column; line-height:1; gap:3px; font-family:var(--mono);")}>
                                <span style={st("font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--accent);")}>
                                  {e.dow}
                                </span>
                                <span style={st(`font-size:${v.L.runNum}; font-weight:700; letter-spacing:-.05em;`)}>
                                  {e.dnum}
                                </span>
                                <span style={st("font-size:12px; font-weight:600; color:var(--fg-subtle);")}>
                                  {e.mon}
                                </span>
                              </span>
                              {" "}
                              <span style={st(`position:relative; display:block; width:100%; aspect-ratio:4/5; border-radius:10px; overflow:hidden; container-type:inline-size; ${e.p.bg}`)}>
                                <span style={st(e.p.glyph)}>
                                  {e.p.letter}
                                </span>
                              </span>
                              {" "}
                              <span style={st("min-width:0; display:flex; flex-direction:column; gap:6px;")}>
                                <span style={st(`font-size:${v.L.runName}; font-weight:800; letter-spacing:-.04em; line-height:1.02; text-wrap:balance;`)}>
                                  {e.name}
                                </span>
                                {" "}
                                <span style={st("font-size:13.5px; font-weight:600; color:var(--fg-muted); line-height:1.4;")}>
                                  {e.supportTxt}
                                </span>
                                {" "}
                                <span style={st("display:flex; gap:5px; flex-wrap:wrap; align-items:center;")}>
                                  <span style={st(v.s.chip)}>
                                    {e.room}
                                  </span>
                                  <span style={st(v.s.chip)}>
                                    {e.age}
                                  </span>
                                  {" "}
                                  <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:600; color:var(--fg); padding-inline-start:4px;")}>
                                    {e.price}
                                  </span>
                                </span>
                              </span>
                              {" "}
                              <span style={st(e.statusStyle)}>
                                <Icon name={e.statusIcon} style={st("width:13px;height:13px;")} />
                                {e.status}
                              </span>
                            </button>
                          </Fragment>
                        ))}
                      </section>
                    </>
                  ) : null}
                  {" "}
                  {v.festBand ? (
                    <>
                      <button className="wv-card" onClick={v.goFest} style={st(`position:relative; display:flex; flex-direction:column; justify-content:flex-end; gap:12px; min-height:${v.L.bandH}; padding:${v.L.bandPad}; border:0; border-radius:24px; overflow:hidden; text-align:start; container-type:inline-size; ${v.fest.p.bg}`)}>
                        <span style={st(v.fest.p.glyph)}>
                          {v.fest.p.letter}
                        </span>
                        {" "}
                        <span style={st(`position:relative; font-family:var(--mono); font-size:13px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:${v.fest.p.ink};`)}>
                          {v.fest.eyebrow}
                        </span>
                        {" "}
                        <span style={st(`position:relative; font-size:${v.L.bandTitle}; font-weight:800; letter-spacing:-.06em; line-height:.88; text-transform:uppercase; color:${v.fest.p.ink}; text-wrap:balance;`)}>
                          {v.fest.name}
                        </span>
                        {" "}
                        <span style={st("position:relative; display:flex; flex-wrap:wrap; gap:10px; align-items:center;")}>
                          <span style={st(`font-size:15px; font-weight:700; color:${v.fest.p.ink};`)}>
                            {v.fest.line}
                          </span>
                          {" "}
                          <span style={st(`display:inline-flex; align-items:center; gap:6px; height:36px; padding-inline:14px; border-radius:999px; background:${v.fest.p.ink}; color:${v.fest.p.base}; font-size:13.5px; font-weight:800;`)}>
                            {v.festCta}
                            <Icon name={"arrow-right"} style={st("width:15px;height:15px;")} />
                          </span>
                        </span>
                      </button>
                    </>
                  ) : null}
                  {" "}
                  {v.soon.length ? (
                    <>
                      <section aria-labelledby="soon-h" style={st("display:flex; flex-direction:column; gap:14px;")}>
                        <div style={st("display:flex; align-items:baseline; gap:12px;")}>
                          <h2 id="soon-h" style={st(`margin:0; font-size:${v.L.h2}; font-weight:800; letter-spacing:-.045em;`)}>
                            {tr("On sale soon")}
                          </h2>
                          <span style={st("font-size:13.5px; font-weight:600; color:var(--fg-subtle);")}>
                            {tr("We'll only email you once.")}
                          </span>
                        </div>
                        {" "}
                        <div style={st(`display:grid; grid-template-columns:repeat(auto-fill,minmax(${v.L.soonMin},1fr)); gap:16px;`)}>
                          {(v.soon ?? []).map((e: any, i_e: number) => (
                            <Fragment key={e.id ?? i_e}>
                              <div style={st("display:flex; flex-direction:column; gap:10px;")}>
                                <button className="wv-card" onClick={e.open} aria-label={e.name} style={st(`position:relative; display:block; width:100%; aspect-ratio:4/5; padding:0; border:0; border-radius:16px; overflow:hidden; container-type:inline-size; ${e.p.bg}`)}>
                                  <span style={st(e.p.glyph)}>
                                    {e.p.letter}
                                  </span>
                                  {" "}
                                  <span style={st("position:absolute; inset-block-start:10px; inset-inline-end:10px; display:inline-flex; align-items:center; gap:5px; height:26px; padding-inline:9px; border-radius:999px; background:rgba(10,10,15,.72); color:#fff; font-family:var(--mono); font-size:11.5px; font-weight:700;")}>
                                    <Icon name={"clock"} style={st("width:12px;height:12px;")} />
                                    {e.countdown}
                                  </span>
                                  {" "}
                                  <span style={st(e.p.title)}>
                                    {e.name}
                                  </span>
                                </button>
                                {" "}
                                <div style={st("display:flex; flex-direction:column; gap:3px;")}>
                                  <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:600; color:var(--fg-muted);")}>
                                    {e.date}{" · "}{e.room}
                                  </span>
                                  <span style={st("font-size:13px; font-weight:700; color:var(--info);")}>
                                    {e.status}
                                  </span>
                                </div>
                                {" "}
                                <button className="wv-gi" onClick={e.remind} style={st(`${v.s.btnS}align-self:flex-start;`)}>
                                  <Icon name={"bell"} style={st("width:14px;height:14px;")} />
                                  {tr("Remind me")}
                                </button>
                              </div>
                            </Fragment>
                          ))}
                        </div>
                      </section>
                    </>
                  ) : null}
                  {" "}
                  {v.coming.length ? (
                    <>
                      <section aria-labelledby="cu-h" style={st("display:flex; flex-direction:column;")}>
                        <div style={st("display:flex; align-items:baseline; justify-content:space-between; gap:12px; padding-block-end:12px; border-block-end:2px solid var(--fg);")}>
                          <h2 id="cu-h" style={st(`margin:0; font-size:${v.L.h2}; font-weight:800; letter-spacing:-.045em;`)}>
                            {tr("Coming up")}
                          </h2>
                          {" "}
                          <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:600; color:var(--fg-subtle);")}>
                            {v.localTime}
                          </span>
                        </div>
                        {" "}
                        {(v.coming ?? []).map((e: any, i_e: number) => (
                          <Fragment key={e.id ?? i_e}>
                            <button className="wv-row" onClick={e.open} style={st(v.L.runRow)}>
                              <span style={st("display:flex; flex-direction:column; line-height:1; gap:3px; font-family:var(--mono);")}>
                                <span style={st("font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--accent);")}>
                                  {e.dow}
                                </span>
                                <span style={st(`font-size:${v.L.runNum}; font-weight:700; letter-spacing:-.05em;`)}>
                                  {e.dnum}
                                </span>
                                <span style={st("font-size:12px; font-weight:600; color:var(--fg-subtle);")}>
                                  {e.mon}
                                </span>
                              </span>
                              {" "}
                              <span style={st(`position:relative; display:block; width:100%; aspect-ratio:4/5; border-radius:10px; overflow:hidden; container-type:inline-size; ${e.p.bg}`)}>
                                <span style={st(e.p.glyph)}>
                                  {e.p.letter}
                                </span>
                              </span>
                              {" "}
                              <span style={st("min-width:0; display:flex; flex-direction:column; gap:6px;")}>
                                <span style={st(`font-size:${v.L.runName}; font-weight:800; letter-spacing:-.04em; line-height:1.02; text-wrap:balance;`)}>
                                  {e.name}
                                </span>
                                {" "}
                                <span style={st("font-size:13.5px; font-weight:600; color:var(--fg-muted); line-height:1.4;")}>
                                  {e.supportTxt}
                                </span>
                                {" "}
                                <span style={st("display:flex; gap:5px; flex-wrap:wrap; align-items:center;")}>
                                  <span style={st(v.s.chip)}>
                                    {e.room}
                                  </span>
                                  <span style={st(v.s.chip)}>
                                    {e.age}
                                  </span>
                                  {" "}
                                  <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:600; color:var(--fg); padding-inline-start:4px;")}>
                                    {e.price}
                                  </span>
                                </span>
                              </span>
                              {" "}
                              <span style={st(e.statusStyle)}>
                                <Icon name={e.statusIcon} style={st("width:13px;height:13px;")} />
                                {e.status}
                              </span>
                            </button>
                          </Fragment>
                        ))}
                      </section>
                    </>
                  ) : null}
                  {" "}
                  {v.announced.length ? (
                    <>
                      <section aria-labelledby="ja-h" style={st("display:flex; flex-direction:column; gap:14px;")}>
                        <h2 id="ja-h" style={st(`margin:0; font-size:${v.L.h2}; font-weight:800; letter-spacing:-.045em;`)}>
                          {tr("Just announced")}
                        </h2>
                        {" "}
                        <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr)); gap:16px;")}>
                          {(v.announced ?? []).map((e: any, i_e: number) => (
                            <Fragment key={e.id ?? i_e}>
                              <button className="wv-card" onClick={e.open} style={st("display:grid; grid-template-columns:minmax(0,150px) minmax(0,1fr); gap:18px; align-items:center; padding:12px; border-radius:20px; border:1px solid var(--border); background:var(--surface); color:var(--fg); text-align:start;")}>
                                <span style={st(`position:relative; display:block; aspect-ratio:4/5; border-radius:12px; overflow:hidden; container-type:inline-size; ${e.p.bg}`)}>
                                  <span style={st(e.p.glyph)}>
                                    {e.p.letter}
                                  </span>
                                  <span style={st(e.p.title)}>
                                    {e.name}
                                  </span>
                                </span>
                                {" "}
                                <span style={st("display:flex; flex-direction:column; gap:8px; min-width:0;")}>
                                  <span style={st("font-family:var(--mono); font-size:13px; font-weight:700; color:var(--accent);")}>
                                    {e.date}
                                  </span>
                                  {" "}
                                  <span style={st("font-size:24px; font-weight:800; letter-spacing:-.045em; line-height:1;")}>
                                    {e.name}
                                  </span>
                                  {" "}
                                  <span style={st("font-size:13.5px; font-weight:600; color:var(--fg-muted);")}>
                                    {e.supportTxt}
                                  </span>
                                  {" "}
                                  <span style={st("display:flex; gap:6px; flex-wrap:wrap; align-items:center;")}>
                                    <span style={st(v.s.chip)}>
                                      {e.room}
                                    </span>
                                    <span style={st(e.statusStyle)}>
                                      <Icon name={e.statusIcon} style={st("width:13px;height:13px;")} />
                                      {e.status}
                                    </span>
                                  </span>
                                </span>
                              </button>
                            </Fragment>
                          ))}
                        </div>
                      </section>
                    </>
                  ) : null}
                  {" "}
                  {v.emptyList ? (
                    <>
                      <div style={st("display:flex; flex-direction:column; align-items:center; text-align:center; gap:14px; padding:64px 20px; border-radius:24px; border:1px dashed var(--border-strong);")}>
                        <h2 style={st("margin:0; font-size:24px; font-weight:800; letter-spacing:-.04em;")}>
                          {tr("Nothing like that coming up")}
                        </h2>
                        {" "}
                        <p style={st("margin:0; font-size:15px; font-weight:500; color:var(--fg-muted);")}>
                          {tr("Try another kind of night, or the other room.")}
                        </p>
                        {" "}
                        <button className="wv-btn" onClick={v.clearFilters} style={st(v.s.btnP)}>
                          {tr("Show everything")}
                        </button>
                      </div>
                    </>
                  ) : null}
                </>
              ) : null}
              {" "}
              {v.calView ? (
                <>
                  <section aria-labelledby="cal-h" style={st("display:flex; flex-direction:column; gap:14px;")}>
                    <div style={st("display:flex; align-items:center; gap:10px;")}>
                      <h2 id="cal-h" style={st(`margin:0; flex:1; font-size:${v.L.h2}; font-weight:800; letter-spacing:-.045em;`)}>
                        {v.cal.title}
                      </h2>
                      {" "}
                      <button className="wv-gi" onClick={v.cal.prev} disabled={v.cal.prevOff} aria-label={tr("Previous month")} style={st("width:40px; height:40px; border-radius:12px; border:1px solid var(--border-strong); background:var(--surface); display:flex; align-items:center; justify-content:center;")}>
                        <Icon name={"chevron-left"} style={st("width:18px;height:18px;")} />
                      </button>
                      {" "}
                      <button className="wv-gi" onClick={v.cal.next} disabled={v.cal.nextOff} aria-label={tr("Next month")} style={st("width:40px; height:40px; border-radius:12px; border:1px solid var(--border-strong); background:var(--surface); display:flex; align-items:center; justify-content:center;")}>
                        <Icon name={"chevron-right"} style={st("width:18px;height:18px;")} />
                      </button>
                    </div>
                    {" "}
                    <div role="grid" aria-labelledby="cal-h" onKeyDown={(e) => roving(e, "[data-cal-day]", { row: 7 })} style={st("display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:4px;")}>
                      <div role="row" style={st("display:contents;")}>
                        {(v.cal.heads ?? []).map((h: any, i_h: number) => (
                          <span key={i_h} role="columnheader" style={st("padding:6px 4px; font-family:var(--mono); font-size:11.5px; font-weight:700; color:var(--fg-subtle); text-transform:uppercase; text-align:center;")}>
                            {h}
                          </span>
                        ))}
                      </div>
                      {(v.cal.weeks ?? []).map((wk: any) => (
                        <div key={wk.k} role="row" style={st("display:contents;")}>
                          {(wk.cells ?? []).map((c: any, i_c: number) => (
                            <div key={c.k ?? i_c} role="gridcell" style={st("display:contents;")}>
                              {c.blank ? (
                                <span style={st(c.style)}></span>
                              ) : (
                                <button data-cal-day="1" tabIndex={c.tab} onClick={c.open ?? undefined} aria-disabled={c.off ? true : undefined} aria-label={c.label} style={st(c.style)}>
                                  <span style={st("font-family:var(--mono); font-size:13px; font-weight:700;")}>
                                    {c.num}
                                  </span>
                                  {" "}
                                  <span style={st("display:flex; flex-direction:column; gap:3px; width:100%;")}>
                                    {(c.evs ?? []).map((d: any, i_d: number) => (
                                      <Fragment key={d.id ?? i_d}>
                                        <span style={st("display:flex; align-items:center; gap:5px; min-width:0;")}>
                                          <span style={st(`width:8px; height:8px; flex-shrink:0; border-radius:50%; background:${d.dot};`)}></span>
                                          {v.wide ? (
                                            <span style={st("font-size:11.5px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;")}>
                                              {d.name}
                                            </span>
                                          ) : null}
                                        </span>
                                      </Fragment>
                                    ))}
                                  </span>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
      {" "}
      {v.pl.on ? (
        <>
          <div className="wv-screen" style={st(`display:flex; flex-direction:column; --glow:${v.pl.glow};`)}>
            <section style={st(`background:${v.pl.wash}; border-block-end:1px solid var(--border);`)}>
              <div style={st(`max-width:1280px; margin-inline:auto; padding:${v.L.evHeadPad}; display:flex; flex-direction:column; gap:20px;`)}>
                <button className="wv-gi" onClick={v.goHome} style={st(`${v.s.btnT}align-self:flex-start; color:var(--fg-muted);`)}>
                  <Icon name={"arrow-left"} style={st("width:15px;height:15px;")} />
                  {tr("What's on")}
                </button>
                {" "}
                <div style={st(`position:relative; width:100%; aspect-ratio:${v.L.cropRatio}; border-radius:22px; overflow:hidden; container-type:inline-size; ${v.pl.p.bg}`)}>
                  <span style={st(v.pl.p.glyph)}>
                    {v.pl.p.letter}
                  </span>
                  {" "}
                  <span style={st(`position:absolute; inset-inline-start:4cqw; inset-block-end:3.4cqw; max-width:80%; font-size:${v.L.cropTitle}; font-weight:800; letter-spacing:-.06em; line-height:.86; text-transform:uppercase; color:${v.pl.p.ink}; text-wrap:balance;`)}>
                    {v.pl.name}
                  </span>
                  {" "}
                  <span style={st("position:absolute; inset-block-start:3cqw; inset-inline-end:3cqw; display:inline-flex; align-items:center; gap:6px; height:28px; padding-inline:11px; border-radius:999px; background:rgba(10,10,15,.72); color:#fff; font-family:var(--mono); font-size:12px; font-weight:700;")}>
                    {v.pl.badge}
                  </span>
                </div>
                {" "}
                {v.pl.bannerOn ? (
                  <>
                    <div role="status" style={st(v.pl.bannerStyle)}>
                      <Icon name={v.pl.bannerIcon} style={st(`width:18px;height:18px;flex-shrink:0;margin-block-start:2px;color:${v.pl.bannerColor};`)} />
                      <span>
                        <strong style={st("font-weight:800;")}>
                          {v.pl.bannerHead}
                        </strong>
                        {" "}{v.pl.bannerTxt}
                      </span>
                    </div>
                  </>
                ) : null}
                {" "}
                <div style={st("display:flex; flex-direction:column; gap:12px;")}>
                  <h1 style={st(`margin:0; font-size:${v.L.h1}; font-weight:800; letter-spacing:-.055em; line-height:.95; text-wrap:balance;`)}>
                    {v.pl.name}
                  </h1>
                  {" "}
                  <p style={st("margin:0; font-size:17px; font-weight:600; color:var(--fg-muted);")}>
                    {v.pl.supportTxt}
                  </p>
                </div>
                {" "}
                <dl style={st("margin:0; display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:1px; border-radius:16px; overflow:hidden; border:1px solid var(--border); background:var(--border);")}>
                  {(v.pl.facts ?? []).map((f: any, i_f: number) => (
                    <Fragment key={f.k ?? i_f}>
                      <div style={st("display:flex; flex-direction:column; gap:4px; padding:12px 14px; background:var(--surface);")}>
                        <dt style={st(v.s.eyebrow)}>
                          {f.k}
                        </dt>
                        <dd style={st("margin:0; font-family:var(--mono); font-size:15px; font-weight:700;")}>
                          {f.v}
                        </dd>
                      </div>
                    </Fragment>
                  ))}
                </dl>
                {" "}
                <div style={st("display:flex; gap:8px; flex-wrap:wrap; align-items:center;")}>
                  <span style={st(`${v.s.chip}min-height:30px; font-size:12.5px;`)}>
                    <Icon name={"map-pin"} style={st("width:13px;height:13px;")} />
                    {v.pl.room}
                  </span>
                  {" "}
                  <span style={st(`${v.s.chip}min-height:30px; font-size:12.5px;`)}>
                    <Icon name={"id-card"} style={st("width:13px;height:13px;")} />
                    {v.pl.ageLong}
                  </span>
                  {" "}
                  <span style={st(`${v.s.chip}min-height:30px; font-size:12.5px;`)}>
                    <Icon name={"users"} style={st("width:13px;height:13px;")} />
                    {v.pl.ga}
                  </span>
                  {" "}
                  <span style={st("flex:1;")}></span>
                  {" "}
                  <button className="wv-gi" onClick={v.pl.share} style={st(v.s.btnS)}>
                    <Icon name={"share-2"} style={st("width:14px;height:14px;")} />
                    {tr("Share")}
                  </button>
                  {" "}
                  {v.pl.calOn ? (
                    <>
                      <button className="wv-gi" onClick={v.pl.ics} style={st(v.s.btnS)}>
                        <Icon name={"calendar-plus"} style={st("width:14px;height:14px;")} />
                        {tr("Add to calendar")}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </section>
            {" "}
            <div style={st(`max-width:1280px; width:100%; margin-inline:auto; padding:${v.L.evBodyPad}; display:grid; grid-template-columns:${v.L.evCols}; gap:40px; align-items:start;`)}>
              <div style={st("min-width:0; display:flex; flex-direction:column; gap:40px;")}>
                {v.pl.isFest ? (
                  <>
                    {v.tt.on ? (
                      <>
                        <section aria-labelledby="tt-h" style={st("display:flex; flex-direction:column; gap:14px;")}>
                          <div style={st("display:flex; align-items:center; gap:12px; flex-wrap:wrap;")}>
                            <h2 id="tt-h" style={st(`${v.s.h2}flex:1;`)}>
                              {tr("Timetable")}
                            </h2>
                            {" "}
                            <div role="tablist" aria-label={tr("Day")} onKeyDown={(e) => roving(e, "[role=tab]", { pick: (el) => el.click() })} style={st("display:flex; gap:3px; padding:3px; border-radius:12px; background:var(--surface-2); border:1px solid var(--border);")}>
                              {(v.tt.days ?? []).map((d: any, i_d: number) => (
                                <Fragment key={d.id ?? i_d}>
                                  <button role="tab" id={`tt-day-${String(d.id)}`} aria-selected={d.on} aria-controls="tt-panel" tabIndex={d.on ? 0 : -1} onClick={d.go} style={st(d.style)}>
                                    {d.label}
                                  </button>
                                </Fragment>
                              ))}
                            </div>
                          </div>
                          {" "}
                          <p style={st(`${v.s.hint}margin:0;`)}>
                            {v.tt.hint}
                          </p>
                          {" "}
                          <div id="tt-panel" role="tabpanel" aria-labelledby={v.tt.curTab} style={st("position:relative;")}>
                            <div style={st("display:grid; grid-template-columns:52px 40px minmax(0,1fr) minmax(0,1fr); gap:0 8px;")}>
                              <span></span>
                              <span></span>
                              <span id="tt-r1" style={st(`${v.s.eyebrow}padding-block-end:8px;`)}>
                                {v.tt.mainName}
                              </span>
                              <span id="tt-r2" style={st(`${v.s.eyebrow}padding-block-end:8px;`)}>
                                {v.tt.annexName}
                              </span>
                              {" "}
                              <div style={st(`position:relative; height:${v.tt.h};`)}>
                                {(v.tt.hours ?? []).map((h: any, i_h: number) => (
                                  <Fragment key={h.k ?? i_h}>
                                    <span style={st(h.style)}>
                                      {h.k}
                                    </span>
                                  </Fragment>
                                ))}
                              </div>
                              {" "}
                              <div aria-hidden="true"></div>
                              {" "}
                              <div role="list" aria-labelledby="tt-r1" style={st(`position:relative; height:${v.tt.h}; border-radius:12px; background:${v.tt.grid};`)}>
                                {(v.tt.main ?? []).map((b: any, i_b: number) => (
                                  <Fragment key={b.id ?? i_b}>
                                    <div role="listitem" style={st(b.style)}>
                                      <div style={st("display:flex; align-items:flex-start; gap:6px;")}>
                                        <span style={st("flex:1; min-width:0; display:flex; flex-direction:column; gap:2px;")}>
                                          <span style={st("font-size:13.5px; font-weight:800; letter-spacing:-.02em; line-height:1.15;")}>
                                            {b.name}
                                          </span>
                                          <span style={st("font-family:var(--mono); font-size:11px; font-weight:600; color:var(--fg-muted);")}>
                                            {b.time}
                                          </span>
                                        </span>
                                        <button className="wv-gi" onClick={b.star} aria-pressed={b.pressed} aria-label={b.starLabel} style={st(b.starStyle)}>
                                          <Icon name={"star"} style={st("width:15px;height:15px;")} />
                                        </button>
                                      </div>
                                      {b.clash ? (
                                        <>
                                          <span style={st("display:flex; gap:4px; font-size:11px; font-weight:800; color:var(--warn); line-height:1.3;")}>
                                            <Icon name={"triangle-alert"} style={st("width:12px;height:12px;flex-shrink:0;")} />
                                            {b.clashTxt}
                                          </span>
                                        </>
                                      ) : null}
                                    </div>
                                  </Fragment>
                                ))}
                              </div>
                              {" "}
                              <div role="list" aria-labelledby="tt-r2" style={st(`position:relative; height:${v.tt.h}; border-radius:12px; background:${v.tt.grid};`)}>
                                {(v.tt.annex ?? []).map((b: any, i_b: number) => (
                                  <Fragment key={b.id ?? i_b}>
                                    <div role="listitem" style={st(b.style)}>
                                      <div style={st("display:flex; align-items:flex-start; gap:6px;")}>
                                        <span style={st("flex:1; min-width:0; display:flex; flex-direction:column; gap:2px;")}>
                                          <span style={st("font-size:13.5px; font-weight:800; letter-spacing:-.02em; line-height:1.15;")}>
                                            {b.name}
                                          </span>
                                          <span style={st("font-family:var(--mono); font-size:11px; font-weight:600; color:var(--fg-muted);")}>
                                            {b.time}
                                          </span>
                                        </span>
                                        <button className="wv-gi" onClick={b.star} aria-pressed={b.pressed} aria-label={b.starLabel} style={st(b.starStyle)}>
                                          <Icon name={"star"} style={st("width:15px;height:15px;")} />
                                        </button>
                                      </div>
                                      {b.clash ? (
                                        <>
                                          <span style={st("display:flex; gap:4px; font-size:11px; font-weight:800; color:var(--warn); line-height:1.3;")}>
                                            <Icon name={"triangle-alert"} style={st("width:12px;height:12px;flex-shrink:0;")} />
                                            {b.clashTxt}
                                          </span>
                                        </>
                                      ) : null}
                                    </div>
                                  </Fragment>
                                ))}
                              </div>
                            </div>
                            {" "}
                            {v.tt.nowOn ? (
                              <>
                                <div aria-hidden="true" style={st(`position:absolute; inset-inline-start:60px; inset-inline-end:0; inset-block-start:${v.tt.nowTop}; display:flex; align-items:center; gap:0; pointer-events:none;`)}>
                                  <span style={st("width:48px; font-family:var(--mono); font-size:10.5px; font-weight:800; color:var(--danger);")}>
                                    {v.tt.nowTxt}
                                  </span>
                                  <span style={st("flex:1; height:2px; background:var(--danger);")}></span>
                                </div>
                              </>
                            ) : null}
                          </div>
                        </section>
                        {" "}
                        <section aria-labelledby="mw-h" style={st("display:flex; flex-direction:column; gap:12px; padding:18px; border-radius:18px; border:1px solid var(--border); background:var(--surface);")}>
                          <div style={st("display:flex; align-items:baseline; gap:10px;")}>
                            <h2 id="mw-h" style={st(`${v.s.h2}font-size:19px; flex:1;`)}>
                              {tr("My weekend")}
                            </h2>
                            <span style={st(v.s.hint)}>
                              {v.tt.savedTxt}
                            </span>
                          </div>
                          {" "}
                          {v.tt.mineEmpty ? (
                            <>
                              <p style={st(`${v.s.p}font-size:14px;`)}>
                                {tr("Nothing starred yet. Tap a star in the timetable.")}
                              </p>
                            </>
                          ) : null}
                          {" "}
                          {(v.tt.mine ?? []).map((m: any, i_m: number) => (
                            <Fragment key={m.id ?? i_m}>
                              <div style={st("display:grid; grid-template-columns:86px minmax(0,1fr) auto; gap:12px; align-items:center; padding-block:10px; border-block-start:1px solid var(--border);")}>
                                <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:700; line-height:1.4;")}>
                                  {m.day}
                                  <br />
                                  {m.time}
                                </span>
                                {" "}
                                <span style={st("display:flex; flex-direction:column; gap:2px; min-width:0;")}>
                                  <span style={st("font-size:14.5px; font-weight:800;")}>
                                    {m.name}
                                  </span>
                                  <span style={st("font-size:12.5px; font-weight:600; color:var(--fg-muted);")}>
                                    {m.room}
                                  </span>
                                  {m.clash ? (
                                    <>
                                      <span style={st("display:flex; gap:5px; font-size:12px; font-weight:800; color:var(--warn);")}>
                                        <Icon name={"triangle-alert"} style={st("width:13px;height:13px;")} />
                                        {m.clashTxt}
                                      </span>
                                    </>
                                  ) : null}
                                </span>
                                {" "}
                                <button className="wv-gi" onClick={m.star} aria-label={m.unLabel} style={st("width:36px; height:36px; border-radius:10px; border:0; background:transparent; color:var(--fg-subtle); display:flex; align-items:center; justify-content:center;")}>
                                  <Icon name={"x"} style={st("width:15px;height:15px;")} />
                                </button>
                              </div>
                            </Fragment>
                          ))}
                        </section>
                      </>
                    ) : null}
                  </>
                ) : null}
                {" "}
                <section id="about" aria-labelledby="ab-h" style={st("display:flex; flex-direction:column; gap:12px;")}>
                  <h2 id="ab-h" style={st(v.s.h2)}>
                    {tr("About")}
                  </h2>
                  <p style={st(`${v.s.p}font-size:16.5px; max-width:64ch;`)}>
                    {v.pl.about}
                  </p>
                </section>
                {" "}
                {v.pl.lineupOn ? (
                  <>
                    <section aria-labelledby="lu-h" style={st("display:flex; flex-direction:column; gap:14px;")}>
                      <h2 id="lu-h" style={st(v.s.h2)}>
                        {tr("Lineup and set times")}
                      </h2>
                      {" "}
                      {v.pl.setsOn ? (
                        <>
                          <div style={st("display:flex; flex-direction:column; gap:10px;")}>
                            <div style={st("position:relative; height:46px; border-radius:12px; background:var(--surface-2); border:1px solid var(--border); overflow:hidden;")}>
                              {(v.pl.setBars ?? []).map((b: any, i_b: number) => (
                                <Fragment key={b.name ?? i_b}>
                                  <span style={st(b.style)}>
                                    {b.short}
                                  </span>
                                </Fragment>
                              ))}
                            </div>
                            {" "}
                            {(v.pl.setBars ?? []).map((b: any, i_b: number) => (
                              <Fragment key={b.name ?? i_b}>
                                <div style={st("display:flex; justify-content:space-between; gap:12px; padding-block:8px; border-block-end:1px solid var(--border);")}>
                                  <span style={st("font-size:15px; font-weight:800;")}>
                                    {b.name}
                                  </span>
                                  <span style={st("font-family:var(--mono); font-size:13.5px; font-weight:600; color:var(--fg-muted);")}>
                                    {b.time}
                                  </span>
                                </div>
                              </Fragment>
                            ))}
                          </div>
                        </>
                      ) : null}
                      {" "}
                      {v.pl.setsOff ? (
                        <>
                          <div style={st("display:flex; flex-direction:column; gap:0;")}>
                            {(v.pl.acts ?? []).map((a: any, i_a: number) => (
                              <Fragment key={a ?? i_a}>
                                <div style={st("padding-block:10px; border-block-end:1px solid var(--border); font-size:15px; font-weight:800;")}>
                                  {a}
                                </div>
                              </Fragment>
                            ))}
                          </div>
                          {" "}
                          <p style={st(`${v.s.hint}margin:0; display:flex; gap:6px; align-items:center;`)}>
                            <Icon name={"clock"} style={st("width:14px;height:14px;")} />
                            {tr("Set times go up on the day.")}
                          </p>
                        </>
                      ) : null}
                    </section>
                  </>
                ) : null}
                {" "}
                <section id="getting-there" aria-labelledby="gt-h" style={st("display:flex; flex-direction:column; gap:14px;")}>
                  <h2 id="gt-h" style={st(v.s.h2)}>
                    {tr("Getting there")}
                  </h2>
                  {" "}
                  <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr)); gap:18px; align-items:start;")}>
                    <div style={st("display:flex; flex-direction:column; gap:12px;")}>
                      <div style={st("font-size:15px; font-weight:800;")}>
                        {v.venueAddress}
                      </div>
                      {" "}
                      {(v.venueFacts ?? []).map((f: any, i_f: number) => (
                        <Fragment key={i_f}>
                          <div style={st("display:flex; gap:10px; align-items:flex-start; font-size:14px; font-weight:500; line-height:1.55; color:var(--fg-muted);")}>
                            <Icon name={f.icon} style={st("width:16px;height:16px;flex-shrink:0;margin-block-start:2px;color:var(--fg);")} />
                            <span>
                              {f.txt}
                            </span>
                          </div>
                        </Fragment>
                      ))}
                      <button className="wv-gi" onClick={v.directions} style={st(`${v.s.btnS}align-self:flex-start;`)}>
                        <Icon name={"navigation"} style={st("width:15px;height:15px;")} />
                        {tr("Get directions")}
                      </button>
                    </div>
                  </div>
                </section>
                {" "}
                <section aria-labelledby="gk-h" style={st("display:flex; flex-direction:column; gap:10px;")}>
                  <h2 id="gk-h" style={st(v.s.h2)}>
                    {tr("Good to know")}
                  </h2>
                  {" "}
                  <dl style={st("margin:0; display:flex; flex-direction:column;")}>
                    {(v.pl.good ?? []).map((g: any, i_g: number) => (
                      <Fragment key={g.k ?? i_g}>
                        <div style={st(`display:grid; grid-template-columns:${v.L.goodCols}; gap:4px 18px; padding-block:12px; border-block-end:1px solid var(--border);`)}>
                          <dt style={st("font-size:14px; font-weight:800;")}>
                            {g.k}
                          </dt>
                          <dd style={st("margin:0; font-size:14px; font-weight:500; line-height:1.6; color:var(--fg-muted);")}>
                            {g.v}
                          </dd>
                        </div>
                      </Fragment>
                    ))}
                  </dl>
                </section>
                {" "}
                <section aria-labelledby="qa-h" style={st("display:flex; flex-direction:column; gap:10px;")}>
                  <h2 id="qa-h" style={st(v.s.h2)}>
                    {tr("Questions")}
                  </h2>
                  {" "}
                  {(v.pl.faq ?? []).map((q: any, i_q: number) => (
                    <Fragment key={q.q ?? i_q}>
                      <details style={st("border-block-end:1px solid var(--border);")}>
                        <summary style={st("display:flex; align-items:center; gap:10px; padding-block:14px; font-size:15px; font-weight:800;")}>
                          <span style={st("flex:1;")}>
                            {q.q}
                          </span>
                          <Icon name={"chevron-down"} className="wv-chev" style={st("width:17px;height:17px;transition:transform .2s;")} />
                        </summary>
                        <p style={st(`${v.s.p}font-size:14px; padding-block-end:14px;`)}>
                          {q.a}
                        </p>
                      </details>
                    </Fragment>
                  ))}
                </section>
                {" "}
                <section aria-labelledby="on-h" style={st("display:flex; flex-direction:column; gap:14px;")}>
                  <h2 id="on-h" style={st(v.s.h2)}>
                    {v.pl.otherTitle}
                  </h2>
                  {" "}
                  <div style={st(`display:grid; grid-template-columns:repeat(auto-fill,minmax(${v.L.otherMin},1fr)); gap:14px;`)}>
                    {(v.pl.others ?? []).map((e: any, i_e: number) => (
                      <Fragment key={e.id ?? i_e}>
                        <button className="wv-card" onClick={e.open} style={st("display:flex; flex-direction:column; gap:10px; padding:0; border:0; background:transparent; color:var(--fg); text-align:start;")}>
                          <span style={st(`position:relative; display:block; width:100%; aspect-ratio:4/5; border-radius:14px; overflow:hidden; container-type:inline-size; ${e.p.bg}`)}>
                            <span style={st(e.p.glyph)}>
                              {e.p.letter}
                            </span>
                            <span style={st(e.p.title)}>
                              {e.name}
                            </span>
                          </span>
                          {" "}
                          <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:600; color:var(--fg-muted);")}>
                            {e.date}
                          </span>
                          {" "}
                          <span style={st(e.statusStyle)}>
                            <Icon name={e.statusIcon} style={st("width:13px;height:13px;")} />
                            {e.status}
                          </span>
                        </button>
                      </Fragment>
                    ))}
                  </div>
                </section>
              </div>
              {" "}
              <aside aria-label={tr("Tickets")} style={st(v.pn.wrap)}>
                <div id="panel" style={st(v.pn.box)}>
                  {v.narrow ? (
                    <>
                      <div style={st("display:flex; justify-content:center; padding-block-end:4px;")}>
                        <span style={st("width:40px; height:4px; border-radius:2px; background:var(--border-strong);")}></span>
                      </div>
                    </>
                  ) : null}
                  {" "}
                  <div style={st("display:flex; align-items:center; gap:10px;")}>
                    <h2 style={st(`${v.s.h2}font-size:20px; flex:1;`)}>
                      {v.pn.title}
                    </h2>
                    {" "}
                    {v.narrow ? (
                      <>
                        <button className="wv-gi" onClick={v.pn.close} aria-label={tr("Close")} style={st("width:36px; height:36px; border-radius:10px; border:0; background:var(--surface-2); display:flex; align-items:center; justify-content:center;")}>
                          <Icon name={"x"} style={st("width:16px;height:16px;")} />
                        </button>
                      </>
                    ) : null}
                  </div>
                  {" "}
                  <div style={st("display:flex; flex-direction:column; gap:4px;")}>
                    {v.pn.paceOn ? <img src={v.pn.pace} alt={v.pn.paceAlt} style={st("display:block; width:100%; height:24px;")} /> : null}
                    <span style={st("font-size:12px; font-weight:700; color:var(--fg-subtle);")}>
                      {v.pn.gaLabel}
                      {v.pn.leftOn ? (
                        <>
                          {" · "}
                          <span style={st("font-family:var(--mono);")}>
                            {v.pn.leftTxt}
                          </span>
                        </>
                      ) : null}
                    </span>
                  </div>
                  {" "}
                  {v.pn.bannerOn ? (
                    <>
                      <div role="status" style={st(v.pn.bannerStyle)}>
                        <Icon name={v.pn.bannerIcon} style={st(`width:16px;height:16px;flex-shrink:0;margin-block-start:2px;color:${v.pn.bannerColor};`)} />
                        <span>
                          {v.pn.banner}
                        </span>
                      </div>
                    </>
                  ) : null}
                  {" "}
                  {v.pn.waitOn ? (
                    <>
                      <button className="wv-btn" onClick={v.pn.join} style={st(`${v.s.btnP}width:100%;`)}>
                        <Icon name={"list-plus"} style={st("width:16px;height:16px;")} />
                        {tr("Join the waitlist")}
                      </button>
                    </>
                  ) : null}
                  {" "}
                  {v.pn.offerOn ? (
                    <>
                      <div role="status" style={st("display:flex; flex-direction:column; gap:12px; padding:16px; border-radius:16px; background:var(--accent-soft); border:1px solid var(--border);")}>
                        <span style={st("display:flex; gap:10px; align-items:flex-start; font-size:14.5px; font-weight:800; line-height:1.45;")}>
                          <Icon name={"hourglass"} style={st("width:17px;height:17px;flex-shrink:0;margin-block-start:2px;color:var(--accent);")} />
                          <span>
                            {v.pn.offerTxt}{" "}
                            <span style={st("font-family:var(--mono);")}>
                              {v.pn.offerUntil}
                            </span>
                          </span>
                        </span>
                        <button className="wv-btn" onClick={v.pn.claim} style={st(`${v.s.btnP}width:100%;`)}>
                          {tr("Claim them")}
                          <Icon name={"arrow-right"} style={st("width:16px;height:16px;")} />
                        </button>
                      </div>
                    </>
                  ) : null}
                  {" "}
                  {v.pn.waitingOn ? (
                    <>
                      <div role="status" style={st(v.s.aPos)}>
                        <Icon name={"list-checks"} style={st("width:16px;height:16px;flex-shrink:0;margin-block-start:2px;color:var(--pos);")} />
                        <span>
                          {v.pn.waitingTxt}
                        </span>
                      </div>
                    </>
                  ) : null}
                  {" "}
                  <div role="list" style={st("display:flex; flex-direction:column;")}>
                    {(v.pn.rows ?? []).map((r: any, i_r: number) => (
                      <Fragment key={r.id ?? i_r}>
                        <div role="listitem" style={st("display:grid; grid-template-columns:minmax(0,1fr) auto; gap:6px 14px; padding-block:14px; border-block-start:1px solid var(--border);")}>
                          <div style={st("display:flex; flex-direction:column; gap:4px; min-width:0;")}>
                            <div style={st("display:flex; align-items:center; gap:8px; flex-wrap:wrap;")}>
                              <span style={st("font-size:15px; font-weight:800; letter-spacing:-.02em;")}>
                                {r.name}
                              </span>
                              {r.unlocked ? (
                                <>
                                  <span style={st("display:inline-flex; align-items:center; gap:4px; min-height:22px; padding:0 8px; border-radius:999px; background:var(--accent-soft); color:var(--accent); font-size:11px; font-weight:800;")}>
                                    <Icon name={"key-round"} style={st("width:11px;height:11px;")} />
                                    {tr("Unlocked with")}{" "}{r.code}
                                  </span>
                                </>
                              ) : null}
                            </div>
                            {" "}
                            <span style={st("font-size:13px; font-weight:500; color:var(--fg-muted); line-height:1.45;")}>
                              {r.desc}
                            </span>
                            {" "}
                            <span style={st("display:flex; align-items:center; gap:5px; font-size:12.5px; font-weight:700; color:var(--fg-subtle);")}>
                              <Icon name={r.payIcon} style={st("width:13px;height:13px;")} />
                              {r.pay}
                            </span>
                            {" "}
                            {r.lowOn ? (
                              <>
                                <span style={st("font-size:12.5px; font-weight:800; color:var(--warn);")}>
                                  {r.low}
                                </span>
                              </>
                            ) : null}
                            {" "}
                            {r.noteOn ? (
                              <>
                                <span style={st(r.noteStyle)}>
                                  {r.note}
                                </span>
                              </>
                            ) : null}
                          </div>
                          {" "}
                          <div style={st("display:flex; flex-direction:column; align-items:flex-end; gap:8px;")}>
                            <span style={st("font-family:var(--mono); font-size:15px; font-weight:700;")}>
                              {r.price}
                            </span>
                            {" "}
                            {r.stepOn ? (
                              <>
                                <div role="group" aria-label={r.qtyLabel} style={st("display:flex; align-items:center; gap:2px; height:40px; border:1px solid var(--border-strong); border-radius:12px; padding:3px; background:var(--surface);")}>
                                  <button className="wv-gi" onClick={r.dec} disabled={r.decOff} aria-label={r.decLabel} style={st(v.s.stepBtn)}>
                                    <Icon name={"minus"} style={st("width:15px;height:15px;")} />
                                  </button>
                                  {" "}
                                  <span aria-live="polite" style={st("min-width:26px; height:24px; overflow:hidden; text-align:center; font-family:var(--mono); font-size:15px; font-weight:700;")}>
                                    {(r.roll ?? []).map((q: any, i_q: number) => (
                                      <Fragment key={q.k ?? i_q}>
                                        <span className="wv-roll">
                                          {q.v}
                                        </span>
                                      </Fragment>
                                    ))}
                                  </span>
                                  {" "}
                                  <button className="wv-gi" onClick={r.inc} disabled={r.incOff} aria-label={r.incLabel} style={st(v.s.stepBtn)}>
                                    <Icon name={"plus"} style={st("width:15px;height:15px;")} />
                                  </button>
                                </div>
                                {" "}
                                <span style={st("font-size:11.5px; font-weight:700; color:var(--fg-subtle);")}>
                                  {r.maxTxt}
                                </span>
                              </>
                            ) : null}
                            {" "}
                            {r.stateOn ? (
                              <>
                                <span style={st(r.stateStyle)}>
                                  {r.stateTxt}
                                </span>
                              </>
                            ) : null}
                            {" "}
                            {r.remindOn ? (
                              <>
                                <button className="wv-gi" onClick={r.remind} style={st(`${v.s.btnS}min-height:32px;`)}>
                                  <Icon name={"bell"} style={st("width:13px;height:13px;")} />
                                  {tr("Remind me")}
                                </button>
                              </>
                            ) : null}
                          </div>
                          {" "}
                          {r.limitOn ? (
                            <>
                              <div role="alert" style={st("grid-column:1 / -1; display:flex; gap:6px; font-size:12.5px; font-weight:700; color:var(--danger);")}>
                                <Icon name={"circle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                                {r.limitTxt}
                              </div>
                            </>
                          ) : null}
                        </div>
                      </Fragment>
                    ))}
                  </div>
                  {" "}
                  {v.pn.codeOn ? (
                    <>
                      <div style={st("display:flex; flex-direction:column; gap:8px; padding-block-start:12px; border-block-start:1px solid var(--border);")}>
                        {v.pn.codeClosed ? (
                          <>
                            <button className="wv-gi" onClick={v.pn.openCode} aria-expanded="false" style={st(`${v.s.btnT}align-self:flex-start;`)}>
                              <Icon name={"ticket-percent"} style={st("width:15px;height:15px;")} />
                              {v.pn.codePrompt}
                            </button>
                          </>
                        ) : null}
                        {" "}
                        {v.pn.codeOpen ? (
                          <>
                            <form onSubmit={v.pn.applyCode} style={st("display:flex; flex-direction:column; gap:6px;")}>
                              <label htmlFor="code-in" style={st(v.s.lbl)}>
                                {tr("Code")}
                              </label>
                              {" "}
                              <div style={st("display:flex; gap:8px;")}>
                                <input id="code-in" className="wv-fld" value={v.pn.codeIn ?? ""} onChange={v.pn.onCode} aria-invalid={v.pn.codeErr} aria-describedby="code-err" autoComplete="off" spellCheck="false" style={st(`${v.pn.codeFld}font-family:var(--mono); text-transform:uppercase; letter-spacing:.06em;`)} />
                                <button className="wv-btn" type="submit" style={st(v.s.btnG)}>
                                  {tr("Apply")}
                                </button>
                              </div>
                              {" "}
                              {v.pn.codeErr ? (
                                <>
                                  <span id="code-err" role="alert" style={st(v.s.err)}>
                                    <Icon name={"circle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                                    {v.pn.codeErrTxt}
                                  </span>
                                </>
                              ) : null}
                            </form>
                          </>
                        ) : null}
                        {" "}
                        {v.pn.discOn ? (
                          <>
                            <span style={st("display:inline-flex; align-self:flex-start; align-items:center; gap:5px; min-height:26px; padding:0 10px; border-radius:999px; background:var(--pos-soft); color:var(--pos); font-size:12px; font-weight:800;")}>
                              <Icon name={"badge-percent"} style={st("width:13px;height:13px;")} />
                              {v.pn.discTxt}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                  {" "}
                  {v.pn.buyOn ? (
                    <>
                      <div style={st("display:flex; flex-direction:column; gap:10px; padding-block-start:14px; border-block-start:1px solid var(--border);")}>
                        <div style={st("display:flex; align-items:baseline; justify-content:space-between; gap:10px;")}>
                          <span style={st("font-size:14px; font-weight:800;")}>
                            {tr("Total")}
                          </span>
                          <span aria-live="polite" style={st("font-family:var(--mono); font-size:22px; font-weight:700; letter-spacing:-.02em;")}>
                            {v.pn.total}
                          </span>
                        </div>
                        {" "}
                        <button className="wv-btn" onClick={v.pn.cont} disabled={v.pn.contOff} style={st(`${v.s.btnP}width:100%; min-height:50px;`)}>
                          {v.pn.contLabel}
                          <Icon name={"arrow-right"} style={st("width:16px;height:16px;")} />
                        </button>
                        {" "}
                        <p style={st("margin:0; font-size:12.5px; font-weight:700; color:var(--fg-muted); text-align:center;")}>
                          {v.pn.noFees}
                        </p>
                      </div>
                    </>
                  ) : null}
                  {" "}
                  <p style={st("margin:0; font-size:11.5px; font-weight:600; color:var(--fg-subtle); text-align:center;")}>
                    {v.pn.localTime}
                  </p>
                </div>
              </aside>
            </div>
            {" "}
            {v.pl.barOn ? (
              <>
                <div style={st("position:sticky; inset-block-end:64px; z-index:20; margin-block-start:24px; padding:10px 16px; background:var(--hdr); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); border-block-start:1px solid var(--border); display:flex; align-items:center; gap:12px;")}>
                  <span style={st("flex:1; min-width:0; display:flex; flex-direction:column; gap:2px;")}>
                    <span style={st("font-family:var(--mono); font-size:15px; font-weight:700;")}>
                      {v.pn.fromTxt}
                    </span>
                    <span style={st("font-size:12px; font-weight:700; color:var(--fg-muted);")}>
                      {v.pn.barSub}
                    </span>
                  </span>
                  {" "}
                  <button className="wv-btn" onClick={v.pn.openSheet} style={st(v.s.btnP)}>
                    <Icon name={"ticket"} style={st("width:16px;height:16px;")} />
                    {v.pn.barCta}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </>
      ) : null}
      {" "}
      {v.scr.checkout ? (
        <>
          <div className="wv-screen" style={st(`max-width:1180px; width:100%; margin-inline:auto; padding:${v.co.pad}; display:flex; flex-direction:column; gap:20px;`)}>
            <button className="wv-gi" onClick={v.co.back} style={st(`${v.s.btnT}align-self:flex-start; color:var(--fg-muted);`)}>
              <Icon name={"arrow-left"} style={st("width:15px;height:15px;")} />
              {tr("Back to")}{" "}{v.co.evShort}
            </button>
            {" "}
            <h1 id="co-h" tabIndex={-1} style={st(`margin:0; font-size:${v.L.h2}; font-weight:800; letter-spacing:-.045em; outline:none;`)}>
              {tr("Checkout")}
            </h1>
            {" "}
            <ol aria-label={tr("Progress")} style={st("display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; list-style:none; margin:0; padding:0;")}>
              {(v.co.steps ?? []).map((step: any, i_step: number) => (
                <Fragment key={step.label ?? i_step}>
                  <li aria-current={step.cur} style={st("display:flex; flex-direction:column; gap:6px;")}>
                    <span style={st(step.bar)}></span>
                    <span style={st(step.lbl)}>
                      {step.label}
                    </span>
                  </li>
                </Fragment>
              ))}
            </ol>
            {" "}
            <div style={st(`display:grid; grid-template-columns:${v.co.cols}; gap:28px; align-items:start;`)}>
              <form onSubmit={v.co.submit} noValidate={true} style={st("min-width:0; display:flex; flex-direction:column; gap:22px;")}>
                <fieldset style={st("margin:0; padding:20px; border-radius:18px; border:1px solid var(--border); background:var(--surface); display:flex; flex-direction:column; gap:14px;")}>
                  <legend style={st(`${v.s.h2}font-size:19px; padding:0; float:inline-start; width:100%;`)}>
                    {tr("Your details")}
                  </legend>
                  {" "}
                  {v.co.locked ? (
                    <>
                      <div style={st("display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:14px; background:var(--surface-2);")}>
                        <Icon name={"lock"} style={st("width:16px;height:16px;color:var(--fg-subtle);")} />
                        {" "}
                        <span style={st("flex:1; min-width:0; display:flex; flex-direction:column; gap:2px;")}>
                          <span style={st("font-size:15px; font-weight:800;")}>
                            {v.co.meName}
                          </span>
                          <span style={st("font-family:var(--mono); font-size:13px; color:var(--fg-muted);")}>
                            {v.co.meEmail}
                          </span>
                        </span>
                        {" "}
{v.co.notYouOn ? (
                        <button type="button" className="wv-gi" onClick={v.co.notYou} style={st(v.s.btnT)}>
                          {tr("Not you?")}
                        </button>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                  {" "}
                  {v.co.guest ? (
                    <>
                      <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr)); gap:14px;")}>
                        <label style={st("display:flex; flex-direction:column; gap:6px;")}>
                          <span style={st(v.s.lbl)}>
                            {tr("Your name")}
                          </span>
                          <input id="f-name" className="wv-fld" autoComplete="name" value={v.co.bName ?? ""} onChange={v.co.onBName} readOnly={v.co.detailsOff} aria-invalid={v.co.eNameOn} aria-describedby="e-name" style={st(v.co.fName)} />
                          {v.co.eNameOn ? (
                            <>
                              <span id="e-name" style={st(v.s.err)}>
                                <Icon name={"circle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                                {v.co.eName}
                              </span>
                            </>
                          ) : null}
                        </label>
                        {" "}
                        <label style={st("display:flex; flex-direction:column; gap:6px;")}>
                          <span style={st(v.s.lbl)}>
                            {tr("Email")}
                          </span>
                          <input id="f-email" className="wv-fld" type="email" autoComplete="email" value={v.co.bEmail ?? ""} onChange={v.co.onBEmail} readOnly={v.co.detailsOff} aria-invalid={v.co.eEmailOn} aria-describedby="e-email-hint e-email" style={st(`${v.co.fEmail}font-family:var(--mono); font-size:14px;`)} />
                          {v.co.eEmailOn ? (
                            <>
                              <span id="e-email" style={st(v.s.err)}>
                                <Icon name={"circle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                                {v.co.eEmail}
                              </span>
                            </>
                          ) : null}
                        </label>
                      </div>
                      {" "}
                      <span id="e-email-hint" style={st(v.s.hint)}>
                        {tr("Your tickets and your order's link go to this address.")}
                      </span>
                    </>
                  ) : null}
                  {" "}
                  {v.co.detailsStep ? (
                    <>
                      {v.co.checkOn ? (
                        <>
                          <div role="status" style={st("display:flex; align-items:center; gap:8px; font-size:13px; font-weight:700; color:var(--fg-subtle);")}>
                            {v.co.checkRun ? (
                              <>
                                <span className="wv-pulse" style={st("width:8px; height:8px; border-radius:50%; background:var(--fg-subtle);")}></span>
                              </>
                            ) : null}
                            {v.co.checkOk ? (
                              <>
                                <Icon name={"shield-check"} style={st("width:15px;height:15px;color:var(--pos);")} />
                              </>
                            ) : null}
                            {v.co.checkTxt}
                          </div>
                        </>
                      ) : null}
                      {" "}
                      {v.co.qLast ? (
                        <>
                          <div role="alert" style={st(`${v.s.aWarn}flex-direction:column; gap:12px;`)}>
                            <span style={st("display:flex; gap:10px; align-items:flex-start;")}>
                              <Icon name={"zap"} style={st("width:17px;height:17px;flex-shrink:0;margin-block-start:2px;color:var(--warn);")} />
                              <span style={st("font-weight:800;")}>
                                {v.co.qLastTxt}
                              </span>
                            </span>
                            {" "}
                            <div style={st("display:flex; gap:8px; flex-wrap:wrap;")}>
                              {v.co.qLastTake ? (
                                <>
                                  <button type="button" className="wv-btn" onClick={v.co.takeLast} style={st(`${v.s.btnP}min-height:40px;`)}>
                                    {v.co.qLastBtn}
                                  </button>
                                </>
                              ) : null}
                              <button type="button" className="wv-gi" onClick={v.co.backToTix} style={st(`${v.s.btnG}min-height:40px;`)}>
                                {tr("Back to tickets")}
                              </button>
                            </div>
                          </div>
                        </>
                      ) : null}
                      {" "}
                      {v.co.qCode ? (
                        <>
                          <div role="alert" style={st(`${v.s.aWarn}flex-direction:column; gap:12px;`)}>
                            <span style={st("display:flex; gap:10px; align-items:flex-start;")}>
                              <Icon name={"ticket-x"} style={st("width:17px;height:17px;flex-shrink:0;margin-block-start:2px;color:var(--warn);")} />
                              <span style={st("font-weight:800;")}>
                                {v.co.qCodeTxt}
                              </span>
                            </span>
                            {" "}
                            <div style={st("display:flex; gap:8px; flex-wrap:wrap;")}>
                              <button type="button" className="wv-btn" onClick={v.co.takeCode} style={st(`${v.s.btnP}min-height:40px;`)}>
                                {v.co.qCodeBtn}
                              </button>
                              <button type="button" className="wv-gi" onClick={v.co.backToTix} style={st(`${v.s.btnG}min-height:40px;`)}>
                                {tr("Back")}
                              </button>
                            </div>
                          </div>
                        </>
                      ) : null}
                      {" "}
                      {v.co.failOn ? (
                        <div role="alert" style={st(v.s.aDanger)}>
                          <Icon name={"circle-alert"} style={st("width:17px;height:17px;flex-shrink:0;margin-block-start:2px;color:var(--danger);")} />
                          <span>{v.co.failTxt}</span>
                        </div>
                      ) : null}
                      <button type="button" className="wv-btn" onClick={v.co.hold} disabled={v.co.holdOff} aria-busy={v.co.busy} style={st(`${v.s.btnP}width:100%; min-height:52px; font-size:15.5px;`)}>
                        <Icon name={"timer"} style={st("width:17px;height:17px;")} />
                        {v.co.holdLabelTxt}
                      </button>
                    </>
                  ) : null}
                </fieldset>
                {" "}
                {v.co.heldOn ? (
                  <>
                    <fieldset disabled={v.co.goneOn} aria-hidden={v.co.goneOn} className="wv-slide" style={st(`margin:0; padding:0; border:0; min-width:0; display:flex; flex-direction:column; gap:22px; ${v.co.dim}`)}>
                      <fieldset style={st("margin:0; padding:20px; border-radius:18px; border:1px solid var(--border); background:var(--surface); display:flex; flex-direction:column; gap:14px;")}>
                        <legend style={st(`${v.s.h2}font-size:19px; padding:0; float:inline-start; width:100%;`)}>
                          {tr("Names on tickets")}
                        </legend>
                        {" "}
                        <span style={st(`${v.s.hint}margin-block-start:-6px;`)}>
                          {tr("Names go on the tickets — you can change them later.")}
                        </span>
                        {" "}
                        {(v.co.tix ?? []).map((t: any, i_t: number) => (
                          <Fragment key={t.k ?? i_t}>
                            <div style={st("display:flex; flex-direction:column; gap:10px; padding-block-start:14px; border-block-start:1px solid var(--border);")}>
                              <label style={st("display:flex; flex-direction:column; gap:6px;")}>
                                <span style={st("display:flex; align-items:center; gap:8px;")}>
                                  <span style={st(`${v.s.lbl}flex:1;`)}>
                                    {t.label}
                                  </span>
                                  {t.mineOn ? (
                                    <>
                                      <button type="button" className="wv-gi" onClick={t.useMine} style={st(`${v.s.btnT}min-height:28px;`)}>
                                        {tr("Use my name")}
                                      </button>
                                    </>
                                  ) : null}
                                </span>
                                {" "}
                                <input id={t.fid} className="wv-fld" value={t.name ?? ""} onChange={t.onName} aria-invalid={t.errOn} aria-describedby={t.eid} placeholder={tr("Full name")} style={st(t.fld)} />
                                {" "}
                                {t.errOn ? (
                                  <>
                                    <span id={t.eid} style={st(v.s.err)}>
                                      <Icon name={"circle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                                      {t.err}
                                    </span>
                                  </>
                                ) : null}
                              </label>
                              {" "}
                              {(t.qs ?? []).map((q: any) => (
                                <Fragment key={q.id}>
                                  {q.kind === "text" ? (
                                    <label style={st("display:flex; flex-direction:column; gap:6px;")}>
                                      <span style={st(v.s.lbl)}>{q.text}</span>
                                      <input id={q.gid} className="wv-fld" value={q.value ?? ""} onChange={q.onText} aria-invalid={q.errOn} aria-describedby={q.eid} style={st(q.fld)} />
                                    </label>
                                  ) : (
                                    <div role="radiogroup" aria-labelledby={q.gid} aria-describedby={q.errOn ? q.eid : undefined} style={st(q.kind === "yes_no" ? "display:flex; align-items:center; gap:10px; flex-wrap:wrap;" : "display:flex; flex-direction:column; gap:6px;")}>
                                      <span id={q.gid} style={st(v.s.lbl)}>
                                        {q.text}
                                      </span>
                                      <div style={st(q.kind === "yes_no" ? "display:flex; gap:3px; padding:3px; border-radius:11px; background:var(--surface-2); border:1px solid var(--border);" : "display:flex; flex-wrap:wrap; gap:6px;")}>
                                        {(q.options ?? []).map((o: any, i_o: number) => (
                                          <Fragment key={o.id ?? i_o}>
                                            <button type="button" role="radio" aria-checked={o.on} onClick={o.go} style={st(o.style)}>
                                              {o.label}
                                            </button>
                                          </Fragment>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {q.errOn ? (
                                    <span id={q.eid} style={st(v.s.err)}>
                                      <Icon name={"circle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                                      {q.err}
                                    </span>
                                  ) : null}
                                </Fragment>
                              ))}
                            </div>
                          </Fragment>
                        ))}
                      </fieldset>
                      {" "}
                      <fieldset style={st("margin:0; padding:20px; border-radius:18px; border:1px solid var(--border); background:var(--surface); display:flex; flex-direction:column; gap:14px;")}>
                        <legend style={st(`${v.s.h2}font-size:19px; padding:0; float:inline-start; width:100%;`)}>
                          {tr("Anything else")}
                        </legend>
                        {" "}
                        <label style={st("display:flex; flex-direction:column; gap:6px;")}>
                          <span style={st("display:flex; align-items:center; gap:8px; flex-wrap:wrap;")}>
                            <span style={st(v.s.lbl)}>
                              {tr("Need a companion ticket or level access? Tell us here")}
                            </span>
                            <span style={st(v.s.chip)}>
                              <Icon name={"lock"} style={st("width:11px;height:11px;")} />
                              {tr("Only the box office sees this")}
                            </span>
                          </span>
                          <textarea className="wv-fld" rows={2} value={v.co.access} onChange={v.co.onAccess} placeholder={tr("Optional")} style={st(`${v.s.fld}padding-block:12px; min-height:72px; resize:vertical; font-weight:500;`)}></textarea>
                        </label>
                        {" "}
                        {(v.co.orderQs ?? []).map((q: any) => (
                          <Fragment key={q.id}>
                            {q.kind === "text" ? (
                              <label style={st("display:flex; flex-direction:column; gap:6px;")}>
                                <span style={st(v.s.lbl)}>{q.text}</span>
                                <input id={q.gid} className="wv-fld" value={q.value ?? ""} onChange={q.onText} aria-invalid={q.errOn} aria-describedby={q.eid} style={st(q.fld)} />
                              </label>
                            ) : (
                              <div role="radiogroup" aria-labelledby={q.gid} style={st("display:flex; flex-direction:column; gap:6px;")}>
                                <span id={q.gid} style={st(v.s.lbl)}>{q.text}</span>
                                <div style={st(q.kind === "yes_no" ? "display:flex; gap:3px; padding:3px; border-radius:11px; background:var(--surface-2); border:1px solid var(--border); align-self:flex-start;" : "display:flex; flex-wrap:wrap; gap:6px;")}>
                                  {(q.options ?? []).map((o: any, i_o: number) => (
                                    <Fragment key={o.id ?? i_o}>
                                      <button type="button" role="radio" aria-checked={o.on} onClick={o.go} style={st(o.style)}>
                                        {o.label}
                                      </button>
                                    </Fragment>
                                  ))}
                                </div>
                              </div>
                            )}
                            {q.errOn ? (
                              <span id={q.eid} style={st(v.s.err)}>
                                <Icon name={"circle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                                {q.err}
                              </span>
                            ) : null}
                          </Fragment>
                        ))}
                        <button type="button" role="checkbox" aria-checked={v.co.optIn} onClick={v.co.toggleOpt} className="wv-gi" style={st("display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:12px; border:1px solid var(--border); background:transparent; font-size:14px; font-weight:700; text-align:start;")}>
                          <span style={st(v.co.boxStyle)}>
                            {v.co.optIn ? (
                              <>
                                <Icon name={"check"} style={st("width:13px;height:13px;")} />
                              </>
                            ) : null}
                          </span>
                          {v.co.optLabel}
                        </button>
                      </fieldset>
                      {" "}
                      {v.co.payOn ? (
                        <>
                          <fieldset style={st("margin:0; padding:20px; border-radius:18px; border:1px solid var(--border); background:var(--surface); display:flex; flex-direction:column; gap:12px;")}>
                            <legend style={st(`${v.s.h2}font-size:19px; padding:0; float:inline-start; width:100%;`)}>
                              {tr("How you'll pay")}
                            </legend>
                            {" "}
                            <div role="radiogroup" aria-label={tr("How you'll pay")} style={st("display:flex; flex-direction:column; gap:8px;")}>
                              {(v.co.pays ?? []).map((p: any, i_p: number) => (
                                <Fragment key={p.id ?? i_p}>
                                  <button type="button" role="radio" aria-checked={p.on} onClick={p.go} style={st(p.style)}>
                                    <span style={st(p.dot)}></span>
                                    {" "}
                                    <Icon name={p.icon} style={st("width:18px;height:18px;flex-shrink:0;margin-block-start:1px;")} />
                                    {" "}
                                    <span style={st("display:flex; flex-direction:column; gap:3px; min-width:0;")}>
                                      <span style={st("font-size:15px; font-weight:800;")}>
                                        {p.title}
                                      </span>
                                      <span style={st("font-size:13.5px; font-weight:500; color:var(--fg-muted); line-height:1.5;")}>
                                        {p.desc}
                                      </span>
                                    </span>
                                  </button>
                                </Fragment>
                              ))}
                            </div>
                            {" "}
                            {v.co.xferNoteOn ? (
                              <>
                                <span style={st(v.s.hint)}>
                                  {v.co.xferNote}
                                </span>
                              </>
                            ) : null}
                          </fieldset>
                        </>
                      ) : null}
                      {" "}
                      {v.co.errSum ? (
                        <>
                          <div role="alert" style={st(v.s.aDanger)}>
                            <Icon name={"circle-alert"} style={st("width:17px;height:17px;flex-shrink:0;margin-block-start:2px;color:var(--danger);")} />
                            <span>
                              {v.co.errSumTxt}
                            </span>
                          </div>
                        </>
                      ) : null}
                      {" "}
                      {v.co.failOn ? (
                        <div role="alert" style={st(v.s.aDanger)}>
                          <Icon name={"circle-alert"} style={st("width:17px;height:17px;flex-shrink:0;margin-block-start:2px;color:var(--danger);")} />
                          <span>{v.co.failTxt}</span>
                        </div>
                      ) : null}
                      <div style={st("display:flex; flex-direction:column; gap:10px; padding-block-end:24px;")}>
                        <button type="submit" className="wv-btn" disabled={v.co.busy} aria-busy={v.co.busy} style={st(`${v.s.btnP}width:100%; min-height:54px; font-size:16px;`)}>
                          {v.co.cta}
                        </button>
                        {" "}
                        <span style={st(`${v.s.hint}text-align:center;`)}>
                          {tr("We email your order straight away. No booking fees.")}
                        </span>
                      </div>
                    </fieldset>
                  </>
                ) : null}
                {" "}
                {v.co.goneOn ? (
                  <>
                    <div role="alert" style={st(`${v.s.aWarn}flex-direction:column; gap:12px; position:relative; z-index:2;`)}>
                      <span style={st("display:flex; gap:10px; align-items:flex-start;")}>
                        <Icon name={"timer-off"} style={st("width:17px;height:17px;flex-shrink:0;margin-block-start:2px;color:var(--warn);")} />
                        <span>
                          <strong style={st("font-weight:800;")}>
                            {tr("We let those tickets go.")}
                          </strong>
                          {" "}{v.co.goneTxt}
                        </span>
                      </span>
                      {" "}
                      <button type="button" className="wv-btn" onClick={v.co.checkAgain} style={st(`${v.s.btnP}align-self:flex-start; min-height:40px;`)}>
                        <Icon name={"refresh-cw"} style={st("width:15px;height:15px;")} />
                        {tr("Check again")}
                      </button>
                    </div>
                  </>
                ) : null}
                {" "}
                {v.co.mailOn ? (
                  <>
                    <section aria-labelledby="co-mail" className="wv-slide" style={st("display:flex; flex-direction:column; gap:14px; padding:22px; border-radius:18px; border:1px solid var(--border); background:var(--accent-soft);")}>
                      <div style={st("display:flex; align-items:center; gap:10px;")}>
                        <Icon name={"mail"} style={st("width:19px;height:19px;color:var(--accent);")} />
                        <h2 id="co-mail" tabIndex={-1} style={st(`${v.s.h2}font-size:20px; outline:none;`)}>
                          {tr("One more step")}
                        </h2>
                      </div>
                      {" "}
                      <p style={st(`${v.s.p}font-size:15px; color:var(--fg);`)}>
                        {trx("We've sent a link to {email}. Open it to confirm your order and see our bank details.", { email: <span style={st("font-family:var(--mono);")}>{v.co.masked}</span> })}
                      </p>
                      <p style={st(`${v.s.hint}margin:0;`)}>
                        {trx("Press the button in that email by {time} — until then your tickets are held for you.", { time: <span style={st("font-family:var(--mono);")}>{v.co.confirmBy}</span> })}
                      </p>
                      {" "}
                      <div style={st("display:flex; gap:8px; flex-wrap:wrap; align-items:center;")}>
                        {v.co.otherPayOn ? (
                          <>
                            <button type="button" className="wv-gi" onClick={v.co.otherPay} style={st(v.s.btnT)}>
                              {tr("Use a different way to pay")}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </section>
                  </>
                ) : null}
              </form>
              {" "}
              <aside aria-label={tr("Order summary")} style={st(v.co.asideStyle)}>
                {v.narrow ? (
                  <>
                    <button className="wv-gi" onClick={v.co.toggleSum} aria-expanded={v.co.sumOpen} aria-controls="co-sum" style={st("display:flex; align-items:center; gap:10px; width:100%; min-height:52px; padding:0 14px; border:0; background:transparent; font-size:14px; font-weight:800;")}>
                      <Icon name={"shopping-bag"} style={st("width:16px;height:16px;")} />
                      <span style={st("flex:1;")}>
                        {v.co.stripTxt}
                      </span>
                      {v.co.timerOn ? (
                        <>
                          <span style={st(v.co.holdStyle)}>
                            {v.co.hold2}
                          </span>
                        </>
                      ) : null}
                      <Icon name={v.co.sumIcon} style={st("width:16px;height:16px;")} />
                    </button>
                  </>
                ) : null}
                {" "}
                {v.co.sumOpen ? (
                  <>
                    <div id="co-sum" className="wv-slide" style={st(`display:flex; flex-direction:column; gap:14px; padding:${v.co.sumPad};`)}>
                      <div style={st("display:flex; gap:14px; align-items:center;")}>
                        <span style={st(`position:relative; display:block; width:64px; flex-shrink:0; aspect-ratio:4/5; border-radius:10px; overflow:hidden; container-type:inline-size; ${v.co.p.bg}`)}>
                          <span style={st(v.co.p.glyph)}>
                            {v.co.p.letter}
                          </span>
                        </span>
                        {" "}
                        <span style={st("display:flex; flex-direction:column; gap:4px; min-width:0;")}>
                          <span style={st("font-size:17px; font-weight:800; letter-spacing:-.03em; line-height:1.1;")}>
                            {v.co.evName}
                          </span>
                          <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:600; color:var(--fg-muted);")}>
                            {v.co.when}
                          </span>
                          <span style={st("font-size:12.5px; font-weight:600; color:var(--fg-subtle);")}>
                            {v.co.room}
                          </span>
                        </span>
                      </div>
                      {" "}
                      <div style={st("display:flex; flex-direction:column; gap:8px; padding-block:12px; border-block:1px solid var(--border);")}>
                        {(v.co.lines ?? []).map((l: any, i_l: number) => (
                          <Fragment key={l.k ?? i_l}>
                            <div style={st("display:flex; justify-content:space-between; gap:10px; font-size:14px; font-weight:600;")}>
                              <span>
                                {l.label}
                              </span>
                              <span style={st("font-family:var(--mono);")}>
                                {l.amt}
                              </span>
                            </div>
                          </Fragment>
                        ))}
                        {" "}
                        {v.co.discOn ? (
                          <>
                            <div style={st("display:flex; justify-content:space-between; gap:10px; font-size:14px; font-weight:700; color:var(--pos);")}>
                              <span>
                                {v.co.discLabel}
                              </span>
                              <span style={st("font-family:var(--mono);")}>
                                {v.co.discAmt}
                              </span>
                            </div>
                          </>
                        ) : null}
                      </div>
                      {" "}
                      <div style={st("display:flex; justify-content:space-between; align-items:baseline; gap:10px;")}>
                        <span style={st("font-size:15px; font-weight:800;")}>
                          {tr("Total")}
                        </span>
                        <span style={st("font-family:var(--mono); font-size:22px; font-weight:700;")}>
                          {v.co.total}
                        </span>
                      </div>
                      {" "}
                      {v.co.preHold ? (
                        <>
                          <span style={st("display:flex; align-items:center; gap:6px; font-size:12.5px; font-weight:700; color:var(--fg-muted);")}>
                            <Icon name={"timer"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                            {tr("We hold them for 10 minutes once you press Hold.")}
                          </span>
                        </>
                      ) : null}
                      {" "}
                      {v.co.timerOn ? (
                        <>
                          <div style={st("display:flex; align-items:center; gap:8px; flex-wrap:wrap;")}>
                            <span role="timer" aria-label={v.co.holdLabel} style={st("display:inline-flex; align-items:center; gap:6px; font-size:12.5px; font-weight:700; color:var(--fg-muted);")}>
                              <Icon name={"timer"} style={st("width:14px;height:14px;")} />
                              {tr("Held for you")}{" "}
                              <span style={st(v.co.holdStyle)}>
                                {v.co.hold2}
                              </span>
                            </span>
                            {" "}
                            <span style={st("flex:1;")}></span>
                            {" "}
                            <button className="wv-gi" onClick={v.co.letGo} style={st(`${v.s.btnT}color:var(--fg-muted); min-height:30px;`)}>
                              {tr("Let these go")}
                            </button>
                          </div>
                        </>
                      ) : null}
                      {" "}
                      {v.co.claimOn ? (
                        <>
                          <span style={st("display:flex; align-items:center; gap:6px; font-size:12.5px; font-weight:700; color:var(--fg-muted);")}>
                            <Icon name={"hourglass"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                            {tr("Yours until")}{" "}
                            <span style={st("font-family:var(--mono); color:var(--fg);")}>
                              {v.co.claimTxt}
                            </span>
                          </span>
                        </>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </aside>
            </div>
          </div>
        </>
      ) : null}
      {" "}
      {v.scr.going ? (
        <>
          <div className="wv-screen" style={st(`max-width:880px; width:100%; margin-inline:auto; padding:${v.gw.pad}; display:flex; flex-direction:column; gap:24px;`)}>
            <div style={st("display:flex; flex-direction:column; gap:10px;")}>
              <span style={st("font-family:var(--mono); font-size:13px; font-weight:700; color:var(--accent);")}>
                {v.gw.eyebrow}
              </span>
              {" "}
              <h1 style={st(`margin:0; font-size:${v.L.h1}; font-weight:800; letter-spacing:-.055em; line-height:.95; text-wrap:balance;`)}>
                {v.gw.heading}
              </h1>
              {" "}
              {v.gw.subOn ? (
                <>
                  <p style={st(`${v.s.p}font-size:16.5px;`)}>
                    {v.gw.sub}
                  </p>
                </>
              ) : null}
              {" "}
              {v.gw.paidOn ? (
                <>
                  <div style={st("display:flex; align-items:center; gap:10px; flex-wrap:wrap;")}>
                    <span style={st("display:inline-flex; align-items:center; gap:6px; min-height:28px; padding:0 11px; border-radius:999px; background:var(--pos-soft); color:var(--pos); font-size:12.5px; font-weight:800;")}>
                      <Icon name={"badge-check"} style={st("width:14px;height:14px;")} />
                      {trx("{paid} · {date}", { paid: v.gw.paidHow, date: <span style={st("font-family:var(--mono);")}>{v.gw.paidDate}</span> })}
                    </span>
                    {v.gw.receiptOn ? (
                      <button className="wv-gi" onClick={v.gw.receipt} style={st(`${v.s.btnT}min-height:28px;`)}>
                        <Icon name={"receipt-text"} style={st("width:14px;height:14px;")} />
                        {tr("Receipt")}
                      </button>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
            {" "}
            {v.gw.noteOn ? (
              <>
                <div role="status" style={st(`${v.gw.noteStyle}font-size:15px; flex-direction:column; gap:12px;`)}>
                  <span style={st("display:flex; gap:10px; align-items:flex-start;")}>
                    <Icon name={v.gw.noteIcon} style={st(`width:18px;height:18px;flex-shrink:0;margin-block-start:2px;color:${v.gw.noteColor};`)} />
                    <span>
                      {v.gw.note}
                    </span>
                  </span>
                  {v.gw.seeOn ? (
                    <>
                      <button className="wv-btn" onClick={v.goHome} style={st(`${v.s.btnP}align-self:flex-start;`)}>
                        {tr("See what's on")}
                      </button>
                    </>
                  ) : null}
                </div>
              </>
            ) : null}
            {" "}
            {v.gw.doorOn ? (
              <>
                <div role="status" style={st(`${v.s.aInfo}font-size:15px;`)}>
                  <Icon name={"banknote"} style={st("width:18px;height:18px;flex-shrink:0;margin-block-start:2px;color:var(--info);")} />
                  <span>
                    {trx("{pay} — your tickets work now. Card or cash.", {
                      pay: <strong style={st("font-weight:800;")}>{trx("Pay {amount} at the door", { amount: <span style={st("font-family:var(--mono);")}>{v.gw.total}</span> })}</strong>,
                    })}
                  </span>
                </div>
              </>
            ) : null}
            {" "}
            {v.gw.noneOn ? (
              <>
                <div role="status" style={st(`${v.s.aPos}font-size:15px;`)}>
                  <Icon name={"circle-check"} style={st("width:18px;height:18px;flex-shrink:0;margin-block-start:2px;color:var(--pos);")} />
                  <span>
                    {tr("No charge. Just bring your ticket.")}
                  </span>
                </div>
              </>
            ) : null}
            {" "}
            {v.gw.xferOn ? (
              <>
                <section aria-labelledby="bt-h" style={st("display:flex; flex-direction:column; gap:14px; padding:20px; border-radius:18px; border:1px solid var(--warn); background:var(--surface);")}>
                  <div style={st("display:flex; align-items:center; gap:10px; flex-wrap:wrap;")}>
                    <Icon name={"landmark"} style={st("width:18px;height:18px;color:var(--warn);")} />
                    <h2 id="bt-h" style={st(`${v.s.h2}font-size:19px; flex:1;`)}>
                      {tr("Pay by bank transfer")}
                    </h2>
                    <span style={st(v.gw.dueChip)}>
                      {v.gw.dueTxt}
                    </span>
                  </div>
                  {" "}
                  <p style={st(`${v.s.p}font-size:14px;`)}>
                    {v.gw.xferTxt}
                  </p>
                  {" "}
                  <dl style={st(`margin:0; display:grid; grid-template-columns:${v.gw.dlCols}; gap:1px; border-radius:14px; overflow:hidden; border:1px solid var(--border); background:var(--border);`)}>
                    {(v.gw.bank ?? []).map((b: any, i_b: number) => (
                      <Fragment key={b.k ?? i_b}>
                        <div style={st("display:flex; flex-direction:column; gap:3px; padding:11px 13px; background:var(--surface-2);")}>
                          <dt style={st(v.s.eyebrow)}>
                            {b.k}
                          </dt>
                          <dd style={st("margin:0; font-family:var(--mono); font-size:14.5px; font-weight:700;")}>
                            {b.v}
                          </dd>
                        </div>
                      </Fragment>
                    ))}
                  </dl>
                  {" "}
                  <button className="wv-gi" onClick={v.gw.copyRef} style={st(`${v.s.btnS}align-self:flex-start;`)}>
                    <Icon name={"copy"} style={st("width:14px;height:14px;")} />
                    {tr("Copy the reference")}
                  </button>
                </section>
              </>
            ) : null}
            {" "}
            {v.gw.tixOn ? (
              <>
                <div style={st("display:flex; flex-direction:column;")}>
                  <div aria-hidden="true" style={st("height:14px; border-radius:999px; background:var(--surface-3); box-shadow:inset 0 3px 6px rgba(0,0,0,.35); position:relative; z-index:2;")}></div>
                  {" "}
                  <div style={st("display:flex; flex-direction:column; gap:14px; padding-inline:12px; margin-block-start:-7px;")}>
                    {(v.gw.tickets ?? []).map((t: any, i_t: number) => (
                      <Fragment key={i_t}>
                        <div style={st("overflow:hidden; border-radius:0 0 20px 20px; padding-block-start:7px;")}>
                          <article className="wv-print" aria-label={t.aria} style={st(`animation-delay:${t.delay}; display:grid; grid-template-columns:${v.gw.tkCols}; border-radius:20px; overflow:hidden; background:var(--surface); border:1px solid var(--border-strong); box-shadow:0 20px 40px -26px rgba(0,0,0,.6); ${t.dim}`)}>
                            <div style={st(`position:relative; min-height:${v.gw.edgeMin}; container-type:inline-size; ${t.p.bg}`)}>
                              <span style={st(t.p.glyph)}>
                                {t.p.letter}
                              </span>
                              <span style={st(`position:absolute; inset-inline-start:12px; inset-block-end:10px; font-family:var(--mono); font-size:10.5px; font-weight:700; letter-spacing:.08em; color:${t.p.ink};`)}>
                                {t.venue}
                              </span>
                            </div>
                            {" "}
                            <div style={st("padding:18px 20px; display:flex; flex-direction:column; gap:12px; min-width:0;")}>
                              <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:700; color:var(--accent);")}>
                                {t.when}
                              </span>
                              {" "}
                              <span style={st("font-size:24px; font-weight:800; letter-spacing:-.045em; line-height:1;")}>
                                {t.show}
                              </span>
                              {" "}
                              <dl style={st("margin:0; display:grid; grid-template-columns:repeat(auto-fit,minmax(110px,1fr)); gap:10px;")}>
                                <div style={st("display:flex; flex-direction:column; gap:2px;")}>
                                  <dt style={st(`${v.s.eyebrow}font-size:10.5px;`)}>
                                    {tr("Holder")}
                                  </dt>
                                  <dd style={st("margin:0; font-size:14.5px; font-weight:800;")}>
                                    {t.holder}
                                  </dd>
                                </div>
                                {" "}
                                <div style={st("display:flex; flex-direction:column; gap:2px;")}>
                                  <dt style={st(`${v.s.eyebrow}font-size:10.5px;`)}>
                                    {tr("Ticket type")}
                                  </dt>
                                  <dd style={st("margin:0; font-size:14.5px; font-weight:800;")}>
                                    {t.type}
                                  </dd>
                                </div>
                                {" "}
                                <div style={st("display:flex; flex-direction:column; gap:2px;")}>
                                  <dt style={st(`${v.s.eyebrow}font-size:10.5px;`)}>
                                    {tr("Room")}
                                  </dt>
                                  <dd style={st("margin:0; font-size:14.5px; font-weight:800;")}>
                                    {t.room}
                                  </dd>
                                </div>
                              </dl>
                              {" "}
                              {t.payOn ? (
                                <>
                                  <span style={st(t.payStyle)}>
                                    <Icon name={t.payIcon} style={st("width:14px;height:14px;flex-shrink:0;")} />
                                    {t.payTxt}
                                  </span>
                                </>
                              ) : null}
                            </div>
                            {" "}
                            <div aria-hidden="true" style={st(t.tear)}></div>
                            {" "}
                            <div style={st("display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:18px; background:var(--surface-2);")}>
                              {t.qrOn ? (
                                <>
                                  <img src={t.qr} alt={t.qrAlt} style={st("width:136px; height:136px; border-radius:10px; background:#fff;")} />
                                </>
                              ) : null}
                              {" "}
                              {t.waitOn ? (
                                <>
                                  <span style={st("width:136px; min-height:136px; border-radius:10px; border:1.5px dashed var(--border-strong); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; text-align:center; padding:10px; font-size:12px; font-weight:800; line-height:1.4; color:var(--fg-muted);")}>
                                    <Icon name={t.waitIcon} style={st("width:18px;height:18px;")} />
                                    {t.waitTxt}
                                  </span>
                                </>
                              ) : null}
                              {" "}
                              {t.codeOn ? (
                                <>
                                  <span style={st("font-family:var(--mono); font-size:15px; font-weight:700; letter-spacing:.08em;")}>
                                    {t.code}
                                  </span>
                                </>
                              ) : null}
                            </div>
                          </article>
                        </div>
                      </Fragment>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
            {" "}
            {v.gw.actsOn ? (
              <>
                <div style={st("display:flex; gap:10px; flex-wrap:wrap;")}>
                  <button className="wv-gi" onClick={v.gw.ics} style={st(v.s.btnG)}>
                    <Icon name={"calendar-plus"} style={st("width:16px;height:16px;")} />
                    {tr("Add to calendar")}
                  </button>
                  {" "}
                  <button className="wv-gi" onClick={v.gw.directions} style={st(v.s.btnG)}>
                    <Icon name={"navigation"} style={st("width:16px;height:16px;")} />
                    {tr("Get directions")}
                  </button>
                  {" "}
                  {v.gw.sendOn ? (
                    <>
                      <button className="wv-gi" onClick={v.gw.send} style={st(v.s.btnG)}>
                        <Icon name={"forward"} style={st("width:16px;height:16px;")} />
                        {tr("Send a ticket to a friend")}
                      </button>
                    </>
                  ) : null}
                </div>
              </>
            ) : null}
            {" "}
            {v.gw.guestOn ? (
              <>
                <section aria-labelledby="gs-h" style={st("display:flex; flex-direction:column; gap:12px; padding:22px; border-radius:20px; background:var(--accent-soft); border:1px solid var(--border);")}>
                  <h2 id="gs-h" style={st(`${v.s.h2}font-size:20px;`)}>
                    {tr("Keep your tickets in one place")}
                  </h2>
                  {" "}
                  <p style={st(`${v.s.p}font-size:14.5px; color:var(--fg);`)}>
                    {tr("Get a sign-in link and every order you place with this address shows up together. No password.")}
                  </p>
                  {" "}
                  <button className="wv-btn" onClick={v.gw.sendMe} style={st(`${v.s.btnP}align-self:flex-start;`)}>
                    <Icon name={"mail"} style={st("width:16px;height:16px;")} />
                    {tr("Send me a sign-in link")}
                  </button>
                </section>
              </>
            ) : null}
          </div>
        </>
      ) : null}
      {" "}
      {v.scr.signin ? (
        <>
          <div className="wv-screen" style={st(`width:100%; max-width:480px; margin-inline:auto; padding:${v.si.pad}; display:flex; flex-direction:column; gap:18px;`)}>
            {v.si.noticeOn ? (
              <>
                <div role="status" style={st(v.s.aInfo)}>
                  <Icon name={v.si.noticeIcon} style={st("width:17px;height:17px;flex-shrink:0;margin-block-start:2px;color:var(--info);")} />
                  <span>
                    <strong style={st("font-weight:800;")}>
                      {v.si.noticeHead}
                    </strong>
                    {" · "}{v.si.notice}
                  </span>
                </div>
              </>
            ) : null}
            {" "}
            <div style={st("display:flex; flex-direction:column; gap:18px; padding:26px; border-radius:22px; border:1px solid var(--border); background:var(--surface);")}>
              {v.si.emailStep ? (
                <>
                  <div style={st("display:flex; flex-direction:column; gap:8px;")}>
                    <h1 style={st("margin:0; font-size:30px; font-weight:800; letter-spacing:-.045em;")}>
                      {tr("Sign in")}
                    </h1>
                    <p style={st(`${v.s.p}font-size:14.5px;`)}>
                      {tr("We'll email you a link and a 6-digit code. No password.")}
                    </p>
                  </div>
                  {" "}
                  <form onSubmit={v.si.send} noValidate={true} style={st("display:flex; flex-direction:column; gap:14px;")}>
                    <label style={st("display:flex; flex-direction:column; gap:6px;")}>
                      <span style={st(v.s.lbl)}>
                        {tr("Email")}
                      </span>
                      <input id="si-email" className="wv-fld" type="email" autoComplete="email" value={v.si.email ?? ""} onChange={v.si.onEmail} aria-invalid={v.si.fieldErrOn} aria-describedby="si-email-err" style={st(`${v.si.fld}font-family:var(--mono); font-size:14.5px;`)} />
                      {v.si.fieldErrOn ? (
                        <>
                          <span id="si-email-err" style={st(v.s.err)}>
                            <Icon name={"circle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                            {v.si.fieldErr}
                          </span>
                        </>
                      ) : null}
                    </label>
                    {" "}
                    {v.si.mailErrOn ? (
                      <>
                        <div role="alert" style={st(v.s.aWarn)}>
                          <Icon name={v.si.mailIcon} style={st("width:17px;height:17px;flex-shrink:0;margin-block-start:2px;color:var(--warn);")} />
                          <span>
                            {v.si.mailErr}
                          </span>
                        </div>
                      </>
                    ) : null}
                    {" "}
                    {v.si.checkOn ? (
                      <>
                        <div role="status" style={st(`display:flex; align-items:center; gap:8px; flex-wrap:wrap; font-size:13px; font-weight:700; color:${v.si.checkColor};`)}>
                          {v.si.checkRun ? (
                            <>
                              <span className="wv-pulse" style={st("width:8px; height:8px; border-radius:50%; background:var(--fg-subtle);")}></span>
                            </>
                          ) : null}
                          {v.si.checkIconOn ? (
                            <>
                              <Icon name={v.si.checkIcon} style={st("width:15px;height:15px;")} />
                            </>
                          ) : null}
                          {v.si.checkTxt}
                          {v.si.checkFail ? (
                            <>
                              <button type="button" className="wv-gi" onClick={v.si.retry} style={st(`${v.s.btnT}min-height:28px;`)}>
                                {tr("Try again")}
                              </button>
                            </>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                    {" "}
                    <button type="submit" className="wv-btn" disabled={v.si.sendOff} style={st(`${v.s.btnP}width:100%;`)}>
                      <Icon name={"mail"} style={st("width:16px;height:16px;")} />
                      {tr("Send me a link")}
                    </button>
                  </form>
                  {" "}
                  <p style={st(`${v.s.hint}margin:0;`)}>
                    {tr("We only use your email to sign you in and send your tickets. Signing in doesn't sign you up to anything.")}
                  </p>
                </>
              ) : null}
              {" "}
              {v.si.codeStep ? (
                <>
                  <div style={st("display:flex; flex-direction:column; gap:8px;")}>
                    <h1 style={st("margin:0; font-size:30px; font-weight:800; letter-spacing:-.045em;")}>
                      {tr("Check your email")}
                    </h1>
                    <p style={st(`${v.s.p}font-size:14.5px;`)}>
                      {tr("We sent a sign-in link and a 6-digit code to")}{" "}
                      <span style={st("font-family:var(--mono); color:var(--fg);")}>
                        {v.si.masked}
                      </span>
                      {tr(". Both work for 20 minutes.")}
                    </p>
                  </div>
                  {" "}
                  <form onSubmit={v.si.verify} style={st("display:flex; flex-direction:column; gap:14px;")}>
                    <span id="si-code-lbl" style={st(v.s.lbl)}>
                      {tr("Open the link on this phone, or type the code:")}
                    </span>
                    {" "}
                    <div role="group" aria-labelledby="si-code-lbl" aria-describedby="si-err" style={st("display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:8px;")}>
                      {(v.si.boxes ?? []).map((b: any, i_b: number) => (
                        <Fragment key={b.id ?? i_b}>
                          <input id={b.id} className="wv-fld" inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-label={b.label} aria-invalid={v.si.errOn} aria-describedby="si-err" disabled={v.si.boxOff} value={b.v ?? ""} onChange={b.onChange} onKeyDown={b.onKey} onPaste={b.onPaste} style={st(v.si.boxStyle)} />
                        </Fragment>
                      ))}
                    </div>
                    {" "}
                    {v.si.errOn ? (
                      <>
                        <span id="si-err" role="alert" style={st(`${v.s.err}font-size:13px; flex-wrap:wrap;`)}>
                          <Icon name={"circle-alert"} style={st("width:15px;height:15px;flex-shrink:0;")} />
                          {v.si.err}
                          {v.si.expOn ? (
                            <>
                              <button type="button" className="wv-gi" onClick={v.si.resend} style={st(`${v.s.btnT}min-height:24px; font-size:13px;`)}>
                                {tr("Send a new link")}
                              </button>
                            </>
                          ) : null}
                        </span>
                      </>
                    ) : null}
                    {" "}
                    <button type="submit" className="wv-btn" disabled={v.si.verifyOff} style={st(`${v.s.btnP}width:100%;`)}>
                      {tr("Sign in")}
                    </button>
                  </form>
                  {" "}
                  <div style={st("display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;")}>
                    <button className="wv-gi" onClick={v.si.resend} disabled={v.si.resendOff} style={st(v.s.btnT)}>
                      <Icon name={"rotate-cw"} style={st("width:14px;height:14px;")} />
                      <span style={st("font-variant-numeric:tabular-nums;")}>
                        {v.si.resendTxt}
                      </span>
                    </button>
                    {" "}
                    <button className="wv-gi" onClick={v.si.other} style={st(`${v.s.btnT}color:var(--fg-muted);`)}>
                      {tr("Use a different email")}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
      {" "}
      {v.scr.tickets ? (
        <>
          <div className="wv-screen" style={st(`max-width:1080px; width:100%; margin-inline:auto; padding:${v.mt.pad}; display:flex; flex-direction:column; gap:22px;`)}>
            {v.mt.out ? (
              <>
                <div style={st("display:flex; flex-direction:column; align-items:flex-start; gap:14px; padding:32px; border-radius:22px; border:1px solid var(--border); background:var(--surface);")}>
                  <h1 style={st("margin:0; font-size:30px; font-weight:800; letter-spacing:-.045em;")}>
                    {tr("Your tickets live here")}
                  </h1>
                  {" "}
                  <p style={st(v.s.p)}>
                    {tr("Sign in with a link to see every order in one place. No password. Each order's own link, in its emails, opens it too.")}
                  </p>
                  {" "}
                  <div style={st("display:flex; gap:10px; flex-wrap:wrap;")}>
                    <button className="wv-btn" onClick={v.goSignIn} style={st(v.s.btnP)}>
                      {tr("Sign in")}
                    </button>
                  </div>
                </div>
              </>
            ) : null}
            {" "}
            {v.mt.in ? (
              <>
                <div style={st("display:flex; align-items:flex-end; gap:14px; flex-wrap:wrap;")}>
                  <h1 style={st(`margin:0; flex:1; font-size:${v.L.h2}; font-weight:800; letter-spacing:-.045em;`)}>
                    {tr("My tickets")}
                  </h1>
                  {" "}
                  <div role="tablist" aria-label={tr("When")} style={st("display:flex; gap:3px; padding:3px; border-radius:12px; background:var(--surface-2); border:1px solid var(--border);")}>
                    {(v.mt.tabs ?? []).map((t: any, i_t: number) => (
                      <Fragment key={t.id ?? i_t}>
                        <button role="tab" aria-selected={t.on} onClick={t.go} style={st(t.style)}>
                          {t.label}
                        </button>
                      </Fragment>
                    ))}
                  </div>
                </div>
                {" "}
                {(v.mt.notices ?? []).map((nn: any, i_nn: number) => (
                  <Fragment key={nn.id ?? i_nn}>
                    <div role="status" style={st("display:flex; flex-direction:column; gap:12px; padding:18px; border-radius:18px; background:var(--warn-soft); border:1px solid var(--border);")}>
                      <div style={st("display:flex; gap:10px; align-items:flex-start;")}>
                        <Icon name={"calendar-clock"} style={st("width:18px;height:18px;flex-shrink:0;margin-block-start:2px;color:var(--warn);")} />
                        <span style={st("font-size:14.5px; font-weight:600; line-height:1.55;")}>
                          <strong style={st("font-weight:800;")}>
                            {nn.head}
                          </strong>
                          {" "}{nn.txt}
                        </span>
                      </div>
                      {" "}
                      <div style={st("display:flex; gap:8px; flex-wrap:wrap;")}>
                        <button className="wv-btn" onClick={nn.keep} style={st(v.s.btnS)}>
                          {tr("Keep my tickets")}
                        </button>
                        <button className="wv-gi" onClick={nn.refund} style={st(v.s.btnS)}>
                          {tr("Ask for a refund")}
                        </button>
                      </div>
                    </div>
                  </Fragment>
                ))}
                {" "}
                {(v.mt.waits ?? []).map((w: any, i_w: number) => (
                  <Fragment key={w.id ?? i_w}>
                    <div style={st("display:flex; align-items:center; gap:12px; flex-wrap:wrap; padding:14px 16px; border-radius:16px; border:1px dashed var(--border-strong);")}>
                      <Icon name={"list-ordered"} style={st("width:17px;height:17px;color:var(--fg-muted);")} />
                      {" "}
                      <span style={st("flex:1; min-width:200px; font-size:14.5px; font-weight:700;")}>
                        {w.txt}
                      </span>
                      {" "}
                      <button className="wv-gi" onClick={w.view} style={st(v.s.btnS)}>
                        {tr("See the show")}
                      </button>
                      {" "}
                      <button className="wv-gi" onClick={w.leave} style={st(`${v.s.btnT}color:var(--fg-muted);`)}>
                        {tr("Leave the waitlist")}
                      </button>
                    </div>
                  </Fragment>
                ))}
                {" "}
                {v.mt.empty ? (
                  <>
                    <div style={st("display:flex; flex-direction:column; align-items:center; text-align:center; gap:14px; padding:56px 20px; border-radius:22px; border:1px dashed var(--border-strong);")}>
                      <h2 style={st(v.s.h2)}>
                        {v.mt.emptyHead}
                      </h2>
                      {" "}
                      <p style={st(v.s.p)}>
                        {v.mt.emptyTxt}
                      </p>
                      {" "}
                      <button className="wv-btn" onClick={v.goHome} style={st(v.s.btnP)}>
                        {tr("See what's on")}
                      </button>
                    </div>
                  </>
                ) : null}
                {" "}
                {(v.mt.groups ?? []).map((g: any, i_g: number) => (
                  <Fragment key={g.id ?? i_g}>
                    {g.isOffer ? (
                      <>
                        <section aria-label={g.name} style={st(`display:grid; grid-template-columns:${v.mt.grpCols}; border-radius:20px; overflow:hidden; border:1px solid var(--border); background:var(--accent-soft);`)}>
                          <div aria-hidden="true" style={st(`min-height:${v.mt.edgeMin}; ${g.p.bg}`)}></div>
                          {" "}
                          <div style={st("display:flex; flex-direction:column; gap:12px; padding:18px; min-width:0;")}>
                            <span style={st(`${v.s.eyebrow}color:var(--accent);`)}>
                              {tr("From the waitlist")}
                            </span>
                            {" "}
                            <span style={st("font-size:19px; font-weight:800; letter-spacing:-.03em; line-height:1.25;")}>
                              {g.offerTxt}
                            </span>
                            {" "}
                            <span style={st("display:inline-flex; align-self:flex-start; align-items:center; gap:6px; min-height:28px; padding:0 11px; border-radius:999px; background:var(--warn-soft); color:var(--warn); font-family:var(--mono); font-size:12.5px; font-weight:700;")}>
                              <Icon name={"hourglass"} style={st("width:13px;height:13px;")} />
                              {g.offerLeft}
                            </span>
                            {" "}
                            <div style={st("display:flex; gap:8px; flex-wrap:wrap;")}>
                              <button className="wv-btn" onClick={g.claim} style={st(`${v.s.btnP}min-height:40px;`)}>
                                {tr("Claim them")}
                              </button>
                              <button className="wv-gi" onClick={g.leave} style={st(`${v.s.btnT}color:var(--fg-muted);`)}>
                                {tr("Leave the waitlist")}
                              </button>
                            </div>
                          </div>
                        </section>
                      </>
                    ) : null}
                    {" "}
                    {g.isEv ? (
                      <>
                        <section aria-label={g.name} style={st(`display:grid; grid-template-columns:${v.mt.grpCols}; border-radius:20px; overflow:hidden; border:1px solid var(--border); background:var(--surface);`)}>
                          <div aria-hidden="true" style={st(`min-height:${v.mt.edgeMin}; ${g.p.bg}`)}></div>
                          {" "}
                          <div style={st("display:flex; flex-direction:column; gap:14px; padding:18px; min-width:0;")}>
                            <div style={st("display:flex; gap:12px; align-items:flex-start; flex-wrap:wrap;")}>
                              <div style={st("flex:1; min-width:200px; display:flex; flex-direction:column; gap:4px;")}>
                                <button className="wv-gi" onClick={g.open} style={st("align-self:flex-start; padding:0; border:0; background:transparent; font-size:21px; font-weight:800; letter-spacing:-.04em; text-align:start;")}>
                                  {g.name}
                                </button>
                                {" "}
                                <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:600; color:var(--fg-muted);")}>
                                  {g.meta}
                                </span>
                              </div>
                              {" "}
                              <div style={st("display:flex; gap:6px; flex-wrap:wrap;")}>
                                {(g.acts ?? []).map((a: any, i_a: number) => (
                                  <Fragment key={a.id ?? i_a}>
                                    <button className="wv-gi" onClick={a.go} style={st(`${v.s.btnS}min-height:32px; font-size:12.5px;`)}>
                                      <Icon name={a.icon} style={st("width:13px;height:13px;")} />
                                      {a.label}
                                    </button>
                                  </Fragment>
                                ))}
                              </div>
                            </div>
                            {" "}
                            <div style={st("display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr)); gap:10px;")}>
                              {(g.tickets ?? []).map((t: any, i_t: number) => (
                                <Fragment key={t.code ?? i_t}>
                                  <div style={st("display:flex; flex-direction:column; gap:10px; padding:14px; border-radius:14px; background:var(--surface-2); border:1px solid var(--border);")}>
                                    <div style={st("display:flex; flex-direction:column; gap:3px;")}>
                                      <span style={st("font-size:15px; font-weight:800;")}>
                                        {t.holder}
                                      </span>
                                      <span style={st("font-size:12.5px; font-weight:600; color:var(--fg-muted);")}>
                                        {t.type}
                                        {t.codeOn ? (
                                          <>
                                            {" · "}
                                            <span style={st("font-family:var(--mono);")}>
                                              {t.code}
                                            </span>
                                          </>
                                        ) : null}
                                      </span>
                                    </div>
                                    {" "}
                                    <span style={st(t.stStyle)}>
                                      {t.st}
                                    </span>
                                    {" "}
                                    <div style={st("display:flex; gap:6px;")}>
                                      {t.showOn ? (
                                        <>
                                          <button className="wv-btn" onClick={t.show} style={st(`${v.s.btnP}min-height:36px; padding:0 12px; font-size:13px; flex:1;`)}>
                                            <Icon name={"qr-code"} style={st("width:14px;height:14px;")} />
                                            {tr("Show ticket")}
                                          </button>
                                        </>
                                      ) : null}
                                      {" "}
                                      {t.moreOn ? (
                                        <>
                                          <button className="wv-gi" onClick={t.more} aria-label={t.moreLabel} style={st(`${v.s.btnS}min-height:36px;`)}>
                                            <Icon name={"ellipsis"} style={st("width:15px;height:15px;")} />
                                            {tr("More")}
                                          </button>
                                        </>
                                      ) : null}
                                    </div>
                                    {" "}
                                    {t.takeOn ? (
                                      <>
                                        <button className="wv-gi" onClick={t.take} style={st(`${v.s.btnS}min-height:34px; align-self:flex-start;`)}>
                                          <Icon name={"undo-2"} style={st("width:14px;height:14px;")} />
                                          {tr("Take it back")}
                                        </button>
                                      </>
                                    ) : null}
                                    {" "}
                                    {t.withdrawOn ? (
                                      <>
                                        <button className="wv-gi" onClick={t.withdraw} style={st(`${v.s.btnS}min-height:34px; align-self:flex-start;`)}>
                                          <Icon name={"undo-2"} style={st("width:14px;height:14px;")} />
                                          {tr("Withdraw my request")}
                                        </button>
                                      </>
                                    ) : null}
                                  </div>
                                </Fragment>
                              ))}
                            </div>
                          </div>
                        </section>
                      </>
                    ) : null}
                  </Fragment>
                ))}
              </>
            ) : null}
          </div>
        </>
      ) : null}
      {" "}
      {v.scr.friend ? (
        <>
          <div className="wv-screen" style={st(`width:100%; max-width:520px; margin-inline:auto; padding:${v.si.pad}; display:flex; flex-direction:column; gap:18px;`)}>
            <span style={st(`${v.s.eyebrow}color:var(--accent);`)}>
              {tr("A ticket for you")}
            </span>
            {" "}
            {v.fr.gone ? (
              <>
                <h1 style={st("margin:0; font-size:36px; font-weight:800; letter-spacing:-.05em; line-height:1;")}>
                  {v.fr.goneHead}
                </h1>
                {" "}
                <p style={st(v.s.p)}>
                  {v.fr.goneTxt}
                </p>
                {" "}
                <button className="wv-btn" onClick={v.goHome} style={st(`${v.s.btnP}align-self:flex-start;`)}>
                  {tr("See what's on")}
                </button>
              </>
            ) : null}
            {" "}
            {v.fr.offer ? (
              <>
                <h1 style={st("margin:0; font-size:36px; font-weight:800; letter-spacing:-.05em; line-height:1;")}>
                  {v.fr.head}
                </h1>
                {" "}
                <div style={st("display:grid; grid-template-columns:84px minmax(0,1fr); border-radius:18px; overflow:hidden; border:1px solid var(--border-strong); background:var(--surface);")}>
                  <div style={st(v.fr.p.bg)}></div>
                  {" "}
                  <div style={st("padding:16px; display:flex; flex-direction:column; gap:6px;")}>
                    <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:700; color:var(--accent);")}>
                      {v.fr.card.when}
                    </span>
                    <span style={st("font-size:20px; font-weight:800; letter-spacing:-.04em;")}>
                      {v.fr.card.show}
                    </span>
                    <span style={st("font-size:13px; font-weight:600; color:var(--fg-muted);")}>
                      {v.fr.card.line}
                    </span>
                    {v.fr.card.payOn ? (
                      <span style={st(`${v.s.chip}align-self:flex-start; color:var(--info); border-color:var(--info);`)}>
                        {v.fr.card.pay}
                      </span>
                    ) : null}
                  </div>
                </div>
                {" "}
                <form onSubmit={v.fr.accept} noValidate={true} style={st("display:flex; flex-direction:column; gap:12px;")}>
                  <label style={st("display:flex; flex-direction:column; gap:6px;")}>
                    <span style={st(v.s.lbl)}>
                      {tr("Your name on the ticket")}
                    </span>
                    <input id="fr-name" className="wv-fld" autoComplete="name" value={v.fr.name ?? ""} onChange={v.fr.onName} aria-invalid={v.fr.errOn} aria-describedby="fr-err" style={st(v.fr.fld)} />
                    {v.fr.errOn ? (
                      <>
                        <span id="fr-err" role="alert" style={st(v.s.err)}>
                          <Icon name={"circle-alert"} style={st("width:14px;height:14px;flex-shrink:0;")} />
                          {v.fr.err}
                        </span>
                      </>
                    ) : null}
                  </label>
                  {" "}
                  <button type="submit" className="wv-btn" style={st(v.s.btnP)}>
                    <Icon name={"gift"} style={st("width:16px;height:16px;")} />
                    {tr("Accept ticket")}
                  </button>
                </form>
              </>
            ) : null}
            {" "}
            {v.fr.done ? (
              <>
                <h1 style={st("margin:0; font-size:36px; font-weight:800; letter-spacing:-.05em; line-height:1;")}>
                  {v.fr.head}
                </h1>
                {" "}
                <div style={st("display:flex; flex-direction:column; align-items:center; gap:10px; padding:22px; border-radius:20px; background:#ffffff; color:#191920;")}>
                  <img src={v.fr.qr} alt={v.fr.qrAlt} style={st("width:200px; height:200px;")} />
                  <span style={st("font-family:var(--mono); font-size:18px; font-weight:700; letter-spacing:.08em;")}>
                    {v.fr.newCode}
                  </span>
                  <span style={st("font-size:13px; font-weight:700; color:#4a4a54;")}>
                    {v.fr.holder}
                  </span>
                  {v.fr.payOn ? (
                    <span style={st("display:inline-flex; align-items:center; gap:6px; min-height:26px; padding:0 10px; border-radius:999px; background:#e7edfd; color:#1c59e0; font-size:12.5px; font-weight:800;")}>
                      {v.fr.payTxt}
                    </span>
                  ) : null}
                </div>
                {" "}
                <p style={st(`${v.s.p}font-size:14.5px;`)}>
                  {tr("Keep this page, or download the PDF. The link in your email opens it again.")}
                </p>
                {" "}
                <button className="wv-gi" onClick={v.fr.pdf} style={st(`${v.s.btnG}align-self:flex-start;`)}>
                  <Icon name={"file-down"} style={st("width:16px;height:16px;")} />
                  {tr("Download as PDF")}
                </button>
              </>
            ) : null}
          </div>
        </>
      ) : null}
      {" "}
      {v.scr.offer ? (
        <>
          <div className="wv-screen" style={st(`width:100%; max-width:520px; margin-inline:auto; padding:${v.si.pad}; display:flex; flex-direction:column; gap:18px;`)}>
            <span style={st(`${v.s.eyebrow}color:var(--accent);`)}>
              {tr("From the waitlist")}
            </span>
            {" "}
            {v.of.live ? (
              <>
                <h1 style={st("margin:0; font-size:36px; font-weight:800; letter-spacing:-.05em; line-height:1;")}>
                  {v.of.headTxt}
                </h1>
                {" "}
                <span style={st("display:inline-flex; align-self:flex-start; align-items:center; gap:7px; min-height:34px; padding:0 13px; border-radius:999px; background:var(--warn-soft); color:var(--warn); font-family:var(--mono); font-size:13.5px; font-weight:700;")}>
                  <Icon name={"hourglass"} style={st("width:15px;height:15px;")} />
                  {v.of.left}
                </span>
                {" "}
                <div style={st("display:grid; grid-template-columns:84px minmax(0,1fr); border-radius:18px; overflow:hidden; border:1px solid var(--border-strong); background:var(--surface);")}>
                  <div style={st(v.of.p.bg)}></div>
                  {" "}
                  <div style={st("padding:16px; display:flex; flex-direction:column; gap:6px;")}>
                    <span style={st("font-family:var(--mono); font-size:12.5px; font-weight:700; color:var(--accent);")}>
                      {v.of.card.when}
                    </span>
                    <span style={st("font-size:20px; font-weight:800; letter-spacing:-.04em;")}>
                      {v.of.card.show}
                    </span>
                    <span style={st("font-size:13px; font-weight:600; color:var(--fg-muted);")}>
                      {v.of.card.line}{" "}
                      <span style={st("font-family:var(--mono);")}>
                        {v.of.card.price}
                      </span>
                    </span>
                  </div>
                </div>
                {" "}
                <div style={st("display:flex; align-items:center; gap:12px; flex-wrap:wrap;")}>
                  <span id="of-q" style={st(v.s.lbl)}>
                    {tr("How many?")}
                  </span>
                  <div role="radiogroup" aria-labelledby="of-q" style={st("display:flex; gap:3px; padding:3px; border-radius:11px; background:var(--surface-2); border:1px solid var(--border);")}>
                    {(v.of.qs ?? []).map((q: any, i_q: number) => (
                      <Fragment key={q.id ?? i_q}>
                        <button role="radio" aria-checked={q.checked} onClick={q.go} style={st(q.style)}>
                          {q.id}
                        </button>
                      </Fragment>
                    ))}
                  </div>
                </div>
                {" "}
                <button className="wv-btn" onClick={v.of.go} style={st(v.s.btnP)}>
                  {v.of.label}
                  <Icon name={"arrow-right"} style={st("width:16px;height:16px;")} />
                </button>
                {" "}
                <p style={st(`${v.s.hint}margin:0;`)}>
                  {tr("If you don't claim them, they go to the next person on the list.")}
                </p>
              </>
            ) : null}
            {" "}
            {v.of.gone ? (
              <>
                <h1 style={st("margin:0; font-size:36px; font-weight:800; letter-spacing:-.05em; line-height:1;")}>
                  {tr("This offer has run out")}
                </h1>
                {" "}
                <p style={st(v.s.p)}>
                  {trx("The {n} hours ended at {time}, so they went to the next person on the list. You're still on the waitlist if more come back.", { time: <span style={st("font-family:var(--mono); color:var(--fg);")}>{v.of.endTxt}</span> }, v.of.hours)}
                </p>
                {" "}
                <button className="wv-btn" onClick={v.goHome} style={st(`${v.s.btnP}align-self:flex-start;`)}>
                  {tr("See what's on")}
                </button>
              </>
            ) : null}
          </div>
        </>
      ) : null}
      {" "}
      {v.nf.on ? (
        <>
          <div className="wv-screen" style={st("width:100%; max-width:640px; margin-inline:auto; padding:72px 20px; display:flex; flex-direction:column; align-items:center; text-align:center; gap:18px;")}>
            <span style={st("font-family:var(--mono); font-size:14px; font-weight:700; color:var(--fg-subtle);")}>
              {v.nf.code}
            </span>
            {" "}
            <h1 style={st("margin:0; font-size:40px; font-weight:800; letter-spacing:-.05em; line-height:1;")}>
              {v.nf.head}
            </h1>
            {" "}
            <p style={st(v.s.p)}>
              {v.nf.txt}
            </p>
            {" "}
            <button className="wv-btn" onClick={v.goHome} style={st(v.s.btnP)}>
              {tr("Back to what's on")}
            </button>
          </div>
        </>
      ) : null}
      {v.scr.confirm ? (
        <div className="wv-screen" style={st(`max-width:880px; width:100%; margin-inline:auto; padding:${v.gw.pad || "40px 32px 72px"}; display:flex; flex-direction:column; gap:24px;`)}>
          <div style={st("display:flex; flex-direction:column; gap:10px;")}>
            <span style={st("font-family:var(--mono); font-size:13px; font-weight:700; color:var(--accent);")}>{v.cf.eyebrow}</span>
            <h1 style={st(`margin:0; font-size:${v.L.h2}; font-weight:800; letter-spacing:-.05em; line-height:1; text-wrap:balance;`)}>{v.cf.head}</h1>
          </div>
          {v.cf.askOn ? (
            <>
              <p style={st(`${v.s.p}font-size:16px;`)}>{v.cf.askTxt}</p>
              <button className="wv-btn" onClick={v.cf.press} disabled={v.cf.busy} aria-busy={v.cf.busy} style={st(`${v.s.btnP}align-self:flex-start;`)}>
                <Icon name={"badge-check"} style={st("width:16px;height:16px;")} />
                {tr("Confirm my order")}
              </button>
            </>
          ) : null}
          {v.cf.ranOutOn ? (
            <div role="status" style={st(`${v.s.aDanger}font-size:15px; flex-direction:column; gap:12px;`)}>
              <span style={st("display:flex; gap:10px; align-items:flex-start;")}>
                <Icon name={"timer-off"} style={st("width:18px;height:18px;flex-shrink:0;margin-block-start:2px;color:var(--danger);")} />
                <span>{v.cf.ranOutTxt}</span>
              </span>
              <button className="wv-btn" onClick={v.cf.seeWhatsOn} style={st(`${v.s.btnP}align-self:flex-start;`)}>{tr("See what's on")}</button>
            </div>
          ) : null}
          {v.cf.doneOn ? (
            <section aria-labelledby="cf-bt" style={st("display:flex; flex-direction:column; gap:14px; padding:20px; border-radius:18px; border:1px solid var(--warn); background:var(--surface);")}>
              <div style={st("display:flex; align-items:center; gap:10px; flex-wrap:wrap;")}>
                <Icon name={"landmark"} style={st("width:18px;height:18px;color:var(--warn);")} />
                <h2 id="cf-bt" style={st(`${v.s.h2}font-size:19px; flex:1;`)}>{tr("Pay by bank transfer")}</h2>
                {v.cf.dueTxt ? <span style={st("display:inline-flex; align-items:center; min-height:26px; padding:0 10px; border-radius:999px; background:var(--warn-soft); color:var(--warn); font-family:var(--mono); font-size:12px; font-weight:700;")}>{v.cf.dueTxt}</span> : null}
              </div>
              <p style={st(`${v.s.p}font-size:14px;`)}>{v.cf.doneTxt}</p>
              <dl style={st("margin:0; display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:1px; border-radius:14px; overflow:hidden; border:1px solid var(--border); background:var(--border);")}>
                {(v.cf.bank ?? []).map((b: any, i_b: number) => (
                  <div key={i_b} style={st("display:flex; flex-direction:column; gap:3px; padding:11px 13px; background:var(--surface-2);")}>
                    <dt style={st(v.s.eyebrow)}>{b.k}</dt>
                    <dd style={st("margin:0; font-family:var(--mono); font-size:14px; font-weight:700;")}>{b.v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>
      ) : null}
    </main>
    {" "}
    <footer style={st("flex-shrink:0; border-block-start:1px solid var(--border); background:var(--surface-2);")}>
      <div style={st(`max-width:1280px; margin-inline:auto; padding:32px ${v.L.padX} 36px; display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:24px;`)}>
        <div style={st("display:flex; flex-direction:column; gap:8px;")}>
          <span style={st("font-size:18px; font-weight:800; letter-spacing:-.05em;")}>
            {v.venueName}
          </span>
          {" "}
          <span style={st("font-size:13.5px; font-weight:600; color:var(--fg-muted); line-height:1.6;")}>
            {v.venueAddress}
            <br />
            {v.venueRooms}
          </span>
        </div>
        {" "}
        <div style={st("display:flex; flex-direction:column; gap:4px; align-items:flex-start;")}>
          <button className="wv-gi" onClick={v.venueGetting} style={st(`${v.s.btnT}color:var(--fg);`)}>
            {tr("Getting there")}
          </button>
          {" "}
          <button className="wv-gi" onClick={v.venueAccess} style={st(`${v.s.btnT}color:var(--fg);`)}>
            {tr("Accessibility")}
          </button>
          {" "}
          <button className="wv-gi" onClick={v.venuePolicies} style={st(`${v.s.btnT}color:var(--fg);`)}>
            {tr("Policies")}
          </button>
        </div>
        {" "}
        <div style={st("display:flex; flex-direction:column; gap:8px;")}>
          <a href={v.contactHref} style={st("font-family:var(--mono); font-size:13px;")}>
            {v.contactEmail}
          </a>
          {" "}
          <span style={st("font-size:12.5px; font-weight:600; color:var(--fg-subtle);")}>
            {v.copyright}
          </span>
        </div>
      </div>
    </footer>
    {" "}
    {v.narrow ? (
      <>
        <nav aria-label={tr("Main")} style={st(`position:sticky; inset-block-end:0; z-index:35; flex-shrink:0; display:grid; grid-template-columns:${v.navCols}; height:64px; background:var(--hdr); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); border-block-start:1px solid var(--border);`)}>
          {(v.nav ?? []).map((n: any, i_n: number) => (
            <Fragment key={n.id ?? i_n}>
              <button onClick={n.go} aria-current={n.cur} style={st(n.tabStyle)}>
                <Icon name={n.icon} style={st("width:20px;height:20px;")} />
                <span>
                  {n.label}
                </span>
              </button>
            </Fragment>
          ))}
        </nav>
      </>
    ) : null}
    </>
  );
}
