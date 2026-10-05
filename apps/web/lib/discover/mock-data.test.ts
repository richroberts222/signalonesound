import { describe, expect, it } from "vitest";
import { MOCK_EVENTS, MOCK_TODAY } from "./mock-data";
import { isRevivalTypeId } from "./revival-types";

// Keeps the mock honest to the product plan's startup scope as it is edited.
describe("Discover Revival mock data", () => {
  it("has unique ids, known Revival Types, and valid dates", () => {
    expect(new Set(MOCK_EVENTS.map((e) => e.id)).size).toBe(MOCK_EVENTS.length);
    for (const e of MOCK_EVENTS) {
      expect(e.revivalTypes.length).toBeGreaterThan(0);
      expect(e.revivalTypes.every(isRevivalTypeId)).toBe(true);
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.date >= MOCK_TODAY).toBe(true);
      if (e.endDate) expect(e.endDate >= e.date).toBe(true);
    }
  });

  it("gives every Church/Ministry 1 to 3 links and every venue the required address parts", () => {
    for (const e of MOCK_EVENTS) {
      expect(e.organization.name).not.toBe("");
      expect(e.organization.links.length).toBeGreaterThanOrEqual(1);
      expect(e.organization.links.length).toBeLessThanOrEqual(3);
      const v = e.venue;
      expect([v.name, v.street, v.city, v.state, v.zip].every(Boolean)).toBe(true);
    }
  });
});
