import type { FetchLike } from "@signalone/validation";
import { describe, expect, it } from "vitest";

import { createMobileSavedClient } from "./savedClient";

// S6 mobile: the phone uses the same shared client as the web, with the Clerk token as a bearer token, and sends
// nothing that identifies the person except that token.
const EVENT = "00000000-0000-4000-8000-000000000001";

function fake(body: unknown) {
  const calls: { url: string; method: string; headers: Record<string, string> }[] = [];
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, method: init.method, headers: init.headers });
    return { json: async () => body };
  };
  return { calls, fetch };
}

describe("the phone's saved events client", () => {
  it("saves with PUT and the bearer token, and reads the answer", async () => {
    const { calls, fetch } = fake({ ok: true, data: { eventId: EVENT, saved: true } });
    const client = createMobileSavedClient({ baseUrl: "https://api.example/", getToken: async () => "tok_abc", fetch });
    const result = await client.save(EVENT);
    expect(result).toEqual({ ok: true, data: { eventId: EVENT, saved: true } });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`https://api.example/api/v1/me/saved-events/${EVENT}`);
    expect(calls[0].method).toBe("PUT");
    expect(calls[0].headers.Authorization).toBe("Bearer tok_abc");
  });

  it("unsaves with DELETE and lists with GET", async () => {
    const { calls, fetch } = fake({ ok: true, data: { eventId: EVENT, saved: false } });
    const client = createMobileSavedClient({ baseUrl: "https://api.example", getToken: async () => "tok_abc", fetch });
    await client.unsave(EVENT);
    expect(calls[0].method).toBe("DELETE");
    const listing = fake({ ok: true, data: { items: [], nextCursor: null } });
    await createMobileSavedClient({ baseUrl: "https://api.example", getToken: async () => "tok_abc", fetch: listing.fetch }).list({ limit: 20 });
    expect(listing.calls[0].method).toBe("GET");
    expect(listing.calls[0].url).toBe("https://api.example/api/v1/me/saved-events?limit=20");
  });

  it("sends no Authorization header when there is no token, so the server answers 'unauthenticated'", async () => {
    const { calls, fetch } = fake({ ok: false, error: { code: "unauthenticated", message: "Sign in" } });
    const result = await createMobileSavedClient({ baseUrl: "https://api.example", getToken: async () => null, fetch }).list();
    expect(result.ok).toBe(false);
    expect(calls[0].headers.Authorization).toBeUndefined();
  });

  it("turns an answer that is not the agreed shape into a plain failure and never throws", async () => {
    const { fetch } = fake({ unexpected: true });
    const result = await createMobileSavedClient({ baseUrl: "https://api.example", getToken: async () => "tok_abc", fetch }).list();
    expect(result.ok).toBe(false);
  });
});
