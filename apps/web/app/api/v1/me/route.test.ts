import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: null }), clerkClient: async () => ({}) }));

import * as exportRoute from "./export/route";
import * as policyAcceptanceRoute from "./policy-acceptance/route";
import * as meRoute from "./route";
import * as webhookRoute from "../webhooks/clerk/route";

// Wiring for the S1 route files: each exports the right methods and fails closed (401) before it
// reads the input or touches the database. The webhook has no session; it is authenticated by
// signature, so a request without a valid signature is refused (400) before anything changes.
describe("S1 member route wiring", () => {
  it("exports the documented methods", () => {
    expect(Object.keys(meRoute).sort()).toEqual(["DELETE", "GET", "PATCH"]);
    expect(Object.keys(policyAcceptanceRoute)).toEqual(["POST"]);
    expect(Object.keys(exportRoute)).toEqual(["GET"]);
    expect(Object.keys(webhookRoute)).toEqual(["POST"]);
  });

  it("signed-out requests get 401 on every member route", async () => {
    const base = "http://localhost/api/v1/me";
    const responses = await Promise.all([
      meRoute.GET(new Request(base)),
      meRoute.PATCH(new Request(base, { method: "PATCH", body: "{not json" })),
      meRoute.DELETE(new Request(base, { method: "DELETE" })),
      policyAcceptanceRoute.POST(new Request(`${base}/policy-acceptance`, { method: "POST", body: "{not json" })),
      exportRoute.GET(new Request(`${base}/export`)),
    ]);
    for (const res of responses) {
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ ok: false, error: { code: "unauthenticated" } });
    }
  });

  it("the webhook refuses a request with no valid signature", async () => {
    const res = await webhookRoute.POST(
      new Request("http://localhost/api/v1/webhooks/clerk", { method: "POST", body: '{"type":"user.deleted","data":{"id":"user_x"}}' }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, error: { code: "validation_failed" } });
  });
});
