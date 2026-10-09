# Signal One Architecture Rules

## Purpose

This document defines the architectural rules and compatibility requirements for Signal One.

The goal is to allow Claude Code to design and implement the application while preserving a coherent architecture across all supported clients and services.

Signal One will support:

\* Web

\* Android

\* iPhone

The architecture must be designed as **\*\*one platform with multiple clients\*\***, not as three independent applications.

**---**

# 1. Architectural Authority

This document is the governing high-level architecture document for Signal One.

Before introducing, replacing, or significantly modifying an architectural component, Claude MUST:

1\. Read this document.

2\. Identify all affected architectural layers.

3\. Check compatibility with Web, Android, and iPhone.

4\. Check compatibility with authentication, API, database, shared code, testing, and deployment.

5\. Check existing documentation in \`/docs\`.

6\. Identify conflicts before implementing the change.

Claude MUST NOT make an architectural decision solely because it works for the current client or feature being implemented.

If an architectural change creates a compatibility problem, Claude MUST STOP and explain:

\* What conflicts

\* Which components are affected

\* Why the conflict exists

\* What alternatives are available

Claude should not silently introduce an incompatible architecture.

**---**

# 2. Core Architecture

Signal One is a multi-client application consisting of:

\`\`\`text

                         SIGNAL ONE

                              |

             +----------------+----------------+

             |                |                |

            WEB             API            MOBILE

          Next.js         Backend        React Native

                                             / Expo

                                             |

                                      Android + iPhone

             |                |                |

             +----------------+----------------+

                              |

                     Authentication

                          Clerk

                              |

                         Data Layer

                    Drizzle ORM

                              |

                       PostgreSQL

                           Neon

\`\`\`

The exact implementation may evolve, but the architectural boundaries must remain clear.

**---**

# 3. Web Application

The web application will use Next.js.

The web application may contain:

\* Web UI

\* Web routing

\* Server Components where appropriate

\* Server-side functionality

\* API endpoints where appropriate

\* Authentication integration

\* Web-specific presentation logic

Next.js is the web application framework.

Next.js-specific functionality MUST NOT become an unnecessary dependency for the mobile applications.

**---**

# 4. Mobile Applications

Signal One will support:

\* Android

\* iPhone

The mobile applications will use React Native, with Expo considered the standard mobile development/tooling approach unless a documented architectural reason requires otherwise.

Mobile applications are clients of the Signal One backend.

Mobile applications MUST NOT directly access the production database.

Mobile applications MUST NOT contain duplicated copies of server-side business logic when that logic belongs in the backend.

Platform-specific functionality may be implemented where Android and iPhone require different behavior.

Shared mobile functionality should be reused where practical.

**---**

# 5. Backend / API

The backend provides the controlled communication boundary between clients and server-side data and business logic.

The API must be designed so that:

\`\`\`text

Web --------\\

              \\

Android -------> Signal One API ---> Data Layer ---> Neon

              /

iPhone -------/

\`\`\`

The API must not be designed solely around the needs of the web application if mobile clients will also consume it.

API contracts must remain usable by:

\* Web

\* Android

\* iPhone

API changes must consider backward compatibility with existing clients.

Where appropriate, API responses and requests should use shared schemas/types so that clients have a consistent understanding of the data.

**---**

# 6. Authentication

Clerk will be the authentication and identity system unless a documented architectural decision changes this.

Authentication must work across:

\* Web

\* Android

\* iPhone

\* API

The API MUST validate authenticated requests.

The mobile applications MUST NOT implement a separate independent user identity system.

User identity should originate from the same authentication architecture across all clients.

Authentication implementation details should be documented separately in \`/docs/auth.md\`.

**---**

# 7. Database

Neon PostgreSQL will be the primary application database unless a documented architectural decision changes this.

Drizzle ORM will provide the server-side database access layer unless a documented architectural decision changes this.

The architecture should follow:

\`\`\`text

Client

  |

 API

  |

Drizzle

  |

Neon PostgreSQL

\`\`\`

Clients MUST NOT connect directly to Neon.

Database credentials and privileged database access MUST remain server-side.

Database schema changes must consider:

\* Existing data

\* Migrations

\* API compatibility

\* Web compatibility

\* Android compatibility

\* iPhone compatibility

\* Automated testing

Database reset and test-data workflows must be documented so that the database can be safely returned to a known testing state without destroying required development configuration or migrations.

**---**

# 8. Shared Code and Contracts

Where practical, Signal One should share common contracts between Web, Android, and iPhone.

Potential shared resources include:

\* TypeScript types

\* API schemas

\* Validation schemas

\* Data models

\* Constants

\* Shared business rules that are safe to execute client-side

Shared code MUST NOT create inappropriate dependencies between clients.

Server-only code, secrets, database access, and privileged operations must never be exposed to client applications merely for the purpose of code reuse.

**---**

# 9. Business Logic

Business rules that must remain consistent across clients should be centralized whenever practical.

The architecture should avoid having:

\`\`\`text

Web business logic

Android business logic

iPhone business logic

\`\`\`

that independently implement the same server-side rule.

Instead, prefer:

\`\`\`text

                 Shared Backend Logic

                         |

             +-----------+-----------+

             |           |           |

            Web       Android      iPhone

\`\`\`

Client-side logic may exist for presentation, interaction, caching, validation, and platform-specific behavior, but server-authoritative rules belong on the server.

**---**

# 10. UI Architecture

Web and mobile do not need to look identical.

They should share:

\* Product concepts

\* Data

\* Business rules

\* API contracts

\* Authentication

\* Design principles where appropriate

They may have different:

\* Navigation

\* Layouts

\* Controls

\* Interaction patterns

\* Responsive behavior

\* Platform-specific UI

Do not force web UI patterns onto mobile merely to maximize code reuse.

Do not duplicate backend architecture merely because the UI is different.

**---**

# 11. Styling

The web application may use the styling architecture established by the Signal One web stack, including Tailwind CSS where appropriate.

Mobile styling must use an approach appropriate for React Native.

Web-specific styling libraries MUST NOT become mandatory dependencies of the mobile application unless explicitly determined to be compatible with the mobile architecture.

Shared design tokens may be used where practical.

**---**

# 12. Deployment

Web and server-side functionality may be deployed through Vercel.

Vercel deployment must remain compatible with the Next.js and API architecture.

Mobile applications have separate build and distribution requirements for:

\* Google Play / Android

\* Apple App Store / iPhone

Mobile deployment must not require the production web deployment to be rebuilt or manually modified merely to release a mobile version unless there is a documented reason.

**---**

# 13. Environment Configuration

Environment variables and secrets must be separated according to where they are required.

Never expose:

\* Database credentials

\* Server secrets

\* Private API credentials

\* Authentication secrets

\* Other privileged credentials

to client applications.

Web/server environment configuration and mobile environment configuration must be treated separately.

**---**

# 14. Testing

Testing must consider the complete platform.

When an architectural change affects multiple clients, Claude should determine which tests are required for:

\* Web

\* API

\* Android

\* iPhone

\* Database

\* Authentication

Tests should verify important shared behavior at the appropriate architectural layer rather than unnecessarily duplicating identical tests in every client.

The database must support reliable test-data setup and reset procedures.

**---**

# 15. Git and Pull Requests

GitHub is the source-control system.

Development should use branches and Pull Requests rather than making significant unreviewed changes directly to \`main\`.

Claude Code should:

1\. Understand the issue/request.

2\. Inspect the existing architecture and documentation.

3\. Make changes on the appropriate branch.

4\. Commit changes with an appropriate commit message.

5\. Push the branch.

6\. Create or update the Pull Request as appropriate.

7\. Allow automated checks to run.

8\. Report relevant results.

\`main\` represents the integrated application state.

Changes should be reviewed and merged through Pull Requests.

**---**

# 16. Vercel Preview Deployments

Pull Requests should use Vercel preview deployments where applicable.

The preview environment provides an opportunity to test web-facing changes before they are merged into \`main\`.

A successful build or deployment does NOT by itself prove architectural compatibility.

Claude must still evaluate architectural impact.

**---**

# 17. Documentation-First Development

Before implementing a significant feature or architectural change, Claude MUST consult the relevant documentation in \`/docs\`.

Documentation is part of the architecture.

If existing documentation conflicts with the actual implementation, Claude should identify the discrepancy rather than silently choosing one.

When an architectural decision changes, the relevant documentation must be updated.

**---**

# 18. Compatibility Check

Before completing an architectural change, Claude should perform the following check:

\`\`\`text

SIGNAL ONE ARCHITECTURE COMPATIBILITY CHECK

[ ] Web compatibility

[ ] Android compatibility

[ ] iPhone compatibility

[ ] API compatibility

[ ] Clerk authentication compatibility

[ ] Neon database compatibility

[ ] Drizzle compatibility

[ ] Shared-code compatibility

[ ] Business-logic compatibility

[ ] Testing compatibility

[ ] Vercel compatibility

[ ] Mobile build/deployment compatibility

[ ] Environment/secrets compatibility

[ ] Existing documentation compatibility

[ ] Existing application compatibility

\`\`\`

Not every change will affect every item.

Claude should identify which items are affected and verify those areas rather than performing unnecessary work.

**---**

# 19. Architectural Changes

Claude MUST NOT introduce a new major framework, service, database, authentication system, API architecture, or architectural pattern solely because it is convenient for a particular feature.

Before introducing a significant new dependency, Claude should determine:

\* Why it is needed

\* What problem it solves

\* Whether the existing architecture already solves the problem

\* Web compatibility

\* Android compatibility

\* iPhone compatibility

\* Backend compatibility

\* Deployment implications

\* Testing implications

\* Long-term maintenance implications

If the change materially alters the architecture, it should be documented before implementation.

**---**

# 20. Principle: One Platform, Multiple Clients

The most important architectural principle is:

\> **\*\*Signal One is one platform with multiple clients, not three separate applications.\*\***

Web, Android, and iPhone should provide different user experiences where appropriate while sharing the same underlying:

\* Identity

\* Backend

\* API contracts

\* Data

\* Authoritative business rules

\* Architectural principles

The architecture should allow any supported client to evolve without unnecessarily breaking the others.

**---**

# 21. Claude's Responsibility

Claude is responsible for implementing the architecture, but must preserve the architecture while doing so.

Claude should prefer:

1\. Existing documented patterns

2\. Existing project conventions

3\. Reusable solutions

4\. Shared contracts

5\. Clear architectural boundaries

6\. The simplest solution that preserves compatibility

Claude must ask for clarification or stop for architectural review when a requested change cannot be implemented without making a significant architectural decision that has not yet been established.

**\*\*Do not optimize one part of Signal One at the expense of the platform as a whole.\*\***

---

# 22. Database Environments and Portability

Signal One uses separate Neon PostgreSQL branches/environments for development, quality assurance, staging, and production.

The intended environment mapping is:

```text
Local development        -> dev
Automated testing / QA   -> qa
Pre-production staging   -> stage
Production               -> prod
```

The Neon project currently uses a default production branch; if its human-readable name differs from `prod`, it still represents the production environment until deliberately renamed or remapped.

These environments MUST remain logically isolated. Code, configuration, migrations, test data, and automation must target the intended environment explicitly.

Production is protected. Reset, destructive seed, bulk test-data generation, schema experimentation, and automated destructive testing MUST NOT run against the production environment. Safety checks should fail closed when the target environment cannot be confidently identified.

`dev` is intended for active development and local application development.

`qa` is intended for repeatable testing, automation, reset, and controlled seed data.

`stage` is intended for production-like validation before production release and should remain as close to production behavior and configuration as practical without using real production data or credentials unnecessarily.

`prod` is intended for real production users and application data.

Neon is the current PostgreSQL hosting provider, but application architecture MUST avoid unnecessary Neon-specific coupling. Database access should remain behind the server-side data-access boundary so that another compatible PostgreSQL host can be adopted later without rewriting client applications or business logic.

Environment-specific database connection strings and credentials MUST be supplied through server-side environment configuration and MUST NOT be hard-coded or committed to source control.

---

# 23. Database Schema and Migration Ownership

Drizzle ORM is the authoritative application-level mechanism for defining and accessing the PostgreSQL schema unless a documented architectural decision changes this.

Schema changes MUST be deliberate, versioned, reviewable, and compatible with the migration strategy documented in `/docs/database.md`.

Manual production schema changes should be avoided when the same change belongs in the versioned Drizzle schema/migration history.

Database migrations must be evaluated for compatibility with existing data, API contracts, web, mobile, authentication, testing, staging, and production deployment.

Schema evolution should prefer backward-compatible transitions where practical so independently deployed clients are not unnecessarily broken.

Reset and seed tooling MUST preserve migration history and MUST NOT substitute destructive recreation for a proper migration strategy.

---

# 24. Application Layer Boundaries

Signal One should preserve the following logical flow for server-authoritative application operations:

```text
Web / Mobile Clients
        |
        v
