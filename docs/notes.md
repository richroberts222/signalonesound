# Handoff Notes

## Issue / PR

- Issue #61: Establish Reusable UI Design System and Clean Code Standards
- PR: created from this branch (number assigned on creation). NOT merged; the human is the merge gate.

## Branch and base

- Canonical branch: `claude/issue-61-20261005-1601`
- Base: `main` at `9e55d6a`
- Latest commit: the single commit on this branch on top of `9e55d6a` (see `git log`).
- Tag `signal-one-foundation-v1`: not touched.

## Documents created

- `docs/code-quality.md`: Clean Code standard (DRY/single source of truth, interfaces and boundaries, dependency direction, functions/modules, constants, error handling, testability, safe refactoring, Boy Scout Rule).
- `docs/code-quality-audit.md`: read-only audit of the current repository.

## Documents modified

- `docs/ui.md`: added sections 22 to 29 (design-system hierarchy, semantic tokens, brand assets, component reuse order and reusable product components, controlled overrides, Web/Mobile sharing, magic values, relationship to code quality). "Final Rule" is now section 30. Short pointers added in sections 5 and 14. Existing sections otherwise unchanged.
- `CLAUDE.md`: added `docs/code-quality.md` to the expected docs list and a concise new section 19 (router to the docs); "Final Rule" is now section 20.
- `docs/notes.md`: overwritten (this file).
- No other docs were changed; existing owners (`services.md`, `api.md`, `shared-code.md`, `testing.md`, `architecture-rules.md`) are referenced, not duplicated.

## UI / design-system rules established (`docs/ui.md`)

- Hierarchy: global design system -> semantic tokens -> shadcn primitives -> Signal One reusable components -> variants/config -> feature composition -> local override.
- Use semantic tokens from `apps/web/app/globals.css`, not raw palette values or literal colors; add tokens (for example `success`) only when genuinely needed.
- Brand assets defined once (BrandLogo / BrandWordmark / AppIcon are examples only); documented exceptions for genuinely distinct variants.
- Seven-step component reuse order; variants/composition over copying; no giant universal components.
- Reusable product components (EventCard, etc.) are examples, not authorization.
- Controlled-override rule; Web and Mobile stay separate implementations but share vocabulary, contracts, accessibility intent, and brand identity.

## Code-quality rules established (`docs/code-quality.md`)

- One authoritative implementation per concept; do not abstract coincidental similarity.
- Focused functions/modules, intent-revealing names, no hidden side effects, no dead code, comments explain why, no line-count limits.
- Named constants only where they carry meaning or a source of truth.
- Use the existing `Result`/`AppError`/`runService` error foundation; no second error architecture.
- Testability without distorting production code; Test Value Review applies.
- Eight-step safe-refactoring procedure; broad refactors need explicit approval; Boy Scout Rule is limited to small, low-risk, in-scope cleanups.

## Interface / dependency rules established

- Interfaces only where they add concrete value (isolation, substitutability, testability, stable contracts); none "for interface's sake".
- Dependency direction: `apps -> validation -> shared`; UI -> contracts -> API -> service -> data access -> Drizzle -> Neon. UI never touches Neon/Drizzle; Clerk details stay in the auth boundary; shared contracts stay framework-free; row types are not contracts. Existing architecture docs remain authoritative.

## Audit findings (see `docs/code-quality-audit.md`)

Confirmed:
- F1 (Recommended before product development): `text-red-600` / `text-green-700` in `apps/web/components/proof/proof-items-panel.tsx`; no `success` token.
- F2 (Minor cleanup): proof panel uses raw `<input>`/`<label>`; no shadcn `input`/`label` installed.
- F3 (Recommended before product development): "Signal One" text repeated in 5 places; no brand component/assets; unused create-next-app SVGs in `apps/web/public`. Product name in the issue ("Signal One Sound") differs from code/docs ("Signal One"); not decided here.
- F4 (Future improvement): literal style values in the mobile proof screen; no mobile theme module.

Possible concerns (not defects): services importing `DatabaseError` from `db/errors` (documented, allowed); size of `packages/shared/src/env.ts` (cohesive); uncommented `PROOF_ITEM_LABEL_MAX * 2`.

No significant architectural concerns found.

## Existing good practices

Single-source contracts and limits in shared packages; enforced package dependency direction; route -> adapter -> service -> repository layering with a single composition root; no UI access to the database; justified `ProofItemRepo` (real + fake) and `AtomicRunner`; single error architecture; centralized shadcn/Tailwind theme that also themes Clerk; reused `Button`; no duplicated components found. Full list in the audit.

## Potential refactors identified (none performed)

1. Add `success`/`warning` tokens; use `text-destructive` for errors.
2. Decide official product name and brand asset approach; add brand component per client; delete unused SVGs.
3. Add shadcn `input`/`label` with the first real form.
4. Mobile theme module (future).

Each needs a separate approved issue.

## Risk assessment

This PR is documentation only. No application code, schema, migrations, API, auth, or mobile behavior changed. Refactors above are low risk (class-name / presentation-level), mostly needing a visual check.

## Validation performed

Run on this branch with `corepack pnpm` (pnpm not on PATH):
- `pnpm install --frozen-lockfile`: passed
- `pnpm -r --if-present test`: shared 39/39, validation 24/24, mobile 10/10, web 13 files 124/124 passed. This includes the repository's security/boundary tests.
- Checked that every `/docs/...` path referenced in the new/changed docs exists, and that the new rules reference (not contradict) `architecture-rules.md`, `services.md`, `api.md`, `shared-code.md`, `testing.md`.
- No new tests added (documentation only; Test Value Review).

## Not tested

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:boilerplate`: not run (no code changed; skipped as not meaningful for docs-only changes). CI will run `validate`.
- Visual UI, Vercel preview, sign-in, API and database flows: not exercised.
- The audit is based on reading and targeted searches, not a dependency-graph tool; it may miss patterns.

## Unresolved concerns

- Official product name ("Signal One" vs "Signal One Sound") needs a human decision before brand work.
- Whether a shared Web/Mobile token source is wanted is undecided (documented as such in `docs/ui.md`).

## Recommended next step

Review the PR; if agreed, merge manually. Then open small issues for audit items 1 and 2 before the first product screens are built.
