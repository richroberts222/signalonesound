# Deployment

Authoritative deployment architecture for Signal One. Variable reference and validation rules: `/docs/environment.md`. Database rules: `/docs/database.md`. Status labels used below: **Automated now** (exists and works today), **Manual** (a human does it), **Planned** (not built; do not treat as operational).

## 1. Environment model

`APP_ENV` (the runtime environment of the application) and `DATABASE_ENV` (the environment `DATABASE_URL` targets) are separate concepts and must not be collapsed (`/docs/environment.md`). Normally they are equal.

| Context | `APP_ENV` | `DATABASE_ENV` | Neon branch | Clerk instance | `VERCEL_ENV` |
| --- | --- | --- | --- | --- | --- |
| Local development | `dev` | `dev` | dev | development | unset |
| Vercel Preview (feature/PR) | `qa` | `qa` | qa | development | `preview` |
| Stage (final pre-production) | `stage` | `stage` | stage (protected) | development | see section 4 |
| Production | `prod` | `prod` | prod (protected) | production | `production` |

**Actual state (read 2026-10-08, owner-relayed console reads; Preview values not read):** Production is a Vercel deployment of `main` with no custom domain. It uses a Clerk **development** instance, and the Production scope holds none of the `APP_ENV`, `DATABASE_ENV` or `DATABASE_URL` variables; no production Clerk instance exists. The table above is the plan; this paragraph is what exists. Update it whenever the console state changes.

Environment identity is explicit configuration, never inferred from hostnames or branch names.

## 2. Vercel (Web)

**Automated now (Vercel-side configuration, performed by a human in the Vercel dashboard):**

* Vercel project Root Directory: `apps/web`; framework preset Next.js; pnpm detected from the root `pnpm-lock.yaml`.
* Enable "Include source files outside of the Root Directory" so the workspace lockfile and `packages/*` are available during the build.
* No `vercel.json` is committed; the project relies on dashboard settings and framework detection. Do not add one without a documented reason.
* `next build` does not need runtime secrets: environment validation is lazy (`getServerEnv()` runs on first request, not at build). Verified: a production build succeeds with no environment variables set. Consequence: **a misconfigured environment is not caught at build time; it fails on the first server request.** Check a Preview after deploying.

Vercel provides `VERCEL_ENV` (`production`, `preview`, `development`) automatically; it is read only for the guards below.

### Preview -> QA (architecture decision)

Every Vercel Preview deployment is QA: `APP_ENV=qa`, `DATABASE_ENV=qa`, `DATABASE_URL` = the qa Neon branch. Previews never intentionally use `stage` or `prod`.

Code-level reinforcement (in `parseServerEnv`, the existing validation foundation; no second system): when `VERCEL_ENV=preview`, validation fails unless **both** `APP_ENV` and `DATABASE_ENV` are `qa`. It also fails for `prod` on any non-production Vercel deployment, for an `APP_ENV`/`DATABASE_ENV` prod mismatch, and for a live Clerk key (`sk_live_`) outside `prod`.

Limit: code cannot tell that a `DATABASE_URL` actually points at the wrong Neon branch while `DATABASE_ENV=qa` claims otherwise. Preview variables must be set carefully, and the qa `DATABASE_URL` must be a credential that can only reach the qa branch.

## 3. Configuration ownership and secret locations

Never commit real `DATABASE_URL` values, Clerk secret keys, tokens, passwords, or production credentials. `apps/web/.env.example` holds names and placeholders only; `.env*` is gitignored except `.env.example`/`.env.sample`.

| Where | Owns | Notes |
| --- | --- | --- |
| `apps/web/.env.local` (gitignored) | Local dev values (`dev` Neon, Clerk dev keys) | Copy from `apps/web/.env.example` |
| Vercel -> Environment Variables, scope **Preview** | qa values: `APP_ENV=qa`, `DATABASE_ENV=qa`, qa `DATABASE_URL`, Clerk development keys | Manual |
| Vercel -> scope **Production** | prod values: `APP_ENV=prod`, `DATABASE_ENV=prod`, prod `DATABASE_URL`, Clerk production keys | Manual; only people authorized for production |
| Vercel (Stage) | stage values (see section 4) | Manual |
| GitHub Actions secrets | Only when a workflow requires them. Today `claude.yml` uses `NEON_DEV_DATABASE_URL` (dev). Future qa automation: separate `NEON_QA_DATABASE_URL`. | No prod credentials in Actions |
| Future mobile: EAS/Expo | Per build profile: `EXPO_PUBLIC_*` public config via EAS environment variables/`eas.json` `env`. | **Planned.** `EXPO_PUBLIC_*` is public in the bundle; never put server secrets there |

Rules: server-only values never carry `NEXT_PUBLIC_`/`EXPO_PUBLIC_`. Preview, Stage, and Production each have their own values; do not reuse one environment's secret in another (Vercel "All Environments" scope must not be used for secrets).

## 4. Stage

Stage is the final production-like verification environment before Production: `APP_ENV=stage`, `DATABASE_ENV=stage`, protected stage Neon branch, production-like configuration and migration state.

Differences from ordinary Preview/QA:

