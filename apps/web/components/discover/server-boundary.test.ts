import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Regression guard: a component that attaches event handlers (onClick, onMouseEnter, ...)
// must be a Client Component. Rendered from a Server Component page without "use client",
// it typechecks and builds but throws when the page is requested.
// Covers every feature component folder that renders from Server Component pages.
const FEATURE_DIRS = ["discover", "church", "member", "admin"];

describe("feature components server/client boundary", () => {
  it.each(FEATURE_DIRS)("files in components/%s with event handlers declare use client", (dir) => {
    const path = join(__dirname, "..", dir);
    const files = readdirSync(path).filter((f) => f.endsWith(".tsx"));
    const offenders = files.filter((f) => {
      const src = readFileSync(join(path, f), "utf8");
      return /\son[A-Z][A-Za-z]*=\{/.test(src) && !/^\s*["']use client["']/.test(src);
    });
    expect(offenders).toEqual([]);
  });
});
