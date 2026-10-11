import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { signIn } from "./sign-in";

// Accessibility scan for the launch gate (docs/features/s9-launch-gate.md, AC1): axe reports no serious or critical
// violation of WCAG 2.0 and 2.1 A and AA or 2.2 AA on any page. It covers the public pages on a desktop and a phone
// screen, and the signed-in pages. They run only when the E2E environment is configured (`E2E_READY`, set by
// playwright.config.ts after its fail-closed dev/qa checks); otherwise they skip with a visible reason.
//
// Not covered here, by their nature: the keyboard-only pass and the screen-reader pass (AC1 asks for both, logged by
// hand), and pages that need a church to manage (the manage pages), which are scanned with the event form when
// the browser tests have an organizer account.
const ready = process.env.E2E_READY === "1";
const SKIP_REASON = "E2E environment not configured (see playwright.config.ts)";
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const PUBLIC_PAGES = ["/", "/events", "/discover", "/fire-map", "/fire-map?sample=1", "/about", "/services", "/faq", "/contact", "/privacy", "/terms", "/sign-in", "/sign-up"];
const SIGNED_IN_PAGES = ["/account", "/saved", "/alerts", "/dashboard", "/claim-church"];

async function violations(page: Page, path: string): Promise<string[]> {
  await page.goto(path, { waitUntil: "networkidle" });
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return results.violations
    .map((v) => ({
      ...v,
      // Clerk's own "Secured by Clerk" label on the sign-in cards is measured against our glowing page background; it is
      // third-party text we cannot restyle, so exactly that one element is left out and nothing else on those pages.
      nodes: v.nodes.filter((n) => !n.html.includes("Secured by")),
    }))
    .filter((v) => v.nodes.length > 0 && (v.impact === "serious" || v.impact === "critical"))
    .map((v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0].target.join(" ")}`);
}

test.describe("Accessibility scan (axe)", () => {
  test.skip(!ready, SKIP_REASON);

  for (const path of PUBLIC_PAGES) {
    test(`AC1 ${path} has no serious or critical violations on a desktop screen`, async ({ page }) => {
      expect(await violations(page, path)).toEqual([]);
    });
  }

  test.describe("on a phone-sized screen", () => {
    test.use({ viewport: { width: 390, height: 780 } });
    for (const path of PUBLIC_PAGES) {
      test(`AC1 ${path} has no serious or critical violations on a phone`, async ({ page }) => {
        expect(await violations(page, path)).toEqual([]);
      });
    }
  });

  test.describe("signed in", () => {
    for (const path of SIGNED_IN_PAGES) {
      test(`AC1 ${path} has no serious or critical violations`, async ({ page }) => {
        await signIn(page);
        expect(await violations(page, path)).toEqual([]);
      });
    }
  });
});
