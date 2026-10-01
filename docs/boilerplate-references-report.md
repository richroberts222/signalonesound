# Application-Specific References Report

Search covered the whole repository (excluding `pnpm-lock.yaml` for counting, which only mirrors workspace package names) for: Signal One Sound, SignalOneSound, signalonesound, signalOneSound, Signal One, SignalOne, signalone. No renames were performed.

**Finding:** the strings "Signal One Sound", "SignalOneSound", "signalonesound", and "signalOneSound" appear **nowhere in tracked files**. The only place is the GitHub repository name/URL (`richroberts222/signalonesound`) outside the tree. The in-repo brand is "Signal One" / `signalone` (124 occurrences in 18 files). No mobile bundle identifiers, Expo config, database names, or Neon/Clerk project names exist in the repo.

## Categorized references

### Must become a configurable placeholder (user-visible branding in code)

| Location | Value |
| --- | --- |
| `apps/web/app/layout.tsx:19-20` | metadata `title`/`description` "Signal One" |
| `apps/web/components/auth/auth-header.tsx:9` | header brand text |
| `apps/web/app/page.tsx:8` | home page heading |
| `apps/web/app/dashboard/page.tsx:21` | fallback display name "Signal One user" |

### Should remain application-specific (comments tied to this app's theme)

| Location | Note |
| --- | --- |
| `apps/web/lib/clerk-appearance.ts:6` | comment "Signal One shadcn/ui theme"; reword to "app theme" during rename |
| `apps/web/db/schema.ts:1` | comment "Signal One schema design has not been established" |

### Repository/package identifiers

| Location | Value |
| --- | --- |
| `package.json` | root `name: "signalone"` |
| `packages/shared/package.json`, `packages/validation/package.json` | scope `@signalone/*` |
| `packages/validation/package.json`, `packages/validation/src/common.ts` | imports `@signalone/shared` |
| `pnpm-lock.yaml` | regenerated from the above |
| `apps/mobile/package.json` | description text |
| GitHub repo name `signalonesound` | outside the tree |

### Documentation references

`CLAUDE.md` (11), `docs/architecture-rules.md` (19), `docs/database.md` (21), `docs/auth.md` (16), `docs/ui.md` (16), `docs/data-mutations.md` (14), `docs/data-fetching.md` (11), `docs/git-workflow.md` (3), `docs/shared-code.md`, `README.md`, and the new Phase 1 docs use "Signal One" as the project name in prose and titles. These read as the project name and can be converted by a single controlled find-and-replace to a neutral term or a documented `{{APP_NAME}}` token.

### Environment/configuration references

None contain the app name. Variables are generic (`DATABASE_ENV`, `DATABASE_URL`, Clerk keys). `database.md` section 23 mentions "The Signal One Neon project" (doc reference).

### Mobile bundle identifiers

None present. When Expo is scaffolded, name, slug, `ios.bundleIdentifier`, and `android.package` must be defined from the start as placeholders in `app.config.ts`.

### Database/project naming references

None in code. Neon project/branch names and Clerk application name exist only in external services.

## Recommended strategy

1. **Single source of truth**: add `apps/web/lib/app-config.ts` (and later `apps/mobile/app.config.ts`) exporting `APP_NAME`, `APP_DESCRIPTION`, and identifiers, optionally fed by `NEXT_PUBLIC_APP_NAME`. Replace the four "must become placeholder" code locations with it.
2. **Package scope**: keep `@signalone/*` until the rename phase, then change the scope in one commit (package.json names, imports, `pnpm-lock.yaml` regeneration via `pnpm install`).
3. **Docs**: use one neutral project name in prose or a `{{APP_NAME}}` token, and have an init script substitute it.
4. **Init script** (`pnpm init:app`): prompts for app name, slug, package scope, and bundle IDs; performs the scoped replacements listed above; runs `pnpm install`, lint, typecheck.
5. **Rename gate**: do the replacement in its own PR after explicit approval, verified by re-running this search for zero leftovers. The GitHub repository rename is a separate manual step.
