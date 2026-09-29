/**
 * The venue's emails, one template per outbox kind, in the languages the app
 * ships.
 *
 * Each email's words are a small record of sentences (`Words`), and the layout
 * that holds them is written once below, so a translation is only the words —
 * nobody re-builds a block list per language, and no language can lose a block
 * the others have. They are written without counts: Adminium's templates have
 * no plural forms, so "your tickets" reads right for one and for six.
 *
 * `{{…}}` are the outbox's variables, filled by Adminium when it sends:
 * `order.*`, `ticket.*`, `reminder.*`, `refund.*` through the message's link
 * (and one link on from there, `order.event.*`); `practice.*` the venue's
 * settings row; `recipient.name` the person; `appName` the venue's name;
 * `manage_url` the audience site's order page and `booking_url` its front
 * page. A time reads in the person's language and on the venue's clock; money
 * in the connection's currency.
 *
 * A code is sent only to the person it opens a page for: the order's link to
 * its buyer, the confirm link only in "Confirm your order", a ticket's own
 * link only to the friend it is sent to or held by.
 */
import { EMAIL_AR, EMAIL_CS, EMAIL_DA, EMAIL_DE, EMAIL_FR, EMAIL_ZH_CN, EMAIL_ZH_TW } from "./email-words.ts";
import type { Tag } from "./labels.ts";
import type { Kind } from "./outbox.ts";

/** One email's sentences. */
export interface Words {
  name: string;
  subject: string;
  preheader: string;
  heading: string;
  paras: string[];
  button?: string;
  foot: string;
}

export type EmailWords = Record<Kind, Words> & {
  order: string;
  address: string;
  bankTitle: string;
  bankName: string;
  bankBank: string;
  bankNumber: string;
  bankRouting: string;
  bankReference: string;
  /** Said only when the email carries the receipt (Invoices & Receipts draws it). */
  receiptAttached: string;
};

const KEEP = "Order {{order.number}}. The button opens your order — keep this email.";
const HAVE = "You have tickets for this show · order {{order.number}}.";
const HOLDER = "{{ticket.order.buyer_name}} sent you this ticket. Any money back goes to them.";

