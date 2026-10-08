import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Route-protection regression guard (audit F-TEST-001, F-AUTH-001).
// proxy.ts decides which pages require sign-in. Nothing else tested it: removing
// the "/admin" and "/dashboard" patterns passed every other test. This file proves
// (1) protected paths call auth.protect(), (2) public paths do not, and
// (3) every top-level route in app/ is a conscious choice (deny by default for new routes).

const protect = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  // Mirrors Clerk's "/prefix(.*)" patterns closely enough for path-prefix routes.
  createRouteMatcher: (patterns: string[]) => {
    const regexes = patterns.map((p) => new RegExp(`^${p}$`));
    return (req: { nextUrl: { pathname: string } }) => regexes.some((r) => r.test(req.nextUrl.pathname));
  },
  clerkMiddleware: (handler: (auth: { protect: typeof protect }, req: unknown) => Promise<void>) => handler,
}));

// Every top-level entry in app/ must be listed here. Adding a route directory fails
// this test until its protection is decided and recorded.
const PROTECTED = ["account", "admin", "dashboard", "proof"];
const PUBLIC = ["api", "discover", "sign-in", "sign-up"]; // api routes authenticate themselves (docs/auth.md)

async function run(pathname: string) {
  const mod = (await import("./proxy")) as unknown as {
    default: (auth: { protect: typeof protect }, req: unknown) => Promise<void>;
  };
  await mod.default({ protect }, { nextUrl: { pathname } });
}

describe("proxy.ts route protection", () => {
  beforeEach(() => protect.mockClear());

  it.each(["/dashboard", "/dashboard/church/events/new", "/admin", "/admin/import", "/account", "/proof"])(
    "protects %s",
    async (path) => {
      await run(path);
      expect(protect).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["/", "/discover", "/discover/some-event", "/sign-in", "/sign-up"])("leaves %s public", async (path) => {
    await run(path);
    expect(protect).not.toHaveBeenCalled();
  });

  it("makes a protection decision for every top-level route in app/", () => {
    const appDir = join(__dirname, "app");
    const routes = readdirSync(appDir)
      .filter((name) => statSync(join(appDir, name)).isDirectory())
      .sort();
    expect(routes).toEqual([...PROTECTED, ...PUBLIC].sort());
  });
});
