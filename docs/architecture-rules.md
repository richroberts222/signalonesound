# Signal One Architecture Rules

## Purpose

This document defines the architectural rules and compatibility requirements for Signal One.

The goal is to allow Claude Code to design and implement the application while preserving a coherent architecture across all supported clients and services.

Signal One will support:

* Web
* Android
* iPhone

The architecture must be designed as **one platform with multiple clients**, not as three independent applications.

---

# 1. Architectural Authority

This document is the governing high-level architecture document for Signal One.

Before introducing, replacing, or significantly modifying an architectural component, Claude MUST:

1. Read this document.
2. Identify all affected architectural layers.
3. Check compatibility with Web, Android, and iPhone.
4. Check compatibility with authentication, API, database, shared code, testing, and deployment.
5. Check existing documentation in `/docs`.
6. Identify conflicts before implementing the change.

Claude MUST NOT make an architectural decision solely because it works for the current client or feature being implemented.

If an architectural change creates a compatibility problem, Claude MUST STOP and explain:

* What conflicts
* Which components are affected
* Why the conflict exists
* What alternatives are available

Claude should not silently introduce an incompatible architecture.

---

# 2. Core Architecture

Signal One is a multi-client application consisting of:

```text
                         SIGNAL ONE
                              |
             +----------------+----------------+
             |                |                |
            WEB             API            MOBILE
          Next.js         Backend        React Native
                                             / Expo
                                             |
                                      Android + iPhone
             |                |                |
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
```

The exact implementation may evolve, but the architectural boundaries must remain clear.

---

# 3. Web Application

The web application will use Next.js.

The web application may contain:

* Web UI
* Web routing
* Server Components where appropriate
* Server-side functionality
* API endpoints where appropriate
* Authentication integration
* Web-specific presentation logic

Next.js is the web application framework.

Next.js-specific functionality MUST NOT become an unnecessary dependency for the mobile applications.

---

# 4. Mobile Applications

Signal One will support:

* Android
* iPhone

The mobile applications will use React Native, with Expo considered the standard mobile development/tooling approach unless a documented architectural reason requires otherwise.

Mobile applications are clients of the Signal One backend.

Mobile applications MUST NOT directly access the production database.

Mobile applications MUST NOT contain duplicated copies of server-side business logic when that logic belongs in the backend.

Platform-specific functionality may be implemented where Android and iPhone require different behavior.

Shared mobile functionality should be reused where practical.

---

# 5. Backend / API

The backend provides the controlled communication boundary between clients and server-side data and business logic.

The API must be designed so that:

```text
Web --------\
              \
Android -------> Signal One API ---> Data Layer ---> Neon
              /
iPhone -------/
```

The API must not be designed solely around the needs of the web application if mobile clients will also consume it.

API contracts must remain usable by:

* Web
* Android
* iPhone

API changes must consider backward compatibility with existing clients.

Where appropriate, API responses and requests should use shared schemas/types so that clients have a consistent understanding of the data.

---

# 6. Authentication

Clerk will be the authentication and identity system unless a documented architectural decision changes this.

Authentication must work across:

* Web
* Android
* iPhone
* API

The API MUST validate authenticated requests.

The mobile applications MUST NOT implement a separate independent user identity system.

User identity should originate from the same authentication architecture across all clients.

Authentication implementation details should be documented separately in `/docs/auth.md`.

---

# 7. Database

Neon PostgreSQL will be the primary application database unless a documented architectural decision changes this.

Drizzle ORM will provide the server-side database access layer unless a documented architectural decision changes this.

The architecture should follow:

```text
Client
  |
 API
  |
Drizzle
  |
Neon PostgreSQL
```

Clients MUST NOT connect directly to Neon.

Database credentials and privileged database access MUST remain server-side.

Database schema changes must consider:

* Existing data
* Migrations
* API compatibility
* Web compatibility
* Android compatibility
* iPhone compatibility
* Automated testing

Database reset and test-data workflows must be documented so that the database can be safely returned to a known testing state without destroying required development configuration or migrations.

---

# 8. Shared Code and Contracts

Where practical, Signal One should share common contracts between Web, Android, and iPhone.

Potential shared resources include:

* TypeScript types
* API schemas
* Validation schemas
* Data models
* Constants
* Shared business rules that are safe to execute client-side

Shared code MUST NOT create inappropriate dependencies between clients.

Server-only code, secrets, database access, and privileged operations must never be exposed to client applications merely for the purpose of code reuse.

---

# 9. Business Logic

Business rules that must remain consistent across clients should be centralized whenever practical.

The architecture should avoid having:

```text
Web business logic
Android business logic
iPhone business logic
```

that independently implement the same server-side rule.

Instead, prefer:

```text
                 Shared Backend Logic
                         |
             +-----------+-----------+
             |           |           |
            Web       Android      iPhone
```

