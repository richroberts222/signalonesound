# Fable review of the Phase 1 draft specifications (S0 to S9)

Reviewed on branch `fable/specs-base`, 2026-10-09. Read: the ten specs, `docs/product/blueprint.md`, `docs/product/source-product-plan.md`. Edits are in place in `docs/features/`, each edited line ends with `[Fable]`. Structure of every spec is unchanged.

## Fidelity against the source plan

Nothing in the minimum startup scope is dropped: map, radius (10/25/50/X/unlimited), date, the twelve types, share, invite, free accounts, push "Revival coming near you!", criteria by location and timeframe, portal with 1 to 3 links, unlimited events, multi-type tagging, dashboard, required profile inputs (name, dates and times, venue, street, city, state, ZIP), manage recurring events, "Edit, Remove, Update, Replace".

Every UNDECIDED item stays undecided: flyers and livestream links ("??"), paid memberships and pricing, church pricing and "first 50 lifetime free", the comment limit, "Encounters" retention, community features placement, the slogan. One borderline case was fixed: S4 presented the radius value "X" as "100 miles"; it is now a single configuration placeholder that the owner's decision replaces, not a product value.

Items pulled forward from "Later Phase 1" or "Expanded" (allowed by the blueprint, now labelled so the owner sees them): city/state/ZIP search (S4), speakers and directions as plain text (S3), reminders for saved events (S7), fire reaction (S6, owner confirms). Items invented by the drafts and now marked as proposals or defaulted off: saved-event counts shown to managers (S6, not in the source, default off), email digest (S7, needs an email vendor; push is the requirement), quarantine (S8, owner decides; was contradicting S3's "publish immediately").

## Findings and fixes

| File | Finding | Fix |
| --- | --- | --- |
| s0 | AC5 "control characters" ambiguous (newlines?); no shared list/pagination/429 convention for later slices | AC5 single-line, code-point count; added API conventions (cursor, limit 20/50, 429 with Retry-After) |
| s1 | Policy re-accept (AC2) defined only for web pages; the mobile shell from S0 would be blocked with no signal | API returns `403 policy_reacceptance_required`; S5 AC11 handles it |
| s1 | DELETE /me then Clerk webhook delete: double deletion path, not stated idempotent | AC5/AC6 idempotent, same deletion path |
| s1 | Email address storage unclear; no user time zone, which S7 quiet hours need | AC12: email read from Clerk, never copied; `time_zone` on profile (T2) |
| s2 | `organization_member` tiered T1/T2 though blueprint calls person-to-church links T3; audit log also carries those links | T3; audit log admin-read only |
| s2 | Claim contact email collected but stored nowhere; manager invite had a control and no mechanism; org status values undefined; public fields of `GET /organizations/:id` undefined; `PATCH` fields undefined; sole-manager account deletion orphans the org | contact_email on the request (removed on decision); invite = pre-filled claim link; status pending/approved/unpublished; AC12 field lists; AC13 orphan rule; duplicate pending claim 409 |
| s3 | Recurrence model unstated (series rows vs occurrences); DST wall-clock rule, 5th-weekday months, "Replace" undefined; cap of 104 only in hostile cases | Occurrences materialized as event rows (max 104), wall clock constant across DST, skip missing weekday, Replace = edit |
| s3 | Delete semantics (hard/soft) unstated; S6 and audit need soft; no `GET /events/:id` for managers (edit page unbuildable before S4); idempotency header unnamed; concurrent edits unspecified | Soft delete; manager `GET /events/:id`; `Idempotency-Key` 24 h; `version` with 409; AC13 |
| s3 | Events that fail geocoding: behavior in search undefined; `moderation_state` used by S8 but absent from S3 schema; S3 "publish immediately" vs S8 quarantine | Defined (date/type searches only); column added with default; owner decision wording reconciled |
| s3 | Speakers/directions are Expanded items; no rule against minors' or private individuals' personal data in free text | Labelled optional pull-forward; editor rule added; US-only addresses stated |
| s4 | "X" radius placeholder read as a decision; AC1 "no cookie" collides with Clerk cookies for signed-in users; date presets' time zone (viewer vs event) unstated; keyset for distance sort unstated; `q` ambiguous (place vs free text); hidden/unapproved pages; directions link data | Config constant; AC1 scoped to signed-out visitors; presets resolved client-side to calendar dates; keyset defined; AC14 (no free-text, 404 rules, no viewer coordinates) |
| s5 | AC4 universal links cannot be proven before the production domain exists (S9) | Custom scheme on dev builds, re-proven in S9; AC11 for 403/404 handling |
| s6 | Depends on S4 only but AC1 requires mobile (S5); "journey log" mislabelled UNDECIDED; manager-facing saved counts not in source; invite token strength/expiry unstated; saving unpublished/deleted events undefined | Dependency on S5 for mobile parts; relabelled deferred; counts off by default; 128-bit token, 30-day expiry, no inviter-invitee link; AC10 |
| s7 | Email digest presented as core; AC2 "exactly one notification" conflicts with digest default; AC3 "once" undefined across repeated edits; quiet hours "local" with no stored zone; place label missing from rule; 10-rule limit not in API; email port dependency with S8 unresolved | Push is the requirement, email conditional; AC2 "at most one entry per member per event"; AC3 coalesced per hour, covers hidden/deleted; quiet hours use profile time zone; `place_label`; 409 beyond 10; shared email port |
| s8 | Report reasons not listed (unbuildable form); reporter identity and IP retention unstated; "suspend" effect on the member account undefined; S8 depended on S7's email port though it precedes it in dependency order; no 409 on repeated decisions; audit export of T3 data not itself audited; shared login makes the audit log unable to tell admins apart | Fixed reason list; hashed IP 24 h, no reporter identity; `user_profile.suspended` semantics; shared port; AC11; risk noted for owner |
| s9 | Load test "expected launch load" undefined; no acceptance for scheduled jobs running in production; legal items missing: privacy-request and legal-request procedures, adults-only and US-only statements | AC10 concrete numbers (owner may restate); AC14 job monitoring; Legal scope extended |

## Confidence and remaining risks

**Confidence that the ten specs can be built in order (S0 to S9) by an AI developer from the specs alone: 78%.**

Top 3 remaining risks:

1. **Recurrence and time zones (S3) feed everything after it.** Materialized occurrences with per-occurrence exceptions, DST wall-clock rules and series edits are the most error-prone code in Phase 1; S4 search, S6 saves and S7 alerts all assume plain event rows are correct. Insist on the DST and "edit series from here" tests before S4 starts.
2. **Vendor decisions block slices late:** map/geocoding (S4), Apple and Google accounts and domain (S5, S9), push and email (S7, S8), error tracking (S1, S5). Each is an owner spending or policy call; if any is late the slice stalls or ships with a fake adapter that then needs re-proving.
3. **Moderation and privacy posture depend on choices still open** (quarantine, immediate alerts, saved counts, email digest, shared admin login). The specs now default to the safest option, but a "yes" to several at once adds scope to S7/S8 that is not sized, and the shared admin login leaves the audit log unable to attribute actions to a person.
