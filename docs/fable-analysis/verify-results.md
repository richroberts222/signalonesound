# Independent verification of the rule scorecard

Reviewer: Claude (Fable 5.1), one pass, read-only, 2026-10-09. Base: branch `fable/verify-base` (commit 9e15261). Scope: challenge `docs/audit/rules-review/scorecard.md`, not redo the audit. No packages installed, no tests run; judgments come from reading the guard tests and the code they protect.

## Task A: challenging the "High" rows (12 rows)

| # | Row | Verdict | Evidence (one line) |
| --- | --- | --- | --- |
| A1 | No secrets in committed files | WEAKER → Medium | `apps/web/lib/security.test.ts:32-37,159-166`: scans only `.ts/.tsx/.mjs/.json/.md/.yml/.example` and skips every test file; only 5 key shapes (Clerk, Postgres URL, PEM, GitHub). A key in a `.sql` migration, `.js`, `.sh`, `.sample` (un-ignored at root `.gitignore:6`) or any `*.test.ts`, or an AWS/Stripe/Neon/JWT-shaped secret, passes. |
| A2 | Local env files gitignored | AGREE | `security.test.ts:173-180` reads both ignore files for the exact lines; removing them fails. Narrow (root + web only) but mobile is covered by the root rule. |
| A3 | Public names / client allow-list / `next.config` | AGREE | `security.test.ts:40-62`: name scan is repo-wide; `client.ts` may read only `NEXT_PUBLIC_*`; `env:` key banned. Each break would fail on the rule itself. |
| A4 | Environment identity, prod mismatch, live-key refusal | AGREE | `packages/shared/src/env.test.ts:65-101,187-208`: behavior tests of the real parser with fake values; a removed refusal returns a value instead of throwing. |
| A5 | Test isolation (no DB/auth env in tests) | WEAKER → Medium | `packages/shared/src/testing/testing.test.ts:7-9` checks `ISOLATED_ENV_NAMES` against itself (a name missing from the list is never checked). `apps/mobile/vitest.config.ts` has no `setupFiles`, so mobile tests are not isolated at all. |
| A6 | Server verifies identity; deny by default; ownership from actor | AGREE (primitives) | `apps/web/lib/auth/auth.test.ts:22-39,51-70`: real behavior, strict `true`, throwing rule denies, caller-supplied id ignored. Proves the helpers, not that every entry point uses them (see A8). |
| A7 | Every top-level route has a protection decision | WEAKER → Medium | `apps/web/proxy.test.ts:24-25,37,64`: the "decision" is two string lists inside the test; `PROTECTED` is never cross-checked against `proxy.ts`. Add `settings` to `PROTECTED` without touching `proxy.ts` and all tests pass. Clerk's matcher is mocked (`:13-20`). |
| A8 | API: authenticate first, validate, envelope, safe errors | WEAKER → Medium | `apps/web/lib/api/api.test.ts:70-111` proves the adapter well, but nothing forces a new `app/api/**/route.ts` to use it (only `lib/api/route.ts` is checked, `:208`); a hand-written route handler bypasses auth, validation and the size cap unseen. |
| A9 | Services framework-free | WEAKER → Medium | `apps/web/lib/services/services.test.ts:179,188`: scans only top-level files of `lib/services/` and only single-line `import … from` lines; a multi-line import of `next/server` (Prettier's default for long lists) or a service placed in `lib/church/`, `lib/admin/`, `lib/member/` (business logic already lives there) is never scanned. |
| A10 | Clerk SDK only in adapter locations; DB libs only in data layer | WEAKER → Medium | `security.test.ts:99` allows `@clerk/*` anywhere under `app/`, i.e. every page, layout and API route handler. The DB-library guard (`:84-94`) is sound. |
| A11 | Versioned migrations only; `drizzle-kit push` never exposed | WEAKER → Medium | `apps/web/db/tooling/migrate.test.ts:96-100` checks `apps/web/package.json` scripts only; `pnpm exec drizzle-kit push` still works for anyone with the dev dependency. Editing or deleting a migration *and* its journal line passes (`:91-95` checks journal → file only); "unknown history" is detected only at runtime against a real DB, which CI never has. |
| A12 | Reset and seed: dev/qa only, never drop | AGREE | `tooling.test.ts:84-104` asserts real SQL text from a fake executor (no `drop`, no `drizzle` schema); `scripts/db-reset.ts:6` goes through `runTooling` → `resolveToolingTarget` (`cli.ts:15`). |
| A13 | UI: every control from shadcn/ui, no raw colors | WEAKER → Medium | `apps/web/components/ui/raw-controls.test.ts:10-20,39`: a well-built ratchet, but 17 raw controls remain and `components/proof/` is skipped entirely; by the scorecard's own scale "enforcement covers only part of the rule" is Medium. |
| A14 | Docs index complete, `CLAUDE.md` concise | WEAKER → Medium | `apps/web/lib/docs-index.test.ts:21-28`: "linked" means the file name appears anywhere as a substring; automation docs are checked by bare stem (`unit`, `coverage`, `reporting`, `e2e`), words that appear in prose regardless. "Concise" is a 200-line count; lines can be arbitrarily long. |
| A15 | Workflow security (pinned actions, least privilege, no merge) | AGREE | `security.test.ts:186-243`: hash-pinning per `uses:` line, write-permission scan, merge allow-list exact match, no DB credential. Each break fails on the rule. |
| A16 | Template: identity rewrite, leak detection, generated app passes | AGREE (caveat) | `scripts/boilerplate/boilerplate.test.mjs:44-69,71-95` is substantive end-to-end. Caveat: "generated app passes its own checks" means the leak detector (`:48`), the full `pnpm validate` of a generated app (`prove-init.mjs`) is run by hand, not in CI. |

Tally: 6 AGREE, 10 WEAKER (none DISAGREE). The pattern: the *behavior* guards (env parser, auth primitives, reset SQL, workflow) are real. The *static* guards (grep-style scans) are mostly scoped too narrowly to carry a "High": they prove a break in the place the sweep broke, not the rule as written.

## Task B: Medium / Low / None rows (6 rows)

| # | Row | Level | Verdict | Why |
| --- | --- | --- | --- | --- |
| B1 | Ports at replaceable boundaries | Medium | Too generous → Low | No `interface`/port type exists beyond `SqlExecutor`, `ServiceContext`, `ProofItemServiceDeps` (plain dependency types). The Clerk "port" allows the SDK across all of `app/` (A10). This is written-down intent with one real seam. |
| B2 | Documentation matches the code | Medium | Too generous → Low | One manual review pass, "no automatic drift check by decision" = written only. By the scale that is Low. |
| B3 | Dependency and tooling compatibility | Medium | Too generous → Low | Peer/Expo checks "run by hand, not in CI". `--frozen-lockfile` only freezes what a human already resolved. No mechanism. |
| B4 | `main` protected (ruleset) | Medium | Fair | Read back, not breakable safely. Correct use of the scale. |
| B5 | Merge only with owner's authorization | Medium | Fair, slightly generous | The Claude workflow cannot `gh pr merge` (`security.test.ts:236-239`), a real mechanism for one actor; any local session with the owner's `gh` login is unconstrained. Medium holds only because of the ruleset in B4. |
| B6 | Accessibility (WCAG 2.2 AA) | None | Fair | Nothing measured; shadcn gives a baseline but no check exists. Also: Mobile builds `None` and Integration tests in CI `None` are fair and candid. |

## Task C: what the scorecard does not cover

Documents under `docs/` (top level): api, architecture-rules, auth, boilerplate, code-quality, code-quality-audit, customization-map, data-fetching, data-mutations, database, deployment, environment, fable-audit-charter, git-workflow, integrations, issues, mobile, naming-conventions, new-app-setup, notes, payments, permissions, product-development, qa-strategy, release, risk-and-legal, routing, security, server-components, services, shared-code, stack, testing, ui, web; folders: audit, automation, features, ideas, product.

Headings read: `security.md` (Secrets and environment · Authentication vs authorization · Trust boundaries · Errors · Dependencies · Security foundation · Gaps), `deployment.md` (Environment model · Vercel · Configuration ownership · Stage · Production · Promotion · CI/CD · Mobile boundary · Production safeguards · Verified vs not verified · Mobile release), `release.md` (Principles · Web · Mobile · Version compatibility · Automation plan · Checklist · Owner decisions · Enforcement status).

Missing or uncovered risks, ranked:

| Rank | Gap | Why it matters |
| --- | --- | --- |
| 1 | **Monitoring, error tracking, alerting** | `integrations.md:20` marks it UNDECIDED (F-OPS-001); no scorecard row. A platform with no way to know it is down cannot honor any "production safeguard". |
| 2 | **Route-handler conformance guard** | No rule or test says "every `app/api/**/route.ts` goes through `apiRoute`/`publicRoute`". This is the single largest hole in the auth/API "High" rows (A8). |
| 3 | **Logging and PII in logs** | `security.md` covers error *responses*; nothing covers what is logged server-side (request bodies, user ids, tokens) or log retention. |
| 4 | **Dependency licensing** | One mention in `docs/`; no policy (which licenses are allowed), no check. Matters more for a boilerplate meant to be reused. |
| 5 | **Data retention and deletion schedule** | `data-mutations.md:459` says do not auto-delete; `risk-and-legal.md` has export/delete as a gate (None). No rule on *how long* anything is kept or how soft-deleted rows are purged. |
| 6 | **Performance budgets** | `database.md §20` says "evidence-driven"; no web (Core Web Vitals / bundle size) or API latency budget, no check in CI, no Lighthouse. |
| 7 | **Security headers / CSP and CSRF for server actions** | Headers are listed as None (F-SEC-005); CSRF on Next.js server actions and cookie attributes are not mentioned at all. |
| 8 | **Backups and restore drill** | Listed as None (good) but it is the only data-loss control; it should be ranked above several "High" rows in priority, which the scorecard's prose does not say. |
| 9 | **Supply-chain beyond pinned actions** | `pnpm audit` not in CI, no lockfile-integrity or provenance check, Dependabot alerts "pending". Low rating is honest; no plan is attached. |
| 10 | **Mobile-specific guards** | Mobile tests are not env-isolated (A5); no rule on secure storage of the Clerk token on device, certificate pinning, or deep-link validation. |

## Task D: overall verdict

**Can the first real feature start on this rule set? Yes, with three fixes first. Confidence: 70%.**

The behavior-level guards (environment parser, auth primitives, service error mapping, reset tooling, workflow hardening, template proof) are real and would catch the breaks the scorecard claims. The static-scan guards are narrower than their rows claim, so the honest reading is "about ten High rows are Medium". That is still a stronger foundation than most projects start a first feature on, provided the feature does not touch payments, roles or legal gates (all None).

Top 3 things to fix first:

1. **Close the route-handler gap.** Add one static test: every `apps/web/app/api/**/route.ts` must import from `@/lib/api` and export only wrapped handlers; and make `proxy.test.ts` derive `PROTECTED` from `proxy.ts` (or assert the matcher patterns) instead of a second hand-kept list. This turns A7/A8 back into true Highs.
2. **Widen the static scans so they match the rules as written.** Secret scan: all tracked text files including tests and `.sql`; services scan: recursive and multi-line-import aware, and either move `lib/church|admin|member` under the guard or state in `services.md` that they are UI-only models; Clerk allow-list: `app/**/route.ts` excluded. Each is a 5-line change.
3. **Put the by-hand proofs into CI** (`prove-init`, `pnpm audit`, peer/Expo check) and decide monitoring (F-OPS-001). Until a human can learn the site is down, "production safeguards" are paperwork.

Downgrades suggested: A1, A5, A7, A8, A9, A10, A11, A13, A14 → Medium; B1, B2, B3 → Low. No row was found to be rated too harshly.
