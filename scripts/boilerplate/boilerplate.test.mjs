// Self-test for the boilerplate tooling (node:test, no dependencies):
// `pnpm test:boilerplate`. Copies the repository to a temp directory, runs the
// real init against a non-Signal-One identity, and checks the leak detector.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { checkBoilerplate } from "./check-boilerplate.mjs";
import { applyIdentity, initApp, stripMarkedRegions, validateIdentity } from "./init-app.mjs";
import { listSourceFiles, untrackedSourceFiles, walk } from "./manifest.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const identity = { name: "Harbor Notes", slug: "harbor-notes", scope: "harbor", bundleId: "com.harbornotes.app" };
const temps = [];
const isReference = existsSync(path.join(repo, "scripts/boilerplate/export-template.mjs"));

function copyTemplate() {
  const dir = mkdtempSync(path.join(tmpdir(), "boilerplate-"));
  temps.push(dir);
  for (const file of listSourceFiles(repo)) {
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    cpSync(path.join(repo, file), path.join(dir, file));
  }
  return dir;
}
const read = (dir, file) => readFileSync(path.join(dir, file), "utf8");

after(() => temps.forEach((d) => rmSync(d, { recursive: true, force: true })));

// The proof copies only the files git tracks. A new file that was never staged would be missing from the generated
// app and fail it in a confusing way (it happened twice), so the proof refuses to run until such files are staged.
describe("untracked source files", () => {
  const git = (cwd, ...args) => spawnSync("git", args, { cwd, encoding: "utf8" });

  it("lists new files that are neither tracked nor ignored, and ignores the owner's .claude folder", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "untracked-"));
    after(() => rmSync(dir, { recursive: true, force: true }));
    git(dir, "init", "-q");
    writeFileSync(path.join(dir, ".gitignore"), "ignored.txt\n");
    writeFileSync(path.join(dir, "tracked.txt"), "a");
    git(dir, "add", ".gitignore", "tracked.txt");
    writeFileSync(path.join(dir, "new-file.ts"), "b");
    writeFileSync(path.join(dir, "ignored.txt"), "c");
    mkdirSync(path.join(dir, ".claude"));
    writeFileSync(path.join(dir, ".claude", "settings.local.json"), "{}");
    assert.deepEqual(untrackedSourceFiles(dir), ["new-file.ts"]);
    git(dir, "add", "new-file.ts");
    assert.deepEqual(untrackedSourceFiles(dir), []); // staging it clears the problem
  });

  it("returns nothing outside a git checkout instead of failing", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "no-git-"));
    after(() => rmSync(dir, { recursive: true, force: true }));
    writeFileSync(path.join(dir, "file.txt"), "x");
    assert.deepEqual(untrackedSourceFiles(dir), []);
  });
});

describe("boilerplate tooling", () => {
  it("detector flags the unmodified template (negative control)", () => {
    const rules = new Set(checkBoilerplate(repo).map((f) => f.rule));
    // The standalone boilerplate has no proof slice; only the reference app (which can export) does.
    const expected = ["identity", "template-only", "placeholder-id", ...(isReference ? ["proof-artifact", "proof-reference"] : [])];
    for (const rule of expected) {
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

  it("export yields a Signal One-free, proof-free boilerplate that still initializes", { skip: !isReference }, async () => {
    const { exportTemplate } = await import("./export-template.mjs");
    const out = path.join(mkdtempSync(path.join(tmpdir(), "boilerplate-export-")), "out");
    temps.push(path.dirname(out));
    exportTemplate({ source: repo, out, log: () => {} });

    const content = walk(out)
      .filter((f) => !f.startsWith("scripts/boilerplate/"))
      .map((f) => readFileSync(path.join(out, f), "latin1"))
      .join("\n");
    assert.ok(!/signal[\s_-]?one/i.test(content), "no Signal One identity outside the tooling");
    assert.ok(!existsSync(path.join(out, "apps/web/drizzle")) && !existsSync(path.join(out, "apps/web/app/proof")));
    assert.ok(!existsSync(path.join(out, "scripts/boilerplate/export-template.mjs")));
    assert.equal(JSON.parse(read(out, "package.json")).name, "app-boilerplate");
    assert.ok(!("export:boilerplate" in JSON.parse(read(out, "package.json")).scripts));
    assert.match(read(out, "README.md"), /Template repository/);
    // Only template identity findings remain; no proof or reference-app leftovers.
    const rules = new Set(checkBoilerplate(out).map((f) => f.rule));
    assert.deepEqual([...rules].sort(), ["identity", "placeholder-id", "template-only"]);

    initApp({ root: out, ...identity, log: () => {} });
    assert.deepEqual(checkBoilerplate(out), []);
    assert.equal(JSON.parse(read(out, "package.json")).name, "harbor-notes");
    assert.match(read(out, "pnpm-lock.yaml"), /'@harbor\/shared'/);
  });

  it("renames the full product name, not just its first words", () => {
    const out = applyIdentity("Welcome to Signal One Sound. SIGNAL ONE SOUND. Signal One. signal-one-sound.", { ...identity, name: "Harbor Notes", slug: "harbor-notes" });
    assert.equal(out, "Welcome to Harbor Notes. HARBOR NOTES. Harbor Notes. harbor-notes.");
  });

  it("rejects identities that would leak the reference app or a placeholder", () => {
    assert.deepEqual(validateIdentity(identity), []);
    assert.ok(validateIdentity({ ...identity, name: "Signal One Clone" }).length > 0);
    assert.ok(validateIdentity({ ...identity, slug: "signalone-two" }).length > 0);
    assert.ok(validateIdentity({ ...identity, name: "App Boilerplate" }).length > 0);
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

  it("copies only committed files: untracked files and local env files stay behind", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "boilerplate-git-"));
    temps.push(dir);
    const git = (...args) => spawnSync("git", args, { cwd: dir, encoding: "utf8" });
    git("init", "-q");
    writeFileSync(path.join(dir, "tracked.txt"), "kept");
    git("add", "tracked.txt");
    writeFileSync(path.join(dir, "untracked.txt"), "scratch");
    writeFileSync(path.join(dir, ".env.local"), "SECRET=x");
    assert.deepEqual(listSourceFiles(dir), ["tracked.txt"]);
    // Not a git checkout (an exported template): fall back to the folder walk.
    const plain = mkdtempSync(path.join(tmpdir(), "boilerplate-plain-"));
    temps.push(plain);
    writeFileSync(path.join(plain, "a.txt"), "a");
    assert.deepEqual(listSourceFiles(plain), ["a.txt"]);
  });

  it("region stripping handles block and inline markers", () => {
    const text = "a\n\n<!-- boilerplate:proof:start -->\n## P\nx\n<!-- boilerplate:proof:end -->\n\n## Keep\nline.<!-- boilerplate:template:start --> gone<!-- boilerplate:template:end -->\n";
    assert.equal(stripMarkedRegions(text), "a\n\n## Keep\nline.\n");
  });
});
