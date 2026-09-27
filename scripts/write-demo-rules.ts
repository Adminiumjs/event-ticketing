/**
 * `npm run demo-rules`: write `src/demo/rules.ts` — the rules the demo's
 * Adminium plays, taken from `manifest.json` (the limits, the states, the
 * public entries, the roles' grants and limits, the email producers). The demo carries
 * them as data, not as a copy someone keeps up by hand;
 * `src/demo/rules.test.ts` fails when the file and the manifest disagree.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Json = Record<string, unknown>;

export function demoRulesText(manifest: Json): string {
  const tables = (manifest["requiredSchema"] as { tables: Json[] }).tables;
  const of = (key: string) => Object.fromEntries(tables.filter((t) => t[key] !== undefined).map((t) => [t["ref"], t[key]]));
  const roles = (manifest["roles"] as Json[]).map((r) => ({
    key: r["key"],
    // What the role may do to each table (`read`, `create`, `update`, `delete`, `read_pii`).
    grants: Object.fromEntries(
      Object.entries(
        ((r["permissions"] as string[]) ?? []).reduce<Record<string, string[]>>((out, p) => {
          const m = /^table:@([a-z_]+):([a-z_]+)$/.exec(p);
          if (m !== null) (out[m[1]!] ??= []).push(m[2]!);
          return out;
        }, {}),
      ),
    ),
    limits: r["limits"] ?? null,
  }));
  const outbox = manifest["outbox"] as Json;
  /** Per table, each column's stamp rule, by column. */
  const stamps = Object.fromEntries(
    tables
      .map((t) => [t["ref"], Object.fromEntries((t["columns"] as Json[]).filter((c) => (c["rules"] as Json | undefined)?.["stamp"] !== undefined).map((c) => [c["ref"], (c["rules"] as Json)["stamp"]]))])
      .filter(([, columns]) => Object.keys(columns as Json).length > 0),
  );
  /** Per table, its enum columns' values. */
  const enums = Object.fromEntries(
    tables.map((t) => [t["ref"], Object.fromEntries((t["columns"] as Json[]).filter((c) => c["type"] === "enum").map((c) => [c["ref"], c["enum"]]))]),
  );
  /** Per table, its unique column sets (a column marked unique is a set of one). */
  const uniques = Object.fromEntries(
    tables.map((t) => [
      t["ref"],
      [
        ...(((t["unique"] as string[][] | undefined) ?? []).map((set) => set)),
        ...(t["columns"] as Json[]).filter((c) => c["unique"] === true).map((c) => [c["ref"] as string]),
      ],
    ]).filter(([, sets]) => (sets as string[][]).length > 0),
  );
  /** Per table, each code column's renewal: the column whose change draws a new code. */
  const renewals = Object.fromEntries(
    tables
      .map((t) => [
        t["ref"],
        Object.fromEntries(
          (t["columns"] as Json[])
            .filter((c) => ((c["rules"] as Json | undefined)?.["code"] as Json | undefined)?.["renew"] !== undefined)
            .map((c) => [c["ref"], (((c["rules"] as Json)["code"] as Json)["renew"] as Json)["on"]]),
        ),
      ])
      .filter(([, columns]) => Object.keys(columns as Json).length > 0),
  );
  const body = {
    stamps,
    renewals,
    enums,
    uniques,
    capacity: of("capacity"),
    states: of("states"),
    publicAccess: manifest["publicAccess"],
    roles,
    producers: outbox["producers"],
    kinds: outbox["kinds"],
  };
  return [
    "/**",
    " * The rules the demo's Adminium plays, as `manifest.json` declares them.",
    " * Written by `npm run demo-rules`; do not edit by hand.",
    " */",
    "// prettier-ignore",
    `export const MANIFEST_RULES = ${JSON.stringify(body, null, 2)} as const;`,
    "",
  ].join("\n");
}

const root = join(import.meta.dirname, "..");
if (process.env["VITEST"] === undefined) {
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")) as Json;
  writeFileSync(join(root, "src", "demo", "rules.ts"), demoRulesText(manifest));
  console.info("[demo-rules] wrote src/demo/rules.ts");
}
