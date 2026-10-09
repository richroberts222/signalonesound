# Fable gap analysis: what is missing or could be added

Independent review (Fable), 2026-10-09, branch `fable/gaps-base`. Read-only: documents and code, no packages installed. Budget: Step 1 headings only; about 20 bounded file reads for Step 2. Items already in the history or the still-open list are not repeated.

## Step 1: one line per rule document (headings only)

| Document | Most important missing or thin section |
| --- | --- |
| api.md | No section on request limits and timeouts as a rule (body size, query size, handler timeout, pagination caps) |
| architecture-rules.md | No section on observability or operability (what every component must emit: health, errors, metrics) |
| auth.md | No section on account lifecycle (deletion, suspension, Clerk webhooks keeping the database in step) |
| boilerplate.md | No "what a generated app must do in its first week" checklist (security settings, secrets, budgets) |
| code-quality-audit.md | none |
| code-quality.md | No section on dependency hygiene (adding, pinning, removing, licence) beyond stack.md |
| customization-map.md | none |
| data-fetching.md | No section on time zones and locale formatting (section 14 covers dates generally; events are time-zone bound) |
| data-mutations.md | No section on feature flags or staged rollout of a mutation path |
| database.md | No automated destructive-migration guard section (section 12.3 is a manual review) and no data inventory per column |
| deployment.md | No rollback procedure section (how to revert a bad web deploy, who, how fast) |
| environment.md | No secret rotation section (inventory, frequency, zero-downtime steps, leak response) |
| fable-audit-charter.md | none (charter, not rules) |
| future-readiness.md | none |
| git-workflow.md | No section on signed commits or author identity (who may push: human, Claude, bots) |
| integrations.md | No section on email and push messaging rules (unsubscribe, sender identity, payload content) |
| issues.md | none |
| lessons.md | none |
| mobile.md | No offline and poor-network behavior section, and no update-channel/runtime-version policy |
| naming-conventions.md | none |
| new-app-setup.md | No post-setup hardening checklist (GitHub security settings, spend limits, alerting) |
| notes.md | none |
| payments.md | none for now |
| permissions.md | No section on administrative audit logging (who did what to whom) |
| product-development.md | No section on feature flags or kill switches in the delivery pipeline |
| qa-strategy.md | No accessibility test layer (WCAG 2.2 AA is the declared target in risk-and-legal.md) |
| release.md | No rollback and hot-fix section (how to pull an app update, how to revert web) |
| risk-and-legal.md | No incident response section (breach notification clock, contacts, steps) |
| routing.md | Empty file: no rules at all (public vs protected route list, deep links, redirects) |
| secure-coding.md | No key management section (which keys exist, where, who rotates) |
| security.md | No abuse-prevention section (bots, sign-up floods, per-user quotas) |
| server-components.md | Empty file: no rules at all (server/client boundary, what may be a client component) |
| services.md | No section on idempotency and retries for service operations |
| shared-code.md | No contract-compatibility test section (how a breaking change to a shared contract is caught) |
| stack.md | none |
| testing.md | No accessibility or contract test category |
| ui.md | Accessibility section is 18 lines of "should" with no enforcement; no internationalization section |
| web.md | none |
| automation/README.md | none |
| automation/acceptance.md | No accessibility assertions in the acceptance layer |
| automation/coverage.md | No threshold or ratchet rule (17 lines) |
| automation/e2e.md | No rule on flaky-test handling (quarantine, retry policy) |
| automation/integration.md | No contract test (client against real handler) rule |
| automation/playwright.md | none |
| automation/reporting.md | none (future goal stated) |
| automation/test-value-review.md | none |
| automation/unit.md | none |
| product/product-plan.md | none (product, not rules) |
| product/roadmap.md | none |
| product/source-product-plan.md | none (source) |
| features/README.md | No spec template section (a feature spec must list data fields, tiers, permissions, flags) |

## Step 2: new recommendations, most valuable first

Size: S small (hours), M medium (a day or two), L large. When: F = before the first feature, U = before real users, L = later.

