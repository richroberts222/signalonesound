import { expect, test, type Page } from "@playwright/test";

import { adminReady, memberReady, signInAsAdmin, signInAsSuspect, suspectReady } from "./sign-in";

// The admin console controls the first admin tests left out (docs/admin-manual.md sections 3.3, 4, 5 and 6): the Messages inbox
// (mark done, mark new again, delete), the audit log filters, a default plan on a billing rule, a coupon for a fixed amount with an
// expiry and a limit, a yearly plan and a church plan, and "hide their events" when suspending a member. Everything created carries
// an "e2e" prefix and is removed by `pnpm db:cleanup:e2e` (db/tooling/e2e-cleanup.ts).
const ready = process.env.E2E_READY === "1";

test.describe("Admin console details", () => {
  test.skip(!ready || !adminReady || !suspectReady || !memberReady, "E2E environment or the test accounts are not available (see playwright.config.ts)");
  test.describe.configure({ mode: "serial" });

  const stamp = Date.now().toString(36);
  let admin: Page;
  let adminId = "";

  const adminJson = async <T>(path: string): Promise<T> => {
    const res = await admin.request.get(path);
    expect(res.status(), path).toBe(200);
    return ((await res.json()) as { data: T }).data;
  };
  const clerkId = (page: Page) => page.evaluate(() => (window as unknown as { Clerk?: { user?: { id?: string } } }).Clerk?.user?.id ?? "");

  test.beforeAll(async ({ browser }) => {
    admin = await (await browser.newContext()).newPage();
    await signInAsAdmin(admin);
    await admin.waitForFunction(() => Boolean((window as unknown as { Clerk?: { user?: { id?: string } } }).Clerk?.user?.id));
    adminId = await clerkId(admin);
    expect(adminId).toMatch(/^user_/);
  });

  test.afterAll(async () => {
    await admin.context().close();
  });

  test("5 messages: a visitor's message arrives; the admin marks it done, marks it new again, then deletes it", async ({ browser }) => {
    const name = `e2e-contact-${stamp}`;
    const visitor = await (await browser.newContext()).newPage();
    await visitor.goto("/contact");
    await visitor.getByTestId("contact-name").fill(name);
    await visitor.getByTestId("contact-message").fill("Do you list tent revivals in Idaho? Thank you.");
    await visitor.getByTestId("contact-send").click();
    await expect(visitor.getByTestId("contact-thanks")).toBeVisible();
    await visitor.context().close();

    await admin.goto("/admin/messages");
    const row = () => admin.getByRole("listitem").filter({ hasText: name }).first();
    await expect(row()).toContainText("tent revivals in Idaho");
    await expect(row()).toContainText("New");
    await row().locator('[data-testid^="message-done-"]').click();
    await expect(admin.getByTestId("messages-notice")).toContainText("Marked done");
    await expect(row()).toContainText("Done");
    await row().locator('[data-testid^="message-reopen-"]').click();
    await expect(admin.getByTestId("messages-notice")).toContainText("Marked new again");
    await expect(row()).toContainText("New");
    await row().locator('[data-testid^="message-delete-"]').click();
    await expect(admin.getByTestId("messages-notice")).toContainText("Message deleted");
    await expect(admin.getByRole("listitem").filter({ hasText: name })).toHaveCount(0);
  });

  test("4 audit log: the filters narrow the entries by who, and by dates", async () => {
    await admin.goto("/admin/audit");
    const search = async () => {
      const answered = admin.waitForResponse((r) => r.url().includes("/api/v1/admin/audit/search") && r.request().method() === "GET");
      await admin.getByTestId("audit-search").click();
      await answered;
    };
    await admin.getByTestId("audit-filter-actor").fill(adminId);
    await search();
    await expect(admin.getByTestId("audit-empty")).toHaveCount(0); // the admin has made changes
    await admin.getByTestId("audit-filter-actor").fill("user_nobodyatall1234");
    await search();
    await expect(admin.getByTestId("audit-empty")).toBeVisible();

    await admin.getByTestId("audit-filter-actor").fill("");
    await admin.getByTestId("audit-filter-from").fill("2999-01-01"); // nothing is dated after this
    await search();
    await expect(admin.getByTestId("audit-empty")).toBeVisible();
    await admin.getByTestId("audit-filter-from").fill("");
    await admin.getByTestId("audit-filter-to").fill("2000-01-01"); // nothing is dated before this
    await search();
    await expect(admin.getByTestId("audit-empty")).toBeVisible();
    await admin.getByTestId("audit-filter-to").fill("");
    await search();
    await expect(admin.getByTestId("audit-empty")).toHaveCount(0);
  });

  test("6.2 plans: a yearly plan and a church plan keep their choices", async () => {
    await admin.goto("/admin/billing");
    await admin.getByTestId("plan-name").fill(`e2e-plan-${stamp}-year`);
    await admin.getByTestId("plan-account-type").selectOption("organization");
    await admin.getByTestId("plan-interval").selectOption("year");
    await admin.getByTestId("plan-amount").fill("30");
    await admin.getByTestId("plan-new").click();
    await expect(admin.getByTestId("billing-notice")).toContainText("Plan created");
    const plans = await adminJson<{ items: { name: string; accountType: string; price: { interval: string; amountMinor: number } }[] }>("/api/v1/admin/billing/plans");
    expect(plans.items.find((p) => p.name === `e2e-plan-${stamp}-year`)).toMatchObject({ accountType: "organization", price: { interval: "year", amountMinor: 3000 } });
  });

  test("6.1 billing rules: choose a default plan for a trial, then put it back to none", async () => {
    await admin.goto("/admin/billing");
    await admin.getByTestId("plan-name").fill(`e2e-plan-${stamp}-default`);
    await admin.getByTestId("plan-amount").fill("3");
    await admin.getByTestId("plan-new").click();
    await expect(admin.getByTestId("billing-notice")).toContainText("Plan created");
    const rule = async () => (await adminJson<{ items: { accountType: string; defaultPlanId: string | null }[] }>("/api/v1/admin/billing/rules")).items.find((r) => r.accountType === "member")!;
    const before = await rule();
    const save = async () => {
      const answered = admin.waitForResponse((r) => r.url().includes("/api/v1/admin/billing/rules/member") && r.request().method() === "PUT");
      await admin.getByTestId("billing-save-member").click();
      expect((await answered).status()).toBe(200);
    };
    const option = admin.getByTestId("billing-default-plan-member").locator("option", { hasText: `e2e-plan-${stamp}-default` });
    await admin.getByTestId("billing-default-plan-member").selectOption((await option.getAttribute("value")) ?? "");
    const chosen = await admin.getByTestId("billing-default-plan-member").inputValue();
    expect(chosen).not.toBe("");
    await save();
    expect((await rule()).defaultPlanId).toBe(chosen);
    await admin.getByTestId("billing-default-plan-member").selectOption("");
    await save();
    expect((await rule()).defaultPlanId).toBe(before.defaultPlanId);
  });

  test("6.3 coupons: a fixed amount off with an expiry and a limit is saved as entered", async () => {
    const code = `E2E-${stamp}-AMT`.toUpperCase();
    await admin.goto("/admin/billing");
    await admin.getByTestId("coupon-code").fill(code);
    await admin.getByTestId("coupon-kind").selectOption("amount");
    await admin.getByTestId("coupon-amount").fill("2");
    await admin.getByTestId("coupon-expires").fill("2031-01-01T10:00");
    await admin.getByTestId("coupon-limit").fill("5");
    await admin.getByTestId("coupon-new").click();
    await expect(admin.getByTestId("billing-notice")).toContainText("oupon");
    const coupons = await adminJson<{ items: { code: string; amountOffMinor: number | null; percentOff: number | null; currency: string | null; maxRedemptions: number | null; expiresAt: string | null }[] }>("/api/v1/admin/billing/coupons");
    const made = coupons.items.find((c) => c.code === code);
    expect(made).toMatchObject({ amountOffMinor: 200, percentOff: null, currency: "usd", maxRedemptions: 5 });
    expect(new Date(made!.expiresAt!).getUTCFullYear()).toBe(2031);
  });

  test("3.3 suspending a member with 'their events are hidden' sends that choice, and reinstating undoes the suspension", async ({ browser }) => {
    const suspect = await (await browser.newContext()).newPage();
    await signInAsSuspect(suspect);
    await suspect.waitForFunction(() => Boolean((window as unknown as { Clerk?: { user?: { id?: string } } }).Clerk?.user?.id));
    const suspectId = await clerkId(suspect);
    await suspect.context().close();

    await admin.goto("/admin/moderation");
    await admin.getByTestId("admin-target-input").fill(suspectId);
    await admin.getByTestId("admin-target-reason").fill("e2e suspend and hide");
    await admin.getByTestId("admin-events-action").selectOption("hide");
    const sent = admin.waitForRequest((r) => r.url().includes("/suspend") && r.method() === "POST");
    await admin.getByTestId("admin-suspend-member").click();
    expect(JSON.parse((await sent).postData() ?? "{}")).toMatchObject({ eventsAction: "hide" });
    await expect(admin.getByTestId("moderation-notice")).toContainText("Member suspended");
    await admin.getByTestId("admin-reinstate-member").click();
    await expect(admin.getByTestId("moderation-notice")).toContainText("Member reinstated");
  });
});
