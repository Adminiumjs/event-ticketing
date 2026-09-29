/**
 * Which email a row of a message to a show's buyers goes as: a moved show's
 * own kind or a message's, and — for a row that names a ticket, a friend
 * holding one — the friend's kind, which opens their ticket rather than the
 * buyer's order. The box office and the demo queue the same kinds.
 */
export function broadcastKind(message: Readonly<Record<string, unknown>>, row: Readonly<Record<string, unknown>>): string {
  const holder = row["ticket_id"] !== undefined && row["ticket_id"] !== null;
  if (message["template"] === "moved") return holder ? "moved-holder" : "moved";
  return holder ? "broadcast-holder" : "broadcast";
}
