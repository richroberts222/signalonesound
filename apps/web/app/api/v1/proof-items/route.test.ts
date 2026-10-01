import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: null }) }));

import * as proofItems from "./route";

describe("proof item route wiring", () => {
  it("exports GET/POST/DELETE and fails closed (401) before touching input or the database", async () => {
    const url = "http://localhost/api/v1/proof-items";
    const responses = await Promise.all([
      proofItems.GET(new Request(url)),
      proofItems.POST(new Request(url, { method: "POST", body: "{not json" })),
      proofItems.DELETE(new Request(`${url}?id=nope`, { method: "DELETE" })),
    ]);
    for (const res of responses) {
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ ok: false, error: { code: "unauthenticated" } });
    }
  });
});
