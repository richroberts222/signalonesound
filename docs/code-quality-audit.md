# Code Quality Audit

Read-only audit of the repository at the time of Issue 61 against `/docs/code-quality.md` and the strengthened `/docs/ui.md`. **No application code was changed.** Any refactor below requires a separate approved issue.

Method: inspection of `apps/web`, `apps/mobile`, `packages/shared`, `packages/validation` using file listings, targeted searches (hard-coded colors, brand strings, `db`/Drizzle/Clerk imports, repeated constants), and reading the UI, API, service, and data-access modules. Not exhaustively line-by-line reviewed; searches can miss patterns. Tests were not re-run for this audit.

Classification: No issue / Minor cleanup / Recommended before product development / Future improvement / Significant architectural concern.

The repository is a small foundation (one infrastructure "proof item" feature, no product UI). Most principles are satisfied; findings are few and mostly small. None are significant architectural concerns.

---

## 1. Confirmed findings

### F1. Raw palette colors instead of semantic tokens in web UI: Recommended before product development

* `apps/web/components/proof/proof-items-panel.tsx:88,97` use `text-red-600`; line 102 uses `text-green-700`.
* `apps/web/app/globals.css` defines `--destructive` but no `success`/`warning` token.
* Reasoning: violates `/docs/ui.md` section 23. Error text already has a token (`text-destructive`); success has none, so the first product screen needing a success state will otherwise invent its own color.
* Recommended action: when product UI starts, use `text-destructive` for errors and add a `success` token (with dark-mode value) to the theme. Fixing the proof panel itself is optional (it is marked "not product UI").
* Refactor risk: low (class-name change, no behavior). Visual check needed.

### F2. Proof panel hand-builds form controls instead of using shared primitives: Minor cleanup

* `proof-items-panel.tsx` uses a raw `<input>` and `<label>` with local classes (`rounded-md border px-3 py-2`) and a `<ul>`/`<li>` with the same class string; `components/ui` has `button`, `card`, `avatar` only (no `input`/`label`).
* Reasoning: `/docs/ui.md` sections 2 and 10 say to use shadcn/ui `Input`/`Label` when suitable. The file is explicitly a minimal infrastructure proof, so impact is limited; the existing `Button` is reused.
* Recommended action: add shadcn `input`/`label` (official tooling) when the first real form is built; treat the proof panel as non-canonical meanwhile. Possibly remove or replace the proof panel when it is no longer needed.
* Refactor risk: low; covered indirectly by `apps/web/e2e/proof-items.spec.ts`.

### F3. Product name "Signal One" and brand text duplicated in several places: Recommended before product development

* `apps/web/app/page.tsx:8` (hero heading), `apps/web/components/auth/auth-header.tsx:9` (header link text), `apps/web/app/layout.tsx:19-20` (metadata title/description), `apps/mobile/src/App.tsx:25`, `apps/mobile/app.config.ts:9`.
* No logo, wordmark, or icon asset exists in the app. `apps/web/public/*.svg` (`file`, `globe`, `next`, `vercel`, `window`) are default create-next-app files and are not referenced by any code found in `apps/`.
* Reasoning: `/docs/ui.md` section 24 calls for one canonical brand representation. Today it is only text, so the duplication is small and cheap, but the name will be repeated further as screens are added. Note that the product's public name is "Signal One Sound" in the issue text while the code and docs use "Signal One"; this audit does not decide which is correct.
* Recommended action: when brand assets are approved, introduce one brand component/asset reference (web) and one native counterpart (mobile); confirm the official product name first. Remove the unused template SVGs in a small cleanup.
* Refactor risk: low. Do not rename technical identifiers (package scope `@signalone/*`, tag `signal-one-foundation-v1`).

### F4. Mobile uses literal style values: Future improvement

* `apps/mobile/src/proof/ProofItemsScreen.tsx:50` uses `borderColor: "#999"` and fixed sizes; `App.tsx` has its own `StyleSheet`.
* Reasoning: mobile has no theme or token module. `/docs/ui.md` section 27 intentionally does not mandate a shared token source and says it needs an architectural decision.
* Recommended action: when mobile product UI begins, decide a mobile theme module that shares semantic names (`primary`, `destructive`, ...) with the web theme. Not needed for the current proof screen.
* Refactor risk: low now; grows with screen count.

---

## 2. Possible concerns requiring more investigation (not defects)

### P1. Services import `DatabaseError` from `db/errors` (and `Database` type from `db/client`)

* `apps/web/lib/services/run.ts`, `lib/services/atomic.ts`, and `lib/api/report.ts` import `../../db/errors`; `services/proof-items.ts` imports the type `ProofItemRow` from `db/proof-items`.
* `/docs/services.md` (Portability) explicitly documents the `db/errors.ts` and `Database` type dependency, and `/docs/architecture-rules.md` section 29 allows boundary-level dependencies when they are the simplest option. This matches the documented design, so it is **not** a violation. The open question is only whether `DatabaseError` is better placed in a neutral module if services ever move to a shared package (the services doc already lists this as undecided). No action now.

