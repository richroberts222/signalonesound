import { expect, test } from "@playwright/test";

// Browser journeys for the Fire Map (S16, docs/features/s16-fire-map.md). They need no sign-in. They run only when
// the E2E environment is configured (`E2E_READY`, set by playwright.config.ts after its fail-closed dev/qa checks);
// otherwise they skip with a visible reason and never pass silently. The tests never touch the database; the map
// shows whatever published events the development data holds.
const ready = process.env.E2E_READY === "1";
const SKIP_REASON = "E2E environment not configured (see playwright.config.ts)";

test.describe("Fire Map", () => {
  test.skip(!ready, SKIP_REASON);

  test("AC6 AC8 the page shows the world map and the three numbers, and the tabs switch to the United States", async ({ page }) => {
    await page.goto("/fire-map");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Fire");
    await expect(page.getByTestId("fire-map-world")).toBeVisible();
    await expect(page.getByTestId("fire-map-count-world")).toBeVisible();
    await expect(page.getByTestId("fire-map-regions-world")).toContainText("of");
    await expect(page.getByTestId("fire-map-land-world")).toContainText("%");
    await expect(page.getByTestId("fire-map-us")).toBeHidden();
    await page.getByTestId("fire-map-tab-us").click();
    await expect(page.getByTestId("fire-map-us")).toBeVisible();
    await expect(page.getByTestId("fire-map-regions-us")).toContainText("of 51");
    await expect(page.getByTestId("fire-map-world")).toBeHidden();
  });

  test("AC7 a fire on the map is a link that opens its event", async ({ page }) => {
    await page.goto("/fire-map");
    const fire = page.getByTestId("fire-0").first();
    test.skip((await fire.count()) === 0, "No fires in the development data");
    await expect(fire).toHaveAttribute("href", /^\/events\/[0-9a-f-]{36}$/);
    await fire.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/events\/[0-9a-f-]{36}$/);
  });

  test("AC8 AC9 the method note and the text list of regions are on the page", async ({ page }) => {
    await page.goto("/fire-map");
    await page.getByTestId("fire-map-method").locator("summary").click();
    await expect(page.getByTestId("fire-map-method")).toContainText("Land under fire");
    await expect(page.getByTestId("fire-map-list")).toBeVisible();
  });

  test("AC12 the Fire Map link is in the footer and opens the page", async ({ page }) => {
    await page.goto("/about");
    await page.getByTestId("footer-fire-map").click();
    await expect(page).toHaveURL(/\/fire-map$/);
  });
});
