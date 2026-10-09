// Cross-checks the dependencies of every workspace (web, mobile, shared packages) so a mismatch is found by a
// test and not by a red screen on a phone. Two rules:
//   1. A workspace that depends on "react" must also name "react-dom" at the exact same version. React refuses
//      to run otherwise, and pnpm will quietly pair the app with another workspace's "react-dom" if it is not
//      named (the cause of the phone app's "Incompatible React versions" error).
//   2. A package that two or more workspaces declare must have the same major version in all of them.
// Run by `pnpm test:scripts`; docs/stack.md "Dependency and tooling compatibility", rule 7.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const SECTIONS = ["dependencies", "devDependencies"];
// Differences found when this check was first run. They are recorded, not fixed here (audit findings are reported,
// not silently fixed). Each needs a decision in its own issue; remove the entry when it is resolved.
export const KNOWN_DIFFERENCES = {
  "@types/node": "mobile ^22 against web ^24; docs/stack.md says Node types match the runtime major (24)",
  typescript: "mobile ~6.0.3 (Expo SDK 57) against web and shared packages ^5; to be decided with the next TypeScript upgrade",
};
const major = (range) => /\d+/.exec(range)?.[0] ?? range;
const exact = (range) => /^\d+\.\d+\.\d+$/.test(range);

/** @param {{ name: string, dependencies?: Record<string,string>, devDependencies?: Record<string,string> }[]} workspaces */
export function findDependencyProblems(workspaces) {
  const problems = [];
  const declared = new Map();
  for (const ws of workspaces) {
    const deps = { ...ws.devDependencies, ...ws.dependencies };
    if (deps.react !== undefined) {
      if (deps["react-dom"] === undefined) {
        // Only apps that bundle react-dom (web) or can be paired with it (mobile) need it named; libraries leave it to the app.
        if (ws.dependencies?.react !== undefined) problems.push(`${ws.name}: depends on react but does not name react-dom at the same version`);
      } else if (!exact(deps.react) || deps.react !== deps["react-dom"]) {
        problems.push(`${ws.name}: react (${deps.react}) and react-dom (${deps["react-dom"]}) must be the same exact version`);
      }
    }
    for (const section of SECTIONS) {
      for (const [dep, range] of Object.entries(ws[section] ?? {})) {
        if (range.startsWith("workspace:")) continue;
        declared.set(dep, [...(declared.get(dep) ?? []), { ws: ws.name, range }]);
      }
    }
  }
  for (const [dep, uses] of declared) {
    if (dep in KNOWN_DIFFERENCES) continue;
    if (new Set(uses.map((u) => major(u.range))).size > 1) {
      problems.push(`${dep}: different major versions across workspaces (${uses.map((u) => `${u.ws} ${u.range}`).join(", ")})`);
    }
  }
  return problems;
}

/** Reads every workspace's package.json under apps/ and packages/. */
export function readWorkspaces(root) {
  const found = [];
  for (const group of ["apps", "packages"]) {
    const dir = join(root, group);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name, "package.json");
      if (entry.isDirectory() && existsSync(file)) found.push(JSON.parse(readFileSync(file, "utf8")));
    }
  }
  return found;
}
