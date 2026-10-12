import { expect, test, type Page } from "@playwright/test";

import { adminReady, signInAsAdmin } from "./sign-in";

// Browser tests for the admin screens (docs/admin-manual.md), driven as a real admin: the admin test account that
// playwright.config.ts makes an admin for the run. Each test clicks the controls the manual describes and checks the
// result through the API as well. Everything a test creates carries an "e2e" prefix so `pnpm db:cleanup:e2e`
// removes it (db/tooling/e2e-cleanup.ts). Payment stays OFF: nothing here turns it on.
const SKIP_REASON = "Admin test account not available (see playwright.config.ts and docs/automation/playwright.md)";

type Plan = { id: string; name: string; active: boolean; price: { amountMinor: number } | null; perks: { key: string }[] };

test.describe("Admin screens (as an admin)", () => {
  test.skip(!adminReady, SKIP_REASON);
  test.describe.configure({ mode: "serial" });

  const stamp = Date.now().toString(36);
  const planName = `e2e-plan-${stamp}`;
  const perkKey = `e2e_perk_${stamp}`;
  const couponCode = `E2E-${stamp}`.toUpperCase();
  let page: Page;
  let adminId = "";

  const adminApi = async <T>(path: string): Promise<T> => {
    const res = await page.request.get(path);
    expect(res.status(), path).toBe(200);
    return ((await res.json()) as { data: T }).data;
  };
  const planByName = async (): Promise<Plan> => {
    const found = (await adminApi<{ items: Plan[] }>("/api/v1/admin/billing/plans")).items.find((p) => p.name === planName);
    expect(found, `plan ${planName} exists`).toBeDefined();
    return found as Plan;
  };
  const notice = () => page.getByTestId("billing-notice");
  const billingError = () => page.getByTestId("billing-error");

  test.beforeAll(async ({ browser }) => {
    page = await (await browser.newContext()).newPage();
    await signInAsAdmin(page);
    const clerkUserId = () => (window as unknown as { Clerk?: { user?: { id?: string } } }).Clerk?.user?.id ?? "";
    await page.waitForFunction(() => Boolean((window as unknown as { Clerk?: { user?: { id?: string } } }).Clerk?.user?.id));
    adminId = await page.evaluate(clerkUserId);
    expect(adminId).toMatch(/^user_/);
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test("1.2 the admin is let into the admin API and the admin pages, and sees the section links", async () => {
    expect((await page.request.get("/api/v1/admin/billing/rules")).status()).toBe(200);
    await page.goto("/admin/billing");
    await expect(page.getByTestId("billing-required-member")).toBeVisible();
    await expect(page.getByTestId("billing-error")).toHaveCount(0);
    await page.goto("/admin");
    // The menu has seven links; Manager requests, Moderation and the Audit log have none yet (docs/admin-manual.md 1.3), so the
    // tests below open them by address.
    for (const label of ["overview", "organizations", "events", "submissions", "import", "billing", "messages"]) await expect(page.getByTestId(`admin-${label}-link`)).toBeVisible();
    await page.getByTestId("admin-billing-link").click();
    await expect(page).toHaveURL(/\/admin\/billing/);
  });

  test("6.1 billing rules: change the free-trial days, see them saved, refuse a bad number, then put it back", async () => {
    const trialDays = async () => (await adminApi<{ items: { accountType: string; trialDays: number; paymentRequired: boolean }[] }>("/api/v1/admin/billing/rules")).items.find((r) => r.accountType === "member")!;
    const before = await trialDays();
    // Waits for the save itself: the "saved" message from an earlier save may still be showing.
    const save = async (days: string) => {
      await page.getByTestId("billing-trial-days-member").fill(days);
      const answered = page.waitForResponse((r) => r.url().includes("/api/v1/admin/billing/rules/member") && r.request().method() === "PUT");
      await page.getByTestId("billing-save-member").click();
      return answered;
    };
    await page.goto("/admin/billing");
    await expect(page.getByTestId("billing-trial-days-member")).toHaveValue(String(before.trialDays)); // the page has loaded its settings
    try {
      expect((await save("400")).status()).toBe(400); // more than a year is refused, in words
      await expect(billingError()).toBeVisible();
      expect((await save("9")).status()).toBe(200);
      await expect(notice()).toContainText("saved");
      expect(await trialDays()).toMatchObject({ trialDays: 9, paymentRequired: false });
    } finally {
      expect((await save(String(before.trialDays))).status()).toBe(200);
    }
    expect((await trialDays()).trialDays).toBe(before.trialDays);
  });

  test("6.2 plans: create one (it starts off), turn it on, change its price; it appears for the public only when on", async () => {
    await page.goto("/admin/billing");
    await page.getByTestId("plan-new").click();
    await expect(billingError()).toBeVisible(); // a plan needs a name and a price
    await page.getByTestId("plan-name").fill(planName);
    await page.getByTestId("plan-amount").fill("3");
    await page.getByTestId("plan-new").click();
    await expect(notice()).toContainText("Plan created");
    expect(await planByName()).toMatchObject({ active: false, price: { amountMinor: 300 } });
    const publicNames = async () => ((await (await page.request.get("/api/v1/plans")).json()) as { data: { items: Plan[] } }).data.items.map((p) => p.name);
    expect(await publicNames()).not.toContain(planName);

    const row = page.getByRole("listitem").filter({ hasText: planName }).first();
    await row.getByRole("checkbox").click();
    await expect(notice()).toContainText("Plan turned on");
    expect((await planByName()).active).toBe(true);
    expect(await publicNames()).toContain(planName);

    await row.locator('[data-testid^="plan-price-"]').fill("4");
    await row.locator('[data-testid^="plan-edit-"]').click();
    await expect(notice()).toContainText("New price saved");
    expect((await planByName()).price?.amountMinor).toBe(400);
  });

  test("6.6 perks: add one, refuse a duplicate and a bad key, tick it on the plan, see it on the public plan, switch it off", async () => {
    await page.goto("/admin/billing");
    await page.getByTestId("perk-label").fill("E2E perk");
    await page.getByTestId("perk-key").fill("Bad Key");
    await page.getByTestId("perk-create").click();
    await expect(page.getByTestId("perks-error")).toBeVisible();
    await expect(page.getByTestId("perk-label")).toHaveValue("E2E perk"); // a refused change keeps what was typed
    await expect(page.getByTestId("perk-key")).toHaveValue("Bad Key");

    await page.getByTestId("perk-key").fill(perkKey);
    await page.getByTestId("perk-description").fill("Added by a browser test");
    await page.getByTestId("perk-create").click();
    await expect(page.getByTestId("perks-notice")).toContainText("Perk added");
    await expect(page.getByTestId(`perk-label-${perkKey}`)).toHaveText("E2E perk");

    await page.getByTestId("perk-label").fill("E2E perk");
    await page.getByTestId("perk-key").fill(perkKey);
    await page.getByTestId("perk-create").click();
    await expect(page.getByTestId("perks-error")).toContainText("already exists");

    const plan = await planByName();
    await page.getByTestId(`plan-perk-${plan.id}-${perkKey}`).click();
    await page.getByTestId(`plan-perks-save-${plan.id}`).click();
    await expect(page.getByTestId("perks-notice")).toContainText("Plan perks saved");
    const perksOnPublicPlan = async () => ((await (await page.request.get("/api/v1/plans")).json()) as { data: { items: Plan[] } }).data.items.find((p) => p.id === plan.id)?.perks.map((p) => p.key);
    expect(await perksOnPublicPlan()).toEqual([perkKey]);

    await page.getByTestId(`perk-active-${perkKey}`).click();
    await expect(page.getByTestId("perks-notice")).toContainText("switched off");
    expect(await perksOnPublicPlan()).toEqual([]); // a switched-off perk is not offered
  });

  test("6.3 coupons: refuse an empty one, create one, turn it off", async () => {
    await page.goto("/admin/billing");
    await page.getByTestId("coupon-new").click();
    await expect(billingError()).toBeVisible();
    await page.getByTestId("coupon-code").fill(couponCode);
    await page.getByTestId("coupon-percent").fill("10");
    await page.getByTestId("coupon-new").click();
    await expect(notice()).toContainText("oupon");
    const coupons = async () => (await adminApi<{ items: { code: string; active: boolean; percentOff: number }[] }>("/api/v1/admin/billing/coupons")).items.find((c) => c.code === couponCode);
    expect(await coupons()).toMatchObject({ active: true, percentOff: 10 });
    await page.getByRole("listitem").filter({ hasText: couponCode }).first().getByRole("checkbox").click();
    await expect(notice()).toContainText("turned off");
    expect((await coupons())?.active).toBe(false);
  });

  test("6.4 free trial: give the member one, and refuse an unknown member and a missing reason", async () => {
    await page.goto("/admin/billing");
    await page.getByTestId("trial-grant-user").fill(`user_${"Z".repeat(12)}`);
    await page.getByTestId("trial-grant-days").fill("3");
    await page.getByTestId("trial-grant-reason").fill("e2e-trial unknown member");
    await page.getByTestId("trial-grant-submit").click();
    await expect(billingError()).toContainText("not found");

    await page.getByTestId("trial-grant-user").fill(adminId);
    await page.getByTestId("trial-grant-reason").fill("");
    await page.getByTestId("trial-grant-submit").click();
    await expect(billingError()).toBeVisible();

    await page.getByTestId("trial-grant-reason").fill("e2e-trial browser test");
    await page.getByTestId("trial-grant-submit").click();
    await expect(notice()).toContainText("Trial given");
    const mine = (await adminApi<{ items: { status: string; trialEndsAt: string | null }[] }>("/api/v1/me/entitlements")).items[0];
    expect(mine.status).toBe("trialing");
    expect(new Date(mine.trialEndsAt as string).getTime()).toBeGreaterThan(Date.now());
  });

  test("6.5 free for life: shows the places used and refuses an unknown church and a missing reason", async () => {
    await page.goto("/admin/billing");
    await expect(page.getByTestId("flagship-count")).toContainText("of 50 places used");
    await page.getByTestId("flagship-org").fill("00000000-0000-4000-8000-0000000000aa");
    await page.getByTestId("flagship-reason").fill("");
    await page.getByTestId("flagship-enable").click();
    await expect(billingError()).toBeVisible();
    await page.getByTestId("flagship-reason").fill("e2e flagship check");
    await page.getByTestId("flagship-enable").click();
    await expect(billingError()).toContainText("not found");
    await page.getByTestId("flagship-disable").click();
    await expect(billingError()).toContainText("not found");
  });

  test("6 the billing change history lists what was just changed", async () => {
    await page.goto("/admin/billing");
    await expect(page.getByTestId("billing-audit-list")).toContainText("trial grant");
  });

  test("4 audit log: search finds the billing changes, a filter with no match says so, export is offered", async () => {
    await page.goto("/admin/audit");
    await page.getByTestId("audit-filter-subject").fill(`perk:${perkKey}`);
    await page.getByTestId("audit-search").click();
    await expect(page.getByText("billing.perk.create").first()).toBeVisible();
    await page.getByTestId("audit-filter-subject").fill(`nothing-matches-${stamp}`);
    await page.getByTestId("audit-search").click();
    await expect(page.getByTestId("audit-empty")).toBeVisible();
    await expect(page.getByTestId("audit-export")).toBeVisible();
    await expect(page.getByTestId("audit-error")).toHaveCount(0);
  });

  test("3 moderation: the screen opens, and acting on something that does not exist is refused in words", async () => {
    await page.goto("/admin/moderation");
    await expect(page.getByTestId("moderation-error")).toHaveCount(0);
    await page.getByTestId("admin-target-input").fill("00000000-0000-4000-8000-0000000000bb");
    await page.getByTestId("admin-target-reason").fill("e2e check");
    await page.getByTestId("admin-hide-event").click();
    await expect(page.getByTestId("moderation-error")).toBeVisible();
    await page.getByTestId("admin-unpublish-org").click();
    await expect(page.getByTestId("moderation-error")).toBeVisible();
    await expect(page.getByTestId("moderation-notice")).toHaveCount(0);
  });

  test("2 manager requests: the queue opens for an admin (a queue or the empty message)", async () => {
    await page.goto("/admin/manager-requests");
    await expect(page.getByTestId("admin-error")).toHaveCount(0);
    await expect(page.getByTestId("admin-queue-empty").or(page.getByRole("list").first())).toBeVisible();
  });

  test("5 messages: the inbox opens for an admin (the list or the empty message)", async () => {
    await page.goto("/admin/messages");
    await expect(page.getByTestId("messages-error")).toHaveCount(0);
    await expect(page.getByTestId("messages-empty").or(page.getByTestId("messages-list").locator("li").first())).toBeVisible();
  });

  test("7 the practice screens open and say they are practice", async () => {
    for (const path of ["/admin", "/admin/organizations", "/admin/events", "/admin/submissions", "/admin/import"]) {
      await page.goto(path);
      await expect(page.getByTestId("admin-notice"), path).toBeVisible();
    }
  });
});
