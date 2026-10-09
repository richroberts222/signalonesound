import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: null }), clerkClient: async () => ({}) }));

import * as audit from "../admin/audit/route";
import * as decision from "../admin/manager-requests/[id]/decision/route";
import * as requests from "../admin/manager-requests/route";
import * as mine from "../me/organizations/route";
import * as byId from "./[id]/route";
import * as revoke from "./[id]/managers/[userId]/revoke/route";
import * as claim from "./claim/route";

// Wiring for the S2 route files: each exports the right methods, the protected ones fail closed
// (401) before reading input or touching the database, and the public view answers without sign-in
// (and reaches the database only for a well-formed id).
describe("S2 organization route wiring", () => {
  it("exports the documented methods", () => {
    expect(Object.keys(claim)).toEqual(["POST"]);
    expect(Object.keys(byId).sort()).toEqual(["GET", "PATCH"]);
    expect(Object.keys(revoke)).toEqual(["POST"]);
    expect(Object.keys(mine)).toEqual(["GET"]);
    expect(Object.keys(requests)).toEqual(["GET"]);
    expect(Object.keys(decision)).toEqual(["POST"]);
    expect(Object.keys(audit)).toEqual(["GET"]);
  });

  it("signed-out requests get 401 on every protected route", async () => {
    const id = "00000000-0000-4000-8000-000000000000";
    const params = (p: Record<string, string>) => ({ params: Promise.resolve(p) });
    const post = (url: string) => new Request(url, { method: "POST", body: "{not json" });
    const responses = await Promise.all([
      claim.POST(post("http://localhost/api/v1/organizations/claim")),
      byId.PATCH(new Request("http://localhost/x", { method: "PATCH", body: "{" }), params({ id })),
      revoke.POST(post("http://localhost/x"), params({ id, userId: "user_AAAAAAAAAA" })),
      mine.GET(new Request("http://localhost/api/v1/me/organizations")),
      requests.GET(new Request("http://localhost/api/v1/admin/manager-requests")),
      decision.POST(post("http://localhost/x"), params({ id })),
      audit.GET(new Request("http://localhost/api/v1/admin/audit")),
    ]);
    for (const res of responses) {
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ ok: false, error: { code: "unauthenticated" } });
    }
  });

  it("the public view treats a malformed id as 'not found' without touching the database", async () => {
    const res = await byId.GET(new Request("http://localhost/x"), { params: Promise.resolve({ id: "not-a-uuid" }) });
    expect(res.status).toBe(404);
  });
});
