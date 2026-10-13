import { expect, test, type Page } from "@playwright/test";

import { adminReady, signIn, signInAsAdmin, signInAsSuspect, suspectReady } from "./sign-in";

// The admin's decisions on real data (docs/admin-manual.md sections 2 and 3) and the church page a manager builds
// (docs/user-manual.md section 8.3): reject a request, approve one, publish the church profile so the public finder lists it,
// unpublish it (it leaves the finder and the public API) and restore it, then suspend a member (who can no longer submit a
// claim) and reinstate them. The churches carry an "e2e-church-" prefix so `pnpm db:cleanup:e2e` removes them.
const ready = process.env.E2E_READY === "1";

test.describe("Admin decisions and the church page", () => {
  test.skip(!ready || !adminReady || !suspectReady, "E2E environment or the admin / suspect test accounts are not available (see playwright.config.ts)");
  test.describe.configure({ mode: "serial" });

  const stamp = Date.now().toString(36);
  const rejectedName = `e2e-church-${stamp}-rej`;
  const publicName = `e2e-church-${stamp}-pub`;
  const suspectName = `e2e-church-${stamp}-sus`;
  let member: Page;
  let admin: Page;
  let suspect: Page;
  let orgId = "";
  let suspectId = "";
  let adminId = "";

  const claim = async (page: Page, name: string) => {
    await page.goto("/claim-church");
    await page.getByTestId("claim-name-input").fill(name);
    await page.getByTestId("claim-link-input-0").fill("https://example.com/e2e-church");
    await page.getByTestId("claim-email-input").fill("e2e-church@example.com");
    await page.getByTestId("claim-submit").click();
  };
  const decide = async (decision: "approve" | "reject", name: string) => {
    await admin.goto("/admin/manager-requests");
    const item = admin.getByRole("listitem").filter({ hasText: name }).first();
    await expect(item).toBeVisible();
    await item.getByTestId("admin-reason-input").fill(`e2e ${decision}`);
    await item.locator(`[data-testid^="admin-${decision}-"]`).click();
    await expect(admin.getByRole("listitem").filter({ hasText: name })).toHaveCount(0);
  };
  const clerkId = (page: Page) => page.evaluate(() => (window as unknown as { Clerk?: { user?: { id?: string } } }).Clerk?.user?.id ?? "");
  const waitForClerk = (page: Page) => page.waitForFunction(() => Boolean((window as unknown as { Clerk?: { user?: { id?: string } } }).Clerk?.user?.id));
  const publicOrg = async () => (await admin.request.get(`/api/v1/organizations/${orgId}`)).status();

  test.beforeAll(async ({ browser }) => {
    member = await (await browser.newContext()).newPage();
    admin = await (await browser.newContext()).newPage();
    suspect = await (await browser.newContext()).newPage();
    await signIn(member);
    await signInAsAdmin(admin);
    await signInAsSuspect(suspect);
    await waitForClerk(admin);
    await waitForClerk(suspect);
    adminId = await clerkId(admin);
    suspectId = await clerkId(suspect);
    expect(adminId).toMatch(/^user_/);
    expect(suspectId).toMatch(/^user_/);
  });

  test.afterAll(async () => {
    await member.context().close();
    await admin.context().close();
    await suspect.context().close();
  });

  test("2 the admin rejects a request: it leaves the queue and the person sees Not approved", async () => {
    await claim(member, rejectedName);
    await expect(member.getByTestId("claim-pending")).toBeVisible();
    await decide("reject", rejectedName);
    await member.goto("/account/organizations");
    await expect(member.getByRole("listitem").filter({ hasText: rejectedName }).first()).toContainText("Not approved");
  });

  test("2 and 8.3 an approved church gets an address and service times, and the public finder then lists it", async () => {
    await claim(member, publicName);
    await expect(member.getByTestId("claim-pending")).toBeVisible();
    await decide("approve", publicName);
    await member.goto("/account/organizations");
    const row = member.getByRole("listitem").filter({ hasText: publicName }).first();
    const href = await row.locator('a[href$="/events"]').getAttribute("href");
    orgId = /\/manage\/([0-9a-f-]{36})\/events/.exec(href ?? "")?.[1] ?? "";
    expect(orgId).toMatch(/^[0-9a-f-]{36}$/);
    expect(await publicOrg()).toBe(200);

    await member.goto(`/manage/${orgId}/profile`);
    await member.getByTestId("church-street-input").fill("1 Main Street");
    await member.getByTestId("church-city-input").fill("Nashville");
    await member.getByTestId("church-state-select").selectOption("TN");
    await member.getByTestId("church-zip-input").fill("37203");
    await member.getByTestId("church-service-add").click();
    await member.getByTestId("church-service-time-0").fill("10:00");
    await member.getByLabel("Service 1 name").fill("Sunday worship");
    await member.getByTestId("church-profile-save").click();
    await expect(member.getByTestId("church-profile-notice")).toBeVisible();

    await member.goto(`/churches?q=${encodeURIComponent(publicName)}`);
    await expect(member.getByRole("link", { name: new RegExp(publicName) }).first()).toBeVisible();
    await member.goto(`/churches/${orgId}`);
    await expect(member.getByRole("heading", { level: 1 })).toContainText(publicName);
  });

  test("3.2 the admin unpublishes the church: it leaves the finder and the public API; restoring brings it back", async () => {
    await admin.goto("/admin/moderation");
    await admin.getByTestId("admin-target-input").fill(orgId);
    await admin.getByTestId("admin-target-reason").fill("e2e unpublish");
    await admin.getByTestId("admin-unpublish-org").click();
    await expect(admin.getByTestId("moderation-notice")).toContainText("Church unpublished");
    expect(await publicOrg()).toBe(404);
    await member.goto(`/churches?q=${encodeURIComponent(publicName)}`);
    await expect(member.getByRole("link", { name: new RegExp(publicName) })).toHaveCount(0);

    await admin.getByTestId("admin-restore-org").click();
    await expect(admin.getByTestId("moderation-notice")).toContainText("Church restored");
    expect(await publicOrg()).toBe(200);
    await member.goto(`/churches?q=${encodeURIComponent(publicName)}`);
    await expect(member.getByRole("link", { name: new RegExp(publicName) }).first()).toBeVisible();
  });

  test("3.3 the admin suspends a member, who can no longer submit a claim; reinstating lets them again", async () => {
    await admin.goto("/admin/moderation");
    await admin.getByTestId("admin-target-input").fill(suspectId);
    await admin.getByTestId("admin-target-reason").fill("e2e suspend");
    await admin.getByTestId("admin-suspend-member").click();
    await expect(admin.getByTestId("moderation-notice")).toContainText("Member suspended");

    await claim(suspect, suspectName);
    await expect(suspect.getByTestId("claim-error")).toBeVisible();
    await expect(suspect.getByTestId("claim-pending")).toHaveCount(0);

    await admin.getByTestId("admin-reinstate-member").click();
    await expect(admin.getByTestId("moderation-notice")).toContainText("Member reinstated");
    await claim(suspect, suspectName);
    await expect(suspect.getByTestId("claim-pending")).toBeVisible();
  });

  test("3.3 an admin cannot suspend themselves", async () => {
    await admin.goto("/admin/moderation");
    await admin.getByTestId("admin-target-input").fill(adminId);
    await admin.getByTestId("admin-target-reason").fill("e2e self");
    await admin.getByTestId("admin-suspend-member").click();
    await expect(admin.getByTestId("moderation-error")).toBeVisible();
    await expect(admin.getByTestId("moderation-notice")).toHaveCount(0);
  });
});
