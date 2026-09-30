# Signal One Data Mutation Rules

## Purpose

This document defines the rules for creating, updating, and deleting application data in Signal One.

It is subordinate to:

- `/docs/architecture-rules.md`
- `/docs/database.md`

It complements:

- `/docs/data-fetching.md`

If this document conflicts with the governing architecture, Claude MUST stop and identify the conflict rather than silently choosing an implementation.

Signal One is one platform with multiple clients. Web, Android, and iPhone may initiate mutations differently at the outer client boundary, but authoritative mutation behavior must remain server-side and consistent.

---

# 1. Core Mutation Path

The standard mutation path is:

```text
Web / Mobile
     |
     v
Server / API Boundary
     |
     v
Authentication
     |
     v
Input Validation
     |
     v
Authorization
     |
     v
Business / Service Logic
     |
     v
Data Access Helper
     |
     v
Drizzle ORM
     |
     v
Neon PostgreSQL
```

Clients MUST NOT mutate Neon directly.

Client UI code MUST NOT import server-only Drizzle/database modules.

The server is authoritative for whether a mutation is valid and permitted.

---

# 2. What Counts as a Mutation

A mutation is any operation that changes persistent application state.

Examples include:

- Creating a record
- Updating a record
- Deleting a record
- Changing ownership or membership
- Publishing or unpublishing content
- Changing status
- Following or unfollowing
- Saving or unsaving
- Administrative moderation actions
- Multi-record operations
- Any other persistent state change

A mutation may originate from Web or Mobile, but it must pass through an approved server-side boundary.

---

# 3. Web and Mobile

Signal One supports:

- Web through Next.js
- Android through React Native / Expo
- iPhone through React Native / Expo

The outer mutation mechanism may differ by client.

For example:

```text
Web
  |
  +--> Server Action where appropriate
  |
  +--> API endpoint where appropriate

Mobile
  |
  +--> Authenticated Signal One API
```

These paths should converge on shared server-authoritative business behavior.

Do NOT implement one set of mutation rules for Web and another independent set for Mobile.

---

# 4. Server Actions

Next.js Server Actions may be used for Web mutations when appropriate.

A Server Action is a server boundary, not permission to place all business and database logic directly inside the action.

Prefer:

```text
Server Action
     |
     v
Authentication
     |
     v
Validation
     |
     v
Business / Service Function
     |
     v
Data Access Helper
     |
     v
Drizzle
```

Avoid:

```text
Server Action
     |
     +--> scattered business rules
     +--> inline ownership assumptions
     +--> large Drizzle implementation
     +--> UI-specific database behavior
```

Server Actions should remain thin enough that the same authoritative behavior can also be used by Mobile through the API when appropriate.

---

# 5. API Mutations

Mobile clients mutate Signal One data through authenticated backend/API endpoints.

API mutation handlers should:

1. Authenticate where required.
2. Validate request input.
3. Establish trusted user identity.
4. Enforce authorization.
5. Invoke shared business/service logic.
6. Perform persistence through approved data-access helpers.
7. Return a stable application/API result.

API handlers MUST NOT trust a request merely because it came from the official Signal One app.

---

# 6. Shared Mutation Behavior

When Web and Mobile perform the same conceptual operation, the authoritative rule should be shared.

Conceptually:

```text
Web Server Action --------                                                       > Shared service/business operation
                           /                |
Mobile API request -------/                 v
                                     Data Access Helper
                                            |
                                            v
                                         Drizzle
                                            |
                                            v
                                          Neon
```

The Web Server Action and Mobile API route may be different adapters around the same server-side operation.

This avoids duplicating critical rules across clients.

---

# 7. Authentication

Clerk is the authentication and identity authority.

When a mutation requires an authenticated user, trusted identity MUST come from Clerk on the server.

Do NOT trust a client-supplied `userId` as proof of identity.

Conceptually:

```text
Client submits mutation
        |
        v
Server authenticates with Clerk
        |
        v
Trusted Clerk user ID
        |
        v
Authorization + business rules
        |
        v
Database mutation
```

Client input may identify the resource being acted upon, but the server determines who is performing the action.

---

# 8. Authorization

Authentication answers:

```text
Who is this user?
```

Authorization answers:

```text
Is this user allowed to perform this mutation?
```

Every restricted mutation MUST enforce authorization server-side.

Examples of authorization questions include:

