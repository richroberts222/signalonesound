import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: null }) }));

import { GET as status } from "./v1/status/route";
import { GET as fallback, POST as fallbackPost } from "./[...path]/route";

import * as proofItems from "./v1/proof-items/route";

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

describe("API routing convention", () => {
  it("serves the public versioned status endpoint through the real wiring", async () => {
    const res = await status(new Request("http://localhost/api/v1/status"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-API-Version")).toBe("v1");
    expect(await res.json()).toEqual({ ok: true, data: { status: "ok", version: "v1" } });
  });

  it("answers unknown API paths and versions with the standard not_found envelope", async () => {
    for (const handler of [fallback, fallbackPost]) {
      const res = await handler(new Request("http://localhost/api/v9/anything"));
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ ok: false, error: { code: "not_found", message: "Not found" } });
    }
  });
});
