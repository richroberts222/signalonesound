import { expect, test, type Page } from "@playwright/test";

import { adminReady, memberReady, signInAsAdmin, signInAsThrowawayMember } from "./sign-in";

// One journey for an ordinary member (docs/user-manual.md sections 4, 6, 7 and 9), signed in as a throwaway test member
// that the journey deletes at the end, which also proves that deleting an account takes the person out for good.
// Along the way: save an event and take it off the list, light a fire, report an event (the admin then decides the report),
// make and remove an alert, change settings, download the data, make an invite link that a visitor can open.
// The report carries an "e2e-report" mark so `pnpm db:cleanup:e2e` removes it (db/tooling/e2e-cleanup.ts).
const ready = process.env.E2E_READY === "1";

test.describe("Member journey (a throwaway member)", () => {
  test.skip(!ready || !memberReady || !adminReady, "E2E environment or the throwaway member / admin accounts are not available (see playwright.config.ts)");
  test.describe.configure({ mode: "serial" });

  const stamp = Date.now().toString(36);
  const reportMark = `e2e-report ${stamp}`;
  let member: Page;
  let eventPath = "";
  let eventTitle = "";
  let inviteToken = "";

  test.beforeAll(async ({ browser }) => {
    member = await (await browser.newContext()).newPage();
    await signInAsThrowawayMember(member);
  });

  test.afterAll(async () => {
    await member.context().close();
  });

  test("3 and 4 the member finds an event from search and opens its page", async () => {
    await member.goto("/events");
    await member.getByTestId("discover-search-button").click();
    const first = member.getByTestId("discover-result-0");
    await expect(first).toBeVisible();
    eventTitle = (await first.innerText()).split("\n")[0];
    await first.click();
    await expect(member).toHaveURL(/\/events\/[0-9a-f-]{36}$/);
    eventPath = new URL(member.url()).pathname;
    await expect(member.getByTestId("event-save-toggle")).toContainText("Save this event");
  });

  test("6 saving: save an event, see it in Saved, take it off, and the event page says it is not saved", async () => {
    await member.goto(eventPath);
    await member.getByTestId("event-save-toggle").click();
    await expect(member.getByTestId("event-save-toggle")).toContainText("Saved");
    await expect(member.getByTestId("event-save-toggle")).toHaveAttribute("aria-pressed", "true");
    await member.goto("/saved");
    const row = member.getByRole("listitem").filter({ hasText: eventTitle.slice(0, 20) }).first();
    await expect(row).toBeVisible();
    await row.locator('[data-testid^="saved-remove-"]').click();
    await expect(member.getByTestId("saved-empty")).toBeVisible();
    await member.goto(eventPath);
    await expect(member.getByTestId("event-save-toggle")).toContainText("Save this event");
  });

  test("4 fire: light a fire (the count goes up and stays), put it out (the count goes back)", async () => {
    await member.goto(eventPath);
    const count = async () => Number(((await member.getByTestId("event-fire-count").innerText()).match(/\d+/) ?? ["0"])[0]);
    const before = await count();
    await member.getByTestId("event-fire-toggle").click();
    await expect(member.getByTestId("event-fire-toggle")).toHaveAttribute("aria-pressed", "true");
    await expect.poll(count).toBe(before + 1);
    await member.reload();
    await expect(member.getByTestId("event-fire-toggle")).toHaveAttribute("aria-pressed", "true");
    await member.getByTestId("event-fire-toggle").click();
    await expect(member.getByTestId("event-fire-toggle")).toHaveAttribute("aria-pressed", "false");
    await expect.poll(count).toBe(before);
  });

  test("9 and 3 reporting: Send is off until a reason is chosen; once sent the admin sees it and dismisses it", async ({ browser }) => {
    await member.goto(eventPath);
    await member.getByTestId("report-button").click();
    await expect(member.getByTestId("report-submit")).toBeDisabled(); // nothing can be sent without a reason
    await member.getByTestId("report-details-input").fill(reportMark);
    await member.getByTestId("report-reason-select").selectOption({ index: 1 });
    await member.getByTestId("report-submit").click();
    await expect(member.getByTestId("report-thanks")).toBeVisible();

    const admin = await (await browser.newContext()).newPage();
    await signInAsAdmin(admin);
    await admin.goto("/admin/moderation");
    const item = admin.getByRole("listitem").filter({ hasText: reportMark }).first();
    await expect(item).toBeVisible();
    await item.locator('[data-testid^="report-dismiss-"]').click();
    await expect(admin.getByTestId("moderation-error")).toBeVisible(); // a reason is required
    await item.getByTestId("admin-reason-input").fill("e2e journey dismissal");
    await item.locator('[data-testid^="report-dismiss-"]').click();
    await expect(admin.getByRole("listitem").filter({ hasText: reportMark })).toHaveCount(0);
    await admin.context().close();
  });

  test("6 alerts: make one for a place, pause it, remove it", async () => {
    await member.goto("/alerts");
    await member.getByTestId("alerts-new-button").click();
    await expect(member.getByTestId("alert-save")).toBeDisabled(); // a place is needed
    await member.getByTestId("alert-place-input").fill("Nashville, TN");
    await member.getByTestId("alert-save").click();
    await expect(member.getByTestId("alert-pause-0")).toBeVisible();
    await member.getByTestId("alert-pause-0").click();
    await expect(member.getByTestId("alert-paused-0")).toBeVisible();
    await member.getByTestId("alert-delete-0").click();
    await expect(member.getByTestId("alerts-empty")).toBeVisible();
  });

  test("7 account: change the name, switch the email preference, download the data", async () => {
    const loaded = member.waitForResponse((r) => r.url().endsWith("/api/v1/me") && r.request().method() === "GET");
    await member.goto("/account/settings");
    await loaded; // typing before the profile has loaded would be overwritten by it
    await member.getByTestId("account-name-input").fill("E2E Journey");
    await member.getByTestId("account-name-save").click();
    await expect(member.getByTestId("account-notice")).toBeVisible();
    await member.reload();
    await expect(member.getByTestId("account-name-input")).toHaveValue("E2E Journey");
    const toggled = member.waitForResponse((r) => r.url().includes("/api/v1/me") && r.request().method() === "PATCH");
    await member.getByTestId("account-email-toggle").click();
    expect((await toggled).status()).toBe(200);
    const download = member.waitForEvent("download");
    await member.getByTestId("account-export-button").click();
    expect((await download).suggestedFilename()).toBe("my-signal-one-sound-data.json");
  });

  test("4 inviting: make an invite link; a visitor who is not signed in can open it", async ({ browser }) => {
    await member.goto("/account/invite");
    await member.getByTestId("invite-button").click();
    const link = await member.getByTestId("invite-link").inputValue();
    inviteToken = /\/invite\/([^/?#]+)/.exec(link)?.[1] ?? "";
    expect(inviteToken).not.toBe("");
    const visitor = await (await browser.newContext()).newPage();
    const res = await visitor.goto(new URL(link.trim(), "http://localhost").pathname);
    expect(res?.status()).toBe(200);
    await visitor.context().close();
  });

  test("7 deleting the account: the word DELETE is required, and afterwards the member is gone", async () => {
    const accepted = async () => ((await (await member.request.get("/api/v1/me")).json()) as { data?: { policy?: { accepted?: boolean } } }).data?.policy?.accepted;
    expect(await accepted()).toBe(true); // the member has accepted the terms
    await member.goto("/account/settings");
    await member.getByTestId("account-delete-button").click();
    await member.getByTestId("account-delete-confirm-input").fill("delete");
    await expect(member.getByTestId("account-delete-confirm-button")).toBeDisabled(); // it must be exactly DELETE
    await member.getByTestId("account-delete-cancel-button").click();
    await expect(member.getByTestId("account-delete-button")).toBeVisible(); // changing their mind keeps the account
    await member.getByTestId("account-delete-button").click();
    await member.getByTestId("account-delete-confirm-input").fill("DELETE");
    await member.getByTestId("account-delete-confirm-button").click();
    await member.waitForURL((url) => url.pathname === "/");
    // The sign-in token itself stays valid for a short while and would make a fresh profile, so the proof of removal is that the
    // old record (the accepted terms, the name) is gone.
    expect(await accepted()).toBe(false);
  });
});
