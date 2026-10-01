# Playwright

Playwright is the preferred browser automation/E2E framework for Signal One. It is not installed yet; installation requires an issue that authorizes it (and an update to `/docs/testing.md`).

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

## Safety

* Authentication state files and traces may contain tokens; never commit them. Keep them gitignored.
* Do not intercept or modify traffic in a way that bypasses the security guards under test.
* Target only non-production environments.
