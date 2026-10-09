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
<!-- boilerplate:proof:end -->
