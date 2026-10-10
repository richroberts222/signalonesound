// Static checks that the mobile app respects the backend boundary
// (/docs/mobile.md, /docs/shared-code.md). They read source text only.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts") ? [path] : [];
  });
}

// The screens in app/ (expo-router) are scanned as well as src/: they are the code most likely to import something forbidden.
const files = [...sourceFiles(join(root, "src")), ...sourceFiles(join(root, "app")), join(root, "app.config.ts")];

// Packages and paths that must never be imported by the mobile bundle.
const FORBIDDEN = [
  "drizzle-orm",
  "drizzle-kit",
  "@neondatabase/serverless",
  "server-only",
  "next",
  "@clerk/nextjs",
  "@clerk/backend",
  "@signalone/web",
];

function importedSpecifiers(text: string): string[] {
  const matches = text.matchAll(/(?:from|import|require)\s*\(?\s*["']([^"']+)["']/g);
  return [...matches].map((m) => m[1]);
}

describe("mobile backend boundary", () => {
  it("scans some source files", () => {
    expect(files.length).toBeGreaterThan(3);
  });

  it("imports no server-only, database, Next.js, or apps/web code", () => {
    for (const file of files) {
      for (const spec of importedSpecifiers(readFileSync(file, "utf8"))) {
        const bad = FORBIDDEN.some((f) => spec === f || spec.startsWith(`${f}/`));
        expect(bad, `${file} imports ${spec}`).toBe(false);
        expect(spec, `${file} imports from apps/web`).not.toMatch(/apps\/web|\.\.\/web/);
      }
    }
  });

  it("only reads EXPO_PUBLIC_* from process.env", () => {
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
        expect(m[1], `${file} reads ${m[1]}`).toMatch(/^EXPO_PUBLIC_/);
      }
      expect(text, `${file} reads process.env dynamically`).not.toMatch(/process\.env\[/);
    }
  });

  // S0 AC9: the app bundle is public, so no server secret may be named or embedded in it.
  it("names no server secret and embeds no secret-key shape", () => {
    const names = ["CLERK_SECRET_KEY", "DATABASE_URL", "DATABASE_ENV", "NEON_API_KEY"];
    const shapes = [/sk_(?:live|test)_[A-Za-z0-9]{8,}/, /postgres(?:ql)?:\/\/[^\s"']+:[^\s"']+@/];
    for (const file of [...files, join(root, "eas.json")]) {
      const text = readFileSync(file, "utf8");
      for (const name of names) expect(text, `${file} names ${name}`).not.toContain(name);
      for (const shape of shapes) expect(text, `${file} embeds a secret-shaped value`).not.toMatch(shape);
    }
  });

  it("does not declare server-only dependencies in package.json", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const declared = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    for (const name of FORBIDDEN) expect(declared).not.toContain(name);
  });
});
