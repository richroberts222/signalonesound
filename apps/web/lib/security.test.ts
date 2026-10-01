import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Static repository checks for the security foundation (/docs/security.md).
// They read source text only; all values here are fake patterns.
const repo = join(__dirname, "../../..");
const web = join(repo, "apps/web");
const SKIP = new Set(["node_modules", ".next", ".git", ".turbo", "dist"]);

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const read = (path: string) => readFileSync(path, "utf8");
// Source with comments removed, so prose mentioning a name is not a real use.
const code = (path: string) =>
  read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const rel = (p: string) => relative(repo, p);
const isTest = (f: string) => /\.test\.tsx?$/.test(f);
const sources = (dir: string) => walk(dir).filter((f) => /\.(tsx?|mjs)$/.test(f));

// Scanned text files: source, config, docs, workflows, env examples.
const textFiles = walk(repo).filter(
  (f) =>
    /\.(tsx?|mjs|json|md|ya?ml|example)$/.test(f) &&
    !f.endsWith("pnpm-lock.yaml") &&
    !isTest(f),
);

describe("public environment variables", () => {
  it("no NEXT_PUBLIC_/EXPO_PUBLIC_ name carries a secret-like word", () => {
    const secretish = /(DATABASE|SECRET|PRIVATE|PASSWORD|TOKEN|CONNECTION|CREDENTIAL|API_KEY|SERVICE_KEY)/;
    const offenders = textFiles.flatMap((f) =>
      [...read(f).matchAll(/\b(?:NEXT|EXPO)_PUBLIC_[A-Z0-9_]+/g)]
        .map((m) => m[0])
        .filter((n) => secretish.test(n))
        .map((n) => `${rel(f)}: ${n}`),
    );
    // docs/tests may name the forbidden pattern explicitly; code and config may not.
    expect(offenders.filter((o) => !o.includes(".md:"))).toEqual([]);
  });

  it("the client env module reads only an explicit allow-list of public names", () => {
    const names = [...code(join(web, "lib/env/client.ts")).matchAll(/process\.env\.([A-Z0-9_]+)/g)].map(
      (m) => m[1],
    );
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((n) => !n.startsWith("NEXT_PUBLIC_"))).toEqual([]);
  });

  it("next.config does not forward secrets through the env option", () => {
    expect(read(join(web, "next.config.ts"))).not.toMatch(/\benv\s*:/);
  });
});

describe("server-only modules", () => {
  const serverOnly = sources(web).filter((f) => /^import "server-only";/m.test(read(f)));

  it("exist for env and db", () => {
    const names = serverOnly.map((f) => relative(web, f));
    expect(names).toEqual(expect.arrayContaining(["lib/env/server.ts", "db/index.ts"]));
  });

  it("any module reading DATABASE_URL or CLERK_SECRET_KEY is server-only or tooling", () => {
    // db/env.ts and drizzle.config.ts/scripts are Node tooling; they are not
    // importable from client code (checked below).
    const allowed = ["lib/env/server.ts", "db/index.ts", "db/env.ts", "drizzle.config.ts", "scripts/db-check.ts"];
    const offenders = sources(web)
      .filter((f) => !isTest(f))
      .filter((f) => /process\.env\.(DATABASE_URL|CLERK_SECRET_KEY)|["']DATABASE_URL["']/.test(read(f)))
      .map((f) => relative(web, f))
      .filter((f) => !allowed.includes(f));
    expect(offenders).toEqual([]);
  });

  it("'use client' files never import server-only, db, or tooling modules", () => {
    const forbidden = /from\s+["'](?:server-only|@\/db(?:\/[^"']*)?|@\/lib\/env\/server|\.{1,2}\/[^"']*(?:\/db|lib\/env\/server|db\/env)[^"']*|drizzle-orm[^"']*|@neondatabase[^"']*|@clerk\/nextjs\/server)["']|import\s+["']server-only["']/;
    const offenders = sources(web)
      .filter((f) => !isTest(f))
      .filter((f) => /^["']use client["']/m.test(read(f)))
      .filter((f) => forbidden.test(read(f)))
      .map((f) => relative(web, f));
    expect(offenders).toEqual([]);
  });

  it("shared packages never import server-only or read process.env", () => {
    const offenders = ["packages/shared/src", "packages/validation/src"]
      .flatMap((d) => sources(join(repo, d)))
      .filter((f) => !isTest(f))
      .filter((f) => /server-only|process\.env|drizzle|@neondatabase|@clerk\/nextjs\/server/.test(code(f)))
      .map(rel);
    expect(offenders).toEqual([]);
  });
});

describe("committed files contain no real secrets", () => {
  it(".env.example holds placeholders only", () => {
    const text = read(join(web, ".env.example"));
    expect(text).toMatch(/DATABASE_URL=postgresql:\/\/USER:PASSWORD@HOST\//);
    expect(text).toMatch(/CLERK_SECRET_KEY=sk_test_REPLACE_ME/);
    expect(text).not.toMatch(/sk_live_|NEXT_PUBLIC_DATABASE/);
    expect(text).toMatch(/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_REPLACE_ME/);
  });

  it("no committed file contains key-shaped secrets or credentialed connection strings", () => {
    const patterns: [string, RegExp][] = [
      ["clerk secret key", /sk_(?:live|test)_(?!REPLACE_ME)[A-Za-z0-9]{10,}/],
      ["clerk live publishable key", /pk_live_[A-Za-z0-9]{10,}/],
      ["credentialed postgres url", /postgres(?:ql)?:\/\/(?!USER:PASSWORD@)[^\s:@/]+:[^\s@/]+@(?!HOST)/],
      ["private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
      ["github token", /gh[pousr]_[A-Za-z0-9]{30,}/],
    ];
    const offenders = textFiles.flatMap((f) =>
      patterns.filter(([, re]) => re.test(read(f))).map(([name]) => `${rel(f)}: ${name}`),
    );
    expect(offenders).toEqual([]);
  });

  it("env files are gitignored except .env.example", () => {
    const root = read(join(repo, ".gitignore"));
    const app = read(join(web, ".gitignore"));
    expect(root).toMatch(/^\.env\.\*$/m);
    expect(root).toMatch(/^!\.env\.example$/m);
    expect(app).toMatch(/^\.env\*$/m);
    expect(app).toMatch(/^!\.env\.example$/m);
  });
});

describe("workflow safety", () => {
  const workflows = walk(join(repo, ".github/workflows")).filter((f) => /\.ya?ml$/.test(f));

  it("workflows never use production credentials or a prod environment", () => {
    const offenders = workflows.filter((f) =>
      /(DATABASE_ENV|APP_ENV):\s*["']?prod|NEON_PROD|PROD_DATABASE|sk_live_/i.test(read(f)),
    );
    expect(offenders.map(rel)).toEqual([]);
  });

  it("workflows grant no merge, force-push, reset, or branch-delete tooling", () => {
    const offenders = workflows.filter((f) =>
      /gh pr merge|git push --force|git push -f|git reset|git branch -[dD]|--force/.test(read(f)),
    );
    expect(offenders.map(rel)).toEqual([]);
  });

  it("the review workflow cannot write to the repository", () => {
    const text = read(join(repo, ".github/workflows/claude-code-review.yml"));
    expect(text).toMatch(/contents:\s*read/);
    expect(text).not.toMatch(/(contents|pull-requests|issues):\s*write/);
  });
});
