# Rules review

Rule-by-rule review of every document in `docs/`, requested by the owner: for each rule, is it correct, is it enforced, and whose decision is it. One file per reviewed document, one pull request per document.

## How decisions are split (owner's instruction, 2026-10-09)

* **Owner decides (yes or no):** policy and product choices, anything that changes how the owner works, anything that costs money, and anything that changes what the product does. These are marked **Owner** in the ledgers, each with a recommendation.
* **Claude decides (technical):** choices a developer would make, such as how a check is implemented or how a document is structured. The owner trusts these; each is explained in one line in the ledger.

## The five tests (owner's definition of done, 2026-10-09)

Every rule must: make **sense**; match an industry **standard** (named); be **solid** (correct as written); be **enforced** by a mechanism; and have that enforcement **proven** (the rule was broken on purpose and a check failed). Earlier ledgers (1 to 5) cover the first four; a proof sweep over their enforced rules follows the last review.

## Verdict key

**Sound** correct as written · **Fixed** wrong or contradictory, corrected in the same pull request · **Enforced** a mechanism exists · **Guidance** a judgment rule where no mechanism is appropriate · **Gap** worth enforcing, proposal given · **Owner** needs the owner's yes or no.

## Plan

After the review, a second independent Fable pass (the owner has remaining credit) for another comparison.

| # | Document | Status |
| --- | --- | --- |
| 1 | `git-workflow.md` | Done (PR 121) |
| 2 | `data-fetching.md`, `data-mutations.md` | Done (PR 123) |
| 3 | `architecture-rules.md` | Done (PR 126) |
| 4 | `code-quality.md`, `naming-conventions.md`, `ui.md` | Done (PR 128) |
| 5 | `database.md` | Done (PR 132) |
| 6 | `auth.md` | Done (PR 134) |
| 7 | `api.md` | Done (PR 136) |
| 8 | `services.md`, `shared-code.md`, `mobile.md`, `web.md` | Done (PR 140) |
| 8b | Dependency compatibility pass (`@types/node`, Expo patch) | Done (PR 142) |
| 9 | `security.md`, `environment.md` | Done (PR 144) |
| 7c | New rule documents proposed by the owner: user permissions and roles, payments, third-party connectors; plus a risk-and-legal document | Queued |
| 10 | `deployment.md`, `stack.md`, `issues.md`, `product-development.md` | Done (PR 147) |
| 11 | `testing.md` and `docs/automation/*` | Done (PR 149) |
| 12 | Template documents (`boilerplate.md`, `new-app-setup.md`, `customization-map.md`, `notes.md`, `features/README.md`) | Done (PR 151) |
| 13 | New rule documents: `qa-strategy.md`, `release.md`, `risk-and-legal.md`, `permissions.md`, `payments.md`, `integrations.md`; `CLAUDE.md` concise rewrite and guard; route-protection test fix for generated apps | Done (PRs 153, 155, 157, 159) |
| 14 | Proof sweep, rule scorecard, dependency compatibility rule (`stack.md`) | Done (PR 161) |
| 15 | Independent verification (Fable) and the fixes it prompted: widened guards, text hygiene, lessons log, future readiness | Done (PRs 165, 167, 169, 171) |
| 16 | Owner suggestions register (`owner-suggestions.md`); second narrow Fable re-check | This pull request; re-check pending |
| 9 | Product requirements (`product-plan.md`, roadmap, features), after Q-005 | Queued |
