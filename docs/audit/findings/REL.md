# REL: Delivery and Release

Examined 2026-10-08 (Pass 2) at `main` `826b53e`. The recorded baseline is `31ec6ba`; `main` has moved by six commits, none touching a REL-owning file except `scripts/boilerplate/manifest.mjs` and `docs/security.md` (both outside the deployment path). Depth: Deep. Home for: CI/CD; environments and promotion; Vercel configuration; migrations in the release sequence; rollback and progressive delivery; configuration validation at deploy time; mobile release, signing, store, OTA and minimum-version policy (`methodology.md` section 4).

## Method note

Evidence was gathered before the prior-input rows for REL were re-read. Read in full: `.github/workflows/ci.yml`; `docs/deployment.md` (all sections), `docs/environment.md`, `docs/mobile.md` release parts; `apps/web/next.config.ts`; `apps/mobile/eas.json` and `app.config.ts`; root and web `package.json` for `engines` and `packageManager`. Read through the Vercel MCP server (read tools only, 2026-10-08): the project record (framework, Node version, domains, deployment protection mode), the latest Production deployment (source, target, region, build timing), the five most recent deployments (state, target, commit), and the environment variable **names and targets** (no value decrypted). Run (RUN, read-only, own Production site): unauthenticated requests already recorded in AUTH.

Facts established (CONSOLE through the Vercel API):

* A merge to `main` deploys Production automatically from the Git integration (**answers U-01**): the Production deployment for the merge of PR #86 (commit `97dd927`) was created within seconds of the merge, `source: git`, `target: production`, built in about 38 seconds, state READY. Docs-only merges deploy Production too.
* The project runs Node `24.x`; Production functions run in region `iad1` (US East, Washington DC).
* Deployment protection is Vercel Authentication in the "all except custom domains" mode: Previews are behind it; the Production `*.vercel.app` domain is public (an unauthenticated request returns 200). **Answers U-21**: Production is public and serves the application; there is no custom domain (U-20).
* Environment variable names by target (values not read): **Preview** has `DATABASE_URL`, `DATABASE_ENV`, `APP_ENV`, and the two Clerk keys; **Development** has the two Clerk keys; **Production** has only the two Clerk keys (no `DATABASE_URL`, `DATABASE_ENV`, `APP_ENV`).
* Production deployments are marked as rollback candidates; Previews are not.

