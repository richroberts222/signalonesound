# Secure Coding Standard

The standard every change must meet. It collects the security rules in one place, classifies data by how dangerous it is to hold, and says how known vulnerabilities and unknown ones are handled. Detail lives in `/docs/security.md` (platform controls), `/docs/auth.md` and `/docs/permissions.md` (identity and access), `/docs/database.md`, `/docs/api.md`, `/docs/environment.md`, and `/docs/risk-and-legal.md`.

**Standards followed** (from established practice; confirm against current publications before citing externally): OWASP Application Security Verification Standard (ASVS), with Level 1 as the floor and **Level 2 as the target for anything that holds personal data**; OWASP Top 10 and OWASP API Security Top 10; the Common Weakness Enumeration (CWE) Top 25; the NIST Secure Software Development Framework; PCI DSS scope minimization (hosted checkout); and the HIPAA Security Rule safeguards (access control, audit, integrity, transmission security) **as a design model only. This project does not claim HIPAA compliance** and must not hold health records.

## 1. Data classification

Every field a feature stores or handles belongs to one tier. The feature specification names the tier (`/docs/features/README.md`).

| Tier | Examples | Rules |
| --- | --- | --- |
| **T0 Public** | Published event listings, public organization names | No special handling |
| **T1 Internal** | Operational data, non-personal settings | Server-side only; not exposed without need |
| **T2 Personal** | Name, email, account id, notification preferences | Collect only what is needed; owner-scoped access; included in export and deletion; never in logs, error reports or URLs |
| **T3 Sensitive** | Precise location, religious affiliation or activity tied to a person, prayer content, minors' data, private messages | Everything in T2, plus: justify the need in the specification; coarse by default (store the least precise form that works); encrypted in transit and at rest; access limited to the narrowest role and recorded in the audit trail; retention period set; counsel review before the first non-US user (`/docs/risk-and-legal.md`) |
| **T4 Restricted** | Social Security or national identification numbers, payment card numbers, bank details, medical or health records, government identity documents | **This platform does not store T4 data.** Card data is handled only by the payment provider's hosted checkout (`/docs/payments.md`). A feature that needs any other T4 data **stops** until the owner and counsel approve a design in writing (field-level encryption, key management, access logging, retention, breach process) |

If a user can type free text, assume it may contain T3 or T4 data. Free-text fields are bounded in length, never logged, and never sent to third parties without a reason recorded in `/docs/integrations.md`.

## 2. Rules for every change

Each rule names where it is enforced. "Guidance" means a reviewer checks it.

**Input and payloads (the API is the main attack surface)**

1. Treat all input as hostile: bodies, query strings, headers, path parameters, file names, webhook payloads. Validate with the shared schemas on the server, reject unknown shapes, strip unknown fields (mass assignment), and cap sizes. *Enforced:* `apiRoute`, the size-cap test, and the hostile-payload suite (`lib/api/hostile-payloads.test.ts`).
2. Parameterized access only: queries go through Drizzle; no string-built SQL; raw SQL only in the data layer. *Enforced:* data-layer import guard.
3. Never fetch a user-supplied URL blindly (server-side request forgery): allow-list schemes and hosts, block internal addresses, set time and size limits. *Guidance* until the first feature needs it.
4. Reject or neutralize control characters (for example a null byte) in text that reaches the database. *Gap:* not yet in the shared text schemas; add a shared helper with the first text column.

**Output and the browser (cross-site scripting, framing)**

