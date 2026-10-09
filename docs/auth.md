# Authentication Standards

This document defines the authentication and authorization standards for Signal One.

---

## 1. Authentication Provider

Signal One uses **Clerk** as its authentication provider and user identity system.

Clerk is the single source of truth for authentication.

Signal One must not introduce a second independent authentication system unless the architecture is explicitly changed and documented.

Clerk is responsible for:

* User authentication
* Sign-in
* Sign-up
* Session management
* Identity management
* Authentication state

Signal One's backend remains responsible for application-specific authorization and business rules.

---

## 2. Multi-Client Authentication

Signal One consists of:

* Web
* Android
* iPhone
* Shared backend/API

All clients must authenticate against the same Signal One/Clerk identity system.

A user should have one Signal One identity regardless of whether they access the application from:

* Web
* Android
* iPhone

Do not create separate authentication systems or separate user identities for different clients.

---

## 3. Authentication vs Authorization

Authentication answers:

> Who is this user?

Authorization answers:

> What is this authenticated user allowed to do?

Clerk is responsible for authentication and identity.

Signal One's server-side application logic is responsible for enforcing application-specific authorization and business rules.

Clients must not be trusted to enforce authorization by themselves.

For protected operations, the backend must independently establish the authenticated user identity and enforce the applicable authorization rules.

---

## 4. Server-Side Authentication

Protected server-side functionality must verify the authenticated Clerk identity before performing protected operations.

This applies to:

* API routes
* Server-side mutations
* Protected server functionality
* Database operations performed on behalf of a user

Never rely solely on authentication state maintained by a client UI.

The server must independently verify the authenticated user for protected requests.

---

## 5. API Authentication

The Signal One API is the shared backend boundary for Web, Android, and iPhone.

Protected API endpoints must authenticate the incoming request using Clerk.

The API must:

1. Establish the authenticated Clerk user.
2. Reject unauthenticated requests to protected endpoints.
3. Apply authorization rules.
4. Perform the requested operation only after authorization succeeds.

Unauthenticated requests to protected endpoints must not reach protected business logic or database operations.

The exact Clerk API/token implementation should follow the currently supported Clerk integration for the framework and client involved.

Do not copy authentication code from an outdated example when the installed Clerk version provides a newer supported approach.

---

## 6. Database Identity

Signal One database records that represent users must have a reliable association with the corresponding Clerk identity.

The Clerk user identifier should be used as the authoritative external identity reference.

Do not create an independent authentication identity in the database that can contradict Clerk.

Application-specific user data may be stored in Neon/PostgreSQL, but authentication remains managed by Clerk.

Database access must remain server-side.

---

## 7. Client Authentication

Web, Android, and iPhone may have different authentication interfaces and user experiences.

They may use different:

* Screens
* Components
* Navigation
* Layouts
* Platform-specific UI

However, they must use the same underlying Clerk identity system.

Client applications may determine whether to display authenticated or unauthenticated UI based on their current authentication state.

Client authentication state must not replace server-side authentication checks for protected operations.

---

## 8. Client-Safe vs Server-Only Configuration

Authentication configuration must distinguish between values that are safe for client applications and values that must remain server-side.

### Client-safe

Clerk publishable/client configuration may be exposed to the appropriate client application when required by the Clerk integration.

### Server-only

Clerk secret credentials must remain server-side.

Server-only credentials must never be:

* Committed to Git
* Included in client bundles
* Stored in client source code
* Exposed through API responses
* Embedded in Android or iPhone builds

Database credentials and other privileged secrets follow the same server-only rule.

---

## 9. Environment Variables

Environment-specific configuration must be supplied through environment variables or the appropriate platform configuration mechanism.

Local development secrets belong in local environment configuration and must not be committed to the repository.

Production secrets must be configured through the appropriate deployment/platform secret management system.

Do not place actual secret values in:

* `CLAUDE.md`
* `/docs`
* Source code
* Git commits
* Pull Requests
* Issues
* README files

Example environment variable names may be documented, but actual secret values must never be documented.

The exact environment-variable names required by Clerk should follow the installed Clerk integration and current project configuration.

---

## 10. Route Protection

Protected Web routes should use the appropriate Clerk-supported route protection mechanism.

Route-level protection may prevent unauthenticated users from reaching protected pages.

However, route protection does not replace authentication checks inside protected server operations or API endpoints.

A request must still be authorized at the appropriate server boundary.

---

## 11. Authentication Components

Authentication UI should follow the conventions of the client on which it runs.

For Web:

* Use Clerk's supported Next.js integration.
* Follow the Next.js App Router architecture.
* Keep authentication-specific components organized according to the Web architecture.

For Android and iPhone:

* Use Clerk's supported React Native/Expo integration.
* Follow the Mobile architecture.
* Keep mobile authentication UI within the mobile application's structure.

