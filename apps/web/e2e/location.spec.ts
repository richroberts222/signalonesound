import { expect, test } from "@playwright/test";

// Browser journeys for the event location picker (S17, docs/features/s17-event-location.md). They run only when the
// E2E environment is configured (`E2E_READY`, set by playwright.config.ts after its fail-closed dev/qa checks);
// otherwise they skip with a visible reason and never pass silently.
//
// The picker itself is on the signed-in organizer form. What is proved here is the privacy rule that goes with it:
// the public pages never contact the map service, so a visitor's browser tells it nothing.
const ready = process.env.E2E_READY === "1";
const SKIP_REASON = "E2E environment not configured (see playwright.config.ts)";
const MAP_HOSTS = /(^|\.)(openstreetmap\.org|maptiler\.com|mapbox\.com|maps\.googleapis\.com)$/i;

test.describe("Event location picker", () => {
  test.skip(!ready, SKIP_REASON);

  for (const path of ["/", "/events", "/churches", "/fire-map", "/fire-map?sample=1", "/about", "/faq", "/privacy"]) {
    test(`AC7 ${path} makes no request to a map service`, async ({ page }) => {
      const contacted: string[] = [];
      page.on("request", (request) => {
        const host = new URL(request.url()).hostname;
        if (MAP_HOSTS.test(host)) contacted.push(request.url());
      });
      await page.goto(path, { waitUntil: "networkidle" });
      expect(contacted).toEqual([]);
    });
  }
});
