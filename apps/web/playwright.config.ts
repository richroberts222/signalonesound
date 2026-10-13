import { defineConfig, devices } from "@playwright/test";
import { execFileSync } from "node:child_process";

import { config } from "dotenv";

// Native Playwright (docs/automation/playwright.md). E2E runs the real app
// (Next.js dev server) against Clerk DEVELOPMENT keys and the DEV database with a
// dedicated test user; never prod/stage/real users. Values come from the shell or
// the gitignored apps/web/.env.local; nothing secret is committed.
//
//   Required: DATABASE_ENV=dev|qa, DATABASE_URL, CLERK_SECRET_KEY (sk_test_...),
//             NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (pk_test_...),
//             E2E_CLERK_USER_EMAIL (a Clerk dev test user, for example name+clerk_test@example.com; it signs in
//             through Clerk's testing helper with the secret key, so no password is stored anywhere)
config({ path: ".env.local", quiet: true });

const env = process.env;
const databaseEnv = env.DATABASE_ENV;
const e2eReady = Boolean(
  databaseEnv &&
    env.DATABASE_URL &&
    env.CLERK_SECRET_KEY &&
    env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    env.E2E_CLERK_USER_EMAIL,
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

  // The admin test account (docs/automation/playwright.md): a second Clerk development user, found or created
  // here, is made an admin for this test run only by giving its id to the test server. Skipped if already done
  // (the test workers load this file again) or if Clerk cannot be reached; the admin tests then skip with a reason.
  const ensureTestUser = (email: string, phone: string): string | null => {
    try {
      const id = execFileSync(process.execPath, ["e2e/admin-account.mjs", email, phone], { encoding: "utf8", input: env.CLERK_SECRET_KEY, timeout: 30_000 }).trim();
      return /^user_[A-Za-z0-9]+$/.test(id) ? id : null;
    } catch {
      return null; // the specs that need this user skip with a reason
    }
  };
  if (env.E2E_ADMIN_READY !== "1") {
    const adminEmail = env.E2E_CLERK_ADMIN_EMAIL ?? "e2e-admin+clerk_test@example.com";
    const adminId = ensureTestUser(adminEmail, "+12015550142");
    if (adminId) {
      env.E2E_CLERK_ADMIN_EMAIL = adminEmail;
      env.ADMIN_USER_IDS = [env.ADMIN_USER_IDS, adminId].filter(Boolean).join(",");
      env.E2E_ADMIN_READY = "1";
    }
  }
  // A throwaway member for the member journey: it ends by deleting this account, and the next run creates it again.
  if (env.E2E_MEMBER_READY !== "1") {
    const memberEmail = env.E2E_CLERK_MEMBER_EMAIL ?? "e2e-member+clerk_test@example.com";
    if (ensureTestUser(memberEmail, "+12015550143")) {
      env.E2E_CLERK_MEMBER_EMAIL = memberEmail;
      env.E2E_MEMBER_READY = "1";
    }
  }
  // A member the admin tests suspend and reinstate (kept, not deleted, so the suspension tests never touch the main test user).
  if (env.E2E_SUSPECT_READY !== "1") {
    const suspectEmail = env.E2E_CLERK_SUSPECT_EMAIL ?? "e2e-suspect+clerk_test@example.com";
    if (ensureTestUser(suspectEmail, "+12015550144")) {
      env.E2E_CLERK_SUSPECT_EMAIL = suspectEmail;
      env.E2E_SUSPECT_READY = "1";
    }
  }
}

// E2E_PORT lets a local run reuse a dev server that is already running (Next allows only one per folder).
const PORT = Number(env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(env.CI),
  retries: 0,
  // A dev server compiles each page the first time it is opened, so allow for that.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  // CI also writes a JSON report that scripts/e2e-summary.mjs turns into the run's summary table.
  reporter: env.CI ? [["list"], ["html", { open: "never" }], ["json", { outputFile: "playwright-report/results.json" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Diagnostics only on failure. Traces can contain session tokens and CI artifacts of this public
    // repository are readable by others, so traces are off in CI; screenshots and videos show only the page.
    trace: env.CI ? "off" : "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: e2eReady
    ? {
        // CI serves the production build (the workflow builds it first): a dev server compiles every page the first
        // time it is opened, which used up the runner's memory and got the whole job killed partway (docs/lessons.md).
        // A local run uses the dev server, so a change shows without a rebuild.
        command: env.CI ? `next start --port ${PORT}` : `next dev --port ${PORT}`,
        url: `http://localhost:${PORT}/api/v1/status`,
        reuseExistingServer: !env.CI,
        timeout: 120_000,
      }
    : undefined,
});