Not examined, and why: the value of the Preview `APP_ENV` and `DATABASE_ENV` (U-02; they are marked non-sensitive configuration but were not decrypted without the owner's say-so); the Vercel plan tier (not exposed by the API calls used); function and build logs (not needed for the claims); EAS and the mobile build (no EAS project exists). No file was changed outside `docs/audit/`.

## Findings

### F-REL-001 A release is only a merge: Production is deployed without its configuration, and nothing verifies a deployment or documents rollback

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Medium |
| Confidence | Medium (the missing variables are CONSOLE; the failure at first request is READ and INFER, no authenticated Production request was made) |
| Timing | Before first real users |
| Disposition | ADD |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S to M |

**Evidence**: `docs/deployment.md` section 2 states that environment validation is lazy, so "a misconfigured environment is not caught at build time; it fails on the first server request", and tells the reader to "check a Preview after deploying" (READ). Production currently has Clerk keys and **no** `DATABASE_ENV`, `APP_ENV` or `DATABASE_URL` (CONSOLE), yet the deployment is READY and public. Section 7 lists "post-deploy smoke checks" and "preview-environment configuration checks" as Planned, not built. No rollback procedure is written down; the platform offers Instant Rollback and marks Production deployments as candidates, but there is no runbook and no pairing with the database state (F-DATA-001, F-DATA-002). `ci.yml` validates the code; nothing validates a deployment.

**Observation**: Lazy validation is a sound choice for builds (CI builds with no secrets). Its price is that a deployment can be green and wrong. Production is a live example: it serves the site and the public API, and every route that needs the database or the server environment will fail on first use. That is harmless today because nothing real runs there; it is the same shape of failure that will occur on the first real release.

**Consequence**: The first real release goes out green and broken, discovered by a user. Rollback is improvised under pressure, and rolling back code without the matching database state (expand/contract) can break more than it fixes.

**Recommendation**: (1) Add a deployment health route that is the smallest possible proof of configuration: it calls `getServerEnv()` and a read-only database ping, returns only ok or not-ok (no detail), and is the single target of the smoke check (P-78-M09, P-CH-23). (2) Run it after every deployment from a workflow on the `deployment_status` event, or as a required Vercel check, and treat a failure as a failed release. (3) Optionally call `getServerEnv()` once at server start through Next's instrumentation hook, so a misconfigured deployment reports unhealthy immediately instead of on first request; do not run it at build. (4) Write a one-page release and rollback runbook in `docs/deployment.md`: how to roll back in Vercel, what to check in the database first, and when a forward fix is better. (5) Until the first real release, leave Production as is; nothing needs fixing there now.

**Alternatives and tradeoffs**: Validate at build (rejected: forces secrets into CI and Previews, the thing lazy validation avoids). Do nothing and rely on "check a Preview" (the current prose control; it depends on a person remembering and Production differs from Preview). A hosted uptime service (premature; revisit with OPS).

**Affects**: a new health route, a small workflow (a human edit, workflow files are protected), `docs/deployment.md`, `docs/api.md`.

**Depends on / sequencing**: F-DATA-001 (migration order in a release); F-SEC-002 (workflow edit window); OPS for alerting.

**Verification**: A deployment with a deliberately missing `DATABASE_URL` is reported failed by the check within minutes, and a correct one passes; the runbook is followed once on a Preview rollback.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created. Absorbs P-78-M09, P-CH-23, and the rollback part of P-CH-18; supersedes the "check a Preview" sentence as the only control.

---

### F-REL-002 Every merge redeploys Production and Stage is not provisioned; adopt manual promotion at the trigger, not a Stage project

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | High for the facts; the recommendation is a design choice |
| Timing | Trigger: before the first real users |
| Disposition | DEFER |
| Scope | WEB |
| Trigger class | Trigger-gated |
| Effort | S |

**Evidence**: U-01 answered: a merge to `main` deploys Production immediately, docs-only merges included (CONSOLE). `docs/deployment.md` sections 4 and 6 describe Stage as the final pre-production environment and state that Stage is "not provisioned" and its hosting mechanism is undecided (P-GAP-03); the promotion flow lists "Stage verification (planned)" and calls the missing gate "a known gap". The `Protect main` ruleset now stops a red or unreviewed-by-CI merge (F-SEC-001).

**Observation**: A separate Stage project, domain and Neon branch is a large amount of machinery for a one-owner product with no users, and it would not by itself add a gate: Stage only helps if something decides whether to promote. The gate a small team needs is a deliberate step between "merged" and "live", which Vercel provides without a second project.

**Consequence**: Today none (there are no users). At launch an accidental or half-finished merge goes live in under a minute, with only Instant Rollback as the remedy.

**Recommendation**: Do not build Stage now (P-78-O07 agreed). At the trigger, turn off automatic assignment of the Production domain so each merge produces a production-ready deployment that is not live, and promote it by hand after the F-REL-001 smoke check passes on its own URL. That is the "verify the candidate, then promote" flow in `deployment.md` section 6 with one setting and no new infrastructure. Revisit a true Stage environment only if the product gains a second environment's worth of data (a staging copy of production data) or a team. Until the trigger, optionally skip Production builds for docs-only changes with Vercel's ignored-build-step setting.

**Alternatives and tradeoffs**: A Stage Vercel project with its own Neon branch (heavier; the `VERCEL_ENV` guard would need extending, `deployment.md` section 4). Keep auto-deploy and rely on rollback (cheapest; acceptable only before launch).

**Affects**: Vercel project settings (owner action), `docs/deployment.md`.

**Depends on / sequencing**: F-REL-001 (the check that gates promotion); F-SEC-001 (the ruleset).

**Verification**: At the trigger, a merge creates a non-live production deployment and the live site is unchanged until promotion.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created. Absorbs P-GAP-03, P-78-T03, P-78-O07, P-CH-18 (promotion part); answers U-01.

---

### F-REL-003 Node and pnpm versions differ between CI, Vercel and the developer machine, and are pinned in several places

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | High |
| Timing | Now |
| Disposition | IMPROVE |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S |

**Evidence**: `ci.yml:30` sets Node `22`; the Vercel project runs `24.x` (CONSOLE); the developer machine ran Node `24.19.0` (RUN, 2026-10-07). Neither `package.json` declares `engines`, and no `.node-version` or `.nvmrc` exists (READ). pnpm is pinned by `packageManager` (`12.6.0`) in two `package.json` files and again by value in `ci.yml:25`.

**Observation**: What CI tests (Node 22) is not what Production runs (Node 24). Both are current and unlikely to differ in behaviour today, which is why this is Low. The pins are scattered, so the next upgrade will update some and miss others, and the first discrepancy will show up as a bug that only reproduces in one place. P-CH-22 (reproducible builds) was rejected earlier as a finding for this reason and is re-opened here only for this concrete mismatch.

**Consequence**: A Node-version-specific difference passes CI and fails in Production, or the reverse; a pnpm bump that misses `ci.yml` is silently overridden by the pinned value.

**Recommendation**: Choose one Node version (the one Vercel runs, 24, unless a dependency requires otherwise), declare it once in the root `package.json` `engines` and a `.node-version` file, make `ci.yml` read it (`node-version-file`) and let `corepack` take pnpm from `packageManager` only (remove the second pin in `ci.yml`). Set the Vercel Node setting to the same major. Workflow file edit: human.

**Alternatives and tradeoffs**: Leave as is (works today). A version manager in the repo (overkill).

**Affects**: root `package.json`, `.node-version`, `.github/workflows/ci.yml`, Vercel project setting.

**Depends on / sequencing**: Same workflow edit window as F-SEC-002 and F-DEVOS-002.

**Verification**: CI logs print the same Node major as the Vercel build log; changing `packageManager` alone changes the pnpm version CI uses.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created. Refines P-CH-22.

---

### F-REL-004 Production functions run in US East while the database is in US West

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | High for the locations; the latency cost is INFER (not measured) |
| Timing | Before real traffic |
| Disposition | IMPROVE |
| Scope | WEB |
| Trigger class | Foundational |
| Effort | S |

**Evidence**: The Production deployment's function region is `iad1`, US East (CONSOLE). The Neon project is AWS US West 2, Oregon (external-state, UI-RELAY). No `vercel.json` sets a region (`docs/deployment.md` section 2 forbids one without reason).

**Observation**: Every database call from a function crosses the continent, which is roughly 60 to 80 ms of round trip per query on typical paths (INFER; not measured). Services that make two or three sequential queries per request (count, then insert) add 150 to 250 ms of pure network time. The database driver is HTTP-based, which reduces connection overhead but not distance.

**Consequence**: Slower pages and API calls than necessary, worst on write paths, with no code to blame.

**Recommendation**: Set the function region to the closest Vercel region to Oregon (Portland, `pdx1`, or San Francisco, `sfo1`) in the project's Function Region setting (an owner action in the dashboard; no `vercel.json` is needed, which keeps `deployment.md`'s rule). Do it before measuring anything, then record a baseline timing for one database-backed route in OPS. Revisit if the database moves.

