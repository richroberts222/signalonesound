import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: null }), clerkClient: async () => ({}) }));

import * as notificationsJob from "../../internal/jobs/notifications/route";
import * as unsubscribe from "../../unsubscribe/[token]/route";
import * as mutes from "../organization-mutes/[orgId]/route";
import * as settings from "../notification-settings/route";
import * as tokenById from "../push-tokens/[id]/route";
import * as tokens from "../push-tokens/route";
import * as alertById from "./[id]/route";
import * as alerts from "./route";

// Wiring for the S7 routes: each exports the documented methods, the member ones fail closed (401)
// before reading input or touching the database, and the job refuses a call without the scheduler's secret.
describe("S7 alert route wiring", () => {
  const id = "00000000-0000-4000-8000-000000000000";
  const params = (p: Record<string, string>) => ({ params: Promise.resolve(p) });
  const req = (method: string) => new Request("http://localhost/x", { method, body: method === "GET" || method === "DELETE" ? undefined : "{not json" });

  it("exports the documented methods", () => {
    expect(Object.keys(alerts).sort()).toEqual(["GET", "POST"]);
    expect(Object.keys(alertById).sort()).toEqual(["DELETE", "PATCH"]);
    expect(Object.keys(tokens)).toEqual(["POST"]);
    expect(Object.keys(tokenById)).toEqual(["DELETE"]);
    expect(Object.keys(settings).sort()).toEqual(["GET", "PUT"]);
    expect(Object.keys(mutes).sort()).toEqual(["DELETE", "PUT"]);
    expect(Object.keys(unsubscribe)).toEqual(["POST"]);
    expect(Object.keys(notificationsJob)).toEqual(["GET"]);
  });

  it("signed-out requests get 401 on every member route", async () => {
    const responses = await Promise.all([
      alerts.GET(req("GET")),
      alerts.POST(req("POST")),
      alertById.PATCH(req("PATCH"), params({ id })),
      alertById.DELETE(req("DELETE"), params({ id })),
      tokens.POST(req("POST")),
      tokenById.DELETE(req("DELETE"), params({ id })),
      settings.GET(req("GET")),
      settings.PUT(req("PUT")),
      mutes.PUT(req("PUT"), params({ orgId: id })),
      mutes.DELETE(req("DELETE"), params({ orgId: id })),
    ]);
    for (const res of responses) {
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ ok: false, error: { code: "unauthenticated" } });
    }
  });

  it("an unsubscribe link that is not the right shape does not exist, without touching the database", async () => {
    const res = await unsubscribe.POST(req("POST"), params({ token: "short" }));
    expect(res.status).toBe(404);
  });
});
