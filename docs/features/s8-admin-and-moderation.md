# S8 Admin and Moderation

**Status: DRAFT, not approved.** Source: blueprint slice S8; `/docs/risk-and-legal.md` (report-and-takedown), `/docs/permissions.md`. Depends on: S2, S3. Owner decision recorded: organizer verification before publishing.

## Purpose

Give the platform admins the tools to keep listings trustworthy and lawful: review reports, take content down, suspend abusive accounts, and see what changed.

## Scope (in)

* Report content: any visitor (rate limited) or member can report an event or Church/Ministry profile with a reason; a visible "Report" control on event and profile pages.
* Admin dashboard (re-wired from the existing mock screens per Q-005): overview counts, report queue, organizations, events, users (limited view), audit log.
* Actions: hide an event, restore it, unpublish an organization, suspend a manager, reject or revoke a claim, with a reason stored.
* Notification to the affected manager by email with the reason and the appeal address (email port from S7).
* Quarantine rules: events from a new organization's first post and any event with more than 1 link to a new domain are held for admin review before they become public (proposed; the owner decides).
* Audit views: filter by actor, subject, date; export for a legal request.

## Out of scope

Comment or review moderation (those features are held), automatic content classification, user-to-user messaging, a moderator role separate from admin.

## Acceptance criteria

* **AC1** Anyone can submit a report without signing in; reports are rate limited by network address and stored without personal data.
* **AC2** Only admins can see the queue and act; every action writes an audit entry with actor, time and reason.
* **AC3** A hidden event disappears from search, event pages (replaced by a "removed" page), the sitemap and cached listings within one minute.
* **AC4** A suspended manager cannot change events; their existing published events follow the admin's choice (stay or hide) recorded in the action.
* **AC5** The affected manager receives an email stating what happened and how to appeal; the email contains no other person's data.
* **AC6** Quarantined events are invisible to the public and visible to their manager as "pending review"; approving publishes with a single click.
* **AC7** Admin pages are unreachable by non-admins by direct URL and by API (permission matrix test) and return `404` to non-admins.
* **AC8** The audit log can be filtered and exported, and cannot be edited.
* **AC9** Admin actions are protected from CSRF and double-submit.
* **AC10** The admin allow-list is checked on the server per request, not only at sign-in.

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

The quarantine policy (proposed above); appeal address and response time promise; whether the second admin (business partner) receives their own login or the shared login continues (accepted risk recorded, revisit at first real user).

## Done checklist

AC1 to AC10 and controls ticked; `pnpm validate` clean; CI green; docs updated; takedown procedure added to `/docs/risk-and-legal.md`.
