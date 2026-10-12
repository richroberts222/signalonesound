import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Signal One Sound's own pages (not part of the template). The owner (2026-10-11) saw white, then fire, then gold on a
// heading where only the last words had the gradient. The gradient must run across the whole heading, so a major
// heading holds one gradient span and nothing outside it.
const MAJOR_HEADINGS = ["page.tsx", "discover/page.tsx", "fire-map/page.tsx", "churches/page.tsx", "events/page.tsx", "../components/legal/legal-page.tsx"];

describe("heading gradient", () => {
  it.each(MAJOR_HEADINGS)("covers the whole heading in %s", (file) => {
    const source = readFileSync(join(__dirname, "../../app", file), "utf8");
    const headings = [...source.matchAll(/<(h1|h2)\b[^>]*>([\s\S]*?)<\/\1>/g)].filter((m) => m[2].includes("text-gradient-gold"));
    expect(headings.length, `${file} should have a gradient heading`).toBeGreaterThan(0);
    for (const [, , inner] of headings) {
      expect(inner.trim()).toMatch(/^<span className="text-gradient-gold">[^<]*<\/span>$/);
    }
  });
});
