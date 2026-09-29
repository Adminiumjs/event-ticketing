/**
 * The name the operator gave this app, when Adminium says one.
 *
 * The staff and customer configurations (`surface-config.json`) carry it, and
 * the fleet's config readers hand it here as they read it. Nothing else lives
 * here: the venue's own words and formats are `tr.ts` and `app/fmt.ts`.
 */

let activeAppName: string | null = null;

export function setAppName(name: string | null | undefined): void {
  activeAppName = typeof name === "string" && name.trim() !== "" ? name.trim() : null;
}

export const appName = (): string | null => activeAppName;
