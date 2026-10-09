import { expect, test } from "@playwright/test";

// S1 browser journeys (docs/features/s1-identity-and-policy.md). The public-page checks need no
// sign-in. They run only when the E2E environment is configured (`E2E_READY`, set by
// playwright.config.ts after its fail-closed dev/qa checks); otherwise they skip with a visible
// reason and are never silently "passed". Sign-up, acceptance, export and deletion with a real Clerk
// test user are added when the E2E test users exist (docs/testing.md).
const ready = process.env.E2E_READY === "1";
const SKIP_REASON = "E2E environment not configured (see playwright.config.ts)";

test.describe("S1 public pages", () => {
  test.skip(!ready, SKIP_REASON);

  for (const [testId, path, heading] of [
    ["footer-terms", "/terms", "Terms of Use"],
    ["footer-privacy", "/privacy", "Privacy Policy"],
    ["footer-about", "/about", "About Signal One Sound"],
    ["footer-contact", "/contact", "Contact"],
  ] as const) {
    test(`AC10 ${path} is public, linked in the footer and has its heading`, async ({ page }) => {
      await page.goto("/");
      await page.getByTestId(testId).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    });
  }

  test("AC3 the member API refuses a signed-out visitor", async ({ request }) => {
    for (const path of ["/api/v1/me", "/api/v1/me/export"]) {
      expect((await request.get(path)).status()).toBe(401);
    }
  });

  test("AC6 the Clerk webhook refuses an unsigned request", async ({ request }) => {
    const res = await request.post("/api/v1/webhooks/clerk", { data: { type: "user.deleted", data: { id: "user_x" } } });
    expect(res.status()).toBe(400);
  });
});
