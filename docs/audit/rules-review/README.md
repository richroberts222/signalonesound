# Rules review

Rule-by-rule review of every document in `docs/`, requested by the owner: for each rule, is it correct, is it enforced, and whose decision is it. One file per reviewed document, one pull request per document.

## How decisions are split (owner's instruction, 2026-10-09)

* **Owner decides (yes or no):** policy and product choices, anything that changes how the owner works, anything that costs money, and anything that changes what the product does. These are marked **Owner** in the ledgers, each with a recommendation.
* **Claude decides (technical):** choices a developer would make, such as how a check is implemented or how a document is structured. The owner trusts these; each is explained in one line in the ledger.

## Verdict key

**Sound** correct as written · **Fixed** wrong or contradictory, corrected in the same pull request · **Enforced** a mechanism exists · **Guidance** a judgment rule where no mechanism is appropriate · **Gap** worth enforcing, proposal given · **Owner** needs the owner's yes or no.

## Plan

After the review, a second independent Fable pass (the owner has remaining credit) for another comparison.

| # | Document | Status |
| --- | --- | --- |
| 1 | `git-workflow.md` | Done (PR 121) |
| 2 | `data-fetching.md`, `data-mutations.md` | Done (PR 123) |
| 3 | `architecture-rules.md` | Done (PR 126) |
| 4 | `code-quality.md`, `naming-conventions.md`, `ui.md` | This pull request |
| 5 | Remaining docs, then product requirements (after Q-005) | Queued |
