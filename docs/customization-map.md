# Naming and Customization Map

Every known place where application identity or external project identity is set. Use it with `/docs/new-app-setup.md` (ordered human steps). Placeholders only: never write real URLs, keys, or tokens in this file or anywhere committed (`/CLAUDE.md` section 18).

Legend. **Auto** = written by `pnpm init:app`; **Manual** = a human enters it; **Permanent** = hard or impossible to change after launch; **Env-specific** = differs per DEV/QA/STAGE/PROD; **Secret** = never committed; **Public** = non-secret configuration (may be committed or is embedded in client bundles).

If you are unsure whether anything was missed, run `pnpm check:boilerplate`: it fails on leftover template identity, placeholder store ids, proof artifacts, and credential-shaped content.

## 1. Set automatically by `pnpm init:app`

Flags: `--name` (display name), `--slug`, `--scope` (defaults to slug), `--bundle-id`. Textual substitution runs over every text file (including `pnpm-lock.yaml`), so the locations below are the ones that matter, not an exhaustive list.

| Value | Where it ends up | Kind |
| --- | --- | --- |
| Display name | `apps/web/app/layout.tsx` (title, description); `apps/web/app/page.tsx`, `apps/web/components/brand/brand-wordmark.tsx` and `apps/web/components/shell/app-header.tsx` (visible name); `apps/web/app/dashboard/page.tsx` (fallback label); `apps/mobile/app.config.ts` `name`; `apps/mobile/src/App.tsx`; `README.md`; prose in `CLAUDE.md` and `docs/` | Auto, Public |
| Slug | root `package.json` `name`; `apps/mobile/app.config.ts` `slug` and `scheme` (URL scheme); tooling ledger schema prefix in `apps/web/db/tooling/seed.ts` (`<slug_with_underscores>_tooling`, schema-qualified in the database) | Auto, Permanent once a database or store listing exists |
| npm scope | `packages/shared/package.json`, `packages/validation/package.json` names; every `@scope/...` import; `workspace:*` dependencies in `apps/web/package.json` and `apps/mobile/package.json`; `transpilePackages` in `apps/web/next.config.ts`; `pnpm-lock.yaml` | Auto |
| Bundle id | `apps/mobile/app.config.ts`: `ios.bundleIdentifier` and `android.package` (the same value) | Auto, Permanent once published to a store |
| Domain-free starting files | `apps/web/db/schema.ts` (empty schema), `apps/web/lib/composition.ts` (empty composition root), `apps/mobile/src/App.tsx` | Auto |
| Handoff notes | `docs/notes.md` reset to a stub | Auto |

## 2. Not set by init: review by hand

| Value | Where | Kind |
| --- | --- | --- |
| Mobile app version | `apps/mobile/app.config.ts` `version`; `eas.json` uses `appVersionSource: remote` | Manual |
| Mobile app icon/splash, web favicon and `public/` assets | `apps/mobile/app.config.ts` (add fields), `apps/web/app/` and `apps/web/public/` | Manual, Public |
| Visual theme | CSS variables in `apps/web/app/globals.css` (shadcn/ui tokens); Clerk look in `apps/web/lib/clerk-appearance.ts` | Manual |
| Mobile bundle id after Apple/Google decisions | Same two fields as above; changing it later creates a different store app | Manual, Permanent |
| Claude/GitHub workflows | `.github/workflows/*.yml` (no app name in them; human-edited, the Claude app cannot edit workflows) | Manual |
| Repository name/description | GitHub settings, not in files | Manual |

## 3. External projects and where their identifiers go

Nothing here is provisioned by the repository. Each is created by a person in the service's own console.

