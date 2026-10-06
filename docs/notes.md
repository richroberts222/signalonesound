# Issue 70 Handoff: Mock Church/Ministry Event Management Flow

* **Issue:** #70. **PR:** not yet opened (use the Create a PR link in the issue comment). **Canonical branch:** `claude/issue-70-20261006-0420`; base `main`. **Latest commit:** see the branch head (this file is committed with it). Do not merge; Rich decides to accept, revise, or discard.
* **Type:** exploratory, mock-first UI/workflow. Web only. No schema, migration, API, persistence, Neon, or auth-provider change.

## Implementation completed

Reached from a new "Church/Ministry events" card on `/dashboard` (signed-in only; `/dashboard/*` is already protected by the Clerk proxy, unchanged).

* `/dashboard/church`: dashboard. Gold "Managing events" label, church name, "Your events" list (3 fictional events, one marked Recurring (mock)), a Create event button, and a "Public discovery is separate" panel linking to `/discover`, explaining the two are not connected in the mock.
* `/dashboard/church/events/new`: Details -> Review -> Mock result. Fields: Church/Ministry Name; Date, optional End date, Start time, optional End time; Venue Name, Street, City, State, ZIP; Revival Types (the 12 existing, multi-select toggles); Website/Social Links (1 minimum, 3 maximum: first link cannot be removed, "Add link" disables at 3). Validation errors are shown inline with a summary. Review shows every entered value. The final button is "Submit event (mock)"; the result says no event was created and it will not appear in the list or Discover.
* `/dashboard/church/events/[eventId]`: manage page. Edit/update, Replace, Remove. Remove asks for confirmation, then says nothing was removed. Recurring event also shows its illustrative pattern, upcoming dates, and an "Apply changes to" choice (this occurrence / this and following / entire series) that only changes the wording of messages.
* `/dashboard/church/events/[eventId]/edit`: the same editor prefilled ("Save changes (mock)").
* `/dashboard/church/events/new?replace=<id>`: the same editor prefilled for Replace ("Replace event (mock)").
* A "Not part of this mock" list shows Flyer upload (Undecided), Livestream link (Undecided), Recurring schedule setup (Undecided), Speaker(s) (Later phase) as non-interactive text.
* Visuals reuse existing tokens, `Button`, `Input`, `Badge`, `FilterChip`, `RevivalTypeBadge`. No new colors, fonts, or dependencies. Discover and the Global App Shell are untouched (Dashboard nav item stays active on `/dashboard/church/*` through the existing prefix match).

## Files changed

* Added: `apps/web/app/dashboard/church/{layout,page}.tsx`, `.../events/new/page.tsx`, `.../events/[eventId]/page.tsx`, `.../events/[eventId]/edit/page.tsx`; `apps/web/components/church/{event-editor,manage-actions,managed-event-card,deferred-items,mock-notice}.tsx`; `apps/web/lib/church/{types,mock-data,event-draft,event-draft.test}.ts`.
* Changed: `apps/web/app/dashboard/page.tsx` (card + link), `apps/web/components/discover/server-boundary.test.ts` (now also covers `components/church`), `docs/web.md`, `docs/notes.md`.

## Architecture decisions

* Mock data and mock-stage types live in `lib/church`, separate from Discover's. Nothing was added to shared packages or the API; real validation must later be server-enforced and shared (stated in `event-draft.ts` and `docs/web.md`).
* Form state is local React state only; no storage, cookies, or requests, so persistence is not simulated.
* Event title/description are NOT collected: the source's required list does not include them. Cards use the venue name as the heading instead (see questions).
* "Update" and "Edit" are one action here because the source lists both without distinguishing them.
* Any signed-in user is treated as a Church/Ministry in the mock; account type/role is undecided.

## Test Value Review

| Test | What / risk | Level and why | Covers AC | Priority |
| --- | --- | --- | --- | --- |
| `lib/church/event-draft.test.ts` (validation, link 1-3 bounds, multi-type ordering, mock events are valid drafts) | Required fields, 1 min / 3 max links, URL safety (`javascript:` rejected), date/time ordering are real logic easy to regress | Unit: pure functions, fast, no framework | 4, 5, 6, 9, 10 (data), 7 (inputs to review) | High |
| `server-boundary.test.ts` extended to `components/church` | The exact build-passes-but-runtime-throws defect from PR #67 (handlers in a component missing `use client`) | Existing guard, one-line scope extension | 11, 13 | Normal |

