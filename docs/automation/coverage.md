# Code Coverage

Code coverage is a **diagnostic quality signal**, not a goal in itself. Coverage tooling is not configured yet; add it only when authorized.

## Rules

* 100% coverage is NOT required and must not be treated as a rule.
* Coverage helps identify:
  * important untested logic
  * high-risk untested areas (authorization, validation, data integrity, business rules)
  * regressions in meaningful coverage
  * code that may require additional review
* A coverage percentage never substitutes for meaningful behavioral testing. A line can be executed without its behavior being verified.
* Do not write tests whose only purpose is to raise a number (assertion-free tests, tests of trivial getters, implementation-detail tests).
* If a threshold is ever adopted, an authorizing issue must document it here; it should guard against meaningful regressions rather than demand a fixed percentage.
* Coverage gaps are weighed with the Test Value Review (`test-value-review.md`): add a test only when it provides meaningful value.
* Untested code is a prompt for judgment: add a test, accept the risk with a stated reason, or remove dead code.
