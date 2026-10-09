import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

// Design-token conformance ratchet (docs/ui.md section 24).
// Components use semantic tokens (bg-primary, text-muted-foreground, border-border), not raw
// palette classes (text-red-600) or arbitrary color values (bg-[#999]). The files below still
// use some. Their allowance may only shrink: a new raw color anywhere fails, and removing one
// fails until the number here is lowered. When this map is empty the rule is fully enforced.
const REMAINING_RAW_COLORS: Record<string, number> = {
  "components/admin/badges.tsx": 4,
  "components/admin/import-wizard.tsx": 2,
  "components/admin/submission-queue.tsx": 2,
};

const ROOT = join(__dirname, "..", "..");
const PALETTE = "red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone";
const UTILITY = "bg|text|border|ring|from|to|via|fill|stroke|shadow|outline|divide|decoration|accent|caret";
const RAW_COLOR = new RegExp(`\\b(?:${UTILITY})-(?:${PALETTE})-\\d{2,3}\\b|\\[#[0-9a-fA-F]{3,8}\\]`, "g");

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? tsxFiles(full) : full.endsWith(".tsx") ? [full] : [];
  });
}

function rawColorCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const top of ["app", "components"]) {
    for (const file of tsxFiles(join(ROOT, top))) {
      const rel = relative(ROOT, file).split(sep).join("/");
      // shadcn primitives own their palette; the demo slice is deleted from generated applications.
      if (rel.startsWith("components/ui/") || rel.startsWith("components/proof/")) continue;
      const n = (readFileSync(file, "utf8").match(RAW_COLOR) ?? []).length;
      if (n > 0) counts[rel] = n;
    }
  }
  return counts;
}

describe("semantic design tokens", () => {
  it("adds no raw palette or arbitrary colors outside components/ui and never exceeds the allowance", () => {
    const actual = rawColorCounts();
    const over = Object.entries(actual).filter(([f, n]) => n > (REMAINING_RAW_COLORS[f] ?? 0));
    expect(over, "use a semantic token from app/globals.css instead of a raw color").toEqual([]);
  });

  it("keeps the allowance tight so it only shrinks", () => {
    const actual = rawColorCounts();
    const stale = Object.entries(REMAINING_RAW_COLORS)
      .filter(([f]) => existsSync(join(ROOT, f)))
      .filter(([f, n]) => (actual[f] ?? 0) < n);
    expect(stale, "lower or remove these entries in REMAINING_RAW_COLORS").toEqual([]);
  });
});
