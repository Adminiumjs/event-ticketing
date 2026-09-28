/**
 * The values every screen shares — the palette and the design's shared
 * styles, the layout sizes, the header, the footer, the toast — and the
 * whole bag the screens draw from: these, the audience's, the box office's
 * and the sheets'.
 */
import { dirFor, isLocaleTag } from "../../i18n/locales.ts";
import { tr } from "../../i18n/tr.ts";
import { cssUrl, hexA, hsh, wave } from "../art.ts";
import { AUDIENCE } from "../sides.ts";
import type { WaveApp } from "../wave.ts";
import { audienceVals } from "./audience.ts";
import { sheetVals } from "./sheets.ts";

export type V = Record<string, unknown>;

/** The accent the venue draws with; lighter on the dark theme so text on it keeps its contrast. */
const ACCENT = "#a21caf";
const ACCENT_DARK = "#e08bea";

export function palette(light: boolean): Record<string, string> {
  const acc = light ? ACCENT : ACCENT_DARK;
  const base: Record<string, string> = light
    ? {
        bg: "#f6f6f8",
        surface: "#ffffff",
        "surface-2": "#fafafa",
        "surface-3": "#f1f1f4",
        border: "#ececef",
        "border-strong": "#e2e2e8",
        fg: "#191920",
        "fg-muted": "#4a4a54",
        "fg-subtle": "#5a5a65",
        "accent-fg": "#ffffff",
        pos: "#0b7d59",
        "pos-soft": "#e6f5ee",
        warn: "#a95800",
        "warn-soft": "#fbf0e2",
        danger: "#cf273c",
        "danger-soft": "#fdecec",
        info: "#1c59e0",
        "info-soft": "#e7edfd",
        hdr: "rgba(246,246,248,.86)",
      }
    : {
        bg: "#0a0a0d",
        surface: "#141419",
        "surface-2": "#1a1a20",
        "surface-3": "#24242c",
        border: "rgba(255,255,255,.07)",
        "border-strong": "rgba(255,255,255,.13)",
        fg: "#f4f4f6",
        "fg-muted": "#b7b7c3",
        "fg-subtle": "#a1a1ad",
        "accent-fg": "#0f0f14",
        pos: "#3ecf8e",
        "pos-soft": "rgba(62,207,142,.14)",
        warn: "#e0a458",
        "warn-soft": "rgba(224,164,88,.14)",
        danger: "#ff6b6b",
        "danger-soft": "rgba(255,107,107,.14)",
        info: "#6ea8ff",
        "info-soft": "rgba(110,168,255,.14)",
        hdr: "rgba(10,10,13,.84)",
      };
  base["accent"] = acc;
  base["accent-soft"] = hexA(acc, light ? 0.1 : 0.2);
  return base;
}

/** The design's shared styles. */
export const S = {
  btnP: "display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:46px; padding:0 20px; border-radius:13px; border:0; background:var(--accent); color:var(--accent-fg); font-size:14.5px; font-weight:800; letter-spacing:-.01em;",
  btnG: "display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:46px; padding:0 18px; border-radius:13px; border:1px solid var(--border-strong); background:var(--surface); color:var(--fg); font-size:14.5px; font-weight:700;",
  btnS: "display:inline-flex; align-items:center; justify-content:center; gap:6px; min-height:36px; padding:0 12px; border-radius:10px; border:1px solid var(--border-strong); background:var(--surface); color:var(--fg); font-size:13px; font-weight:700;",
  btnT: "display:inline-flex; align-items:center; gap:6px; min-height:36px; padding:0 4px; border:0; border-radius:8px; background:transparent; color:var(--accent); font-size:13.5px; font-weight:700;",
  chip: "display:inline-flex; align-items:center; gap:5px; min-height:24px; padding:0 9px; border-radius:999px; border:1px solid var(--border-strong); font-size:11.5px; font-weight:700; color:var(--fg-muted); white-space:nowrap;",
  fld: "width:100%; min-height:46px; padding:0 14px; border-radius:12px; border:1px solid var(--border-strong); background:var(--surface); color:var(--fg); font-size:15px; font-weight:600;",
  fldErr: "width:100%; min-height:46px; padding:0 14px; border-radius:12px; border:1.5px solid var(--danger); background:var(--surface); color:var(--fg); font-size:15px; font-weight:600;",
  lbl: "font-size:13px; font-weight:800; color:var(--fg);",
  hint: "font-size:12.5px; font-weight:500; color:var(--fg-subtle); line-height:1.5;",
  err: "display:flex; gap:6px; align-items:flex-start; font-size:12.5px; font-weight:700; color:var(--danger); line-height:1.45;",
  eyebrow: "font-size:11.5px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--fg-subtle);",
  h2: "margin:0; font-size:22px; font-weight:800; letter-spacing:-.035em; line-height:1.15;",
  p: "margin:0; font-size:15px; font-weight:500; line-height:1.65; color:var(--fg-muted); text-wrap:pretty;",
  card: "background:var(--surface); border:1px solid var(--border); border-radius:18px;",
  stepBtn: "width:32px; height:32px; border:0; border-radius:9px; background:transparent; color:var(--fg); display:flex; align-items:center; justify-content:center;",
  aWarn: "display:flex; gap:10px; align-items:flex-start; padding:12px 14px; border-radius:14px; background:var(--warn-soft); color:var(--fg); font-size:13.5px; font-weight:600; line-height:1.55;",
  aInfo: "display:flex; gap:10px; align-items:flex-start; padding:12px 14px; border-radius:14px; background:var(--info-soft); color:var(--fg); font-size:13.5px; font-weight:600; line-height:1.55;",
  aDanger: "display:flex; gap:10px; align-items:flex-start; padding:12px 14px; border-radius:14px; background:var(--danger-soft); color:var(--fg); font-size:13.5px; font-weight:600; line-height:1.55;",
  aPos: "display:flex; gap:10px; align-items:flex-start; padding:12px 14px; border-radius:14px; background:var(--pos-soft); color:var(--fg); font-size:13.5px; font-weight:600; line-height:1.55;",
};
export type Styles = typeof S;