Client-side logic may exist for presentation, interaction, caching, validation, and platform-specific behavior, but server-authoritative rules belong on the server.

---

# 10. UI Architecture

Web and mobile do not need to look identical.

They should share:

* Product concepts
* Data
* Business rules
* API contracts
* Authentication
* Design principles where appropriate

They may have different:

* Navigation
* Layouts
* Controls
* Interaction patterns
* Responsive behavior
* Platform-specific UI

Do not force web UI patterns onto mobile merely to maximize code reuse.

Do not duplicate backend architecture merely because the UI is different.

---

# 11. Styling

The web application may use the styling architecture established by the Signal One web stack, including Tailwind CSS where appropriate.

Mobile styling must use an approach appropriate for React Native.

Web-specific styling libraries MUST NOT become mandatory dependencies of the mobile application unless explicitly determined to be compatible with the mobile architecture.

Shared design tokens may be used where practical.

---

# 12. Deployment

Web and server-side functionality may be deployed through Vercel.

Vercel deployment must remain compatible with the Next.js and API architecture.

Mobile applications have separate build and distribution requirements for:

* Google Play / Android
* Apple App Store / iPhone

Mobile deployment must not require the production web deployment to be rebuilt or manually modified merely to release a mobile version unless there is a documented reason.

---

# 13. Environment Configuration

Environment variables and secrets must be separated according to where they are required.

Never expose:

* Database credentials
* Server secrets
* Private API credentials
* Authentication secrets
* Other privileged credentials

to client applications.

Web/server environment configuration and mobile environment configuration must be treated separately.

---

# 14. Testing

Testing must consider the complete platform.

When an architectural change affects multiple clients, Claude should determine which tests are required for:

* Web
* API
* Android
* iPhone
* Database
* Authentication

Tests should verify important shared behavior at the appropriate architectural layer rather than unnecessarily duplicating identical tests in every client.

The database must support reliable test-data setup and reset procedures.

---

# 15. Git and Pull Requests

GitHub is the source-control system.

Development should use branches and Pull Requests rather than making significant unreviewed changes directly to `main`.

Claude Code should:

1. Understand the issue/request.
2. Inspect the existing architecture and documentation.
3. Make changes on the appropriate branch.
4. Commit changes with an appropriate commit message.
5. Push the branch.
6. Create or update the Pull Request as appropriate.
7. Allow automated checks to run.
8. Report relevant results.

`main` represents the integrated application state.

Changes should be reviewed and merged through Pull Requests.

---

# 16. Vercel Preview Deployments

Pull Requests should use Vercel preview deployments where applicable.

The preview environment provides an opportunity to test web-facing changes before they are merged into `main`.

A successful build or deployment does NOT by itself prove architectural compatibility.

Claude must still evaluate architectural impact.

---

# 17. Documentation-First Development

Before implementing a significant feature or architectural change, Claude MUST consult the relevant documentation in `/docs`.

Documentation is part of the architecture.

If existing documentation conflicts with the actual implementation, Claude should identify the discrepancy rather than silently choosing one.

When an architectural decision changes, the relevant documentation must be updated.

---

# 18. Compatibility Check

Before completing an architectural change, Claude should perform the following check:

```text
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
```

Not every change will affect every item.

Claude should identify which items are affected and verify those areas rather than performing unnecessary work.

---

# 19. Architectural Changes

Claude MUST NOT introduce a new major framework, service, database, authentication system, API architecture, or architectural pattern solely because it is convenient for a particular feature.

Before introducing a significant new dependency, Claude should determine:

* Why it is needed
* What problem it solves
* Whether the existing architecture already solves the problem
* Web compatibility
* Android compatibility
* iPhone compatibility
* Backend compatibility
* Deployment implications
* Testing implications
* Long-term maintenance implications

If the change materially alters the architecture, it should be documented before implementation.

---

# 20. Principle: One Platform, Multiple Clients

The most important architectural principle is:

> **Signal One is one platform with multiple clients, not three separate applications.**

Web, Android, and iPhone should provide different user experiences where appropriate while sharing the same underlying:

* Identity
* Backend
* API contracts
* Data
* Authoritative business rules
* Architectural principles

The architecture should allow any supported client to evolve without unnecessarily breaking the others.

---

# 21. Claude's Responsibility

Claude is responsible for implementing the architecture, but must preserve the architecture while doing so.

Claude should prefer:

1. Existing documented patterns
2. Existing project conventions
3. Reusable solutions
4. Shared contracts
5. Clear architectural boundaries
6. The simplest solution that preserves compatibility

Claude must ask for clarification or stop for architectural review when a requested change cannot be implemented without making a significant architectural decision that has not yet been established.

**Do not optimize one part of Signal One at the expense of the platform as a whole.**