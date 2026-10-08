# REQ: Requirements and product definition

Examined 2026-10-08 (Pass 2) at `main` `826b53e`. Depth: Standard. Home for: product plan precision and consistency; feature specs and acceptance criteria; naming; product decisions engineering depends on; requirements-to-release traceability (`methodology.md` section 4).

## Method note

Read in full: `docs/product/product-plan.md`, `docs/product/roadmap.md`, `docs/naming-conventions.md`, `docs/features/README.md`, `docs/product-development.md`. Compared against the code the plan's minimum scope produced: `lib/discover/revival-types.ts`, `lib/discover/filters.ts`, `lib/church/types.ts`, `lib/church/event-draft.ts`, and searches for map, notification and location packages and for user-facing product-name copy. Owner decisions already made are in `decisions-needed.md` (Q-009, Q-010, Q-012).

The source plan (`source-product-plan.md`) was not re-read line by line; `product-plan.md` states it is a faithful normalization and the audit's job here is whether the requirements are precise enough to build and test, not whether they are the right business.

Not examined, and why: whether the product is the right business or the revenue estimates are realistic (owner's domain, outside an engineering audit); the five delivered mocks' visual design (UX subject).

## Findings

### F-REQ-001 There are no acceptance criteria or feature specs for anything delivered, so requirements cannot be traced to a release

| Field | Value |
| --- | --- |
| Status | Challenged |
| Severity | Medium |
| Confidence | High |
| Timing | Trigger: the first slice that gets a real backend |
| Disposition | ADD |
| Scope | BOTH (the mechanism); Signal One (the content) |
| Trigger class | Foundational (mechanism) |
| Effort | S |

**Evidence**: `docs/features/README.md` says "No feature specifications exist yet" (READ). `roadmap.md` lists five delivered slices, each with Feature spec "none yet" (READ). The plan's minimum scope has no requirement identifiers and no acceptance criteria; the only thing tying a pull request to a requirement is free text in the issue (READ). `product-development.md` section 9 defines "Definition of Done" as "approved requirements implemented; acceptance criteria satisfied", which cannot be checked when neither exists.

**Observation**: For mocks this is acceptable and the process says so (mock-first discovery, section 3). The gap opens at the first real slice: "Submit unlimited events", "Manage current/recurring events" and "Edit, Remove, Update, Replace, etc." cannot be tested or reviewed against anything except the author's reading. The "etc." is a literal example.

**Consequence**: A real slice would be built, tested and reviewed against the implementer's interpretation. Tests then prove the interpretation, not the requirement, and a later reviewer (or a different AI session) cannot tell a defect from a different reading.

**Recommendation**: Keep it small and tied to the first real slice, not retroactive. (1) Give each line of the plan's section A a stable identifier (for example `A2.3`) so a spec, test or pull request can cite it. (2) Require, for any slice that touches persistence, a short spec in `docs/features/` containing only: requirement identifiers covered, acceptance criteria written as checkable statements, what is out of scope, and the open questions. The existing suggested sections are a menu; a spec needs only these four. (3) Add a "Requirements:" line to the pull request template (F-DEVOS-010) so the link exists in GitHub. Do not write specs for the delivered mocks.

**Alternatives and tradeoffs**: Full specification up front for every plan line (the plan's later tiers are explicitly unauthorized; this is the process theater the charter warns about). A traceability tool or matrix (heavy for one owner; a requirement identifier plus a PR line gives most of the value).

**Affects**: `docs/product/product-plan.md`, `docs/features/README.md`, `docs/product-development.md`, the PR template.

**Depends on / sequencing**: F-DEVOS-010 (the template); the first real-slice decision. Order (no cycle): Q-013 and the slice choice first, then F-REQ-004's mobile-read rule becomes a line in that slice's spec, which this finding governs.

**Verification**: The first real slice's pull request cites requirement identifiers, each has at least one acceptance criterion, and each criterion maps to a test or a named manual check.

**Decisions needed**: none.

**Challenge log**:

Challenge (Pass 4, 2026-10-08): verdict Reworded (Medium upheld)
  Strongest case against: A stable identifier for every line of the plan's minimum scope, plus a spec per persistence slice, risks becoming ceremony; the plan's later tiers are unauthorised. It also cites the wrong finding for the PR template.
  Evidence re-checked: READ `docs/features/README.md` ('No feature specifications exist yet'); READ `roadmap.md` 'Feature spec: none yet'. READ `findings/DEVOS.md`: the template finding is F-DEVOS-010; F-DEVOS-010 is the allow-list finding. REQ.md cited F-DEVOS-010 for the template in three places (corrected as part of this review).
  Result: Fix the cross-reference (done in REQ-001, REQ-003). Narrow the recommendation: identifiers only for the plan lines a slice actually covers, assigned when the slice is chosen; one four-section spec per persistence slice. F-DEVOS-010 supplies the PR/issue template, so the requirement line is added there. Medium holds because AI implementers will otherwise supply their own interpretation.

**History**: 2026-10-08 created. Absorbs the remainder of P-CH-01 (requirements-to-release traceability).


**History (Pass 4, 2026-10-08)**: reworded; corrected the F-DEVOS-010 to F-DEVOS-010 cross-reference; identifiers only for lines a slice covers.

**History (Pass 4b, 2026-10-08)**: Sequencing made acyclic with F-REQ-004 (Pass 4 ordering cycle).

---

### F-REQ-002 The owner's accepted product decisions live only in the audit folder, not in the documents that govern the product

| Field | Value |
| --- | --- |
| Status | Challenged |
| Severity | Medium |
| Confidence | High |
| Timing | Now |
| Disposition | ADD |
| Scope | Signal One |
| Trigger class | S1-specific |
| Effort | S |

**Evidence**: The owner has decided: 18 and older; the United States first with worldwide in mind; a generic legal agreement and privacy policy for now; two platform admins who share one login; church managers request and an admin approves; members are expected to pay (Q-009, Q-010, Q-012, all in `decisions-needed.md`). None appears in `product-plan.md`, `roadmap.md`, `naming-conventions.md` or any file under `docs/` outside `docs/audit/` (RUN, text search). The plan's rules say it is authoritative for product direction and that changes need the owner's decision (READ). The audit folder is reference-only and is excluded from any exported template (`README.md` of the audit, Q-002).

**Observation**: There is a direct tension. The plan's minimum scope says "Free member/user accounts" and keeps the member pricing UNDECIDED/VOTE (items K3 and K4). The owner now expects members to pay (tentatively). Both statements cannot guide a future session at once, and a session that reads only the governing documents will follow the older one.

**Consequence**: A later implementer, human or AI, building sign-up would not know the age floor, the first market, or that churches request roles, and might build the opposite (a self-selected church role, open sign-up with no age gate, a free-forever member model). The audit folder is merged last or not at all, so the decisions would be lost if it were discarded.

**Recommendation**: When the roadmap is approved (Pass 5 output), promote each accepted owner decision into the governing documents in one small documentation pull request: a short "Accepted decisions" section in `docs/product/product-plan.md` (dated, one line each, with the question number), and the matching terminology in `naming-conventions.md`. Mark K3 and K4 as "owner leaning: members pay, not final" rather than resolving them. The plan's own rule ("do not change requirements without Rich's decision") is satisfied because these are his decisions, quoted, not reinterpreted.

**Alternatives and tradeoffs**: Leave them in the audit folder (cheap; fails the moment the folder is not read). A separate decision-log document (adds a fifth authority; the plan already has a K section that fits).

**Affects**: `docs/product/product-plan.md`, `docs/naming-conventions.md`.

**Depends on / sequencing**: Pass 5 (decisions finalized); F-AUTH-003 (age, privacy), F-AUTH-001 (roles).

**Verification**: A text search of `docs/` outside `docs/audit/` finds the age floor, first market, role-request rule and membership model, each citing its decision.

**Decisions needed**: none (the content is already decided; see Q-013 for the one related open item).

**Challenge log**:

Challenge (Pass 4, 2026-10-08): verdict Upheld
  Strongest case against: The decisions are safe in `decisions-needed.md` as long as the audit branch merges; promoting them may duplicate. The owner's pricing leaning ('members pay') is tentative, so writing it down risks premature authority.
  Evidence re-checked: RUN grep of `docs/` outside `docs/audit` for age floor, first market, minimum age: no match. READ `docs/product/` : only `product-plan.md`, `roadmap.md`, `source-product-plan.md`. READ Q-009, Q-010 Status.
  Result: Confirmed: nothing outside the audit folder records the age floor, first market or role-request rule, and the audit folder is reference-only and excluded from exports. The finding's own safeguard (mark K3/K4 'owner leaning, not final') handles the tentative item. Sequencing is correct (after Pass 5). Upheld at Medium.

**History**: 2026-10-08 created. Absorbs the REQ part of P-RM-01 and P-NOTES-01.

---

### F-REQ-003 The roadmap and naming documents already disagree with the repository

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | High |
| Timing | Now |
| Disposition | IMPROVE |
| Scope | Signal One |
| Trigger class | S1-specific |
| Effort | XS |

**Evidence**: `roadmap.md` lists the Admin / Content Management mock as "Approved; in progress / in review (not merged)"; it was merged as pull request #77 (`901e532`, RUN, `git log`). `naming-conventions.md` records the user-facing name as **Signal One Sound** and says other "Signal One" copy may exist; it does: the dashboard greeting fallback reads "Signal One user" (`app/dashboard/page.tsx:22`) and the mobile screen title reads "Signal One" (`apps/mobile/src/App.tsx:25`) (READ). The roadmap refers to delivered slices by issue and pull request numbers but one status is stale, and no check notices.

**Observation**: Small items, but the process relies on these documents being true ("repository facts outrank external assumptions", and drift "is a defect").

**Consequence**: Low on its own. As a pattern it teaches readers to distrust the governing documents, and the first reader to be misled is an AI session that treats them as authoritative.

**Recommendation**: Correct the roadmap status in the same pull request as F-REQ-002. Treat the user-facing "Signal One" copy as an application slice (it is, per the naming document) and add it to the list of small copy fixes to do when application work resumes, not now. Fold the general fix (a status line that is updated by the pull request that changes it) into F-DEVOS-010's template rather than inventing a check.

**Alternatives and tradeoffs**: An automated drift check (high cost, low yield at this size).

**Affects**: `docs/product/roadmap.md`; later, two application files.

**Depends on / sequencing**: F-REQ-002 (same pull request).

**Verification**: Roadmap statuses match the merged pull requests.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created.

---

### F-REQ-004 The plan's minimum scope is mobile-first, but every delivered slice is a web mock, so the "one platform, three clients" claim has no product evidence

| Field | Value |
| --- | --- |
| Status | Challenged |
| Severity | Low |
| Confidence | Medium (the mock coverage is READ; whether web-first is intended is the owner's call) |
| Timing | Trigger: choosing the first real slice |
| Disposition | IMPROVE |
| Scope | Signal One |
| Trigger class | S1-specific |
| Effort | S |

**Evidence**: The plan's minimum scope A1 begins "Mobile app for iPhone/Android", then "Interactive GPS/location revival map" and "Push notifications" (READ). The delivered mocks are all in `apps/web`. The mobile app is a titled placeholder screen (`apps/mobile/src/App.tsx`, READ). The "near" filter uses a fixed list of mock origins (`lib/discover/filters.ts`, READ), no map or location package exists in any workspace and no notification package exists (RUN, dependency search); the only map reference is a link to Google Maps for directions (`event-actions.tsx`, READ). `CLAUDE.md` states the platform is "one platform with multiple clients" and requires every change to consider Android and iPhone.

**Observation**: Starting with web mocks is a sound way to find the workflow (mock-first discovery). But location, push notifications and a map are the parts of the minimum scope with the most platform-specific cost and policy exposure (permissions, store review, background behaviour), and none has been tried even as a spike. The architecture's claim that web and mobile share one API and one set of rules is therefore untested by any product behaviour.

**Consequence**: The first real slice may be designed web-only and then found hard to consume from a phone (authentication redirect, offline, stale versions), at which point the cost is a redesign of a live contract, which the additive-only API rule makes expensive.

**Recommendation**: When the first real slice is chosen, require that its acceptance criteria include one read of its data from the mobile app through the shared API, even as a bare screen. Do not build the map, push notifications or location until their own slices; do record in the slice's spec which minimum-scope lines are deferred and why, so the plan's mobile-first wording and the web-first sequence are reconciled in writing. See Q-013. The real-token proof is owned by F-AUTH-005 and is not repeated here.

**Alternatives and tradeoffs**: Web-only until launch with mobile later (legitimate if the owner decides so, but then the plan's wording should say it); mobile-first now (against the owner's pause, and the placeholders are not ready, F-REL-005).

**Affects**: The first slice's spec; `apps/mobile`; the product plan's wording.

**Depends on / sequencing**: Q-013 and the slice choice come first; F-REQ-004's rule is then written into the slice's spec, which F-REQ-001 governs (F-REQ-001 does not wait on this finding); F-ARCH-001 (contracts); F-REL-005 (mobile build readiness).

**Verification**: The first real slice's acceptance criteria include a mobile read of its data, and the plan states the sequence it is following.

**Decisions needed**: Q-013 (non-blocking; default recorded).

**Challenge log**:

Challenge (Pass 4, 2026-10-08): verdict Downgraded (Medium to Low)
  Strongest case against: This is a plan-consistency note and a rule for the first slice, both gated on a decision (Q-013, default web first). The mobile token proof is owned by F-AUTH-005; repeating it here double-counts.
  Evidence re-checked: READ `apps/mobile/src/App.tsx` (placeholder), `lib/discover/filters.ts` (fixed mock origins); RUN dependency search: no map, location or notification package. READ Q-013 (open, default option 1).
  Result: Evidence holds, severity does not: the consequence is a possible redesign later, not a present failure. Keep the single actionable rule (the first real slice includes one mobile read, with the plan's wording reconciled in writing) and let F-AUTH-005 own the token spike. Low.

Challenge (Pass 4b, 2026-10-08): verdict Upheld
  Re-checked: READ `apps/mobile/src/App.tsx` (placeholder) and Q-013 (open, default web first). Verified the ordering cycle with F-REQ-001 existed in both bodies; made acyclic.
  Result: Low holds. Grade: READ.

**History**: 2026-10-08 created. Absorbs the REQ part of P-CH-12 (the contract list itself stays in F-ARCH-001).


**History (Pass 4, 2026-10-08)**: Medium to Low; overlaps F-AUTH-005, decision Q-013 pending.

**History (Pass 4b, 2026-10-08)**: Sequencing made acyclic with F-REQ-001; real-token proof attributed to F-AUTH-005.

---

### F-REQ-005 Several requirements are too imprecise to build, and nothing records which slice each undecided item blocks

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | High |
| Timing | Trigger: the first real slice |
| Disposition | IMPROVE |
| Scope | Signal One |
| Trigger class | S1-specific |
| Effort | S |

**Evidence**: The plan's own section K lists ten undecided items. The naming document marks Revival, Church, Ministry, Organizer, Gathering and Venue (as an entity) UNDECIDED and says whether recurrence rules, the Revival Type list's extensibility, and event lifecycle are unspecified (READ). The roadmap lists eight data concepts surfaced by the admin mock and adds that none is designed (provenance, moderation decisions, duplicate/conflict rules, manager relationships, import batches, lifecycle states, history, events without an organization; READ). The plan's minimum scope contains phrases that cannot be tested as written: "Manage current/recurring events", "Edit, Remove, Update, Replace, etc.", "Search distance within radius ... X ... unlimited miles". The mock handles the radius correctly by not offering "X" and saying so (`filters.ts`, READ).

**Observation**: The process around this is good: undecided items are preserved, not invented, and the mocks do not pretend otherwise. What is missing is the next step: nothing says which undecided item blocks which slice, so the owner would be asked everything at once, or the wrong thing at the wrong time.

**Consequence**: Questions reach the owner late (after the schema depends on the answer) or all at once (decision fatigue for a non-developer), both of which have caused rework in comparable projects.

**Recommendation**: When the first real slice is chosen, add one table to its spec (or to the roadmap): each undecided item, the slice that first needs it, and the default that will be used if the owner does not answer. Ask only the items that slice needs. Pre-seed the table from this finding: recurrence and time zone (events slice; ties to F-ARCH-001), who may edit staff-entered records and who owns an event without an organization (moderation slice), duplicate definition (import slice), comment length (comments slice), pricing (membership slice).

**Alternatives and tradeoffs**: Resolve all ten now (premature: several only matter in tiers the plan marks unauthorized); ignore until needed (the current state, which works only while no real slice exists).

**Affects**: `docs/features/` (first spec), `docs/product/roadmap.md`.

**Depends on / sequencing**: F-REQ-001; F-ARCH-001; F-DATA (Database Design Checkpoint).

**Verification**: The first real slice's spec has the table and every item its slice needs has an owner answer or a recorded default.

**Decisions needed**: none now.

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created. Absorbs P-RM-02 (data concepts surfaced by the admin mock) and the REQ part of P-NOTES-01.

---

### F-REQ-006 User-generated content and store-policy obligations implied by the plan are not captured as requirements

| Field | Value |
| --- | --- |
| Status | Challenged |
| Severity | Low |
| Confidence | Medium (the plan text is READ; current store policy wording is RECOLLECTION and is UNVERIFIED, see below) |
| Timing | Trigger: the first user-generated-content feature, or the first store submission, whichever is first |
| Disposition | DEFER |
| Scope | Signal One |
| Trigger class | Sensitive capability |
| Effort | M |

**Evidence**: The plan includes reviews, testimonies, prayer requests, replies, comments, photos (three per user per event) and 30-second videos (sections B and C1), with the repeated instruction to "add filter to block negative requests and comments" and "block unsafe photos/video" (READ). It also includes accounts, and the owner expects to publish iPhone and Android apps. No requirement, spec or decision covers reporting content, blocking users, removal timelines, moderator staffing, appeals, or what "negative" means.

**Observation**: Three separate things are tangled in "filter negative comments". (1) Safety: abuse, harassment, illegal or sexual content, which has to be handled. (2) Viewpoint: deciding which religious opinions count as "negative" is a policy and trust decision for the owner, and an automated filter will make it arbitrarily. (3) Cost: automated image and video screening is a paid service, and human review is a person. Separately, the two app stores have rules for apps with user-generated content and for apps that let people create accounts (RECOLLECTION, UNVERIFIED): Apple expects a way to report content, to block abusive users, a published contact for complaints, and in-app account deletion when sign-up exists; Google Play expects an in-app reporting mechanism for such apps, an account-deletion path and an accurate data-safety declaration. These must be checked against the current published policies before a submission.

**Consequence**: A store rejection at first submission delays launch by weeks; an unmoderated feature at launch creates legal and reputational exposure; a surprise paid moderation service creates cost the plan's revenue estimate does not include. None of this is expensive to plan now and each is expensive to retrofit into a built feature.

**Recommendation**: Do not build any of it now. Record, as a requirement checklist that the first user-generated-content slice must meet before it can start: report content; block or mute a user; remove content with a recorded reason (the audit trail from F-AUTH-004); a named human moderator role and a response expectation; age floor enforced (Q-009); no content from signed-out users (matches the default in Q-010). Record a second checklist for the first store submission: in-app account deletion and export (F-AUTH-003), a privacy policy URL, the data-safety and privacy declarations, and a read of the then-current Apple and Google policy text. Ask the owner what "negative" should mean when that slice is chosen, offering two options: remove abuse and illegal content only, or also remove content the owner judges off-mission.

**Alternatives and tradeoffs**: Launch with no user-generated content at all (the simplest; the plan's minimum scope already does, since reviews and prayer requests are in later tiers); buy a moderation service early (cost and privacy exposure for no users).

**Affects**: The future UGC spec; `docs/security.md` (abuse controls); store submission checklist (F-REL-005).

**Depends on / sequencing**: F-AUTH-003, F-AUTH-004, F-SEC-006 (rate limiting), Q-009, Q-010.

**Verification**: The first UGC slice's spec cites the checklist and each line has a test or a named manual check; the first store submission records the policy text read and its date.

**Decisions needed**: the meaning of "negative" (ask at the UGC slice, not now).

**Challenge log**:

Challenge (Pass 4, 2026-10-08): verdict Downgraded (Medium to Low; ADD to DEFER)
  Strongest case against: The finding says 'do not build any of it now' and the plan places UGC in later, unauthorised tiers. The store-policy content is RECOLLECTION and UNVERIFIED. A checklist for a slice that may never exist is a hypothetical (test 9).
  Evidence re-checked: READ `product-plan.md` sections B and C1 (reviews, prayer requests, photos, videos); the finding's own UNVERIFIED note. No store policy text was fetched.
  Result: Keep as a pointer: when a UGC slice or the first store submission is chosen, read the then-current Apple and Google rules and apply the two checklists. DEFER with the existing trigger. Low.

Challenge (Pass 4b, 2026-10-08): verdict Upheld
  Re-checked: READ `docs/product/product-plan.md` UGC lines and the finding's own UNVERIFIED store-policy note; no store text was fetched (and none should be until submission).
  Result: Low / DEFER holds. Grade: READ, UNVERIFIED for policy text.

**History**: 2026-10-08 created. UNVERIFIED: the exact current Apple and Google rules (read the published policies at the time of the first submission; nothing in this session fetched them).


**History (Pass 4, 2026-10-08)**: Medium to Low and ADD to DEFER; trigger-gated and unverified.

---

### F-REQ-007 The requirements process and the plan's discipline about undecided items are sound and should be kept

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Info |
| Confidence | High |
| Timing | n/a |
| Disposition | KEEP |
| Scope | BOTH (process); Signal One (content) |
| Trigger class | Foundational |
| Effort | n/a |

**Evidence**: The plan separates minimum scope from unauthorized tiers and says so on every tier (READ). Items the source left unresolved are preserved with their original wording rather than guessed (K index, READ). The naming document refuses to invent terms and tells the reader to stop and ask (READ). The mock code carries the same discipline: `revival-types.ts` says the list is "a mock-stage constant, not a schema or contract", `filters.ts` does not offer the undefined radius "X", and `types.ts` marks recurrence as "display text only, not a rule model" (READ). Mock data is labelled and fictional.

**Observation**: This is the part of the process most likely to prevent expensive mistakes, and it is working. The findings above add a few precise hooks (identifiers, a decisions section, a blocking table) to it; none replaces it.

**Consequence of changing it**: Loosening it (letting implementers fill gaps) would trade a small saving now for rework later.

**Recommendation**: Keep as is.

**Affects**: n/a.

**Verification**: n/a.

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created.

---

## Reconciliation of prior inputs (REQ)

| Input | Outcome |
| --- | --- |
| P-CH-01 requirements-to-release traceability (remainder) | Adopted, scaled down → F-REQ-001 (identifiers, a four-part spec for real slices, a PR line); no matrix or tool |
| P-CH-12 upload, notification, search, geospatial contracts (REQ part) | Merged → F-ARCH-001 (contracts, trigger-gated), F-DATA-008 (geospatial), F-REQ-004 (mobile acceptance), F-REQ-006 (upload and notification policy) |
| P-RM-02 data concepts from the admin mock | Adopted → F-REQ-005 (blocking table); the design itself belongs to the Database Design Checkpoint at the first real slice |
| P-NOTES-01 unresolved product questions (REQ part) | Adopted → F-REQ-005 (anonymous, edit rights, duplicates, reversal), F-REQ-002 (durable home); AUTH part already in Q-010, F-AUTH-001, F-AUTH-004 |
| P-RM-01 not-yet-scheduled list (REQ part) | Adopted → F-REQ-002, F-REQ-005 |

Challenges to prior work: none to reverse. The existing process documents were found accurate apart from the stale roadmap status (F-REQ-003).
