import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: null }), clerkClient: async () => ({}) }));

import * as orgEvents from "../organizations/[id]/events/route";
import * as cancel from "./[id]/cancel/route";
import * as publish from "./[id]/publish/route";
import * as byId from "./[id]/route";

// Wiring for the S3 route files: each exports the documented methods and fails closed (401) before it
// reads the input or touches the database; a malformed id never reaches the database.
describe("S3 event route wiring", () => {
  const id = "00000000-0000-4000-8000-000000000000";
  const params = (p: Record<string, string>) => ({ params: Promise.resolve(p) });

  it("exports the documented methods", () => {
    expect(Object.keys(orgEvents).sort()).toEqual(["GET", "POST"]);
    expect(Object.keys(byId).sort()).toEqual(["DELETE", "GET", "PATCH"]);
    expect(Object.keys(publish)).toEqual(["POST"]);
    expect(Object.keys(cancel)).toEqual(["POST"]);
  });

  it("signed-out requests get 401 on every route, even with a bad body", async () => {
    const bad = (method: string) => new Request("http://localhost/x", { method, body: method === "GET" || method === "DELETE" ? undefined : "{not json" });
    const responses = await Promise.all([
      orgEvents.POST(bad("POST"), params({ id })),
      orgEvents.GET(bad("GET"), params({ id })),
      byId.GET(bad("GET"), params({ id })),
      byId.PATCH(bad("PATCH"), params({ id })),
      byId.DELETE(bad("DELETE"), params({ id })),
      publish.POST(bad("POST"), params({ id })),
      cancel.POST(bad("POST"), params({ id })),
    ]);
    for (const res of responses) {
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ ok: false, error: { code: "unauthenticated" } });
    }
  });
});
