# CODE: Implementation quality

Examined 2026-10-08 (Pass 2) at `main` `826b53e`. Depth: Light (the code is mostly disposable mocks today, per `methodology.md` section 5; findings are pattern-level until Q-005 is answered). Home for: web, mobile and package code; error handling; validation usage; dependency hygiene; code organization; code-quality baseline follow-up (`methodology.md` section 4).

## Method note

Run (RUN, 2026-10-08): searches for type-escape comments and casts, unfinished-work markers, file sizes, unused dependencies (an import search for every web runtime dependency), duplicate environment constants, lint and typecheck script coverage per workspace, and the strictness test described in F-CODE-003 (the compiler run once with an extra flag, no file changed). Read: `tsconfig.json` files, both ESLint configurations, `package.json` scripts, `packages/shared/src/constants.ts`, the mock domain types. Error handling, validation use and the service layer were assessed in the ARCH, SEC and TEST subjects; they are not repeated here.

Not examined, and why: line-by-line review of the mock components (disposable until Q-005; the UX subject covers their behaviour); dead-export analysis (no tool installed; adding one is F-CODE-004's recommendation); the prior code-quality audit's remaining items other than those routed here.

## Findings

### F-CODE-001 The two shared packages, which hold the cross-client rules, are never linted

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | High |
| Timing | Now |
| Disposition | IMPROVE |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | XS |

**Evidence**: `pnpm lint` runs `pnpm -r --if-present lint`. The web and mobile apps define a `lint` script; `packages/shared` and `packages/validation` do not, and no root ESLint configuration exists (RUN, `ls`; READ, the four `package.json` files). About 1,000 lines of source live in the two packages, including the production-database guard in `env.ts` and the validation schemas both clients rely on. They are strictly typed and well tested (TEST subject), but no linter ever looks at them. The `--if-present` flag means the gap is silent.

**Observation**: This is the code most worth linting: it is shared by every client and holds the rules the charter wants kept in one place. The cost is one configuration file and one script per package.

**Consequence**: Lint-catchable mistakes (unused variables, unsafe patterns, accidental `any`) in shared code reach both clients without a check. Today the risk is small because the code is small and tested; it grows with every shared rule added.

**Recommendation**: Add a minimal shared ESLint configuration (TypeScript recommended rules only) and a `lint` script to each package, so `pnpm validate` covers them. Do not add stylistic rules. Consider failing the root `lint` script when a workspace has no `lint` script, instead of skipping it (a small check in the existing validation script), so a new package cannot silently opt out.

**Alternatives and tradeoffs**: Leave as is (works until the packages grow). One root configuration for everything (couples the apps' framework presets to the packages).

**Affects**: `packages/shared`, `packages/validation`, root `package.json`.

**Depends on / sequencing**: none.

**Verification**: Introduce an unused variable in `packages/shared/src`; `pnpm validate` fails; remove it; it passes.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created.

---

### F-CODE-002 A stray package named `cn` is installed but never imported, and its name collides with the helper every UI file uses

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | High |
| Timing | Now |
| Disposition | IMPROVE |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | XS |

**Evidence**: `apps/web/package.json` lists `"cn": "^0.4.0"` (READ). No file in the repository imports it (RUN, import search). The real helper is `cn` in `apps/web/lib/utils.ts`, built from `clsx` and `tailwind-merge`. During the paused shadcn work in this session the shadcn command-line tool generated `import { cn } from "cn"` in new component files, which is the wrong source; it was corrected by hand (RECOLLECTION of this session; the generated files are on an unpushed local branch). The earlier audit's suspicion of typosquatting was checked and rejected (the package is published by the shadcn-ui organisation and has no install scripts; recorded in `inputs-reconciliation.md` row P-78-E).

**Observation**: The package is harmless as a threat but harmful as a trap: a correct-looking `import { cn } from "cn"` resolves to an installed package instead of failing, so a wrong import can survive until someone notices the helper behaves differently. With the package removed, the same mistake becomes a compile error the first time it is written.

**Consequence**: An AI session or a copy-pasted shadcn snippet silently uses the wrong helper; style merging behaves unexpectedly.

**Recommendation**: Remove the dependency. Add the unused-dependency check to the standing dependency control in F-SEC-004 (one scheduled run of an unused-dependency tool; do not make it a merge gate until it is quiet). Note that four other web runtime dependencies look unused to a simple import search (`react-dom`, `server-only`, `shadcn`, `tw-animate-css`); each was checked and is used indirectly (framework requirement, a side-effect import, and stylesheet imports), so they stay; this is why a real tool, not a text search, should be the control.

**Alternatives and tradeoffs**: Keep and document the trap (relies on every future session reading it).

**Affects**: `apps/web/package.json`, the lockfile.

**Depends on / sequencing**: Resume of the paused shadcn conformance work (issue #91) should remove it in the same pull request.

**Verification**: `pnpm validate` passes with the package removed; a deliberate `import { cn } from "cn"` fails the typecheck.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created. Closes the CODE half of P-78-E.

---

### F-CODE-003 TypeScript strict mode is on, but one widely recommended extra check would flag 29 places

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | High on the count (RUN); Medium on whether it is worth adopting everywhere |
| Timing | Trigger: before the first service that reads real product data |
| Disposition | DEFER |
| Scope | BOTH |
| Trigger class | Maturity |
| Effort | S |

**Evidence**: All four workspaces enable `strict` (READ). Running the web compiler once with `noUncheckedIndexedAccess` added reported 29 errors across 11 files, mostly in tests and mock formatting code, and two in `packages/shared/src/env.ts` (RUN; no file changed). The flag makes `array[i]` and `record[key]` typed as possibly missing. The codebase has no `any`, no `@ts-ignore`, no unfinished-work markers (RUN, searches), and two justified lint suppressions, both in the proof slice that is removed when an application is created from the template.

**Observation**: The code base is clean. The flag is a real protection for the code that will read rows and request bodies, where "this index exists" is exactly the assumption that fails in production. It is overkill for mock formatting code that works on fixed data.

**Consequence**: Without it, the first real data-handling code can contain an unchecked lookup that compiles and then fails on a missing row.

**Recommendation**: Defer. When the first real service is written, turn the flag on for `packages/*` and the services and API folders only (per-folder TypeScript projects or a stricter configuration extending the base), fixing the 2 shared sites first. Do not force it onto mock components that will be replaced.

**Alternatives and tradeoffs**: Turn it on everywhere now (29 mechanical edits in code that may be discarded, Q-005); never (a known class of production bug left open).

**Affects**: TypeScript configuration; later, service and package code.

**Depends on / sequencing**: Q-005; the first real slice (F-REQ-004).

**Verification**: The stricter configuration passes on the folders it covers, and a deliberate unchecked index fails the typecheck there.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created.

---

### F-CODE-004 Roughly 4,500 lines of mock code carry their own disclaimers, but nothing stops real code from importing mock types as if they were contracts

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | Medium (pattern-level; Q-005 is open) |
| Timing | Trigger: the first real slice |
| Disposition | IMPROVE |
| Scope | Signal One |
| Trigger class | S1-specific |
| Effort | S |

**Evidence**: The `discover`, `church`, `admin` and `member` folders under `lib` and `components` total about 4,500 lines (RUN, line count). The type files say they are "mock-stage shapes ... not a database schema or API contract" (`lib/church/types.ts`, READ), and the process requires mock code to be identifiable (`product-development.md` section 3). Nineteen import sites already pull from mock-data files inside the application (RUN, import search). The shared validation package, which defines the real contracts, is not yet used by any of these flows.

**Observation**: The labelling discipline is good. The risk is mechanical: the same `lib/church/types.ts` that is labelled mock sits beside code that will become real, and the first real slice will be tempted to extend rather than replace it, silently turning mock shapes into contracts (the situation the code-quality documents warn about).

**Consequence**: A mock shape such as the event draft (date and time as bare strings with no time zone, F-ARCH-001) becomes the stored and transmitted format because it was already there.

**Recommendation**: At the start of the first real slice, decide per folder, in the slice's spec, whether it is replaced, promoted (moved to a non-mock location and given real validation) or kept as mock. Back it with one static test of the existing kind (like the boundary tests): non-mock code may not import from a file whose name or folder marks it as mock. Do not restructure anything now. Reduces to a policy sentence if Q-005 is answered "all mocks are disposable".

**Alternatives and tradeoffs**: Rename the mock folders now (churn in code the owner has paused); trust reviewers (the failure here is subtle and reviews leave no trace, F-DEVOS-001).

**Affects**: `lib/discover`, `lib/church`, `lib/admin`, `lib/member`, their components; one new static test.

**Depends on / sequencing**: Q-005; F-REQ-001 (the spec that records the decision).

**Verification**: The static test fails when a deliberately placed real module imports a mock file, and passes after removal.

**Decisions needed**: Q-005 (open; default is option 1, all mocks disposable).

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created. Closes the CODE part of the mock-code question.

---

### F-CODE-005 The code base is small, strictly typed, free of type escapes and unfinished-work markers, and its layering is enforced by tests

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Info |
| Confidence | High |
| Timing | n/a |
| Disposition | KEEP |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | n/a |

**Evidence**: Zero `@ts-ignore`, `@ts-expect-error`, `as any` or `: any` in application and package source; two casts in tests and one in a test helper, all narrow (RUN). Zero TODO, FIXME or HACK markers (RUN). The largest source file is 413 lines; the second is 323 (RUN). Layer and server-only boundaries are enforced by static tests on both web and mobile (`security.test.ts`, `boundary.test.ts`, `apps/mobile/src/boundary.test.ts`, READ; assessed in F-TEST-006). The one historical duplicate, the environment names (P-GAP-07), is resolved: a single `APP_ENVS` in the shared package is used everywhere and the old web-only copy no longer exists (RUN, search). `packages/shared/src/env.ts` at 244 lines is cohesive and needs no action.

**Observation**: There is nothing to fix here, and the discipline that produced it (the code-quality document and the tests that enforce it) is worth protecting over adding more rules.

**Recommendation**: Keep. The only deliberate looseness found, a client-side `maxLength` set to twice the shared limit in the proof panel (`proof-items-panel.tsx`), lets the server's validation message appear instead of the browser silently truncating; it lives in the proof slice that is removed from generated apps and needs at most a one-line comment.

**Affects**: n/a.

**Verification**: n/a.

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created. Closes P-CQ-P2, P-CQ-P3 and P-GAP-07.

---

## Reconciliation of prior inputs (CODE)

| Input | Outcome |
| --- | --- |
| P-78-E `cn` dependency | Typosquat suspicion rejected earlier (SEC); unused-dependency hygiene adopted → F-CODE-002 |
| P-CQ-P2 `env.ts` size | Not applicable: cohesive, no action → F-CODE-005 |
| P-CQ-P3 uncommented `* 2` on `maxLength` | Not applicable: proof slice only, intentional; at most a one-line comment → F-CODE-005 |
| P-GAP-07 `APP_ENVS` duplicate | Resolved before this audit: single definition in the shared package → F-CODE-005 |

Challenges to prior work: none reversed. The earlier code-quality audit's rules and the static boundary tests are kept.
