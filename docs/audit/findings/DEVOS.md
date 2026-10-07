# DEVOS: Development Operating System

Examined 2026-10-06 (Pass 2) at baseline `31ec6ba` (`main` had not moved; `git rev-parse origin/main` equals the recorded baseline). Depth: Deep. Home for: `/CLAUDE.md` and `/docs` (volume, drift, duplication, authority); issue and PR workflow mechanics versus observed behavior; review discipline and independence; AI-agent governance; Definition of Ready and Done; institutional memory; standards governance (`methodology.md` section 4).

## Method note

Evidence was gathered before the prior-input rows for DEVOS were re-read (`inputs-reconciliation.md`). Read in full: `CLAUDE.md` (as loaded and on disk), `docs/issues.md`, `git-workflow.md`, `product-development.md`, `boilerplate.md`, `notes.md`, `.github/workflows/*.yml`. Searched (read-only): every `/docs/*.md` reference in `CLAUDE.md`, `README.md` and `docs/**` for broken targets and coverage; the stale-phrase set ("currently empty", "not built", "not installed", "planned", "no tables"); rule duplication counts; the repository for `.claude/`, issue and PR templates, `CODEOWNERS`, `SECURITY.md`, `CONTRIBUTING.md`, `LICENSE`; first-parent diff size of every merge (`git log --first-parent -m --shortstat`); authorship counts. Read from the CI tooling for this PR: the failed `Validate` job log and the `claude-review` job log of the run on the audit branch head. Toolchain probe in this job: `which pnpm`.

Not examined, and why: the **bodies of the 41 GitHub issues** (Definition of Ready evidence) and the PR-head check state of the seven red merges. `gh` and web fetch were not permitted in this session, so these were recorded as pending verification (U-24, and the DoR half of P-CH-03), not inferred. Both were read on 2026-10-07: see F-DEVOS-002 History (U-24) and F-DEVOS-010 (issue bodies). No finding below depends on them.

New facts established in this pass, not in Pass 1 (also in `progress.md`):

