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

## Addition S16b: zoom and pan (requested by the owner on 2026-10-11 ("great idea!!!"); spec written, build awaits the owner's go)

**Why.** At the whole-map view one fire's glow has to be drawn large to be seen, so one fire seems to cover a state. Zooming in shows the true size.

**In scope.**

* Zoom and pan on both maps: pinch and two-finger drag on a phone, Ctrl or Command with the scroll wheel (or a trackpad pinch) and drag on a computer (the plain scroll wheel keeps scrolling the page), and **Zoom in**, **Zoom out** and **Reset** buttons for people who cannot pinch or drag. The keyboard can use the buttons and the arrow keys when the map has focus.
* As the map zooms in, each fire's glow shrinks toward its true 10 mile size (it is never smaller than the true size); the thin true ring and the flame icon stay a readable size. At the most zoomed-out view nothing changes from today.
* Zoom is limited to a sensible range (about 1 times to 12 times) and the map cannot be dragged off the page.
* Flames stay links to their events while zoomed. City names on the United States map show more of the cities with fires as there is room.
* Zoom is a progressive extra: without JavaScript the map looks and works as it does today. No new map vendor, no external request, no tracking. No change to the API, the numbers or the database.

**Out of scope for S16b (a possible S16c, to be decided after the owner sees S16b).** Finer outline detail that loads only when zoomed in; county or town lines; showing every fire's name on the map.

**Acceptance criteria.**

* **AC14** The map has Zoom in, Zoom out and Reset buttons; each changes the view as named, Zoom out and Reset never go past the whole-map view, and Zoom in stops at the maximum.
* **AC15** Zooming in on a fire makes its glow smaller on screen than at the whole-map view and never smaller than its true 10 mile ring; at the whole-map view the glow size is unchanged from before.
* **AC16** Dragging cannot move the map completely off the page, and Reset returns to the whole-map view.
* **AC17** Fires remain links with the same accessible names and keyboard behavior while zoomed; the tracker numbers and the text list do not change with zoom.
* **AC18** Without JavaScript the maps render exactly as before and every existing test still passes; with reduced motion set, zooming does not animate.
* **AC19** The zoom math (the visible window, the clamps and the glow size at a zoom level) is a pure function with unit tests, including a test that fails if the glow could shrink below the true ring.

**Controls added.**

| Control | Test id | Action | Effect |
| --- | --- | --- | --- |
| Zoom in | `fire-map-zoom-in` | Click | Zooms in one step |
| Zoom out | `fire-map-zoom-out` | Click | Zooms out one step |
| Reset | `fire-map-zoom-reset` | Click | Returns to the whole map |
| The map | `fire-map-world`, `fire-map-us` | Pinch, scroll, drag, arrow keys | Zooms and pans |

## Sample fires

Opening `/fire-map?sample=1` shows 18 invented, clearly labeled sample fires so the map can be seen before real gatherings exist. Nothing is stored; the ordinary page is unchanged. (This is not the "(Sample) events in production" listed out of scope above, which would put fake events in the database.)

## Owner decisions still open

The long title ("Holy Spirit Fires Blazing") versus the button name "Fire Map" for the page heading; the plan's separate community feature also called "Fire-Map" (people pinning community needs) needs a different name when it is built (`naming-conventions.md`); whether to add clearly labeled "(Sample)" events for the demo (they would be development data only, never in production numbers); permission and approach for any outside source of events (Healing Rooms, houses of prayer).

## Done checklist

Each acceptance criterion and control above is ticked off with its test in the pull request that finishes the slice.
