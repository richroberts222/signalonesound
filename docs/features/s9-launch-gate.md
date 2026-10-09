# S9 Launch Gate

**Status: DRAFT, not approved.** Source: blueprint slice S9; `/docs/release.md`, `/docs/risk-and-legal.md`, `/docs/database.md` section 12.4, `/docs/qa-strategy.md`. Depends on: S1 to S8. This slice is a gate, not a feature: nothing goes to real users until every item is proven.

## Purpose

Verify, with evidence, that the platform is safe, legal, accessible, monitored, recoverable and affordable enough to meet its first real users, then take it live.

## Scope (in)

* **Accessibility:** automated scan (axe in Playwright) across every page and screen state in the controls inventories; a keyboard-only pass; a screen-reader pass on web (NVDA or VoiceOver) and on both phones.
* **Security:** the security headers and script policy verified on the production domain; dependency audit clean of high issues without a documented exception; a manual pass against `/docs/secure-coding.md`; a penetration-style API run with the hostile-payload suite against a staging deployment; GitHub security settings (code scanning, secret scanning, push protection, alerts) enabled.
* **Reliability:** rate limits on every public endpoint; request timeouts; `/ready` endpoint and external uptime monitoring with alerts to the owner; error tracking live with redaction; a status and incident runbook.
* **Recovery:** the backup restore drill completed on Neon and logged; rollback procedure for web (instant rollback) and for a bad migration (forward fix plan).
* **Legal:** Terms, Privacy and the notices attorney-reviewed (they state: adults 18+ only; organizations are responsible for their listings; Phase 1 serves the US); collection gate checklist complete; takedown contact live; a written procedure for privacy requests (export and delete within 30 days) and for law-enforcement or legal data requests; app store privacy answers submitted. [Fable]
* **Cost:** spending ceilings and alerts set on every vendor; a one-page monthly cost estimate for 1,000, 10,000 and 100,000 users.
* **Environments:** production Clerk instance, production domain, production database, secrets in the host only; Production smoke test; preview and production separation verified.
* **Stores:** App Store and Google Play listings, screenshots, review notes, test accounts, age rating, privacy labels; TestFlight and internal tracks passed; staged rollout plan.
* **Launch plan:** seed content plan (first churches), support inbox, and the first-week checklist (watch errors, costs, reports daily).

## Out of scope

New features, marketing campaigns, paid plans for users.

## Acceptance criteria

* **AC1** Axe reports zero serious or critical violations on every page and state; the manual keyboard and screen-reader passes are logged.
* **AC2** The hostile-payload suite and security header tests pass against the staging deployment.
* **AC3** `pnpm audit` shows no high or critical issue without a dated, owner-signed exception.
* **AC4** Restore drill: a Neon branch restored to a point in time, verified by row counts, logged with date and duration in `/docs/database.md`.
* **AC5** A forced failure (broken deployment) is rolled back in under 5 minutes by following the runbook, timed and logged.
* **AC6** An uptime alert fires to the owner's phone within 5 minutes of `/ready` failing (tested by forcing it).
* **AC7** An injected error appears in error tracking with personal data redacted.
* **AC8** Every vendor has a ceiling or alert; the cost estimate is written and the owner has approved it.
* **AC9** Production configuration uses no development keys, verified by a check that fails on a development key pattern.
* **AC10** The load test passes the latency and error targets: expected launch load is 1 search and 2 event-page requests per second sustained (owner may restate); the test runs 10 times that for 10 minutes with p95 under 1 s and error rate under 0.1%. [Fable]
* **AC11** The risk-and-legal collection-gate checklist is fully ticked by the owner.
* **AC12** Store submissions are accepted for review; test accounts work.
* **AC13** The incident runbook, secret rotation steps, and on-call expectations are documented and the owner has read them.
* **AC14** Every scheduled job (S3 expiry, S6 and S7 retention purges, S7 matching and digest) runs in production on its schedule and its last run time is visible on the admin overview; a job that misses two runs raises an alert. [Fable]

## Controls inventory

Not a feature screen. The checklist in `/docs/release.md` is the control list; each AC has its evidence link recorded in the pull request or issue.

## Hostile and failure cases

Dependency compromise alert, leaked key (rotation drill), vendor outage (degraded mode tested for map, push, email, auth), database unavailable (readiness fails, friendly error), traffic spike, abusive crawler.

## Automation shipped with the slice

Accessibility suite in CI; staged security run; production configuration check; uptime and cost alerts; load test script kept in the repository; release checklist as an issue template; mutation proofs for each new check.

## Owner decisions and approvals

Domain purchase; Clerk production instance; Apple and Google accounts; any paid plan (Neon, Vercel, map, email, error tracking, uptime); attorney review budget; the go or no-go decision itself.

## Done checklist

Every AC ticked with linked evidence; owner go decision recorded; first-week checklist scheduled.
