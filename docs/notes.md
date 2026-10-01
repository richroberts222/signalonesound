# Notes: Issue 36 "Build Reusable Mobile Application Foundation"

1. Issue: #36 "Build Reusable Mobile Application Foundation"
2. PR: none yet at time of writing (open one from this branch; further @claude requests should come from that PR).
3. Canonical branch: `claude/issue-36-20261001-1233`, base `main` (`6ed0608`). Not merged.
4. Latest commit: the commit containing this file; see `git log -1` on the branch.

## 5. Work completed

- Scaffolded `apps/mobile` as an Expo SDK 57 + React Native 0.86 + TypeScript app (pnpm workspace member, `@signalone/shared` via `workspace:*`).
- Minimal shell only (`src/App.tsx`): title plus validated environment status. No navigation, screens, domain models, roles, auth UI, or API client.
- Mobile-safe config: `src/config/env.ts` (`getMobileEnv()`, literal `EXPO_PUBLIC_*` reads) over a new shared pure parser `parseMobileClientEnv` in `packages/shared/src/env.ts`.
- `app.config.ts` (single source of identity, placeholder identifiers `com.example.signalone`, iOS/Android only), `eas.json` (profiles development/qa/staging/production setting only `EXPO_PUBLIC_APP_ENV`), `.env.example`, `.gitignore`.
- Scripts in `apps/mobile`: `start`, `android`, `ios`, `lint`, `typecheck`, `test`, `test:watch`, `check:deps`, `export`. `lint`/`typecheck`/`test` are picked up by the existing root `pnpm -r --if-present` scripts.
- Tests: `src/config/env.test.ts`, `src/boundary.test.ts` (static boundary checks), plus 5 new `parseMobileClientEnv` tests in shared.
- Docs: rewrote `docs/mobile.md` (architecture position, sharing matrix, config, commands, builds); updated `docs/environment.md`, `docs/deployment.md` section 8, `docs/testing.md`, `docs/shared-code.md`, `README.md`.

## 6. Files changed

`apps/mobile/{package.json,app.config.ts,eas.json,tsconfig.json,eslint.config.js,vitest.config.ts,index.ts,.env.example,.gitignore}`, `apps/mobile/src/{App.tsx,boundary.test.ts,config/env.ts,config/env.test.ts}`, `packages/shared/src/{env.ts,env.test.ts}`, `pnpm-lock.yaml`, `README.md`, `docs/{mobile,environment,deployment,testing,shared-code,notes}.md`.

No database, schema, migration, reset/seed, auth, API, workflow, or root `package.json` changes.

## 7. Architecture decisions

- Mobile is an API client only; the boundary is enforced by a static test, not just documented.
- Added `parseMobileClientEnv` to `@signalone/shared` (the docs said the API-URL field would be added at scaffold time) instead of reusing `parseClientEnv`, whose error messages name `NEXT_PUBLIC_*`. Required: `EXPO_PUBLIC_APP_ENV`, `EXPO_PUBLIC_API_BASE_URL` (`https` outside `dev`). Optional: Clerk publishable key (must be `pk_`; `pk_live_` only in `prod`), because Clerk is not integrated yet.
- Clerk (`@clerk/expo`), secure storage, and an API client were deliberately NOT added: `docs/api.md` is empty and the auth contract for mobile is not defined; adding them would invent architecture.
- Metro needs no custom config (SDK 57 handles the monorepo; confirmed by bundling).
- Dependency versions follow `expo install --check` (React 19.2.3, RN 0.86.3, TypeScript ~6.0.3 for mobile only; web/shared stay on TypeScript 5).
- Mobile is not part of root `pnpm build` (builds Web only), left unchanged to avoid root edits.

## 8. Functional verification performed

- `expo export --platform android --platform ios` with `EXPO_PUBLIC_APP_ENV=dev` and `EXPO_PUBLIC_API_BASE_URL=http://localhost:3000` (via a temporary, since-deleted `.env.local`): Metro bundled iOS (585 modules) and Android (586 modules) from `index.ts`, resolving `@signalone/shared` through the workspace link. The inlined `localhost:3000` value was present in the Android bundle.
- Searched the Android bundle for `drizzle`, `neondatabase`, `DATABASE_URL`: only two string literals from shared's pure env parsers (variable names in error messages, no values, never called by mobile). No Drizzle/Neon code.
- `expo config --type public` resolves `app.config.ts` (platforms ios/android only).
- `expo install --check`: "Dependencies are up to date".

## 9. Test/lint/typecheck/build results (latest run)

`pnpm` is not on PATH in the sandbox, so root scripts (`pnpm validate`) could not be invoked directly; the equivalent was run via `corepack pnpm`:

- `corepack pnpm install --frozen-lockfile`: lockfile up to date.
- `corepack pnpm -r --if-present lint`: clean (mobile and web).
- `corepack pnpm -r --if-present typecheck`: clean (shared, validation, mobile, web).
- `corepack pnpm -r --if-present test`: shared 36/36, validation 8/8, mobile 7/7 passed. **web: 41 passed, 2 FAILED** (below).
- `corepack pnpm --filter web build`: succeeded, 5 routes.

### Pre-existing failure (not caused by this branch)

`apps/web/lib/security.test.ts` fails 2 tests, both flagged on `packages/shared/src/testing/index.ts` (unmodified by this branch): the "shared packages never import server-only or read process.env" check (the file reads `process.env` via `globalThis`) and the "credentialed postgres url" secret scan (the fake `postgresql://test:fake-password@db.invalid/test`). These two features came from separate merged branches (testing foundation vs security foundation) and conflict on `main`. I could not run the tests on a clean `main` (`git stash` is not permitted), but the file and test are untouched here and the failing paths are outside my diff. `pnpm validate`/CI will fail until the security test allow-lists the testing helper or the helper changes. I did not fix it, to avoid scope creep.

## 10. Not tested, and why

- App not run on an iOS simulator, Android emulator, or physical device (none available); no `expo start` session was driven. Only Metro bundling/compilation for both platforms was verified.
- No EAS build, signing, or store submission.
- No Clerk or API interaction (not implemented).
- No React Native component tests (no runner set up; documented in `docs/testing.md`).
- `expo-doctor` not run.

## 11. Unresolved concerns

- The pre-existing `security.test.ts` failure above.
- CI (`ci.yml`) runs `pnpm install --frozen-lockfile`; the lockfile was regenerated here and is consistent locally. TypeScript 6 for mobile alongside 5 elsewhere is intentional but worth a glance.
- `@signalone/shared` ships server/database env parsers into the mobile bundle as unused code (names only). Splitting them behind a subpath export would remove this; deferred as a shared-package change.
- Identifiers/name/slug/scheme are placeholders.
- `pnpm build` does not cover mobile; `export` is a manual script, not in CI.

## 12. Recommended next steps

1. Open the PR and resolve the `security.test.ts` conflict separately.
2. Define `docs/api.md` and the mobile auth contract, then add `@clerk/expo`, secure storage, and an API client.
3. Verify on an emulator/simulator and decide whether `expo export` belongs in CI.
4. Decide store identifiers, EAS project, and navigation approach.
