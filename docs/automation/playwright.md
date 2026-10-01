# Playwright

Playwright is the preferred browser automation/E2E framework for Signal One. It is installed in `apps/web` (Issue 49): `playwright.config.ts`, specs in `apps/web/e2e/`, run with `pnpm --filter web test:e2e` (after `playwright install chromium`). It uses native Playwright plus `@clerk/testing` for Clerk development-instance sign-in. The config is fail-closed (dev/qa database, Clerk `sk_test_`/`pk_test_` keys, not on Vercel) and sets `E2E_READY=1`; without the required environment (`DATABASE_*`, Clerk dev keys, `E2E_CLERK_USER_USERNAME`/`E2E_CLERK_USER_PASSWORD` for a dedicated test user) specs skip with a visible reason. Artifacts (`playwright-report/`, `test-results/`) are gitignored. E2E is not part of `pnpm test`/`validate` and not in CI yet (workflow files are human-owned).

## Do not restrict native Playwright

Do not build the automation architecture around a narrowly restricted wrapper (a custom DSL or action layer that hides Playwright) that prevents legitimate capabilities from being used. Thin helpers (for example an auth fixture, or a page object for a complex screen) are fine when they still expose the native `page`, `context`, and `request` objects.

Native capabilities that may be used where appropriate:

* browser contexts (isolation, multiple users)
* multiple pages/tabs
* network observation and interception
* storage and authentication state
* traces
* screenshots
* video
* device/mobile emulation
* accessibility-related testing
* request/response inspection (including the `request` API for API-level checks)
* browser events (console, dialogs, page errors, downloads)
* other appropriate native capabilities

## Use capabilities intentionally

Choose a capability because the test requires it, not to add complexity. Examples: intercept the network only to simulate a failure or assert a request; capture traces/screenshots on failure rather than always; use device emulation for tests about responsive behavior.

## Selectivity

Playwright is capable of testing almost anything; that is not a reason to. Apply the Test Value Review (`test-value-review.md`) and `e2e.md` before adding a spec or test.

## Safety

* Authentication state files and traces may contain tokens; never commit them. Keep them gitignored.
* Do not intercept or modify traffic in a way that bypasses the security guards under test.
* Target only non-production environments.
