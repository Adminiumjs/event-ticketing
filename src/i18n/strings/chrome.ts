/**
 * Area bundle: **chrome**.
 *
 * Owns the two shells (`components/Shell.tsx`), the demo dock, the overlay
 * layer, the zustand store's own copy (toasts, refusals) and the `lib/` layer
 * — including the counted-noun strings `lib/format.ts` composes.
 *
 * `en-US` is the source of truth: every key it carries becomes part of
 * `MessageKey`, and `messages/index.ts` makes a missing translation a COMPILE
 * error rather than a silent fallback.
 *
 * Plural keys carry `|`-separated variants in the locale's own CLDR order:
 *   en/de/fr/da  one|other
 *   cs           one|few|other
 *   zh-CN/zh-TW  other        (a single variant — no `|`)
 *   ar-EG        zero|one|two|few|many|other
 *
 * VOCABULARY (21 D10, and prompt E's own rule): the different kinds of ticket
 * are "ticket types", never "tiers". The words "tier", "pricing", "plan" and
 * "upgrade" appear nowhere in this file, in any locale.
 */
import type { LocaleTag } from "../locales.ts";

const EN = {
  /* --- brand + shells --- */
  "chrome.brand": "Waveform",
  "chrome.brand.sub": "Box office",
  "chrome.brand.badge": "box office",
  "chrome.skipToContent": "Skip to content",
  "chrome.menu.open": "Open the menu",
  "chrome.menu.close": "Close the menu",

  /* --- navigation --- */
  "chrome.nav.events": "Events",
  "chrome.nav.mytickets": "My tickets",
  "chrome.nav.sales": "Sales",
  "chrome.nav.attendees": "Attendees",
  "chrome.nav.door": "Door",

  /* --- the organizer's show switcher --- */
  "chrome.switcher.open": "Switch show",
  "chrome.switcher.title": "Every show",
  "chrome.switcher.current": "Currently showing",

  /* --- the live hold --- */
  "chrome.hold.pill": "Held for {time}",
  /* The same words without the time, for the checkout bar where the countdown
     is its own mono element and must keep its bidi isolation. */
  "chrome.hold.heldFor": "Held for",
  "chrome.hold.pill.label": "Your tickets are held for {time} longer",
  "chrome.hold.release": "Release",

  /* --- demo dock --- */
  "chrome.dock.title": "Demo controls",
  "chrome.dock.expand": "Show the demo controls",
  "chrome.dock.collapse": "Hide the demo controls",
  "chrome.dock.persona": "Who is looking",
  "chrome.dock.attendee": "Attendee",
  "chrome.dock.organizer": "Organizer",
  "chrome.dock.clock": "Clock",
  "chrome.dock.advance": "Advance to doors",
  "chrome.dock.advance.title": "Jump the clock to the next show's doors",
  "chrome.dock.language": "Language",
  "chrome.dock.theme": "Theme",
  "chrome.dock.theme.light": "Switch to the light theme",
  "chrome.dock.theme.dark": "Switch to the dark theme",
  "chrome.dock.reset": "Reset the demo",

  /* --- footer --- */
  "chrome.footer.copy":
    "© 2026 Waveform. A demo ticketing site shipped with Adminium.",
  "chrome.footer.chip": "adminium.dev/demo/event-ticketing",

  /* --- shared actions --- */
  "chrome.action.cancel": "Cancel",
  "chrome.action.back": "Back",
  "chrome.action.backToEvents": "Back to events",
  "chrome.action.close": "Close",

  /* --- formatting scaffolds --- */
  "chrome.fmt.dowTime": "{dow} {time}",
  "chrome.fmt.dateTime": "{date} · {time}",
  "chrome.fmt.ofTotal": "{value} of {total}",

  /* --- show status chips --- */
  "chrome.status.onSale": "On sale",
  "chrome.status.sellingFast": "Selling fast",
  "chrome.status.soldOut": "Sold out",
  "chrome.status.saleStarts": "Sale starts {when}",
  "chrome.status.doorsOpen": "Doors open",
  "chrome.status.wrapped": "Wrapped",
  "chrome.status.tonight": "Tonight",

  /* --- counted nouns --- */
  "chrome.count.tickets": "{count} ticket|{count} tickets",
  "chrome.count.left": "{count} left|{count} left",
  "chrome.count.people": "{count} person|{count} people",

  /* --- toasts --- */
  "chrome.toast.holdStarted":
    "Held {count} ticket for 10 minutes.|Held {count} tickets for 10 minutes.",
  "chrome.toast.holdReleased": "Tickets released. They're back on sale.",
  "chrome.toast.holdExpired":
    "Your hold ran out, so the tickets went back on sale. Nothing was charged.",
  "chrome.toast.orderPlaced": "You're going. Order {order}.",
  "chrome.toast.checkedIn": "{name} is in.",
  "chrome.toast.alreadyIn": "That one has already been scanned.",
  "chrome.toast.unknownCode": "No such code.",
  "chrome.toast.wrongShow": "That ticket is for another night.",
  "chrome.toast.advanced": "Clock moved to {when} — doors for {show}.",
  "chrome.toast.noDoors": "Nothing left to advance to.",
  "chrome.toast.reset": "Demo reset.",
  "chrome.toast.dismiss": "Dismiss",

  /* --- hold refusals, raised from the store --- */
  "chrome.refuse.empty": "Pick at least one ticket.",
  "chrome.refuse.overCap": "Up to {max} per ticket type.",
  "chrome.refuse.notOnSale": "{type} isn't on sale right now.",
  "chrome.refuse.notEnough": "Only {count} left of {type}.",
  "chrome.refuse.needBuyer":
    "We need a name and an email to send the tickets to.",
} as const satisfies Record<string, string>;

