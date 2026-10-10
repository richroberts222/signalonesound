import { expect, test } from "@playwright/test";

// Browser journeys for the public pages (S15, docs/features/s15-public-pages.md). They need no sign-in. They
// run only when the E2E environment is configured (`E2E_READY`, set by playwright.config.ts after its
// fail-closed dev/qa checks); otherwise they skip with a visible reason and never pass silently. The contact
// form journeys run when the dev server has CONTACT_FORM_ENABLED=on, and the "closed form" journey when it
// does not, so both states are covered.
const ready = process.env.E2E_READY === "1";
const formOn = process.env.CONTACT_FORM_ENABLED?.trim().toLowerCase() === "on";
const SKIP_REASON = "E2E environment not configured (see playwright.config.ts)";
// The messages these journeys send are named with this prefix; `pnpm --filter web db:cleanup:e2e --env=dev` removes them
// (the CI workflow runs it afterwards). The tests themselves never touch the database.
const PREFIX = "e2e-contact-";

test.describe("Public pages", () => {
  test.skip(!ready, SKIP_REASON);

  test("AC1 the landing page's search box opens the real search with the typed place and shows results", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("home-place-input").fill("Nashville, TN");
    await page.getByTestId("home-search-button").click();
    await expect(page).toHaveURL(/\/events\?place=Nashville/);
    await expect(page.getByTestId("discover-place-input")).toHaveValue(/Nashville/);
    await expect(page.getByTestId("discover-result-0")).toBeVisible();
  });

  test("AC1 the landing page's browse button opens the real search, not the mock", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("home-discover-button").click();
    await expect(page).toHaveURL(/\/events$/);
    await expect(page.getByTestId("discover-search-button")).toBeVisible();
  });

  test("AC2 the landing page labels its example events as examples and makes no claims about numbers", async ({ page }) => {
    await page.goto("/");
    for (const i of [0, 1, 2]) {
      const card = page.getByTestId(`home-example-${i}`);
      await expect(card).toContainText("Example");
    }
    await expect(page.locator("main")).not.toContainText(/testimonial|5-star|trusted by|\d+,\d{3} (users|members|churches)/i);
  });

  test("AC10 the old mock Discover address sends a visitor to the real search", async ({ page }) => {
    await page.goto("/discover");
    await expect(page).toHaveURL(/\/events$/);
  });

  test("AC4 the Services page lists what is free and what is coming, and prices come only from active plans", async ({ page }) => {
    await page.goto("/services");
    await expect(page.getByRole("heading", { level: 1, name: "Services" })).toBeVisible();
    await expect(page.getByTestId("services-members-free")).toBeVisible();
    await expect(page.getByTestId("services-churches-coming")).toBeVisible();
    await expect(page.getByTestId("services-pricing-free").or(page.getByTestId("services-pricing-list"))).toBeVisible();
    const plans = await (await page.request.get("/api/v1/plans")).json();
    expect(plans.ok).toBe(true);
    for (const plan of plans.data.items) expect(plan.active, "the public list never includes an inactive plan").toBe(true);
  });

  test("AC5 the About page carries the mission, the vision and the scripture", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByTestId("about-mission")).toContainText("Connect believers");
    await expect(page.getByTestId("about-vision")).toContainText("largest Christian revival discovery platform");
    await expect(page.locator("blockquote")).toContainText("Isaiah 40:3");
  });

  test("AC6 the FAQ lists at least 12 questions and each opens to show its answer", async ({ page }) => {
    await page.goto("/faq");
    expect(await page.locator("[data-testid^='faq-item-']").count()).toBeGreaterThanOrEqual(12);
    const first = page.getByTestId("faq-item-0");
    await expect(first.locator("p")).toBeHidden();
    await page.getByTestId("faq-question-0").click();
    await expect(first.locator("p")).toBeVisible();
  });

  test("AC10 every public page is linked from the footer", async ({ page }) => {
    await page.goto("/");
    for (const [testId, path] of [["footer-about", "/about"], ["footer-services", "/services"], ["footer-faq", "/faq"], ["footer-contact", "/contact"]] as const) {
      await expect(page.getByTestId(testId)).toHaveAttribute("href", path);
    }
  });

  test("AC7 the Contact page always shows the address as a mail link", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByTestId("contact-email")).toHaveAttribute("href", "mailto:contact@signalonesound.com");
  });
});

test.describe("Contact form", () => {
  test.skip(!ready, SKIP_REASON);

  test("AC7 AC8 a closed form is not shown and the API refuses with 'not found'", async ({ page, request }) => {
    test.skip(formOn, "the form is switched on in this environment");
    await page.goto("/contact");
    await expect(page.getByTestId("contact-form")).toHaveCount(0);
    const res = await request.post("/api/v1/contact", { data: { topic: "question", name: "Pat", message: "A message that is long enough." } });
    expect(res.status()).toBe(404);
  });

  test.describe("when the form is switched on", () => {
    test.skip(!formOn, "set CONTACT_FORM_ENABLED=on to run the open-form journeys");

    test("AC8 a visitor can send a message and sees a thank-you; a bad one shows the exact problem", async ({ page }) => {
      await page.goto("/contact");
      await page.getByTestId("contact-name").fill(`${PREFIX}${Date.now()}`);
      await page.getByTestId("contact-message").fill("short");
      await page.getByTestId("contact-send").click();
      await expect(page.getByTestId("contact-error")).toContainText("at least 10 characters");
      await page.getByTestId("contact-message").fill("Do you list tent revivals in Idaho? Thank you.");
      await page.getByTestId("contact-send").click();
      await expect(page.getByTestId("contact-thanks")).toBeVisible();
    });

    test("AC8 the hidden trap field drops a bot's message without telling it", async ({ page, request }) => {
      const res = await request.post("/api/v1/contact", { data: { topic: "question", name: `${PREFIX}bot`, message: "I am a bot sending spam links.", website: "http://spam.example" } });
      expect(res.status()).toBe(200);
      expect(await res.json()).toMatchObject({ ok: true, data: { received: true } });
      await page.goto("/contact");
      await expect(page.getByTestId("contact-website")).toBeAttached(); // present for bots, out of sight and reach for people
    });

    test("AC9 the Messages inbox API refuses a signed-out caller", async ({ request }) => {
      expect((await request.get("/api/v1/admin/contact-messages")).status()).toBe(401);
    });
  });
});
