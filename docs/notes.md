# Notes: Issue 27 "Build Reusable Deployment Foundation"

1. Issue: #27 "Build Reusable Deployment Foundation"
2. PR: none yet at time of writing (open one from this branch; further @claude requests should come from that PR).
3. Canonical branch: `claude/issue-27-20261001-0634`, base `main` (`5a0b76a`). Not merged.
4. Latest commit: the commit containing this file; see `git log -1` on the branch.

## 5. Work completed

- `docs/deployment.md` rewritten as the authoritative deployment architecture: env mapping table (Local->dev, Preview->qa, Stage, Prod), Vercel behavior, Preview->QA decision, configuration/secret ownership, Stage vs Preview, Production safeguards, promotion flow, CI/CD relationship (automated now vs manual vs planned), future mobile/EAS profile mapping, verified vs not verified.
- Code reinforcement in the existing validation foundation (`parseServerEnv`): when `VERCEL_ENV=preview`, both `APP_ENV` and `DATABASE_ENV` must be `qa` (previously only `stage` was refused, so a Preview could run with `dev`). Tests updated.
- `docs/environment.md` and `docs/mobile.md` adjusted for consistency.

## 6. Files changed

`docs/deployment.md`, `docs/environment.md`, `docs/mobile.md`, `docs/notes.md`, `packages/shared/src/env.ts`, `packages/shared/src/env.test.ts`.

## 7. Architecture decisions

- Vercel Preview -> QA, enforced in code (both env vars must be `qa` on `VERCEL_ENV=preview`).
- `APP_ENV`/`DATABASE_ENV` stay separate.
- No `vercel.json`; dashboard settings remain the source of Vercel config.
- Stage hosting mechanism and promotion mechanism are left undecided and documented as such.

## 8. Functional verification performed

- Unit tests exercising Preview/QA rules, prod mismatch, prod-on-non-production-Vercel, live Clerk key guards.
- Production `next build` with no environment variables set (confirms lazy validation; build does not need secrets).
- Inspected: no `vercel.json`, `.env.example` is placeholder-only, `.gitignore` excludes `.env*`.

## 9. Test/lint/typecheck/build results (this branch)

Root scripts (`pnpm test` etc.) could not be used as-is: `pnpm` is not on PATH in this runner (installed via `corepack pnpm`), and the scripts call `pnpm` internally. The equivalent tools were run per package through `corepack pnpm --filter <pkg> exec ...`:

- `vitest run` in `packages/shared`: 1 file, 22 tests passed.
- `vitest run` in `apps/web`: 1 file, 4 tests passed.
- `eslint` in `apps/web`: no output (no problems).
- `next typegen` + `tsc --noEmit` in `apps/web`: clean.
- `tsc --noEmit` in `packages/shared` and `packages/validation`: clean.
- `next build` in `apps/web` (no env vars set): succeeded; 5 routes, all dynamic.

## 10. Not tested, and why

- Any cloud deployment, Vercel project settings, real Preview/Production variable values, Neon branches, Clerk instances: no cloud/production access, and none was required or attempted.
- Stage and mobile/EAS: not provisioned/scaffolded; documented as planned only.
- Root `pnpm lint|typecheck|test|build` wrappers verbatim (PATH issue above).
- Production data was not accessed.

## 11. Unresolved concerns

- The tightened Preview guard will make existing Vercel Preview deployments fail on first server request if their variables are not `qa` (e.g. still `dev`). Verify Preview variables in Vercel before merging.
- Validation is lazy, so misconfiguration is not caught at build time.
- The `VERCEL_ENV` guard does not cover non-Vercel environments with prod values.
- No CI validation workflow exists; Stage hosting and promotion are undecided.

## 12. Recommended next steps

1. Open the PR; confirm Preview variables in Vercel are `APP_ENV=qa`/`DATABASE_ENV=qa` with the qa `DATABASE_URL`.
2. Decide Stage hosting (separate Vercel project vs custom environment) and update `docs/deployment.md` section 4.
3. Add the GitHub validation workflow via the Testing Foundation work.
4. Human merges when satisfied.
