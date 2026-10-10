import { describe, expect, it } from "vitest";

import { PROD_MIGRATION_CONFIRMATION, resolveProdMigrationTarget } from "./migrate-prod";

// Applying migrations to production is the most dangerous thing the tooling can do, so each condition is
// proven separately: remove any one and the guard must refuse. Fake connection strings are built at runtime so no
// credential-shaped text sits in the repository.
const url = ["postgres", "://placeholder-user:placeholder-pass@placeholder.example/db"].join("");

const allowed = () => ({
  DATABASE_ENV: "prod",
  DATABASE_URL: url,
  APP_ENV: "prod",
  GITHUB_ACTIONS: "true",
  GITHUB_EVENT_NAME: "workflow_dispatch",
  GITHUB_REF: "refs/heads/main",
  PROD_MIGRATION_CONFIRM: PROD_MIGRATION_CONFIRMATION,
});

describe("resolveProdMigrationTarget", () => {
  it("allows exactly the workflow's conditions", () => {
    expect(resolveProdMigrationTarget(allowed(), "prod").databaseEnv).toBe("prod");
  });

  it.each([
    ["not in the GitHub workflow", { GITHUB_ACTIONS: undefined }],
    ["not started by hand (a pull request or a push)", { GITHUB_EVENT_NAME: "pull_request" }],
    ["started from another branch", { GITHUB_REF: "refs/heads/feat/x" }],
    ["started from a pull request ref", { GITHUB_REF: "refs/pull/5/merge" }],
    ["the confirmation word is missing", { PROD_MIGRATION_CONFIRM: undefined }],
    ["the confirmation word is wrong", { PROD_MIGRATION_CONFIRM: "yes" }],
    ["running on Vercel", { VERCEL_ENV: "production" }],
    ["the app environment says qa", { APP_ENV: "qa" }],
    ["the database environment is not prod", { DATABASE_ENV: "qa" }],
    ["the database environment is stage", { DATABASE_ENV: "stage", APP_ENV: "stage" }],
  ])("refuses when %s", (_name, change) => {
    expect(() => resolveProdMigrationTarget({ ...allowed(), ...change } as Record<string, string | undefined>, "prod")).toThrow(/refusing|DATABASE_ENV/);
  });

  it("refuses without an explicit --env=prod, or with a different target", () => {
    expect(() => resolveProdMigrationTarget(allowed(), undefined)).toThrow(/--env=prod/);
    expect(() => resolveProdMigrationTarget(allowed(), "qa")).toThrow(/--env=prod/);
  });

  it("refuses a missing or malformed database address, without echoing it", () => {
    expect(() => resolveProdMigrationTarget({ ...allowed(), DATABASE_URL: undefined }, "prod")).toThrow();
    try {
      resolveProdMigrationTarget({ ...allowed(), DATABASE_URL: "not-a-url-secret-value" }, "prod");
    } catch (error) {
      expect(String(error)).not.toContain("not-a-url-secret-value");
    }
  });

  it("reports every failing condition at once, so a person can fix them in one go", () => {
    try {
      resolveProdMigrationTarget({ DATABASE_ENV: "prod", DATABASE_URL: url }, undefined);
      throw new Error("expected a refusal");
    } catch (error) {
      const message = String(error);
      for (const part of ["GitHub workflow", "by hand", "main branch", "confirmation word", "--env=prod"]) expect(message).toContain(part);
    }
  });
});
