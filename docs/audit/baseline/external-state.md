# Baseline: External State and the UNVERIFIED Register (Pass 1)

What the audit could read about systems outside the repository, how, and when; then every item a human must verify, with the exact place to look. CONSOLE facts are dated 2026-10-06 unless stated. Nothing here is a finding.

## GitHub repository `richroberts222/signalonesound` (CONSOLE, via `gh api`)

| Item | Observed | Endpoint |
| --- | --- | --- |
| Visibility | **public** | `repos/<r>` |
| Default branch | `main` | `repos/<r>` |
| Branch protection on `main` | none (404 "Branch not protected"); **superseded 2026-10-07, see read-back below** | `repos/<r>/branches/main/protection` |
| Rulesets | none; **superseded 2026-10-07, see read-back below** | `repos/<r>/rulesets` |
| Merge methods allowed | merge commit, squash, rebase all enabled | `repos/<r>` |
| Auto-merge / delete branch on merge | both off | `repos/<r>` |
| Collaborators | richroberts222 (admin) only | `repos/<r>/collaborators` |
| Actions enabled / allowed actions | enabled; `allowed_actions: all` (any Marketplace or third-party action may run) | `repos/<r>/actions/permissions` |
| Default `GITHUB_TOKEN` workflow permissions | **write**; workflows may approve pull request reviews | `repos/<r>/actions/permissions/workflow` |
| Actions secrets (names only) | `CLAUDE_CODE_OAUTH_TOKEN`, `NEON_DEV_DATABASE_URL` | `repos/<r>/actions/secrets` |
| Environments | `Preview`, `Production` (created by the Vercel integration; no protection rules read) | `repos/<r>/environments` |
| Secret scanning / push protection | enabled / enabled; 0 open alerts | `repos/<r>`, `repos/<r>/secret-scanning/alerts` |
| Dependabot alerts / security updates | disabled / disabled | `repos/<r>` (403 "Dependabot alerts are disabled") |
| Code scanning (CodeQL) | no analysis | `repos/<r>/code-scanning/alerts` (404) |
| Tag protection for `signal-one-foundation-v1` | none (no rulesets) | as above |
| Workflow files | `ci.yml` (PR + push to main; `contents: read`; no secrets), `claude.yml` (`contents/pull-requests/issues/id-token: write`, `actions: read`; dev database URL at job level; `@claude` trigger on comments/issues/reviews), `claude-code-review.yml` (read permissions plus `id-token: write`; runs `/code-review --comment` on every PR) | READ |
| Installed GitHub Apps | not readable with the audit's token | `repos/<r>/installation` (401) |

### GitHub read-back after the ruleset (CONSOLE, via `gh api`, 2026-10-07)

Read with the owner's `gh` login (`repo` and `workflow` scopes; no `admin:repo_hook`, so webhooks were not read). Nothing was changed by these reads.

| Item | Observed | Effect on the table above |
| --- | --- | --- |
| Rulesets | one: `Protect main`, enforcement active, target the default branch, bypass list empty | Replaces "none". Created by the owner on 2026-10-07 after F-SEC-001. |
| Ruleset rules | deletion blocked; force-push (non-fast-forward) blocked; pull request required with **0** required approvals (merge, squash and rebase allowed); required status check `Validate` from GitHub Actions; "require branches up to date" **off** | Answers the required-check half of F-SEC-001. The up-to-date option of F-DEVOS-002 is deliberately off (open PRs are revalidated after each merge). |
| Tag `signal-one-foundation-v1` | unprotected (the ruleset targets the default branch only) | Row "Tag protection" still stands. |
| Fork pull request workflow approval | `first_time_contributors` | **Answers U-22.** Outside contributors who are not first-time can run workflows without approval; the stricter setting is "all outside contributors". |
| Default workflow permissions | `write`; workflows may approve pull request reviews | Unchanged (F-SEC-003). |
| Allowed actions / SHA pinning | all actions allowed; SHA pinning not required | Unchanged (F-SEC-003, F-SEC-004). |
| Merge methods | merge commit, squash and rebase all allowed; auto-merge off; delete branch on merge off | Unchanged. |
| Secret scanning / push protection | enabled / enabled; Dependabot security updates disabled; Dependabot alerts disabled | Unchanged. |
| Actions secrets (names) | `CLAUDE_CODE_OAUTH_TOKEN`, `NEON_DEV_DATABASE_URL` | Unchanged. |
| Collaborators | one: the owner (admin) | Unchanged. |
| Local tooling now available to the audit | `gh` (authenticated), Vercel MCP and CLI (read use), `pnpm` through user-directory Corepack shims | Closes the "access-blocked" status of Step 1 for GitHub. Neon and Clerk stay owner-relayed by design (`docs/security.md`: automation holds no production credentials). |

