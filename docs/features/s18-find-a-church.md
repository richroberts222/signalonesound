# S18 Find a Church

**Status: APPROVED to build (the owner, 2026-10-11: "Amy wrote this, let's do it! Top priority!"). Source: Amy's suggestion that people can find a church and the services it holds regularly, and that when a church joins we collect its regular service times. Web first; the phone later. Builds on S17 (the location picker, countries and pins), so it ships after S17.**

## Purpose

Let anyone find a church near them and see when it meets every week, not only its special events. A church adds its address and its regular service times once; people find it, see when to come, and get directions.

## Scope (in)

* A **church profile** that an approved manager of the church edits: address (country, street optional, city, state or region, ZIP or postal code), a **map pin** (the S17 picker), and the church's time zone.
* **Regular service times**: up to 20 weekly times per church. Each has a day of the week, a start time, a short label (for example "Sunday worship", "Wednesday prayer"), and an optional note (for example "Childcare provided"). Weekly only; special gatherings stay events.
* A public **Find a Church** page (`/churches`): search by place (city, state or ZIP) with a distance, or by church name or city; results show the church, where it is, how far, and its next services; each result opens the church page.
* The public **church page** (`/churches/<id>`) gains the address with a Directions link and a **Regular services** section; its upcoming events stay.
* A **"Complete your church profile"** card for managers whose church has no service times yet (the entry point Amy asked for when a church joins).
* **Find a Church** in the main menu, the footer and the home page.
* The sitemap lists `/churches` and church pages. Only approved, published churches appear anywhere.
* Server-checked, audited changes; a public read API and a manager write API on the same shared client.

## Out of scope

Phone screens (a follow-up), reviews or ratings, photos, pastor or staff names, online-service links as a special kind of service (a note may say "Also online"), non-weekly patterns such as "1st and 3rd Sundays" (a note may say it), claiming a church that is not listed, importing churches from outside lists (each needs permission), denominations as a filter (a later slice).

## Acceptance criteria

* **AC1** An approved manager can save a church's address, pin and time zone, and a list of at most 20 weekly service times; anyone else gets "not found". Each service has a day (0 to 6), a start time (`HH:MM`, 24 hour), a label (1 to 60 plain characters) and an optional note (up to 200 plain characters); bad values are refused with a message on the field, and an identical service listed twice is refused.
* **AC2** Saving the services replaces the whole list in one atomic step and is written to the audit log with the actor and the church; a failed save changes nothing.
* **AC3** The church page shows the regular services ordered Sunday to Saturday by time, as "Sunday, 10:00 AM" in the church's own time zone, with the label and note; with none, it says the church has not added service times yet.
* **AC4** `GET /api/v1/churches` is public. Searching by position and radius lists churches with a pin, nearest first, each with its distance; searching by text matches church name or city (a church without a pin appears here only). Results are keyset-paged.
* **AC5** Each result carries the church's next services (up to 3, from now, in the church's time zone) and its city and state or country; no personal data.
* **AC6** A church that is pending, unpublished or hidden never appears in the list, on its page, in the API or in the sitemap.
* **AC7** Churches outside the United States can be saved and found (country, a free-text region, an optional postal code); distances work the same.
* **AC8** The Find a Church page and the church page are readable without JavaScript, pass the accessibility scan on a desktop and a phone screen, and every result is a keyboard-reachable link.
* **AC9** Find a Church is in the main menu, the footer and the home page, and the sitemap lists `/churches`.
* **AC10** A manager whose church has no service times sees the "Complete your church profile" card with a link to the editor; it disappears once a service is saved.
* **AC11** All church profile and service text is public (data tier T0) and plain text; the editor warns not to enter a private home address (a house church may leave the street blank and show only the city), and the pin may be anywhere the manager chooses.
* **AC12** The profile editor uses the S17 location picker and country list; the server checks the pin and the address exactly as for an event.

## Controls inventory

| Control | Test id | Action | Effect |
| --- | --- | --- | --- |
| Find a Church (menu, footer, home) | `nav-churches`, `footer-churches`, `home-find-church` | Click | Opens `/churches` |
| Place or name search | `churches-search-input`, `churches-search-submit` | Type, submit | Lists matching churches |
| Distance | `churches-radius` | Choose | Limits the search to that distance |
| Result | `church-result-N` | Click | Opens the church page |
| Result's services line | `church-result-services-N` | View | The next services |
| Regular services (church page) | `church-services` | View | Each service with its label and note |
| Directions | `church-directions` | Click | Opens a map with the address |
| Complete your profile card | `church-profile-card` | Click | Opens the editor |
| Profile editor | `church-profile-form` | Edit | Address, pin, time zone |
| Add a service | `church-service-add` | Click | A new row |
| Service row | `church-service-day-N`, `church-service-time-N`, `church-service-label-N`, `church-service-note-N`, `church-service-remove-N` | Edit, click | Sets or removes the service |
| Save | `church-profile-save` | Click | Saves the profile and the services |

## API

`GET /api/v1/churches?q=&lat=&lng=&radius=&cursor=&limit=` (public); `GET /api/v1/churches/:id` (public: the church with its profile and services); `PUT /api/v1/organizations/:id/profile` and `PUT /api/v1/organizations/:id/services` (approved managers). Contracts in `packages/validation/src/church.ts`, additive.

## Data

Two new tables, so existing tables and their code are untouched: `church_profile(org_id, street, city, state, zip, country, lat, lng, time_zone, updated_at)` and `church_service(id, org_id, weekday, start_time, label, note, position)`. Both T0 (public church information), in `docs/data-inventory.md` with retention (until the church is removed) and deletion (with the organization). Production gets them through the manual Migrate production workflow; because the church page will read them, the pull request is merged only when the owner is ready to run it (`docs/database.md`).

## Hostile cases

A non-manager or revoked manager saving; a service with day 9 or time 25:99; a 10,000-character note; control characters and markup in labels; 21 services; a pin out of range; a church hidden by moderation still appearing; searching with a huge radius or limit; an unapproved church read by id.

## Owner decisions

Weekly service times only for now (recommended); whether a house church may leave the street blank (recommended yes); the order of work with S17 (this ships after it); whether the Find a Church link replaces or sits beside Discover in the main menu (beside it).

## Done checklist

Each acceptance criterion and control above is ticked off with its test (or listed as not automated with the reason) in the pull request that finishes the slice.