**Alternatives and tradeoffs**: Move the database to US East (Neon branches share a project region; migration effort for no gain). Leave it (fine for the mocks, wrong for real use).

**Affects**: Vercel project settings, `docs/deployment.md`.

**Depends on / sequencing**: None. Connect with OPS for the latency baseline.

**Verification**: A Production deployment reports `pdx1` or `sfo1`; a timed request to a database-backed route is faster than before.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created. Answers the "function-to-database region unknown" carry-forward from the Neon overview.

---

### F-REL-005 Mobile release is scaffold-only: placeholder store identifiers, no accounts, and no OTA or minimum-version policy

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | High |
| Timing | Trigger: the first internal or store build |
| Disposition | DEFER |
| Scope | MOBILE |
| Trigger class | Trigger-gated |
| Effort | M |

**Evidence**: `apps/mobile/app.config.ts` sets `name: "Signal One"`, `slug: "signalone"`, `scheme: "signalone"`, `version: "0.0.0"`, and `bundleIdentifier` and `package` both `com.example.signalone` (READ). `eas.json` defines four build profiles that set only `EXPO_PUBLIC_APP_ENV`; no EAS project is linked, no build has run, and no Apple or Google developer account is evidenced (U-13). `docs/deployment.md` section 8 says store submission, signing credentials and OTA update policy are undecided. The user-facing product name is "Signal One Sound", which `naming-conventions.md` says must not be shortened.

**Observation**: This is deliberate scaffolding and nothing is wrong yet. Three of its values are expensive to change later: the store identifiers (a published bundle identifier cannot be changed without creating a new app), the app name shown to users, and the URL scheme used for sign-in redirects (F-AUTH-005). The mobile release also needs a rule for how old an installed app may be before the API refuses it (the stale-client rule, ARCH/REL tie-break), since an installed app cannot be rolled back.

**Consequence**: Identifiers chosen casually at the first build become permanent. An API change shipped without a minimum-version rule can break installed apps that cannot be updated on demand.

**Recommendation**: At the trigger, decide the store identity once (Q-011), then: create the developer accounts, link the EAS project, set identifiers and the user-facing name from the one source (`app.config.ts`), choose signing management (EAS-managed credentials), and write the OTA rule (OTA only for JavaScript-only, backward-compatible changes; native changes need a store release) and the minimum supported API version with the response the API gives older apps. The API already carries `X-API-Version`.

