// Measures what the tests do not touch, so the answer does not rest on anyone's memory.
//   node scripts/audit-test-coverage.mjs        prints the report
//   (apps/web/lib/test-coverage.test.ts uses auditTestCoverage() as a guard: the list of untested test ids may only shrink)
// Two measures, both mechanical:
//   1. test ids (data-testid / testID) in the screens that no test file mentions;
//   2. API route addresses that no test file mentions. This one is only a hint: tests of route definitions call
//      them without an address, so a listed route may still be tested; it is never used as a guard.
// A test id built at run time (`plan-perk-${id}`) counts as covered when a test mentions its fixed start.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const SKIP = new Set(["node_modules", ".next", ".git", "test-results", "playwright-report", ".turbo", "drizzle", ".expo", "coverage"]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const idPattern = /(?:data-testid|testID)=(?:"([^"]+)"|\{`([^`$]*)(\$\{)?[^`]*`\}|\{"([^"]+)"\})/g;

export function auditTestCoverage() {
  const rel = (f) => relative(root, f).split(sep).join("/");
  const files = walk(join(root, "apps")).concat(walk(join(root, "packages")));
  const isTest = (f) => /\.(test|spec)\.(ts|tsx|mjs)$/.test(f) || /\/e2e\//.test(rel(f));
  const testText = files.filter(isTest).map((f) => readFileSync(f, "utf8")).join("\n");
  const product = files.filter((f) => /\.(tsx?|mjs)$/.test(f) && !isTest(f) && /\/(components|app|src|lib)\//.test(rel(f)));

  const ids = new Map();
  for (const f of product) {
    for (const m of readFileSync(f, "utf8").matchAll(idPattern)) {
      const literal = m[1] ?? m[4];
      const prefix = literal ?? m[2];
      if (!prefix) continue;
      ids.set(literal === undefined ? `${prefix}*` : prefix, rel(f));
    }
  }
  const untestedIds = [...ids].filter(([id]) => !testText.includes(id.replace(/\*$/, ""))).map(([id, file]) => ({ id, file })).sort((a, b) => a.id.localeCompare(b.id));

  const routeFiles = files.filter((f) => /apps\/web\/app\/api\/.*route\.ts$/.test(rel(f)));
  const addressOf = (f) => "/" + rel(f).replace(/^apps\/web\/app\//, "").replace(/\/route\.ts$/, "");
  const mentioned = (address) => {
    const tail = address.split("/").filter((p) => p && !p.startsWith("[")).slice(-2).join("/");
    return testText.includes(address) || testText.includes(tail);
  };
  const untestedRoutes = routeFiles.map(addressOf).filter((a) => !mentioned(a));
  return { totalIds: ids.size, totalRoutes: routeFiles.length, untestedIds, untestedRoutes };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = auditTestCoverage();
  console.log(`# Test coverage audit\n\n${r.totalIds} test ids in screens, ${r.totalRoutes} API route files.`);
  console.log(`\n## Test ids no test mentions (${r.untestedIds.length})`);
  for (const { id, file } of r.untestedIds) console.log(`- ${id}  (${file})`);
  console.log(`\n## API addresses no test mentions (${r.untestedRoutes.length}) - a hint only`);
  for (const a of r.untestedRoutes) console.log(`- ${a}`);
}
