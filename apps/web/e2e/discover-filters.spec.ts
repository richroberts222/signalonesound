import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

// The finer controls of event search and the event page buttons (docs/user-manual.md sections 3 and 4), against the DEV
// database's demo data. No sign-in. Each filter is proven two ways: the request the screen sends carries the choice, and the
// screen shows what came back. They run only when the E2E environment is configured (`E2E_READY`).
const ready = process.env.E2E_READY === "1";

test.describe("Event search filters and event page buttons (public)", () => {
  test.skip(!ready, "E2E environment not configured (see playwright.config.ts)");

  const searchRequest = (page: Page) => page.waitForRequest((r) => r.url().includes("/api/v1/events?") && r.method() === "GET");
  const params = (url: string) => new URL(url).searchParams;
  const resultCount = (page: Page) => page.locator('[data-testid^="discover-result-"]').count();

  test("how far: the chosen distance is what is searched, and any distance never finds fewer", async ({ page }) => {
    await page.goto("/events");
    await page.getByTestId("discover-place-input").fill("Nashville, TN");
    await page.getByTestId("discover-radius-select").selectOption("10");
    const near = searchRequest(page);
    await page.getByTestId("discover-search-button").click();
    expect(params((await near).url()).get("radius")).toBe("10");
    await expect(page.getByTestId("discover-result-0").or(page.getByTestId("discover-empty"))).toBeVisible();
    const nearCount = await resultCount(page);

    await page.getByTestId("discover-radius-select").selectOption("any");
    const any = searchRequest(page);
    await page.getByTestId("discover-search-button").click();
    expect(params((await any).url()).get("radius")).toBe("any");
    await expect(page.getByTestId("discover-result-0")).toBeVisible();
    expect(await resultCount(page)).toBeGreaterThanOrEqual(nearCount);
  });

  test("when: Next 7 days sends a date window, and a chosen window with nothing in it says so", async ({ page }) => {
    await page.goto("/events");
    await page.getByTestId("discover-date-select").selectOption("week");
    const week = searchRequest(page);
    await page.getByTestId("discover-search-button").click();
    const w = params((await week).url());
    expect(w.get("from")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(w.get("to")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const span = (Date.parse(w.get("to")!) - Date.parse(w.get("from")!)) / 86_400_000;
    expect(span).toBeGreaterThanOrEqual(6);
    expect(span).toBeLessThanOrEqual(7);

    await page.getByTestId("discover-date-select").selectOption("custom");
    await page.getByTestId("discover-date-from").fill("2031-01-01");
    await page.getByTestId("discover-date-to").fill("2031-01-31");
    const custom = searchRequest(page);
    await page.getByTestId("discover-search-button").click();
    const c = params((await custom).url());
    expect([c.get("from"), c.get("to")]).toEqual(["2031-01-01", "2031-01-31"]);
    await expect(page.getByTestId("discover-empty")).toBeVisible();
  });

  test("order by: Most fire is what is asked for", async ({ page }) => {
    await page.goto("/events");
    await page.getByTestId("discover-sort-select").selectOption("fire");
    const request = searchRequest(page);
    await page.getByTestId("discover-search-button").click();
    expect(params((await request).url()).get("sort")).toBe("fire");
    await expect(page.getByTestId("discover-result-0")).toBeVisible();
  });

  test("kind of gathering: a chosen kind is searched, every result has it, and choosing it again clears it", async ({ page }) => {
    await page.goto("/events");
    await page.getByTestId("discover-search-button").click();
    await expect(page.getByTestId("discover-result-0")).toBeVisible();
    // Choose a kind that a real result has, so the check below cannot pass by having nothing to look at.
    const firstCard = await page.getByTestId("discover-result-0").innerText();
    const buttons = page.locator('[data-testid^="discover-type-"]');
    let kind = buttons.first();
    let label = (await kind.innerText()).trim();
    for (let i = 0; i < (await buttons.count()); i++) {
      const text = (await buttons.nth(i).innerText()).trim();
      if (firstCard.includes(text)) {
        kind = buttons.nth(i);
        label = text;
        break;
      }
    }
    await kind.click();
    await expect(kind).toHaveAttribute("aria-pressed", "true");
    const chosen = searchRequest(page);
    await page.getByTestId("discover-search-button").click();
    expect(params((await chosen).url()).get("types")).toBeTruthy();
    // Wait until the list on screen is the filtered one: there are results, and every one of them has the chosen kind.
    await expect
      .poll(async () => {
        const cards = await page.locator('[data-testid^="discover-result-"]').allInnerTexts();
        return cards.length > 0 && cards.every((card) => card.includes(label));
      })
      .toBe(true);

    await kind.click();
    await expect(kind).toHaveAttribute("aria-pressed", "false");
    const cleared = searchRequest(page);
    await page.getByTestId("discover-search-button").click();
    expect(params((await cleared).url()).get("types")).toBeNull();
  });

  test("use my location: with permission it searches near the device, without it asks for a typed place", async ({ browser }) => {
    const allowed = await browser.newContext({ geolocation: { latitude: 36.1627, longitude: -86.7816 }, permissions: ["geolocation"] });
    const page = await allowed.newPage();
    await page.goto("/events");
    const request = searchRequest(page);
    await page.getByTestId("discover-locate-button").click();
    const q = params((await request).url());
    expect(Number(q.get("lat"))).toBeCloseTo(36.16, 1);
    expect(Number(q.get("lng"))).toBeCloseTo(-86.78, 1);
    await expect(page.getByTestId("discover-place-input")).toHaveValue("Near me");
    await allowed.close();

    const denied = await browser.newContext(); // no permission: the browser refuses at once
    const blocked = await denied.newPage();
    await blocked.goto("/events");
    await blocked.getByTestId("discover-locate-button").click();
    await expect(blocked.getByTestId("discover-message")).toContainText("Type a place instead");
    await denied.close();
  });

  test("event page buttons: add to calendar downloads a real calendar file, share says the link was copied, directions opens maps", async ({ browser }) => {
    const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
    const page = await context.newPage();
    await page.goto("/events");
    await page.getByTestId("discover-search-button").click();
    await page.getByTestId("discover-result-0").click();
    await expect(page).toHaveURL(/\/events\/[0-9a-f-]{36}$/);
    const title = (await page.getByRole("heading", { level: 1 }).innerText()).trim();

    const download = page.waitForEvent("download");
    await page.getByTestId("event-calendar").click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("event.ics");
    const text = readFileSync((await file.path())!, "utf8");
    expect(text).toContain("BEGIN:VCALENDAR");
    expect(text).toContain("BEGIN:VEVENT");
    expect(text).toContain(title.slice(0, 15));

    await page.getByTestId("event-share").click();
    await expect(page.getByTestId("event-share-notice")).toContainText("Link copied");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url());

    const href = await page.getByTestId("event-directions").getAttribute("href");
    expect(href).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
    await context.close();
  });
});
