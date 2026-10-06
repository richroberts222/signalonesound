# Baseline: External State and the UNVERIFIED Register (Pass 1)

What the audit could read about systems outside the repository, how, and when; then every item a human must verify, with the exact place to look. CONSOLE facts are dated 2026-10-06 unless stated. Nothing here is a finding.

## GitHub repository `richroberts222/signalonesound` (CONSOLE, via `gh api`)

| Item | Observed | Endpoint |
| --- | --- | --- |
| Visibility | **public** | `repos/<r>` |
| Default branch | `main` | `repos/<r>` |
| Branch protection on `main` | none (404 "Branch not protected") | `repos/<r>/branches/main/protection` |
| Rulesets | none | `repos/<r>/rulesets` |
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

## Neon (partly RUN through the local dev configuration)

| Item | Observed | How |
| --- | --- | --- |
| `dev` reachable with `DATABASE_ENV=dev` | yes: `SELECT 1` succeeded | RUN `pnpm --filter web db:check` |
| `dev` migration state | 2 applied (`0000_migration_proof`, `0001_proof_item`), 0 pending, history matches the journal | RUN `db:migrate:status --env=dev`, `db:migrate:verify --env=dev` |
| `qa`, `stage`, `prod` branches, roles, migration state | not observable | UNVERIFIED (U-04 to U-07) |
| Backups, point-in-time restore window, any restore ever performed | not observable; `docs/database.md` 12.3 states restore is "not yet documented/exercised" | UNVERIFIED (U-08) |
| Least-privilege roles (separate migration and runtime users) | not observable; docs say "recommended but not configured" | UNVERIFIED (U-09) |

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