API / Server Boundary
        |
        v
Business / Service Logic
        |
        v
Data-Access Layer
        |
        v
Drizzle ORM
        |
        v
PostgreSQL / Neon
```

These are architectural responsibilities, not a requirement to create unnecessary abstraction or boilerplate for every trivial operation.

UI components MUST NOT directly import or invoke privileged database connections, Drizzle database clients, Neon credentials, or server-only data-access implementations.

Database queries and mutations must be centralized through documented server-side data-access patterns rather than scattered throughout UI components or unrelated application code.

Business rules that determine authorization, ownership, permissions, state transitions, or other server-authoritative behavior MUST be enforced on the server even when equivalent client-side validation exists for user experience.

Interfaces and abstractions should be introduced where they establish a meaningful architectural boundary or make an external dependency replaceable. Claude MUST NOT create abstraction layers merely for abstraction's sake.

---

# 25. Identity and Application Data

Clerk remains the source of truth for authentication and user identity. PostgreSQL MUST NOT duplicate Clerk's password or authentication-credential responsibilities.

When Signal One data belongs to, was created by, or must be authorized against a user, server-side code may persist the relevant Clerk user identifier in the appropriate application data model.

Not every database table requires a Clerk user identifier. Relationships should be normalized and ownership identifiers should exist only where required by the domain model, authorization rules, or efficient querying.

Authenticated operations must derive trusted user identity from the server-side Clerk authentication context. Clients MUST NOT be trusted merely because they submit a user ID in a request.

The detailed identity-to-data access pattern must be documented in `/docs/auth.md`, `/docs/database.md`, `/docs/data-fetching.md`, and `/docs/data-mutations.md` as applicable.

---

# 26. Shared Contracts and Parallel Client Development

Web and mobile development should proceed against shared application contracts rather than independently inventing representations of the same backend capability.

When a feature changes an API request, API response, validation schema, shared data model, or server-authoritative business rule, Claude MUST evaluate the effect on every client that consumes that contract before completing the change.

Shared contracts may include TypeScript types, validation schemas, request/response schemas, identifiers, enums, constants, and other platform-neutral definitions.

Web and mobile UI implementations remain separate where platform requirements differ. Shared contracts MUST NOT force React web components, Next.js-specific code, Tailwind-specific code, React Native components, or platform-specific presentation logic into a shared package.

The goal is shared meaning and behavior, not forced UI code reuse.

---

# 27. Data Safety, Reset, and Seed Rules

Signal One must support deterministic development and QA data workflows.

Reset and seed tooling should make it possible to return `dev` and especially `qa` to known states for development, demonstrations, and automated testing.

Destructive reset/seed operations MUST contain explicit environment guards. They MUST refuse to operate against `prod`, and should refuse to proceed when the environment cannot be confidently identified.

Staging data should be managed deliberately. `stage` should not be treated as a disposable QA database unless a documented workflow explicitly permits a particular reset operation.

Seed data must not require hard-coded production secrets or production user credentials.

The detailed reset, seed, branching, and migration procedures belong in `/docs/database.md`.

---

# 28. Detailed Data Documentation

This document defines high-level architectural boundaries. Detailed implementation rules MUST be maintained in the appropriate focused documents rather than duplicated here.

At minimum:

* `/docs/database.md` defines Neon environments/branches, Drizzle configuration, schema conventions, migrations, connection handling, portability, reset, and seed procedures.
* `/docs/data-fetching.md` defines approved server-side read/query patterns, authentication/authorization requirements, data-access helpers, and client/server boundaries for fetching data.
* `/docs/data-mutations.md` defines approved create/update/delete patterns, validation, authorization, transactions where required, data-access helpers, and client/server boundaries for mutations.

If a focused document conflicts with this architecture document, this document governs unless an explicit architectural decision updates the authority relationship. Claude MUST report the conflict rather than silently choosing one.

---

# 29. Principle: Replaceable Infrastructure, Stable Contracts

Signal One should be designed so infrastructure can evolve without forcing unnecessary rewrites across the platform.

Clients should depend on stable application/API contracts rather than database implementation details. Business logic should depend on meaningful application/data-access boundaries rather than Neon-specific behavior where practical. Data-access code may depend on Drizzle and PostgreSQL as established by this architecture.

Replaceability does NOT mean hiding every dependency behind speculative abstractions. The project should use the simplest boundary that preserves maintainability, portability, testability, and the documented architecture.

When choosing between convenience for one feature and preservation of these boundaries, Claude must preserve the platform architecture or stop for architectural review.

