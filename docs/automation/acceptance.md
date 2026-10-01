# Acceptance Testing

## Rule

Every implemented feature must have explicit acceptance criteria (in the issue, or proposed by Claude in the PR and flagged for confirmation when absent).

Where practical, acceptance criteria become executable automated acceptance tests. Criteria that cannot be automated are stated as such in the completion report with the reason.

## What acceptance tests verify

Acceptance tests verify the complete expected behavior of a feature, not merely that a UI interaction occurred. One frontend interaction may trigger several behaviors, and the test must verify the ones the acceptance criteria define:

* state changes
* validation
* API/server calls
* authorization decisions
* database mutations
* loading states
* success states
* error states
* secondary side effects

Example: "submitting the form shows a success message" is not sufficient if the criteria also require the record to be persisted, owned by the caller, rejected for other users, and an error shown on invalid input.

## Rules

* Trace each test to a criterion; name tests so the criterion is recognizable.
* Cover failure and denial criteria, not only the happy path.
* Verify outcomes at the layer where they are observable (response, persisted state, visible UI), not just that a handler ran.
* Use the lowest layer that can faithfully verify the criterion (service/API-level acceptance tests are often enough); use the browser only when the criterion is about user-facing behavior.
* Acceptance tests obey the environment safety rules in `integration.md`.

## Relationship to E2E

Playwright E2E testing complements acceptance testing but does not replace it. An E2E journey may exercise several criteria, but passing it does not prove all criteria hold. See `e2e.md`.
