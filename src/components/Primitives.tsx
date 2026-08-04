/**
 * The small shared pieces: buttons, chips, panels, fields, avatars, tinted
 * tiles, KPI cards and empty states.
 *
 * They are grouped in one module rather than one file each because none of
 * them is more than a handful of lines and they are always imported together.
 * Anything with real behaviour — the dock, the shell, the toast layer — lives
 * in its own file.
 */

import type { CSSProperties, ReactNode } from "react";
import {
  Check,
  Flame,
  MicVocal,
  Minus,
  Music,
  Plus,
  Sparkles,
  Waves,
  Zap,
} from "lucide-react";

import type { Show, Ticket } from "../data/types.ts";
import { useI18n } from "../i18n/index.tsx";
import { useStore } from "../state/store.ts";
import {
  artBackground,
  clock,
  dateShort,
  dowClock,
  initials as toInitials,
  label,
  rgba,
  tileBackground,
  tileDay,
  tileMonth,
} from "../lib/format.ts";
import {
  doorsAt,
  qrGrid,
  SELLING_FAST_BELOW,
  type ShowStatus,
} from "../lib/tickets.ts";

/* ------------------------------------------------------------------ button */

type Tone = "accent" | "ghost" | "pos" | "danger";

export function Button({
  children,
  onClick,
  tone = "accent",
  size,
  disabled,
  type = "button",
  title,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: Tone;
  size?: "sm";
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
  className?: string;
}) {
  const toneClass = tone === "accent" ? "" : ` wv-button--${tone}`;
  const sizeClass = size === "sm" ? " wv-button--sm" : "";
  return (
    <button
      type={type}
      className={`wv-button wv-btn${toneClass}${sizeClass} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------- chip */

export function Chip({
  children,
  tone,
  onClick,
  pressed,
  title,
  style,
}: {
  children: ReactNode;
  tone?: "pos" | "warn" | "danger" | "info" | "accent";
  onClick?: () => void;
  pressed?: boolean;
  title?: string;
  style?: CSSProperties;
}) {
  const cls = `wv-chip${tone ? ` wv-chip--${tone}` : ""}${onClick ? " wv-chipbtn" : ""}`;
  if (!onClick) {
    return (
      <span className={cls} title={title} style={style}>
        {children}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      aria-pressed={pressed}
      title={title}
      style={style}
    >
      {children}
    </button>
  );
}

/** An amount, a date, a count — anything that must not be re-ordered by bidi. */
export function Mono({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={`wv-mono ${className}`.trim()}>{children}</span>;
}

/* ------------------------------------------------------------------- panel */

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`wv-panel ${className}`.trim()}>
      {title !== undefined && (
        <header className="wv-panel__head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <h2 className="wv-panel__title">{title}</h2>
              {subtitle !== undefined && <p className="wv-panel__sub">{subtitle}</p>}
            </div>
            {actions !== undefined && (
              <div style={{ marginInlineStart: "auto", display: "flex", gap: 7 }}>
                {actions}
              </div>
            )}
          </div>
        </header>
      )}
      <div className="wv-panel__body">{children}</div>
    </section>
  );
}

/* --------------------------------------------------------------- KPI card */

export function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "pos" | "warn" | "danger";
}) {
  return (
    <div className="wv-kpi">
      <div className="wv-kpi__label">{label}</div>
      <div
        className="wv-kpi__value wv-mono"
        style={tone ? { color: `var(--${tone})` } : undefined}
      >
        {value}
      </div>
      {hint !== undefined && <div className="wv-kpi__hint">{hint}</div>}
    </div>
  );
}

/* ----------------------------------------------------------------- avatars */

/**
 * A tinted initials tile. There is no photography anywhere in this app: a
 * person is their initials over their own seed tint, and the same tint follows
 * them everywhere they appear.
 */
export function Avatar({
  name,
  tint,
  ini,
  large,
  title,
}: {
  name: string;
  tint: string;
  ini?: string;
  large?: boolean;
  title?: string;
}) {
  const dark = useStore((s) => s.theme === "dark");
  return (
    <span
      className={`wv-avatar${large ? " wv-avatar--lg" : ""}`}
      style={{ background: tileBackground(tint, dark), color: dark ? "#f4f4f6" : "#191920" }}
      title={title ?? name}
      aria-hidden="true"
    >
      {ini ?? toInitials(name)}
    </span>
  );
}

/**
 * A logo slot — the same gradient treatment at a larger size, with the seed's
 * fictional filename in the corner. `badge` renders in the OPPOSITE corner
 * from that chip so the two can never collide (house layout rule 2).
 */
export function LogoTile({
  tint,
  ini,
  file,
  size = 56,
  badge,
  icon,
}: {
  tint: string;
  ini: string;
  file?: string;
  size?: number;
  badge?: ReactNode;
  icon?: ReactNode;
}) {
  const dark = useStore((s) => s.theme === "dark");
  return (
    <span
      className="wv-tile"
      style={{
        width: size,
        height: size,
        background: tileBackground(tint, dark),
        borderColor: rgba(tint, dark ? 0.3 : 0.18),
      }}
      aria-hidden="true"
    >
      {icon ?? <span className="wv-tile__ini">{ini}</span>}
      {file !== undefined && size >= 48 && <span className="wv-tile__file">{file}</span>}
      {badge !== undefined && <span className="wv-tile__badge">{badge}</span>}
    </span>
  );
}

/* ------------------------------------------------------------------ fields */

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="wv-field">
      <span className="wv-label">{label}</span>
      {children}
      {hint !== undefined && (
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-subtle)" }}>
          {hint}
        </span>
      )}
    </label>
  );
}

/* ------------------------------------------------------------ empty state */

export function Empty({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="wv-empty">
      {icon !== undefined && <div className="wv-empty__icon">{icon}</div>}
      <div className="wv-empty__title">{title}</div>
      {body !== undefined && <p className="wv-empty__body">{body}</p>}
      {action !== undefined && <div style={{ marginBlockStart: 14 }}>{action}</div>}
    </div>
  );
}

/** The line that tells a reader what this workspace deliberately is not. */
export function Honest({ children }: { children: ReactNode }) {
  return <p className="wv-honest">{children}</p>;
}

/* --------------------------------------------------------------- segmented */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  full,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  full?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div
      className={`wv-seg${full ? " wv-seg--full" : ""}`}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="wv-seg__btn"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- event art */

/*
 * There is no photography in this app. A show is two of its own tints swept
 * diagonally with an oversized glyph on top, and the same pair follows it from
 * the home grid to the wallet ticket. Six glyphs, resolved from a map rather
 * than a dynamic import, because pulling all of Lucide in to look up a string
 * would cost more than the rest of the bundle.
 */
const ART_ICONS: Record<string, typeof Music> = {
  music: Music,
  "mic-vocal": MicVocal,
  flame: Flame,
  zap: Zap,
  waves: Waves,
  sparkles: Sparkles,
};

export function Art({
  show,
  height,
  glyph = 96,
  badge,
  className = "",
}: {
  show: Show;
  height?: number | string;
  glyph?: number;
  /** Floats in the corner OPPOSITE the tile's own chip (house layout rule 2). */
  badge?: ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  const Icon = ART_ICONS[show.icon] ?? Music;
  return (
    <div
      className={`wv-art ${className}`.trim()}
      style={{ background: artBackground(show.art), height }}
      role="img"
      aria-label={t("home.card.art", { show: show.name })}
    >
      <Icon className="wv-art__glyph" size={glyph} aria-hidden="true" />
      {badge !== undefined && <span className="wv-art__badge">{badge}</span>}
      <span className="wv-art__chip wv-mono">{show.chip}</span>
    </div>
  );
}

/** The poster-style date block: a big numeral over an upper-cased month. */
export function DateTile({ show }: { show: Show }) {
  return (
    <span className="wv-datetile wv-mono">
      <span className="wv-datetile__day">
        {tileDay(show.date)}
        {show.date2 !== undefined ? "+" : ""}
      </span>
      <span className="wv-datetile__mon">{tileMonth(show.date)}</span>
    </span>
  );
}

/* ----------------------------------------------------------- status chips */

/** One chip for every state a show can be in, tone carried by the state. */
export function StatusChip({ status }: { status: ShowStatus }) {
  const { t } = useI18n();
  switch (status.kind) {
    case "onSale":
      return <Chip tone="pos">{t("chrome.status.onSale")}</Chip>;
    case "sellingFast":
      return <Chip tone="warn">{t("chrome.status.sellingFast")}</Chip>;
    case "soldOut":
      return <Chip>{t("chrome.status.soldOut")}</Chip>;
    case "notYetOnSale":
      return (
        <Chip tone="info">
          {t("chrome.status.saleStarts", { when: dowClock(status.saleStart) })}
        </Chip>
      );
    case "doorsOpen":
      return <Chip tone="accent">{t("chrome.status.doorsOpen")}</Chip>;
    case "wrapped":
      return <Chip>{t("chrome.status.wrapped")}</Chip>;
  }
}

/* --------------------------------------------------------------- steppers */

/**
 * A quantity stepper capped at six per ticket type. The cap is enforced in the
 * engine too — this control only has to make it obvious, which is why the plus
 * disables rather than silently refusing.
 */
export function Stepper({
  value,
  max,
  onChange,
  labelMinus,
  labelPlus,
  labelValue,
}: {
  value: number;
  max: number;
  onChange: (next: number) => void;
  labelMinus: string;
  labelPlus: string;
  labelValue: string;
}) {
  return (
    <div className="wv-stepper" role="group" aria-label={labelValue}>
      <button
        type="button"
        className="wv-stepper__btn wv-btn"
        onClick={() => onChange(value - 1)}
        disabled={value <= 0}
        aria-label={labelMinus}
      >
        <Minus size={15} aria-hidden="true" />
      </button>
      <output className="wv-stepper__value wv-mono" aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className="wv-stepper__btn wv-btn"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={labelPlus}
      >
        <Plus size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ meters */

/**
 * The thin remaining-count bar on a ticket-type card. It turns amber under 15%
 * left — the same threshold that makes a whole show read "Selling fast", so a
 * reader who learns the colour once has learned it everywhere.
 */
export function Meter({
  remaining,
  capacity,
  label: ariaLabel,
}: {
  remaining: number;
  capacity: number;
  label: string;
}) {
  const fraction = capacity === 0 ? 0 : remaining / capacity;
  const low = fraction < SELLING_FAST_BELOW;
  return (
    <div
      className={`wv-meter${low ? " wv-meter--low" : ""}`}
      role="img"
      aria-label={ariaLabel}
    >
      <span className="wv-meter__fill" style={{ inlineSize: `${Math.max(2, fraction * 100)}%` }} />
    </div>
  );
}

/** Sold / held / remaining in one bar, in that order, always summing to capacity. */
export function StackedBar({
  sold,
  held,
  remaining,
  capacity,
  label: ariaLabel,
}: {
  sold: number;
  held: number;
  remaining: number;
  capacity: number;
  label: string;
}) {
  const pct = (n: number) => (capacity === 0 ? 0 : (n / capacity) * 100);
  return (
    <div className="wv-stack" role="img" aria-label={ariaLabel}>
      <span className="wv-stack__seg wv-stack__seg--sold" style={{ inlineSize: `${pct(sold)}%` }} />
      <span className="wv-stack__seg wv-stack__seg--held" style={{ inlineSize: `${pct(held)}%` }} />
      <span
        className="wv-stack__seg wv-stack__seg--rem"
        style={{ inlineSize: `${pct(remaining)}%` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------- fake QR */

/**
 * The wallet ticket's scan pattern. It is fiction: a deterministic grid drawn
 * from the ticket code alone, with finder squares in three corners so it reads
 * as a QR at arm's length. Pure SVG — shipping a QR library to encode a demo
 * ticket that opens nothing would be a strange trade.
 */
export function QrTile({ code, size = 108 }: { code: string; size?: number }) {
  const { t } = useI18n();
  const grid = qrGrid(code);
  const n = grid.length;
  return (
    <svg
      className="wv-qr"
      width={size}
      height={size}
      viewBox={`0 0 ${n} ${n}`}
      role="img"
      aria-label={t("confirm.qr.alt", { code })}
      shapeRendering="crispEdges"
    >
      <rect width={n} height={n} fill="var(--qr-bg)" />
      {grid.map((row, y) =>
        row.map((on, x) =>
          on ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="var(--qr-fg)" /> : null,
        ),
      )}
    </svg>
  );
}

/* ----------------------------------------------------------- wallet ticket */

/**
 * One ticket, shaped like the thing in your phone's wallet: the show's own
 * gradient down the leading edge, a perforation across the middle, and the
 * code and its scan pattern below the fold.
 *
 * Shared by the confirmation and My tickets rather than written twice — the
 * confirmation's tickets are always Valid, My tickets' may be checked in, and
 * that is the only difference between the two.
 */
export function WalletTicket({
  ticket,
  show,
  now,
}: {
  ticket: Ticket;
  show: Show;
  now: number;
}) {
  const { t } = useI18n();
  const type = show.types.find((x) => x.id === ticket.tt);
  const scanned = ticket.checkedInAt !== null && ticket.checkedInAt <= now;

  return (
    <article className={`wv-wallet${scanned ? " wv-wallet--used" : ""}`}>
      <span
        className="wv-wallet__edge"
        style={{ background: artBackground(show.art, "180deg") }}
        aria-hidden="true"
      />

      <div className="wv-wallet__top">
        <p className="wv-wallet__show">{show.name}</p>
        <p className="wv-wallet__when wv-mono">
          {dateShort(show.date)} · {clock(doorsAt(show))}
        </p>

        <dl className="wv-wallet__meta">
          <div>
            <dt>{t("confirm.ticket.holder")}</dt>
            <dd>{ticket.holder}</dd>
          </div>
          <div>
            <dt>{t("confirm.ticket.type")}</dt>
            <dd>{type === undefined ? ticket.tt : label(type.name)}</dd>
          </div>
        </dl>
      </div>

      {/* The perforation is a real element in the flow, not a background: the
          two halves have to stay attached to each other at every width. */}
      <div className="wv-wallet__perf" aria-hidden="true">
        <span className="wv-wallet__notch wv-wallet__notch--start" />
        <span className="wv-wallet__dashes" />
        <span className="wv-wallet__notch wv-wallet__notch--end" />
      </div>

      <div className="wv-wallet__bottom">
        <div className="wv-wallet__codebox">
          <span className="wv-wallet__code wv-mono">{ticket.code}</span>
          {scanned ? (
            <span className="wv-wallet__used">
              <Check size={14} aria-hidden="true" />
              {t("mytickets.checkedIn", { time: clock(ticket.checkedInAt as number) })}
            </span>
          ) : (
            <Chip tone="pos">{t("mytickets.valid")}</Chip>
          )}
          <p className="wv-wallet__qrnote">{t("confirm.qr.note")}</p>
        </div>
        <QrTile code={ticket.code} />
      </div>
    </article>
  );
}
