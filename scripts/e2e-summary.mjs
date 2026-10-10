import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Turns Playwright's JSON report into a short Markdown summary for the GitHub run page: totals first, then
// every test with its result, so a person sees what passed and what failed without opening the report.
// Usage: node scripts/e2e-summary.mjs <path to results.json> >> "$GITHUB_STEP_SUMMARY"
export function summarize(report) {
  const rows = [];
  const walk = (suite, trail) => {
    const here = suite.title && !suite.file ? [...trail, suite.title] : trail;
    for (const spec of suite.specs ?? []) {
      const results = spec.tests?.flatMap((t) => t.results ?? []) ?? [];
      const status = spec.ok ? (results.some((r) => r.status === "skipped") ? "skipped" : "passed") : "failed";
      rows.push({ name: [...here, spec.title].join(" > "), status, ms: results.reduce((n, r) => n + (r.duration ?? 0), 0) });
    }
    for (const child of suite.suites ?? []) walk(child, here);
  };
  for (const suite of report.suites ?? []) walk(suite, []);
  const count = (s) => rows.filter((r) => r.status === s).length;
  const icon = { passed: "PASS", failed: "FAIL", skipped: "SKIP" };
  const lines = [
    "## Browser test results",
    "",
    `**${count("passed")} passed, ${count("failed")} failed, ${count("skipped")} skipped** (${rows.length} tests)`,
    "",
    "| Result | Test | Time |",
    "| --- | --- | --- |",
    ...rows.map((r) => `| ${icon[r.status]} | ${r.name.replace(/\|/g, "\|")} | ${(r.ms / 1000).toFixed(1)}s |`),
    "",
    "The HTML report, screenshots and videos of any failure are in this run's artifacts (`playwright-report`).",
  ];
  return lines.join("\n");
}

// Run as a command (not when imported by the tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2];
  if (!file || !existsSync(file)) {
    console.log(["## Browser test results", "", "No results file was produced: the tests did not run (see the job log)."].join("\n"));
  } else {
    console.log(summarize(JSON.parse(readFileSync(file, "utf8"))));
  }
}
