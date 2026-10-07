# DATA: Data Model and Lifecycle

Examined 2026-10-07 (Pass 2) at baseline `31ec6ba` (`git rev-parse origin/main` equals the recorded baseline; no re-baseline needed). Depth: Deep. Home for: schema and integrity, migrations (including the production procedure and rollback), transactions, backup/restore/PITR, environment safety of data tooling, least-privilege roles, retention and portability, silent-corruption detection (`methodology.md` section 4).

## Method note

Evidence was gathered before the prior-input rows for DATA were re-read. Read in full: `apps/web/db/**` (client, index, env, errors, health, schema, proof-items, tooling: guard, migrate, executor, reset, seed), `drizzle.config.ts`, `scripts/db-*.ts`, both migration SQL files, `drizzle/meta/_journal.json`, `lib/services/atomic.ts`, the integration test header and config, `docs/database.md` sections 2, 12.1 to 12.3, 13 to 15, `docs/environment.md`, `docs/deployment.md`, `packages/shared/src/env.ts`. Searched (read-only): every `prod` reference outside `docs/audit/` (code, scripts, tests, docs) to answer whether anything depends on a Neon branch name. Platform facts are the UI-RELAY and owner-run SQL records in `baseline/external-state.md`.

Not examined, and why: no command was run (no `pnpm` in this job, no database credentials, none requested). Whether the migrator behaves as read is therefore READ, not RUN. Neon roles, per-branch migration state (U-05, U-06, U-07, U-09, U-15), whether any restore has been exercised, and vendor documentation remain UNVERIFIED.

### Answer to the `prod` versus `production` question

No code, script, test or config reads a Neon branch name. The word `prod` in code is only the logical value of `DATABASE_ENV`/`APP_ENV` (`packages/shared/src/env.ts:7,26,117-135`, tooling guards, `drizzle.config.ts`). The Neon branch is reached only through `DATABASE_URL`, and the repository never parses the URL for a branch or host (`db/env.ts` comment, `database.md` section 2). So the Neon root being named `production` breaks nothing. The docs also already anticipate it: `database.md:73` and `architecture-rules.md:962` say the logical environment stays `prod` while the default branch is named `production`. The earlier reading that this was doc drift (`external-state.md`, recorded 2026-10-07) is **corrected**: it is a documented, tolerated mapping. The template wording in `new-app-setup.md:39` and `customization-map.md:41` ("create a branch named `prod`") is instruction for new apps, not drift for this instance. The residual issue is not the name; it is that nothing verifies the label (F-DATA-004).

## Findings

### F-DATA-001 There is no production migration procedure, and no route by which any pipeline applies migrations

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Medium |
| Confidence | High (READ) that none exists; the state of qa, stage and prod is UNVERIFIED (U-06) |
| Timing | Before real data |
| Disposition | ADD |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | M |

**Evidence**: `db/tooling/migrate.ts:21` sets `MIGRATE_ALLOWED_ENVS = ["dev","qa","stage"]`; `assertDestructiveAllowed` refuses `prod` always. `drizzle.config.ts:15` refuses prod. `database.md:372` step 6 says the production process "is not yet defined (undecided)"; `boilerplate-gap-report.md:17` says the same. `ci.yml` runs only `pnpm validate`; the Vercel build is `next build` with no migrate step (`apps/web/package.json:7`); `claude.yml` holds a dev URL only. Vercel Production has no `DATABASE_URL`, `DATABASE_ENV` or `APP_ENV` (UI-RELAY), so today the production app cannot reach any database (the server env validation would reject it on first use).

**Observation**: The guard is strong at refusing the wrong thing and silent about the right thing. The first production schema will be applied by an undefined human act, with no pre-check, no recorded verification and no rollback beyond a 6-hour restore (F-DATA-002). Because Drizzle is forward-only (`database.md:376`), a bad production migration is fixed forward or by restore.

**Consequence**: The first real-data release forces an improvised production migration under time pressure, with a stale code/schema pairing risk (Vercel rollback restores old code against a newer schema, see REL).

**Recommendation**: Before the first product table, write a short production procedure and put its checks in a script, not prose: (1) confirm a restore point or dump exists, (2) `db:migrate:verify` on stage equals the same journal, (3) apply with a prod-allowing runner that requires an explicit second flag and an interactive confirmation of the logical environment, run only from the owner's machine with a short-lived credential (F-DATA-005), (4) record status and verify afterwards. Require expand/contract for anything a deployed client or the previous Vercel deployment still reads. Keep the local guard as it is.

