import { describe, expect, it } from "vitest";

import { parseServerEnv } from "../env";
import { ISOLATED_ENV_NAMES, clearIsolatedEnv, fakeServerEnv, processEnv } from "./index";

describe("test setup isolation", () => {
  it("starts every test without credentials or environment identity", () => {
    for (const name of ISOLATED_ENV_NAMES) expect(processEnv()[name]).toBeUndefined();
  });

  it("clearIsolatedEnv removes only the isolated names", () => {
    const target: Record<string, string | undefined> = { DATABASE_URL: "x", APP_ENV: "prod", KEEP: "1" };
    clearIsolatedEnv(target);
    expect(target).toEqual({ KEEP: "1" });
  });
});

describe("fakeServerEnv", () => {
  it("is valid for the real parser and targets dev, never prod", () => {
    const env = parseServerEnv(fakeServerEnv());
    expect(env.appEnv).toBe("dev");
    expect(env.databaseEnv).toBe("dev");
  });

  it("uses an unroutable host so it cannot connect anywhere", () => {
    expect(fakeServerEnv().DATABASE_URL).toContain(".invalid");
  });

  it("applies overrides", () => {
    expect(fakeServerEnv({ DATABASE_ENV: "qa" }).DATABASE_ENV).toBe("qa");
  });
});
