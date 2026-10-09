import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

// Text hygiene (docs/code-quality.md section 13). Scripted edits and copy-paste from other tools
// have damaged files here before: backslash-escaped Markdown, stray control characters inside
// regular expressions, non-breaking spaces. These are invisible in review, so they are checked.
const repo = join(__dirname, "..", "..", "..");
const SKIP = new Set(["node_modules", ".git", ".next", ".turbo", "dist", ".expo", "playwright-report", "test-results"]);
const TEXT = /\.(md|tsx?|mjs|cjs|js|json|ya?ml|sql|css|html|toml|sh|example|sample|txt)$/;

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const files = walk(repo).filter((f) => TEXT.test(f) && !f.endsWith("pnpm-lock.yaml"));
const rel = (f: string) => relative(repo, f).split(sep).join("/");
const read = (f: string) => readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const offenders = (test: (text: string, file: string) => boolean) => files.filter((f) => test(read(f), f)).map(rel);

describe("text hygiene", () => {
  it("has no control characters (they hide inside regular expressions and strings)", () => {
    // Allowed: tab (09), line feed (0A), carriage return (0D).
    expect(offenders((t) => /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(t))).toEqual([]);
  });

  it("has no non-breaking, zero-width or mid-file byte-order-mark characters", () => {
    expect(offenders((t) => /[\u00A0\u200B\u200C\u200D\u2060]/.test(t) || t.slice(1).includes("\uFEFF"))).toEqual([]);
  });

  it("has no backslash-escaped Markdown or bold-wrapped headings (a copy-paste artifact)", () => {
    const artifact = (t: string) =>
      t.split("\n").some((line) => /^\\[*`>]/.test(line) || /^\d+\\\./.test(line) || /^\*\*#{1,6} /.test(line) || line === "**---**");
    expect(offenders((t, f) => f.endsWith(".md") && artifact(t))).toEqual([]);
  });
});
