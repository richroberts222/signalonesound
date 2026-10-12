import { expect, test } from "@playwright/test";

import { signIn } from "./sign-in";

// Browser and API journeys for billing (S10, docs/features/s10-payments-plans-and-switches.md). They run only
// when the E2E environment is configured (`E2E_READY`); otherwise they skip with a visible reason. The Clerk
// development test user is a normal member, not an admin: the admin tools must refuse them.
const ready = process.env.E2E_READY === "1";
const SKIP_REASON = "E2E environment not configured (see playwright.config.ts)";

test.describe("Billing: signed out", () => {
  test.skip(!ready, SKIP_REASON);

  test("AC1 the billing API and the entitlement API refuse a signed-out caller with 401", async ({ request }) => {
    for (const path of ["/api/v1/admin/billing/rules", "/api/v1/admin/billing/plans", "/api/v1/admin/billing/coupons", "/api/v1/admin/billing/audit", "/api/v1/me/entitlements"]) {
      expect((await request.get(path)).status(), path).toBe(401);
    }
  });

  test("the admin billing page sends a signed-out visitor to sign in", async ({ page }) => {
    await page.goto("/admin/billing");
    await expect(page).toHaveURL(/sign-in/);
  });
});

test.describe("Billing: signed in as a normal member", () => {
  test.skip(!ready, SKIP_REASON);

  test("AC1 the billing admin API answers 'not found' to a member who is not an admin", async ({ page }) => {
    await signIn(page);
    for (const path of ["/api/v1/admin/billing/rules", "/api/v1/admin/billing/plans", "/api/v1/admin/billing/coupons", "/api/v1/admin/billing/audit"]) {
      const res = await page.request.get(path);
      expect(res.status(), path).toBe(404);
    }
  });

  test("AC3 AC10 the member is entitled while payment is off, and the server says why", async ({ page }) => {
    await signIn(page);
    const res = await page.request.get("/api/v1/me/entitlements");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok: boolean; data: { items: { accountType: string; entitled: boolean; reason: string }[] } };
    expect(body.data.items[0]).toMatchObject({ accountType: "member", entitled: true, reason: "not_required" });
  });

  test("the admin billing page tells a non-admin it is for admins only", async ({ page }) => {
    await signIn(page);
    await page.goto("/admin/billing");
    await expect(page.getByTestId("billing-error")).toContainText("only for platform admins");
  });
});

// S11 (docs/features/s11-stripe-checkout-and-webhooks.md): the payment routes are closed in this environment
// (PAYMENTS_PROVIDER is not set), and the webhook refuses anything that is not correctly signed.
test.describe("Payments (S11): closed and safe by default", () => {
  test.skip(!ready, SKIP_REASON);

  test("AC1 the payment provider's webhook refuses an unsigned or wrongly signed request", async ({ request }) => {
    const unsigned: Record<string, string>[] = [{}, { "stripe-signature": "t=1,v1=bad" }];
    for (const headers of unsigned) {
      const res = await request.post("/api/v1/webhooks/stripe", { headers, data: { id: "evt_x", type: "checkout.session.completed" } });
      expect(res.status()).toBe(400);
    }
  });

  test("AC2 checkout and the customer page refuse a signed-out caller with 401", async ({ request }) => {
    for (const path of ["/api/v1/me/checkout", "/api/v1/me/billing-portal"]) expect((await request.post(path)).status(), path).toBe(401);
  });

  test("AC1 AC2 a signed-in member finds checkout and the customer page closed when payments are off", async ({ page }) => {
    await signIn(page);
    const checkout = await page.request.post("/api/v1/me/checkout", { data: { planId: "11111111-1111-4111-8111-111111111111" } });
    expect(checkout.status()).toBe(404);
    expect((await page.request.post("/api/v1/me/billing-portal")).status()).toBe(404);
  });
});


