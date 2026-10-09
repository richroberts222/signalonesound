# Future Readiness

Planning for growth without building it early. This document records (1) where the product plan says the platform is heading, (2) the standards larger customers and partners usually ask for, (3) the cheap decisions made now so options stay open, and (4) what waits for a trigger. **Nothing here authorizes building anything.** Product direction is in `/docs/product/product-plan.md`; only an approved issue authorizes work.

Standards are named from established practice and should be confirmed against current publications before they are cited externally. Anything that costs money needs the owner's approval first.

## 1. Where the platform is heading (from the product plan)

| Direction | Source | What it implies for the platform |
| --- | --- | --- |
| Launch on web, iPhone and Android, United States first | Phase 1, accepted decisions | One backend, three clients, US data first |
| Worldwide use | Accepted decisions (Q-009) | Time zones, languages, regional privacy law |
| Prayer movement, marketplace, streaming, international network | Phases 2 to 5 (Years 2 to 5) | More roles, payments, media, partner organizations, content volume |
| Church/Ministry networks and several managers per organization | Accepted decisions | Organization-scoped roles and data |
| A second application built from this foundation | Accepted decisions (Q-012) | Template quality; separate deployments per application |

## 2. What larger customers and partners usually ask for

None is required today. Each has a trigger.

| Ask | Standard or practice | Trigger | Platform readiness now |
| --- | --- | --- | --- |
| Single sign-on for an organization (SAML or OpenID Connect, user provisioning) | Enterprise identity (SAML, OIDC, SCIM) | A network of churches asks | Clerk offers enterprise connections (a paid tier; verify and ask first); identity stays in Clerk |
| Security attestation | SOC 2 Type II, ISO 27001 | A partner requires it | Controls are documented and tested (`/docs/audit/rules-review/scorecard.md`); a formal audit is a business decision |
| Accessibility conformance report | WCAG 2.2 AA, VPAT | A government, school or large-organization customer | Target stated (`/docs/risk-and-legal.md`); nothing measured yet |
| Data processing agreement and privacy rights | GDPR, UK GDPR, CCPA | First non-US user | Deletion, export and the data inventory are decided from the first user table (Q-009) |
| Uptime commitment and incident process | SLA, status page, incident response | Paid plans or partner contracts | Monitoring and rollback not built (F-OPS-001, F-REL-001) |
| Penetration test report | Third-party pen test | A partner or the public launch | Planned layers in `/docs/qa-strategy.md` section 7 |
| Audit trail of administrative actions | Audit logging | Any admin or moderation feature | Decided in `/docs/permissions.md`; not built (F-AUTH-004) |
| Software bill of materials and license compliance | SBOM, open-source license policy | A partner asks, or before the template is shared | Dependency license scan planned (`/docs/risk-and-legal.md`) |
| Partner and developer access to the API | API keys, rate limits, webhooks | A partner integration | Versioned API in place; keys and limits not built (F-SEC-006) |

## 3. Cheap decisions made now so options stay open

| Decision | Why it is cheap now and expensive later | Where it lives |
| --- | --- | --- |
| Every organization-owned and user-owned row carries its owner or organization id; permissions are checked against the resource | Retrofitting multi-organization data is a migration of every table | `/docs/permissions.md`, `/docs/data-mutations.md` |
| Time zones, recurrence, money (integer minor units plus currency) and units are decided before the first table that stores them | A wrong convention is baked into every row | `/docs/data-fetching.md`, `/docs/data-mutations.md` gates (F-ARCH-001) |
| User-facing text and date and number formatting stay out of business logic and use locale-aware formatting | Translation later becomes a text-extraction exercise, not a rewrite | `/docs/ui.md` (F-UX-004); translation itself is deferred |
| Each application built from the template gets its own deployment and database | Avoids a shared multi-tenant database with its isolation risks | `/docs/boilerplate.md` |
| Vendors sit behind ports with one adapter folder | A vendor can be replaced without touching business logic | `/docs/code-quality.md` section 12, `/docs/integrations.md` |
| The API is versioned and additive-only inside a version | Old mobile apps keep working while the platform grows | `/docs/api.md`, `/docs/release.md` |
| The first sensitive action records an audit entry (who, what, when, prior state) | Audit history cannot be reconstructed afterward | `/docs/permissions.md` |
| Region choice is explicit: the database region is recorded and matches the functions region | Moving data between regions later is a migration with downtime | `/docs/deployment.md` (F-REL-004) |

## 4. Deliberately deferred (build only at the trigger)

