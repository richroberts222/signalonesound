# Notes — Issue #57: Create First Signal One Home UI Concept

- PR: none yet at time of writing (see issue #57 comment for the PR link).
- Canonical branch: `claude/issue-57-20261001-2129` (base `main`).
- Latest commit: see `git log` on the branch.
- Status: **experimental, web-only visual concept**. No backend, DB, API, auth, env, or Expo changes. `signal-one-foundation-v1` tag untouched.

## Work completed

A responsive fire/gold home page at `/` with a hero ("Signal One", "Holy. United. Awakened."), a "Find Revival" search/filter/map-preview section, and an upcoming-gatherings card grid.

## Files changed

- `apps/web/app/page.tsx` — replaced placeholder home with Hero + RevivalFinder + footer.
- `apps/web/app/globals.css` — scoped home theme tokens, gold text utility, reduced-motion-aware glow animation.
- `apps/web/components/home/hero.tsx` — new.
- `apps/web/components/home/revival-finder.tsx` — new (client component, local state only).
- `apps/web/components/home/mock-data.ts` — new, static mock data.
- `apps/web/components/ui/badge.tsx`, `input.tsx` — added via shadcn CLI (import of `cn` changed to `@/lib/utils` to match existing ui files).
- `docs/notes.md` — this file.

## Visual direction

Dark warm-brown background, radial ember/orange glow behind the hero, amber/gold primary, gold gradient wordmark, translucent glass cards with amber ring and soft glow on hover. All effects are CSS gradients; no images or external assets.

The theme is applied as a **scoped token override** (`body:has(.signal-home)`) so other routes (dashboard, proof, sign-in/up) keep the default theme. The layout's `AuthHeader` picks up the dark tokens automatically. This is an experiment, not a permanent branding or theming rule.

## shadcn components

Reused: `Button`, `Card` (+Header/Title/Description/Content/Footer). Added: `Badge`, `Input`.

## Mock/static data

`components/home/mock-data.ts`: event type filters, six placeholder gatherings (fictional "Example"/"Sample" hosts), five map pin positions. Not persisted, not fetched.

## Responsive behavior

Mobile-first. Hero CTAs stack full-width on phones; filter chips scroll horizontally on narrow screens and wrap from `sm`; cards are 1 column → 2 (`sm`) → 3 (`lg`); map preview stacks under search on mobile and sits beside it on `lg`. Touch targets are 40–44px tall.

## Animations / effects

One slow "breathing" opacity/scale animation (`signal-flame`) on the hero glow and map pins; disabled under `prefers-reduced-motion: reduce`. Hover glow on cards is a shadow transition only.

## Accessibility

Decorative glows/pins are `aria-hidden`; map preview has a text alternative; search is a labeled `role="search"` form; filters are buttons with `aria-pressed` in a labeled group; result count is `aria-live="polite"`; icons are `aria-hidden`; shadcn focus rings preserved. Muted text is a light amber on dark brown (intended to be readable; contrast ratios were not measured with a tool).

## Tests

None added. Test Value Review: the change is presentational with static data; the only logic is a trivial in-memory filter over mock data, which does not protect meaningful product behavior. Existing tests unaffected.

## Validation actually performed (latest run)

- `pnpm --dir apps/web lint` — passed, no output.
- `pnpm --dir apps/web typecheck` — passed.
- `pnpm --dir apps/web build` — passed.
- `pnpm --dir apps/web test` — 13 files, 124 tests passed.

## Not tested

- Not viewed in a browser or on a real phone/tablet (no screenshots taken); visual quality, overflow, and contrast are unverified until the Vercel Preview is reviewed.
- Playwright e2e not run (requires Clerk test setup). Mobile app not touched or run.
- Database-backed/integration tests not run (DEV/QA/STAGE/PROD DBs not accessed).

## Unresolved visual concerns

- The `body:has()` token override is a concept shortcut; a real theme would likely use a route group/layout.
- Hero glow sizing and the horizontally scrolling chip row need on-device review.
- `backdrop-filter` blur on cards/header may be heavy on low-end phones.
- The `Show` signed-in/out hero content from the old placeholder was removed; auth actions remain in the header.

## Recommended next steps

Review the Vercel Preview on an iPhone, pick which concepts (map, filters, cards) to keep, then decide on theme/branding rules and document them in `docs/ui.md`.
