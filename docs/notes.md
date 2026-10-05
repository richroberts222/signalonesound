# Issue 66 Handoff: Build Mock Discover Revival User Flow

* **Issue:** #66 "Build Mock Discover Revival User Flow"
* **PR:** open from the "Create a PR" link in the issue comment; do not merge. All follow-ups go on the PR, not the Issue (`/docs/issues.md`).
* **Canonical branch:** `claude/issue-66-20261005-1829`; base `main`.
* **Type:** MOCK-FIRST product discovery. Web only. No schema, API, auth, migration, or production-data change.
* **Not product-approved by CI.** Rich must explore the Vercel Preview and approve.

## Navigation refinements after manual testing (PR #67 follow-up, requested by Rich)

* **Wordmark:** the header wordmark already linked to `/`. The `/discover` hero also showed a second, non-link wordmark that duplicated the header; it is removed so the only wordmark is the header link to Home. If the header wordmark still goes to `/discover` on the Preview, tell me which screen and I will investigate.
* **Event Details back link:** cards on Home carry `from=home`; Details then shows "Back to Home" linking to `/`. Cards opened from Discover keep "Back to results", which restores `near`, `radius`, `date`, and `types`. `from` is only honored as the exact value `home`.
* **Happening soon "See all":** now links to `/discover?near=nashville&radius=any` (mock origin, unlimited distance, all upcoming events, soonest first), matching the Home strip's ordering instead of the empty generic Discover state.
* **Distance "X":** the disabled "X" chip is removed. Product plan A1 lists "10, 25, 50, X, or unlimited" and open question 10 says "X" is unspecified in the source, so no meaning was invented. **Product question for Rich:** what is "X" (a user-entered custom distance? a fixed fifth value?) and should it be offered at all?
* **Copy:** "Find the fire near you" left unchanged as temporary mock copy.
* No global navigation added; no backend, schema, or API change.
* **Manual test:** Home, open a card, confirm "Back to Home". Discover, Near Me, change filters, open a card, confirm "Back to results" restores them. Home "See all" lands on a populated results list. Distance row shows no "X".
* **Validation:** not run in this environment (shell commands for pnpm are not available to me).

## Vercel Preview runtime failure, second fix (PR #67 follow-up, requested by Rich)

The Preview still failed after the `cn` import fix, so that was not (or not the only) cause.

* **Probable root cause (static analysis; I could not run the app or read Vercel runtime logs):** `components/discover/event-card.tsx` attaches `onMouseEnter`/`onMouseLeave` handlers to its `<article>` but had no `"use client"` directive. `app/page.tsx` is a Server Component and renders `EventCard` in "Happening soon", so React tried to serialize a function prop from the server and threw on every request to `/`. `/discover` was unaffected because `EventCard` was reached only through the client `DiscoverExperience`, which is why the failure was specific to the new home page.
* **Why validation missed it:** typecheck and lint accept handlers in a file that is not a Client Component, and `next build` does not render dynamic (Clerk) routes, so the error only appears on a real request.
* **Fix:** added `"use client"` to `event-card.tsx`. Also added it to `filter-chip.tsx`, which has an `onClick` and had the same latent problem (only used from client components today). No behavior or scope change.
* **Guard added:** `components/discover/server-boundary.test.ts` fails if a `.tsx` file in `components/discover` has an inline event handler without `"use client"`. It is a heuristic, not a full check.
* **Not verified:** no pnpm, build, or running app here. Please load the new Preview. If it still fails, I need the Vercel runtime log for `/` (Functions logs), since I have now ruled out the two code causes I could find and the remaining candidates are Clerk environment variables on the Preview.
* **Follow-up worth doing:** a Playwright smoke test that requests `/` and `/discover` against a started build (needs Clerk test keys in CI). It is the only check that exercises server rendering.

## Vercel Preview runtime failure fix, first attempt (PR #67 follow-up, requested by Rich)

The Preview showed "This page couldn't load / A server error occurred."