Clerk and production (RECOLLECTION plus RUN, 2026-10-07): the owner reports only a Development instance in the Clerk dashboard and no Production instance. The deployed Production site embeds a test-mode publishable key (HTTP read of the page, key type only; no key value recorded). Together with the single `*.vercel.app` Production domain (U-20), this partly answers U-10: **no Clerk production instance is evidenced, and Production runs test-mode keys.** The owner states real production is far off and there is no custom domain; not a defect today (REL, deferred).

## Published boilerplate `richroberts222/fullstack-boilerplate` (CONSOLE)

Public; one commit `859b792` dated 2026-10-01; `is_template: false`; default branch `main`. Drift against a fresh export is in `inventory.md`.

## Vercel (partly CONSOLE through the Vercel bot's PR comments; no CLI access)

| Item | Observed | How |
| --- | --- | --- |
| Project | `signalonesound`, team `team-jesus5`, `rootDirectory: apps/web`, `isMonorepo: true` | Decoded metadata in the Vercel bot comment on PRs #77 and #80 |
| Preview deployments | one per PR push; URL pattern `signalonesound-git-<branch>-team-jesus5.vercel.app`; status Ready on the PRs inspected | Same |
| Preview deployment protection | **Vercel Authentication**: unauthenticated requests to the Preview page, API, and `/admin` get `302` to Vercel SSO (read-only `curl`, Pass 2, 2026-10-06) | CONSOLE |
| Production deployment on merge to `main` | not observed by the audit | UNVERIFIED (U-01) |
| Environment variables per scope | not observable | UNVERIFIED (U-02, U-03) |
| "Include source files outside of the Root Directory" | the monorepo builds succeed, so it is effectively on | INFER |
| `vercel.json` | none committed | RUN `ls` |

### Vercel dashboard, relayed by the operator from owner screenshots (UI-RELAY, 2026-10-07)

Grade: UI-RELAY. The operator read screenshots supplied by Rich and reported names and scopes only; values were masked. This is weaker than an API read-back (a second hand, no raw output) and stronger than INFER. It cannot show values, so it cannot show whether a key is a development or a production key.

| Item | Relayed observation | Audit reading |
| --- | --- | --- |
| Environments | Production, Preview, Development | Matches the expected model |
| Production | tied to `main`; `signalonesound.vercel.app`. The first relay read the summary "+2" as two more domains; **corrected 2026-10-07** (see correction below) | U-20 answered by UI-RELAY: no custom production domain is evidenced |
| Preview | applies to unassigned Git branches; no custom domains | Consistent with CONSOLE (Vercel Authentication on previews) |
| Development | CLI only; no custom domains | Expected |
| Production variable names | `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` only | **No `DATABASE_URL`, `DATABASE_ENV` or `APP_ENV` in Production.** Either production has no database wired yet, or the variables sit under another scope not shown. Consistent with `docs/database.md` saying only `dev` is migrated. Needs confirming (see below). |
| Preview variable names | `DATABASE_URL`, `DATABASE_ENV`, `APP_ENV`, both Clerk keys | Names match the expected Preview set (U-02). Values unknown: whether `DATABASE_URL` is the qa branch is still unverified. |
| Development variable names | both Clerk keys | Expected (database config is local) |
| System environment variables | "Enable access to System Environment Variables" checked | Vercel default; exposes `VERCEL_*` metadata to builds. Low concern, recorded for completeness. |

