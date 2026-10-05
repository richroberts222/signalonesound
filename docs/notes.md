# Issue 61 Handoff: Reusable UI Design System and Clean Code Standards

* **Issue:** #61 "Establish Reusable UI Design System and Clean Code Standards"
* **PR:** not yet created (link below in the issue comment). Do not merge automatically.
* **Canonical branch:** `claude/issue-61-20261005-1601`; base `main` (includes completed Issue #60, PR #62).
* **Type:** documentation, rules and read-only audit. No application code, schema, API, auth, or mobile behavior changed. `signal-one-foundation-v1` untouched.

## Documents created

* `docs/code-quality.md`: Clean Code, DRY / single source of truth, interface and dependency-direction rules, error handling, testability, safe refactoring, Boy Scout Rule.
* `docs/code-quality-audit.md`: read-only audit (reference-app only, see boilerplate below).

## Documents modified

* `docs/ui.md`: new sections 22-29 (design-system hierarchy, semantic tokens, brand assets, component reuse order, controlled overrides, Web/Mobile sharing, magic values, relationship to code-quality).
* `CLAUDE.md`: reconciled after the merge. Now preserves BOTH rule sets: section 19 (Issue #60 Product Development System) and section 20 (Issue #61 Code Quality, Reuse, Refactoring); Final Rule renumbered to 21; the documentation list includes the Issue #60 entries (`product-development`, `naming-conventions`, `product/*`, `features/`) and `code-quality.md`.
* `scripts/boilerplate/manifest.mjs`: `docs/code-quality-audit.md` added to `REFERENCE_ONLY_PATHS` (the audit describes this repository's code, so it is reference-app only). Leak detector not changed or weakened.
* `docs/notes.md`: this file.

## Reconciliation with Issue #60

* Official user-facing name is **Signal One Sound** (`docs/naming-conventions.md`). The earlier audit finding F3 treated the name as an open question; it is corrected: the name is decided, the observed "Signal One" copy is pre-existing and its correction is a separate approved application slice, and technical identifiers (`signalone`, `@signalone/*`, `signalone_tooling`, tag `signal-one-foundation-v1`, repo `signalonesound`) are not renamed without a compatibility review.
* `docs/ui.md` product examples (`EventCard`, `RevivalTypeBadge`, `OrganizationCard`, `SpeakerCard`) are now inside a `boilerplate:reference` region, with pointers to naming-conventions (UNDECIDED terms such as Organizer must not be invented), the product plan, and approved feature specs. Examples remain examples, not authorization (product-development: only an approved issue authorizes implementation).
* Generic docs (`ui.md`, `code-quality.md`) no longer carry product-name wording in the new sections; references to the audit are in `boilerplate:reference` regions.

## Rules established (summary)

* **UI / design system:** hierarchy global design system -> semantic tokens (`globals.css`) -> shadcn primitives -> reusable components -> variants -> feature composition -> scoped override. Centralized brand assets (single brand component/asset reference, documented exceptions). Component reuse order. Controlled overrides promoted to variants/tokens when repeated. Web and Mobile stay separate implementations, sharing vocabulary, semantics, contracts, accessibility intent and brand identity; no shared token source is mandated yet.
* **Code quality:** DRY as one authoritative implementation per concept (no abstraction of coincidental similarity); SRP, cohesion, naming, no arbitrary line limits; magic values only when a constant carries meaning; integrate with the existing error architecture; Test Value Review; safe-refactoring steps; Boy Scout Rule bounded to low-risk in-scope cleanup; broad refactors need explicit authorization.
* **Interfaces / dependencies:** UI -> API/contracts -> services -> repositories -> Drizzle -> Neon; interfaces only where they give concrete value (isolation, substitutability, testability, stable shared contracts); no interface for its own sake. `architecture-rules.md`, `services.md`, `api.md`, `shared-code.md` remain authoritative where they already own a topic.

## Audit findings (none refactored)

* F1 Recommended before product development: raw `text-red-600`/`text-green-700` in `apps/web/components/proof/proof-items-panel.tsx`; no `success` token.
* F2 Minor cleanup: proof panel uses raw `<input>`/`<label>`; shadcn `input`/`label` not installed.
* F3 Recommended before product development: brand text repeated in 5 places (web page, auth header, layout metadata, mobile App, app config), no brand component/assets, unused create-next-app SVGs in `apps/web/public`.
* F4 Future improvement: mobile literal styles; no mobile theme module.
* Possible concerns (not defects): P1 services importing `db/errors` (documented design), P2 size of `packages/shared/src/env.ts`, P3 uncommented `* 2` on `maxLength`.
* No significant architectural concerns.

## Existing good practices

Shared contracts and limits defined once; package dependency direction enforced by tests; layered backend with a single composition root; no UI access to Drizzle/Neon; business logic not in UI; justified abstractions (`ProofItemRepo` with fake, `AtomicRunner`); one error architecture; centralized Tailwind/shadcn theme including Clerk theming; component reuse of `Button`.

## Potential refactors (all need separate approved issues)

Add `success`/`warning` tokens; decide brand asset approach and brand component (carrying "Signal One Sound"); add shadcn `input`/`label` with the first real form; decide mobile theme module; delete unused template SVGs. Risk: low each.

## Validation

* **Not run in this session:** the automation environment had no `pnpm` and node script execution required approval, so `pnpm install`, `pnpm test:boilerplate`, `pnpm validate`, lint, typecheck, and build were NOT run. The previous session (before the merge) ran `pnpm -r test` successfully, but that predates the reconciliation.
* The manifest change and new `boilerplate:reference` regions in `CLAUDE.md`, `docs/ui.md`, `docs/code-quality.md` are unverified against the leak detector and export. Whether region markers are processed in `CLAUDE.md` specifically was not confirmed.
* **CI follow-up fix:** CI reported `docs/ui.md:497 [proof-reference]` (a `proof-item` / `migration_proof` reference). The `PROOF_ITEM_LABEL_MAX` example in section 28 names the proof slice, so it is proof-slice-specific prose, not generic wording. It is now wrapped inline in the existing `boilerplate:proof` region (`docs/boilerplate.md`), so export and init remove exactly that parenthetical and the sentence stays valid. The leak detector and tests are unchanged. Not re-run locally (no pnpm); CI is authoritative.
* Not tested: export (`pnpm export:boilerplate`), `pnpm prove:init`.

## Manual steps for Rich

1. Run `pnpm install --frozen-lockfile && pnpm test:boilerplate && pnpm validate` (or let CI run `validate`) and report any boilerplate leak or dangling-reference failure.
2. If `test:boilerplate` flags `CLAUDE.md` or `docs/ui.md`, the fix is in the reference markers or `manifest.mjs`, not the detector.
3. Read `docs/code-quality.md`, `docs/ui.md` sections 22-29, and `docs/code-quality-audit.md`.

## Unresolved

* Validation above not yet run (blocking for confirming boilerplate separation).
* `CLAUDE.md` still lists product docs (now also in the boilerplate flow as before Issue 61); how standalone export treats `CLAUDE.md` references was not re-verified.
* Brand asset approach, mobile token strategy: undecided by design.

## Recommended next step

Run the validation commands above. If green, review and merge Issue 61 manually, then open separate issues for audit findings F1 and F3 before the first product screens.