| # | What | Why it matters | Size | How it is enforced or proven | When |
| --- | --- | --- | --- | --- | --- |
| 1 | Accessibility enforcement: add the full `eslint-plugin-jsx-a11y` rule set (Next only ships a small subset), run axe-core in Playwright on every page in the acceptance suite, and require `accessibilityLabel` on mobile controls | WCAG 2.2 AA is the declared legal target but today it is 18 lines of "should" with no check; retrofitting a11y is far costlier than building it in | S | Lint fails on a missing label; axe scan fails on any serious/critical violation; proven by breaking a label on purpose | F |
| 2 | Destructive-migration guard: a test that scans `apps/web/drizzle/*.sql` for DROP, ALTER COLUMN TYPE, SET NOT NULL, RENAME and fails unless the file carries an explicit `-- allow-destructive: <issue>` marker; plus a rule that such migrations run against a Neon branch of prod data first | database.md 12.3 relies on a human reading the SQL; the first real table is the moment a mistake becomes permanent | S | Unit test in `db/tooling`, proven by adding a DROP without the marker | F |
| 3 | Account lifecycle: a Clerk `user.deleted` (and `user.updated`) webhook handler that deletes or anonymizes every row owned by that user, plus a rule that every table with `owner_id` declares its deletion behavior | Nothing today removes a user's data when the Clerk account goes; Apple requires in-app deletion; GDPR/CCPA require deletion and export; orphaned prayer content is a T3 liability | M | Integration test: delete user -> owned rows gone; schema guard: every `owner_id` column has a declared deletion path | U (design the convention at F) |
| 4 | Data inventory guard: a `docs/data-inventory.md` table (column, tier T0-T4, purpose, retention, deletion path) and a test that every column in `db/schema.ts` appears in it | secure-coding.md classifies tiers but nothing ties a real column to a tier; the inventory is also the input for the privacy policy and retention schedule already on the open list | S | Test parses the schema and the table; proven by adding an unlisted column | F |
| 5 | API contract compatibility test: snapshot the shared Zod contracts (field names, types, optionality) and fail when a field is removed, renamed or made required within the same `API_VERSION`; run the mobile client against the real route handler in-process, not a mocked fetch | api.md promises additive-only changes because mobile cannot be force-updated, but nothing proves it; the mobile client test only talks to a stub | S | Contract snapshot test in `packages/shared`; in-process handler test for the mobile client; proven by renaming a field | F |
| 6 | Secret and key rotation procedure: inventory every secret (Clerk, Neon, Vercel token, GitHub app, EAS, Dependabot), who rotates it, how often, the zero-downtime order (new Neon password -> Vercel env -> redeploy -> revoke old), and the leak playbook (rotate first, then investigate) | The word "rotate" appears in no document; a leaked key with no rehearsed rotation is an outage plus a breach | S | Procedure in environment.md; a rotation performed once and logged in lessons.md | U (leak playbook at F) |
| 7 | Feature flags and kill switch: a tiny flag port (env or table backed, read server-side, exposed through the API so mobile obeys it) and a rule that every new feature ships behind a flag until proven on prod | Mobile releases cannot be pulled back quickly; a server-side switch is the only fast "off"; also enables dark launches without a deploy | M | Flag port with a fake in tests; acceptance test that a flagged-off feature returns 404/not shown; proven by flipping the flag in a preview | U |
| 8 | Time zones and locale rule: store UTC plus the event's IANA time zone, render in the event's zone for events and the viewer's zone for personal items, format dates and numbers with `Intl` only, never hand-built strings | Church events happen in a specific place; a "7 pm" rendered in the viewer's zone sends people to the wrong hour; this is the cheap half of internationalization | S | Lint rule or test banning `toLocaleString()` without a time zone and `new Date(string)` on user input; unit tests for a cross-zone event | F |
| 9 | Abuse quotas and bot protection beyond rate limiting: per-user creation quotas in the service layer (for example max submissions per day), Clerk bot detection and email verification turned on, honeypot field on public forms | Rate limiting (tracked) stops floods, not a patient spammer; a prayer-request feed with no quota is a spam magnet from day one | S | Service test: the N+1th create returns `rate_limited`; Clerk settings recorded in new-app-setup.md | U |
| 10 | User-generated-content safety rules: report, block, hide, takedown and appeal flow; moderator actions written to an append-only audit table; DMCA agent and contact page; minors rule enforced at sign-up (18+ attestation) | App Store and Play reject UGC apps without report/block; moderation exists only as a mock; the audit table is also what permissions.md lacks | M | Audit table with insert-only policy (no UPDATE/DELETE grants), tested; report flow in the acceptance suite | U (design at F for the first UGC feature) |
| 11 | Email and push messaging rules: transactional vs marketing split, unsubscribe and sender identity (CAN-SPAM), push-token lifecycle (register, refresh, revoke on sign-out), quiet hours, and no T3 content (prayer text, location) in push payloads shown on lock screens | integrations.md mentions messaging only as "handled later"; the first notification feature will otherwise set the pattern | S | Section in integrations.md; unit test that the push payload builder rejects T3 fields; provider adapter behind a port | U |
| 12 | Mobile offline and poor-network rules: every screen has a no-network and a retry state, reads are cached with a visible freshness marker, writes retry with backoff and an idempotency key, no silent data loss | A church-event app is used in buildings with poor signal; without a rule, each screen invents its own behavior | S | Added to the definition of done; acceptance test with the network blocked; mobile client unit test for retry/backoff | F for the rule, U for the proof |
| 13 | EAS Update policy: set `runtimeVersion` (fingerprint or app-version policy) and update channels in `app.config.ts`, and a rule for which changes need a store build versus an over-the-air update | `runtimeVersion` is absent, so the first over-the-air update would be rejected or, worse, applied to an incompatible native build | S | Config check test (`runtimeVersion` present); rule in release.md | U (before first TestFlight) |
| 14 | Cost controls: Neon autosuspend and compute cap, Vercel spend limit and usage alerts, Clerk MAU threshold alert, EAS build quota, GitHub Actions minutes alert, all recorded with owner-approved ceilings | "Ask before spending" covers new vendors, not a runaway bill from an existing one (a bot loop or a bad query); alerts are free | S | Settings checklist in new-app-setup.md with the ceiling values; screenshots or a dated confirmation in notes | U |
| 15 | Incident response mini-runbook: who is contacted, the first 30 minutes (kill switch, rotate, snapshot), the breach-notification clock (many US state laws and GDPR count in days), a status message template, and a post-incident lessons entry | risk-and-legal.md lists laws but not what to do at 2 am; the existing lessons.md rule only covers defects, not outages | S | One page in risk-and-legal.md; a tabletop walk-through logged once | U |

