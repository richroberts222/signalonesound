// Unit tests for pure TypeScript only (config/boundary checks). Component tests
// are not set up; see /docs/testing.md.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // Same isolation as the web and shared packages: no database or auth environment leaks into a test.
    setupFiles: ["../../packages/shared/src/testing/setup.ts"],
    unstubEnvs: true,
  },
});
