import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Route-protection regression guard (audit F-TEST-001, F-AUTH-001).
// proxy.ts decides which pages require sign-in. Nothing else tested it: removing
// the "/admin" and "/dashboard" patterns passed every other test. This file proves
// (1) protected paths call auth.protect(), (2) public paths do not, and
// (3) every top-level route in app/ is a conscious choice (deny by default for new routes).

const protect = vi.fn();
const middlewareOptions = vi.hoisted(() => ({ value: undefined as unknown }));

vi.mock("@clerk/nextjs/server", () => ({
  // Mirrors Clerk's "/prefix(.*)" patterns closely enough for path-prefix routes.
  createRouteMatcher: (patterns: string[]) => {
    const regexes = patterns.map((p) => new RegExp(`^${p}$`));
    return (req: { nextUrl: { pathname: string } }) => regexes.some((r) => r.test(req.nextUrl.pathname));
  },
  clerkMiddleware: (handler: (auth: { protect: typeof protect }, req: unknown) => Promise<void>, options?: unknown) => {
    middlewareOptions.value = options;
    return handler;
  },
}));

// Every top-level entry in app/ must be listed here. Adding a route directory fails
// this test until its protection is decided and recorded.
const PROTECTED = ["accept-terms", "account", "admin", "alerts", "claim-church", "dashboard", "manage", "proof", "saved"];
const PUBLIC = ["about", "api", "churches", "contact", "discover", "events", "invite", "privacy", "sign-in", "sign-up", "terms", "unsubscribe"]; // api routes authenticate themselves (docs/auth.md)

async function run(pathname: string) {
  const mod = (await import("./proxy")) as unknown as {
    default: (auth: { protect: typeof protect }, req: unknown) => Promise<void>;
  };
  await mod.default({ protect }, { nextUrl: { pathname } });
}

describe("proxy.ts route protection", () => {
  beforeEach(() => protect.mockClear());

  it.each(["/dashboard", "/dashboard/church/events/new", "/admin", "/admin/import", "/account"])(
    "protects %s",
    async (path) => {
      await run(path);
      expect(protect).toHaveBeenCalledTimes(1);
    },
  );

  it("sends a signed-out visitor to this app's own sign-in and sign-up pages, not Clerk's hosted page", async () => {
    await run("/dashboard");
    expect(middlewareOptions.value).toEqual({ signInUrl: "/sign-in", signUpUrl: "/sign-up" });
  });

  it.skipIf(!existsSync(join(__dirname, "app", "accept-terms")))("protects /accept-terms (S1)", async () => {
    await run("/accept-terms");
    expect(protect).toHaveBeenCalledTimes(1);
  });

  it.each(["/events", "/events/00000000-0000-4000-8000-000000000000", "/churches/00000000-0000-4000-8000-000000000000"])(
    "keeps %s public so anyone can search, read and share (S4)",
    async (path) => {
      await run(path);
      expect(protect).not.toHaveBeenCalled();
    },
  );

  it.each(["/terms", "/privacy", "/about", "/contact"])("keeps %s public so anyone can read it before signing up", async (path) => {
    await run(path);
    expect(protect).not.toHaveBeenCalled();
  });

  it.skipIf(!existsSync(join(__dirname, "app", "saved")))("protects /saved (S6)", async () => {
    await run("/saved");
    expect(protect).toHaveBeenCalledTimes(1);
  });

  it.skipIf(!existsSync(join(__dirname, "app", "alerts")))("protects /alerts (S7)", async () => {
    await run("/alerts");
    expect(protect).toHaveBeenCalledTimes(1);
  });

  it("keeps an unsubscribe link public so it works without signing in (S7)", async () => {
    await run("/unsubscribe/abcdefghijklmnopqrstuvwxyz.signature");
    expect(protect).not.toHaveBeenCalled();
  });

  it("keeps an invite link public so a friend can open it without an account (S6)", async () => {
    await run("/invite/AbCdEfGhIjKlMnOpQrStUvWx");
    expect(protect).not.toHaveBeenCalled();
  });

  it.skipIf(!existsSync(join(__dirname, "app", "manage")))("protects /manage (S3)", async () => {
    await run("/manage/anything/events");
    expect(protect).toHaveBeenCalledTimes(1);
  });

  it.skipIf(!existsSync(join(__dirname, "app", "claim-church")))("protects /claim-church (S2)", async () => {
    await run("/claim-church");
    expect(protect).toHaveBeenCalledTimes(1);
  });

  // The demo slice is deleted from a generated application, so its route is checked only where it exists.
  it.skipIf(!existsSync(join(__dirname, "app", "proof")))("protects /proof", async () => {
    await run("/proof");
    expect(protect).toHaveBeenCalledTimes(1);
  });

  it.each(["/", "/discover", "/discover/some-event", "/sign-in", "/sign-up"])("leaves %s public", async (path) => {
    await run(path);
    expect(protect).not.toHaveBeenCalled();
  });

  it("proxy.ts protects exactly the directories this test lists as protected", () => {
    // The lists above are a second copy of the truth. This ties them to the real matcher, so a
    // directory cannot be classified "protected" here while proxy.ts leaves it open.
    const source = readFileSync(join(__dirname, "proxy.ts"), "utf8");
    const matcher = /createRouteMatcher\(\[([^\]]*)\]\)/.exec(source)?.[1] ?? "";
    const matched = [...matcher.matchAll(/"\/([a-z-]+)\(\.\*\)"/g)].map((m) => m[1]).sort();
    const listed = PROTECTED.filter((name) => existsSync(join(__dirname, "app", name))).sort();
    expect(matched.length).toBeGreaterThan(0);
    expect(matched).toEqual(listed);
  });

  it("makes a protection decision for every top-level route in app/", () => {
    const appDir = join(__dirname, "app");
    const routes = readdirSync(appDir)
      .filter((name) => statSync(join(appDir, name)).isDirectory())
      .sort();
    const decided = new Set([...PROTECTED, ...PUBLIC]);
    // Every directory that exists must have a recorded decision. A listed directory may be absent
    // (a generated application removes the demo slice and the product mocks).
    expect(routes.filter((name) => !decided.has(name))).toEqual([]);
  });
});
