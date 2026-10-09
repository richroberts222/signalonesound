import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";

// Response-header baseline (docs/secure-coding.md). Anti-framing and the other headers are
// configuration, so a test is the only thing that notices if they are removed or weakened.
const rules = async () => (await nextConfig.headers?.()) ?? [];
const value = async (key: string) =>
  (await rules()).flatMap((r) => r.headers).find((h) => h.key.toLowerCase() === key.toLowerCase())?.value ?? "";

describe("security response headers", () => {
  it("apply to every path", async () => {
    const all = await rules();
    expect(all.length).toBeGreaterThan(0);
    expect(all.some((r) => r.source === "/:path*")).toBe(true);
  });

  it("forbid framing the application (clickjacking), in the modern and the legacy header", async () => {
    expect(await value("Content-Security-Policy")).toMatch(/frame-ancestors\s+'none'/);
    expect(await value("X-Frame-Options")).toBe("DENY");
  });

  it("restrict base URI and plugin content, and stop content-type sniffing", async () => {
    expect(await value("Content-Security-Policy")).toMatch(/base-uri\s+'self'/);
    expect(await value("Content-Security-Policy")).toMatch(/object-src\s+'none'/);
    expect(await value("X-Content-Type-Options")).toBe("nosniff");
  });

  it("limit referrer leakage, browser features, and require HTTPS", async () => {
    expect(await value("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(await value("Permissions-Policy")).toMatch(/camera=\(\)/);
    expect(await value("Strict-Transport-Security")).toMatch(/max-age=\d{7,}/);
  });
});
