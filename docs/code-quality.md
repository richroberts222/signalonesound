# Code Quality

This document is authoritative for this project's code-quality, reuse, and refactoring principles.

The goal is **maintainable software, not mechanical compliance**. These are judgment-guided principles, not slogans. Where another document already owns a topic, that document wins and this one only points to it:

| Topic | Owner |
| --- | --- |
| Platform architecture, replaceable infrastructure | `/docs/architecture-rules.md` (section 24, section 29) |
| Service layer, where logic belongs, composition root | `/docs/services.md` |
| API adapter, errors, status mapping | `/docs/api.md` |
| Shared packages, contracts, model boundaries | `/docs/shared-code.md` |
| Database and data access | `/docs/database.md` |
| Auth and authorization | `/docs/auth.md`, `/docs/security.md` |
| UI, components, design system, brand assets | `/docs/ui.md` |
| Tests and Test Value Review | `/docs/testing.md`, `/docs/automation/test-value-review.md` |

---

## 1. Single source of truth (DRY)

Never knowingly duplicate an established behavior, business rule, reusable component, contract, validation rule, configuration value, design token, or other authoritative source of truth.

Prefer, in order:

```text
reuse -> composition -> configuration / variants -> extension
```

over copy/paste.

The goal is **one authoritative implementation for one concept**, not one abstraction for everything that looks similar.

* Do not create an abstraction only to remove coincidental duplication. Two pieces of code that look alike but represent different concepts (for example two validation limits that happen to be 40 today) must not be coupled.
* Wait for evidence that the concept is the same (same reason to change) before extracting. Tolerating two similar copies is cheaper than the wrong shared abstraction.
* Before writing new behavior, search for the existing implementation (shared packages, services, `components/ui`, theme tokens) and reuse it.

## 2. Interfaces and dependency boundaries

Where a meaningful architectural boundary exists, consumers depend on a contract or capability, not on implementation details. Existing boundaries:

```text
UI
 -> API / shared contracts      (@signalone/validation, @signalone/shared)
 -> API adapter                 (apps/web/lib/api)
 -> service layer               (apps/web/lib/services)
 -> repository / data access    (apps/web/db/*)
 -> Drizzle -> PostgreSQL/Neon
```

Other places a boundary is justified: authentication provider (`lib/auth`), external services, notifications, storage, analytics, other infrastructure providers, and Web/Mobile shared contracts.

An interface, type, or abstraction needs concrete value, such as:

* architectural isolation or infrastructure isolation
* substitutable implementations (for example the real and fake repository)
* testability of business logic
* a stable contract shared by client and server
* protection of business/domain logic

Do **not** require an interface for every function, component, class, or module. Do not add "interface for interface's sake", speculative abstraction, wrapper-only layers, or indirection with a single implementation and no isolation or test value. Use the simplest boundary that preserves maintainability (`/docs/architecture-rules.md` section 29; `CLAUDE.md` section 14).

Dependencies are explicit: pass them in (factory arguments, context) rather than reaching for globals. No DI framework or container is used (`/docs/services.md`).

## 3. Dependency direction

Dependencies point from high-level (UI, transport) toward low-level (infrastructure), and shared packages point toward `shared`:

```text
apps -> validation -> shared        (never the reverse; /docs/shared-code.md)
UI -> contracts -> API -> service -> data access -> Drizzle -> Neon
```

* UI does not know Neon or Drizzle details and never accesses the database.
* Business logic is not scattered through UI components; the server owns authoritative rules (`/docs/services.md`, `/docs/ui.md` section 16).
* Data-access code does not define product UI behavior or HTTP behavior.
* Authentication provider details (Clerk) stay in the auth boundary (`lib/auth`, `proxy.ts`, Clerk UI wiring), not spread through services or data access.
* Shared contracts import nothing from frameworks, `apps/*`, or infrastructure, and must not create circular dependencies between packages.
* Client code (Web client components, Mobile) never gains privileged server or database access and never receives server secrets.
* Database row types are not API contracts (`/docs/shared-code.md`, model boundaries).

If a change needs a dependency in the wrong direction, stop and treat it as an architectural question (`CLAUDE.md` section 15).

## 4. Functions and modules

* Functions have a focused responsibility; modules are cohesive. Avoid unrelated responsibilities in the same module.
* Names communicate intent. Prefer a clear name over a comment.
* Avoid deeply nested logic where a clearer decomposition exists (early returns, small helpers).
* Avoid long positional parameter lists where a named structure is clearer.
* Avoid hidden mutation and surprising side effects. Side effects (I/O, time, randomness, environment) are explicit and injectable where that helps testing.
* Remove dead code; do not comment it out. Git keeps history.
* Comments explain **why** when the code cannot. Do not use a comment to excuse unclear code.
* No arbitrary line-count, function-length, or file-length limits. Split when responsibilities differ, not to hit a number.
* Prefer composition over inheritance.

## 5. Constants and magic values

Repeated domain constants, configuration values, limits, identifiers, and design values should have one authoritative location when that improves clarity or maintainability: shared constants/contracts for cross-client values (`@signalone/shared`, `@signalone/validation`), the theme for visual values (`/docs/ui.md`), environment configuration for deployment values (`/docs/environment.md`).

Do not mechanically extract every literal. A named constant must communicate meaning or establish a source of truth. A one-off, self-explanatory literal can stay inline.

## 6. Error handling

Use the existing foundation; do not build a second error architecture.

