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
<!-- boilerplate:proof:end -->
