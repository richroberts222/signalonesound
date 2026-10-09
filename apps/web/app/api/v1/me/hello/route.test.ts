import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: null }) }));

import * as hello from "./route";

describe("hello route wiring", () => {
  it("exports GET and PUT and fails closed (401) before touching input or the database", async () => {
    const url = "http://localhost/api/v1/me/hello";
    const responses = await Promise.all([
      hello.GET(new Request(url)),
      hello.PUT(new Request(url, { method: "PUT", body: "{not json" })),
    ]);
    for (const res of responses) {
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ ok: false, error: { code: "unauthenticated" } });
    }
  });
});
