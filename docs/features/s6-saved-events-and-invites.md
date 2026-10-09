# S6 Saved Events and Invites

**Status: APPROVED by the owner on 2026-10-09 (reviewed once by an independent reviewer). Built as its own issue; items under Owner decisions still need the owner.** Source: blueprint slice S6; product plan ("Save favorite events", "Invite friends to join", "Share event links"). The fire-emoji recommendation (Later Phase 1) is included only if the owner confirms. Depends on: S4 for the web parts and S5 for the mobile controls (ship the mobile parts after S5; AC1 is complete only when both exist). Owner decision recorded: attendee privacy posture (minimal saves). [Fable]

## Purpose

Let a signed-in member keep a short list of events they care about and invite friends, while storing as little as possible about them: the link between a person and a church event is sensitive.

## Scope (in)

* Save and unsave an event; a Saved list (upcoming first); saved past events disappear after 30 days.
* Invite friends: a personal invite link and the native share sheet or a copied message; no contact-list access, no storing who was invited.
* Optional (owner confirms): a fire reaction on an event with a public count only (who reacted is not shown).

## Out of scope

Revival journey log (the source says "concept coming soon"; deferred, not specified) [Fable], following churches, comments, reviews, messaging, referral rewards.

## Acceptance criteria

* **AC1** A member can save and unsave an event on web and mobile; the Saved list matches on both.
* **AC2** Saving the same event twice results in one row (idempotent); unsaving a non-saved event succeeds quietly.
* **AC3** Only the owner can read or change their saved list; no endpoint or count reveals who saved an event.
* **AC4** Saved counts are not shown to managers or anyone by default (not in the source). If the owner later enables them, they are aggregate only and shown only when 5 or more people have saved (small-number protection). [Fable]
* **AC5** Saved rows for past events are removed 30 days after the event; a scheduled job and its test prove it.
* **AC6** Deleting the account deletes the saved list and reactions (extends the S1 export and delete tests).
* **AC7** The invite link carries no personal data in the URL beyond a random token of at least 128 bits; using it takes the person to sign-up and records only an anonymous count of arrivals; no row ever links inviter and invitee; tokens expire after 30 days (proposed). [Fable]
* **AC8** A member can save at most 500 events and send invites at a limited rate.
* **AC9** (If confirmed) one fire reaction per member per event; the public count updates; reaction rows are not exposed.
* **AC10** Only published, non-deleted events can be saved (`404` otherwise); a saved event that is later cancelled, hidden or deleted stays in the list with that state shown until the retention job removes it. [Fable]

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

AC1 to AC10 (AC9 if confirmed) and controls ticked [Fable]; `pnpm validate` clean; CI green; docs updated.

## Build notes (decisions made while building)

* **Web first.** The save toggle, the Saved list (`/saved`), the invite page (`/account/invite`) and the page a friend lands on (`/invite/<token>`) are built. The mobile controls arrive with the mobile screens (S5), against the same API and shared client.
* **The fire reaction (AC9) is not built.** The spec includes it only if the owner confirms; it is an owner decision.
* **Retention** is the daily job `GET /api/v1/internal/jobs/retention`, scheduled in `apps/web/vercel.json` and protected by `CRON_SECRET`. The owner must set `CRON_SECRET` in Vercel (see `/docs/how-to.md`); without it the job refuses every call and nothing is removed.
* **Invites:** the friend's arrival is counted from the browser, so link-preview robots are not counted; invite pages ask search engines not to index them.
* **A saved event that is later cancelled stays listed, marked cancelled; one that is deleted or held is shown only as "no longer available"** with no title, place or time.
