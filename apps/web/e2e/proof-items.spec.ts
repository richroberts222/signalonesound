import { expect, test, type Page } from "@playwright/test";

import { signIn } from "./sign-in";

// First real browser journey through the vertical slice (Issue 49):
// browser -> Next.js -> Clerk session -> /api/v1/proof-items -> validation ->
// service -> repository -> Drizzle -> DEV Postgres, and back through the UI.
// Requires the E2E environment described in playwright.config.ts; otherwise the
// tests skip with a visible reason (they are never silently "passed").
// `E2E_READY` is set by playwright.config.ts only after the environment passed
// its fail-closed dev/qa checks.
const ready = process.env.E2E_READY === "1";
const SKIP_REASON =
  "E2E environment not configured (DATABASE_*, Clerk dev keys, E2E_CLERK_USER_EMAIL); see playwright.config.ts";

const PREFIX = "e2e-proof-";
const API = "/api/v1/proof-items";

type Listed = { ok: true; data: { items: { id: string; label: string }[] } };

// Removes this suite's leftovers through the API as the signed-in test user.
async function cleanup(page: Page) {
  const res = await page.request.get(API);
  if (!res.ok()) return;
  const body = (await res.json()) as Listed;
  for (const item of body.data.items.filter((i) => i.label.startsWith(PREFIX))) {
    await page.request.delete(`${API}?id=${item.id}`);
  }
}

test.describe("proof items: unauthenticated", () => {
  test.skip(!ready, SKIP_REASON);

  test("the API refuses anonymous callers with the standard 401 envelope", async ({ request }) => {
    const res = await request.get(API);
    expect(res.status()).toBe(401);
    expect(res.headers()["x-api-version"]).toBe("v1");
    expect(await res.json()).toMatchObject({ ok: false, error: { code: "unauthenticated" } });
  });

  test("the page is protected: anonymous visitors are sent to sign in", async ({ page }) => {
    await page.goto("/proof");
    // Clerk first runs a dev-browser handshake on its own domain, then lands on /sign-in.
    await expect(page).toHaveURL(/sign-in|clerk\.accounts\.dev/);
    await expect(page.getByRole("heading", { name: "Proof items" })).toHaveCount(0);
  });
});

test.describe("proof items: signed-in journey", () => {
  test.skip(!ready, SKIP_REASON);

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await cleanup(page);
  });
  test.afterEach(async ({ page }) => {
    await cleanup(page);
  });

  test("validate, create, persist across reload, reject duplicate, delete", async ({ page }) => {
    const label = `${PREFIX}${Date.now()}`;
    await page.goto("/proof");
    await expect(page.getByText("No items yet.")).toBeVisible();

    // Validation: blank label is rejected by the server (400) and shown in the UI.
    const invalid = page.waitForResponse((r) => r.url().includes(API) && r.request().method() === "POST");
    await page.getByRole("button", { name: "Add item" }).click();
    expect((await invalid).status()).toBe(400);
    await expect(page.getByText("Label is required").first()).toBeVisible();
    await expect(page.getByText("No items yet.")).toBeVisible();

    // Create: request body, 200 response, UI state.
    await page.getByLabel("Label").fill(label);
    const created = page.waitForResponse((r) => r.url().includes(API) && r.request().method() === "POST");
    await page.getByRole("button", { name: "Add item" }).click();
    const createdRes = await created;
    expect(createdRes.status()).toBe(200);
    expect(createdRes.request().postDataJSON()).toEqual({ label });
    await expect(page.getByRole("status")).toContainText(`Created "${label}"`);
    await expect(page.getByRole("list", { name: "Proof items" })).toContainText(label);

    // Persistence: survives a full reload (read back through the API from the database).
    await page.reload();
    await expect(page.getByRole("list", { name: "Proof items" })).toContainText(label);
    const api = (await (await page.request.get(API)).json()) as Listed;
    expect(api.data.items.map((i) => i.label)).toContain(label);

    // Conflict: same label again is a generic 409 shown without internals.
    await page.getByLabel("Label").fill(label);
    const dup = page.waitForResponse((r) => r.url().includes(API) && r.request().method() === "POST");
    await page.getByRole("button", { name: "Add item" }).click();
    expect((await dup).status()).toBe(409);
    await expect(page.getByRole("alert").filter({ hasText: "Conflict" })).toHaveText("Conflict");
    await expect(page.getByRole("list", { name: "Proof items" }).getByText(label)).toHaveCount(1);

    // Delete: request, UI state, and database state.
    const deleted = page.waitForResponse((r) => r.url().includes(API) && r.request().method() === "DELETE");
    await page.getByRole("button", { name: `Delete ${label}` }).click();
    expect((await deleted).status()).toBe(200);
    await expect(page.getByRole("status")).toHaveText("Deleted");
    await expect(page.getByText(label)).toHaveCount(0);
    const after = (await (await page.request.get(API)).json()) as Listed;
    expect(after.data.items.map((i) => i.label)).not.toContain(label);
  });
});
