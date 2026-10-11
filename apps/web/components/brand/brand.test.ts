import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The brand look (owner, 2026-10-11): every gradient runs fire, then gold, then white, left to right, the same order
// as the logo's name. A reversed gradient was found on the live site, so the order is pinned here.
const css = readFileSync(join(__dirname, "../../app/globals.css"), "utf8");

describe("brand gradient", () => {
  const rule = /@utility text-gradient-gold \{[^}]*background-image:\s*linear-gradient\(([^;]*)\);/.exec(css);

  it("is defined once, as a single gradient", () => {
    expect(rule, "text-gradient-gold must define a linear-gradient").not.toBeNull();
    expect(css.match(/@utility text-gradient-gold/g)).toHaveLength(1);
  });

  it("runs from the fire red to gold to white", () => {
    const stops = rule![1];
    const ember = stops.indexOf("var(--ember)");
    const gold = stops.indexOf("var(--primary)");
    const white = stops.indexOf("oklch(0.97");
    expect(ember).toBeGreaterThanOrEqual(0);
    expect(gold).toBeGreaterThan(ember);
    expect(white).toBeGreaterThan(gold);
  });

  it("uses the header with the logo above the menu, not the old small icon and a second name", () => {
    const header = readFileSync(join(__dirname, "../shell/app-header.tsx"), "utf8");
    expect(header).toContain("BrandWordmark");
    const wordmark = readFileSync(join(__dirname, "brand-wordmark.tsx"), "utf8");
    expect(wordmark).toContain("signal-one-sound-logo.png");
    expect(wordmark).not.toContain("sos-icon");
  });
});