/** The layout sizes, wide and narrow. */
export function layout(nar: boolean): Record<string, string> {
  return {
    padX: nar ? "16px" : "32px",
    h1: nar ? "40px" : "64px",
    h2: nar ? "26px" : "32px",
    heroCols: nar ? "minmax(0,1fr)" : "minmax(0,420px) minmax(0,1fr)",
    heroPad: nar ? "20px 16px 28px" : "48px 32px 56px",
    heroGap: nar ? "22px" : "56px",
    heroPosterMax: nar ? "300px" : "420px",
    gapBig: nar ? "36px" : "56px",
    runRow: `display:grid; grid-template-columns:${nar ? "50px 56px minmax(0,1fr)" : "92px 76px minmax(0,1fr) auto"}; gap:${nar ? "8px 14px" : "22px"}; align-items:center; width:100%; padding:${nar ? "16px 4px" : "18px 12px"}; border:0; border-block-end:1px solid var(--border); background:transparent; color:var(--fg); text-align:start;`,
    runNum: nar ? "26px" : "40px",
    runName: nar ? "19px" : "26px",
    bandH: nar ? "260px" : "320px",
    bandPad: nar ? "22px" : "40px",
    bandTitle: nar ? "40px" : "64px",
    soonMin: nar ? "150px" : "220px",
    evHeadPad: nar ? "14px 16px 24px" : "22px 32px 36px",
    evBodyPad: nar ? "28px 16px 0" : "40px 32px 64px",
    evCols: nar ? "minmax(0,1fr)" : "minmax(0,1fr) 390px",
    cropRatio: nar ? "16/10" : "21/8",
    cropTitle: nar ? "min(13cqw, 40px)" : "min(9cqw, 64px)",
    goodCols: nar ? "1fr" : "180px 1fr",
    otherMin: nar ? "140px" : "180px",
  };
}

export function renderVals(app: WaveApp): V {
  const s = app.state;
  const light = app.light();
  const nar = app.narrow();
  const lang = isLocaleTag(s.lang) ? s.lang : "en-US";
  const pal = palette(light);
  let vars = "";
  for (const [k, value] of Object.entries(pal)) vars += `--${k}:${value};`;
  vars += "--mono:'JetBrains Mono',ui-monospace,monospace;";
  const phone = s.frame === "phone";
  const w = app.persona === "audience" ? app.world() : null;
  const venue = w?.settings.venueName ?? "";
  const v: V = {
    dir: dirFor(lang),
    langCode: lang,
    themeAttr: s.theme,
    rootStyle: `${vars}height:100vh; overflow:hidden; color:var(--fg); background:${phone ? (light ? "#dcdce2" : "#050507") : "var(--bg)"};`,
    frameWrap: phone
      ? "position:relative; width:390px; max-width:100%; height:min(844px, calc(100vh - 32px)); margin:16px auto 0; border-radius:34px; overflow:hidden; background:var(--bg); border:1px solid var(--border-strong); box-shadow:0 30px 80px -30px rgba(0,0,0,.55);"
      : "position:relative; height:100vh; overflow:hidden; background:var(--bg);",
    scrollStyle: "height:100%; overflow-y:auto; overflow-x:hidden; display:flex; flex-direction:column;",
    L: layout(nar),
    s: S,
    narrow: nar,
    wide: !nar,
    loading: s.loading || (app.persona === "audience" && w === null && !app.venueFailed()),
    loadFailed: s.loadError || (app.persona === "audience" && app.venueFailed()),
    retry: () => app.retryVenue(),
    waveMark: wave(88, 7, () => 1, 7, pal["accent"]!, 1.4),
    skelBg: cssUrl(wave(240, 48, () => 0.9, 11, light ? "#c9c9d2" : "#3a3a44", 2)),
    brand: venue,
    brandLabel: tr("{venue} — what's on", { venue }),
    toggleTheme: () => app.setState({ theme: light ? "dark" : "light" }),
    themeLabel: light ? tr("Switch to dark") : tr("Switch to light"),
    themeIcon: light ? "moon" : "sun",
    toastOn: s.toast !== null,
    toastMsg: s.toast?.msg ?? "",
    toastIcon: s.toast?.icon ?? "check",
    toastBottom: `${String(nar ? 96 : 28)}px`,
    stop: (e: { stopPropagation: () => void }) => e.stopPropagation(),
    initialsOf: (who: string) => initials(who),
    avatarOf: (email: string) => `oklch(${light ? "0.86 0.08" : "0.42 0.1"} ${String(hsh(email) % 360)})`,
  };
  if (AUDIENCE && app.persona === "audience") Object.assign(v, audienceVals(app, v));
  Object.assign(v, sheetVals(app, v));
  return v;
}

/** Up to two initials of a name or an address. */
export function initials(who: string): string {
  return who
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]!.toUpperCase())
    .join("");
}