5. Render through React only; never inject raw HTML, `eval`, or build code from strings. *Enforced:* lint rules `react/no-danger`, `no-eval`, `no-implied-eval`, `no-new-func`.
6. External links use `rel="noopener noreferrer"`. *Enforced:* lint rule `react/jsx-no-target-blank`.
7. The application must not be framed by other sites (clickjacking); content-type sniffing, referrer leakage and unneeded browser features are restricted; HTTPS is required. *Enforced:* response headers in `next.config.ts` (X-Frame-Options, `frame-ancestors 'none'`, nosniff, referrer policy, permissions policy, HSTS), tested, and confirmed on a real running build.
8. A full script policy (CSP `script-src` with nonces, in report-only mode first) is staged; the identity provider needs an allow-list. *Gap:* tracked (F-SEC-005).
9. Server Actions and cookie-authenticated mutations get cross-site request forgery review and cookie attributes (Secure, HttpOnly, SameSite) when the first one is written. *Gap:* tracked.

**Identity, access and secrets**

10. Identity comes from the verified session, never from the request; authorization is checked against the resource on the server, deny by default. *Enforced:* auth and service tests (proven).
11. Secrets live only in secret stores and local ignored files; never in code, logs, URLs, error messages, test names or documents. *Enforced:* the secret scan (all text files, tests included).
12. Least privilege everywhere: narrowest role, one credential per environment, no production credentials in automation or developer machines. *Enforced:* environment guards, workflow tests; database role separation is a launch-gate item (F-DATA-005).

**Data, logging and errors**

13. Collect the minimum; classify every field (section 1); give T3 a retention period and a deletion path. *Guidance* until the first user table; deletion and export are a launch gate.
14. Never log secrets, tokens, request bodies by default, or T2 to T4 data. Errors to clients are generic; details go to server-side reporting only. *Enforced for error responses* (proven); *redaction rules for logs* are written with the logging foundation (F-OPS-001).
15. Sensitive actions (role changes, approvals, deletions, exports) write an audit entry: who, what, when, prior state. *Planned* (F-AUTH-004).

**Dependencies and build**

16. Add a dependency only with a reason; keep versions compatible; pin the supply chain. *Enforced:* pinned actions, frozen lockfile, Dependabot, weekly health check.

## 3. Security questions in every pull request

The pull request template asks these (answer in a sentence; "none" is a valid answer):

1. Which data tier does this change touch? Does it add or move any T3 or T4 data?
2. Who can reach it, and how is that checked on the server?
3. What happens if a hostile caller sends crafted input to it?
4. What happens if a vendor it depends on is down or compromised?

## 4. Known vulnerabilities, unknown vulnerabilities and the database

**Known vulnerabilities (published CVEs).** Nobody checks "all" CVEs; we check the ones that affect software we actually use, from several sources:

* Dependabot version updates and (once enabled in repository settings) Dependabot security alerts; GitHub's advisory database.
* `pnpm audit` in the weekly health workflow (runtime dependencies, high and above) and before each release.
* Advisories from the core vendors and tools (Next.js, Clerk, Neon, Vercel, Expo, Drizzle, Playwright), reviewed at each major upgrade (`/docs/stack.md`).

**Patch targets** (adjustable by the owner): a high or critical advisory in a runtime dependency is fixed, or mitigated with a recorded reason, within 7 days; anything reported as actively exploited within 48 hours; medium within 30 days; low with the next routine update. A vulnerability with no patch available (several transitive ones today) is recorded with its exposure and mitigation and rechecked weekly.

**Zero-days (not yet known to anyone) cannot be detected by definition.** The defense is to limit the damage if one is used: least privilege and separate credentials per environment, no secrets or database access in the browser or the apps, the layered boundaries so one flaw does not reach the data, input and size limits, rate limiting at the edge (planned), security headers, error tracking and alerting so abnormal behavior is noticed (planned, F-OPS-001), backups with a tested restore (F-DATA-002), a written incident response page (F-SEC-007), and the ability to deploy a fix or roll back quickly (`/docs/release.md`). Keeping the dependency list small shrinks the target.

