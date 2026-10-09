# Rules review 5: `docs/database.md` (24 sections)

Reviewed 2026-10-09 against the database code, the tooling guard tests, the audit's data findings and the recorded external state. Verdict key as in `README.md`.

## Overall verdict

The rules are **correct and unusually well enforced**. The reset, seed and migration tooling is the best-tested part of the repository. Two statements in the document were stale or incomplete and are fixed; one structural risk (Neon branch topology) was documented in the audit but missing from the rule document and is added; one rule had no guard and now has one.

## Rule-by-rule

| § | Rule | Verdict | Mechanism or note |
| --- | --- | --- | --- |
| 1 | Layered flow; clients never touch Neon or Drizzle; credentials stay server-side | Sound, Enforced | `security.test.ts` (server-only secrets, `'use client'` import test), `boundary.test.ts` |
| 2, 3 | Four logical environments; explicit environment selection, never guessed from a hostname; each has its own connection | Sound, Enforced | `env.test.ts` (identity and cross-wiring refusals) |
| 4 | Destructive tooling refuses `prod` and requires positive identification of an allowed environment | Sound, Enforced, with a known limit | `tooling.test.ts`, `guard` tests. The guard trusts the `DATABASE_ENV` label and does not verify it against the database it points at (F-DATA-004, launch gate) |
| 5 | Drizzle owns schema and queries; no second schema system; raw SQL isolated behind the data layer | Sound, **was unenforced, now Enforced** | **New** test: the database libraries (`drizzle-orm`, `drizzle-kit`, `@neondatabase/*`) may be imported only under `db/`, `scripts/`, `drizzle/` and `drizzle.config.ts`. Proved by adding an import to a page: the test fails |
| 6 | Model stable domain concepts; no speculative tables or columns | Sound, Guidance | |
| 7 | Clerk owns identity; no `users` table that only duplicates Clerk | Sound, Guidance | A profile table is allowed later for real requirements (for example recording terms acceptance, F-AUTH-002) |
| 8, 17 | Queries only in data-access helpers; business rules before persistence | Sound, Enforced in part | Service-layer boundary test; the new import guard |
| 9 | Authorization is server-side | Sound, Enforced in part | Unit tests with fakes; real-database proof pending (F-TEST-002) |
| 10, 11 | Versioned migrations committed to Git; applied migrations never rewritten; `push` is never the strategy | Sound, Enforced | `migrate.test.ts` ("never exposes drizzle-kit push", journal and SQL files match, unknown history flagged) |
| 12, 12.1, 12.2 | Reset and seed: dev and qa only; never `prod` or `stage`; keep migration history; deterministic idempotent seeds | Sound, Enforced | `tooling.test.ts` ("never touches the migration history schema and never drops anything", the five-condition guard). qa path implemented but never run against a real qa database, as the document says |
| 12.3 | Migration workflow dev → qa → stage → prod; forward-only; back up before prod | Sound, Guidance for the human steps | The commands and guards are tested. The restore half is unproven: no restore has been exercised (F-DATA-002, launch gate) |
| 13 | Neon branches are environments, not Git branches; children stay logically independent | Sound; **incomplete** | **Fixed**: added the rule that once `prod` holds real data no child may be created or reset from it (F-DATA-006). Not an emergency while `prod` is empty |
| 14 | Environment variables; no credentials in committed files | Sound, Enforced | `security.test.ts` secret patterns |
| 15 | Vercel to Neon mapping; previews never use production; previews map to `qa` | Sound; policy not verified | Preview variable values and the `qa` mapping are unverified console state (U-02) |
| 16, 21 | Clients depend on contracts, not rows; schema and API evolve separately | Sound, Guidance | Contract compatibility test planned (F-AUTH-005) |
| 18 | Transactions where atomicity is needed; the `neon-http` driver has none, use `db.batch` | Sound, Enforced | `db.test.ts` records the driver decision; `data-mutations.md` now points here |
| 19 | Portability across PostgreSQL hosts | Sound, Guidance | |
| 20 | Evidence-driven performance | Sound, Guidance | |
| 22 | Claude's pre-change checklist and prohibitions | Sound, Guidance | The prohibitions overlap code guards (no client database access, no prod reset) |
| 23 | Current implementation status | **Stale** | **Fixed**: said all four environments are "being established"; now points to `deployment.md` (only the `production` branch is confirmed) |
| 24 | Guiding principle | Sound | |

## Fixed in this pull request

* New guard test: database libraries are imported only by the data layer and its tooling (section 5 and 8).
* Section 13: rule for Neon child branches once production holds real data.
* Section 23: status line no longer overstates which environments exist.

## Open items (tracked elsewhere)

* Restore never exercised, 6-hour recovery window: F-DATA-002 (launch gate; one free restore drill).
* No migration check in CI or offline drift check: F-DATA-003 (Wave 1 item 5).
* Production migration procedure and who applies it: F-DATA-001 (launch gate).
* One credential per branch, no role separation: F-DATA-005.
* Destructive-tooling label not verified against the target database: F-DATA-004.
* Branch topology decision (children of `production`, or a separate project): F-DATA-006.

## Owner decisions

None for this document. The branch topology choice (F-DATA-006) is a technical decision that will be brought to the owner with a recommendation before real data exists.