### P2. Mixed-responsibility potential in `packages/shared/src/env.ts` (244 lines)

* Largest source file. Contains env validation and production guards. It is cohesive (one concern: environment validation) and test-covered (`env.test.ts`); size alone is not a defect and there is no line limit. Only worth revisiting if it gains unrelated concerns.

### P3. Client-side `maxLength={PROOF_ITEM_LABEL_MAX * 2}` in the proof panel

* The constant is correctly imported from `@signalone/validation` (no duplication). The `* 2` is a deliberate looseness so the server rejects over-long input, but the reason is not commented. Possible minor readability gain from a comment. Not a duplication or rule defect.

---

## 3. Existing good practices (principle satisfied)

* **Single source of truth for contracts and limits.** `PROOF_ITEM_LABEL_MAX`, schemas, `Result`/`AppError`, error codes, pagination, and API versions are defined once in `packages/validation` / `packages/shared` and reused by web UI, mobile client, API, and tests. Validation types derive via `z.infer`.
* **Dependency direction in packages.** `apps -> validation -> shared`; `packages/*` import no `apps/*`, React, Next.js, Clerk, or Drizzle (enforced by `apps/web/lib/security.test.ts`, `lib/env/boundary.test.ts`, `apps/mobile/src/boundary.test.ts`).
* **Layered backend with explicit dependencies.** Route (`app/api/v1/*/route.ts`) -> `lib/api` adapter -> `lib/services` -> repository in `db/` -> Drizzle. The composition root `lib/composition.ts` is the only place wiring `getDb()` to repositories to services; services take dependencies through factories (`createProofItemService({...})`). Route handlers do not query the database.
* **No UI access to infrastructure.** A search of `app/` and `components/` found no imports of `@/db`, `drizzle-orm`, or Neon. Clerk usage in UI is limited to Clerk's own UI components (`Show`, `SignInButton`, `UserButton`) and the sign-in/up pages, matching `/docs/auth.md`/`/docs/ui.md` section 7; server-side Clerk lives in `lib/auth` and `proxy.ts`.
* **Business logic not in UI.** `ProofItemsPanel` and `ProofItemsScreen` only call the shared API client and render the `Result`; the web and mobile clients reuse the same contract (`createProofItemClient`).
* **Justified abstractions.** The repository interface (`ProofItemRepo`) has two implementations (Drizzle and `proof-items.fake.ts`) and backs the acceptance suite in both in-memory and real-database runs. `AtomicRunner` exists because the Neon HTTP driver lacks interactive transactions (documented). No unnecessary interface layers were found.
* **One error architecture.** `ServiceError` -> `runService` -> `Result`/`AppError` -> `STATUS_BY_CODE`; unexpected errors go through `reportUnexpectedError` without leaking details.
* **Centralized theme.** `globals.css` defines semantic CSS variables for light/dark mapped through `@theme inline`; `components/ui` are shadcn components using them; `lib/clerk-appearance.ts` themes Clerk from the same variables rather than a second palette; `cn()` is the single class-merging helper.
* **Component reuse.** `Button` is reused in the home page, auth header, and proof panel; no duplicated components were found (only five component files exist under `apps/web/components`).
* **Database safety and tooling** are isolated under `db/tooling` with guards; not mixed into application code.
* **Circular coupling:** none found in the inspected import graph (shared <- validation <- apps; `db` does not import from `lib/*`). This was checked by search and reading, not by a dependency-graph tool.

---

## 4. Not found / not applicable

* Duplicated components or behavior: none found.
* Direct database access from UI or route handlers: none found.
* Dead or commented-out code: none observed in files read.
* Unnecessary interfaces: none found.
* Repeated brand image assets: none (no brand assets exist yet, see F3).

---

## 5. Recommended actions (all need separate approved issues)

| # | Action | Class | Risk |
| --- | --- | --- | --- |
| 1 | Add `success` (and `warning` if needed) semantic tokens; use `text-destructive` for errors in new UI | Recommended before product development | Low |
| 2 | Decide official product name and brand asset approach; create one brand component/asset reference per client; delete unused template SVGs | Recommended before product development | Low |
| 3 | Add shadcn `input`/`label` when the first real form is built | Minor cleanup | Low |
| 4 | Decide a mobile theme module sharing semantic names with web | Future improvement | Low now |
| 5 | Optionally comment the `* 2` in the proof panel | Minor cleanup | None |

No finding is a blocker for starting product development beyond items 1 and 2, which are cheapest to do before the first product screens exist.