* **Probable root cause (static analysis; I could not run the app or read Vercel runtime logs):** `components/ui/badge.tsx` (new in this PR), `input.tsx`, `tabs.tsx`, and the existing `card.tsx` and `avatar.tsx` imported `cn` from the npm package `cn` (`from "cn"`) instead of the project helper `@/lib/utils`. `cn` is an unrelated package (it is in `apps/web/package.json`), and it is not the clsx/tailwind-merge helper these components need. The home page (`/`) now renders `EventCard`, then `RevivalTypeBadge`, then `Badge`, so the broken import runs on the server for every visit to `/`. Before this PR nothing rendered those components on `/`.
* **Why validation missed it:** lint, typecheck, and unit tests never render the component. `next build` does not fail either, because Clerk makes these routes dynamic, so they are not prerendered at build time and the import is first exercised at request time.
* **Fix:** the five components now import `cn` from `@/lib/utils`. No functionality or scope change. The unused `cn` dependency is still in `apps/web/package.json`; removing it needs a lockfile regeneration, so it is left for a separate cleanup.
* **Guard added:** `components/ui/imports.test.ts` fails if any UI component imports from the package `cn`.
* **Not verified:** I could not run pnpm, the build, or the app in this environment, so the fix is unverified until the new Vercel Preview loads. If it still fails, send me the Vercel runtime log for `/`; other candidates are the Clerk environment variables on the Preview and anything else the log names.
* **Manual test for Rich:** open the new Preview, load `/`, then `/discover`, tap Near Me, and open an Event Details page. Each should render without the error page.
* **Follow-up worth doing:** a Playwright smoke test that requests `/` and `/discover` against a started build (needs Clerk test keys in CI).

## `docs/ui.md` repair (PR #67 follow-up, requested by Rich)

Commit `98da759` on `main` ("updated ui.md with fire design requirements") pasted a copy of `docs/ui.md` with Markdown escaping damage (`**\##` headings, `\*` bullets, escaped backticks and HTML comments, hard-wrapped lines, a stray `**` and a duplicate `## 24.` heading). This branch repairs it; **no application code was changed**.

* **Method:** the malformed file was compared section by section against the last known-good version (`bc41d25`) and this branch's version. Sections 1 to 21 and the rest were substantively identical apart from escaping, "Signal One" becoming "Signal One Sound" in prose, and the renumbering below. The malformed commit also dropped this branch's Issue #66 additions (the dark-theme token paragraph in the Semantic Design Tokens section and the extra Appendix component list); these were kept.
* **Added:** section 22 "Signal One Sound Visual Identity" (core direction, directions to avoid, brand name and wordmark, cross-client identity, accessibility, relationship to the design system), with its rules kept in full.
* **Renumbered:** 22 Visual Identity, 23 Design System Hierarchy, 24 Semantic Design Tokens, 25 Centralized Brand Assets, 26 Component Reuse Order, 27 Controlled Overrides, 28 Web and Mobile Sharing, 29 Magic Values in UI, 30 Relationship to Code Quality, 31 Final Rule. Internal references were updated (sections 5, 14, 25, 26, 29). References in `docs/notes.md` and `docs/code-quality-audit.md` were updated too.
* **Naming:** prose says "Signal One Sound". Technical identifiers (`@signalone/shared`, `@signalone/validation`, paths) are unchanged. Section 1's "Signal One is a multi-client application." and the phrase "Signal One" inside the section 22 rule about not shortening the name are intentionally unchanged (the first matches the unchanged text in the malformed version and `CLAUDE.md`'s platform wording).
* **To reconcile when `main` is merged:** this branch repairs `docs/ui.md` from the pre-malformed base, so merging into `main` will conflict with `98da759` in that file. Take this branch's version.
* **Not changed (application code, out of scope):** the comment in `apps/web/components/brand/brand-wordmark.tsx` cites "docs/ui.md section 24" for brand assets; that section is now 25.

## Visual direction revision (PR #67 follow-up, requested by Rich)

