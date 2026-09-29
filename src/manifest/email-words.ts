/**
 * The emails' words in the seven languages beside English (the English and
 * the layout are in `emails.ts`).
 *
 * EVERY LANGUAGE HERE IS AN UNREVIEWED DRAFT until a native speaker has read
 * it (the release waits for that review). `{{…}}` are the outbox's variables,
 * left exactly as they are; a date, a time and money are written by Adminium
 * in the reader's language. The sentences are count-free: the templates have
 * no plural forms.
 */
import type { EmailWords } from "./emails.ts";

// prettier-ignore
export const EMAIL_DE: EmailWords = {
  "order": "Bestellung",
  "address": "{{appName}} · {{practice.address}} · {{practice.contact_email}}",
  "bankTitle": "Per Überweisung bezahlen",
  "bankName": "Kontoinhaber",
  "bankBank": "Bank",
  "bankNumber": "Kontonummer",
  "bankRouting": "BIC oder Bankleitzahl",
  "bankReference": "Verwendungszweck",
  "receiptAttached": "Deine Quittung ist angehängt.",
  "tickets": {
    "name": "Deine Tickets",
    "subject": "Deine Tickets für {{order.event.name}} · {{order.number}}",
    "preheader": "{{order.event.doors_at.date}} · Einlass {{order.event.doors_at.time}}",
    "heading": "Du bist dabei: {{order.event.name}}",
    "paras": [
      "{{order.event.doors_at.date}} · Einlass {{order.event.doors_at.time}} · Beginn {{order.event.starts_at.time}} · {{order.room.name}}. {{order.event.age_note}}",
      "Zeig am Einlass den Code jedes Tickets. Was noch offen ist, zahlst du dort, mit Karte oder bar."
    ],
    "button": "Meine Bestellung ansehen",
    "foot": "Bestellung {{order.number}}. Der Button öffnet deine Bestellung – heb diese E-Mail gut auf."
  },
  "tickets-paid": {
    "name": "Deine Tickets (an der Kasse bezahlt)",
    "subject": "Deine Tickets für {{order.event.name}} · {{order.number}}",
    "preheader": "Bezahlt · {{order.total}}",
    "heading": "Du bist dabei: {{order.event.name}}",
    "paras": [
      "{{order.event.doors_at.date}} · Einlass {{order.event.doors_at.time}} · Beginn {{order.event.starts_at.time}} · {{order.room.name}}. {{order.event.age_note}}",
      "Vollständig bezahlt: {{order.total}}. Zeig am Einlass den Code jedes Tickets."
    ],
    "button": "Meine Bestellung ansehen",
    "foot": "Bestellung {{order.number}}. Der Button öffnet deine Bestellung – heb diese E-Mail gut auf."
  },
  "transfer-confirm": {
    "name": "Bestätige deine Bestellung",
    "subject": "Bestätige deine Bestellung für {{order.event.name}} · {{order.number}}",
    "preheader": "Bestätige bis {{order.held_until.time}}, damit deine Tickets reserviert bleiben",
    "heading": "Bestätige deine Bestellung",
    "paras": [
      "Du möchtest deine Tickets für {{order.event.name}} per Überweisung bezahlen. Drück bis {{order.held_until.time}} auf den Button, um die Bestellung zu bestätigen – dann schicken wir dir die Bankdaten.",
      "Bis dahin halten wir deine Tickets für dich zurück."
    ],
    "button": "Bestellung bestätigen",
    "foot": "Du bekommst diese E-Mail, weil mit dieser Adresse Tickets bei {{appName}} bestellt wurden. Du hast nichts bestellt? Dann ignoriere sie einfach."
  },
  "transfer-waiting": {
    "name": "Wir warten auf deine Überweisung",
    "subject": "Bitte bis {{order.pay_by.date}} überweisen, damit du deine Tickets für {{order.event.name}} behältst · {{order.number}}",
    "preheader": "{{order.total}} bis {{order.pay_by.date}}, {{order.pay_by.time}}",
    "heading": "Noch ein Schritt: die Überweisung",
    "paras": [
      "Überweise {{order.total}} bis {{order.pay_by.date}}, {{order.pay_by.time}} mit dem Verwendungszweck {{order.number}}. Sobald das Geld da ist, kommen deine Tickets per E-Mail.",
      "Unbezahlte Tickets gehen {{practice.release_after_hours}} Std. danach wieder in den Verkauf."
    ],
    "button": "Meine Bestellung ansehen",
    "foot": "Bestellung {{order.number}}. Der Button öffnet deine Bestellung – heb diese E-Mail gut auf."
  },
  "transfer-reminder": {
    "name": "Erinnerung: deine Überweisung",
    "subject": "Erinnerung: deine Überweisung für {{order.event.name}} · {{order.number}}",
    "preheader": "{{order.total}}, fällig am {{order.pay_by.date}}",
    "heading": "Deine Überweisung ist noch nicht da",
    "paras": [
      "Für Bestellung {{order.number}} haben wir {{order.total}} noch nicht erhalten. Fällig war der Betrag am {{order.pay_by.date}}, {{order.pay_by.time}}.",
      "Unbezahlte Tickets gehen bald wieder in den Verkauf. Wenn du schon überwiesen hast, musst du nichts weiter tun."
    ],
    "button": "Meine Bestellung ansehen",
    "foot": "Bestellung {{order.number}}. Der Button öffnet deine Bestellung – heb diese E-Mail gut auf."
  },
  "transfer-released": {
    "name": "Deine Tickets sind wieder im Verkauf",
    "subject": "Deine Tickets für {{order.event.name}} sind wieder im Verkauf · {{order.number}}",
    "preheader": "Die Überweisung kam nicht rechtzeitig an",
    "heading": "Deine Tickets sind wieder im Verkauf",
    "paras": [
      "Die Überweisung für Bestellung {{order.number}} kam nicht rechtzeitig an, deshalb sind die Tickets wieder im Verkauf. Falls du doch überwiesen hast, schreib uns an {{practice.contact_email}}."
    ],
    "button": "Zum Programm",
    "foot": "Bestellung {{order.number}}."
  },
  "payment-received": {
    "name": "Zahlung erhalten",
    "subject": "Zahlung erhalten · {{order.event.name}} · {{order.number}}",
    "preheader": "{{order.paid_in}} erhalten · deine Tickets",
    "heading": "Zahlung erhalten",
    "paras": [
      "Danke – wir haben {{order.paid_in}} für Bestellung {{order.number}} erhalten. Hier sind deine Tickets.",
      "{{order.event.doors_at.date}} · Einlass {{order.event.doors_at.time}} · {{order.room.name}}."
    ],
    "button": "Meine Bestellung ansehen",
    "foot": "Bestellung {{order.number}}. Der Button öffnet deine Bestellung – heb diese E-Mail gut auf."
  },
  "friend-offer": {
    "name": "Ein Ticket von Freunden",
    "subject": "{{ticket.order.buyer_name}} hat dir ein Ticket für {{ticket.event.name}} geschickt",
    "preheader": "Nimm es bis {{ticket.offer_until.date}}, {{ticket.offer_until.time}} an",
    "heading": "{{ticket.order.buyer_name}} hat dir ein Ticket für {{ticket.event.name}} geschickt",
    "paras": [
      "{{ticket.name}} · {{ticket.event.doors_at.date}} · Einlass {{ticket.event.doors_at.time}}.",
      "Nimm es bis {{ticket.offer_until.date}}, {{ticket.offer_until.time}} an, dann gehört es dir – mit eigenem Code. Nimm es vor dem Einlass an, oder lass dir das Ticket am Einlass von {{ticket.order.buyer_name}} geben."
    ],
    "button": "Ticket annehmen",
    "foot": "{{ticket.order.buyer_name}} hat dir das aus einer Bestellung bei {{appName}} geschickt. Ignorierst du die E-Mail, bleibt das Ticket bei der Person, die es geschickt hat."
  },
  "friend-ready": {
    "name": "Dein Ticket ist da",
    "subject": "Dein Ticket für {{ticket.event.name}}",
    "preheader": "{{ticket.event.doors_at.date}} · Einlass {{ticket.event.doors_at.time}}",
    "heading": "Dein Ticket ist da",
    "paras": [
      "{{ticket.holder_name}} · {{ticket.name}} · {{ticket.code.grouped}}",
      "{{ticket.event.doors_at.date}} · Einlass {{ticket.event.doors_at.time}}. Zeig diesen Code am Einlass."
    ],
    "button": "Mein Ticket ansehen",
    "foot": "Angenommen von {{ticket.order.buyer_name}}. Der Button öffnet dein Ticket – heb diese E-Mail gut auf."
  },
  "friend-returned": {
    "name": "Dein Ticket ist zurück",
    "subject": "Dein Ticket für {{ticket.event.name}} ist zurück",
    "preheader": "Es wurde nicht rechtzeitig angenommen",
    "heading": "Dein Ticket ist zurück",
    "paras": [
      "Das Ticket, das du an {{ticket.pending_name}} geschickt hast, wurde nicht rechtzeitig angenommen und gehört wieder dir. Sein Code gilt weiterhin."
    ],
    "button": "Meine Bestellung ansehen",
    "foot": "Du hast dieses Ticket aus deiner Bestellung bei {{appName}} weitergegeben."
  },
  "holder-set": {
    "name": "Ein Ticket auf deinen Namen",
    "subject": "Ein Ticket für {{ticket.event.name}} auf deinen Namen",
    "preheader": "{{ticket.event.doors_at.date}} · Einlass {{ticket.event.doors_at.time}}",
    "heading": "Ein Ticket für {{ticket.event.name}} gehört dir",
    "paras": [
      "Die Kasse hat dieses Ticket auf deinen Namen ausgestellt: {{ticket.name}} · {{ticket.code.grouped}}. Zeig den Code am Einlass."
    ],
    "button": "Mein Ticket ansehen",
    "foot": "Der Button öffnet dein Ticket – heb diese E-Mail gut auf."
  },
  "waitlist-offer": {
    "name": "Es gibt wieder Tickets",
    "subject": "Tickets für {{order.event.name}} – für dich, wenn du willst",
    "preheader": "Sichere sie dir bis {{order.offer_until.date}}, {{order.offer_until.time}}",
    "heading": "Wieder Tickets für {{order.event.name}}",
    "paras": [
      "Du bist auf der Warteliste als Nächstes dran. Sichere dir die Tickets bis {{order.offer_until.date}}, {{order.offer_until.time}} – danach gehen sie an die nächste Person.",
      "Du kannst auch weniger nehmen, als wir dir anbieten."
    ],
    "button": "Tickets sichern",
    "foot": "Du stehst auf der Warteliste für diese Show."
  },
  "on-sale": {
    "name": "Bald im Verkauf",
    "subject": "{{reminder.event.name}} geht um {{reminder.on_sale_at.time}} in den Verkauf",
    "preheader": "{{reminder.on_sale_at.date}}, {{reminder.on_sale_at.time}}",
    "heading": "{{reminder.event.name}} geht um {{reminder.on_sale_at.time}} in den Verkauf",
    "paras": [
      "Der Ticketverkauf startet am {{reminder.on_sale_at.date}} um {{reminder.on_sale_at.time}}."
    ],
    "button": "Tickets holen",
    "foot": "Du wolltest einmal erinnert werden, bevor der Ticketverkauf startet."
  },
  "moved": {
    "name": "Deine Show wurde verlegt",
    "subject": "{{order.event.name}} wurde verlegt: neuer Termin {{order.event.doors_at.date}}",
    "preheader": "Deine Tickets gelten für den neuen Termin",
    "heading": "{{order.event.name}} wurde verlegt",
    "paras": [
      "{{order.event.name}} hat einen neuen Termin: {{order.event.doors_at.date}}, Einlass {{order.event.doors_at.time}}. Deine Tickets gelten für den neuen Termin.",
      "Wenn du nicht kannst, storniere deine Tickets auf der Seite deiner Bestellung."
    ],
    "button": "Tickets behalten oder erstatten lassen",
    "foot": "Du hast Tickets für diese Show · Bestellung {{order.number}}."
  },
  "moved-holder": {
    "name": "Deine Show wurde verlegt (Ticket von Freunden)",
    "subject": "{{ticket.event.name}} wurde verlegt: neuer Termin {{ticket.event.doors_at.date}}",
    "preheader": "Dein Ticket gilt für den neuen Termin",
    "heading": "{{ticket.event.name}} wurde verlegt",
    "paras": [
      "{{ticket.event.name}} hat einen neuen Termin: {{ticket.event.doors_at.date}}, Einlass {{ticket.event.doors_at.time}}. Dein Ticket gilt für den neuen Termin.",
      "{{ticket.order.buyer_name}} hat dir dieses Ticket geschickt. Geld zurück geht an die Person, die es gekauft hat."
    ],
    "button": "Mein Ticket ansehen",
    "foot": "Du hast ein Ticket für diese Show."
  },
  "cancelled-paid": {
    "name": "Deine Show fällt aus (bezahlt)",
    "subject": "{{order.event.name}} am {{order.event.doors_at.date}} fällt aus",
    "preheader": "Du bekommst dein Geld zurück",
    "heading": "{{order.event.name}} fällt aus",
    "paras": [
      "Es tut uns leid – {{order.event.name}} am {{order.event.doors_at.date}} fällt aus.",
      "Du hast {{order.paid_in}} bezahlt. Wir erstatten den Betrag {{practice.refund_payback_text}}, auf demselben Weg, auf dem du bezahlt hast."
    ],
    "button": "Meine Bestellung ansehen",
    "foot": "Du hast Tickets für diese Show · Bestellung {{order.number}}."
  },
  "cancelled-unpaid": {
    "name": "Deine Show fällt aus (nichts bezahlt)",
    "subject": "{{order.event.name}} am {{order.event.doors_at.date}} fällt aus",
    "preheader": "Nichts zu zahlen",
    "heading": "{{order.event.name}} fällt aus",
    "paras": [
      "Es tut uns leid – {{order.event.name}} am {{order.event.doors_at.date}} fällt aus.",
      "Du hast nichts bezahlt, also gibt es auch nichts zu erstatten."
    ],
    "button": "Meine Bestellung ansehen",
    "foot": "Du hast Tickets für diese Show · Bestellung {{order.number}}."
  },
  "cancelled-holder": {
    "name": "Deine Show fällt aus (Ticket von Freunden)",
    "subject": "{{ticket.event.name}} am {{ticket.event.doors_at.date}} fällt aus",
    "preheader": "Dein Ticket wird nicht mehr gebraucht",
    "heading": "{{ticket.event.name}} fällt aus",
    "paras": [
      "Es tut uns leid – {{ticket.event.name}} am {{ticket.event.doors_at.date}} fällt aus.",
      "{{ticket.order.buyer_name}} hat dir dieses Ticket geschickt. Geld zurück geht an die Person, die es gekauft hat."
    ],
    "foot": "Du hast ein Ticket für diese Show."
  },
  "tonight": {
    "name": "Bis heute Abend",
    "subject": "Heute Abend: {{order.event.name}}, Einlass {{order.event.doors_at.time}}",
    "preheader": "Einlass {{order.event.doors_at.time}} · {{order.room.name}}",
    "heading": "Bis heute Abend",
    "paras": [
      "Einlass {{order.event.doors_at.time}} · Schluss spätestens {{order.event.curfew_at.time}} · {{order.room.name}}. Was noch offen ist, zahlst du am Einlass, mit Karte oder bar."
    ],
    "button": "Meine Tickets zeigen",
    "foot": "Du hast Tickets für diese Show · Bestellung {{order.number}}."
  },
  "tomorrow": {
    "name": "Bis morgen",
    "subject": "Morgen: {{order.event.name}}, Einlass {{order.event.doors_at.time}}",
    "preheader": "Einlass {{order.event.doors_at.time}} · {{order.room.name}}",
    "heading": "Bis morgen",
    "paras": [
      "Einlass {{order.event.doors_at.time}} · {{order.room.name}}. Was noch offen ist, zahlst du am Einlass, mit Karte oder bar."
    ],
    "button": "Meine Tickets zeigen",
    "foot": "Du hast Tickets für diese Show · Bestellung {{order.number}}."
  },
  "tonight-holder": {
    "name": "Bis heute Abend (Ticket von Freunden)",
    "subject": "Heute Abend: {{ticket.event.name}}, Einlass {{ticket.event.doors_at.time}}",
    "preheader": "Einlass {{ticket.event.doors_at.time}}",
    "heading": "Bis heute Abend",
    "paras": [
      "Einlass {{ticket.event.doors_at.time}}. Zeig den Code deines Tickets am Einlass.",
      "{{ticket.order.buyer_name}} hat dir dieses Ticket geschickt. Geld zurück geht an die Person, die es gekauft hat."
    ],
    "button": "Mein Ticket ansehen",
    "foot": "Du hast ein Ticket für diese Show."
  },
  "tomorrow-holder": {
    "name": "Bis morgen (Ticket von Freunden)",
    "subject": "Morgen: {{ticket.event.name}}, Einlass {{ticket.event.doors_at.time}}",
    "preheader": "Einlass {{ticket.event.doors_at.time}}",
    "heading": "Bis morgen",
    "paras": [
      "Einlass {{ticket.event.doors_at.time}}. Zeig den Code deines Tickets am Einlass.",
      "{{ticket.order.buyer_name}} hat dir dieses Ticket geschickt. Geld zurück geht an die Person, die es gekauft hat."
    ],
    "button": "Mein Ticket ansehen",
    "foot": "Du hast ein Ticket für diese Show."
  },
  "refund-recorded": {
    "name": "Erstattung erfasst",
    "subject": "Deine Erstattung für {{order.event.name}} · {{order.number}}",
    "preheader": "{{order.refunded}} zurück an dich",
    "heading": "Erstattung erfasst",
    "paras": [
      "Wir haben für Bestellung {{order.number}} eine Erstattung von {{order.refunded}} an dich erfasst. Das Geld kommt {{practice.refund_payback_text}} bei dir an."
    ],
    "button": "Meine Bestellung ansehen",
    "foot": "Bestellung {{order.number}} · {{order.event.name}}."
  },
  "tickets-cancelled": {
    "name": "Tickets storniert",
    "subject": "Tickets deiner Bestellung für {{order.event.name}} sind storniert · {{order.number}}",
    "preheader": "Bestellung {{order.number}}",
    "heading": "Ticket storniert",
    "paras": [
      "Tickets der Bestellung {{order.number}} sind storniert. Auf der Seite der Bestellung siehst du, was noch übrig ist und ob du Geld zurückbekommst."
    ],
    "button": "Meine Bestellung ansehen",
    "foot": "Bestellung {{order.number}} · {{order.event.name}}."
  },
  "refund-declined": {
    "name": "Erstattungsanfrage abgelehnt",
    "subject": "Deine Erstattungsanfrage für {{ticket.event.name}}",
    "preheader": "Dein Ticket gilt weiterhin",
    "heading": "Wir können dieses Ticket nicht erstatten",
    "paras": [
      "Wir haben uns deine Anfrage angesehen und können dieses Ticket leider nicht erstatten. Es gilt weiterhin – wir sehen uns bei der Show. Fragen? Schreib uns an {{practice.contact_email}}."
    ],
    "button": "Meine Bestellung ansehen",
    "foot": "Du hast ein Ticket für diese Show."
  },
  "broadcast": {
    "name": "Eine Nachricht zu deiner Show",
    "subject": "{{broadcast.subject}}",
    "preheader": "Zu deinen Tickets für {{order.event.name}}",
    "heading": "Zu {{order.event.name}}",
    "paras": [
      "{{broadcast.body}}"
    ],
    "button": "Meine Bestellung ansehen",
    "foot": "Du hast Tickets für diese Show · Bestellung {{order.number}}."
  }
};

