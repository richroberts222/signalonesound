import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: null }), clerkClient: async () => ({}) }));

import * as arrival from "../../invites/[token]/arrival/route";
import * as retention from "../../internal/jobs/retention/route";
import * as invites from "../invites/route";
import * as byEvent from "./[eventId]/route";
import * as list from "./route";

// Wiring for the S6 routes: each exports the documented methods and the member ones fail closed (401)
// before reading input or touching the database; a malformed event id or invite token does not exist.
describe("S6 saved-event and invite route wiring", () => {
  const eventId = "00000000-0000-4000-8000-000000000000";
  const params = (p: Record<string, string>) => ({ params: Promise.resolve(p) });

  it("exports the documented methods", () => {
    expect(Object.keys(list)).toEqual(["GET"]);
    expect(Object.keys(byEvent).sort()).toEqual(["DELETE", "GET", "PUT"]);
    expect(Object.keys(invites)).toEqual(["POST"]);
    expect(Object.keys(arrival)).toEqual(["POST"]);
    expect(Object.keys(retention)).toEqual(["GET"]);
  });

  it("signed-out requests get 401 on every member route", async () => {
    const responses = await Promise.all([
      list.GET(new Request("http://localhost/x")),
      byEvent.GET(new Request("http://localhost/x"), params({ eventId })),
      byEvent.PUT(new Request("http://localhost/x", { method: "PUT" }), params({ eventId })),
      byEvent.DELETE(new Request("http://localhost/x", { method: "DELETE" }), params({ eventId })),
      invites.POST(new Request("http://localhost/x", { method: "POST" })),
    ]);
    for (const res of responses) {
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ ok: false, error: { code: "unauthenticated" } });
    }
  });

  it("a malformed invite token does not exist, without touching the database", async () => {
    const res = await arrival.POST(new Request("http://localhost/x", { method: "POST" }), params({ token: "short" }));
    expect(res.status).toBe(404);
  });
});
