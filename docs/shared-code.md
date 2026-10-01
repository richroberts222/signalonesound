# Shared Code

## Repository layout

Signal One is a pnpm workspace monorepo (`pnpm-workspace.yaml`):

```text
apps/web              Next.js Web application
apps/mobile           React Native + Expo application (foundation shell; see /docs/mobile.md)
packages/shared       Shared types, constants, result/error shapes, pure utilities
packages/validation   Shared Zod validation schemas
```

## Package manager

pnpm is the package manager. The version is pinned by `packageManager` in the root `package.json`. Use `pnpm`, not npm or yarn.

## Package strategy

Packages are consumed as TypeScript source (`exports` points at `src/index.ts`); there is no build step. Web consumers must add the package to `transpilePackages` in `next.config.ts` when they first import it; Expo/Metro consumes workspace TypeScript directly. Each package has its own `typecheck` script, run by `pnpm typecheck`.

### `@signalone/shared`

Domain-agnostic, runtime-agnostic code usable by every client and the server:

* `constants.ts`: universal constants (`APP_ENVS`, page-size defaults)
* `env.ts`: pure environment validation and production guards over a caller-supplied record (never reads `process.env`); see `/docs/environment.md`
* `result.ts`: `Result<T>`, `AppError`, `ErrorCode`, `ok()`, `fail()` (see `/docs/data-mutations.md`)
* `contracts.ts`: `ApiError`, `Paginated<T>`, API version constants
* `utils.ts`: pure helpers

### `@signalone/validation`

Zod schemas for API input/output contracts (depends on `@signalone/shared`). Currently generic building blocks only; see "Contract conventions" below.

## Rules

* Do not add domain-specific models, schemas, or business rules until a feature is deliberately designed. Domain contracts go here only when used by more than one client.
* No server-only code, secrets, database access, Clerk secret usage, or `process.env` reads.
* No imports from `apps/*`. Dependencies flow `apps -> validation -> shared`, never the reverse.
* No React, DOM, or Node-only APIs in `shared`; it must run in Node, browsers, and React Native.
* Validation schemas are the source of truth for input types (`z.infer`); do not hand-write duplicate types.
* Authoritative business rules execute on the server; shared code may expose the rule's inputs/outputs and validation, not a parallel client-side implementation of authority.
* Adding a new package requires a reason; prefer extending these two.

## Contract conventions

Shared contracts are the platform's stable, versionable surface between server, Web, and Mobile. They MUST import nothing from Next.js, React, React Native, Clerk, Drizzle, Neon, or `apps/*`, and are safe to bundle in any client.

### Model boundaries

| Layer | What it is | Where it lives | Public contract? |
| --- | --- | --- | --- |
| Transport contract | Request/response shapes, errors, pagination, identifiers as seen on the wire | `@signalone/validation` (schemas, `z.infer` types) and `@signalone/shared` (envelope types, constants) | Yes |
| Domain / business model | Server-side entities and rules | Server code (`apps/web`) | No; map to a transport contract at the boundary |
| Database model | Drizzle table/row types | `apps/web/db` only | Never. Row types MUST NOT be exported, reused, or extended as API contracts |
| UI model | View state, form state, display formatting | The owning client | No; each client derives it from the transport contract |

Data flows `database row -> domain model -> transport contract -> UI model`. Mapping between layers is explicit, so a schema change does not leak into clients (see `/docs/data-mutations.md`, Schema Evolution). Contracts must not expose table or column names, database key types, or persistence-only fields.

### Building blocks

* `@signalone/shared`: `Result<T>`, `ok()`, `fail()`, `AppError`/`ApiError` (identical shape), `ErrorCode`/`ERROR_CODES`, `Paginated<T>`, `paginated()`, `API_VERSIONS`/`ApiVersion`/`CURRENT_API_VERSION`, page-size constants (all in `result.ts`, `contracts.ts`, `constants.ts`).
* `@signalone/validation`: `idSchema` (opaque string identifier), `uuidSchema`, `emailSchema`, `paginationSchema` (request), `paginatedSchema(item)` (response), `apiErrorSchema`, `resultSchema(data)`, `parseInput(schema, input)` (untrusted input to `Result`, never echoing submitted values), `toFieldErrors`.

### Conventions

* **Schema first.** When runtime validation is needed, define the Zod schema and derive the type with `z.infer`/`z.output`. Hand-write a type only for pure envelope types in `shared` that carry no validation (for example `Paginated<T>`), and keep the matching schema assignable to it.
* **Naming.** `<Name>Input` for requests (client-controlled fields only), `<Name>` or `<Name>Output` for responses, `<name>Schema` for schemas.
* **Server-controlled fields** (ownership, identity, timestamps, status) MUST NOT appear in input schemas; the server derives them (see `/docs/data-mutations.md`).
* **Identifiers** are opaque strings to clients. Use `idSchema` unless a feature deliberately documents a stricter format.
* **Errors.** All expected failures use `ErrorCode` with a safe message and optional path-keyed `fieldErrors`. Add new codes to `ERROR_CODES` only deliberately, since clients must handle them.
* **Pagination.** Requests use `paginationSchema` (opaque `cursor`, bounded `limit`); responses use `Paginated<T>` with `nextCursor: null` at the end.
* **Versioning.** The public API is versioned by `ApiVersion`. Within a version, change contracts only additively: new optional request fields, new response fields. Removing or renaming a field, tightening validation of existing input, adding a required request field, or changing meaning requires a new version, with older mobile clients supported per `/docs/data-mutations.md` (API Compatibility). Clients must tolerate unknown response fields and unknown error codes.
* **Serialization.** Contracts must be JSON-serializable: no `Date`, `bigint`, or class instances; use ISO strings for moments and document their meaning.
* **Portability.** The two packages contain nothing application-specific, so they can be extracted into a boilerplate.

Not yet defined: API route wiring, HTTP status mapping, and version routing. These belong to the API foundation (`/docs/api.md`, currently empty).