Effect on the register: U-02 is **partly answered** (names yes, values no). U-03 is **partly answered** (production is not configured with database variables; Clerk key type unknown). U-20 is **partly answered**. U-01 and U-21 are not answered by this evidence.

### Correction: Production domains (UI-RELAY, 2026-10-07)

Rich opened Settings > Environments > Production. The Domains section shows exactly one assigned domain, `signalonesound.vercel.app`, with an Add Domain button. The "+2" in the environment summary is therefore **not** two extra domains (its meaning is unknown, likely something else in the summary row). Same grade as above: second-hand screenshot read, no settings changed.

Effect: no custom production domain is evidenced. U-20 is answered as "none". Consequences, as INFERENCE: Production is served from a `*.vercel.app` URL, Clerk cannot yet have a real production domain, so production launch readiness (REL) is not met. Earlier statements here and in `progress.md` that implied extra domains should be read as superseded. U-21 stays open.

### Vercel Deployment Protection, relayed by the operator from owner screenshots (UI-RELAY, 2026-10-07)

Grade: UI-RELAY, same limits as above. No settings were changed.

| Item | Relayed observation | Audit reading |
| --- | --- | --- |
| Vercel Authentication | Enabled, "Require Log In", Standard Protection | Agrees with the CONSOLE `302` finding for Previews. Standard Protection is understood to cover Preview and generated deployment URLs and to leave the Production custom domain public. That is vendor behaviour from recall, UNVERIFIED. U-21 is therefore **not answered**: the Production domain may be public, which is expected for a launch but means F-SEC-005 and F-SEC-006 apply to it directly. |
| Password Protection | Not enabled; shown as a Pro-plan feature | Suggests the project may not be on Pro (INFER). Plan tier is unconfirmed. If it is not Pro, rollback is limited to the previous deployment and rolling releases are unavailable. Needs confirming (U-17, U-18). |
| Trusted IP | Not enabled; Enterprise feature | Not relevant at this scale. |
| Protection Bypass for Automation | No secret configured | Good. There is no automation bypass token to leak. It also means automated tests cannot reach protected Previews. Playwright e2e against a Preview, if wanted later, needs a deliberate decision. |
| Deployment Protection Exceptions | None shown | Good. No unprotected exception domains. |
| OPTIONS Allowlist | Disabled | Cross-origin preflight to protected Previews gets the login redirect. Matters only if a browser or mobile web client calls a Preview API from another origin. Not a current concern. |
| Protected Sourcemaps | Enabled | Good. Source maps are not served to the public. |
| Trusted Sources | Contains this project; all tokens can access matching environments, and development tokens can access Preview | Weak point. Development-scope tokens can reach Preview. This fits the shared-credential concern (Preview and Development both hold Clerk keys). Impact depends on what a "token" is here and is UNVERIFIED. Record as a candidate item for AUTH and REL. |
| Shareable Links | Section present; whether any link exists is unknown | Open. A shareable link bypasses Vercel Authentication for one Preview. Needs one fact: does any active link exist? |

Effect on the register: U-21 stays open and now has a sharper question. Two new facts are needed:
7. Does any Shareable Link exist and is it still active?
8. Which Vercel plan is the team on (Hobby, Pro, Enterprise)?

Still needed from Vercel (a human with the dashboard, one fact each, no secrets revealed):
1. Preview `DATABASE_URL`: which Neon branch or role name does it end in (not the password)? Expected `qa`.
2. Production and Preview `CLERK_SECRET_KEY` / publishable key: does each begin with `sk_test_`/`pk_test_` or `sk_live_`/`pk_live_`? Only the first characters are needed, never the whole value. Concern if Preview and Production share the same key.
3. Are the three variables above marked Sensitive, and is each scoped to exactly one environment (not "All Environments")?
4. ~~The two extra production domain names~~ (withdrawn, see correction below). Still needed: whether Production is behind Deployment Protection (U-21).
5. ~~Last Production deployment: date and commit (U-01).~~ Partly answered, see "Last Production deployment" below. Still open for U-01: whether the deployment was triggered automatically by the merge.
6. Who holds the Production deploy, rollback and Force Promote permissions; team members and spend limit (U-17, U-18).