Not automated, and why:

* **Component/acceptance tests of the screens:** there is no component test setup (no jsdom/testing-library) and adding one for a throwaway mock would mostly restate JSX. The acceptance criteria are covered by the unit tests where they are logic, and by the manual steps below where they are experience.
* **Integration tests:** not meaningful; there is intentionally no backend, API, or database.
* **Playwright E2E:** not added. The existing E2E setup is fail-closed and needs a dev database plus Clerk test credentials, is not in CI, and the journey is entirely client-side mock state that unit tests plus manual Preview review cover. Worth revisiting when real submission exists.

## Validation (run on this branch, in `apps/web`, via `npx` because `pnpm` scripts could not find `pnpm` on PATH in this sandbox)

* `npx eslint .`: no output (clean).
* `npx next typegen && npx tsc --noEmit`: clean.
* `npx vitest run`: 19 files, 150 tests passed.
* `npx next build`: succeeded; routes `/dashboard/church`, `/dashboard/church/events/new`, `/dashboard/church/events/[eventId]`, `.../edit` built.
* NOT run: `pnpm test:boilerplate` and the root `pnpm validate` wrapper (sandbox approval/PATH), Playwright E2E, any browser rendering or screenshots (no signed-in session available). Visual layout and responsive behavior are therefore unverified; rely on CI and the Vercel Preview.

## Unresolved product questions (not decided here)

* Flyer upload and Livestream links: undecided in the source. Speaker(s): Later Phase 1.
* Is an event title/description part of the startup Event, given Discover's mock shows them but the required list does not?
* Recurrence: rules, series vs occurrence, and edit scopes are undecided (the scope choices and patterns here are illustrative).
* Edit vs Update vs Replace: what distinguishes them; whether Replace retires the original.
* Is the Church/Ministry dashboard a role/account type, and how does someone become one? Is Dashboard the right nav label?
* State field: free 2-letter entry assumed (US only); ZIP 5 or ZIP+4.
* Past events and the meaning of "current" (mock "today" is Oct 5, 2026).

## Reusable boilerplate candidate (report only, not mirrored)

The client/server boundary guard (`server-boundary.test.ts`) was parameterized over a `FEATURE_DIRS` list so every feature component folder is checked, not just one. Boilerplate could adopt the same pattern deliberately.

## Manual exploratory testing (Vercel Preview)

Prerequisite: sign in with a Clerk test user.

1. Header "Dashboard" -> see the "Church/Ministry events" card -> "Open Church/Ministry dashboard".
2. Dashboard: confirm the "Managing events" label, 3 events, and the "Public discovery is separate" panel; its button opens Discover, which is unchanged.
3. Create event: submit empty -> error summary and inline errors. Fill everything; select 3 Revival Types; try adding a 4th link (button disabled, "Maximum of 3" note) and removing down to 1 (remove disabled). Enter `not a link` -> error. Review event -> values match; "Back to edit" keeps them. Submit event (mock) -> result states nothing was created; "Back to dashboard" shows the same 3 events.
4. Edge cases: end date before start date; same-day end time before start time; ZIP `123`; state `Tennessee` (input limits to 2 letters).
5. Manage the weekly prayer event: see "Recurring" pattern and dates; switch "Apply changes to"; Remove -> confirm -> message mentions the chosen scope and that nothing was removed.
6. Edit event: fields prefilled; change one; review -> "Save changes (mock)" -> result says nothing changed. Replace event: prefilled new-event flow labeled Replace.
7. Visit `/dashboard/church/events/does-not-exist` -> 404. Signed out, `/dashboard/church` redirects to sign-in.
8. iPhone Safari / narrow window: forms stack to one column, date/time pickers are usable, buttons are tappable, no horizontal scroll, header menu still works.
9. Regression: `/`, `/discover`, an Event Details page, and the header nav behave as before.
