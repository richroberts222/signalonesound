import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: null }), clerkClient: async () => ({}) }));

import * as audit from "../admin/audit/search/route";
import * as auditExport from "../admin/audit/export/route";
import * as decision from "../admin/reports/[id]/decision/route";
import * as hide from "../admin/events/[id]/hide/route";
import * as overview from "../admin/overview/route";
import * as reports from "../admin/reports/route";
import * as suspend from "../admin/members/[userId]/suspend/route";
import * as report from "./route";

// Wiring for the S8 routes: the report route is public and refuses bad input before the database; every
// admin route fails closed (401) before reading input or touching the database.
describe("S8 moderation route wiring", () => {
  const params = (p: Record<string, string>) => ({ params: Promise.resolve(p) });
  const body = (method: string) => new Request("http://localhost/x", { method, body: method === "GET" ? undefined : "{not json" });

  it("exports the documented methods", () => {
    expect(Object.keys(report)).toEqual(["POST"]);
    expect(Object.keys(overview)).toEqual(["GET"]);
    expect(Object.keys(reports)).toEqual(["GET"]);
    expect(Object.keys(decision)).toEqual(["POST"]);
    expect(Object.keys(hide)).toEqual(["POST"]);
    expect(Object.keys(suspend)).toEqual(["POST"]);
    expect(Object.keys(audit)).toEqual(["GET"]);
    expect(Object.keys(auditExport)).toEqual(["GET"]);
  });

  it("the public report route refuses malformed or incomplete reports before the database", async () => {
    for (const payload of ["{not json", JSON.stringify({}), JSON.stringify({ subjectType: "event", subjectId: "nope", reason: "other" })]) {
      const res = await report.POST(new Request("http://localhost/api/v1/reports", { method: "POST", body: payload }));
      expect(res.status, payload).toBe(400);
    }
  });

  it("every admin route is 401 when signed out", async () => {
    const id = "00000000-0000-4000-8000-000000000000";
    const responses = await Promise.all([
      overview.GET(body("GET")),
      reports.GET(body("GET")),
      decision.POST(body("POST"), params({ id })),
      hide.POST(body("POST"), params({ id })),
      suspend.POST(body("POST"), params({ userId: "user_AAAAAAAAAA" })),
      audit.GET(body("GET")),
      auditExport.GET(body("GET")),
    ]);
    for (const res of responses) {
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ ok: false, error: { code: "unauthenticated" } });
    }
  });
});