The cream/beige, burnt-orange, serif look was **not approved**. Replaced with a dark, gold-illuminated direction. Repo review: no brand/visual reference assets exist (only the reverted Issue #57 fire/gold concept, which is not a requirement), so the direction follows Rich's written brief.

* **Tokens only** (`apps/web/app/globals.css`): black/charcoal surfaces, luminous gold `primary`, bright-gold `highlight`, new `ember` accent (warm amber-orange, not dominant), new `glow` shadow color, `shadow-glow` utilities, and `bg-atmosphere` / `bg-hero-glow` / `text-gradient-gold` utilities. The app is dark-only (`dark` on `<html>`).
* **Typography:** Fraunces serif removed; Geist for headings and body, heavier weights for hierarchy. Also fixed `--font-sans`, which previously did not resolve to Geist.
* **Home (`/`)** recomposed: full-width glowing hero ("Find the fire near you."), primary CTA, three-step explainer, and a "Happening soon" strip of mock events. The `/discover` hero uses the same tokens.
* **Components** only consume tokens: Button default gets a gold glow, event cards and map glow on hover/selection, Revival Type badges are outlined, header is translucent (sticky on larger screens). Text wordmark kept; no logo designed.
* **Unchanged:** all Discover functionality, mock data, and scope; no backend or schema change.
* **Validation:** lint, typecheck, 133 unit tests, and `next build` pass. I could not view the rendered UI, so please review the Vercel Preview on desktop and iPhone (home, `/discover` after Near Me, map, Event Details).
* **Known gap:** dashboard, proof, and Clerk screens inherit the dark theme through tokens but were not individually reviewed.

## What was built

An interactive, responsive Discover Revival mock at **`/discover`** with Event Details at **`/discover/<event-id>`**. `/` gained a "Discover revival near you" button. Flow:

Hero (Discovery/Home) -> **Near Me** -> distance / date / Revival Type filters -> results as list and map -> **Event Details** -> **Directions / Share / Save**.

### Startup requirements represented (product plan section A)

| Plan item | In the mock |
| --- | --- |
| Interactive GPS/location revival map | Schematic SVG map with search-radius rings and one pin per result (no real GPS, no map tiles) |
| Search distance: 10, 25, 50, X, unlimited | 10 / 25 / 50 / Unlimited chips; **X is shown disabled** because it is UNDECIDED |
| Search by date | Any date, Today, This weekend, Next 7 days, Next 30 days, or a specific day |
| Search by multiple Revival Types | All 12 types from the plan; multi-select |
| Share event links | Share button: device share sheet, else copies the event link |
| Church Portal fields as displayed data | Church/Ministry name, 1 to 3 links, dates and times, Venue Name / Street / City / State / ZIP, multi-type tagging |

Shown to evaluate presentation although they are **not** section A: Speakers (Later Phase 1, B1) and Save (favorites, Later Phase 1, B). They are mock-only and called out below.

### Not included on purpose

Accounts/sign-in gating, invite friends, push notifications and criteria, city/state/ZIP search, fire emoji, comments, reminders, flyers (UNDECIDED), livestream links (UNDECIDED), recurring-event rules, and the Church Portal itself.

## Mock behaviors implemented

* **Near Me** simulates locating (0.7 s spinner), then picks a mock origin. Real geolocation is never requested. Chips switch the mock location between Nashville TN, Dallas TX, and Tulsa OK.
* **Filters change results live** and live in the URL (`/discover?near=nashville&radius=50&date=weekend&types=baptism`). Back from Event Details restores the search; a search URL can be shared.
* Revival Types combine with **OR** (an event matches if it has any selected type). Results sort soonest first; distance shown per card.
* Multi-day events match any day they run; ended events never appear. Mock "today" is fixed at **Mon Oct 5, 2026** (a banner says so) so results are deterministic.
* **Empty state** (no matches) offers "Search unlimited miles" and "Clear filters". **Pre-location state** prompts for Near Me.
* **List/Map**: desktop shows both side by side (map sticks while scrolling); on phone widths a List | Map toggle switches. Hovering a card or tapping a pin selects it; a preview card with "View details" appears under the map.
* **Directions**: a real Google Maps directions link to the (fictional) venue address, opens in a new tab.
* **Share**: `navigator.share` where available (iPhone Safari), otherwise copies `/discover/<id>` and says so.
* **Save**: toggles a heart; stored in this browser's `localStorage` only (messages say so). Not an account feature.
* 19 fictional events across Nashville, Dallas, and Tulsa areas, 12 types, multi-day and single-day, 0 to 3 speakers, 1 to 2 links each. All names/addresses are fictional; links use `example.org`.

## Files changed

* **Routes:** `apps/web/app/discover/page.tsx`, `apps/web/app/discover/[eventId]/page.tsx`; `apps/web/app/page.tsx` (wordmark + Discover button); `apps/web/app/layout.tsx` (title "Signal One Sound", dark theme).
* **Theme:** `apps/web/app/globals.css` (dark gold/ember tokens, atmosphere utilities).
* **Brand:** `apps/web/components/brand/brand-wordmark.tsx`; `apps/web/components/auth/auth-header.tsx` now uses it.
* **Discover components:** `apps/web/components/discover/` `discover-experience`, `discover-filters`, `filter-chip`, `event-card`, `revival-type-badge`, `revival-map`, `event-actions`, `save-button`, `mock-banner`.
* **shadcn primitives added (official tooling):** `components/ui/tabs.tsx`, `badge.tsx`, `input.tsx`.
* **Logic and mock data:** `apps/web/lib/discover/` `mock-data.ts` (clearly labeled mock), `types.ts`, `revival-types.ts`, `filters.ts`, `format.ts`, `use-saved-events.ts`.
* **Tests:** `apps/web/lib/discover/filters.test.ts`, `mock-data.test.ts`.
* **Docs:** `docs/ui.md` (new tokens/components), `docs/naming-conventions.md` (header/home/metadata now say Signal One Sound), this file.

## Reusable components and tokens introduced

* Tokens: `highlight` (+ foreground), `hero` (+ foreground), `font-display`/`font-heading`; `primary`, `background`, `card`, `muted`, `accent`, `border`, `ring` retuned in light and dark. Changing the look globally means editing `globals.css`.
* `BrandWordmark` (single place the name is styled; swap for a logo later), `RevivalTypeBadge`, `EventCard`, `FilterChip`, `RevivalMap`, `EventActions`/`SaveButton`.

## Architectural decisions

* Mock lives under `lib/discover/` with its own mock-stage types. They are **not** in `@signalone/shared` or `@signalone/validation` and are **not** a schema or contract (Database Design Checkpoint comes later).
* No new dependency, no map SDK, no API route, no DB access. Pages are public (not added to the protected-route list).
* The Issue requires the full name in product UI, so the shared header, home title, and metadata were changed from "Signal One" to "Signal One Sound". Dashboard, Clerk, and mobile copy were **not** touched.
* The retuned global tokens also restyle existing pages (sign-in/up, dashboard, proof); that is the intended "refine globally" behavior but was not individually reviewed.
* Mobile (React Native) not implemented. Native shared-token source is still undecided (`docs/ui.md` section 28).

## Verification (this branch, this run)

| Check | Command | Result |
| --- | --- | --- |
| Typecheck | `pnpm --filter web typecheck` | passed |
| Lint | `pnpm --filter web lint` | passed, no output |
| Unit tests | `pnpm --filter web test` | 15 files, 133 tests passed |
| Build | `pnpm --filter web build` | passed; `/discover` and `/discover/[eventId]` built |

Not run: full `pnpm validate`, boilerplate checks, Playwright, and any visual/browser inspection (no browser available in this job). **The layout has not been seen rendered by me**; GitHub CI and the Vercel Preview are authoritative.

### Test Value Review

| Group | Protects | Level | Why worth it | Priority |
| --- | --- | --- | --- | --- |
| `filters.test.ts` | radius, Revival Type OR, multi-day dates, weekend/today ranges, ended-event exclusion, URL parse/serialize (ignores bad URL values) | unit | Pure logic that every control depends on; cheap and deterministic | High |
| `mock-data.test.ts` | unique ids, valid types/dates, 1 to 3 links, required address parts | unit | Keeps edited mock data consistent with the plan's startup fields | Normal |

Not automated: component rendering, the map, Share/Save/Directions, and the responsive layout. This is exploratory UI whose look and flow will change; manual review is the right layer. No Playwright test was added (it would pin a flow Rich has not approved).

## Manual exploratory testing for Rich

Open the Vercel Preview, then `/discover`.

**Desktop**
1. Tap **Near Me**. Expect a brief "Finding you…" then "N events within 25 miles of Nashville, TN", list left, map right.
2. Choose **10 miles**, then **50 miles**, then **Unlimited**; the count, pins, and rings change. (Clarksville appears at 50, Chattanooga only at Unlimited.)
3. Pick **This weekend**; then pick a specific day in the date box (try Oct 10). Pick **Baptisms** and **Youth events** together; both types appear.
4. Switch the mock location to **Dallas**, then **Tulsa**. Combine filters until nothing matches and check the empty state buttons.
5. Hover a card (its pin highlights); click a pin (preview card appears), then **View details**.
6. On Event Details: **Directions** (opens Google Maps), **Share** (link copied message), **Save** (heart fills). **Back to results** keeps your filters. Return to the list and confirm the heart is filled.
7. Open `/discover/fire-fall-tent-revival-franklin` (multi-day, two speakers) and `/discover/monday-night-prayer-nashville` (no speakers).

**iPhone (Safari)**
1. Same flow at phone width: use the **List | Map** toggle; check filter chips wrap, tap targets feel right, and pins are tappable.
2. **Share** should open the iOS share sheet. **Directions** should offer Maps/Google Maps.

**Edge cases:** reload mid-search (state survives via URL); invalid URL values fall back to defaults; Save persists across reloads in the same browser only.

**Evaluate specifically:** the fire/gold visual direction and wordmark treatment; whether the hero is too heavy on mobile; list vs map emphasis; card information density; Event Details section order.

## Product/UX questions discovered

1. **Radius "X"**: what is it? (shown disabled). Default radius (currently 25)?
2. **Revival Type matching**: any-of (OR, as built) or all-of?
3. **Date semantics**: should "this weekend" include Friday? Should a multi-day event match if any day falls in range (as built)?
4. **Before Near Me**: show nothing until location is set (as built), or show events nationally?
5. **Near Me denied/unavailable**: fallback needs design (city/state/ZIP search is Later Phase 1).
6. **Recurring events** ("Manage current/recurring events"): how should "every Friday" display and filter? Not mocked.
7. **Speakers and Save** are not startup scope; keep, defer, or remove from the first real slice?
8. **Event Details**: should Church/Ministry become a tappable profile? Is "Hosted by" the right label (Organizer is UNDECIDED)?
9. **Revival vs Event** wording in UI: the mock says "events" and "revival gatherings"; the plan leaves "Revival" UNDECIDED.
10. **Flyers and livestream** (UNDECIDED): where would they sit on Event Details?
11. **Time zones**: events show local time only; does the model need a venue time zone?
12. **Map**: real provider, clustering, and cluster behavior with many pins are undecided.
13. **"Free monthly member accounts"** (plan K3) is unresolved and not represented.

## Data the mock suggests the real model needs (for the later review; not a design)

Event with title, summary, description, one or more Revival Types, start/end date and time (multi-day), venue name/street/city/state/ZIP plus coordinates, Church/Ministry name with 1 to 3 links, optional speakers; per-user saved events; distance/radius search, date-range overlap, multi-type filter, and a shareable stable event id/URL.

## Unresolved concerns

* Visual result unverified by me (see Verification); expect polish feedback.
* Fraunces was removed in the dark revision; headings use Geist (confirm the typography direction).
* Mock "today" is fixed to Oct 5, 2026 and will look stale later.

## Recommended next steps (recommendation only)

After Rich's review: refine this PR on feedback, then a Data Requirements Review and Database Design Checkpoint, then a feature spec under `/docs/features/`. Do not start either without authorization.
