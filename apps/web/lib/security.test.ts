import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

// Static repository checks for the security foundation (/docs/security.md).
// They read source text only; all values here are fake patterns.
const repo = join(__dirname, "../../..");
const web = join(repo, "apps/web");
const SKIP = new Set(["node_modules", ".next", ".git", ".turbo", "dist"]);

// Paths are compared and matched as posix strings so the checks behave the same on Windows.
const posix = (p: string) => p.split(sep).join("/");
const relTo = (base: string, p: string) => posix(relative(base, p));

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [posix(path)];
  });

const read = (path: string) => readFileSync(path, "utf8");
// Source with comments removed, so prose mentioning a name is not a real use.
const code = (path: string) =>
  read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const rel = (p: string) => relTo(repo, p);
// Test support code (shared Vitest helpers with fake fixtures) counts as test code.
const isTest = (f: string) => /\.test\.tsx?$/.test(f) || /packages\/shared\/src\/testing\//.test(f);
const sources = (dir: string) => walk(dir).filter((f) => /\.(tsx?|mjs)$/.test(f));

// Scanned text files: source, config, docs, workflows, env examples.
const textFiles = walk(repo).filter(
  (f) =>
    /\.(tsx?|mjs|cjs|js|json|md|ya?ml|example|sample|sql|sh|toml|css|html|txt)$/.test(f) &&
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
    const names = serverOnly.map((f) => relTo(web, f));
    expect(names).toEqual(expect.arrayContaining(["lib/env/server.ts", "db/index.ts"]));
  });

  it("any module reading DATABASE_URL or CLERK_SECRET_KEY is server-only or tooling", () => {
    // db/env.ts and drizzle.config.ts/scripts are Node tooling; they are not
    // importable from client code (checked below).
    const allowed = ["lib/env/server.ts", "db/index.ts", "db/env.ts", "drizzle.config.ts", "scripts/db-check.ts"];    const offenders = sources(web)
      .filter((f) => !isTest(f))
      .filter((f) => /process\.env\.(DATABASE_URL|CLERK_SECRET_KEY)|["']DATABASE_URL["']/.test(read(f)))
      .map((f) => relTo(web, f))
      .filter((f) => !allowed.includes(f));
    expect(offenders).toEqual([]);
  });

  it("the database libraries are imported only by the data layer and its tooling", () => {
    // docs/database.md sections 5 and 8: queries and raw SQL live behind the data-access layer.
    const allowedDirs = ["db/", "scripts/", "drizzle/"];
    const allowedFiles = ["drizzle.config.ts"];
    const offenders = sources(web)
      .filter((f) => !isTest(f))
      .map((f) => relTo(web, f))
      .filter((f) => !allowedDirs.some((d) => f.startsWith(d)) && !allowedFiles.includes(f))
      .filter((f) => /from\s+["'](?:drizzle-orm|drizzle-kit|@neondatabase\/)/.test(read(join(web, f))));
    expect(offenders).toEqual([]);
  });

  it("the Clerk SDK is imported only in its adapter locations", () => {
    // docs/code-quality.md section 12: vendors stay behind ports. Services, the API adapter,
    // the data layer and ordinary components must stay agnostic of the identity vendor.
    const allowed = [/^proxy\.ts$/, /^lib\/auth\//, /^lib\/clerk-appearance\.ts$/, /^components\/shell\//, /^app\/(?!api\/)/, /^e2e\//];
    const offenders = sources(web)
      .filter((f) => !isTest(f))
      .map((f) => relTo(web, f))
      .filter((f) => !allowed.some((re) => re.test(f)))
      .filter((f) => /from\s+["']@clerk\//.test(read(join(web, f))));
    expect(offenders).toEqual([]);
  });

  it("'use client' files never import server-only, db, or tooling modules", () => {
    const forbidden = /from\s+["'](?:server-only|@\/db(?:\/[^"']*)?|@\/lib\/env\/server|\.{1,2}\/[^"']*(?:\/db|lib\/env\/server|db\/env)[^"']*|drizzle-orm[^"']*|@neondatabase[^"']*|@clerk\/nextjs\/server)["']|import\s+["']server-only["']/;
    const offenders = sources(web)
      .filter((f) => !isTest(f))
      .filter((f) => /^["']use client["']/m.test(read(f)))
      .filter((f) => forbidden.test(read(f)))
      .map((f) => relTo(web, f));
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

  it("dependencies flow apps -> validation -> shared, never the reverse", () => {
    // docs/code-quality.md section 3 and docs/shared-code.md: packages never import app code,
    // and shared never imports validation. Relative paths that leave a package would bypass
    // the package manager's own check, so they are rejected here.
    const importsOf = (f: string) => [...code(f).matchAll(/(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g)].map((m) => m[1]);
    const problems = ["shared", "validation"].flatMap((pkg) =>
      sources(join(repo, "packages", pkg, "src"))
        .filter((f) => !isTest(f))
        .flatMap((f) =>
          importsOf(f)
            .filter(
              (spec) =>
                /(^|\/)apps\//.test(spec) ||
                (spec.startsWith(".") && !join(f, "..", spec).startsWith(join(repo, "packages", pkg))) ||
                (pkg === "shared" && spec.startsWith("@signalone/validation")),
            )
            .map((spec) => `${rel(f)} imports ${spec}`),
        ),
    );
    expect(problems).toEqual([]);
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
      ["aws access key id", /\bAKIA[0-9A-Z]{16}\b/],
      ["google api key", /\bAIza[0-9A-Za-z_-]{35}\b/],
      ["slack token", /\bxox[baprs]-[0-9A-Za-z-]{10,}/],
      ["neon api key", /\bnapi_[a-z0-9]{30,}/],
      ["json web token", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
    ];
    // Test files are scanned too. A real credential never carries one of these markers, so a
    // fixture that does is accepted; anything else key-shaped in a test file is an offender.
    const FAKE_MARKER = /SECRET|REPLACE|FAKE|PLACEHOLDER|dummy|example|\.invalid|localhost|:(?:p|pw)@|@host\b/i;
    const testFiles = walk(repo).filter((f) => isTest(f) && /\.tsx?$/.test(f));
    const scan = (f: string, tolerateFakes: boolean) =>
      patterns.flatMap(([name, re]) => {
        const hits = [...read(f).matchAll(new RegExp(re.source, "g"))].map((m) => m[0]);
        return hits.filter((h) => !(tolerateFakes && FAKE_MARKER.test(h))).length > 0 ? [`${rel(f)}: ${name}`] : [];
      });
    const offenders = [...textFiles.flatMap((f) => scan(f, false)), ...testFiles.flatMap((f) => scan(f, true))];
    expect(offenders).toEqual([]);
    // The scan reads every committed text file, so it grows with the repository: allow 30 seconds, not 5.
  }, 30_000);

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

  // The one place production is touched on purpose: the manual migration workflow, checked more strictly below.
  const productionMigration = join(repo, ".github/workflows/migrate-production.yml");

  it("workflows never use production credentials or a prod environment, except the one manual migration workflow", () => {
    const offenders = workflows
      .filter((f) => !f.endsWith("migrate-production.yml"))
      .filter((f) => /(DATABASE_ENV|APP_ENV):\s*["']?prod|NEON_PROD|PROD_DATABASE|sk_live_/i.test(read(f)));
    expect(offenders.map(rel)).toEqual([]);
  });

  describe("the production migration workflow, where present", () => {
    // An application made from the template may not have it; any file that exists is held to all of these.
    const present = existsSync(productionMigration);
    const text = present ? read(productionMigration) : "";
    const lines = text.split(/\r?\n/);

    it.skipIf(!present)("starts only by hand, from main, and runs in the reviewed production environment", () => {
      const triggers = /^on:\r?\n([\s\S]*?)^permissions:/m.exec(text)?.[1] ?? "";
      expect(triggers).toMatch(/^\s{2}workflow_dispatch:/m);
      expect(triggers).not.toMatch(/\b(push|pull_request|pull_request_target|schedule|workflow_run|workflow_call|release|issue_comment):/);
      expect(text).toMatch(/if:\s*github\.ref == 'refs\/heads\/main'/);
      expect(text).toMatch(/^\s{4}environment:\s*production\s*$/m);
    });

    it.skipIf(!present)("has read-only repository access and no write permission", () => {
      expect(text).toMatch(/^permissions:\r?\n\s{2}contents:\s*read\s*$/m);
      expect(text).not.toMatch(/:\s*write\b/);
    });

    it.skipIf(!present)("takes the typed confirmation only through an environment variable, never inside a shell command", () => {
      const uses = lines.filter((l) => /\$\{\{\s*(inputs|github\.event\.inputs)\b/.test(l));
      expect(uses.length).toBeGreaterThan(0);
      for (const l of uses) expect(l).toMatch(/^\s+PROD_MIGRATION_CONFIRM:\s*\$\{\{/);
    });

    it.skipIf(!present)("reads only the database address secret, and only runs the production migration command", () => {
      const secrets = [...text.matchAll(/\$\{\{\s*secrets\.([A-Z0-9_]+)\s*\}\}/g)].map((m) => m[1]);
      expect(secrets).toEqual(["DATABASE_URL"]);
      const commands = lines.filter((l) => /pnpm --filter/.test(l)).map((l) => l.trim());
      expect(commands).toEqual(["run: pnpm --filter web db:migrate:prod -- --env=prod"]);
      expect(text).not.toMatch(/db:(reset|seed|refresh|generate)|drizzle-kit|DROP |TRUNCATE/i);
    });
  });

  it("workflows grant no merge, force-push, reset, or branch-delete tooling", () => {
    const offenders = workflows.filter((f) =>
      /gh pr merge|git push --force|git push -f|git reset|git branch -[dD]|--force/.test(read(f)),
    );
    expect(offenders.map(rel)).toEqual([]);
  });

  it("only the Claude workflow holds write permissions, plus the one-permission monthly review issue", () => {
    const writes = (f: string) => [...read(f).matchAll(/(contents|pull-requests|issues|actions|id-token):\s*write/g)].map((m) => m[1]);
    const offenders = workflows
      .filter((f) => !f.endsWith("claude.yml"))
      .filter((f) => (f.endsWith("monthly-review.yml") ? writes(f).some((w) => w !== "issues") : writes(f).length > 0));
    expect(offenders.map(rel)).toEqual([]);
  });

  it("the monthly review workflow, where present, can only create an issue: no checkout, no third-party actions", () => {
    // An application made from the template may remove this workflow; the permission test above
    // still covers any file that exists, so only a present file is checked here.
    const file = join(repo, ".github/workflows/monthly-review.yml");
    if (!existsSync(file)) return;
    const text = read(file);
    expect(text).not.toMatch(/^\s*-?\s*uses:/m);
    expect(text).toMatch(/issues:\s*write/);
    expect(text).toMatch(/gh issue create/);
  });

  it("every action is pinned to a full commit hash", () => {
    const unpinned = workflows.flatMap((f) =>
      read(f)
        .split(/\r?\n/)
        .filter((line) => /^\s*(-\s*)?uses:/.test(line) && !/@[0-9a-f]{40}\b/.test(line))
        .map((line) => `${rel(f)}: ${line.trim()}`),
    );
    expect(unpinned).toEqual([]);
  });

  describe("the Claude workflow", () => {
    const text = read(join(repo, ".github/workflows/claude.yml"));
    const args = /claude_args:\s*'([^\r\n]*)'/.exec(text)?.[1] ?? "";
    const entries = [...args.matchAll(/Bash\(([^)]*)\)/g)].map((m) => m[1]);

    it("has an allow-list to check", () => {
      expect(entries.length).toBeGreaterThan(0);
    });

    it("has no wildcard on pnpm, npx or corepack, and only read subcommands of gh pr", () => {
      const broad = entries.filter((e) => {
        if (/^(pnpm|corepack)\b/.test(e)) return e.includes("*");
        if (/^npx\b/.test(e)) return true;
        if (/^gh pr\b/.test(e)) return !/^gh pr (view|list|diff|checks):\*$/.test(e);
        return false;
      });
      expect(broad).toEqual([]);
    });

    it("can merge a local checkout but never a pull request", () => {
      const mergers = entries.filter((e) => /merge/.test(e));
      expect(mergers.sort()).toEqual(["git merge-base:*", "git merge:*"]);
    });

    it("carries no database credential", () => {
      expect(text).not.toMatch(/DATABASE_URL|DATABASE_ENV|NEON_/);
    });
  });
});
