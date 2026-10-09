import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CURRENT_API_VERSION } from "@signalone/shared";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import * as validation from "@signalone/validation";
import { apiErrorSchema, emailSchema, idSchema, paginatedSchema, paginationSchema, resultSchema, uuidSchema } from "@signalone/validation";

// API contract compatibility (docs/api.md "Versioning", docs/shared-code.md). Mobile apps cannot be
// force-updated, so inside one API version a contract may only grow. This test compares each
// shared contract with a committed snapshot and fails on a breaking change: a removed property, a
// changed type, a removed enum value, a response field that is no longer always present, a request
// field that became required, or a request limit that got stricter.
//
// Update the snapshot in the same pull request as any (compatible) contract change:
//   UPDATE_CONTRACT_SNAPSHOT=1 pnpm --filter web exec vitest run lib/api/contracts.compat.test.ts
// (This test lives in the web app, which has the Node typings the runtime-agnostic packages lack.)
// A breaking change needs a new API version and a new snapshot, deliberately.
type Direction = "input" | "output";
type Json = Record<string, unknown>;

export function breakingChanges(path: string, before: Json, after: Json, direction: Direction): string[] {
  const out: string[] = [];
  const at = (message: string) => out.push(`${path}: ${message}`);

  // Compared by value: a nullable type is an array (["string","null"]) and must not differ by identity.
  if (JSON.stringify(before.type) !== JSON.stringify(after.type)) at(`type changed from ${JSON.stringify(before.type)} to ${JSON.stringify(after.type)}`);

  const beforeEnum = before.enum as unknown[] | undefined;
  const afterEnum = (after.enum as unknown[] | undefined) ?? [];
  if (beforeEnum) {
    const removed = beforeEnum.filter((v) => !afterEnum.includes(v));
    if (removed.length > 0) at(`enum values removed: ${removed.join(", ")}`);
  }

  if (direction === "input") {
    for (const key of ["maxLength", "maximum", "maxItems"] as const) {
      if (typeof before[key] === "number" && typeof after[key] === "number" && (after[key] as number) < (before[key] as number)) {
        at(`${key} lowered from ${String(before[key])} to ${String(after[key])}`);
      }
    }
    for (const key of ["minLength", "minimum", "minItems"] as const) {
      if (typeof before[key] === "number" && typeof after[key] === "number" && (after[key] as number) > (before[key] as number)) {
        at(`${key} raised from ${String(before[key])} to ${String(after[key])}`);
      }
    }
  }

  const beforeProps = (before.properties ?? {}) as Record<string, Json>;
  const afterProps = (after.properties ?? {}) as Record<string, Json>;
  for (const [key, schema] of Object.entries(beforeProps)) {
    if (!(key in afterProps)) at(`property "${key}" removed`);
    else out.push(...breakingChanges(`${path}.${key}`, schema, afterProps[key], direction));
  }

  const beforeRequired = new Set((before.required ?? []) as string[]);
  const afterRequired = new Set((after.required ?? []) as string[]);
  if (direction === "output") {
    for (const key of beforeRequired) if (!afterRequired.has(key)) at(`"${key}" is no longer always present`);
  } else {
    for (const key of afterRequired) if (!beforeRequired.has(key)) at(`"${key}" became required`);
  }

  if (before.items && after.items) out.push(...breakingChanges(`${path}[]`, before.items as Json, after.items as Json, direction));

  for (const key of ["oneOf", "anyOf"] as const) {
    const b = before[key] as Json[] | undefined;
    const a = after[key] as Json[] | undefined;
    if (b) {
      if (!a || a.length < b.length) at(`a variant of ${key} was removed`);
      else b.forEach((variant, i) => out.push(...breakingChanges(`${path}<${i}>`, variant, a[i], direction)));
    }
  }
  return out;
}

// The shared contracts that every client depends on. A domain contract is added here, with its
// direction, in the pull request that introduces it (docs/shared-code.md).
const CONTRACTS: Record<string, { direction: Direction; schema: z.ZodType }> = {
  idSchema: { direction: "input", schema: idSchema },
  uuidSchema: { direction: "input", schema: uuidSchema },
  emailSchema: { direction: "input", schema: emailSchema },
  paginationRequest: { direction: "input", schema: paginationSchema },
  apiError: { direction: "output", schema: apiErrorSchema },
  resultEnvelope: { direction: "output", schema: resultSchema(z.object({ value: z.string() })) },
  paginatedEnvelope: { direction: "output", schema: paginatedSchema(idSchema) },
};

