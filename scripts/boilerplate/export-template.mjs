#!/usr/bin/env node
// Signal One-only. Generates the standalone, generic boilerplate repository tree
// from this repository: proof slice and Signal One identity removed, neutral
// "App Boilerplate" identity applied, init/check/prove tooling kept so the result
// can initialize a new application. Plain Node, no dependencies, no network.
//
//   pnpm export:boilerplate --out=<empty-dir>
//
// The output is a plain directory (no .git). Publishing it as a new GitHub
// repository is a human step: see /docs/boilerplate.md.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { applyIdentity, parseArgs, stripMarkedRegions, stripProofSlice } from "./init-app.mjs";
import { EXPORT_EXCLUDED_PATHS, PROOF_PATHS, isLocalEnvFile, listSourceFiles, walk } from "./manifest.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

/** The neutral identity the standalone boilerplate ships with. */
export const TEMPLATE_IDENTITY = { name: "App Boilerplate", slug: "app-boilerplate", scope: "app-boilerplate", bundleId: "com.example.appboilerplate" };

const README_BLOCK = `<!-- boilerplate:template:start -->
> **Template repository.** Create your application from this repository, then run once, in the fresh copy:
> \`pnpm init:app --name="Your App" --slug=your-app --bundle-id=com.yourco.app\`
> Start with [\`docs/boilerplate.md\`](docs/boilerplate.md) and [\`docs/customization-map.md\`](docs/customization-map.md).
<!-- boilerplate:template:end -->

`;

export function exportTemplate({ source, out, log = console.log }) {
  if (existsSync(out) && readdirSync(out).length > 0) throw new Error(`--out must be empty or absent: ${out}`);
  const excluded = (f) => EXPORT_EXCLUDED_PATHS.some((p) => f === p || f.startsWith(`${p}/`));
  const copy = listSourceFiles(source).filter((f) => !excluded(f) && !isLocalEnvFile(path.posix.basename(f)));
  for (const file of copy) {
    mkdirSync(path.dirname(path.join(out, file)), { recursive: true });
    cpSync(path.join(source, file), path.join(out, file));
  }
  log(`copied ${copy.length} file(s)`);

  const step = (message, fn) => {
    log(message);
    fn();
  };
  stripProofSlice({ root: out, step });

  // Standalone-specific docs and the template-only package script.
  const standalone = path.join(source, "scripts/boilerplate/templates/standalone");
  copyFileSync(path.join(standalone, "boilerplate.md"), path.join(out, "docs/boilerplate.md"));
  copyFileSync(path.join(standalone, "notes.md"), path.join(out, "docs/notes.md"));
  const pkgFile = path.join(out, "package.json");
  const pkg = JSON.parse(readFileSync(pkgFile, "utf8"));
  delete pkg.scripts["export:boilerplate"];
  writeFileSync(pkgFile, `${JSON.stringify(pkg, null, 2)}\n`);

  let changed = 0;
  for (const file of walk(out)) {
    if (file.startsWith("scripts/boilerplate/") || PROOF_PATHS.includes(file)) continue;
    const full = path.join(out, file);
    const buf = readFileSync(full);
    if (buf.includes(0)) continue;
    const before = buf.toString("utf8");
    const stripped = file.endsWith(".md") ? stripMarkedRegions(before, ["proof", "reference"]) : before;
    let after = applyIdentity(stripped, TEMPLATE_IDENTITY);
    if (file === "README.md") after = after.replace(/^(# .*\r?\n\r?\n)/, `$1${README_BLOCK}`);
    if (after !== before) {
      writeFileSync(full, after);
      changed += 1;
    }
  }
  log(`applied neutral identity to ${changed} file(s)`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.out) {
    console.error("Usage: pnpm export:boilerplate --out=<empty-dir>");
    process.exit(1);
  }
  try {
    exportTemplate({ source: path.resolve(here, "../.."), out: path.resolve(args.out) });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
