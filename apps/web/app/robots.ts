import type { MetadataRoute } from "next";

import { robotsFor } from "../lib/seo/robots";
import { siteUrl } from "../lib/site";

// robots.txt: only the live production site asks to be listed (lib/seo/robots.ts).
export default function robots(): MetadataRoute.Robots {
  return robotsFor({ production: process.env.VERCEL_ENV === "production", siteUrl: siteUrl() });
}