**Alternatives and tradeoffs**: Decide now (no mobile feature exists; the choices would be revisited). Skip OTA (simpler, slower fixes).

**Affects**: `apps/mobile/app.config.ts`, `eas.json`, `docs/mobile.md`, `docs/deployment.md` section 8, `docs/api.md`.

**Depends on / sequencing**: Q-011; F-AUTH-005 (sign-in scheme); ARCH (API versioning for stale clients).

**Verification**: A first internal build installs on a device from the EAS project with the chosen identifiers; a test shows the API's response to an out-of-support version header.

**Decisions needed**: Q-011 (new).

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created. Absorbs P-78-T04 (REL part).

---

### F-REL-006 `docs/deployment.md` and `docs/environment.md` describe an environment that does not exist

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | High |
| Timing | Now |
| Disposition | IMPROVE |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S |

**Evidence**: Section 1's table says Production uses a Clerk **production** instance with `APP_ENV=prod`, `DATABASE_ENV=prod` and a prod `DATABASE_URL`; the owner has no production Clerk instance, no custom domain, and Production holds none of those variables (CONSOLE; AUTH). Section 7 lists a GitHub Actions validation workflow as "Planned, not built"; `ci.yml` exists (C-22). Section 10 says Vercel settings are not verified; they are now partly verified (U-01, U-20, U-21 answered). Section 6 point 4 says the Production deployment on merge is "current behavior" (now evidenced).

**Observation**: The document is the plan, mixed with the status, in the same table. Most of it is accurate as a plan; the status lines are what drift. The "Automated now / Manual / Planned" labels are good and are the right structure; they have simply not been maintained.

**Consequence**: A reader believes Production is configured and that no CI exists.

**Recommendation**: Add one table row of **actual** state per environment (instance type, variables present by name, domain) beside the planned one, update section 7 to say what `ci.yml` does, and replace section 10 with the date of the last read-back. Keep the plan. Fold the table maintenance into the F-REL-001 runbook edit.

**Alternatives and tradeoffs**: Split plan and status into two files (more files to drift, F-DEVOS-003). Leave (cheapest, wrong).

**Affects**: `docs/deployment.md`, `docs/environment.md`.

**Depends on / sequencing**: Same PR as F-REL-001 (runbook).

**Verification**: The environment table matches a fresh Vercel variable-name read.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created. Absorbs C-22, C-23 (now Proven), C-24.

---

### F-REL-007 The Vercel plan and its terms may not fit a commercial product (unverified)

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | Low (the plan tier was not read; the Hobby inference rests on "member invites are Pro-gated", UI-RELAY) |
| Timing | Trigger: before taking payment or public launch |
| Disposition | DEFER |
| Scope | WEB |
| Trigger class | Trigger-gated |
| Effort | S |

**Evidence**: The team page shows one member (the owner) and member invites gated behind Pro (external-state, UI-RELAY). The Vercel API calls used here do not return a plan tier. The product plan expects paid memberships (Q-010 item 4).

**Observation**: Vercel's free (Hobby) plan is for personal, non-commercial use under its terms, with lower limits (build minutes, bandwidth, function duration, team size, no second owner). A product that charges members, or a team that needs a second admin on the platform, belongs on a paid plan (INFER; read the current terms before launch).

**Consequence**: Either a terms issue at launch, or a plan upgrade as an unplanned spend. It also bears on U-17 (a second owner for emergency access) and U-18 (spend limits).

**Recommendation**: Confirm the plan tier and read the current terms; budget the upgrade as a launch item with the same decision as Neon's paid plan (F-DATA-002). No action before then.

**Alternatives and tradeoffs**: Another host (a large change for an unproven problem).

**Affects**: Vercel account, `docs/deployment.md`.

**Depends on / sequencing**: Spend is an owner decision; F-DATA-002 and F-SEC-007 share the same upgrade.

**Verification**: The plan tier and terms are recorded in `external-state.md` with a date.

**Decisions needed**: none now (spend at the trigger).

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created.

---

### F-REL-008 The environment guards, frozen installs, protected Previews and merge-only Production are sound

KEEP. Evidence: `parseServerEnv` refuses a prod and non-prod mismatch, `prod` on non-production Vercel deployments, a Preview that is not `qa`, and a live Clerk key outside prod, with 27 tests (C-10, C-19 proven); CI installs with `--frozen-lockfile` and validates with no secrets; Preview deployments are behind Vercel Authentication (F-SEC-011) and Production deploys only from merged `main` (CONSOLE), now behind a ruleset requiring the `Validate` check (F-SEC-001); Production deployments are rollback candidates; lazy validation keeps secrets out of builds. Why it is sound: the guards fail closed, are unit-tested, and do not depend on hostnames. Tripwire: a `vercel.json` added without a documented reason, an "All Environments" secret in Vercel, or a deployment path that bypasses the merge to `main`.

