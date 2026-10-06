# Fable Exhaustive Audit Charter

## Mission

Conduct an exhaustive, evidence-based review of **Signal One Sound**, its **reusable application boilerplate**, and the **software-development operating system** used to design, build, review, release, operate, recover, and evolve applications created from that boilerplate.

The goal is not to preserve existing decisions. The goal is to arrive at the most practical, robust, secure, maintainable, testable, observable, recoverable, accessible, scalable, and economically sensible system we can reasonably build.

This audit is intentionally allowed to challenge work already completed. Sunk cost is not a reason to keep a weak decision. Conversely, theoretical elegance is not a reason to replace a practical solution whose benefits exceed its risks and costs.

**Analysis comes first. Do not modify application code, schemas, workflows, configuration, infrastructure, or product behavior while performing this audit.**

## Phase 0 — Design and attack the audit itself

Before auditing Signal One Sound:

1. Critique this charter and the proposed methodology.
2. Design the analysis artifact/directory structure you believe is best. A prior suggestion was `docs/fable-analysis/` with separate subject and pass documents, but that is only an example. Rename, reorganize, split, combine, add, or remove artifacts as needed.
3. Optimize the structure for completeness, evidence, traceability, minimal duplication, maintainability, and eventual conversion of accepted findings into GitHub issues.
4. Define the audit passes and perspectives each pass will use.
5. Define how later passes will challenge earlier Fable conclusions rather than merely restating them.
6. Define how duplicate findings, disagreements, superseded recommendations, uncertainty, and unresolved questions will be recorded.
7. Define objective convergence criteria.
8. Then adversarially review the methodology you just designed and improve it before beginning the project audit.

Record the final methodology durably in the analysis directory.

## Scope — question everything that matters

Inspect the live repository and actual implementation, not only this document. Review requirements and product assumptions; architecture and boundaries; source code and code organization; types and validation; authentication and authorization; privacy and security; database design, migrations, integrity and recovery; API/interface contracts; web/mobile compatibility and versioning; testing strategy and test value; CI/CD; GitHub/Claude automation; dependencies and software supply chain; deployment and rollback; observability, logging, metrics and incident response; performance, scalability and cost; accessibility and UX; moderation/abuse controls; data lifecycle; documentation and drift; operational readiness; disaster recovery; long-term maintenance; developer experience; AI-agent governance; and reusable-boilerplate generation/customization.

Also inspect whether the **requirements themselves are correct and sufficiently precise**. Good code implementing weak requirements is still a weak system.

Use actual files, diffs, tests, scripts and configuration as evidence. Where a conclusion depends on external console state (GitHub, Clerk, Neon, Vercel, app stores, etc.) that cannot be inspected, mark it **UNVERIFIED** and specify exactly what a human should verify.

## Fixed technology constraints

Unless a finding is extraordinary enough to justify explicit reconsideration by Rich, preserve these foundations:

- Web: Next.js, React and TypeScript
- Mobile: React Native / Expo
- Authentication/identity: Clerk
- Database: Neon PostgreSQL
- ORM/data access: Drizzle ORM
- Web deployment: Vercel
- Source control/work management: Git and GitHub
- Product strategy: coherent Web + Android + iPhone clients sharing appropriate backend contracts and business rules

You may criticize these choices, identify risks, and recommend how to use them better. **Do not silently replace them.** If you believe one creates a material architectural or security failure that cannot reasonably be mitigated, document an **EXCEPTION REQUEST** with evidence, alternatives, migration cost/risk, and why the fixed constraint should be reconsidered. Rich must explicitly approve replacement.

The controlled one-issue/one-branch/one-PR implementation workflow is also the current operating constraint. You may recommend simplifying or strengthening its mechanics, but do not use this audit to run parallel implementation work.

## Recommendation standard

For every material existing decision or finding, use one of:

- **KEEP** — current approach is sound.
- **IMPROVE** — preserve the approach but strengthen it.
- **REPLACE** — a materially better practical approach justifies migration.
- **DEFER** — valid concern, but implementation now would cost more than its present risk reduction.

Every actionable recommendation must record, as applicable:

- stable finding/recommendation ID;
- evidence and exact file/system references;
- current behavior or decision;
- problem or opportunity;
- consequence and plausible failure mode;
- severity/risk and confidence;
- KEEP / IMPROVE / REPLACE / DEFER;
- recommended solution;
- realistic alternatives considered;
- tradeoffs, migration cost and new complexity introduced;
- affected files, services, data, clients and workflows;
- whether it belongs to Signal One specifically, the reusable boilerplate, or both;
- whether it is always required or activated by a maturity/risk trigger;
- dependencies and sequencing constraints;
- verification/acceptance criteria proving the concern is resolved;
- unresolved product/human decisions.

Do not inflate severity. Do not manufacture work to make the audit look exhaustive.

## Risk-based engineering, not bureaucracy

Prefer deterministic automated enforcement when a machine can prove a rule. Use documentation for knowledge and judgment that cannot be encoded reliably. Add human process only where automation cannot provide the needed assurance.

Distinguish:

