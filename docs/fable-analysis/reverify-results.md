# Re-verification of the rules-review scorecard fixes

Independent reviewer (Fable), 2026-10-09. Branch reviewed: `fable/reverify-base`. Read-only; nothing was run. Scope: only the concerns raised in `docs/audit/rules-review/scorecard.md` section 4. Each verdict asks whether the test would really fail if the protected behavior broke, not whether the text changed.

## A. Guard tests

| Item | Verdict | Evidence and what is still missing |
| --- | --- | --- |
| A1 Secret scan | SATISFIED | `apps/web/lib/security.test.ts` 32-37 scans 16 text file types incl. `sql`, `sh`, `toml`, `yml`; 159-182 has 10 key shapes (Clerk, Postgres, private key, GitHub, AWS, Google, Slack, Neon, JWT); test files are scanned with fake-marker tolerance only (174-181). A real key in a test file fails. |
| A5 Test isolation | SATISFIED | `packages/shared/src/testing/testing.test.ts` 11-16: expected list written out as six literal names, so a dropped name fails. `apps/mobile/vitest.config.ts` 9-10 loads the same setup file with `unstubEnvs`. (No guard checks that every vitest config keeps `setupFiles`; small residual.) |
| A7 Route protection | SATISFIED | `apps/web/proxy.test.ts` 56-65 parses the real `createRouteMatcher([...])` in `proxy.ts` and requires it to equal the test's PROTECTED list of existing directories; 67-76 forces a decision for every top-level `app/` directory. A mismatch in either direction fails. |
| A8 Every API route wrapped | PARTLY | `apps/web/app/api/routes.test.ts` 26-34 checks each `route.ts` imports `apiRoute` and has no `export function GET/POST…`. Missing: a file that wraps one method but exports another as an arrow (`export const POST = async () => …`) passes, because the arrow check is file-level, not per-handler. The scorecard's "arrow function without the wrapper fails" only holds when the file imports no `apiRoute` at all. Also only `route.ts` is scanned, not `route.tsx`/`.js`. |
| A9 Services framework-free | SATISFIED | `apps/web/lib/services/services.test.ts` 180-186 recurses subfolders; 192-195 extracts specifiers from multi-line and dynamic imports, ignoring type-only; 198 forbids next/react/expo/Clerk/drizzle/neon/db; 205-207 self-tests the scanner. |
| A10 Clerk allow-list | SATISFIED | `apps/web/lib/security.test.ts` 96-106: allow-list is `/^app\/(?!api\/)/`, so a Clerk import under `app/api/` is an offender. |
| A11 Migrations | SATISFIED (residual stated honestly) | `apps/web/db/tooling/migrate.test.ts` 96-102 fails on any `.sql` in `drizzle/` the journal does not list; 103-107 forbids `drizzle-kit push` in package scripts. Residual is as stated: `pnpm exec drizzle-kit push` by hand is not blocked (it cannot be by a test). |
| A13 UI rating | FAIR | Scorecard line 48: Medium, with the 17 raw controls and 8 raw colors named and tied to issue 91. Matches the Medium definition at line 10 ("enforcement covers only part of the rule"). |
| A14 Docs index | PARTLY | `apps/web/lib/docs-index.test.ts` 28-30 now counts a document only as a code span or `/docs/` path, fixing the prose-mention bug. Missing: the match is anywhere in `CLAUDE.md`, not in the section-3 table, and most docs are also code-spanned in the rule prose (e.g. `/docs/git-workflow.md` in rule 7), so dropping those from the table still passes. Only top-level `docs/` and `docs/automation/` are checked; `docs/product/` and `docs/features/` are not. |
| A16 Template proof | PARTLY | `.github/workflows/ci.yml` 41-61: a "Template proof" job runs `pnpm prove:init --full` on every pull request and push to main, with no `continue-on-error`. Missing: comment at 38-40 says it is informational until green for a week and not yet a required check, and the scorecard row (line 114) still says "Planned / Pending" although the job exists. `health.yml` runs weekly with all three checks `continue-on-error: true` (35, 39, 43), so it can never go red. |