**Alternatives and tradeoffs**: (a) Apply migrations in the Vercel build: removes the human but puts a write credential in the build and makes a failed migration a failed deploy. Not recommended before roles exist. (b) A GitHub Actions job with an environment approval: needs a prod credential in Actions, which `environment.md:73` forbids on purpose. (c) Keep manual: cheapest, acceptable for a team of one if the script and checklist exist.

**Affects**: `db/tooling`, `scripts/db-migrate.ts`, `docs/database.md` 12.3, `docs/deployment.md`; inherited by generated apps (Foundational).

**Depends on / sequencing**: F-DATA-002 (restore point), F-DATA-005 (roles), REL (release sequencing).

**Verification**: A documented dry run on stage with recorded output; the script refuses without the second flag and on a mismatched environment; `database.md` 12.3 step 6 no longer says "undefined".

**Decisions needed**: none from Rich.

**Challenge log**: (Pass 4)

**History**: 2026-10-07 created (Pass 2). Maps P-78-M06, P-GAP-04, P-CH-08 (procedure part).

---

### F-DATA-002 Recovery margin is a 6-hour window, no snapshot, an unprotected root branch, and no restore has been exercised

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Medium (High once real data exists) |
| Confidence | Medium (window and plan are UI-RELAY; "never exercised" is the docs' statement, `database.md:380`) |
| Timing | Before real data |
| Disposition | ADD |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S |

**Evidence**: Neon Free; 6 hour history; no snapshots and no schedule; `production` "Not protected"; never expires (`external-state.md`, UI-RELAY). One team owner (U-17). `database.md:380`: "Restore procedures themselves are not yet documented/exercised." Whether `production` holds real data is not shown (U-07); the documented migration state suggests it holds none.

**Observation**: Recovery from a mistake noticed after 6 hours is not possible from Neon alone. Deleting or resetting the root branch from the console is one click by the only owner. Nothing here is a defect while there is no data; it becomes one at the first real row, because the premise "backups protect data" (`database.md:380`) rests on a window shorter than a working day.

**Consequence**: A bad migration or bulk write on a Friday evening is unrecoverable by Monday.

**Recommendation**: (1) Exercise one restore now on a throwaway child branch and record the steps and time (cheap, no spend). (2) Before the first real data, add a compensating practice: a logical dump (`pg_dump`) to storage the owner controls, run before every production migration and on a schedule, with one recorded restore of a dump. (3) Whether to pay for a longer window or snapshot schedules is a **spend decision for Rich**, to be raised only when real data is imminent; this finding does not require it. (4) Enable branch protection if the plan allows it (plan availability UNVERIFIED).

**Alternatives and tradeoffs**: Upgrade plan: removes most of the gap for a recurring cost. Dump only: free but manual and as good as the habit. Do nothing until real data: acceptable only with a hard trigger written down (the first migration that creates a user-owned table).

**Affects**: `docs/database.md` (restore section), OPS runbook; inherited by generated apps as a template checklist item (platform-specific).

**Depends on / sequencing**: F-DATA-001; OPS (incident and DR). U-17 (second owner).

**Verification**: A restore record (date, source point, duration, result) exists; a dump restores cleanly into an empty branch; the trigger is written in `database.md`.

**Decisions needed**: Possibly a spend decision (plan upgrade) later; not now.

**Challenge log**: (Pass 4)

**History**: 2026-10-07 created (Pass 2). Maps P-78-M05, P-CH-08 (restore part), P-CH-30 (partly). Pure plan limits are not treated as defects of the stack.

---

### F-DATA-003 CI never applies migrations or checks drift, and the migration tooling can only run against Neon over HTTP

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Medium |
| Confidence | Medium (READ for CI and drivers; the driver constraint is INFER from `neon()`/`neon-http` use, not RUN) |
| Timing | Now |
| Disposition | ADD |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | M |

**Evidence**: `ci.yml` runs `pnpm validate` only (`lint`, `typecheck`, `test:run`, `test:boilerplate`, `build`). `test:run` runs unit tests with fakes (`db.test.ts`, `migrate.test.ts`, `tooling.test.ts`). `db:check` is dev-only (`scripts/db-check.ts:16`), `db:migrate:verify` needs a real Neon URL, and `test:integration` needs one too (`proof-items.integration.test.ts:15-23`); none runs in CI. `db/tooling/executor.ts` uses `@neondatabase/serverless` `neon()` (HTTP) and the migrator is `drizzle-orm/neon-http/migrator`; no plain Postgres driver exists in the repo.

**Observation**: Nothing in CI proves that the committed SQL applies from an empty database, or that `db/schema.ts` and the committed migrations agree (no `drizzle-kit generate` no-diff check). A schema edit without a generated migration, or a migration that fails on an empty database, passes `validate`. Parallel agent PRs (F-DEVOS-009) make the first likelier. Also, `computeStatus` treats any journal entry with `when` at or below the latest applied row as applied (`migrate.ts:94-98`, mirroring the Drizzle migrator), so a migration generated on a branch earlier than one already applied would be skipped silently and still show as applied in `verify`. Git usually forces a conflict in `_journal.json`, but resolving it by keeping both entries leaves the order wrong (INFER, not reproduced).

**Consequence**: A broken or skipped migration is first discovered by a human running a command, or by a Preview failing, rather than by the PR that introduced it.

**Recommendation**: Add a CI job, no secrets needed: start an ephemeral Postgres (service container), apply the committed SQL from zero, then run `drizzle-kit generate` and require no diff; also assert `when` is strictly increasing and the journal matches the SQL files. Because the tooling is welded to Neon over HTTP, choose one of: (a) a small CI-only script using Drizzle's node-postgres migrator against the container (adds a dev dependency, keeps production tooling unchanged); (b) a Neon HTTP proxy container (no new driver, more moving parts); (c) an ephemeral Neon branch per CI run (real engine and extensions, but needs an API key secret and Rich's account action). Recommendation: (a) for the migration and drift check now; reconsider (c) when extensions (F-DATA-008) make engine fidelity matter. Integration tests stay out of CI until one of these exists.

