import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

// Native Playwright (docs/automation/playwright.md). E2E runs the real app
// (Next.js dev server) against Clerk DEVELOPMENT keys and the DEV database with a
// dedicated test user; never prod/stage/real users. Values come from the shell or
// the gitignored apps/web/.env.local; nothing secret is committed.
//
//   Required: DATABASE_ENV=dev|qa, DATABASE_URL, CLERK_SECRET_KEY (sk_test_...),
//             NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (pk_test_...),
//             E2E_CLERK_USER_USERNAME, E2E_CLERK_USER_PASSWORD (a Clerk dev test user)
config({ path: ".env.local", quiet: true });

const env = process.env;
const databaseEnv = env.DATABASE_ENV;
const e2eReady = Boolean(
  databaseEnv &&
    env.DATABASE_URL &&
    env.CLERK_SECRET_KEY &&
    env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    env.E2E_CLERK_USER_USERNAME &&
    env.E2E_CLERK_USER_PASSWORD,
);

// Fail closed: refuse anything that is not clearly a dev/qa setup.
if (e2eReady) {
  if (databaseEnv !== "dev" && databaseEnv !== "qa") {
    throw new Error("E2E: DATABASE_ENV must be dev or qa; refusing.");
  }
  if (env.APP_ENV && env.APP_ENV !== databaseEnv) throw new Error("E2E: APP_ENV must equal DATABASE_ENV; refusing.");
  if (env.VERCEL_ENV) throw new Error("E2E: must not run on Vercel; refusing.");
  if (!env.CLERK_SECRET_KEY?.startsWith("sk_test_") || !env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_")) {
    throw new Error("E2E: Clerk development (test) keys are required; refusing live keys.");
  }
  env.E2E_READY = "1";
}

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(env.CI),
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Diagnostics only on failure; traces can contain tokens, so artifacts are gitignored.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: e2eReady
    ? {
        command: `next dev --port ${PORT}`,
        url: `http://localhost:${PORT}/api/v1/status`,
        reuseExistingServer: !env.CI,
        timeout: 120_000,
      }
    : undefined,
});
