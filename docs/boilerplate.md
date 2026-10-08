# Boilerplate: Creating a New Application from Signal One

Template-only document: `pnpm init:app` deletes it from the new application. The ordered human steps for the new application (Clerk, Neon, Vercel, Expo/EAS) live in `/docs/new-app-setup.md`, which the new application keeps.

Signal One is the reference implementation. The boilerplate is **this repository's proven foundation with the Signal One identity and the disposable proof slice removed**. Nothing was redesigned; the foundation is extracted by a small, inspectable script (`scripts/boilerplate/`), not a generator framework.

## Mechanism

```text
scripts/boilerplate/manifest.mjs          single inventory: PROOF_PATHS, TEMPLATE_ONLY_PATHS
scripts/boilerplate/init-app.mjs          pnpm init:app          (one-shot, no dependencies, no network)
scripts/boilerplate/check-boilerplate.mjs pnpm check:boilerplate (read-only leak detector)
scripts/boilerplate/templates/            domain-free replacements for the 3 files that wire proof code
scripts/boilerplate/boilerplate.test.mjs  pnpm test:boilerplate  (runs init in a temp copy; part of `pnpm validate`)
scripts/boilerplate/prove-init.mjs        pnpm prove:init [--full] [--keep]  (init a "Harbor Notes" example in a temp dir;
                                          --full also installs from the rewritten lockfile, lint, typecheck, test, build,
                                          and generates a first migration offline; needs network only for install)
```

### Create a new application

1. Create a new repository from a copy of this one (GitHub "Use this template" or a fresh clone with history removed). Run init **once, in that fresh copy**.
2. Run:

```text
pnpm init:app --name="Harbor Notes" --slug=harbor-notes --bundle-id=com.harbornotes.app [--scope=harbor-notes] [--dry-run]
```

| Flag | Becomes |
| --- | --- |
| `--name` | display name: web title/header/home, mobile `name`, docs prose |
| `--slug` | root package name, Expo `slug` and URL `scheme`, tooling ledger schema prefix (`harbor_notes_tooling`) |
| `--scope` (default: slug) | npm scope for `packages/*` (`@scope/shared`, `@scope/validation`) |
| `--bundle-id` | `ios.bundleIdentifier` and `android.package`; required, `com.example.*` and Signal One names are rejected |
| `--dry-run` | prints every removal/rewrite without touching files |

3. Init removes proof-only artifacts, replaces `apps/web/lib/composition.ts`, `apps/web/db/schema.ts`, and `apps/mobile/src/App.tsx` with domain-free versions, strips proof/template regions from the docs, applies the identity to every text file including `pnpm-lock.yaml` (so `--frozen-lockfile` keeps working), resets `docs/notes.md`, deletes template-only files, and finishes by running the leak check (failing loudly if anything remains).
4. `pnpm install`, `pnpm validate`, then follow `/docs/new-app-setup.md`.

Not automated, deliberately: creating Clerk, Neon, Vercel, GitHub, Expo/EAS, Apple, or Google resources; filling credentials; renaming the GitHub repository.

### Leak detector

`pnpm check:boilerplate [--dir=<path>]` (exit 1 on findings) reports, grouped one line per file and rule: Signal One identity (`signal one`, `signalone`, `SignalOne`), proof-only paths and `proof-item`/`migration_proof` references, template-only files, `com.example.*` store ids in `app.config.ts`, and secret-shaped content (same shapes as `apps/web/lib/security.test.ts`). Gitignored `.env*` files are not scanned. On this template it correctly reports findings; on an initialized application it must be clean.

### Markers in docs

`<!-- boilerplate:proof:start -->...<!-- boilerplate:proof:end -->` wraps prose about the proof slice; `boilerplate:template` wraps template-only prose; `boilerplate:reference` wraps Signal One reference-app-only prose (for example the foundation tag section of `docs/git-workflow.md`) and is removed at export. Init removes all three. Markers on their own lines delimit a whole section; inline markers remove exactly the enclosed text.

## Standalone boilerplate repository (Issue 53)

`pnpm export:boilerplate --out=<empty-dir>` (Signal One only; `scripts/boilerplate/export-template.mjs`) generates the standalone, generic "cookie cutter" tree from this repository: it removes the proof slice with the same code `init:app` uses (`stripProofSlice`), applies the neutral identity "App Boilerplate" (`app-boilerplate`, `com.example.appboilerplate`), and replaces `README.md` header, `docs/boilerplate.md` and `docs/notes.md` with standalone versions from `scripts/boilerplate/templates/standalone/`. Signal One-only files are listed in `EXPORT_EXCLUDED_PATHS`. The output keeps `scripts/boilerplate/` (init, check, tests, prove) so a new application is created exactly as above; init and the leak check treat both Signal One and "App Boilerplate" as identities that must not survive.