| Item | Trigger |
| --- | --- |
| Translation into other languages | The first non-English market is chosen |
| Background jobs and queues (email, push, imports) | The first feature that must run outside a request |
| Search service beyond PostgreSQL | Search quality or load requires it (F-DATA-007, F-DATA-008) |
| Caching layer, read replicas, content delivery for media | Measured performance or load needs, with a budget (`/docs/qa-strategy.md`) |
| Multi-region deployment | A second region's users or a legal requirement |
| Marketplace, streaming and network-specific architecture | Each phase is approved by an issue and a specification |
| Paid single sign-on, SOC 2 audit, pen test, status page | A partner requires it; the owner approves the spend |

## 5. Gaps an independent review raised, now tracked

| Gap | Handling |
| --- | --- |
| Monitoring, error tracking and alerting | Decide before launch (F-OPS-001); owner approves any paid service |
| What is logged server-side, and personal data in logs | A logging rule is written with the first logging feature; secrets and tokens are never logged (`/docs/security.md`) |
| Data retention schedule | Decided with the privacy policy and the first user table |
| Performance budgets (page weight, API latency) | Set with the first real feature and measured in the browser test job |
| Cross-site request forgery and cookie settings for server actions | Reviewed with the first server action; headers and cookie attributes with the security-header work (F-SEC-005) |
| Backups and a restore drill | Ranked above several High-rated rules in priority (F-DATA-002) |
| Mobile token storage and deep-link validation | Part of the walking skeleton's design review |

## 6. Product and operations ideas (independent review, 2026-10-09)

Ideas an independent reviewer added that are not engineering tasks. Each is a recommendation for the owner and the product plan, ranked; none is built and none authorizes work. "Policy" items cost almost nothing to decide now and are expensive to retrofit.

| Rank | Idea | Why it matters | Size | When |
| --- | --- | --- | --- | --- |
| 1 | **Organizer verification and impersonation policy:** how a church is claimed (domain email, phone, manual approval), what happens when two people claim one church, and a report-and-takedown path | The product is "trust this listing"; one fake church or misused name is the failure people talk about; it also sets the moderation load | Policy small, build medium | Policy before the first organizer feature spec |
| 2 | **Attendee privacy posture:** browsing is anonymous, saving stores the minimum, location is coarse by default, plus a one-paragraph privacy promise | A person-to-church link is T3 data; deciding before the first "save" feature is cheap, after it is a migration and a disclosure | Small | Before the first feature spec; ties to the data inventory and retention schedule |
| 3 | **Event data quality:** one record per church and venue, recurring events as a series, duplicate check, expiry of past events, time zones and daylight saving handled once on the server | Church calendars repeat weekly and change late; duplicates and stale listings lose users; the data model is the costliest thing to fix later | Medium | In the first feature spec |
| 4 | **Notification policy:** digest by default, quiet hours, a cap per organizer per week, one-tap unsubscribe per church, organizer rate limits | Notification fatigue is the top reason people delete community apps | Policy small, build medium | Policy now (`integrations.md`); build with notifications |
| 5 | **Organizer onboarding and the empty-state problem:** a ten-minute onboarding, import from an existing calendar, a plan to seed the first fifty churches | Two-sided platform: no events means no members and no members means no organizers | Medium | Before launch planning |
| 6 | **Accessibility for older users:** large-text and high-contrast defaults, plain-language copy, a print-friendly and text-message-shareable event page, no gesture-only mobile actions, enforced with axe in the browser tests | Church audiences skew older; a target on paper is not a usable product | Small | Rules now; guard with the first UI feature |
| 7 | **Offline and poor-signal use in venues:** event details cached on the phone, readable pages without script errors, no action lost when signal drops | Basements, rural parishes and crowds have bad signal exactly when the app is needed | Medium | Rule in `mobile.md`; proof with the mobile walking skeleton |
| 8 | **Moderation load and the two-person limit:** estimate the queue, define what is held automatically (links, images, a new organizer's first post), set review times | The owner and one partner cannot review everything; sets the legal posture | Small | Before user-generated content beyond event listings |
| 9 | **Support and incident runbook:** a support address, response targets, account recovery (especially with a shared admin login), message templates, a simple status page | The first real user writes within a day; improvising during an incident is costly | Small | Before the launch gate |
| 10 | **Cost ceiling and kill switch:** a monthly ceiling, usage alerts on each vendor's free-tier limits, an order of what to turn off first | "Ask before spending" does not watch existing spending; a viral weekend or a bot can exhaust free tiers overnight | Small | Before launch |

Also noted: seasonal load (Christmas and Easter peaks) belongs in the performance budgets; letting a church export its own data belongs with onboarding; family or household accounts are a product-plan question.

## 7. How this document is used

* Before designing a feature, check section 3: does the feature touch a decision that must be made now?
* When a partner or customer asks for something in section 2, treat it as a trigger: open an issue, estimate, and bring any spending to the owner.
* When something here is built, move it to the owning document and delete the row.