// prettier-ignore
export const EMAIL_FR: EmailWords = {
  "order": "Commande",
  "address": "{{appName}} · {{practice.address}} · {{practice.contact_email}}",
  "bankTitle": "Payer par virement bancaire",
  "bankName": "Titulaire du compte",
  "bankBank": "Banque",
  "bankNumber": "Numéro de compte",
  "bankRouting": "Code banque ou BIC",
  "bankReference": "Référence",
  "receiptAttached": "Votre reçu est en pièce jointe.",
  "tickets": {
    "name": "Vos billets",
    "subject": "Vos billets pour {{order.event.name}} · {{order.number}}",
    "preheader": "{{order.event.doors_at.date}} · ouverture des portes à {{order.event.doors_at.time}}",
    "heading": "Vous venez à {{order.event.name}}",
    "paras": [
      "{{order.event.doors_at.date}} · Ouverture des portes à {{order.event.doors_at.time}} · sur scène à {{order.event.starts_at.time}} · {{order.room.name}}. {{order.event.age_note}}",
      "Présentez le code de chaque billet à l'entrée. S'il reste quelque chose à régler, cela se fait sur place, par carte ou en espèces."
    ],
    "button": "Voir ma commande",
    "foot": "Commande {{order.number}}. Le bouton ouvre votre commande : gardez cet e-mail."
  },
  "tickets-paid": {
    "name": "Vos billets (payés à la billetterie)",
    "subject": "Vos billets pour {{order.event.name}} · {{order.number}}",
    "preheader": "Payé · {{order.total}}",
    "heading": "Vous venez à {{order.event.name}}",
    "paras": [
      "{{order.event.doors_at.date}} · Ouverture des portes à {{order.event.doors_at.time}} · sur scène à {{order.event.starts_at.time}} · {{order.room.name}}. {{order.event.age_note}}",
      "Tout est réglé : {{order.total}}. Présentez le code de chaque billet à l'entrée."
    ],
    "button": "Voir ma commande",
    "foot": "Commande {{order.number}}. Le bouton ouvre votre commande : gardez cet e-mail."
  },
  "transfer-confirm": {
    "name": "Confirmez votre commande",
    "subject": "Confirmez votre commande pour {{order.event.name}} · {{order.number}}",
    "preheader": "Confirmez avant {{order.held_until.time}} pour garder vos billets",
    "heading": "Confirmez votre commande",
    "paras": [
      "Vous avez choisi de payer vos billets pour {{order.event.name}} par virement bancaire. Appuyez sur le bouton avant {{order.held_until.time}} pour confirmer la commande, et nous vous enverrons les coordonnées bancaires.",
      "D'ici là, vos billets vous sont réservés."
    ],
    "button": "Confirmer ma commande",
    "foot": "Vous recevez cet e-mail car cette adresse a servi à commander des billets chez {{appName}}. Vous n'avez rien commandé ? Ignorez-le."
  },
  "transfer-waiting": {
    "name": "En attente de votre virement",
    "subject": "Payez avant le {{order.pay_by.date}} pour garder vos billets pour {{order.event.name}} · {{order.number}}",
    "preheader": "{{order.total}} avant le {{order.pay_by.date}}, {{order.pay_by.time}}",
    "heading": "Plus qu'une étape : le virement bancaire",
    "paras": [
      "Envoyez {{order.total}} avant le {{order.pay_by.date}}, {{order.pay_by.time}}, avec la référence {{order.number}}. Vos billets vous arrivent par e-mail dès réception du virement.",
      "Passé ce délai, les billets impayés sont remis en vente {{practice.release_after_hours}} h plus tard."
    ],
    "button": "Voir ma commande",
    "foot": "Commande {{order.number}}. Le bouton ouvre votre commande : gardez cet e-mail."
  },
  "transfer-reminder": {
    "name": "Rappel : votre virement",
    "subject": "Rappel : votre virement pour {{order.event.name}} · {{order.number}}",
    "preheader": "{{order.total}} attendu le {{order.pay_by.date}}",
    "heading": "Votre virement n'est pas encore arrivé",
    "paras": [
      "Nous n'avons pas reçu {{order.total}} pour la commande {{order.number}}. Le virement était attendu le {{order.pay_by.date}}, {{order.pay_by.time}}.",
      "Les billets impayés seront bientôt remis en vente. Si vous avez déjà fait le virement, vous n'avez rien à faire."
    ],
    "button": "Voir ma commande",
    "foot": "Commande {{order.number}}. Le bouton ouvre votre commande : gardez cet e-mail."
  },
  "transfer-released": {
    "name": "Vos billets ont été remis en vente",
    "subject": "Vos billets pour {{order.event.name}} ont été remis en vente · {{order.number}}",
    "preheader": "Le virement n'est pas arrivé à temps",
    "heading": "Vos billets ont été remis en vente",
    "paras": [
      "Le virement pour la commande {{order.number}} n'est pas arrivé à temps : ses billets ont donc été remis en vente. Si vous l'avez finalement envoyé, écrivez-nous à {{practice.contact_email}}."
    ],
    "button": "Voir la programmation",
    "foot": "Commande {{order.number}}."
  },
  "payment-received": {
    "name": "Paiement reçu",
    "subject": "Paiement reçu · {{order.event.name}} · {{order.number}}",
    "preheader": "{{order.paid_in}} reçu · vos billets",
    "heading": "Paiement reçu",
    "paras": [
      "Merci ! Nous avons bien reçu {{order.paid_in}} pour la commande {{order.number}}. Voici vos billets.",
      "{{order.event.doors_at.date}} · Ouverture des portes à {{order.event.doors_at.time}} · {{order.room.name}}."
    ],
    "button": "Voir ma commande",
    "foot": "Commande {{order.number}}. Le bouton ouvre votre commande : gardez cet e-mail."
  },
  "friend-offer": {
    "name": "Un billet envoyé par un proche",
    "subject": "{{ticket.order.buyer_name}} vous a envoyé un billet pour {{ticket.event.name}}",
    "preheader": "Acceptez-le avant le {{ticket.offer_until.date}}, {{ticket.offer_until.time}}",
    "heading": "{{ticket.order.buyer_name}} vous a envoyé un billet pour {{ticket.event.name}}",
    "paras": [
      "{{ticket.name}} · {{ticket.event.doors_at.date}} · ouverture des portes à {{ticket.event.doors_at.time}}.",
      "Acceptez-le avant le {{ticket.offer_until.date}}, {{ticket.offer_until.time}} et il sera à vous, avec son propre code. Acceptez-le avant l'ouverture des portes, ou demandez le billet à {{ticket.order.buyer_name}} à l'entrée."
    ],
    "button": "Accepter le billet",
    "foot": "{{ticket.order.buyer_name}} vous l'a envoyé depuis sa commande {{appName}}. Si vous l'ignorez, le billet reste à cette personne."
  },
  "friend-ready": {
    "name": "Votre billet est prêt",
    "subject": "Votre billet pour {{ticket.event.name}}",
    "preheader": "{{ticket.event.doors_at.date}} · ouverture des portes à {{ticket.event.doors_at.time}}",
    "heading": "Votre billet est prêt",
    "paras": [
      "{{ticket.holder_name}} · {{ticket.name}} · {{ticket.code.grouped}}",
      "{{ticket.event.doors_at.date}} · Ouverture des portes à {{ticket.event.doors_at.time}}. Présentez ce code à l'entrée."
    ],
    "button": "Voir mon billet",
    "foot": "Accepté de la part de {{ticket.order.buyer_name}}. Le bouton ouvre votre billet : gardez cet e-mail."
  },
  "friend-returned": {
    "name": "Votre billet vous est revenu",
    "subject": "Votre billet pour {{ticket.event.name}} vous est revenu",
    "preheader": "Il n'a pas été accepté à temps",
    "heading": "Votre billet vous est revenu",
    "paras": [
      "Le billet envoyé à {{ticket.pending_name}} n'a pas été accepté à temps : il est donc de nouveau à vous. Son code fonctionne toujours."
    ],
    "button": "Voir ma commande",
    "foot": "Vous avez envoyé ce billet depuis votre commande {{appName}}."
  },
  "holder-set": {
    "name": "Un billet à votre nom",
    "subject": "Un billet pour {{ticket.event.name}} à votre nom",
    "preheader": "{{ticket.event.doors_at.date}} · ouverture des portes à {{ticket.event.doors_at.time}}",
    "heading": "Un billet pour {{ticket.event.name}} est à vous",
    "paras": [
      "La billetterie a mis ce billet à votre nom : {{ticket.name}} · {{ticket.code.grouped}}. Présentez le code à l'entrée."
    ],
    "button": "Voir mon billet",
    "foot": "Le bouton ouvre votre billet : gardez cet e-mail."
  },
  "waitlist-offer": {
    "name": "Des billets sont revenus",
    "subject": "Des billets pour {{order.event.name}} vous attendent",
    "preheader": "Récupérez-les avant le {{order.offer_until.date}}, {{order.offer_until.time}}",
    "heading": "Des billets sont revenus pour {{order.event.name}}",
    "paras": [
      "Vous êtes le prochain sur la liste d'attente. Récupérez-les avant le {{order.offer_until.date}}, {{order.offer_until.time}} : ensuite, ils passent à la personne suivante.",
      "Vous pouvez en prendre moins que ce que nous proposons."
    ],
    "button": "Récupérer mes billets",
    "foot": "Vous vous êtes inscrit sur la liste d'attente de ce spectacle."
  },
  "on-sale": {
    "name": "Bientôt en vente",
    "subject": "{{reminder.event.name}} : ouverture des ventes à {{reminder.on_sale_at.time}}",
    "preheader": "{{reminder.on_sale_at.date}}, {{reminder.on_sale_at.time}}",
    "heading": "{{reminder.event.name}} : ouverture des ventes à {{reminder.on_sale_at.time}}",
    "paras": [
      "Les billets seront en vente le {{reminder.on_sale_at.date}} à {{reminder.on_sale_at.time}}."
    ],
    "button": "Prendre des billets",
    "foot": "Vous nous avez demandé un rappel, une seule fois, avant l'ouverture des ventes."
  },
  "moved": {
    "name": "Votre spectacle change de date",
    "subject": "{{order.event.name}} change de date : le {{order.event.doors_at.date}}",
    "preheader": "Vos billets restent valables à la nouvelle date",
    "heading": "{{order.event.name}} change de date",
    "paras": [
      "{{order.event.name}} aura désormais lieu le {{order.event.doors_at.date}}, ouverture des portes à {{order.event.doors_at.time}}. Vos billets restent valables à la nouvelle date.",
      "Si vous ne pouvez pas venir, annulez vos billets depuis la page de votre commande."
    ],
    "button": "Garder ou me faire rembourser",
    "foot": "Vous avez des billets pour ce spectacle · commande {{order.number}}."
  },
  "moved-holder": {
    "name": "Votre spectacle change de date (billet d'un proche)",
    "subject": "{{ticket.event.name}} change de date : le {{ticket.event.doors_at.date}}",
    "preheader": "Votre billet reste valable à la nouvelle date",
    "heading": "{{ticket.event.name}} change de date",
    "paras": [
      "{{ticket.event.name}} aura désormais lieu le {{ticket.event.doors_at.date}}, ouverture des portes à {{ticket.event.doors_at.time}}. Votre billet reste valable à la nouvelle date.",
      "{{ticket.order.buyer_name}} vous a envoyé ce billet. Tout remboursement lui revient."
    ],
    "button": "Voir mon billet",
    "foot": "Vous avez un billet pour ce spectacle."
  },
  "cancelled-paid": {
    "name": "Votre spectacle est annulé (déjà payé)",
    "subject": "{{order.event.name}} du {{order.event.doors_at.date}} est annulé",
    "preheader": "Vous serez remboursé",
    "heading": "{{order.event.name}} est annulé",
    "paras": [
      "Nous sommes désolés : {{order.event.name}} du {{order.event.doors_at.date}} est annulé.",
      "Vous avez payé {{order.paid_in}}. Nous vous rembourserons {{practice.refund_payback_text}}, par le même moyen de paiement."
    ],
    "button": "Voir ma commande",
    "foot": "Vous avez des billets pour ce spectacle · commande {{order.number}}."
  },
  "cancelled-unpaid": {
    "name": "Votre spectacle est annulé (rien de payé)",
    "subject": "{{order.event.name}} du {{order.event.doors_at.date}} est annulé",
    "preheader": "Rien à payer",
    "heading": "{{order.event.name}} est annulé",
    "paras": [
      "Nous sommes désolés : {{order.event.name}} du {{order.event.doors_at.date}} est annulé.",
      "Vous n'avez rien payé : il n'y a donc rien à rembourser."
    ],
    "button": "Voir ma commande",
    "foot": "Vous avez des billets pour ce spectacle · commande {{order.number}}."
  },
  "cancelled-holder": {
    "name": "Votre spectacle est annulé (billet d'un proche)",
    "subject": "{{ticket.event.name}} du {{ticket.event.doors_at.date}} est annulé",
    "preheader": "Vous n'aurez pas besoin de votre billet",
    "heading": "{{ticket.event.name}} est annulé",
    "paras": [
      "Nous sommes désolés : {{ticket.event.name}} du {{ticket.event.doors_at.date}} est annulé.",
      "{{ticket.order.buyer_name}} vous a envoyé ce billet. Tout remboursement lui revient."
    ],
    "foot": "Vous avez un billet pour ce spectacle."
  },
  "tonight": {
    "name": "À ce soir",
    "subject": "Ce soir : {{order.event.name}}, ouverture des portes à {{order.event.doors_at.time}}",
    "preheader": "Ouverture des portes à {{order.event.doors_at.time}} · {{order.room.name}}",
    "heading": "À ce soir",
    "paras": [
      "Ouverture des portes à {{order.event.doors_at.time}} · fin de soirée à {{order.event.curfew_at.time}} · {{order.room.name}}. S'il reste quelque chose à régler, cela se fait à l'entrée, par carte ou en espèces."
    ],
    "button": "Afficher mes billets",
    "foot": "Vous avez des billets pour ce spectacle · commande {{order.number}}."
  },
  "tomorrow": {
    "name": "À demain",
    "subject": "Demain : {{order.event.name}}, ouverture des portes à {{order.event.doors_at.time}}",
    "preheader": "Ouverture des portes à {{order.event.doors_at.time}} · {{order.room.name}}",
    "heading": "À demain",
    "paras": [
      "Ouverture des portes à {{order.event.doors_at.time}} · {{order.room.name}}. S'il reste quelque chose à régler, cela se fait à l'entrée, par carte ou en espèces."
    ],
    "button": "Afficher mes billets",
    "foot": "Vous avez des billets pour ce spectacle · commande {{order.number}}."
  },
  "tonight-holder": {
    "name": "À ce soir (billet d'un proche)",
    "subject": "Ce soir : {{ticket.event.name}}, ouverture des portes à {{ticket.event.doors_at.time}}",
    "preheader": "Ouverture des portes à {{ticket.event.doors_at.time}}",
    "heading": "À ce soir",
    "paras": [
      "Ouverture des portes à {{ticket.event.doors_at.time}}. Présentez le code de votre billet à l'entrée.",
      "{{ticket.order.buyer_name}} vous a envoyé ce billet. Tout remboursement lui revient."
    ],
    "button": "Voir mon billet",
    "foot": "Vous avez un billet pour ce spectacle."
  },
  "tomorrow-holder": {
    "name": "À demain (billet d'un proche)",
    "subject": "Demain : {{ticket.event.name}}, ouverture des portes à {{ticket.event.doors_at.time}}",
    "preheader": "Ouverture des portes à {{ticket.event.doors_at.time}}",
    "heading": "À demain",
    "paras": [
      "Ouverture des portes à {{ticket.event.doors_at.time}}. Présentez le code de votre billet à l'entrée.",
      "{{ticket.order.buyer_name}} vous a envoyé ce billet. Tout remboursement lui revient."
    ],
    "button": "Voir mon billet",
    "foot": "Vous avez un billet pour ce spectacle."
  },
  "refund-recorded": {
    "name": "Remboursement enregistré",
    "subject": "Votre remboursement pour {{order.event.name}} · {{order.number}}",
    "preheader": "{{order.refunded}} remboursé",
    "heading": "Remboursement enregistré",
    "paras": [
      "Nous avons enregistré un remboursement de {{order.refunded}} pour la commande {{order.number}}. Vous le recevrez {{practice.refund_payback_text}}."
    ],
    "button": "Voir ma commande",
    "foot": "Commande {{order.number}} · {{order.event.name}}."
  },
  "tickets-cancelled": {
    "name": "Billets annulés",
    "subject": "Des billets de votre commande pour {{order.event.name}} sont annulés · {{order.number}}",
    "preheader": "Commande {{order.number}}",
    "heading": "Billets annulés",
    "paras": [
      "Des billets de la commande {{order.number}} sont annulés. La page de la commande indique ce qu'il reste, et ce qui vous sera éventuellement remboursé."
    ],
    "button": "Voir ma commande",
    "foot": "Commande {{order.number}} · {{order.event.name}}."
  },
  "refund-declined": {
    "name": "Demande de remboursement refusée",
    "subject": "Votre demande de remboursement pour {{ticket.event.name}}",
    "preheader": "Votre billet reste valable",
    "heading": "Nous ne pouvons pas rembourser ce billet",
    "paras": [
      "Nous avons étudié votre demande et ne pouvons pas rembourser ce billet. Il reste valable : à bientôt au spectacle. Une question ? Écrivez-nous à {{practice.contact_email}}."
    ],
    "button": "Voir ma commande",
    "foot": "Vous avez un billet pour ce spectacle."
  },
  "broadcast": {
    "name": "Un message sur votre spectacle",
    "subject": "{{broadcast.subject}}",
    "preheader": "À propos de vos billets pour {{order.event.name}}",
    "heading": "À propos de {{order.event.name}}",
    "paras": [
      "{{broadcast.body}}"
    ],
    "button": "Voir ma commande",
    "foot": "Vous avez des billets pour ce spectacle · commande {{order.number}}."
  }
};

