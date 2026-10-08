# SEC: Security Engineering

Examined 2026-10-06 (Pass 2) at baseline `31ec6ba`. Depth: Deep. Home for: security headers and CSP, rate limiting, secret handling and credential lifecycle, supply chain, CI and workflow permissions, AI-agent prompt-injection surface, emergency access (`methodology.md` section 4).

## Method note

Evidence was gathered before the prior-input rows were re-read (`inputs-reconciliation.md`). Read in full: `claude.yml`, `ci.yml`, `claude-code-review.yml`, `next.config.ts`, `proxy.ts`, `lib/api/handler.ts`, `report.ts`, `lib/security.test.ts` (assertions), `lib/auth/server.ts`, `lib/env/*`, `db/index.ts`, `packages/shared/src/env.ts` (guards), `.gitignore` files, `.env.example` files, `pnpm-workspace.yaml`, `docs/security.md`. Executed or queried (all read-only): full git history secret scans, `pnpm audit`, `pnpm outdated`, GitHub repository, Actions and secret-scanning settings, read-only HTTP requests to the public Preview URL, inspection of the installed `cn` and `shadcn` packages, vendor security reporting (INFER).

New CONSOLE facts established in this pass, not in Pass 1:

* Preview deployments are protected by **Vercel Authentication**: every request to the Preview URL (page, API, `/admin`) is answered `302` to Vercel's SSO with a `Vercel Authentication` body. The headers seen on those responses (`Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Robots-Tag: noindex`) are Vercel's, not the application's, so the application's own headers are **not observable** from outside (U-21).
* Git history (all refs, 122 commits) contains **no** key-shaped secret and no real connection string. Patterns scanned on added lines: Clerk `sk_`/`pk_` keys, Neon `npg_` passwords, GitHub tokens, AWS keys, Anthropic keys, JWTs, private-key blocks, plus every credentialed PostgreSQL connection-string shape (scheme, user, password, host) on added and removed lines. The only non-placeholder-shaped hit is a fake test fixture (`5a7ca19`). The two commits that "removed a credentialed database URL from `docs/notes.md`" (`ac3adb6`, `aae6bda`) removed a placeholder-shaped string that tripped the repository's own pattern test, per the second commit's own note. No `.env` file was ever tracked on any ref.
* `cn@0.4.0` and the `cn@0.2.6` that `shadcn` itself depends on are published from the `shadcn-ui` organization (repository metadata), have no install scripts and no dependencies. The Phase 0 and issue 78 suspicion of a typosquat is not supported.
* `shadcn` is in runtime `dependencies` because `app/globals.css` imports `shadcn/tailwind.css` (629 lines); it is not a stray. It is also a 33-dependency CLI whose tree contributes three of the advisories and the whole MCP SDK to the production install.

## Findings

### F-SEC-001 `main` has no technical protection, and merging deploys production

| Field | Value |
| --- | --- |
| Status | Challenged |
| Severity | Low |
| Confidence | Medium (protection absence is CONSOLE; the deploy-on-merge link is U-01) |
| Timing | Now |
| Disposition | IMPROVE |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S |

