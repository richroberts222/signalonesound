# End-to-End Testing

E2E tests exercise critical, real user journeys through the running application (for example sign-in, protected-route access, a core create/edit workflow).

## Rules

* Focus on important workflows. Do not duplicate every unit, integration, or acceptance test in the browser.
* Be especially selective: E2E is the most expensive layer. Every E2E test needs a Test Value Review (`test-value-review.md`) showing the end-to-end interaction adds value lower layers cannot.
* Keep the suite small, stable, and meaningful; a slow or flaky E2E suite loses value.
* Tests are independent, set up their own state, and clean up.
* Run only against `dev`/`qa`-class environments with test accounts (Clerk development/test instances); never `prod` or real users.
* Failures should produce diagnostics (see `playwright.md`).
* Web is the initial E2E target. Mobile device E2E tooling is undecided (`/docs/testing.md`, `/docs/mobile.md`).

## Relationship to other layers

E2E complements acceptance testing and does not replace it (`acceptance.md`). Business rules belong in unit/integration tests; E2E confirms the pieces work together for real users.

Tooling: Playwright (`playwright.md`), installed in `apps/web`.
