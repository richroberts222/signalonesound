# Issue 74 Notes: Mock Member Account and Notification Preferences

Only non-discoverable information; GitHub (issue, branch, diff, checks) is the live source. Do not merge before Rich's review.

## Decisions

* New protected routes `/account` and `/account/notifications` (added to the Clerk proxy matcher and re-verified server-side in `app/account/layout.tsx`). "Account" added to the signed-in nav list; Dashboard (Church/Ministry) is unchanged.
* Clerk identity (name, email, photo, sign out) is shown as real and labeled as such. Profile, preferences, roles, and organization access are shown as "Not built yet" application data. No role or preference data is placed in Clerk metadata.
* Preferences, locations, timeframes, and invite link are static mock data in `lib/member/`; state is client-local and resets on reload. Limits (3 locations, 10/25/50 mi, four timeframes) are illustrative, not product decisions.
* Reused `FilterChip` from Discover instead of duplicating it; this is a small cross-feature import and could move to a shared location later.
* Playwright: not added. The journey needs a signed-in Clerk session plus the DEV E2E environment, and the behavior is local state with no server contract. Unit tests cover the pure logic; the boundary and nav tests were extended.

## Validation (apps/web, via `npx`; `pnpm` is not on PATH in this sandbox)

* Run and passing: `vitest run` (158 tests), eslint on changed folders, `next build` (includes TypeScript).
* NOT run: Playwright E2E, root `pnpm validate`/`test:boilerplate`, any browser rendering (no signed-in session). Layout and iPhone Safari behavior are unverified; use the Vercel Preview.

## Unresolved product questions

* Where do notification locations come from (typed city, device location, saved places) and how is "near" matched? Is the radius per location?
* Are timeframes relative windows, specific dates, or recurring patterns? Can several combine?
* Is "Free monthly member/user accounts" the same as free accounts (product plan item 3)?
* What does an invite create (link, code, referral tracking), and what does the invitee get?
* Roles, admin/moderator, ownership, submissions, CSV import, multi-user organizations: preserved in the roadmap for a Data Requirements Review; nothing designed here.

## Manual review (Vercel Preview, signed in with a Clerk test user)

1. Header now shows "Account" (also in the narrow-window menu). Signed out, `/account` redirects to sign-in.
2. `/account`: Clerk identity card, "Not built yet" profile card, notification summary, Invite friends.
3. Copy invite (mock): confirmation text appears; the link is a placeholder.
4. "Manage notification preferences": toggle alerts off (criteria dim and lock), on again; add a location with a distance; try a 4th (blocked), duplicates and blanks (ignored); remove all locations and deselect all timeframes, then Save -> errors; fix -> "nothing was saved". Reload resets.
5. iPhone Safari / narrow window: single column, tappable controls, no horizontal scroll.
6. Regression: `/`, `/discover`, event details, `/dashboard/church`.
