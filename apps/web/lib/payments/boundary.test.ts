import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Payment boundary guard (docs/payments.md rule 7, S10 AC11). The application depends on the PaymentProvider
// port in this folder, and only files in this folder may import a payment provider's own SDK. That keeps
// the provider replaceable and keeps card-handling libraries out of services, routes and components.
const ROOT = path.join(__dirname, "..", "..");
const ADAPTER_DIR = path.join(ROOT, "lib", "payments");
const PROVIDER_MODULES = /^(stripe|@stripe\/.+|braintree|@paypal\/.+|paypal-rest-sdk|square|@square\/.+|adyen-.+|@adyen\/.+|razorpay|@lemonsqueezy\/.+|paddle-.+|@paddle\/.+)$/;
const SKIP = new Set(["node_modules", ".next", ".turbo", "coverage", "playwright-report", "test-results"]);

/** The module names a source file imports or requires. */
export function importedModules(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(/(?:^|\n)\s*(?:import|export)\b[^\n;]*?\bfrom\s*["']([^"']+)["']/g)) out.push(m[1]);
  for (const m of source.matchAll(/(?:^|\n)\s*import\s*["']([^"']+)["']/g)) out.push(m[1]);
  for (const m of source.matchAll(/\b(?:require|import)\(\s*["']([^"']+)["']\s*\)/g)) out.push(m[1]);
  return out;
}

export const isProviderModule = (name: string): boolean => PROVIDER_MODULES.test(name);

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

describe("payment boundary", () => {
  it("S10 AC11 no payment provider SDK is imported outside lib/payments", () => {
    const offenders = sourceFiles(ROOT)
      .filter((file) => !file.startsWith(ADAPTER_DIR + path.sep) && file !== __filename)
      .filter((file) => importedModules(readFileSync(file, "utf8")).some(isProviderModule))
      .map((file) => path.relative(ROOT, file));
    expect(offenders, "move provider imports into lib/payments (docs/payments.md rule 7)").toEqual([]);
  });

  it("the port and the fake never import a provider SDK, and the fake is never wired in the composition root", () => {
    for (const file of ["port.ts", "fake.ts", "unconfigured.ts"]) {
      expect(importedModules(readFileSync(path.join(ADAPTER_DIR, file), "utf8")).filter(isProviderModule), file).toEqual([]);
    }
    const composition = readFileSync(path.join(ROOT, "lib", "composition.ts"), "utf8");
    expect(composition).not.toMatch(/payments\/fake/); // a fake provider must never reach production wiring
    expect(composition).toMatch(/unconfiguredPaymentProvider/);
  });

  it("the scan reads imports correctly (self-test)", () => {
    const sample = [
      'import Stripe from "stripe";',
      'import { loadStripe } from "@stripe/stripe-js";',
      'import type { Foo } from "./foo";',
      'const x = require("braintree");',
      'const y = await import("@paypal/checkout-server-sdk");',
      'export * from "./bar";',
      'import "square";',
    ].join("\n");
    expect(importedModules(sample).filter(isProviderModule).sort()).toEqual(["@paypal/checkout-server-sdk", "@stripe/stripe-js", "braintree", "square", "stripe"]);
    expect(isProviderModule("./stripe")).toBe(false);
    expect(isProviderModule("stripe-helpers-not-a-sdk")).toBe(false);
  });
});
