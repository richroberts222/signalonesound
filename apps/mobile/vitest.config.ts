// Unit tests for pure TypeScript only (config/boundary checks). Component tests
// are not set up; see /docs/testing.md.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    unstubEnvs: true,
  },
});
