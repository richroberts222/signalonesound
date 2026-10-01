# Notes: Issue 28 "Build Reusable Authentication and Authorization Helpers"

1. Issue: #28 "Build Reusable Authentication and Authorization Helpers"
2. PR: none yet at time of writing (open one from this branch; further @claude requests should come from that PR).
3. Canonical branch: `claude/issue-28-20261001-0635`, base `main` (`5a0b76a`). Not merged.
4. Latest commit: the commit containing this file; see `git log -1` on the branch.

## 5. Work completed

- Added `apps/web/lib/auth/`:
  - `server.ts` (server-only): `getUserId()`, `requireUserId()` wrapping Clerk `auth()`.
  - `authorize.ts` (pure): `Actor`, `Rule`, `can`, `authorize`, `isOwner`, `anyOf`, `allOf`.
  - `errors.ts`: `UnauthenticatedError` (401), `ForbiddenError` (403), `isAuthError`.
  - `index.ts`: client-safe barrel (no server helpers).
  - `auth.test.ts`: 13 tests.
- Documented the helpers, conventions, and future API/mobile/error/database integration in `docs/auth.md` (Appendix, new "Server-side auth and authorization helpers" subsection).

## 6. Files changed

`apps/web/lib/auth/{server,authorize,errors,index}.ts`, `apps/web/lib/auth/auth.test.ts`, `docs/auth.md`, `docs/notes.md`.

## 7. Architecture decisions

- Identity helpers take no arguments; identity only from Clerk server context.
- Authorization is pure, deny-by-default rules `(actor, resource) => boolean`; a throwing rule denies; only strict `true` allows. No domain roles/permissions defined.
- Clerk-dependent code is isolated in `server.ts` behind `server-only`; the barrel exports only client-safe code.
- Errors are generic and carry a stable `code`; mapping to standard application errors is deferred to the logging/error-handling work.
- No DB, schema, migrations, API routes, or mobile changes. No new dependencies. Existing pages were not changed to use the helpers.

## 8. Security verification actually performed

- Unit tests with Clerk mocked (`vi.mock`): authenticated accepted, unauthenticated and empty ID rejected, extra caller-supplied ID ignored, ownership allow/deny, missing owner, throwing rule, composition, error semantics, static boundary checks.
- `next build` succeeded.

## 9. Test/lint/typecheck/build results (latest run)

Root `pnpm` scripts could not be used because `pnpm` is not on PATH in the sandbox (`corepack pnpm install --frozen-lockfile` worked); the equivalent package-level commands were run instead:

- `npx vitest run` in `apps/web`: 2 files, 17 tests passed.
- `npx vitest run` in `packages/shared`: 1 file, 22 tests passed.
- `npx eslint` in `apps/web`: no output (clean).
- `npx next typegen && npx tsc --noEmit` in `apps/web`: no errors.
- `npx next build` in `apps/web`: compiled successfully, TypeScript passed, 5 routes generated.

## 10. Not tested, and why

- Real Clerk end-to-end authentication: no real Clerk accounts/keys used; Clerk is mocked.
- `server-only` import enforcement inside a real client bundle: checked statically and via the Next build only; no deliberate violating import was built.
- No production data accessed.

## 11. Unresolved concerns

- The helpers are not yet used by any route/service (none exists yet); the first protected mutation/API should adopt them.
- `Rule` returning non-boolean is denied at runtime but typed as boolean only.
- Mobile/API token-based request authentication path is documented, not verified.

## 12. Recommended next steps

1. Open the PR from this branch and review.
2. Adopt `requireUserId()` + `authorize()` in the first protected server mutation.
3. When logging/error handling merges, map the two errors to standard application errors.
