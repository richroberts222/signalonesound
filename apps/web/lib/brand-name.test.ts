import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

// User-facing text must say "Signal One Sound", never the short "Signal One" (docs/naming-conventions.md).
// The technical identifiers (`signalone`, `@signalone/*`, the Expo slug and scheme, bundle ids) are
// lowercase on purpose and are not touched by this rule. Comments are not user-facing and are ignored.
const ROOT = join(__dirname, "..", "..", "..");
const SCANNED = ["apps/web/app", "apps/web/components", "apps/web/lib", "apps/mobile/src", "apps/mobile/app.config.ts"];
const SHORT_NAME = /Signal One(?! Sound)/g;
// The wordmark renders "Sound" in a styled span: "Signal One <span ...>Sound</span>".
const WORDMARK = /Signal One <span[^>]*>Sound<\/span>/g;

function files(path: string): string[] {
  if (statSync(path).isFile()) return [path];
  return readdirSync(path).flatMap((name) => files(join(path, name)));
}

export function shortNameUses(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1").replace(WORDMARK, "");
  return code.match(SHORT_NAME) ?? [];
}

describe("the user-facing product name", () => {
  it('is always "Signal One Sound" in the apps', () => {
    const offenders = SCANNED.flatMap((dir) => files(join(ROOT, dir)))
      .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.(ts|tsx)$/.test(f))
      .filter((f) => shortNameUses(readFileSync(f, "utf8")).length > 0)
      .map((f) => relative(ROOT, f).split(sep).join("/"));
    expect(offenders).toEqual([]);
  });

  it("the check finds the short name but not the full name, the wordmark or a comment (self-test)", () => {
    expect(shortNameUses('const name = "Signal One";')).toHaveLength(1);
    expect(shortNameUses("<p>Signal One user</p>")).toHaveLength(1);
    expect(shortNameUses('const name = "Signal One Sound";')).toHaveLength(0);
    expect(shortNameUses('<span>Signal One <span className="x">Sound</span></span>')).toHaveLength(0);
    expect(shortNameUses("// Signal One roles are not defined here\nconst a = 1;")).toHaveLength(0);
  });
});
