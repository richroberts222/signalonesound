# Shared Code

## Repository layout

Signal One is a pnpm workspace monorepo (`pnpm-workspace.yaml`):

```text
apps/web              Next.js Web application
apps/mobile           React Native + Expo application (placeholder, not yet scaffolded)
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
* `result.ts`: `Result<T>`, `AppError`, `ErrorCode`, `ok()`, `fail()` (see `/docs/data-mutations.md`)
* `utils.ts`: pure helpers

### `@signalone/validation`

Zod schemas for API input/output contracts (depends on `@signalone/shared`). Currently generic building blocks only (`emailSchema`, `uuidSchema`, `paginationSchema`, `toFieldErrors`).

## Rules

* Do not add domain-specific models, schemas, or business rules until a feature is deliberately designed. Domain contracts go here only when used by more than one client.
* No server-only code, secrets, database access, Clerk secret usage, or `process.env` reads.
* No imports from `apps/*`. Dependencies flow `apps -> validation -> shared`, never the reverse.
* No React, DOM, or Node-only APIs in `shared`; it must run in Node, browsers, and React Native.
* Validation schemas are the source of truth for input types (`z.infer`); do not hand-write duplicate types.
* Authoritative business rules execute on the server; shared code may expose the rule's inputs/outputs and validation, not a parallel client-side implementation of authority.
* Adding a new package requires a reason; prefer extending these two.
