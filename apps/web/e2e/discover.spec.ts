import { expect, test } from "@playwright/test";

// Browser journeys for finding events (S4 AC, docs/features/s4-discover-web.md) against the DEV database's
// demo data (`pnpm --filter web db:seed:demo --env=dev`): sample churches are labeled "(Sample)". They need
// no sign-in. They run only when the E2E environment is configured (`E2E_READY`, set by playwright.config.ts
// after its fail-closed dev/qa checks); otherwise they skip with a visible reason and never pass silently.
const ready = process.env.E2E_READY === "1";
test.describe("Discover events (public)", () => {
  test.skip(!ready, "E2E environment not configured (see playwright.config.ts)");

  test("a visitor can browse upcoming events without signing in and open one", async ({ page }) => {
    await page.goto("/events");
    await page.getByTestId("discover-search-button").click(); // the page lists events when asked, with no place chosen
    const first = page.getByTestId("discover-result-0");
    await expect(first).toBeVisible();
    const title = (await first.innerText()).split("\n")[0];
    await first.click();
    await expect(page).toHaveURL(/\/events\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(title.slice(0, 20));
    await expect(page.getByTestId("event-when")).toBeVisible();
    await expect(page.getByTestId("event-church-link")).toContainText("(Sample)");
  });

  test("searching a place with sample churches shows events near it", async ({ page }) => {
    await page.goto("/events");
    await page.getByTestId("discover-place-input").fill("Nashville, TN");
    await page.getByTestId("discover-search-button").click();
    await expect(page.getByTestId("discover-result-0")).toBeVisible();
    await expect(page.getByTestId("discover-error")).toHaveCount(0);
  });

  test("a place with no sample churches shows the empty state, not an error", async ({ page }) => {
    await page.goto("/events");
    await page.getByTestId("discover-place-input").fill("Anchorage, AK");
    await page.getByTestId("discover-search-button").click();
    await expect(page.getByTestId("discover-empty")).toBeVisible();
    await expect(page.getByTestId("discover-error")).toHaveCount(0);
  });

  test("the public events API answers with the shared envelope and sample data", async ({ request }) => {
    const res = await request.get("/api/v1/events?limit=5");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok: boolean; data: { items: { id: string; title: string }[] } };
    expect(body.ok).toBe(true);
    expect(body.data.items.length).toBeGreaterThan(0);
    for (const item of body.data.items) expect(item.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i); // strict UUIDs, the bug the phone found
  });
});
