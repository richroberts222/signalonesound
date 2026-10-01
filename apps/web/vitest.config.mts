import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.{ts,tsx}"],
    // Database-backed and browser tests have their own commands (docs/testing.md).
    exclude: ["node_modules/**", ".next/**", "**/*.integration.test.ts", "e2e/**"],
    setupFiles: ["../../packages/shared/src/testing/setup.ts"],
    unstubEnvs: true,
  },
});
