# Rules review 4: `code-quality.md` (11 sections), `naming-conventions.md` (4 sections), `ui.md` (31 sections and an appendix)

Reviewed 2026-10-09 against the code, the guard tests and the template tooling. Verdict key as in `README.md`.

## Overall verdict

All three documents are **correct as written**. Reading them in full found three real defects in how they behave when the template is exported (a rule leaking the product's identity into every new app, a name rewrite that corrupts the name, and a design rule with no test). All three are fixed here.

## `code-quality.md`

| § | Rule | Verdict | Mechanism or note |
| --- | --- | --- | --- |
| 1 | One source of truth; do not abstract coincidental similarity | Sound, Guidance | A judgment call; no tool can decide "same concept" |
| 2 | Interfaces only where they give concrete value; no DI framework | Sound, Guidance | Consistent with `services.md` (explicit factory arguments, no container) |
| 3 | Dependency direction: apps → validation → shared; UI → API → service → data access | Sound, Enforced | Structural: `packages/shared` declares no dependency on `validation` or apps, and pnpm's strict module layout makes an undeclared import fail typecheck and build. Also the service-layer boundary test and the `'use client'` import test |
| 3 | Clerk stays in the auth boundary | Sound, Enforced in part | Services may not import Clerk (boundary test). Pages and the shell import Clerk UI, which the rule allows as "UI wiring" |
| 4 | Focused functions; remove dead code; no arbitrary size limits | Sound, Enforced in part | Unused variables fail lint (proved earlier by breaking it). Commented-out code is not detected; acceptable |
| 5 | Named constants only where they carry meaning | Sound, Guidance | |
| 6 | One error architecture (`Result`, `AppError`, `reportUnexpectedError`) | Sound, Enforced | `report.test.ts`, `api.test.ts`, service tests |
| 7 | Testability without distorting production code; Test Value Review | Sound, Guidance | |
| 8 | Safe refactoring steps; repository-wide refactors need approval | Sound, Guidance | The approval half is a process rule (`issues.md`) |
| 9 | Boy Scout rule within scope | Sound, Guidance | |
| 10 | UI reuse owned by `ui.md` | Sound | |
| 11 | Simplicity wins; report, do not silently rewrite | Sound, Guidance | |

Optional later (already tracked, F-CODE-003): the stricter `noUncheckedIndexedAccess` compiler check would flag 29 places; deferred until the first real service is written.

## `naming-conventions.md`

| § | Rule | Verdict | Mechanism or note |
| --- | --- | --- | --- |
| 1 | The user-facing name is **Signal One Sound**; never shorten it to "Signal One", "ROCK" or "SOS" | Sound, **Gap** | No test. Two known violations remain in the apps: the dashboard greeting fallback ("Signal One user") and the mobile title ("Signal One"). Not fixed here: application copy is paused. A guard test is not proposed: it would be product-specific, and the template leak check flags those words in any file outside the reference-only folders |
| 2 | Technical identifiers (`signalone`, `@signalone/*`) are not renamed without a compatibility evaluation | Sound, Guidance | |
| 3 | Domain terms: only source-supported meanings; the rest stay UNDECIDED; do not invent terms | Sound, Guidance | Process rule |
| 3 | Vocabulary now incomplete | **Owner** | The owner has since decided three role names: **member**, **Church/Ministry manager** (requests the role, an admin approves) and **platform admin** (decisions Q-010, recorded in `product-plan.md`). They are not in this vocabulary table. The process rule says new terms are added here after the owner approves them. **Recommendation: yes, add all three**, leaving Organizer, Church and Ministry as standalone terms UNDECIDED |
| 4 | New terms land in the same pull request that introduces them | Sound, Guidance | |

## `ui.md`

| § | Rule | Verdict | Mechanism or note |
| --- | --- | --- | --- |
| 1, 15 | Web and mobile UIs are separate; do not force web components onto mobile | Sound, Enforced | Mobile boundary test forbids web imports |
| 2, 3, 17 | shadcn/ui is the component system; add components through the tooling | Sound, Enforced with an allowance | `raw-controls.test.ts` ratchet (17 raw controls in 9 files, issue #91). Only 6 primitives exist (avatar, badge, button, card, input, tabs); label, checkbox, switch, table, select, dialog and form are missing, which is why the exceptions exist |
| 4 | Tailwind is the styling system; avoid inline style objects | Sound, true today, no guard | A search finds zero inline `style={{}}` objects. Not enforced |
| 5, 18, 26, 27 | Reuse order, custom components, controlled overrides | Sound, Guidance | |
| 6, 16 | Component boundaries; no business rules in UI | Sound, Enforced in part | `'use client'` import test and the service-layer boundary test |
| 7 | Auth UI uses Clerk, themed with the shadcn variables | Sound | Themed from `lib/clerk-appearance.ts` |
| 8 | Responsive layouts | Sound, Guidance | No automated responsive check |
| 9 | Accessibility | Sound, **Gap** | Not enforced or measured (F-UX-002, launch gate) |
| 10, 11 | Forms and loading/empty/error states | Sound, Guidance | The form rules assume shadcn Form and Label primitives that are not installed yet |
| 12, 13 | Visual consistency; one icon library | Sound, true today | `lucide` is the configured library; one library in use |
| 14, 24 | Semantic tokens, not raw colors | Sound, **was unenforced**, now **Enforced with an allowance** | **New:** `semantic-colors.test.ts` ratchet (8 raw colors in 3 files today). Proved by breaking it two ways (add a raw color: fails; remove one without lowering the allowance: fails) |
| 19, 21 | No new UI library or styling framework without a decision | Sound, Guidance | Dependency additions are visible in review and Dependabot |
| 20 | Validate UI changes with typecheck, lint, build, tests, and inspect visually | Sound | `Validate` in CI; Vercel Preview for the visual half |
| 22 | The visual identity (dark charcoal, luminous gold, ember) is authoritative for this product | Sound for this product; **was a template leak** | The section was not marked reference-only, so every generated app inherited it (RUN: exported template contained it). Now wrapped in reference markers with a one-paragraph generic stub; heading is "Visual Identity" |
| 23, 25 | Design-system hierarchy; centralized brand assets | Sound, Guidance | `BrandWordmark` is the one place the name is styled |
| 28 | Web and mobile share vocabulary and contracts, not components. A shared token source is not established | Sound; **open technical decision** | Before the mobile UI is built (walking skeleton), a plain React Native token module that mirrors the semantic token names is the simplest option. I will decide this with the skeleton; no owner decision needed |
| 29 | Repeated values belong in the theme or the owning contract | Sound, partly Enforced | Token ratchet above |
| 30, 31, Appendix | Cross-references and final rule; setup notes | Sound | Appendix component list is accurate (6 primitives) |

## Fixed in this pull request

| Defect | Evidence | Fix | Check |
| --- | --- | --- | --- |
| `ui.md` section 22 (product visual identity) and three product-specific sentences shipped into every generated app | Exported template contained "luminous gold", "awakening", "revival" (RUN) | Wrapped in reference-only markers; generic stub kept; heading made generic | Export now contains none of those words |
| The name rewrite turned **Signal One Sound** into "**New Name** Sound" (for example "Harbor Notes Sound"); 49 lines in an export were affected, including the brand wordmark and page titles | RUN, export searched for the stray word | `SOURCE_IDENTITIES` now has the full official name first | New self-test; breaking it (removing the entry) makes the test fail; export now has zero such lines |
| Design-token rule (`ui.md` section 24) had no enforcement | 9 raw palette colors found (8 outside the demo slice) | `semantic-colors.test.ts` ratchet | Two break-it checks |
| `apps/mobile/package.json` had two entries on one line (valid JSON, but a sign of a hand edit) | READ | Split onto separate lines | JSON parses; `pnpm validate` passes |

## Owner decisions

1. **Add the three role terms (member, Church/Ministry manager, platform admin) to `naming-conventions.md`?** Recommendation: yes. This is a vocabulary change that the document says needs your approval, so it is not applied here.

## Open items (tracked elsewhere)

* Missing shadcn primitives and the 17 raw controls: issue #91 (waits for the app-code pause to lift).
* Accessibility enforcement: F-UX-002 (launch gate).
* Two "Signal One" strings in application copy: when application work resumes.
