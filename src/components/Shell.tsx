/**
 * TWO shells, switched by the demo dock's Attendee | Organizer segment.
 *
 * The attendee gets the venue's public site: a wordmark header, two nav links,
 * a theme toggle, a wide content column and a footer. The organizer gets
 * internal chrome — a sidebar with a "box office" badge, three tabs, and a
 * show switcher in the topbar. That difference is the product story, so it
 * lives in the chrome rather than being simulated inside each screen.
 *
 * Under 900px the organizer's sidebar becomes a hamburger and a slide-in
 * sheet; the attendee header simply wraps, because two links do not need a
 * drawer.
 */

import { isEmbedded } from "../embed.ts";
import { DEMO } from "../surface.ts";
import {
  BarChart3,
  DoorOpen,
  Menu,
  Moon,
  Sun,
  Ticket,
  Users,
  X,
} from "lucide-react";

import type { View } from "../data/types.ts";
import { appName } from "../i18n/ambient.ts";
import { useI18n } from "../i18n/index.tsx";
import { countdown } from "../lib/format.ts";
import { holdSecondsLeft } from "../lib/tickets.ts";
import { useStore } from "../state/store.ts";
import { ShowSwitcher } from "./Overlays.tsx";

/* ------------------------------------------------------------------ shared */

/**
 * The demo's own footer — and ONLY the demo's.
 *
 * It named the app a demo beside an `adminium.dev/demo/<key>` chip. True of the
 * marketplace demo; a falsehood on an operator's own deployment, where it told
 * their staff and their customers that the thing they were working in was a
 * sample. It shipped that way in all eight locales, in the hosted bundles both.
 *
 * `DEMO` folds to a literal at build time (`surface.ts`), so in every other
 * build this markup is eliminated rather than merely skipped — the same rule
 * D24 applied to the demo dock, which this footer was simply missed by.
 */
/**
 * What this app is CALLED on screen.
 *
 * The operator's name from Adminium when they set one, else the name this
 * build ships with. One helper rather than a `??` at each render site: a
 * sidebar, a wordmark and a dialog label that disagree about the name of the
 * app is a worse bug than any of them being wrong alone.
 *
 * Not localized, deliberately — an operator types one business name and it is
 * not Adminium's to translate. `chrome.brand` still is, for the apps that keep
 * the shipped one.
 */
function useBrand(): string {
  const { t } = useI18n();
  return appName() ?? t("chrome.brand");
}

function Footer({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  if (!DEMO) return null;
  return (
    <div className={`wv-foot ${className}`.trim()}>
      {t("chrome.footer.copy")}
      <span className="wv-foot__chip wv-mono">{t("chrome.footer.chip")}</span>
    </div>
  );
}

function ThemeToggle() {
  const { t } = useI18n();
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  return (
    <button
      type="button"
      className="wv-iconbtn wv-btn"
      onClick={toggleTheme}
      aria-label={t(theme === "dark" ? "chrome.dock.theme.light" : "chrome.dock.theme.dark")}
    >
      {theme === "dark" ? (
        <Sun size={16} aria-hidden="true" />
      ) : (
        <Moon size={16} aria-hidden="true" />
      )}
    </button>
  );
}

/* --------------------------------------------------------- attendee shell */

/**
 * The hold countdown. It is the one thing in the app whose text changes every
 * second, and it does so by reading a counter the store increments — never a
 * wall clock. It only exists while a hold does, which is also why the header
 * does not reserve space for it.
 */
function HoldPill() {
  const { t } = useI18n();
  const holds = useStore((s) => s.holds);
  const clock = useStore((s) => s.clock);
  const tickSeconds = useStore((s) => s.tickSeconds);
  const go = useStore((s) => s.go);
  const view = useStore((s) => s.view);

  const hold = holds.find((h) => h.mine);
  if (hold === undefined) return null;

  const left = holdSecondsLeft(hold, clock + tickSeconds / 60);
  const text = t("chrome.hold.pill", { time: countdown(left) });

  return (
    <button
      type="button"
      className={`wv-holdpill${left <= 60 ? " wv-holdpill--low" : ""}`}
      onClick={() => go("checkout")}
      aria-label={t("chrome.hold.pill.label", { time: countdown(left) })}
      aria-current={view === "checkout" ? "true" : undefined}
    >
      <Ticket size={14} aria-hidden="true" />
      <span className="wv-mono">{text}</span>
    </button>
  );
}

function SiteShell({ children }: { children: React.ReactNode }) {
  const brand = useBrand();
  const { t } = useI18n();
  const view = useStore((s) => s.view);
  const go = useStore((s) => s.go);

  const links: { view: View; labelKey: "chrome.nav.events" | "chrome.nav.mytickets" }[] = [
    { view: "home", labelKey: "chrome.nav.events" },
    { view: "mytickets", labelKey: "chrome.nav.mytickets" },
  ];

  return (
    <div className="wv-site">
      <header className="wv-siteheader">
        <button type="button" className="wv-wordmark" onClick={() => go("home")}>
          <span className="wv-wordmark__mark" aria-hidden="true" />
          {brand}
        </button>

        <nav className="wv-sitenav" aria-label={brand}>
          {links.map((link) => (
            <button
              key={link.view}
              type="button"
              className="wv-sitenav__item"
              aria-current={view === link.view ? "page" : undefined}
              onClick={() => go(link.view)}
            >
              {t(link.labelKey)}
            </button>
          ))}
        </nav>

        <div className="wv-siteheader__end">
          <HoldPill />
          <ThemeToggle />
        </div>
      </header>

      <main className="wv-sitebody" id="main">
        {children}
      </main>

      <footer className="wv-sitefoot">
        <Footer />
      </footer>
    </div>
  );
}

/* -------------------------------------------------------- organizer shell */

interface Tab {
  view: View;
  labelKey: "chrome.nav.sales" | "chrome.nav.attendees" | "chrome.nav.door";
  icon: typeof BarChart3;
}

const TABS: Tab[] = [
  { view: "sales", labelKey: "chrome.nav.sales", icon: BarChart3 },
  { view: "attendees", labelKey: "chrome.nav.attendees", icon: Users },
  { view: "door", labelKey: "chrome.nav.door", icon: DoorOpen },
];

function TabList({ onPick }: { onPick?: () => void }) {
  const { t } = useI18n();
  const view = useStore((s) => s.view);
  const go = useStore((s) => s.go);

  return (
    <nav className="wv-sidebar__nav" aria-label={t("chrome.brand.sub")}>
      {TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.view}
            type="button"
            className="wv-navitem"
            aria-current={view === tab.view ? "page" : undefined}
            onClick={() => {
              go(tab.view);
              onPick?.();
            }}
          >
            <Icon size={16} aria-hidden="true" />
            {t(tab.labelKey)}
          </button>
        );
      })}
    </nav>
  );
}