**The database.** Neon is a managed service: it patches PostgreSQL and the platform, which is why we cannot (and should not) scan the database software ourselves; we depend on the vendor's patching, and their security notices are part of the vendor review. What we control: clients never connect to it; the server uses parameterized queries only; each environment has its own credential; connections use TLS; migrations are reviewed; production is protected from destructive tooling; backups and a restore drill (open item). Neon states that data is encrypted at rest; **verify and record this in the vendor review before T3 data is stored.** Separate migration and runtime database roles are a launch-gate item.

## 4a. Where we look for known problems (risk intelligence)

Sources are named from established practice; check that each is still current before relying on it.

| Question | Source |
| --- | --- |
| Is a package or tool we use known to be vulnerable? | GitHub Advisory Database, OSV.dev (and its scanner), the National Vulnerability Database and CVE.org, `pnpm audit` |
| Is anyone exploiting it right now? | The CISA Known Exploited Vulnerabilities list (anything we use that appears there is fixed first); exploit-likelihood scores (EPSS) to rank the rest |
| Is a package healthy and trustworthy? | OpenSSF Scorecard and deps.dev (security practices, dependency tree, licenses); Socket (malicious or hijacked npm packages, look-alike names) |
| Is a vendor down or having incidents? | The status pages of Vercel, Neon, Clerk and GitHub; the vendors' published postmortems |
| What goes wrong in practice, and which attacks matter? | The Verizon Data Breach Investigations Report, OWASP Top 10 and API Top 10, the CWE Top 25, MITRE ATT&CK, public postmortems |
| Is a new version of a core tool safe to adopt? | That tool's release notes, security advisories and open regressions (Next.js, Expo and React Native, Clerk, Drizzle, the Neon driver, Playwright) |

**Tool risk review.** Monthly, and before any major upgrade of a core tool (`/docs/stack.md`), read those sources for the core tools: new advisories, anything on the exploited list that touches us, unresolved regressions or breaking changes in the versions we run or plan to run, and vendor incidents since the last review. Record the findings in an issue, open follow-up issues for anything that needs action, and bring any cost to the owner. Claude can run the review on request.

**Automation (existing and planned).** Existing: Dependabot, the weekly health workflow (`pnpm audit`, peers, Expo compatibility). Planned, each needing a repository setting or workflow change reviewed by the owner: GitHub security alerts for the core tool repositories (watch their advisories), OSV scanning of the lockfile in the weekly workflow, an OpenSSF Scorecard run for this repository, and GitHub CodeQL and secret scanning.

## 4b. Testing for hostile traffic

* **Hostile-payload suite** (built): crafted bodies and query strings against the API adapter; each must produce the standard response, never a crash, never an echo, never a changed prototype, and never call the service for invalid input.
* **Automated scans** (`/docs/qa-strategy.md` section 7): CodeQL and secret scanning (repository settings; owner action), then an OWASP ZAP scan of a Preview once real endpoints exist.
* **Manual penetration test** before real users or payments (Burp Suite Community or a professional test), with API attacks first: object-level authorization (changing ids), function-level authorization, mass assignment, injection, resource exhaustion, and business-logic abuse.

## 5. Enforcement and proof status

| Rule group | Mechanism | Proof |
| --- | --- | --- |
| Cross-site scripting: no raw HTML, no eval, safe external links | Lint rules | Each rule broken by a probe file and caught |
| Framing and baseline browser protections | Response headers plus their test | Four header breaks caught; headers confirmed on a real build for a page and an API route |
| Hostile API payloads | Hostile-payload suite plus `apiRoute` | Two sabotages of the adapter caught; the size cap has its own pinned test |
| Secrets | Secret scan over all text files and tests | Probes in SQL and test files caught; fake fixtures accepted |
| Access control, error safety, environment safety, layer boundaries | See the scorecard | Proven (many breaks) |
| Script policy (CSP script-src), CSRF review, null-byte handling, log redaction, audit trail, rate limiting, field-level encryption design, database roles | Not built | Not proven; tracked above |
| Code scanning, secret push protection, Dependabot alerts | Repository settings | Owner action pending |