// prettier-ignore
export const EMAIL_DA: EmailWords = {
  "order": "Ordre",
  "address": "{{appName}} · {{practice.address}} · {{practice.contact_email}}",
  "bankTitle": "Betal via bankoverførsel",
  "bankName": "Kontonavn",
  "bankBank": "Bank",
  "bankNumber": "Kontonummer",
  "bankRouting": "Reg.nr. eller routingnummer",
  "bankReference": "Reference",
  "receiptAttached": "Din kvittering er vedhæftet.",
  "tickets": {
    "name": "Dine billetter",
    "subject": "Dine billetter til {{order.event.name}} · {{order.number}}",
    "preheader": "{{order.event.doors_at.date}} · dørene åbner {{order.event.doors_at.time}}",
    "heading": "Du skal til {{order.event.name}}",
    "paras": [
      "{{order.event.doors_at.date}} · Dørene åbner {{order.event.doors_at.time}} · på scenen {{order.event.starts_at.time}} · {{order.room.name}}. {{order.event.age_note}}",
      "Vis hver billets kode ved døren. Et eventuelt restbeløb betales dér, med kort eller kontant."
    ],
    "button": "Se min ordre",
    "foot": "Ordre {{order.number}}. Knappen åbner din ordre – gem denne mail."
  },
  "tickets-paid": {
    "name": "Dine billetter (betalt i billetlugen)",
    "subject": "Dine billetter til {{order.event.name}} · {{order.number}}",
    "preheader": "Betalt · {{order.total}}",
    "heading": "Du skal til {{order.event.name}}",
    "paras": [
      "{{order.event.doors_at.date}} · Dørene åbner {{order.event.doors_at.time}} · på scenen {{order.event.starts_at.time}} · {{order.room.name}}. {{order.event.age_note}}",
      "Betalt fuldt ud: {{order.total}}. Vis hver billets kode ved døren."
    ],
    "button": "Se min ordre",
    "foot": "Ordre {{order.number}}. Knappen åbner din ordre – gem denne mail."
  },
  "transfer-confirm": {
    "name": "Bekræft din ordre",
    "subject": "Bekræft din ordre til {{order.event.name}} · {{order.number}}",
    "preheader": "Bekræft senest kl. {{order.held_until.time}} for at beholde dine billetter",
    "heading": "Bekræft din ordre",
    "paras": [
      "Du har valgt at betale for dine billetter til {{order.event.name}} via bankoverførsel. Tryk på knappen senest kl. {{order.held_until.time}} for at bekræfte ordren, så sender vi bankoplysningerne.",
      "Indtil da holder vi dine billetter til dig."
    ],
    "button": "Bekræft min ordre",
    "foot": "Du får denne mail, fordi adressen blev brugt til at bestille billetter hos {{appName}}. Har du ikke bestilt noget? Så se bort fra den."
  },
  "transfer-waiting": {
    "name": "Venter på din overførsel",
    "subject": "Betal senest {{order.pay_by.date}} for at beholde dine billetter til {{order.event.name}} · {{order.number}}",
    "preheader": "{{order.total}} senest {{order.pay_by.date}} kl. {{order.pay_by.time}}",
    "heading": "Ét skridt tilbage: bankoverførslen",
    "paras": [
      "Overfør {{order.total}} senest {{order.pay_by.date}} kl. {{order.pay_by.time}} med referencen {{order.number}}. Dine billetter kommer på mail, så snart pengene er modtaget.",
      "Ubetalte billetter kommer til salg igen {{practice.release_after_hours}} t. efter fristen."
    ],
    "button": "Se min ordre",
    "foot": "Ordre {{order.number}}. Knappen åbner din ordre – gem denne mail."
  },
  "transfer-reminder": {
    "name": "Påmindelse: din overførsel",
    "subject": "Påmindelse: din overførsel til {{order.event.name}} · {{order.number}}",
    "preheader": "{{order.total}} skulle være betalt {{order.pay_by.date}}",
    "heading": "Din overførsel er ikke kommet endnu",
    "paras": [
      "Vi har ikke modtaget {{order.total}} for ordre {{order.number}}. Beløbet skulle være betalt {{order.pay_by.date}} kl. {{order.pay_by.time}}.",
      "Ubetalte billetter kommer snart til salg igen. Har du allerede overført beløbet, behøver du ikke gøre noget."
    ],
    "button": "Se min ordre",
    "foot": "Ordre {{order.number}}. Knappen åbner din ordre – gem denne mail."
  },
  "transfer-released": {
    "name": "Dine billetter kom til salg igen",
    "subject": "Dine billetter til {{order.event.name}} kom til salg igen · {{order.number}}",
    "preheader": "Overførslen kom ikke i tide",
    "heading": "Dine billetter kom til salg igen",
    "paras": [
      "Overførslen for ordre {{order.number}} kom ikke i tide, så billetterne er sat til salg igen. Har du alligevel overført beløbet, så skriv til {{practice.contact_email}}."
    ],
    "button": "Se programmet",
    "foot": "Ordre {{order.number}}."
  },
  "payment-received": {
    "name": "Betaling modtaget",
    "subject": "Betaling modtaget · {{order.event.name}} · {{order.number}}",
    "preheader": "{{order.paid_in}} modtaget · dine billetter",
    "heading": "Betaling modtaget",
    "paras": [
      "Tak – vi har modtaget {{order.paid_in}} for ordre {{order.number}}. Her er dine billetter.",
      "{{order.event.doors_at.date}} · Dørene åbner {{order.event.doors_at.time}} · {{order.room.name}}."
    ],
    "button": "Se min ordre",
    "foot": "Ordre {{order.number}}. Knappen åbner din ordre – gem denne mail."
  },
  "friend-offer": {
    "name": "En billet fra en ven",
    "subject": "{{ticket.order.buyer_name}} har sendt dig en billet til {{ticket.event.name}}",
    "preheader": "Acceptér den senest {{ticket.offer_until.date}} kl. {{ticket.offer_until.time}}",
    "heading": "{{ticket.order.buyer_name}} har sendt dig en billet til {{ticket.event.name}}",
    "paras": [
      "{{ticket.name}} · {{ticket.event.doors_at.date}} · dørene åbner {{ticket.event.doors_at.time}}.",
      "Acceptér den senest {{ticket.offer_until.date}} kl. {{ticket.offer_until.time}}, så bliver den din – med sin egen kode. Acceptér den, før dørene åbner, eller bed {{ticket.order.buyer_name}} om billetten ved døren."
    ],
    "button": "Acceptér billetten",
    "foot": "{{ticket.order.buyer_name}} har sendt den fra sin ordre hos {{appName}}. Ser du bort fra mailen, bliver billetten hos afsenderen."
  },
  "friend-ready": {
    "name": "Din billet er klar",
    "subject": "Din billet til {{ticket.event.name}}",
    "preheader": "{{ticket.event.doors_at.date}} · dørene åbner {{ticket.event.doors_at.time}}",
    "heading": "Din billet er klar",
    "paras": [
      "{{ticket.holder_name}} · {{ticket.name}} · {{ticket.code.grouped}}",
      "{{ticket.event.doors_at.date}} · Dørene åbner {{ticket.event.doors_at.time}}. Vis denne kode ved døren."
    ],
    "button": "Se min billet",
    "foot": "Modtaget fra {{ticket.order.buyer_name}}. Knappen åbner din billet – gem denne mail."
  },
  "friend-returned": {
    "name": "Din billet kom tilbage",
    "subject": "Din billet til {{ticket.event.name}} kom tilbage",
    "preheader": "Den blev ikke accepteret i tide",
    "heading": "Din billet kom tilbage",
    "paras": [
      "Billetten, du sendte til {{ticket.pending_name}}, blev ikke accepteret i tide, så den er din igen. Koden virker stadig."
    ],
    "button": "Se min ordre",
    "foot": "Du sendte denne billet fra din ordre hos {{appName}}."
  },
  "holder-set": {
    "name": "En billet i dit navn",
    "subject": "En billet til {{ticket.event.name}} i dit navn",
    "preheader": "{{ticket.event.doors_at.date}} · dørene åbner {{ticket.event.doors_at.time}}",
    "heading": "En billet til {{ticket.event.name}} er din",
    "paras": [
      "Billetlugen har sat denne billet i dit navn: {{ticket.name}} · {{ticket.code.grouped}}. Vis koden ved døren."
    ],
    "button": "Se min billet",
    "foot": "Knappen åbner din billet – gem denne mail."
  },
  "waitlist-offer": {
    "name": "Billetterne er tilbage",
    "subject": "Billetter til {{order.event.name}} er dine, hvis du vil have dem",
    "preheader": "Tag imod dem senest {{order.offer_until.date}} kl. {{order.offer_until.time}}",
    "heading": "Der er kommet billetter tilbage til {{order.event.name}}",
    "paras": [
      "Du står som den næste på ventelisten. Tag imod dem senest {{order.offer_until.date}} kl. {{order.offer_until.time}} – derefter går de videre til den næste.",
      "Du må gerne tage færre, end vi tilbyder."
    ],
    "button": "Tag imod billetterne",
    "foot": "Du skrev dig op på ventelisten til dette arrangement."
  },
  "on-sale": {
    "name": "Snart til salg",
    "subject": "{{reminder.event.name}} kommer til salg kl. {{reminder.on_sale_at.time}}",
    "preheader": "{{reminder.on_sale_at.date}} kl. {{reminder.on_sale_at.time}}",
    "heading": "{{reminder.event.name}} kommer til salg kl. {{reminder.on_sale_at.time}}",
    "paras": [
      "Billetterne kommer til salg {{reminder.on_sale_at.date}} kl. {{reminder.on_sale_at.time}}."
    ],
    "button": "Køb billetter",
    "foot": "Du bad os minde dig om det én gang, før billetterne kommer til salg."
  },
  "moved": {
    "name": "Dit arrangement er flyttet",
    "subject": "{{order.event.name}} er flyttet til {{order.event.doors_at.date}}",
    "preheader": "Dine billetter gælder på den nye dato",
    "heading": "{{order.event.name}} er flyttet",
    "paras": [
      "{{order.event.name}} finder nu sted {{order.event.doors_at.date}}, og dørene åbner {{order.event.doors_at.time}}. Dine billetter gælder på den nye dato.",
      "Kan du ikke komme, kan du annullere dine billetter på din ordreside."
    ],
    "button": "Behold eller refundér mine billetter",
    "foot": "Du har billetter til dette arrangement · ordre {{order.number}}."
  },
  "moved-holder": {
    "name": "Dit arrangement er flyttet (en vens billet)",
    "subject": "{{ticket.event.name}} er flyttet til {{ticket.event.doors_at.date}}",
    "preheader": "Din billet gælder på den nye dato",
    "heading": "{{ticket.event.name}} er flyttet",
    "paras": [
      "{{ticket.event.name}} finder nu sted {{ticket.event.doors_at.date}}, og dørene åbner {{ticket.event.doors_at.time}}. Din billet gælder på den nye dato.",
      "{{ticket.order.buyer_name}} har sendt dig denne billet. Eventuelle penge tilbage går til køberen."
    ],
    "button": "Se min billet",
    "foot": "Du har en billet til dette arrangement."
  },
  "cancelled-paid": {
    "name": "Dit arrangement er aflyst (betalt)",
    "subject": "{{order.event.name}} den {{order.event.doors_at.date}} er aflyst",
    "preheader": "Du får dine penge tilbage",
    "heading": "{{order.event.name}} er aflyst",
    "paras": [
      "Vi beklager – {{order.event.name}} den {{order.event.doors_at.date}} er aflyst.",
      "Du har betalt {{order.paid_in}}. Vi betaler beløbet tilbage {{practice.refund_payback_text}}, på samme måde som du betalte."
    ],
    "button": "Se min ordre",
    "foot": "Du har billetter til dette arrangement · ordre {{order.number}}."
  },
  "cancelled-unpaid": {
    "name": "Dit arrangement er aflyst (intet betalt)",
    "subject": "{{order.event.name}} den {{order.event.doors_at.date}} er aflyst",
    "preheader": "Intet at betale",
    "heading": "{{order.event.name}} er aflyst",
    "paras": [
      "Vi beklager – {{order.event.name}} den {{order.event.doors_at.date}} er aflyst.",
      "Du har ikke betalt noget, så der er intet at betale tilbage."
    ],
    "button": "Se min ordre",
    "foot": "Du har billetter til dette arrangement · ordre {{order.number}}."
  },
  "cancelled-holder": {
    "name": "Dit arrangement er aflyst (en vens billet)",
    "subject": "{{ticket.event.name}} den {{ticket.event.doors_at.date}} er aflyst",
    "preheader": "Du får ikke brug for din billet",
    "heading": "{{ticket.event.name}} er aflyst",
    "paras": [
      "Vi beklager – {{ticket.event.name}} den {{ticket.event.doors_at.date}} er aflyst.",
      "{{ticket.order.buyer_name}} har sendt dig denne billet. Eventuelle penge tilbage går til køberen."
    ],
    "foot": "Du har en billet til dette arrangement."
  },
  "tonight": {
    "name": "Vi ses i aften",
    "subject": "I aften: {{order.event.name}}, dørene åbner {{order.event.doors_at.time}}",
    "preheader": "Dørene åbner {{order.event.doors_at.time}} · {{order.room.name}}",
    "heading": "Vi ses i aften",
    "paras": [
      "Dørene åbner {{order.event.doors_at.time}} · slut senest {{order.event.curfew_at.time}} · {{order.room.name}}. Et eventuelt restbeløb betales ved døren, med kort eller kontant."
    ],
    "button": "Vis mine billetter",
    "foot": "Du har billetter til dette arrangement · ordre {{order.number}}."
  },
  "tomorrow": {
    "name": "Vi ses i morgen",
    "subject": "I morgen: {{order.event.name}}, dørene åbner {{order.event.doors_at.time}}",
    "preheader": "Dørene åbner {{order.event.doors_at.time}} · {{order.room.name}}",
    "heading": "Vi ses i morgen",
    "paras": [
      "Dørene åbner {{order.event.doors_at.time}} · {{order.room.name}}. Et eventuelt restbeløb betales ved døren, med kort eller kontant."
    ],
    "button": "Vis mine billetter",
    "foot": "Du har billetter til dette arrangement · ordre {{order.number}}."
  },
  "tonight-holder": {
    "name": "Vi ses i aften (en vens billet)",
    "subject": "I aften: {{ticket.event.name}}, dørene åbner {{ticket.event.doors_at.time}}",
    "preheader": "Dørene åbner {{ticket.event.doors_at.time}}",
    "heading": "Vi ses i aften",
    "paras": [
      "Dørene åbner {{ticket.event.doors_at.time}}. Vis din billets kode ved døren.",
      "{{ticket.order.buyer_name}} har sendt dig denne billet. Eventuelle penge tilbage går til køberen."
    ],
    "button": "Se min billet",
    "foot": "Du har en billet til dette arrangement."
  },
  "tomorrow-holder": {
    "name": "Vi ses i morgen (en vens billet)",
    "subject": "I morgen: {{ticket.event.name}}, dørene åbner {{ticket.event.doors_at.time}}",
    "preheader": "Dørene åbner {{ticket.event.doors_at.time}}",
    "heading": "Vi ses i morgen",
    "paras": [
      "Dørene åbner {{ticket.event.doors_at.time}}. Vis din billets kode ved døren.",
      "{{ticket.order.buyer_name}} har sendt dig denne billet. Eventuelle penge tilbage går til køberen."
    ],
    "button": "Se min billet",
    "foot": "Du har en billet til dette arrangement."
  },
  "refund-recorded": {
    "name": "Refusion registreret",
    "subject": "Din refusion for {{order.event.name}} · {{order.number}}",
    "preheader": "{{order.refunded}} tilbage til dig",
    "heading": "Refusion registreret",
    "paras": [
      "Vi har registreret en refusion på {{order.refunded}} til dig for ordre {{order.number}}. Pengene er hos dig {{practice.refund_payback_text}}."
    ],
    "button": "Se min ordre",
    "foot": "Ordre {{order.number}} · {{order.event.name}}."
  },
  "tickets-cancelled": {
    "name": "Billetter annulleret",
    "subject": "Billetter på din ordre til {{order.event.name}} er annulleret · {{order.number}}",
    "preheader": "Ordre {{order.number}}",
    "heading": "Billetter annulleret",
    "paras": [
      "Billetter på ordre {{order.number}} er annulleret. Ordresiden viser, hvad der er tilbage, og om du har penge til gode."
    ],
    "button": "Se min ordre",
    "foot": "Ordre {{order.number}} · {{order.event.name}}."
  },
  "refund-declined": {
    "name": "Anmodning om refusion afvist",
    "subject": "Din anmodning om refusion for {{ticket.event.name}}",
    "preheader": "Din billet gælder stadig",
    "heading": "Vi kan ikke refundere denne billet",
    "paras": [
      "Vi har kigget på din anmodning og kan desværre ikke refundere denne billet. Den gælder stadig – vi ses til arrangementet. Spørgsmål? Skriv til {{practice.contact_email}}."
    ],
    "button": "Se min ordre",
    "foot": "Du har en billet til dette arrangement."
  },
  "broadcast": {
    "name": "En besked om dit arrangement",
    "subject": "{{broadcast.subject}}",
    "preheader": "Om dine billetter til {{order.event.name}}",
    "heading": "Om {{order.event.name}}",
    "paras": [
      "{{broadcast.body}}"
    ],
    "button": "Se min ordre",
    "foot": "Du har billetter til dette arrangement · ordre {{order.number}}."
  }
};

