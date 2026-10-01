# Business / Service Layer

Authoritative application rules live in the service layer (see `/docs/data-mutations.md` sections 11 to 14 and `/docs/architecture-rules.md`). This document defines the conventions and the reusable foundation in `apps/web/lib/services/`. No Signal One domain services exist yet.

```text
Web / Mobile
  -> API / Server boundary (Server Action, route handler)   transport, parsing, identity, mapping
  -> Authentication + Authorization                          requireUserId(), authorize()
  -> Service function                                        business rules, orchestration
  -> Data-access helper                                      Drizzle queries, persistence invariants
  -> Drizzle -> Neon/PostgreSQL
```

## Where logic belongs

| Concern | Belongs in | Does NOT belong in |
| --- | --- | --- |
| Parsing `FormData`/`Request`, cookies, redirects, revalidation, HTTP status | Server boundary | Services |
| Resolving identity (`requireUserId()`) | Server boundary | Services (they receive it in context) |
| Input shape validation (Zod from `@signalone/validation`) | Server boundary, before the service call | React components (UX only), data access |
| Authorization, ownership, state transitions, which fields may change, side effects | Service | Components, route handlers, Server Actions, data access |
| Queries, inserts, persistence invariants, `DatabaseError` wrapping | Data-access helpers | Services (no Drizzle query building), components |
| Rendering, navigation, optimistic UI | Clients | Services |

## Module layout (`apps/web/lib/services/`)

* `context.ts`: `ServiceContext` (`{ actor }`) and `createServiceContext(userId)`.
* `errors.ts`: `ServiceError` plus `notFound()`, `conflict()`, `validationFailed()` for expected business failures.
* `run.ts`: `toAppError()` and `runService()`, which map thrown failures to the shared `Result<T>`/`AppError` contract.
* `atomic.ts`: `AtomicRunner` type and `createAtomicRunner(db)` (see Transactions).
* `index.ts`: barrel. Service code is framework-free: no React, Next.js, Clerk, `server-only`, Drizzle, or `db` client imports (type-only imports allowed). A test enforces this for the foundation files; apply the same rule to every service.

## Conventions

**Inputs.** `async function op(ctx: ServiceContext, input: TypedInput): Promise<Output>`. Input types are plain TypeScript (ideally `z.infer` of a shared schema). Never `FormData`, `Request`, or Next.js types. Identity comes only from `ctx.actor`, never from input; resource IDs in input are compared to the actor through rules.

**Outputs.** Return plain serializable data (or `void`). Do not return redirects, responses, or ORM/driver objects. Map database rows to stable output types so schema changes do not leak to clients.

**Errors.** Expected failures: throw `ServiceError` (via `notFound()`, `conflict()`, `validationFailed()`), or let `authorize()` throw `ForbiddenError`. Unexpected failures (including `DatabaseError`) simply propagate. The boundary calls `runService()`, which yields `Result<T>`:

| Thrown | `AppError.code` |
| --- | --- |
| `ServiceError` | its own code (`validation_failed`, `not_found`, `conflict`, ...) |
| `UnauthenticatedError` | `unauthenticated` |
| `ForbiddenError` | `forbidden` |
| `DatabaseError` kind `unique_violation` | `conflict` (generic message) |
| anything else | `internal` ("Something went wrong") |

Messages never contain SQL, driver text, or the cause. `runService(fn, onUnexpected)` passes the original error to `onUnexpected` only for unexpected failures; wire the logging foundation there when it exists (none exists yet). Transports map `code` to HTTP status/UI.

**Authorization.** Call `authorize(ctx.actor, rule, resource)` (from `lib/auth`) inside the service after loading the resource. Do not rely on `proxy.ts` or UI checks.

**Dependencies.** Prefer a factory taking explicit dependencies, `createXService({ repo, atomic, ... })`, so tests pass fakes. Dependencies are data-access functions/objects, an `AtomicRunner`, and non-deterministic sources (clock, ID generator). Services do not call `getDb()`; composition happens at the boundary (a composition root that wires `getDb()` to data access). No DI framework or container.

**Transactions.** Transaction boundaries are decided by the service; the mechanism is supplied. The `neon-http` driver has no interactive transactions (`/docs/database.md` section 18), so atomic work is a batch: data-access helpers expose statement builders, the service chooses which statements form the unit, and `deps.atomic(operation, [stmtA, stmtB])` (`createAtomicRunner(getDb())`) executes them via `db.batch` with `DatabaseError` wrapping. Statements that depend on each other's runtime results are not expressible this way; that is the documented architectural decision in `/docs/database.md` (switch that path to the WebSocket driver). External side effects are not rolled back by the database (`/docs/data-mutations.md` section 30).

## Consuming services from boundaries

Web Server Action (illustrative, not implemented):

```ts
const userId = await requireUserId();                      // identity
const input = schema.parse(Object.fromEntries(formData));  // FormData stops here
const result = await runService(() => someService.op(createServiceContext(userId), input));
// then revalidate/redirect based on result
```

A future API route or mobile endpoint does the same with a JSON body and the Clerk token-verified user ID, then maps `result.error.code` to HTTP status. The service and its tests are identical for both. Route conventions (adapter, lifecycle, status mapping, versioning) are in `/docs/api.md`; `createApiRoute` in `lib/api/` performs the steps above.

## Testing

Unit test services with fake data-access and a fake `AtomicRunner`; cover success, validation failure, not found, forbidden, and error mapping. `apps/web/lib/services/services.test.ts` contains a generic placeholder example (not a domain entity) proving the conventions, plus static boundary checks. Database-backed tests follow `/docs/testing.md`.

## Portability

The folder has no Signal One domain code and depends only on `@signalone/shared` (`Result`, `AppError`), `lib/auth` (`Actor`, errors, `authorize`), and `db/errors.ts` + the `Database` type. It can move into a boilerplate unchanged.

## Composition root

`apps/web/lib/composition.ts` (`server-only`) is the only place that wires `getDb()` to data access and data access to services (`getProofItemService()` today). It is lazy so `next build` needs no database environment. A generic example, `lib/services/proof-items.ts`, shows the conventions end to end (`/docs/api.md`).

## Not decided yet

A real logging system (unexpected API errors currently go through `reportUnexpectedError`, `/docs/api.md`) and whether services should later move to a shared package for non-Next consumers.
