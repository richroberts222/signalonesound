# Automation Rules

These documents are **rules**: what Claude and developers must follow when implementing and testing features. They are distinct from `/docs/ideas`, which describes possible future capabilities that are NOT requirements.

`/docs/testing.md` is the high-level testing philosophy, commands, and current status. The documents here hold the detailed rules per layer.

| Document | Covers |
| --- | --- |
| `unit.md` | Isolated, deterministic logic tests |
| `integration.md` | Tests across meaningful boundaries (services, API, auth, data access, contracts, external integrations) |
| `acceptance.md` | Acceptance criteria and executable acceptance tests |
| `e2e.md` | Critical user journeys through the running application |
| `playwright.md` | Playwright as the preferred browser automation framework |
| `coverage.md` | Code coverage as a diagnostic signal |
| `reporting.md` | Reporting expectations and the (future) goal of combining quality signals |

## Status

Rules here describe how tests are written when a layer is in use. They do not mean the tooling exists. Playwright, coverage tooling, and integration/acceptance/E2E commands are not installed yet; add each only when a real test needs it and an issue authorizes it (see `/docs/testing.md`).

## Layers at a glance

```text
Unit         -> one piece of logic, isolated, fast
Integration  -> real interaction across a boundary
Acceptance   -> a feature's acceptance criteria, verified as behavior
E2E          -> a few critical real user journeys in the running app
```

Each layer has a distinct job. A higher layer does not replace a lower one, and tests are not duplicated across layers without reason.

## Feature completion rule

Claude must derive tests from the issue's acceptance criteria. Before declaring feature work complete, Claude must report:

1. Acceptance criteria implemented.
2. Tests added.
3. Testing layers used.
4. Acceptance criteria actually verified (and how).
5. Validation commands executed, with real results.
6. Anything not tested, and why.

Never claim a criterion is verified unless a test or command actually exercised it.

## Non-negotiables

* Environment safety (`/docs/environment.md`, `/docs/security.md`) always applies. No test touches `prod`; guards are tested, never bypassed.
* No secrets, real database URLs, or credential-shaped URLs in tests, docs, or fixtures (`CLAUDE.md` section 18).
* Existing tests and `pnpm validate` must keep passing.