// prettier-ignore
export const EMAIL_CS: EmailWords = {
  "order": "Objednávka",
  "address": "{{appName}} · {{practice.address}} · {{practice.contact_email}}",
  "bankTitle": "Platba bankovním převodem",
  "bankName": "Název účtu",
  "bankBank": "Banka",
  "bankNumber": "Číslo účtu",
  "bankRouting": "Kód banky",
  "bankReference": "Variabilní symbol",
  "receiptAttached": "Účtenka je v příloze.",
  "tickets": {
    "name": "Vaše vstupenky",
    "subject": "Vaše vstupenky na {{order.event.name}} · {{order.number}}",
    "preheader": "{{order.event.doors_at.date}} · otevíráme v {{order.event.doors_at.time}}",
    "heading": "Jdete na {{order.event.name}}",
    "paras": [
      "{{order.event.doors_at.date}} · Otevíráme v {{order.event.doors_at.time}} · na pódiu od {{order.event.starts_at.time}} · {{order.room.name}}. {{order.event.age_note}}",
      "U vchodu ukažte kód každé vstupenky. Případný doplatek uhradíte tam, kartou nebo hotově."
    ],
    "button": "Zobrazit objednávku",
    "foot": "Objednávka {{order.number}}. Tlačítko otevře vaši objednávku – tento e-mail si uschovejte."
  },
  "tickets-paid": {
    "name": "Vaše vstupenky (zaplaceno v pokladně)",
    "subject": "Vaše vstupenky na {{order.event.name}} · {{order.number}}",
    "preheader": "Zaplaceno · {{order.total}}",
    "heading": "Jdete na {{order.event.name}}",
    "paras": [
      "{{order.event.doors_at.date}} · Otevíráme v {{order.event.doors_at.time}} · na pódiu od {{order.event.starts_at.time}} · {{order.room.name}}. {{order.event.age_note}}",
      "Zaplaceno v plné výši: {{order.total}}. U vchodu ukažte kód každé vstupenky."
    ],
    "button": "Zobrazit objednávku",
    "foot": "Objednávka {{order.number}}. Tlačítko otevře vaši objednávku – tento e-mail si uschovejte."
  },
  "transfer-confirm": {
    "name": "Potvrďte objednávku",
    "subject": "Potvrďte objednávku na {{order.event.name}} · {{order.number}}",
    "preheader": "Potvrďte do {{order.held_until.time}}, ať o vstupenky nepřijdete",
    "heading": "Potvrďte objednávku",
    "paras": [
      "Vstupenky na {{order.event.name}} jste se rozhodli zaplatit bankovním převodem. Do {{order.held_until.time}} stiskněte tlačítko a objednávku potvrďte, pak vám pošleme bankovní údaje.",
      "Do té doby vám vstupenky držíme."
    ],
    "button": "Potvrdit objednávku",
    "foot": "Tento e-mail dostáváte, protože tato adresa byla použita k objednání vstupenek v {{appName}}. Nic jste neobjednávali? Stačí ho ignorovat."
  },
  "transfer-waiting": {
    "name": "Čekáme na váš převod",
    "subject": "Zaplaťte do {{order.pay_by.date}}, ať vám vstupenky na {{order.event.name}} zůstanou · {{order.number}}",
    "preheader": "{{order.total}} do {{order.pay_by.date}}, {{order.pay_by.time}}",
    "heading": "Zbývá jediný krok: bankovní převod",
    "paras": [
      "Pošlete {{order.total}} do {{order.pay_by.date}}, {{order.pay_by.time}} s variabilním symbolem {{order.number}}. Jakmile platba dorazí, pošleme vám vstupenky e-mailem.",
      "Nezaplacené vstupenky se po uplynutí dalšího odkladu vrátí do prodeje (odklad v hodinách: {{practice.release_after_hours}})."
    ],
    "button": "Zobrazit objednávku",
    "foot": "Objednávka {{order.number}}. Tlačítko otevře vaši objednávku – tento e-mail si uschovejte."
  },
  "transfer-reminder": {
    "name": "Připomínka: váš převod",
    "subject": "Připomínka: váš převod za {{order.event.name}} · {{order.number}}",
    "preheader": "{{order.total}} bylo splatné {{order.pay_by.date}}",
    "heading": "Váš převod zatím nedorazil",
    "paras": [
      "Platbu {{order.total}} za objednávku {{order.number}} jsme zatím neobdrželi. Splatnost byla {{order.pay_by.date}}, {{order.pay_by.time}}.",
      "Nezaplacené vstupenky se brzy vrátí do prodeje. Pokud jste už platbu odeslali, nemusíte nic dělat."
    ],
    "button": "Zobrazit objednávku",
    "foot": "Objednávka {{order.number}}. Tlačítko otevře vaši objednávku – tento e-mail si uschovejte."
  },
  "transfer-released": {
    "name": "Vaše vstupenky se vrátily do prodeje",
    "subject": "Vaše vstupenky na {{order.event.name}} se vrátily do prodeje · {{order.number}}",
    "preheader": "Převod nedorazil včas",
    "heading": "Vaše vstupenky se vrátily do prodeje",
    "paras": [
      "Převod za objednávku {{order.number}} nedorazil včas, a tak se její vstupenky vrátily do prodeje. Pokud jste platbu přece jen odeslali, napište nám na {{practice.contact_email}}."
    ],
    "button": "Co u nás hraje",
    "foot": "Objednávka {{order.number}}."
  },
  "payment-received": {
    "name": "Platba přijata",
    "subject": "Platba přijata · {{order.event.name}} · {{order.number}}",
    "preheader": "Přijali jsme {{order.paid_in}} · vaše vstupenky",
    "heading": "Platba přijata",
    "paras": [
      "Děkujeme – za objednávku {{order.number}} jsme přijali {{order.paid_in}}. Tady jsou vaše vstupenky.",
      "{{order.event.doors_at.date}} · Otevíráme v {{order.event.doors_at.time}} · {{order.room.name}}."
    ],
    "button": "Zobrazit objednávku",
    "foot": "Objednávka {{order.number}}. Tlačítko otevře vaši objednávku – tento e-mail si uschovejte."
  },
  "friend-offer": {
    "name": "Vstupenka od kamaráda",
    "subject": "{{ticket.order.buyer_name}} vám posílá vstupenku na {{ticket.event.name}}",
    "preheader": "Přijměte ji do {{ticket.offer_until.date}}, {{ticket.offer_until.time}}",
    "heading": "{{ticket.order.buyer_name}} vám posílá vstupenku na {{ticket.event.name}}",
    "paras": [
      "{{ticket.name}} · {{ticket.event.doors_at.date}} · otevíráme v {{ticket.event.doors_at.time}}.",
      "Přijměte ji do {{ticket.offer_until.date}}, {{ticket.offer_until.time}} a bude vaše, s vlastním kódem. Přijměte ji před otevřením, nebo si o vstupenku řekněte u vchodu přímo {{ticket.order.buyer_name}}."
    ],
    "button": "Přijmout vstupenku",
    "foot": "{{ticket.order.buyer_name}} vám ji poslal(a) ze své objednávky v {{appName}}. Pokud e-mail ignorujete, vstupenka zůstane u odesílatele."
  },
  "friend-ready": {
    "name": "Vaše vstupenka je připravená",
    "subject": "Vaše vstupenka na {{ticket.event.name}}",
    "preheader": "{{ticket.event.doors_at.date}} · otevíráme v {{ticket.event.doors_at.time}}",
    "heading": "Vaše vstupenka je připravená",
    "paras": [
      "{{ticket.holder_name}} · {{ticket.name}} · {{ticket.code.grouped}}",
      "{{ticket.event.doors_at.date}} · Otevíráme v {{ticket.event.doors_at.time}}. Tento kód ukažte u vchodu."
    ],
    "button": "Zobrazit vstupenku",
    "foot": "Přijato od: {{ticket.order.buyer_name}}. Tlačítko otevře vaši vstupenku – tento e-mail si uschovejte."
  },
  "friend-returned": {
    "name": "Vstupenka se vám vrátila",
    "subject": "Vaše vstupenka na {{ticket.event.name}} se vrátila",
    "preheader": "Nebyla včas přijata",
    "heading": "Vstupenka se vám vrátila",
    "paras": [
      "Vstupenku, kterou jste poslali pro {{ticket.pending_name}}, nikdo včas nepřijal, takže je zase vaše. Její kód dál platí."
    ],
    "button": "Zobrazit objednávku",
    "foot": "Tuto vstupenku jste poslali ze své objednávky v {{appName}}."
  },
  "holder-set": {
    "name": "Vstupenka na vaše jméno",
    "subject": "Vstupenka na {{ticket.event.name}} na vaše jméno",
    "preheader": "{{ticket.event.doors_at.date}} · otevíráme v {{ticket.event.doors_at.time}}",
    "heading": "Vstupenka na {{ticket.event.name}} je vaše",
    "paras": [
      "Pokladna vystavila tuto vstupenku na vaše jméno: {{ticket.name}} · {{ticket.code.grouped}}. Kód ukažte u vchodu."
    ],
    "button": "Zobrazit vstupenku",
    "foot": "Tlačítko otevře vaši vstupenku – tento e-mail si uschovejte."
  },
  "waitlist-offer": {
    "name": "Vstupenky jsou zpět",
    "subject": "Vstupenky na {{order.event.name}} jsou vaše, pokud o ně stojíte",
    "preheader": "Uplatněte je do {{order.offer_until.date}}, {{order.offer_until.time}}",
    "heading": "Na {{order.event.name}} se uvolnily vstupenky",
    "paras": [
      "Na čekací listině jste na řadě. Uplatněte je do {{order.offer_until.date}}, {{order.offer_until.time}} – potom je nabídneme dalšímu v pořadí.",
      "Můžete si vzít i méně, než nabízíme."
    ],
    "button": "Uplatnit vstupenky",
    "foot": "Přihlásili jste se na čekací listinu na tuto akci."
  },
  "on-sale": {
    "name": "Brzy v prodeji",
    "subject": "{{reminder.event.name}} jde do prodeje v {{reminder.on_sale_at.time}}",
    "preheader": "{{reminder.on_sale_at.date}}, {{reminder.on_sale_at.time}}",
    "heading": "{{reminder.event.name}} jde do prodeje v {{reminder.on_sale_at.time}}",
    "paras": [
      "Vstupenky budou v prodeji od {{reminder.on_sale_at.date}}, {{reminder.on_sale_at.time}}."
    ],
    "button": "Koupit vstupenky",
    "foot": "Požádali jste nás o jednu připomínku před začátkem prodeje."
  },
  "moved": {
    "name": "Vaše akce se přesouvá",
    "subject": "{{order.event.name}} se přesouvá na {{order.event.doors_at.date}}",
    "preheader": "Vaše vstupenky platí i pro nový termín",
    "heading": "{{order.event.name}} se přesouvá",
    "paras": [
      "{{order.event.name}} se nově koná {{order.event.doors_at.date}}, otevíráme v {{order.event.doors_at.time}}. Vaše vstupenky platí i pro nový termín.",
      "Pokud nemůžete přijít, zrušte vstupenky na stránce své objednávky."
    ],
    "button": "Ponechat nebo vrátit vstupenky",
    "foot": "Máte vstupenky na tuto akci · objednávka {{order.number}}."
  },
  "moved-holder": {
    "name": "Vaše akce se přesouvá (vstupenka od kamaráda)",
    "subject": "{{ticket.event.name}} se přesouvá na {{ticket.event.doors_at.date}}",
    "preheader": "Vaše vstupenka platí i pro nový termín",
    "heading": "{{ticket.event.name}} se přesouvá",
    "paras": [
      "{{ticket.event.name}} se nově koná {{ticket.event.doors_at.date}}, otevíráme v {{ticket.event.doors_at.time}}. Vaše vstupenka platí i pro nový termín.",
      "Tuto vstupenku vám poslal(a) {{ticket.order.buyer_name}}. Případné peníze vracíme kupujícímu."
    ],
    "button": "Zobrazit vstupenku",
    "foot": "Máte vstupenku na tuto akci."
  },
  "cancelled-paid": {
    "name": "Vaše akce je zrušená (zaplaceno)",
    "subject": "{{order.event.name}} dne {{order.event.doors_at.date}} je zrušena",
    "preheader": "Peníze vám vrátíme",
    "heading": "{{order.event.name}} je zrušena",
    "paras": [
      "Je nám líto – {{order.event.name}} dne {{order.event.doors_at.date}} je zrušena.",
      "Zaplatili jste {{order.paid_in}}. Peníze vám vrátíme {{practice.refund_payback_text}}, stejným způsobem, jakým jste platili."
    ],
    "button": "Zobrazit objednávku",
    "foot": "Máte vstupenky na tuto akci · objednávka {{order.number}}."
  },
  "cancelled-unpaid": {
    "name": "Vaše akce je zrušená (nic nezaplaceno)",
    "subject": "{{order.event.name}} dne {{order.event.doors_at.date}} je zrušena",
    "preheader": "Nic k placení",
    "heading": "{{order.event.name}} je zrušena",
    "paras": [
      "Je nám líto – {{order.event.name}} dne {{order.event.doors_at.date}} je zrušena.",
      "Nic jste nezaplatili, takže není co vracet."
    ],
    "button": "Zobrazit objednávku",
    "foot": "Máte vstupenky na tuto akci · objednávka {{order.number}}."
  },
  "cancelled-holder": {
    "name": "Vaše akce je zrušená (vstupenka od kamaráda)",
    "subject": "{{ticket.event.name}} dne {{ticket.event.doors_at.date}} je zrušena",
    "preheader": "Vstupenku už nebudete potřebovat",
    "heading": "{{ticket.event.name}} je zrušena",
    "paras": [
      "Je nám líto – {{ticket.event.name}} dne {{ticket.event.doors_at.date}} je zrušena.",
      "Tuto vstupenku vám poslal(a) {{ticket.order.buyer_name}}. Případné peníze vracíme kupujícímu."
    ],
    "foot": "Máte vstupenku na tuto akci."
  },
  "tonight": {
    "name": "Uvidíme se dnes večer",
    "subject": "Dnes večer: {{order.event.name}}, otevíráme v {{order.event.doors_at.time}}",
    "preheader": "Otevíráme v {{order.event.doors_at.time}} · {{order.room.name}}",
    "heading": "Uvidíme se dnes večer",
    "paras": [
      "Otevíráme v {{order.event.doors_at.time}} · konec nejpozději v {{order.event.curfew_at.time}} · {{order.room.name}}. Případný doplatek uhradíte u vchodu, kartou nebo hotově."
    ],
    "button": "Ukázat vstupenky",
    "foot": "Máte vstupenky na tuto akci · objednávka {{order.number}}."
  },
  "tomorrow": {
    "name": "Uvidíme se zítra",
    "subject": "Zítra: {{order.event.name}}, otevíráme v {{order.event.doors_at.time}}",
    "preheader": "Otevíráme v {{order.event.doors_at.time}} · {{order.room.name}}",
    "heading": "Uvidíme se zítra",
    "paras": [
      "Otevíráme v {{order.event.doors_at.time}} · {{order.room.name}}. Případný doplatek uhradíte u vchodu, kartou nebo hotově."
    ],
    "button": "Ukázat vstupenky",
    "foot": "Máte vstupenky na tuto akci · objednávka {{order.number}}."
  },
  "tonight-holder": {
    "name": "Uvidíme se dnes večer (vstupenka od kamaráda)",
    "subject": "Dnes večer: {{ticket.event.name}}, otevíráme v {{ticket.event.doors_at.time}}",
    "preheader": "Otevíráme v {{ticket.event.doors_at.time}}",
    "heading": "Uvidíme se dnes večer",
    "paras": [
      "Otevíráme v {{ticket.event.doors_at.time}}. U vchodu ukažte kód své vstupenky.",
      "Tuto vstupenku vám poslal(a) {{ticket.order.buyer_name}}. Případné peníze vracíme kupujícímu."
    ],
    "button": "Zobrazit vstupenku",
    "foot": "Máte vstupenku na tuto akci."
  },
  "tomorrow-holder": {
    "name": "Uvidíme se zítra (vstupenka od kamaráda)",
    "subject": "Zítra: {{ticket.event.name}}, otevíráme v {{ticket.event.doors_at.time}}",
    "preheader": "Otevíráme v {{ticket.event.doors_at.time}}",
    "heading": "Uvidíme se zítra",
    "paras": [
      "Otevíráme v {{ticket.event.doors_at.time}}. U vchodu ukažte kód své vstupenky.",
      "Tuto vstupenku vám poslal(a) {{ticket.order.buyer_name}}. Případné peníze vracíme kupujícímu."
    ],
    "button": "Zobrazit vstupenku",
    "foot": "Máte vstupenku na tuto akci."
  },
  "refund-recorded": {
    "name": "Vrácení peněz zaznamenáno",
    "subject": "Vrácení peněz za {{order.event.name}} · {{order.number}}",
    "preheader": "Vracíme vám {{order.refunded}}",
    "heading": "Vrácení peněz zaznamenáno",
    "paras": [
      "Za objednávku {{order.number}} jsme zaznamenali vrácení {{order.refunded}}. Peníze k vám dorazí {{practice.refund_payback_text}}."
    ],
    "button": "Zobrazit objednávku",
    "foot": "Objednávka {{order.number}} · {{order.event.name}}."
  },
  "tickets-cancelled": {
    "name": "Vstupenky zrušeny",
    "subject": "Vstupenky ve vaší objednávce na {{order.event.name}} jsou zrušené · {{order.number}}",
    "preheader": "Objednávka {{order.number}}",
    "heading": "Vstupenky zrušeny",
    "paras": [
      "Vstupenky v objednávce {{order.number}} jsou zrušené. Na stránce objednávky uvidíte, co zůstává, a případné peníze, které se vám vrátí."
    ],
    "button": "Zobrazit objednávku",
    "foot": "Objednávka {{order.number}} · {{order.event.name}}."
  },
  "refund-declined": {
    "name": "Žádost o vrácení peněz zamítnuta",
    "subject": "Vaše žádost o vrácení peněz za {{ticket.event.name}}",
    "preheader": "Vaše vstupenka dál platí",
    "heading": "Za tuto vstupenku peníze vrátit nemůžeme",
    "paras": [
      "Vaši žádost jsme prošli a peníze za tuto vstupenku vrátit nemůžeme. Vstupenka dál platí – uvidíme se na akci. Máte otázky? Napište nám na {{practice.contact_email}}."
    ],
    "button": "Zobrazit objednávku",
    "foot": "Máte vstupenku na tuto akci."
  },
  "broadcast": {
    "name": "Zpráva k vaší akci",
    "subject": "{{broadcast.subject}}",
    "preheader": "K vašim vstupenkám na {{order.event.name}}",
    "heading": "K akci {{order.event.name}}",
    "paras": [
      "{{broadcast.body}}"
    ],
    "button": "Zobrazit objednávku",
    "foot": "Máte vstupenky na tuto akci · objednávka {{order.number}}."
  }
};

