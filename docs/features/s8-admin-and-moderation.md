# S8 Admin and Moderation

**Status: APPROVED by the owner on 2026-10-09 (reviewed once by an independent reviewer). Built as its own issue; items under Owner decisions still need the owner.** Source: blueprint slice S8; `/docs/risk-and-legal.md` (report-and-takedown), `/docs/permissions.md`. Depends on: S2, S3. Owner decision recorded: organizer verification before publishing.

## Purpose

Give the platform admins the tools to keep listings trustworthy and lawful: review reports, take content down, suspend abusive accounts, and see what changed.

## Scope (in)

* Report content: any visitor (rate limited) or member can report an event or Church/Ministry profile with a reason from a fixed list (not a real event or scam; wrong or misleading church; personal information about a minor or private person; harassment or hateful content; copyright or other legal; other) plus optional details; a visible "Report" control on event and profile pages. [Fable]
* Admin dashboard (re-wired from the existing mock screens per Q-005): overview counts, report queue, organizations, events, users (limited view), audit log.
* Actions: hide an event, restore it, unpublish an organization, suspend a manager, reject or revoke a claim, with a reason stored.
* Notification to the affected manager by email with the reason and the appeal address (email port shared with S7; whichever slice lands first introduces it with a logging adapter, so S8 does not depend on S7). [Fable]
* Quarantine rules: events from a new organization's first post and any event with more than 1 link to a new domain are held for admin review before they become public (proposed; the owner decides; if declined, AC6 is marked not applicable and S3's immediate publishing stands). [Fable]
* Audit views: filter by actor, subject, date; export for a legal request.

## Out of scope

Comment or review moderation (those features are held), automatic content classification, user-to-user messaging, a moderator role separate from admin.

## Acceptance criteria

* **AC1** Anyone can submit a report without signing in; reports are rate limited by a hashed network address kept no longer than 24 hours; no reporter identity is stored (signed-in or not); the form tells the reporter not to include personal data; details are limited to 1000 characters of plain text. [Fable]
* **AC2** Only admins can see the queue and act; every action writes an audit entry with actor, time and reason.
* **AC3** A hidden event disappears from search, event pages (replaced by a "removed" page), the sitemap and cached listings within one minute.
* **AC4** A suspended manager cannot change events or submit claims (`user_profile.suspended`, checked by `can()` on every request); they can still browse, export and delete their account; their existing published events follow the admin's choice (stay or hide) recorded in the action. [Fable]
* **AC5** The affected manager receives an email stating what happened and how to appeal; the email contains no other person's data.
* **AC6** Quarantined events are invisible to the public and visible to their manager as "pending review"; approving publishes with a single click.
* **AC7** Admin pages are unreachable by non-admins by direct URL and by API (permission matrix test) and return `404` to non-admins.
* **AC8** The audit log can be filtered and exported, and cannot be edited.
* **AC9** Admin actions are protected from CSRF and double-submit.
* **AC10** The admin allow-list is checked on the server per request, not only at sign-in.
* **AC11** Every admin write requires a non-empty reason (`400` otherwise) and a decision on an already-decided report or a repeated hide/restore returns `409`; the audit export is admin-only and contains person-to-church links, so it is logged as an audit action itself. [Fable]

## Controls inventory

| Control | Test id | Action | Effect |
| --- | --- | --- | --- |
| Report button (event, profile) | `report-button` | Open dialog | Dialog shown |
| Report reason select, details, submit | `report-reason-select`, `report-details-input`, `report-submit` | `POST /reports` | Confirmation |
| Admin overview cards | `admin-card-<name>` | Navigate | Filtered lists |
| Report row actions: dismiss, hide, escalate | `report-dismiss-N`, `report-hide-N`, `report-escalate-N` | Act | State and audit change |
| Restore event | `admin-restore-N` | Act | Event public again |
| Suspend and reinstate manager | `admin-suspend-N`, `admin-reinstate-N` | Act | Permissions change |
| Reason input (all actions) | `admin-reason-input` | Required | Action blocked if empty |
| Audit filters, export | `audit-filter-actor`, `audit-filter-date`, `audit-export` | Filter, download | List and file |

## API

`POST /reports` (public, rate limited); `GET /admin/reports`, `POST /admin/reports/:id/decision`, `POST /admin/events/:id/hide`, `POST /admin/events/:id/restore`, `POST /admin/organizations/:id/unpublish`, `POST /admin/members/:id/suspend`, `GET /admin/audit`, `GET /admin/audit/export` (admin).

## Data

`report(id, subject_type, subject_id, reason, details, created_at, status)` T1 (details are free text; limited to 1000 characters and scanned for stray personal data guidance); `moderation_action(id, subject, action, reason, actor_id, at)` T1 append-only; `event.moderation_state` and `organization.status` extended; quarantine flag.

## Hostile cases

Report floods, script in report details, reporting nonexistent subjects, admin-endpoint probing by members, replaying decisions, cache serving hidden content, suspended manager with a live session.

## Automation shipped with the slice

Permission matrix extension; API and hostile tests; cache and sitemap invalidation test; email content test (no leakage); E2E (report, hide, restore, suspend); accessibility scan of admin pages; mutation proofs (remove the admin check, see the matrix test fail).

## Owner decisions

The quarantine policy (proposed above); appeal address and response time promise; whether the second admin (business partner) receives their own login or the shared login continues (accepted risk recorded, revisit at first real user; note that with one shared login the audit log cannot tell the two admins apart). [Fable]

## Done checklist

AC1 to AC11 and controls ticked [Fable]; `pnpm validate` clean; CI green; docs updated; takedown procedure added to `/docs/risk-and-legal.md`.
