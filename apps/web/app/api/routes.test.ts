import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: null }) }));

import { GET as status } from "./v1/status/route";
import { GET as fallback, POST as fallbackPost } from "./[...path]/route";

const routeFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return routeFiles(path);
    return name === "route.ts" ? [path] : [];
  });

describe("API route conformance", () => {
  // The catch-all only returns the standard 404 envelope; it holds no data and calls no service.
  const files = routeFiles(__dirname).filter((f) => !f.includes("[...path]"));

  it("finds the versioned route files", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("every versioned route goes through the shared apiRoute wrapper (authentication, validation, size cap, safe errors)", () => {
    const offenders = files.filter((f) => {
      const text = readFileSync(f, "utf8");
      const usesWrapper = /\bapiRoute\b/.test(text) && /lib\/api\/route["']/.test(text);
      const plainHandler = /export\s+(?:async\s+)?function\s+(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/.test(text);
      return !usesWrapper || plainHandler;
    });
    expect(offenders.map((f) => relative(__dirname, f))).toEqual([]);
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
