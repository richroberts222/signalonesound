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

**Status**: Open.

---

### Q-002 Exclude the audit directory and the charter from the boilerplate export and init

**Question**: `scripts/boilerplate/manifest.mjs` does not list `docs/fable-audit-charter.md` or `docs/audit/` in `REFERENCE_ONLY_PATHS`. The next `pnpm export:boilerplate` would copy both into the standalone boilerplate, and `pnpm init:app` would rewrite them with the new application's name rather than remove them. The audit may not edit the manifest under its own rules. Should this be fixed now by a one-line approved slice (human or Claude on its own issue), or deferred until the audit's roadmap?

**Why the audit cannot decide**: it is a change to tooling configuration, which the charter puts out of bounds for the audit.

**Options and consequences**:

1. Fix now as a tiny separate issue (add two paths to `REFERENCE_ONLY_PATHS`; `pnpm test:boilerplate` proves it). Recommended; it is cheap, and it removes a standing leak.
2. Defer; do not run `export:boilerplate` for publication until then.

**Blocks**: nothing in the audit. Blocks safe re-export of the boilerplate.

**Status**: Open.

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
