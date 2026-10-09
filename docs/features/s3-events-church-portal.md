# S3 Events (Church/Ministry Portal)

**Status: APPROVED by the owner on 2026-10-09 (reviewed once by an independent reviewer). Built as its own issue; items under Owner decisions still need the owner.** Source: blueprint slice S3; product plan "Signal One Sound Church Portal - Startup" and "Expanded"; `/docs/database.md`. Depends on: S2. Flyer uploads and livestream links are UNDECIDED in the source ("??") and are **out** of this slice.

## Purpose

Let an approved manager publish and maintain revival events: create, edit, remove, replace, and manage recurring events, with the data quality that makes search (S4) trustworthy.

## Scope (in)

* Event fields: title, description (plain text), Church/Ministry (from the manager's organizations), **dates and times** (start, optional end, the event's IANA time zone), **venue name, street, city, state, ZIP**, **revival types** (one or more of the twelve in the source), speakers as plain text (profile tagging is later), directions note, up to 3 event links. Speakers and directions are "Expanded" portal items in the source pulled forward because they are plain text fields; they are optional and may be dropped from this slice without affecting any acceptance criterion but AC7. [Fable]
* Recurring events as a **series** (weekly, monthly by weekday, or a list of dates) with exceptions; one edit scope choice: this event or the series. Occurrences are materialized as `event` rows (at most 104 per series) so search, saves and alerts work on plain events; an occurrence's local wall-clock time is kept constant across daylight-saving changes; "monthly by weekday" skips months without that occurrence (no 5th Friday); the "Replace" operation in the source is "edit" (any field may change) and needs no separate control. [Fable]
* Draft, published, cancelled, and past (automatic) states; unlimited events per organization. Delete is a soft delete (status `deleted`, hidden everywhere, kept for the audit trail and so S6 saved rows resolve to a "removed" message); the editor shows a one-line rule: do not include personal information about minors or private individuals in any text field. [Fable]
* Geocoding of the address to coordinates through a port (adapter chosen in S4; a fake in tests); a manual "address not found" path that never blocks publishing: an event without coordinates is flagged to the manager, appears in date and type searches, and is absent from radius searches until geocoded. [Fable]
* Duplicate check (same organization, overlapping time, same venue) with a warning and override.
* Event list, new event, and edit pages in the manager dashboard, re-wired from the existing mock screens (per Q-005).

## Out of scope

Public search and map (S4), flyers, livestream links, comments, payments or ticketing, bulk import (proposed later), speaker profiles.

## Acceptance criteria

* **AC1** Only an approved manager of the organization can create, edit, publish, cancel or delete its events.
* **AC2** Required: title, organization, start, time zone, venue name, street, city, state, ZIP, at least one revival type; each missing field gives a specific message.
* **AC3** Times are stored as UTC with the IANA zone; the displayed local time is correct across a daylight-saving change (test with dates either side).
* **AC4** End must be after start; start may not be more than 2 years ahead; editing a past event is blocked (it can still be deleted). The time-zone select defaults to the organization's last used zone and is shown with the local-time preview. Phase 1 addresses are US only (state code and ZIP). [Fable]
* **AC5** A recurring series produces correct occurrences (weekly, monthly by weekday, date list); editing "this event" creates an exception and leaves the series; editing "series" changes future occurrences only.
* **AC6** State must be a valid US state code, ZIP a valid 5 or 9 digit format; links are http or https only, 1 to 3 per event.
* **AC7** Title 3 to 120 characters, description up to 4000, plain text only; markup shown as text.
* **AC8** A duplicate warning appears for same-organization overlap at the same venue and can be overridden with a recorded reason.
* **AC9** Past events leave the public listing automatically and appear in the manager's history; cancelled events remain visible as cancelled until their date passes.
* **AC10** Every create, edit, cancel and delete writes an audit entry.
* **AC11** A manager who is revoked can no longer change any event on their next request.
* **AC12** Data inventory rows exist for new tables.
* **AC13** `GET /events/:id` as the manager returns the event in any state; concurrent edits are detected by `version` in `PATCH` (stale version returns `409`); create requires an `Idempotency-Key` header, and a repeated key within 24 hours returns the first result instead of a second event. [Fable]

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

`POST /organizations/:id/events` (`Idempotency-Key` header required), `GET /organizations/:id/events` (manager, cursor pagination), `GET /events/:id` (manager, any state; the public read is S4) [Fable], `PATCH /events/:id` (with `scope` and `version`), `POST /events/:id/publish`, `POST /events/:id/cancel`, `DELETE /events/:id` (manager). Public reads arrive in S4. Idempotency key on create to prevent double submission.

## Data

`event(id, org_id, title, description, status, moderation_state default published, series_id null, starts_at_utc, ends_at_utc null, time_zone, venue_name, street, city, state, zip, lat null, lng null, speakers null, directions null, version, created_at, updated_at)` T0 [Fable]; `event_revival_type(event_id, type_slug)` T0 with the twelve-type reference list; `event_series(id, org_id, rule, until)` T0; `event_link(event_id, url, position)` T0. Indexes for organization, start time, and later location (S4). Whether Venue is its own entity is UNDECIDED (owner); this slice stores it on the event.

## Hostile cases

Another organization's id, role injection, past or far-future dates, impossible dates (Feb 30), invalid zones, 10,000-character fields, markup and script in text, javascript: links, duplicate-submit races, recurrence rules that generate thousands of rows (capped at 104 occurrences), concurrent edits (last-write detection).

## Automation shipped with the slice

Schema and recurrence unit tests (including DST); API tests for every operation and hostile case; permission matrix additions; E2E (create, publish, edit one occurrence, edit series, cancel); accessibility scan of the editor; seed data with 40 varied events for later slices; mutation proofs.

## Owner decisions

Is Venue its own entity (recommend: not in Phase 1)? Maximum recurrence length (proposed 104 occurrences). Whether managers can publish immediately after approval (proposed yes; S8 may add a quarantine for a new organization's first event if the owner chooses, using `moderation_state`; nothing is public before S9 anyway). [Fable] Flyers and livestream links remain UNDECIDED.

## Done checklist

AC1 to AC13 and controls ticked [Fable]; `pnpm validate` clean; CI green; Preview reviewed by the owner; docs updated.

## Build notes (decisions made while building)

* **Organization is chosen by the page address**, not a dropdown (`/manage/<organization>/events`); a person reaches it from "Manage events" on their organizations page. The `event-org-select` control in the draft inventory is therefore not built.
* **Time zones** offered are the seven United States zones (Eastern, Central, Mountain, Arizona, Pacific, Alaska, Hawaii). The default is the device's zone when it is one of them, otherwise Central.
* **Series edits ("this and the later events")** change the title, description, address, types, links and the time of day of the later occurrences that follow the series; each keeps its own date. An occurrence edited on its own ("this event only") becomes an exception and is skipped by later series edits. Cancel and delete act on the one event.
* **Duplicate check** looks at the first occurrence of a new series only.
* **Geocoding** is a port with no adapter yet (search, S4, adds it): events are saved without coordinates and flagged "Location not found yet" until then.
* **Atomic edits on the real database.** The driver has no interactive transactions, so each edit writes a random token and every dependent statement runs only if the token matches; an edit that lost the version race changes nothing. Proven against the dev database (`apps/web/db/events.integration.test.ts`).
* **Not built here:** flyers and livestream links (undecided in the source), the browser end-to-end test for the manager screens (needs the Clerk test users), and the mock dashboard re-wiring (Q-005).
