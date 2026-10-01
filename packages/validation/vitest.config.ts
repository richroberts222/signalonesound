import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    setupFiles: ["../shared/src/testing/setup.ts"],
    unstubEnvs: true,
  },
});
