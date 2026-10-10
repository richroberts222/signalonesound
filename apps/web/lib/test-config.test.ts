import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Repository-scanning guards (secret scan, text hygiene) timed out at the 5 second default on a busy
// machine and failed with no code change, twice. The limit is set once for the whole web test run, so a
// new scanning guard cannot forget it. This fails if that setting is removed or lowered.
describe("web test configuration", () => {
  it("allows at least 30 seconds per test so repository scans do not fail from load", () => {
    const config = readFileSync(join(__dirname, "..", "vitest.config.mts"), "utf8");
    const match = /testTimeout:\s*([\d_]+)/.exec(config);
    expect(match, "testTimeout is set in vitest.config.mts").not.toBeNull();
    expect(Number((match?.[1] ?? "0").replace(/_/g, ""))).toBeGreaterThanOrEqual(30_000);
  });
});
