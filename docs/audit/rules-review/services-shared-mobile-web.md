# Rules review 8: `services.md`, `shared-code.md`, `mobile.md`, `web.md`

Reviewed 2026-10-09 with the owner's five tests per rule: **Sense**, **Standard**, **Solid**, **Enforced**, **Proven** (the enforcement was broken on purpose and a check failed). Standards named from recollection (not re-fetched): Clean Architecture and hexagonal architecture (service layer and ports), OWASP API Security Top 10, OWASP MASVS (mobile), semantic versioning of interfaces.

## Overall verdict

The rules are **sensible, standard and solid**. Reading the four documents against the code found **five stale statements** (fixed) and **one rule with no guard** (the dependency direction between packages, now guarded and proven).

## `services.md` (service layer)

| Rule | Standard | Enforced | Proven |
| --- | --- | --- | --- |
| Business rules, authorization, ownership, state transitions live in services; transport and persistence do not | Clean Architecture use-case layer | `services.test.ts`, acceptance suite | Yes (below) |
| Services are framework-free: no React, Next.js, Clerk, Drizzle, database client, `FormData`, `process.env` | Dependency rule | Static boundary test scans **every** file in the folder (new services are covered automatically); subfolders are not scanned (Low) | Yes: importing Clerk into the service layer fails 2 tests |
| Errors map to the shared `AppError` codes; unexpected errors are generic and reported only to the hook | OWASP API8, A09 | `run` tests, API suites | **Yes**: forbidden mapped to internal fails 5 tests; unique violation no longer a conflict fails 4; internal text leaked to clients fails 6; unexpected errors no longer reported fails 6 |
| Dependencies are injected (repository, atomic runner, clock, id generator) | Dependency inversion | Factory pattern in tests | Structure; the clock and id generator conventions have no port type yet (table in `code-quality.md` section 12) |
| Atomic work uses a batch (no interactive transactions on the `neon-http` driver) | Driver constraint | `db.test.ts` records the decision | Covered in the database ledger |
| Composition root is the only wiring point | Composition root pattern | Convention | Not mechanically guarded (Low) |

## `shared-code.md` (shared packages)

| Rule | Standard | Enforced | Proven |
| --- | --- | --- | --- |
| Packages are source-only, pnpm workspace, version pinned by `packageManager` | Monorepo practice | Frozen lockfile in CI | Yes (CI) |
| No server-only code, secrets, database access, or `process.env` in the shared packages | 12-factor; OWASP A02 | `security.test.ts` "shared packages never import server-only or read process.env" (lives in the web suite, not the packages' own) | **Yes**: adding a `process.env` read to `shared` fails that test |
| Dependencies flow apps → validation → shared, never the reverse; no imports from `apps/*` | Dependency rule | **Was not guarded** for relative-path imports. **New** test in `security.test.ts` | **Yes**: validation importing an app file fails; shared importing validation by relative path fails; by package name fails |
| Contracts are the transport layer; database row types are never public contracts; schema-first with `z.infer` | Hexagonal anti-corruption layer; API design | Boundary and API suites; no row type is exported from `db/` to contracts | Partly (no test fails if a row type is exposed as a contract; Low until real tables exist) |
| Server-controlled fields never appear in input schemas | OWASP API3 (mass assignment) | Acceptance suite (ownership is derived, not accepted) | Unit-level |
| Additive-only versioning inside a version; serialization is JSON-safe | Semantic versioning of interfaces | No contract-compatibility test | **Not proven** (F-AUTH-005, planned) |

## `mobile.md`

| Rule | Standard | Enforced | Proven |
| --- | --- | --- | --- |
| Mobile is a client of the API only; never reaches data access, Drizzle or Neon; no secrets in the app | OWASP MASVS-STORAGE, MASVS-NETWORK | `boundary.test.ts` (no server, database or Next.js imports, no `apps/web` imports, `process.env` limited to `EXPO_PUBLIC_*`, no forbidden packages) | **Yes**: importing web server code fails 1 test; importing the ORM fails 1 test |
| Only client-safe values in `EXPO_PUBLIC_*`; `.env.local` ignored | MASVS-STORAGE; 12-factor | `security.test.ts` secret-like names; `.gitignore` | Yes (secrets guard proven earlier) |
| Bearer-token auth with Clerk, validated by the server | OAuth 2.0 bearer tokens; MASVS-AUTH | API accepts the token; mobile sends none | **Not proven**: no real token has been carried (F-AUTH-005) |
| Builds via EAS profiles per environment | Release practice | `eas.json` exists | **Not proven**: no build has ever run |
| Vitest covers pure TypeScript only; no component tests | Test pyramid | n/a | Gap: no render or device tests (Wave 3) |

## `web.md`

| Rule | Standard | Enforced | Proven |
| --- | --- | --- | --- |
| Stack, commands, shell and navigation conventions | n/a | `pnpm validate` runs the listed commands | Yes (CI) |
| Next.js agent file generation is disabled so `CLAUDE.md` and `/docs` stay authoritative | Single source of truth | `agentRules: false` in `next.config.ts` | Structure |
| Client/server boundary test lists feature folders (`FEATURE_DIRS`); add new folders | Boundary enforcement | `components/discover/server-boundary.test.ts` | Earlier audit; the list must be edited by hand when a folder is added (Low) |

## Fixed in this pull request

| Defect | Where | Fix |
| --- | --- | --- |
| Said `api.md` is empty and API wiring, status mapping and versioning are undefined | `shared-code.md` | Points to `api.md`, where they are defined |
| Said `api.md` is empty and must be defined before mobile features | `mobile.md` (twice) | Corrected; notes the bearer path is unproven |
| Said the shared packages are not imported by the web app | `web.md` | They are, and listed in `transpilePackages` |
| Said no database tables are defined | `web.md` | No product tables; the demo tables are named inside reference markers |
| Described `db:migrate` as `drizzle-kit migrate`; omitted `--env`, status and verify | `web.md` | Lists the real guarded commands |
| Dependency direction between packages had no guard | `security.test.ts` | New test, proven three ways |

## Notes for later (tracked elsewhere)

* `web.md` still describes the product mock features (shell navigation, church event-management mock) unmarked, so they would ship into a generated app's documentation. They go away with the template cleanup for the leaked product features (independent audit B1).
* Mobile sign-in, navigation, build and component tests: the walking skeleton.

## Owner decisions

None for these documents.
