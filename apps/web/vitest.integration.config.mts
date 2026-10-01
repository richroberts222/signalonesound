import { config } from "dotenv";
import { defineConfig } from "vitest/config";

// Database-backed integration tests. NOT part of `pnpm test`/`validate`. Unlike
// the unit config this deliberately does not load the env-clearing setup file,
// because these tests need an explicit dev/qa DATABASE_ENV and DATABASE_URL
// (from the shell or the gitignored apps/web/.env.local). The tests themselves
// refuse to run for anything but dev/qa. See /docs/testing.md.
config({ path: ".env.local", quiet: true });

export default defineConfig({
  test: {
    include: ["**/*.integration.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    testTimeout: 30_000,
    // One file at a time: tests share one database.
    fileParallelism: false,
  },
});
