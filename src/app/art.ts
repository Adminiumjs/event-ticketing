/**
 * The venue's generated art, as the design draws it: each show's poster (its
 * colours come from its name, its pattern from `events.poster_style`), and the
 * waveform line the brand mark, the loading strip and a show's "how much is
 * left" line are drawn with. Pure functions of their inputs: the same show
 * draws the same poster on every screen, in every build.
 */

/** A 32-bit FNV-1a hash of a string. */
export function hsh(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A small seeded random source (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const svgData = (svg: string): string => `data:image/svg+xml,${encodeURIComponent(svg)}`;
export const cssUrl = (data: string): string => `url("${data}")`;

const grain = (a: number) =>
  cssUrl(
    svgData(
      `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 ${String(a)} 0'/></filter><rect width='180' height='180' filter='url(#n)'/></svg>`,
    ),
  );
const G1 = grain(0.1);
const G2 = grain(0.32);

/** A show's two hues: from its stored hue when it has one (a renamed show keeps its colours), else from its name. */
export function hues(name: string, hue: number | null = null): [number, number] {
  const a = hue ?? hsh(name) % 360;
  return [a, (a + 140 + (hsh(`${name}~`) % 80)) % 360];
}

export interface Poster {
  base: string;
  mid: string;
  ink: string;
  dot: string;
  letter: string;
  bg: string;
  glyph: string;
  title: string;
  wash: string;
  glow: string;
}

/** The poster of a show: its background, its big letter (the `glyph` style), its title, and the page's wash. */
export function poster(name: string, short: string | null, style: string | null, light: boolean, hue: number | null = null): Poster {
  const [a, b] = hues(name, hue);
  const base = `oklch(0.27 0.09 ${String(a)})`;
  const mid = `oklch(0.66 0.17 ${String(b)})`;
  const ink = `oklch(0.94 0.06 ${String(b)})`;
  const fade = `linear-gradient(to top, ${base} 6%, transparent 56%)`;
  let art: string;
  let g = G1;
  switch (style) {
    case "dots":
      art = `linear-gradient(135deg, ${base} 12%, transparent 60%), radial-gradient(circle at 50% 50%, ${mid} 0 2.6px, transparent 3.3px) 0 0/11px 11px`;
      break;
    case "rings":
      art = `repeating-radial-gradient(circle at 80% 16%, ${mid} 0 6px, transparent 6px 17px)`;
      break;
    case "stripes":
      art = `repeating-linear-gradient(-14deg, ${mid} 0 9px, transparent 9px 21px)`;
      break;
    case "grain":
      art = `radial-gradient(circle at 26% 24%, ${mid} 0, transparent 58%), radial-gradient(circle at 88% 78%, oklch(0.5 0.16 ${String(b)}) 0, transparent 52%)`;
      g = G2;
      break;
    default:
      art = `radial-gradient(circle at 100% 0%, oklch(0.42 0.13 ${String(b)}), transparent 72%)`;
  }
  return {
    base,
    mid,
    ink,
    dot: mid,
    letter: (short ?? name).replace(/[^\p{L}]/gu, "").charAt(0),
    bg: `background:${fade}, ${g}, ${art}, ${base};`,
    glyph:
      style === "glyph"
        ? `position:absolute; inset-block-start:-26cqw; inset-inline-end:-16cqw; font-size:132cqw; font-weight:800; line-height:1; letter-spacing:-.08em; color:${mid}; pointer-events:none;`
        : "display:none;",
    title: `position:absolute; inset-inline:7cqw; inset-block-end:7cqw; font-size:12.5cqw; font-weight:800; letter-spacing:-.055em; line-height:.9; color:${ink}; text-transform:uppercase; text-wrap:balance; text-align:start;`,
    wash: light
      ? `radial-gradient(900px 420px at 12% -10%, oklch(0.7 0.16 ${String(a)} / .20), transparent 70%), radial-gradient(700px 380px at 92% 0%, oklch(0.72 0.15 ${String(b)} / .16), transparent 70%)`
      : `radial-gradient(900px 420px at 12% -10%, oklch(0.55 0.17 ${String(a)} / .34), transparent 70%), radial-gradient(700px 380px at 92% 0%, oklch(0.62 0.17 ${String(b)} / .24), transparent 70%)`,
    glow: `oklch(0.66 0.17 ${String(b)} / .6)`,
  };
}

/** A waveform line as an SVG image: `amp` shapes it along its length (0 flat, 1 full). */
export function wave(w: number, h: number, amp: (u: number) => number, seed: number, color: string, sw = 1.5, vertical = false): string {
  const r = rng(seed);
  const n = Math.max(8, Math.floor((vertical ? h : w) / 3));
  let d = "";
  for (let i = 0; i <= n; i += 1) {
    const u = i / n;
    const env = Math.pow(Math.sin(Math.PI * u), 0.5);
    const v = (r() * 2 - 1) * amp(u) * env;
    const [x, y] = vertical ? [w / 2 + (v * w) / 2, u * h] : [u * w, h / 2 + (v * h) / 2];
    d += `${i ? " L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return svgData(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${String(w)} ${String(h)}" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="${color}" stroke-width="${String(sw)}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`,
  );
}

/** A hex colour at an alpha, as `rgba()`. */
export function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${String((n >> 16) & 255)},${String((n >> 8) & 255)},${String(n & 255)},${String(a)})`;
}
