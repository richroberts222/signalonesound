#!/usr/bin/env node
// Every fix closes its own gap (docs/lessons.md, docs/issues.md "Every problem becomes a rule").
// A pull request that is a fix must add or change a test (a guard), or add a lesson to
// docs/lessons.md explaining why no guard is possible. Runs in CI on pull requests.
//
//   PR_TITLE="fix: ..." PR_BRANCH="fix/..." BASE_REF=origin/main node scripts/fix-has-guard.mjs
//
// Pull request values arrive through environment variables, never interpolated into a shell command.
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const FIX_TITLE = /^\s*(?:fix|bug|bugfix|hotfix)\b(?!\s*\(\s*deps)/i;
const FIX_BRANCH = /^(?:fix|bug|bugfix|hotfix)\//i;
const AUTOMATED = /^(?:dependabot|renovate)\//i;
const GUARD_FILE = /\.test\.(?:ts|tsx|mjs|js)$/;
const LESSONS = "docs/lessons.md";

/** Decides whether a pull request is a fix and, if so, whether it carries a guard or a lesson. */
export function evaluateFix({ title = "", branch = "", files = [] }) {
  const isFix = (FIX_TITLE.test(title) || FIX_BRANCH.test(branch)) && !AUTOMATED.test(branch);
  if (!isFix) return { ok: true, isFix: false, reason: "not a fix" };
  const normalized = files.map((f) => f.replace(/\\/g, "/"));
  // A dependency-only change (a version bump) has nothing to write a test for; the lockfile and the audit are its evidence.
  if (normalized.length > 0 && normalized.every((f) => /(?:^|\/)(?:package\.json|pnpm-lock\.yaml)$/.test(f))) {
    return { ok: true, isFix: true, reason: "dependency-only change" };
  }
  const guard = normalized.find((f) => GUARD_FILE.test(f));
  if (guard) return { ok: true, isFix: true, reason: `adds or changes a test: ${guard}` };
  if (normalized.includes(LESSONS)) return { ok: true, isFix: true, reason: "records a lesson in docs/lessons.md" };
  return {
    ok: false,
    isFix: true,
    reason: "a fix must add or change a test that would have caught the problem, or record in docs/lessons.md why no guard is possible",
  };
}

function main() {
  const base = process.env.BASE_REF || "origin/main";
  const files = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], { encoding: "utf8" })
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);
  const result = evaluateFix({ title: process.env.PR_TITLE ?? "", branch: process.env.PR_BRANCH ?? "", files });
  if (result.ok) {
    console.log(`fix-has-guard: ok (${result.reason})`);
    return;
  }
  console.error(`fix-has-guard: FAILED. ${result.reason}.`);
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