export const EMAIL_EN: EmailWords = {
  order: "Order",
  address: "{{appName}} · {{practice.address}} · {{practice.contact_email}}",
  bankTitle: "Pay by bank transfer",
  bankName: "Account name",
  bankBank: "Bank",
  bankNumber: "Account number",
  bankRouting: "Sort code or routing number",
  bankReference: "Reference",
  receiptAttached: "Your receipt is attached.",
  tickets: {
    name: "Your tickets",
    subject: "Your tickets for {{order.event.name}} · {{order.number}}",
    preheader: "{{order.event.doors_at.date}} · doors {{order.event.doors_at.time}}",
    heading: "You're going to {{order.event.name}}",
    paras: [
      "{{order.event.doors_at.date}} · Doors {{order.event.doors_at.time}} · on stage {{order.event.starts_at.time}} · {{order.room.name}}. {{order.event.age_note}}",
      "Show each ticket's code at the door. Anything owed is paid there, by card or cash.",
    ],
    button: "See my order",
    foot: KEEP,
  },
  "tickets-paid": {
    name: "Your tickets (paid at the box office)",
    subject: "Your tickets for {{order.event.name}} · {{order.number}}",
    preheader: "Paid · {{order.total}}",
    heading: "You're going to {{order.event.name}}",
    paras: [
      "{{order.event.doors_at.date}} · Doors {{order.event.doors_at.time}} · on stage {{order.event.starts_at.time}} · {{order.room.name}}. {{order.event.age_note}}",
      "Paid in full: {{order.total}}. Show each ticket's code at the door.",
    ],
    button: "See my order",
    foot: KEEP,
  },
  "transfer-confirm": {
    name: "Confirm your order",
    subject: "Confirm your order for {{order.event.name}} · {{order.number}}",
    preheader: "Confirm by {{order.held_until.time}} to keep your tickets",
    heading: "Confirm your order",
    paras: [
      "You chose to pay for your {{order.event.name}} tickets by bank transfer. Press the button by {{order.held_until.time}} to confirm the order, and we will send the bank details.",
      "Until then your tickets are held for you.",
    ],
    button: "Confirm my order",
    foot: "You're getting this because this address was used to order tickets at {{appName}}. Didn't order? Ignore it.",
  },
  "transfer-waiting": {
    name: "Waiting for your transfer",
    subject: "Pay by {{order.pay_by.date}} to keep your {{order.event.name}} tickets · {{order.number}}",
    preheader: "{{order.total}} by {{order.pay_by.date}}, {{order.pay_by.time}}",
    heading: "One step left: the bank transfer",
    paras: [
      "Send {{order.total}} by {{order.pay_by.date}}, {{order.pay_by.time}}, with the reference {{order.number}}. Your tickets arrive by email once it is in.",
      "Unpaid tickets go back on sale {{practice.release_after_hours}} hours after that.",
    ],
    button: "See my order",
    foot: KEEP,
  },
  "transfer-reminder": {
    name: "Reminder: your transfer",
    subject: "Reminder: your transfer for {{order.event.name}} · {{order.number}}",
    preheader: "{{order.total}} was due {{order.pay_by.date}}",
    heading: "Your transfer hasn't arrived yet",
    paras: [
      "We haven't received {{order.total}} for order {{order.number}}. It was due {{order.pay_by.date}}, {{order.pay_by.time}}.",
      "Unpaid tickets go back on sale soon. If you have already sent it, you don't need to do anything.",
    ],
    button: "See my order",
    foot: KEEP,
  },
  "transfer-released": {
    name: "Your tickets went back on sale",
    subject: "Your {{order.event.name}} tickets went back on sale · {{order.number}}",
    preheader: "The transfer didn't arrive in time",
    heading: "Your tickets went back on sale",
    paras: ["The transfer for order {{order.number}} didn't arrive in time, so its tickets went back on sale. If you sent it after all, write to {{practice.contact_email}}."],
    button: "See what's on",
    foot: "Order {{order.number}}.",
  },
  "payment-received": {
    name: "Payment received",
    subject: "Payment received · {{order.event.name}} · {{order.number}}",
    preheader: "{{order.paid_in}} received · your tickets",
    heading: "Payment received",
    paras: [
      "Thank you — we received {{order.paid_in}} for order {{order.number}}. Here are your tickets.",
      "{{order.event.doors_at.date}} · Doors {{order.event.doors_at.time}} · {{order.room.name}}.",
    ],
    button: "See my order",
    foot: KEEP,
  },
  "friend-offer": {
    name: "A ticket from a friend",
    subject: "{{ticket.order.buyer_name}} sent you a ticket for {{ticket.event.name}}",
    preheader: "Accept it by {{ticket.offer_until.date}}, {{ticket.offer_until.time}}",
    heading: "{{ticket.order.buyer_name}} sent you a ticket for {{ticket.event.name}}",
    paras: [
      "{{ticket.name}} · {{ticket.event.doors_at.date}} · doors {{ticket.event.doors_at.time}}.",
      "Accept it by {{ticket.offer_until.date}}, {{ticket.offer_until.time}} and it becomes yours, with its own code. Accept it before doors, or ask {{ticket.order.buyer_name}} for the ticket at the door.",
    ],
    button: "Accept ticket",
    foot: "{{ticket.order.buyer_name}} sent this from their {{appName}} order. Ignore it and the ticket stays with them.",
  },
  "friend-ready": {
    name: "Your ticket is ready",
    subject: "Your ticket for {{ticket.event.name}}",
    preheader: "{{ticket.event.doors_at.date}} · doors {{ticket.event.doors_at.time}}",
    heading: "Your ticket is ready",
    paras: [
      "{{ticket.holder_name}} · {{ticket.name}} · {{ticket.code.grouped}}",
      "{{ticket.event.doors_at.date}} · Doors {{ticket.event.doors_at.time}}. Show this code at the door.",
    ],
    button: "See my ticket",
    foot: "Accepted from {{ticket.order.buyer_name}}. The button opens your ticket — keep this email.",
  },
  "friend-returned": {
    name: "Your ticket came back",
    subject: "Your {{ticket.event.name}} ticket came back",
    preheader: "It wasn't accepted in time",
    heading: "Your ticket came back",
    paras: ["The ticket you sent to {{ticket.pending_name}} wasn't accepted in time, so it is yours again. Its code still works."],
    button: "See my order",
    foot: "You sent this ticket from your {{appName}} order.",
  },
  "holder-set": {
    name: "A ticket in your name",
    subject: "A ticket for {{ticket.event.name}} in your name",
    preheader: "{{ticket.event.doors_at.date}} · doors {{ticket.event.doors_at.time}}",
    heading: "A ticket for {{ticket.event.name}} is yours",
    paras: ["The box office put this ticket in your name: {{ticket.name}} · {{ticket.code.grouped}}. Show the code at the door."],
    button: "See my ticket",
    foot: "The button opens your ticket — keep this email.",
  },
  "waitlist-offer": {
    name: "Tickets are back",
    subject: "Tickets for {{order.event.name}} are yours if you want them",
    preheader: "Claim them by {{order.offer_until.date}}, {{order.offer_until.time}}",
    heading: "Tickets came back for {{order.event.name}}",
    paras: [
      "You're next on the waitlist. Claim them by {{order.offer_until.date}}, {{order.offer_until.time}} — after that they go to the next person.",
      "You may take fewer than we offer.",
    ],
    button: "Claim my tickets",
    foot: "You joined the waitlist for this show.",
  },
  "on-sale": {
    name: "On sale soon",
    subject: "{{reminder.event.name}} goes on sale at {{reminder.on_sale_at.time}}",
    preheader: "{{reminder.on_sale_at.date}}, {{reminder.on_sale_at.time}}",
    heading: "{{reminder.event.name}} goes on sale at {{reminder.on_sale_at.time}}",
    paras: ["Tickets go on sale {{reminder.on_sale_at.date}} at {{reminder.on_sale_at.time}}."],
    button: "Get tickets",
    foot: "You asked us to remind you once, before tickets go on sale.",
  },
  moved: {
    name: "Your show has moved",
    subject: "{{order.event.name}} has moved to {{order.event.doors_at.date}}",
    preheader: "Your tickets work on the new date",
    heading: "{{order.event.name}} has moved",
    paras: [
      "{{order.event.name}} is now on {{order.event.doors_at.date}}, doors {{order.event.doors_at.time}}. Your tickets work on the new date.",
      "If you can't make it, cancel your tickets from your order's page.",
    ],
    button: "Keep or refund my tickets",
    foot: HAVE,
  },
  "moved-holder": {
    name: "Your show has moved (a friend's ticket)",
    subject: "{{ticket.event.name}} has moved to {{ticket.event.doors_at.date}}",
    preheader: "Your ticket works on the new date",
    heading: "{{ticket.event.name}} has moved",
    paras: ["{{ticket.event.name}} is now on {{ticket.event.doors_at.date}}, doors {{ticket.event.doors_at.time}}. Your ticket works on the new date.", HOLDER],
    button: "See my ticket",
    foot: "You hold a ticket for this show.",
  },
  "cancelled-paid": {
    name: "Your show is cancelled (paid)",
    subject: "{{order.event.name}} on {{order.event.doors_at.date}} is cancelled",
    preheader: "Your money comes back",
    heading: "{{order.event.name}} is cancelled",
    paras: [
      "We're sorry — {{order.event.name}} on {{order.event.doors_at.date}} is cancelled.",
      "You paid {{order.paid_in}}. We will give it back {{practice.refund_payback_text}}, the way you paid.",
    ],
    button: "See my order",
    foot: HAVE,
  },
  "cancelled-unpaid": {
    name: "Your show is cancelled (nothing paid)",
    subject: "{{order.event.name}} on {{order.event.doors_at.date}} is cancelled",
    preheader: "Nothing to pay",
    heading: "{{order.event.name}} is cancelled",
    paras: ["We're sorry — {{order.event.name}} on {{order.event.doors_at.date}} is cancelled.", "You paid nothing, so there's nothing to give back."],
    button: "See my order",
    foot: HAVE,
  },
  "cancelled-holder": {
    name: "Your show is cancelled (a friend's ticket)",
    subject: "{{ticket.event.name}} on {{ticket.event.doors_at.date}} is cancelled",
    preheader: "Your ticket won't be needed",
    heading: "{{ticket.event.name}} is cancelled",
    paras: ["We're sorry — {{ticket.event.name}} on {{ticket.event.doors_at.date}} is cancelled.", HOLDER],
    foot: "You hold a ticket for this show.",
  },
  tonight: {
    name: "See you tonight",
    subject: "Tonight: {{order.event.name}}, doors {{order.event.doors_at.time}}",
    preheader: "Doors {{order.event.doors_at.time}} · {{order.room.name}}",
    heading: "See you tonight",
    paras: ["Doors {{order.event.doors_at.time}} · curfew {{order.event.curfew_at.time}} · {{order.room.name}}. Anything owed is paid at the door, by card or cash."],
    button: "Show my tickets",
    foot: HAVE,
  },
  tomorrow: {
    name: "See you tomorrow",
    subject: "Tomorrow: {{order.event.name}}, doors {{order.event.doors_at.time}}",
    preheader: "Doors {{order.event.doors_at.time}} · {{order.room.name}}",
    heading: "See you tomorrow",
    paras: ["Doors {{order.event.doors_at.time}} · {{order.room.name}}. Anything owed is paid at the door, by card or cash."],
    button: "Show my tickets",
    foot: HAVE,
  },
  "tonight-holder": {
    name: "See you tonight (a friend's ticket)",
    subject: "Tonight: {{ticket.event.name}}, doors {{ticket.event.doors_at.time}}",
    preheader: "Doors {{ticket.event.doors_at.time}}",
    heading: "See you tonight",
    paras: ["Doors {{ticket.event.doors_at.time}}. Show your ticket's code at the door.", HOLDER],
    button: "See my ticket",
    foot: "You hold a ticket for this show.",
  },
  "tomorrow-holder": {
    name: "See you tomorrow (a friend's ticket)",
    subject: "Tomorrow: {{ticket.event.name}}, doors {{ticket.event.doors_at.time}}",
    preheader: "Doors {{ticket.event.doors_at.time}}",
    heading: "See you tomorrow",
    paras: ["Doors {{ticket.event.doors_at.time}}. Show your ticket's code at the door.", HOLDER],
    button: "See my ticket",
    foot: "You hold a ticket for this show.",
  },
  "refund-recorded": {
    name: "Refund recorded",
    subject: "Your refund for {{order.event.name}} · {{order.number}}",
    preheader: "{{order.refunded}} back to you",
    heading: "Refund recorded",
    paras: ["We've recorded {{order.refunded}} back to you for order {{order.number}}. It reaches you {{practice.refund_payback_text}}."],
    button: "See my order",
    foot: "Order {{order.number}} · {{order.event.name}}.",
  },
  "tickets-cancelled": {
    name: "Tickets cancelled",
    subject: "Tickets on your {{order.event.name}} order are cancelled · {{order.number}}",
    preheader: "Order {{order.number}}",
    heading: "Ticket cancelled",
    paras: ["Tickets on order {{order.number}} are cancelled. Its page shows what is left, and any money to come back."],
    button: "See my order",
    foot: "Order {{order.number}} · {{order.event.name}}.",
  },
  "refund-declined": {
    name: "Refund request declined",
    subject: "Your refund request for {{ticket.event.name}}",
    preheader: "Your ticket still works",
    heading: "We can't refund this ticket",
    paras: ["We looked at your request and can't refund this ticket. It still works — see you at the show. Questions? Write to {{practice.contact_email}}."],
    button: "See my order",
    foot: "You have a ticket for this show.",
  },
  broadcast: {
    name: "A message about your show",
    // The box office's own words, as written on the message.
    subject: "{{broadcast.subject}}",
    preheader: "About your tickets for {{order.event.name}}",
    heading: "About {{order.event.name}}",
    paras: ["{{broadcast.body}}"],
    button: "See my order",
    foot: HAVE,
  },
};

