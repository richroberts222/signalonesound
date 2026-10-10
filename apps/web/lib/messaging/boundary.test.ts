import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Email boundary guard (S14 AC8). The application depends on the EmailPort in this folder, and only the
// adapter file may import a provider's own SDK, so a provider can be replaced without touching any caller.
const ROOT = path.join(__dirname, "..", "..");
const ADAPTER = path.join(ROOT, "lib", "messaging", "ses.ts");
const PROVIDER_MODULES = /^(@aws-sdk\/.+|aws-sdk|@sendgrid\/.+|nodemailer|postmark|resend|mailgun\.js|@getbrevo\/.+|sib-api-v3-sdk)$/;
const SKIP = new Set(["node_modules", ".next", ".turbo", "coverage", "playwright-report", "test-results"]);

/** The module names a source file imports or requires. */
export function importedModules(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(/(?:^|\n)\s*(?:import|export)\b[^\n;]*?\bfrom\s*["']([^"']+)["']/g)) out.push(m[1]);
  for (const m of source.matchAll(/(?:^|\n)\s*import\s*["']([^"']+)["']/g)) out.push(m[1]);
  for (const m of source.matchAll(/\b(?:require|import)\(\s*["']([^"']+)["']\s*\)/g)) out.push(m[1]);
  return out;
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx|mts|js|mjs)$/.test(name)) out.push(full);
  }
  return out;
}

describe("email boundary", () => {
  it("S14 AC8 no email provider SDK is imported outside the one adapter file", () => {
    const offenders = sourceFiles(ROOT)
      .filter((file) => file !== ADAPTER && file !== __filename && !file.endsWith("ses.test.ts"))
      .filter((file) => importedModules(readFileSync(file, "utf8")).some((m) => PROVIDER_MODULES.test(m)))
      .map((file) => path.relative(ROOT, file));
    expect(offenders, "move provider imports into lib/messaging/ses.ts (or another single adapter file)").toEqual([]);
  });

  it("the adapter is created only in the composition root", () => {
    const users = sourceFiles(ROOT)
      .filter((file) => file !== __filename && /createSesEmail/.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(ROOT, file).split(path.sep).join("/"))
      .sort();
    expect(users).toEqual(["lib/composition.ts", "lib/messaging/ses.test.ts", "lib/messaging/ses.ts"]);
  });

  it("the scan reads imports correctly (self-test)", () => {
    const sample = ['import { SESv2Client } from "@aws-sdk/client-sesv2";', 'import type { X } from "./x";', 'const m = require("nodemailer");', 'const r = await import("resend");', 'import "postmark";'].join("\n");
    expect(importedModules(sample).filter((m) => PROVIDER_MODULES.test(m)).sort()).toEqual(["@aws-sdk/client-sesv2", "nodemailer", "postmark", "resend"]);
    expect(PROVIDER_MODULES.test("./resend")).toBe(false);
    expect(PROVIDER_MODULES.test("resend-helpers")).toBe(false);
  });
});