/*
 * The seven non-English bundles carry real translations, key-for-key and in
 * `EN`'s order so the file stays diffable. Brand names ("Waveform",
 * "Adminium"), the footer URL and every `{placeholder}` are carried through
 * verbatim — do not add keys here that `EN` does not already carry.
 */
export const chrome = {
  "en-US": EN,

  "de-DE": {
    /* --- brand + shells --- */
    "chrome.brand": "Waveform",
    "chrome.brand.sub": "Ticketkasse",
    "chrome.brand.badge": "ticketkasse",
    "chrome.skipToContent": "Zum Inhalt springen",
    "chrome.menu.open": "Menü öffnen",
    "chrome.menu.close": "Menü schließen",

    /* --- navigation --- */
    "chrome.nav.events": "Veranstaltungen",
    "chrome.nav.mytickets": "Meine Tickets",
    "chrome.nav.sales": "Verkäufe",
    "chrome.nav.attendees": "Gäste",
    "chrome.nav.door": "Einlass",

    /* --- the organizer's show switcher --- */
    "chrome.switcher.open": "Veranstaltung wechseln",
    "chrome.switcher.title": "Alle Veranstaltungen",
    "chrome.switcher.current": "Wird gerade angezeigt",

    /* --- the live hold --- */
    "chrome.hold.pill": "Reserviert für {time}",
    "chrome.hold.heldFor": "Reserviert für",
    "chrome.hold.pill.label": "Deine Tickets sind noch {time} lang reserviert",
    "chrome.hold.release": "Freigeben",

    /* --- demo dock --- */
    "chrome.dock.title": "Demo-Steuerung",
    "chrome.dock.expand": "Demo-Steuerung einblenden",
    "chrome.dock.collapse": "Demo-Steuerung ausblenden",
    "chrome.dock.persona": "Wer schaut gerade",
    "chrome.dock.attendee": "Gast",
    "chrome.dock.organizer": "Veranstalter",
    "chrome.dock.clock": "Uhr",
    "chrome.dock.advance": "Vor bis zum Einlass",
    "chrome.dock.advance.title":
      "Die Uhr auf den Einlass der nächsten Veranstaltung stellen",
    "chrome.dock.language": "Sprache",
    "chrome.dock.theme": "Design",
    "chrome.dock.theme.light": "Zum hellen Design wechseln",
    "chrome.dock.theme.dark": "Zum dunklen Design wechseln",
    "chrome.dock.reset": "Demo zurücksetzen",

    /* --- footer --- */
    "chrome.footer.copy":
      "© 2026 Waveform. Eine Demo-Ticketseite, die mit Adminium ausgeliefert wird.",
    "chrome.footer.chip": "adminium.dev/demo/event-ticketing",

    /* --- shared actions --- */
    "chrome.action.cancel": "Abbrechen",
    "chrome.action.back": "Zurück",
    "chrome.action.backToEvents": "Zurück zu den Veranstaltungen",
    "chrome.action.close": "Schließen",

    /* --- formatting scaffolds --- */
    "chrome.fmt.dowTime": "{dow} {time}",
    "chrome.fmt.dateTime": "{date} · {time}",
    "chrome.fmt.ofTotal": "{value} von {total}",

    /* --- show status chips --- */
    "chrome.status.onSale": "Im Verkauf",
    "chrome.status.sellingFast": "Fast ausverkauft",
    "chrome.status.soldOut": "Ausverkauft",
    "chrome.status.saleStarts": "Verkauf startet {when}",
    "chrome.status.doorsOpen": "Einlass",
    "chrome.status.wrapped": "Vorbei",
    "chrome.status.tonight": "Heute Abend",

    /* --- counted nouns --- */
    "chrome.count.tickets": "{count} Ticket|{count} Tickets",
    "chrome.count.left": "noch {count}|noch {count}",
    "chrome.count.people": "{count} Person|{count} Personen",

    /* --- toasts --- */
    "chrome.toast.holdStarted":
      "{count} Ticket für 10 Minuten reserviert.|{count} Tickets für 10 Minuten reserviert.",
    "chrome.toast.holdReleased":
      "Tickets freigegeben. Sie sind wieder im Verkauf.",
    "chrome.toast.holdExpired":
      "Deine Reservierung ist abgelaufen, die Tickets sind wieder im Verkauf. Es wurde nichts abgebucht.",
    "chrome.toast.orderPlaced": "Du bist dabei. Bestellung {order}.",
    "chrome.toast.checkedIn": "{name} ist drin.",
    "chrome.toast.alreadyIn": "Dieses Ticket wurde schon gescannt.",
    "chrome.toast.unknownCode": "Diesen Code gibt es nicht.",
    "chrome.toast.wrongShow": "Dieses Ticket gilt für einen anderen Abend.",
    "chrome.toast.advanced": "Uhr auf {when} gestellt — Einlass für {show}.",
    "chrome.toast.noDoors": "Es gibt keinen weiteren Einlass mehr.",
    "chrome.toast.reset": "Demo zurückgesetzt.",
    "chrome.toast.dismiss": "Ausblenden",

    /* --- hold refusals, raised from the store --- */
    "chrome.refuse.empty": "Wähle mindestens ein Ticket.",
    "chrome.refuse.overCap": "Höchstens {max} pro Ticketart.",
    "chrome.refuse.notOnSale": "{type} ist gerade nicht im Verkauf.",
    "chrome.refuse.notEnough": "Von {type} sind nur noch {count} übrig.",
    "chrome.refuse.needBuyer":
      "Wir brauchen einen Namen und eine E-Mail-Adresse, an die wir die Tickets schicken.",
  },

  "fr-FR": {
    /* --- brand + shells --- */
    "chrome.brand": "Waveform",
    "chrome.brand.sub": "Billetterie",
    "chrome.brand.badge": "billetterie",
    "chrome.skipToContent": "Aller au contenu",
    "chrome.menu.open": "Ouvrir le menu",
    "chrome.menu.close": "Fermer le menu",

    /* --- navigation --- */
    "chrome.nav.events": "Événements",
    "chrome.nav.mytickets": "Mes billets",
    "chrome.nav.sales": "Ventes",
    "chrome.nav.attendees": "Participants",
    "chrome.nav.door": "Entrée",

    /* --- the organizer's show switcher --- */
    "chrome.switcher.open": "Changer d’événement",
    "chrome.switcher.title": "Tous les événements",
    "chrome.switcher.current": "Actuellement affiché",

    /* --- the live hold --- */
    "chrome.hold.pill": "Réservé pour {time}",
    "chrome.hold.heldFor": "Réservé pour",
    "chrome.hold.pill.label": "Vos billets sont réservés encore {time}",
    "chrome.hold.release": "Libérer",

    /* --- demo dock --- */
    "chrome.dock.title": "Commandes de la démo",
    "chrome.dock.expand": "Afficher les commandes de la démo",
    "chrome.dock.collapse": "Masquer les commandes de la démo",
    "chrome.dock.persona": "Qui regarde",
    "chrome.dock.attendee": "Participant",
    "chrome.dock.organizer": "Organisateur",
    "chrome.dock.clock": "Horloge",
    "chrome.dock.advance": "Avancer à l’ouverture des portes",
    "chrome.dock.advance.title":
      "Avancer l’horloge jusqu’à l’ouverture des portes du prochain événement",
    "chrome.dock.language": "Langue",
    "chrome.dock.theme": "Thème",
    "chrome.dock.theme.light": "Passer au thème clair",
    "chrome.dock.theme.dark": "Passer au thème sombre",
    "chrome.dock.reset": "Réinitialiser la démo",

    /* --- footer --- */
    "chrome.footer.copy":
      "© 2026 Waveform. Un site de billetterie de démonstration livré avec Adminium.",
    "chrome.footer.chip": "adminium.dev/demo/event-ticketing",

    /* --- shared actions --- */
    "chrome.action.cancel": "Annuler",
    "chrome.action.back": "Retour",
    "chrome.action.backToEvents": "Retour aux événements",
    "chrome.action.close": "Fermer",

    /* --- formatting scaffolds --- */
    "chrome.fmt.dowTime": "{dow} {time}",
    "chrome.fmt.dateTime": "{date} · {time}",
    "chrome.fmt.ofTotal": "{value} sur {total}",

    /* --- show status chips --- */
    "chrome.status.onSale": "En vente",
    "chrome.status.sellingFast": "Bientôt complet",
    "chrome.status.soldOut": "Complet",
    "chrome.status.saleStarts": "Vente à partir de {when}",
    "chrome.status.doorsOpen": "Ouverture des portes",
    "chrome.status.wrapped": "Terminé",
    "chrome.status.tonight": "Ce soir",

    /* --- counted nouns --- */
    "chrome.count.tickets": "{count} billet|{count} billets",
    "chrome.count.left": "{count} restant|{count} restants",
    "chrome.count.people": "{count} personne|{count} personnes",

    /* --- toasts --- */
    "chrome.toast.holdStarted":
      "{count} billet réservé pendant 10 minutes.|{count} billets réservés pendant 10 minutes.",
    "chrome.toast.holdReleased":
      "Billets libérés. Ils sont de nouveau en vente.",
    "chrome.toast.holdExpired":
      "Votre réservation a expiré, les billets sont de nouveau en vente. Rien n’a été débité.",
    "chrome.toast.orderPlaced": "Vous y serez. Commande {order}.",
    "chrome.toast.checkedIn": "{name} : c’est bon.",
    "chrome.toast.alreadyIn": "Ce billet a déjà été scanné.",
    "chrome.toast.unknownCode": "Ce code n’existe pas.",
    "chrome.toast.wrongShow": "Ce billet est pour un autre soir.",
    "chrome.toast.advanced":
      "Horloge avancée à {when} — ouverture des portes pour {show}.",
    "chrome.toast.noDoors": "Plus rien vers quoi avancer.",
    "chrome.toast.reset": "Démo réinitialisée.",
    "chrome.toast.dismiss": "Fermer",

    /* --- hold refusals, raised from the store --- */
    "chrome.refuse.empty": "Choisissez au moins un billet.",
    "chrome.refuse.overCap": "{max} maximum par type de billet.",
    "chrome.refuse.notOnSale": "{type} n’est pas en vente pour le moment.",
    "chrome.refuse.notEnough": "Il ne reste que {count} pour {type}.",
    "chrome.refuse.needBuyer":
      "Il nous faut un nom et une adresse e-mail pour envoyer les billets.",
  },

  "cs-CZ": {
    /* --- brand + shells --- */
    "chrome.brand": "Waveform",
    "chrome.brand.sub": "Pokladna",
    "chrome.brand.badge": "pokladna",
    "chrome.skipToContent": "Přejít na obsah",
    "chrome.menu.open": "Otevřít nabídku",
    "chrome.menu.close": "Zavřít nabídku",

    /* --- navigation --- */
    "chrome.nav.events": "Akce",
    "chrome.nav.mytickets": "Moje vstupenky",
    "chrome.nav.sales": "Prodej",
    "chrome.nav.attendees": "Návštěvníci",
    "chrome.nav.door": "Vstup",

    /* --- the organizer's show switcher --- */
    "chrome.switcher.open": "Přepnout akci",
    "chrome.switcher.title": "Všechny akce",
    "chrome.switcher.current": "Právě zobrazeno",

    /* --- the live hold --- */
    "chrome.hold.pill": "Rezervováno na {time}",
    "chrome.hold.heldFor": "Rezervováno na",
    "chrome.hold.pill.label": "Vstupenky máte rezervované ještě {time}",
    "chrome.hold.release": "Uvolnit",

    /* --- demo dock --- */
    "chrome.dock.title": "Ovládání dema",
    "chrome.dock.expand": "Zobrazit ovládání dema",
    "chrome.dock.collapse": "Skrýt ovládání dema",
    "chrome.dock.persona": "Kdo se dívá",
    "chrome.dock.attendee": "Návštěvník",
    "chrome.dock.organizer": "Pořadatel",
    "chrome.dock.clock": "Hodiny",
    "chrome.dock.advance": "Posunout ke vstupu",
    "chrome.dock.advance.title": "Posunout hodiny ke vstupu na další akci",
    "chrome.dock.language": "Jazyk",
    "chrome.dock.theme": "Motiv",
    "chrome.dock.theme.light": "Přepnout na světlý motiv",
    "chrome.dock.theme.dark": "Přepnout na tmavý motiv",
    "chrome.dock.reset": "Resetovat demo",

    /* --- footer --- */
    "chrome.footer.copy":
      "© 2026 Waveform. Ukázkový web s prodejem vstupenek dodávaný s Adminium.",
    "chrome.footer.chip": "adminium.dev/demo/event-ticketing",

    /* --- shared actions --- */
    "chrome.action.cancel": "Zrušit",
    "chrome.action.back": "Zpět",
    "chrome.action.backToEvents": "Zpět na akce",
    "chrome.action.close": "Zavřít",

    /* --- formatting scaffolds --- */
    "chrome.fmt.dowTime": "{dow} {time}",
    "chrome.fmt.dateTime": "{date} · {time}",
    "chrome.fmt.ofTotal": "{value} z {total}",

    /* --- show status chips --- */
    "chrome.status.onSale": "V prodeji",
    "chrome.status.sellingFast": "Rychle mizí",
    "chrome.status.soldOut": "Vyprodáno",
    "chrome.status.saleStarts": "Prodej začíná {when}",
    "chrome.status.doorsOpen": "Otevření dveří",
    "chrome.status.wrapped": "Skončilo",
    "chrome.status.tonight": "Dnes večer",

    /* --- counted nouns --- */
    "chrome.count.tickets":
      "{count} vstupenka|{count} vstupenky|{count} vstupenek",
    "chrome.count.left": "zbývá {count}|zbývají {count}|zbývá {count}",
    "chrome.count.people": "{count} osoba|{count} osoby|{count} osob",

    /* --- toasts --- */
    "chrome.toast.holdStarted":
      "{count} vstupenka rezervována na 10 minut.|{count} vstupenky rezervovány na 10 minut.|{count} vstupenek rezervováno na 10 minut.",
    "chrome.toast.holdReleased": "Vstupenky uvolněny. Jsou zase v prodeji.",
    "chrome.toast.holdExpired":
      "Rezervace vypršela, takže vstupenky jsou zase v prodeji. Nic jsme nestrhli.",
    "chrome.toast.orderPlaced": "Jdeš na to. Objednávka {order}.",
    "chrome.toast.checkedIn": "{name} je uvnitř.",
    "chrome.toast.alreadyIn": "Tahle vstupenka už byla načtená.",
    "chrome.toast.unknownCode": "Takový kód neexistuje.",
    "chrome.toast.wrongShow": "Tahle vstupenka je na jiný večer.",
    "chrome.toast.advanced": "Hodiny posunuty na {when} — vstup na {show}.",
    "chrome.toast.noDoors": "Není kam dál posunout.",
    "chrome.toast.reset": "Demo resetováno.",
    "chrome.toast.dismiss": "Zavřít",

    /* --- hold refusals, raised from the store --- */
    "chrome.refuse.empty": "Vyberte aspoň jednu vstupenku.",
    "chrome.refuse.overCap": "Nejvýš {max} od každého typu vstupenky.",
    "chrome.refuse.notOnSale": "{type} teď není v prodeji.",
    "chrome.refuse.notEnough": "Z {type} zbývá jen {count}.",
    "chrome.refuse.needBuyer":
      "Potřebujeme jméno a e-mail, kam vstupenky pošleme.",
  },

  "da-DK": {
    /* --- brand + shells --- */
    "chrome.brand": "Waveform",
    "chrome.brand.sub": "Billetsalg",
    "chrome.brand.badge": "billetsalg",
    "chrome.skipToContent": "Gå til indhold",
    "chrome.menu.open": "Åbn menuen",
    "chrome.menu.close": "Luk menuen",

    /* --- navigation --- */
    "chrome.nav.events": "Arrangementer",
    "chrome.nav.mytickets": "Mine billetter",
    "chrome.nav.sales": "Salg",
    "chrome.nav.attendees": "Gæster",
    "chrome.nav.door": "Indgang",

    /* --- the organizer's show switcher --- */
    "chrome.switcher.open": "Skift arrangement",
    "chrome.switcher.title": "Alle arrangementer",
    "chrome.switcher.current": "Vises nu",

    /* --- the live hold --- */
    "chrome.hold.pill": "Reserveret i {time}",
    "chrome.hold.heldFor": "Reserveret i",
    "chrome.hold.pill.label": "Dine billetter er reserveret {time} endnu",
    "chrome.hold.release": "Frigiv",

    /* --- demo dock --- */
    "chrome.dock.title": "Demo-kontroller",
    "chrome.dock.expand": "Vis demo-kontrollerne",
    "chrome.dock.collapse": "Skjul demo-kontrollerne",
    "chrome.dock.persona": "Hvem kigger",
    "chrome.dock.attendee": "Gæst",
    "chrome.dock.organizer": "Arrangør",
    "chrome.dock.clock": "Ur",
    "chrome.dock.advance": "Spring frem til dørene",
    "chrome.dock.advance.title":
      "Stil uret frem til dørene for det næste arrangement",
    "chrome.dock.language": "Sprog",
    "chrome.dock.theme": "Tema",
    "chrome.dock.theme.light": "Skift til lyst tema",
    "chrome.dock.theme.dark": "Skift til mørkt tema",
    "chrome.dock.reset": "Nulstil demoen",

    /* --- footer --- */
    "chrome.footer.copy":
      "© 2026 Waveform. Et demo-billetsite, der følger med Adminium.",
    "chrome.footer.chip": "adminium.dev/demo/event-ticketing",

    /* --- shared actions --- */
    "chrome.action.cancel": "Annuller",
    "chrome.action.back": "Tilbage",
    "chrome.action.backToEvents": "Tilbage til arrangementer",
    "chrome.action.close": "Luk",

    /* --- formatting scaffolds --- */
    "chrome.fmt.dowTime": "{dow} {time}",
    "chrome.fmt.dateTime": "{date} · {time}",
    "chrome.fmt.ofTotal": "{value} af {total}",

    /* --- show status chips --- */
    "chrome.status.onSale": "I salg",
    "chrome.status.sellingFast": "Snart udsolgt",
    "chrome.status.soldOut": "Udsolgt",
    "chrome.status.saleStarts": "Salget starter {when}",
    "chrome.status.doorsOpen": "Dørene åbner",
    "chrome.status.wrapped": "Slut",
    "chrome.status.tonight": "I aften",

    /* --- counted nouns --- */
    "chrome.count.tickets": "{count} billet|{count} billetter",
    "chrome.count.left": "{count} tilbage|{count} tilbage",
    "chrome.count.people": "{count} person|{count} personer",

    /* --- toasts --- */
    "chrome.toast.holdStarted":
      "{count} billet er reserveret i 10 minutter.|{count} billetter er reserveret i 10 minutter.",
    "chrome.toast.holdReleased": "Billetterne er frigivet. De er i salg igen.",
    "chrome.toast.holdExpired":
      "Din reservation udløb, så billetterne er i salg igen. Der blev ikke trukket noget.",
    "chrome.toast.orderPlaced": "Du er med. Ordre {order}.",
    "chrome.toast.checkedIn": "{name} er inde.",
    "chrome.toast.alreadyIn": "Den billet er allerede scannet.",
    "chrome.toast.unknownCode": "Den kode findes ikke.",
    "chrome.toast.wrongShow": "Den billet er til en anden aften.",
    "chrome.toast.advanced": "Uret er stillet til {when} — dørene til {show}.",
    "chrome.toast.noDoors": "Der er ikke mere at springe frem til.",
    "chrome.toast.reset": "Demoen er nulstillet.",
    "chrome.toast.dismiss": "Luk",

    /* --- hold refusals, raised from the store --- */
    "chrome.refuse.empty": "Vælg mindst én billet.",
    "chrome.refuse.overCap": "Højst {max} pr. billettype.",
    "chrome.refuse.notOnSale": "{type} er ikke i salg lige nu.",
    "chrome.refuse.notEnough": "Der er kun {count} tilbage af {type}.",
    "chrome.refuse.needBuyer":
      "Vi skal bruge et navn og en e-mailadresse, som billetterne kan sendes til.",
  },

  "zh-CN": {
    /* --- brand + shells --- */
    "chrome.brand": "Waveform",
    "chrome.brand.sub": "售票处",
    "chrome.brand.badge": "售票处",
    "chrome.skipToContent": "跳到主要内容",
    "chrome.menu.open": "打开菜单",
    "chrome.menu.close": "关闭菜单",

    /* --- navigation --- */
    "chrome.nav.events": "演出",
    "chrome.nav.mytickets": "我的门票",
    "chrome.nav.sales": "销售",
    "chrome.nav.attendees": "观众",
    "chrome.nav.door": "入场",

    /* --- the organizer's show switcher --- */
    "chrome.switcher.open": "切换演出",
    "chrome.switcher.title": "所有演出",
    "chrome.switcher.current": "当前显示",

    /* --- the live hold --- */
    "chrome.hold.pill": "保留 {time}",
    "chrome.hold.heldFor": "保留",
    "chrome.hold.pill.label": "你的门票还会保留 {time}",
    "chrome.hold.release": "释放",

    /* --- demo dock --- */
    "chrome.dock.title": "演示控件",
    "chrome.dock.expand": "显示演示控件",
    "chrome.dock.collapse": "隐藏演示控件",
    "chrome.dock.persona": "当前身份",
    "chrome.dock.attendee": "观众",
    "chrome.dock.organizer": "主办方",
    "chrome.dock.clock": "时钟",
    "chrome.dock.advance": "快进到入场时间",
    "chrome.dock.advance.title": "把时钟拨到下一场演出的入场时间",
    "chrome.dock.language": "语言",
    "chrome.dock.theme": "主题",
    "chrome.dock.theme.light": "切换到浅色主题",
    "chrome.dock.theme.dark": "切换到深色主题",
    "chrome.dock.reset": "重置演示",

    /* --- footer --- */
    "chrome.footer.copy":
      "© 2026 Waveform。随 Adminium 一同发布的演示售票网站。",
    "chrome.footer.chip": "adminium.dev/demo/event-ticketing",

    /* --- shared actions --- */
    "chrome.action.cancel": "取消",
    "chrome.action.back": "返回",
    "chrome.action.backToEvents": "返回演出列表",
    "chrome.action.close": "关闭",

    /* --- formatting scaffolds --- */
    "chrome.fmt.dowTime": "{dow} {time}",
    "chrome.fmt.dateTime": "{date} · {time}",
    "chrome.fmt.ofTotal": "{value} / {total}",

    /* --- show status chips --- */
    "chrome.status.onSale": "售票中",
    "chrome.status.sellingFast": "即将售罄",
    "chrome.status.soldOut": "已售罄",
    "chrome.status.saleStarts": "{when} 开售",
    "chrome.status.doorsOpen": "开始入场",
    "chrome.status.wrapped": "已结束",
    "chrome.status.tonight": "今晚",

    /* --- counted nouns --- */
    "chrome.count.tickets": "{count} 张门票",
    "chrome.count.left": "还剩 {count} 张",
    "chrome.count.people": "{count} 人",

    /* --- toasts --- */
    "chrome.toast.holdStarted": "已为你保留 {count} 张门票，限时 10 分钟。",
    "chrome.toast.holdReleased": "门票已释放，重新开放购买。",
    "chrome.toast.holdExpired":
      "保留时间已到，门票重新开放购买。没有扣任何款项。",
    "chrome.toast.orderPlaced": "搞定，你能去了。订单 {order}。",
    "chrome.toast.checkedIn": "{name} 已入场。",
    "chrome.toast.alreadyIn": "这张票已经扫过了。",
    "chrome.toast.unknownCode": "没有这个票码。",
    "chrome.toast.wrongShow": "这张票是另一场演出的。",
    "chrome.toast.advanced": "时钟已拨到 {when} —— {show} 开始入场。",
    "chrome.toast.noDoors": "没有可以跳转的场次了。",
    "chrome.toast.reset": "演示已重置。",
    "chrome.toast.dismiss": "关闭",

    /* --- hold refusals, raised from the store --- */
    "chrome.refuse.empty": "请至少选择一张门票。",
    "chrome.refuse.overCap": "每种门票最多 {max} 张。",
    "chrome.refuse.notOnSale": "{type} 目前不在售。",
    "chrome.refuse.notEnough": "{type} 只剩 {count} 张了。",
    "chrome.refuse.needBuyer": "请填写姓名和邮箱，我们好把门票发过去。",
  },

  "zh-TW": {
    /* --- brand + shells --- */
    "chrome.brand": "Waveform",
    "chrome.brand.sub": "售票處",
    "chrome.brand.badge": "售票處",
    "chrome.skipToContent": "跳至主要內容",
    "chrome.menu.open": "開啟選單",
    "chrome.menu.close": "關閉選單",

    /* --- navigation --- */
    "chrome.nav.events": "演出",
    "chrome.nav.mytickets": "我的票券",
    "chrome.nav.sales": "銷售",
    "chrome.nav.attendees": "觀眾",
    "chrome.nav.door": "入場",

    /* --- the organizer's show switcher --- */
    "chrome.switcher.open": "切換演出",
    "chrome.switcher.title": "所有演出",
    "chrome.switcher.current": "目前顯示",

    /* --- the live hold --- */
    "chrome.hold.pill": "保留 {time}",
    "chrome.hold.heldFor": "保留",
    "chrome.hold.pill.label": "你的票券還會保留 {time}",
    "chrome.hold.release": "釋出",

    /* --- demo dock --- */
    "chrome.dock.title": "示範控制項",
    "chrome.dock.expand": "顯示示範控制項",
    "chrome.dock.collapse": "隱藏示範控制項",
    "chrome.dock.persona": "目前身分",
    "chrome.dock.attendee": "觀眾",
    "chrome.dock.organizer": "主辦方",
    "chrome.dock.clock": "時鐘",
    "chrome.dock.advance": "快轉到入場時間",
    "chrome.dock.advance.title": "把時鐘撥到下一場演出的入場時間",
    "chrome.dock.language": "語言",
    "chrome.dock.theme": "佈景主題",
    "chrome.dock.theme.light": "切換到淺色佈景主題",
    "chrome.dock.theme.dark": "切換到深色佈景主題",
    "chrome.dock.reset": "重設示範",

    /* --- footer --- */
    "chrome.footer.copy":
      "© 2026 Waveform。隨 Adminium 一起發布的示範售票網站。",
    "chrome.footer.chip": "adminium.dev/demo/event-ticketing",

    /* --- shared actions --- */
    "chrome.action.cancel": "取消",
    "chrome.action.back": "返回",
    "chrome.action.backToEvents": "返回演出列表",
    "chrome.action.close": "關閉",

    /* --- formatting scaffolds --- */
    "chrome.fmt.dowTime": "{dow} {time}",
    "chrome.fmt.dateTime": "{date} · {time}",
    "chrome.fmt.ofTotal": "{value} / {total}",

    /* --- show status chips --- */
    "chrome.status.onSale": "售票中",
    "chrome.status.sellingFast": "即將售完",
    "chrome.status.soldOut": "已售完",
    "chrome.status.saleStarts": "{when} 開賣",
    "chrome.status.doorsOpen": "開始入場",
    "chrome.status.wrapped": "已結束",
    "chrome.status.tonight": "今晚",

    /* --- counted nouns --- */
    "chrome.count.tickets": "{count} 張票券",
    "chrome.count.left": "還剩 {count} 張",
    "chrome.count.people": "{count} 人",

    /* --- toasts --- */
    "chrome.toast.holdStarted": "已為你保留 {count} 張票券，限時 10 分鐘。",
    "chrome.toast.holdReleased": "票券已釋出，重新開放購買。",
    "chrome.toast.holdExpired":
      "保留時間已到，票券重新開放購買。沒有扣任何款項。",
    "chrome.toast.orderPlaced": "搞定，你可以去了。訂單 {order}。",
    "chrome.toast.checkedIn": "{name} 已入場。",
    "chrome.toast.alreadyIn": "這張票已經掃過了。",
    "chrome.toast.unknownCode": "查無此票券代碼。",
    "chrome.toast.wrongShow": "這張票是另一場演出的。",
    "chrome.toast.advanced": "時鐘已撥到 {when} —— {show} 開始入場。",
    "chrome.toast.noDoors": "沒有可以跳轉的場次了。",
    "chrome.toast.reset": "示範已重設。",
    "chrome.toast.dismiss": "關閉",

    /* --- hold refusals, raised from the store --- */
    "chrome.refuse.empty": "請至少選擇一張票券。",
    "chrome.refuse.overCap": "每種票券最多 {max} 張。",
    "chrome.refuse.notOnSale": "{type} 目前未開賣。",
    "chrome.refuse.notEnough": "{type} 只剩 {count} 張了。",
    "chrome.refuse.needBuyer": "請填寫姓名和電子郵件，我們好把票券寄過去。",
  },

  "ar-EG": {
    /* --- brand + shells --- */
    "chrome.brand": "Waveform",
    "chrome.brand.sub": "شباك التذاكر",
    "chrome.brand.badge": "شباك التذاكر",
    "chrome.skipToContent": "تخطَّ إلى المحتوى",
    "chrome.menu.open": "افتح القائمة",
    "chrome.menu.close": "اقفل القائمة",

    /* --- navigation --- */
    "chrome.nav.events": "الفعاليات",
    "chrome.nav.mytickets": "تذاكري",
    "chrome.nav.sales": "المبيعات",
    "chrome.nav.attendees": "الحضور",
    "chrome.nav.door": "البوابة",

    /* --- the organizer's show switcher --- */
    "chrome.switcher.open": "بدّل الفعالية",
    "chrome.switcher.title": "كل الفعاليات",
    "chrome.switcher.current": "المعروض حاليًا",

    /* --- the live hold --- */
    "chrome.hold.pill": "محجوزة لمدة {time}",
    "chrome.hold.heldFor": "محجوزة لمدة",
    "chrome.hold.pill.label": "تذاكرك محجوزة لمدة {time} كمان",
    "chrome.hold.release": "إلغاء الحجز",

    /* --- demo dock --- */
    "chrome.dock.title": "أدوات العرض التجريبي",
    "chrome.dock.expand": "أظهر أدوات العرض التجريبي",
    "chrome.dock.collapse": "أخفِ أدوات العرض التجريبي",
    "chrome.dock.persona": "مين بيتفرج",
    "chrome.dock.attendee": "زائر",
    "chrome.dock.organizer": "المنظّم",
    "chrome.dock.clock": "الساعة",
    "chrome.dock.advance": "قدّم الوقت لفتح الأبواب",
    "chrome.dock.advance.title": "حرّك الساعة لوقت فتح أبواب الفعالية الجاية",
    "chrome.dock.language": "اللغة",
    "chrome.dock.theme": "المظهر",
    "chrome.dock.theme.light": "بدّل للمظهر الفاتح",
    "chrome.dock.theme.dark": "بدّل للمظهر الداكن",
    "chrome.dock.reset": "إعادة ضبط العرض التجريبي",

    /* --- footer --- */
    "chrome.footer.copy":
      "© 2026 Waveform. موقع تذاكر تجريبي بيجي مع Adminium.",
    "chrome.footer.chip": "adminium.dev/demo/event-ticketing",

    /* --- shared actions --- */
    "chrome.action.cancel": "إلغاء",
    "chrome.action.back": "رجوع",
    "chrome.action.backToEvents": "رجوع للفعاليات",
    "chrome.action.close": "إغلاق",

    /* --- formatting scaffolds --- */
    "chrome.fmt.dowTime": "{dow} {time}",
    "chrome.fmt.dateTime": "{date} · {time}",
    "chrome.fmt.ofTotal": "{value} من {total}",

    /* --- show status chips --- */
    "chrome.status.onSale": "متاحة للبيع",
    "chrome.status.sellingFast": "بتخلص بسرعة",
    "chrome.status.soldOut": "نفدت التذاكر",
    "chrome.status.saleStarts": "البيع يبدأ {when}",
    "chrome.status.doorsOpen": "فتح الأبواب",
    "chrome.status.wrapped": "خلصت",
    "chrome.status.tonight": "النهارده بالليل",

    /* --- counted nouns --- */
    "chrome.count.tickets":
      "{count} تذكرة|{count} تذكرة|{count} تذكرتان|{count} تذاكر|{count} تذكرة|{count} تذكرة",
    "chrome.count.left":
      "{count} تذكرة متبقية|{count} تذكرة متبقية|{count} تذكرتان متبقيتان|{count} تذاكر متبقية|{count} تذكرة متبقية|{count} تذكرة متبقية",
    "chrome.count.people":
      "{count} شخص|{count} شخص|{count} شخصان|{count} أشخاص|{count} شخصًا|{count} شخص",

    /* --- toasts --- */
    "chrome.toast.holdStarted":
      "تم حجز {count} تذكرة لمدة 10 دقائق.|تم حجز {count} تذكرة لمدة 10 دقائق.|تم حجز {count} تذكرتان لمدة 10 دقائق.|تم حجز {count} تذاكر لمدة 10 دقائق.|تم حجز {count} تذكرة لمدة 10 دقائق.|تم حجز {count} تذكرة لمدة 10 دقائق.",
    "chrome.toast.holdReleased": "تم إلغاء الحجز. التذاكر رجعت للبيع.",
    "chrome.toast.holdExpired":
      "الحجز خلص وقته، فالتذاكر رجعت للبيع. مفيش أي مبلغ اتخصم.",
    "chrome.toast.orderPlaced": "تمام، إنت رايح. الطلب {order}.",
    "chrome.toast.checkedIn": "{name} دخل.",
    "chrome.toast.alreadyIn": "التذكرة دي اتمسحت قبل كده.",
    "chrome.toast.unknownCode": "الكود ده مش موجود.",
    "chrome.toast.wrongShow": "التذكرة دي لليلة تانية.",
    "chrome.toast.advanced": "الساعة اتحركت لـ {when} — فتح أبواب {show}.",
    "chrome.toast.noDoors": "مفيش حاجة تانية نقدّم لها الوقت.",
    "chrome.toast.reset": "تم إعادة ضبط العرض التجريبي.",
    "chrome.toast.dismiss": "إخفاء",

    /* --- hold refusals, raised from the store --- */
    "chrome.refuse.empty": "اختار تذكرة واحدة على الأقل.",
    "chrome.refuse.overCap": "الحد الأقصى {max} لكل نوع تذكرة.",
    "chrome.refuse.notOnSale": "{type} مش متاحة للبيع دلوقتي.",
    "chrome.refuse.notEnough": "فاضل {count} بس من {type}.",
    "chrome.refuse.needBuyer": "محتاجين اسم وإيميل نبعت عليه التذاكر.",
  },
} satisfies Record<LocaleTag, Record<string, string>>;
