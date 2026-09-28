/**
 * The small runtime the screens are drawn with.
 *
 * The screens keep the design's inline styles as written (`st("display:flex;…")`),
 * parsed once per distinct string into React's style object; a hover or a
 * pressed look (`fx(hover, active)`) becomes a generated class whose rules
 * win over the inline style; an icon is a Lucide SVG sized by its own style,
 * as the design's `<i data-lucide>` placeholders were.
 */
import { Fragment, type CSSProperties, type ReactNode } from "react";

import { tr } from "../i18n/tr.ts";

import { ICONS } from "./icons.ts";

const styles = new Map<string, CSSProperties>();

/** `a:b;c:d` → a style object; custom properties kept, `-webkit-x` → `WebkitX`. */
export function st(css: string | null | undefined): CSSProperties {
  const text = css ?? "";
  const known = styles.get(text);
  if (known !== undefined) return known;
  const out: Record<string, string> = {};
  for (const decl of split(text)) {
    const at = decl.indexOf(":");
    if (at < 1) continue;
    const prop = decl.slice(0, at).trim();
    const value = decl.slice(at + 1).trim();
    if (value === "" || value === "undefined" || value === "null") continue;
    out[prop.startsWith("--") ? prop : camel(prop)] = value;
  }
  styles.set(text, out as CSSProperties);
  return out as CSSProperties;
}

/** Declarations split on `;` outside parentheses and quotes. */
function split(css: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < css.length; i += 1) {
    const c = css[i]!;
    if (quote !== null) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === "(") depth += 1;
    else if (c === ")") depth -= 1;
    else if (c === ";" && depth === 0) {
      out.push(css.slice(start, i));
      start = i + 1;
    }
  }
  out.push(css.slice(start));
  return out;
}

const camel = (prop: string) => prop.replace(/^-(webkit|moz|ms)-/, (_, v: string) => `${v[0]!.toUpperCase()}${v.slice(1)}-`).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

const classes = new Map<string, string>();
let sheet: CSSStyleSheet | null = null;

/** A class carrying a hover and a pressed look; its rules beat the element's inline style. */
export function fx(hover: string | null, active: string | null): string {
  const key = `${hover ?? ""}|${active ?? ""}`;
  const known = classes.get(key);
  if (known !== undefined) return known;
  const name = `fx${String(classes.size + 1)}`;
  classes.set(key, name);
  if (typeof document !== "undefined") {
    if (sheet === null) {
      const el = document.createElement("style");
      el.id = "wv-fx";
      document.head.appendChild(el);
      sheet = el.sheet;
    }
    const important = (css: string) =>
      split(css)
        .filter((d) => d.includes(":"))
        .map((d) => `${d.trim()} !important`)
        .join(";");
    if (hover) sheet?.insertRule(`@media (hover:hover){.${name}:hover:not(:disabled){${important(hover)}}}`, sheet.cssRules.length);
    if (active) sheet?.insertRule(`.${name}:active:not(:disabled){${important(active)}}`, sheet.cssRules.length);
  }
  return name;
}

/**
 * A Lucide icon, sized by its style's width and height (18 px when it names none), as the design's
 * placeholders were drawn; an unknown name draws a plain circle. Decorative: the control carries the label.
 */
export function Icon({ name, style, className }: { name: string | null | undefined; style?: CSSProperties; className?: string }) {
  const Svg = ICONS[name ?? ""] ?? ICONS["circle"]!;
  const { width, height, ...rest } = style ?? {};
  const size = (v: unknown) => (typeof v === "string" && v !== "" ? parseFloat(v) || 18 : typeof v === "number" ? v : 18);
  return (
    <Svg
      data-lucide={name ?? "circle"}
      className={className}
      width={size(width)}
      height={size(height)}
      strokeWidth={2}
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", flexShrink: 0, ...rest }}
    />
  );
}

/**
 * A whole sentence with parts drawn in it — a figure in the mono face, a
 * name in bold: the sentence is translated as one (`tr`), then each `{name}`
 * in the reader's words is replaced by its part. `n` picks a plural variant.
 */
export function trx(en: string, parts: Record<string, ReactNode>, n?: number): ReactNode {
  const words = tr(en, n === undefined ? undefined : { n });
  return words.split(/(\{\w+\})/).map((piece, i) => {
    const name = /^\{(\w+)\}$/.exec(piece)?.[1];
    return <Fragment key={i}>{name !== undefined && name in parts ? parts[name] : piece}</Fragment>;
  });
}

/**
 * Arrow keys over a set of controls with one tab stop (a calendar's days, a
 * row of tabs): Left/Right step by one (mirrored right-to-left), Up/Down by
 * `row` when the set is a grid, Home/End to the ends. The control reached
 * takes focus and the tab stop; `pick` runs for it when given (a tab is
 * chosen as it is reached).
 */
export function roving(e: { key: string; currentTarget: HTMLElement; preventDefault: () => void }, selector: string, opts: { row?: number; pick?: (el: HTMLElement) => void } = {}): void {
  const items = [...e.currentTarget.querySelectorAll<HTMLElement>(selector)];
  const at = items.indexOf(document.activeElement as HTMLElement);
  if (at < 0) return;
  const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
  const step: Record<string, number> = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1, Home: -at, End: items.length - 1 - at };
  if (opts.row !== undefined) {
    step["ArrowDown"] = opts.row;
    step["ArrowUp"] = -opts.row;
  }
  const d = step[e.key];
  if (d === undefined) return;
  e.preventDefault();
  const next = items[Math.max(0, Math.min(items.length - 1, at + d))]!;
  for (const el of items) el.tabIndex = el === next ? 0 : -1;
  next.focus();
  opts.pick?.(next);
}
