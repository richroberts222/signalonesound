import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { createFakeEventsRepo } from "../../db/events.fake";
import type { NewEvent } from "../../db/events";
import { MAX_PER_KIND, STATIC_PAGES, createSitemapService } from "./sitemap";

// The sitemap (S9; S4 sitemap; S8 AC3 a hidden event leaves it): only what is public now is listed.
const clock = new Date("2026-10-09T12:00:00Z");
const approved = randomUUID();
const pending = randomUUID();
const SITE = "https://site.example";

const setup = () => {
  const repo = createFakeEventsRepo(() => clock, (id) => (id === pending ? { name: "Waiting Church", status: "pending" } : { name: "Sample Fellowship", status: "approved" }));
  const service = createSitemapService({ repo, siteUrl: () => `${SITE}/`, now: () => clock });
  let n = 0;
  const add = async (over: Partial<NewEvent> = {}) => {
    const e: NewEvent = {
      id: randomUUID(),
      orgId: approved,
      seriesId: null,
      title: `Event ${++n}`,
      description: "",
      status: "published",
      startsAt: new Date(clock.getTime() + 24 * 3600 * 1000),
      endsAt: null,
      timeZone: "America/Chicago",
      venueName: `Venue ${n}`,
      street: "1 Street",
      city: "Nashville",
      state: "TN",
      zip: "37201",
      lat: null,
      lng: null,
      speakers: null,
      directions: null,
      revivalTypes: ["worship-nights"],
      links: [],
      ...over,
    };
    await repo.createMany({ series: null, events: [e], userId: "u", idempotencyKey: randomUUID(), audit: { actorId: "u", action: "x", subject: "x" } });
    return e;
  };
  return { service, add };
};

describe("sitemap", () => {
  it("lists the fixed public pages with absolute addresses on the site's domain, without a doubled slash", async () => {
    const urls = (await setup().service.entries()).map((e) => e.url);
    for (const page of STATIC_PAGES) expect(urls).toContain(`${SITE}${page.path}`);
    expect(urls.every((u) => u.startsWith(`${SITE}/`) && !u.includes("//", 8))).toBe(true);
  });

  it("lists an upcoming published event and its church, with when they changed", async () => {
    const s = setup();
    const shown = await s.add();
    const entries = await s.service.entries();
    const event = entries.find((e) => e.url === `${SITE}/events/${shown.id}`);
    expect(event?.lastModified).toBeInstanceOf(Date);
    expect(entries.some((e) => e.url === `${SITE}/churches/${approved}`)).toBe(true);
  });

  it("never lists a draft, a past event, an event of an unapproved church, or a church that is not approved", async () => {
    const s = setup();
    const draft = await s.add({ status: "draft" });
    const past = await s.add({ startsAt: new Date(clock.getTime() - 48 * 3600 * 1000), endsAt: new Date(clock.getTime() - 47 * 3600 * 1000) });
    const held = await s.add({ orgId: pending });
    const urls = (await s.service.entries()).map((e) => e.url);
    for (const e of [draft, past, held]) expect(urls).not.toContain(`${SITE}/events/${e.id}`);
    expect(urls).not.toContain(`${SITE}/churches/${pending}`);
  });

  it("lists an event that is on now (started, not over)", async () => {
    const s = setup();
    const ongoing = await s.add({ startsAt: new Date(clock.getTime() - 3600 * 1000), endsAt: new Date(clock.getTime() + 3600 * 1000) });
    expect((await s.service.entries()).map((e) => e.url)).toContain(`${SITE}/events/${ongoing.id}`);
  });

  it("never lists a private page", async () => {
    const s = setup();
    await s.add();
    for (const entry of await s.service.entries()) {
      expect(entry.url).not.toMatch(/\/(api|manage|dashboard|admin|account|saved|alerts|invite|unsubscribe|sign-in|sign-up)(\/|$)/);
    }
  });

  it("stays well under the 50,000 address limit a sitemap file may hold", () => {
    expect(STATIC_PAGES.length + 2 * MAX_PER_KIND).toBeLessThanOrEqual(50_000);
  });
});