// prettier-ignore
export const EMAIL_AR: EmailWords = {
  "order": "الطلب",
  "address": "{{appName}} · {{practice.address}} · {{practice.contact_email}}",
  "bankTitle": "الدفع بتحويل بنكي",
  "bankName": "اسم الحساب",
  "bankBank": "البنك",
  "bankNumber": "رقم الحساب",
  "bankRouting": "رمز الفرع أو رقم التوجيه",
  "bankReference": "المرجع",
  "receiptAttached": "إيصالك مرفق.",
  "tickets": {
    "name": "تذاكرك",
    "subject": "تذاكرك لحضور {{order.event.name}} · {{order.number}}",
    "preheader": "{{order.event.doors_at.date}} · فتح الأبواب {{order.event.doors_at.time}}",
    "heading": "أنت على موعد مع {{order.event.name}}",
    "paras": [
      "{{order.event.doors_at.date}} · فتح الأبواب {{order.event.doors_at.time}} · على المسرح {{order.event.starts_at.time}} · {{order.room.name}}. {{order.event.age_note}}",
      "اعرض رمز كل تذكرة عند الباب. أي مبلغ مستحق يُدفع هناك، بالبطاقة أو نقدا."
    ],
    "button": "عرض طلبي",
    "foot": "الطلب {{order.number}}. الزر يفتح طلبك، فاحتفظ بهذه الرسالة."
  },
  "tickets-paid": {
    "name": "تذاكرك (مدفوعة في شباك التذاكر)",
    "subject": "تذاكرك لحضور {{order.event.name}} · {{order.number}}",
    "preheader": "مدفوع · {{order.total}}",
    "heading": "أنت على موعد مع {{order.event.name}}",
    "paras": [
      "{{order.event.doors_at.date}} · فتح الأبواب {{order.event.doors_at.time}} · على المسرح {{order.event.starts_at.time}} · {{order.room.name}}. {{order.event.age_note}}",
      "المبلغ مدفوع بالكامل: {{order.total}}. اعرض رمز كل تذكرة عند الباب."
    ],
    "button": "عرض طلبي",
    "foot": "الطلب {{order.number}}. الزر يفتح طلبك، فاحتفظ بهذه الرسالة."
  },
  "transfer-confirm": {
    "name": "أكّد طلبك",
    "subject": "أكّد طلبك لحضور {{order.event.name}} · {{order.number}}",
    "preheader": "أكّد قبل {{order.held_until.time}} لتحتفظ بتذاكرك",
    "heading": "أكّد طلبك",
    "paras": [
      "اخترت دفع ثمن تذاكر {{order.event.name}} بتحويل بنكي. اضغط الزر قبل {{order.held_until.time}} لتأكيد الطلب، وسنرسل إليك بيانات البنك.",
      "حتى ذلك الحين، تذاكرك محجوزة لك."
    ],
    "button": "تأكيد طلبي",
    "foot": "وصلتك هذه الرسالة لأن هذا العنوان استُخدم لطلب تذاكر من {{appName}}. لم تطلب شيئا؟ تجاهلها."
  },
  "transfer-waiting": {
    "name": "بانتظار تحويلك",
    "subject": "ادفع قبل {{order.pay_by.date}} لتحتفظ بتذاكر {{order.event.name}} · {{order.number}}",
    "preheader": "{{order.total}} قبل {{order.pay_by.date}}، {{order.pay_by.time}}",
    "heading": "بقيت خطوة واحدة: التحويل البنكي",
    "paras": [
      "حوّل {{order.total}} قبل {{order.pay_by.date}}، {{order.pay_by.time}}، واكتب المرجع {{order.number}}. تصلك تذاكرك بالبريد الإلكتروني فور وصول المبلغ.",
      "بعد ذلك الموعد تبقى التذاكر غير المدفوعة محجوزة لمهلة إضافية (بالساعات: {{practice.release_after_hours}})، ثم تعود إلى البيع."
    ],
    "button": "عرض طلبي",
    "foot": "الطلب {{order.number}}. الزر يفتح طلبك، فاحتفظ بهذه الرسالة."
  },
  "transfer-reminder": {
    "name": "تذكير: تحويلك",
    "subject": "تذكير: تحويلك لحضور {{order.event.name}} · {{order.number}}",
    "preheader": "كان {{order.total}} مستحقا في {{order.pay_by.date}}",
    "heading": "لم يصل تحويلك بعد",
    "paras": [
      "لم نستلم {{order.total}} للطلب {{order.number}}. كان موعد الاستحقاق {{order.pay_by.date}}، {{order.pay_by.time}}.",
      "ستعود التذاكر غير المدفوعة إلى البيع قريبا. إن كنت قد أرسلت المبلغ بالفعل، فلا داعي لأي إجراء."
    ],
    "button": "عرض طلبي",
    "foot": "الطلب {{order.number}}. الزر يفتح طلبك، فاحتفظ بهذه الرسالة."
  },
  "transfer-released": {
    "name": "عادت تذاكرك إلى البيع",
    "subject": "عادت تذاكرك لحضور {{order.event.name}} إلى البيع · {{order.number}}",
    "preheader": "لم يصل التحويل في الوقت المحدد",
    "heading": "عادت تذاكرك إلى البيع",
    "paras": [
      "لم يصل التحويل الخاص بالطلب {{order.number}} في الوقت المحدد، فعادت تذاكره إلى البيع. إن كنت قد أرسلته رغم ذلك، فراسلنا على {{practice.contact_email}}."
    ],
    "button": "اطّلع على البرنامج",
    "foot": "الطلب {{order.number}}."
  },
  "payment-received": {
    "name": "تم استلام الدفعة",
    "subject": "تم استلام الدفعة · {{order.event.name}} · {{order.number}}",
    "preheader": "استلمنا {{order.paid_in}} · تذاكرك",
    "heading": "تم استلام الدفعة",
    "paras": [
      "شكرا لك، استلمنا {{order.paid_in}} للطلب {{order.number}}. إليك تذاكرك.",
      "{{order.event.doors_at.date}} · فتح الأبواب {{order.event.doors_at.time}} · {{order.room.name}}."
    ],
    "button": "عرض طلبي",
    "foot": "الطلب {{order.number}}. الزر يفتح طلبك، فاحتفظ بهذه الرسالة."
  },
  "friend-offer": {
    "name": "تذكرة من صديق",
    "subject": "أرسل إليك {{ticket.order.buyer_name}} تذكرة لحضور {{ticket.event.name}}",
    "preheader": "اقبلها قبل {{ticket.offer_until.date}}، {{ticket.offer_until.time}}",
    "heading": "أرسل إليك {{ticket.order.buyer_name}} تذكرة لحضور {{ticket.event.name}}",
    "paras": [
      "{{ticket.name}} · {{ticket.event.doors_at.date}} · فتح الأبواب {{ticket.event.doors_at.time}}.",
      "اقبلها قبل {{ticket.offer_until.date}}، {{ticket.offer_until.time}} لتصبح لك، برمز خاص بها. اقبلها قبل فتح الأبواب، أو اطلب التذكرة من {{ticket.order.buyer_name}} عند الباب."
    ],
    "button": "قبول التذكرة",
    "foot": "أرسل {{ticket.order.buyer_name}} هذه التذكرة من طلبه في {{appName}}. إن تجاهلت الرسالة تبقى التذكرة معه."
  },
  "friend-ready": {
    "name": "تذكرتك جاهزة",
    "subject": "تذكرتك لحضور {{ticket.event.name}}",
    "preheader": "{{ticket.event.doors_at.date}} · فتح الأبواب {{ticket.event.doors_at.time}}",
    "heading": "تذكرتك جاهزة",
    "paras": [
      "{{ticket.holder_name}} · {{ticket.name}} · {{ticket.code.grouped}}",
      "{{ticket.event.doors_at.date}} · فتح الأبواب {{ticket.event.doors_at.time}}. اعرض هذا الرمز عند الباب."
    ],
    "button": "عرض تذكرتي",
    "foot": "قبلتها من {{ticket.order.buyer_name}}. الزر يفتح تذكرتك، فاحتفظ بهذه الرسالة."
  },
  "friend-returned": {
    "name": "عادت إليك تذكرتك",
    "subject": "عادت إليك تذكرتك لحضور {{ticket.event.name}}",
    "preheader": "لم تُقبل في الوقت المحدد",
    "heading": "عادت إليك تذكرتك",
    "paras": [
      "التذكرة التي أرسلتها إلى {{ticket.pending_name}} لم تُقبل في الوقت المحدد، فعادت إليك. ورمزها ما زال صالحا."
    ],
    "button": "عرض طلبي",
    "foot": "أرسلت هذه التذكرة من طلبك في {{appName}}."
  },
  "holder-set": {
    "name": "تذكرة باسمك",
    "subject": "تذكرة باسمك لحضور {{ticket.event.name}}",
    "preheader": "{{ticket.event.doors_at.date}} · فتح الأبواب {{ticket.event.doors_at.time}}",
    "heading": "تذكرة لحضور {{ticket.event.name}} أصبحت لك",
    "paras": [
      "سجّل شباك التذاكر هذه التذكرة باسمك: {{ticket.name}} · {{ticket.code.grouped}}. اعرض الرمز عند الباب."
    ],
    "button": "عرض تذكرتي",
    "foot": "الزر يفتح تذكرتك، فاحتفظ بهذه الرسالة."
  },
  "waitlist-offer": {
    "name": "عادت التذاكر",
    "subject": "تذاكر {{order.event.name}} متاحة لك إن أردتها",
    "preheader": "احصل عليها قبل {{order.offer_until.date}}، {{order.offer_until.time}}",
    "heading": "عادت تذاكر لحضور {{order.event.name}}",
    "paras": [
      "جاء دورك في قائمة الانتظار. احصل عليها قبل {{order.offer_until.date}}، {{order.offer_until.time}}، وبعد ذلك تنتقل إلى الشخص التالي.",
      "يمكنك أخذ عدد أقل مما نعرضه."
    ],
    "button": "الحصول على تذاكري",
    "foot": "انضممت إلى قائمة الانتظار لهذا الحفل."
  },
  "on-sale": {
    "name": "البيع قريبا",
    "subject": "تذاكر {{reminder.event.name}} تُطرح للبيع الساعة {{reminder.on_sale_at.time}}",
    "preheader": "{{reminder.on_sale_at.date}}، {{reminder.on_sale_at.time}}",
    "heading": "تذاكر {{reminder.event.name}} تُطرح للبيع الساعة {{reminder.on_sale_at.time}}",
    "paras": [
      "تُطرح التذاكر للبيع في {{reminder.on_sale_at.date}} الساعة {{reminder.on_sale_at.time}}."
    ],
    "button": "احصل على التذاكر",
    "foot": "طلبت منا تذكيرك مرة واحدة قبل طرح التذاكر للبيع."
  },
  "moved": {
    "name": "تغيّر موعد حفلك",
    "subject": "انتقل {{order.event.name}} إلى {{order.event.doors_at.date}}",
    "preheader": "تذاكرك صالحة في الموعد الجديد",
    "heading": "تغيّر موعد {{order.event.name}}",
    "paras": [
      "أصبح موعد {{order.event.name}} في {{order.event.doors_at.date}}، وتُفتح الأبواب {{order.event.doors_at.time}}. تذاكرك صالحة في الموعد الجديد.",
      "إن لم تتمكن من الحضور، ألغِ تذاكرك من صفحة طلبك."
    ],
    "button": "الاحتفاظ بتذاكري أو استرداد ثمنها",
    "foot": "لديك تذاكر لهذا الحفل · الطلب {{order.number}}."
  },
  "moved-holder": {
    "name": "تغيّر موعد حفلك (تذكرة من صديق)",
    "subject": "انتقل {{ticket.event.name}} إلى {{ticket.event.doors_at.date}}",
    "preheader": "تذكرتك صالحة في الموعد الجديد",
    "heading": "تغيّر موعد {{ticket.event.name}}",
    "paras": [
      "أصبح موعد {{ticket.event.name}} في {{ticket.event.doors_at.date}}، وتُفتح الأبواب {{ticket.event.doors_at.time}}. تذكرتك صالحة في الموعد الجديد.",
      "أرسل إليك {{ticket.order.buyer_name}} هذه التذكرة. أي مبلغ يُرد يذهب إليه."
    ],
    "button": "عرض تذكرتي",
    "foot": "لديك تذكرة لهذا الحفل."
  },
  "cancelled-paid": {
    "name": "أُلغي حفلك (مدفوع)",
    "subject": "أُلغي {{order.event.name}} المقرر في {{order.event.doors_at.date}}",
    "preheader": "سيعود إليك مالك",
    "heading": "أُلغي {{order.event.name}}",
    "paras": [
      "نأسف لإبلاغك بإلغاء {{order.event.name}} المقرر في {{order.event.doors_at.date}}.",
      "دفعت {{order.paid_in}}. سنعيده إليك {{practice.refund_payback_text}}، بالطريقة نفسها التي دفعت بها."
    ],
    "button": "عرض طلبي",
    "foot": "لديك تذاكر لهذا الحفل · الطلب {{order.number}}."
  },
  "cancelled-unpaid": {
    "name": "أُلغي حفلك (لم يُدفع شيء)",
    "subject": "أُلغي {{order.event.name}} المقرر في {{order.event.doors_at.date}}",
    "preheader": "لا شيء للدفع",
    "heading": "أُلغي {{order.event.name}}",
    "paras": [
      "نأسف لإبلاغك بإلغاء {{order.event.name}} المقرر في {{order.event.doors_at.date}}.",
      "لم تدفع شيئا، لذا لا يوجد ما نرده إليك."
    ],
    "button": "عرض طلبي",
    "foot": "لديك تذاكر لهذا الحفل · الطلب {{order.number}}."
  },
  "cancelled-holder": {
    "name": "أُلغي حفلك (تذكرة من صديق)",
    "subject": "أُلغي {{ticket.event.name}} المقرر في {{ticket.event.doors_at.date}}",
    "preheader": "لن تحتاج إلى تذكرتك",
    "heading": "أُلغي {{ticket.event.name}}",
    "paras": [
      "نأسف لإبلاغك بإلغاء {{ticket.event.name}} المقرر في {{ticket.event.doors_at.date}}.",
      "أرسل إليك {{ticket.order.buyer_name}} هذه التذكرة. أي مبلغ يُرد يذهب إليه."
    ],
    "foot": "لديك تذكرة لهذا الحفل."
  },
  "tonight": {
    "name": "نراك الليلة",
    "subject": "الليلة: {{order.event.name}}، فتح الأبواب {{order.event.doors_at.time}}",
    "preheader": "فتح الأبواب {{order.event.doors_at.time}} · {{order.room.name}}",
    "heading": "نراك الليلة",
    "paras": [
      "فتح الأبواب {{order.event.doors_at.time}} · موعد الإغلاق {{order.event.curfew_at.time}} · {{order.room.name}}. أي مبلغ مستحق يُدفع عند الباب، بالبطاقة أو نقدا."
    ],
    "button": "عرض تذاكري",
    "foot": "لديك تذاكر لهذا الحفل · الطلب {{order.number}}."
  },
  "tomorrow": {
    "name": "نراك غدا",
    "subject": "غدا: {{order.event.name}}، فتح الأبواب {{order.event.doors_at.time}}",
    "preheader": "فتح الأبواب {{order.event.doors_at.time}} · {{order.room.name}}",
    "heading": "نراك غدا",
    "paras": [
      "فتح الأبواب {{order.event.doors_at.time}} · {{order.room.name}}. أي مبلغ مستحق يُدفع عند الباب، بالبطاقة أو نقدا."
    ],
    "button": "عرض تذاكري",
    "foot": "لديك تذاكر لهذا الحفل · الطلب {{order.number}}."
  },
  "tonight-holder": {
    "name": "نراك الليلة (تذكرة من صديق)",
    "subject": "الليلة: {{ticket.event.name}}، فتح الأبواب {{ticket.event.doors_at.time}}",
    "preheader": "فتح الأبواب {{ticket.event.doors_at.time}}",
    "heading": "نراك الليلة",
    "paras": [
      "فتح الأبواب {{ticket.event.doors_at.time}}. اعرض رمز تذكرتك عند الباب.",
      "أرسل إليك {{ticket.order.buyer_name}} هذه التذكرة. أي مبلغ يُرد يذهب إليه."
    ],
    "button": "عرض تذكرتي",
    "foot": "لديك تذكرة لهذا الحفل."
  },
  "tomorrow-holder": {
    "name": "نراك غدا (تذكرة من صديق)",
    "subject": "غدا: {{ticket.event.name}}، فتح الأبواب {{ticket.event.doors_at.time}}",
    "preheader": "فتح الأبواب {{ticket.event.doors_at.time}}",
    "heading": "نراك غدا",
    "paras": [
      "فتح الأبواب {{ticket.event.doors_at.time}}. اعرض رمز تذكرتك عند الباب.",
      "أرسل إليك {{ticket.order.buyer_name}} هذه التذكرة. أي مبلغ يُرد يذهب إليه."
    ],
    "button": "عرض تذكرتي",
    "foot": "لديك تذكرة لهذا الحفل."
  },
  "refund-recorded": {
    "name": "سُجّل الاسترداد",
    "subject": "استرداد مبلغك لحضور {{order.event.name}} · {{order.number}}",
    "preheader": "{{order.refunded}} يعود إليك",
    "heading": "سُجّل الاسترداد",
    "paras": [
      "سجّلنا رد {{order.refunded}} إليك عن الطلب {{order.number}}. سيصلك المبلغ {{practice.refund_payback_text}}."
    ],
    "button": "عرض طلبي",
    "foot": "الطلب {{order.number}} · {{order.event.name}}."
  },
  "tickets-cancelled": {
    "name": "أُلغيت التذاكر",
    "subject": "أُلغيت تذاكر من طلبك لحضور {{order.event.name}} · {{order.number}}",
    "preheader": "الطلب {{order.number}}",
    "heading": "تم إلغاء تذاكر",
    "paras": [
      "أُلغيت تذاكر من الطلب {{order.number}}. تعرض صفحة الطلب ما تبقى منه، وأي مبلغ سيُرد إليك."
    ],
    "button": "عرض طلبي",
    "foot": "الطلب {{order.number}} · {{order.event.name}}."
  },
  "refund-declined": {
    "name": "رُفض طلب الاسترداد",
    "subject": "طلب استرداد ثمن تذكرتك لحضور {{ticket.event.name}}",
    "preheader": "تذكرتك ما زالت صالحة",
    "heading": "لا يمكننا رد ثمن هذه التذكرة",
    "paras": [
      "راجعنا طلبك ولا يمكننا رد ثمن هذه التذكرة. ما زالت صالحة، نراك في الحفل. لديك أسئلة؟ راسلنا على {{practice.contact_email}}."
    ],
    "button": "عرض طلبي",
    "foot": "لديك تذكرة لهذا الحفل."
  },
  "broadcast": {
    "name": "رسالة بخصوص حفلك",
    "subject": "{{broadcast.subject}}",
    "preheader": "بخصوص تذاكرك لحضور {{order.event.name}}",
    "heading": "بخصوص {{order.event.name}}",
    "paras": [
      "{{broadcast.body}}"
    ],
    "button": "عرض طلبي",
    "foot": "لديك تذاكر لهذا الحفل · الطلب {{order.number}}."
  }
};

