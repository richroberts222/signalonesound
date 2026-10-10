import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, type Page } from "@playwright/test";

// Signs the Clerk DEVELOPMENT test user in without a password: Clerk's testing helper uses the dev secret
// key to create a one-time sign-in for the email address (docs/automation/playwright.md). Never point this
// at production keys; playwright.config.ts refuses anything but dev/qa and Clerk test keys. A member who has
// not yet accepted the current Terms and Privacy Policy is sent to the "Before you continue" step (S1), so
// the helper asks the server and, the first time, accepts it; afterwards the choice is stored.
export async function signIn(page: Page): Promise<void> {
  await setupClerkTestingToken({ page });
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_USER_EMAIL! });

  const accepted = async (): Promise<boolean> => {
    const res = await page.request.get("/api/v1/me");
    const body = (await res.json()) as { data?: { policy?: { accepted?: boolean } } };
    return body.data?.policy?.accepted === true;
  };
  if (!(await accepted())) {
    await page.goto("/accept-terms");
    await page.getByTestId("signup-age-checkbox").click();
    await page.getByTestId("signup-policy-checkbox").click();
    const saved = page.waitForResponse((r) => r.url().includes("/api/v1/me/policy-acceptance") && r.request().method() === "POST");
    await page.getByTestId("policy-accept-button").click();
    expect((await saved).status(), "accepting the terms must be saved by the server").toBe(200);
  }
  expect(await accepted(), "the test user has accepted the current terms").toBe(true);
  await page.goto("/");
}