type Block = { block: string; id: string; data: Record<string, unknown> };

/** An order's live tickets, each with its holder, type, code and QR, and what is owed on it. */
const TICKET_ROWS: Block = {
  block: "email.rows",
  id: "tickets",
  data: {
    from: { link: "order", table: "tickets", via: "order_id", orderBy: "position", where: { column: "status", in: ["valid", "offered", "refund_asked"] }, limit: 12 },
    row: { title: "{{row.holder_name}}", meta: "{{row.name}} · {{row.code.grouped}}", image: "{{row.code.qr}}" },
  },
};

/** The emails that carry the order's tickets. */
const WITH_TICKETS: ReadonlySet<Kind> = new Set(["tickets", "tickets-paid", "payment-received", "tonight", "tomorrow"]);
/** The emails that carry the receipt, when an add-on draws one: without it they go as they are, minus the line saying so. */
const WITH_RECEIPT: ReadonlySet<Kind> = new Set(["payment-received"]);
/** The receipt each of those carries. */
const RECEIPT = { kind: "receipt", link: "order", optional: true };
/** The emails that carry the venue's bank details. */
const WITH_BANK: ReadonlySet<Kind> = new Set(["transfer-waiting", "transfer-reminder"]);
/** Where each email's button leads. */
const BUTTON_URL: Partial<Record<Kind, string>> = {
  "transfer-confirm": "{{booking_url}}confirm#{{order.confirm_token}}",
  "friend-offer": "{{booking_url}}t#{{ticket.link_token}}",
  "friend-ready": "{{booking_url}}t#{{ticket.link_token}}",
  "holder-set": "{{booking_url}}t#{{ticket.link_token}}",
  "moved-holder": "{{booking_url}}t#{{ticket.link_token}}",
  "tonight-holder": "{{booking_url}}t#{{ticket.link_token}}",
  "tomorrow-holder": "{{booking_url}}t#{{ticket.link_token}}",
  "friend-returned": "{{manage_url}}#{{ticket.order.link_token}}",
  "refund-declined": "{{manage_url}}#{{ticket.order.link_token}}",
  "transfer-released": "{{booking_url}}",
  "on-sale": "{{booking_url}}",
};

