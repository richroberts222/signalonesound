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
| hello_note.user_id | T2 | Clerk user id of the note's owner; one note per user (S0 walking skeleton, replaced in S1) | Until the owner's account is deleted | Delete the row on account deletion (S1 adds the cascade and drops this table) |
| hello_note.note | T2 | The user's short greeting note (plain text, 140 characters at most, never logged) | Until the owner's account is deleted | Removed with the row; an empty save deletes it |
| hello_note.updated_at | T1 | When the note was last saved | Until the row is deleted | Removed with the row |
<!-- boilerplate:proof:end -->
