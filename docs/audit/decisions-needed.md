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

**Status**: Decided 2026-10-07 (engineering decision, Claude, under the adopted decision model): option 1. **Applied 2026-10-07** through issue #83 and PR #84 (merged): `docs/audit` added to `REFERENCE_ONLY_PATHS` in `scripts/boilerplate/manifest.mjs`. The charter file `docs/fable-audit-charter.md` was not part of that change. The audit itself does not edit the manifest or the leak test.

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

**Status**: Answered 2026-10-07 (owner action): read-only Vercel access exists through the Vercel MCP server and CLI on the owner's machine (project `signalonesound`, team `team-jesus5`). Use is read-only: project settings, deployments, logs, environment variable names and targets, never values. Several UNVERIFIED rows can now move to CONSOLE.

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

**Decision (2026-10-07, engineering call under the adopted decision model): Option 2, remove.**

Evidence: (1) U-25 answered by Rich: automated review was never part of the workflow; Claude simply implemented each PR, so no process depends on it and nothing visible is lost. (2) The workflow is the stock vendor template. Its job grants only `pull-requests: read`, and the single allowed tool is the inline-comment tool, so whether it can post at all is unproven; it has produced no visible output on six PRs (F-DEVOS-001). (3) A same-model second look on agent-authored PRs adds little independence, and a green check that carries no information is false assurance. (4) Review evidence is better obtained from the authoritative CI gate plus the single independent adversarial pass reserved for Step 7, not from a per-PR bot.

Follow-up (human-applied, because the agent cannot edit `.github/workflows`): delete `.github/workflows/claude-code-review.yml`; remove or reword the references in `docs/stack.md:103`, `docs/deployment.md:94`, `docs/security.md:96`, and check the mention at `docs/boilerplate.md:74`. Needs its own issue and PR; do not bundle with Q-002. Draft issue title: "Remove the silent Claude Code Review workflow and its doc references". Done when the file and references are gone, `Validate` is no worse than before, and no doc claims automated review exists. Reopen trigger: a concrete need for per-PR automated review, with a proof PR carrying a deliberate defect that produces a visible comment.

**Blocks**: nothing further. F-DEVOS-001's recommendation is now final: remove the bot; review evidence comes from required CI checks and the Step 7 audit.

**Status**: Decided (not yet applied).

### Q-009 Who may use the product, where, and what may it collect? (age floor, jurisdictions, legal review, collection gate)

**Question**: What is the minimum age for an account, in which countries will the product operate, will you obtain legal review of a privacy policy before public sign-up, and until then may the product collect precise location, notification preferences or any other user data?

**Why the audit cannot decide**: it is a product, legal and residual-risk decision, and the audit is not legal advice. The plan implies data that reveals religious belief together with location (F-AUTH-003); the law that applies depends on the answers.

**Options and consequences**:

1. United States only, adults 18 and over, minimal collection (coarse location, notification preferences optional), counsel reviews the policy before public sign-up. Smallest obligations; matches a first launch.
2. Include minors with parental consent, or serve the EU/UK. Larger legal and engineering work (consent flows, data-subject rights, possibly representatives); not recommended before the product exists.
3. Collect nothing real until a later date; the product stays mock. No risk, no learning from real use.

**Blocks**: F-AUTH-003 (all of it); F-AUTH-002's deletion behaviour; the notification and location data model (F-DATA-008); any public sign-up.

**Status**: Answered 2026-10-08 by the owner, with one item left open.

Owner statements (RECOLLECTION, 2026-10-08):

* Minimum age is **18**.
* Launch in the United States first, but **plan for worldwide use** (revival gatherings are expected around the world).
* Sign-up should require agreeing to a terms and privacy policy, in the common way.
* Whether a lawyer is involved is **not decided** ("not sure"). This is the one open item and it is the owner's residual-risk decision, below.

Engineering decisions (Claude, under the adopted decision model):

1. Age is confirmed at sign-up by self-attestation (Clerk cannot verify age); record it with the policy acceptance.
2. Record each user's acceptance of the terms and privacy policy (policy version and timestamp) when the first application row for that user is created (F-AUTH-002).
3. Build the deletion path, the export function, the data inventory, and coarse-by-default location storage from the first user-owned table, regardless of country (cheap now, expensive later). This is the "plan for worldwide" part that costs little.
4. Defer region-specific compliance until a region is actually opened.

Residual-risk decision still with the owner: launching in the United States on a standard template policy with sign-up acceptance and **no** legal review is a common starting point for a small product, and the engineering position is that it is acceptable only with the minimum in items 1 to 3 in place. Before the **first non-US user** (EU, UK, and others), legal review is recommended because religious belief is treated as special-category or sensitive data there (INFER, not legal advice), together with a decision on data location (the database is in the US West region) and the vendor data-processing terms (Clerk, Neon, Vercel).

