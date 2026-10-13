import { expect, test, type Page } from "@playwright/test";

import { adminReady, signIn, signInAsAdmin } from "./sign-in";

// A manager's weekly event series and editing it (docs/user-manual.md sections 8.4 and 8.5), and the admin giving the church
// a free-for-life place (docs/admin-manual.md section 6.5). The church carries an "e2e-church-" prefix and everything it owns is
// removed by `pnpm db:cleanup:e2e` (db/tooling/e2e-cleanup.ts); the place is also given back by the test itself.
const ready = process.env.E2E_READY === "1";

test.describe("Manager events and free for life", () => {
  test.skip(!ready || !adminReady, "E2E environment or the admin test account is not available (see playwright.config.ts)");
  test.describe.configure({ mode: "serial" });

  const stamp = Date.now().toString(36);
  const churchName = `e2e-church-${stamp}-ev`;
  const title = `e2e-event-${stamp}`;
  const first = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000);
  const day = first.toISOString().slice(0, 10);
  const until = new Date(first.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // four Sundays-or-whatever: day, +7, +14, +21
  let member: Page;
  let admin: Page;
  let orgId = "";

  const rows = (text: string) => member.getByRole("listitem").filter({ hasText: text });
  const status = async () => ((await (await member.request.get(`/api/v1/organizations/${orgId}/entitlement`)).json()) as { data: { status: string } }).data.status;

  test.beforeAll(async ({ browser }) => {
    member = await (await browser.newContext()).newPage();
    admin = await (await browser.newContext()).newPage();
    await signIn(member);
    await signInAsAdmin(admin);
  });

  test.afterAll(async () => {
    await member.context().close();
    await admin.context().close();
  });

  test("setup: the member applies, the admin approves, and the member manages the church", async () => {
    await member.goto("/claim-church");
    await member.getByTestId("claim-name-input").fill(churchName);
    await member.getByTestId("claim-link-input-0").fill("https://example.com/e2e-church");
    await member.getByTestId("claim-email-input").fill("e2e-church@example.com");
    await member.getByTestId("claim-submit").click();
    await expect(member.getByTestId("claim-pending")).toBeVisible();
    await admin.goto("/admin/manager-requests");
    const item = admin.getByRole("listitem").filter({ hasText: churchName }).first();
    await item.getByTestId("admin-reason-input").fill("e2e approve");
    await item.locator('[data-testid^="admin-approve-"]').click();
    await expect(admin.getByRole("listitem").filter({ hasText: churchName })).toHaveCount(0);
    await member.goto("/account/organizations");
    const href = await member.getByRole("listitem").filter({ hasText: churchName }).first().locator('a[href$="/events"]').getAttribute("href");
    orgId = /\/manage\/([0-9a-f-]{36})\/events/.exec(href ?? "")?.[1] ?? "";
    expect(orgId).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("6.5 free for life: the admin gives the church a place (the count goes up and the church shows as active), then takes it back", async () => {
    const used = async () => Number(((await admin.getByTestId("flagship-count").innerText()).match(/(\d+) of \d+ places/) ?? ["", "-1"])[1]);
    expect(await status()).toBe("none");
    await admin.goto("/admin/billing");
    await expect(admin.getByTestId("flagship-count")).toContainText("places used");
    const before = await used();
    await admin.getByTestId("flagship-org").fill(orgId);
    await admin.getByTestId("flagship-reason").fill("e2e flagship");
    await admin.getByTestId("flagship-enable").click();
    await expect(admin.getByTestId("billing-notice")).toContainText("place given");
    await expect.poll(used).toBe(before + 1);
    expect(await status()).toBe("active");

    await admin.getByTestId("flagship-org").fill(orgId);
    await admin.getByTestId("flagship-reason").fill("e2e flagship back");
    await admin.getByTestId("flagship-disable").click();
    await expect(admin.getByTestId("billing-notice")).toContainText("place removed");
    await expect.poll(used).toBe(before);
    expect(await status()).toBe("none");
  });

  test("8.4 a weekly series: one form makes four events, shown as repeating", async () => {
    await member.goto(`/manage/${orgId}/events/new`);
    await member.getByTestId("event-title-input").fill(title);
    await member.getByTestId("event-start-input").fill(`${day}T18:00`);
    await member.getByTestId("event-timezone-select").selectOption("America/Chicago");
    await member.getByTestId("event-venue-input").fill("E2E Hall");
    await member.getByTestId("event-street-input").fill("1 Main Street");
    await member.getByTestId("event-city-input").fill("Nashville");
    await member.getByTestId("event-state-select").selectOption("TN");
    await member.getByTestId("event-zip-input").fill("37203");
    await member.locator('[data-testid^="event-type-"]').first().click();
    await member.getByTestId("event-recurrence-select").selectOption("weekly");
    await member.getByTestId("event-until-input").fill(until);
    const saved = member.waitForResponse((r) => r.url().includes(`/api/v1/organizations/${orgId}/events`) && r.request().method() === "POST");
    await member.getByTestId("event-publish").click();
    expect((await saved).status()).toBeLessThan(300);
    await member.goto(`/manage/${orgId}/events`);
    await expect(rows(title)).toHaveCount(4);
    await expect(rows(title).first()).toContainText("Repeats");
  });

  test("8.5 editing: change one event only, then change this event and the later ones", async () => {
    const edit = async (index: number, newTitle: string, scope: "this" | "series") => {
      await member.goto(`/manage/${orgId}/events`);
      await member.locator('[data-testid^="event-edit-"]').nth(index).click();
      await member.waitForURL(/\/manage\/events\/[0-9a-f-]{36}/);
      await member.getByTestId("event-title-input").fill(newTitle);
      await member.getByTestId(`event-scope-${scope}`).click();
      await member.waitForURL(new RegExp(`/manage/${orgId}/events$`));
    };
    await edit(0, `${title}-first`, "this");
    await expect(rows(`${title}-first`)).toHaveCount(1);
    await expect(rows(title).filter({ hasNotText: "-first" })).toHaveCount(3); // the other three are untouched

    await edit(1, `${title}-later`, "series");
    await expect(rows(`${title}-first`)).toHaveCount(1); // the earlier one keeps its name
    await expect(rows(`${title}-later`)).toHaveCount(3); // this one and the ones after it changed
  });
});
