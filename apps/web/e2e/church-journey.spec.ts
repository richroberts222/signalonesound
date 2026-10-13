import { expect, test, type Page } from "@playwright/test";

import { adminReady, signIn, signInAsAdmin } from "./sign-in";

// One journey with two people (docs/user-manual.md section 8 and docs/admin-manual.md sections 2 and 3):
// a member applies to manage a church, the admin approves the request, the manager posts an event that the
// public can then find, the admin hides it (and it disappears) and restores it, and the manager cancels and deletes it.
// The church and event carry an "e2e" prefix so `pnpm db:cleanup:e2e` removes them (db/tooling/e2e-cleanup.ts).
const ready = process.env.E2E_READY === "1";

test.describe("Church journey (member, admin and the public)", () => {
  test.skip(!ready || !adminReady, "E2E environment or the admin test account is not available (see playwright.config.ts)");
  test.describe.configure({ mode: "serial" });

  const stamp = Date.now().toString(36);
  const churchName = `e2e-church-${stamp}`;
  const eventTitle = `e2e-event-${stamp}`;
  const future = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000);
  const day = future.toISOString().slice(0, 10);
  let member: Page;
  let admin: Page;
  let orgId = "";
  let eventId = "";

  const listed = async (request: import("@playwright/test").APIRequestContext) => {
    const res = await request.get(`/api/v1/events?from=${day}&to=${day}&limit=50`);
    expect(res.status()).toBe(200);
    const items = ((await res.json()) as { data: { items: { id: string; title: string; status?: string }[] } }).data.items;
    return items.find((e) => e.title === eventTitle);
  };
  const eventRow = () => member.getByRole("listitem").filter({ hasText: eventTitle }).first();

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

  test("8.1 a member applies to manage a church: a bad form keeps what was typed, a good one is pending", async () => {
    await member.goto("/claim-church");
    await member.getByTestId("claim-name-input").fill("a"); // too short
    await member.getByTestId("claim-description-input").fill("Created by a browser test");
    await member.getByTestId("claim-email-input").fill("e2e-church@example.com");
    await member.getByTestId("claim-submit").click();
    await expect(member.getByText("Name must be at least 2 characters")).toBeVisible();
    await expect(member.getByText("Add at least 1 link")).toBeVisible();
    await expect(member.getByTestId("claim-description-input")).toHaveValue("Created by a browser test"); // a refused form keeps what was typed
    await member.getByTestId("claim-name-input").fill(churchName);
    await member.getByTestId("claim-link-input-0").fill("https://example.com/e2e-church");
    await member.getByTestId("claim-submit").click();
    await expect(member.getByTestId("claim-pending")).toBeVisible();
  });

  test("8.2 the new church shows in My churches as waiting for review, with no events link yet", async () => {
    await member.goto("/account/organizations");
    const row = member.getByRole("listitem").filter({ hasText: churchName }).first();
    await expect(row).toContainText("Waiting for review");
    await expect(row.locator('a[href$="/events"]')).toHaveCount(0);
  });

  test("2 the admin must give a reason, then approves the request and it leaves the queue", async () => {
    await admin.goto("/admin/manager-requests");
    const item = admin.getByRole("listitem").filter({ hasText: churchName }).first();
    await expect(item).toBeVisible();
    await item.locator('[data-testid^="admin-approve-"]').click();
    await expect(admin.getByTestId("admin-error")).toBeVisible(); // a reason is required
    await expect(item).toBeVisible();
    await item.getByTestId("admin-reason-input").fill("e2e journey approval");
    await item.locator('[data-testid^="admin-approve-"]').click();
    await expect(admin.getByRole("listitem").filter({ hasText: churchName })).toHaveCount(0);
  });

  test("8.2 the manager now manages the church and can open its events", async () => {
    await member.goto("/account/organizations");
    const row = member.getByRole("listitem").filter({ hasText: churchName }).first();
    await expect(row).toContainText("You manage this");
    const href = await row.locator('a[href$="/events"]').getAttribute("href");
    orgId = /\/manage\/([0-9a-f-]{36})\/events/.exec(href ?? "")?.[1] ?? "";
    expect(orgId).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("8.4 posting an event: an empty form is refused and keeps what was typed; a full one is published", async () => {
    await member.goto(`/manage/${orgId}/events/new`);
    await member.getByTestId("event-title-input").fill(eventTitle);
    await member.getByTestId("event-publish").click();
    await expect(member.getByTestId("event-error")).toBeVisible();
    await expect(member.getByTestId("event-title-input")).toHaveValue(eventTitle);
    await member.getByTestId("event-start-input").fill(`${day}T18:00`);
    await member.getByTestId("event-timezone-select").selectOption("America/Chicago");
    await member.getByTestId("event-venue-input").fill("E2E Hall");
    await member.getByTestId("event-street-input").fill("1 Main Street");
    await member.getByTestId("event-city-input").fill("Nashville");
    await member.getByTestId("event-state-select").selectOption("TN");
    await member.getByTestId("event-zip-input").fill("37203");
    await member.locator('[data-testid^="event-type-"]').first().click(); // at least one revival type is required
    const saved = member.waitForResponse((r) => r.url().includes(`/api/v1/organizations/${orgId}/events`) && r.request().method() === "POST");
    await member.getByTestId("event-publish").click();
    expect((await saved).status()).toBeLessThan(300);
    await member.goto(`/manage/${orgId}/events`);
    await expect(eventRow().getByTestId(/event-status-/)).toHaveText("Published");
  });

  test("4 the public can find the event, open its page and see the church", async ({ request, browser }) => {
    const found = await listed(request);
    expect(found, "the published event is in the public search").toBeDefined();
    eventId = found!.id;
    const visitor = await (await browser.newContext()).newPage(); // nobody signed in
    const res = await visitor.goto(`/events/${eventId}`);
    expect(res?.status()).toBe(200);
    await expect(visitor.getByRole("heading", { level: 1 })).toContainText(eventTitle);
    await expect(visitor.getByTestId("event-church-link")).toContainText(churchName);
    await visitor.context().close();
  });

  test("3 the admin hides the event: the public no longer finds it; restoring brings it back", async ({ request, browser }) => {
    await admin.goto("/admin/moderation");
    await admin.getByTestId("admin-target-input").fill(eventId);
    await admin.getByTestId("admin-target-reason").fill("e2e journey hide");
    await admin.getByTestId("admin-hide-event").click();
    await expect(admin.getByTestId("moderation-notice")).toContainText("Event hidden");
    expect(await listed(request)).toBeUndefined();
    const visitor = await (await browser.newContext()).newPage();
    expect((await visitor.goto(`/events/${eventId}`))?.status()).toBe(404);

    await admin.getByTestId("admin-restore-event").click();
    await expect(admin.getByTestId("moderation-notice")).toContainText("Event restored");
    expect(await listed(request)).toBeDefined();
    expect((await visitor.goto(`/events/${eventId}`))?.status()).toBe(200);
    await visitor.context().close();
  });

  test("8.5 the manager cancels the event: the public sees it as cancelled", async ({ browser }) => {
    await member.goto(`/manage/${orgId}/events`);
    await eventRow().locator('[data-testid^="event-cancel-"]').click();
    await expect(member.getByTestId("events-notice")).toContainText("Cancelled");
    await expect(eventRow().getByTestId(/event-status-/)).toHaveText("Cancelled");
    const visitor = await (await browser.newContext()).newPage();
    await visitor.goto(`/events/${eventId}`);
    await expect(visitor.getByText("Cancelled").first()).toBeVisible();
    await visitor.context().close();
  });

  test("8.5 the manager deletes the event after confirming: it is gone for the public", async ({ request, browser }) => {
    await member.goto(`/manage/${orgId}/events`);
    await eventRow().locator('[data-testid^="event-delete-"]').first().click();
    await eventRow().locator('[data-testid^="event-delete-cancel-"]').click(); // changing their mind keeps it
    await expect(eventRow()).toBeVisible();
    await eventRow().locator('[data-testid^="event-delete-"]').first().click();
    await eventRow().locator('[data-testid^="event-delete-confirm-"]').click();
    await expect(member.getByTestId("events-notice")).toContainText("Deleted");
    expect(await listed(request)).toBeUndefined();
    const visitor = await (await browser.newContext()).newPage();
    expect((await visitor.goto(`/events/${eventId}`))?.status()).toBe(404);
    await visitor.context().close();
  });
});
