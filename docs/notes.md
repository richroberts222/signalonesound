# Issue 68 Handoff: Global App Shell and Header Navigation

* **Issue:** #68. **Canonical branch:** `claude/issue-68-20261005-2042`; base `main`. Do not merge; Rich decides to accept, revise, or discard.
* **Precondition:** PR #67 (Issue #66) is merged into `main` (merge commit `26f7f84` is in this branch's history).
* **Type:** experimental navigation layer. Web only. No schema, API, auth-provider, or Discover Revival change.

## Implementation summary

* The header moved from a single auth-only component into a reusable shell: `AppShell` (wraps pages in the root layout) renders `AppHeader`.
* Header (`sm` and up): wordmark linking to `/`, inline links Home and Discover (Dashboard when signed in), Clerk Sign in / Sign up or `UserButton`. The current section is highlighted with `aria-current="page"`; Discover stays active on Event Details.
* Below `sm` (phones): wordmark, Sign in (or `UserButton`), and a 40px menu button opening a list with the same links (plus Sign up when signed out). The menu closes on navigation or Escape.
* Dark/gold tokens are reused (no new colors or fonts).

## Architecture decisions

* `lib/navigation/nav-config.ts` is the one list of destinations. `components/shell/app-header.tsx` is one renderer. A sidebar or bottom-tab experiment replaces the renderer or `AppShell`; feature pages do not change.
* Pages already had no navigation of their own, so no page was edited. Event Details "Back to results" / "Back to Home" and Home "See all" are untouched, so contextual navigation still works.
* **Saved is deliberately not in the navigation.** There is no saved-events page; Save is a browser-local mock and account-based saved events are Later Phase 1 in the product plan. A link would be fake functionality. It is documented in `nav-config.ts`.
* **Dashboard** is shown only when signed in, since the route is protected by the existing Clerk proxy (unchanged).
* The header is now a Client Component (needs the current path and menu state). Clerk `Show`, `SignInButton`, `SignUpButton`, `UserButton` behavior and the `ClerkProvider` setup are unchanged.
* The old `components/auth/auth-header.tsx` was removed (replaced by the shell).
* `docs/web.md` gained a short "Global App Shell" section.

## Files changed

* Added: `apps/web/components/shell/app-shell.tsx`, `apps/web/components/shell/app-header.tsx`, `apps/web/lib/navigation/nav-config.ts`, `apps/web/lib/navigation/nav-config.test.ts`
* Changed: `apps/web/app/layout.tsx`, `apps/web/components/brand/brand-wordmark.tsx` (comment section reference only), `docs/web.md`, `docs/notes.md`
* Removed: `apps/web/components/auth/auth-header.tsx`

## Test Value Review

One small unit test for `isNavItemActive` (Home exact match; Discover active for nested Event Details but not look-alike paths), because active-state matching is real logic that is easy to break. No tests for markup or the menu: they would mostly restate the JSX, and the app has no component or browser test setup that renders Clerk.

## Verification performed

* **Not run.** Dependencies are not installed and `pnpm` is not available in this environment, so lint, typecheck, tests, and build were NOT executed, and I could not render the app. Please rely on CI and the Vercel Preview. Earlier PR #67 runtime failures were only visible on a real request, so the Preview check below matters.
* Static review only: imports resolve to existing modules, `Button` `size="icon"` exists, no secrets added.

## Unresolved product/navigation questions

* Should Saved become a destination, and when (local mock list now, or after accounts)?
* Is Dashboard the right account destination label, or should it become Profile/Account?
* Should Sign up stay in the header on desktop next to Sign in?
* Final logo/wordmark treatment (still the temporary text wordmark).

## Intentionally deferred

Mobile bottom navigation, sidebar experiment, church/ministry/admin shell, final logo, Saved page, nav analytics.

## Manual review steps (Vercel Preview)

Desktop browser:
1. Open `/`. Header shows "Signal One Sound", Home (highlighted), Discover, Sign in, Sign up.
2. Click Discover: it highlights. Tap Near Me, open a card: Discover stays highlighted and "Back to results" still restores filters.
3. From Home, open a card: "Back to Home" still works. Click the wordmark from any page: lands on `/`.
4. Sign in: Dashboard appears in the nav and `UserButton` replaces Sign in/Sign up.

iPhone Safari (or narrow window):
1. Header shows wordmark, Sign in, and a menu button; no desktop links are squeezed in.
2. Open the menu: Home, Discover (and Sign up). Tapping a link navigates and closes the menu. The menu button toggles it.
3. Signed in: menu includes Dashboard; `UserButton` is visible in the header.
4. Check the header stays pinned while scrolling and the text is readable on the dark background.
