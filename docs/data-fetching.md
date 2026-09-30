# Signal One Data Fetching Rules

## Purpose

This document defines the rules for reading application data in Signal One.

It is subordinate to:

- `/docs/architecture-rules.md`
- `/docs/database.md`

If this document conflicts with the governing architecture, Claude MUST stop and identify the conflict rather than silently choosing an implementation.

Signal One is one platform with multiple clients. Web, Android, and iPhone may have different presentation layers, but they should consume consistent server-authoritative data and contracts.

---

# 1. Core Read Path

The standard read path is:

```text
Web / Mobile
     |
     v
API / Server Boundary
     |
     v
Authentication + Authorization
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

Client UI code MUST NOT query Neon directly.

Client UI code MUST NOT import server-only Drizzle/database modules.

Database reads must occur on the server.

---

# 2. Web and Mobile

Signal One supports:

- Web through Next.js
- Android through React Native / Expo
- iPhone through React Native / Expo

The clients should share data contracts where practical.

They do NOT need to share the same fetching mechanism at the UI/framework level.

For example:

- A Next.js Server Component may be able to call server-side application logic directly.
- A mobile client must communicate with the backend through an authenticated API boundary.

Both paths should converge on the same authoritative business/data-access behavior rather than implementing separate database logic.

---

# 3. Server Components

For the Next.js web application, Server Components should be preferred for server-rendered data reads when they fit the feature.

A Server Component may call approved server-side service/data-access functions directly.

This does NOT mean that database queries belong inside the component.

Prefer:

```text
Server Component
      |
      v
Service / Data Helper
      |
      v
Drizzle
      |
      v
Neon
```

Avoid:

```text
Server Component
      |
      v
Inline Drizzle query
```

The purpose is to keep presentation code independent from physical database structure.

---

# 4. API Reads

Mobile clients and other network clients consume Signal One data through the backend/API.

API endpoints should:

1. Validate the request.
2. Establish authenticated identity where required.
3. Enforce authorization.
4. Invoke the appropriate business/service logic.
5. Use data-access helpers for persistence reads.
6. Return the documented API contract.

API endpoints MUST NOT trust the client merely because the client application was built by Signal One.

---

# 5. Shared Read Behavior

When Web and Mobile need the same application information, avoid implementing separate authoritative rules.

Conceptually:

```text
Web Server Component --------                                                             > Shared server behavior
                              /           |
Mobile API request ----------/            v
                                    Data Access Helper
                                           |
                                           v
                                        Drizzle
                                           |
                                           v
                                         Neon
```

The exact adapter at the outer boundary may differ, but ownership, visibility, filtering, and business rules should remain consistent.

---

# 6. Data Access Helpers

Database queries MUST be encapsulated in approved server-side data-access helpers.

Data-access helpers should have focused responsibilities, such as:

```text
getEventById(...)
listEvents(...)
listEventsForOrganizer(...)
getOrganizationById(...)
```

Names above are examples only and do not authorize creation of those domain entities before the schema is approved.

Helpers should return application-appropriate data rather than forcing UI components to understand Drizzle internals.

Do not create one giant database utility containing unrelated application queries.

Do not duplicate equivalent queries across pages, API endpoints, or clients when a reusable server-side helper is appropriate.

---

# 7. Drizzle

Drizzle ORM is the standard query layer between Signal One server code and PostgreSQL.

Database helpers should use Drizzle rather than scattered raw SQL.

Drizzle schema objects and database connection objects are server-only implementation details.

They MUST NOT be imported into browser bundles or mobile applications.

If raw SQL becomes necessary for a legitimate capability, follow the exception rules in `/docs/database.md`.

---

# 8. Authentication

Clerk is the authentication and identity authority.

When a read requires an authenticated user, the server should obtain the trusted identity from Clerk.

Do NOT rely on a client-supplied `userId` as proof of identity.

Conceptually:

```text
Client request
     |
     v
Clerk-authenticated server context
     |
     v
Trusted Clerk user ID
     |
     v
Authorization / query scope
     |
     v
