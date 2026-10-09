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
    // Only the section 3 table counts: a mention in the operating rules or elsewhere is not the map.
    const start = claude.indexOf("# 3. Documentation-First Development");
    const end = claude.indexOf("# 4.", start);
    const table = start >= 0 && end > start ? claude.slice(start, end) : "";
    expect(table.length, "CLAUDE.md section 3 (the document table) must exist").toBeGreaterThan(200);
    // A document counts as linked only when its file name appears as a code span (`name.md`) in that table.
    const linked = (name: string) => table.includes("`" + name + "`");
    const product = existsSync(join(docs, "product"))
      ? readdirSync(join(docs, "product"))
          .filter((f) => f.endsWith(".md") && f !== "source-product-plan.md") // the preserved source is not a rule document
          .map((f) => `product/${f}`)
      : [];
    const features = existsSync(join(docs, "features")) ? ["features/"] : [];
    const missing = [...top, ...automation, ...product, ...features].filter((f) => !linked(f));
    expect(missing, "add these documents to the table in CLAUDE.md section 3").toEqual([]);
  });
});

describe("GitHub templates carry the process rules", () => {
  const gh = join(repo, ".github");
  const read = (f: string) => readFileSync(join(gh, f), "utf8");

  it("the pull request template carries the definition of done and the breaker", () => {
    const text = read("pull_request_template.md").toLowerCase();
    for (const phrase of ["scope fence", "acceptance criterion", "breaker", "pnpm validate"]) {
      expect(text, `pull_request_template.md must mention "${phrase}"`).toContain(phrase);
    }
  });

  it("the issue forms for bugs, blockers and features exist", () => {
    for (const f of ["bug_report.yml", "blocker.yml", "feature_request.yml"]) {
      expect(existsSync(join(gh, "ISSUE_TEMPLATE", f)), `${f} is missing`).toBe(true);
    }
  });
});