**Evidence** (CONSOLE): `gh api repos/<r>/branches/main/protection` returned 404 "Branch not protected"; `gh api repos/<r>/rulesets` returned `[]`; collaborators: the owner only. Seven merged PRs (#32, #33, #34, #40, #56, #58, #59) have a failing `Validate` on their merge commit, one (#67) a cancelled one (`baseline/history.md`). 12 first-parent commits on `main` are direct commits, including every `claude.yml` edit. `docs/deployment.md` 5 and 6 state that merge to `main` deploys Production; whether it does is UNVERIFIED (U-01).

**Observation**: Every statement that makes the human the only gate ("Claude never merges", "main is protected", "CI is authoritative") is documentation. Nothing in GitHub enforces a pull request, a passing check, or a restriction on who or what can push to or merge into `main`. Merge behavior has been disciplined (all 38 merges are the owner's); the discipline is not a control.

**Consequence**: Any actor holding a token that can write to the repository can change what Production runs: a compromised or manipulated Claude job (`contents: write`, `pull-requests: write`, see F-SEC-002), a leaked personal token, a mistaken click. The consequence is deploying unreviewed code, including code that reads production secrets, to real users once there are any. Today the blast radius is mock UI plus a dev database. (Superseded: the ruleset is now in force and the grade is Low; see the Challenge log.)

**Recommendation**: Add one repository ruleset on the default branch: require a pull request, require the `Validate` status check, block force pushes and deletion, and restrict tag deletion for the foundation tag. Set required approving reviews to **zero** (a team of one cannot approve their own PR; requiring one would be theater or would force a bypass habit). Keep the owner able to merge from the phone. Do not give the owner a standing bypass; use the ruleset's "bypass when needed" only for emergencies and record each use.

**Alternatives and tradeoffs**: (a) Classic branch protection: equivalent but rulesets also cover tags and can be exported; (b) require one approval plus a second human or a GitHub App reviewer: stronger separation, no second human exists, rejected as process theater now; (c) do nothing and rely on discipline: costs nothing, fails exactly when something is compromised. Cost: a failing flaky `Validate` would block merging; the only recent failures were real. New complexity: one ruleset to maintain; it should be written into `docs/new-app-setup.md` as an acceptance step (already listed there as a manual step) and exported as JSON beside the template.

**Affects**: GitHub repository settings; `docs/git-workflow.md`, `docs/new-app-setup.md`; boilerplate generation (every new app).

**Depends on / sequencing**: Do first; it caps the blast radius of F-SEC-002. U-01 should be answered at the same time.

**Verification**: `gh api repos/<r>/rulesets` lists the ruleset; a direct push to `main` from a non-bypass actor is rejected; a PR with a failing `Validate` cannot be merged; the foundation tag cannot be deleted or moved; U-01 recorded.

**Decisions needed**: none (Q-007 is separate).

**Challenge log**:

Challenge (Pass 4, 2026-10-08): verdict Downgraded (High to Low; ADD to IMPROVE)
  Strongest case against: The recommendation has been applied, so the High is stale. Ruleset 24677009 is active with deletion, non_fast_forward, pull_request (0 approvals) and required `Validate`, and the bypass list is empty, so the owner cannot push to `main` either. The original premise, that nothing technical stops a direct push or a red merge, is no longer true (test 2: redundant with an existing control).
  Evidence re-checked: RUN `gh api repos/:owner/:repo/rulesets` and `.../rulesets/24677009` on 2026-10-08: the four rules above, `bypass_actors: []`, target `~DEFAULT_BRANCH`. RUN `git tag`: `signal-one-foundation-v1` exists; only one ruleset exists, so the tag has no protection. READ `claude.yml`: `Bash(gh pr *)` still present.
  Result: Residuals are (a) tag protection for the restore-point tag (Low), (b) record the ruleset as exported JSON for the template, and (c) the fact that an agent-opened PR with a green `Validate` can be merged by a merge-capable token, which is F-SEC-002, not this finding. Severity Low, disposition IMPROVE. The up-to-date option stays off by the owner's deliberate choice (F-DEVOS-002).

Challenge (Pass 4b, 2026-10-08): verdict Upheld
  Re-checked: RUN `gh api .../rulesets` and `.../rulesets/24677009`: one ruleset, active; rules deletion, non_fast_forward, pull_request (0 approvals), required `Validate` (strict false); `bypass_actors: []`, `current_user_can_bypass: never`. RUN `git tag`: `signal-one-foundation-v1` exists and no tag ruleset does, so the residual stands.
  Result: Low / IMPROVE is right under the convention (an existing control is graded for its present effect). Residuals (tag protection, exported ruleset JSON) were not in the roadmap's waves; added to Wave 1 item 1 as settings clicks. Grade: RUN.

**History**: 2026-10-06 created. Differs from issue 78 M01 ("required review"): reviews required set to zero for a single-owner repository; severity High, not Critical, because production deployment is UNVERIFIED and the realistic exploit needs F-SEC-002.

**History (2026-10-07)**: Partly applied by the owner: ruleset `Protect main` is active (deletion and force-push blocked; pull request required with 0 approvals; `Validate` required; up-to-date off; bypass list empty). Documented in `docs/security.md` (PR #86). Deploy-on-merge is now **evidenced** (U-01 answered 2026-10-08: a merge to `main` deploys Production within seconds), which supports keeping the severity until Pass 4 verifies that the ruleset is the only path to `main`. Tag protection for `signal-one-foundation-v1` is not covered.

**History (Pass 4, 2026-10-08)**: High to Low and ADD to IMPROVE because the ruleset `Protect main` is active and verified; residual is tag protection and exporting the ruleset. The merge-capability risk is carried by F-SEC-002.

**History (Pass 4b, 2026-10-08)**: Consequence text annotated as superseded (it still said High). Residuals unchanged: tag protection for `signal-one-foundation-v1`, and exporting the ruleset.

---

### F-SEC-002 The Claude job concentrates secrets, write access, and arbitrary code execution

| Field | Value |
| --- | --- |
| Status | Challenged |
| Severity | High |
| Confidence | Medium (configuration READ; exploitability depends on vendor behavior, INFER) |
| Timing | Now |
| Disposition | IMPROVE |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S |

**Evidence**: `claude.yml` (READ): job-level `env` sets `DATABASE_URL` from `NEON_DEV_DATABASE_URL`; permissions `contents`, `pull-requests`, `issues`, `id-token`: write; allow-list includes `Bash(pnpm *)`, `Bash(npx *)`, `Bash(corepack *)`, `Bash(gh pr *)`; `actions/checkout@v4` and `anthropics/claude-code-action@v1` are floating tags; `CLAUDE_CODE_OAUTH_TOKEN` is passed to the action. No step in the workflow needs the database. Repository settings (CONSOLE): public repository; default `GITHUB_TOKEN` permission is write (F-SEC-003). Vendor reporting (INFER; [report](https://thenextweb.com/news/claude-code-github-action-prompt-injection-flaw), [analysis](https://tenki.cloud/blog/claude-code-action-prompt-injection-hijack), accessed 2026-10-06): a flaw in the action's write-permission check, since patched, let a GitHub App actor trigger runs in public repositories, and an injected prompt read process environment to take tokens; example workflows that allowed non-write users were a common misconfiguration.

**Observation**: Four independent facts concentrate in one job. (1) The agent can run arbitrary code (`pnpm *` and `npx *` execute any script or package). (2) Its process environment holds a database credential, the Claude OAuth token, and `GITHUB_TOKEN` with write scope. (3) That `GITHUB_TOKEN` can merge pull requests (`pull-requests: write`; `Bash(gh pr *)` permits `gh pr merge`; the documented rule against merge tooling is not enforced by a wildcard allow-list). (4) The action is pinned to a moving tag, so the code that handles all of this changes without review. The allow-list therefore constrains the agent's *intended* tool use only; any code the agent executes inherits the whole environment and bypasses the list. The action's default write-permission gate (this workflow does not set `allowed_non_write_users`, which is the safe default) is the real access control for who can trigger runs, and it has had a vendor vulnerability.

**Consequence**: Prompt injection through any text the agent reads (an issue body, a PR comment, a fetched web page, a dependency's README) can run code with the token and credentials above: push a branch, comment, merge a PR (nothing blocks it, F-SEC-001), exfiltrate the dev database credential, or exfiltrate the OAuth token tied to the owner's Claude account. The first two matter for the product; the last is the owner's account, not the product's data.

**Recommendation**: (1) Remove `DATABASE_URL`/`DATABASE_ENV` from the job unless Q-007 shows a real use; if one exists, scope it to a single step. (2) Replace `Bash(pnpm *)`/`Bash(npx *)` with the exact commands the work needs (`pnpm lint`, `pnpm typecheck`, `pnpm test:run`, `pnpm --filter <ws> test`, `pnpm build`), and replace `Bash(gh pr *)` with the specific read subcommands (`gh pr view`, `gh pr list`, `gh pr diff`, `gh pr checks`). (3) SHA pinning of `actions/checkout`, `actions/setup-node`, `anthropics/claude-code-action` and the review plugin reference is owned by F-SEC-004, as one change together with the updater that keeps the pins current; the repository setting `sha_pinning_required` is an option for enforcing it. (4) Test (do not assume) whether `id-token: write` is required with an OAuth-token configuration; the action may need it to obtain its app token (INFER), so remove it only if the test passes. (5) The allow-list wording is governed by F-DEVOS-004, which grants `git merge:*` and `git merge-base:*` with exact patterns and no wildcard on `gh pr`; this supersedes the earlier advice not to add `git merge`. (6) Replace the static `security.test.ts` workflow assertions with a parse of the `--allowed-tools` string so wildcards that include merge are caught.

**Alternatives and tradeoffs**: Narrowing the allow-list may block some legitimate agent actions and cause failed runs that need a human edit (the App cannot edit workflows); accepted, since each blocked action is visible and cheap to grant. A stronger alternative is to run the agent without secrets at all and let CI do all execution; this removes DB-backed validation from agent runs, which nothing currently relies on. Not recommended: removing the Claude workflow; it is the product's delivery mechanism and the audit has no evidence it is unsafe when scoped.

**Affects**: `.github/workflows/claude.yml`, `claude-code-review.yml`, `docs/security.md`, `docs/issues.md` (workflow constraints), `security.test.ts`, the boilerplate template (inherited unchanged).

**Depends on / sequencing**: After F-SEC-001 (so a compromised run cannot reach `main`); human-only edit (App cannot edit workflows); Q-007. F-DEVOS-002's agent-install step, if ever added, comes only after this narrowing; the documentation fix comes first.

**Verification**: Workflow has no job-level secrets other than the Claude token; allow-list contains no wildcard on `pnpm`, `npx`, or `gh pr`; all `uses:` are SHA-pinned with a trailing version comment; a test parses the allow-list and fails on any entry matching `merge`; a dry-run on a throwaway issue confirms normal work still passes.

**Decisions needed**: Q-007.

**Challenge log**:

Challenge (Pass 4, 2026-10-08): verdict Upheld (narrowed)
  Strongest case against: Exploitation needs a write-access actor or injected text the agent reads. The repository has one collaborator, the action only serves write users by default, the database credential is the dev branch (proof data), and the largest prize is the owner's personal Claude token. Recommendation (3), SHA pinning, duplicates F-SEC-004, and (4) may be moot: the action normally needs `id-token: write` to obtain its GitHub App token (INFER from vendor examples).
  Evidence re-checked: READ `.github/workflows/claude.yml` (2026-10-08): job `env` sets `DATABASE_URL` from the dev secret; `Bash(gh pr *)`, `Bash(pnpm *)`, `Bash(npx *)` allowed; floating `@v1`/`@v4`; write permissions. RUN `gh secret list`: exactly two secrets (OAuth token, dev database URL). UNVERIFIED: whether `gh pr merge` actually succeeds with the app token.
  Result: High is kept for one reason: this is the only place a documented core invariant (human-only merge) is contradicted by configuration. `gh pr *` includes merge, `pnpm *` runs arbitrary code, and the ruleset only demands a green `Validate`, so a green agent PR is mergeable by the agent. The fix is small and mostly deletions. Narrowed: pinning moves to F-SEC-004 as one change; item (4) becomes a test, not an assumption; point 5 is superseded by F-DEVOS-004 (grant `git merge`/`git merge-base`, as `progress.md` required). Tension recorded: F-DEVOS-002's agent-install step enlarges what this finding shrinks.

Challenge (Pass 4b, 2026-10-08): verdict Upheld
  Strongest case against: single collaborator, dev database only, the real prize is the owner's Claude token, so High may be inflated.
  Re-checked: READ `claude.yml`: job `env` still sets `DATABASE_URL` from the dev secret; `Bash(gh pr *)`, `Bash(pnpm *)`, `Bash(npx *)`, `Bash(corepack *)` allowed; floating `@v4`/`@v1`; `id-token: write`. RUN `gh secret list`: exactly two secrets. UNVERIFIED: whether `gh pr merge` succeeds with the app token.
  Result: High holds under the convention (live now AND defeats the human-only-merge invariant); I searched for a second finding meeting both and found none. Body points 3 to 5 rewritten (contradictions 1 and 9).

**History**: 2026-10-06 created. Strengthens Fable's `claude.yml` notes: the `gh pr *` wildcard permits merging, and any executed code bypasses the allow-list, which together make the Phase 0 "arbitrary code execution" statement concrete. Disagrees with issue 78's claim that the trigger "does not check commenter permission" as a defect: the action applies a write-permission check by default (INFER), so the finding is the vendor-risk residual, not a missing check.


**History (Pass 4, 2026-10-08)**: upheld at High but narrowed (pinning is owned by F-SEC-004; point 5 superseded by F-DEVOS-004; id-token removal is a test, not an assumption).

**History (Pass 4b, 2026-10-08)**: Recommendation points 3 to 5 rewritten to match Pass 4 (pinning owned by F-SEC-004; id-token is a test; allow-list governed by F-DEVOS-004) and the ordering with F-DEVOS-002 stated (contradictions 1 and 9).

---

### F-SEC-003 Repository-level Actions settings are more permissive than any workflow needs

| Field | Value |
| --- | --- |
| Status | Challenged |
| Severity | Low |
| Confidence | High (CONSOLE) |
| Timing | Now |
| Disposition | IMPROVE |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S |

**Evidence** (CONSOLE): `actions/permissions`: all actions allowed; `actions/permissions/workflow`: default workflow permissions `write`, `can_approve_pull_request_reviews: true`. All three workflows declare their own `permissions`, except that any future workflow that omits the block silently receives write.

**Observation**: The safe defaults are inverted at repository level. Declared permissions today mask the problem.

**Consequence**: A new or edited workflow that forgets a `permissions` block gets a write token; workflows can approve their own PRs, which would defeat even a "one approval" rule if it existed; any marketplace action may run.

**Recommendation**: Set default workflow permissions to read; disable "allow GitHub Actions to create and approve pull requests"; restrict allowed actions to "GitHub-owned and verified creators" or an explicit allow-list (`anthropics/claude-code-action`, `actions/*`). Also confirm the "Require approval for first-time/outside contributors" setting for fork pull requests (U-22).

**Alternatives and tradeoffs**: none material; three console clicks.

**Affects**: GitHub settings; `docs/new-app-setup.md` checklist; boilerplate.

**Depends on / sequencing**: Independent; pair with F-SEC-001.

**Verification**: `gh api repos/<r>/actions/permissions/workflow` shows `default_workflow_permissions: read`, `can_approve_pull_request_reviews: false`; `ci.yml` and `claude.yml` still run.

**Decisions needed**: none.

**Challenge log**:

Challenge (Pass 4, 2026-10-08): verdict Downgraded (Medium to Low)
  Strongest case against: All three workflows declare `permissions` (`ci.yml` read-only), so the write default only bites a future workflow that omits the block. `can_approve_pull_request_reviews` is moot while the ruleset requires zero approvals. No path to harm exists today (test 9).
  Evidence re-checked: RUN `gh api repos/:owner/:repo/actions/permissions/workflow` -> `write`, `can_approve_pull_request_reviews: true`; `.../actions/permissions` -> `allowed_actions: all`, `sha_pinning_required: false` (2026-10-08, unchanged). READ the three workflows: each has a `permissions` block.
  Result: Settings are as reported but harmless today. Three clicks, so still do them in the same sitting as F-SEC-002, but Low. Note `sha_pinning_required` is a repository setting that could enforce the pinning F-SEC-002 asks for, replacing a custom test.

Challenge (Pass 4b, 2026-10-08): verdict Upheld
  Re-checked: RUN `gh api .../actions/permissions/workflow`: default `write`, `can_approve_pull_request_reviews: true`; `.../actions/permissions`: `allowed_actions: all`, `sha_pinning_required: false` (unchanged). READ `ci.yml:9` and `claude-code-review.yml:23` declare `permissions`.
  Result: still harmless today; Low and Now (three clicks with the F-SEC-002 sitting) hold. Grade: RUN, READ.

**History**: 2026-10-06 created (new; not in prior inputs).

**History (2026-10-07)**: U-22 answered: fork pull request workflow approval is `first_time_contributors`, not the stricter all-outside-contributors setting. Default token `write`, workflow PR approval allowed, all actions allowed: all unchanged on 2026-10-07.

**History (Pass 4, 2026-10-08)**: Medium to Low; every workflow declares its permissions and the approval flag is moot at zero required approvals.

---

### F-SEC-004 No standing dependency or workflow-update control

| Field | Value |
| --- | --- |
| Status | Challenged |
| Severity | Medium |
| Confidence | High |
| Timing | Now |
| Disposition | ADD |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S |

**Evidence**: `pnpm audit` (RUN 2026-10-06): 6 advisories (4 high, 2 moderate); `--prod`: 5. All transitive: `node-forge` (via `expo`, no patched version), `braces` (via `shadcn` → `fast-glob`, no patch), `source-map-js` (via `vitest` → `vite`), `@modelcontextprotocol/sdk` (via `shadcn`), `esbuild` (via `drizzle-kit`), `uuid` (via `expo` config plugins). Dependabot alerts and security updates are disabled (CONSOLE). No `dependabot.yml`; no audit step in `ci.yml`. `docs/security.md` records "no known vulnerabilities" from one run on 2026-10-01 (C-14). `pnpm outdated`: 19 direct packages behind, none by more than a minor except tooling majors.

**Observation**: The advisories are real but none sits in the deployed runtime path: they are in CLIs and dev servers (`expo`, `shadcn`, `vitest`, `drizzle-kit`) that Vercel installs but does not execute for users. The problem is not these six. It is that nothing will notice the seventh, including one that is in `next`, `@clerk/nextjs`, `zod`, or the Neon driver, and nothing keeps GitHub Actions current.

**Consequence**: A runtime advisory (for example a Next.js or Clerk vulnerability) would be discovered by chance. Floating action tags (F-SEC-002) and an unmonitored lockfile are the two supply-chain entry points the project actually has.

**Recommendation**: Enable Dependabot alerts and security updates (free, console), and add a minimal `dependabot.yml` covering `npm` (workspace root, weekly, grouped) and `github-actions` (weekly). Add a **non-blocking** `pnpm audit --prod` report step or scheduled workflow that fails only on a *runtime-path* allow-list, not on the current transitive set (a blocking `pnpm audit` would fail CI today on advisories with no available patch). Triage the six now: record each as "not in runtime path" with the path, or move `shadcn` to a vendored stylesheet (see F-SEC-004a below).

**F-SEC-004a option** (same finding, optional step): replace the runtime `shadcn` dependency with a vendored copy of `tailwind.css` (the repository already owns the generated component source), moving the CLI to `devDependencies` or running it only via `pnpm dlx`. This removes the MCP SDK and `braces` from the production install. Cost: a one-time copy and a note to refresh on shadcn upgrades. Treated as optional because it reduces install surface, not an exploitable path.

**Alternatives and tradeoffs**: Renovate (more configurable, adds a service); `pnpm audit` blocking with ignores (high maintenance for a one-person project); SBOM and provenance (DEFER, F-SEC-004 trigger: distribution of the artifact to third parties, regulated customers, or a team; not today). CodeQL: DEFER, trigger: first non-trivial server-side business logic beyond the proof slice, since the current server code is a small adapter and the pattern tests already cover its boundaries.

**Affects**: GitHub settings, new `.github/dependabot.yml`, `ci.yml` or a scheduled workflow, `docs/security.md` (update the stale claim), boilerplate.

**Depends on / sequencing**: Pair with F-SEC-002 SHA pinning; independent of others.

**Verification**: Dependabot alerts enabled (`gh api repos/<r>` shows `dependabot_security_updates: enabled`); `dependabot.yml` present; first Dependabot PRs open for actions and npm; the audit report step runs and records its output; `docs/security.md` no longer states "no known vulnerabilities".

**Decisions needed**: none.

**Challenge log**:

Challenge (Pass 4, 2026-10-08): verdict Reworded (Medium upheld)
  Strongest case against: The six advisories are all outside the runtime path, so a blocking audit is wrong and a non-blocking audit report nobody reads is process theater. F-SEC-004a (vendoring the shadcn stylesheet) creates a copied file to refresh: maintenance debt for a reduction in install surface only.
  Evidence re-checked: RUN `gh api repos/:owner/:repo` `security_and_analysis`: `dependabot_security_updates: disabled`. READ: no `.github/dependabot.yml`; `ci.yml` has no audit step. UNVERIFIED today: `pnpm audit` was not re-run (figures are from 2026-10-06).
  Result: Keep the core: enable Dependabot alerts and security updates and a minimal `dependabot.yml` (actions weekly, npm grouped). It also makes SHA-pinning (F-SEC-002) sustainable; pinning without an updater rots. Cut F-SEC-004a and the non-blocking audit step; alerts replace the latter. Medium holds because an advisory in `next` or `@clerk/nextjs` is realistic and nothing would notice. Absorbs the pinning item from F-SEC-002.

**History**: 2026-10-06 created. Differs from issue 78 M03: audit step non-blocking and runtime-focused (a blocking audit would fail today on unpatchable transitive advisories); gitleaks rejected as redundant with enabled push protection plus the clean history scan; CodeQL and SBOM deferred with triggers.

**History (Pass 3, 2026-10-08, S-06)**: All six workflow `uses:` references are version tags, not commit hashes (`actions/checkout@v4` three times, `actions/setup-node@v4` once, `anthropics/claude-code-action@v1` twice; RUN). Pinning to commit hashes, kept current by the update tool this finding recommends, is part of the recommendation. Mitigating fact: `pnpm-workspace.yaml` sets `allowBuilds` to false for the three packages that request install scripts (RUN).

**History (Pass 4, 2026-10-08)**: reworded. Dropped F-SEC-004a and the audit step; now owns SHA pinning and the updater as one change.

---

### F-SEC-005 The application sets no security response headers

| Field | Value |
| --- | --- |
| Status | Challenged |
| Severity | Low |
| Confidence | Medium (config READ; deployed headers unobservable behind Vercel Authentication, U-21) |
| Timing | Before public launch |
| Disposition | ADD |
| Scope | BOTH |
| Trigger class | Before production |
| Effort | S for the baseline headers; M for a CSP |

**Evidence** (READ): `next.config.ts` has no `headers()`; `proxy.ts` sets none; `app/layout.tsx` sets none; `grep` for `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security` in app code found nothing. API responses set `Cache-Control: no-store` and `X-API-Version` only (`handler.ts:35`). Vercel adds `Strict-Transport-Security` at the platform (observed, CONSOLE).

**Observation**: Clickjacking, MIME-sniffing, referrer, and permission headers are unset, and there is no CSP. The app embeds Clerk components and (in the mock admin) a file-picker and a map, so a CSP is not free.

**Consequence**: Low today: every product page is a mock with no member data, and Previews are behind Vercel login. Rises at the first real member data or session-bearing page on a public domain.

**Recommendation**: Add the low-risk headers now in one `headers()` block (`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimal, `frame-ancestors`/`X-Frame-Options: DENY`). Introduce a **Content-Security-Policy in report-only mode** when the first real UI replaces the mocks, allow-listing Clerk, and promote it to enforcing after observing violations. Add one test asserting the header block exists.

**Alternatives and tradeoffs**: Issue 78 M04 asks for a baseline CSP in Preview now. Previews are behind SSO and the UI is about to be rebuilt, so a CSP written against mocks is rework; headers now, CSP with the real UI. A third-party header service adds a dependency for a small config block; rejected.

**Affects**: `apps/web/next.config.ts`, a test, `docs/security.md`, boilerplate (every generated app should ship the baseline headers).

**Depends on / sequencing**: Baseline headers any time; CSP gates real UI. U-21 to confirm what Production serves.

**Verification**: `curl -I` of a Production-like URL shows the baseline headers; a unit test reads the exported header config; CSP report-only appears with the first real UI slice and zero unexplained violations before enforcing.

**Decisions needed**: none.

**Challenge log**:

Challenge (Pass 4, 2026-10-08): verdict Downgraded (Medium to Low)
  Strongest case against: Previews are behind SSO, Production serves mock content, and Vercel already sets HSTS. The proposed test asserts that a header array exists, which is weak evidence. CSP is deferred anyway.
  Evidence re-checked: READ `apps/web/next.config.ts`: no `headers()`. RUN read-only GET of the public Production `/sign-up` page: HTTP 200 (so Production is public, which keeps this above zero); response headers were not captured, so what Production serves is UNVERIFIED.
  Result: A ten-line config block with no regret, but the consequence on a mock site is minimal. Low; timing stays before public launch. Prefer a test that reads the exported header array over a curl check (Previews cannot be curled).

Challenge (Pass 4b, 2026-10-08): verdict Upheld (evidence strengthened)
  Re-checked: RUN read-only `curl -I` of the public Production `/`: the only security header is `Strict-Transport-Security` (platform); no `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` or CSP; `X-Powered-By: Next.js` is sent. This turns the Pass 4 'what Production serves is UNVERIFIED' into RUN, and partly answers U-21.
  Result: Low and Before public launch hold (no member data; sign-up exists but is development-instance, F-AUTH-011). Grade: RUN.

**History**: 2026-10-06 created. Differs from issue 78 M04 in timing (CSP deferred to real UI) and in noting Preview auth protection.


**History (Pass 4, 2026-10-08)**: Medium to Low; no member data on any page and the fix is cheap whenever done.

---

### F-SEC-006 No rate limiting or abuse throttling on the API or sign-in-adjacent routes

| Field | Value |
| --- | --- |
| Status | Challenged |
| Severity | Low |
| Confidence | Medium |
| Timing | Trigger: before the first public data-bearing endpoint |
| Disposition | ADD |
| Scope | BOTH |
| Trigger class | Before production |
| Effort | S (platform rule) to M (per-user limits) |

**Evidence**: `docs/api.md`: "`rate_limited`: Reserved; rate limiting is not implemented"; no rate-limit library or Vercel firewall configuration found in the repository; the only unauthenticated endpoint is `GET /api/v1/status`; authenticated endpoints are the proof slice. Clerk applies its own throttling to its sign-in flows (INFER). Neon, Vercel, and Clerk are metered services (U-18 for the plans).

**Observation**: There is no application-level or platform-level request throttle. Today that is acceptable because the surface is one static status endpoint and one auth-required proof endpoint. The first public, data-bearing endpoint (Discover search, notifications, event submission) will be hit by scrapers and bursts.

**Consequence**: Abuse converts directly into cost and degraded service on metered vendors, and gives no signal that it is happening (F-OPS findings pending).

**Recommendation**: Use the **platform** first: a Vercel Firewall rate-limit rule on `/api/*` and on write routes is a console configuration, not code. Add per-user limits in the service layer only when a specific abuse case (bulk submission, notification triggers) exists. Document the chosen limits in `docs/security.md` and remove "reserved" from `api.md` when real.

**Alternatives and tradeoffs**: Upstash or another in-code limiter (issue 78 M08): per-user fidelity at the cost of a new vendor, a secret, and latency; defer until a per-user rule is actually needed. Doing nothing until launch is acceptable if the platform rule is set before the first real endpoint ships.

**Affects**: Vercel configuration (UNVERIFIED), `docs/security.md`, `docs/api.md`.

**Depends on / sequencing**: Before the first non-proof public API endpoint; U-18 (cost ceilings).

**Verification**: A burst test against a Preview-like URL receives `429` with the standard envelope; Vercel Firewall shows the rule; limits written down.

**Decisions needed**: none.

**Challenge log**:

Challenge (Pass 4, 2026-10-08): verdict Downgraded (Medium to Low)
  Strongest case against: The only public endpoint is a static JSON status route, Clerk throttles its own flows, free plans tend to pause rather than bill, and the platform rule's availability on the current plan is unknown (U-18). This protects against abuse of endpoints that do not exist yet (test 9).
  Evidence re-checked: READ `apps/web/app/api/v1/status/route.ts`: static `{status, version}`, no database. READ `docs/api.md`: `rate_limited` is reserved. UNVERIFIED: Vercel firewall rate-limit availability on the current plan.
  Result: No cost-bearing abuse path exists today. Keep the recommendation (platform rule first) but make it a precondition of the first public, data-bearing endpoint, not a standing item. Low.

Challenge (Pass 4b, 2026-10-08): verdict Upheld
  Re-checked: RUN `GET /api/v1/status` on Production returns static `{ok,data:{status,version}}`; anonymous `GET /api/v1/proof-items` returns 401; READ `apps/web/app/api`: only `v1/status`, `v1/proof-items`, a catch-all. No cost-bearing public path exists.
  Result: Low with a precondition trigger holds. Grade: RUN, READ.

**History**: 2026-10-06 created. Differs from issue 78 M08: platform rule first, in-code limiter only on a concrete need.


**History (Pass 4, 2026-10-08)**: Medium to Low and timing made a trigger; no cost-bearing endpoint exists.

---

### F-SEC-007 Credential lifecycle and emergency access are undocumented, with a single human owner

| Field | Value |
| --- | --- |
| Status | Challenged |
| Severity | Medium |
| Confidence | Low (depends on U-15, U-16, U-17) |
| Timing | Before first real users |
| Disposition | ADD |
| Scope | BOTH |
| Trigger class | Before production |
| Effort | S |

**Evidence**: Credentials in use (names only): `CLAUDE_CODE_OAUTH_TOKEN`, `NEON_DEV_DATABASE_URL` (Actions secrets); Clerk development keys and a dev database URL in a local, untracked env file; Vercel per-scope variables (UNVERIFIED). One GitHub collaborator (admin). No document records where each credential lives, who can rotate it, how to revoke it, or what to do if the owner account is lost. `docs/security.md` and `new-app-setup.md` say where values *go*, not their lifecycle.

**Observation**: The platform has one human and several third-party accounts with deploy or data power. There is no written order of operations for "a credential leaked" or "I cannot log in".

**Consequence**: A leak or lockout is handled by improvisation. The OAuth token in Actions is tied to the owner's personal Claude account (INFER), so a leak affects more than the product.

**Recommendation**: Write one short runbook, `docs/operations.md` (no secret values, short enough to follow from a phone). It also carries the content merged in from F-OPS-002: the five incidents to prepare for with the first three steps of each (bad deploy: roll back in Vercel, F-REL-001; credential leak: rotate in the order Neon, Clerk, Vercel, GitHub; abusive sign-ups: restrict sign-ups in Clerk and use Vercel Attack Challenge Mode; data incident: stop, preserve, get advice; vendor outage: check its status page), the kill switches that already exist and where to find them, and subscriptions to the vendors' status pages. Do not advise a separate login for the business partner: the owner accepted one shared login (see History). The credential content: a credential register (name, scope, where stored, how to rotate, who else can), a "credential leaked" checklist (revoke, rotate, check logs, check history), and an emergency-access note (recovery codes location, optional second owner on Vercel, Neon, GitHub). Keep it to one page. Rotate the dev database credential and the OAuth token once after the F-SEC-002 changes as a rehearsal.

**Alternatives and tradeoffs**: A secrets manager or vault is overengineering for one person; rejected. A second human owner is the strongest recovery control but is a business decision.

**Affects**: new doc, GitHub and vendor consoles.

**Depends on / sequencing**: After F-SEC-002 (so the rotation is meaningful); U-15 to U-17 feed it. OPS (pending) owns incident response and will cross-reference.

**Verification**: The runbook exists and passes `security.test.ts`; each credential in the register can be revoked by a listed step; one rotation was performed and recorded.

**Decisions needed**: whether to add a second account owner (business, Rich).

**Challenge log**:

Challenge (Pass 4, 2026-10-08): verdict Reworded (survivor of merge with F-OPS-002)
  Strongest case against: One person, no users, one deliberately shared login: a credential register of two Actions secrets plus vendor keys is mostly paperwork, and a rotation rehearsal creates churn. Confidence is Low (U-15 to U-17 unverified). The OPS-002 clause 'give the partner their own login' contradicts the owner's recorded, accepted decision to share one login.
  Evidence re-checked: RUN `gh secret list`: `CLAUDE_CODE_OAUTH_TOKEN`, `NEON_DEV_DATABASE_URL`, nothing else. READ F-SEC-007 History (shared login accepted as residual risk) and F-OPS-002 recommendation (3). Vercel two-factor state is UI-RELAY, not re-checked.
  Result: Both findings are fixed by the same change: one short `docs/operations.md` page. F-OPS-002 is merged here (see Tombstones), bringing its kill-switch list, the first-three-steps incident list and status-page subscriptions. The OPS-002 'own login' clause is dropped because it conflicts with the accepted shared login; the free mitigations in the 2026-10-08 History (password manager, authenticator on both phones, recovery codes offline, two-factor on every vendor) stay. Timing is 'Before first real users'. Rotation rehearsal optional. Medium held on the merged scope.

Challenge (Pass 4b, 2026-10-08): verdict Upheld (merge verified)
  Re-checked: READ F-OPS-002 recommendation (1) to (5) against F-SEC-007. The merged content (incident steps, kill switches, status pages) was only in the OPS body; the SEC-007 body still described the credential register alone and F-SEC-007 History carried an 'own Clerk account' sentence for the second admin.
  Result: Medium held on the merged scope. Body rewritten to carry the merged content and drop the own-login advice; pronoun fixed. Grade: READ.

**History**: 2026-10-06 created. Merges P-CH-26 (emergency access) and P-CH-27 (credential lifecycle).

**History (2026-10-08)**: Owner reports that the business partner views the product by using the owner's own Vercel login (RECOLLECTION). A shared login removes per-person attribution, ties the partner's access to the owner's password and second factor (Vercel's team 2FA indicator was reported off, UI-RELAY), and cannot be revoked for one person without changing the owner's credentials. Production is already public and needs no login; unmerged Preview deployments can be shared with a link or by adding a seat. Recommendation: stop sharing the login; use the Production URL for merged work and a Vercel shareable link for a specific Preview (INFER on plan availability), or add a paid seat if per-person access is needed (F-REL-007). The second platform admin was to have their own Clerk account (Q-010; superseded by the later 2026-10-08 entry: one shared identity is accepted).

**History (2026-10-08, later)**: Owner decision: the owner and the business partner deliberately share one set of logins, so collaboration through separate accounts is not needed (RECOLLECTION: "it's just me and [the partner] and we share the same exact account"). Recorded as a **residual-risk acceptance by the owner**, not as a defect to fix now. The risk that remains is account takeover: whoever holds the shared password and second factor can reach every system the account reaches (repository, hosting, database, sign-in provider), and nothing distinguishes the two people in any log. Free mitigations that keep the arrangement: keep the credentials in a password manager rather than messages; use an authenticator app for two-factor and register it on both phones when it is first set up, and store the recovery codes offline; turn on two-factor on every vendor account (Vercel's was reported off). Revisit at the first real user, the first payment, or when a third person joins.

**History (Pass 4, 2026-10-08)**: absorbed F-OPS-002 (same page, same owner action list). Dropped the 'own login' advice (conflicts with the accepted shared login). Tie-break for cross-subject merges: the earlier-created finding survives, so evidence and history stay together.

**History (2026-10-08, later)**: Owner decision (RECOLLECTION: "not really worried about two factor authentication either"): two-factor setup is declined for now. Recorded as accepted residual risk alongside the shared login. Revisit at the first real user's data, the first payment, or when a third person joins.

**History (Pass 4b, 2026-10-08)**: Recommendation rewritten to carry the merged F-OPS-002 content (incident steps, kill switches, status-page subscriptions) and to drop the 'own login' advice; History pronoun and superseded note fixed (contradiction 3).

---

### F-SEC-008 The API body-size cap measures characters after fully buffering the body

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | High (READ) |
| Timing | Trigger: first write endpoint with a user-supplied payload larger than a few KB |
| Disposition | IMPROVE |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S |

**Evidence** (READ): `handler.ts:57-63`: `const text = await request.text(); if (text.length > MAX_BODY_BYTES) ...` with `MAX_BODY_BYTES = 100_000`. The limit is compared to UTF-16 code units after the entire body has been read; a body of up to the platform limit (Vercel documents about 4.5 MB for functions, INFER) is buffered before rejection. The docs and the constant name say "bytes".

**Observation**: The cap protects parsing, not memory, and the name does not match what is measured.

**Consequence**: Small, bounded by the platform limit; matters mainly with F-SEC-006 if no throttle exists.

**Recommendation**: Check `Content-Length` before reading and compare the byte length of the text with `TextEncoder`; rename or comment accordingly.

**Alternatives and tradeoffs**: Streaming read with an early abort is more exact and more code; not needed for a 100 KB cap.

**Affects**: `apps/web/lib/api/handler.ts`, its tests.

**Depends on / sequencing**: None.

**Verification**: A test posts a body whose character count is under the cap and whose UTF-8 byte count is over it and gets `400`; a request with a declared oversized `Content-Length` is rejected before reading.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-06 created (new).

---

### F-SEC-009 Server boundary, environment guards, and error redaction

KEEP. Evidence (READ, RUN): identity comes only from `auth()` through `getUserId()` with no argument (`lib/auth/server.ts`); the API adapter authenticates before parsing, maps every failure to the shared envelope, never echoes input or driver text, and reports only the error class (`report.ts`); `getServerEnv`, `getDb`, the composition root are lazy and `server-only`; `parseServerEnv` refuses a prod/non-prod mismatch, prod on a non-production Vercel deployment, Preview not on `qa`, and a live Clerk key outside prod (27 unit tests, 39 in the package, all passing at the baseline); destructive tooling fails closed with an explicit `--env`. `getDb()` has one call site outside `db/` (the composition root); no client bundle imports server env. Why it is sound: each property has a code mechanism and a test, not only prose. Tripwire: the text-scan tests do not follow transitive imports (documented), and `server-only` covers web but not mobile; revisit when mobile gains real code or when a second composition root appears.

### F-SEC-010 Repository history contains no credentials; secret scanning and push protection are on

KEEP. Evidence (RUN 2026-10-06, CONSOLE): scan of all added and removed lines on all refs (122 commits) for key-shaped tokens and every credentialed-URL shape found only placeholder-shaped values and fake test fixtures; no `.env` file was ever tracked; GitHub secret scanning and push protection are enabled with 0 open alerts. The two commits that removed a "credentialed URL" from `docs/notes.md` removed a placeholder-shaped string. Why it is sound: layered prevention (gitignore, the repository's secret-shape test, GitHub push protection) plus a clean history. Tripwire: the repository is public, so a single leaked value is permanent; the scan used pattern shapes, not an entropy scan, and a secret that looks like a placeholder would pass. A one-time run of an entropy scanner over history is a cheap confirmation if Rich wants certainty before real data; otherwise no action.

### F-SEC-011 Preview deployments are behind Vercel Authentication

KEEP. Evidence (CONSOLE, 2026-10-06): unauthenticated requests to the Preview URL for the page, `/api/v1/status`, `/api/v1/proof-items`, and `/admin` all received `302` to Vercel's SSO. Why it is sound: previews run against the `qa` database with development Clerk keys and mock UI; keeping them private limits exposure of unreleased work and of the Preview-only API. Consequence worth knowing: reviewing a Preview requires a Vercel login on the reviewing device. Tripwire: Production protection and the domain are U-21; if Preview protection is ever disabled for convenience, F-SEC-005 and F-SEC-006 rise in severity because Previews serve the real API against the `qa` database.

## Lens matrix

| Lens | Result |
| --- | --- |
| L1 Drift | F-SEC-004 (security.md "no known vulnerabilities" stale), F-SEC-002 (`issues.md` allow-list vs `claude.yml`, C-52, owned by DEVOS), C-12 and C-29 (docs claim a test or job that does not do what is said). |
| L2 Enforcement | F-SEC-001, F-SEC-002 (rules that exist only as prose), F-SEC-009 (rules that are enforced). The static tests are tripwires, not boundaries; the workflow-safety test regex misses wildcards (F-SEC-002); platform-specific false failures belong to TEST (carry-forward). |
| L3 Adversary | F-SEC-001, F-SEC-002 (injection, compromised token), F-SEC-005 (browser-side), F-SEC-006 (scraping and abuse). Malicious privileged insider: no second insider exists; covered by F-SEC-007 and AUTH (pending). |
| L4 Failure and recovery | F-SEC-007 (credential leak, lockout); data restore belongs to DATA; outage handling to OPS. |
| L5 Scale and cost | F-SEC-006 (cost of unthrottled traffic), F-SEC-008. |
| L6 Longevity | F-SEC-004 (unmonitored dependencies rot), F-SEC-007 (single owner, institutional memory). |
| L7 Compatibility | Examined, nothing material: the bearer-token path for mobile is the same `getUserId()`; token verification end to end is unexercised (AUTH, ARCH). |
| L8 Simplicity | F-SEC-001 (zero required approvals; no second reviewer theater), F-SEC-004 (non-blocking audit, no gitleaks, no CodeQL/SBOM yet), F-SEC-005 (headers now, CSP later), F-SEC-006 (platform rule, no new vendor). Rejected: Upstash limiter, secrets manager, entropy tooling in CI. |
| L9 Boilerplate fit | F-SEC-001, F-SEC-003, F-SEC-004, F-SEC-005 belong in every generated app (ruleset JSON, dependabot config, headers block, Actions defaults checklist); F-SEC-002 changes the inherited workflow; F-SEC-006 and F-SEC-007 are triggered or documentation-only. |

## Carry-forward to other subjects

* **TEST**: `security.test.ts` fails on Windows (separator in exemption regexes); workflow-safety assertions miss wildcard merge rights; text scans do not follow imports (P-SEC-08, P-78-O06).
* **DEVOS**: `issues.md` requires `git merge`/`git merge-base` in the allow-list, which `claude.yml` lacks (C-52); Claude Code Review runs green on every PR but leaves no visible comments (review control may not exist in practice); seven PRs merged on a failing check (process side of F-SEC-001).
* **AUTH**: `/admin` lets any signed-in user into the mock admin; production would expose mock admin pages to every signed-in user (static fictional data only); webhook handling for identity sync is unbuilt.
* **CODE**: unused `cn` direct dependency (hygiene only; not a supply-chain issue); `shadcn` CLI as a runtime dependency (F-SEC-004a).
* **DATA**: least-privilege roles (U-05, U-09); `NEON_DEV_DATABASE_URL` scope (U-15).
* **REL / OPS**: deploy-on-merge (U-01); Production deployment protection and domain (U-21); logging and monitoring; cost alerts (U-18).