### Small code findings (fix with a test, all before the first feature)

| Where | Finding | Fix |
| --- | --- | --- |
| `apps/web/lib/api/handler.ts` line 62 | `MAX_BODY_BYTES` compares `text.length` (characters), so a body of 4-byte characters can be about 400 KB before it is rejected | Compare `Buffer.byteLength(text)` (or read `Content-Length` first); extend the existing size test with a multi-byte body |
| `apps/web/lib/auth/authorize.ts` `can()` | A rule that throws (for example a database outage inside an ownership lookup) silently becomes "forbidden" with no report | Keep fail-closed, but pass the error to the unexpected-error hook so outages are visible, with a test |
| `apps/web/app/api/v1/status/route.ts` | Returns `ok` without touching the database although `db/health.ts` exists, so a dead database still reports healthy | Keep `/status` as liveness; add `/ready` that calls the health check, for monitoring (open item) to use |

## Step 3: overall

**Confidence that the rule set is solid enough to start the first real feature: 85%** (up from 82%). Nothing found blocks starting; the three items below are cheap and are best done before the first real table and screen exist.

Top 3 to do first: (1) destructive-migration guard plus the data inventory guard (items 2 and 4, both touch the first real table); (2) accessibility enforcement (item 1); (3) API contract compatibility test (item 5). Then the account-lifecycle convention (item 3) before any table with an `owner_id` ships to real users.
