#!/usr/bin/env node
// Turns a fresh copy of this repository into a generic new application:
// removes proof-only artifacts and template-only files, resets the database
// schema/migrations, replaces the Signal One identity, then runs the leak
// check. Plain Node, no dependencies, no network, no external services.
//
//   node scripts/boilerplate/init-app.mjs --name="Harbor Notes" --slug=harbor-notes \
//        --bundle-id=com.harbornotes.app [--scope=harbor-notes] [--dir=<path>] [--dry-run]
//
// Run it once, in a fresh clone/copy. It refuses to run twice. See /docs/boilerplate.md.
import { existsSync, readFileSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { checkBoilerplate, formatFindings } from "./check-boilerplate.mjs";
import { PROOF_PATHS, REFERENCE_ONLY_PATHS, TEMPLATE_ONLY_PATHS, isLocalEnvFile, walk } from "./manifest.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

export function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    if (arg === "--dry-run") out.dryRun = true;
    else if (arg.startsWith("--") && arg.includes("=")) {
      const i = arg.indexOf("=");
      out[arg.slice(2, i).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = arg.slice(i + 1);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

/** @returns {string[]} problems; empty means valid. */
export function validateIdentity({ name, slug, scope, bundleId }) {
  const problems = [];
  if (!name || !/^[A-Za-z0-9][A-Za-z0-9 .-]{0,38}[A-Za-z0-9]$/.test(name)) {
    problems.push("--name: 2-40 letters, digits, spaces, '.' or '-' (display name).");
  }
  if (!slug || !/^[a-z][a-z0-9-]{0,38}[a-z0-9]$/.test(slug)) {
    problems.push("--slug: lowercase letters, digits, '-' (repository / Expo slug / URL scheme).");
  }
  if (!scope || !/^[a-z][a-z0-9-]{0,38}$/.test(scope)) problems.push("--scope: npm package scope without '@', lowercase.");
  if (!bundleId || !/^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*)+$/.test(bundleId)) {
    problems.push("--bundle-id: reverse-DNS identifier valid for iOS and Android, e.g. com.yourco.app (lowercase, 2+ segments).");
  }
  for (const [k, v] of Object.entries({ name, slug, scope, bundleId })) {
    if (v && /signal[\s_-]?one|app[\s_-]?boilerplate/i.test(v)) problems.push(`--${k}: must not contain the Signal One or template identity.`);
  }
  if (bundleId && /^com\.example\./.test(bundleId)) problems.push("--bundle-id: com.example.* is a placeholder; choose your real identifier.");
  return problems;
}

/**
 * Identities that must never survive into a new application: the Signal One
 * reference app and the neutral identity the standalone boilerplate ships with.
 */
export const SOURCE_IDENTITIES = [
  // The official product name first, so "Signal One Sound" becomes the new name and not "<name> Sound".
  { name: "Signal One Sound", slug: "signal-one-sound", bundleId: "com.example.signalonesound" },
  { name: "Signal One", slug: "signalone", bundleId: "com.example.signalone" },
  { name: "App Boilerplate", slug: "app-boilerplate", bundleId: "com.example.appboilerplate" },
];

/** Applies the identity to text. Order matters: most specific tokens first. */
export function applyIdentity(text, { name, slug, scope, bundleId }, sources = SOURCE_IDENTITIES) {
  let out = text;
  for (const source of sources) {
    out = out
      .replaceAll(`@${source.slug}/`, () => `@${scope}/`)
      .replaceAll(source.bundleId, () => bundleId)
      .replaceAll(`${source.slug.replace(/-/g, "_")}_`, () => `${slug.replace(/-/g, "_")}_`)
      .replaceAll(source.name.toUpperCase(), () => name.toUpperCase())
      .replaceAll(source.name, () => name)
      .replaceAll(source.slug, () => slug);
  }
  return out;
}

/**
 * Removes `<!-- boilerplate:KIND:start -->...<!-- boilerplate:KIND:end -->` regions.
 * Markers alone on their own lines delimit whole sections (the blank line after
 * the end marker goes too); markers inside a line remove exactly the enclosed text.
 */
export function stripMarkedRegions(text, kinds = ["proof", "template", "reference"]) {
  const kind = `(${kinds.join("|")})`;
  return text
    .replace(new RegExp(`^<!-- boilerplate:${kind}:start -->\\r?\\n[\\s\\S]*?^<!-- boilerplate:\\1:end -->\\r?\\n(?:\\r?\\n)?`, "gm"), "")
    .replace(new RegExp(`<!-- boilerplate:${kind}:start -->[\\s\\S]*?<!-- boilerplate:\\1:end -->`, "g"), "");
}

const NOTES_STUB = `# Handoff notes

No work has been recorded yet. Per \`/docs/issues.md\`, overwrite this file on each issue/PR branch.
Never include real or credential-shaped secrets here.
`;

/**
 * Removes the proof slice and resets the three wiring files to their domain-free
 * versions. Shared by `init:app` and the Signal One-only `export:boilerplate`,
 * so the standalone boilerplate and an initialized app can never drift.
 */
export function stripProofSlice({ root, step }) {
  const abs = (p) => path.join(root, p);
  for (const p of PROOF_PATHS) if (existsSync(abs(p))) step(`remove proof-only ${p}`, () => rmSync(abs(p), { recursive: true, force: true }));

  const templates = path.join(root, "scripts/boilerplate/templates");
  for (const [tpl, dest] of [
    ["composition.ts", "apps/web/lib/composition.ts"],
    ["schema.ts", "apps/web/db/schema.ts"],
    ["App.tsx", "apps/mobile/src/App.tsx"],
  ]) {
    step(`reset ${dest} to the domain-free starting point`, () => copyFileSync(path.join(templates, tpl), abs(dest)));
  }

  const edit = (file, fn) => step(`edit ${file}`, () => writeFileSync(abs(file), fn(readFileSync(abs(file), "utf8"))));
  edit("apps/web/proxy.ts", (t) => t.replace(', "/proof(.*)"', ""));
  edit("packages/validation/src/index.ts", (t) =>
    t.split("\n").filter((l) => !/proof-item|proof-only/.test(l)).join("\n"));
}

export function initApp({ root, name, slug, scope = slug, bundleId, dryRun = false, log = console.log }) {
  const identity = { name, slug, scope, bundleId };
  const problems = validateIdentity(identity);
  if (problems.length > 0) throw new Error(`Invalid identity:\n${problems.join("\n")}`);
  if (!existsSync(path.join(root, "scripts/boilerplate/init-app.mjs"))) {
    throw new Error("scripts/boilerplate/init-app.mjs not found under --dir: already initialized, or not a template copy.");
  }
  const abs = (p) => path.join(root, p);
  const step = (message, fn) => {
    log(`${dryRun ? "[dry-run] would " : ""}${message}`);
    if (!dryRun) fn();
  };

  stripProofSlice({ root, step });
  for (const p of REFERENCE_ONLY_PATHS) if (existsSync(abs(p))) step(`remove reference-only ${p}`, () => rmSync(abs(p), { recursive: true, force: true }));
  step("edit package.json", () => {
    const pkg = JSON.parse(readFileSync(abs("package.json"), "utf8"));
    for (const k of ["init:app", "check:boilerplate", "test:boilerplate", "prove:init", "export:boilerplate"]) delete pkg.scripts[k];
    pkg.scripts.validate = pkg.scripts.validate.replace(" && pnpm test:boilerplate", "");
    writeFileSync(abs("package.json"), `${JSON.stringify(pkg, null, 2)}\n`);
  });
  step("reset docs/notes.md", () => writeFileSync(abs("docs/notes.md"), NOTES_STUB));

  // Copy of the templates is already applied; now identity + doc regions over every text file.
  const files = walk(root).filter(
    (f) => !f.startsWith("scripts/boilerplate/") && !isLocalEnvFile(path.posix.basename(f)) && !PROOF_PATHS.some((p) => f === p || f.startsWith(`${p}/`)),
  );
  let changed = 0;
  for (const file of files) {
    const buf = readFileSync(abs(file));
    if (buf.includes(0)) continue; // binary
    const before = buf.toString("utf8");
    const after = applyIdentity(file.endsWith(".md") ? stripMarkedRegions(before) : before, identity);
    if (after === before) continue;
    changed += 1;
    if (!dryRun) writeFileSync(abs(file), after);
  }
  log(`${dryRun ? "[dry-run] would rewrite" : "rewrote"} ${changed} file(s) with the new identity / doc regions`);

  for (const p of TEMPLATE_ONLY_PATHS) if (existsSync(abs(p))) step(`remove template-only ${p}`, () => rmSync(abs(p), { recursive: true, force: true }));

  if (dryRun) return [];
  const findings = checkBoilerplate(root);
  if (findings.length > 0) {
    throw new Error(`Initialized, but the leak check found problems:\n${formatFindings(findings).join("\n")}`);
  }
  log("leak check: clean");
  return findings;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = path.resolve(args.dir ?? path.join(here, "../.."));
  const { name, slug, bundleId } = args;
  try {
    initApp({ root, name, slug, scope: args.scope ?? slug, bundleId, dryRun: Boolean(args.dryRun) });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
  if (!args.dryRun) {
    console.log(`
Next (see docs/new-app-setup.md for the steps that need a human):
  1. corepack enable && pnpm install
  2. pnpm lint && pnpm typecheck && pnpm test:run && pnpm build
  3. Create the Clerk, Neon, and Vercel projects, then fill apps/web/.env.local (never commit it).
  4. Design the first schema, then pnpm --filter web db:generate and review the SQL.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
