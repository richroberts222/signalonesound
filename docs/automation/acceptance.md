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
* Number the criteria in the spec or issue (AC1, AC2, ...) and put the number in the test title. Every numbered criterion has at least one test, or is listed as not automated with the reason. A criterion with no matching test is an open item, not a pass.
* **Automation-friendly identifiers.** Every interactive control and every state container a test needs (a list, an empty state, an error message, a result) carries a stable test id: `data-testid` on the web and `testID` in the mobile app, with the same kebab-case name on both (`<feature>-<element>[-<action>]`, for example `event-editor-save`; list items add the record id, for example `event-row-<id>`). Ids describe purpose, never styling or visible text, are unique on a page, and are listed in the spec's controls inventory. Tests locate by accessible role and label first and fall back to the test id when those are ambiguous.
* List the feature's controls (buttons, inputs, selects, links, toggles, menus) in the spec. Each control is exercised by an acceptance test that performs the action and checks the effect (state change, request, validation message, navigation), not only that the control renders.
* Cover failure and denial criteria, not only the happy path.
* Verify outcomes at the layer where they are observable (response, persisted state, visible UI), not just that a handler ran.
* Use the lowest layer that can faithfully verify the criterion (service/API-level acceptance tests are often enough); use the browser only when the criterion is about user-facing behavior.
* Acceptance criteria feed the Test Value Review (`test-value-review.md`): choose the smallest valuable test set that proves them; one test may cover a closely related group of assertions.
* Acceptance tests obey the environment safety rules in `integration.md`.

## Relationship to E2E

Playwright E2E testing complements acceptance testing but does not replace it. An E2E journey may exercise several criteria, but passing it does not prove all criteria hold. See `e2e.md`.
