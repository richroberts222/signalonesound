// Shared inventory for the boilerplate tooling (see /docs/boilerplate.md).
// Plain Node, no dependencies. Both init-app.mjs and check-boilerplate.mjs read
// this file so the two can never disagree about what is proof-only.
import { readdirSync, statSync } from "node:fs";
import path from "node:path";

/** PROOF-ONLY: generic vertical-slice artifacts (Issue 49) and the proof migrations (Issues 43, 49). */
export const PROOF_PATHS = [
  "apps/web/app/api/v1/proof-items",
  "apps/web/app/proof",
  "apps/web/components/proof",
  "apps/web/db/proof-items.ts",
  "apps/web/db/proof-items.fake.ts",
  "apps/web/db/proof-items.integration.test.ts",
  "apps/web/drizzle",
  "apps/web/e2e/proof-items.spec.ts",
  "apps/web/lib/api/proof-items.ts",
  "apps/web/lib/api/proof-items.acceptance-suite.ts",
  "apps/web/lib/api/proof-items.acceptance.test.ts",
  "apps/web/lib/services/proof-items.ts",
  "apps/web/lib/services/proof-items.test.ts",
  "apps/mobile/src/proof",
  "packages/validation/src/proof-item.ts",
  "packages/validation/src/proof-item.test.ts",
  "packages/validation/src/proof-item-client.ts",
];

/** Files that only make sense in the template repository. */
export const TEMPLATE_ONLY_PATHS = [
  "docs/boilerplate.md",
  "docs/boilerplate-gap-report.md",
  "docs/boilerplate-references-report.md",
  "scripts/boilerplate",
];

/** Reference-app-only tooling and files; never copied into the standalone boilerplate. */
export const EXPORT_EXCLUDED_PATHS = [
  "scripts/boilerplate/export-template.mjs",
  "scripts/boilerplate/templates/standalone",
  "docs/boilerplate.md",
  "docs/boilerplate-gap-report.md",
  "docs/boilerplate-references-report.md",
  "docs/notes.md",
  "docs/naming-conventions.md",
  "docs/product",
];

/** Directories never scanned or copied. */
export const SKIP_DIRS = new Set(["node_modules", ".git", ".next", ".expo", "dist", ".turbo", "playwright-report", "test-results"]);

/** Never scanned: these hold local, gitignored configuration by design. */
export const isLocalEnvFile = (name) => /^\.env(\..+)?$/.test(name) && name !== ".env.example" && name !== ".env.sample";

const posix = (p) => p.split(path.sep).join("/");

/** All files under `root` as posix paths relative to it. */
export function walk(root, dir = root) {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP_DIRS.has(name)) return [];
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(root, full) : [posix(path.relative(root, full))];
  });
}
