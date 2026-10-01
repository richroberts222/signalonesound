# Boilerplate: Creating a New Application

Template-only document: `pnpm init:app` deletes it from the new application. The ordered human steps for the new application (Clerk, Neon, Vercel, Expo/EAS) live in `/docs/new-app-setup.md`, every identity/naming location in `/docs/customization-map.md`, and how the stack fits together in `/docs/stack.md`; the new application keeps all three.

This repository is a domain-free, proof-free application foundation extracted from a reference implementation. It contains no product features, no domain tables, and no migrations. It carries a neutral placeholder identity ("App Boilerplate") that `init:app` replaces everywhere.

## Create a new application

1. Create a new repository from this one (GitHub "Use this template", or a fresh clone with history removed). Run init **once, in that fresh copy**.
2. Run:

```text
pnpm init:app --name="Harbor Notes" --slug=harbor-notes --bundle-id=com.harbornotes.app [--scope=harbor-notes] [--dry-run]
```

| Flag | Becomes |
| --- | --- |
| `--name` | display name: web title/header/home, mobile `name`, docs prose |
| `--slug` | root package name, Expo `slug` and URL `scheme`, tooling ledger schema prefix |
| `--scope` (default: slug) | npm scope for `packages/*` |
| `--bundle-id` | `ios.bundleIdentifier` and `android.package`; required; `com.example.*` and the template identity are rejected |
| `--dry-run` | prints every change without touching files |

3. Init replaces the template identity in every text file (including `pnpm-lock.yaml`, so `--frozen-lockfile` keeps working), resets `docs/notes.md`, deletes template-only files, and finishes by running the leak check.
4. `corepack enable && pnpm install`, `pnpm validate`, then follow `/docs/new-app-setup.md`.

Not automated, deliberately: creating Clerk, Neon, Vercel, GitHub, Expo/EAS, Apple, or Google resources; filling credentials; renaming the GitHub repository.

## Mechanism

```text
scripts/boilerplate/manifest.mjs          inventory: PROOF_PATHS (absent here), TEMPLATE_ONLY_PATHS
scripts/boilerplate/init-app.mjs          pnpm init:app          (one-shot, no dependencies, no network)
scripts/boilerplate/check-boilerplate.mjs pnpm check:boilerplate (read-only leak detector)
scripts/boilerplate/templates/            domain-free starting files (schema, composition root, mobile App)
scripts/boilerplate/boilerplate.test.mjs  pnpm test:boilerplate  (runs init in a temp copy)
scripts/boilerplate/prove-init.mjs        pnpm prove:init [--full] [--keep]
```

`pnpm prove:init --full` initializes a fictional application in a temp directory, then installs, lints, typechecks, tests, builds, and generates a first migration offline. It needs network only for `pnpm install` and creates no external resources.

### Leak detector

`pnpm check:boilerplate [--dir=<path>]` (exit 1 on findings) reports: template or reference-app identity, proof-only paths and references, template-only files, `com.example.*` store ids in `app.config.ts`, and secret-shaped content. On this template it correctly reports the template identity; on an initialized application it must be clean. Run it in CI or before the first commit of a new application.

### Doc markers

`<!-- boilerplate:template:start -->...<!-- boilerplate:template:end -->` wraps prose that only makes sense in the template; init removes it.

## What is included

Monorepo (pnpm workspaces); `apps/web` (Next.js App Router, Tailwind v4, shadcn/ui, Clerk, versioned API, service layer, data-access layer, Drizzle, migration/reset/seed tooling, Vitest unit/integration configs, Playwright config); `packages/shared`; `packages/validation`; `apps/mobile` (Expo shell, env validation, `eas.json`); CI and Claude workflows; `CLAUDE.md` and all rules under `docs/`, including `docs/automation/` and `docs/ideas/` (optional ideas only, not requirements).

## Not included (on purpose)

Product domain code, example/proof features, any migration or domain table, real credentials, and any external resource.

## Maintaining this template

* Keep it domain-free: add no feature code here. Improve the foundation, run `pnpm test:boilerplate`, and run `pnpm prove:init --full` for material changes.
* Initialization uses textual substitution of the template identity; do not introduce other spellings of the placeholder name.

## Known limitations

No Clerk-authenticated mobile call yet (the shell has no Clerk SDK); no CI job for integration/E2E (needs secrets); Stage hosting is an open decision; production migrations are a documented human procedure, not automated; only Metro bundling of the mobile app is verified, not a device run or an EAS build.