Do not force Web authentication components or routing patterns onto Mobile.

---

## 12. Loading and Authentication States

Client applications must correctly handle authentication state transitions.

Where the Clerk client API exposes loading or initialization state, the application must not treat an uninitialized authentication state as definitively signed-out.

Authentication-dependent UI should distinguish between:

* Authentication state still loading/initializing
* Authenticated
* Unauthenticated

Appropriate loading or initialization UI should be provided where necessary.

---

## 13. User Data

Do not assume that every piece of user information available from Clerk should automatically be duplicated into the Signal One database.

Store application-specific user data in Signal One's database when required by the application.

When user information is synchronized between Clerk and Signal One data, the source of truth for each field must be clear.

Do not create conflicting copies of authentication-critical information.

---

## 14. Security Requirements

Claude must not:

* Implement custom password authentication.
* Store user passwords.
* Bypass Clerk authentication.
* Trust client-provided user IDs for protected operations.
* Allow a client to select another user's identity for a protected request.
* Expose Clerk secret credentials.
* Expose database credentials.
* Disable authentication checks merely to make a feature work.
* Treat client-side authorization checks as sufficient security.

For protected operations, the server must derive the authenticated identity from the authenticated request rather than trusting an arbitrary user ID supplied by the client.

---

## 15. Authentication Failures

Protected operations must fail safely.

Examples include:

* Unauthenticated request → authentication failure.
* Authenticated user without required permission → authorization failure.
* Invalid or unusable authentication state → authentication failure.

Do not expose sensitive authentication or server information in error responses.

Use the application's documented API error conventions when those conventions are established.

---

## 16. Compatibility

Any authentication change must be evaluated against the complete Signal One platform:

* Web
* Android
* iPhone
* API
* Database
* Shared code
* Deployment
* Environment configuration

A change that works for Web but prevents Mobile from using the same authentication architecture is not considered compatible.

Before introducing a significant authentication architecture change, consult:

`/docs/architecture-rules.md`

---

## 17. Documentation and Version Compatibility

Authentication libraries and integrations may change over time.

Claude must use the Clerk integration appropriate to the versions actually installed in the project.

Do not assume that an example written for an older Clerk version remains the correct implementation.

When an authentication implementation depends on a significant Clerk-specific architectural decision, document that decision appropriately.

---

## 18. Authentication Checklist

Before completing a significant authentication-related change, Claude should verify:

* Is Clerk still the single authentication provider?
* Does the implementation work with the Signal One multi-client architecture?
* Is authentication verified at the server boundary?
* Is authorization enforced server-side?
* Are protected API endpoints authenticated?
* Are client-provided identities treated as untrusted?
* Are server secrets kept server-side?
* Are database credentials kept server-side?
* Are environment-specific secrets excluded from Git?
* Does the change preserve Web compatibility?
* Does the change preserve Android compatibility?
* Does the change preserve iPhone compatibility?
* Does the change remain consistent with `/docs/architecture-rules.md`?

If a significant authentication decision cannot be resolved from the existing documentation, Claude should identify the decision rather than silently inventing a new authentication architecture.

---

## 19. Account lifecycle

Accounts end, change and are suspended outside the application (in Clerk), so the application learns about it through events and keeps its own data in step.

* **Deletion.** When a user deletes their account (including the in-app deletion that the app stores require), every row they own is deleted or anonymized according to its declared deletion path in `/docs/data-inventory.md`. The same path serves a deletion request received any other way. Deleting a user in Clerk without removing the application's data is a defect.
* **Events.** Clerk `user.deleted` and `user.updated` (and suspension) events arrive as webhooks, verified by signature, idempotent and safe to replay (`/docs/integrations.md`). The handler calls the same service as in-app deletion; it never deletes directly.
* **Export.** A user can request a copy of their data, produced from the inventory (`/docs/risk-and-legal.md`).
* **Declared at design time.** Every table with an owner column states its deletion behavior (the data inventory test enforces that it is declared). The webhook handler, deletion service and export are built with the first user-owned table; they are a launch gate (F-AUTH-003, F-DATA-009).

Status: rule decided, enforcement of the declaration built, handler and service not built.

## Appendix: Web Clerk Implementation

Implemented in `apps/web` with `@clerk/nextjs` v7 (Clerk Core 3), Next.js 16 App Router. Mobile authentication and database user storage are not yet implemented. The API adapter accepts a Clerk bearer token (`lib/api/route.ts`), but no mobile client has sent one yet. Clerk instance type per environment: development for local, Preview and Production today (no production Clerk instance exists yet).

### Files

