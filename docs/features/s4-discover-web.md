# S4 Discover (Web)

**Status: DRAFT, not approved.** Source: blueprint slice S4; product plan minimum features (interactive location map, search by distance, by date, by revival type, share links) and later Phase 1 (search by city, state or ZIP). Depends on: S3. Owner decisions recorded: attendee privacy posture (anonymous browsing, minimal saves, coarse location).

## Purpose

Let anyone, signed in or not, find revival events near them on a map and list, filter them, open details, and share them.

## Scope (in)

* Public Discover page: map and list, with search by place (city, state or ZIP) or "use my location" (browser permission asked only on click).
* Radius filter: 10, 25, 50, 100 miles and unlimited (the source's "X" value is UNDECIDED; 100 is a placeholder).
* Date filter: today, this weekend, next 7 days, next 30 days, or a date range.
* Revival type filter: the twelve types, multi-select.
* Public event details page with stable URL, Church/Ministry link, address, directions link (opens the device's map app), add-to-calendar file, and share/preview metadata.
* Public Church/Ministry profile page listing upcoming events.
* Search and geocoding adapters behind ports; map tile provider chosen under the free tier.
* Sitemap and indexable event pages (SEO), no personal data.

## Out of scope

Saved events and invites (S6), alerts (S7), comments, reviews, flyers, ticketing, the mobile app (S5).

## Acceptance criteria

* **AC1** A visitor with no account can search and open events without any record about them being created (verified: no cookie identifying the visitor, no stored search).
* **AC2** Results are only published, upcoming events, sorted by distance (when a place is given) or by start time.
* **AC3** Radius filtering is correct at the edges (test fixtures at 9.9, 10.0 and 10.1 miles).
* **AC4** Date filters use the event's own local time and are correct across a time-zone boundary.
* **AC5** Multiple revival types combine as "any of the selected"; an event with several types appears once.
* **AC6** City, state or ZIP is geocoded; an unknown place shows a helpful empty state; "use my location" works only after the person clicks and a denial falls back to typing a place.
* **AC7** Browser coordinates are rounded (about 1 km) before being sent; the server never stores a searcher's location.
* **AC8** The event page works without JavaScript for crawlers (server-rendered), has preview metadata, and the share button uses the native share sheet or copies the link.
* **AC9** Cancelled events are shown as cancelled; past events are not in results.
* **AC10** Cursor pagination returns each event once and never skips one when events change between pages.
* **AC11** The page meets WCAG 2.2 AA on keyboard use, focus, contrast and a screen-reader list alternative to the map.
* **AC12** p95 search response under 500 ms on the seed data set of 5,000 events (measured in CI as a guard with generous bounds).
* **AC13** Private analytics record only counts (search, view), never identifiers.

## Controls inventory

| Control | Test id | Action | Effect |
| --- | --- | --- | --- |
| Place input | `discover-place-input` | Type a place | Geocodes on submit |
| Use my location | `discover-locate-button` | Ask permission | Fills coarse location |
| Radius select | `discover-radius-select` | Choose | Re-queries |
| Date preset select, range inputs | `discover-date-select`, `discover-date-from`, `discover-date-to` | Choose | Re-queries |
| Type chips (12) | `discover-type-<slug>` | Toggle | Re-queries |
| Map / list toggle | `discover-view-toggle` | Switch | View changes |
| Map marker | `discover-marker-N` | Select | Shows summary |
| Result card | `discover-result-N` | Open | Event page |
| Load more | `discover-load-more` | Next page | Appends |
| Event page: share, calendar, directions, church link | `event-share`, `event-calendar`, `event-directions`, `event-church-link` | Act | Native share, `.ics`, map app, profile |

## API

`GET /events` (public: `q` place, `lat`, `lng`, `radius`, `from`, `to`, `types`, cursor), `GET /events/:id`, `GET /organizations/:id`, `GET /events/:id/calendar.ics`, `GET /places/search` (geocoding proxy with caching and rate limit so the vendor key stays server-side).

## Data

Adds coordinates index (spatial extension availability on Neon to be verified first; fallback is a bounding-box prefilter plus great-circle distance), and a `place_cache` (query to coordinates; T0, expires). No new personal data.

## Hostile cases

Bad coordinates and NaN, radius injection, `types` with unknown slugs, huge pages, search-term markup (shown escaped), geocoder failure and timeouts (graceful), abuse of the geocoding proxy (rate limit), crawler load.

## Automation shipped with the slice

Distance, date and type filter unit tests at boundaries; API tests with hostile cases; query-plan check that the spatial index is used; E2E (search, filter, open, share); accessibility scan; seed and performance fixture; visual check on the Preview; mutation proofs (break the radius, see the edge test fail).

## Owner decisions

Map and geocoding vendor (free tier first, you approve any cost); radius value "X"; whether to show an "everything within 100 miles" default; the attendee privacy paragraph wording.

## Done checklist

AC1 to AC13 and controls ticked; Preview reviewed; `pnpm validate` clean; CI green; docs updated.
