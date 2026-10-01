import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AppException, REDACTED } from "@signalone/shared";

import { createLogger, type LogEntry, type LogLevel } from "./create-logger";
import { reportError } from "./report-error";

const fakeDbUrl = ["postgresql://", "user", ":", "hunter2", "@db.example.test/app"].join("");

function capture(level?: LogLevel) {
  const entries: LogEntry[] = [];
  const logger = createLogger({
    level,
    sink: (e) => entries.push(e),
    now: () => new Date("2026-01-01T00:00:00.000Z"),
  });
  return { entries, logger };
}

describe("createLogger", () => {
  it("emits structured entries and filters below the minimum level", () => {
    const { entries, logger } = capture("warn");
    logger.info("hidden");
    logger.warn("shown", { a: 1 });
    expect(entries).toEqual([
      { level: "warn", time: "2026-01-01T00:00:00.000Z", message: "shown", context: { a: 1 } },
    ]);
  });

  it("redacts context and merges child bindings", () => {
    const { entries, logger } = capture("debug");
    logger.child({ requestId: "r1" }).info("hi", { password: "x", url: fakeDbUrl });
    expect(entries[0].context).toMatchObject({ requestId: "r1", password: REDACTED });
    expect(JSON.stringify(entries[0])).not.toContain("hunter2");
  });
});

describe("reportError", () => {
  it("logs expected errors at warn without a stack and returns the safe error", () => {
    const { entries, logger } = capture("debug");
    const safe = reportError(
      logger,
      new AppException("not_found", "Missing.", { context: { id: 7 } }),
    );
    expect(safe).toEqual({ code: "not_found", message: "Missing." });
    expect(entries[0].level).toBe("warn");
    expect(entries[0].context).toMatchObject({ code: "not_found", id: 7 });
    expect(JSON.stringify(entries[0])).not.toContain("stack");
  });

  it("logs unexpected errors at error with diagnostics but returns only a generic message", () => {
    const { entries, logger } = capture("debug");
    const safe = reportError(logger, new Error(`connect ${fakeDbUrl}`), { route: "/x" });
    expect(safe).toEqual({ code: "internal", message: "Something went wrong. Please try again." });
    expect(JSON.stringify(safe)).not.toMatch(/hunter2|connect|stack/);
    expect(entries[0].level).toBe("error");
    const logged = JSON.stringify(entries[0]);
    expect(logged).toContain("stack");
    expect(logged).toContain("/x");
    expect(logged).not.toContain("hunter2");
  });
});

describe("server-only boundary", () => {
  it("the shared logger entry point imports server-only", () => {
    expect(readFileSync(join(__dirname, "index.ts"), "utf8")).toMatch(/^import "server-only";/m);
  });

  it("shared error/redact modules read no environment or server modules", () => {
    for (const f of ["errors.ts", "redact.ts"]) {
      const src = readFileSync(join(__dirname, "../../../../packages/shared/src", f), "utf8");
      expect(src).not.toMatch(/process\.env|server-only|apps\//);
    }
  });
});
