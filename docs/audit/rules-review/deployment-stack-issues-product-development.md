# Rules review 10: `deployment.md`, `stack.md`, `issues.md`, `product-development.md`

Reviewed 2026-10-09 with the owner's five tests: **Sense**, **Standard**, **Solid**, **Enforced**, **Proven**. Standards named from recollection (not re-fetched): twelve-factor app (build, release, run; dev/prod parity), trunk-based development with protected branches, DORA delivery practices, Clean Architecture (for `stack.md`).

## Overall verdict

These four are **process and orientation documents**. Their rules are sensible, standard and solid. Most are **Guidance** by nature (how work is planned, reviewed and handed off) or **console state** that code cannot prove (Vercel and Neon settings). Reading them against the repository found **six stale statements** (fixed). The remaining open items are real gaps already on the roadmap: there is no Stage environment, no rollback procedure, no post-deploy check, and no mobile release automation.

## `deployment.md`

| Rule | Standard | Enforced | Proven |
| --- | --- | --- | --- |
| Environment model: `dev`, `qa`, `stage`, `prod`; identity explicit, never inferred | 12-factor (dev/prod parity; config in the environment) | `env.test.ts` guards | **Yes** (five guards broken in the environment ledger) |
| Preview deployments use `qa`; Production uses `prod`; a Preview may not use `prod` | Environment separation | `parseServerEnv` | **Yes** |
| `main` is protected; `Validate` is required; a human is the final gate (or an authorized merge) | Trunk-based development with protected branches | Ruleset "Protect main" | Read back with `gh api`; workflow guards proven in the Wave 1 pull request |
| Never commit secrets; separate secrets per environment | 12-factor; OWASP A02 | `security.test.ts` | Proven in the earlier audit |
| No `vercel.json`; dashboard-configured | Configuration as code is preferred | `security.test.ts` checks no committed secrets only | Not enforced (Low); the document states it as a choice |
| Production build needs no runtime secrets, so a misconfiguration deploys green and fails on first request | Known limit (lazy validation) | Documented | **Gap**: a post-deploy health check (F-REL-001, launch gate) |
| Stage is the final pre-production check | Release staging practice | **Not provisioned**; merge to `main` goes straight to Production | **Gap** (F-REL-002: adopt manual promotion when real users exist) |
| Rollback | DORA (time to restore) | **No documented procedure** | **Gap** (F-REL-001) |
| Mobile build profiles map to environments; mobile receives only `EXPO_PUBLIC_*` values | MASVS-STORAGE; 12-factor | `eas.json`, `boundary.test.ts` | Mobile boundary proven in the services/mobile ledger; no build has run |
| Console state: Vercel variables, Preview values, Neon branches, Clerk instances | n/a | Cannot be read from code | **Not verified** (audit U register). Only Production variable names and the ruleset were read back |

## `stack.md` (orientation)

| Rule or statement | Standard | Enforced | Proven |
| --- | --- | --- | --- |
| Layered architecture: client, API boundary (authenticate, validate, authorize, service), data access, ORM, database | Clean Architecture; OWASP API Security | Boundary and layer tests (earlier ledgers) | **Yes** |
| What each technology owns | Orientation | n/a | n/a |
| Environment table, migration and reset commands, testing kinds | Orientation | Matches `database.md` and `testing.md` | n/a |
| "Where this file and a rule document disagree, the rule document wins" | Single source of truth | Convention | n/a |

## `issues.md` (GitHub-first workflow)

| Rule | Standard | Enforced | Proven |
| --- | --- | --- | --- |
| One issue, one canonical branch, one pull request; independent issues may run in parallel when files do not overlap | Small batches; trunk-based development | Ruleset (pull request required); branch and issue checks are procedural | Guidance |
| Integration into `main` is serialized, with a full re-check before each merge and revalidation of affected open pull requests afterward | Merge discipline | Procedural; `Validate` required by the ruleset | Followed in practice this session (each merge re-checked, `main` revalidated after) |
| Claude merges only when the owner explicitly authorizes it, and only an open, non-draft, mergeable pull request with `Validate` passing | Least privilege; change control | Ruleset (technical backstop); the Claude Code permission prompt (observed blocking an unclear authorization) | Observed, not scripted |
| The Claude workflow keeps `fetch-depth: 0`, an exact-command allow-list, no database credential, pinned actions | Least privilege; supply chain | `security.test.ts` workflow tests | **Yes** (six breaks in the Wave 1 pull request) |
| Record only non-discoverable information; never secrets | Docs-as-code hygiene | `security.test.ts` secret patterns | Secrets guard proven; the rest is guidance |
| Report only what was run; never claim CI passed unless it ran | Honest reporting | Procedural | Guidance |
| Much of the canonical-branch text is specific to the GitHub Action (the `@claude` flow and its push helper) | Context | n/a | Noted; local Claude Code uses plain `git push` of the current branch (clarified in `git-workflow.md`) |

## `product-development.md` (delivery system)

| Rule | Standard | Enforced | Proven |
| --- | --- | --- | --- |
| Only the plan section for the current tier and an approved issue authorize work; repository facts outrank assumptions | Requirements traceability | Procedural | Guidance |
| Pipeline: requirements, acceptance criteria, mock, review, test value review, implementation, validation, preview, exploratory test, regression, review, merge | Delivery lifecycle | Partly: `Validate`, Vercel Preview | Partly |
| Mock-first discovery; exploratory UI reviewed on a Vercel Preview before merge | Lean prototyping | Procedural | Guidance |
| Database design checkpoint (16 questions) before introducing persistent data | Data design review | Procedural | Guidance |
| Testing strategy: Test Value Review gates every test; use the existing TypeScript stack for API tests, not Karate or REST Assured | Test pyramid; tool minimalism | Procedural | Guidance (this review adds the "every test needs a breaker" rule to the QA strategy) |
| Definition of Done (section 9) | Definition of done | **A menu, not a contract**: "applicable items from", with the AI deciding applicability | **Gap**: the QA strategy will replace it with a per-feature checklist and scope fence, and acceptance-criteria traceability |
| Documentation drift is a defect; update docs in the same work | Docs-as-code | Procedural; this review's ledgers | Guidance |

## Fixed in this pull request

| Statement | Defect | Fix |
| --- | --- | --- |
| `stack.md`: "Branch protection should require `CI / Validate` and a human merge" | It is required and live | States the ruleset and the human's decision |
| `stack.md`: the actor carries "Clerk user id and roles" | No roles exist yet | "today only the Clerk user id; roles arrive with the permissions model" |
| `stack.md`: CI runs lint, typecheck, unit tests, build | Omitted the template tests that `validate` also runs | Added |
| `deployment.md`: running lint, typecheck, test, build is "manual now" | CI runs them on every pull request | Reworded |
| `issues.md`: "Merging remains a human decision and action" and the lifecycle "human merges PR" | Omitted the owner-authorized merge that is part of the merge rule | Reworded in both places |
| `product-development.md`: pipeline ends "Merge (human only)" | Same | Reworded |

## Open items (tracked elsewhere)

* Rollback procedure, post-deploy health check, manual promotion and Stage: F-REL-001, F-REL-002 (launch gate and trigger).
* Per-feature definition of done, test plan, regression policy, acceptance traceability: QA strategy document (queued).
* Mobile release process and automation: release document (queued).
* Console state not verified: Preview variable values, Neon branches, Clerk instances (owner reads).

## Owner decisions

None for these documents.
