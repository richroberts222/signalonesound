import type { MetadataRoute } from "next";

import { getSitemapService } from "../lib/composition";

// sitemap.xml: the public pages, upcoming events and approved churches (S9). Built on each request so a hidden or
// finished event leaves it at once (S8 AC3).
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getSitemapService().entries();
}
