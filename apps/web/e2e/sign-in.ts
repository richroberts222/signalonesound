import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, type Page } from "@playwright/test";

// Signs the Clerk DEVELOPMENT test user in without a password: Clerk's testing helper uses the dev secret
// key to create a one-time sign-in for the email address (docs/automation/playwright.md). Never point this
// at production keys; playwright.config.ts refuses anything but dev/qa and Clerk test keys. A member who has
// not yet accepted the current Terms and Privacy Policy is sent to the "Before you continue" step (S1), so
// the helper asks the server and, the first time, accepts it; afterwards the choice is stored.
export async function signIn(page: Page, emailAddress: string = process.env.E2E_CLERK_USER_EMAIL!): Promise<void> {
  await setupClerkTestingToken({ page });
  await page.goto("/");
  await clerk.signIn({ page, emailAddress });

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

// Signs in as the admin test account (a second Clerk development user that playwright.config.ts makes an admin for the
// run). Only used by specs that first check `adminReady`.
export const adminReady = process.env.E2E_ADMIN_READY === "1";
export const memberReady = process.env.E2E_MEMBER_READY === "1";
export const signInAsThrowawayMember = (page: Page): Promise<void> => signIn(page, process.env.E2E_CLERK_MEMBER_EMAIL!);
export const signInAsAdmin = (page: Page): Promise<void> => signIn(page, process.env.E2E_CLERK_ADMIN_EMAIL!);
