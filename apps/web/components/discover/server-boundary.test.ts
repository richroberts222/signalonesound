import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Regression guard: a component that attaches event handlers (onClick, onMouseEnter, ...)
// must be a Client Component. Rendered from a Server Component page without "use client",
// it typechecks and builds but throws when the page is requested.
describe("components/discover server/client boundary", () => {
  it("files with event handlers declare use client", () => {
    const files = readdirSync(__dirname).filter((f) => f.endsWith(".tsx"));
    const offenders = files.filter((f) => {
      const src = readFileSync(join(__dirname, f), "utf8");
      return /\son[A-Z][A-Za-z]*=\{/.test(src) && !/^\s*["']use client["']/.test(src);
    });
    expect(offenders).toEqual([]);
  });
});
