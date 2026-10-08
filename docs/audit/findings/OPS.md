# OPS: Operations

Examined 2026-10-08 (Pass 2) at `main` `826b53e`; nothing in the operations area changed since the baseline `31ec6ba`. Depth: Standard. Home for: observability (logs, metrics, errors, traces); incident response; SLI and SLO; disaster recovery and runbooks; capacity, performance and cost; vendor outage handling; kill switches; safe bulk operations; operational ownership (`methodology.md` section 4).

## Method note

Evidence was gathered before the prior-input rows for OPS were re-read. Read: `apps/web/lib/api/report.ts` (the only error-reporting code); `docs/ideas/observability.md` and the other idea documents at heading level; the operations-related text of `docs/security.md`, `docs/deployment.md` and `docs/database.md` by search; the dependency lists of `package.json`, `apps/web/package.json` and `apps/mobile/package.json` for any logging, error-tracking, analytics or telemetry package (none); a search of server code for console output (one reporting sink and the database tooling's command-line messages).

Run (RUN, 2026-10-08): a request to the Vercel runtime-log API for the last seven days was refused (HTTP 403); one command-line read of recent request logs returned "No logs found" for the project in the default 24-hour window. Not repeated, per the platform's guidance.

Not examined, and why: the Vercel plan tier and its log retention (not exposed to the tools used; the tool description refers to the Hobby retention window, which is an indication, not proof); Neon compute and storage metrics (console only); Clerk limits (U-18); any alerting configuration in the vendor consoles (owner-relayed, none known).

## Findings

### F-OPS-001 There is no way to know the site is down or failing, and little evidence survives when it does

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Medium |
| Confidence | High that nothing is configured in the repository; Medium on the retention (INFER from the platform's own wording and an empty log read) |
| Timing | Before first real users |
| Disposition | ADD |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S to M |

**Evidence**: No logging, error-tracking, analytics or telemetry package exists in any workspace (RUN, dependency search). The only reporting is `reportUnexpectedError`, which writes one line to the process error stream with the error class name and, for database errors, the operation and kind, and deliberately nothing else: no route, method, request identifier, timestamp of its own, or user (READ; a privacy-driven design, `report.ts` comment). Client-side exceptions in the browser and in the mobile app are not captured anywhere. There is no uptime check, no alert, and no health route (F-REL-001). Vercel runtime logs could not be read for seven days (403) and the command-line read of the last day was empty (RUN). `docs/ideas/observability.md` is explicitly "not a requirement" and says production telemetry is not added without an explicit issue.

**Observation**: The privacy-first reporting choice is right and should be kept as a floor. But with it as the only signal, a failing deployment is invisible until a user reports it, and a report cannot be tied to a log line because no request identifier exists. If the platform keeps free-plan logs for roughly an hour (INFER), the evidence of an incident is gone before anyone looks.

**Consequence**: At launch, outages and bugs are found by users, diagnosed with no data, and fixed slowly, in a product whose first impression is its reputation.

**Recommendation**: (1) Generate a request identifier in the shared API adapter, return it as `X-Request-Id`, and include it, with route, method and outcome code (never the message, input, or identity) in the existing report line. This keeps the privacy floor and makes a user report traceable. (2) Add one error-tracking service for the browser, the server and, later, the mobile app, configured to scrub personal data and request bodies; choose a free tier from the vendor-neutral list in `docs/ideas/observability.md` at the moment this is authorized (a product decision about a third party seeing error data, F-AUTH-003). (3) Add a free external uptime check on the health route from F-REL-001 with an email or phone alert to the owner. (4) Write the privacy rule for telemetry in `docs/security.md` once: what may be sent, what may not.

**Alternatives and tradeoffs**: Rely on platform logs (short retention, no alerting on the free plan). Self-host a logging stack (heavy for one owner). Add session replay or product analytics now (declined: privacy cost, F-AUTH-003, and no users to analyse).

**Affects**: `lib/api/handler.ts`, `lib/api/report.ts`, web and mobile entry points, `docs/security.md`, `docs/ideas/observability.md`.

**Depends on / sequencing**: F-REL-001 (health route); F-AUTH-003 (what data may leave); the owner authorizing a vendor.

**Verification**: A deliberately thrown server error and a deliberately thrown browser error each appear in the tool with the request identifier; stopping the health route sends an alert within minutes.

**Decisions needed**: none now (vendor choice at authorization).

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created. Absorbs P-78-M07 (error monitoring and structured logs with redaction), P-78-T07 (uptime monitoring and alert routing; status page and on-call stay deferred), and the OPS part of P-SEC-06 (request logging).

---

### F-OPS-002 No incident response, runbooks, or kill switches exist, and one person is the whole team

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Medium |
| Confidence | High |
| Timing | Before first real users |
| Disposition | ADD |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S |

**Evidence**: A search of the documentation finds no incident-response, on-call, runbook or status-communication text. There are no feature flags and no code path to switch a capability off (READ; the only toggles are environment variables read at start). The owner is the only member of the Vercel team and the only repository collaborator, the Vercel team's two-factor indicator was reported off, and the business partner reaches Vercel through the owner's login (F-SEC-007; external-state).

**Observation**: For a product that will hold personal data, the first incident (a leaked credential, an abusive sign-up wave, a bad deploy, an outage) will happen to someone with no written steps, no spare administrator, and no way to stop the damage quickly. The useful controls already exist in the vendors' consoles and cost nothing; they simply are not written down.

**Consequence**: Slow, improvised response; actions taken in the wrong order (for example, rotating a credential before checking what it exposed); extended exposure.

**Recommendation**: Write one page, `docs/operations.md`, and keep it short enough to follow from a phone: (1) the five incidents to prepare for and the first three steps of each: bad deploy (roll back in Vercel, F-REL-001), credential leak (rotate in this order: Neon, Clerk, Vercel, GitHub; where each lives), abusive sign-ups (restrict sign-ups in Clerk; turn on Vercel's Attack Challenge Mode), data incident (stop, preserve, then decide on notice; get advice), outage of a vendor (check its status page; nothing to fix). (2) The **kill switches that already exist** and where to find them: Clerk sign-up restriction, Vercel Attack Challenge Mode, Vercel deployment pause or rollback, Neon branch connection reset by rotating the role password. (3) Who can do what: record the second owner or recovery contact for each vendor (F-SEC-007), turn on two-factor on every account, and give the business partner her own login or a shareable link instead of the owner's. (4) Subscribe the owner to the vendors' status pages. (5) A blameless note after each incident: three lines in the repository.

**Alternatives and tradeoffs**: A full incident-management process or paging service (heavy for one person). Do nothing until the first incident (the cheapest until it is not).

**Affects**: a new `docs/operations.md`; vendor settings (owner actions).

**Depends on / sequencing**: F-SEC-007 (credential lifecycle); F-REL-001 (rollback); F-OPS-001 (alerts).

**Verification**: The owner performs one rehearsal from the phone: roll a Preview back, and switch Clerk sign-ups off and on.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created. Absorbs P-CH-24 (operational ownership), P-CH-31 (kill switches), the incident-response half of P-CH-16, the runbook half of P-78-T10 (vendor-outage runbook), and F-DATA-002's runbook carry-forward. Emergency access (P-CH-26) is owned by F-SEC-007.

---

### F-OPS-003 Capacity, performance and cost limits are unknown, and public read traffic is not designed to be cheap

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | Low (the plans and limits are not read; the design point is INFER) |
| Timing | Before public launch |
| Disposition | ADD |
| Scope | BOTH |
| Trigger class | Trigger-gated |
| Effort | S to M |

**Evidence**: Plan tiers and limits for Vercel, Neon and Clerk are UNVERIFIED (U-18; F-REL-007). The Neon project is on the Free plan with a compute range of 0.25 to 2 units and a six-hour history window (external-state, UI-RELAY). The product's main public surface is event discovery (search by place and date), which will be the highest-volume read path. Today it reads static mock data.

**Observation**: A free database that suspends when idle adds a delay to the first query after a quiet period, and per-request database reads for every anonymous visitor scale cost and latency with traffic. Public discovery pages can be cached at the edge for short periods, which keeps cost and response time flat and keeps public pages up during a database or sign-in outage. This is a design decision best taken before the discovery query exists.

**Consequence**: A spike (a viral revival event, a church announcing to thousands) multiplies database load and may exhaust free limits or pause the site, at the moment of greatest attention.

**Recommendation**: (1) At the design of the real discovery data path: public reads are cacheable (short time-to-live, revalidated on change) and independent of sign-in; per-user pages stay dynamic. (2) Before launch, read and record each vendor's limits and the failure behaviour at the limit (some free plans pause rather than bill), set spend alerts where billing exists, and decide the upgrade trigger (F-DATA-002, F-REL-007: one decision covers the three vendors). (3) Record one performance baseline for a database-backed route after the region fix (F-REL-004).

**Alternatives and tradeoffs**: Always dynamic (simplest; costs scale with traffic). A separate search service (premature, F-DATA-008).

**Affects**: the discovery data path design, `docs/operations.md`, `docs/api.md`.

**Depends on / sequencing**: F-DATA-008 (search model), F-REL-004, F-REL-007.

**Verification**: A load test of the public discovery path at a stated request rate stays within the free limits, or the upgrade trigger is documented.

**Decisions needed**: none now (spend is the owner's at the trigger).

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created. Absorbs P-CH-15 (performance, capacity, cost), P-78-T08 (performance budgets), P-78-T09 (cost budgets and alerts), the cached-read-path half of P-78-T10, and the OPS part of F-REL-007.

---

### F-OPS-004 Vendor outages and bulk operations have no designed behaviour yet

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | Medium |
| Timing | Trigger: the first real data path and the first real bulk import |
| Disposition | DEFER |
| Scope | BOTH |
| Trigger class | Trigger-gated |
| Effort | S |

**Evidence**: If Clerk is unavailable, every authenticated request fails with the generic `unauthenticated` response (RUN: failure path of `getUserId` returns the generic 401; a failing identity provider is reported as an unexpected error, `report.test.ts`). If the database is unavailable, services surface a generic `internal` error. There is no retry, no degraded mode, and no distinction for the user between "sign in failed" and "service is down" (F-ARCH-002). The admin bulk import is a mock; a real import has no designed batch identity, dry run, size limit or undo (roadmap data concepts; F-AUTH-004).

**Observation**: Failing closed is the correct default and is already in place. What is missing is the design of what a user sees and what an operator can undo, and both are cheap to decide before the first real flow and expensive afterwards.

**Consequence**: A vendor outage shows as a broken product with no explanation; a bad import changes many records with no way to reverse it.

**Recommendation**: At the triggers: (1) a degraded-mode rule for public pages (serve cached content, show a banner for signed-in features); (2) bulk operations carry a batch identifier on every created record, run first as a dry run that reports counts and conflicts, cap the size, and can be undone by batch (ties to the audit trail, F-AUTH-004).

**Alternatives and tradeoffs**: Decide when built (the trigger is the build).

**Affects**: future services and admin import.

**Depends on / sequencing**: F-OPS-003, F-AUTH-004, F-ARCH-002.

**Verification**: A simulated Clerk outage leaves public pages up; an import can be rolled back by batch.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created. Absorbs P-CH-11 (server side) and P-CH-32 (safe bulk operations).

**History (Pass 3, 2026-10-08, S-08)**: `proxy.ts` runs the identity middleware on every page and API request except static files (RUN, matcher read), so public discovery pages are inside the identity provider's request path. Whether a provider outage takes down public pages is therefore a real, untested question; the verification step above is the test, and the middleware may need a public-route bypass at the first real public page.
---

### F-OPS-005 Service targets (availability, speed) are not defined, and should stay informal until there are users

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Info |
| Confidence | High |
| Timing | Trigger: the first real users |
| Disposition | DEFER |
| Scope | BOTH |
| Trigger class | Trigger-gated |
| Effort | S |

**Evidence**: No service level indicators or objectives are documented. There are no users, so none can be measured.

**Observation**: Formal availability targets for a product with no users and no monitoring would be theatre. What helps is three informal numbers once monitoring exists.

**Recommendation**: When F-OPS-001 is live, write three targets in `docs/operations.md`: the public pages are reachable (for example 99.5 percent monthly, measured by the uptime check), the discovery page responds in under two seconds for most visitors, and sign-in works. Review monthly. Do not build a metrics platform.

**Alternatives and tradeoffs**: None needed now.

**Affects**: `docs/operations.md`.

**Depends on / sequencing**: F-OPS-001.

**Verification**: The targets exist and the uptime check reports against the first.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created. Absorbs the SLI and SLO half of P-CH-16.

---

### F-OPS-006 Failing closed under dependency failure and keeping the error reports free of personal data are sound

KEEP. Evidence: when the identity provider or the database fails, the adapter returns a generic `internal` or `unauthenticated` result and sends the original error only to the server-side hook; the report line carries no message, stack, request data or identity (READ `report.ts`; `report.test.ts` proves a failing provider is reported and expected failures are not). Why it is sound: it protects users first and leaves room to add identifiers and an error tracker without weakening the floor (F-OPS-001). Tripwire: any change that writes a request body, a token, an email or a connection detail into a log line or an error report.

---

## Reconciliation of prior inputs (OPS)

| Input | Outcome |
| --- | --- |
| P-78-M07 error monitoring and structured logs with redaction | Adopted → F-OPS-001 (request identifier, error tracker, redaction floor kept) |
| P-78-T07 uptime monitoring, status page, alert routing, on-call | Uptime and alert adopted → F-OPS-001; status page and on-call deferred and recorded in F-OPS-002 as one page for one person |
| P-78-T08 load and performance budgets, Core Web Vitals | Informal targets → F-OPS-005; baseline → F-OPS-003 |
| P-78-T09 cost budgets and alerts on Vercel, Neon, Clerk | Adopted → F-OPS-003 (limits read before launch; one upgrade decision, F-REL-007, F-DATA-002) |
| P-78-T10 vendor-outage runbook; cached read path for public discovery | Adopted → F-OPS-002 (runbook), F-OPS-003 (cached reads), F-OPS-004 (degraded mode) |
| P-78-T12 second-region or multi-cloud disaster recovery | Rejected: not foreseeable (agreed with the input's own note); backup and restore stay in F-DATA-002 |
| P-CH-15 performance, capacity, cost | Adopted → F-OPS-003 |
| P-CH-16 SLI/SLO and incident response | Adopted → F-OPS-002 (incident response), F-OPS-005 (targets, deferred) |
| P-CH-24 operational ownership | Adopted → F-OPS-002 |
| P-CH-31 operational kill switches | Adopted → F-OPS-002 (existing vendor controls, written down) |
| P-CH-32 safe bulk operations | Adopted, deferred → F-OPS-004 |
| P-CH-11 external dependency failure handling (server side) | Adopted, deferred → F-OPS-004 |
| P-SEC-06 logging and audit (OPS part) | Request-identifier logging → F-OPS-001; audit trail → F-AUTH-004 |

Challenges to prior work: the privacy-first reporting design in `report.ts` is **kept**, not replaced: the earlier sentence in the docs that logging is "a stopgap sink" is accurate; the recommendation extends it, it does not reverse it.

## Lens matrix

| Lens | Result |
| --- | --- |
| L1 Drift | Examined, nothing material: `api.md` and `report.ts` agree; `docs/ideas/observability.md` is correctly labelled as not a requirement. |
| L2 Enforcement | F-OPS-001 (no alert, nothing proves the site is up), F-OPS-006 (what is enforced). |
| L3 Adversary | F-OPS-002 (abusive sign-ups, credential leak response), F-OPS-001 (an attack is invisible). |
| L4 Failure and recovery | F-OPS-001, F-OPS-002, F-OPS-004; backup and restore are F-DATA-002. |
| L5 Scale and cost | F-OPS-003. |
| L6 Longevity | F-OPS-002 (one person is the institutional memory; runbooks carry it), F-OPS-001. |
| L7 Compatibility | Examined, nothing material: the same request identifier and error tracker serve web, API and mobile. |
| L8 Simplicity | F-OPS-002 (one page, no incident platform), F-OPS-005 (three informal targets), F-OPS-001 (one error tracker, no analytics). |
| L9 Boilerplate fit | The request identifier, the health route and the operations page template belong in every app; the vendor choice does not. |

## Carry-forward to other subjects

* **REL**: the health route is the alerting target; the rollback runbook belongs in `docs/operations.md` (F-REL-001).
* **SEC**: the credential-rotation order, second owner and two-factor (F-SEC-007); Vercel Attack Challenge Mode as a documented kill switch.
* **AUTH**: what error and telemetry data may leave the system (F-AUTH-003).
* **DATA**: backup, dump and restore drill (F-DATA-002) belong in the same runbook.
* **TEST**: the nightly workflow's failure notification (F-TEST-002).
* **BOIL**: request identifier, health route and the operations page are template items.
* **Platform facts still needed**: the Vercel plan and its log retention (F-REL-007); whether the owner has two-factor on GitHub, Vercel, Neon and Clerk (U-16).