// S13 (docs/features/s13-membership-and-trial-grants.md): the Membership page and the trial grant.
test.describe("Membership (S13)", () => {
  test.skip(!ready, SKIP_REASON);

  test("AC1 a signed-out caller is refused and a normal member is told 'not found' by the trial-grant route", async ({ page, request }) => {
    const body = { userId: "user_0000000000", days: 7, reason: "test" };
    expect((await request.put("/api/v1/admin/billing/trials", { data: body })).status()).toBe(401);
    await signIn(page);
    expect((await page.request.put("/api/v1/admin/billing/trials", { data: body })).status()).toBe(404);
  });

  test("AC8 the Membership page says membership is free while payment is off, with no plans to choose", async ({ page }) => {
    await signIn(page);
    await page.goto("/account/membership");
    await expect(page.getByTestId("membership-status")).toContainText("free for everyone");
    await expect(page.getByTestId("membership-manage")).toHaveCount(0);
    await expect(page.getByTestId("plan-choose-0")).toHaveCount(0);
  });

  test("the Membership page sends a signed-out visitor to sign in", async ({ page }) => {
    await page.goto("/account/membership");
    await expect(page).toHaveURL(/sign-in/);
  });
});

// S14 (docs/features/s14-church-plans.md): church plans and the free-for-life places.
test.describe("Church plans (S14)", () => {
  test.skip(!ready, SKIP_REASON);
  const church = "00000000-0000-4000-8000-000000000001";

  test("AC1 AC7 signed out, every church plan route and the flagship route answer 401", async ({ request }) => {
    expect((await request.get(`/api/v1/organizations/${church}/entitlement`)).status()).toBe(401);
    expect((await request.post(`/api/v1/organizations/${church}/checkout`, { data: { planId: church } })).status()).toBe(401);
    expect((await request.post(`/api/v1/organizations/${church}/billing-portal`)).status()).toBe(401);
    expect((await request.get("/api/v1/admin/billing/flagship")).status()).toBe(401);
    expect((await request.put("/api/v1/admin/billing/flagship", { data: { organizationId: church, enabled: true, reason: "test" } })).status()).toBe(401);
  });

  test("AC1 AC7 a member who manages no such church, and who is not an admin, is told 'not found'", async ({ page }) => {
    await signIn(page);
    expect((await page.request.get(`/api/v1/organizations/${church}/entitlement`)).status()).toBe(404);
    expect((await page.request.post(`/api/v1/organizations/${church}/billing-portal`)).status()).toBe(404);
    expect((await page.request.get("/api/v1/admin/billing/flagship")).status()).toBe(404);
    expect((await page.request.put("/api/v1/admin/billing/flagship", { data: { organizationId: church, enabled: true, reason: "test" } })).status()).toBe(404);
  });

  test("the church membership page sends a signed-out visitor to sign in", async ({ page }) => {
    await page.goto(`/manage/${church}/membership`);
    await expect(page).toHaveURL(/sign-in/);
  });
});

// S20 (docs/features/s20-plan-perks.md): what plans include, set by admins.
test.describe("Plan perks (S20)", () => {
  test.skip(!ready, SKIP_REASON);
  const plan = "00000000-0000-4000-8000-000000000001";
  const perk = { key: "ad_free", label: "No ads", accountType: "member" };

  test("AC1 signed out, every perk route answers 401", async ({ request }) => {
    expect((await request.get("/api/v1/admin/billing/perks")).status()).toBe(401);
    expect((await request.post("/api/v1/admin/billing/perks", { data: perk })).status()).toBe(401);
    expect((await request.patch(`/api/v1/admin/billing/perks/${plan}`, { data: { active: false } })).status()).toBe(401);
    expect((await request.get("/api/v1/admin/billing/plan-perks")).status()).toBe(401);
    expect((await request.put(`/api/v1/admin/billing/plans/${plan}/perks`, { data: { perkIds: [] } })).status()).toBe(401);
  });

  test("AC1 a member who is not an admin is told 'not found' by every perk route", async ({ page }) => {
    await signIn(page);
    expect((await page.request.get("/api/v1/admin/billing/perks")).status()).toBe(404);
    expect((await page.request.post("/api/v1/admin/billing/perks", { data: perk })).status()).toBe(404);
    expect((await page.request.get("/api/v1/admin/billing/plan-perks")).status()).toBe(404);
    expect((await page.request.put(`/api/v1/admin/billing/plans/${plan}/perks`, { data: { perkIds: [] } })).status()).toBe(404);
  });

  test("AC5 the member entitlement lists perks, derived on the server", async ({ page }) => {
    await signIn(page);
    const body = await (await page.request.get("/api/v1/me/entitlements")).json();
    expect(Array.isArray(body.data.items[0].perks)).toBe(true);
  });
});