* `apps/web/proxy.ts`: `clerkMiddleware()`. Next.js 16 uses `proxy.ts` (formerly `middleware.ts`). Protects `/dashboard(.*)`, `/account(.*)`, `/admin(.*)`, and `/proof(.*)` with `auth.protect()`; all other routes are public. `proxy.test.ts` guards this list.
* `apps/web/app/layout.tsx`: wraps the app in `<ClerkProvider>` (sign-in URL `/sign-in`, sign-up URL `/sign-up`) and renders `AppShell`.
* `apps/web/components/shell/app-header.tsx`: global header (rendered by `AppShell`) using `<Show when="signed-in">` / `<Show when="signed-out">` (Core 3 replacement for `SignedIn`/`SignedOut`), `SignInButton`, `SignUpButton`, `UserButton`.
* `apps/web/app/sign-in/[[...sign-in]]/page.tsx` and `apps/web/app/sign-up/[[...sign-up]]/page.tsx`: Clerk `<SignIn />` / `<SignUp />` with path routing.
* `apps/web/app/page.tsx`: public home page showing signed-in/signed-out state.
* `apps/web/app/dashboard/page.tsx`: protected page. Server-side `currentUser()` displays the user's name, email, and avatar; `SignOutButton` signs out and redirects to `/`.
* `apps/web/lib/clerk-appearance.ts`: maps Clerk's `appearance.variables` to the shadcn/ui CSS variables in `globals.css`, so Clerk UI follows the Signal One theme.
* `apps/web/components/ui/card.tsx`, `avatar.tsx`: added via the shadcn CLI.

### Environment variables

* `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: client-safe.
* `CLERK_SECRET_KEY`: server-only. Never commit it.

Locally, set both in `apps/web/.env.local` (gitignored). On Vercel, set both for Development, Preview, and Production. Preview deployments use the same variables; a Clerk development instance (`pk_test_`/`sk_test_` keys) works on `*.vercel.app` preview URLs, while production keys require a production Clerk instance on a configured domain.

### Notes

* Route protection in `proxy.ts` does not replace server-side checks. API routes use `apiRoute` with its `auth` option (`docs/api.md`), which rejects unauthenticated requests; mutations must go through the same boundary.
* The build succeeds without Clerk env vars because all routes are dynamically rendered; runtime requests need the keys.

### Server-side auth and authorization helpers

Implemented in `apps/web/lib/auth/`. Clerk remains the sole identity authority; nothing is stored in PostgreSQL and there is no application user/role table (that belongs to future domain work).

Flow:

```text
requireUserId()  -> trusted Clerk user ID (throws UnauthenticatedError)
  -> { userId } as Actor
  -> authorize(actor, rule, resource)  (throws ForbiddenError; deny by default)
  -> perform the operation
```

Modules:

* `lib/auth/server.ts`: **server-only** (`import "server-only"`). `getUserId()` (null when signed out) and `requireUserId()`, wrapping Clerk's `auth()`. They take no arguments, so identity can never come from request input.
* `lib/auth/authorize.ts`: pure, client-safe primitives: `Actor`, `Rule<R>`, `can()`, `authorize()`, `isOwner()`, `anyOf()`, `allOf()`. No Clerk, database, or environment access.
* `lib/auth/errors.ts`: `UnauthenticatedError` (401 semantics) and `ForbiddenError` (403 semantics) with generic messages and stable `code` values; `isAuthError()`.
* `lib/auth/index.ts`: client-safe barrel. Server helpers are imported from `@/lib/auth/server` only.

Conventions:

* Server code uses these helpers rather than raw `auth()` for identity checks. UI may still use `currentUser()` for display data.
* Never accept a user ID from a body, query, header, or form as proof of identity. Resource IDs from input are compared to the trusted actor through a rule.
* A rule is `(actor, resource) => boolean | Promise<boolean>`. Domain services define their own rules (ownership, membership, organizer, admin) by composing the primitives. Only a strict `true` allows; a rule that throws denies.
* Authorization lives in services/business logic, not UI components. `proxy.ts` route protection does not replace these checks.
* Error messages stay generic; boundaries translate `UnauthenticatedError` to 401 and `ForbiddenError` to 403.

Future integration (not implemented):

* **API:** protected endpoints call the same `requireUserId()` (Clerk supports token-based request authentication) and the same services. Endpoint conventions belong to the API foundation (`docs/api.md`).
* **Mobile:** Expo clients send a Clerk session token; the server verifies it and reaches the same services. Mobile never holds server credentials.
* **Errors/logging:** `runService()` in `lib/services` already maps the two errors to the shared `unauthenticated`/`forbidden` `AppError` codes (see `/docs/services.md`). Logging integration is not implemented.
* **Database:** when domain tables reference users, store the Clerk user ID as the external identity reference (section 6).

Tests: `apps/web/lib/auth/auth.test.ts` mocks Clerk and covers authenticated/unauthenticated, ownership allow/deny, composition, error semantics, and static boundary checks. Real Clerk end-to-end authentication was not tested.