1. foundational controls that belong in every generated application;
2. Signal One-specific controls;
3. controls required before production/real user data;
4. controls triggered by sensitive capabilities or higher risk;
5. controls triggered by scale/team/compliance maturity;
6. ideas that are valid but currently overengineering.

A starter must be structurally correct without becoming a spaceship control panel for a trivial application.

## Existing concerns to challenge, not blindly inherit

Prior reviews have raised concerns including requirements-to-release traceability; independent diff review; Definition of Ready/Done; risk-based gates; threat/abuse modeling; authorization matrices and deny-by-default server enforcement; data classification/lifecycle/privacy; migrations, backup and tested restore; idempotency/concurrency; time/identifier conventions; external dependency failure handling; upload/notification/search/geospatial contracts; test taxonomy and flaky-test policy; accessibility; performance/capacity/cost; SLI/SLO/incident response; supply-chain security, SBOM/provenance; progressive delivery/rollback; AI-agent prompt/context safety and provenance; standards governance; long-term compatibility; reproducible builds; configuration validation; operational ownership; institutional-memory survival; emergency access recovery; credential/key lifecycle; silent data-corruption detection; blast-radius containment; vendor exit/data portability; operational kill switches; safe bulk operations; and legal/compliance triggers.

A previous independent Claude audit also reported: documentation drift and excessive duplication; security rules that exist only as prose; possible excessive permissions/credential exposure in the Claude GitHub workflow; floating GitHub Action tags; a possible unnecessary `cn` dependency; unverified branch protection; missing standing dependency scanning; missing CSP/security headers; untested restore procedure; undecided production migration procedure; weak production error monitoring/logging; missing rate limiting; lazy environment validation; privacy/deletion/export decisions; accessibility enforcement; transaction-architecture concerns; authorization test patterns; webhook integrity when Clerk synchronization is introduced; and least-privilege DB roles.

That review also warned against overengineering: excessive documentation/process ceremony, tests justified for bureaucracy rather than value, premature parallel-work machinery, premature environments, and team-scale controls that do not yet fit the project.

**These are inputs, not conclusions. Re-evaluate every one. Correct them, reject them, combine them, or replace them when the repository evidence supports doing so.**

## Multi-pass requirement

Do not perform one giant pass and declare success.

At minimum include:

- an evidence/baseline pass;
- architecture/product/data pass;
- security/privacy/abuse/supply-chain pass;
- quality/testing/accessibility pass;
- release/SRE/recovery/performance/cost pass;
- long-term-maintenance/mobile-compatibility/vendor-failure pass;
- reusable-boilerplate and developer-experience pass;
- an adversarial self-review pass treating prior Fable recommendations as if another team wrote them;
- a cross-cutting contradiction/dependency pass.

You may redesign these passes in Phase 0.

Use hostile scenarios where useful: years of operation, one million users, original developers unavailable, stale mobile clients, active attacker, malicious privileged insider, compromised dependency, partial vendor outage, bad migration/data corruption, account/credential loss, audit request, sudden traffic/cost spike, and recovery by engineers unfamiliar with the system.

## Self-critique and convergence

Later passes must actively try to disprove earlier findings. Look for recommendations that are:

- based on incorrect repository assumptions;
- redundant with existing controls;
- too expensive for the risk;
- security theater;
- process theater;
- incompatible with another recommendation;
- likely to create maintenance debt;
- missing migration/rollback implications;
- solving a hypothetical problem while ignoring a current one.

Maintain a decision/change log when a later pass reverses or materially changes an earlier recommendation.

The audit has **not converged** merely because all planned categories were visited. Convergence means successive adversarial passes produce no new material engineering discipline, no unresolved contradiction among accepted recommendations, no high/critical finding lacking a disposition, and predominantly implementation-level refinements rather than architectural omissions.

If substantive new gaps appear, perform another pass.

## Transformation output

After convergence, produce a prioritized transformation roadmap. Do not implement it during the audit.

The roadmap must make clear:

- what must be corrected before real production data/users;
- what should be corrected soon but does not block current mock-first product discovery;
- what belongs in the reusable boilerplate;
- what remains Signal One-specific;
- what activates only at a defined maturity/risk trigger;
- ordering/dependencies;
- which changes need explicit Rich product/security/spending approval;
- how each accepted recommendation will be verified.

The eventual implementation will be decomposed into controlled GitHub issues and executed one slice at a time.

## Independence

Do not agree with Rich, ChatGPT, earlier Claude reviews, existing documentation, or your own earlier pass merely because they sound confident.

Prefer the recommendation that is demonstrably more practical and robust.

Equally, do not change something merely to demonstrate independence.

**The standard is evidence, consequences, tradeoffs, and fitness for the actual product.**

## Initial instruction for Fable

Read this charter completely. Inspect the repository sufficiently to understand what this charter is asking you to audit. **Begin with Phase 0 only:** critique and redesign the audit methodology and analysis artifact structure, then adversarially review your own methodology. Create the durable analysis structure and methodology documents you recommend, but do not modify application code or begin implementing audit findings. Once the methodology is stable, clearly state that Phase 0 is complete and what should happen next.