function layout(kind: Kind, all: EmailWords) {
  const w = all[kind];
  const blocks: Block[] = [{ block: "email.heading", id: "heading", data: { text: w.heading } }];
  blocks.push({ block: "email.text", id: "body", data: { paras: w.paras } });
  if (WITH_TICKETS.has(kind)) blocks.push(TICKET_ROWS);
  if (WITH_RECEIPT.has(kind)) blocks.push({ block: "email.text", id: "receipt", data: { paras: [all.receiptAttached], withAttachment: true } });
  if (WITH_BANK.has(kind)) {
    blocks.push({
      block: "email.stats",
      id: "bank",
      data: {
        items: [
          { label: all.bankName, value: "{{practice.bank_account_name}}" },
          { label: all.bankBank, value: "{{practice.bank_name}}" },
          { label: all.bankNumber, value: "{{practice.bank_account_number}}" },
          { label: all.bankRouting, value: "{{practice.bank_routing}}" },
          { label: all.bankReference, value: "{{order.number}}" },
        ],
      },
    });
  }
  if (w.button !== undefined) {
    blocks.push({ block: "email.button", id: "open", data: { label: w.button, url: BUTTON_URL[kind] ?? "{{manage_url}}#{{order.link_token}}" } });
  }
  return { subject: w.subject, preheader: w.preheader, blocks, footer: `${w.foot} ${all.address}` };
}

