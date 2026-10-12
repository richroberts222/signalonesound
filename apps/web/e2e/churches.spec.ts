import { expect, test } from "@playwright/test";

// Browser journeys for Find a Church (S18, docs/features/s18-find-a-church.md). They need no sign-in. They run only when
// the E2E environment is configured (`E2E_READY`, set by playwright.config.ts after its fail-closed dev/qa checks);
// otherwise they skip with a visible reason and never pass silently. The tests never write to the database: they read
// whatever approved churches the development data holds (the sample churches).
const ready = process.env.E2E_READY === "1";
const SKIP_REASON = "E2E environment not configured (see playwright.config.ts)";

test.describe("Find a Church", () => {
  test.skip(!ready, SKIP_REASON);

  test("AC9 Find a Church is in the menu, the footer and the home page, and each opens the page", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("home-find-church").click();
    await expect(page).toHaveURL(/\/churches$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Find a");
    await page.goto("/about");
    await page.getByTestId("footer-churches").click();
    await expect(page).toHaveURL(/\/churches$/);
    await page.getByRole("link", { name: "Find a Church" }).first().click();
    await expect(page).toHaveURL(/\/churches$/);
  });

  test("AC4 AC5 AC3 a search near a place lists churches with their next services, and a result opens the church with its regular services", async ({ page }) => {
    await page.goto("/churches?place=Boise%2C+ID&radius=25");
    await expect(page.getByTestId("churches-summary")).toContainText("Boise");
    const first = page.getByTestId("church-result-0");
    test.skip((await first.count()) === 0, "No churches with a pin near Boise in the development data");
    await expect(page.getByTestId("church-result-services-0")).toContainText(/Next:|Service times not added yet/);
    await expect(first).toContainText("miles away");
    await first.click();
    await expect(page).toHaveURL(/\/churches\/[0-9a-f-]{36}$/);
    await expect(page.getByTestId("church-services")).toBeVisible();
    await expect(page.getByTestId("church-address")).toContainText("Boise");
    await expect(page.getByTestId("church-directions")).toHaveAttribute("href", /google\.com\/maps/);
    await expect(page.getByTestId("church-share")).toBeVisible();
  });

  test("AC4 searching by name works without a place, and a name that matches nothing says so plainly", async ({ page }) => {
    await page.goto("/churches?q=zzzznotachurch");
    await expect(page.getByTestId("churches-empty")).toBeVisible();
    await expect(page.getByTestId("churches-join-link")).toHaveAttribute("href", "/claim-church");
    await page.goto("/churches?q=sample");
    await expect(page.getByTestId("churches-summary")).toContainText("sample");
  });

  test("a place that cannot be found is said plainly and the list still shows", async ({ page }) => {
    await page.goto("/churches?place=Nowhereville+Zz");
    await expect(page.getByTestId("churches-place-not-found")).toBeVisible();
    await expect(page.getByTestId("churches-summary")).toBeVisible();
  });

  test("the search form works without JavaScript: it is a plain GET form", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/churches");
    await page.getByTestId("churches-search-input").fill("Boise, ID");
    await page.getByTestId("churches-search-submit").click();
    await expect(page).toHaveURL(/place=Boise/);
    await expect(page.getByTestId("churches-summary")).toContainText("Boise");
    await context.close();
  });

  test("AC6 a church page for an id that is not a church is a plain not found", async ({ page }) => {
    const res = await page.goto("/churches/00000000-0000-4000-8000-000000000000");
    expect(res?.status()).toBe(404);
  });

  test("the public church API answers with the shared envelope and never shows who manages a church", async ({ request }) => {
    const res = await request.get("/api/v1/churches?q=sample&limit=5");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data.items)).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/user_|contactEmail/);
    expect((await request.get("/api/v1/churches?lat=5")).status()).toBe(400);
  });

  test("saving a church profile needs a sign-in: the API refuses a signed-out caller", async ({ request }) => {
    const id = "00000000-0000-4000-8000-000000000000";
    expect((await request.put(`/api/v1/organizations/${id}/profile`, { data: {} })).status()).toBe(401);
    expect((await request.put(`/api/v1/organizations/${id}/services`, { data: { services: [] } })).status()).toBe(401);
  });
});
