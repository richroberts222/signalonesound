import { describe, expect, it, vi } from "vitest";

import { parsePlaces, searchPlaces } from "./search";

// S17 AC1 AC4 AC6: a place search answer is untrusted; only real positions become pins, and a failure is an error.
const answer = [
  { display_name: "Kibera, Nairobi, Kenya", lat: "-1.3133", lon: "36.7881" },
  { display_name: "Nashville, Tennessee, United States", lat: "36.1623", lon: "-86.7743" },
];

describe("place search results", () => {
  it("turns the service's answer into places with rounded pins", () => {
    expect(parsePlaces(answer)).toEqual([
      { label: "Kibera, Nairobi, Kenya", pin: { lat: -1.3133, lng: 36.7881 } },
      { label: "Nashville, Tennessee, United States", pin: { lat: 36.1623, lng: -86.7743 } },
    ]);
  });

  it("drops anything without a name or with a position that is not real", () => {
    const bad = [
      { display_name: "", lat: "1", lon: "2" },
      { lat: "1", lon: "2" },
      { display_name: "No position" },
      { display_name: "Out of range", lat: "95", lon: "2" },
      { display_name: "Not numbers", lat: "north", lon: "east" },
      { display_name: "Blank", lat: "", lon: "" },
      { display_name: "Null", lat: null, lon: null },
      { display_name: "Booleans", lat: true, lon: true },
      null,
      "text",
      42,
    ];
    expect(parsePlaces(bad)).toEqual([]);
    expect(parsePlaces([...bad, answer[0]])).toHaveLength(1);
  });

  it("returns nothing for an answer that is not a list", () => {
    for (const value of [null, undefined, {}, "oops", 5, { error: "rate limited" }]) expect(parsePlaces(value)).toEqual([]);
  });

  it("keeps at most six results and shortens very long names", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ display_name: `Place ${i} ${"x".repeat(300)}`, lat: String(i), lon: String(i) }));
    const places = parsePlaces(many);
    expect(places).toHaveLength(6);
    expect(places[0].label.length).toBeLessThanOrEqual(140);
  });
});

describe("searching", () => {
  // A fake fetch that remembers each address it was asked for.
  const fake = (body: unknown) => {
    const urls: string[] = [];
    const fetchImpl = (async (url: RequestInfo | URL) => {
      urls.push(String(url));
      return new Response(JSON.stringify(body), { status: 200 });
    }) as typeof fetch;
    return { urls, fetchImpl };
  };

  it("asks the configured service by name and returns the places", async () => {
    const { urls, fetchImpl } = fake(answer);
    const places = await searchPlaces("  Kibera  ", { baseUrl: "https://search.example/", fetchImpl });
    expect(places).toHaveLength(2);
    expect(urls[0].startsWith("https://search.example/search?")).toBe(true);
    expect(urls[0]).toContain("q=Kibera");
    expect(urls[0]).not.toContain("q=%20");
  });

  it("encodes what was typed, so it cannot change the request", async () => {
    const { urls, fetchImpl } = fake([]);
    await searchPlaces("a&limit=999#x", { baseUrl: "https://search.example", fetchImpl });
    expect(urls[0]).toContain("q=a%26limit%3D999%23x");
    expect(urls[0].match(/limit=/g)).toHaveLength(1);
  });

  it("does not call the service for an empty search", async () => {
    const { urls, fetchImpl } = fake(answer);
    expect(await searchPlaces("   ", { baseUrl: "https://search.example", fetchImpl })).toEqual([]);
    expect(urls).toHaveLength(0);
  });

  it("throws when the service answers with an error or cannot be reached", async () => {
    await expect(searchPlaces("x", { baseUrl: "https://search.example", fetchImpl: vi.fn(async () => new Response("slow down", { status: 429 })) })).rejects.toThrow(/429/);
    await expect(searchPlaces("x", { baseUrl: "https://search.example", fetchImpl: vi.fn(async () => { throw new TypeError("network"); }) })).rejects.toThrow();
  });
});
