/**
 * The browser tab's words for the screen on show: the screen (or the show it
 * is about) and the venue — "What's on · Waveform", "Neon Circuit · Waveform",
 * "Orders · Waveform" — in the reader's language, so a tab, a bookmark and a
 * screen reader's page change all name where the reader is. Before the
 * venue answers, the name the operator gave the app stands in for it.
 *
 * Reads the controller's state only: it reaches no box-office module, so the
 * audience's build carries it as it is.
 */
import { appName } from "../i18n/ambient.ts";
import { tr } from "../i18n/tr.ts";
import type { WaveApp } from "./wave.ts";

function screenWords(app: WaveApp): string {
  const s = app.state;
  const w = app.world();
  const showName = (id: unknown) => (id === null || id === undefined ? "" : (w?.byId.get(id as never)?.name ?? ""));
  if (app.persona === "box") {
    switch (s.bx) {
      case "today":
        return tr("Today");
      case "events":
        return tr("Events");
      case "editor":
        return showName(s.box?.bev) || tr("New event");
      case "sales":
      case "pc":
        return showName(s.box?.bev) || tr("Events");
      case "orders":
        return tr("Orders");
      case "refunds":
        return tr("Refund requests");
      case "guests":
        return tr("Guest lists");
      case "waits":
        return tr("Waitlists");
      case "codes":
        return tr("Codes");
      case "msgs":
        return tr("Messages");
      case "settings":
        return tr("Settings");
      case "door":
        return tr("Door");
      default:
        return "";
    }
  }
  if (s.dm !== null) return tr("Your ticket");
  switch (s.scr) {
    case "home":
      return tr("What's on");
    case "event":
      return showName(s.evId);
    case "checkout":
      return tr("Checkout");
    case "going":
      return tr("Order");
    case "signin":
      return tr("Sign in");
    case "tickets":
      return tr("My tickets");
    case "friend":
      return tr("A ticket for you");
    case "offer":
      return tr("The waitlist offer");
    case "confirm":
      return tr("Confirm your order");
    case "404":
      return tr("This page doesn't exist");
    default:
      return "";
  }
}

/** The tab's title: "{screen} · {venue}", or whichever of the two there is. */
export function docTitle(app: WaveApp): string {
  const venue = app.world()?.settings.venueName || appName() || "";
  return [screenWords(app), venue].filter((x) => x !== "").join(" · ");
}