- Does this user own the record?
- Is this user a permitted organizer/member?
- Does this user have the required application role?
- Is this resource in a state that this user may modify?
- Is this an administrative action?

Hiding a button in the UI is NOT authorization.

A malicious or modified client must not be able to bypass server-side permission checks.

---

# 9. Input Validation

Mutation input must be validated on the server before persistence.

Client-side validation may improve user experience, but it is not a security or data-integrity boundary.

Validation may include:

- Required fields
- String lengths
- Enumerated values
- IDs
- Dates/times
- URLs
- Numeric ranges
- Geographic values
- Structured objects
- Cross-field requirements

Zod may be used where consistent with the project's validation architecture.

Validation schemas that are safe and useful to both clients and server may live in shared code.

Database-only and privileged validation logic must remain server-side.

---

# 10. No FormData as the Domain Contract

Raw `FormData` should not become the internal business/service contract for Signal One mutations.

At the UI/server boundary, a Web form may naturally produce form data when appropriate, but it should be parsed and validated into an explicit typed input before reaching authoritative business logic.

Prefer conceptual inputs such as:

```text
CreateSomethingInput
UpdateSomethingInput
```

rather than passing unstructured form data throughout the application.

Mobile and Web should be able to express the same conceptual mutation through compatible typed contracts.

---

# 11. Business / Service Layer

Authoritative application rules belong in server-side business/service logic.

Examples include:

- Whether creation is allowed
- Whether a state transition is valid
- Whether the authenticated user may edit/delete
- Which fields may be changed
- What related records must also change
- What side effects are required

Business rules should not be duplicated independently in Web and Mobile UI code.

The service layer should orchestrate application behavior while the data-access layer handles persistence details.

---

# 12. Data Access Layer

Data-access helpers perform database persistence through Drizzle.

Examples might conceptually include:

```text
createRecord(...)
updateRecord(...)
deleteRecord(...)
```

These names are examples only and do not authorize creation of domain entities before the schema is approved.

Data-access helpers should not decide high-level product policy that belongs in business/service logic.

They may enforce persistence invariants and database-related requirements.

---

# 13. Database Constraints

Server validation and business rules do not replace appropriate database constraints.

Where appropriate, PostgreSQL should enforce structural integrity through:

- NOT NULL constraints
- Unique constraints
- Foreign keys
- Check constraints where appropriate
- Correct data types

Application validation provides understandable behavior.

Database constraints provide a final integrity boundary.

Both may be appropriate for the same rule.

---

# 14. Transactions

Use a database transaction when multiple persistence operations must succeed or fail together.

Example:

```text
Operation A
Operation B
Operation C

If B fails:
A and C must not leave partial application state.
```

Do not use transactions automatically for every mutation.

Use them when the operation has a real atomicity requirement.

Transaction boundaries should normally be controlled server-side at the service/data layer, not by client code.

---

# 15. Create Operations

Create operations should determine:

1. Who is creating the resource?
2. Is authentication required?
3. Is the user authorized to create it?
4. Is the input valid?
5. Which fields may the client control?
6. Which fields must the server derive?
7. What ownership/reference information should be stored?
8. What response contract should be returned?
9. What cache/data should be refreshed afterward?

Server-controlled fields MUST NOT be blindly accepted from the client.

Examples may include:

- Ownership identifiers
- Administrative state
- Moderation state
- System timestamps
- Internal status fields

Exact fields depend on the approved schema.

---

# 16. Update Operations

Updates must not blindly write every field supplied by a client.

The server should explicitly define which fields may be changed for the operation.

Prefer:

```text
Validated allowed update fields
        |
        v
Authorization
        |
        v
Business rules
        |
        v
Targeted database update
```

Avoid unrestricted "update anything on this row" patterns.

Ownership and immutable system fields should not become client-editable merely because they exist in the database.

---

# 17. Delete Operations

Deletion behavior must be deliberate.

Before implementing delete, determine whether the product requires:

- Permanent deletion
- Soft deletion
- Archival
- Unpublishing
- Deactivation
- Another state transition

Do not automatically introduce soft-delete architecture for every table.

Do not automatically permanently delete data when product requirements require retention or recovery.

Related records, foreign keys, and cascading behavior must be considered before deletion is implemented.

---

# 18. Idempotency and Duplicate Actions

Mutations that may be retried should consider duplicate execution.

Examples include:

- Double-clicking submit
- Mobile retry after network interruption
- Replayed requests
- Background retry mechanisms