function Brand() {
  const brand = useBrand();
  const { t } = useI18n();
  return (
    <div className="wv-sidebar__brand">
      <span className="wv-sidebar__mark" aria-hidden="true">
        <Ticket size={18} />
      </span>
      <span>
        <span className="wv-sidebar__name">{brand}</span>
        <span className="wv-sidebar__badge">{t("chrome.brand.badge")}</span>
      </span>
    </div>
  );
}

/*
 * THE ZONE CHIP IS GONE, and the warning it carried now lives in Adminium.
 *
 * It rendered "Dates shown in UTC" — or a city nobody confirmed — permanently,
 * in the header of every screen, for everyone. But an unset timezone is the
 * OPERATOR's to fix, on the connection, in Adminium; staff and customers
 * reading this app can do nothing about it and were shown it on every page
 * anyway. Studio's Connections card now names the zone dates actually render
 * in whenever a connection has none, which is both where the fix is and the
 * only audience that can apply it.
 *
 * `timezoneNotice()` stays in `i18n/ambient.ts`: the claim is still worth
 * carrying and still logged at boot. Nothing renders it.
 */

function BoxOfficeShell({ children }: { children: React.ReactNode }) {
  const brand = useBrand();
  const { t } = useI18n();
  const navOpen = useStore((s) => s.navOpen);
  const setNavOpen = useStore((s) => s.setNavOpen);

  return (
    <div className="wv-app">
      <aside className="wv-sidebar">
        <Brand />
        <TabList />
        <Footer className="wv-foot--sidebar" />
      </aside>

      {navOpen && (
        <>
          <button
            type="button"
            className="wv-scrim"
            aria-label={t("chrome.menu.close")}
            onClick={() => setNavOpen(false)}
          />
          <div className="wv-sheet" role="dialog" aria-modal="true" aria-label={brand}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Brand />
              <button
                type="button"
                className="wv-iconbtn wv-btn"
                style={{ marginInlineStart: "auto", marginInlineEnd: 12 }}
                onClick={() => setNavOpen(false)}
                aria-label={t("chrome.menu.close")}
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>
            <TabList onPick={() => setNavOpen(false)} />
            <Footer className="wv-foot--sidebar" />
          </div>
        </>
      )}

      <div className="wv-main">
        <header className="wv-topbar">
          <button
            type="button"
            className="wv-iconbtn wv-btn wv-narrow-only"
            onClick={() => setNavOpen(true)}
            aria-label={t("chrome.menu.open")}
          >
            <Menu size={18} aria-hidden="true" />
          </button>

          <ShowSwitcher />
          <div className="wv-topbar__spacer" />
          <ThemeToggle />
        </header>

        <main className="wv-content" id="main">
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * NO CHROME AT ALL — the internal placement (29-app-surfaces.md D6).
 *
 * Blended into the Adminium dashboard, this app's screens render inside the
 * dashboard's own shell: Adminium's sidebar carries this app's sections and its
 * topbar carries the account menu, the theme control and the language control.
 * Rendering our own alongside would be two sidebars, two theme toggles and two
 * brands in one window.
 *
 * `#main` is kept, because the skip link targets it and a skip link pointing at
 * nothing is worse than no skip link.
 */
function EmbeddedShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="wv-embedded">
      <main className="wv-content" id="main">
        {children}
      </main>
    </div>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const persona = useStore((s) => s.persona);
  /*
   * A runtime check, not a build flag, and that is the point: ONE hosted-staff
   * bundle serves both placements. Opened directly at `/apps/events/staff/` it
   * renders the full box-office chrome; framed by the dashboard it renders
   * none. Switching placement is a setting in Studio, not a rebuild.
   */
  if (isEmbedded()) return <EmbeddedShell>{children}</EmbeddedShell>;
  return persona === "organizer" ? (
    <BoxOfficeShell>{children}</BoxOfficeShell>
  ) : (
    <SiteShell>{children}</SiteShell>
  );
}
