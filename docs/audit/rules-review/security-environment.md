# Rules review 9: `docs/security.md` and `docs/environment.md`

Reviewed 2026-10-09 with the owner's five tests: **Sense**, **Standard**, **Solid**, **Enforced**, **Proven**. Standards named from recollection (not re-fetched): OWASP Top 10 (A02, A05, A09), OWASP ASVS V14 (configuration), OWASP API Security Top 10, the twelve-factor app (config in the environment), NIST SSDF and OpenSSF practices for supply chain.

## Overall verdict

The rules are **sensible, standard and solid**, and the environment guards are the best-proven part of the repository: five safety checks were broken on purpose and every one was caught. One statement in `security.md` was stale and is fixed. Three security controls that the document itself lists as gaps remain open (headers, rate limiting, dependency scanning in CI).

## `environment.md` (configuration and environment safety)

| Rule | Standard | Enforced | Proven |
| --- | --- | --- | --- |
| Environment identity is explicit (`DATABASE_ENV`, `APP_ENV`), never inferred from a hostname; four logical environments | 12-factor III (config in the environment); ASVS V14 | `parseServerEnv`, `parseDatabaseEnv`; `env.test.ts` | Covered below |
| Missing, blank or invalid values fail validation; errors name variables, never values | ASVS V14; OWASP A09 | `EnvValidationError` tests | Yes (existing tests assert value-free messages) |
| A non-production app on the production database, or the reverse, is rejected | Environment separation | `env.test.ts` | Yes (existing cases) |
| A Vercel Preview or development deployment may not use `prod` | Environment separation | `env.test.ts` | **Yes**: disabling the check fails 1 test |
| A Vercel Preview must use `qa` for both variables | Environment separation | `env.test.ts` | **Yes**: disabling it fails 1 test |
| A live Clerk secret key (`sk_live_`) is refused outside `prod` | Secret handling; least privilege | `env.test.ts` | **Yes**: allowing it fails 1 test |
| Destructive tooling refuses protected environments even when listed | Fail-closed design | `assertDestructiveAllowed` tests; tooling suites | **Yes**: removing the protected-environment check fails 5 tests (1 shared, 4 in the web tooling suites) |
| Destructive tooling refuses an unknown target | Fail-closed design | Same | **Yes**: removing the unknown-target refusal fails 1 test |
| `APP_ENV` and `DATABASE_ENV` stay separate concepts | Design decision recorded | n/a | n/a |
| The code cannot detect a `DATABASE_URL` that points at the wrong Neon branch while the label says otherwise | Known limit | Not enforceable from code | Recorded as F-DATA-004 (launch gate) |
| Preview variables are switched to `qa` values | Configuration | Cannot be seen from code | **Not verified** (console state, U-02) |

## `security.md`

| Rule | Standard | Enforced | Proven |
| --- | --- | --- | --- |
| Secrets never committed; `.env*` ignored except `.env.example` | ASVS V14; A02; 12-factor | `security.test.ts` secret patterns and ignore rules | Proven in the earlier audit (credential-shaped content fails) |
| Server-only values never carry a public prefix; the client env module reads an explicit allow-list | ASVS V14 | `security.test.ts` | Existing tests; same family as the guards proven above |
| Clients never access the database; all input validated on the server | OWASP A01, A03; API3 | Boundary and API suites | Yes (earlier ledgers) |
| Authentication is separate from authorization; ownership from the server-side identity | ASVS V4; API1 | Auth and service suites | Yes (auth ledger) |
| Errors are safe; unexpected failures are generic and logged server-side | A09; API8 | API and service suites | Yes (api and services ledgers) |
| GitHub: least-privilege tokens, pinned actions, no merge tooling, protected `main` | OpenSSF Scorecard; SLSA basics; NIST SSDF | Workflow tests; the `Protect main` ruleset | Yes (workflow guards broken six ways in the Wave 1 pull request) |
| Add dependencies deliberately; review supply-chain implications | NIST SSDF | Dependabot; code review | Guidance |
| Dependency vulnerabilities are known and handled | A06 | Dependabot version updates on; `pnpm audit` not in CI | **Not proven**: see the fix below |
| Security headers, rate limiting, audit logging, dependency scanning in CI | A05, API4, A09, A06 | Listed by the document itself as not yet implemented | Open gaps (F-SEC-005, F-SEC-006, F-SEC-004, F-OPS-001) |

## Fixed in this pull request

| Defect | Fix |
| --- | --- |
| `security.md` said `pnpm audit --prod` found no known vulnerabilities. Today it lists 5 advisories (4 high, 1 moderate); a high advisory in Next.js itself was fixed in an earlier pull request | Statement replaced with the dated result, the reason each remaining item is open, and the handling rule (a high advisory in a runtime package is a stop-and-fix item) |

## Security testing layers (decision input, to be written into the QA strategy)

CodeQL and secret scanning with push protection (free for a public repository; repository settings), Dependabot alerts, an OWASP ZAP baseline scan of a Vercel Preview in CI once real endpoints exist (needs a Vercel protection bypass token, an owner setting), and a manual Burp Suite Community or professional penetration test before real users or payments.

## Owner decisions

None for these documents. Owner actions already queued: turn on Dependabot alerts and security updates, CodeQL and secret scanning (settings); confirm the Preview variable values (console).
