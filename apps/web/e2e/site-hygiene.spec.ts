import { expect, test } from "@playwright/test";

// The standard pages every public site has: a clear "not found" page, a share picture for link previews and a web app
// manifest. They run only when the E2E environment is configured (`E2E_READY`); otherwise they skip with a visible reason.
const ready = process.env.E2E_READY === "1";
const SKIP_REASON = "E2E environment not configured (see playwright.config.ts)";

test.describe("Standard site pages", () => {
  test.skip(!ready, SKIP_REASON);

  test("an address that does not exist shows a plain not-found page with a way home, and answers 404", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "We could not find that page" })).toBeVisible();
    await page.getByTestId("not-found-home").click();
    await expect(page).toHaveURL("/");
  });

  test("the share picture is a real image and the page points to it", async ({ page, request }) => {
    await page.goto("/");
    const href = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(href).toBeTruthy();
    const image = await request.get(new URL(href as string).pathname);
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toMatch(/image\/png/);
  });

  test("the web app manifest names the app and its colors", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest.name).toBe("Signal One Sound");
    expect(manifest.start_url).toBe("/");
    expect(manifest.icons.length).toBeGreaterThan(0);
  });
});
