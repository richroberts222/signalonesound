// The public address of the site, for the sitemap and robots file (S9). It is the live domain unless a different one
// is set (a template app sets its own; docs/environment.md). It is public and not a secret. No trailing slash.
export const DEFAULT_SITE_URL = "https://www.signalonesound.com";

export function siteUrl(env: Record<string, string | undefined> = process.env): string {
  const value = (env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  return (value === "" ? DEFAULT_SITE_URL : value).replace(/\/+$/, "");
}
