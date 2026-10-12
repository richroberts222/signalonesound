# S19 Fire (recommend an event)

**Status: APPROVED by the owner on 2026-10-11 ("anything that is not in the spec that you know is common in the industry you are authorized to implement"). Delivers S6 AC9 and the product plan item "Add fire emoji to recommend events" (Later Phase 1, section B, not marked undecided).** Depends on: S3, S4, S6. Web first; the phone app can use the same API later.

## Purpose

Let a signed-in member give an event a fire, a one-tap recommendation, and let everyone see how many fires an event has, so good gatherings stand out. The total is public; who gave a fire is never shown to anyone (the same sensitivity as a saved event).

## Scope (in)

* A member gives or takes back one fire on an event. One fire per member per event.
* The total number of fires is shown on the event page and on event cards (when it is more than zero).
* A member cannot give a fire to an event that is not public (draft, deleted, held, or from a church that is not approved).
* Fires are removed 30 days after the event ended (the daily retention job) and when the member deletes their account; the member's data export includes their fires.

## Out of scope

Sorting or filtering by fires (a later slice), comments, reviews, a fire count for churches, notifications about fires, any list of who fired.

## Acceptance criteria

* **AC1** A signed-in member who has accepted the current terms can give a fire to a public event, and the event's total goes up by one.
* **AC2** Giving a fire twice leaves the total at one for that member; taking back a fire that was not given succeeds quietly (idempotent, like Save).
* **AC3** The total is public: it is part of every public event (`fireCount`), on search results, the event page and the Saved list. No endpoint, count or error reveals who gave a fire; the member's own state (`GET /api/v1/me/fires/{eventId}`) answers only for the caller.
* **AC4** A signed-out visitor sees the total and a "Sign in to fire this" prompt that returns them to the event; nothing is stored for them.
* **AC5** An event that is a draft, deleted, held by moderation or from a church that is not approved cannot be given a fire (`404`).
* **AC6** A member can give at most 100 new fires in any 24 hours (`429` after that), so scripted counts cannot be inflated.
* **AC7** Fires on an event are removed 30 days after it ended by the daily retention job; deleting the account deletes the member's fires; the export includes them (the S1 export and delete tests cover the new table).
* **AC8** The button is keyboard reachable, has a text label, and reports its on/off state to screen readers; the count has a text equivalent ("3 fires").

## Controls

* Fire toggle on the event page: `data-testid="event-fire-toggle"`; its count `event-fire-count`; error `event-fire-error`.
* Fire count on each event card: `event-card-fire-count` (shown only when more than zero).

## API

* `GET /api/v1/me/fires/{eventId}` (signed in): `{ eventId, fired }`.
* `PUT /api/v1/me/fires/{eventId}` (signed in): gives a fire; returns `{ eventId, fired: true }`.
* `DELETE /api/v1/me/fires/{eventId}` (signed in): takes it back; returns `{ eventId, fired: false }`.
* `fireCount` (a whole number, 0 or more) is added to the public event (additive: older clients ignore it).

## Data

`event_fire(user_id, event_id, fired_at)`, primary key `(user_id, event_id)`, index on `event_id`. Tier T3 like `saved_event` (a person-to-church link). Added to the data inventory, to the member export and deletion list, and to the retention job.

## Build notes

* The total is counted with the event's other details in one grouped query, not one query per card.
* `fired_at` is used for the daily limit and for nothing else.
* A new table means a coordinated release: the change is merged only when the owner is ready to run Migrate production (`docs/database.md`).
