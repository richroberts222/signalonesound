import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

// shadcn/ui conformance ratchet (audit F-UX-001, docs/ui.md section 3).
// Every button, input, select, textarea, label and table must come from components/ui.
// The files below still hand-build some controls (issue #91). Their allowance may only
// shrink: a new raw control anywhere fails, and converting one fails until the number
// here is lowered. When this map is empty the rule is fully enforced.
const REMAINING_RAW_CONTROLS: Record<string, number> = {
  "components/admin/event-browser.tsx": 1,
  "components/admin/import-wizard.tsx": 5,
  "components/admin/mock-edit-form.tsx": 1,
  "components/admin/org-browser.tsx": 1,
  "components/admin/submission-queue.tsx": 3,
  "components/church/event-editor.tsx": 2,
  "components/church/manage-actions.tsx": 2,
  "components/discover/discover-filters.tsx": 1,
  "components/member/notification-preferences.tsx": 1,
};

const ROOT = join(__dirname, "..", "..");
const RAW = /<(button|input|select|textarea|label|table)\b/g;

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? tsxFiles(full) : full.endsWith(".tsx") ? [full] : [];
  });
}

function rawCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const top of ["app", "components"]) {
    for (const file of tsxFiles(join(ROOT, top))) {
      const rel = relative(ROOT, file).split(sep).join("/");
      if (rel.startsWith("components/ui/")) continue;
      // The demo slice is deleted from generated applications, so it cannot be listed here (issue #91 covers it).
      if (rel.startsWith("components/proof/")) continue;
      const n = (readFileSync(file, "utf8").match(RAW) ?? []).length;
      if (n > 0) counts[rel] = n;
    }
  }
  return counts;
}

describe("shadcn/ui conformance", () => {
  it("adds no raw controls outside components/ui and never exceeds the allowance", () => {
    const actual = rawCounts();
    const over = Object.entries(actual).filter(([f, n]) => n > (REMAINING_RAW_CONTROLS[f] ?? 0));
    expect(over, "use a component from components/ui instead of a raw element").toEqual([]);
  });

  it("keeps the allowance tight so it only shrinks", () => {
    const actual = rawCounts();
    const stale = Object.entries(REMAINING_RAW_CONTROLS).filter(([f, n]) => (actual[f] ?? 0) < n);
    expect(stale, "lower or remove these entries in REMAINING_RAW_CONTROLS").toEqual([]);
  });
});
