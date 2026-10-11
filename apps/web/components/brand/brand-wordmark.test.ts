import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The owner (2026-10-11) asked for the small SOS icon to come off the header (it repeats the name beside it), for the
// full logo to be the one brand mark, centered above the menu on every page, and for the small icon file to be kept so
// it can be used somewhere else later. These tests pin each part of that request.
describe("brand wordmark", () => {
  it("draws the full logo and not the small SOS icon", () => {
    const source = readFileSync(join(__dirname, "brand-wordmark.tsx"), "utf8");
    expect(source).toContain("signal-one-sound-logo.png");
    expect(source).not.toContain("sos-icon");
  });

  it("keeps the icon file in the project for later use", () => {
    expect(existsSync(join(__dirname, "../../public/brand/sos-icon.svg"))).toBe(true);
  });

  it("is centered above the menu in the header, on every page", () => {
    const header = readFileSync(join(__dirname, "../shell/app-header.tsx"), "utf8");
    expect(header).toContain("BrandWordmark");
    expect(header).toMatch(/justify-center/);
  });
});
