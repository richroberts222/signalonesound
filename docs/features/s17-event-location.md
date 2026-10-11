# S17 Event location picker

**Status: APPROVED to build (the owner, 2026-10-11: "keep developing"; the idea: organizers place their gathering by searching or tapping a real map, never by typing latitude and longitude; MapTiler's free plan to start). Built in steps: (1) data and server rules (pin, country, region, checks), then (2) the picker on the form. Web first.**

## Why this slice exists

The Fire Map and the radius search place an event by its coordinates. Today the church portal locates a **United States** address by the center of its ZIP area (or city), from Census data shipped with the app (`lib/places/geocoder.ts`). That is approximate (within a few miles of the true spot, not the street) and it knows only the United States: an event anywhere else, or one whose ZIP is not found, is saved without coordinates ("Location not found yet") and never appears on the Fire Map. This slice adds an **exact pin** the organizer places on a real map, and makes places anywhere in the world, including small towns and villages, work. (This paragraph corrects an earlier version that said no lookup existed; it does, for the United States only. The ZIP lookup is now used only for United States addresses, so a postal code abroad can never place an event in the wrong country.)

**A fire never depends on our own map knowing the place.** The flame goes where the event's coordinates say, and its label is the name the organizer typed.

## Scope (in)

* On the church portal event form, a **location picker**: a real street map the organizer can search, zoom, tap and drag a pin on. The coordinates are worked out from the pin; the organizer never sees or types them unless they choose to.
* Four ways to set the spot: **search by name** (a Search button, not search-as-you-type), **tap or drag the pin** on the map, **Use my location** (the device's own location, asked only when tapped), and an optional **paste coordinates** box (a "latitude, longitude" pair as copied from a phone map app) that also serves as the fallback when the map cannot load.
* A **country** on the event, default United States. Outside the United States the state and ZIP are optional and the region is free text, so a village overseas can be entered. The Fire Map label becomes "Place, Country" for events outside the United States.
* The location **never blocks saving or publishing**. An event with no pin saves, and the form and the manager's event list say plainly: "This gathering will not appear on the Fire Map or in nearby searches until it has a location."
* Editing an existing event shows its pin; an event saved without coordinates can be fixed by setting the pin.
* The map and the search come from **MapTiler** (free plan to start, behind a setting so another service can replace it). The key is a browser key restricted to our website addresses; it is set in Vercel by the owner and is never committed.
* **Only the signed-in organizer form loads the map service.** The public pages, including the Fire Map, never contact it.

## Out of scope

Filling the street address from the pin or the pin from the street address automatically (a later nicety; the organizer still types the address); showing this street map on public pages; a phone (Expo) organizer form; importing events; routes and directions; offline maps; any paid plan (see Owner decisions).

## Acceptance criteria

* **AC1** The event form offers a map picker; choosing a search result, tapping the map, dragging the pin, using the device location or pasting coordinates each sets the event's pin, and the form shows the chosen spot in words (the place name or "Pin set") and on the map.
* **AC2** Saving stores the latitude and longitude with the event; a published event with a pin appears on the Fire Map and in nearby searches.
* **AC3** An event with no pin saves and publishes without error; the form and the manager's event list show the "will not appear on the Fire Map" notice for it, and it does not appear on the Fire Map.
* **AC4** The server checks coordinates: latitude from -90 to 90 and longitude from -180 to 180 as numbers; text, empty halves and out-of-range values are refused with a plain message, whether they arrive from the picker, the paste box or the API.
* **AC5** The event has a country (default United States). For a country other than the United States the state and ZIP are optional; the Fire Map and event list show "City, Country" for it; United States events keep "City, ST".
* **AC6** If the map service cannot load (no key, blocked, offline, over its limit), the rest of the form still works, a plain message says the map is unavailable, and the paste box and a save without a pin still work. Nothing fails silently.
* **AC7** The public pages (home, events, an event, the Fire Map) make no request to the map service; a test fails if their output names its hosts.
* **AC8** The map key is not in any committed file; the setting is documented with a placeholder (`docs/environment.md`) and the key is restricted to our website addresses (an owner step).
* **AC9** The device location is requested only when the person taps **Use my location**; if they decline or it is unavailable, a plain message appears and the other ways still work.
* **AC10** The map is usable by keyboard and screen reader: the search, the buttons and the paste box are labelled controls, the pin can be moved with the arrow keys, and the chosen spot is stated in text.
* **AC11** The map service's credit line is visible on the map, and the privacy page says that the organizer form uses a map service and what it receives (the searched place and the map area being viewed; no personal data is sent by us).

## Controls inventory

| Control | Test id | Action | Effect |
| --- | --- | --- | --- |
| Place search box and Search button | `location-search`, `location-search-submit` | Type, click | Looks up the name and moves the map and pin to the first result, with a list of other results |
| Search result | `location-result-N` | Click | Sets the pin to that result |
| The map and pin | `location-map` | Tap, drag, arrow keys | Sets or moves the pin |
| Use my location | `location-use-mine` | Click | Asks the device for its location and sets the pin |
| Paste coordinates box | `location-coordinates` | Type, paste | Sets the pin when the pair is valid; otherwise shows a plain error |
| Clear pin | `location-clear` | Click | Removes the pin (the event then carries the "no location" notice) |
| Country | `event-country` | Choose | Sets the country and relaxes the state and ZIP outside the United States |
| "No location" notice | `location-missing-notice` | View | States the consequence |
| Pin status line | `location-status` | View | States the pin ("Pin set at 36.16270, -86.78160, near ...") or "No pin yet", and the last message |
| "Map could not load" message | `location-map-problem` | View | Shown only when the map pictures fail to load |
| Region (outside the United States) | `event-region-input` | Type | The state, province or region as free text |
| Event list badge | (badge text) | View | "No map pin: not on the Fire Map yet" beside an event with no pin |

## Data and security

* **Database Design Checkpoint required before building:** the event needs a `country` (a two-letter code, default US) and a looser state field for places outside the United States; latitude and longitude already exist. This is a migration, applied only through the documented process (`/docs/database.md`) and only with the owner's approval; production only through the manual Migrate production workflow.
* The geocoder port in the events service gets a real adapter, or the form sends the pin directly; the server remains authoritative and re-validates every coordinate (AC4).
* The browser key is public by nature, so it is restricted by website address at the vendor, never relied on as a secret, and never committed (`CLAUDE.md` section 18).
* Library: **Leaflet** (open source, BSD-2, about 40 KB) draws the map: the picker needs flat map pictures and one draggable pin, not vector styling, so it was chosen over MapLibre GL for size and simplicity (recorded in `docs/stack.md`). It is loaded only on the organizer form.
* Until the owner supplies a MapTiler key, the map pictures and place search default to OpenStreetMap's free servers (credit line shown, searched only when Search is pressed, never as you type). Settings: `docs/environment.md`.
* The event's `state` column holds a US state, or outside the United States the free-text `region`; the API takes `country`, `state` (US states or empty), `region` and `zip` (see `docs/api.md`).

## Owner decisions and steps

1. **Approve this spec.**
2. **MapTiler free plan to start.** The owner creates the account and the restricted browser key and adds it to Vercel (a to-do task is added when the build is ready). Free is for personal and non-commercial use; development of a commercial product is allowed.
3. **A dependable plan before launch** (COSTS MONEY, in `docs/to-do.md`): MapTiler's commercial plan was $25 a month when checked on 2026-10-11 (25,000 map loads a month), or another service. The free plan's search service needs the vendor's agreement for commercial use. Decide before real users arrive; the setting makes switching a configuration change.
4. **Database approval** for the country migration, when the build reaches it.

## Done checklist

Each acceptance criterion and control above is ticked off with its test (or listed as not automated with the reason) in the pull request that finishes the slice.
