# S7 Alerts and Push Notifications

**Status: APPROVED by the owner on 2026-10-09 (reviewed once by an independent reviewer). Built as its own issue; items under Owner decisions still need the owner.** Source: blueprint slice S7; product plan ("Push notifications: Revival coming near you!", "Set notification criteria based on locations and timeframes", "Create reminder notifications for user-selected events"). Depends on: S5, S6. Owner decisions recorded: attendee privacy posture (coarse location); notification policy (digest, caps, quiet hours, unsubscribe) is proposed and needs a yes.

## Purpose

Tell people when a revival event matching their saved criteria is coming, without spamming and without storing precise location.

## Scope (in)

* Alert rules per member: place (city, state or ZIP, stored as a coarse point plus the typed place label for display), radius, timeframe (next 7, 14, 30 days), revival types, delivery (push, email digest). Push is the source requirement; the email digest is a proposed fallback that ships only if the owner approves an email vendor, and the email address is read from Clerk at send time, never stored. [Fable]
* Matching job: when an event is published or changed, and on a daily schedule, find matching rules and queue notifications.
* Event reminders for saved events (a "Later Phase 1" source item pulled forward because it reuses the queue; default one day before and two hours before in the event's local time; member can turn off). [Fable]
* Push through the Expo push adapter behind a port; email digest through an email port (vendor chosen later, owner approves cost).
* Notification policy: one daily digest by default; maximum 1 immediate alert per day per member; maximum 3 notifications per organization per member per week; quiet hours 9 pm to 8 am local; one-tap unsubscribe per organization and per rule; no sensitive content in the push payload (title and place only).
* Push token registration and revocation; notification history is not stored beyond 30 days.

## Out of scope

Instant action alerts and emergency intercession alerts (community features, UNDECIDED), SMS, in-app inbox, marketing messages, per-user precise location.

## Acceptance criteria

* **AC1** A member can create, edit, pause and delete alert rules (at most 10) on web and mobile.
* **AC2** A newly published event matching a rule produces at most one notification entry per member per event (one line in the next digest, or one immediate push when the member chose immediate delivery and the caps allow), however many rules match. [Fable]
* **AC3** Changing an event's time, place or status (cancelled, hidden, deleted) notifies members who saved it, at most once per hour per event (changes within the hour are coalesced). [Fable]
* **AC4** Quiet hours, daily cap and per-organization weekly cap are enforced (time-travel tests with a fake clock). Quiet hours use `user_profile.time_zone` (S1), falling back to the rule's place time zone; notifications due in quiet hours are sent at the end of them. [Fable]
* **AC5** Unsubscribe links work without sign-in using a signed, expiring token and take effect immediately.
* **AC6** Push permission is requested at the moment a rule is created, not at app start; a denial leaves email as the option.
* **AC7** The location in a rule is stored as a point rounded to about 1 km and no history of locations is kept.
* **AC8** Tokens that the push service reports as invalid are deleted; a revoked token receives nothing.
* **AC9** Deleting the account removes rules, tokens and queued notifications (extends S1 tests).
* **AC10** The matching job is idempotent (a retry never double-sends) and failure of the push provider does not lose notifications (retries with backoff, then drop with a log).
* **AC11** Provider cost guard: a monthly send ceiling stops sending and raises an alert before the free tier is exceeded.

## Controls inventory

| Control | Test id | Action | Effect |
| --- | --- | --- | --- |
| Alerts tab: New alert | `alerts-new-button` | Open form | Form shown |
| Place input, radius, timeframe, type chips | `alert-place-input`, `alert-radius-select`, `alert-timeframe-select`, `alert-type-<slug>` | Enter | Validation |
| Delivery toggles (push, email) | `alert-push-toggle`, `alert-email-toggle` | Toggle | Permission prompt for push |
| Save, Pause, Delete | `alert-save`, `alert-pause-N`, `alert-delete-N` | Act | List updates |
| Reminder toggle on saved events | `reminder-toggle-N` | Toggle | Reminder rows change |
| Quiet hours settings | `quiet-hours-start`, `quiet-hours-end` | Choose | Used by job |
| Unsubscribe page | `unsubscribe-confirm` | Confirm | Rule or organization muted |

## API

`GET/POST /me/alerts`, `PATCH/DELETE /me/alerts/:id`, `POST /me/push-tokens`, `DELETE /me/push-tokens/:id`, `PUT /me/reminder-settings`, `GET/POST /unsubscribe/:token` (signed). Internal job entry points protected by a server secret and the platform scheduler. `POST /me/alerts` is limited to 10 rules per member (`409` beyond); the email port is shared with S8 (whichever slice lands first introduces it with a logging adapter). [Fable]

## Data

`alert_rule(id, user_id, place_label, lat, lng, radius, timeframe_days, types, delivery, paused)` T3 (derived coarse location and religious interest) [Fable]; `push_token(id, user_id, token, platform, created_at)` T2; `notification_queue(id, user_id, kind, ref, send_after, status)` T2, purged after 30 days; `org_mute(user_id, org_id)` T3.

## Hostile cases

Rule flooding, forged unsubscribe tokens, token theft replay, other members' rule ids, crafted places, huge type lists, clock skew, provider outage, duplicate job runs.

## Automation shipped with the slice

Fake-clock policy tests; matching engine unit tests with fixtures; idempotency tests; API and hostile tests; push adapter contract test with a fake; E2E for rule creation on web; manual device checklist for real push; cost-guard test; mutation proofs (raise the cap, see the cap test fail).

## Owner decisions

The notification policy values above (yes or adjust); push and email vendors and cost (Expo push is free at small scale; email vendor to be chosen); whether immediate alerts are allowed at launch.

## Done checklist

AC1 to AC11 and controls ticked; real-device push verified on iPhone and Android; `pnpm validate` clean; CI green; docs updated.