Collection gate (unchanged in substance): no real user data is collected until a privacy policy page, terms acceptance at sign-up, and the 18+ confirmation exist. Legal review is not part of that gate for a US-only start, but is a hard gate for any non-US user.

Addendum 2026-10-08 (owner): use a generic terms agreement and privacy policy now, and have an attorney review and update them later. This is consistent with the position above for a US-only start. The hard gate before the first non-US user is unchanged.

### Q-010 Who are admins, moderators and Church/Ministry managers, and how is each granted?

**Question**: Which kinds of people can act on the platform beyond an ordinary member (platform admin, moderator, Church/Ministry manager)? How is each role granted and revoked? May an organization have several managers? Are anonymous submissions allowed? Can a moderation decision be reversed?

**Why the audit cannot decide**: it is product policy (`docs/product/roadmap.md` lists these as not yet decided; `naming-conventions.md` marks Organizer UNDECIDED). Engineering decides the mechanism once the roles are named (F-AUTH-001).

**Options and consequences**:

1. Minimal start: one platform admin (the owner, an allow-list of identities), organization managers invited by the admin, moderation by the admin only, no anonymous submissions, decisions recorded and reversible. Smallest surface; matches the mocks built so far.
2. Broader from the start: moderators as a separate role, self-service organization claim and verification, anonymous submissions. More product value earlier, much larger abuse and moderation load.

**Blocks**: F-AUTH-001 (role design), F-AUTH-004 (what the audit trail records), the product schema design review.

**Status**: Answered 2026-10-08 by the owner (tentative where marked).

Owner statements (RECOLLECTION, 2026-10-08):

* **Platform admins:** the owner now, plus one more person who does not have a Clerk account yet. Her name is deliberately not recorded in this public repository.
* **Church/Ministry manager:** the person asks for the role when signing up and an admin approves it ("request, then approve"). This modifies option 1 (admin-initiated invitation only) to include requests.
* **Ordinary members** need no approval; they just search. The owner expects members to pay for the service (tentative: "I think").
* Not answered: a separate moderator role, anonymous submissions, reversal of moderation decisions, several managers per organization.

Engineering decisions (Claude):

1. **A user never chooses their own role.** Clerk only proves who someone is. Choosing "I am a church" can only create a pending **request**; an admin's approval creates the grant. Roles and requests live in the application database keyed by the Clerk user ID (F-AUTH-001), not in Clerk.
2. **Platform admins** are a server-only allow-list of Clerk user IDs (a Vercel environment variable change, an owner action). **Update 2026-10-08:** the owner and the business partner share one login, so the allow-list needs exactly one identity today; no second Clerk account is required. Move to a database-backed admin flag, and individual accounts, only if the admin count grows or a third person joins. Separate non-admin **test accounts** are still needed to try the member and church-manager roles.
3. Defaults for the unanswered items, to be revised only if the owner objects: admins also act as moderators for now; anonymous submissions are not allowed at first; moderation decisions are recorded and reversible (F-AUTH-004); an organization may have several managers.
4. **Paid membership is a new topic, not an AUTH one.** A payment provider, hosted checkout, tax, refunds and the Apple/Google in-app-purchase rules for the mobile apps are undesigned (REQ/ARCH; the plan marks pricing UNDECIDED). Nothing in AUTH assumes payment.

### Q-011 What is the mobile app's public identity (name, store identifiers, developer accounts)?

**Question**: What name should the iPhone and Android apps show, what permanent store identifiers (iOS bundle identifier, Android package name) should be used, and who will own the Apple and Google developer accounts?

**Why the audit cannot decide**: it is a brand and account decision, and the identifiers cannot be changed after the first published release without creating a new app. `app.config.ts` currently holds placeholders (`com.example.signalone`, the name "Signal One"), while the official product name is "Signal One Sound" (`naming-conventions.md`).

**Options and consequences**:

1. Decide at the first internal build (when the mobile slice starts). Nothing is needed now; the placeholders are harmless until a build is made. Recommended.
2. Decide now. Possible, but there is no mobile feature yet and a custom domain does not exist; the choice would likely be revisited.

**Blocks**: nothing today. Blocks F-REL-005 at its trigger (the first internal or store build) and the Clerk native sign-in redirect configuration (F-AUTH-005).

**Status**: Open. Default until answered: option 1.

### Q-012 How many other applications will be built from this foundation, and when?

**Question**: Do you expect to build other applications from this codebase's foundation (a template for future projects), and if so, how soon? Should the published template repository stay public?

**Why the audit cannot decide**: it is a business-priority question. The template tooling costs maintenance effort in the product's own pipeline (F-BOIL-001) and the answer decides whether that cost is worth paying.

