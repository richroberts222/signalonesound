# S6 Saved Events and Invites

**Status: DRAFT, not approved.** Source: blueprint slice S6; product plan ("Save favorite events", "Invite friends to join", "Share event links"). The fire-emoji recommendation (Later Phase 1) is included only if the owner confirms. Depends on: S4. Owner decision recorded: attendee privacy posture (minimal saves).

## Purpose

Let a signed-in member keep a short list of events they care about and invite friends, while storing as little as possible about them: the link between a person and a church event is sensitive.

## Scope (in)

* Save and unsave an event; a Saved list (upcoming first); saved past events disappear after 30 days.
* Invite friends: a personal invite link and the native share sheet or a copied message; no contact-list access, no storing who was invited.
* Optional (owner confirms): a fire reaction on an event with a public count only (who reacted is not shown).

## Out of scope

Revival journey log (UNDECIDED in the source: "coming soon"), following churches, comments, reviews, messaging, referral rewards.

## Acceptance criteria

* **AC1** A member can save and unsave an event on web and mobile; the Saved list matches on both.
* **AC2** Saving the same event twice results in one row (idempotent); unsaving a non-saved event succeeds quietly.
* **AC3** Only the owner can read or change their saved list; no endpoint or count reveals who saved an event.
* **AC4** Aggregate saved counts shown to managers are anonymous and shown only when 5 or more people have saved (small-number protection).
* **AC5** Saved rows for past events are removed 30 days after the event; a scheduled job and its test prove it.
* **AC6** Deleting the account deletes the saved list and reactions (extends the S1 export and delete tests).
* **AC7** The invite link carries no personal data in the URL beyond a random token; using it takes the person to sign-up and records only an anonymous count of arrivals.
* **AC8** A member can save at most 500 events and send invites at a limited rate.
* **AC9** (If confirmed) one fire reaction per member per event; the public count updates; reaction rows are not exposed.

## Controls inventory

| Control | Test id | Action | Effect |
| --- | --- | --- | --- |
| Save toggle on event page and cards | `event-save-toggle` | Save or unsave | Heart state and list update |
| Saved list, row | `saved-item-N` | Open | Event page |
| Saved list, empty state | `saved-empty` | Display | Link to Discover |
| Invite button | `invite-button` | Share | Native share or copy |
| Copy confirmation | `invite-copied` | Display | Message shown |
| (If confirmed) Fire toggle | `event-fire-toggle` | React | Count changes |

## API

`PUT/DELETE /me/saved-events/:eventId`, `GET /me/saved-events` (cursor), `POST /me/invites` (returns link), `POST /events/:id/reaction` and `DELETE` (if confirmed).

## Data

`saved_event(user_id, event_id, saved_at)` T3 (person-to-church link), primary key (user, event); `invite_token(token_hash, created_by, expires_at, arrivals)` T2; `event_reaction(user_id, event_id)` T3 if confirmed. All in the data inventory with retention and deletion path.

## Hostile cases

Saving unpublished or other organizations' draft events, saving a nonexistent id, floods, enumeration of who saved an event, invite-token guessing, replayed invite tokens.

## Automation shipped with the slice

API and hostile tests; retention job test; export and delete completeness tests; anonymity guard (no endpoint returns user ids with save data); E2E on web; mobile logic tests; mutation proofs.

## Owner decisions

Include the fire reaction in Phase 1? The 30-day retention and the minimum of 5 for counts (proposed); invite wording.

## Done checklist

AC1 to AC9 (AC9 if confirmed) and controls ticked; `pnpm validate` clean; CI green; docs updated.