### Last Production deployment (UI-RELAY, 2026-10-07)

Grade: UI-RELAY, a second-hand read of the Deployments list in an owner screenshot. No deployment action was taken.

Relayed: the most recent Production deployment is "Create Fable Exhaustive Audit Charter (#80)" on `main` at short commit `31ec6ba`, status Ready (26s build), about 11 hours old at the time of the screenshot. Deployments for `audit/phase-0-methodology` appear above it and are Preview deployments.

Audit reading:
* The latest Production commit equals the audit baseline `31ec6ba` (the repo fact pass recorded `origin/main` as `31ec6ba`). Production is not behind `main`, and no audit-branch commit has reached Production.
* **U-01 is partly answered.** A Production deployment exists whose commit is the merge of PR #80, which is consistent with deploy-on-merge. One observation does not prove the trigger (a manual deploy or promote would look the same), so the claim in `docs/deployment.md` stays UNVERIFIED. The F-SEC-001 High severity is therefore not lowered or raised by this. A second data point, such as a deployment for an earlier merge with the Git-triggered source label, would raise confidence.
* Preview deployments for the audit branch are protected by Vercel Authentication (see above), so the audit branch is not publicly reachable.

Effect on the register: U-01 partly answered (commit and recency yes, trigger no). U-21 is still open. Step 1 stays AMBER.

### Vercel team membership (UI-RELAY, 2026-10-07)

Grade: UI-RELAY, a second-hand read of Team Settings > Members in owner screenshots. No setting was changed.

