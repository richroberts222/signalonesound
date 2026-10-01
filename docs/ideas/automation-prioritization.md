# Automation Prioritization (Idea)

Not a requirement. See `README.md`.

## Concept

Use real application usage data to help prioritize automated testing:

```text
Real user behavior
  -> analytics/navigation/interaction data
  -> identify heavily used workflows
  -> compare with automated test coverage
  -> identify high-use / weakly-tested areas
  -> prioritize additional automation
```

## Limits

Production usage should inform testing priorities but must not be the sole factor. Critical security, authorization, data-integrity, and business workflows may require strong automation even if usage is low.

## Possible Future Quality Report

An ongoing quality/usage report might contain:

* most-used workflows
* least-used workflows
* navigation drop-off points
* high-interaction screens
* frontend errors by workflow
* backend/API errors by workflow
* slow workflows
* acceptance-test coverage
* E2E coverage
* code coverage
* high-use areas lacking automation
* automated tests covering apparently unused workflows
* features with unusually low discovery/usage
* areas recommended for human UX review

Depends on `product-analytics.md` and `observability.md`. Do not build reports or dashboards without an authorizing issue.