Where duplicate execution could create harmful or inconsistent state, design an appropriate idempotency or uniqueness strategy.

Do not add complex idempotency infrastructure to every simple mutation without a reason.

---

# 19. Concurrency

Mutations should consider concurrent edits when the feature makes them plausible.

Do not assume that a record cannot change between read and write.

For high-value state transitions or conflicting edits, use an appropriate strategy such as:

- Database constraints
- Transactions
- Conditional updates
- Version/timestamp checks
- Other documented concurrency controls

The complexity should match the actual risk.

---

# 20. Mutation Results

Mutation functions should return explicit, predictable results.

Do not make callers infer success from unrelated side effects.

A result may communicate:

- Success
- Validation failure
- Unauthorized
- Forbidden
- Not found
- Conflict
- Expected business-rule failure
- Unexpected server failure

The exact representation should remain consistent with Signal One's API/error architecture.

Do not expose raw database errors directly to clients.

---

# 21. Expected vs. Unexpected Errors

Expected application failures should be distinguishable from unexpected system failures.

Examples of expected failures:

- Invalid input
- Unauthorized request
- Forbidden operation
- Record not found
- Duplicate value
- Invalid state transition

Examples of unexpected failures:

- Database outage
- Unexpected exception
- Infrastructure failure

Clients should receive safe, useful information without database internals or secrets.

---

# 22. Redirects and Navigation

Authoritative mutation logic should not depend on Web-only navigation behavior.

A shared server/service mutation should return a result.

The Web client can decide whether to redirect or navigate after success.

The Mobile client can independently decide its navigation behavior.

Conceptually:

```text
Shared mutation -> result

Web    -> redirect/navigate if appropriate
Mobile -> navigate/update UI if appropriate
```

This prevents Web-specific navigation from contaminating shared business logic.

---

# 23. Cache Invalidation and Refresh

A successful mutation may make previously fetched data stale.

The mutation flow should identify what needs to be refreshed or invalidated.

For Web this may involve appropriate Next.js revalidation/refresh behavior.

For Mobile this may involve refreshing local query/cache state.

Cache invalidation is a client/framework concern around the mutation result unless server-managed caching requires explicit invalidation.

Do not let stale caches cause clients to present incorrect authoritative state indefinitely.

---

# 24. Optimistic UI

Optimistic UI may be used when it improves responsiveness and the operation is suitable.

Optimistic UI does NOT make the client authoritative.

If the server rejects the mutation, the client must reconcile with server state.

Do not use optimistic behavior where incorrect temporary state would be dangerous or misleading.

---

# 25. Dates and Times

Mutations involving dates/times must preserve clear semantics.

Distinguish:

- Calendar dates
- Local wall-clock times
- Time zones
- Actual timestamps/moments

Do not rely on accidental JavaScript timezone conversion.

The server must validate and normalize values according to the feature's documented meaning.

---

# 26. Environment Isolation

Mutations operate against the database environment configured for the running server.

The intended mapping is:

```text
Local development          -> dev
Automated testing / QA     -> qa
Pre-production validation  -> stage
Production                 -> prod
```

Application code must not hard-code Neon endpoint hostnames.

Production mutations are real production operations and must never be used as test operations.

---

# 27. Reset and Seed Operations

Resetting and seeding are privileged development/testing mutations and are governed by `/docs/database.md`.

Reset/seed tooling MUST refuse to operate against `prod`.

QA should support repeatable reset/seed scenarios.

Development reset/seed may be supported where useful.

Stage should normally be treated as production-like rather than as a disposable reset target.

Resetting test data must not erase migration history or required database configuration.

---

# 28. Administrative Mutations

Administrative or moderation mutations require explicit server-side authorization.

The presence of an admin UI is not proof of authorization.

Administrative endpoints/actions should verify the authenticated user's actual Signal One permissions before performing the operation.

High-impact administrative actions should be designed deliberately and may require additional auditing or confirmation as the product evolves.

---

# 29. Auditability

Not every mutation requires a permanent audit log.

However, when a mutation is security-sensitive, moderation-sensitive, financially significant, or operationally important, consider whether Signal One needs to retain:

- Who performed it
- What changed
- When it changed
- Relevant prior/new state
- Reason/context where appropriate

Audit requirements should be established from real product needs rather than adding universal logging to every table.

---

# 30. File and External-Service Mutations

If a feature later mutates data in an external service, object store, email system, notification system, or other infrastructure, database consistency must be considered.