* Expected failures use `Result<T>` / `AppError` / `ErrorCode` (`@signalone/shared`), `ServiceError`, and `runService()` (`/docs/services.md`, `/docs/api.md`, `/docs/data-mutations.md`).
* Unexpected failures propagate to the boundary and go to `reportUnexpectedError` (`/docs/api.md`).
* Preserve useful context for diagnostics server-side; never swallow failures silently; never expose secrets, SQL, driver text, stacks, or submitted values to clients.
* Translate errors once, at the established boundary, not repeatedly in feature code.

## 7. Testability

Design so behavior can be tested, but do not distort production code for tests.

* Separate business logic from framework and infrastructure details when that provides real value (services are framework-free; data access is faked in tests).
* Use dependency boundaries to enable focused tests where justified.
* Do not introduce mocks or interfaces everywhere merely because they could be tested.
* Every new test or test group follows the Test Value Review (`/docs/automation/test-value-review.md`). Documentation-only changes do not need new tests.

## 8. Safe refactoring

Refactoring changes structure while preserving intended externally observable behavior.

Before a meaningful refactor:

1. Understand current behavior.
2. Identify existing test protection.
3. Identify risk (clients, API versions, data, auth).
4. Add characterization/behavioral protection when justified (under the Test Value Review).
5. Make the smallest coherent change.
6. Run appropriate validation (`pnpm validate`).
7. Verify behavior remains intact.
8. Do not mix unrelated product behavior changes into the same refactor without an explicit reason.

Repository-wide or cross-cutting refactors require demonstrated need **and explicit approval** (a separate approved issue). A feature request or audit finding is not by itself that approval. Public API contracts keep their compatibility rules (`/docs/shared-code.md`, Versioning) even when refactoring.

## 9. Boy Scout Rule

When touching existing code, leave it modestly cleaner when the cleanup is understood, the risk is low, behavior is preserved, and it stays reasonably within the scope of the change (a clearer name, a removed dead branch, a small extraction).

This is not authorization for unrelated broad refactors. If the cleanup is larger than the task, record it in the issue/PR conversation as a recommendation instead.

## 10. UI reuse

UI reuse, design tokens, brand assets, variants, and overrides are owned by `/docs/ui.md`. The same single-source-of-truth principle (section 1) applies: reuse the existing component or token before creating a new one.

## 11. Using this document

* Prefer the simplest implementation that satisfies the requirement within the architecture (`CLAUDE.md` section 14).
* These principles guide review and design; they do not replace judgment. When two principles conflict (for example DRY vs. avoiding premature abstraction), choose the option with the lower long-term maintenance cost and say why in the PR.
* Existing code that departs from these principles is reported, not silently rewritten.<!-- boilerplate:reference:start --> See `/docs/code-quality-audit.md` for the current baseline.<!-- boilerplate:reference:end -->

## 12. Clean Architecture alignment (owner decision, 2026-10-09)

The owner chose Robert C. Martin's approach. This project follows **Clean Code** (intention-revealing names, focused functions, no dead code, comments that explain why, the Boy Scout rule in section 9), the **SOLID** principles, and **Clean Architecture** (the dependency rule, use cases independent of frameworks, ports and adapters). Sections 1 to 11 already express these; this section names the standard and fixes the one decision those sections left open: where interfaces are required.

| Principle | How it is applied here |
| --- | --- |
| Single responsibility | Cohesive modules and focused functions (section 4). Martin favors very small functions; this project splits by responsibility and sets no numeric limit |
| Open/closed | Extend through composition, variants and new adapters, not by editing stable code (section 1) |
| Liskov substitution | The real and the fake repository are interchangeable: one acceptance suite runs against both (`proof-items.acceptance-suite.ts`) |
| Interface segregation | Small contracts (`Actor`, `Rule`, a service's own repository type), not wide shared ones |
| Dependency inversion | The service layer depends on ports it defines; adapters implement them; the composition root (`lib/composition.ts`) wires them (section 2) |
| Dependency rule | Source dependencies point inward: UI, then API adapter, then services, then ports; infrastructure plugs in from outside (section 3) |

### Where an interface (port) is required

An interface is required wherever the platform meets something external or replaceable, so the rest of the code stays agnostic of the vendor. It is **not** required for ordinary internal functions (section 2 still forbids interfaces for their own sake).

| Boundary | Port | Adapter (the only importer of the vendor SDK) | Status |
| --- | --- | --- | --- |
| Identity and sign-in | `getUserId` supplied to `createApiRoute`; `Actor` | `lib/auth` (Clerk) | Exists |
| Data access | A repository type per service (for example `ProofItemRepo`) with a fake | `db/*` (Drizzle on Neon) | Exists |
| Unexpected-error reporting | `onUnexpected` hook | `lib/api/report.ts` | Exists |
| Payments and subscriptions | Not defined | Not built | Create with the first payment feature |
| Email and notifications (including push) | Not defined | Not built | Create with the first message feature |
| File and image storage | Not defined | Not built | Create with the first upload feature |
| Maps and geocoding | Not defined | Not built | Create with the first location feature |
| Analytics and error tracking | Not defined (reporting hook covers errors) | Not built | Create when adopted |
| Time and randomness | Not defined | Not built | Inject a clock where time affects behavior |

Rules for ports:

* A port is written in terms of what the application needs, never in the vendor's vocabulary or types. Vendor types do not cross it.
* Each port has an adapter in one place, and that place is the only code that imports the vendor SDK.
* Each port has a fake for tests; the fake and the adapter pass the same acceptance suite.
* A port is created when the first feature needs it, not earlier (section 2: no speculative layers).
* Enforced today: `apps/web/lib/security.test.ts` fails if the Clerk SDK is imported outside its allowed locations, and if the database libraries are imported outside the data layer. Each new vendor adds its own allow-list entry in the same pull request.
