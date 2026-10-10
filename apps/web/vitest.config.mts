import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.{ts,tsx}"],
    // Database-backed and browser tests have their own commands (docs/testing.md).
    exclude: ["node_modules/**", ".next/**", "**/*.integration.test.ts", "e2e/**"],
    setupFiles: ["../../packages/shared/src/testing/setup.ts"],
    unstubEnvs: true,
    // Guards that scan the whole repository (secrets, text hygiene, dependency checks) take longer as the
    // repository grows and on a busy machine; the 5 second default made them fail with no code change.
    testTimeout: 30_000,
  },
});