// Contracts of the reference application's own product features. A generated application removes
// them, so they are registered only when present and ignored when absent.
const OPTIONAL_CONTRACTS: Record<string, { exportName: string; direction: Direction }> = {
  patchProfileRequest: { exportName: "patchProfileSchema", direction: "input" },
  acceptPolicyRequest: { exportName: "acceptPolicySchema", direction: "input" },
  profileResponse: { exportName: "profileSchema", direction: "output" },
  dataExportResponse: { exportName: "dataExportSchema", direction: "output" },
  claimOrganizationRequest: { exportName: "claimOrganizationSchema", direction: "input" },
  patchOrganizationRequest: { exportName: "patchOrganizationSchema", direction: "input" },
  decideRequestRequest: { exportName: "decideRequestSchema", direction: "input" },
  revokeRequest: { exportName: "revokeSchema", direction: "input" },
  publicOrganizationResponse: { exportName: "publicOrganizationSchema", direction: "output" },
  myOrganizationsResponse: { exportName: "myOrganizationsSchema", direction: "output" },
  claimResultResponse: { exportName: "claimResultSchema", direction: "output" },
  adminRequestsResponse: { exportName: "adminRequestsSchema", direction: "output" },
  decisionResultResponse: { exportName: "decisionResultSchema", direction: "output" },
  auditLogResponse: { exportName: "auditLogSchema", direction: "output" },
  createEventRequest: { exportName: "createEventSchema", direction: "input" },
  patchEventRequest: { exportName: "patchEventSchema", direction: "input" },
  eventListQueryRequest: { exportName: "eventListQuerySchema", direction: "input" },
  eventResponse: { exportName: "eventSchema", direction: "output" },
  createdEventResponse: { exportName: "createdEventSchema", direction: "output" },
  eventListResponse: { exportName: "eventListSchema", direction: "output" },
  eventStatusResponse: { exportName: "eventStatusResultSchema", direction: "output" },
  eventSearchRequest: { exportName: "eventSearchQuerySchema", direction: "input" },
  publicEventResponse: { exportName: "publicEventSchema", direction: "output" },
  eventSearchResponse: { exportName: "eventSearchResultSchema", direction: "output" },
  placeSearchRequest: { exportName: "placeSearchQuerySchema", direction: "input" },
  placeSearchResponse: { exportName: "placeSearchResultSchema", direction: "output" },
};
for (const [name, { exportName, direction }] of Object.entries(OPTIONAL_CONTRACTS)) {
  const schema = (validation as Record<string, unknown>)[exportName] as z.ZodType | undefined;
  if (schema) CONTRACTS[name] = { direction, schema };
}

const toJson = (name: string): Json => {
  const { direction, schema } = CONTRACTS[name];
  const json = z.toJSONSchema(schema, { io: direction === "input" ? "input" : "output", unrepresentable: "any" }) as Json;
  delete json.$schema;
  return json;
};

const SNAPSHOT = join(__dirname, "contracts.snapshot.json");

describe("shared API contracts are compatible within an API version", () => {
  it("matches the committed snapshot without breaking changes", () => {
    const current = { apiVersion: CURRENT_API_VERSION, contracts: Object.fromEntries(Object.keys(CONTRACTS).map((n) => [n, toJson(n)])) };
    if (process.env.UPDATE_CONTRACT_SNAPSHOT === "1") {
      writeFileSync(SNAPSHOT, JSON.stringify(current, null, 2) + "\n");
      return;
    }
    expect(existsSync(SNAPSHOT), "contracts.snapshot.json is missing; run with UPDATE_CONTRACT_SNAPSHOT=1").toBe(true);
    const saved = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as { apiVersion: string; contracts: Record<string, Json> };
    expect(saved.apiVersion, "the API version changed: create the new version's snapshot deliberately and keep the old version's routes working").toBe(CURRENT_API_VERSION);
    const problems = Object.keys(saved.contracts).flatMap((name) =>
      name in CONTRACTS ? breakingChanges(name, saved.contracts[name], current.contracts[name], CONTRACTS[name].direction) : name in OPTIONAL_CONTRACTS ? [] : [`${name}: contract removed`],
    );
    expect(problems).toEqual([]);
  });

  it("the comparison detects each kind of breaking change (self-test)", () => {
    const base: Json = {
      type: "object",
      properties: { id: { type: "string", maxLength: 100, minLength: 1 }, kind: { type: "string", enum: ["a", "b"] } },
      required: ["id"],
    };
    const clone = () => JSON.parse(JSON.stringify(base)) as Json;
    const props = (j: Json) => j.properties as Record<string, Json>;

    expect(breakingChanges("c", base, clone(), "input")).toEqual([]);

    const removed = clone();
    delete props(removed).kind;
    expect(breakingChanges("c", base, removed, "output")[0]).toMatch(/"kind" removed/);

    const retyped = clone();
    props(retyped).id.type = "number";
    expect(breakingChanges("c", base, retyped, "output")[0]).toMatch(/type changed/);

    const enumShrunk = clone();
    props(enumShrunk).kind.enum = ["a"];
    expect(breakingChanges("c", base, enumShrunk, "input")[0]).toMatch(/enum values removed: b/);

    const nowRequired = clone();
    nowRequired.required = ["id", "kind"];
    expect(breakingChanges("c", base, nowRequired, "input")[0]).toMatch(/"kind" became required/);
    expect(breakingChanges("c", base, nowRequired, "output")).toEqual([]); // a new always-present response field is fine

    const optionalNow = clone();
    optionalNow.required = [];
    expect(breakingChanges("c", base, optionalNow, "output")[0]).toMatch(/no longer always present/);

    const nullableBefore: Json = { type: "object", properties: { note: { type: ["string", "null"] } }, required: ["note"] };
    const nullableAfter = JSON.parse(JSON.stringify(nullableBefore)) as Json;
    expect(breakingChanges("c", nullableBefore, nullableAfter, "output")).toEqual([]); // an unchanged nullable field is not a change
    const nullableDropped = JSON.parse(JSON.stringify(nullableBefore)) as Json;
    (nullableDropped.properties as Record<string, Json>).note.type = "string";
    expect(breakingChanges("c", nullableBefore, nullableDropped, "output")[0]).toMatch(/type changed/);

    const tighter = clone();
    props(tighter).id.maxLength = 50;
    expect(breakingChanges("c", base, tighter, "input")[0]).toMatch(/maxLength lowered/);

    const added = clone();
    props(added).extra = { type: "string" };
    expect(breakingChanges("c", base, added, "input")).toEqual([]);
    expect(breakingChanges("c", base, added, "output")).toEqual([]);
  });
});
