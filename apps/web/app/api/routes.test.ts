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

  const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

  // Every exported HTTP handler in a route file, with the text that defines it. A handler is
  // acceptable only when it is built by apiRoute (directly, or by a helper that is handed apiRoute).
  function handlerProblems(text: string): string[] {
    const problems: string[] = [];
    const found = new Set<string>();
    for (const m of text.matchAll(/export\s+(?:async\s+)?function\s+([A-Z]+)\b/g)) {
      if (METHODS.includes(m[1])) problems.push(`${m[1]} is a plain function`);
    }
    for (const m of text.matchAll(/export\s*\{[^}]*\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b[^}]*\}/g)) {
      problems.push(`${m[1]} is re-exported without the wrapper`);
    }
    // The right-hand side is read with a lookahead so one export never swallows the next one.
    for (const m of text.matchAll(/export\s+const\s+(\{[^}]*\}|[A-Za-z_]\w*)\s*=\s*(?=([\s\S]{0,160}))/g)) {
      const names = m[1].replace(/[{}\s]/g, "").split(",").filter((n) => METHODS.includes(n));
      const rhs = m[2];
      for (const name of names) {
        found.add(name);
        const wrapped = /^\s*apiRoute\s*\(/.test(rhs) || /^\s*[A-Za-z_]\w*\(\s*apiRoute\b/.test(rhs);
        if (!wrapped) problems.push(`${name} is not built by apiRoute`);
      }
    }
    if (found.size === 0) problems.push("exports no handler built by apiRoute");
    return problems;
  }

  it("every exported handler of every versioned route is built by the shared apiRoute wrapper (authentication, validation, size cap, safe errors)", () => {
    const offenders = files.flatMap((f) =>
      handlerProblems(readFileSync(f, "utf8")).map((p) => `${relative(__dirname, f)}: ${p}`),
    );
    expect(offenders).toEqual([]);
  });

  it("the handler scan understands the shapes it must reject", () => {
    expect(handlerProblems("export const GET = apiRoute({ auth: 'public' });")).toEqual([]);
    expect(handlerProblems("export const { GET, POST } = routes(apiRoute, svc);")).toEqual([]);
    expect(handlerProblems("export const GET = apiRoute({});\nexport const POST = async () => Response.json({});")).toEqual([
      "POST is not built by apiRoute",
    ]);
    expect(handlerProblems("export async function GET() { return Response.json({}); }")).toHaveLength(2);
    expect(handlerProblems("export { GET } from './other';")).toHaveLength(2);
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
