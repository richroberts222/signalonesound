// Self-test for the "a fix carries a guard" check: node --test scripts/fix-has-guard.test.mjs
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { evaluateFix } from "./fix-has-guard.mjs";

describe("fix-has-guard", () => {
  it("ignores pull requests that are not fixes", () => {
    assert.deepEqual(evaluateFix({ title: "docs: add a section", branch: "docs/issue-1", files: ["docs/a.md"] }), {
      ok: true,
      isFix: false,
      reason: "not a fix",
    });
    assert.equal(evaluateFix({ title: "Add a feature", branch: "feat/x", files: [] }).isFix, false);
  });

  it("fails a fix that changes only code or documents", () => {
    for (const title of ["fix: stop the crash", "Fix: route test", "bugfix: typo in handler", "hotfix! rotate key"]) {
      const r = evaluateFix({ title, branch: "x/y", files: ["apps/web/lib/a.ts", "docs/a.md"] });
      assert.equal(r.ok, false, title);
      assert.equal(r.isFix, true, title);
    }
    assert.equal(evaluateFix({ title: "Stop the crash", branch: "fix/issue-1-crash", files: ["apps/web/lib/a.ts"] }).ok, false);
  });

  it("accepts a fix that adds or changes a test", () => {
    for (const test of ["apps/web/lib/a.test.ts", "apps/web/x.test.tsx", "scripts/x.test.mjs", "apps\\web\\lib\\a.test.ts"]) {
      assert.equal(evaluateFix({ title: "fix: x", branch: "fix/x", files: ["src/a.ts", test] }).ok, true, test);
    }
  });

  it("accepts a fix that records why no guard is possible", () => {
    const r = evaluateFix({ title: "fix: x", branch: "fix/x", files: ["src/a.ts", "docs/lessons.md"] });
    assert.equal(r.ok, true);
    assert.match(r.reason, /lesson/);
  });

  it("accepts a dependency-only fix, which has nothing to test", () => {
    const r = evaluateFix({ title: "fix(deps): update Next.js", branch: "fix/issue-118-next", files: ["apps/web/package.json", "pnpm-lock.yaml"] });
    assert.equal(r.ok, true);
    assert.match(r.reason, /dependency/);
    assert.equal(evaluateFix({ title: "fix: x", branch: "fix/x", files: ["package.json", "src/a.ts"] }).ok, false);
  });

  it("does not treat dependency updates as fixes", () => {
    assert.equal(evaluateFix({ title: "fix(deps): update next", branch: "fix/issue-2-next", files: ["package.json"] }).isFix, true);
    assert.equal(evaluateFix({ title: "fix(deps): bump x", branch: "dependabot/npm_and_yarn/x", files: ["package.json"] }).isFix, false);
    assert.equal(evaluateFix({ title: "build(deps): bump the group", branch: "dependabot/npm_and_yarn/g", files: ["pnpm-lock.yaml"] }).isFix, false);
  });
});
