# Rules review 6: `docs/auth.md` (18 sections and an implementation appendix)

Reviewed 2026-10-09 against the auth code, its tests and the audit's authentication findings. This ledger uses the owner's five tests for every rule: **Sense** (makes sense), **Standard** (matches an industry standard, named), **Solid** (correct as written), **Enforced** (a mechanism exists), **Proven** (the enforcement was broken on purpose and failed). Standards named are established practice (OWASP ASVS V2 and V3 for authentication and sessions, OWASP API Security Top 10, OWASP MASVS-AUTH and MASVS-STORAGE for mobile, OAuth 2.0 and OpenID Connect for Clerk), cited from recollection and not re-fetched.

## Overall verdict

The rules are **sensible, standard and solid**. The server-side core is enforced and the part of it exercised below is proven. Authorization is unit-proven only, with fakes and a mocked Clerk. The mobile half of the rules (sections 2, 7, 11 and 12 for Android and iPhone) is a design: no real token has ever been carried, and no mobile screen exists.

## Rule-by-rule

| § | Rule | Standard | Enforced | Proven |
| --- | --- | --- | --- | --- |
| 1 | Clerk is the only authentication provider; no second system | OWASP ASVS V2 (delegate identity to a vetted provider); OIDC | Dependency review; `docs/architecture-rules.md` | Not mechanical (no password code exists; guidance) |
| 2, 7 | One identity across clients; clients may differ in UI | OIDC single identity; MASVS-AUTH | Web only. Mobile not built (F-AUTH-005) | No |
| 3 | Authentication and authorization are separate; clients are not trusted to authorize | OWASP API1 (broken object-level authorization), ASVS V4 | `authorize()` with deny by default; service ownership tests | **Yes** (below) |
| 4, 5 | The server verifies identity for every protected operation; unauthenticated requests never reach business logic or the database | ASVS V2 and V3, API2 (broken authentication) | `requireUserId`, `apiRoute` fails closed with 401 before input or database | **Yes**: letting a signed-out user through `requireUserId` fails 3 tests; `apiRoute` not rejecting them fails 4; ignoring the required option fails 13 |
| 6, 13 | The Clerk user id is the external identity reference; no conflicting copies of authentication data | ASVS V2 | Guidance; no user table exists yet | n/a |
| 8 | Publishable key is client-safe; secrets server-only and never in builds | 12-factor config; ASVS V14; MASVS-STORAGE | `security.test.ts` secret patterns, env boundary tests | Secrets guard proven earlier in the audit (credential-shaped content fails) |
| 9 | Secrets only in environment configuration, never in documents, code, commits, issues | 12-factor; OWASP A02 | Same | As above |
| 10 | Route protection does not replace server checks | ASVS V4 (defense in depth) | `proxy.test.ts` pins the protected list and requires a decision for every route | **Yes** (earlier: removing `/admin` and `/dashboard` fails 5 of 12 tests) |
| 11 | Auth UI follows each client's conventions | Platform guidance | Web: Clerk components | No mobile |
| 12 | Do not treat loading auth state as signed out | Usability and security (no flash of wrong state) | Guidance; no test | No |
| 14 | No custom passwords; no trusting client user ids; no disabling checks | ASVS V2, API1 | `auth.test.ts` "takes identity only from Clerk context"; no password code exists | **Yes** |
| 15 | Fail safely: unauthenticated gives an authentication failure, no permission gives an authorization failure, no sensitive detail | ASVS V7 (error handling), API8 | Error semantics test (generic, distinct); `apiRoute` envelope | Partly: the semantics are tested; leakage proof is in the API ledger |
| 16, 17, 18 | Compatibility check, current Clerk docs, checklist | Process | Guidance | n/a |

### Proof results (enforcement broken on purpose)

| Break | Result |
| --- | --- |
| Authorization accepts any truthy value, not only `true` | 1 test fails |
| A rule that throws now allows | 1 test fails |
| Ownership accepts an empty owner id | 1 test fails |
| `requireUserId` lets a signed-out user through | 3 tests fail |
| `getUserId` returns a default user instead of null | 3 tests fail |
| `apiRoute` no longer rejects signed-out requests | 4 tests fail |
| `apiRoute` ignores the `auth: required` option | 13 tests fail |
| Baseline and after restoring | 67 of 67 (auth, API and service tests: 54 of 54) pass |

## Gaps (not defects in the rules)

| Gap | Where tracked |
| --- | --- |
| No real Clerk end-to-end authentication has ever run; all auth tests mock Clerk | F-TEST-002 (CI integration job) |
| The bearer-token path for mobile is accepted by the API but has never carried a real token | F-AUTH-005, the walking skeleton |
| No application roles, admin allow-list or manager-request flow; only ownership is implemented | F-AUTH-001 (launch gate) |
| Terms, privacy, age and deletion policies do not exist | F-AUTH-003; the legal document planned next |
| Sign-up is open on the Production site | F-AUTH-011 (accepted for now; revisit at the launch gate) |
| Two-factor sign-in not enabled | Accepted risk (owner), revisit at the first real user's data |
| Section 12 (auth loading state) has no test | Low; a component test when the first auth-dependent mobile screen exists |

## Appendix check

The appendix names files and behavior. All named files exist (`proxy.ts`, `app/layout.tsx`, `components/shell/app-header.tsx`, the sign-in and sign-up pages, `lib/clerk-appearance.ts`, `lib/auth/*`). The protected paths listed match `proxy.ts`. The "Future integration (not implemented)" notes are accurate.

## Owner decisions

None for this document.
