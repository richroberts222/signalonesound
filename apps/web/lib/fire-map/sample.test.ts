import { describe, expect, it } from "vitest";

import { computeFireMap } from "./compute";
import { SAMPLE_FIRES } from "./sample";

describe("sample fires", () => {
  const map = computeFireMap(SAMPLE_FIRES, new Date("2026-10-10T12:00:00Z"));

  it("all land on real ground, so every sample fire counts in the world view", () => {
    expect(map.world.regions.flatMap((r) => r.events)).toHaveLength(SAMPLE_FIRES.length);
  });

  it("light up many states, so the United States map shows the state lines", () => {
    expect(map.us.regionsWithFire).toBeGreaterThanOrEqual(10);
  });

  it("are all labeled as samples", () => {
    expect(SAMPLE_FIRES.every((f) => f.title.startsWith("Sample"))).toBe(true);
  });
});
