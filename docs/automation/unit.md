# Unit Testing

Unit tests verify one piece of logic in isolation. Vitest is the current runner (`/docs/testing.md`).

## Rules

* **Isolated:** no network, database, real clock, randomness, or real accounts unless controlled (fake timers, injected sources, `vi.stubEnv`, fakes for data access).
* **Deterministic:** same result every run and in any order. No shared mutable state between tests.
* **Boundary and error cases:** cover valid, invalid, and boundary inputs, plus failure paths (validation errors, authorization failures, not found), not only success.
* **Behavior, not implementation:** assert outputs, errors, and observable effects. Do not assert private helpers, call order, or internal structure unless that is the contract. Refactors that keep behavior should not break tests.
* **Business rules independently:** where practical, keep business rules in pure or injectable functions (shared packages, service layer; see `/docs/services.md`) so they can be tested without UI, framework, or database.
* **Regression tests:** every bug fix adds a test that fails without the fix, where practical.
* **Mocks sparingly:** fake the boundary you are isolating from. Do not mock the unit under test, and do not mock so much that the test only proves the mocks.
* Tests live next to the code they cover, named `*.test.ts(x)`.
* Before adding tests, apply the Test Value Review (`test-value-review.md`); do not test trivial code or framework behavior.
