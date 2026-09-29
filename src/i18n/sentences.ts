/**
 * Every sentence the screens hand to `tr()` — read from the source, the way a
 * translator's list is made: `tr("…")`, `trx("…")`, `segs("…")` and the
 * `plural(n, "one", "many")` pairs (their key is "one|many"). A call whose
 * sentence is not written out in the call is listed apart, so a sentence
 * built at run time cannot slip past the translations unnoticed.
 *
 * Node only (tests and scripts); the screens never import it.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import ts from "typescript";

const ROOTS = ["src/app", "src/view"];
/** The helpers that pass a caller's sentence on (their callers' literals are the keys). */
const HELPERS = ["src/app/door.ts", "src/view/dom.tsx"];
/** Calls whose first sentence argument is the key. */
const KEYED: Record<string, number> = { tr: 0, trx: 0, segs: 0 };

export interface Sentences {
  keys: Map<string, string[]>;
  /** Calls whose sentence is not a literal (file:line and the call's text). */
  dynamic: string[];
}

function files(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...files(p));
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

const literal = (n: ts.Node | undefined): string | null => (n !== undefined && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : null);

export function sentences(root: string): Sentences {
  const keys = new Map<string, string[]>();
  const dynamic: string[] = [];
  const add = (key: string, where: string) => keys.set(key, [...(keys.get(key) ?? []), where]);
  for (const file of ROOTS.flatMap((r) => files(join(root, r)))) {
    const text = readFileSync(file, "utf8");
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const rel = relative(root, file);
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const name = node.expression.text;
        const where = `${rel}:${String(sf.getLineAndCharacterOfPosition(node.getStart()).line + 1)}`;
        if (name in KEYED) {
          const arg = node.arguments[KEYED[name]!];
          const lit = literal(arg);
          // `tr` itself, inside `plural` (the one template in the screens), is covered by the pairs below.
          if (lit !== null) add(lit, where);
          else if (!HELPERS.includes(rel.replace(/\\/g, "/")) && !(rel.endsWith("app/box.ts") && arg !== undefined && ts.isTemplateExpression(arg))) dynamic.push(`${where} ${node.getText(sf).slice(0, 80)}`);
        } else if (name === "plural" && node.arguments.length >= 3) {
          const one = literal(node.arguments[1]);
          const many = literal(node.arguments[2]);
          if (one !== null && many !== null) add(`${one}|${many}`, where);
          else dynamic.push(`${where} ${node.getText(sf).slice(0, 80)}`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return { keys, dynamic };
}
