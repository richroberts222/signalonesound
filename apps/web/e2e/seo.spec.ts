import { expect, test } from "@playwright/test";

// Search-engine files (S9): robots.txt and sitemap.xml are public. They run only when the E2E environment is
// configured (`E2E_READY`); otherwise they skip with a visible reason. The test environment is not production, so
// robots.txt must ask crawlers to stay away entirely (a test copy of the site is never listed).
const ready = process.env.E2E_READY === "1";
const SKIP_REASON = "E2E environment not configured (see playwright.config.ts)";

test.describe("Search-engine files", () => {
  test.skip(!ready, SKIP_REASON);

  test("robots.txt is public and, outside production, asks crawlers to stay away", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/User-Agent: \*/i);
    expect(text).toMatch(/Disallow: \/\s*$/m);
    expect(text).not.toMatch(/Sitemap:/i);
  });

  test("sitemap.xml is public XML that lists the public pages and no private one", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/xml/);
    const xml = await res.text();
    expect(xml).toContain("<urlset");
    for (const path of ["/", "/events", "/fire-map", "/about", "/privacy"]) expect(xml).toContain(`${path}</loc>`);
    expect(xml).not.toMatch(/<loc>[^<]*\/(api|manage|dashboard|admin|account|saved|alerts|invite|unsubscribe|sign-in|sign-up)(\/|<)/);
  });
});
