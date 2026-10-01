#!/usr/bin/env node
// Detects Signal One identity, proof-only artifacts, and credential-shaped
// content that must not remain in a newly initialized generic application.
// Read-only. Usage: node scripts/boilerplate/check-boilerplate.mjs [--dir=<path>]
// Exit 0 = clean, 1 = findings. See /docs/boilerplate.md.
import { readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { PROOF_PATHS, TEMPLATE_ONLY_PATHS, isLocalEnvFile, walk } from "./manifest.mjs";

const IDENTITY = /signal[\s_-]?one/i;
const PROOF_CONTENT = /proof[-_ ]?items?|migration_proof/i;
// Same shapes the repository security test enforces (apps/web/lib/security.test.ts).
const SECRETS = [
  ["clerk secret key", /sk_(?:live|test)_(?!REPLACE_ME)[A-Za-z0-9]{10,}/],
  ["clerk live publishable key", /pk_live_[A-Za-z0-9]{10,}/],
  ["credentialed postgres url", /postgres(?:ql)?:\/\/(?!USER:PASSWORD@)[^\s:@/]+:[^\s@/]+@(?!HOST)/],
  ["private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["github token", /gh[pousr]_[A-Za-z0-9]{30,}/],
];
const TEXT_FILE = /\.(tsx?|mjs|cjs|js|json|md|ya?ml|example|sample|css|html|sql|toml)$/;
const MAX_BYTES = 1_000_000;

/** @returns {{ rule: string, file: string, line?: number, detail: string }[]} */
export function checkBoilerplate(root) {
  const findings = [];
  const add = (rule, file, detail, line) => findings.push({ rule, file, detail, ...(line ? { line } : {}) });

  for (const p of PROOF_PATHS) if (existsSync(path.join(root, p))) add("proof-artifact", p, "proof-only path still present");
  for (const p of TEMPLATE_ONLY_PATHS) if (existsSync(path.join(root, p))) add("template-only", p, "template-only path still present");

  for (const file of walk(root)) {
    const base = path.posix.basename(file);
    // The tooling itself names every pattern; local env files are gitignored by design.
    if (file.startsWith("scripts/boilerplate/") || isLocalEnvFile(base)) continue;
    if (!TEXT_FILE.test(base) && !/^\.env\.(example|sample)$/.test(base)) continue;
    const full = path.join(root, file);
    if (statSync(full).size > MAX_BYTES) continue;

    // Test code holds fake fixtures by design (same exemption as security.test.ts).
    const isTest = /\.test\.tsx?$/.test(base) || file.startsWith("packages/shared/src/testing/");
    const lines = readFileSync(full, "utf8").split("\n");
    lines.forEach((text, i) => {
      if (IDENTITY.test(text)) add("identity", file, "Signal One identifier", i + 1);
      if (PROOF_CONTENT.test(text)) add("proof-reference", file, "proof-item / migration_proof reference", i + 1);
      if (!isTest) for (const [name, re] of SECRETS) if (re.test(text)) add("secret", file, name, i + 1);
      if (file === "apps/mobile/app.config.ts" && /com\.example\./.test(text)) {
        add("placeholder-id", file, "placeholder store identifier (com.example.*) not replaced", i + 1);
      }
    });
  }
  return findings;
}

export function formatFindings(findings) {
  // One line per file+rule keeps real leaks readable instead of noisy.
  const groups = new Map();
  for (const f of findings) {
    const key = `${f.rule}\t${f.file}`;
    const g = groups.get(key) ?? { ...f, lines: [] };
    if (f.line) g.lines.push(f.line);
    groups.set(key, g);
  }
  return [...groups.values()].map(
    (g) => `[${g.rule}] ${g.file}${g.lines.length ? `:${g.lines.slice(0, 5).join(",")}${g.lines.length > 5 ? ",..." : ""}` : ""} ${g.detail}`,
  );
}

function main() {
  const dirArg = process.argv.find((a) => a.startsWith("--dir="));
  const root = path.resolve(dirArg ? dirArg.slice("--dir=".length) : path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."));
  const findings = checkBoilerplate(root);
  if (findings.length === 0) {
    console.log("check:boilerplate: clean (no Signal One identity, proof artifacts, or credential-shaped content).");
    return;
  }
  const lines = formatFindings(findings);
  console.error(`check:boilerplate: ${findings.length} finding(s) in ${lines.length} place(s):\n${lines.join("\n")}`);
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