/** Every language's words: English here, the other seven (drafts until reviewed) in `email-words.ts`. */
export function emailWords(): Record<Tag, EmailWords> {
  return {
    "en-US": EMAIL_EN,
    "de-DE": EMAIL_DE,
    "fr-FR": EMAIL_FR,
    "da-DK": EMAIL_DA,
    "cs-CZ": EMAIL_CS,
    "ar-EG": EMAIL_AR,
    "zh-CN": EMAIL_ZH_CN,
    "zh-TW": EMAIL_ZH_TW,
  };
}

/** The variables each template reads, for the template editor's list. */
function varsOf(kind: Kind): string[] {
  const text = JSON.stringify(layout(kind, EMAIL_EN));
  const found = new Set<string>();
  for (const [, name] of text.matchAll(/\{\{([A-Za-z_.]+)\}\}/g)) found.add(name!);
  return [...found].filter((name) => /^[a-z_]+(\.[a-z_]+)*$/.test(name) && !name.startsWith("row.")).sort();
}

/** The manifest's `emailTemplates`: one per kind, in every language the words are in. */
export function emailTemplates(kinds: readonly Kind[]): unknown[] {
  const words = emailWords();
  return kinds.map((kind) => ({
    key: `events-${kind}`,
    name: Object.fromEntries(Object.entries(words).map(([tag, w]) => [tag, w[kind].name])),
    vars: varsOf(kind),
    ...(WITH_RECEIPT.has(kind) ? { attach: RECEIPT } : {}),
    locales: Object.fromEntries(Object.entries(words).map(([tag, w]) => [tag, layout(kind, w)])),
  }));
}