**Options and consequences**:

1. Not in the next year or so: **freeze** the template. The tooling stays in the repository and works, but it stops gating product work (it is run on demand before an export), and the published copy is made private or archived. Recommended default: it keeps the product's pipeline free for the product.
2. Soon (two or more): keep the template current. The boundary is inverted so ordinary documents cannot trip it, the full proof is scheduled, and the published repository is refreshed and marked as a template.

**Blocks**: F-BOIL-001, -003, -004, -005 (what to do, not whether it is a problem).

**Status**: Answered 2026-10-08 by the owner (RECOLLECTION): another application **will** be built from this foundation, but the priority is to get Signal One Sound operational first, "the sooner the better on both." The owner also approved removing misleading reports.

Engineering decisions (Claude): this selects option 2 with sequencing, not a freeze. (1) Keep the template tooling and its gate, but invest only in small safe fixes now: the two historical reports are removed (issue #89, PR #90), the copy-routine safety fix (F-BOIL-002) and the Windows fix (F-BOIL-003) are cheap and scheduled with the fix plan. (2) Reduce the false-alarm surface of the gate (F-BOIL-001) once, structurally, instead of freezing: all reference-only documents live under a small set of directories that init removes and the scan ignores. (3) Defer the template refresh and any publication until the Signal One foundation fixes from this audit have landed, so the second app starts from a corrected foundation. (4) The published template repository (F-BOIL-004) stays out of public view: **owner action** to make it private in the repository settings.

### Q-013 Is the first public release web-only, or are the iPhone and Android apps part of launch?

**Question**: The product plan's minimum scope starts with "Mobile app for iPhone/Android", a GPS map and push notifications. Everything built so far is on the website. Which is the first thing real people will use: the website alone (apps later), or the apps at launch?

**Why the audit cannot decide**: it is a business and sequencing decision. It changes which engineering work comes first (store accounts, app identity, push notifications, mobile sign-in) and what the first real slice must prove (F-REQ-004).

**Options and consequences**:

1. Website first, apps after the directory works. Lowest cost and risk; the plan's wording is then updated to say so. The first real slice must still include one mobile read of its data so the shared contract is proven. Recommended.
2. Apps at launch. Matches the plan's wording; needs Q-011 answered, store developer accounts, the store checklist in F-REQ-006, and push notifications (a separate slice with its own policy work) before launch.

**Blocks**: nothing today. Shapes the order of the roadmap in Pass 5.

**Status**: Answered 2026-10-08 by the owner (RECOLLECTION): apps are part of launch ("most everybody uses apps nowadays") and the owner wants the architecture to work in parallel with mobile devices if that is the usual practice. It is: this selects option 2 in spirit but with a parallel, not mobile-first, build.

Engineering decisions (Claude): (1) The first real slice is a **walking skeleton** built on web and mobile together against the one shared API: one small read (and later one write), real sign-in on both, real database, with acceptance criteria for both clients (F-REQ-004). (2) This pulls forward, but does not start, F-AUTH-005 (a real mobile token reaching the API, with a test), F-ARCH-002 (client timeout, version header, minimum supported version) and Q-011 (app name and store identities) so they are decided before that slice, not at the first store build. (3) Store developer accounts and fees are spending decisions to ask before any purchase. (4) Application code stays paused until the owner lifts it; the rules and tests that make the skeleton safe (contract tests for the shared API, the mobile token test) can be prepared first.

### Q-014 Should public sign-up stay open on the live site before launch?

**Question**: The live Production site (the `vercel.app` address) runs Clerk's development mode and anyone who finds `/sign-up` can create an account. There is no terms page, privacy notice or age check yet (F-AUTH-011). Do you want sign-up restricted until launch?

**Why the audit cannot decide**: it is a risk-appetite decision. No real users or data exist, so nothing is lost today; the risk is a stranger creating accounts that later become real data, or a minor signing up before the 18+ rule is enforced (Q-009).

**Options and consequences**:

1. Restrict sign-up in the Clerk dashboard now (invite-only or an allow-list of your and your partner's email addresses). Two minutes, reversible, no code. Anyone you want to test with is added by hand. Recommended.
2. Leave it open until the real Clerk setup, the privacy notice and the age check exist. Acceptable while the site is unknown to anyone; the risk grows if the address is shared.

**Blocks**: nothing. Informs F-AUTH-003 and the launch gate in `roadmap.md`.

**Status**: Open, low urgency. 2026-10-08 owner note (RECOLLECTION): the owner reviews the work on the Preview site and does not need the Production site at all before launch. Consequence: the Production deployment is not relied on by anyone; options include leaving it, or restricting sign-up in the Clerk dashboard, or later pausing the Production deployment. Default until answered: leave it; revisit at the launch gate.
