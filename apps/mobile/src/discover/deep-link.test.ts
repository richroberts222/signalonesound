import { describe, expect, it } from "vitest";

import { isEventId, parseEventLink } from "./deep-link";

const id = "3f2b8c1e-9d4a-4b6f-8a21-5c7d9e0f1a2b";

describe("parseEventLink", () => {
  it("returns the event id for a well-formed event link", () => {
    expect(parseEventLink(`signalone://event/${id}`)).toBe(id);
    expect(parseEventLink(`signalone:///event/${id}`)).toBe(id);
    expect(parseEventLink(`signalone://event/${id}?ref=share`)).toBe(id);
    expect(parseEventLink(`  SIGNALONE://event/${id}/  `)).toBe(id);
  });

  it("refuses tampered, foreign or malformed links", () => {
    for (const bad of [
      "",
      "signalone://event/",
      "signalone://event/not-an-id",
      `signalone://event/${id}/extra`,
      `signalone://event/${id.slice(0, -1)}`,
      `signalone://event/${id}x`,
      `https://example.org/event/${id}`,
      `javascript:alert(1)//event/${id}`,
      `signalone://admin/${id}`,
      "signalone://event/../../etc/passwd",
    ]) {
      expect(parseEventLink(bad), bad).toBeNull();
    }
  });
});

describe("isEventId", () => {
  it("accepts an id in either case and nothing else", () => {
    expect(isEventId(id)).toBe(true);
    expect(isEventId(id.toUpperCase())).toBe(true);
    expect(isEventId("12345")).toBe(false);
    expect(isEventId(`${id}\n`)).toBe(false);
  });
});
