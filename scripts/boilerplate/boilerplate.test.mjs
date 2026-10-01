// Self-test for the boilerplate tooling (node:test, no dependencies):
// `pnpm test:boilerplate`. Copies the repository to a temp directory, runs the
// real init against a non-Signal-One identity, and checks the leak detector.
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { checkBoilerplate } from "./check-boilerplate.mjs";
import { initApp, stripMarkedRegions, validateIdentity } from "./init-app.mjs";
import { walk } from "./manifest.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const identity = { name: "Harbor Notes", slug: "harbor-notes", scope: "harbor", bundleId: "com.harbornotes.app" };
const temps = [];

function copyTemplate() {
  const dir = mkdtempSync(path.join(tmpdir(), "boilerplate-"));
  temps.push(dir);
  for (const file of walk(repo)) {
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    cpSync(path.join(repo, file), path.join(dir, file));
  }
  return dir;
}
const read = (dir, file) => readFileSync(path.join(dir, file), "utf8");

after(() => temps.forEach((d) => rmSync(d, { recursive: true, force: true })));

describe("boilerplate tooling", () => {
  it("detector flags the unmodified template (negative control)", () => {
    const rules = new Set(checkBoilerplate(repo).map((f) => f.rule));
    for (const rule of ["identity", "proof-artifact", "proof-reference", "template-only", "placeholder-id"]) {
      assert.ok(rules.has(rule), `expected a ${rule} finding`);
    }
  });

  it("init produces a clean, generic application and refuses to run twice", () => {
    const root = copyTemplate();
    initApp({ root, ...identity, log: () => {} });

    assert.deepEqual(checkBoilerplate(root), []);
    // Identity applied to packages, imports, mobile identity, lockfile.
    assert.equal(JSON.parse(read(root, "package.json")).name, "harbor-notes");
    assert.equal(JSON.parse(read(root, "packages/shared/package.json")).name, "@harbor/shared");
    assert.match(read(root, "apps/mobile/app.config.ts"), /bundleIdentifier: "com\.harbornotes\.app"/);
    assert.match(read(root, "apps/mobile/app.config.ts"), /package: "com\.harbornotes\.app"/);
    assert.match(read(root, "pnpm-lock.yaml"), /'@harbor\/shared'/);
    // Proof slice, proof migrations and template-only files are gone; reusable foundation stays.
    assert.ok(!existsSync(path.join(root, "apps/web/drizzle")));
    assert.ok(!existsSync(path.join(root, "scripts/boilerplate")));
    for (const kept of ["apps/web/db/tooling/guard.ts", "apps/web/lib/api/handler.ts", "apps/web/playwright.config.ts", "docs/issues.md", "docs/new-app-setup.md", ".github/workflows/ci.yml"]) {
      assert.ok(existsSync(path.join(root, kept)), `${kept} should remain`);
    }
    assert.ok(!read(root, "apps/web/proxy.ts").includes("/proof"));
    assert.ok(!/test:boilerplate|init:app/.test(read(root, "package.json")));
    // Docs keep their structure after region stripping.
    assert.match(read(root, "docs/api.md"), /## Unexpected-error reporting/);
    assert.ok(!/Vertical-slice proof/.test(read(root, "docs/api.md")));

    // The init script is removed, so a second run cannot happen in place.
    assert.throws(() => initApp({ root, ...identity, log: () => {} }), /already initialized/);
  });

  it("rejects identities that would leak the reference app or a placeholder", () => {
    assert.deepEqual(validateIdentity(identity), []);
    assert.ok(validateIdentity({ ...identity, name: "Signal One Clone" }).length > 0);
    assert.ok(validateIdentity({ ...identity, slug: "signalone-two" }).length > 0);
    assert.ok(validateIdentity({ ...identity, bundleId: "com.example.app" }).length > 0);
    assert.ok(validateIdentity({ ...identity, bundleId: "notabundleid" }).length > 0);
  });

  it("detector catches a credential-shaped URL added after init, and ignores local env files", () => {
    const root = copyTemplate();
    initApp({ root, ...identity, log: () => {} });
    const fake = ["post", "gres://someone:hunter2@db.invalid/app"].join("");
    writeFileSync(path.join(root, "apps/web/leak.ts"), `export const x = "${fake}";\n`);
    writeFileSync(path.join(root, "apps/web/.env.local"), `DATABASE_URL=${fake}\n`);
    const findings = checkBoilerplate(root);
    assert.deepEqual(findings.map((f) => `${f.rule}:${f.file}`), ["secret:apps/web/leak.ts"]);
  });

  it("region stripping handles block and inline markers", () => {
    const text = "a\n\n<!-- boilerplate:proof:start -->\n## P\nx\n<!-- boilerplate:proof:end -->\n\n## Keep\nline.<!-- boilerplate:template:start --> gone<!-- boilerplate:template:end -->\n";
    assert.equal(stripMarkedRegions(text), "a\n\n## Keep\nline.\n");
  });
});
