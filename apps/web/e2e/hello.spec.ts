import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";

// S0 acceptance journey (docs/features/s0-walking-skeleton.md): browser -> Next.js -> Clerk session ->
// /api/v1/me/hello -> validation -> service -> repository -> Drizzle -> DEV Postgres, and back through
// the UI. Requires the E2E environment described in playwright.config.ts; otherwise the tests skip with
// a visible reason (they are never silently "passed"). `E2E_READY` is set by playwright.config.ts only
// after the environment passed its fail-closed dev/qa checks.
const ready = process.env.E2E_READY === "1";
const SKIP_REASON =
  "E2E environment not configured (DATABASE_*, Clerk dev keys, E2E_CLERK_USER_*); see playwright.config.ts";

async function signIn(page: Page) {
  await setupClerkTestingToken({ page });
  await page.goto("/");
  await clerk.signIn({
    page,
    signInParams: {
      strategy: "password",
      identifier: process.env.E2E_CLERK_USER_USERNAME!,
      password: process.env.E2E_CLERK_USER_PASSWORD!,
    },
  });
}

test.describe("S0 hello note", () => {
  test.skip(!ready, SKIP_REASON);

  test("AC1 a signed-in user saves a note and sees it after reload", async ({ page }) => {
    await signIn(page);
    await page.goto("/hello");
    const note = `e2e hello ${Date.now()}`;
    await page.getByTestId("hello-note-input").fill(note);
    await page.getByTestId("hello-save-button").click();
    await expect(page.getByTestId("hello-note-display")).toHaveText(note);
    await page.reload();
    await expect(page.getByTestId("hello-note-display")).toHaveText(note);
  });

  test("AC5 the counter counts down and an over-long note is refused by the server", async ({ page }) => {
    await signIn(page);
    await page.goto("/hello");
    await page.getByTestId("hello-note-input").fill("x".repeat(141));
    await expect(page.getByTestId("hello-counter")).toContainText("0 characters left");
    await page.getByTestId("hello-save-button").click();
    await expect(page.getByTestId("hello-error")).toBeVisible();
  });

  test("AC3 a signed-out visitor is sent to sign in, and the API says 401", async ({ page, request }) => {
    await page.goto("/hello");
    await expect(page).toHaveURL(/sign-in/);
    const res = await request.get("/api/v1/me/hello");
    expect(res.status()).toBe(401);
  });
});
