import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// CLAUDE.md is the entry point: a short set of rules plus a complete map of /docs.
// This keeps it a map (it must not grow back into a copy of the detail) and keeps
// the map complete (a rule document nobody can find is a rule nobody follows).
const repo = join(__dirname, "..", "..", "..");
const claude = readFileSync(join(repo, "CLAUDE.md"), "utf8");
const MAX_LINES = 200;
// Optional working notes and the one-off audit charter are intentionally not part of the map.
const NOT_IN_MAP = new Set(["notes.md", "fable-audit-charter.md"]);

describe("CLAUDE.md entry point", () => {
  it("stays short: detail belongs in the linked documents", () => {
    expect(claude.split(/\r?\n/).length, `CLAUDE.md must stay at or below ${MAX_LINES} lines; move detail into /docs`).toBeLessThanOrEqual(MAX_LINES);
  });

  it("links every rule document in /docs", () => {
    const docs = join(repo, "docs");
    const top = readdirSync(docs).filter((f) => f.endsWith(".md") && !NOT_IN_MAP.has(f));
    const automation = existsSync(join(docs, "automation"))
      ? readdirSync(join(docs, "automation")).filter((f) => f.endsWith(".md") && f !== "README.md")
      : [];
    const missing = [
      ...top.filter((f) => !claude.includes(f)),
      ...automation.filter((f) => !claude.includes(f.replace(/\.md$/, ""))),
    ];
    expect(missing, "add these documents to the table in CLAUDE.md section 3").toEqual([]);
  });
});
