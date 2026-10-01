import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ERROR_CODES, type Result } from "@signalone/shared";

import { DatabaseError } from "../../db/errors";
import { authorize, isOwner } from "../auth/authorize";
import { conflict, notFound } from "../services/errors";
import type { ServiceContext } from "../services/context";
import { API_VERSION_HEADER, STATUS_BY_CODE, createApiRoute, toResponse } from "./handler";

// Generic, test-only service proving the boundary:
// Request -> adapter -> auth -> validation -> service (+ authorization) -> Response.
// Not a Signal One domain entity.
type Item = { id: string; ownerId: string; label: string };
const store = new Map<string, Item>([["a", { id: "a", ownerId: "user_1", label: "first" }]]);
const serviceCalls = vi.fn();
const itemService = {
  async rename(ctx: ServiceContext, input: { id: string; label: string }) {
    serviceCalls(input);
    const item = store.get(input.id);
    if (!item) throw notFound();
    await authorize(ctx.actor, isOwner<Item>((i) => i.ownerId), item);
    if (input.label === "taken") throw conflict();
    return { id: item.id, label: input.label }; // mapped output, not the stored shape
  },
};

const schema = z.object({ id: z.string().min(1), label: z.string().min(1).max(20) });
const unexpected = vi.fn();
const makeRoute = (userId: string | null | Error) =>
  createApiRoute({
    getUserId: async () => {
      if (userId instanceof Error) throw userId;
      return userId;
    },
    onUnexpected: unexpected,
  })({
    auth: "required",
    input: { schema },
    handle: (ctx, input) => itemService.rename(ctx, input),
  });

const post = (body: unknown, raw = false) =>
  new Request("http://localhost/api/v1/items", {
    method: "POST",
    body: raw ? (body as string) : JSON.stringify(body),
  });

describe("API adapter: request lifecycle", () => {
  it("returns the standard success envelope with version header and no caching", async () => {
    const res = await makeRoute("user_1")(post({ id: "a", label: "renamed" }));
    expect(res.status).toBe(200);
    expect(res.headers.get(API_VERSION_HEADER)).toBe("v1");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ ok: true, data: { id: "a", label: "renamed" } });
  });

  it("rejects invalid input with 400 before the service is reached", async () => {
    serviceCalls.mockClear();
    const res = await makeRoute("user_1")(post({ id: "", label: 5 }));
    const body = (await res.json()) as Result<never>;
    expect(res.status).toBe(400);
    expect(body.ok === false && body.error.code).toBe("validation_failed");
    expect(body.ok === false && Object.keys(body.error.fieldErrors ?? {}).sort()).toEqual(["id", "label"]);
    expect(serviceCalls).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON, empty bodies, and oversized bodies with 400", async () => {
    serviceCalls.mockClear();
    for (const body of ["{not json", "", JSON.stringify({ id: "a", label: "x".repeat(200_000) })]) {
      const res = await makeRoute("user_1")(post(body, true));
      expect(res.status).toBe(400);
    }
    expect(serviceCalls).not.toHaveBeenCalled();
  });

  it("does not echo submitted values in validation errors", async () => {
    const res = await makeRoute("user_1")(post({ id: "a", label: "SUBMITTED_SENTINEL".repeat(5) }));
    expect(await res.text()).not.toContain("SUBMITTED_SENTINEL");
  });

  it("returns 401 when unauthenticated, without validating or calling the service", async () => {
    serviceCalls.mockClear();
    const res = await makeRoute(null)(post({ id: "", label: "" }));
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("unauthenticated");
    expect(serviceCalls).not.toHaveBeenCalled();
  });

  it("returns 403 when the service's authorization denies the identity", async () => {
    const res = await makeRoute("user_2")(post({ id: "a", label: "hijack" }));
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("forbidden");
  });

  it("maps expected service failures to 404 and 409", async () => {
    expect((await makeRoute("user_1")(post({ id: "missing", label: "x" }))).status).toBe(404);
    expect((await makeRoute("user_1")(post({ id: "a", label: "taken" }))).status).toBe(409);
  });

  it("maps a database unique violation to a generic 409", async () => {
    const route = createApiRoute({ getUserId: async () => "user_1" })({
      auth: "required",
      handle: async () => {
        throw new DatabaseError("unique_violation", "x", new Error("duplicate key value violates constraint users_pkey"));
      },
    });
    const res = await route(new Request("http://localhost/api/v1/x"));
    expect(res.status).toBe(409);
    expect(await res.text()).not.toMatch(/constraint|users_pkey/);
  });
});

describe("API adapter: unexpected failures", () => {
  const secretish = /SELECT|password|stack|ECONNREFUSED|at \w+ \(|node_modules/i;

  it("serializes unexpected service errors as a generic 500 and reports the original only to the hook", async () => {
    unexpected.mockClear();
    const boom = new Error("connect ECONNREFUSED 10.0.0.1: SELECT password FROM secrets");
    const route = createApiRoute({ getUserId: async () => "user_1", onUnexpected: unexpected })({
      auth: "required",
      handle: async () => {
        throw boom;
      },
    });
    const res = await route(new Request("http://localhost/api/v1/x"));
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(JSON.parse(text)).toEqual({ ok: false, error: { code: "internal", message: "Something went wrong" } });
    expect(text).not.toMatch(secretish);
    expect(unexpected).toHaveBeenCalledWith(boom);
  });

  it("treats a failing identity provider as a generic 500, not a leak or a 401", async () => {
    const res = await makeRoute(new Error("clerk exploded SELECT 1"))(post({ id: "a", label: "x" }));
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(text).not.toMatch(secretish);
  });
});

describe("API adapter: public routes and query input", () => {
  const route = createApiRoute({ getUserId: async () => null })({
    auth: "public",
    input: { schema: z.object({ q: z.string().min(1) }), source: "query" },
    handle: async (ctx, input) => ({ ctx, echoed: input.q }),
  });

  it("serves unauthenticated callers with a null context and validated query input", async () => {
    const res = await route(new Request("http://localhost/api/v1/search?q=hi"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { ctx: null, echoed: "hi" } });
  });

  it("validates query input", async () => {
    expect((await route(new Request("http://localhost/api/v1/search"))).status).toBe(400);
  });
});

describe("error contract", () => {
  it("maps every shared error code to an HTTP status", () => {
    for (const code of ERROR_CODES) expect(STATUS_BY_CODE[code]).toBeGreaterThanOrEqual(400);
    expect(STATUS_BY_CODE).toMatchObject({
      validation_failed: 400,
      unauthenticated: 401,
      forbidden: 403,
      not_found: 404,
      conflict: 409,
      internal: 500,
    });
  });

  it("toResponse serializes failures with the mapped status", async () => {
    const res = toResponse({ ok: false, error: { code: "rate_limited", message: "Slow down" } });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ ok: false, error: { code: "rate_limited", message: "Slow down" } });
  });
});

describe("API boundary (static)", () => {
  const read = (f: string) => readFileSync(join(__dirname, f), "utf8");
  const code = (f: string) => read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("the adapter is framework-free and cannot reach the database or Clerk", () => {
    expect(code("handler.ts")).not.toMatch(
      /from\s+["'](?:next[^"']*|react[^"']*|@clerk[^"']*|server-only|drizzle-orm[^"']*|@neondatabase[^"']*|[^"']*\/db(?:\/[^"']*)?)["']/,
    );
  });

  it("the production wiring is server-only", () => {
    expect(read("route.ts")).toMatch(/^import "server-only";/m);
  });
});
