# S16 Fire Map (working title "Holy Spirit Fires Blazing")

**Status: APPROVED by the owner on 2026-10-11 (the idea: "a world and United States map covered in darkness with silver outlines that turn gold where revival fires burn, with a tracker"; the button name "Fire Map"; "I'm already approving it, you don't need to ask"). Web first; mobile later.**

## Purpose

Show, honestly and beautifully, where revival is happening right now: a dark world map and a dark United States map where every upcoming or ongoing event is a small fire whose light lifts the darkness and turns the silver outlines gold, with real numbers and a way to open each event.

## Scope (in)

* A public page `/fire-map` with a **World** view and a **United States** view (switch with tabs), readable without an account.
* Every **published**, **not cancelled**, **not past** event that has a place (latitude and longitude) is a **fire**. A past event is one whose end (or, with no end, whose start plus 3 hours, the default event length) is before now.
* Each fire is a link to that event's page (`/events/{id}`); its light has a true radius of **10 miles** with a minimum visible size so it can be seen when zoomed out.
* Outlines (countries for the world, states for the United States) are silver. Around each fire the land glows gold and the outline turns gold, and the light fades smoothly into the dark; the glow is drawn large enough to see, and a thin ring inside it shows the true 10 mile reach that the numbers count. On the United States map each fire carries its city name (skipping a name that would overlap another).
* A **tracker** with two honest numbers per view: **land under fire** (the share of the land area that lies within 10 miles of at least one fire) and **regions with a fire** (countries for the world, states plus the District of Columbia for the United States, as "N of M"), plus the **count of fires**.
* A **How we count** note on the page that explains the method, the "as of" time and the accuracy of the simplified outlines.
* A text alternative: a list of regions that have fires with links to their events, usable by keyboard and screen reader.
* A **Fire Map** link in the main navigation and the footer.
* Server-computed numbers and fires from one public API endpoint (`GET /api/v1/fire-map`), a shared contract and typed client; no database change.
* Outlines come from Natural Earth (public domain), simplified, stored in the repository.

## Out of scope

Importing events or locations from other organizations (Healing Rooms, houses of prayer or public event feeds: each needs the owner's permission and a separate decision), a phone version, a history or time-lapse view, user accounts' location, online-only events (no place), counties or towns, sample (demo) events in production, custom per-fire colors, clustering of very many fires (a later slice if the count grows).

## Acceptance criteria

* **AC1** `GET /api/v1/fire-map` is public (no sign-in) and returns only events that are published, not cancelled, not past and have both latitude and longitude; draft, cancelled, deleted, past and no-place events never appear.
* **AC2** The response has, for the world and for the United States, the number of fires, the regions with a fire as "with" and "total", and the land under fire as a percentage with up to four decimals; totals are 177 or more countries for the world and 51 for the United States (50 states plus DC) from the bundled outlines.
* **AC3** One fire alone covers about 314 square miles of light: for a single fire on land the land-under-fire percentage equals that area divided by the land area, within 5 percent of the true circle area, and two fires that overlap are not counted twice.
* **AC4** A fire on the ocean (not inside any country) counts as a fire and adds no land area and no region.
* **AC5** Regions with a fire are found by the event's coordinates inside the outlines; an event in a state counts toward the United States numbers and toward its country in the world numbers.
* **AC6** The page shows a World and a United States view; each shows a dark map, silver outlines, one fire icon per fire and gold outlines only inside the light of a fire.
* **AC7** Each fire is a link whose accessible name includes the event title and opens `/events/{id}`; fires are reachable and activatable by keyboard.
* **AC8** The tracker shows the three numbers for the selected view, the "as of" time, and a **How we count** note; with no fires it says so plainly ("No fires yet") and shows zeros, never invented numbers.
* **AC9** The text alternative lists every region with a fire and its events as links, and it is present without JavaScript.
* **AC10** With the reduced-motion preference set, nothing on the map animates.
* **AC11** Map colors keep text readable (contrast), and meaning is never carried by color alone: the tracker and list state the facts in words.
* **AC12** The Fire Map link appears in the main navigation and the footer, and the page makes no claim about numbers of users or events beyond the computed figures.
* **AC13** The outline data is public domain (Natural Earth), carries its source and license note in the repository, and no map vendor, tracking script or external request is added.

## Controls inventory

| Control | Test id | Action | Effect |
| --- | --- | --- | --- |
| World / United States tabs | `fire-map-tab-world`, `fire-map-tab-us` | Click | Switches the view |
| The map | `fire-map-world`, `fire-map-us` | View | Dark map, silver and gold outlines |
| A fire | `fire-N` | Click, Enter | Opens the event page |
| Tracker numbers | `fire-map-count-world`, `fire-map-regions-world`, `fire-map-land-world` and the same with `-us` | View | Shows the three numbers |
| How we count | `fire-map-method` | Click | Opens or closes the explanation |
| Text list of regions | `fire-map-list`, `fire-map-region-link` | View, click a link | Opens the event page |
| Footer link (the navigation link is the Fire Map item of the main navigation) | `footer-fire-map` | Click | Opens `/fire-map` |

## Owner decisions still open

The long title ("Holy Spirit Fires Blazing") versus the button name "Fire Map" for the page heading; the plan's separate community feature also called "Fire-Map" (people pinning community needs) needs a different name when it is built (`naming-conventions.md`); whether to add clearly labeled "(Sample)" events for the demo (they would be development data only, never in production numbers); permission and approach for any outside source of events (Healing Rooms, houses of prayer).

## Done checklist

Each acceptance criterion and control above is ticked off with its test in the pull request that finishes the slice.
