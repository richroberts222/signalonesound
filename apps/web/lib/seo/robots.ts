// What search engines may crawl (S9). Only the live production site asks to be listed: development, QA and Preview
// sites ask crawlers to stay away entirely, so a test copy of the site never appears in a search. In production the
// public pages are open and everything private or personal (the signed-in areas, the API, one-time links) is not.
export const PRIVATE_PATHS = [
  "/api/",
  "/manage",
  "/dashboard",
  "/admin",
  "/account",
  "/saved",
  "/alerts",
  "/claim-church",
  "/accept-terms",
  "/proof",
  "/invite/",
  "/unsubscribe/",
  "/sign-in",
  "/sign-up",
];

export type RobotsRules = { rules: { userAgent: string; allow?: string; disallow: string | string[] }[]; sitemap?: string };

export function robotsFor(options: { production: boolean; siteUrl: string }): RobotsRules {
  if (!options.production) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return { rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE_PATHS }], sitemap: `${options.siteUrl}/sitemap.xml` };
}
