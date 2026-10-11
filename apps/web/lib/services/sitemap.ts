import type { EventsRepo } from "../../db/events";

// The sitemap (S9; S4 and S8 AC3): the pages a search engine may list. Public pages, plus the upcoming published
// events of approved churches and the approved churches themselves. A hidden, draft, past or unapproved page is never
// listed, because the query asks only for what is public now (and the page is built on each request, so a hidden
// event is gone at once). No personal data is involved. Framework-free; the repo, address and clock are injected.
export type SitemapEntry = { url: string; lastModified?: Date; changeFrequency?: "daily" | "weekly" | "monthly"; priority?: number };

export type SitemapServiceDeps = {
  repo: Pick<EventsRepo, "listSitemap">;
  siteUrl: () => string;
  now?: () => Date;
};

/** The fixed public pages: the ones in the footer and the main menu. */
export const STATIC_PAGES: { path: string; changeFrequency: SitemapEntry["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/events", changeFrequency: "daily", priority: 0.9 },
  { path: "/discover", changeFrequency: "daily", priority: 0.8 },
  { path: "/fire-map", changeFrequency: "daily", priority: 0.8 },
  { path: "/churches", changeFrequency: "daily", priority: 0.8 },
  { path: "/about", changeFrequency: "monthly", priority: 0.5 },
  { path: "/services", changeFrequency: "monthly", priority: 0.5 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.4 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.2 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.2 },
];

/** A sitemap file may hold at most 50,000 addresses; events and churches each take at most this many, so the total stays under. */
export const MAX_PER_KIND = 20_000;

export function createSitemapService({ repo, siteUrl, now = () => new Date() }: SitemapServiceDeps) {
  return {
    async entries(): Promise<SitemapEntry[]> {
      const base = siteUrl().replace(/\/+$/, "");
      const rows = await repo.listSitemap(now(), MAX_PER_KIND);
      return [
        ...STATIC_PAGES.map((p) => ({ url: `${base}${p.path}`, changeFrequency: p.changeFrequency, priority: p.priority })),
        ...rows.events.map((e) => ({ url: `${base}/events/${e.id}`, lastModified: e.updatedAt, changeFrequency: "daily" as const, priority: 0.7 })),
        ...rows.churches.map((c) => ({ url: `${base}/churches/${c.id}`, lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 })),
      ];
    },
  };
}

export type SitemapService = ReturnType<typeof createSitemapService>;