**Alternatives and tradeoffs**: Do nothing: cheapest, but leaves the one control CLAUDE.md section 13 names ("a reliable way to apply migrations") unproven at the PR gate. Option (a) uses plain Postgres 16 or 17 unless a PostgreSQL 18 image is available (Neon runs 18, UI-RELAY), a small fidelity gap to record.

**Affects**: `.github/workflows/ci.yml` (human-applied), `apps/web/scripts`, `docs/testing.md`; inherited by generated apps.

**Depends on / sequencing**: F-DEVOS-002 (CI authority), Q-002 (green baseline). TEST subject.

**Verification**: A PR that edits `schema.ts` without a migration fails the new job with the drift message; a PR with a broken SQL file fails; a compliant PR passes.

**Decisions needed**: none from Rich (option (c) would need an account action).

**Challenge log**: (Pass 4)

**History**: 2026-10-07 created (Pass 2). Narrows the fact-pass statement that `db:check`/`db:migrate:verify` are merely "omitted from CI": they cannot run in CI as written without a Neon credential. Maps P-CH-08 (verification part). F-DEVOS-007's deferral of migration gates is now partly contradicted for this check (see its challenge log in Pass 4).

---

### F-DATA-004 The destructive-tooling guard trusts a label that nothing verifies against the database it is aimed at

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Medium |
| Confidence | High (READ) |
| Timing | Before real data |
| Disposition | ADD |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S |

**Evidence**: `db/tooling/guard.ts:20-26` and `migrate.ts:25-31`: safety comes only from `DATABASE_ENV` plus a matching `--env` flag; "Safety is never inferred from `DATABASE_URL`" (`database.md` section 2, by design). `reset.ts` truncates every base table in `public` with `CASCADE`. `deployment.md:73` records the limit: a CI job or developer machine configured with prod values is refused only by the label, and "keep prod credentials off developer machines".

**Observation**: The label can be wrong in the dangerous direction: a production URL pasted into `.env.local` with `DATABASE_ENV=dev` and `--env=dev` passes every check and `db:reset` truncates production. The design rejects hostname inference for good reasons (names change, as the `production` branch shows). The missing piece is a fact stored in the database itself.

**Consequence**: One copy-paste error removes real data, recoverable only inside the 6-hour window (F-DATA-002).

