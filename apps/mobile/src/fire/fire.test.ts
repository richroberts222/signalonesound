import type { FetchLike } from "@signalone/validation";
import { describe, expect, it } from "vitest";

import { createMobileFireClient } from "./fireClient";
import { FIRE_FAILED_TEXT, FIRE_LIMIT_TEXT, fireFailureText, fireLabel } from "./fireText";

// S19 on the phone: the same shared client as the web, with the Clerk token as a bearer token.
const EVENT = "00000000-0000-4000-8000-000000000001";

function fake(body: unknown) {
  const calls: { url: string; method: string; headers: Record<string, string> }[] = [];
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, method: init.method, headers: init.headers });
    return { json: async () => body };
  };
  return { calls, fetch };
}

describe("the phone's fire client", () => {
  it("fires with PUT and the bearer token, and reads the answer", async () => {
    const { calls, fetch } = fake({ ok: true, data: { eventId: EVENT, fired: true } });
    const client = createMobileFireClient({ baseUrl: "https://api.example/", getToken: async () => "tok_abc", fetch });
    expect(await client.fire(EVENT)).toEqual({ ok: true, data: { eventId: EVENT, fired: true } });
    expect(calls[0].url).toBe(`https://api.example/api/v1/me/fires/${EVENT}`);
    expect(calls[0].method).toBe("PUT");
    expect(calls[0].headers.Authorization).toBe("Bearer tok_abc");
  });

  it("takes a fire back with DELETE and reads the member's own state with GET", async () => {
    const { calls, fetch } = fake({ ok: true, data: { eventId: EVENT, fired: false } });
    const client = createMobileFireClient({ baseUrl: "https://api.example", getToken: async () => "tok_abc", fetch });
    await client.unfire(EVENT);
    await client.isFired(EVENT);
    expect(calls.map((c) => c.method)).toEqual(["DELETE", "GET"]);
  });
});

describe("the Fire button words", () => {
  it("gives the daily limit its own message and everything else the general one", () => {
    expect(fireFailureText("rate_limited")).toBe(FIRE_LIMIT_TEXT);
    expect(fireFailureText("internal")).toBe(FIRE_FAILED_TEXT);
    expect(FIRE_LIMIT_TEXT).not.toBe(FIRE_FAILED_TEXT);
  });

  it("says in words whether the event is fired", () => {
    expect(fireLabel(true)).toBe("Fired (tap to take back)");
    expect(fireLabel(false)).toBe("Fire this");
    expect(fireLabel(null)).toBe("Fire this");
  });
});
