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

## Browser tests in CI

The workflow `.github/workflows/e2e.yml` ("E2E") runs the Playwright specs on every pull request from this repository and by hand (Actions, E2E, Run workflow). Pull requests from forks get no secrets, so the job skips there.

* **What it uses:** the DEVELOPMENT database (`NEON_DEV_DATABASE_URL`) with the demo data, and the Clerk DEVELOPMENT instance (`E2E_CLERK_SECRET_KEY`, `E2E_CLERK_PUBLISHABLE_KEY`) with the test user `tester+clerk_test@example.com`. The config refuses anything that is not a dev or qa database and Clerk test keys. Secrets are given only to the step that runs the tests.
* **Signing in:** `e2e/sign-in.ts` uses Clerk's testing helper with the test user's email and the dev secret key, so no password exists anywhere. It also accepts the terms the first time, and checks with the server that they are saved.
* **Reading the result:** open the run on GitHub. The summary at the top lists every test with PASS, FAIL or SKIP. The artifact `playwright-report` (kept 14 days) holds the HTML report, a screenshot and a video of each failure.
* **The site is served as a production build in CI.** The workflow runs `next build` first and the tests use `next start` (`playwright.config.ts`); locally the dev server is used. A dev server compiles each page the first time it is opened, which used up the runner's memory and got the whole job killed partway (`/docs/lessons.md`). The test step also prints a memory reading every 20 seconds, so a runner that is killed again shows why. A run that ends with the test step "cancelled" and the report steps skipped was killed as a whole, not failed by a test; after two such failures, stop and report (`CLAUDE.md` rule 15).
* **No traces in CI.** A trace can contain a session token, and artifacts of this public repository are readable by others, so traces are off in CI and only on locally (and ignored by git).
* **The admin test account:** admin screens are driven by a second Clerk DEVELOPMENT user (`e2e-admin+clerk_test@example.com`, or `E2E_CLERK_ADMIN_EMAIL`). `playwright.config.ts` runs `e2e/admin-account.mjs`, which finds the user or creates it (a Clerk reserved test phone number is used because the instance asks for one), and gives its id to the test server as `ADMIN_USER_IDS` for that run only. It refuses anything but a `sk_test_` key. If Clerk cannot be reached the admin specs skip with a visible reason. `e2e/admin.spec.ts` follows `docs/admin-manual.md`: it clicks each real admin screen as that admin and checks the result through the API too. Everything it creates is named with an `e2e` prefix and is removed by `pnpm --filter web db:cleanup:e2e --env=dev` (the CI job runs it after the tests). The member journey uses a third Clerk development user (`e2e-member+clerk_test@example.com`, or `E2E_CLERK_MEMBER_EMAIL`) that it deletes at the end; the next run creates it again. On a local run that reuses an already running dev server, add the admin id to that server's `ADMIN_USER_IDS`.
* **Locally:** `E2E_CLERK_USER_EMAIL=<test user email> pnpm --filter web exec playwright test` with the dev values in `apps/web/.env.local`.
* **Adding a journey:** follow the Test Value Review above, use test ids (`data-testid`), and prove the new test by breaking the behavior it protects.