// prettier-ignore
export const EMAIL_ZH_CN: EmailWords = {
  "order": "订单",
  "address": "{{appName}} · {{practice.address}} · {{practice.contact_email}}",
  "bankTitle": "银行转账付款",
  "bankName": "户名",
  "bankBank": "银行",
  "bankNumber": "账号",
  "bankRouting": "银行代码",
  "bankReference": "附言",
  "receiptAttached": "收据已附上。",
  "tickets": {
    "name": "你的门票",
    "subject": "你的 {{order.event.name}} 门票 · {{order.number}}",
    "preheader": "{{order.event.doors_at.date}} · {{order.event.doors_at.time}} 开门",
    "heading": "{{order.event.name}}，不见不散",
    "paras": [
      "{{order.event.doors_at.date}} · {{order.event.doors_at.time}} 开门 · {{order.event.starts_at.time}} 开演 · {{order.room.name}}。{{order.event.age_note}}",
      "入场时请出示每张票的票码。如有待付款项，可在门口刷卡或付现金。"
    ],
    "button": "查看我的订单",
    "foot": "订单 {{order.number}}。点击按钮即可打开订单，请保留这封邮件。"
  },
  "tickets-paid": {
    "name": "你的门票（已在售票处付款）",
    "subject": "你的 {{order.event.name}} 门票 · {{order.number}}",
    "preheader": "已付款 · {{order.total}}",
    "heading": "{{order.event.name}}，不见不散",
    "paras": [
      "{{order.event.doors_at.date}} · {{order.event.doors_at.time}} 开门 · {{order.event.starts_at.time}} 开演 · {{order.room.name}}。{{order.event.age_note}}",
      "已全额付款：{{order.total}}。入场时请出示每张票的票码。"
    ],
    "button": "查看我的订单",
    "foot": "订单 {{order.number}}。点击按钮即可打开订单，请保留这封邮件。"
  },
  "transfer-confirm": {
    "name": "确认你的订单",
    "subject": "请确认你的 {{order.event.name}} 订单 · {{order.number}}",
    "preheader": "请在 {{order.held_until.time}} 前确认，门票才会为你保留",
    "heading": "确认你的订单",
    "paras": [
      "你选择了通过银行转账支付 {{order.event.name}} 的门票。请在 {{order.held_until.time}} 前点击按钮确认订单，我们随后会把银行信息发给你。",
      "在此之前，门票会一直为你保留。"
    ],
    "button": "确认我的订单",
    "foot": "你收到这封邮件，是因为有人用这个邮箱在 {{appName}} 订了票。如果不是你本人，请忽略即可。"
  },
  "transfer-waiting": {
    "name": "等待你的转账",
    "subject": "请在 {{order.pay_by.date}} 前付款，保留你的 {{order.event.name}} 门票 · {{order.number}}",
    "preheader": "{{order.total}}，截止 {{order.pay_by.date}} {{order.pay_by.time}}",
    "heading": "只差最后一步：银行转账",
    "paras": [
      "请在 {{order.pay_by.date}} {{order.pay_by.time}} 前转账 {{order.total}}，附言填写 {{order.number}}。款项到账后，门票会通过邮件发给你。",
      "逾期 {{practice.release_after_hours}} 小时仍未付款，门票将重新开售。"
    ],
    "button": "查看我的订单",
    "foot": "订单 {{order.number}}。点击按钮即可打开订单，请保留这封邮件。"
  },
  "transfer-reminder": {
    "name": "提醒：你的转账",
    "subject": "提醒：你的 {{order.event.name}} 转账 · {{order.number}}",
    "preheader": "{{order.total}} 应于 {{order.pay_by.date}} 前付清",
    "heading": "你的转账还没到账",
    "paras": [
      "我们还没有收到订单 {{order.number}} 的 {{order.total}}。付款截止时间是 {{order.pay_by.date}} {{order.pay_by.time}}。",
      "未付款的门票很快会重新开售。如果你已经转账，无需任何操作。"
    ],
    "button": "查看我的订单",
    "foot": "订单 {{order.number}}。点击按钮即可打开订单，请保留这封邮件。"
  },
  "transfer-released": {
    "name": "你的门票已重新开售",
    "subject": "你的 {{order.event.name}} 门票已重新开售 · {{order.number}}",
    "preheader": "转账未能按时到账",
    "heading": "你的门票已重新开售",
    "paras": [
      "订单 {{order.number}} 的转账未能按时到账，所以这些门票已重新开售。如果你其实已经转账，请写信至 {{practice.contact_email}}。"
    ],
    "button": "看看近期演出",
    "foot": "订单 {{order.number}}。"
  },
  "payment-received": {
    "name": "已收到付款",
    "subject": "已收到付款 · {{order.event.name}} · {{order.number}}",
    "preheader": "已收到 {{order.paid_in}} · 你的门票",
    "heading": "已收到付款",
    "paras": [
      "谢谢！我们已收到订单 {{order.number}} 的 {{order.paid_in}}。这是你的门票。",
      "{{order.event.doors_at.date}} · {{order.event.doors_at.time}} 开门 · {{order.room.name}}。"
    ],
    "button": "查看我的订单",
    "foot": "订单 {{order.number}}。点击按钮即可打开订单，请保留这封邮件。"
  },
  "friend-offer": {
    "name": "朋友送你的票",
    "subject": "{{ticket.order.buyer_name}} 送了你一张 {{ticket.event.name}} 的票",
    "preheader": "请在 {{ticket.offer_until.date}} {{ticket.offer_until.time}} 前接收",
    "heading": "{{ticket.order.buyer_name}} 送了你一张 {{ticket.event.name}} 的票",
    "paras": [
      "{{ticket.name}} · {{ticket.event.doors_at.date}} · {{ticket.event.doors_at.time}} 开门。",
      "在 {{ticket.offer_until.date}} {{ticket.offer_until.time}} 前接收，这张票就归你了，还会有自己的票码。请在开门前接收，或者到门口找 {{ticket.order.buyer_name}} 拿票。"
    ],
    "button": "接收门票",
    "foot": "这张票由 {{ticket.order.buyer_name}} 从其 {{appName}} 订单中发出。如果你忽略这封邮件，票会留在对方那里。"
  },
  "friend-ready": {
    "name": "你的票已准备好",
    "subject": "你的 {{ticket.event.name}} 门票",
    "preheader": "{{ticket.event.doors_at.date}} · {{ticket.event.doors_at.time}} 开门",
    "heading": "你的票已准备好",
    "paras": [
      "{{ticket.holder_name}} · {{ticket.name}} · {{ticket.code.grouped}}",
      "{{ticket.event.doors_at.date}} · {{ticket.event.doors_at.time}} 开门。入场时请出示这个票码。"
    ],
    "button": "查看我的票",
    "foot": "这张票接收自 {{ticket.order.buyer_name}}。点击按钮即可打开门票，请保留这封邮件。"
  },
  "friend-returned": {
    "name": "你的票已退回",
    "subject": "你的 {{ticket.event.name}} 门票已退回",
    "preheader": "对方没有按时接收",
    "heading": "你的票已退回",
    "paras": [
      "你送给 {{ticket.pending_name}} 的票没有被按时接收，现在又回到你手里了。原来的票码依然有效。"
    ],
    "button": "查看我的订单",
    "foot": "这张票是你从自己的 {{appName}} 订单中送出的。"
  },
  "holder-set": {
    "name": "登记在你名下的票",
    "subject": "一张登记在你名下的 {{ticket.event.name}} 门票",
    "preheader": "{{ticket.event.doors_at.date}} · {{ticket.event.doors_at.time}} 开门",
    "heading": "这张 {{ticket.event.name}} 门票归你了",
    "paras": [
      "售票处已将这张票登记在你名下：{{ticket.name}} · {{ticket.code.grouped}}。入场时请出示票码。"
    ],
    "button": "查看我的票",
    "foot": "点击按钮即可打开门票，请保留这封邮件。"
  },
  "waitlist-offer": {
    "name": "又有票了",
    "subject": "{{order.event.name}} 有票了，想要就是你的",
    "preheader": "请在 {{order.offer_until.date}} {{order.offer_until.time}} 前领取",
    "heading": "{{order.event.name}} 又有票了",
    "paras": [
      "候补名单上下一位就是你。请在 {{order.offer_until.date}} {{order.offer_until.time}} 前领取，过时这些票会留给下一位。",
      "你也可以少要几张。"
    ],
    "button": "领取我的门票",
    "foot": "你加入了这场演出的候补名单。"
  },
  "on-sale": {
    "name": "即将开售",
    "subject": "{{reminder.event.name}} 将于 {{reminder.on_sale_at.time}} 开售",
    "preheader": "{{reminder.on_sale_at.date}} {{reminder.on_sale_at.time}}",
    "heading": "{{reminder.event.name}} 将于 {{reminder.on_sale_at.time}} 开售",
    "paras": [
      "门票将于 {{reminder.on_sale_at.date}} {{reminder.on_sale_at.time}} 开售。"
    ],
    "button": "去买票",
    "foot": "你请我们在开售前提醒你一次。"
  },
  "moved": {
    "name": "你的演出已改期",
    "subject": "{{order.event.name}} 已改期至 {{order.event.doors_at.date}}",
    "preheader": "你的门票在新日期照常有效",
    "heading": "{{order.event.name}} 已改期",
    "paras": [
      "{{order.event.name}} 改在 {{order.event.doors_at.date}} 举行，{{order.event.doors_at.time}} 开门。你的门票在新日期照常有效。",
      "如果去不了，可以在订单页面取消门票。"
    ],
    "button": "保留或退掉我的门票",
    "foot": "你有这场演出的门票 · 订单 {{order.number}}。"
  },
  "moved-holder": {
    "name": "你的演出已改期（朋友送的票）",
    "subject": "{{ticket.event.name}} 已改期至 {{ticket.event.doors_at.date}}",
    "preheader": "你的票在新日期照常有效",
    "heading": "{{ticket.event.name}} 已改期",
    "paras": [
      "{{ticket.event.name}} 改在 {{ticket.event.doors_at.date}} 举行，{{ticket.event.doors_at.time}} 开门。你的票在新日期照常有效。",
      "这张票是 {{ticket.order.buyer_name}} 送你的。如有退款，会退给对方。"
    ],
    "button": "查看我的票",
    "foot": "你持有这场演出的门票。"
  },
  "cancelled-paid": {
    "name": "你的演出已取消（已付款）",
    "subject": "{{order.event.doors_at.date}} 的 {{order.event.name}} 已取消",
    "preheader": "你的钱会退还给你",
    "heading": "{{order.event.name}} 已取消",
    "paras": [
      "非常抱歉，{{order.event.doors_at.date}} 的 {{order.event.name}} 已取消。",
      "你已支付 {{order.paid_in}}。我们会按原付款方式退还，{{practice.refund_payback_text}}。"
    ],
    "button": "查看我的订单",
    "foot": "你有这场演出的门票 · 订单 {{order.number}}。"
  },
  "cancelled-unpaid": {
    "name": "你的演出已取消（未付款）",
    "subject": "{{order.event.doors_at.date}} 的 {{order.event.name}} 已取消",
    "preheader": "无需付款",
    "heading": "{{order.event.name}} 已取消",
    "paras": [
      "非常抱歉，{{order.event.doors_at.date}} 的 {{order.event.name}} 已取消。",
      "你还没有付款，所以没有需要退还的钱。"
    ],
    "button": "查看我的订单",
    "foot": "你有这场演出的门票 · 订单 {{order.number}}。"
  },
  "cancelled-holder": {
    "name": "你的演出已取消（朋友送的票）",
    "subject": "{{ticket.event.doors_at.date}} 的 {{ticket.event.name}} 已取消",
    "preheader": "你的票不再需要了",
    "heading": "{{ticket.event.name}} 已取消",
    "paras": [
      "非常抱歉，{{ticket.event.doors_at.date}} 的 {{ticket.event.name}} 已取消。",
      "这张票是 {{ticket.order.buyer_name}} 送你的。如有退款，会退给对方。"
    ],
    "foot": "你持有这场演出的门票。"
  },
  "tonight": {
    "name": "今晚见",
    "subject": "今晚：{{order.event.name}}，{{order.event.doors_at.time}} 开门",
    "preheader": "{{order.event.doors_at.time}} 开门 · {{order.room.name}}",
    "heading": "今晚见",
    "paras": [
      "{{order.event.doors_at.time}} 开门 · {{order.event.curfew_at.time}} 散场 · {{order.room.name}}。如有待付款项，可在门口刷卡或付现金。"
    ],
    "button": "出示我的门票",
    "foot": "你有这场演出的门票 · 订单 {{order.number}}。"
  },
  "tomorrow": {
    "name": "明天见",
    "subject": "明天：{{order.event.name}}，{{order.event.doors_at.time}} 开门",
    "preheader": "{{order.event.doors_at.time}} 开门 · {{order.room.name}}",
    "heading": "明天见",
    "paras": [
      "{{order.event.doors_at.time}} 开门 · {{order.room.name}}。如有待付款项，可在门口刷卡或付现金。"
    ],
    "button": "出示我的门票",
    "foot": "你有这场演出的门票 · 订单 {{order.number}}。"
  },
  "tonight-holder": {
    "name": "今晚见（朋友送的票）",
    "subject": "今晚：{{ticket.event.name}}，{{ticket.event.doors_at.time}} 开门",
    "preheader": "{{ticket.event.doors_at.time}} 开门",
    "heading": "今晚见",
    "paras": [
      "{{ticket.event.doors_at.time}} 开门。入场时请出示你的票码。",
      "这张票是 {{ticket.order.buyer_name}} 送你的。如有退款，会退给对方。"
    ],
    "button": "查看我的票",
    "foot": "你持有这场演出的门票。"
  },
  "tomorrow-holder": {
    "name": "明天见（朋友送的票）",
    "subject": "明天：{{ticket.event.name}}，{{ticket.event.doors_at.time}} 开门",
    "preheader": "{{ticket.event.doors_at.time}} 开门",
    "heading": "明天见",
    "paras": [
      "{{ticket.event.doors_at.time}} 开门。入场时请出示你的票码。",
      "这张票是 {{ticket.order.buyer_name}} 送你的。如有退款，会退给对方。"
    ],
    "button": "查看我的票",
    "foot": "你持有这场演出的门票。"
  },
  "refund-recorded": {
    "name": "退款已记录",
    "subject": "你的 {{order.event.name}} 退款 · {{order.number}}",
    "preheader": "{{order.refunded}} 将退还给你",
    "heading": "退款已记录",
    "paras": [
      "我们已为订单 {{order.number}} 记录了 {{order.refunded}} 的退款，{{practice.refund_payback_text}}到账。"
    ],
    "button": "查看我的订单",
    "foot": "订单 {{order.number}} · {{order.event.name}}。"
  },
  "tickets-cancelled": {
    "name": "门票已取消",
    "subject": "你的 {{order.event.name}} 订单中的门票已取消 · {{order.number}}",
    "preheader": "订单 {{order.number}}",
    "heading": "门票已取消",
    "paras": [
      "订单 {{order.number}} 中的门票已取消。订单页面会显示剩余的门票，以及应退还给你的款项。"
    ],
    "button": "查看我的订单",
    "foot": "订单 {{order.number}} · {{order.event.name}}。"
  },
  "refund-declined": {
    "name": "退款申请未通过",
    "subject": "你的 {{ticket.event.name}} 退款申请",
    "preheader": "你的票依然有效",
    "heading": "这张票无法退款",
    "paras": [
      "我们看过你的申请，这张票无法退款。票依然有效，演出现场见！有疑问请写信至 {{practice.contact_email}}。"
    ],
    "button": "查看我的订单",
    "foot": "你有这场演出的门票。"
  },
  "broadcast": {
    "name": "关于你的演出的消息",
    "subject": "{{broadcast.subject}}",
    "preheader": "关于你的 {{order.event.name}} 门票",
    "heading": "关于 {{order.event.name}}",
    "paras": [
      "{{broadcast.body}}"
    ],
    "button": "查看我的订单",
    "foot": "你有这场演出的门票 · 订单 {{order.number}}。"
  }
};

