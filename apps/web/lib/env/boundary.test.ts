import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Static guard: client-reachable code must not touch server-only modules or
// secret variables. Validation logic itself is tested in @signalone/shared.
const root = join(__dirname, "../..");

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(tsx?|mjs)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });

const read = (path: string) => readFileSync(path, "utf8");

describe("client/server boundary", () => {
  it("server env and db modules are guarded by server-only", () => {
    expect(read(join(root, "lib/env/server.ts"))).toMatch(/^import "server-only";/m);
    expect(read(join(root, "db/index.ts"))).toMatch(/^import "server-only";/m);
  });

  it("client env module reads no secrets and imports no server module", () => {
    const src = read(join(root, "lib/env/client.ts"));
    expect(src).not.toMatch(/DATABASE_|CLERK_SECRET|process\.env\.APP_ENV|\/server|\/db/);
  });

  it("'use client' files never import server env or db, or read secrets", () => {
    const offenders = ["components", "app", "lib"]
      .flatMap((d) => files(join(root, d)))
      .filter((f) => /^["']use client["']/m.test(read(f)))
      .filter((f) =>
        /lib\/env\/server|@\/db|process\.env\.(DATABASE|CLERK_SECRET)/.test(read(f)),
      );
    expect(offenders).toEqual([]);
  });

  it("no raw secret or environment-identity reads outside lib/env and db tooling", () => {
    const offenders = ["app", "components", "lib"]
      .flatMap((d) => files(join(root, d)))
      .filter((f) => !f.includes("/lib/env/"))
      .filter((f) => /process\.env\.(DATABASE_|APP_ENV|CLERK_SECRET)/.test(read(f)));
    expect(offenders).toEqual([]);
  });
});
