import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Regression guard: generated UI components once imported `cn` from the unrelated
// npm package "cn" instead of "@/lib/utils". It typechecks and builds, but the
// import fails when a dynamically rendered page uses the component.
describe("components/ui imports", () => {
  it("import cn from @/lib/utils, not the npm package 'cn'", () => {
    const files = readdirSync(__dirname).filter((f) => /\.tsx?$/.test(f) && !f.endsWith(".test.ts"));
    const offenders = files.filter((f) =>
      /from\s+["']cn["']/.test(readFileSync(join(__dirname, f), "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
