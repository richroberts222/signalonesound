# S3 Events (Church/Ministry Portal)

**Status: DRAFT, not approved.** Source: blueprint slice S3; product plan "Signal One Sound Church Portal - Startup" and "Expanded"; `/docs/database.md`. Depends on: S2. Flyer uploads and livestream links are UNDECIDED in the source ("??") and are **out** of this slice.

## Purpose

Let an approved manager publish and maintain revival events: create, edit, remove, replace, and manage recurring events, with the data quality that makes search (S4) trustworthy.

## Scope (in)

* Event fields: title, description (plain text), Church/Ministry (from the manager's organizations), **dates and times** (start, optional end, the event's IANA time zone), **venue name, street, city, state, ZIP**, **revival types** (one or more of the twelve in the source), speakers as plain text (profile tagging is later), directions note, up to 3 event links.
* Recurring events as a **series** (weekly, monthly by weekday, or a list of dates) with exceptions; one edit scope choice: this event or the series.
* Draft, published, cancelled, and past (automatic) states; unlimited events per organization.
* Geocoding of the address to coordinates through a port (adapter chosen in S4; a fake in tests); a manual "address not found" path that never blocks publishing.
* Duplicate check (same organization, overlapping time, same venue) with a warning and override.
* Event list, new event, and edit pages in the manager dashboard, re-wired from the existing mock screens (per Q-005).

## Out of scope

Public search and map (S4), flyers, livestream links, comments, payments or ticketing, bulk import (proposed later), speaker profiles.

## Acceptance criteria

* **AC1** Only an approved manager of the organization can create, edit, publish, cancel or delete its events.
* **AC2** Required: title, organization, start, time zone, venue name, street, city, state, ZIP, at least one revival type; each missing field gives a specific message.
* **AC3** Times are stored as UTC with the IANA zone; the displayed local time is correct across a daylight-saving change (test with dates either side).
* **AC4** End must be after start; start may not be more than 2 years ahead; editing a past event is blocked.
* **AC5** A recurring series produces correct occurrences (weekly, monthly by weekday, date list); editing "this event" creates an exception and leaves the series; editing "series" changes future occurrences only.
* **AC6** State must be a valid US state code, ZIP a valid 5 or 9 digit format; links are http or https only, 1 to 3 per event.
* **AC7** Title 3 to 120 characters, description up to 4000, plain text only; markup shown as text.
* **AC8** A duplicate warning appears for same-organization overlap at the same venue and can be overridden with a recorded reason.
* **AC9** Past events leave the public listing automatically and appear in the manager's history; cancelled events remain visible as cancelled until their date passes.
* **AC10** Every create, edit, cancel and delete writes an audit entry.
* **AC11** A manager who is revoked can no longer change any event on their next request.
* **AC12** Data inventory rows exist for new tables.

## Controls inventory

| Screen | Control | Test id | Action | Effect |
| --- | --- | --- | --- | --- |
| Events list | New event | `events-new-button` | Navigate | Opens editor |
| Events list | Filter (upcoming, past, drafts) | `events-filter` | Filter | List updates |
| Events list | Row actions: edit, cancel, delete | `event-edit-N`, `event-cancel-N`, `event-delete-N` | Act | Confirmations; audit entry |
| Editor | Title, description | `event-title-input`, `event-description-input` | Enter | Counters, validation |
| Editor | Organization select | `event-org-select` | Choose | Scopes ownership |
| Editor | Start, end, time zone | `event-start-input`, `event-end-input`, `event-timezone-select` | Enter | Validation and local preview |
| Editor | Venue, street, city, state, ZIP | `event-venue-input`, `event-street-input`, `event-city-input`, `event-state-select`, `event-zip-input` | Enter | Validation |
| Editor | Revival type chips (12) | `event-type-<slug>` | Toggle | At least one required |
| Editor | Recurrence select and options | `event-recurrence-select` | Choose | Preview of next dates |
| Editor | Links (add, remove) | `event-add-link`, `event-link-input-N` | Edit | Max 3 |
| Editor | Save draft, Publish | `event-save-draft`, `event-publish` | Save | State changes |
| Dialog | Edit scope (this or series) | `event-scope-this`, `event-scope-series` | Choose | Correct rows change |

## API

`POST /organizations/:id/events`, `GET /organizations/:id/events` (manager, cursor pagination), `PATCH /events/:id` (with `scope`), `POST /events/:id/publish`, `POST /events/:id/cancel`, `DELETE /events/:id` (manager). Public reads arrive in S4. Idempotency key on create to prevent double submission.

## Data

`event(id, org_id, title, description, status, series_id null, starts_at_utc, ends_at_utc null, time_zone, venue_name, street, city, state, zip, lat null, lng null, created_at)` T0; `event_revival_type(event_id, type_slug)` T0 with the twelve-type reference list; `event_series(id, org_id, rule, until)` T0; `event_link(event_id, url, position)` T0. Indexes for organization, start time, and later location (S4). Whether Venue is its own entity is UNDECIDED (owner); this slice stores it on the event.

## Hostile cases

Another organization's id, role injection, past or far-future dates, impossible dates (Feb 30), invalid zones, 10,000-character fields, markup and script in text, javascript: links, duplicate-submit races, recurrence rules that generate thousands of rows (capped at 104 occurrences), concurrent edits (last-write detection).

## Automation shipped with the slice

Schema and recurrence unit tests (including DST); API tests for every operation and hostile case; permission matrix additions; E2E (create, publish, edit one occurrence, edit series, cancel); accessibility scan of the editor; seed data with 40 varied events for later slices; mutation proofs.

## Owner decisions

Is Venue its own entity (recommend: not in Phase 1)? Maximum recurrence length (proposed 104 occurrences). Whether managers can publish immediately after approval (proposed yes, with report-and-takedown from S8). Flyers and livestream links remain UNDECIDED.

## Done checklist

AC1 to AC12 and controls ticked; `pnpm validate` clean; CI green; Preview reviewed by the owner; docs updated.