**Recommendation**: Give each database an environment fingerprint, written once at provisioning by a migration or tooling step (a one-row table or a database-level setting holding `dev|qa|stage|prod`). Make every connecting tool read it first and refuse when it differs from `DATABASE_ENV`; refuse when it is absent for reset and seed. This keeps "never infer from the URL" and adds a data-side check. Add a test with a fake executor.

**Alternatives and tradeoffs**: Rely on credential hygiene only (current): free and fragile. Separate Neon projects per environment, so prod credentials never share a project with dev: stronger isolation, more accounts to run, and see F-DATA-006. Fingerprint plus roles (F-DATA-005) together make reset impossible for a runtime role.

**Affects**: `db/tooling/*`, a new migration, `docs/database.md` section 2; inherited by generated apps (a template feature: the init step stamps the environment).

**Depends on / sequencing**: Ships with the first product migration or before real data, whichever first.

**Verification**: With a fake executor returning a mismatched fingerprint every guarded operation throws; on a database lacking one, reset and seed refuse.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-07 created (Pass 2). Maps P-CH-29 (database part) and the label/branch-name question.

---

### F-DATA-005 No evidence of role separation: one credential per branch is the whole access boundary

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Medium |
| Confidence | Low (the state is UNVERIFIED: U-05, U-09, U-15; the docs say "recommended, not configured") |
| Timing | Before real data |
| Disposition | ADD |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S |

**Evidence**: `security.md` and `database.md` state least-privilege roles are recommended and not configured (C-16). The Neon branch has no IP restriction (UI-RELAY), so any holder of a valid credential can connect from anywhere. The same `DATABASE_URL` shape is used by the app, by `db:migrate`, by reset/seed, and by `claude.yml` (dev, job-level, F-SEC-002). `docs/customization-map.md:41` says "one role per branch", which does not equal one role per duty.

**Observation**: If one owner-level role serves every purpose, the application runtime can drop tables, and any leaked runtime credential reaches DDL. This cannot be confirmed without a role list, so confidence is Low and severity is conditional.

**Consequence**: A leaked or misused runtime credential (Vercel env, agent job) has full DDL and data power on its branch.

**Recommendation**: Read the role list per branch (name and privileges only). Then define two roles per environment: a migration/owner role used only by the migration tool, and a runtime role limited to DML on application tables, with no DDL. Preview and Development use the runtime role of `qa` and `dev` respectively. Do this at the same time as the first product schema. Rotation procedure belongs to F-SEC-007.

**Alternatives and tradeoffs**: A single role per branch is acceptable while branches hold only synthetic data; the finding is timed for real data. Neon-managed roles keep this inside the console, no new service.

**Affects**: Neon roles, Vercel env vars, `claude.yml` secret, `docs/database.md`; inherited by generated apps as a setup step.

**Depends on / sequencing**: Needs the Neon role list (operator, no secret); F-SEC-002 and F-SEC-007.

**Verification**: A runtime-role connection cannot `CREATE TABLE` or `TRUNCATE` (a one-line check script run once and recorded); migrations succeed with the migration role.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-07 created (Pass 2). Maps P-78-M15, P-SEC-07, P-CH-29 (part). Carries U-05, U-09, U-15 from SEC.

---