A PostgreSQL transaction cannot automatically roll back an external service call.

Multi-system workflows should be designed explicitly when introduced.

Do not pretend a database transaction provides atomicity across unrelated external services.

---

# 31. Secrets

Mutation code MUST NOT expose:

- `DATABASE_URL`
- Database passwords
- Clerk secret keys
- Private API credentials
- Internal service credentials
- Other privileged secrets

Secrets belong in server-side environment configuration.

Never commit them to source control.

Never return them in mutation responses.

---

# 32. Logging

Mutation logging should provide useful diagnostic context without exposing secrets or unnecessary private data.

Do not log entire request payloads by default when they may contain sensitive information.

Logs should make it possible to investigate failures while respecting data boundaries.

---

# 33. Testing Mutations

Important business mutations should be testable below the UI layer.

Testing may include:

- Validation tests
- Authorization tests
- Business-rule tests
- Data-access integration tests
- Transaction behavior
- API tests
- Server Action tests where appropriate
- Web/Mobile integration behavior

Do not require duplicated end-to-end tests on every client to prove a server-side rule that can be tested directly at its authoritative layer.

Production MUST NOT be used as the test database.

---

# 34. API Compatibility

Mutation API changes must consider existing clients.

Mobile applications may not update at the same moment as the Web application.

Do not assume every installed mobile client instantly adopts a breaking API change.

Where practical, evolve contracts compatibly.

If a breaking change is necessary, its rollout must account for supported client versions.

---

# 35. Schema Evolution

A schema change should not automatically leak into mutation callers.

Where practical, service/data-access layers should absorb database changes while preserving stable application contracts.

For example:

```text
Client contract
      |
      v
Service input
      |
      v
Data mapping
      |
      v
New database structure
```

This separation helps Signal One remain moldable as the schema evolves.

---

# 36. No Client Database Mutations

The following are prohibited unless the architecture is deliberately changed:

```text
Browser -> Neon mutation
React Native -> Neon mutation
Android -> Neon mutation
iPhone -> Neon mutation
Client -> DATABASE_URL
Client -> Drizzle database connection
```

The allowed architecture is:

```text
Client
   |
   v
Signal One server/backend
   |
   v
Authorization + business logic
   |
   v
Data access
   |
   v
Drizzle
   |
   v
Neon PostgreSQL
```

This is a non-negotiable architecture and security boundary.

---

# 37. Avoid Database Leakage Into Mutation UI

Mutation UI should not need to understand:

- PostgreSQL table names
- Drizzle query syntax
- Neon branch details
- Migration files
- Database credentials
- Internal persistence-only fields

The UI should express user intent through an application contract.

Example conceptually:

```text
"Update event details"
```

rather than:

```text
"Update these PostgreSQL columns"
```

The server translates application intent into persistence behavior.

---

# 38. Claude Mutation Checklist

Before implementing a mutation, Claude MUST determine:

1. What user/application intent does the mutation represent?
2. Is authentication required?
3. What is the trusted source of identity?
4. What authorization rule applies?
5. What input must be validated?
6. Which fields are client-controlled?
7. Which fields are server-controlled?
8. What business rules apply?
9. Is there an existing service/data helper to reuse?
10. Does the operation require a transaction?
11. Could duplicate execution cause a problem?
12. Are concurrent edits relevant?
13. What explicit result should be returned?
14. What cache/data must be refreshed?
15. Does Web need a Server Action adapter?
16. Does Mobile need an API adapter?
17. Can both adapters reuse the same authoritative operation?
18. Does the mutation require a schema migration?
19. Which database environment is targeted?
20. Could any code path affect `prod` unintentionally?
21. Does the implementation preserve API/mobile compatibility?
22. Does it comply with `/docs/architecture-rules.md`, `/docs/database.md`, and `/docs/data-fetching.md`?

Claude MUST stop and identify a conflict if the requested implementation would violate established architecture.

---

# 39. Guiding Principle

Clients express intent.

The server decides whether that intent is valid and authorized.

The data layer persists the approved result.

Prefer:

```text
Client intent
     |
     v
Trusted server boundary
     |
     v
Authentication + validation + authorization
     |
     v
Shared business behavior
     |
     v
Data-access helper
     |
     v
Drizzle
     |
     v
Neon PostgreSQL
```

Web, Android, and iPhone may have different interfaces.

They must not have different authoritative rules for the same Signal One operation.
