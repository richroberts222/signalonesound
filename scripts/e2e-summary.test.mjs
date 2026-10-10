import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { summarize } from "./e2e-summary.mjs";

const spec = (title, ok, statuses = [ok ? "passed" : "failed"], duration = 1000) => ({ title, ok, tests: [{ results: statuses.map((status) => ({ status, duration })) }] });
const report = {
  suites: [
    { title: "billing.spec.ts", file: "billing.spec.ts", suites: [{ title: "Billing: signed out", specs: [spec("the billing API refuses a signed-out caller", true), spec("the page sends a visitor to sign in", false)] }] },
    { title: "discover.spec.ts", file: "discover.spec.ts", specs: [spec("a skipped journey", true, ["skipped"], 0)] },
  ],
};

test("the summary counts passed, failed and skipped tests and lists each with its group", () => {
  const text = summarize(report);
  assert.match(text, /\*\*1 passed, 1 failed, 1 skipped\*\* \(3 tests\)/);
  assert.match(text, /\| PASS \| Billing: signed out > the billing API refuses a signed-out caller \| 1\.0s \|/);
  assert.match(text, /\| FAIL \| Billing: signed out > the page sends a visitor to sign in \|/);
  assert.match(text, /\| SKIP \| a skipped journey \|/);
});

test("a failing test cannot be reported as passing (the summary follows the report, not a default)", () => {
  assert.match(summarize({ suites: [{ title: "x", file: "x.spec.ts", specs: [spec("broken", false)] }] }), /\*\*0 passed, 1 failed, 0 skipped\*\*/);
  assert.match(summarize({ suites: [] }), /\*\*0 passed, 0 failed, 0 skipped\*\* \(0 tests\)/);
});

test("with no results file the run page says the tests did not run, instead of showing a clean table", () => {
  const out = execFileSync(process.execPath, [join(import.meta.dirname, "e2e-summary.mjs"), join(tmpdir(), "does-not-exist.json")], { encoding: "utf8" });
  assert.match(out, /No results file was produced/);
});

test("the command reads a real report file", () => {
  const dir = mkdtempSync(join(tmpdir(), "e2e-summary-"));
  const file = join(dir, "results.json");
  writeFileSync(file, JSON.stringify(report));
  const out = execFileSync(process.execPath, [join(import.meta.dirname, "e2e-summary.mjs"), file], { encoding: "utf8" });
  assert.match(out, /1 passed, 1 failed, 1 skipped/);
});

test("the Playwright output folders are ignored by git (screenshots and videos must never be committed)", () => {
  const ignore = readFileSync(join(import.meta.dirname, "..", "apps", "web", ".gitignore"), "utf8");
  assert.match(ignore, /^\/playwright-report\/$/m);
  assert.match(ignore, /^\/test-results\/$/m);
});