### F-DATA-006 The branch topology makes `production` the parent of dev, qa and stage

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | Medium (topology is UI-RELAY; behaviour of branch reset from parent is the docs' own warning, `database.md` section 13) |
| Timing | Before real data |
| Disposition | IMPROVE |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S |

**Evidence**: Neon branches: `dev`, `qa`, `stage` each have `production` as parent (UI-RELAY). `database.md` section 13 shows the same tree and warns that resetting a child from its parent can replace data. `database.md` 12.1: "Data is never promoted."

**Observation**: A Neon child is created from its parent's data. While `production` is empty this is harmless. Once it holds real users, any creation of a new child, or a console "reset from parent" on `qa`, copies production data into a lower environment, including the one Preview deployments use. The policy "no data is copied" is then a practice, not a property of the topology.

**Consequence**: Real user data appears in `qa` or `dev`, where credentials and access are looser.

**Recommendation**: Before real data, either (a) record a rule that children are never created or reset from `production` after it holds data and prefer creating them from an empty baseline, or (b) place production in its own Neon project so that no lower environment descends from it. Decide at the same time as F-DATA-004's isolation question. No action while `production` is empty.

**Alternatives and tradeoffs**: Separate project: strongest isolation, one more project to run, plan limits UNVERIFIED. Rule only: free, depends on discipline.

**Affects**: Neon project layout, `docs/database.md` section 13, `new-app-setup.md`.

**Depends on / sequencing**: U-07 (is there real data), F-DATA-004.

**Verification**: The chosen rule is in `database.md`; or the lower branches have no production ancestor.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-07 created (Pass 2). Maps P-CH-30 (part).

---

### F-DATA-007 `db:reset` truncates every table in `public`, which will include extension-owned tables

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | Medium (READ for `reset.ts`; that PostGIS creates `spatial_ref_sys` in `public` is INFER from recall, UNVERIFIED) |
| Timing | Trigger: first extension (for example PostGIS) is installed |
| Disposition | IMPROVE |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S |

**Evidence**: `db/tooling/reset.ts:5,19-25` selects every base table in schema `public` and truncates them with `RESTART IDENTITY CASCADE`. `postgis` and `pg_trgm` are not installed on `production` (owner-run SQL). Reference data tables are a general case: any seed-owned lookup table is also cleared.

**Observation**: PostGIS ships a reference table of coordinate systems in `public`; truncating it breaks spatial functions until it is restored. The reset also cannot distinguish application tables from reference or extension tables.

**Consequence**: The first spatial feature's `db:reset` leaves dev or qa with a working schema and a broken spatial layer.

**Recommendation**: When the first extension is added, make reset iterate an explicit allow-list or a naming convention of application tables (or skip tables owned by extensions), and add a test with a fake executor that includes an extension-owned table.

**Alternatives and tradeoffs**: Install extensions into their own schema (`CREATE EXTENSION ... SCHEMA`), which `reset.ts` already ignores; simplest, and keeps `public` for application tables.

**Affects**: `db/tooling/reset.ts`, `db/tooling/tooling.test.ts`.

**Depends on / sequencing**: F-DATA-008.

**Verification**: The test asserts an extension-owned table is not truncated.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-07 created (Pass 2).

---

### F-DATA-008 The spatial and search data model is undecided, and extension availability is unverified

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | High that the decision is open; extension availability UNVERIFIED |
| Timing | Trigger: before the first event or location table |
| Disposition | DEFER |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | M |

**Evidence**: `db/schema.ts` holds only `migration_proof` and `proof_item`; there is no event, location or church table. `postgis` and `pg_trgm` are not installed on `production` (owner-run SQL); availability is unknown (`pg_available_extensions` not yet read). The Phase 1 plan needs radius and date search with filters. Next.js route handlers and the shared client are the only consumers (fact pass).

**Observation**: The choice among PostGIS, plain latitude/longitude with `cube`/`earthdistance`, or an external geo service affects schema, indexes, the API contract returned to three clients, location privacy (coarsening, retention) and the migration process (F-DATA-003 needs the same engine). It must be decided with the first event table, not retrofitted.

**Consequence**: A table designed on one assumption and migrated to another after real data exists.

**Recommendation**: Before the first event table, read `pg_available_extensions` for `postgis`, `pg_trgm`, `cube`, `earthdistance`, then record a short decision with a distance-query example, the index, the contract shape (distance in the response, never raw owner coordinates beyond what the plan requires), and install the extension through a Drizzle migration on every branch (never by hand). Keep this decision with ARCH/REQ.

**Alternatives and tradeoffs**: Plain lat/long: portable, no extension, worse at scale and for polygons. PostGIS: standard, richer, ties the template to an extension and to F-DATA-007.

**Affects**: future `schema.ts`, API contracts; boilerplate: trigger-gated, not in every app.

**Depends on / sequencing**: Neon read-only query (operator); REQ for the Phase 1 scope.

**Verification**: A recorded decision names the approach, the index and the migration that creates it.

**Decisions needed**: none now; location-privacy policy is a product choice for Rich when the feature is specified.

**Challenge log**: (Pass 4)

**History**: 2026-10-07 created (Pass 2). Maps the relevance-round "spatial approach stays open" note.

---

### F-DATA-009 No data-lifecycle rules exist: retention, deletion, export, vendor exit, corruption detection

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | High (READ) that none exist |
| Timing | Trigger: first table holding user-owned real data |
| Disposition | DEFER |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | M |

**Evidence**: `proof_item.owner_id` is a Clerk user id text column with no foreign key and no deletion hook; no Clerk webhook handler exists (fact pass). No retention, export or delete rule appears in `database.md`. The only integrity detection is database constraints (unique, not null) and the error mapping in `db/errors.ts`. No checksum, reconciliation or consistency job exists.

**Observation**: The proof slice needs none of this. Real user data (accounts, locations, invites) will need a deletion path that crosses Clerk and Neon, an export path, and a record of what leaves with the vendor if Neon or Clerk is replaced. Silent corruption is mostly prevented by constraints and tested ownership; there is no independent check.

**Consequence**: Deletion requests or a vendor change become urgent, unplanned projects.

**Recommendation**: At the first user-owned table, add: a stated retention and deletion rule per table, a deletion path triggered by Clerk's user-deleted event (idempotent, signature-verified; see AUTH), a documented export (the logical dump of F-DATA-002 serves as the vendor-exit export), and database-level constraints for every invariant the service enforces. Privacy and age policy is a product choice for Rich; the technical mechanism is mine.

**Alternatives and tradeoffs**: Do it now: effort without a table to apply it to. Rely on Clerk cascade: not available across vendors.

**Affects**: future migrations, AUTH webhooks, `docs/database.md`.

**Depends on / sequencing**: AUTH (Clerk events); F-DATA-002 (dump).

**Verification**: Each new user-owned table has a retention note and a deletion test.

**Decisions needed**: Rich: privacy, retention periods and age policy, when the first user-owned feature is specified.

**Challenge log**: (Pass 4)

**History**: 2026-10-07 created (Pass 2). Maps P-CH-28, P-CH-30, and the Neon half of P-78-M10.

---

### F-DATA-010 The data layer foundations are sound

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Info |
| Confidence | High (READ; not RUN) |
| Timing | n/a |
| Disposition | KEEP |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | n/a |

**Evidence**: Migrations are generated, committed with snapshots, forward-only and journal-checked; the runner refuses unknown history and never uses `push` (no script exposes it, a test enforces it, C-31, C-34). Guards are fail-closed, require explicit `--env`, refuse Vercel, and refuse prod and stage for reset/seed (`guard.ts`, `migrate.ts`). Errors are categorized and sanitized (`errors.ts`). Writes with atomic needs use `db.batch` through an injectable `AtomicRunner` (`atomic.ts`); the transaction question in P-78-M12 and P-GAP-06 is therefore **resolved** for current needs. Schema: identity keys, `uuid` default, `timestamptz` with default, `NOT NULL`, composite unique on owner and label; owner-scoped delete in the repository. Client contracts do not expose rows.

**Observation**: This is a coherent, tested base and should not be rebuilt. One limit to record: `neon-http` supports no interactive transactions, so read-then-write logic must be a single statement or a batch; the first feature needing a locked read-modify-write is the trigger to revisit the driver (INFER from `db.test.ts` and the docs).

**Recommendation**: Keep. Carry the limit above into the first feature that needs it.

**Verification**: n/a (retained as evidence).

**History**: 2026-10-07 created (Pass 2). Closes P-78-M12 and P-GAP-06.

---

### F-DATA-011 The root branch name `production` is documented and nothing depends on it

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Info |
| Confidence | High (READ, repository-wide search) |
| Timing | n/a |
| Disposition | KEEP |
| Scope | SIGNAL-ONE |
| Trigger class | Foundational |
| Effort | n/a |

**Evidence**: See "Answer to the `prod` versus `production` question" above.

**Observation**: The logical environment is `prod`; the Neon branch is `production`; the mapping is stated in `database.md:73` and `architecture-rules.md:962`. No script reads the branch name. Renaming the branch would require no code change.

**Recommendation**: Keep. Do not rename for tidiness. Leave the template wording ("create a branch `prod`") unless a new project's naming matters; the mapping note already covers the difference.

**History**: 2026-10-07 created (Pass 2). Corrects the 2026-10-07 `external-state.md` reading of this as doc drift.

---

## Reconciliation of prior inputs (DATA)

| Input | Outcome |
| --- | --- |
| P-78-M05 restore drill | Adopted, modified → F-DATA-002 (plus a dump, free) |
| P-78-M06, P-GAP-04 production migration procedure | Adopted → F-DATA-001 |
| P-78-M12, P-GAP-06 transaction decision | Resolved → F-DATA-010 (`AtomicRunner`, `db.batch`; limit recorded) |
| P-78-M15, P-SEC-07 least-privilege roles | Adopted, with Low confidence until roles are read → F-DATA-005 |
| P-CH-08 migrations, backup, tested restore | Adopted → F-DATA-001, -002, -003 |
| P-CH-09 idempotency and concurrency (DATA part) | Examined: migrations idempotent; unique constraints and owner-scoped delete present; locked read-modify-write not available (F-DATA-010); the rest stays with ARCH |
| P-CH-28 silent corruption detection | Deferred → F-DATA-009 (constraints are the only detection today) |
| P-CH-29 blast-radius containment (database part) | → F-DATA-004, -005 |
| P-CH-30 vendor exit and data portability | Deferred → F-DATA-009; dump in F-DATA-002 |
| Fact pass 2026-10-07: "`db:check`, `db:migrate:verify` omitted from CI" | Narrowed → F-DATA-003: they cannot run in CI without a Neon credential |
| `external-state.md` 2026-10-07: `prod` versus `production` as doc drift | Corrected → F-DATA-011 |

Challenges to prior work: **F-DEVOS-007** deferred risk-based gates for migrations until the first product migration; F-DATA-003 argues the drift and from-zero checks are cheap enough to do now and need no gate, only a CI job (Pass 4 to settle). **Phase 0 fact on `prod`**: answered, not drift. No Fable finding was upgraded to High here; the severity driver is the absence of real data.

## Lens matrix

| Lens | Result |
| --- | --- |
| L1 Drift | F-DATA-011 (the name is documented, correction of an earlier reading). `new-app-setup.md:39` is template wording, not drift. `database.md` sections 12.2/12.3 match the code (C-31, C-34, C-36). |
| L2 Enforcement | F-DATA-003 (CI proves none of the migration rules), F-DATA-004 (label guard unverifiable), F-DATA-010 (guards and tests that do bite). |
| L3 Adversary | F-DATA-005 (credential scope), F-DATA-004 (a mistaken or malicious label), F-SEC-002 (agent holds a dev URL). |
| L4 Failure and recovery | F-DATA-001, F-DATA-002, F-DATA-006. |
| L5 Scale and cost | Examined, nothing material at the proof scale (unbounded `listByOwner` is proof-only; Free plan limits UNVERIFIED and not relied on). Plan upgrade is a spend item raised only if F-DATA-002 requires it. |
| L6 Longevity | F-DATA-009 (deletion, export, vendor exit), F-DATA-002 (single owner). |
| L7 Compatibility | F-DATA-001 (expand/contract against old deployments and installed clients), F-DATA-008 (contract shape for three clients). Mobile has no direct data access by design (C-02). |
| L8 Simplicity | F-DATA-010 (do not rebuild); F-DATA-003 prefers the smallest CI mechanism; separate projects or paid tiers are not recommended now. |
| L9 Boilerplate fit | F-DATA-001, -003, -004 are inherited by every generated app; F-DATA-002, -006 are platform checklist items; F-DATA-007, -008 are trigger-gated (extensions are not in every app). |

## Carry-forward to other subjects

* **AUTH**: Clerk user-deleted handling and webhook idempotency (F-DATA-009); mobile bearer-token path does not touch the database directly (C-02).
* **REL**: stale-code/new-schema pairing on Vercel rollback; production migration sequencing inside a release (F-DATA-001); Production has no database variables, so release readiness is unmet (inference).
* **OPS**: restore drill and dump schedule, second owner, runbook (F-DATA-002); branch deletion protection.
* **BOIL**: fingerprint step in `init:app` (F-DATA-004); extension and reset behavior as trigger-gated (F-DATA-007, -008); template wording on branch naming.
* **TEST**: CI migration job and integration tests that need a database (F-DATA-003).
* **SEC**: roles and credential rotation (F-DATA-005, F-SEC-007); `claude.yml` dev URL scope (F-SEC-002).
* **ARCH/REQ**: spatial and search model, location privacy (F-DATA-008).
* **Platform facts still needed (names or yes/no only)**: role list per branch (U-05, U-09), whether Preview's `DATABASE_URL` is the `qa` role (U-02), migration state of qa/stage/prod (U-06), whether `production` holds real data (U-07), `pg_available_extensions` rows for `postgis`, `pg_trgm`, `cube`, `earthdistance`.
