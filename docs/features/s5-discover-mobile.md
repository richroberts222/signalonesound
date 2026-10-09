# S5 Discover (Mobile)

**Status: DRAFT, not approved.** Source: blueprint slice S5; product plan ("Mobile app for iPhone/Android", map, search, share). Depends on: S4 (API stable), S0 (skeleton). Q-011 (app name and store identity) is needed before external testers.

## Purpose

The same discovery experience on iPhone and Android, using the same API and contracts as the web, with native navigation, native sharing and deep links.

## Scope (in)

* Tabs: Discover (map and list), Saved (placeholder until S6), Alerts (placeholder until S7), Account.
* Discover: place search, "use my location" (permission asked on tap), radius, date, revival types, map and list, result cards, event details screen.
* Share through the native share sheet; deep links and universal links open the event screen; add to calendar; open directions in the device map app.
* Sign in with Clerk (from S0); Account tab shows profile, export, delete, policy links (from S1).
* Token module mirroring the web's semantic color names (`/docs/ui.md` section 22); large-text support and screen-reader labels.
* Development builds and internal test distribution (TestFlight and Play internal testing) after the owner sets up developer accounts.

## Out of scope

Church/Ministry management (stays on web in Phase 1; managers can view their events), push (S7), offline mode beyond showing the last results with a clear "offline" banner, tablets as a separate layout.

## Acceptance criteria

* **AC1** Search, filters and results match the web for the same fixture data (a shared test fixture runs against both clients).
* **AC2** No account is needed to browse; no identifier is stored on the server for a browsing visitor.
* **AC3** Location permission is requested only after the person taps, a denial falls back to typing a place, and only rounded coordinates are sent.
* **AC4** A shared event link opens the event in the app when installed and on the web page otherwise.
* **AC5** The event screen handles an event that was cancelled or removed (clear message, no crash).
* **AC6** The app shows a clear offline state and recovers when the connection returns; no stale data is presented as current.
* **AC7** Screen-reader labels exist for every control; text scales to the largest system size without clipping; contrast meets WCAG 2.2 AA.
* **AC8** The app contains no server secret and calls only the documented API; a guard fails on a secret name or a direct database library import in mobile code.
* **AC9** Release builds are produced by a documented, repeatable EAS process (`/docs/release.md`), and the runtime version policy is documented before the first store build.
* **AC10** Crash and error reports go through the error-tracking port with redaction.
* **AC11** CI runs typecheck, unit tests and the shared fixture tests for mobile; a Maestro or Detox smoke on a device build is run manually before each store submission (E2E automation in CI is a follow-up decision).

## Controls inventory

The same controls as S4 with the `mobile-` test-id prefix where the platform differs (`discover-place-input`, `discover-locate-button`, `discover-radius-select`, `discover-date-select`, `discover-type-<slug>`, `discover-view-toggle`, `discover-result-N`, `event-share`, `event-calendar`, `event-directions`), plus tab bar items `tab-discover`, `tab-saved`, `tab-alerts`, `tab-account`, and the Account actions from S1 (`account-export-button`, `account-delete-button`).

## API

No new endpoints; consumes S4's. Bearer token with Clerk; cursor pagination; the same error envelope.

## Data

None.

## Hostile cases

Tampered deep-link parameters, expired tokens, malformed API responses (the client validates with the shared schemas), huge lists, rapid filter changes (cancelling stale requests), airplane mode.

## Automation shipped with the slice

Component and logic unit tests; shared-fixture parity tests against the API; deep-link parsing tests; accessibility checks (labels, sizes) in unit tests; documented manual device checklist for iPhone and Android; mutation proofs.

## Owner decisions

Apple Developer Program and Google Play developer accounts (paid; asked and approved separately); app name and store identity (Q-011); privacy nutrition labels and data-safety answers (assistant drafts, owner approves).

## Done checklist

AC1 to AC11 and controls ticked; device checklist completed on one iPhone and one Android phone; `pnpm validate` clean; CI green; docs updated.
