# Decisions Needed

Questions only Rich can answer. Each states what it blocks. Answered questions stay here with the answer and date; they are never deleted. Format: `methodology.md` Appendix A.

Product questions carried from the mock slices (for example who counts as an admin) are not repeated here until a subject examination needs them; `docs/notes.md` and `docs/product/roadmap.md` hold them today, and `inputs-reconciliation.md` tracks them as P inputs.

---

### Q-001 Where does the audit live in GitHub?

**Question**: The repository rule is one issue, one canonical branch, one PR. No GitHub issue exists for running the audit (#78 was planning only and is closed; #79 created the charter and is closed). Should Rich create an issue (for example "Platform audit: analysis only") so the audit branch and PR have a canonical home, or should the audit proceed on a branch without an issue?

**Why the audit cannot decide**: creating issues is a `gh` mutation the audit forbids itself, and the one-issue rule is Rich's process.

**Options and consequences**:

1. Rich creates the issue; the audit branch is renamed or re-pointed to it and a single documentation-only PR is opened and kept open across passes (Vercel will build a Preview for each push; harmless, docs only). Recommended: keeps the process rule intact and gives Rich a phone-reviewable diff per pass.
2. Proceed on `audit/phase-0-methodology` with no issue and open the PR at the end. Cheaper now; violates the convention and gives no review surface until the end.

**Blocks**: pushing the branch and opening the PR. Does not block Pass 1 analysis.

**Status**: Answered: option 1, in effect. Issue #81 and the single long-lived documentation-only PR #82 (branch `audit/phase-0-methodology`) are the canonical home; not to be merged before convergence (PR description, 2026-10-06).

---

### Q-002 Exclude the audit directory and the charter from the boilerplate export and init

**Question**: `scripts/boilerplate/manifest.mjs` does not list `docs/fable-audit-charter.md` or `docs/audit/` in `REFERENCE_ONLY_PATHS`. The next `pnpm export:boilerplate` would copy both into the standalone boilerplate, and `pnpm init:app` would rewrite them with the new application's name rather than remove them. The audit may not edit the manifest under its own rules. Should this be fixed now by a one-line approved slice (human or Claude on its own issue), or deferred until the audit's roadmap?

**Why the audit cannot decide**: it is a change to tooling configuration, which the charter puts out of bounds for the audit.

**Options and consequences**:

1. Fix now as a tiny separate issue (add two paths to `REFERENCE_ONLY_PATHS`; `pnpm test:boilerplate` proves it). Recommended; it is cheap, and it removes a standing leak.
2. Defer; do not run `export:boilerplate` for publication until then.

**Blocks**: a green `Validate` on audit PR #82, and safe re-export of the boilerplate. (Updated 2026-10-06, DEVOS pass: this entry first said it blocked nothing in the audit. CI on the audit branch head is red: `test:boilerplate` fails 3 of 6 because files under `docs/audit/` contain the reference-app name and proof-slice terms that the init leak check refuses; the same suite is green at the baseline. The audit may not edit the manifest or the test. The PR is not to be merged before convergence anyway, so this is a visible red check, not an urgent break, but it will also make every later push red until option 1 or an equivalent lands. See F-DEVOS-002.)

**Status**: Decided 2026-10-07 (engineering decision, Claude, under the adopted decision model): option 1. Not yet applied; it needs its own issue and PR because it edits `scripts/boilerplate/manifest.mjs`, outside `docs/audit/`. The audit does not edit the manifest or the leak test.

**Draft issue for the operator to open** (plain language; no test is weakened):

> Title: Keep the audit documents out of generated apps and the boilerplate export
>
> The reference app contains an audit folder and a charter document that describe this specific product. A new project created from the boilerplate must not receive them. Today the export and init tooling would copy them and rename them, and the safety check that guards against reference-app names correctly fails. Add `docs/audit` and `docs/fable-audit-charter.md` to `REFERENCE_ONLY_PATHS` in `scripts/boilerplate/manifest.mjs` (one line). Do not edit or relax the leak check or its tests. Done when `pnpm test:boilerplate` passes with the audit folder present, `pnpm validate` passes, and a generated app contains neither path. No product, spending or dependency change.

After it merges to `main`, PR #82's branch must be updated from `main` (merge or rebase by a human or the operator); `Validate` should then pass. Until then red on #82 is expected and is not an audit defect. Option 2's rule still applies meanwhile: do not run `pnpm export:boilerplate` for publication.

---

### Q-003 May the audit write to the `dev` database?

**Question**: The integration tests (`pnpm --filter web test:integration`) and Playwright E2E create and delete rows in the `dev` Neon branch. The audit's default rule forbids any database write, so those suites will be graded by reading them (READ/INFER), not by running them (RUN). Should the audit be allowed to run them against `dev` once, from the local configuration, to grade them by execution?

**Why the audit cannot decide**: it is a state change to an external system Rich owns, even though `dev` is disposable by design.

**Options and consequences**:

1. No (default). TEST and DATA findings about those suites carry Medium confidence at most, and any claim that they pass is INFER.
2. Yes, once, `dev` only, with the result recorded. Raises confidence; costs nothing if `dev` is truly disposable; requires a Clerk development test user for Playwright, which the audit does not have unless Rich provides one.

**Blocks**: confidence level of some TEST/DATA findings. Does not block any pass.

**Status**: Open (default: No).

---

### Q-004 Independent second opinion on the findings

**Question**: Pass 4 (adversarial review) runs in a fresh session of the same model. Does Rich want an independent challenge as well, by a different model, by ChatGPT, or by Rich, appending Challenge entries in the same format? If so, after Pass 4 or in parallel with it?

**Why the audit cannot decide**: cost and who does it are Rich's.

**Options and consequences**:

1. Same model only. Cheapest; weakest independence (`phase-0-critique.md` 3.3).
2. A second model or ChatGPT reads `findings/` and appends Challenge entries after Pass 4. Stronger; one extra review cycle.
3. Rich challenges the Critical and High findings only. Cheapest meaningful independence.

**Blocks**: nothing. Affects how convergence is judged.

**Status**: Open.

---

### Q-005 Which mock code is intended to survive?

**Question**: The Discover, Church, Member, and Admin flows are mock-first (static data, client-local state). Findings about them are graded at pattern level. Is any of that UI, navigation, or `lib/*` logic intended to be kept as-is in the real implementation (in which case it is graded as production code), or will it all be rebuilt once data requirements exist?

**Why the audit cannot decide**: product and delivery intent.

**Options and consequences**:

1. "Treat all mocks as disposable patterns." CODE and UX findings stay pattern-level and mostly Low/Medium.
2. "Components X, Y and the shell will be kept." Those are graded as production code; findings there can be High.

**Blocks**: confidence of CODE and UX findings. Does not block any pass.

**Status**: Open (default: option 1 until answered).

---

### Q-006 Read-only Vercel access for the audit

**Question**: Is the Vercel project linked on this machine, and may the audit use read-only Vercel CLI commands (project settings, deployment list, environment variable *names* per scope, never values)? Without it, Vercel configuration is UNVERIFIED and goes to the human verification list.

**Why the audit cannot decide**: it is access to an external account.

**Options and consequences**:

1. Yes, read-only. Several deployment claims move from UNVERIFIED to CONSOLE.
2. No. Rich performs the checks from the UNVERIFIED register.

**Blocks**: nothing. Reduces Rich's manual verification load if yes.

**Status**: Open.

---

### Q-007 Does the Claude Actions job need database access?

**Question**: `claude.yml` sets `DATABASE_URL` (dev Neon) and `DATABASE_ENV: dev` for the whole job. No workflow step uses it, and the agent's work so far is mock UI and documentation. Has any Claude run ever needed a database (for example `db:migrate`, integration tests, or `db:check` inside Actions)? Should the job keep it?

**Why the audit cannot decide**: only the owner knows whether a future slice depends on it, and removing it is a workflow edit the audit may not make.

**Options and consequences**:

1. Remove it (recommended). Eliminates a credential from an agent environment (F-SEC-002). Database-backed validation then runs on the owner's machine or in a future separate CI job with a scoped secret.
2. Keep it but scope it to one step. Retains the capability with a smaller exposure; requires the agent's allow-list to run that step by exact command.
3. Keep as is. Accepts the exposure recorded in F-SEC-002.

**Blocks**: the final wording of F-SEC-002's recommendation only.

**Status**: Open.

---

### Q-008 Keep, repair, or remove the automated Claude Code Review?

**Question**: `claude-code-review.yml` runs on every pull request and has left no visible output on the PRs checked (F-DEVOS-001). Should it be repaired so it produces a visible result, or removed along with the docs that mention it?

**Why the audit cannot decide**: it spends the owner's Claude usage on every PR, it is a workflow edit (human-only), and whether a same-model second look is worth anything to the owner is a judgment about their own process.

**Options and consequences**:

1. Repair (recommended to try once). Grant the plugin the minimum read and comment access, prove it with one throwaway PR holding a deliberate defect, and describe it in `issues.md` as an aid. Cost: tokens per PR, proportional to diff size; benefit: a second look at the 1,000 to 4,000 line agent PRs that merge in minutes.
2. Remove. Delete the workflow and the three doc references. Cost: nothing is lost that is visible today; benefit: no false assurance and no idle spend.
3. Keep as is. Accepts a green check that carries no information.

**Blocks**: the final wording of F-DEVOS-001's recommendation only.

**Status**: Open.