## B. Rating changes

| Item | Verdict | Evidence |
| --- | --- | --- |
| B1 Ports → Low | FAIR | Scorecard line 42: three ports exist, two import guards; the rest come with features. Low is right. |
| B2 Documentation accuracy → Low | FAIR | Line 60: reviewed once, no drift check by decision. Low is right. |
| B3 Dependency compatibility → Low | FAIR, wording stale | Line 61 says peer and Expo checks "run by hand, not in CI"; `health.yml` 38-45 now runs them weekly but non-blocking. Low is still right because nothing can fail; the sentence should say "weekly, informational". |

## C. The ten missing risks

"Covered" means a rule or guard exists now; "tracked" means a decision is written down with a trigger but nothing enforces it yet.

| Risk | Status | Where |
| --- | --- | --- |
| C1 Monitoring and alerting | Tracked, still open | `docs/future-readiness.md` §5 line 62: decide before launch (F-OPS-001). No rule, no guard. |
| C2 Route-handler conformance | Covered (with the A8 gap) | `apps/web/app/api/routes.test.ts` 26-34. |
| C3 Logging and personal data in logs | Tracked, still open | `future-readiness.md` §5 line 63: rule to be written with the first logging feature. |
| C4 Dependency licensing | Tracked, still open | `docs/risk-and-legal.md` line 68 (pre-launch checklist) and line 82 (planned license scan, "Not yet"); `future-readiness.md` line 30. |
| C5 Data retention schedule | Tracked, still open | `future-readiness.md` §5 line 64: with the privacy policy and first user table. |
| C6 Performance budgets | Tracked, still open | `future-readiness.md` §5 line 65: set with the first real feature. |
| C7 Headers, CSP and CSRF for server actions | PARTLY covered | Headers covered and tested: `apps/web/next.config.ts` 8-22 and `apps/web/lib/security-headers.test.ts` 12-32 (frame-ancestors, X-Frame-Options, base-uri, object-src, nosniff, referrer, permissions, HSTS). Not covered: a script-src CSP, and CSRF/cookie rules for server actions (deferred to the first server action, `future-readiness.md` line 66). |
| C8 Backups prioritized | Tracked, still None | Scorecard line 46 rates backups/restore "None"; `future-readiness.md` line 67 and `risk-and-legal.md` line 71 rank it above several High rows (F-DATA-002). Prioritized, not done. |
| C9 Supply chain beyond pinned actions | Partly covered | `docs/secure-coding.md` line 54 (frozen lockfile, Dependabot, weekly health), §4a lines 79-94 (Scorecard, deps.dev, Socket as sources), line 112 (code scanning, secret push protection, Dependabot alerts: owner action pending); `risk-and-legal.md` line 81: vulnerabilities "not proven, F-SEC-004". Written down; the automated parts are non-blocking. |
| C10 Mobile-specific guards | Tracked, still open | `future-readiness.md` §5 line 68: token storage and deep-link validation go into the walking skeleton's design review. No guard. |

Note: scorecard line 116 says the C-items "are now rows of their own"; in section 1 only backups (line 46) and headers (line 32) are rows. The rest live in `future-readiness.md` §5. The tracking is real, the sentence overstates where.

## Overall

**Confidence that the rule set is solid enough to start the first real feature: 82% (up from 70%).**

Why up: every narrow guard I named was widened in the code, not just the prose, and six of the nine test items would now fail for real if the behavior broke (A1, A5, A7, A9, A10, A11). The three PARTLY items are small and bounded: an arrow-function handler slipping past A8, a table-vs-file mismatch in A14, and the template proof being present but not yet required.

Why not higher: eight of the ten missing risks are tracked decisions, not rules or guards, and the two automated safety nets added since (template proof, health) are both informational, so nothing new can go red.

**Single most important thing still open: backups and a restore drill (F-DATA-002).** It is rated None, the documents themselves rank it above several High rows, and it is the one item that cannot be fixed after the first real data is lost. Close it before the first feature stores user data. Second, and quick: make A8 check each exported handler rather than the file, so an unwrapped `export const POST = …` fails.