// prettier-ignore
export const EMAIL_ZH_TW: EmailWords = {
  "order": "訂單",
  "address": "{{appName}} · {{practice.address}} · {{practice.contact_email}}",
  "bankTitle": "以銀行轉帳付款",
  "bankName": "戶名",
  "bankBank": "銀行",
  "bankNumber": "帳號",
  "bankRouting": "銀行代碼",
  "bankReference": "轉帳備註",
  "receiptAttached": "收據已附上。",
  "tickets": {
    "name": "你的票券",
    "subject": "你的 {{order.event.name}} 票券 · {{order.number}}",
    "preheader": "{{order.event.doors_at.date}} · {{order.event.doors_at.time}} 入場",
    "heading": "{{order.event.name}}，等你來！",
    "paras": [
      "{{order.event.doors_at.date}} · {{order.event.doors_at.time}} 入場 · {{order.event.starts_at.time}} 演出開始 · {{order.room.name}}。{{order.event.age_note}}",
      "入場時請出示每張票的代碼。尚未付清的款項可在現場以刷卡或現金支付。"
    ],
    "button": "查看我的訂單",
    "foot": "訂單 {{order.number}}。按下按鈕即可開啟你的訂單，請保留這封信。"
  },
  "tickets-paid": {
    "name": "你的票券（已在售票處付款）",
    "subject": "你的 {{order.event.name}} 票券 · {{order.number}}",
    "preheader": "已付款 · {{order.total}}",
    "heading": "{{order.event.name}}，等你來！",
    "paras": [
      "{{order.event.doors_at.date}} · {{order.event.doors_at.time}} 入場 · {{order.event.starts_at.time}} 演出開始 · {{order.room.name}}。{{order.event.age_note}}",
      "已全額付清：{{order.total}}。入場時請出示每張票的代碼。"
    ],
    "button": "查看我的訂單",
    "foot": "訂單 {{order.number}}。按下按鈕即可開啟你的訂單，請保留這封信。"
  },
  "transfer-confirm": {
    "name": "確認你的訂單",
    "subject": "請確認你的 {{order.event.name}} 訂單 · {{order.number}}",
    "preheader": "請在 {{order.held_until.time}} 前確認，才能保留你的票",
    "heading": "確認你的訂單",
    "paras": [
      "你選擇以銀行轉帳支付 {{order.event.name}} 的票款。請在 {{order.held_until.time}} 前按下按鈕確認訂單，我們會寄上轉帳資料。",
      "在那之前，你的票會先為你保留。"
    ],
    "button": "確認我的訂單",
    "foot": "你收到這封信，是因為有人用這個信箱在 {{appName}} 訂票。如果不是你訂的，請忽略這封信。"
  },
  "transfer-waiting": {
    "name": "等待你的轉帳",
    "subject": "請在 {{order.pay_by.date}} 前付款，保留你的 {{order.event.name}} 票券 · {{order.number}}",
    "preheader": "{{order.pay_by.date}} {{order.pay_by.time}} 前轉帳 {{order.total}}",
    "heading": "只差一步：完成銀行轉帳",
    "paras": [
      "請在 {{order.pay_by.date}} {{order.pay_by.time}} 前轉帳 {{order.total}}，並在轉帳備註填寫 {{order.number}}。款項入帳後，票券會以電子郵件寄給你。",
      "逾期 {{practice.release_after_hours}} 小時仍未付款，票券將重新開賣。"
    ],
    "button": "查看我的訂單",
    "foot": "訂單 {{order.number}}。按下按鈕即可開啟你的訂單，請保留這封信。"
  },
  "transfer-reminder": {
    "name": "提醒：你的轉帳",
    "subject": "提醒：你的 {{order.event.name}} 轉帳 · {{order.number}}",
    "preheader": "{{order.total}} 的付款期限是 {{order.pay_by.date}}",
    "heading": "還沒收到你的轉帳",
    "paras": [
      "我們還沒收到訂單 {{order.number}} 的 {{order.total}}。付款期限是 {{order.pay_by.date}} {{order.pay_by.time}}。",
      "未付款的票券很快就會重新開賣。如果你已經轉帳了，就不用再做任何事。"
    ],
    "button": "查看我的訂單",
    "foot": "訂單 {{order.number}}。按下按鈕即可開啟你的訂單，請保留這封信。"
  },
  "transfer-released": {
    "name": "你的票已重新開賣",
    "subject": "你的 {{order.event.name}} 票券已重新開賣 · {{order.number}}",
    "preheader": "轉帳未在期限內入帳",
    "heading": "你的票已重新開賣",
    "paras": [
      "訂單 {{order.number}} 的轉帳未在期限內入帳，所以這些票已重新開賣。如果你其實已經轉帳，請寫信到 {{practice.contact_email}}。"
    ],
    "button": "看看近期演出",
    "foot": "訂單 {{order.number}}。"
  },
  "payment-received": {
    "name": "已收到款項",
    "subject": "已收到款項 · {{order.event.name}} · {{order.number}}",
    "preheader": "已收到 {{order.paid_in}} · 你的票券",
    "heading": "已收到款項",
    "paras": [
      "謝謝你！我們已收到訂單 {{order.number}} 的 {{order.paid_in}}。這是你的票券。",
      "{{order.event.doors_at.date}} · {{order.event.doors_at.time}} 入場 · {{order.room.name}}。"
    ],
    "button": "查看我的訂單",
    "foot": "訂單 {{order.number}}。按下按鈕即可開啟你的訂單，請保留這封信。"
  },
  "friend-offer": {
    "name": "朋友送你的票",
    "subject": "{{ticket.order.buyer_name}} 送你一張 {{ticket.event.name}} 的票",
    "preheader": "請在 {{ticket.offer_until.date}} {{ticket.offer_until.time}} 前接受",
    "heading": "{{ticket.order.buyer_name}} 送你一張 {{ticket.event.name}} 的票",
    "paras": [
      "{{ticket.name}} · {{ticket.event.doors_at.date}} · {{ticket.event.doors_at.time}} 入場。",
      "請在 {{ticket.offer_until.date}} {{ticket.offer_until.time}} 前接受，這張票就歸你，並有自己的代碼。請在入場前接受，或到現場向 {{ticket.order.buyer_name}} 拿票。"
    ],
    "button": "接受這張票",
    "foot": "這是 {{ticket.order.buyer_name}} 從 {{appName}} 的訂單寄出的。如果你不理會，這張票會留在對方那裡。"
  },
  "friend-ready": {
    "name": "你的票準備好了",
    "subject": "你的 {{ticket.event.name}} 票券",
    "preheader": "{{ticket.event.doors_at.date}} · {{ticket.event.doors_at.time}} 入場",
    "heading": "你的票準備好了",
    "paras": [
      "{{ticket.holder_name}} · {{ticket.name}} · {{ticket.code.grouped}}",
      "{{ticket.event.doors_at.date}} · {{ticket.event.doors_at.time}} 入場。入場時請出示這個代碼。"
    ],
    "button": "查看我的票",
    "foot": "由 {{ticket.order.buyer_name}} 轉送並已接受。按下按鈕即可開啟你的票，請保留這封信。"
  },
  "friend-returned": {
    "name": "你的票退回了",
    "subject": "你的 {{ticket.event.name}} 票券退回了",
    "preheader": "對方沒有在期限內接受",
    "heading": "你的票退回了",
    "paras": [
      "你送給 {{ticket.pending_name}} 的票沒有在期限內被接受，所以又回到你手上。票上的代碼仍然有效。"
    ],
    "button": "查看我的訂單",
    "foot": "這張票是你從 {{appName}} 的訂單送出的。"
  },
  "holder-set": {
    "name": "登記在你名下的票",
    "subject": "一張登記在你名下的 {{ticket.event.name}} 票券",
    "preheader": "{{ticket.event.doors_at.date}} · {{ticket.event.doors_at.time}} 入場",
    "heading": "這張 {{ticket.event.name}} 的票是你的了",
    "paras": [
      "售票處已將這張票登記在你名下：{{ticket.name}} · {{ticket.code.grouped}}。入場時請出示代碼。"
    ],
    "button": "查看我的票",
    "foot": "按下按鈕即可開啟你的票，請保留這封信。"
  },
  "waitlist-offer": {
    "name": "有票釋出了",
    "subject": "{{order.event.name}} 有票了，想要就是你的",
    "preheader": "請在 {{order.offer_until.date}} {{order.offer_until.time}} 前領取",
    "heading": "{{order.event.name}} 有票釋出了",
    "paras": [
      "候補名單上輪到你了。請在 {{order.offer_until.date}} {{order.offer_until.time}} 前領取，逾時就會轉給下一位。",
      "你也可以只領取部分票數。"
    ],
    "button": "領取我的票",
    "foot": "你登記了這場演出的候補名單。"
  },
  "on-sale": {
    "name": "即將開賣",
    "subject": "{{reminder.event.name}} 將於 {{reminder.on_sale_at.time}} 開賣",
    "preheader": "{{reminder.on_sale_at.date}} {{reminder.on_sale_at.time}}",
    "heading": "{{reminder.event.name}} 將於 {{reminder.on_sale_at.time}} 開賣",
    "paras": [
      "票券將於 {{reminder.on_sale_at.date}} {{reminder.on_sale_at.time}} 開賣。"
    ],
    "button": "去買票",
    "foot": "你請我們在開賣前提醒你一次。"
  },
  "moved": {
    "name": "你的演出已改期",
    "subject": "{{order.event.name}} 改期至 {{order.event.doors_at.date}}",
    "preheader": "你的票在新日期仍然有效",
    "heading": "{{order.event.name}} 改期了",
    "paras": [
      "{{order.event.name}} 改在 {{order.event.doors_at.date}}，{{order.event.doors_at.time}} 入場。你的票在新日期仍然有效。",
      "如果你無法出席，可以在訂單頁面取消你的票。"
    ],
    "button": "保留票券或申請退款",
    "foot": "你持有這場演出的票 · 訂單 {{order.number}}。"
  },
  "moved-holder": {
    "name": "你的演出已改期（朋友送的票）",
    "subject": "{{ticket.event.name}} 改期至 {{ticket.event.doors_at.date}}",
    "preheader": "你的票在新日期仍然有效",
    "heading": "{{ticket.event.name}} 改期了",
    "paras": [
      "{{ticket.event.name}} 改在 {{ticket.event.doors_at.date}}，{{ticket.event.doors_at.time}} 入場。你的票在新日期仍然有效。",
      "這張票是 {{ticket.order.buyer_name}} 送你的，如有退款會退給對方。"
    ],
    "button": "查看我的票",
    "foot": "你持有這場演出的票。"
  },
  "cancelled-paid": {
    "name": "你的演出已取消（已付款）",
    "subject": "{{order.event.doors_at.date}} 的 {{order.event.name}} 已取消",
    "preheader": "你的款項會退還給你",
    "heading": "{{order.event.name}} 已取消",
    "paras": [
      "很抱歉，{{order.event.doors_at.date}} 的 {{order.event.name}} 已取消。",
      "你已支付 {{order.paid_in}}。我們會在 {{practice.refund_payback_text}} 以你原本的付款方式退還。"
    ],
    "button": "查看我的訂單",
    "foot": "你持有這場演出的票 · 訂單 {{order.number}}。"
  },
  "cancelled-unpaid": {
    "name": "你的演出已取消（未付款）",
    "subject": "{{order.event.doors_at.date}} 的 {{order.event.name}} 已取消",
    "preheader": "不需付任何款項",
    "heading": "{{order.event.name}} 已取消",
    "paras": [
      "很抱歉，{{order.event.doors_at.date}} 的 {{order.event.name}} 已取消。",
      "你尚未付款，所以沒有需要退還的款項。"
    ],
    "button": "查看我的訂單",
    "foot": "你持有這場演出的票 · 訂單 {{order.number}}。"
  },
  "cancelled-holder": {
    "name": "你的演出已取消（朋友送的票）",
    "subject": "{{ticket.event.doors_at.date}} 的 {{ticket.event.name}} 已取消",
    "preheader": "你的票不會用到了",
    "heading": "{{ticket.event.name}} 已取消",
    "paras": [
      "很抱歉，{{ticket.event.doors_at.date}} 的 {{ticket.event.name}} 已取消。",
      "這張票是 {{ticket.order.buyer_name}} 送你的，如有退款會退給對方。"
    ],
    "foot": "你持有這場演出的票。"
  },
  "tonight": {
    "name": "今晚見",
    "subject": "今晚：{{order.event.name}}，{{order.event.doors_at.time}} 入場",
    "preheader": "{{order.event.doors_at.time}} 入場 · {{order.room.name}}",
    "heading": "今晚見",
    "paras": [
      "{{order.event.doors_at.time}} 入場 · {{order.event.curfew_at.time}} 散場 · {{order.room.name}}。尚未付清的款項可在現場以刷卡或現金支付。"
    ],
    "button": "出示我的票",
    "foot": "你持有這場演出的票 · 訂單 {{order.number}}。"
  },
  "tomorrow": {
    "name": "明天見",
    "subject": "明天：{{order.event.name}}，{{order.event.doors_at.time}} 入場",
    "preheader": "{{order.event.doors_at.time}} 入場 · {{order.room.name}}",
    "heading": "明天見",
    "paras": [
      "{{order.event.doors_at.time}} 入場 · {{order.room.name}}。尚未付清的款項可在現場以刷卡或現金支付。"
    ],
    "button": "出示我的票",
    "foot": "你持有這場演出的票 · 訂單 {{order.number}}。"
  },
  "tonight-holder": {
    "name": "今晚見（朋友送的票）",
    "subject": "今晚：{{ticket.event.name}}，{{ticket.event.doors_at.time}} 入場",
    "preheader": "{{ticket.event.doors_at.time}} 入場",
    "heading": "今晚見",
    "paras": [
      "{{ticket.event.doors_at.time}} 入場。入場時請出示你的票券代碼。",
      "這張票是 {{ticket.order.buyer_name}} 送你的，如有退款會退給對方。"
    ],
    "button": "查看我的票",
    "foot": "你持有這場演出的票。"
  },
  "tomorrow-holder": {
    "name": "明天見（朋友送的票）",
    "subject": "明天：{{ticket.event.name}}，{{ticket.event.doors_at.time}} 入場",
    "preheader": "{{ticket.event.doors_at.time}} 入場",
    "heading": "明天見",
    "paras": [
      "{{ticket.event.doors_at.time}} 入場。入場時請出示你的票券代碼。",
      "這張票是 {{ticket.order.buyer_name}} 送你的，如有退款會退給對方。"
    ],
    "button": "查看我的票",
    "foot": "你持有這場演出的票。"
  },
  "refund-recorded": {
    "name": "退款已登記",
    "subject": "你的 {{order.event.name}} 退款 · {{order.number}}",
    "preheader": "將退還你 {{order.refunded}}",
    "heading": "退款已登記",
    "paras": [
      "我們已登記訂單 {{order.number}} 退還你 {{order.refunded}}。款項會在 {{practice.refund_payback_text}} 退到你手上。"
    ],
    "button": "查看我的訂單",
    "foot": "訂單 {{order.number}} · {{order.event.name}}。"
  },
  "tickets-cancelled": {
    "name": "票券已取消",
    "subject": "你的 {{order.event.name}} 訂單中有票券已取消 · {{order.number}}",
    "preheader": "訂單 {{order.number}}",
    "heading": "票券已取消",
    "paras": [
      "訂單 {{order.number}} 中的票券已取消。訂單頁面會顯示剩下的票，以及將退還給你的款項。"
    ],
    "button": "查看我的訂單",
    "foot": "訂單 {{order.number}} · {{order.event.name}}。"
  },
  "refund-declined": {
    "name": "退款申請未通過",
    "subject": "你的 {{ticket.event.name}} 退款申請",
    "preheader": "你的票仍然有效",
    "heading": "這張票無法退款",
    "paras": [
      "我們看過你的申請，這張票無法退款。票券仍然有效，演出見！有任何問題，請寫信到 {{practice.contact_email}}。"
    ],
    "button": "查看我的訂單",
    "foot": "你持有這場演出的票。"
  },
  "broadcast": {
    "name": "演出相關訊息",
    "subject": "{{broadcast.subject}}",
    "preheader": "關於你的 {{order.event.name}} 票券",
    "heading": "關於 {{order.event.name}}",
    "paras": [
      "{{broadcast.body}}"
    ],
    "button": "查看我的訂單",
    "foot": "你持有這場演出的票 · 訂單 {{order.number}}。"
  }
};
