/** Focus an element by its id once the screen has drawn it (nothing happens where there is no page). */
export function focusLater(id: string, ms = 40): void {
  if (typeof document === "undefined") return;
  setTimeout(() => document.getElementById(id)?.focus(), ms);
}
