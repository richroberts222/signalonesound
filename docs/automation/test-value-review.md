# Test Value Review

Automated tests are not free. Every test has ongoing execution, debugging, maintenance, CI, and AI/Claude costs. The project must not accumulate tests simply because tests can be written. Every test, or logical group of closely related tests, must provide meaningful value.

Prefer the **smallest valuable test suite** that gives strong confidence in important behavior.

## Workflow

```text
Feature requirements
-> acceptance criteria
-> Test Value Review
-> select the smallest valuable test set
-> implement the appropriate unit / integration / acceptance / E2E tests
-> validation / CI
```

## The review

Before adding new automated tests, determine and document (in the PR or `docs/notes.md`):

1. **What**: the behavior the test verifies.
2. **Business value**: why protecting it matters to the product, customer, operation, revenue, trust, security, or data integrity.
3. **Risk protected**: the realistic regression or failure it would detect.
4. **Testing level**: why unit, integration, acceptance, or E2E is the right level.
5. **Existing coverage**: whether another test or layer already protects this adequately.
6. **Maintenance cost**: whether the value justifies the long-term execution, debugging, CI, and maintenance cost.
7. **Priority**: Critical, High, Normal, or Low.

A logical group of closely related tests may be reviewed together when that is clearer than documenting each assertion. A short table is enough; the review is not an essay.

## Automation must not be created merely to

* increase test count
* increase code coverage percentage (`coverage.md`)
* test implementation details with little behavioral value
* duplicate behavior already adequately protected elsewhere
* exercise trivial framework or library behavior
* satisfy a blanket assumption that every possible behavior requires another test

## E2E / Playwright

Be especially selective. E2E tests protect meaningful user journeys, business-critical workflows, important integration boundaries, or high-risk regressions. Do not repeat in Playwright what a lower-level test already protects, unless the end-to-end interaction itself adds meaningful value (for example real middleware, real browser, or real session behavior that lower layers fake). See `e2e.md`.

## Limits of this rule

* It never justifies weakening or removing security, environment-safety, data-integrity, or regression protections. Guards are tested, not bypassed.
* Do not delete useful tests merely to reduce the count. Remove a test only when it is clearly redundant or low-value, and say why.
* Every bug fix still adds a regression test where practical (`unit.md`).

## Test completion report

When feature work adds tests, `docs/notes.md` must report:

* which tests or test groups were added
* what meaningful behavior they protect
* why they were worth adding
* which testing layer was chosen, and why
* which acceptance criteria they cover
* what was intentionally NOT automated, and why

This extends the feature completion rule in `README.md`.