* **CI on this audit PR is red.** The `Validate` job on the audit branch head (run `37534967908`) fails at `pnpm validate`, step `test:boilerplate`: 3 of 6 tests fail because `docs/audit/` (baseline files and `findings/SEC.md`) contains "Signal One" and proof-slice terms that the init leak check refuses. The same suite is green at the baseline `31ec6ba`. This is exactly the leak recorded as Q-002, now with a visible consequence (RUN).
* **The Claude Code Review job on the same head** (run `37534967919`) finished "success" in about 21 s of job time; the model run itself reported 3 turns, 4.5 s, about $0.07, 0 permission denials; the step "Post buffered inline comments" reported "No buffered inline comments". A 1,818-line diff was reviewed in three turns with no visible output (RUN). The PR is docs-only, so a legitimate skip is possible; the five code PRs (#67 to #77) in `baseline/history.md` show the same silence.
* **The agent job cannot run the documented validation as shipped.** In this Claude job, `pnpm` is not on `PATH`, no `node_modules` exists, and `claude.yml` has no setup or install step (RUN, READ). `docs/notes.md` (Issue 76) records the same condition from an earlier job: "`pnpm` is not on PATH in this sandbox", validated with `npx`, root `pnpm validate` and `test:boilerplate` not run.
* The repository has **no** `.claude/` directory (so no project settings, hooks, or `/commit` command), no issue or PR templates, no `CODEOWNERS`, no `SECURITY.md`, no `CONTRIBUTING.md`, and **no `LICENSE`** although the repository is public (Glob).
* Required reading as defined by `CLAUDE.md` section 3 (`CLAUDE.md` plus the 19 named documents that exist): 254,047 bytes, 6,575 lines, about 63,000 tokens (INFER at 4 bytes per token). All non-audit docs: 368,000 bytes, 8,039 lines. 67 commits touched docs or `CLAUDE.md` in nine days (2026-09-30 to 2026-10-06).
* Merge sizes (first-parent diffs): 8 of the 38 PRs add more than 1,000 lines (#77 2,118; #73 1,336; #67 2,450; #62 1,026; #50 1,863; #41 4,245; #20 1,260; #12 1,037); the median PR lifetime is 5 minutes (`baseline/history.md`). Per-PR lifetime and size were not joined (no per-PR timestamps in this session), so "large PRs merged in minutes" is not asserted for any one PR.

## Findings

### F-DEVOS-001 Neither review step leaves evidence: the automated reviewer is silent and human review is untraceable

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Medium |
| Confidence | Medium (silence is RUN for one run and CONSOLE history for five; the cause is INFER) |
| Timing | Now |
| Disposition | IMPROVE |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S |

**Evidence**: `claude-code-review.yml:35-44` (READ): the job runs `/code-review:code-review --comment <PR>` with `--allowedTools "mcp__github_inline_comment__create_inline_comment"` only, and `pull-requests: read`. Run `37534967919` (RUN, above): 3 turns, 4.5 s, 0 denials, no comments on a 1,818-line diff. `baseline/history.md` (CONSOLE): 31 successful runs, 3 failed, and 0 inline comments or reviews on #67, #69, #73, #75, #77; 0 of 38 PRs have any submitted review; merges were the owner's alone. Docs that treat review as a control: `issues.md:28` ("Fixes for failing CI, Claude Review findings, or Rich's review feedback"), `product-development.md` pipeline ("PR Review"), `git-workflow.md` section 11 ("Human reviews").

**Observation**: The plugin reads the PR with `gh` subcommands and, when it finds nothing, reports that with a PR comment; the workflow grants neither (INFER from the plugin's design and the vendor's published example for it, which the audit could not re-read in this session; confirm against the current vendor documentation). The result is a job that is green whether it found nothing, could not read the PR, or could not post. A green check that cannot be told apart from "did not run" gives false assurance. The human step is the only other review, and it leaves no trace either (no review objects; U-19 asks whether Previews were opened). The automated reviewer is also the same model family as the implementer, so it is a lint-grade second look, not independent review (`phase-0-critique.md` 3.3).

**Consequence**: The owner merges a large agent PR within minutes believing a review happened. A defect in the first real authorization rule, or injected text in a PR (F-SEC-002), passes both gates unobserved. Today the code is mock UI plus a proof slice, hence Medium.

**Recommendation**: Decide Q-008, then do one of two things, not neither. (A) Repair: grant the reviewer the minimum it needs (read the PR diff and metadata, post one summary comment and inline comments), then prove it with a seeded-defect PR; a clean PR must also produce a visible "reviewed, nothing found" signal. (B) Remove `claude-code-review.yml` and the three doc references that presuppose it. In both cases state in `issues.md` that the automated review is an aid and not an independent control. Do not add a required human approval (F-SEC-001 rationale: a team of one cannot approve their own PR).

**Alternatives and tradeoffs**: Keep as is: costs about $0.07 per PR and teaches the owner to ignore it. A second model as reviewer (Q-004) buys real independence at a vendor and a secret; not recommended before real data. Cost of (A): one workflow edit (human-only) and tokens per PR, larger than the idle run today; bounded by the diff.

**Affects**: `.github/workflows/claude-code-review.yml`, `docs/issues.md`, `docs/product-development.md`, `docs/git-workflow.md`; inherited by every generated app (the workflow is listed as Optional in `boilerplate.md`).

**Depends on / sequencing**: Q-008. Pair with F-SEC-002 (allow-list and pinning edits to the same file family). The workflow edit is human-only.

**Verification**: A throwaway PR containing one obvious defect gets at least one visible comment; a PR with none gets a visible clean signal; `issues.md` calls the review an aid; or the workflow and its references are gone.

**Decisions needed**: Q-008.

**Challenge log**: (Pass 4)

**History**: 2026-10-06 created (Pass 2). Confirms the SEC carry-forward ("Claude Code Review runs green but leaves no visible comments") with a log-level observation and narrows the claim: silence is indistinguishable from "found nothing", which is the defect; the audit does not claim the reviewer would miss a defect.

---

### F-DEVOS-002 The documented validation cannot run in the agent job, and red CI is not a stop signal

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Medium |
| Confidence | Medium (the environment facts are RUN and READ; U-24 examined 2026-10-07: the seven red merges were red at the PR head) |
| Timing | Now |
| Disposition | IMPROVE |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S |

**Evidence**: `claude.yml:33-50` (READ): checkout and the action only; no `corepack enable`, no install. `which pnpm` (RUN): not found; `corepack` and Node 22 present; no `node_modules`. `docs/notes.md` (READ): validation by `npx`, root `pnpm validate` and `test:boilerplate` "NOT run". `git-workflow.md` section 15 requires validation before a PR; `issues.md:59` ("Validation in the Claude job") concedes "if the sandbox prevents it, Claude states that ... and relies on CI". CONSOLE (`baseline/history.md`): `Validate` failed on the merge commit of #32, #33, #34, #40, #56, #58, #59, was cancelled on #67; 14 of 58 CI runs failed. Branch-name timestamps (READ): issue branches 23, 25 to 28 were created 06:28 to 06:35 and 35 to 38 at 12:28 to 12:33 on 2026-10-01, i.e. two parallel batches; 4 of those 8 CI-era PRs (#32, #33, #34, #40) are among the red merges, against 3 of the other 19 (#56, #58, #59). Small n, INFER. Owner machine: `pnpm validate` is red on the baseline on Windows for platform reasons (`progress.md` facts 16 and 19), so a local run cannot be the gate either.

**Observation**: The agent's loop is "edit, partially validate with `npx`, push, find out in CI". Because the full gate (which includes the repository's security, boundary and boilerplate tripwires) only runs on GitHub after the push, and nothing blocks a merge on red, a red `Validate` is information the owner may or may not act on. Two mechanisms were hypothesised for the seven red merges: PRs red at their head, and parallel PRs green alone and red together (merge skew). U-24 (answered 2026-10-07, CONSOLE) settles it: all seven were red at the PR head, so these seven are not merge skew. Merge skew remains possible in principle but is not evidenced. The `issues.md` orchestrator rule (re-check before each merge; update and revalidate other open PRs after a merge) is exactly the control for merge skew, and is prose.

**Consequence**: A tripwire failure (a secret-shape hit, a boundary violation, a migration guard) merges because red is easy to dismiss. This audit's own PR is a live example: it is red for a reason the audit predicted (Q-002), and the Windows-only failures recorded in Phase 0 and Pass 1 hid that the Linux result for the audit's own files would be red.

**Recommendation**: (1) Make the agent able to run the CI gate: either add `corepack enable` plus `pnpm install --frozen-lockfile` steps to `claude.yml` (human edit), or document `corepack pnpm install --frozen-lockfile` and `corepack pnpm validate` as the agent's commands and keep exactly those in the narrowed allow-list (F-SEC-002). Prefer the workflow step: it caches and keeps the allow-list short. Remove `DATABASE_URL` first (F-SEC-002, Q-007), because `validate` needs no database. (2) Make red a technical stop: the `Validate` required check in F-SEC-001, plus the ruleset option "require branches to be up to date before merging", which enforces the documented merge-skew rule for parallel PRs at the cost of one "Update branch" click each. (3) Hand the Windows false failures to TEST so a red local run means something. (4) For PR #82: Q-002 decides how the audit directory stops tripping the leak check.

**Alternatives and tradeoffs**: A merge queue is more machinery than one owner needs. Serializing all work removes the skew but costs the parallel batches that the history shows are actually used (P-78-O03 rejected). Doing nothing keeps the audit's own tripwires advisory.

**Affects**: `.github/workflows/claude.yml`, GitHub ruleset (F-SEC-001), `docs/issues.md`, `docs/git-workflow.md` section 15, `docs/testing.md`.

**Depends on / sequencing**: After Q-007 and F-SEC-002 narrowing (same file); the ruleset belongs with F-SEC-001. U-24 refines the diagnosis and is not a blocker.

**Verification**: A Claude job on a throwaway issue runs the same command as CI and reports its real result; a PR with a failing `Validate` cannot be merged; two parallel PRs cannot merge without the second being brought up to date; `docs/issues.md` no longer needs the "if the sandbox prevents it" sentence.

**Decisions needed**: Q-007 (existing), Q-002 (existing).

**Challenge log**: (Pass 4)

**History**: 2026-10-06 created. Modifies the SEC carry-forward "seven PRs merged on a failing check": the data show the *merge commit* red, not that each PR was red when merged; part may be merge skew. The process side of F-SEC-001 stands, with a sharper cause.

**History (2026-10-07)**: U-24 answered. 7 of the 30 PRs with a head `Validate` result (23%) merged red at the head (#32, #33, #34, #40, #56, #58, #59); #67 merged with a cancelled run; 22 were green. The `Protect main` ruleset (required `Validate`, 0 approvals, up-to-date requirement off) now blocks a red merge, so recommendation (2) is applied for red-at-head. The up-to-date requirement is deliberately off. The agent-job validation gap (recommendation 1) is unchanged.
---

### F-DEVOS-003 Documentation drift is systemic: the rules are long, partly duplicated, partly stale, and unindexed

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Medium |
| Confidence | High (READ and RUN greps; the cost to a model run is INFER) |
| Timing | Now |
| Disposition | IMPROVE |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | M |

**Evidence**:

1. *Live contradictions of code or history* (claims ledger, all READ): C-08 (`auth.md` appendix omits `/admin`), C-14 (`security.md` "no known vulnerabilities"), C-22 and `boilerplate.md:93` (`deployment.md:96` "Planned, not built" for a workflow that exists), C-25 (`testing.md:52` "not yet installed"), C-29 (`testing.md` names a job that does not exist), C-46 (`shared-code.md:78` and `mobile.md:41` call `api.md` "empty"; it is 119 lines), C-49 (`web.md:12,14` "no tables", packages "not yet imported"), C-50 (`auth.md` appendix names a component that is gone), C-52 (F-DEVOS-004).
2. *New in this pass* (READ, Glob): `CLAUDE.md:66` says "Not all of these documents may exist yet" while all but two exist and those two are empty by design; the required-reading list omits `security.md`, `environment.md`, `services.md`, `stack.md` and `automation/`, which other docs call authoritative. `git-workflow.md:127,403` define a `/commit` command; the repository has no `.claude/` directory, so no such command exists. `git-workflow.md:181,228` have Claude creating the PR; `issues.md:26` has the owner clicking "Create a PR", and 36 of 38 PRs are authored by the owner's account. `git-workflow.md` section 1 and `deployment.md:96` state protection and required checks that do not exist (C-17, C-56).
3. *Trap*: `CLAUDE.md:70` says an empty or missing document must not be read as containing rules. A reader who follows `shared-code.md:78` ("`/docs/api.md`, currently empty") concludes there are no API rules, and the rule says not to invent any. A rule meant to prevent invention turns a stale sentence into a wrong decision.
4. *Volume*: required reading is about 63,000 tokens; 26 of the 67 recent doc commits landed on 2026-10-05 and 2026-10-06 alone (`git log` counts by day 09-30 to 10-06: 3, 38, 18, 8). Rule duplication: "Claude never merges" appears in `CLAUDE.md`, `git-workflow.md` (4), `issues.md` (4), `stack.md` (2), `new-app-setup.md`; "one issue, one branch, one PR" in 8 files; "never claim CI passed" in 4. The duplication is real but modest; most volume (`architecture-rules.md` 1,100 lines, `data-mutations.md` 908, `database.md` 648) is rule content for features not yet built, not restatement.
5. *No tripwire*: no test asserts that any doc exists or is non-empty (the only tests that read docs are `security.test.ts` and the boilerplate self-test). Truncating `architecture-rules.md` to empty would pass CI and, under `CLAUDE.md:70`, delete its rules.
6. The audit directory adds 1,818 lines and growing to `docs/`, about 23% on top of the 8,039 (the PR diff at the SEC commit).

**Observation**: The drift is concentrated in documents written before the code they describe matured (foundation docs of 2026-09-28 to 2026-10-01) and in sentences that describe state ("not yet", "currently", "planned"), not rules. Rules that claim a mechanism ("protected", "enforced", "required") are the dangerous ones, because the sentence reads as a control. `CLAUDE.md` section 19 and `product-development.md` section 10 call drift a defect to be fixed in the same work; the ledger shows the practice did not hold (C-68).

**Consequence**: A model run, or a new engineer, acts on a stale sentence (3) or believes a control exists that does not (2); a truncated rules file passes CI (5). Cost per agent run is about 63,000 tokens of required reading with no map of which part applies; the instruction is therefore either skipped or expensive.

**Recommendation**: (1) One documentation-reconciliation slice (its own issue) fixes every item in 1 and 2, preferring deletion of state sentences over rewording ("no tables are defined yet" is removed, not updated). (2) Replace "read the relevant documentation" in `CLAUDE.md` section 3 with a short task-to-document map (for each kind of work, the one to three documents to read first), and list the omitted authoritative documents. (3) Any sentence claiming "enforced", "protected", "required" or "refuses" names its mechanism (a test file or a console setting) or says "convention, not enforced". (4) Add one small tripwire test: every `/docs/*.md` path referenced from `CLAUDE.md` exists, and is non-empty unless it is on an explicit allow-list (`routing.md`, `server-components.md`). (5) Do not run a repository-wide consolidation now (P-78-B's remedy); revisit volume after (1) to (4). (6) After Pass 5, move `docs/audit/` out of the path the rules point agents at, or archive it (Q-002 covers the boilerplate side).

**Alternatives and tradeoffs**: Generating docs from code or tests: large, and most rules are prose by nature (rejected). Per-file "last verified" front matter: ceremony that decays the same way (rejected). ADRs for every rule change: not needed for one decision-maker (P-CH-20 handled here by (3) and (4)). Cost: (1) is a few hours of reading; (4) is about 25 lines.

**Affects**: `CLAUDE.md`, `docs/{auth,security,testing,deployment,boilerplate,web,shared-code,mobile,git-workflow,issues}.md`, a new test, the boilerplate (all inherited).

**Depends on / sequencing**: (1) after F-DEVOS-004 (the allow-list wording) and F-SEC-001 (so "protected" sentences become true or are removed); (4) any time.

**Verification**: The ledger rows C-08, C-14, C-22, C-25, C-29, C-46, C-49, C-50 change to Proven; `grep` for the stale phrases in section 1 finds none; the new test fails when a referenced doc is deleted or emptied; `CLAUDE.md` section 3 contains the map.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-06 created. Challenges issue 78's "docs describe a different repository" (P-78-A): about 11 specific stale points in about 7 documents, against 31 ledger claims proven and 13 partial; the problem is systemic in mechanism, not in extent. Narrows P-78-B's remedy.

---

### F-DEVOS-004 The documented allow-list rule is self-contradictory and out of step with the workflow

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | High (READ) |
| Timing | Now |
| Disposition | IMPROVE |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S |

**Evidence** (READ): `issues.md:96` requires `claude.yml` to keep `gh pr *` and `git merge` and `git merge-base`, and in the same sentence forbids `gh pr merge`; `gh pr *` includes `gh pr merge`. `claude.yml:50` has `Bash(gh pr *)` and neither `git merge` nor `git merge-base`. `issues.md:55` and `git-workflow.md:155` rely on `git merge origin/main`. `security.test.ts` checks the literal string `gh pr merge` only (C-12).

**Observation**: The rule cannot be satisfied as written, and the workflow satisfies its dangerous half (the wildcard) and omits its safe half (the local merge). The documented "incorporate main" procedure therefore cannot run in the action.

**Consequence**: "@claude merge latest main into this branch" fails or is worked around; meanwhile the forbidden PR-merge command remains permitted by the very sentence that forbids it.

**Recommendation**: Resolve it by listing exact commands in `issues.md` instead of wildcards, matching F-SEC-002: read-only `gh pr` subcommands, exact validation commands, and `git merge:*` and `git merge-base:*` **granted**. This supersedes the wording of F-SEC-002 point 5. The grant is low risk: `git merge` changes only the local checkout, and publishing still goes through the push helper that accepts only the current run's branch with no flags (`issues.md:22`, vendor behavior, C-53 unverified). The alternative (drop the procedure and use GitHub's "Update branch" button) cannot resolve conflicts and still needs the grant for those.

**Alternatives and tradeoffs**: Keep the doc and the workflow as they are: the contradiction stays and the procedure stays broken.

**Affects**: `docs/issues.md`, `docs/git-workflow.md` section 8, `.github/workflows/claude.yml` (human edit), `security.test.ts`.

**Depends on / sequencing**: Same edit as F-SEC-002 (2), (5), (6); do together.

**Verification**: Doc entries and workflow entries match one to one (F-SEC-002 point 6 test); on a throwaway PR, "@claude merge latest main" completes and pushes.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-06 created. Resolves the point SEC deferred to DEVOS (C-52): align the workflow to the documented procedure, with exact patterns.

---

### F-DEVOS-005 `docs/notes.md` is a shared mutable file that duplicates GitHub and goes stale at merge

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | High (READ, git history) |
| Timing | Now |
| Disposition | REMOVE |
| Scope | BOTH |
| Trigger class | Overengineering now |
| Effort | S |

**Evidence**: `issues.md:5,112` (READ): optional, overwritten, "never a status log". `docs/notes.md` on `main` (38 lines) holds Issue 76's validation results ("Run and passing: `vitest run` (171 tests) ...") and "Do not merge before Rich's review", both discoverable on GitHub and wrong once merged. `git log -- docs/notes.md`: the last three merges (#73, #75, #77) each rewrote it, and it is the file from which two commits removed a placeholder-shaped string that tripped the secret-shape test (F-SEC-010). `product-development.md` section 8 tells every feature slice to put manual review steps in the PR conversation "or `docs/notes.md` if used". `issues.md` "Parallel work" requires comparing shared docs before starting parallel issues; one file that every slice rewrites defeats that.

**Observation**: The file exists to carry non-discoverable information (omissions, open questions, manual steps), which the same documents say belongs preferably in the PR description. In practice the repository's single shared path is used per slice, so it is both a merge-conflict magnet for parallel work and a stale-instruction carrier on `main`.

**Consequence**: Low: a stale merge instruction on `main`, occasional conflicts. The unresolved product questions inside it (P-NOTES-01) are the valuable part and are at risk of being overwritten.

**Recommendation**: Stop using `docs/notes.md`: manual review steps and omissions go in the PR description; unresolved product questions go to `docs/product/roadmap.md` or a feature spec (REQ decides). Preserve the Issue 76 questions first. Update `issues.md`, `product-development.md`, `new-app-setup.md` and the init reset step (BOIL).

**Alternatives and tradeoffs**: Keep as optional: costs nothing but the drift above. Per-issue notes files: more files, same staleness.

**Affects**: `docs/notes.md`, `issues.md`, `product-development.md`, `new-app-setup.md`, `scripts/boilerplate/*` references.

**Depends on / sequencing**: After REQ takes the open questions (P-NOTES-01).

**Verification**: No document refers to `notes.md`; the file is gone or a one-line pointer; the unresolved questions exist in their new home.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-06 created (new; the Phase 0 reading of `notes.md` recorded it as optional and did not examine its use).

---

### F-DEVOS-006 Agent runs have no concurrency control

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | Medium (READ; the harm is INFER, not observed) |
| Timing | Now |
| Disposition | ADD |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S |

**Evidence**: `claude.yml` and `ci.yml` (READ): no `concurrency:` key. The trigger fires on every comment containing `@claude`, including from a phone, and `issues.md` "Normal lifecycle" encourages several follow-ups per PR.

**Observation**: Two quick comments start two jobs on one branch. Both push through a no-force helper, so the second push can be rejected (non-fast-forward) or redo work already done. Not observed in history; plausible with phone use.

**Consequence**: Wasted runs, rejected pushes, occasionally duplicated or conflicting commits on the canonical branch. Low.

**Recommendation**: Add a per-PR or per-issue `concurrency` group to `claude.yml` with `cancel-in-progress: false` (queue, never kill a run mid-push). Optionally cancel superseded `ci.yml` runs for pull requests only, never for `main`.

**Alternatives and tradeoffs**: `cancel-in-progress: true` for the Claude job risks cancelling a run between commit and push; rejected.

**Affects**: `.github/workflows/claude.yml`, optionally `ci.yml` (human edits).

**Depends on / sequencing**: Same edit window as F-SEC-002 and F-DEVOS-002.

**Verification**: Two `@claude` comments in succession on a throwaway PR run one after the other.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-06 created (new).

---

### F-DEVOS-007 Risk-based gates by path (workflows, migrations, authorization)

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | Medium |
| Timing | Trigger: first product migration or first role-based feature |
| Disposition | DEFER |
| Scope | BOTH |
| Trigger class | Maturity |
| Effort | S to M |

**Evidence**: `ci.yml` is one job for every change; there is no `CODEOWNERS`; `drizzle/` currently holds two proof migrations; no authorization rules exist (C-09). The App already cannot edit workflows (C-65).

**Observation**: Every change gets the same gate and the same one-person review. That is right while the product is mock UI. When the first product migration or authorization rule lands, those paths deserve a distinct, explicit check.

**Consequence**: None today. Later, a migration or authorization change reviewed as casually as a mock page.

**Recommendation**: At the trigger, add a ruleset path rule or `CODEOWNERS` entry (self-owned is fine) for `apps/web/drizzle/**`, `apps/web/lib/auth/**`, and `.github/workflows/**`, and extend the PR description with a migration and authorization checklist. DATA and AUTH define the checklist contents. Do not build it now.

**Alternatives and tradeoffs**: A second reviewer: none exists (rejected). Doing it now: speculative.

**Affects**: GitHub ruleset, `CODEOWNERS`, `docs/database.md`, `docs/auth.md`.

**Depends on / sequencing**: DATA and AUTH findings; F-SEC-001 (ruleset exists first).

**Verification**: At the trigger: a PR touching a gated path shows the extra requirement.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-06 created. Absorbs P-CH-04 (risk-based gates) as deferred; the general gate is F-SEC-001 and F-DEVOS-002.

---

### F-DEVOS-010 Issues have no template or shared structure, so "ready to build" is a convention of the author

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | Medium (counts are RUN over all issue bodies; whether each issue was clear enough to build from is a judgement not made here) |
| Timing | Now |
| Disposition | IMPROVE |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S |

**Evidence**: `gh issue list --state all` (CONSOLE, 2026-10-07): 45 issues (43 closed, 2 open). Median body about 3,800 characters (about 4,300 for issues 60 and later), so the issues are substantial. Only 9 of 45 mention acceptance criteria, "done when", success criteria or a definition of done; 13 mention scope or non-goals; 5 early issues (#2, #4, #9, #15, #16) have bodies under 40 characters. Headings are free-form (Goal 6, Testing 4, Scope 3, Validation 3, Completion criteria 2). No issue or PR template exists (Phase 0 fact 23). `docs/product-development.md` expects acceptance criteria to be finalised for product features but names no minimum for an issue.

**Observation**: The issues are long and mostly good, but each author invents the structure. Acceptance criteria, scope boundaries and "how will this be verified" appear when the author remembers them. That is workable while one owner and one agent write every issue, and it breaks the first time another author or a fresh agent session picks one up.

**Consequence**: A fresh agent session or reviewer cannot tell from the issue alone whether it is ready or what "done" means; the PR template and review step have nothing to check against. Low today.

**Recommendation**: Add a short issue template and a PR template (`.github/ISSUE_TEMPLATE/`, `.github/pull_request_template.md`) with five prompts: goal, scope and non-goals, acceptance criteria, how it will be verified, and affected docs. Do not add a longer process. Fold the Definition of Ready into `docs/issues.md` as one paragraph that points at the template.

**Alternatives and tradeoffs**: Leave as is (cheapest; fine for one author). A heavier checklist (rejected: weight is already right-sized, F-DEVOS-009).

**Affects**: `.github/ISSUE_TEMPLATE/`, `.github/pull_request_template.md`, `docs/issues.md`.

**Depends on / sequencing**: None. Workflow files are not touched, so it can ship any time.

**Verification**: A new issue and PR show the template; `docs/issues.md` states the Definition of Ready in one place.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-07 created from the issue-body read that Pass 2 DEVOS could not do. Closes the Definition-of-Ready half of P-CH-03.

---

### F-DEVOS-008 Human-only merge, one PR per issue, and GitHub-first handoff are followed in practice

KEEP. Evidence (CONSOLE, READ): all 38 merges were performed by the owner and none by the App or a workflow; one PR per issue held in every case (the revert pair #58/#59 is the only exception and is intended); the canonical-branch rule is applied on this very PR (all four audit commits are on one branch, no second branch was created); non-discoverable information is directed to PR conversations and permanent docs by `issues.md`; unresolved product terms are asked about and not invented (`naming-conventions.md`, `notes.md`). Why it is sound: the behaviors are simple and cheap, and history confirms them. Tripwire: they are conventions, not controls (F-SEC-001, F-SEC-002); the verdict changes the day a second contributor, a second automation, or a token with merge rights exists.

### F-DEVOS-009 Process weight is right-sized for a team of one, and parallel work is genuinely used

KEEP. Evidence (READ, Glob, git): there is no `CODEOWNERS`, no PR or issue template, no required-approver rule, no ADR system, and no committee; the orchestrator rule in `issues.md` is seven short bullets, and the history shows two real parallel batches on 2026-10-01 (issue branches 23, 25 to 28 within seven minutes, then 35 to 38 within five), so the parallel-work rules govern real behavior. Why it is sound: the weight is in documentation volume (F-DEVOS-003), not in meetings or artifacts. Rejected as a default: "sequential unless proven independent" (P-78-O03), because the batches are the owner's actual throughput. Tripwire: if a second human or a bot starts proposing PRs, revisit templates and `CODEOWNERS` (F-DEVOS-007).

## Challenges to prior conclusions

* **Phase 0 and Pass 1, "audit docs introduce no offender" / "all gate failures are Windows-only"** (`progress.md` facts 16, 19; `inventory.md` section 7): true of the baseline, false of the audit branch. On Linux CI the audit directory breaks `test:boilerplate` (RUN, run `37534967908`). The Windows failures masked this because the local run stopped earlier. Q-002 therefore **does** block something: a green check on PR #82. Corrected in `decisions-needed.md` and `progress.md`.
* **P-78-A "docs describe a different repository"**: modified (extent, not mechanism): see F-DEVOS-003.
* **P-78-B "~7,800 lines restating each other; consolidate"**: the size is right (8,039 non-audit lines); the restatement is modest; the remedy (consolidate) is rejected for now in favor of targeted fixes.
* **P-78-O03 "default to sequential"**: rejected; parallel batches are real. The better control is the up-to-date requirement (F-DEVOS-002).
* **SEC carry-forward "seven PRs merged on a failing check"**: narrowed, see F-DEVOS-002 History; U-24 verifies.
* **SEC carry-forward "review control may not exist in practice"**: confirmed and sharpened, see F-DEVOS-001.
* **Calibration**: no DEVOS finding is High. The High-severity process failures (no technical merge gate, agent concentration) already live in F-SEC-001 and F-SEC-002; DEVOS findings would be fixed by different, cheaper changes, so they are not merged into them.

## Lens matrix

| Lens | Result |
| --- | --- |
| L1 Drift | F-DEVOS-003 (systemic; ledger C-08, C-14, C-22, C-25, C-29, C-46, C-49, C-50 and new items), F-DEVOS-004 (C-52), F-DEVOS-005 (stale notes). |
| L2 Enforcement | F-DEVOS-001 (review exists only as a green check with no signal), F-DEVOS-002 (red is advisory; merge-skew rule is prose), F-DEVOS-003 (rules claiming enforcement name no mechanism; no doc-existence tripwire), F-DEVOS-008 (rules that are followed but not enforced). |
| L3 Adversary | F-SEC-001 and F-SEC-002 own the attack paths. DEVOS adds: the rules the agent follows are loaded from the checked-out branch, so a merged edit to `CLAUDE.md` changes agent behavior; the only gate on that edit is the unprotected merge. No separate finding (covered by F-SEC-001). |
| L4 Failure and recovery | F-DEVOS-002 (red detection after push), F-DEVOS-006 (double runs). Recovery by revert is demonstrated once (#58 reverted by #59, four days, itself merged red); the foundation tag is a restore point but is not protected (C-57, SEC). |
| L5 Scale and cost | F-DEVOS-001 (about $0.07 per idle review run; real review costs scale with diff), F-DEVOS-003 (about 63,000 tokens of required reading per significant run). Agent and review spend is tied to a personal account (U-23, F-SEC-007). |
| L6 Longevity | F-DEVOS-003 (a new engineer faces 8,000 lines with no map), F-DEVOS-005 (the memory file is overwritten per slice), F-SEC-007 (single owner). |
| L7 Compatibility | Examined, nothing material: the process is client-agnostic. Mobile release policy belongs to REL. |
| L8 Simplicity | F-DEVOS-005 (REMOVE a ceremony file), F-DEVOS-009 (no templates, CODEOWNERS or ADRs; rejected the doc consolidation project and a merge queue). |
| L9 Boilerplate fit | `CLAUDE.md`, `issues.md`, `git-workflow.md`, the review workflow and the doc-existence test are inherited by every generated app, so F-DEVOS-001 to F-DEVOS-004 are Foundational. `docs/audit/` and the charter must not travel (Q-002). `LICENSE` absence on a public template is carried to BOIL. |

## Carry-forward to other subjects

* **BOIL**: Q-002 now has a visible consequence (red `test:boilerplate` on the audit branch; the manifest has no entry for `docs/audit/` or the charter); `docs/notes.md` is reset by init and referenced by the manifest (F-DEVOS-005 removal touches it); the public repository has no `LICENSE`; `boilerplate.md:72` rule "add domain paths to a manifest list" was not followed for the product mocks (C-58).
* **TEST**: Windows-only gate failures (path separators, CRLF, no `.gitattributes`) make the owner's local `pnpm validate` red on the baseline (facts 16, 19); fix so local red means something (F-DEVOS-002 point 3). The doc-existence tripwire (F-DEVOS-003 point 4) belongs with the static tests.
* **REL**: merge skew in parallel batches (F-DEVOS-002); ruleset option "require branches up to date"; whether Previews are opened before merge (U-19).
* **REQ**: no feature specs exist (`features/README.md` 13 lines); requirements-to-release traceability (P-CH-01) has nothing to trace to yet; open product questions in `notes.md` (P-NOTES-01) need a new home before F-DEVOS-005 is applied.
* **SEC**: F-SEC-002 point 5 is superseded by F-DEVOS-004 (grant `git merge`/`git merge-base` with exact patterns); F-SEC-001 verification should also include the up-to-date option.
* **OPS / DATA / AUTH / ARCH / CODE / UX**: nothing carried.
