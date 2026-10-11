import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The owner (2026-10-11) asked for the small SOS icon to come off the header: it repeats the name beside it. The icon
// file is kept so it can be used somewhere else later. These tests pin both halves of that request.
describe("brand wordmark", () => {
  it("does not draw the small SOS icon beside the name", () => {
    const source = readFileSync(join(__dirname, "brand-wordmark.tsx"), "utf8");
    expect(source).not.toContain("sos-icon");
    expect(source).not.toMatch(/<Image/);
    expect(source).toContain("Signal One");
  });

  it("keeps the icon file in the project for later use", () => {
    expect(existsSync(join(__dirname, "../../public/brand/sos-icon.svg"))).toBe(true);
  });
});