| External resource | Naming guidance | Where the identifier/credential goes | Kind |
| --- | --- | --- | --- |
| GitHub repository | Use the slug. Create from the template, then init. | GitHub itself; enable branch protection requiring `CI / Validate` | Manual, Permanent-ish |
| Clerk application | Use the display name. One development instance for local/QA/STAGE; a production instance only at launch. | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (Public) and `CLERK_SECRET_KEY` (Secret) in `apps/web/.env.local` and in Vercel per scope. Mobile: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (Public) later. Allowed origins/redirects are configured in the Clerk dashboard. | Manual, Env-specific |
| Neon project | Use the slug. One branch/database per environment: `dev`, `qa`, `stage`, `prod`; one role per branch. | `DATABASE_URL` (Secret, Env-specific) in `apps/web/.env.local` (dev only), Vercel per scope, and for Claude DB-backed work the GitHub secret `NEON_DEV_DATABASE_URL` (dev only). Production URL only in the Production host. | Manual, Secret |
| Vercel project | Use the slug. Root Directory `apps/web`, include files outside the root. | Environment variables per scope: Preview = `qa`, Production = `prod`. Domains added in Vercel and in Clerk's allowed origins. | Manual |
| Expo/EAS project | Use the slug and display name (must match `app.config.ts`). | `eas init` writes the project id into the Expo config; per-profile `EXPO_PUBLIC_*` values in `apps/mobile/eas.json` or EAS variables. Never put secrets in `EXPO_PUBLIC_*`. | Manual, Permanent (project id) |
| Android application id | The bundle id. Create the app in Google Play Console with this exact package name. | `android.package` (set by init); signing keys live in EAS/Play, never in the repo | Permanent, Secret (keys) |
| iOS bundle identifier | The bundle id. Register it in the Apple Developer account. | `ios.bundleIdentifier` (set by init); certificates/profiles managed by EAS or Apple, never in the repo | Permanent, Secret (certs) |
| Apple Developer / Google Play accounts | Organization or individual account decision | Outside the repo | Manual |
| App URLs and origins | Production domain, Vercel preview pattern, localhost | Clerk dashboard (allowed origins/redirects); `EXPO_PUBLIC_API_BASE_URL` in `apps/mobile/.env.local` / EAS profile (`https` outside dev); Vercel domains | Manual, Env-specific, Public |
| Local environment | Copy `apps/web/.env.example` and `apps/mobile/.env.example` to `.env.local` (gitignored) | Placeholders only in committed files | Manual, Secret |
| GitHub Actions secrets | `CLAUDE_CODE_OAUTH_TOKEN` or API key for `claude.yml`; `NEON_DEV_DATABASE_URL` (dev only); a Clerk dev test user only if E2E is enabled in CI | Repository settings. `ci.yml` needs none. No production credential belongs in GitHub Actions. | Manual, Secret |
| Vercel environment variables | `APP_ENV`, `DATABASE_ENV`, `DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Vercel project settings, scoped per environment | Manual, Env-specific, Secret/Public as named |
| Future EAS secrets | Only if a build step needs one; client apps get public values only | EAS dashboard/CLI | Manual |

## 4. Environment variable quick reference

| Variable | Used by | Secret | Env-specific |
| --- | --- | --- | --- |
| `APP_ENV` | web server (`dev`/`qa`/`stage`/`prod`), optional, defaults to `DATABASE_ENV` | no | yes |
| `DATABASE_ENV` | web server and db tooling: the environment `DATABASE_URL` targets | no | yes |
| `DATABASE_URL` | web server and db tooling | **yes** | yes |
| `CLERK_SECRET_KEY` | web server | **yes** | yes |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | web browser bundle | no | yes |
| `EXPO_PUBLIC_APP_ENV` | mobile | no | yes (per EAS profile) |
| `EXPO_PUBLIC_API_BASE_URL` | mobile | no | yes |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | mobile (future) | no | yes |
| `E2E_CLERK_USER_USERNAME`, `E2E_CLERK_USER_PASSWORD` | Playwright global setup (dev Clerk test user only) | yes | dev only |

Full validation rules: `/docs/environment.md`.