Data helper
```

The authenticated user's identity should not need to be manually passed around by the browser when the server can derive it securely.

---

# 9. Authorization

Authentication answers:

```text
Who is this user?
```

Authorization answers:

```text
Is this user allowed to read this data?
```

Authorization MUST be enforced server-side.

User-owned, private, administrative, or otherwise restricted records MUST NOT be protected solely by hiding them in the UI.

Where appropriate, ownership restrictions should be incorporated into the database query itself rather than retrieving unauthorized data and filtering it afterward.

For example, conceptually prefer:

```text
Find record WHERE id = requestedId
AND owner = authenticatedUser
```

over:

```text
Fetch record by id
then hope the client should have been allowed to see it
```

Exact implementation depends on the approved schema.

---

# 10. Public Data

Some Signal One data may intentionally be public, such as publicly discoverable events or other approved public content.

Public data does not require fake ownership checks merely for consistency.

However, whether data is public or restricted is a business rule and must be deliberate.

Do not assume that a table is public simply because it is readable by one feature.

---

# 11. API Contracts

Clients should depend on stable API/application contracts rather than PostgreSQL row shapes.

A database record and an API response are not automatically the same thing.

The server may map database results into a response contract.

This allows the database schema to evolve without unnecessarily breaking Web, Android, or iPhone.

Shared TypeScript types and validation schemas may be used where appropriate to keep clients and backend consistent.

Server-only database schema definitions must remain server-only.

---

# 12. Validation

Inputs that influence a read should be validated at the appropriate server boundary.

Examples include:

- IDs
- Search parameters
- Pagination values
- Filters
- Sort options
- Dates
- Geographic/search bounds
- Enumerated values

Do not pass arbitrary client input directly into database behavior without validation.

Zod may be used where consistent with the project's validation architecture.

---

# 13. URL Search Parameters

For web pages where filters, dates, searches, sorting, or selected views should be bookmarkable/shareable, URL search parameters are preferred where appropriate.

Example:

```text
/dashboard?date=2026-09-30
```

The server can read the validated parameter and fetch the corresponding data.

This can provide:

- Refresh-safe state
- Bookmarkable state
- Shareable state
- Server-rendered data for the selected view
- Cleaner separation between client interaction and server fetching

Do not force every transient UI state into the URL. Use this pattern when the state meaningfully represents the requested resource/view.

---

# 14. Date and Time Handling

Date/time values must be handled deliberately.

Do not rely on accidental JavaScript timezone conversion behavior.

When a value represents a calendar date rather than a moment in time, preserve that distinction in the contract and database design.

When a value represents an actual timestamp, use an appropriate timezone-aware representation.

Client display formatting may use the user's locale/timezone, but server filtering must use clearly defined semantics.

Date-related bugs must not be fixed by arbitrary offset adjustments.

---

# 15. Loading, Empty, Error, and Unauthorized States

Every user-facing data read should consider the relevant states:

- Loading
- Success
- Empty
- Not found
- Unauthorized
- Forbidden
- Error

The exact presentation differs between Web and Mobile.

Do not treat "no records" as an application failure when an empty result is valid.

Do not expose sensitive database errors or internal implementation details to clients.

---

# 16. Error Handling

Database and server errors should be handled at the appropriate boundary.

Internal logs may contain diagnostic context, but user-facing responses should expose only appropriate information.

Do not leak:

- Database credentials
- Connection strings
- Raw SQL
- Internal stack details
- Private user data
- Sensitive provider responses

Errors should preserve enough structured meaning for clients to present appropriate states without coupling clients to database internals.

---

# 17. Pagination

Potentially large collections should not assume that all records can always be returned at once.

When a dataset can grow materially, use an appropriate pagination strategy.

The chosen strategy should consider:

- Stable ordering
- Filtering
- Indexes
- API usability
- Mobile network cost
- Web rendering behavior

Do not add pagination complexity to tiny bounded datasets without a reason, but do not design unbounded list APIs that will become unsafe as Signal One grows.

---

# 18. Filtering and Sorting

Filtering and sorting should be performed server-side when they affect which records should be returned from a potentially meaningful dataset.

Clients may perform presentation-only sorting/filtering on small data already legitimately loaded, but this must not become a substitute for authorization or efficient database querying.

Supported filters and sorts should be explicit rather than allowing arbitrary database fields from client input.

---

# 19. Search

Search behavior should be implemented behind stable application contracts.

Clients should not need to know whether search is implemented through:

- PostgreSQL capabilities
- Indexes
- A future dedicated search service
- Another approved backend mechanism

If search infrastructure changes later, preserve client contracts where practical.

---

# 20. Caching

Caching must not weaken authorization or return one user's private data to another user.

Before caching authenticated or user-specific data, determine:

- Who owns the cached result
- What key uniquely identifies the result
- How long it may remain valid
- How it is invalidated
- Whether framework-level caching is appropriate

Do not enable caching merely for performance without considering correctness.

Public data and private data may require different caching policies.

---

# 21. Freshness

Each feature should have an intentional freshness model.

Some data can be cached.

Some data should be read fresh.

Some data should be refreshed after a mutation.

Do not assume that every read must always bypass caching, and do not assume that every read can safely be cached.

The feature's business requirements determine freshness.

---

# 22. Avoiding N+1 Queries

Data-access code should avoid unnecessary repeated queries when a single well-designed query or controlled batch can retrieve the required information.

Do not optimize prematurely, but recognize N+1 patterns when they become apparent.

Use Drizzle relationships/joins/query capabilities where appropriate and understandable.

---

# 23. Selecting Data

Queries should retrieve the data the application actually needs.

Avoid routinely returning every column from large or sensitive records when only a subset is required.

This is especially important for:

- Private data
- Administrative data
- Large text/blob-like values
- Network API responses

Do not expose internal database fields merely because they exist.

---

# 24. Environment Rules

All database reads occur against the environment configured for the running server.

The intended environments are:

```text
Local development          -> dev
Automated testing / QA     -> qa
Pre-production validation  -> stage
Production                 -> prod
```

Code should not contain hard-coded Neon branch endpoint names.

Environment configuration determines the database target.

Preview deployment database behavior must follow the policy established in `/docs/database.md`.

---

# 25. Testability

Data fetching should be structured so business behavior can be tested without requiring UI tests for every rule.

Where useful, service/data boundaries should allow:

- Unit testing business logic
- Integration testing data access
- API testing
- Web behavior testing
- Mobile behavior testing

QA data should be deterministic enough to reproduce important scenarios.

Tests must not use production as their test-data environment.

---

# 26. Observability

Server-side data fetching should provide enough diagnostic information to troubleshoot failures without exposing secrets.

Logging should focus on useful operational context.

Do not log credentials or sensitive private data merely for convenience.

As the platform grows, observability may be expanded without changing client contracts.

---

# 27. No Client Database Access

The following are prohibited unless the architecture is deliberately changed:

```text
Browser -> Neon
React Native -> Neon
Android -> Neon
iPhone -> Neon
Client -> DATABASE_URL
Client -> Drizzle database connection
```

The allowed architecture is:

```text
Client -> Signal One server/backend -> Data layer -> Drizzle -> Neon
```

This is a non-negotiable security and architecture boundary.

---

# 28. Avoid Database Leakage Into UI

UI components should not depend on:

- PostgreSQL table names
- Column names that exist only as persistence details
- Drizzle query objects
- Neon endpoint details
- Migration details
- Database connection state

UI should consume application/domain data through stable server contracts.

This separation is what allows the database schema to evolve without forcing broad UI rewrites.

---

# 29. Claude Data-Fetching Checklist

Before implementing a new data read, Claude MUST determine:

1. Is the data public or restricted?
2. Does the operation require authentication?
3. What authorization rule applies?
4. What is the trusted source of user identity?
5. Is there an existing service/data helper that should be reused?
6. What input requires validation?
7. What contract should the caller receive?
8. Is this Web-only behavior or shared with Mobile?
9. Should a Server Component call server logic directly, or is an API boundary required?
10. Does the query need filtering, sorting, pagination, or indexing?
11. What loading/empty/error/unauthorized states are required?
12. What caching/freshness behavior is appropriate?
13. Does the implementation expose database details to a client?
14. Does the implementation comply with `/docs/architecture-rules.md` and `/docs/database.md`?

Claude MUST stop and identify a conflict if the requested implementation would violate the established architecture.

---

# 30. Guiding Principle

Data fetching should make Signal One feel like one platform even though it has multiple clients.

Prefer:

```text
Client-specific presentation
          |
          v
Stable application contract
          |
          v
Shared server-authoritative behavior
          |
          v
Reusable data-access helpers
          |
          v
Drizzle
          |
          v
Neon PostgreSQL
```

Web and Mobile may request data differently at their outermost framework boundary.

They should not develop separate truths about what the data means, who may access it, or how the backend behaves.
