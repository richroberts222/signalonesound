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

