import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { DEFAULT_SITE_URL, siteUrl } from "../site";
import { PRIVATE_PATHS, robotsFor } from "./robots";

// What search engines may crawl (S9). Test and Preview copies of the site must never be listed; the live site lists its
// public pages and keeps everything private out.
describe("robots", () => {
  it("only production asks to be listed: any other environment asks crawlers to stay away entirely", () => {
    expect(robotsFor({ production: false, siteUrl: "https://x.example" })).toEqual({ rules: [{ userAgent: "*", disallow: "/" }] });
  });

  it("production opens the public pages, closes the private ones, and points to the sitemap", () => {
    const r = robotsFor({ production: true, siteUrl: "https://www.signalonesound.com" });
    expect(r.sitemap).toBe("https://www.signalonesound.com/sitemap.xml");
    expect(r.rules[0]).toMatchObject({ userAgent: "*", allow: "/" });
    expect(r.rules[0].disallow).toEqual(PRIVATE_PATHS);
  });

  it("every page that needs a sign-in is closed to crawlers, so a new protected area cannot be forgotten", () => {
    const proxy = readFileSync(join(__dirname, "../../proxy.ts"), "utf8");
    const protectedList = /createRouteMatcher\(\[([^\]]*)\]\)/.exec(proxy)?.[1] ?? "";
    const protectedPaths = [...protectedList.matchAll(/"(\/[a-z-]+)\(\.\*\)"/g)].map((m) => m[1]);
    expect(protectedPaths.length).toBeGreaterThan(5);
    for (const path of protectedPaths) expect(PRIVATE_PATHS, `${path} is protected by sign-in but not closed to crawlers`).toContain(path);
  });

  it("closes the API, the one-time links and the sign-in pages", () => {
    for (const path of ["/api/", "/invite/", "/unsubscribe/", "/sign-in", "/sign-up"]) expect(PRIVATE_PATHS).toContain(path);
  });
});

describe("site address", () => {
  it("is the live domain unless another is set, with no trailing slash", () => {
    expect(siteUrl({})).toBe(DEFAULT_SITE_URL);
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "   " })).toBe(DEFAULT_SITE_URL);
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "https://other.example///" })).toBe("https://other.example");
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: " https://other.example/ " })).toBe("https://other.example");
  });
});
