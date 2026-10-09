# Owner suggestions register

Every suggestion the owner made during the rules review, with where it landed. The point is that nothing said in conversation is lost. Statuses: **Done** (built or written and merged), **Deferred** (decided to wait, with the trigger), **Declined** (decided against), **Open** (needs the owner or more work).

| # | Suggestion | Status | Where it landed |
| --- | --- | --- | --- |
| 1 | Run an independent audit with another model (Fable), then a cheap verification pass, then a narrow re-check of its concerns | Done (two passes); re-check pending | `fable-analysis` results on their branches; `scorecard.md` section 4 |
| 2 | Rules must make sense, match a named industry standard, be enforced, and the enforcement proven by breaking it | Done | `rules-review/README.md`; every ledger; the scorecard |
| 3 | The owner decides policy and product choices; Claude decides technical ones | Done | `rules-review/README.md` |
| 4 | A definition of done so the AI knows when to stop | Done | `qa-strategy.md` section 3; `features/README.md`; PR template; `CLAUDE.md` operating rule 3 |
| 5 | A full QA set: unit, integration, acceptance, Playwright end-to-end, an API suite that works with Playwright, regression, CI, test plans | Done | `qa-strategy.md` |
| 6 | Docker, only if development grows | Deferred | `qa-strategy.md` section 8 (triggers: third developer, flaky CI) |
| 7 | Tests must be meaningful, not random; acceptance tests cover all controls | Done | `automation/test-value-review.md` step 8 (the breaker); `automation/acceptance.md` |
| 8 | Automation-friendly unique ids in the code | Done (rule); guard planned | `automation/acceptance.md`, `ui.md` section 9b; a guard comes with the first feature |
| 9 | Robert C. Martin style; interfaces where things should stay agnostic | Done | `code-quality.md` section 12; the Clerk and database import guards |
| 10 | Legal and risk standards the way most companies protect themselves | Done (checklist); owner actions open | `risk-and-legal.md` |
| 11 | Government, military and health standards (508, HIPAA and others) | Done | `risk-and-legal.md` section 2 |
| 12 | Security testing tools such as Burp; API-focused penetration testing | Done (plan); manual test before launch | `qa-strategy.md` section 7; `secure-coding.md` section 4b; hostile-payload suite |
| 13 | Secure coding to a very high standard, as if holding Social Security numbers, card numbers or medical records | Done | `secure-coding.md` (data tiers; never store restricted data) |
| 14 | Protection against cross-site scripting and cross-frame (clickjacking) attacks | Done | Lint rules; security headers; tests and a real-build check |
| 15 | Known CVEs and zero-days; the database | Done (policy) | `secure-coding.md` section 4 (patch targets, blast-radius controls, vendor-managed database) |
| 16 | A consumer-reports style source for known problems | Done | `secure-coding.md` section 4a; monthly tool risk review in `stack.md` |
| 17 | Rules for user permissions, payment tiers and gateways, and third-party connectors | Done (rules); nothing built | `permissions.md`, `payments.md`, `integrations.md` |
| 18 | Mobile rollout processes, tools and automation | Done (plan); nothing built | `release.md` |
| 19 | Dependency and tooling compatibility; known issues in tools | Done | `stack.md` compatibility rules; weekly `health.yml`; Dependabot skips major upgrades |
| 20 | `CLAUDE.md` complete but concise | Done | 177 lines, guard test, document map |
| 21 | Bug reports, blockers, severity; maybe Jira | Done; Jira declined | Issue forms, PR template, `issues.md`; Jira revisited only at stated triggers |
| 22 | Check escape characters, spaces and other invisible damage | Done | `text-hygiene.test.ts`; `code-quality.md` section 13 |
| 23 | Once a problem is found, put a rule in place, especially if it repeats | Done | `lessons.md`; `CLAUDE.md` operating rule 12; `issues.md` |
| 24 | Plan for enterprise expansion and the future | Done (plan); nothing built | `future-readiness.md` |
| 25 | Review these suggestions together to see if rules could come from them | Done | This register |
| 26 | Role names added to the naming rules (member, Church/Ministry manager, platform admin) | Done | `naming-conventions.md` |
| 27 | An open-source license for the repositories | Open | Default: no license (all rights reserved); revisit before sharing code or publishing the template; `risk-and-legal.md` section 3 |
| 28 | Take the Production site offline until rollout | Deferred | Rollout; `risk-and-legal.md` accepted risks |
| 29 | Two-factor sign-in; public template repository; shared admin login | Declined (accepted risks) | `risk-and-legal.md` section 4 |
| 30 | A status line showing which plan step is running | Declined (not accepted) | n/a |

## Still open and needing the owner

1. Open-source license (item 27).
2. The shared deny list for destructive Git commands, and protection for the foundation tag (`rules-review/git-workflow.md`).
3. GitHub settings: Dependabot alerts and security updates, code scanning, secret scanning with push protection, pinned-action enforcement, read-only default workflow token.
4. Q-005 (which mock code survives), Q-011 (app name and store identity), and the product plan review that waits on them.
5. Any spending: Apple and Google developer accounts, an Expo plan, error tracking, a paid database or hosting plan, a payment provider, single sign-on.