Signal One stays the real application; it is never converted. Re-export whenever the foundation changes.

**Human step to publish (the Claude automation cannot create repositories):**

```text
pnpm export:boilerplate --out=../<boilerplate-repo-dir>
cd ../<boilerplate-repo-dir>
git init -b main && git add -A && git commit -m "Initial boilerplate export"
gh repo create <owner>/<neutral-repo-name> --private --source=. --push   # then mark it a template repository in GitHub settings
```

Then verify there: `pnpm install`, `pnpm test:boilerplate`, `pnpm prove:init --full`. Related: `/docs/customization-map.md`, `/docs/stack.md`.

## Classification

| Class | Content |
| --- | --- |
| **Reusable boilerplate** (kept) | Monorepo (pnpm workspaces, pinned pnpm); `apps/web` shell: Next.js App Router, Tailwind v4, shadcn/ui (`components/ui`), Clerk sign-in/up + `proxy.ts` + `dashboard` example page, `lib/auth`, `lib/api` (`handler`, `route`, `report`), `lib/services` (context, errors, run, atomic), `lib/env`, `app/api/v1/status` + versioned catch-all; `db/` (client, env, errors, health) and `db/tooling` (guard, executor, migrate, reset, seed, cli) with all `db:*` scripts and `drizzle.config.ts`; `packages/shared` (env, result, contracts, testing setup); `packages/validation` (common, contracts, `createApiClient`); `apps/mobile` shell (Expo config, env validation, `eas.json`); Vitest unit/integration configs, Playwright config + `e2e/global-setup.ts`, `ci.yml`, Claude workflows; `CLAUDE.md`, all rules under `docs/` including `docs/automation/` and `docs/ideas/`; boundary/security/env tests. |
| **Signal One specific** | The name "Signal One" / `signalone` / `@signalone/*` / `com.example.signalone` everywhere. There is **no Signal One domain code or table yet**; the product domain does not exist in this repository, so there is nothing domain-specific to exclude. When Signal One gains domain features, add their paths to a manifest list (alongside `PROOF_PATHS`) and have init remove them, so extraction stays clean. |
| **Proof-only** (removed by init) | The generic `proof-item` vertical slice: contracts + client (`packages/validation/src/proof-item*.ts`), API route and route definitions, service, repo and fake, `proof_item` and `migration_proof` tables and **all migrations** (`apps/web/drizzle/`), web `/proof` page and panel, mobile `src/proof/`, acceptance suite, integration, unit, route-wiring and E2E tests for the slice. Full list: `PROOF_PATHS` in `scripts/boilerplate/manifest.mjs`. |
| **Optional** (kept, enable as needed) | Playwright E2E and the dev-database integration run (need Clerk dev test user + dev Neon; not in CI), `db:reset`/`db:seed`/`db:refresh` (dev/qa), Expo/EAS (`eas.json`), the `dashboard` example page, `claude-code-review.yml`. |
| **Template-only** (removed by init) | `docs/boilerplate.md`, `scripts/boilerplate/`, `init:app`/`check:boilerplate`/`test:boilerplate` scripts. |

### Proof-only database artifacts

A new application starts with **no migrations and an empty schema**: the proof tables and the `0000`/`0001` migrations are deleted, and the journal is absent. `db:migrate` treats a missing journal as zero migrations, and the first `db:generate` creates a fresh `0000_*` from the application's own schema. Nothing needs to be dropped because the proof tables never existed in the new application's databases.

### Reusable defect fixed during extraction

`db:migrate:verify` asserted the `migration_proof` table, so it could not work for any application without that table. It now verifies that the database is exactly at the committed journal (nothing pending, no unknown history), which is schema-agnostic. Also: `readJournal` tolerates a missing journal (new app); the integration and Playwright scripts pass with no tests yet; `createProofItemClient` moved out of the generic `api-client.ts` into the proof-only `proof-item-client.ts`; the proof route-wiring test moved next to its route.

## Maintaining the template

* New proof-only files go in `PROOF_PATHS`; prose about them goes in `proof` markers. A leak found by the detector means init and the manifest disagree: fix the template, not the generated app.
* Do not add Signal One domain code to files the init rewrites by text substitution without checking `pnpm test:boilerplate`.
* The self-test copies the repository to a temp directory, runs the real init with a non-Signal-One identity, and asserts the detector is clean and negative controls fire. It does not run `pnpm install` or a build (network, minutes); run `pnpm prove:init --full` for that when the template changes materially and record the result in the PR conversation.

## Known gaps

See the notes of the extraction PR (#51). Notably: no real Clerk-authenticated mobile call, no CI job for integration/E2E (needs secrets), Stage hosting undecided, production migration procedure not automated, and `docs/deployment.md` section 7 still describes the validation workflow as planned although `ci.yml` exists.
