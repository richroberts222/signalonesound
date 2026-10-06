# Reporting

## Current rule

Test and validation results are reported accurately in the PR conversation (`/docs/issues.md`): exact commands run, real outcomes, and what was not tested. See the feature completion rule in `README.md`.

## Future goal (not implemented)

The eventual goal is to combine signals from:

* unit tests
* integration tests
* acceptance tests
* E2E tests
* code coverage
* production errors
* application observability
* product usage analytics

to identify important workflows that are heavily used but insufficiently tested.

This depends on capabilities described in `/docs/ideas` (product analytics, observability, automation prioritization). Those are NOT current requirements; implementing any of them requires an explicit issue. Do not add telemetry, dashboards, or reporting systems to satisfy this section.
