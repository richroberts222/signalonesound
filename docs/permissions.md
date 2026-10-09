# User Permissions and Roles

Who may do what, how roles are granted, and how every permission is checked. Authentication (who someone is) is in `/docs/auth.md`; the check primitives are `authorize()`, `isOwner()`, `anyOf()` and `allOf()` in `apps/web/lib/auth/`. Product decisions behind the roles: `/docs/product/product-plan.md` ("Accepted decisions") and `/docs/naming-conventions.md`.

**Standards followed** (established practice; confirm before citing externally): OWASP ASVS V4 (access control), OWASP API Security Top 10 (API1 object-level and API5 function-level authorization), role-based access control (NIST RBAC model), least privilege, deny by default.

**Status:** the rules below are decided. **Only ownership checks exist in code today.** No role table, admin allow-list or request flow is built (F-AUTH-001, launch gate).

## 1. Roles (decided by the owner, Q-010)

| Role | Meaning | How it is granted |
| --- | --- | --- |
| **Member** | An ordinary signed-in user | Automatic on sign-up; no approval |
| **Church/Ministry manager** | Manages the events and profile of a Church/Ministry account (an organization may have several managers) | The person **requests** the role; a platform admin **approves**. Nobody chooses their own role |
| **Platform admin** | Approves manager requests and moderates submissions; also acts as moderator for now | A server-side allow-list of Clerk user ids (an environment variable, an owner action). The owner and the business partner share one login by choice, so the list has one identity today |

A separate moderator role, anonymous submissions and moderation reversal are not decided. The defaults until the owner objects: admins moderate; anonymous submissions are not allowed; decisions are recorded and reversible; an organization may have several managers.

## 2. Rules

1. **Deny by default.** A rule that is missing, throws or returns anything but `true` denies (already implemented in `authorize()`). A new endpoint or action with no rule is a defect.
2. **Roles live in the application database,** keyed by the Clerk user id, never in the browser and never in a client-supplied value. Clerk proves who someone is; the database says what they may do.
3. **A user never chooses their own role.** A request creates a pending row; an approval by an authorized admin creates the grant. Approval and revocation are admin-only and recorded.
4. **Check on the server, in the service, on every request,** against the resource, not just the role ("is this person a manager *of this organization*"). Hiding a button is not a check. Route protection in `proxy.ts` is authentication only.
5. **Least privilege.** Each action requires the narrowest role that can perform it. Admin is not a shortcut for every check.
6. **Audit what matters.** Role grants and revocations, manager approvals, moderation decisions and deletions record who, what, when and the prior state (F-AUTH-004).
7. **No role is trusted from the token alone.** If roles are ever copied into session claims for convenience, the server still loads the role from the database for sensitive actions.
8. **The allow-list is configuration, not code.** Changing who is an admin is an environment change by the owner, never a code change and never a client option. Move to a database-backed admin flag only when the admin count grows or a third person joins.

## 3. Permission table (to complete per feature)

Each feature specification includes a permission table; the example below is the shape.

| Action | Member | Manager (own organization) | Admin |
| --- | --- | --- | --- |
| Search and view public events | Yes | Yes | Yes |
| Create or edit an event of an organization | No | Yes | Yes |
| Approve a manager request | No | No | Yes |
| Moderate a submission | No | No | Yes |

## 4. Testing

* Every protected action has a **denial test for each role below the required one** plus a test for the wrong organization (an object-level check). Both are acceptance criteria in the feature (`/docs/qa-strategy.md`).
* Deny-by-default test: a rule that throws or returns a non-`true` value denies (proven by break-it checks in `/docs/audit/rules-review/auth.md`).
* A test fails if a new top-level route has no protection decision (`proxy.test.ts`, proven).

## 5. Enforcement and proof status

| Rule | Mechanism | Proof |
| --- | --- | --- |
| Deny by default; ownership from the trusted actor | `authorize()` tests | Proven (five breaks, auth ledger) |
| Every top-level route has a protection decision | `proxy.test.ts` | Proven (removing protection fails 5 of 12 tests) |
| Roles in the database, request then approve, admin allow-list, audit trail | Not built | Not proven; launch gate (F-AUTH-001, F-AUTH-004) |
| A denial test per role per protected action | Feature acceptance criteria | Applies when features exist |