* Preview is per-PR, short-lived, and uses the shared qa database; Stage is a single long-lived environment that is not used for ordinary PR previews.
* Stage receives only code intended for release, so it verifies the candidate rather than an arbitrary feature branch.
* Stage's database is protected: it must not be reset or seeded by feature work; migrations reach it deliberately before Production (see `/docs/database.md`).
* Preview is forbidden from using `stage` by validation; Stage must never use `prod` data.

**Not provisioned.** There is no Stage deployment, Vercel project/domain, or stage Neon branch asserted by this repository. Which Vercel mechanism hosts Stage (a separate Vercel project, or a custom environment) is **undecided**. Note the `VERCEL_ENV` guard does not currently constrain Stage; if Stage is a custom Vercel environment, `VERCEL_ENV` will not be `production`, and `prod` stays correctly refused there. A decision belongs here before Stage is provisioned.

## 5. Production

* Uses `APP_ENV=prod`, `DATABASE_ENV=prod`, prod `DATABASE_URL`, and Clerk production keys, set only in the Vercel Production scope.
* `prod` is valid only when `VERCEL_ENV=production` or `VERCEL_ENV` is unset (see limit below); local and Preview configuration is refused.
* Production is deployed by merging to `main` (Vercel Git integration) and is never deployed from a feature branch to prove a change.
* Local tooling refuses `prod` (`drizzle-kit`, `db:check`, `assertDestructiveAllowed`). Production migrations follow the deliberate process in `/docs/database.md` section 10, never local tooling.
* Reset/seed must never target production.

Limit: `VERCEL_ENV` is unset outside Vercel, so a developer machine or CI job configured with `prod` values is not refused by the Vercel guard. Local tooling guards (`assertNotProd`/`assertDestructiveAllowed`) cover that case for scripts; keep prod credentials off developer machines and out of Actions.

## 6. Promotion expectations

```text
feature branch -> PR
  GitHub validation (lint, typecheck, test, build)
    -> Vercel Preview (QA data) -> human review
      -> merge to main
        -> Stage verification (planned)
          -> Production
```

1. Local: develop against `dev`.
2. PR: required validation passes; review the Preview, which runs on qa data.
3. Schema changes: expand, then contract; migrations are applied before, or compatibly with, the code that needs them. Apply to qa for the Preview, then stage, then prod via the deliberate process.
4. Merge to `main` triggers the Vercel Production deployment (current behavior of the Git integration). Until Stage exists there is no automated pre-production gate between merge and Production; this is a known gap.
5. Target flow once Stage exists: verify the release candidate on Stage, then promote to Production. The mechanism is undecided.

## 7. CI/CD relationship

* **Automated now:** Vercel builds a Preview for each PR and a production deployment for `main`; `.github/workflows/claude.yml` and `claude-code-review.yml` run Claude (not a general CI pipeline).
* **Manual now:** running `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and reporting results in the PR (`/docs/testing.md`); Stage and Production database migrations; setting Vercel variables.
* **Built:** `.github/workflows/ci.yml` runs `pnpm validate` on pull requests and pushes to `main`, and the `Validate` check is required by the `Protect main` repository ruleset (`/docs/security.md`). It uses no production secrets. Workflow files are edited by a human (the Claude GitHub App cannot edit them).
* **Planned, not built:** automated Stage promotion, post-deploy smoke checks, preview-environment configuration checks.

## 8. Mobile deployment boundary (not built)

Mobile is scaffolded (`/docs/mobile.md`) and `apps/mobile/eas.json` defines the profiles below, but no EAS project is linked, no build has been run, and no mobile deployment infrastructure exists. Mapping:

| EAS build profile | Environment | API base URL target |
| --- | --- | --- |
| `development` | `dev` | dev/local API |
| `qa` | `qa` | qa API (the Web Preview/QA backend) |
| `staging` | `stage` | stage API |
| `production` | `prod` | production API |

Rules: mobile builds receive only `EXPO_PUBLIC_*` client-safe values per profile; mobile never receives `DATABASE_URL` or `CLERK_SECRET_KEY`; no production API URL is the default in non-production profiles. Store submission, signing credentials, and OTA update policy are undecided. `eas.json` sets only `EXPO_PUBLIC_APP_ENV` per profile; `app.config.ts` holds placeholder identifiers.

## 9. Production safeguards (summary)

1. Explicit `APP_ENV`/`DATABASE_ENV`; APP/DATABASE prod mismatch refused.
2. `prod` refused on Vercel Preview/development deployments; Preview must be qa.
3. Live Clerk keys refused outside prod.
4. Local tooling refuses `prod`; destructive tooling uses `assertDestructiveAllowed`.
5. Separate secrets per environment; no real values in the repository.
6. Human is the final merge gate; production deploys only from merged `main`.

## 10. Verified vs not verified

Verified in the repository: validation guards (unit tests in `packages/shared/src/env.test.ts`), production build without env vars, absence of committed secrets/`vercel.json`.

Read back on 2026-10-08 (owner-relayed console reads and `gh`): the `Protect main` ruleset, Production deployment on merge, Preview protection, Production variable names. Not verified: Preview variable values, whether Preview uses qa, Neon branch settings, Clerk dashboard settings.

## Mobile release

See section 8; `/docs/mobile.md`.