---

## Reconciliation of prior inputs (REL)

| Input | Outcome |
| --- | --- |
| P-78-M09 lazy env validation ships a broken environment green | Adopted, modified → F-REL-001 (health route and post-deploy check; optional startup validation; not at build) |
| P-CH-23 configuration validation | Adopted → F-REL-001 |
| P-78-T02, P-CH-18 progressive delivery and rollback | Rollback adopted → F-REL-001; promotion → F-REL-002; feature flags and staged rollout stay deferred (no cohort exists; trigger: first real cohort or risky release) |
| P-78-T03, P-GAP-03 real Stage environment | Deferred, modified → F-REL-002 (manual promotion first; no Stage project) |
| P-78-O07 four environments with unprovisioned Stage is more than needed | Agreed in part → F-REL-002: do not build Stage now; the logical environments stay |
| P-78-T04 mobile release engineering | REL part adopted → F-REL-005; API deprecation and stale-client rule stays with ARCH |
| P-CH-22 reproducible builds | Re-opened narrowly → F-REL-003 (Node and pnpm pins) |
| P-GAP-02 no CI job for integration or E2E | Not REL: routed to TEST |
| C-22, C-23, C-24 | C-22 → F-REL-006; C-23 now Proven (U-01 answered); C-24 stays UNVERIFIED (U-02) |

Challenges to prior work: **SEC's severity framing of F-SEC-001** assumed deploy-on-merge was UNVERIFIED; U-01 now shows it is true, which supports keeping F-SEC-001 at High until the ruleset is verified as the only path to `main` (Pass 4). **F-DEVOS-007 and the "Stage" reading in `deployment.md`**: Stage is not the missing control; a deliberate promotion step is (F-REL-002). No prior finding was rejected.

## Lens matrix

| Lens | Result |
| --- | --- |
| L1 Drift | F-REL-006 (environment table, "CI planned", verification section); C-22. |
| L2 Enforcement | F-REL-001 (deployment correctness is prose, "check a Preview"); F-REL-008 (guards that are machine-proven). |
| L3 Adversary | Examined, nothing material beyond SEC: the deployment path is the Git integration (F-SEC-001), Previews are protected, Production is public by design. |
| L4 Failure and recovery | F-REL-001 (detection, rollback runbook), F-REL-002 (promotion), F-DATA-001/-002 for the database half of a rollback. |
| L5 Scale and cost | F-REL-004 (latency), F-REL-007 (plan and terms). Vercel spend limits are UNVERIFIED (U-18, OPS). |
| L6 Longevity | F-REL-003 (version pins), F-REL-005 (store identity is permanent), F-REL-006 (status drift). |
| L7 Compatibility | F-REL-005 (installed mobile apps cannot be rolled back; minimum-version rule); web and API versioning is ARCH. |
| L8 Simplicity | F-REL-002 (promotion by setting, not a Stage project); F-REL-001 prefers one health route over a monitoring stack. |
| L9 Boilerplate fit | F-REL-001, -003, -006 are inherited by every generated app and belong in the template; F-REL-002, -005, -007 are trigger-gated; F-REL-004 is a platform checklist item. |

## Carry-forward to other subjects

* **OPS**: the health route as the alerting target; latency baseline after the region change (F-REL-004); Vercel spend limits (U-18); function and build log retention.
* **TEST**: post-deploy smoke test; integration and E2E in CI (P-GAP-02); a Node-version matrix is not needed once F-REL-003 lands.
* **SEC**: workflow edit window (F-SEC-002, F-DEVOS-002, F-REL-003, F-REL-001 share one human edit); U-01 and U-21 answers change F-SEC-001's evidence.
* **BOIL**: health route, Node pin and the environment status table belong in the template; Stage stays out.
* **AUTH**: Production runs a Clerk development instance with open sign-up (F-AUTH-005, F-AUTH-001); a real production domain is the prerequisite for a production instance.
* **ARCH**: the stale-mobile-client rule and API deprecation policy.
* **Platform facts still needed (names or yes/no only)**: Preview `APP_ENV` and `DATABASE_ENV` values (U-02; the owner may allow me to read these two non-sensitive values); Vercel plan tier; whether "Include source files outside the Root Directory" is on (builds succeed, so INFER yes).