Relayed: exactly one team member (Rich's account), role Owner. The member row shows 2FA with an X, meaning 2FA is not enabled for that account in the displayed state. Inviting more members is shown as a Pro-plan feature. No pending invitation is evidenced.

Audit reading:
* **Single point of failure (INFER, fits U-17).** One Owner, no second member, and no recovery arrangement evidenced. Loss of that account means loss of the deploy, rollback and environment-variable surface. The platform cannot add a second member on the apparent plan.
* **No 2FA on the only Owner account is a concrete credential-lifecycle gap.** It is the account that holds production environment variables (Clerk secret key) and deploy rights. This strengthens F-SEC-007 (credential lifecycle) and goes to SEC/OPS carry-forward. Whether 2FA is truly off is not API-verified; the X indicator is the only evidence. Whether Vercel login is via GitHub (where 2FA may be enforced upstream) is unknown and would change the reading.
* **Permissions question (fact 6) is largely answered:** with one Owner, Rich holds deploy, rollback and Force Promote. Spend limit is still unknown.
* **Plan tier:** the Pro-gated invite message is consistent with a non-Pro plan (fact 8, still INFER).

Remaining Vercel facts: Preview `DATABASE_URL` branch name, Clerk key prefixes and whether shared, Sensitive and per-environment scoping, Production protection (U-21), Shareable Link existence, spend limit, and how the Owner logs in (GitHub, email, passkey).

Engineering recommendation (not applied): enable 2FA or a passkey on the Owner account and store recovery codes offline. This is a free account action only Rich can perform. It involves no spend and no product choice.

## Neon (partly RUN through the local dev configuration)

| Item | Observed | How |
| --- | --- | --- |
| `dev` reachable with `DATABASE_ENV=dev` | yes: `SELECT 1` succeeded | RUN `pnpm --filter web db:check` |
| `dev` migration state | 2 applied (`0000_migration_proof`, `0001_proof_item`), 0 pending, history matches the journal | RUN `db:migrate:status --env=dev`, `db:migrate:verify --env=dev` |
| `qa`, `stage`, `prod` branches, roles, migration state | not observable | UNVERIFIED (U-04 to U-07) |
| Backups, point-in-time restore window, any restore ever performed | not observable; `docs/database.md` 12.3 states restore is "not yet documented/exercised" | UNVERIFIED (U-08) |
| Least-privilege roles (separate migration and runtime users) | not observable; docs say "recommended but not configured" | UNVERIFIED (U-09) |

### Neon console evidence relayed 2026-10-07 (UI-RELAY)

Second-hand read of owner screenshots. No setting was changed. Project and branch identifiers were deliberately not relayed and are not needed.

| Item | Observed | Reading |
| --- | --- | --- |
| Project | `SignalOneSound`; selected branch named `production` | Branch is named `production`, while `docs/database.md` and `docs/new-app-setup.md` say `prod`. Naming drift or a different branch from the documented one. Not resolved (U-04). |
| Default (root) branch | `production` is the project's Default branch | Partly answers U-04: `production` is the root. Whether `dev`, `qa`, `stage` exist as children is not shown. |
| Branch protection on `production` | "Not protected" | Fact. Neon's protection limits deletion and reset-type actions. As I recall it, protected branches are plan-dependent (UNVERIFIED). Whether protection is available on this plan is unknown. INFER: the data branch can be deleted or reset from the console by the owner. |
| Branch expiration | "Never expires" | Good. No automatic deletion. |
| Region | not visible | Still needed. |
| Restore window on `production` (Backup & Restore) | "Restore from history": instantly restore the branch to any point in the past **6 hour** history window. Preview-data / Restore is offered. Snapshots: none exist, no schedule set, schedules are offered as an upgrade. | Fact (UI-RELAY): visible point-in-time window is 6 hours. Partly answers U-08. INFER: a mistake, bad migration or deletion noticed after more than 6 hours cannot be undone from Neon history, and no snapshot exists as a fallback. A short window is consistent with a free or low plan, but the plan tier is not shown (UNVERIFIED). Whether a restore has ever been exercised is still unknown. |

Audit reading:
* The root data branch is unprotected. This is a console-level safeguard, not an application control, so it matters most for OPS (accidental deletion by the only owner, U-17). Severity not assigned here. It carries forward to DATA and OPS.
* The 6-hour restore window with no snapshots is a narrow recovery margin for the root data branch. Combined with no branch protection and one owner (U-17), it carries forward to DATA and OPS. Severity not assigned here; it matters mainly once real data exists (U-07).
* The branch name mismatch with the docs is a candidate doc-drift item for DATA (F-DEVOS-003 class), to be checked against the branch list.

### Neon branch overview relayed 2026-10-07 (UI-RELAY)

Second-hand read of owner screenshots. No setting was changed.

| Item | Observed | Reading |
| --- | --- | --- |
| Plan | Neon Free | Fact (UI-RELAY). Answers the plan-tier half of U-08. Consistent with the 6 hour history window and with schedules being offered as an upgrade. Plan limits (compute hours, storage, branch count) are UNVERIFIED from memory and not relied on. |
| Region | AWS US West 2 (Oregon) | Fact (UI-RELAY). Region of the Vercel Functions is not yet known, so function-to-database co-location is unverified (REL, DATA). |
| Branches | 4 | Count only. Names not shown. Consistent with the documented `dev`, `qa`, `stage` plus the root, but the names are unconfirmed (U-04). |
| Default branch | `production` | Matches the earlier relay. |
| IP restrictions | None set | Fact. The database accepts connections from any IP that holds valid credentials. This is the Neon default and is expected with serverless Vercel egress. Credential strength and role scope (U-05, U-09, U-15) therefore carry the whole access boundary. Not a defect by itself; a candidate hardening note for DATA/SEC. IP allow-listing availability on the Free plan is UNVERIFIED. |
| Compute | default 0.25 to 2 CU (autoscaling range); 1 compute on `production` | Fact. Free-plan scale-to-zero cold starts are plausible but UNVERIFIED here. |
| History retention | 6 hours | Confirms the earlier restore-window relay. |
| PostgreSQL version | 18 | Fact. Compare with the local, CI and migration tooling target during DATA. Extension availability (PostGIS, pg_trgm) is still UNVERIFIED. |
| `production` contents | 1 database, 1 compute, never expires | Fact. Whether the database holds any real data is not shown (U-07). |

Audit reading:
* Free plan explains the narrow recovery margin and the missing branch protection and snapshot schedules. It does not remove the risk. It means the controls would need a paid plan (spend, a Rich decision) or compensating practice (an exported dump before risky migrations), to be decided in OPS/DATA.
* No IP restriction is normal for this architecture. The finding, if any, is about role separation, not network scope.
* Free plan for a store-facing launch is a readiness question for REL and OPS, not a defect today.

Remaining Neon facts (names and yes/no only, no secrets): the four branch names; whether a restore was ever exercised; roles per branch; whether Preview's `DATABASE_URL` uses a non-`production` branch role; whether any real data exists on `production`; extension availability.

### Neon extension query relayed 2026-10-07 (direct read-only SQL, owner-run)

Owner ran `SELECT extname, extversion FROM pg_extension WHERE extname IN ('postgis', 'pg_trgm') ORDER BY extname;` in the Neon SQL editor on the `production` branch. Neon reported success with no rows. No mutation was performed. Grade: owner-run read-only SQL, relayed second-hand (stronger than a screenshot of settings, weaker than output I read myself).

| Item | Observed | Reading |
| --- | --- | --- |
| `postgis` installed on `production` | No | Fact. |
| `pg_trgm` installed on `production` | No | Fact. |

Audit reading:
* This answers "installed", not "available". An empty `pg_extension` result says nothing about whether Neon offers either extension on this plan or version. Do not read it as "Neon cannot do geospatial or fuzzy search".
* It is expected, not a defect. No migration creates either extension, and there is no geo or event table yet (repo fact pass `4defcf8`). The Phase 1 map and radius search need a spatial approach, so the choice is still open (OPEN, owned by me in DATA): PostGIS, or plain latitude/longitude with built-in distance functions. This is a design call for later and is not made here.
* Only `production` was queried. Other branches may differ, and extensions are per database, so a later `CREATE EXTENSION` must go through a Drizzle migration on every branch, not by hand.
* The relevance conclusion that PostGIS stays a live option is unchanged. Its availability is still UNVERIFIED.

Cheapest next fact, read-only and needing no secret: `SELECT name, default_version FROM pg_available_extensions WHERE name IN ('postgis','pg_trgm','cube','earthdistance') ORDER BY name;`. Do not run `CREATE EXTENSION`.

Remaining Neon facts (names and yes/no only, no secrets): the four branch names; whether a restore was ever exercised; roles per branch; whether Preview's `DATABASE_URL` uses a non-`production` branch role; whether any real data exists on `production`; extension availability (query above).

### Neon branch topology relayed 2026-10-07 (owner screenshot, UI-RELAY)

Second-hand read of an owner screenshot. No setting was changed.

| Item | Observed | Reading |
| --- | --- | --- |
| Branch count and names | Exactly 4: `production` (Default), `dev`, `qa`, `stage` | Fact (UI-RELAY). Names for `dev`, `qa`, `stage` match `docs/database.md`. The root is `production`, not the documented `prod`. |
| Parentage | `dev`, `qa`, `stage` each show `production` as parent (UI truncates to "produ..."). `production` has no parent | Fact (UI-RELAY). Matches the documented parent/child shape, with the root named differently. |
| State in captured view | `production` active; `dev`, `qa`, `stage` idle | Point-in-time view. Not evidence of usage or of data. |

Audit reading:
* U-04 is answered for existence and topology. The `prod` vs `production` difference was first read as doc drift; **corrected in DATA (F-DATA-011)**: `docs/database.md:73` already documents the mapping and no code reads a branch name. It is naming only, unless commands or scripts depend on the literal name `prod`. That has not been checked here.
* Child branches inherit data from the parent at creation. Whether `dev`, `qa`, `stage` hold copies of anything from `production` is unknown (U-07).
* This does NOT show that Vercel Preview `DATABASE_URL` points at `qa`, or that any role is scoped to one branch (U-02, U-05, U-15 remain open).
* No severity assigned.

Remaining Neon facts (names and yes/no only, no secrets): whether a restore was ever exercised; roles per branch; whether Preview's `DATABASE_URL` uses the `qa` branch role; whether any real data exists on `production`; extension availability (query above).

## Clerk

| Item | Observed | How |
| --- | --- | --- |
| Web integration present | `@clerk/nextjs` 7.9.7; `proxy.ts` protects `/dashboard`, `/account`, `/admin`, `/proof` | READ |
| Development instance keys in local config | present (the file was not opened; `db:check` and the env tests imply valid shape only for the database variables) | INFER |
| Production instance, allowed origins, test user for E2E, webhook configuration | not observable | UNVERIFIED (U-10 to U-12) |

## Expo / EAS / app stores

Not provisioned: `app.config.ts` holds placeholder identifiers (`com.example.signalone`), no EAS project id, `eas.json` profiles only set `EXPO_PUBLIC_APP_ENV`. No Apple or Google developer accounts are referenced anywhere. READ. Nothing to verify until a human starts it (U-13 records the decision point).

## Anthropic / Claude GitHub App

`CLAUDE_CODE_OAUTH_TOKEN` exists as a secret; the App is installed (runs succeed). Whether the App's own installation permissions exceed what `claude.yml` requests is not readable (U-14).

---

## UNVERIFIED register

Each item: where to look, what the audit expects to find, and which subject needs the answer. Rich records the answer next to the item (or in `decisions-needed.md` if it turns into a decision).

| ID | Check | Where | Expected / what matters | Needed by |
| --- | --- | --- | --- | --- |
| U-01 | Does a merge to `main` deploy Production automatically? When did the last Production deployment happen and from which commit? | Vercel → project → Deployments, filter Production | Confirms the "merge deploys prod" statement in `docs/deployment.md` that several severities depend on | REL, SEC |
| U-02 | Preview scope variables: `APP_ENV=qa`, `DATABASE_ENV=qa`, `DATABASE_URL` points at the **qa** Neon branch, Clerk **development** keys; no "All Environments" secrets | Vercel → Settings → Environment Variables, scope Preview | `docs/environment.md` "Open follow-ups" says this switch was not verifiable; a wrong value means Previews run against the wrong database | REL, DATA |
| U-03 | Production scope variables: `APP_ENV=prod`, `DATABASE_ENV=prod`, prod `DATABASE_URL`, Clerk **production** keys (`sk_live_`/`pk_live_`) | Vercel → scope Production | Whether production is even configured; if the keys are development keys, "production" is running on a dev Clerk instance | REL, AUTH |
| U-04 | Neon branches `dev`, `qa`, `stage`, `prod` exist; which is the root branch | Neon → project → Branches | `docs/database.md` 13 expects `prod` as parent of the other three | DATA |
| U-05 | One role per branch, each able to reach only its branch | Neon → Roles | `docs/new-app-setup.md` 4.2 requires it | DATA, SEC |
| U-06 | Migration state of `qa`, `stage`, `prod` (which of `0000`, `0001` are applied) | Run `db:migrate:status --env=qa` with qa configuration (never prod from a laptop); for prod, Neon SQL editor: `select * from drizzle.__drizzle_migrations` | `docs/database.md` 23 says only `dev` has been migrated | DATA, REL |
| U-07 | Does any real (non-proof) data exist anywhere, especially `prod`? | Neon → Tables per branch | Determines whether "before real data" findings are already live | DATA, AUTH |
| U-08 | Plan tier, point-in-time restore window, whether a restore has ever been exercised | Neon → Settings/Billing; Branches → Restore | Untested backup assumption | DATA, OPS |
| U-09 | Separate migration and runtime roles configured? | Neon → Roles | Least privilege | DATA |
| U-10 | Is there a Clerk **production** instance? Which domains are configured? | Clerk dashboard → Instances | Required before any real user | AUTH, REL |
| U-11 | Clerk development instance: allowed origins include the Vercel preview pattern and localhost; any webhooks configured (expected none) | Clerk → Configure → Domains / Webhooks | Webhook absence confirms no identity sync exists | AUTH |
| U-12 | A dedicated Clerk development test user for Playwright exists and its credentials live only in local env or a CI secret | Clerk → Users; GitHub → Secrets | Whether E2E can run anywhere today | TEST |
| U-13 | Decision point only: Apple/Google developer accounts, Expo account, EAS project: none expected | n/a | Mobile release work cannot start without them | REL |
| U-14 | Claude GitHub App installation permissions (repository contents, PRs, issues, workflows?) | GitHub → Settings → GitHub Apps → Claude → Permissions | Whether the App could do more than `claude.yml` asks | SEC |
| U-15 | `NEON_DEV_DATABASE_URL` secret really targets the dev branch and a dev-only role | GitHub → Secrets (value not visible; verify by the role name in Neon) | The whole "only dev credentials in automation" claim rests on this | SEC |
| U-16 | GitHub account security: 2FA on the owner account; any personal access tokens with repo scope | GitHub → Settings → Password and authentication / Developer settings | Single-owner repository with production deploys on merge | SEC, OPS |
| U-17 | Vercel and Neon account recovery: second owner or recovery codes stored | Vercel team members; Neon project members | Account loss scenario | OPS |
| U-18 | Vercel spend limits / budget alerts; Neon compute limits; Clerk plan limits (MAU) | Each console → Billing | Cost spike scenario | OPS |
| U-19 | Has the Vercel Preview ever been opened by a human before merge for the mock slices (#67, #69, #73, #75, #77)? | Rich's recollection | `docs/product-development.md` requires it; the median 5-minute PR lifetime makes it unlikely for most PRs | DEVOS |
| U-20 | Any production domain configured (custom domain, DNS, HTTPS)? | Vercel → Domains | Launch readiness; Clerk production needs a real domain | REL |
| U-21 | Production deployment protection setting and domain: is Production public, behind Vercel Authentication, or on a custom domain? What security headers does Production serve (`curl -I <prod URL>`)? | Vercel → Settings → Deployment Protection; Domains | Previews are protected (CONSOLE); Production behavior is unknown and decides how F-SEC-005 and F-SEC-006 apply today | SEC, REL |
| U-22 | GitHub: "Fork pull request workflows from outside collaborators" approval setting | GitHub → Settings → Actions → General | Public repository; should require approval for all outside contributors | SEC |
| U-23 | Which Claude account issued `CLAUDE_CODE_OAUTH_TOKEN` and how to revoke it | Claude account settings; GitHub secret metadata | If it is the owner's personal account token, a leak reaches beyond the product (F-SEC-007) | SEC |
| U-24 | For the seven PRs whose merge commit had a failing `Validate` (#32, #33, #34, #40, #56, #58, #59): was `Validate` green or red on the PR head when it was merged? | Each PR's Checks tab; or `gh api repos/<r>/commits/<head_sha>/check-runs` for the PR head SHA | Separates "merged while red" from merge skew between parallel PRs (F-DEVOS-002); changes the cause, not the need for a required check | DEVOS, REL |
| U-25 | Has the owner ever seen a comment, check annotation, or summary from Claude Code Review on any PR? | Rich's recollection; any PR conversation | Tells whether the reviewer ever produced visible output (F-DEVOS-001, Q-008) | DEVOS |

**U-25 answered 2026-10-07 (owner recollection, graded RECOLLECTION):** automated Claude Code Review was not part of the prior workflow; Claude only implemented each PR. This is not evidence that the review workflow ever posted a comment. It removes any dependency on the bot and supports Q-008 option 2.

**U-22 answered 2026-10-07 (CONSOLE):** the fork pull request approval setting is `first_time_contributors`. See the read-back above and F-SEC-003.

**U-24 answered 2026-10-07 (CONSOLE, `gh pr list --json statusCheckRollup` for the `Validate` result on each merged PR's head, `gh api .../commits/<sha>/check-runs` for its merge commit):** of the 30 merged PRs that have a `Validate` result on their head, 22 were green, 7 were **red at the head** (#32, #33, #34, #40, #56, #58, #59) and 1 was cancelled (#67); the merge-commit results agree. All seven red merges were red before they merged; none is merge skew. The 11 PRs before #31 predate the check. PR #80's merge commit shows no `Validate` result in the check-runs read (cause not examined). Corrects the "two mechanisms" reading in F-DEVOS-002.

**U-10 partly answered 2026-10-07:** see the Clerk and production note above.
