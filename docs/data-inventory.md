# Data Inventory

Every column the application stores, with its data tier (`/docs/secure-coding.md` section 1), why it is stored, how long it is kept, and how it is deleted. It is the input for the privacy policy, the retention schedule, and account deletion and export. **A test fails if a column in `apps/web/db/schema.ts` is missing from this table, or a row here has no matching column** (`apps/web/db/schema-inventory.test.ts`).

Rules for a row:

* **Tier** is T0 to T3. **T4 (Social Security or identification numbers, card numbers, medical records) is never stored by this platform**; the test fails on a T4 row.
* **Purpose** says what needs the column. A column with no purpose is removed.
* **Retention** states how long it is kept (for example "until the account is deleted" or "90 days"). Free text a user can type may hold T3 data, so it is bounded in length and never logged.
* **Deletion path** says how the value is removed. Any `owner_id` column declares what happens to the row when the owner's account is deleted (delete, anonymize, or retain with a stated legal reason); account deletion is a launch gate (`/docs/risk-and-legal.md`).

New tables are added to the schema and to this table in the same pull request.

| Table.column | Tier | Purpose | Retention | Deletion path |
| --- | --- | --- | --- | --- |
<!-- boilerplate:proof:start -->
| migration_proof.id | T1 | Proves the migration workflow only | Disposable demo table | Dropped when the demo slice is removed |
| migration_proof.note | T1 | Proves the migration workflow only | Disposable demo table | Dropped when the demo slice is removed |
| proof_item.id | T1 | Row identity for the demo feature | Disposable demo table | Removed with the row |
| proof_item.owner_id | T2 | Clerk user id of the row's owner, for ownership checks | Until the owner's account is deleted | Declared: delete the owner's rows on account deletion (not built; demo table) |
| proof_item.label | T2 | User-typed label (free text, length-capped, never logged) | Until the owner's account is deleted | Removed with the row; declared: delete the owner's rows on account deletion |
| proof_item.created_at | T1 | When the row was created | Until the row is deleted | Removed with the row |
| user_profile.id | T1 | Row identity for the member's profile | Until the account is deleted | Deleted with the profile |
| user_profile.clerk_user_id | T2 | Links the profile to the member's Clerk identity | Until the account is deleted | Row deleted on account deletion (S1: `DELETE /me` and the Clerk deleted-user webhook) |
| user_profile.display_name | T2 | Name the member chose to show (plain text, 60 characters at most, never logged) | Until the account is deleted | Deleted with the profile |
| user_profile.email_pref | T1 | Whether the member wants email (the address itself stays in Clerk and is never copied here) | Until the account is deleted | Deleted with the profile |
| user_profile.time_zone | T2 | The member's time zone, so quiet hours and times display correctly | Until the account is deleted | Deleted with the profile |
| user_profile.created_at | T1 | When the profile was created | Until the account is deleted | Deleted with the profile |
| policy_acceptance.id | T1 | Row identity | Kept for the legal period | Kept; unlinked from the person on account deletion |
| policy_acceptance.user_id | T2 | Which member accepted | Until the account is deleted | Anonymized on account deletion: replaced by an anonymous marker, the record is kept without the person |
| policy_acceptance.policy_kind | T1 | Which policy (terms or privacy) | Kept for the legal period | Kept without the person |
| policy_acceptance.version | T1 | Which version was accepted | Kept for the legal period | Kept without the person |
| policy_acceptance.accepted_at | T1 | When it was accepted (with the 18+ attestation) | Kept for the legal period | Kept without the person |
| organization.id | T0 | Row identity for a Church/Ministry | Until removed by an admin | Removed with the organization |
| organization.name | T0 | Public name of the Church/Ministry (plain text, 120 characters at most) | Until removed by an admin | Removed with the organization |
| organization.name_key | T0 | Lower-cased name, so a repeated claim attaches to the same organization | Until removed by an admin | Removed with the organization |
| organization.description | T0 | Public description (plain text, 1000 characters at most) | Until removed by an admin | Removed with the organization |
| organization.status | T0 | Whether the organization is pending, approved or unpublished | Until removed by an admin | Removed with the organization |
| organization.created_at | T0 | When the organization was first claimed | Until removed by an admin | Removed with the organization |
| organization_link.id | T0 | Row identity | Until removed by an admin | Removed with the organization |
| organization_link.org_id | T0 | Which organization the link belongs to | Until removed by an admin | Removed with the organization |
| organization_link.url | T0 | Public website or social link (1 to 3 per organization) | Until removed by an admin | Removed with the organization |
| organization_link.position | T0 | Order of the links | Until removed by an admin | Removed with the organization |
| organization_member.id | T1 | Row identity for a claim or manager | Until the account is deleted | Deleted with the person's account |
| organization_member.org_id | T3 | Which organization the person claimed or manages (a person-to-church link, never public) | Until the account is deleted | Delete the row on account deletion; an organization left with no manager returns to pending |
| organization_member.user_id | T3 | The person claiming or managing (Clerk user id) | Until the account is deleted | Delete the row on account deletion |
| organization_member.role | T1 | The role held (manager) | Until the account is deleted | Deleted with the row |
| organization_member.status | T1 | Pending, approved, rejected or revoked | Until the account is deleted | Deleted with the row |
| organization_member.contact_email | T2 | Where the admin can reach the claimant during review | Removed when the request is decided | Set to empty on decision; deleted with the row |
| organization_member.requested_at | T1 | When the claim was made | Until the account is deleted | Deleted with the row |
| organization_member.decided_at | T1 | When an admin decided | Until the account is deleted | Deleted with the row |
| organization_member.decided_by | T2 | Which admin decided | Until the account is deleted | Deleted with the row |
| organization_member.decision_reason | T1 | The admin's stated reason (plain text) | Until the account is deleted | Deleted with the row |
| audit_log.id | T1 | Row identity | Kept (append-only) | Kept |
| audit_log.actor_id | T2 | Who performed the action | Kept (append-only) | Anonymized on account deletion: replaced by an anonymous marker, the entry is kept without the person |
| audit_log.action | T1 | What was done | Kept (append-only) | Kept |
| audit_log.subject | T3 | What it was done to (organization and member ids, a person-to-church link) | Kept (append-only) | Anonymized on account deletion: the person's id in the subject is replaced |
| audit_log.detail | T1 | The stated reason or the fields changed (plain text) | Kept (append-only) | Kept |
| audit_log.at | T1 | When it happened | Kept (append-only) | Kept |
| billing_rule.account_type | T1 | Which kind of account the rule is for (member or organization) | Kept | Not personal |
| billing_rule.payment_required | T1 | Whether this kind of account must pay (admin setting, off by default) | Kept | Not personal |
| billing_rule.trial_days | T1 | Length of the free trial | Kept | Not personal |
| billing_rule.default_plan_id | T1 | The plan offered by default | Kept | Not personal |
| billing_rule.updated_at | T1 | When an admin last changed the rule | Kept | Not personal |
| billing_plan.id | T1 | Row identity | Kept | Not personal |
| billing_plan.account_type | T1 | Who the plan is for | Kept | Not personal |
| billing_plan.name | T1 | Plan name shown to admins and, later, buyers | Kept | Not personal |
| billing_plan.active | T1 | Whether the plan can be bought (off until an admin turns it on) | Kept | Not personal |
| billing_plan.created_at | T1 | When the plan was made | Kept | Not personal |
| billing_price.id | T1 | Row identity (a price version) | Kept (subscribers reference the version they bought) | Not personal |
| billing_price.plan_id | T1 | The plan the price belongs to | Kept (subscribers reference the version they bought) | Not personal |
| billing_price.interval | T1 | Billing period (month or year) | Kept (subscribers reference the version they bought) | Not personal |
| billing_price.amount_minor | T1 | Price in whole cents | Kept (subscribers reference the version they bought) | Not personal |
| billing_price.currency | T1 | Currency of the price | Kept (subscribers reference the version they bought) | Not personal |
| billing_price.created_at | T1 | When this price version took effect | Kept (subscribers reference the version they bought) | Not personal |
| billing_coupon.id | T1 | Row identity | Kept | Not personal |
| billing_coupon.code | T1 | The promotional code typed at checkout | Kept | Not personal |
| billing_coupon.percent_off | T1 | Percentage discount (or empty) | Kept | Not personal |
| billing_coupon.amount_off_minor | T1 | Fixed discount in whole cents (or empty) | Kept | Not personal |
| billing_coupon.currency | T1 | Currency of a fixed discount | Kept | Not personal |
| billing_coupon.expires_at | T1 | When the coupon stops working | Kept | Not personal |
| billing_coupon.max_redemptions | T1 | How many accounts may use it | Kept | Not personal |
| billing_coupon.active | T1 | Whether the coupon works | Kept | Not personal |
| billing_coupon.created_at | T1 | When it was made | Kept | Not personal |
| billing_coupon_use.id | T1 | Row identity | Kept while the account exists | Deleted with the account (member deletion removes the member's rows) |
| billing_coupon_use.coupon_id | T1 | Which coupon was used | Kept while the account exists | Deleted with the account (member deletion removes the member's rows) |
| billing_coupon_use.account_type | T1 | Kind of account that used it | Kept while the account exists | Deleted with the account (member deletion removes the member's rows) |
| billing_coupon_use.account_id | T2 | Which account used the coupon (a member's user id or an organization id) | Kept while the account exists | Deleted with the account (member deletion removes the member's rows) |
| billing_coupon_use.created_at | T1 | When it was used | Kept while the account exists | Deleted with the account (member deletion removes the member's rows) |
| billing_subscription.id | T1 | Row identity | Kept while the account exists | Deleted with the account (member deletion removes the member's rows) |
| billing_subscription.account_type | T1 | Kind of account | Kept while the account exists | Deleted with the account (member deletion removes the member's rows) |
| billing_subscription.account_id | T2 | Which account holds the subscription (a member's user id or an organization id) | Kept while the account exists | Deleted with the account (member deletion removes the member's rows) |
| billing_subscription.plan_id | T1 | The plan bought | Kept while the account exists | Deleted with the account (member deletion removes the member's rows) |
| billing_subscription.price_id | T1 | The price version bought | Kept while the account exists | Deleted with the account (member deletion removes the member's rows) |
| billing_subscription.status | T1 | Trialing, active, past due or cancelled | Kept while the account exists | Deleted with the account (member deletion removes the member's rows) |
| billing_subscription.trial_ends_at | T1 | When the free trial ends | Kept while the account exists | Deleted with the account (member deletion removes the member's rows) |
| billing_subscription.provider_ref | T2 | The payment provider's own reference (never card data) | Kept while the account exists | Deleted with the account (member deletion removes the member's rows) |
| billing_subscription.created_at | T1 | When the trial or purchase started | Kept while the account exists | Deleted with the account (member deletion removes the member's rows) |
| billing_subscription.provider_customer_ref | T2 | The payment provider's own customer reference, so the person can open the provider's customer page (never card data) | Kept while the account exists | Deleted with the account (member deletion removes the member's row) |
| billing_subscription.provider_event_at | T1 | When the provider says the last change happened, so an old notification never overwrites a newer state | Kept while the account exists | Deleted with the account |
| payment_event.event_id | T1 | The provider's id of a notification already applied, so a replay is ignored (no payload, no person) | Kept | Not personal |
| payment_event.type | T1 | What kind of notification it was | Kept | Not personal |
| payment_event.received_at | T1 | When it was applied | Kept | Not personal |
| email_suppression.address_key | T2 | A keyed hash of an email address that bounced or complained, so it is never emailed again (never the address itself) | Kept (it must outlive account deletion, or the app could mail a dead or hostile address again) | Not personal on its own: a keyed hash; kept after account deletion |
| email_suppression.reason | T1 | Whether it was a bounce or a complaint | Kept | Not personal |
| email_suppression.created_at | T1 | When it was recorded | Kept | Not personal |
| contact_message.id | T1 | Row identity | Kept until an admin deletes the message | Deleted by an admin from the Messages inbox |
| contact_message.topic | T1 | What the message is about (question, report a listing, privacy request, other) | Kept until an admin deletes the message | Deleted by an admin |
| contact_message.name | T3 | The name the person typed, so we know who we are answering | Kept until an admin deletes the message | Deleted by an admin; a privacy request to delete is answered by deleting the message |
| contact_message.reply_email | T3 | The email address the person typed, if they want a reply (optional) | Kept until an admin deletes the message | Deleted by an admin |
| contact_message.message | T3 | What the person wrote (plain text; may contain anything they choose to type) | Kept until an admin deletes the message | Deleted by an admin |
| contact_message.status | T1 | New or done, for the admin's inbox | Kept until an admin deletes the message | Deleted by an admin |
| contact_message.address_key | T2 | A keyed hash of the sender's network address, used only to limit messages per person per day (never the address) | Kept until an admin deletes the message | Deleted by an admin |
| contact_message.created_at | T1 | When the message was sent | Kept until an admin deletes the message | Deleted by an admin |
| event_series.id | T0 | Row identity of a recurring series | Until removed by an admin or the organization | Removed with the organization's events |
| event_series.org_id | T0 | Which organization the series belongs to | Until removed by an admin or the organization | Removed with the organization's events |
| event_series.rule | T0 | How the series repeats (weekly, monthly by weekday, or a date list) | Until removed by an admin or the organization | Removed with the organization's events |
| event_series.created_at | T0 | When the series was created | Until removed by an admin or the organization | Removed with the organization's events |
| event.id | T0 | Row identity of an event | Until the event is deleted by the organization; soft-deleted rows are kept for the audit trail | Hidden on delete; removed only by an admin or with the organization |
| event.org_id | T0 | Which Church/Ministry holds the event | Until the event is deleted by the organization; soft-deleted rows are kept for the audit trail | Hidden on delete; removed only by an admin or with the organization |
| event.series_id | T0 | The recurring series the event belongs to, if any | Until the event is deleted by the organization; soft-deleted rows are kept for the audit trail | Hidden on delete; removed only by an admin or with the organization |
| event.is_exception | T0 | True when one occurrence was edited on its own, so series edits skip it | Until the event is deleted by the organization; soft-deleted rows are kept for the audit trail | Hidden on delete; removed only by an admin or with the organization |
| event.title | T0 | Public title (plain text, 3 to 120 characters) | Until the event is deleted by the organization; soft-deleted rows are kept for the audit trail | Hidden on delete; removed only by an admin or with the organization |
| event.description | T0 | Public description (plain text, 4000 characters at most) | Until the event is deleted by the organization; soft-deleted rows are kept for the audit trail | Hidden on delete; removed only by an admin or with the organization |
| event.status | T0 | Draft, published, cancelled or deleted (a soft delete kept for the audit trail) | Until the event is deleted by the organization; soft-deleted rows are kept for the audit trail | Hidden on delete; removed only by an admin or with the organization |
| event.moderation_state | T0 | Whether an admin has held or hidden the event (S8) | Until the event is deleted by the organization; soft-deleted rows are kept for the audit trail | Hidden on delete; removed only by an admin or with the organization |
| event.starts_at | T0 | The exact start moment (UTC) | Until the event is deleted by the organization; soft-deleted rows are kept for the audit trail | Hidden on delete; removed only by an admin or with the organization |
| event.ends_at | T0 | The exact end moment (UTC), if given | Until the event is deleted by the organization; soft-deleted rows are kept for the audit trail | Hidden on delete; removed only by an admin or with the organization |
| event.time_zone | T0 | The IANA zone the event happens in, so local times display correctly | Until the event is deleted by the organization; soft-deleted rows are kept for the audit trail | Hidden on delete; removed only by an admin or with the organization |
| event.venue_name | T0 | Public venue name | Until the event is deleted by the organization; soft-deleted rows are kept for the audit trail | Hidden on delete; removed only by an admin or with the organization |
| event.street | T0 | Public street address of the event | Until the event is deleted by the organization; soft-deleted rows are kept for the audit trail | Hidden on delete; removed only by an admin or with the organization |
| event.city | T0 | Public city | Until the event is deleted by the organization; soft-deleted rows are kept for the audit trail | Hidden on delete; removed only by an admin or with the organization |
| event.state | T0 | Public US state code | Until the event is deleted by the organization; soft-deleted rows are kept for the audit trail | Hidden on delete; removed only by an admin or with the organization |
| event.zip | T0 | Public ZIP code | Until the event is deleted by the organization; soft-deleted rows are kept for the audit trail | Hidden on delete; removed only by an admin or with the organization |
| event.lat | T0 | Latitude of the venue (never a person's location), for distance search | Until the event is deleted by the organization; soft-deleted rows are kept for the audit trail | Hidden on delete; removed only by an admin or with the organization |
| event.lng | T0 | Longitude of the venue, for distance search | Until the event is deleted by the organization; soft-deleted rows are kept for the audit trail | Hidden on delete; removed only by an admin or with the organization |
| event.speakers | T0 | Speakers named by the organizer (plain text); must not name minors or private individuals | Until the event is deleted by the organization; soft-deleted rows are kept for the audit trail | Hidden on delete; removed only by an admin or with the organization |
| event.directions | T0 | Directions note (plain text) | Until the event is deleted by the organization; soft-deleted rows are kept for the audit trail | Hidden on delete; removed only by an admin or with the organization |
| event.version | T0 | Edit counter used to detect two people editing at once | Until the event is deleted by the organization; soft-deleted rows are kept for the audit trail | Hidden on delete; removed only by an admin or with the organization |
| event.edit_token | T0 | Random value written with each edit so a stale edit changes nothing | Until the event is deleted by the organization; soft-deleted rows are kept for the audit trail | Hidden on delete; removed only by an admin or with the organization |
| event.created_at | T0 | When the event was created | Until the event is deleted by the organization; soft-deleted rows are kept for the audit trail | Hidden on delete; removed only by an admin or with the organization |
| event.updated_at | T0 | When the event was last changed | Until the event is deleted by the organization; soft-deleted rows are kept for the audit trail | Hidden on delete; removed only by an admin or with the organization |
| event_revival_type.event_id | T0 | Which event is tagged | Until removed by an admin or the organization | Removed with the event |
| event_revival_type.type_slug | T0 | One of the twelve revival types | Until removed by an admin or the organization | Removed with the event |
| event_link.id | T0 | Row identity | Until removed by an admin or the organization | Removed with the event |
| event_link.event_id | T0 | Which event the link belongs to | Until removed by an admin or the organization | Removed with the event |
| event_link.url | T0 | Public website or social link (1 to 3 per event) | Until removed by an admin or the organization | Removed with the event |
| event_link.position | T0 | Order of the links | Until removed by an admin or the organization | Removed with the event |
| idempotency_record.id | T1 | Row identity | 24 hours | Deleted after 24 hours or with the account |
| idempotency_record.user_id | T2 | Which person made the create request, so a repeated request returns the first result | 24 hours | Deleted with the person's account (S1 deletion path); expired records are replaced on reuse |
| idempotency_record.key | T1 | The random key the client sent with a create (not a secret) | 24 hours | Deleted after 24 hours or with the account |
| idempotency_record.event_id | T0 | The event that request produced | 24 hours | Deleted after 24 hours or with the account |
| idempotency_record.created_at | T1 | When the key was first used | 24 hours | Deleted after 24 hours or with the account |
| saved_event.user_id | T3 | Whose saved list this is (a person-to-church link: sensitive, never shown to anyone else) | Until the account is deleted | Deleted on account deletion (S1 path) |
| saved_event.event_id | T3 | Which event the person saved | Until the person removes it, or 30 days after the event ended | Deleted on account deletion; removed by the daily retention job 30 days after the event ended |
| saved_event.saved_at | T3 | When it was saved (used for nothing but ordering ties) | Same as the row | Deleted with the row |
| invite_token.token_hash | T1 | Hash of a random invite link (the link itself is never stored) | 30 days | Removed when it expires (daily job) or with the account |
| invite_token.created_by | T2 | Who made the link, so invites can be limited and removed with the account | 30 days | Deleted on account deletion; removed when the link expires |
| invite_token.created_at | T1 | When the link was made (for the daily limit) | 30 days | Removed with the row |
| invite_token.expires_at | T1 | When the link stops working | 30 days | Removed with the row |
| invite_token.arrivals | T1 | How many people opened the link (a total; nothing about them is kept) | 30 days | Removed with the row |
| user_profile.suspended | T1 | Whether an admin has suspended the member (they cannot change events or submit claims; they can still browse, export and delete) | Until the account is deleted | Deleted with the profile |
| report.id | T1 | Row identity | Until an admin removes it | Removed with the report |
| report.subject_type | T1 | Whether an event or a church was reported | Until an admin removes it | Removed with the report |
| report.subject_id | T1 | Which event or church was reported | Until an admin removes it | Removed with the report |
| report.reason | T1 | The reason chosen from a fixed list | Until an admin removes it | Removed with the report |
| report.details | T2 | Optional free text from the reporter (1000 characters, plain text; the form asks for no personal data and no reporter identity is stored) | Until an admin removes it | Removed with the report |
| report.status | T1 | Open, dismissed or acted on | Until an admin removes it | Removed with the report |
| report.created_at | T1 | When it was sent | Until an admin removes it | Removed with the report |
| report.decided_at | T1 | When an admin decided | Until an admin removes it | Removed with the report |
| report_rate_limit.id | T1 | Row identity | 24 hours | Deleted by the daily retention job |
| report_rate_limit.address_hash | T2 | A keyed hash of the sender's network address, only to stop one address flooding the form; it cannot be turned back into an address and is not linked to any report | 24 hours | Deleted by the daily retention job |
| report_rate_limit.created_at | T1 | When it was sent (for the daily limit) | 24 hours | Deleted by the daily retention job |
| user_profile.reminders | T1 | Whether the member wants reminders for the events they save | Until the account is deleted | Deleted with the profile |
| alert_rule.id | T1 | Row identity | Until the member deletes the alert or the account | Deleted with the alert or the account |
| alert_rule.user_id | T3 | Whose alert this is (interest in a place and in kinds of gatherings is sensitive) | Until the account is deleted | Deleted on account deletion (S1 path) |
| alert_rule.place_label | T3 | The place the member typed, for display (a chosen place, not where they are) | Until the alert is deleted | Deleted with the alert; replaced when the place is edited (no history) |
| alert_rule.lat | T3 | The chosen place as a point rounded to about 1 km | Until the alert is deleted | Deleted with the alert; replaced when the place is edited (no history) |
| alert_rule.lng | T3 | The chosen place as a point rounded to about 1 km | Until the alert is deleted | Deleted with the alert; replaced when the place is edited (no history) |
| alert_rule.radius_miles | T3 | How far from the place to be told about | Until the alert is deleted | Deleted with the alert |
| alert_rule.timeframe_days | T3 | How soon (7, 14 or 30 days) | Until the alert is deleted | Deleted with the alert |
| alert_rule.types | T3 | Kinds of gathering wanted (none means all) | Until the alert is deleted | Deleted with the alert |
| alert_rule.immediate | T1 | Whether the member wants alerts as they happen (at most one a day) | Until the alert is deleted | Deleted with the alert |
| alert_rule.paused | T1 | Whether the alert is paused | Until the alert is deleted | Deleted with the alert |
| alert_rule.created_at | T1 | When the alert was made | Until the alert is deleted | Deleted with the alert |
| push_token.id | T1 | Row identity | Until the phone signs out, the push service rejects it, or the account is deleted | Deleted with the token |
| push_token.user_id | T2 | Whose phone this is | Same | Deleted on account deletion (S1 path) |
| push_token.token | T2 | The phone's push address (a credential for messaging that phone; never exported or logged) | Same | Deleted when revoked, when rejected by the push service, and on account deletion |
| push_token.platform | T1 | iPhone or Android | Same | Deleted with the token |
| push_token.created_at | T1 | When it was added | Same | Deleted with the token |
| notification_queue.id | T1 | Row identity | 30 days after it is sent or dropped | Removed by the daily job, or on account deletion |
| notification_queue.user_id | T3 | Who a message is for | 30 days after it is sent or dropped | Deleted on account deletion (S1 path) |
| notification_queue.kind | T1 | New event, change or reminder | Same | Same |
| notification_queue.channel | T1 | Immediate or in the daily digest | Same | Same |
| notification_queue.event_id | T3 | Which event a message is about (a person-to-church link) | Same | Same |
| notification_queue.org_id | T3 | Which church it is about (for the weekly cap) | Same | Same |
| notification_queue.dedupe_key | T1 | Makes queuing safe to repeat | Same | Same |
| notification_queue.send_after | T1 | When it may be sent (after quiet hours) | Same | Same |
| notification_queue.status | T1 | Pending, sent or dropped | Same | Same |
| notification_queue.attempts | T1 | How many times sending was tried | Same | Same |
| notification_queue.created_at | T1 | When it was queued | Same | Same |
| notification_queue.sent_at | T1 | When it was sent or dropped | Same | Same |
| org_mute.user_id | T3 | Whose choice this is | Until the member undoes it or deletes the account | Deleted on account deletion (S1 path) |
| org_mute.org_id | T3 | The church the member stopped hearing about (a person-to-church link) | Same | Same |
| org_mute.created_at | T1 | When they stopped | Same | Same |
<!-- boilerplate:proof:end -->
