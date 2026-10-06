# Issue 76 Notes: Mock Admin and Content Management Flow

Only non-discoverable information; GitHub (issue, branch, diff, checks) is the live source. Do not merge before Rich's review.

## Decisions

* New protected routes under `/admin` (Clerk proxy matcher plus a server re-check in `app/admin/layout.tsx`). That check only confirms a signed-in user; it is NOT admin authorization. Every admin screen shows a notice saying so. "Admin (mock)" appears in the signed-in nav for review access only.
* Section navigation inside the admin mock lives in `lib/admin/nav.ts`, separate from global navigation.
* All data is static and fictional (`lib/admin/mock-data.ts`); state is client-local and resets on reload. Statuses, sources, flags, and resolution choices are illustrative, not product decisions.
* The import wizard never reads the chosen file; the preview is always the fictional sample, so no ingestion exists.
* Reused `FilterChip`, `RevivalTypeBadge`, and date formatters from Discover.
* Playwright: not added. The journey needs a signed-in Clerk session and the DEV E2E environment, and the behavior is local state with no server contract. Test Value Review: unit tests (`lib/admin/admin.test.ts`) protect the deterministic import validation, duplicate/conflict classification, resolution counting, moderation transitions, and mock-data cross-references (High value, low cost); the nav and server/client boundary tests were extended (Normal).

## Validation (apps/web, via `npx`; `pnpm` is not on PATH in this sandbox)

* Run and passing: `vitest run` (171 tests), `eslint app components lib`, `next build` (includes TypeScript; the standalone `tsc --noEmit` reports only missing generated `PageProps`/`LayoutProps` types, which also affects pre-existing files).
* NOT run: Playwright E2E, root `pnpm validate`/`test:boilerplate`, any browser rendering (no signed-in session). Layout and iPhone Safari behavior are unverified; use the Vercel Preview.

## Unresolved product questions

* Who counts as an admin or moderator, and how is that granted (Clerk metadata vs application data)?
* Can anonymous visitors submit events, or only signed-in members? Are submitters notified of decisions?
* What are the real moderation outcomes (approve, reject, request changes) and can a decision be undone?
* What defines a duplicate or conflict, and who wins on conflict (imported data vs manager-entered data)?
* Can imports create new organizations, or only events for existing ones? What columns are required?
* Can staff edit manager-owned records, and are managers told?
* Should removal be permanent or reversible?

## Manual review (Vercel Preview, signed in with a Clerk test user)

1. Header shows "Admin (mock)". Signed out, `/admin` redirects to sign-in. Every admin page shows the exploratory notice.
2. `/admin`: four summary cards link to the areas; the sources row lists all four event sources.
3. `/admin/organizations`: search "franklin" and a nonsense term (empty state). Open one; try Edit (clear a required field, then fix), view managers (one org has none), and Pause organization -> confirm -> "nothing was paused".
4. `/admin/events`: search, filter by each source chip, open one, edit, and Remove -> confirm -> "nothing was removed".
5. `/admin/submissions`: inspect each; try Approve, Reject, and Edit before approval (blank the title to see the error). The "Fall Harvest" one links to its possible duplicate. Decide all four to see the empty queue; reload resets.
6. `/admin/import`: Continue without a file (error); pick any file or the sample; review the preview table (scrolls sideways on narrow screens); resolve rows (try finishing early for the error); read the final "nothing was persisted" result; Start over.
7. iPhone Safari / narrow window: single column, section tabs scroll sideways, no page-level horizontal scroll.
8. Regression: `/`, `/discover`, `/account`, `/dashboard/church`.
