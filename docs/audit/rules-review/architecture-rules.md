# Rules review 3: `docs/architecture-rules.md` (29 sections)

Reviewed 2026-10-09. This is the document `CLAUDE.md` names as the primary architectural authority. Verdict key as in `README.md`.

## Overall verdict

The **rules are correct and coherent**: one platform with multiple clients, a server-authoritative backend, Clerk for identity, Neon with Drizzle behind a data layer, shared contracts and no shared UI, and isolated environments. They agree with the later focused documents and with the code.

The **document itself was in poor condition**: sections 1 to 21 (119 lines) were damaged by a bad copy from another tool. Bullets were written as `\*`, code fences as `` \`\`\` ``, bold markers as `**\*\*...\*\***`, numbered lists as `1\.`, and every line was followed by a blank line. In a Markdown viewer the lists and diagrams displayed as literal text and the diagrams were double-spaced. Neither the earlier audit nor the independent audit's headings-only pass caught this; reading the body did.

## Fixed in this pull request

| Defect | Fix | Check |
| --- | --- | --- |
| Escaped Markdown in sections 1 to 21 (119 lines): bullets, fences, numbered lists, bold, quote marker, `**---**` rules | Mechanical repair of those lines only (section 22 onward was already clean). Diagram backslashes kept as single characters | No stray backslash remains before section 22 except the two diagram characters; code fences are balanced |
| Blank line after every line (diagrams double-spaced, bullet lists split) | Blank runs inside diagrams and between list items removed | File is 628 lines (was 1,100 at the start of the audit); wording unchanged |
| Section 4 forbade mobile access only to "the production database", weaker than section 7 ("clients MUST NOT connect directly to Neon") | Now "any database (production or otherwise)" | Reads the same as section 7 |
| Section 22 said in present tense that separate dev, qa, stage and prod Neon branches are used. Only the default `production` branch is confirmed to exist (audit U-04 to U-07) | Now "is designed to use", pointing to `deployment.md` for actual state | Matches the recorded external state |

## Rule-by-rule verdicts

| § | Rule | Verdict | Mechanism or note |
| --- | --- | --- | --- |
| 1 | Read this document and run a compatibility analysis before an architectural change; stop on conflict | Sound, Guidance | Procedural; the human reviews |
| 2 | Core architecture diagram | Sound | Matches the code layout |
| 3 | Next.js is the web framework and must not become a mobile dependency | Sound, Enforced | Mobile boundary test forbids Next and web imports |
| 4 | Mobile uses React Native with Expo; clients of the backend; no duplicated server logic | Sound, Enforced in part | Mobile boundary test; the duplicated-logic half is Guidance |
| 5 | API serves all clients; consider backward compatibility; shared schemas | Sound, Enforced in part | Shared `validation` package used by the web API and the mobile client. No contract test for compatibility with old builds yet (F-AUTH-005, Wave 3) |
| 6 | Clerk is identity; the API validates authenticated requests; mobile has no separate identity | Sound, Enforced on web | `apiRoute` and `proxy.test.ts`. Mobile sign-in not built (walking skeleton) |
| 7 | Neon + Drizzle; clients never connect to Neon; credentials stay on the server; schema changes consider all clients | Sound, Enforced | `security.test.ts` (server-only secrets, no client imports of the database), migration tooling tests |
| 8 | Share contracts, not server-only code | Sound, Enforced | `packages/shared` and `packages/validation` import rules |
| 9 | Business rules centralized on the server | Sound, Enforced in part | Service-layer tests (framework-free, ownership from context) |
| 10 | Web and mobile need not look alike; do not force web UI onto mobile | Sound, Guidance | |
| 11 | Tailwind for web, native styling for mobile; no web-only styling libraries in mobile | Sound, Enforced in part | Mobile boundary test; the styling half is Guidance |
| 12 | Vercel for web; mobile releases do not require a web rebuild | Sound, Guidance | Vercel settings are console state (audit U register) |
| 13 | Separate and never expose secrets | Sound, Enforced | `security.test.ts`, env boundary tests |
| 14 | Test the complete platform at the right layer; reliable reset and seed | Sound, Enforced in part | Reset and seed tooling is tested. Integration and E2E tests exist but are not in CI (F-TEST-002) |
| 15 | GitHub flow: branches, pull requests, checks | Sound, Enforced | Ruleset "Protect main". Detail lives in `git-workflow.md` (duplicate, consistent) |
| 16 | Vercel previews do not prove compatibility | Sound, Guidance | |
| 17 | Documentation first; drift is a defect | Sound, Guidance | No automatic drift check, by decision (overkill at this size) |
| 18 | Fifteen-item compatibility checklist | Sound, Guidance | A thinking prompt; becomes a pull request template item (F-DEVOS-010) |
| 19 | No new major framework or dependency without justification | Sound, Gap (small) | Dependabot and review show additions; a pull request template question is the cheap mechanism (F-DEVOS-010) |
| 20 | Principle: one platform, multiple clients | Sound | |
| 21 | Prefer documented patterns, simplicity; stop for undecided architecture | Sound, Guidance | |
| 22 | Environments isolated; production protected; avoid Neon-specific coupling | Sound, Enforced | `env.test.ts`, tooling guards refuse prod. **Fixed**: present-tense claim about branches |
| 23 | Drizzle owns schema; versioned reviewable migrations; reset and seed preserve migration history | Sound, Enforced in part | Migration tooling tests; no offline drift check yet (F-DATA-003, Wave 1 item 5) |
| 24 | Layered flow; UI never imports privileged database code; no abstraction for its own sake | Sound, Enforced in part | `'use client'` import test; service-layer boundary test |
| 25 | Clerk is the identity source; store Clerk user ids only where needed; identity from server context | Sound, Enforced | `apiRoute`; services derive ownership from context |
| 26 | Shared contracts; no shared UI code | Sound, Enforced in part | Package import rules; contract-evaluation step is Guidance |
| 27 | Reset and seed have environment guards and refuse prod | Sound, Enforced | `db/tooling/*.test.ts` |
| 28 | Detailed rules live in focused documents; this document governs on conflict | Sound | Used as the owner-document rule for the duplication clean-up |
| 29 | Replaceable infrastructure, stable contracts; no speculative abstraction | Sound, Guidance | |

## Open items (tracked elsewhere)

* Duplication with `data-fetching.md`, `data-mutations.md`, `git-workflow.md`, `auth.md`: consolidate under this document's section 28 rule (owner document per topic). Separate change.
* Mobile authentication and contract tests: the walking skeleton.
* Integration and E2E in CI: roadmap, after the walking skeleton design.

## Owner decisions

None needed.
