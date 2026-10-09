import { describe, expect, it } from "vitest";

import { claimOrganizationSchema, isSafeLink, parseInput } from "./index";

describe("isSafeLink", () => {
  it("accepts ordinary web addresses", () => {
    for (const ok of ["https://sample-church.example", "http://b.example/page", "https://c.example/x?y=1#top", "https://www.my-church.org:8443/live", "HTTPS://Sample.Example"]) {
      expect(isSafeLink(ok), ok).toBe(true);
    }
  });

  it("rejects other schemes, embedded sign-in details, bare hosts, spaces and over-long values", () => {
    const bad = [
      "javascript:alert(1)",
      "data:text/html,hi",
      "ftp://files.example",
      "https://user:pass@example.com",
      "https://user@example.com",
      "https://localhost",
      "https://192.168.1.1",
      "https://exa mple.com",
      "https://example.com/a b",
      "https://example.com/\u0000",
      "//example.com",
      "example.com",
      "",
      "https://a.example/" + "x".repeat(400),
    ];
    for (const value of bad) expect(isSafeLink(value), JSON.stringify(value).slice(0, 60)).toBe(false);
  });
});

describe("claimOrganizationSchema", () => {
  const valid = { name: "Sample Fellowship", links: ["https://sample.example"], contactEmail: "Pastor@Sample.Example" };

  it("accepts a valid claim, lower-cases the email and defaults the description", () => {
    expect(parseInput(claimOrganizationSchema, valid)).toEqual({
      ok: true,
      data: { name: "Sample Fellowship", description: "", links: ["https://sample.example"], contactEmail: "pastor@sample.example" },
    });
  });

  it("allows 1 to 3 links only and rejects unknown fields", () => {
    expect(parseInput(claimOrganizationSchema, { ...valid, links: [] }).ok).toBe(false);
    expect(parseInput(claimOrganizationSchema, { ...valid, links: Array(4).fill("https://a.example") }).ok).toBe(false);
    expect(parseInput(claimOrganizationSchema, { ...valid, role: "admin" }).ok).toBe(false);
  });
});
